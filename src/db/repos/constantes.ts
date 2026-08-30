import { STORES, type Constantes } from '../schema'
import { getEncoded, putEncoded } from '../records'

export const DEFAULT_CONSTANTES: Constantes = {
  btcEur: 0,
  btcUsd: 0,
  eth: 0,
  sol: 0,
  convUsdEur: 1,
  plafondPea: 150000,
  dateOuverturePea: '',
  tauxRendement: 0.07,
  mensualiteTradeRep: 710,
  mensualiteFortuneo: 600,
}

const KEY = 'constantes'

export const constantesRepo = {
  async get(): Promise<Constantes> {
    const current = await getEncoded<Constantes>(STORES.constantes, KEY)
    return current ?? { ...DEFAULT_CONSTANTES }
  },

  async save(value: Constantes): Promise<void> {
    await putEncoded(STORES.constantes, KEY, value)
  },

  async reset(): Promise<void> {
    await putEncoded(STORES.constantes, KEY, { ...DEFAULT_CONSTANTES })
  },
}