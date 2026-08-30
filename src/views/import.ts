import { monthRepo, newMonth } from '../db/repos/months'
import { constantesRepo } from '../db/repos/constantes'
import { parseSheet, mergeDomain, type ParseResult, type SheetKind, formatMoney } from '../import/parsers'
import { reconcileMonths, formatReconDiff } from '../import/reconcile'

const KINDS: { id: SheetKind; label: string }[] = [
  { id: 'horsImmo', label: 'Hors immo' },
  { id: 'bourse', label: 'Bourse' },
  { id: 'assuranceVie', label: 'Assurance Vie' },
  { id: 'crowdlending', label: 'Crowdfunding' },
  { id: 'crypto', label: 'Crypto' },
]

/** Totaux hors immo saisis (colonne « Total » de la feuille Hors immo),
 *  conservés en mémoire pour la réconciliation de la session. */
const sourceTotals = new Map<string, number>()

let pending: ParseResult | null = null
let currentKind: SheetKind = 'horsImmo'

export function renderImport(view: HTMLElement): void {
  view.innerHTML = `
    <section class="card">
      <h2>Import initial</h2>
      <p class="muted">
        Collez, pour chaque feuille, son contenu exporté en CSV/TSV. Les données
        sont écrites <strong>chiffrées</strong> dans IndexedDB (une ligne par mois,
        regroupée par domaine). Feuilles acceptées : Hors immo, Bourse, Assurance
        Vie, Crowdlending, Crypto — mise en page actuelle.
      </p>
    </section>

    <section class="card">
      <div class="segs" role="tablist">
        ${KINDS.map((k) => `<button class="seg ${k.id === currentKind ? 'active' : ''}" data-kind="${k.id}">${k.label}</button>`).join('')}
      </div>
      <label class="field">
        <span>Contenu de la feuille « ${kindLabel()} »</span>
        <textarea id="csv-input" rows="8" placeholder="Date\tTotal\t…&#10;01/01/2025\t7099,58\t…" spellcheck="false"></textarea>
      </label>
      <div class="row">
        <button id="analyse" class="primary">1. Analyser</button>
        <button id="import" class="primary" disabled>2. Importer (chiffré)</button>
      </div>
      <p class="msg" aria-live="polite"></p>
    </section>

    <section class="card" hidden id="preview"></section>

    <section class="card">
      <div class="row">
        <h2>Réconciliation Hors immo</h2>
        <button id="reconcile" class="ghost">Réconcilier</button>
      </div>
      <p class="muted">Reconstruit le hors immo depuis les domaines importés et le compare au total de la feuille.</p>
      <div id="recon-rows"></div>
      <p class="msg" id="recon-msg" aria-live="polite"></p>
    </section>

    <section class="card">
      <h2>Zone dangereuse</h2>
      <button id="reset" class="ghost">Vider tous les mois importés</button>
    </section>
  `

  KINDS.forEach((k) => {
    view.querySelector(`[data-kind="${k.id}"]`)!.addEventListener('click', () => {
      currentKind = k.id
      pending = null
      renderImport(view)
      ;(view.querySelector('#csv-input') as HTMLTextAreaElement).focus()
    })
  })

  view.querySelector('#analyse')!.addEventListener('click', () => analyse(view))
  view.querySelector('#import')!.addEventListener('click', () => doImport(view))
  view.querySelector('#reconcile')!.addEventListener('click', () => doReconcile(view))
  view.querySelector('#reset')!.addEventListener('click', () => doReset(view))
}

function kindLabel(): string {
  return KINDS.find((k) => k.id === currentKind)?.label ?? currentKind
}

function msg(view: HTMLElement, text: string, ok = false): HTMLElement {
  const el = view.querySelector('.msg') as HTMLElement
  el.textContent = text
  el.className = `msg ${ok ? 'ok' : 'err'}`
  return el
}

function analyse(view: HTMLElement): void {
  const input = view.querySelector<HTMLTextAreaElement>('#csv-input')!
  try {
    pending = parseSheet(input.value, currentKind)
  } catch (err) {
    msg(view, `Analyse impossible : ${(err as Error).message}`)
    return
  }
  const preview = view.querySelector<HTMLElement>('#preview')!
  const display = pending
  const importBtn = view.querySelector<HTMLButtonElement>('#import')!
  if (!display || display.rows.length === 0) {
    preview.hidden = true
    importBtn.disabled = true
    msg(view, 'Aucun mois reconnu. Vérifiez le séparateur et la ligne d\'en-tête (Date en 1re colonne).')
    return
  }
  msg(view, `${display.rows.length} mois détectés (séparateur : ${display.separator === '\t' ? 'tab' : display.separator}). Relu les colonnes réconnues et cliquez « Importer ».`, true)
  importBtn.disabled = false
  preview.hidden = false
  preview.innerHTML = renderPreview(display)
}

function renderPreview(r: ParseResult): string {
  if (r.columns.length === 0) {
    return `<h2>Aperçu</h2><p class="muted">Aucune colonne reconnue pour « ${kindLabel()} ».</p>`
  }
  const head = `<tr><th>Mois</th>${r.columns.map((c) => `<th>${c.header}</th>`).join('')}</tr>`
  const body = r.rows
    .slice(0, 24)
    .map((row) => `<tr><td>${row.id}</td>${r.columns.map((c) => `<td>${formatMoney(row.values[c.target])}</td>`).join('')}</tr>`)
    .join('')
  const extra = r.skipped.length > 0 ? `<p class="muted">${r.skipped.length} ligne(s) ignorée(s) (sans date ou sans donnée).</p>` : ''
  return `<h2>Aperçu (${r.rows.length} mois)</h2>
    <div class="table-wrap"><table class="grid"><thead>${head}</thead><tbody>${body}</tbody></table></div>${extra}`
}

async function doImport(view: HTMLElement): Promise<void> {
  if (!pending) return
  let touched = 0
  try {
    for (const row of pending.rows) {
      const existing = (await monthRepo.get(row.id)) ?? newMonth(row.id)
      const merged = mergeDomain(existing, currentKind, row.values)
      await monthRepo.save(merged)
      touched++
      if (currentKind === 'horsImmo' && row.values.total !== undefined) {
        sourceTotals.set(row.id, row.values.total)
      }
    }
  } catch (err) {
    msg(view, `Import échoué (verrouillé ?) : ${(err as Error).message}`)
    return
  }
  msg(view, `${touched} mois importés pour « ${kindLabel()} » (${pending.skipped.length} ligne(s) ignorée(s)). Données chiffrées à l'écriture.`, true)
  pending = null
  renderImport(view)
}

async function doReconcile(view: HTMLElement): Promise<void> {
  const conf = await constantesRepo.get()
  const months = await monthRepo.all()
  const rows = reconcileMonths(months, sourceTotals, conf.convUsdEur)
  const box = view.querySelector<HTMLElement>('#recon-rows')!
  const m = view.querySelector<HTMLElement>('#recon-msg')!
  if (rows.length === 0) {
    m.textContent = 'Aucun mois importé.'
    m.className = 'msg err'
    box.innerHTML = ''
    return
  }
  const delta = rows.reduce((acc, r) => acc + (r.diff === null ? 0 : 1), 0)
  const diffCount = rows.filter((r) => r.diff !== null && Math.abs(r.diff) >= 0.005).length
  m.textContent = `${rows.length} mois analysés — ${diffCount} écart(s) à vérifier.`
  m.className = `msg ${diffCount === 0 ? 'ok' : 'err'}`
  box.innerHTML = `
    <table class="grid">
      <thead><tr><th>Mois</th><th>Hors immo reconstruit</th><th>Total feuille</th><th>Écart</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${r.id}</td><td>${formatMoney(r.recomposed)}</td><td>${r.source === null ? '—' : formatMoney(r.source)}</td><td>${formatReconDiff(r.diff)}</td></tr>`).join('')}
      </tbody>
    </table>
    ${delta === 0 ? '' : `<p class="muted">Les domaines manquants (${rows.find((r) => r.missingDomains.length)?.missingDomains.join(', ') ?? '…'}) expliquent les écarts.</p>`}`
}

async function doReset(view: HTMLElement): Promise<void> {
  const ids = await monthRepo.ids()
  if (ids.length === 0) {
    msg(view, 'Aucun mois à vider.')
    return
  }
  if (!window.confirm(`Vider les ${ids.length} mois de données de suivi ?`)) return
  if (!window.confirm('Confirmer la suppression définitive (chiffré) ?')) return
  for (const id of ids) await monthRepo.remove(id)
  sourceTotals.clear()
  msg(view, `Tous les mois (${ids.length}) ont été supprimés.`, true)
  renderImport(view)
}