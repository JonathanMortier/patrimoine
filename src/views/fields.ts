import type { Constantes, MonthRecord } from '../db/schema'
import { computeDerivedMonth, type DerivedMonth } from '../calc'
import { bourseTotal } from '../calc/bourse'
import { assuranceVieTotal } from '../calc/assuranceVie'
import { crowdlendingTotals } from '../calc/crowdlending'
import { cryptoTotals } from '../calc/crypto'
import { horsImmoLiquidity } from '../calc/horsImmo'
import { fmtEuro, fmtAmount, fmtPct } from '../utils/format'

export type DomainKey = 'bourse' | 'assuranceVie' | 'crowdlending' | 'crypto' | 'horsImmo'

export interface FieldSpec {
  path: string // `domaine.champ`
  label: string
}

export interface GroupSpec {
  id: DomainKey
  label: string
  hint?: string
  fields: FieldSpec[]
}

export const DOMAIN_GROUPS: GroupSpec[] = [
  {
    id: 'bourse',
    label: 'Bourse',
    fields: [
      { path: 'bourse.cto', label: 'CTO' },
      { path: 'bourse.privateMk', label: 'Private Market' },
      { path: 'bourse.pea', label: 'PEA (ss espèces)' },
      { path: 'bourse.plusValue', label: 'Plus-value' },
    ],
  },
  {
    id: 'assuranceVie',
    label: 'Assurance Vie',
    fields: [
      { path: 'assuranceVie.livretVie', label: 'Livret Vie' },
      { path: 'assuranceVie.multiVie', label: 'Multi Vie' },
      { path: 'assuranceVie.cashFortuneo', label: 'Cash sur Fortuneo' },
      { path: 'assuranceVie.linxea', label: 'Linxea Spirit 2' },
      { path: 'assuranceVie.scpi', label: 'SCPI' },
    ],
  },
  {
    id: 'crowdlending',
    label: 'Crowdfunding',
    hint: 'Fiscalité = prélèvement sur le revenu brut (vide → 30 % par défaut).',
    fields: [
      { path: 'crowdlending.investi', label: 'Bricks investies' },
      { path: 'crowdlending.soldeDispo', label: 'Solde dispo' },
      { path: 'crowdlending.revenuBrut', label: 'Revenu brut (mensuel)' },
      { path: 'crowdlending.fiscalite', label: 'Fiscalité (mensuel)' },
    ],
  },
  {
    id: 'crypto',
    label: 'Crypto',
    hint: 'Wallets en $ convertis via la conversion des Constantes.',
    fields: [
      { path: 'crypto.tradeRep', label: 'Trade Republic (€)' },
      { path: 'crypto.binance', label: 'Binance (€)' },
      { path: 'crypto.ledger', label: 'Ledger (€)' },
      { path: 'crypto.hotWalletPrincipalUSD', label: 'Hot Wallet Principal ($)' },
      { path: 'crypto.hotWalletLedgerUSD', label: 'Hot Wallet Ledger ($)' },
      { path: 'crypto.defiUSD', label: 'DeFi non reconnue ($)' },
      { path: 'crypto.btc', label: 'Quantité BTC' },
    ],
  },
  {
    id: 'horsImmo',
    label: 'Comptes / Livrets',
    hint: 'Le total du Hors immo est recalculé, les autres postes viennent des domaines.',
    fields: [
      { path: 'horsImmo.compteCourantCa', label: 'Compte courant — Crédit Agricole' },
      { path: 'horsImmo.compteCourantFortuneo', label: 'Compte courant — Fortuneo' },
      { path: 'horsImmo.compteCourantTradeRep', label: 'Compte courant — Trade Republic' },
      { path: 'horsImmo.livretA', label: 'Livret A' },
      { path: 'horsImmo.ldd', label: 'LDD' },
    ],
  },
]

function atPath(month: MonthRecord, path: string): number {
  const [domain, key] = path.split('.') as [DomainKey, string]
  return (month[domain] as unknown as Record<string, number>)[key] ?? 0
}

function setPath(month: MonthRecord, path: string, value: number): void {
  const [domain, key] = path.split('.') as [DomainKey, string]
  ;(month[domain] as unknown as Record<string, number>)[key] = value
}

export function parseAmount(raw: string): number {
  const s = raw.trim().replace(/[\s\u00A0€%]/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

export function buildFieldsHtml(month: MonthRecord): string {
  return DOMAIN_GROUPS.map(
    (g) => `
      <section class="card" id="group-${g.id}">
        <h2>${g.label}</h2>
        ${g.hint ? `<p class="muted">${g.hint}</p>` : ''}
        <div class="grid2">
          ${g.fields
            .map(
              (f) => `
                <label class="field">
                  <span>${f.label}</span>
                  <input type="number" inputmode="decimal" step="0.01" name="${f.path}"
                    value="${fmtAmount(atPath(month, f.path))}" />
                </label>`,
            )
            .join('')}
        </div>
        <div class="klabel" id="live-${g.id}"></div>
      </section>`,
  ).join('')
}

/** Applique les valeurs saisies (path → texte) au mois (testé sans DOM). */
export function applyValues(month: MonthRecord, values: Record<string, string>): MonthRecord {
  for (const [path, raw] of Object.entries(values)) {
    const input = DOMAIN_GROUPS.flatMap((g) => g.fields).find((f) => f.path === path)
    if (input && raw !== undefined) setPath(month, path, parseAmount(raw))
  }
  return month
}

/** Signe la valeur récupérée dans le formulaire courant. */
export function collectMonth(month: MonthRecord, root: HTMLElement): MonthRecord {
  const values: Record<string, string> = {}
  for (const g of DOMAIN_GROUPS) {
    for (const f of g.fields) {
      const input = root.querySelector<HTMLInputElement>(`[name="${f.path}"]`)
      if (input) values[f.path] = input.value
    }
  }
  return applyValues(month, values)
}

export interface MonthLive {
  derived: DerivedMonth
  horsImmoTotal: number
  variation: number | null
}

/** Total d'un domaine pour un mois donné. */
export function groupTotal(id: DomainKey, month: MonthRecord, constantes: Constantes): number {
  switch (id) {
    case 'bourse':
      return bourseTotal(month.bourse)
    case 'assuranceVie':
      return assuranceVieTotal(month.assuranceVie)
    case 'crowdlending':
      return crowdlendingTotals(month.crowdlending).total
    case 'crypto':
      return cryptoTotals(month.crypto, constantes.convUsdEur).totalEur
    case 'horsImmo': {
      const liquidity = horsImmoLiquidity(month.horsImmo)
      return liquidity.compteCourant + liquidity.livrets
    }
  }
}

/** Recalcul en direct pour un mois, avec la variation vs le mois précédent. */
export function monthLive(month: MonthRecord, constantes: Constantes, prevTotal: number | null): MonthLive {
  const derived = computeDerivedMonth(month, constantes, prevTotal)
  return { derived, horsImmoTotal: derived.horsImmo.total, variation: derived.horsImmo.variation }
}

function kpi(label: string, value: string, sub = ''): string {
  return `<div class="kpi"><span class="kpi-label">${label}</span><span class="kpi-val">${value}</span>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}</div>`
}

export function summaryHtml(live: MonthLive): string {
  const d = live.derived
  const variation =
    live.variation === null
      ? ''
      : `<span class="var ${live.variation >= 0 ? 'pos' : 'neg'}">${live.variation >= 0 ? '▲' : '▼'} ${fmtEuro(Math.abs(live.variation))}</span>`
  const btc = d.partBtc === null ? '' : ` · BTC ${fmtPct(d.partBtc * 100, 1)}`
  return `
    <div class="kpis">
      ${kpi('Hors immo', fmtEuro(live.horsImmoTotal), variation)}
      ${kpi('Bourse', fmtEuro(d.bourse))}
      ${kpi('Assurance Vie', fmtEuro(d.assuranceVie))}
      ${kpi('Crowdfunding', fmtEuro(d.crowdlending.total), `net ${fmtEuro(d.crowdlending.net)}`)}
      ${kpi('Crypto', fmtEuro(d.crypto), `dont ${fmtEuro(d.usdEur)} converti de $${btc}`)}
    </div>`
}

/** Ligne « total vs total du mois précédent » sous un groupe de champs. */
export function groupLiveHtml(label: string, total: number | null, prev: number | null): string {
  const delta = total === null || prev === null ? null : total - prev
  const del =
    delta === null || prev === null
      ? ''
      : `<span class="var ${delta >= 0 ? 'pos' : 'neg'}">vs ${fmtEuro(prev)} (${delta >= 0 ? '▲' : '▼'} ${fmtEuro(Math.abs(delta))})</span>`
  return `<div class="klabel">${label} : <strong>${fmtEuro(total ?? 0)}</strong> ${del}</div>`
}

export { fmtEuro }