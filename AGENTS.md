# AGENTS.md

Contexte technique et fonctionnel du projet **Patrimoine**.

---

## Vue d'ensemble

PWA de suivi de patrimoine personnel, 100 % locale (offline-first, données chiffrées en IndexedDB côté client). Déployée sur Vercel.

---

## Stack technique

| Couche       | Technologie |
|-------------|-------------|
| Framework   | Vite 8 + TypeScript 7 |
| UI          | Vanilla TS (pas de framework, DOM direct) |
| Charts      | Chart.js 4 |
| Stockage    | IndexedDB via `idb` 8 |
| Chiffrement | Web Crypto API (AES-256-GCM, PBKDF2) |
| PWA         | `vite-plugin-pwa` 1.3 (generateSW, precache) |
| Tests       | Vitest 4 + happy-dom + fake-indexeddb |
| Deploy      | Vercel (Node ≥ 22.12) |

---

## Structure du projet

```
src/
├── main.ts                  # Point d'entrée : enregistre le SW, lance bootstrap()
├── root.ts                  # Bootstrap : écran création/déverrouillage → mountApp()
├── app.ts                   # Routing hash-based, topbar + tabbar, rendu par route
├── events.ts                # AUTH_EVENT (patrimoine:auth)
│
├── crypto/                  # Sécurité applicative
│   ├── aes.ts               # AES-256-GCM, dérivation PBKDF2, key wrapping (KEK↔DEK)
│   ├── codec.ts             # PayloadCodec : chiffré/déchiffre les payloads IndexedDB
│   ├── security.ts          # setup/unlock/lock/changePassword, état module (dek)
│   ├── constants.ts         # PBKDF2_ITERATIONS (600k), SALT_BYTES (16)
│   └── util.ts              # base64↔bytes, randomBytes
│
├── db/
│   ├── index.ts             # openDb/closeDb/deleteDb, read/write/deleteAllRecords
│   ├── schema.ts            # Interface MonthRecord, Constantes, Loan, stores IndexedDB
│   ├── codec.ts             # active codec (passthrough → AES)
│   ├── securityStore.ts     # SecurityMeta (salt, verifier, wrappedDek) stockés en clair
│   ├── records.ts           # utilitaires de sérialisation
│   └── repos/               # Repositories (get/save/all/remove/reset)
│       ├── months.ts        # monthRepo, newMonth(id), normalizeMonth()
│       ├── constantes.ts    # constantesRepo, DEFAULT_CONSTANTES
│       ├── credits.ts       # creditsRepo, loanKey(nom-numero)
│       ├── patrimoine.ts    # patrimoineRepo (comptes patrimoine)
│       └── creditsPrefs.ts  # creditsPrefsRepo (attributs masqués)
│
├── calc/                    # Calculs métier (purement fonctionnel, pas de DOM)
│   ├── index.ts             # computeDerivedMonth() : totaux par domaine
│   ├── dashboard.ts         # dashboardSeries(), missingMonths()
│   ├── bourse.ts            # bourseTotal()
│   ├── assuranceVie.ts      # assuranceVieTotal()
│   ├── crowdlending.ts      # crowdlendingTotals(), APY
│   ├── crypto.ts            # cryptoTotals(), partBtc
│   ├── horsImmo.ts          # horsImmoTotal(), horsImmoLiquidity(), horsImmoVariation()
│   ├── netBrut.ts           # brutTotal(), netTotal(), immoBrut(), restantDette(), btcShare()
│   ├── projection.ts        # withdrawalMonthly()
│   ├── projectionMonthly.ts # buildMonthlyProjection()
│   ├── projectionAnnual.ts  # buildAnnualProjection()
│   └── credits.ts           # utilitaires crédits
│
├── views/                   # Rendu DOM (une vue par route)
│   ├── security.ts          # Écran création / déverrouillage mot de passe
│   ├── dashboard.ts         # KPIs, charts (évolution, répartition), objectifs PEA/BTC
│   ├── saisie.ts            # Assistant 1er du mois (saisie par domaine + crédits)
│   ├── import.ts            # Import CSV/TSV, export/import backup chiffré, Google Drive
│   ├── credits.ts           # Liste et détails des crédits immobiliers
│   ├── projection.ts        # Projection bourse mensuelle + annuelle
│   ├── reglages.ts          # Changement mdp, réinitialisation, constantes
│   └── fields.ts            # Helpers de rendu de champs
│
├── backup/
│   └── backup.ts            # collectBackupData/createBackupJson/parseBackupString/restoreBackupData
│
├── import/
│   ├── csv.ts               # Découpage CSV/TSV
│   ├── parsers.ts           # parseSheet() par type de feuille
│   ├── credits.ts           # parseCreditSheet(), toLoan()
│   └── reconcile.ts         # reconcileMonths() : diffs saisie vs import
│
└── utils/
    ├── date.ts              # currentMonthId(), previousMonthId(), addMonths(), formatMonthLabel()
    ├── format.ts            # fmtEuro(), fmtPct(), fmtAmount(), escapeHtml(), escapeAttr()
    ├── drive.ts             # Google Drive : OAuth GIS, upload/download, search
    └── market.ts            # utilitaires marché
```

---

## Fonctionnalités

### Authentification / Sécurité

- Au premier lancement : écran de **création** du mot de passe.
- Au lancement suivant : écran de **déverrouillage**.
- Au verrouillage (bouton 🔒) : retour à l'écran de déverrouillage.
- Clé dérivée du mot de passe : **PBKDF2** (600 000 itérations, salt aléatoire 16 octets).
- DEK (clé de données) générée aléatoirement, wrappée par la KEK dans IndexedDB.
- **AES-256-GCM** pour le chiffrement de tous les payloads des stores (hors `security`).
- Changement de mot de passe : recalcul la KEK sans re-chiffrer les données.

### Écrans (routes hash)

| Route        | Fonction |
|-------------|----------|
| `#/dashboard` | KPIs (hors immo, brut, net, bourse, AV, crowd, crypto + évolutions), charts (évolution, répartition), objectifs PEA, part BTC, mois manquants |
| `#/saisie`    | Assistant 1er du mois : navigation prev/next, sélection de mois, édition par domaine, suppressions |
| `#/import`    | Import CSV/TSV par feuille (hors immo, bourse, AV, crowdlending, crypto, crédits) ; export/import chiffré ; push/pull Google Drive |
| `#/credits`   | Liste des crédits immo, détail par prêt |
| `#/projection`| Projection bourse mensuelle et annuelle, objectifs, tableau de détail |
| `#/reglages`  | Changement de mot de passe, réinitialisation totale de la base, constantes (taux, plafond PEA, clientId Google, etc.) |

### Backup / Google Drive

- Export : `collectBackupData()` → `createBackupJson()` (fichier JSON chiffré autonome).
- Import : `parseBackupString()` → `validateBackupData()` → `restoreBackupData()` (remplace la base).
- Google Drive : OAuth implicite via Google Identity Services (GIS), recherche/upload/download du fichier backup unique (`patrimoine-backup.json`).
- Sécurité backup : taille max 5 MiB, bornes KDF (≤ 2M itérations), validation complète avant écriture.

### Modèle de données

Un **mois** (`MonthRecord`, clé `YYYY-MM`) contient :
- `bourse` : CTO, PEA, Private Markets, plus-value
- `assuranceVie` : livretVie, multiVie, cashFortuneo, linxea, SCPI
- `crowdlending` : investi, solde dispo, revenu brut, fiscalité
- `crypto` : tradeRep, binance, ledger, hot wallets (USD), DeFi, BTC (nb)
- `horsImmo` : comptes courants (CA, Fortuneo, TradeRep), livrets (A, LDD)
- `creditsRestant` (optionnel) : restant par prêt pour le mois

Un **prêt** (`Loan`) contient : nom, numéro, dates, taux, mensualité, montant, restant, % remboursé.

**Constantes** : cours crypto (BTC/EUR, BTC/USD, ETH, SOL), taux de rendement (7 %), mensualités d'investissement (710 + 600), plafond PEA, date ouverture PEA, Google Client ID.

---

## Conventions de code

- **TypeScript strict** : aucun `any`, tous les types explicites.
- **Pas de framework UI** : DOM vanilla, innerHTML (sanitisé via `escapeHtml()`).
- **Routing** : hash-based (`#/route`), rendu synchronisé dans le listener `hashchange` + immédiatement via `navigate()`.
- **État module** : les variables d'état (codec, dek, charts, pending imports) sont des `let` au niveau module, pas dans des classes.
- **Tests** : `// @vitest-environment happy-dom`, `Object.defineProperty(globalThis, 'crypto', { value: webcrypto })`, `import 'fake-indexeddb/auto'`, drains async avec `await new Promise(r => setTimeout(r, 20))`.
- **Convention français** : noms de variables/functions en anglais, textes UI en français.
- **Commit messages** : format Conventional Commits (`fix(securite): ...`, `test: ...`).

---

## Commandes utiles

```bash
npm run dev          # Serveur dev Vite
npm run build        # tsc + vite build (PWA dist/)
npm run typecheck    # tsc --noEmit
npm run test         # vitest run (206 tests)
npm run gen:icons    # Génère les icônes PWA (Python)
```

---

## Branches

- **main** : code déployé (fusionné via PR depuis develop).
- **develop** : branche d'intégration (PR vers main).
- Feature branches : `feat/...` ou `chore/...` basées sur `develop`.
