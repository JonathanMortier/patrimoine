import { monthRepo, newMonth } from '../db/repos/months'
import { constantesRepo } from '../db/repos/constantes'
import { compareMonthIds, currentMonthId, formatMonthLabel, nextAfterIds } from '../utils/date'
import type { Constantes, MonthRecord } from '../db/schema'
import {
  DOMAIN_GROUPS,
  buildFieldsHtml,
  collectMonth,
  groupTotal,
  summaryHtml,
  monthLive,
  groupLiveHtml,
  type DomainKey,
  type MonthLive,
} from './fields'
import { fmtEuro } from '../utils/format'

let activeGroup: DomainKey = 'bourse'
let currentMonth = currentMonthId()

interface MonthState {
  months: MonthRecord[]
  live: Map<string, MonthLive>
  constantes: Constantes
}

export async function renderDomaines(view: HTMLElement): Promise<void> {
  const constantes = await constantesRepo.get()
  const months = (await monthRepo.all()).sort((a, b) => compareMonthIds(a.id, b.id))
  const ids = months.map((m) => m.id)

  if (ids.length > 0 && !ids.includes(currentMonth)) currentMonth = ids[ids.length - 1]

  const live = new Map<string, MonthLive>()
  let prevTotal: number | null = null
  for (const m of months) {
    const l = monthLive(m, constantes, prevTotal)
    live.set(m.id, l)
    prevTotal = l.horsImmoTotal
  }
  const week: MonthState = { months, live, constantes }

  const base = months.find((m) => m.id === currentMonth) ?? newMonth(currentMonth)
  base.id = currentMonth

  view.innerHTML = `
    <section class="card">
      <div class="row nav-month">
        <button id="m-prev" class="ghost" title="Mois précédent">‹</button>
        <select id="m-select" class="month-select" aria-label="Mois"></select>
        <button id="m-next" class="ghost" title="Mois suivant">›</button>
      </div>
      <div class="segs" role="tablist">
        ${DOMAIN_GROUPS.map((g) => `<button class="seg ${g.id === activeGroup ? 'active' : ''}" data-group="${g.id}">${g.label}</button>`).join('')}
      </div>
    </section>

    <div id="month-fields">${buildFieldsHtml(base)}</div>

    <section class="card">
      <div class="row"><h2>Totaux du mois</h2><span class="muted month-title">${formatMonthLabel(currentMonth)}</span></div>
      <div id="summary">${summaryHtml(monthLive(base, constantes, prevTotalFor(week, currentMonth)))}</div>
      <div class="row">
        <button id="save" class="primary">Enregistrer</button>
        <span class="muted">Écriture chiffrée.</span>
      </div>
      <p class="msg" aria-live="polite"></p>
    </section>

    <section class="card">
      <div class="row"><h2>Historique — ${groupLabel()}</h2></div>
      <div id="history">${renderHistory(week)}</div>
    </section>
  `

  bindMonthNav(view, ids)
  bindGroupTabs(view)
  bindLiveInputs(view, week)
  bindSave(view)

  refreshGroupLive(view, week, base)
}

function groupLabel(): string {
  return DOMAIN_GROUPS.find((g) => g.id === activeGroup)?.label ?? ''
}

function prevTotalFor(week: MonthState, id: string): number | null {
  const ids = [...week.live.keys()].sort(compareMonthIds)
  const before = ids.filter((x) => compareMonthIds(x, id) < 0).at(-1)
  return before ? (week.live.get(before)?.horsImmoTotal ?? null) : null
}

function prevMonth(week: MonthState): MonthRecord | undefined {
  return week.months.filter((m) => compareMonthIds(m.id, currentMonth) < 0).at(-1)
}

function bindMonthNav(view: HTMLElement, ids: string[]): void {
  const select = view.querySelector<HTMLSelectElement>('#m-select')!
  const opts = [...new Set([...ids, currentMonthId(), nextAfterIds(ids)])].sort(compareMonthIds)
  select.innerHTML = opts
    .map((id) => `<option value="${id}" ${id === currentMonth ? 'selected' : ''}>${formatMonthLabel(id)}</option>`)
    .join('')
  const go = (delta: number) => {
    const i = opts.indexOf(currentMonth)
    const j = Math.max(0, Math.min(opts.length - 1, i + delta))
    currentMonth = opts[j]
    void renderDomaines(view)
  }
  view.querySelector('#m-prev')!.addEventListener('click', () => go(-1))
  view.querySelector('#m-next')!.addEventListener('click', () => go(1))
  select.addEventListener('change', () => {
    currentMonth = select.value
    void renderDomaines(view)
  })
}

function bindGroupTabs(view: HTMLElement): void {
  DOMAIN_GROUPS.forEach((g) => {
    view.querySelector(`[data-group="${g.id}"]`)!.addEventListener('click', () => {
      activeGroup = g.id
      void renderDomaines(view)
    })
  })
}

function collect(view: HTMLElement): MonthRecord {
  const month = newMonth(currentMonth)
  month.id = currentMonth
  return collectMonth(month, view)
}

function bindLiveInputs(view: HTMLElement, week: MonthState): void {
  view.querySelectorAll<HTMLInputElement>('#month-fields input[name]').forEach((input) => {
    input.addEventListener('input', () => {
      const month = collect(view)
      const summary = view.querySelector<HTMLElement>('#summary')
      if (summary) summary.innerHTML = summaryHtml(monthLive(month, week.constantes, prevTotalFor(week, currentMonth)))
      refreshGroupLive(view, week, month)
    })
  })
}

function refreshGroupLive(view: HTMLElement, week: MonthState, month: MonthRecord): void {
  const el = view.querySelector<HTMLElement>(`#live-${activeGroup}`)
  if (!el) return
  const total = groupTotal(activeGroup, month, week.constantes)
  const prev = prevMonth(week)
  const prevTotal = prev ? groupTotal(activeGroup, prev, week.constantes) : null
  el.innerHTML = groupLiveHtml(groupLabel(), total, prevTotal)
}

async function bindSave(view: HTMLElement): Promise<void> {
  view.querySelector('#save')!.addEventListener('click', async () => {
    const base = (await monthRepo.get(currentMonth)) ?? newMonth(currentMonth)
    base.id = currentMonth
    collectMonth(base, view)
    const msg = view.querySelector<HTMLElement>('.msg')!
    try {
      await monthRepo.save(base)
      msg.textContent = `Mois ${formatMonthLabel(currentMonth)} enregistré (chiffré).`
      msg.className = 'msg ok'
      await renderDomaines(view)
    } catch (err) {
      msg.textContent = `Enregistrement impossible (verrouillé ?) : ${(err as Error).message}`
      msg.className = 'msg err'
    }
  })
}

function renderHistory(week: MonthState): string {
  const group = DOMAIN_GROUPS.find((g) => g.id === activeGroup)!
  const rows = [...week.months].sort((a, b) => compareMonthIds(a.id, b.id)).slice(-12).reverse()
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
      return `<tr><td>${m.id}</td>${cells}<td><strong>${fmtEuro(groupTotal(activeGroup, m, week.constantes))}</strong></td></tr>`
    })
    .join('')
  return `<div class="table-wrap"><table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table></div>`
}