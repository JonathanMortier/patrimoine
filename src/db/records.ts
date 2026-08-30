import { encodePayload, decodePayload } from './codec'
import {
  writeRecord,
  readRecord,
  readAllRecords,
  deleteRecord,
  type IDBObjectStoreName,
} from './index'

export async function putEncoded(
  store: IDBObjectStoreName,
  key: string,
  value: unknown,
): Promise<void> {
  await writeRecord(store, key, await encodePayload(value))
}

export async function getEncoded<T>(store: IDBObjectStoreName, key: string): Promise<T | undefined> {
  const raw = await readRecord(store, key)
  return raw === undefined ? undefined : await decodePayload<T>(raw)
}

export async function getAllEncoded<T>(
  store: IDBObjectStoreName,
  sortKey?: (t: T) => string,
): Promise<T[]> {
  const recs = await readAllRecords(store)
  const values: T[] = []
  for (const rec of recs) values.push(await decodePayload<T>(rec.payload))
  if (sortKey) values.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1))
  return values
}

export async function removeEncoded(store: IDBObjectStoreName, key: string): Promise<void> {
  await deleteRecord(store, key)
}