import Chart from 'chart.js/auto'
import { constantesRepo } from '../db/repos/constantes'
import { monthRepo } from '../db/repos/months'
import { dashboardSeries } from '../calc/dashboard'
import { buildMonthlyProjection } from '../calc/projectionMonthly'
import { buildAnnualProjection } from '../calc/projectionAnnual'
import { withdrawalMonthly } from '../calc/projection'
import { currentMonthId } from '../utils/date'
import { fmtEuro } from '../utils/format'
import { SERIES_COLORS, lineDataset, lineOptions } from './chartTheme'


let charts: Chart[] = []

function destroyCharts(): void {
  for (const c of charts) { try { c.destroy() } catch { /* déjà détruit */ } }
  charts = []
}

function draw(canvas: HTMLCanvasElement | null, make: (c: HTMLCanvasElement) => Chart): void {
  if (!canvas || !canvas.getContext('2d')) return
  try { charts.push(make(canvas)) } catch { /* contexte indisponible */ }
}

export async function renderProjection(view: HTMLElement): Promise<void> {
  destroyCharts()
  const [constantes, months] = await Promise.all([
    constantesRepo.get(),
    monthRepo.all(),
  ])

  const series = dashboardSeries(months, constantes)
  if (series.length === 0) {
    view.innerHTML = `
      <section class="card">
        <h2>Projection Bourse</h2>
        <p class="muted">Aucun mois enregistré. Commencez par l'import initial ou l'assistant « 1er du mois ».</p>
      </section>`
    return
  }

  const year = Number(currentMonthId().slice(0, 4))
  const currentMonth = Number(currentMonthId().slice(5))
  const bourseByMonth = new Map(series.map((p) => [p.id, p.bourse]))

  // Valeur au 1er janvier = total bourse de décembre N−1 (sinon premier mois de l'année)
  const decPrev = `${year - 1}-12`
  const baseValue = bourseByMonth.get(decPrev) ?? series.find((p) => p.id.startsWith(`${year}-`))?.bourse ?? 0

  const invest = constantes.mensualiteTradeRep + constantes.mensualiteFortuneo
  const taux = constantes.tauxRendement

  const monthly = buildMonthlyProjection({
    realBourse: bourseByMonth,
    baseValue,
    investMensuel: invest,
    taux,
    year,
    currentMonth,
  })

  const annual = buildAnnualProjection({
    startYear: 2025,
    baseValue: 0,
    investMensuel: invest,
    taux,
    years: 26,
    realJanuary: (y) => bourseByMonth.get(`${y}-01`) ?? null,
  })
  const lastYear = annual.at(-1)!
  const salaire = withdrawalMonthly(lastYear.reel)

  const monthlyRows = monthly.map((m) =>
    `<tr><td>${m.label}</td><td class="obj">${fmtEuro(m.objectif)}</td><td>${m.reel === null ? '—' : fmtEuro(m.reel)}</td></tr>`,
  ).join('')

  const annualRows = annual.map((a) =>
    `<tr>
      <td>${a.year}</td>
      <td>${fmtEuro(a.objectif)}</td>
      <td>${fmtEuro(a.objectifPlusValue)}</td>
      <td>${fmtEuro(a.objectifEvol)}</td>
      <td>${fmtEuro(a.reel)}${a.reelReal ? '*' : ''}</td>
      <td>${fmtEuro(a.reelPlusValue)}</td>
      <td>${fmtEuro(a.reelEvol)}</td>
    </tr>`,
  ).join('')

  view.innerHTML = `
    <section class="card">
      <h2>Projection Bourse — ${year}</h2>
      <p class="muted">Valeur au 1er janvier : <strong>${fmtEuro(baseValue)}</strong> · Recurrence mensuelle : ${Math.round(taux * 100)} % + ${fmtEuro(invest)}/mois</p>
      <div class="kpis">
        <div class="kpi"><span class="kpi-label">Objectif ${monthly[0].label} (${year})</span><span class="kpi-val">${fmtEuro(monthly[0].objectif)}</span><span class="kpi-sub">projection</span></div>
        <div class="kpi"><span class="kpi-label">Objectif ${year + 1}</span><span class="kpi-val">${fmtEuro(monthly.at(-1)!.objectif)}</span><span class="kpi-sub">fin d'année</span></div>
        <div class="kpi"><span class="kpi-label">Salaire retrait 4 % (${lastYear.year})</span><span class="kpi-val">${fmtEuro(salaire)}</span><span class="kpi-sub">/mois</span></div>
      </div>
      <div class="chart-box"><canvas id="proj-monthly" role="img" aria-label="Courbes de l'objectif et du réel mensuels ; les valeurs sont dans le tableau du détail mensuel"></canvas></div>
    </section>

    <section class="card">
      <h2>Détail mensuel — Objectif / Réel</h2>
      <div class="table-wrap"><table class="grid">
        <caption class="sr-only">Objectif et réel par mois</caption>
        <thead><tr><th scope="col">Mois</th><th scope="col">Objectif</th><th scope="col">Réel</th></tr></thead>
        <tbody>${monthlyRows}</tbody>
      </table></div>
    </section>

    <section class="card">
      <h2>Évolution annuelle — Réel / Plus value / Évol.</h2>
      <p class="muted">Réél au 1er janvier (ou projection), plus value cumulée et son évolution annuelle.</p>
      <div class="chart-box"><canvas id="proj-annual" role="img" aria-label="Courbes annuelles du réel, de la plus value et de son évolution ; les valeurs sont dans le tableau de projection annuelle"></canvas></div>
    </section>

    <section class="card">
      <h2>Projection annuelle — 2025 → ${lastYear.year}</h2>
      <p class="muted">Objectif : récurrence ${Math.round(taux * 100)} %/an + ${fmtEuro(invest)}/mois depuis 2024 · Réel : valeurs au 1er janvier en base (*), projection ensuite.</p>
      <div class="table-wrap"><table class="grid">
        <caption class="sr-only">Projection annuelle</caption>
        <thead><tr>
          <th scope="col">Année</th>
          <th>Objectif</th><th>Plus value</th><th>Évol. plus value</th>
          <th>Réel</th><th>Plus value</th><th>Évol. plus value</th>
        </tr></thead>
        <tbody>${annualRows}</tbody>
      </table></div>
    </section>
  `

  draw(view.querySelector<HTMLCanvasElement>('#proj-annual'), (c) =>
    new Chart(c, {
      type: 'line',
      data: {
        labels: annual.map((a) => a.year),
        datasets: [
          lineDataset('Réel', SERIES_COLORS.reel, annual.map((a) => a.reel)),
          lineDataset('Plus value Réel', SERIES_COLORS.objectif, annual.map((a) => a.reelPlusValue)),
          lineDataset('Évol. plus value Réel', SERIES_COLORS.evolution, annual.map((a) => a.reelEvol), 2, true),
        ],
      },
      options: { ...lineOptions(), spanGaps: false },
    }),
  )

  draw(view.querySelector<HTMLCanvasElement>('#proj-monthly'), (c) =>
    new Chart(c, {
      type: 'line',
      data: {
        labels: monthly.map((m) => m.label),
        datasets: [
          lineDataset('Objectif', SERIES_COLORS.objectif, monthly.map((m) => m.objectif)),
          lineDataset('Réel', SERIES_COLORS.reel, monthly.map((m) => m.reel), 2, true),
        ],
      },
      options: { ...lineOptions(), spanGaps: false },
    }),
  )
}
