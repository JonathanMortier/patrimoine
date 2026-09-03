import { it, expect, describe } from 'vitest'
import { openDB, deleteDB } from 'idb'
import { DB_NAME } from '../schema'
import { openDb, closeDb } from '..'

function makeDB(version: number, stores: string[]) {
  return openDB(DB_NAME, version, {
    upgrade(db) {
      for (const s of stores) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
    },
  })
}

describe('rétrocompatibilité DB_VERSION', () => {
  it('ouvre sans erreur une base existante en v3 avec un store "properties" orphelin', async () => {
    await closeDb()
    await deleteDB(DB_NAME)
    const db = await makeDB(3, ['months', 'patrimoine', 'credits', 'constantes', 'security', 'properties'])
    await db.put('properties', { key: 'x', payload: 'y' }, 'x')
    db.close()

    await expect(openDb()).resolves.toBeDefined()
    await closeDb()
  })

  it('upgrade une base en v2 vers v3 sans erreur, données préservées', async () => {
    await deleteDB(DB_NAME)
    const prev = await makeDB(2, ['months', 'patrimoine', 'credits', 'constantes', 'security'])
    await prev.put('constantes', { key: 'k', payload: 'v' }, 'k')
    prev.close()

    await openDb()
    await closeDb()
    const check = await openDB(DB_NAME)
    expect(await check.get('constantes', 'k')).toEqual({ key: 'k', payload: 'v' })
    check.close()
  })

  it("n'introduit pas de store properties avec le schéma actuel", async () => {
    await deleteDB(DB_NAME)
    const db = await openDb()
    db.close()
    const check = await openDB(DB_NAME)
    expect(check.objectStoreNames.contains('properties')).toBe(false)
    check.close()
  })
})
