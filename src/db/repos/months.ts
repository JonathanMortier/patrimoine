import { STORES, type MonthRecord } from '../../db/schema'
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
    bourse: { cto: 0, privateMk: 0, pea: 0 },
    assuranceVie: { livretVie: 0, multiVie: 0, cashFortuneo: 0, linxea: 0, scpi: 0, investCumule: 0 },
    crowdlending: { investi: 0, soldeDispo: 0, revenuBrut: 0 },
    crypto: { tradeRep: 0, binance: 0, ledger: 0, hotWalletPrincipalUSD: 0, hotWalletLedgerUSD: 0, defiUSD: 0, btc: 0 },
    horsImmo: { compteCourant: 0, livrets: 0 },
  }
}

export const monthRepo = {
  async get(id: string): Promise<MonthRecord | undefined> {
    assertMonthId(id)
    return getEncoded<MonthRecord>(STORES.months, id)
  },

  async save(record: MonthRecord): Promise<void> {
    assertMonthId(record.id)
    await putEncoded(STORES.months, record.id, record)
  },

  async all(): Promise<MonthRecord[]> {
    return getAllEncoded<MonthRecord>(STORES.months, (m) => m.id)
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