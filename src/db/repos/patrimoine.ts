import { STORES, type AccountState } from '../schema'
import { getAllEncoded, getEncoded, putEncoded, removeEncoded } from '../records'

export const patrimoineRepo = {
  async get(categorie: string): Promise<AccountState | undefined> {
    return getEncoded<AccountState>(STORES.patrimoine, categorie)
  },

  async save(account: AccountState): Promise<void> {
    await putEncoded(STORES.patrimoine, account.categorie, account)
  },

  async all(): Promise<AccountState[]> {
    return getAllEncoded<AccountState>(STORES.patrimoine, (a) => a.categorie)
  },

  async remove(categorie: string): Promise<void> {
    await removeEncoded(STORES.patrimoine, categorie)
  },
}