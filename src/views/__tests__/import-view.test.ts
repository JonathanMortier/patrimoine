// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'
import { mountApp } from '../../app'
import { deleteDb } from '../../db'
import { setup } from '../../crypto/security'

const GOOD_TSV = `Date\tCompte courant\tLivrets\tAssurance Vie\tCrowlending\tBourse\tCrypto\tTotal
01/01/2025\t10341,02\t17502,76\t0\t0\t0\t0\t27843,78
01/02/2025\t10500\t17000\t0\t0\t0\t0\t27500
`

function view(): HTMLElement {
  return document.getElementById('view')!
}

function analyseBtn(): HTMLButtonElement {
  return view().querySelector<HTMLButtonElement>('#analyse')!
}

function importBtn(): HTMLButtonElement {
  return view().querySelector<HTMLButtonElement>('#import')!
}

function analyse(): void {
  view().querySelector<HTMLTextAreaElement>('#csv-input')!.value = GOOD_TSV
  analyseBtn().click()
}

describe('écran d’import : enchaînement Analyser → Importer', () => {
  beforeEach(async () => {
    await deleteDb()
    await setup('test-secret')
    document.body.innerHTML = '<div id="app"></div>'
    mountApp(document.getElementById('app')!)
    document.querySelector<HTMLButtonElement>('.tab[data-route="import"]')!.click()
  })

  it('Importer est désactivé grisé tant qu’aucune analyse n’est bonne', () => {
    expect(importBtn().disabled).toBe(true)
    expect(importBtn().textContent).toContain('2. Importer (chiffré)')
    expect(view().querySelector('#analyse')!.textContent).toContain('1. Analyser')
  })

  it('active Importer (bleu/primary) après une analyse bonne et montre l’aperçu', () => {
    analyse()
    expect(importBtn().disabled).toBe(false)
    expect(importBtn().classList.contains('primary')).toBe(true)
    expect(view().querySelector<HTMLElement>('#preview')!.hidden).toBe(false)
    expect(view().textContent).toContain('2 mois détectés')
  })

  it('laisse Importer désactivé quand aucun mois n’est reconnu', () => {
    view().querySelector<HTMLTextAreaElement>('#csv-input')!.value = 'foo\tbar\n1\t2\n'
    analyseBtn().click()
    expect(importBtn().disabled).toBe(true)
    expect(view().querySelector<HTMLElement>('#preview')!.hidden).toBe(true)
  })
})