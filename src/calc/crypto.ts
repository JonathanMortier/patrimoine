import type { CryptoSnapshot } from '../db/schema'

export interface CryptoTotals {
  totalEur: number
  usdEur: number
}

/**
 * total € = (wallets en $) ÷ CONV + comptes en €.
 * CONV = « 1 € = X $ » (Constantes, ici 1.14).
 */
export function cryptoTotals(c: CryptoSnapshot, convUsdEur: number): CryptoTotals {
  const usdTotal = c.hotWalletPrincipalUSD + c.hotWalletLedgerUSD + c.defiUSD
  const usdEur = usdTotal / (convUsdEur || 1)
  return { totalEur: c.tradeRep + c.binance + c.ledger + usdEur, usdEur }
}

/** Part BTC dans le patrimoine crypto : € détenus en BTC / total €. */
export function cryptoBtcPart(btc: number, btcEurPrice: number, totalEur: number): number | null {
  return totalEur > 0 ? (btc * btcEurPrice) / totalEur : null
}