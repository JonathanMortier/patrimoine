# Patrimoine PWA — Plan de développement

PWA de suivi de patrimoine (100% locale, offline-first).

## 0. Usage : suivi mensuel au 1er de chaque mois

Le rituel : **tous les 1er du mois**, mise à jour des soldes de chaque compte
pour suivre l'évolution du patrimoine. Chaque mois correspond à une date
(début de mois) et chaque domaine d'investissement est **regroupé** :

- **Bourse** : CTO (Trade Republic), Private Market, PEA → total + plus-value,
  rendement PEA, APY
- **Assurance Vie** : Livret Vie, Multi Vie, cash Fortuneo, Linxea Spirit 2,
  SCPI → total + rendement APY
- **Crowdfunding** : bricks investies, solde disponible, revenu brute →
  fiscalité (30%) → revenu net → total
- **Crypto** : Trade Republic, Binance, Ledger, Hot Wallets ($), Defi ($) →
  total en € (÷ conversion $) + part BTC
- **Comptes courants & Livrets** : soldes (Crédit Agricole, Fortuneo,
  Trade Republic, Livret A, LDD)
- **Immobilier & Crédits** : valeur biens + restant dû (mis à jour quand
  pertinent)

`Hors immo` (total + variation mensuelle) se **reconstruit automatiquement**
à partir des domaines (Bourse × AV × Crowdfunding × Crypto) ; seuls
Compte courant et Livrets sont saisis manuellement.

## 1. Contexte & source

`docs/Patrimoine.ods` = export d'une Google Sheet de suivi de patrimoine.
14 feuilles analysées, 912 formules récupérées (office:formula), 15 graphiques
embarqués identifiés.

### Feuilles en V1
- Dashboard : remplissage PEA estimé, part BTC (brut/net/hors-immo)
- Patrimoine : comptes + totaux brut/net/hors-immo + analyse répartition
- Hors immo : historique mensuel (CC, Livrets, AVI, Crowdlending, Bourse,
  Crypto, Total, variation)
- Bourse : CTO / Private Market / PEA, plus-value, rendement PEA, APY
- Crypto : Trade Rep, Binance, Ledger, Hot Wallets ($), Defi, part BTC
- Assurance Vie : Livret Vie, Multi Vie, cash Fortuneo, Linxea, SCPI, total, APY
- Crowdlending : investi, solde, revenu brut, fiscalité (30%), net, APY
- Crédits immo : 5 prêts (Nardouzans 2 + Blanche 3), restant, % remboursé,
  assurance, date <250 k€
- Projection Bourse : projection à 2050, rendement 7 %, invest mensuel,
  salaire retrait 4 %
- Constantes : BTC/EUR•USD, ETH, SOL, 1 €=X $, plafond PEA, date ouverture PEA

### Exclues en V1 (peuvent être ajoutées plus tard)
- Revenues passif
- Achats Crypto
- Defi
- 🦎 Error Logs (obsolète en PWA)

Fonctions custom Apps Script à reconstruire (from cached values) :
- compute_month_total(base, taux, invest) ≈ base×(1+taux/12)+invest
- compute_year_total(base, taux, invest) ≈ base×(1+taux)+12×invest
- compute_plus_value(valeur, route d'invest cumulé, invest)

## 2. Stack

- Vite + TypeScript + Chart.js
- PWA : vite-plugin-pwa (service worker, manifest, icônes, installable)
- IndexedDB via `idb` (offline-first, 100% local)
- Chiffrement : **WebCrypto** (AES-256-GCM, PBKDF2 — voir §3)
- Backup Google Drive via OAuth Google Identity Services (scope drive.file)
  — nécessite un OAuth Client ID web (procédure fournie) ; fallback export/import
  manuel de fichier.

## 3. Sécurité : chiffrement à mot de passe

Objectif : la base IndexedDB est **chiffrée** ; les données ne sont déchiffrables
qu'après saisie d'un mot de passe.

### Architecture à double clé
- **KEK** (Key Encryption Key) : dérivée du mot de passe par **PBKDF2-SHA256**
  (itérations élevées, p. ex. ≥ 600 000) + **sel** aléatoire (stocké en clair,
  c'est son rôle).
- **DEK** (Data Encryption Key) : clé aléatoire 32 octets, générée à la création
  du mot de passe, **chiffrée (wrapped)** par la KEK en **AES-256-GCM**, puis
  stockée dans IndexedDB.
- Toutes les données sont chiffrées avec la DEK en **AES-256-GCM**, IV aléatoire
  de 12 octets par enregistrement.

Avantages : changer de mot de passe = ne re-chiffrer que la DEK (pas toute la
base) ; la vraie clé n'existe qu'en mémoire pendant la session ; GCM garantit
intégrité + authenticité (détection de falsification).

### Parcours utilisateur
1. **Premier lancement** → choix d'un mot de passe → génération sel + DEK +
   *verifier* (permet de valider le mot de passe au déverrouillage).
2. **Déverrouillage** → PBKDF2 + vérification → la DEK est déchiffrée en mémoire
   → accès aux données.
3. **Verrouillage** (bouton + auto après N min d'inactivité) → purge de la DEK
   de la mémoire → écran de verrouillage.
4. **Changement de mot de passe** → déchiffre la DEK avec l'ancienne KEK →
   re-chiffre avec la nouvelle (rapide, sans toucher aux données).

### Formats stockés
- `« base »` : sel, verifier, DEK wrappé (métadonnées non sensibles).
- `« records »` : `{ id, v: ciphertext(JSON) , iv }` — les champs d'indexation
  (id de mois, clés) restent en clair pour les requêtes ; les **valeurs**
  (soldes, comptes, constantes) sont chiffrées.

### Règles & limites (assumées)
- **Pas de « mot de passe oublié »** : sans mot de passe → données illisibles.
  Uniquement récupérables via une sauvegarde déchiffrable (voir §8).
- Requiert un contexte sécurisé (HTTPS ou localhost) — déjà le cas pour une PWA
  servie en HTTPS (WebCrypto indisponible sinon).
- Export/import et backup Drive : fichiers **chiffrés** (même mécanisme) ; la
  restauration exige le mot de passe.

## 4. Données (IndexedDB)

> Valeurs chiffrées AES-256-GCM via la DEK (voir §3) ; structure ci-dessous.

- months : **une ligne par mois** (id = YYYY-MM), regroupée par domaine :
  - bourse : date, cto, privateMk, pea + calculés (total, plusValue,
    rendement, apy)
  - assuranceVie : livretVie, multiVie, cashFortuneo, linxea, scpi,
    investCumule + total + apy
  - crowdlending : investi, soldeDispo, revenuBrut → fiscalité (30%) → net +
    apy + total
  - crypto : tradeRep, binance, ledger, hotWalletPrincipal $, hotWalletLedger $,
    defi $, btc + total € (÷ CONV) + part BTC
  - horsImmo : compteCourant, livrets + total + variation (les autres postes
    proviennent automatiquement des domaines)
- patrimoine : état courant comptes (catégorie, société, montant) — synthèse
  issue des domaines
- credits : 5 prêts (nom, numéro, date départ/fin, taux, mensualité, montant,
  restant, % remboursé)
- constantes : prix crypto, conversion €/$, plafond PEA, date ouverture PEA,
  taux rendement (7 %), mensualités (Trade Rep 710, Fortuneo 600)

## 5. Moteur de calcul

- Port TS pur des formules des domaines actifs (totaux, variation,
  rendement/APY ×365, fiscalité 30%, plus-value, part BTC, % remboursé…).
- Les valeurs saisies déclenchent le recalcul des totaux en direct.
- Validation par tests de régression : résultats TS vs valeurs stockées dans
  l'ODS sur tout l'historique 2024→2026 (Vitest).

## 6. Écrans

- **Verrouillage / déverrouillage** : création du mot de passe au premier
  lancement, écran de déverrouillage, option verrouillage auto
- **Dashboard** : KPI brut/net/hors-immo, variation, part BTC, remplissage PEA,
  mois à compléter
- **Assistant « 1er du mois »** : détecte le mois à remplir (ou à corriger) et
  guide pas-à-pas par domaine groupé : Bourse → Assurance Vie → Crowdfunding →
  Crypto → Comptes/Livrets, avec évolution vs mois précédent en direct
- **Écrans par domaine** (formulaire + historique mensuel + graphiques) :
  Bourse, Assurance Vie, Crowdfunding, Crypto
- **Comptes courants & Livrets** (saisie du reste du Hors immo)
- **Patrimoine** : synthèse par compte + totaux brut/net/hors-immo
- **Crédits immo** : restant dû, % remboursé, projection <250 k€
- **Projection Bourse** : dashboard de projection (7 %, invest mensuel,
  retrait 4 %)
- **Constantes / Paramètres** : prix crypto, conversion, plafond PEA, taux,
  mot de passe (changement)
- **Import initial + Export** (CSV/JSON chiffré) + Backup Google Drive

## 7. Graphiques reproduits (Chart.js)

1. Patrimoine : anneau répartition
7. Patrimoine : courbe évolution actifs
8. Patrimoine : anneau répartition (2e vue)
2/9. Hors immo : courbes CC, Livrets, AVI, Crowd., Bourse, Crypto, Total
6/10. Bourse : CTO, Private Market, PEA, Total
3/11. Crypto : Trade Rep, Binance, Ledger, HW, Defi
5/12. Assurance Vie : Livret Vie, Multi Vie, Linxea, SCPI, Total
4/14. Crowdlending : revenu net mensuel
13. Crowdlending : investi / solde / total
15. Projection Bourse : total objectif (7 %), total réel, évol. plus-value

## 8. Backup Google Drive

- « Lier à Google Drive » : OAuth 2.0 (GIS), scope drive.file.
- Fichier créé par l'app (patrimoine-backup-YYYY-MM-DD.json), **chiffré**
  (même mécanisme que §3), mis à jour à chaque sauvegarde + rappel périodique.
- La restauration d'une sauvegarde exige le mot de passe (déverrouillage ou
  mot de passe d'import).
- Requiert un OAuth Client ID web (Google Cloud Console) — procédure fournie.
- Fallback : export/import manuel de fichier chiffré.

## 9. Étapes d'implémentation

1. Scaffold Vite + TS + PWA (manifest, SW, icônes, idb, Chart.js)
2. Schéma IndexedDB + repositories (mois par domaine)
3. **Couche chiffrement** : WebCrypto (PBKDF2, DEK wrappée, AES-GCM), écran de
   création/déverrouillage/verrouillage, tests unitaires chiffrement/changement
   de mot de passe
4. Moteur de calcul + tests de régression vs ODS
5. Outil d'import initial ODS/CSV (chiffre à l'écriture) + réconciliation
6. Assistant de saisie mensuelle + écrans par domaine
7. Dashboards + graphiques Chart.js
8. Crédits immo + Constantes + Projection
9. Backup Google Drive chiffré + export/import chiffré
10. Polissage responsive mobile + validation finale

## 10. Organisation

- Projet dans /home/jonathan/Develop/patrimoine (racine créée côté repo GitHub
  JonathanMortier/patrimoine, privé).
- docs/Patrimoine.ods conservé hors version (référence pour tests).
- Ce plan : docs/plan.md.

## 11. État d'avancement — reprise

> À relire en début de session pour savoir où reprendre.

### Étapes §9
- **1 → 7 faites.** Stack Vite+TS+PWA, schéma + repos IndexedDB chiffrés,
  double clé (PBKDF2/DEK wrappée, `crypto/security.ts`), moteur de calcul +
  régression ODS, import TSV + réconciliation, assistant « 1er du mois »
  + historique par domaine intégré dans **Saisie**, **Dashboard + graphiques
  Chart.js** (`views/dashboard.ts` : KPI hors immo/brut/net avec variation,
  remplissage PEA, part BTC brut/net/hors-immo, mois manquants, courbe
  évolution + anneau répartition, tableau de repli si pas de `<canvas>`).
- **8 : faite.** **Crédits immo** (écran complet `views/credits.ts` :
  tableau transposé par propriété/numéro, sous-totaux, total, % remboursé,
  palier 250 k€, colonnes masquables) + **Constantes complètes éditables dans
  Réglages** (voir §Décisions : plafond PEA, prix BTC €/$, taux rendement,
  mensualités Trade Rep/Fortuneo, date ouverture PEA, conversion, + bouton
  « Récupérer les prix en ligne »). **Projection Bourse (écran) : faite**
  (`views/projection.ts` : KPIs, détail mensuel Objectif/Réel + chart,
  chart annuel Réel/Plus value/Évol. plus value, table annuelle 2025→2050
  récurrence 7 % + valeurs 1er janvier, salaire retrait 4 % — moteur
  `calc/projection.ts` + `calc/projectionAnnual.ts` + 
  `calc/projectionMonthly.ts`, régressé vs ODS).
- **9 / 10 : non commencées** (backup Google Drive + export/import chiffré ;
  polissage).

### Décisions & divergences vs ce plan (à jour)
- **Comptes / Livrets** = 5 sous-comptes sommé :
  `compteCourantCa`, `compteCourantFortuneo`, `compteCourantTradeRep`,
  `livretA`, `ldd`. Ancien schéma `{ compteCourant, livrets }` **migré à la
  lecture** par `normalizeMonth()` (`db/repos/months.ts`) sur `get/all`
  (totaux préservés). Import historique : « Compte courant » → CA,
  « Livrets » → Livret A (usage `horsImmoLiquidity()` dans
  `calc/horsImmo.ts`, `calc/index.ts`, `import/reconcile.ts`, `views/fields.ts`,
  `views/saisie.ts`).
- **Assurance Vie** : plus de champ « Versements cumulés » ni APY (décision
  utilisateur, AV uniquement) ; Bourse garde `annualizeAPY`, Crowdfunding
  `crowdlendingApy` (colonne APY reconnue mais ignorée).
- **Bourse** : `plusValue` (colonne « Plus value », colonne E de la feuille) —
  renseignée pour tous les mois, informative (pas dans `bourseTotal`).
- **Crowdfunding** : `fiscalite` saisi (sinon fallback 30 % du brut) ; total =
  `investi + soldeDispo` (hors brut/fiscalité). Net = brut − fiscalité.
- **Crypto** : total = comptes € + (Hot Wallet Principal § + Ledger § +
  DeFi §) ÷ `convUsdEur`. Sous-affichage « dont X € converti de $ » + part BTC
  en % (`btcEur` sinon `btcUsd ÷ convUsdEur`).
- **Constantes** (`db/repos/constantes.ts`) : `convUsdEur` par défaut **1,14**
  (migration si stocké à 1 — ancien défaut) ; `btcUsd` défaut/migration
  **77 429 $** ; le prix est « actuel » et saisi par l'utilisateur — **à
  rafraîchir périodiquement depuis Réglages** (bouton en ligne).
- **Page Domaines supprimée** : l'**Historique** par domaine (segs + tableau 12
  mois) est dans Saisie. Routes actuelles : dashboard, saisie, import,
  credits, projection, reglages (toutes fonctionnelles).
- **Réglages** : carte « Constantes » (conversion €/$, plafond PEA, prix BTC €/$
  `btcEur` optionnel sinon calculé `btcUsd ÷ convUsdEur`, taux rendement
  `% → /100`, mensualités Trade Rep/Fortuneo, date ouverture PEA) + bouton
  **« Récupérer les prix en ligne »** (pré-remplit conversion + prix BTC depuis
  `src/utils/market.ts` — ER-API + CoinGecko, sans clé ni enregistrement ;
  champs toujours modifiables ; appels indépendants : réussite partielle OK) +
  changement de mot de passe ; `renderReglages` est async (appel via `.catch`).
- **Validation des champs Constantes** : les champs qui reçoivent des valeurs à
  précision arbitraire (`convUsdEur`, `btcUsd`, `btcEur`, `tauxRendement`)
  sont en `step="any"` — sinon la validation native HTML5 bloque (ex. taux
  `7,25` non-multiple de `0.1`, conversion à 4 décimales non-multiple de
  `0.01`). La garde réelle est la validation JS (nombre fini, ≥ 0 ; conv > 0).

### Vérifications
- `npx vitest run` → **155 verts / 157** ; `npm run typecheck` ; `npm run build`
  (tsc + vite, service worker).
  - **2 échecs pré-existants non liés** dans `views/__tests__/navigation-seeded.test.ts`
    (sauvegarde du « crédit restant » dans Saisie) — présents avant ce travail,
    confirmés en revertant la partie Constantes.
- Tests spécifiques Constantes/marché : `views/__tests__/reglages.test.ts`,
  `utils/__tests__/market.test.ts` (fetch moké, réussite partielle, échec total).
- Données de test réelles **gitignoreées** (`src/import/__fixtures__/`, déjà en
  place sur la machine) : une régression ODS/layouts échoue sur un clone frais
  sans fixtures → ne pas pousser de code qui briserait cela sans remarque.
- Navigation sous happy-dom : utiliser `navigate()` (location.hash ne déclenche
  pas `hashchange`). `fmtEuro(n, digits = 0)` → 0 décimale. Dans les tests, un
  `requestSubmit()`/clic de bouton `type=submit` ne déclenche pas l'événement
  `submit` sous happy-dom → dispatcher `new Event('submit', { bubbles, cancelable })`
  sur le formulaire.

### Prochaine session
1. **9 / 10** : backup Google Drive chiffré + export/import chiffré ; polissage
   responsive mobile + validation finale.