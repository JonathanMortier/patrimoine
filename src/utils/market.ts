export interface MarketPrices {
  /** 1 € = ? $ (taux de change EUR/USD) */
  convUsdEur: number
  /** Prix du BTC en USD */
  btcUsd: number
  /** Prix du BTC en EUR */
  btcEur: number
}

export class MarketFetchError extends Error {}

const EUR_RATE_URL = 'https://open.er-api.com/v6/latest/EUR'
const BTC_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur'

async function getJSON(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new MarketFetchError(`Réponse invalide (${res.status}).`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Récupère le taux EUR/USD et le prix du BTC (USD + EUR) depuis des API
 * publiques gratuites, sans clé. Les deux appels sont indépendants : si l'un
 * échoue, l'autre est tout de même exploité.
 */
export async function fetchMarketPrices(): Promise<MarketPrices> {
  const [rateJson, btcJson] = await Promise.all([
    getJSON(EUR_RATE_URL).catch(() => null),
    getJSON(BTC_URL).catch(() => null),
  ])

  const usdEur = readUsdEur(rateJson)
  const { btcUsd, btcEur } = readBtc(btcJson)

  if (usdEur === null && (btcUsd === null || btcEur === null)) {
    throw new MarketFetchError('Impossible de récupérer les prix en ligne (hors ligne ?).')
  }

  const out: Partial<MarketPrices> = {}
  if (usdEur !== null) out.convUsdEur = usdEur
  if (btcUsd !== null) out.btcUsd = btcUsd
  if (btcEur !== null) out.btcEur = btcEur
  return out as MarketPrices
}

function readUsdEur(data: unknown): number | null {
  const rates = (data as { rates?: Record<string, unknown> })?.rates
  const usd = rates?.USD
  return typeof usd === 'number' && Number.isFinite(usd) && usd > 0 ? usd : null
}

function readBtc(data: unknown): { btcUsd: number | null; btcEur: number | null } {
  const btc = (data as { bitcoin?: Record<string, unknown> })?.bitcoin
  const usd = btc?.usd
  const eur = btc?.eur
  return {
    btcUsd: typeof usd === 'number' && Number.isFinite(usd) && usd > 0 ? usd : null,
    btcEur: typeof eur === 'number' && Number.isFinite(eur) && eur > 0 ? eur : null,
  }
}
