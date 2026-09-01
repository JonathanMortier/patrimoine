import { bourseTotal } from './bourse'
import { assuranceVieTotal } from './assuranceVie'
import { crowdlendingTotals } from './crowdlending'
import { cryptoTotals, cryptoBtcPart } from './crypto'
import { horsImmoTotal, horsImmoLiquidity, horsImmoVariation, type HorsImmoParts } from './horsImmo'
import type { Constantes, MonthRecord } from '../db/schema'

export interface DerivedMonth {
  bourse: number
  assuranceVie: number
  crowdlending: { total: number; fiscalite: number; net: number }
  crypto: number
  usdEur: number
  partBtc: number | null
  horsImmo: {
    total: number
    variation: number | null
  }
}

/** Recalcul direct d'un mois : totaux des domaines + Hors immo reconstruit. */
export function computeDerivedMonth(
  month: MonthRecord,
  constantes: Constantes,
  prevHorsImmoTotal: number | null,
): DerivedMonth {
  const bourse = bourseTotal(month.bourse)
  const assuranceVie = assuranceVieTotal(month.assuranceVie)
  const crowdlending = crowdlendingTotals(month.crowdlending)
  const crypto = cryptoTotals(month.crypto, constantes.convUsdEur)

  const liquidity = horsImmoLiquidity(month.horsImmo)

  const parts: HorsImmoParts = {
    compteCourant: liquidity.compteCourant,
    livrets: liquidity.livrets,
    bourse,
    assuranceVie,
    crowdlending: crowdlending.total,
    crypto: crypto.totalEur,
  }
  const total = horsImmoTotal(parts)
  const btcEurPrice = constantes.btcEur || (constantes.btcUsd / (constantes.convUsdEur || 1))

  return {
    bourse,
    assuranceVie,
    crowdlending,
    crypto: crypto.totalEur,
    usdEur: crypto.usdEur,
    partBtc: cryptoBtcPart(month.crypto.btc, btcEurPrice, crypto.totalEur),
    horsImmo: {
      total,
      variation: horsImmoVariation(total, prevHorsImmoTotal),
    },
  }
}

export * as horsImmo from './horsImmo'
export * as crowdlending from './crowdlending'
export * as assuranceVie from './assuranceVie'
export * as crypto from './crypto'
export * as bourse from './bourse'
export * as projection from './projection'
export * as credits from './credits'