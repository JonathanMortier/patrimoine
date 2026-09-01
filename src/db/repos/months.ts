import { STORES, type MonthRecord, type HorsImmoSnapshot } from '../../db/schema'
import { getAllEncoded, getEncoded, putEncoded, removeEncoded } from '../../db/records'
import { assertMonthId, compareMonthIds, currentMonthId } from '../../utils/date'

export function monthId(id: string): string {
  assertMonthId(id)
  return id
}

export function newMonth(id: string): MonthRecord {
  assertMonthId(id)
  return { ...emptyMonth(), id }
}

export function emptyMonth(): MonthRecord {
  return {
    id: currentMonthId(),
    bourse: { cto: 0, privateMk: 0, pea: 0, plusValue: 0 },
    assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0 },
    crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0, fiscalite: 0 },
    crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
    horsImmo: { compteCourantCa: 0, compteCourantFortuneo: 0, compteCourantTradeRep: 0, livretA: 0, ldd: 0 },
  }
}

const HORS_IMMO_KEYS: (keyof HorsImmoSnapshot)[] = [
  'compteCourantCa',
  'compteCourantFortuneo',
  'compteCourantTradeRep',
  'livretA',
  'ldd',
]

function pickKeys<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  const out: Partial<T> = {}
  for (const k of keys) if (k in obj) out[k] = obj[k]
  return out
}

/** Complète et migre un mois lu en base : défauts par domaine + ancien schéma horsImmo. */
export function normalizeMonth(record: MonthRecord): MonthRecord {
  const base = emptyMonth()
  const h = record.horsImmo as HorsImmoSnapshot & { compteCourant?: number; livrets?: number }
  const hasNew = HORS_IMMO_KEYS.some((k) => k in h)
  const horsImmo = hasNew
    ? { ...base.horsImmo, ...pickKeys(h, HORS_IMMO_KEYS) }
    : { ...base.horsImmo, compteCourantCa: h.compteCourant ?? 0, livretA: h.livrets ?? 0 }
  return {
    id: record.id,
    bourse: { ...base.bourse, ...(record.bourse ?? {}) },
    assuranceVie: { ...base.assuranceVie, ...(record.assuranceVie ?? {}) },
    crowdlending: { ...base.crowdlending, ...(record.crowdlending ?? {}) },
    crypto: { ...base.crypto, ...(record.crypto ?? {}) },
    horsImmo,
  }
}

export const monthRepo = {
  async get(id: string): Promise<MonthRecord | undefined> {
    assertMonthId(id)
    const current = await getEncoded<MonthRecord>(STORES.months, id)
    return current ? normalizeMonth(current) : undefined
  },

  async save(record: MonthRecord): Promise<void> {
    assertMonthId(record.id)
    await putEncoded(STORES.months, record.id, record)
  },

  async all(): Promise<MonthRecord[]> {
    const records = await getAllEncoded<MonthRecord>(STORES.months, (m) => m.id)
    return records.map(normalizeMonth)
  },

  async ids(): Promise<string[]> {
    const records = await getAllEncoded<MonthRecord>(STORES.months)
    return records.map((r) => r.id).sort(compareMonthIds)
  },

  async remove(id: string): Promise<void> {
    assertMonthId(id)
    await removeEncoded(STORES.months, id)
  },
}

export const monthsSorter = compareMonthIds