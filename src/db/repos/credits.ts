import { STORES, type Loan } from '../schema'
import { getAllEncoded, getEncoded, putEncoded, removeEncoded } from '../records'

export const PALIER_PRINCIPAL_250K = 250000

export function loanKey(loan: Loan): string {
  return `${loan.nom}-${loan.numero}`
}

export const creditsRepo = {
  async get(key: string): Promise<Loan | undefined> {
    return getEncoded<Loan>(STORES.credits, key)
  },

  async save(loan: Loan): Promise<void> {
    await putEncoded(STORES.credits, loanKey(loan), loan)
  },

  async all(): Promise<Loan[]> {
    return getAllEncoded<Loan>(STORES.credits, (l) => `${l.dateDepart}${loanKey(l)}`)
  },

  async remove(key: string): Promise<void> {
    await removeEncoded(STORES.credits, key)
  },
}