import { describe, expect, it } from 'vitest'
import { parseCreditSheet, toLoan } from '../credits'

const EXCEL_TSV = `Maison	Numéro crédit	Date départ	Date fin	Taux	Montant	Total	Restant	Pourcentage remboursé
Nardouzans	1353608	05/10/2020	04/10/2027	0,60%	667,48 €	54 894,00 €	5 328,13 €	90,29%
	1350609	05/10/2020	04/10/2035	0,95%	73,27 €	70 000,00 €	68 602,03 €	2,00%
Sous total					740,75 €	124 894,00 €	73 930,16 €	40,81%
	1422340	06/10/2022	05/10/2034	0,95%	924,24 €	125 737,00 €	82 834,08 €	34,12%
Blanche	1422341	06/10/2022	05/10/2047	0,90%	74,47 €	20 000,00 €	16 909,47 €	15,45%
	1422342	06/10/2022	05/10/2047	1,25%	196,12 €	165 000,00 €	163 730,75 €	0,77%
Sous total					1 194,83 €	310 737,00 €	263 474,30 €	15,21%
Total						435 631,00 €	337 404,46 €	22,55%\n`

describe('parseCreditSheet', () => {
  it('extrait les 5 prêts, ignore les lignes Sous total / Total', () => {
    const r = parseCreditSheet(EXCEL_TSV)
    expect(r.loans).toHaveLength(5)
    expect(r.skipped.map((s) => s.reason)).toEqual(['sub-total', 'sub-total', 'sub-total'])
  })

  it("affecte chaque prêt au bon bien (regroupement par 'Sous total')", () => {
    const r = parseCreditSheet(EXCEL_TSV)
    const byNumero = new Map(r.loans.map((l) => [l?.numero, l?.nom]))
    expect(byNumero.get(1353608)).toBe('Nardouzans')
    expect(byNumero.get(1350609)).toBe('Nardouzans')
    expect(byNumero.get(1422340)).toBe('Blanche')
    expect(byNumero.get(1422341)).toBe('Blanche')
    expect(byNumero.get(1422342)).toBe('Blanche')
  })

  it('parse numéros, dates ISO et taux en fraction', () => {
    const r = parseCreditSheet(EXCEL_TSV)
    const first = r.loans[0]!
    expect(first).toMatchObject({
      numero: 1353608,
      dateDepart: '2020-10-05',
      dateFin: '2027-10-04',
      mensualite: 667.48,
      montant: 54894,
      restant: 5328.13,
      pctRembourse: 90.29,
    })
    expect(first.taux).toBeCloseTo(0.006, 6)
    expect(r.loans[3]!).toMatchObject({ numero: 1422341, restant: 16909.47 })
    expect(r.loans[3]!.taux).toBeCloseTo(0.009, 6)
  })

  it('toLoan construit un enregistrement Loan complet', () => {
    const r = parseCreditSheet(EXCEL_TSV)
    const loan = toLoan(r.loans[0]!)
    expect(loan.id).toBe('Nardouzans-1353608')
    expect(loan.nom).toBe('Nardouzans')
    expect(loan.numero).toBe(1353608)
  })

  it('retourne une liste vide quand aucune ligne de crédit', () => {
    const r = parseCreditSheet('Maison\tTotal\nSous total\t10\n')
    expect(r.loans).toHaveLength(0)
  })
})
