import { monthRepo, newMonth } from '../db/repos/months'
import { constantesRepo } from '../db/repos/constantes'
import { creditsRepo, loanKey } from '../db/repos/credits'
import { compareMonthIds, currentMonthId, formatMonthLabel, nextAfterIds } from '../utils/date'
import type { Constantes, Loan, MonthRecord } from '../db/schema'
import {
  DOMAIN_GROUPS,
  collectMonth,
  summaryHtml,
  monthLive,
  groupTotal,
  parseAmount,
  type DomainKey,
  type MonthLive,
} from './fields'
import { fmtEuro } from '../utils/format'

const CREDITS_GROUP_ID = 'creditsRestant'

let targetMonth = ''
let historyGroup: DomainKey | typeof CREDITS_GROUP_ID = 'bourse'

export async function renderSaisie(view: HTMLElement): Promise<void> {
  const [constantes, months, loans] = await Promise.all([
    constantesRepo.get(),
    monthRepo.all(),
    creditsRepo.all(),
  ])
  const loansSorted = [...loans].sort((a, b) => a.nom.localeCompare(b.nom) || a.numero - b.numero)
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

  const creditsRestant = base.creditsRestant ?? {}
  const monthExists = months.some((m) => m.id === targetMonth)
  const creditsFields = loansSorted
    .map((l) => {
      const key = loanKey(l)
      const v = creditsRestant[key] ?? l.restant
      return `<label class="field"><span>${l.nom} — N°${l.numero}</span><input type="number" inputmode="decimal" step="0.01" name="creditsRestant.${key}" data-credit-key="${key}" value="${String(v)}" /></label>`
    })
    .join('')
  const creditsStepTotal = loansSorted.reduce((a, l) => a + (creditsRestant[loanKey(l)] ?? l.restant), 0)
  const creditsStep = loansSorted.length === 0
    ? `<section class="card step" data-step="${DOMAIN_GROUPS.length + 1}"><div class="step-head"><span class="badge">${DOMAIN_GROUPS.length + 1}</span><h2>Crédit restant</h2></div><p class="muted">Aucun crédit enregistré. Importez vos prêts dans « Import » puis « Crédits ».</p></section>`
    : `<section class="card step" data-step="${DOMAIN_GROUPS.length + 1}">
        <div class="step-head"><span class="badge">${DOMAIN_GROUPS.length + 1}</span><h2>Crédit restant</h2><span class="step-total" id="step-total-${CREDITS_GROUP_ID}">${fmtEuro(creditsStepTotal)}</span></div>
        <p class="muted">Restant dû de chaque crédit à la fin du mois saisi.</p>
        <div class="grid2">${creditsFields}</div>
      </section>`

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
      ${creditsStep}
    </div>

    <section class="card">
      <h2>Historique</h2>
      <div class="segs" role="tablist">
        ${DOMAIN_GROUPS.map((g) => `<button class="seg ${g.id === historyGroup ? 'active' : ''}" data-hgroup="${g.id}">${g.label}</button>`).join('')}
        <button class="seg ${historyGroup === CREDITS_GROUP_ID ? 'active' : ''}" data-hgroup="${CREDITS_GROUP_ID}">Crédit restant</button>
      </div>
      <div id="history">${renderHistory(months, constantes)}</div>
    </section>

    <section class="card">
      <div class="row">
        <button id="save" class="primary">Enregistrer ${formatMonthLabel(targetMonth)}</button>
        ${monthExists ? '<button id="delete" class="danger">Supprimer</button>' : ''}
        <span class="muted">Écriture chiffrée.</span>
      </div>
      <p class="msg" aria-live="polite"></p>
    </section>

    <div id="del-modal" class="modal-overlay" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="del-title">
        <h3 id="del-title">Supprimer ${formatMonthLabel(targetMonth)} ?</h3>
        <p>Toutes les données du mois sélectionné seront définitivement supprimées.</p>
        <div class="row modal-actions">
          <button id="del-cancel" class="ghost">Annuler</button>
          <button id="del-confirm" class="danger">Supprimer</button>
        </div>
      </div>
    </div>
  `

  bindMonthSelect(view, ids)
  bindStepsTotal(view, live, constantes)
  bindHistoryTabs(view, months, constantes)
  bindSave(view, loansSorted)
  bindDelete(view)
}

function renderHistory(months: MonthRecord[], constantes: Constantes): string {
  if (historyGroup === CREDITS_GROUP_ID) return renderCreditsHistory(months)
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

function sumCreditsRestant(m: MonthRecord): number {
  return Object.values(m.creditsRestant ?? {}).reduce((a, v) => a + v, 0)
}

function renderCreditsHistory(months: MonthRecord[]): string {
  const rows = [...months].sort((a, b) => compareMonthIds(a.id, b.id)).slice(-12).reverse()
  if (rows.length === 0) return '<p class="muted">Aucun mois enregistré.</p>'
  const head = '<tr><th>Mois</th><th>Crédit restant</th><th>Évolution</th></tr>'
  const body = rows
    .map((m, i) => {
      const total = sumCreditsRestant(m)
      const prev = i < rows.length - 1 ? sumCreditsRestant(rows[i + 1]) : null
      const delta =
        prev === null
          ? ''
          : `<span class="var ${total <= prev ? 'pos' : 'neg'}">${total <= prev ? '▼' : '▲'} ${fmtEuro(Math.abs(total - prev))}</span>`
      return `<tr><td>${m.id}</td><td><strong>${fmtEuro(total)}</strong></td><td>${delta}</td></tr>`
    })
    .join('')
  return `<div class="table-wrap"><table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table></div>`
}

function bindHistoryTabs(view: HTMLElement, months: MonthRecord[], constantes: Constantes): void {
  view.querySelectorAll<HTMLElement>('[data-hgroup]').forEach((btn) => {
    btn.addEventListener('click', () => {
      historyGroup = (btn.dataset.hgroup as DomainKey | typeof CREDITS_GROUP_ID)!
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
      const ct = view.querySelector<HTMLElement>(`#step-total-${CREDITS_GROUP_ID}`)
      if (ct) ct.textContent = fmtEuro(creditsInputTotal(view))
    })
  })
}

function collectAll(view: HTMLElement): MonthRecord {
  const month = newMonth(targetMonth)
  month.id = targetMonth
  return collectMonth(month, view)
}

function creditsInputTotal(view: HTMLElement): number {
  let s = 0
  view.querySelectorAll<HTMLInputElement>('#steps input[data-credit-key]').forEach((i) => {
    s += parseAmount(i.value)
  })
  return s
}

function collectCreditsRestant(view: HTMLElement, loans: Loan[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const loan of loans) {
    const key = loanKey(loan)
    const input = view.querySelector<HTMLInputElement>(`[data-credit-key="${key}"]`)
    if (input) out[key] = parseAmount(input.value)
  }
  return out
}

async function bindSave(view: HTMLElement, loans: Loan[]): Promise<void> {
  view.querySelector('#save')!.addEventListener('click', async () => {
    const base = (await monthRepo.get(targetMonth)) ?? newMonth(targetMonth)
    base.id = targetMonth
    collectMonth(base, view)
    base.creditsRestant = collectCreditsRestant(view, loans)
    const msg = view.querySelector<HTMLParagraphElement>('.msg')!
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

function bindDelete(view: HTMLElement): void {
  const modal = view.querySelector<HTMLElement>('#del-modal')
  const open = view.querySelector<HTMLButtonElement>('#delete')
  if (!modal || !open) return
  const openModal = () => { modal.hidden = false }
  const closeModal = () => { modal.hidden = true }
  open.addEventListener('click', openModal)
  view.querySelector('#del-cancel')!.addEventListener('click', closeModal)
  modal.addEventListener('click', (ev) => { if (ev.target === modal) closeModal() })
  view.querySelector('#del-confirm')!.addEventListener('click', async () => {
    const msg = view.querySelector<HTMLParagraphElement>('.msg')!
    try {
      await monthRepo.remove(targetMonth)
      closeModal()
      msg.textContent = `Mois ${formatMonthLabel(targetMonth)} supprimé.`
      msg.className = 'msg ok'
      await renderSaisie(view)
    } catch (err) {
      closeModal()
      msg.textContent = `Suppression impossible (verrouillé ?) : ${(err as Error).message}`
      msg.className = 'msg err'
    }
  })
}