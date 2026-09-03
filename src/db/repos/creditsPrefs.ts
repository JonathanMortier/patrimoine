import { STORES } from '../schema'
import { getEncoded, putEncoded } from '../records'

export interface CreditsPrefs {
  hiddenAttrs: string[]
}

const KEY = 'creditsPrefs'

export const DEFAULT_CREDITS_PREFS: CreditsPrefs = { hiddenAttrs: [] }

export const creditsPrefsRepo = {
  async get(): Promise<CreditsPrefs> {
    const current = await getEncoded<CreditsPrefs>(STORES.constantes, KEY)
    return current ?? { ...DEFAULT_CREDITS_PREFS }
  },

  async save(value: CreditsPrefs): Promise<void> {
    await putEncoded(STORES.constantes, KEY, value)
  },
}
