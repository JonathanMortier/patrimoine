// @vitest-environment happy-dom
import { webcrypto } from 'node:crypto'
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })

import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountApp } from '../../app'
import { deleteDb } from '../../db'
import { setup } from '../../crypto/security'
import { creditsRepo } from '../../db/repos/credits'

const GOOD_TSV = `Date\tCompte courant\tLivrets\tAssurance Vie\tCrowlending\tBourse\tCrypto\tTotal
01/01/2025\t10341,02\t17502,76\t0\t0\t0\t0\t27843,78
01/02/2025\t10500\t17000\t0\t0\t0\t0\t27500
`

const CREDITS_TSV = `Maison\tNuméro crédit\tDate départ\tDate fin\tTaux\tMontant\tTotal\tRestant\tPourcentage remboursé
Nardouzans\t1353608\t05/10/2020\t04/10/2027\t0,60%\t667,48 €\t54 894,00 €\t5 328,13 €\t90,29%
\t1350609\t05/10/2020\t04/10/2035\t0,95%\t73,27 €\t70 000,00 €\t68 602,03 €\t2,00%
Sous total\t\t\t\t\t740,75 €\t124 894,00 €\t73 930,16 €\t40,81%
\t1422340\t06/10/2022\t05/10/2034\t0,95%\t924,24 €\t125 737,00 €\t82 834,08 €\t34,12%
Blanche\t1422341\t06/10/2022\t05/10/2047\t0,90%\t74,47 €\t20 000,00 €\t16 909,47 €\t15,45%
\t1422342\t06/10/2022\t05/10/2047\t1,25%\t196,12 €\t165 000,00 €\t163 730,75 €\t0,77%
Sous total\t\t\t\t\t1 194,83 €\t310 737,00 €\t263 474,30 €\t15,21%
Total\t\t\t\t\t\t435 631,00 €\t337 404,46 €\t22,55%
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

  it('importe les lignes de crédits immo et les enregistre', async () => {
    document.querySelector<HTMLButtonElement>('[data-kind="credits"]')!.click()
    view().querySelector<HTMLTextAreaElement>('#csv-input')!.value = CREDITS_TSV
    analyseBtn().click()
    expect(importBtn().disabled).toBe(false)
    expect(view().textContent).toContain('5 prêt(s) détecté(s)')

    await importBtn().click()

    await vi.waitFor(async () => expect(await creditsRepo.all()).toHaveLength(5))
    const loans = await creditsRepo.all()
    expect(loans.find((l) => l.numero === 1353608)).toMatchObject({ nom: 'Nardouzans', restant: 5328.13 })
    expect(loans.find((l) => l.numero === 1422340)).toMatchObject({ nom: 'Blanche', restant: 82834.08 })
    expect(loans.find((l) => l.numero === 1422342)).toMatchObject({ nom: 'Blanche' })
  })
})