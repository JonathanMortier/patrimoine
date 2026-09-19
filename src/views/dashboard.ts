import Chart from 'chart.js/auto'
import { constantesRepo } from '../db/repos/constantes'
import { monthRepo } from '../db/repos/months'
import { creditsRepo } from '../db/repos/credits'
import { dashboardSeries, missingMonths, type DashboardPoint } from '../calc/dashboard'
import { brutTotal, netTotal, immoBrut, restantDette, btcShare } from '../calc/netBrut'
import { formatMonthLabel, currentMonthId } from '../utils/date'
import { fmtEuro, fmtPct } from '../utils/format'
import { CATEGORY_COLORS, SURFACE, donutOptions, lineDataset, lineOptions } from './chartTheme'

let charts: Chart[] = []

function destroyCharts(): void {
  for (const c of charts) { try { c.destroy() } catch { /* déjà détruit */ } }
  charts = []
}

function draw(canvas: HTMLCanvasElement | null, make: (c: HTMLCanvasElement) => Chart): void {
  if (!canvas || !canvas.getContext('2d')) return
  try { charts.push(make(canvas)) } catch { /* contexte indisponible */ }
}

function kpi(label: string, value: string, sub = ''): string {
  return `<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-val">${value}</span>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}</div>`
}

function varSpan(v: number | null): string {
  return v === null
    ? ''
    : `<span class="var ${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '▲' : '▼'} ${fmtEuro(Math.abs(v))}</span>`
}

export async function renderDashboard(view: HTMLElement): Promise<void> {
  destroyCharts()
  const [constantes, months, loans] = await Promise.all([
    constantesRepo.get(),
    monthRepo.all(),
    creditsRepo.all(),
  ])
  const series = dashboardSeries(months, constantes)
  const currentMonth = currentMonthId()
  const last = series.find((p) => p.id === currentMonth) ?? series.at(-1)
  const currentShown = last?.id === currentMonth

  if (!last) {
    view.innerHTML = `
      <section class="card">
        <h2>Dashboard</h2>
        <p class="muted">Aucun mois enregistré. Commencez par l'import initial ou l'assistant « 1er du mois ».</p>
      </section>`
    return
  }

  const variation = varSpan(last.variation)

  // Remplissage PEA = valeur nette du PEA (valeur − plus value) / plafond
  const peaNet = Math.max(0, last.pea - last.plusValue)
  const peaPct = constantes.plafondPea > 0 ? (peaNet / constantes.plafondPea) * 100 : null

  const immoValeur = immoBrut(loans)
  const brut = brutTotal(last.horsImmo, immoValeur)
  const lastRecord = months.find((m) => m.id === last.id)
  const monthlyDue =
    lastRecord && Object.keys(lastRecord.creditsRestant ?? {}).length > 0
      ? Object.values(lastRecord.creditsRestant!).reduce((a, v) => a + v, 0)
      : restantDette(loans)
  const dette = monthlyDue
  const net = netTotal(brut, dette)

  const btcValue = last.btcValueEur
  const btcHorsImmo = btcShare(btcValue, last.horsImmo)
  const btcBrut = btcShare(btcValue, brut)
  const btcNet = btcShare(btcValue, net)

  const missing = missingMonths(series.map((p) => p.id))
  const missingHtml = missing.length === 0
    ? '<p class="muted">Tous les mois récents sont enregistrés.</p>'
    : `<div class="segs">${missing.map((id) => `<span class="seg">${id.slice(5) + '/' + id.slice(2, 4)}</span>`).join('')}</div>`

  const fallbackRows = series.slice(-6).map((p) =>
    `<tr><td>${p.short}</td><td>${fmtEuro(p.bourse)}</td><td>${fmtEuro(p.assuranceVie)}</td><td>${fmtEuro(p.crowdlending)}</td><td>${fmtEuro(p.crypto)}</td><td><strong>${fmtEuro(p.horsImmo)}</strong></td></tr>`
  ).join('')

  const slices = [
    { label: 'Bourse', value: last.bourse, color: CATEGORY_COLORS.bourse },
    { label: 'Assurance Vie', value: last.assuranceVie, color: CATEGORY_COLORS.assuranceVie },
    { label: 'Crowdfunding', value: last.crowdlending, color: CATEGORY_COLORS.crowdlending },
    { label: 'Crypto', value: last.crypto, color: CATEGORY_COLORS.crypto },
    { label: 'Comptes / Livrets', value: last.compteCourant + last.livrets, color: CATEGORY_COLORS.comptes },
  ].filter((s) => s.value > 0)

  view.innerHTML = `
    <section class="card">
      <h2>Dashboard</h2>
      <p class="muted">${currentShown ? 'Mois courant' : 'Dernier mois suivi'} : <strong>${formatMonthLabel(last.id)}</strong></p>
      <div class="kpis">
        ${kpi('Hors immo', fmtEuro(last.horsImmo), variation)}
        ${kpi('Brut', fmtEuro(brut), `+ immo ${fmtEuro(immoValeur)}`)}
        ${kpi('Net', fmtEuro(net), `− dettes ${fmtEuro(dette)}`)}
        ${kpi('Bourse', fmtEuro(last.bourse), varSpan(last.bourseVar))}
        ${kpi('Assurance Vie', fmtEuro(last.assuranceVie), varSpan(last.assuranceVieVar))}
        ${kpi('Crowdfunding', fmtEuro(last.crowdlending), varSpan(last.crowdlendingVar))}
        ${kpi('Crypto', fmtEuro(last.crypto), varSpan(last.cryptoVar))}
      </div>
    </section>

    <section class="card">
      <h2>Objectifs</h2>
      <label class="field">
        <span>Remplissage PEA — ${peaPct === null ? 'plafond non défini' : fmtPct(peaPct)}</span>
        <div class="meter"${peaPct !== null ? ` role="progressbar" aria-label="Remplissage du PEA" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, peaPct).toFixed(1)}"` : ''}>${peaPct !== null ? `<span class="${peaPct >= 100 ? 'full' : peaPct >= 90 ? 'warn' : ''}" style="width:${Math.min(100, peaPct).toFixed(1)}%"></span>` : ''}</div>
        <span class="muted">${fmtEuro(peaNet)} (PEA net) / ${fmtEuro(constantes.plafondPea)}</span>
      </label>
      <div class="row"><span class="muted">Part BTC (hors immo)</span><span class="step-total">${btcHorsImmo === null ? '—' : fmtPct(btcHorsImmo * 100)}</span></div>
      <div class="row"><span class="muted">Part BTC (brut ${fmtEuro(brut)})</span><span class="step-total">${btcBrut === null ? '—' : fmtPct(btcBrut * 100)}</span></div>
      <div class="row"><span class="muted">Part BTC (net ${fmtEuro(net)})</span><span class="step-total">${btcNet === null ? '—' : fmtPct(btcNet * 100)}</span></div>
      ${missingHtml}
    </section>

    <section class="card">
      <h2>Évolution mensuelle</h2>
      <div class="chart-box"><canvas id="chart-evol"></canvas></div>
      <div class="table-wrap"><table class="grid">
        <thead><tr><th>Mois</th><th>Bourse</th><th>AV</th><th>Crowd.</th><th>Crypto</th><th>Hors immo</th></tr></thead>
        <tbody>${fallbackRows}</tbody>
      </table></div>
    </section>

    <section class="card">
      <h2>Répartition — ${last.short}</h2>
      <div class="chart-box chart-box-donut"><canvas id="chart-repart"></canvas></div>
      ${slices.map((s) => `<div class="row"><span class="muted">${s.label}</span><span class="step-total">${fmtEuro(s.value)}</span></div>`).join('')}
    </section>
  `

  draw(view.querySelector<HTMLCanvasElement>('#chart-evol'), (canvas) => makeLineChart(canvas, series))
  draw(view.querySelector<HTMLCanvasElement>('#chart-repart'), (canvas) => makeDonutChart(canvas, slices))
}

function makeLineChart(canvas: HTMLCanvasElement, series: DashboardPoint[]): Chart {
  // 0 → null : un domaine non renseigné (ex. octobre) casse la courbe
  // au lieu de faire plonger la ligne à zéro.
  const serie = (get: (p: DashboardPoint) => number): (number | null)[] =>
    series.map((p) => { const v = get(p); return v === 0 ? null : v })
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.map((p) => p.short),
      datasets: [
        lineDataset('Hors immo', CATEGORY_COLORS.total, serie((p) => p.horsImmo), 3),
        lineDataset('Bourse', CATEGORY_COLORS.bourse, serie((p) => p.bourse)),
        lineDataset('Assurance Vie', CATEGORY_COLORS.assuranceVie, serie((p) => p.assuranceVie)),
        lineDataset('Crowdfunding', CATEGORY_COLORS.crowdlending, serie((p) => p.crowdlending)),
        lineDataset('Crypto', CATEGORY_COLORS.crypto, serie((p) => p.crypto)),
      ],
    },
    options: lineOptions(),
  })
}

function makeDonutChart(canvas: HTMLCanvasElement, slices: { label: string; value: number; color: string }[]): Chart {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: slices.map((s) => s.label),
      datasets: [{ data: slices.map((s) => s.value), backgroundColor: slices.map((s) => s.color), borderColor: SURFACE, borderWidth: 2 }],
    },
    options: donutOptions(),
  })
}
