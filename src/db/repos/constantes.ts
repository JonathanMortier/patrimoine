import { STORES, type Constantes } from '../schema'
import { getEncoded, putEncoded } from '../records'

export const DEFAULT_CONSTANTES: Constantes = {
  btcEur: 0,
  btcUsd: 77429,
  eth: 0,
  sol: 0,
  convUsdEur: 1.14,
  plafondPea: 150000,
  dateOuverturePea: '',
  tauxRendement: 0.07,
  mensualiteTradeRep: 710,
  mensualiteFortuneo: 600,
  googleClientId: '',
}

const KEY = 'constantes'

export const constantesRepo = {
  async get(): Promise<Constantes> {
    const current = await getEncoded<Constantes>(STORES.constantes, KEY)
    if (!current) return { ...DEFAULT_CONSTANTES }
    const conv = current.convUsdEur === 1 ? DEFAULT_CONSTANTES.convUsdEur : current.convUsdEur
    const btcUsd = current.btcUsd === 0 ? DEFAULT_CONSTANTES.btcUsd : current.btcUsd
    const googleClientId = current.googleClientId ?? ''
    if (conv !== current.convUsdEur || btcUsd !== current.btcUsd || googleClientId !== current.googleClientId) {
      const next = { ...current, convUsdEur: conv, btcUsd, googleClientId }
      await putEncoded(STORES.constantes, KEY, next)
      return next
    }
    return current
  },

  async save(value: Constantes): Promise<void> {
    await putEncoded(STORES.constantes, KEY, value)
  },

  async reset(): Promise<void> {
    await putEncoded(STORES.constantes, KEY, { ...DEFAULT_CONSTANTES })
  },
}