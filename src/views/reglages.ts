import { changePassword, PasswordError, LockedError } from '../crypto/security'
import { constantesRepo } from '../db/repos/constantes'
import type { Constantes } from '../db/schema'
import { fmtAmount } from '../utils/format'
import { fetchMarketPrices, MarketFetchError } from '../utils/market'

type FieldDef = {
  key: keyof Constantes
  label: string
  type?: 'number' | 'date'
  step?: string
  min?: string
  suffix?: string
  hint?: string
  /** Stockée en fraction (0.07), affichée et saisie en % (7) */
  pct?: boolean
}

const NUMBER_FIELDS: FieldDef[] = [
  { key: 'plafondPea', label: 'Plafond PEA (€)', step: '100', min: '0', hint: 'Montant maximal d’un PEA. Sert à calculer le remplissage du PEA.' },
  { key: 'btcUsd', label: 'Prix du BTC (USD)', step: 'any', min: '0', hint: 'Prix « actuel » du bitcoin en $. Utilisé pour la part BTC.' },
  { key: 'btcEur', label: 'Prix du BTC (EUR)', step: 'any', min: '0', hint: 'Optionnel : sinon calculé à partir du prix $ et de la conversion.' },
  { key: 'tauxRendement', label: 'Taux de rendement annuel (%)', type: 'number', step: 'any', min: '0', pct: true, hint: 'Ex. « 7 » ou « 0,07 » (7 %) pour la projection Bourse.' },
  { key: 'mensualiteTradeRep', label: 'Mensualité Trade Republic (€/mois)', step: '10', min: '0' },
  { key: 'mensualiteFortuneo', label: 'Mensualité Fortuneo (€/mois)', step: '10', min: '0' },
]

const DATE_FIELDS: FieldDef[] = [
  { key: 'dateOuverturePea', label: 'Date d\u2019ouverture du PEA', type: 'date' },
]

const CONV_FIELD: FieldDef = { key: 'convUsdEur', label: '1 € = ? $', step: 'any', min: '0.0001', hint: 'Les wallets en $ de la section Crypto sont convertis via « 1 € = X $ ».' }

export async function renderReglages(view: HTMLElement): Promise<void> {
  const constantes = await constantesRepo.get()

  const numberFieldHtml = (def: FieldDef): string => `
    <label class="field">
      <span>${def.label}${def.hint ? ` — <em>${def.hint}</em>` : ''}</span>
      <input type="number" inputmode="decimal" name="${def.key}" step="${def.step ?? 'any'}" min="${def.min ?? '0'}"
        value="${fmtAmount(def.pct ? (constantes[def.key] as number) * 100 : (constantes[def.key] as number))}" ${def.suffix ? `data-suffix="${def.suffix}"` : ''} />
    </label>`

  const dateFieldHtml = (def: FieldDef): string => `
    <label class="field">
      <span>${def.label}</span>
      <input type="date" name="${def.key}" value="${constantes[def.key] as string}" />
    </label>`

  const convHtml = `
    <label class="field">
      <span>${CONV_FIELD.label}${CONV_FIELD.hint ? ` — <em>${CONV_FIELD.hint}</em>` : ''}</span>
      <input type="number" inputmode="decimal" name="convUsdEur" step="${CONV_FIELD.step}" min="${CONV_FIELD.min}"
        value="${fmtAmount(constantes.convUsdEur)}" />
    </label>`

  view.innerHTML = `
    <section class="card" id="const-card">
      <h2>Constantes</h2>
      <p class="muted">Réglages utilisés par les calculs (remplissage PEA, part BTC, projection, crypto…).</p>
      <form id="const-form" autocomplete="off">
        ${convHtml}
        ${NUMBER_FIELDS.map(numberFieldHtml).join('')}
        ${DATE_FIELDS.map(dateFieldHtml).join('')}
        <button type="button" id="fetch-market" class="ghost">🌐 Récupérer les prix en ligne</button>
        <button type="submit" class="primary">Enregistrer les constantes</button>
        <p class="msg" aria-live="polite"></p>
      </form>
    </section>

    <section class="card">
      <h2>Changer le mot de passe</h2>
      <p class="muted">Le changement ne re-chiffre pas vos données : seule la clé de chiffrement est re-protégée.</p>
      <form id="pw-form" autocomplete="off">
        <label class="field">
          <span>Mot de passe actuel</span>
          <input type="password" name="old" required autocomplete="current-password" />
        </label>
        <label class="field">
          <span>Nouveau mot de passe</span>
          <input type="password" name="nw" minlength="4" required autocomplete="new-password" />
        </label>
        <label class="field">
          <span>Confirmation</span>
          <input type="password" name="confirm" minlength="4" required autocomplete="new-password" />
        </label>
        <button type="submit" class="primary">Changer le mot de passe</button>
        <p class="msg" aria-live="polite"></p>
      </form>
    </section>
  `

  const constMsg = view.querySelector<HTMLParagraphElement>('#const-form .msg')!
  const fetchBtn = view.querySelector<HTMLButtonElement>('#fetch-market')!
  const setField = (name: string, value: string) => {
    const el = view.querySelector<HTMLInputElement>(`[name=${name}]`)
    if (el) el.value = value
  }
  fetchBtn.addEventListener('click', async () => {
    fetchBtn.disabled = true
    fetchBtn.textContent = 'Récupération en cours…'
    constMsg.className = 'msg'
    constMsg.textContent = ''
    try {
      const prices = await fetchMarketPrices()
      if ('convUsdEur' in prices) setField('convUsdEur', fmtAmount(prices.convUsdEur))
      if ('btcUsd' in prices) setField('btcUsd', fmtAmount(prices.btcUsd))
      if ('btcEur' in prices) setField('btcEur', fmtAmount(prices.btcEur))
      const parts = [
        'convUsdEur' in prices ? `1 € = ${fmtAmount(prices.convUsdEur)} $` : null,
        'btcUsd' in prices ? `BTC ${fmtAmount(prices.btcUsd)} $` : null,
        'btcEur' in prices ? `BTC ${fmtAmount(prices.btcEur)} €` : null,
      ].filter(Boolean)
      constMsg.textContent = `Prix récupérés : ${parts.join(' · ')}. Pensez à enregistrer.`
      constMsg.className = 'msg ok'
    } catch (err) {
      constMsg.textContent = err instanceof MarketFetchError ? err.message : 'Récupération impossible.'
      constMsg.className = 'msg err'
    } finally {
      fetchBtn.disabled = false
      fetchBtn.textContent = '🌐 Récupérer les prix en ligne'
    }
  })

  view.querySelector('#const-form')!.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const getNum = (key: string): number => {
      const el = view.querySelector<HTMLInputElement>(`[name=${key}]`)
      const raw = (el?.value ?? '').trim().replace(',', '.')
      return raw === '' ? 0 : parseFloat(raw)
    }
    const getDate = (key: string): string => {
      const el = view.querySelector<HTMLInputElement>(`[name=${key}]`)
      return (el?.value ?? '').trim()
    }

    const tauxInput = getNum('tauxRendement')
    const next: Constantes = {
      ...(await constantesRepo.get()),
      convUsdEur: getNum('convUsdEur'),
      plafondPea: getNum('plafondPea'),
      btcUsd: getNum('btcUsd'),
      btcEur: getNum('btcEur'),
      tauxRendement: tauxInput <= 1 ? tauxInput : tauxInput / 100,
      mensualiteTradeRep: getNum('mensualiteTradeRep'),
      mensualiteFortuneo: getNum('mensualiteFortuneo'),
      dateOuverturePea: getDate('dateOuverturePea'),
    }

    if (!Number.isFinite(next.convUsdEur) || next.convUsdEur <= 0) {
      constMsg.textContent = 'Conversion invalide (nombre strictement positif).'
      constMsg.className = 'msg err'
      return
    }

    try {
      await constantesRepo.save(next)
      constMsg.textContent = 'Constantes enregistrées.'
      constMsg.className = 'msg ok'
    } catch (err) {
      constMsg.textContent = err instanceof LockedError ? err.message : 'Enregistrement impossible (session verrouillée ?).'
      constMsg.className = 'msg err'
    }
  })

  const msg = view.querySelector<HTMLParagraphElement>('#pw-form .msg')!
  view.querySelector('#pw-form')!.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const get = (name: string) => (view.querySelector(`[name=${name}]`) as HTMLInputElement).value
    const oldPw = get('old')
    const newPw = get('nw')
    if (newPw !== get('confirm')) {
      msg.textContent = 'Les nouveaux mots de passe ne correspondent pas.'
      msg.className = 'msg err'
      return
    }
    try {
      await changePassword(oldPw, newPw)
      msg.textContent = 'Mot de passe changé.'
      msg.className = 'msg ok'
      ;(view.querySelector('#pw-form') as HTMLFormElement).reset()
    } catch (err) {
      msg.textContent =
        err instanceof PasswordError || err instanceof LockedError
          ? err.message
          : 'Changement impossible.'
      msg.className = 'msg err'
    }
  })
}
