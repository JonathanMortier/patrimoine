import { openDB, type IDBPDatabase } from 'idb'
import { DB_NAME, DB_VERSION, STORES } from './schema'

type IDBObjectStoreName = (typeof STORES)[keyof typeof STORES]
export type { IDBObjectStoreName }

let _db: IDBPDatabase | null = null

export async function openDb(name: string = DB_NAME): Promise<IDBPDatabase> {
  if (_db) return _db
  _db = await openDB(name, DB_VERSION, {
    upgrade(db) {
      for (const store of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(store)) {
          // Stores sans keyPath : la clé d'indexation reste en clair, la
          // valeur (payload) est encodée/chiffrée via le codec.
          db.createObjectStore(store)
        }
      }
    },
  })
  return _db
}

export async function closeDb(): Promise<void> {
  if (_db) {
    _db.close()
    _db = null
  }
}

export async function deleteDb(name: string = DB_NAME): Promise<void> {
  await closeDb()
  await indexedDB.deleteDatabase(name)
}

export interface RecordEnvelope {
  key: string
  payload: string
}

export async function writeRecord(
  store: IDBObjectStoreName,
  key: string,
  payload: string,
): Promise<void> {
  const db = await openDb()
  await db.put(store, { key, payload } satisfies RecordEnvelope, key)
}

export async function readRecord(store: IDBObjectStoreName, key: string): Promise<string | undefined> {
  const db = await openDb()
  const rec: RecordEnvelope | undefined = await db.get(store, key)
  return rec?.payload
}

export async function readAllRecords(store: IDBObjectStoreName): Promise<RecordEnvelope[]> {
  const db = await openDb()
  const recs: RecordEnvelope[] = await db.getAll(store)
  return recs
}

export async function deleteRecord(store: IDBObjectStoreName, key: string): Promise<void> {
  const db = await openDb()
  await db.delete(store, key)
}

export async function countRecords(store: IDBObjectStoreName): Promise<number> {
  const db = await openDb()
  return db.count(store)
}