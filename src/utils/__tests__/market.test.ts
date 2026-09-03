import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchMarketPrices, MarketFetchError } from '../market'

const EUR_USD_OK = { result: 'success', rates: { EUR: 1, USD: 1.15828 } }
const BTC_OK = { bitcoin: { usd: 81461, eur: 70061 } }

function okResponse(data: unknown): { ok: true; json: () => Promise<unknown> } {
  return { ok: true, json: async () => data }
}
function errResponse(): { ok: false; status: number; json: () => never } {
  return { ok: false, status: 429, json: () => { throw new Error('no body') } }
}

type FakeRes =
  | { ok: true; json: () => Promise<unknown> }
  | { ok: false; status: number; json: () => never }

function mockFetch(rateRes: FakeRes, btcRes: FakeRes): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string): Promise<FakeRes> => {
      return url.includes('er-api') ? rateRes : btcRes
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchMarketPrices', () => {
  it('lit le taux EUR/USD et le prix du BTC (USD + EUR)', async () => {
    mockFetch(okResponse(EUR_USD_OK), okResponse(BTC_OK))
    const p = await fetchMarketPrices()
    expect(p.convUsdEur).toBeCloseTo(1.15828, 5)
    expect(p.btcUsd).toBe(81461)
    expect(p.btcEur).toBe(70061)
  })

  it('utilise le taux quand le BTC échoue', async () => {
    mockFetch(okResponse(EUR_USD_OK), errResponse())
    const p = await fetchMarketPrices()
    expect(p.convUsdEur).toBeCloseTo(1.15828, 5)
    expect('btcUsd' in p).toBe(false)
  })

  it('utilise le BTC quand le taux échoue', async () => {
    mockFetch(errResponse(), okResponse(BTC_OK))
    const p = await fetchMarketPrices()
    expect(p.btcUsd).toBe(81461)
    expect(p.btcEur).toBe(70061)
    expect('convUsdEur' in p).toBe(false)
  })

  it('rejette quand aucune source ne répond', async () => {
    mockFetch(errResponse(), errResponse())
    await expect(fetchMarketPrices()).rejects.toThrow(MarketFetchError)
  })

  it('ignore des valeurs incohérentes (non numériques / ≤ 0)', async () => {
    mockFetch(
      okResponse({ result: 'success', rates: { USD: 'nope' } }),
      okResponse({ bitcoin: { usd: 0, eur: -5 } }),
    )
    await expect(fetchMarketPrices()).rejects.toThrow(MarketFetchError)
  })
})

