import type { AssuranceVieSnapshot } from '../db/schema'

export function assuranceVieTotal(a: AssuranceVieSnapshot): number {
  return (
    a.livretVie +
    a.multiVie +
    a.cashFortuneo +
    a.linxea +
    a.scpi
  )
}