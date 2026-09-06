import { creditsRepo, loanKey, creditsPrefsRepo } from '../db/repos'
import { monthsUnderPrincipal, dateUnderPrincipal } from '../calc/credits'
import { escapeHtml, fmtEuro, fmtPct } from '../utils/format'
import type { Loan } from '../db/schema'

const PALIER = 250000

const ATTRS: { id: string; label: string; fixed?: boolean }[] = [
  { id: 'maison', label: 'Maison' },
  { id: 'numero', label: 'N° crédit' },
  { id: 'depart', label: 'Départ' },
  { id: 'fin', label: 'Fin' },
  { id: 'taux', label: 'Taux' },
  { id: 'montant', label: 'Montant' },
  { id: 'total', label: 'Total' },
  { id: 'restant', label: 'Restant', fixed: true },
  { id: 'rembourse', label: 'Remboursé' },
]

function monthLabel(dateISO: string): string {
  const [, m, y] = /^(\d{4})-(\d{2})/.exec(dateISO)!
  return `${m}/${y}`
}

function pctRemb(l: Pick<Loan, 'montant' | 'restant'>): number {
  if (!l.montant) return 0
  return (l.montant - l.restant) / l.montant
}

function fmtTaux(taux: number): string {
  return `${(taux * 100).toFixed(2).replace('.', ',')} %`
}

type Col =
  | { type: 'loan'; loan: Loan; prop: string }
  | { type: 'sub'; prop: string; men: number; montant: number; restant: number }
  | { type: 'grand'; men: number; montant: number; restant: number }

export async function renderCredits(view: HTMLElement): Promise<void> {
  const loans = await creditsRepo.all()
  const prefs = await creditsPrefsRepo.get()
  const hidden = new Set(prefs.hiddenAttrs)
  const sorted = [...loans].sort(
    (a, b) => a.nom.localeCompare(b.nom) || a.dateDepart.localeCompare(b.dateDepart) || a.numero - b.numero,
  )

  const byProp = new Map<string, Loan[]>()
  for (const l of sorted) {
    if (!byProp.has(l.nom)) byProp.set(l.nom, [])
    byProp.get(l.nom)!.push(l)
  }

  const cols: Col[] = []
  for (const [nom, group] of byProp) {
    for (const l of group) cols.push({ type: 'loan', loan: l, prop: nom })
    cols.push({
      type: 'sub',
      prop: nom,
      men: group.reduce((a, l) => a + l.mensualite, 0),
      montant: group.reduce((a, l) => a + l.montant, 0),
      restant: group.reduce((a, l) => a + l.restant, 0),
    })
  }

  const totalMen = sorted.reduce((a, l) => a + l.mensualite, 0)
  const totalMontant = sorted.reduce((a, l) => a + l.montant, 0)
  const totalRestant = sorted.reduce((a, l) => a + l.restant, 0)
  cols.push({ type: 'grand', men: totalMen, montant: totalMontant, restant: totalRestant })

  const monthsPalier = monthsUnderPrincipal(totalRestant, totalMen, PALIER)
  const grandPct = totalMontant > 0 ? ((totalMontant - totalRestant) / totalMontant) * 100 : 0

  const isFirstOfProp = new Set<string>()
  for (const [, group] of byProp) isFirstOfProp.add(loanKey(group[0]))

  const head = `
    <tr>
      <th class="row-label"></th>
      ${cols.map((c) => {
        const label =
          c.type === 'sub' ? `Sous-total` : c.type === 'grand' ? 'Total' : `<small>${isFirstOfProp.has(loanKey(c.loan)) ? escapeHtml(c.prop) : ''}</small>${escapeHtml(c.loan.numero)}`
        const cls = c.type === 'sub' ? 'class="col-sub"' : c.type === 'grand' ? 'class="col-grand"' : ''
        return `<th ${cls}>${label}</th>`
      }).join('')}
    </tr>`

  const cell = (content: string, cls = ''): string => `<td class="${cls}">${content}</td>`

  const filled = (c: Col, content: string): string =>
    cell(content, c.type === 'loan' ? '' : c.type === 'sub' ? 'sub-content' : 'grand-content')

  const rows: Record<string, string[]> = {
    maison: cols.map((c) => (c.type === 'loan' ? (isFirstOfProp.has(loanKey(c.loan)) ? escapeHtml(c.prop) : '') : c.type === 'sub' ? escapeHtml(c.prop) : '')),
    numero: cols.map((c) => (c.type === 'loan' ? String(c.loan.numero) : '')),
    depart: cols.map((c) => (c.type === 'loan' ? monthLabel(c.loan.dateDepart) : '')),
    fin: cols.map((c) => (c.type === 'loan' ? monthLabel(c.loan.dateFin) : '')),
    taux: cols.map((c) => (c.type === 'loan' ? fmtTaux(c.loan.taux) : '')),
    montant: cols.map((c) => (c.type === 'loan' ? fmtEuro(c.loan.mensualite) : fmtEuro(c.men))),
    total: cols.map((c) => (c.type === 'loan' ? fmtEuro(c.loan.montant) : fmtEuro(c.montant))),
    restant: cols.map((c) => (c.type === 'loan' ? fmtEuro(c.loan.restant) : fmtEuro(c.restant))),
    rembourse: cols.map((c) => (c.type === 'loan' ? fmtPct(pctRemb(c.loan) * 100) : fmtPct(c.montant > 0 ? ((c.montant - c.restant) / c.montant) * 100 : 0))),
  }

  const rowHtml = (id: string, cells: string[]): string =>
    `<tr data-attr="${id}"${hidden.has(id) ? ' class="hidden"' : ''}><th class="row-label">${ATTRS.find((a) => a.id === id)!.label}</th>${cells
      .map((c, i) => filled(cols[i], c))
      .join('')}</tr>`

  const tbody = ATTRS.map((a) => rowHtml(a.id, rows[a.id])).join('')

  const toggles = ATTRS.filter((a) => !a.fixed)
    .map(
      (a) => `
        <label class="chip">
          <input type="checkbox" data-attr="${a.id}" ${hidden.has(a.id) ? '' : 'checked'} />
          ${a.label}
        </label>`,
    )
    .join('')

  view.innerHTML = `
    <section class="card">
      <h2>Crédits immo</h2>
      <div class="unchips" role="group" aria-label="Colonnes à afficher">${toggles}</div>
      <div class="table-wrap"><table class="grid transposed">
        <thead>${head}</thead>
        <tbody>${tbody}</tbody>
        <tfoot>
          <tr><th class="row-label">Total général</th><td class="grand-content" colspan="${cols.length}">${fmtEuro(totalRestant)} restant · ${fmtPct(grandPct)} remboursé</td></tr>
        </tfoot>
      </table></div>
      <p class="muted">Temps restant pour passer sous les ${fmtEuro(PALIER)} d'emprunt : <strong>${monthsPalier > 0 ? `${monthsPalier} mois (${dateUnderPrincipal(new Date().toISOString().slice(0, 10), monthsPalier)})` : 'déjà sous le palier'}</strong></p>
      <p class="muted">Le restant se saisit chaque mois dans l'assistant Saisie (« Crédit restant »).</p>
    </section>
  `

  view.querySelectorAll<HTMLInputElement>('.chip input').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.attr!
      const tr = view.querySelector<HTMLTableRowElement>(`tr[data-attr="${id}"]`)
      if (tr) tr.classList.toggle('hidden', !input.checked)
      const next = new Set(hidden)
      if (input.checked) next.delete(id)
      else next.add(id)
      hidden.clear()
      next.forEach((h) => hidden.add(h))
      void creditsPrefsRepo.save({ hiddenAttrs: [...hidden] })
    })
  })
}
