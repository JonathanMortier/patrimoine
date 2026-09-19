import { creditsRepo, creditsPrefsRepo } from '../db/repos'
import { monthsUnderPrincipal, dateUnderPrincipal } from '../calc/credits'
import { escapeHtml, fmtEuro, fmtPct } from '../utils/format'
import type { Loan } from '../db/schema'

const PALIER = 250000

const ATTRS: { id: string; label: string; fixed?: boolean }[] = [
  { id: 'numero', label: 'N° crédit' },
  { id: 'depart', label: 'Départ' },
  { id: 'fin', label: 'Fin' },
  { id: 'taux', label: 'Taux' },
  { id: 'montant', label: 'Mensualité' },
  { id: 'total', label: 'Capital emprunté' },
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

  const attrCls = (attrId: string): string => (hidden.has(attrId) ? ' hidden' : '')

  const valueFor = (c: Col, attrId: string): string => {
    if (c.type === 'sub') {
      switch (attrId) {
        case 'montant': return fmtEuro(c.men)
        case 'total': return fmtEuro(c.montant)
        case 'restant': return fmtEuro(c.restant)
        case 'rembourse': return fmtPct(c.montant > 0 ? ((c.montant - c.restant) / c.montant) * 100 : 0)
        default: return ''
      }
    }
    if (c.type === 'grand') {
      switch (attrId) {
        case 'montant': return fmtEuro(c.men)
        case 'total': return fmtEuro(c.montant)
        case 'restant': return fmtEuro(c.restant)
        case 'rembourse': return fmtPct(c.montant > 0 ? ((c.montant - c.restant) / c.montant) * 100 : 0)
        default: return ''
      }
    }
    const l = c.loan
    switch (attrId) {
      case 'numero': return String(l.numero)
      case 'depart': return monthLabel(l.dateDepart)
      case 'fin': return monthLabel(l.dateFin)
      case 'taux': return fmtTaux(l.taux)
      case 'montant': return fmtEuro(l.mensualite)
      case 'total': return fmtEuro(l.montant)
      case 'restant': return fmtEuro(l.restant)
      case 'rembourse': return fmtPct(pctRemb(l) * 100)
      default: return ''
    }
  }

  const rowLabel = (c: Col): string =>
    c.type === 'sub' ? 'Sous-total' : c.type === 'grand' ? 'Total' : escapeHtml(c.prop)

  const head = `
    <tr>
      <th class="row-label" scope="col"><span class="sr-only">Prêt</span></th>
      ${ATTRS.map((a) => `<th data-attr="${a.id}"${attrCls(a.id)}>${a.label}</th>`).join('')}
    </tr>`

  const bodyRows = cols.map((c) => {
    const rowCls = c.type === 'sub' ? 'row-sub' : c.type === 'grand' ? 'row-grand' : ''
    const cells = ATTRS.map((a) => `<td data-attr="${a.id}"${attrCls(a.id)}>${valueFor(c, a.id)}</td>`).join('')
    return `<tr class="${rowCls}"><th class="row-label">${rowLabel(c)}</th>${cells}</tr>`
  }).join('')

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
        <tbody>${bodyRows}</tbody>
      </table></div>
      <p class="muted">Temps restant pour passer sous les ${fmtEuro(PALIER)} d'emprunt : <strong>${monthsPalier > 0 ? `${monthsPalier} mois (${dateUnderPrincipal(new Date().toISOString().slice(0, 10), monthsPalier)})` : 'déjà sous le palier'}</strong></p>
      <p class="muted">Le restant se saisit chaque mois dans l'assistant Saisie (« Crédit restant »).</p>
    </section>
  `

  view.querySelectorAll<HTMLInputElement>('.chip input').forEach((input) => {
    input.addEventListener('change', () => {
      const id = input.dataset.attr!
      view.querySelectorAll<HTMLElement>(`table [data-attr="${id}"]`).forEach((el) => {
        el.classList.toggle('hidden', !input.checked)
      })
      const next = new Set(hidden)
      if (input.checked) next.delete(id)
      else next.add(id)
      hidden.clear()
      next.forEach((h) => hidden.add(h))
      void creditsPrefsRepo.save({ hiddenAttrs: [...hidden] })
    })
  })
}
