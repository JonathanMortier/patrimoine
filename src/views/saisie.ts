import { monthRepo, newMonth } from '../db/repos/months'
import { constantesRepo } from '../db/repos/constantes'
import { compareMonthIds, currentMonthId, formatMonthLabel, nextAfterIds } from '../utils/date'
import type { Constantes, MonthRecord } from '../db/schema'
import {
  DOMAIN_GROUPS,
  collectMonth,
  summaryHtml,
  monthLive,
  groupTotal,
  type DomainKey,
  type MonthLive,
} from './fields'
import { fmtEuro } from '../utils/format'

let targetMonth = ''
let historyGroup: DomainKey = 'bourse'

export async function renderSaisie(view: HTMLElement): Promise<void> {
  const constantes = await constantesRepo.get()
  const months = (await monthRepo.all()).sort((a, b) => compareMonthIds(a.id, b.id))
  const ids = months.map((m) => m.id)
  if (!targetMonth || !ids.concat([currentMonthId()]).includes(targetMonth)) {
    targetMonth = nextAfterIds(ids)
  }

  const live = new Map<string, MonthLive>()
  let prevTotal: number | null = null
  for (const m of months) {
    const l = monthLive(m, constantes, prevTotal)
    live.set(m.id, l)
    prevTotal = l.horsImmoTotal
  }

  const prev = months.filter((m) => compareMonthIds(m.id, targetMonth) < 0).at(-1)
  const base = months.find((m) => m.id === targetMonth) ?? newMonth(targetMonth)
  base.id = targetMonth

  view.innerHTML = `
    <section class="card">
      <h2>Assistant « 1er du mois »</h2>
      <p class="muted">Saisissez le mois à compléter : ${formatMonthLabel(targetMonth)} (proposé), puis enregistrez. Chaque étape montre l'évolution vs le mois précédent.</p>
      <div class="row nav-month">
        <button id="m-prev" class="ghost" title="Mois précédent">‹</button>
        <select id="m-target" class="month-select" aria-label="Mois à saisir"></select>
        <button id="m-next" class="ghost" title="Mois suivant">›</button>
      </div>
    </section>

    <section class="card">
      <div class="row"><h2>Totaux</h2><span class="muted month-title">${formatMonthLabel(targetMonth)}</span></div>
      <div id="summary">${summaryHtml(monthLive(base, constantes, prevTotalOf(targetMonth, live)))}</div>
    </section>

    <div id="steps">
      ${DOMAIN_GROUPS.map((g, i) => {
        const total = liveTotalFor(g.id, base, constantes)
        const prevTotal = prev ? liveTotalFor(g.id, prev, constantes) : undefined
        const prevStr =
          prevTotal === undefined
            ? ''
            : ` <span class="var ${total >= prevTotal ? 'pos' : 'neg'}">vs ${fmtEuro(prevTotal)} (${total >= prevTotal ? '▲' : '▼'} ${fmtEuro(Math.abs(total - prevTotal))})</span>`
        return `
          <section class="card step" data-step="${i + 1}">
            <div class="step-head"><span class="badge">${i + 1}</span><h2>${g.label}</h2><span class="step-total" id="step-total-${g.id}">${fmtEuro(total)}${prevStr}</span></div>
            ${g.hint ? `<p class="muted">${g.hint}</p>` : ''}
            <div class="grid2">
              ${g.fields
                .map((f) => {
                  const [d, k] = f.path.split('.') as [string, string]
                  const v = (base as unknown as Record<string, Record<string, number>>)[d][k] ?? 0
                  return `<label class="field"><span>${f.label}</span><input type="number" inputmode="decimal" step="0.01" name="${f.path}" value="${String(v)}" /></label>`
                })
                .join('')}
            </div>
          </section>`
      }).join('')}
    </div>

    <section class="card">
      <h2>Historique</h2>
      <div class="segs" role="tablist">
        ${DOMAIN_GROUPS.map((g) => `<button class="seg ${g.id === historyGroup ? 'active' : ''}" data-hgroup="${g.id}">${g.label}</button>`).join('')}
      </div>
      <div id="history">${renderHistory(months, constantes)}</div>
    </section>

    <section class="card">
      <div class="row">
        <button id="save" class="primary">Enregistrer ${formatMonthLabel(targetMonth)}</button>
        <span class="muted">Écriture chiffrée.</span>
      </div>
      <p class="msg" aria-live="polite"></p>
    </section>
  `

  bindMonthSelect(view, ids)
  bindStepsTotal(view, live, constantes)
  bindHistoryTabs(view, months, constantes)
  bindSave(view)
}

function renderHistory(months: MonthRecord[], constantes: Constantes): string {
  const group = DOMAIN_GROUPS.find((g) => g.id === historyGroup)!
  const rows = [...months].sort((a, b) => compareMonthIds(a.id, b.id)).slice(-12).reverse()
  if (rows.length === 0) return '<p class="muted">Aucun mois enregistré.</p>'
  const head = `<tr><th>Mois</th>${group.fields.map((f) => `<th>${f.label}</th>`).join('')}<th>Total</th></tr>`
  const body = rows
    .map((m) => {
      const cells = group.fields
        .map((f) => {
          const [d, k] = f.path.split('.') as [DomainKey, string]
          const v = (m[d] as unknown as Record<string, number>)[k] ?? 0
          return `<td>${fmtEuro(v)}</td>`
        })
        .join('')
      return `<tr><td>${m.id}</td>${cells}<td><strong>${fmtEuro(groupTotal(group.id, m, constantes))}</strong></td></tr>`
    })
    .join('')
  return `<div class="table-wrap"><table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table></div>`
}

function bindHistoryTabs(view: HTMLElement, months: MonthRecord[], constantes: Constantes): void {
  DOMAIN_GROUPS.forEach((g) => {
    view.querySelector(`[data-hgroup="${g.id}"]`)?.addEventListener('click', () => {
      historyGroup = g.id
      view.querySelectorAll('[data-hgroup]').forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.hgroup === historyGroup))
      const el = view.querySelector<HTMLElement>('#history')
      if (el) el.innerHTML = renderHistory(months, constantes)
    })
  })
}

function liveTotalFor(id: string, month: MonthRecord, constantes: Constantes): number {
  switch (id) {
    case 'bourse':
      return month.bourse.cto + month.bourse.privateMk + month.bourse.pea
    case 'assuranceVie':
      return month.assuranceVie.livretVie + month.assuranceVie.multiVie + month.assuranceVie.cashFortuneo + month.assuranceVie.linxea + month.assuranceVie.scpi
    case 'crowdlending':
      return month.crowdlending.investi + month.crowdlending.soldeDispo
    case 'crypto': {
      const usd = (month.crypto.hotWalletPrincipalUSD + month.crypto.hotWalletLedgerUSD + month.crypto.defiUSD) / (constantes.convUsdEur || 1)
      return month.crypto.tradeRep + month.crypto.binance + month.crypto.ledger + usd
    }
    default:
      return groupTotal('horsImmo', month, constantes)
  }
}

function prevTotalOf(target: string, live: Map<string, MonthLive>): number | null {
  const ids = [...live.keys()].sort(compareMonthIds)
  const before = ids.filter((id) => compareMonthIds(id, target) < 0).at(-1)
  return before ? (live.get(before)?.horsImmoTotal ?? null) : null
}

function bindMonthSelect(view: HTMLElement, ids: string[]): void {
  const select = view.querySelector<HTMLSelectElement>('#m-target')!
  const opts = [...new Set([...ids, currentMonthId(), nextAfterIds(ids)])].sort(compareMonthIds)
  select.innerHTML = opts
    .map((id) => `<option value="${id}" ${id === targetMonth ? 'selected' : ''}>${formatMonthLabel(id)}</option>`)
    .join('')
  const go = (delta: number) => {
    const i = opts.indexOf(targetMonth)
    const j = Math.max(0, Math.min(opts.length - 1, i + delta))
    targetMonth = opts[j]
    void renderSaisie(view)
  }
  view.querySelector('#m-prev')!.addEventListener('click', () => go(-1))
  view.querySelector('#m-next')!.addEventListener('click', () => go(1))
  select.addEventListener('change', () => {
    targetMonth = select.value
    void renderSaisie(view)
  })
}

function bindStepsTotal(view: HTMLElement, live: Map<string, MonthLive>, constantes: Constantes): void {
  view.querySelectorAll<HTMLInputElement>('#steps input[name]').forEach((input) => {
    input.addEventListener('input', () => {
      const month = collectAll(view)
      const summary = view.querySelector<HTMLElement>('#summary')
      if (summary) summary.innerHTML = summaryHtml(monthLive(month, constantes, prevTotalOf(targetMonth, live)))
      for (const g of DOMAIN_GROUPS) {
        const el = view.querySelector<HTMLElement>(`#step-total-${g.id}`)
        if (el) el.textContent = fmtEuro(liveTotalFor(g.id, month, constantes))
      }
    })
  })
}

function collectAll(view: HTMLElement): MonthRecord {
  const month = newMonth(targetMonth)
  month.id = targetMonth
  return collectMonth(month, view)
}

async function bindSave(view: HTMLElement): Promise<void> {
  view.querySelector('#save')!.addEventListener('click', async () => {
    const base = (await monthRepo.get(targetMonth)) ?? newMonth(targetMonth)
    base.id = targetMonth
    collectMonth(base, view)
    const msg = view.querySelector<HTMLElement>('.msg')!
    try {
      await monthRepo.save(base)
      msg.textContent = `Mois ${formatMonthLabel(targetMonth)} enregistré (chiffré).`
      msg.className = 'msg ok'
      await renderSaisie(view)
    } catch (err) {
      msg.textContent = `Enregistrement impossible (verrouillé ?) : ${(err as Error).message}`
      msg.className = 'msg err'
    }
  })
}