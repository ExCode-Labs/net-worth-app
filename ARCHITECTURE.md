# NetWorth App — Reference

Expo / React Native (Expo Router, typed routes). Companion doc: `../api/ARCHITECTURE.md`. Works fully offline/local when `EXPO_PUBLIC_API_URL` is unset (`apiEnabled` gate in `services/api.ts`).

## Directory map

```
src/app/               expo-router screens (file-based routing)
  (auth)/              welcome, login, permissions, setup — pre-auth stack
  (tabs)/              index (Home), transactions, add, cards, more — bottom tabs
  _layout.tsx          root: LockGate + SyncController + RouteGate
  accounts.tsx, add-account.tsx
  add-card.tsx
  add-asset.tsx, asset/[id].tsx, assets.tsx
  add-liability.tsx, liability/[id].tsx, liabilities.tsx
  edit-transaction.tsx, transaction/[id].tsx, pick-transaction.tsx
  ai-insights.tsx, analytics.tsx, badge.tsx
  edit-profile.tsx, preferences.tsx, security.tsx, sessions.tsx
  vault.tsx
  sharing.tsx, share-select.tsx, share-config.tsx, shared/[ownerId].tsx

src/store/             one zustand store per domain (see table below)
src/services/          API client + business logic (see table below)
src/components/        screen-scoped and shared UI (assets/, home/, onboarding/, security/, sharing/, transactions/, ui/)
src/constants/         cardProducts, categories, currencies, indianBanks, networthTiers, slides, theme
src/utils/             analytics, apiError, avatar, formatters, haptics, id, maturity, screenCapture
```

`*.check.ts` files (`bankMessageParser.check.ts`, `notifDedup.check.ts`, `analytics.check.ts`, `networthTiers.check.ts`) are ponytail-style runnable self-checks next to the logic they validate — no test framework, just assertions.

## Key dependencies

- **expo-router** — file-based routing, typed routes on. `_layout.tsx` is the single navigation gate.
- **zustand** + `AsyncStorage` — most domain stores persisted this way.
- **expo-secure-store** — only for sensitive scalars: auth tokens, device id, app-lock flag (web falls back to `localStorage`).
- **nativewind** — all styling via Tailwind `className`.
- **axios** (`services/api.ts`) — device-identity headers + silent 401 refresh-and-retry interceptor.
- **@react-native-google-signin/google-signin** — Google OAuth.
- **react-native-android-notification-listener** — native module powering transaction capture; Android-only, degrades gracefully elsewhere.
- **expo-local-authentication** — App Lock biometrics (distinct from vault PIN, which is server-verified SHA-256).
- **expo-contacts** — sharing/contact-discovery.
- **expo-crypto** — SHA-256 for phone-discovery hashing and vault PIN hashing.
- **expo-sharing + react-native-view-shot** — render-to-PNG share (transaction receipt, net-worth badge).
- **@gorhom/bottom-sheet, react-native-reanimated, react-native-gesture-handler** — sheets/animations.
- `@clerk/expo` is in `package.json` but not wired into the actual auth flow (`services/auth.ts` is custom email/OTP/Google) — likely unused, worth confirming/removing.

## Stores (`src/store`)

| Store | Persisted | Holds | Key actions |
|---|---|---|---|
| authStore | SecureStore | welcome/onboarded/guest/signed-in flags, access+refresh tokens, notif-gate state | hydrate, completeWelcome/continueAsGuest/completeOnboarding, setSession/updateAccessToken, signOut |
| userStore | mixed | device id, phone, full profile mirror (name/email/avatar/hasVaultPin/hasPassword/2FA) | hydrateDeviceId, setGuestName/setName/setPhone, setProfile, reset |
| accountStore | AsyncStorage | currency, accounts[], assets[] | setCurrency, add/update/removeAccount, add/update/removeAsset; selectors selectTotalBalance/selectTotalAssets/selectNetWorth |
| cardStore | AsyncStorage | cards[] (PAN, holder, network, last4, limit, usage) | add/update/removeCard; selectTotalLimit/selectTotalUsage |
| liabilityStore | AsyncStorage | liabilities[] | add/update/removeLiability; selectTotalLiabilities |
| transactionStore | AsyncStorage | transactions[] | add/update/removeTransaction, categorizeByMerchant; applies/reverses balance deltas for manual txns |
| categoryStore | AsyncStorage | merchant→category rules | setRule/removeRule; resolveCategory/learnCategory |
| payeeStore | AsyncStorage | VPA→friendly-name aliases | setAlias/removeAlias; resolvePayee |
| bankStore | AsyncStorage | Indian banks (seeded, refreshed from `GET /banks`) | refresh |
| cardProductStore | AsyncStorage | card products (seeded, refreshed from `GET /card-products`) | refresh |
| currencyStore | AsyncStorage | FX rates (1h cache) | fetchRates(force?); convertFromINR |
| prefsStore | AsyncStorage | hideAmounts | setHideAmounts |
| securityStore | SecureStore | appLockEnabled, locked | hydrate, setAppLock, lock/unlock |
| confirmStore | none | imperative confirm-dialog state | show/accept/dismiss; confirm(...) |
| toastStore | none | toast state | show/hide; toast.success/error/info |
| pickTxnStore | none | in-flight "link a transaction" request | request/fulfill/cancel |

## Services (`src/services`)

| Service | Purpose |
|---|---|
| api.ts | Axios client; Bearer or `X-Device-Key/Id/Hardware-Id` headers; 30s timeout; single-flight 401→refresh→retry; `apiEnabled` gate |
| auth.ts | login/register/OTP/forgot-reset/Google; `finishLogin` persists session + hydrates userStore; session list/revoke/logout |
| backend.ts | Typed CRUD over the API: fetchBootstrap, fetchVaultData, updateMe, pushCreate/syncCreate/pushUpdate/pushRemove/syncBulk; tracks `dirty` on failed writes; `syncCreate` uses a 30ms-spaced serial queue |
| sync.ts | Login-time bootstrap orchestration: adopt server data if present, else offline-first push local up; startSync/resync/stopSync/pushAllLocal/clearAllDataStores |
| bankIngest.ts | Parsed message → Transaction + Account.balance/Card.usage update; orphan handling; replayForNewAccount/replayForNewCard |
| bankMessageParser.ts | Pure regex parser for Indian bank/UPI/card notification text; per-bank rules (`BANK_RULES`), generic amount/last-4/balance/date extractors |
| bankSenders.ts | SMS sender DLT-code → canonical bank name registry |
| notificationListener.ts | Wraps the native Android notification-listener module; permission status/request; `getActiveNotificationsRaw()` for catch-up scans |
| notificationTask.ts | Headless JS task entry (registered via `index.js`); routes notifications through dedup guards → bankIngest; re-scans on foreground |
| notifDedup.ts | 5-min exact-text dedup window (AsyncStorage) against Android's rapid re-delivery |
| processedNotifKeys.ts | Durable "already ingested" guard by notification key (bounded FIFO, 500 max) |
| vaultPin.ts | Client-side SHA-256 PIN hashing + `/auth/vault/*` calls |
| biometrics.ts | Wraps `expo-local-authentication` for App Lock only |
| contacts.ts | OS contact picker (lender/borrower person fields) |
| sharing.ts | Contact-discovery hashing, share CRUD, fetchSharedData, in-memory shareCache |
| ai.ts | `GET /ai/insights` client |
| rates.ts | Gold price + mutual-fund NAV lookups (no-key public APIs) for the asset form |
| banks.ts / cardProducts.ts | Thin `GET /banks` / `GET /card-products` clients |
| deviceId.ts | Android SSAID (survives reinstall) or locally-persisted UUID fallback |

## Screens

### Auth / onboarding
- **welcome.tsx** — first-launch slides → `completeWelcome()` → login.
- **login.tsx** — one screen, 4 stages (auth/otp/forgot/reset), Sign In/Sign Up tabs, Google, Guest. All paths end in `finishLogin()`.
- **permissions.tsx** — required: battery-optimization exemption (self-confirmed) + notification-listener access; optional: contacts, app notifications. Gates onward navigation.
- **setup.tsx** — 4-step onboarding: phone+currency → first account → first asset → summary. Finishes with `pushAllLocal()` + `completeOnboarding()`.

### Root layout (`_layout.tsx`)
LockGate (biometric lock on background if enabled) + SyncController (start/stop/resync `services/sync`) + RouteGate (single source of truth routing between `(auth)` and `(tabs)`).

### Tabs
- **index.tsx (Home)** — net-worth hero, amount-hide toggle, accounts overview, quick actions, AiInsightsCard, 6-month expense chart, recent transactions.
- **transactions.tsx** — list/calendar toggle, search+filter, notification opt-in banner, orphan-transaction banners (add missing account/card, or reject).
- **add.tsx** — manual transaction entry (Expense/Income/Transfer), category grid, account chips, learns merchant→category.
- **cards.tsx** — card carousel, utilization, detail panel, full list.
- **more.tsx (Profile)** — profile summary, net-worth snapshot, nav to Finance/Insights/Settings sections; sign-out flow (revoke session → clearAllDataStores → signOut → login).

### Finance CRUD
- **accounts.tsx / add-account.tsx** — reuses onboarding's AccountStep; add triggers `replayForNewAccount`.
- **add-card.tsx** — credit/debit toggle, CardProductPicker/BankPicker autofill, network auto-detect, debit requires linked account; add triggers `replayForNewCard`.
- **assets.tsx / add-asset.tsx / asset/[id].tsx** — shared AssetForm (mutual_fund/stocks/gold/property/fd/rd/lic/cash/lent), live NAV/gold-rate lookups, ledger links, Close/Reopen/Delete.
- **liabilities.tsx / add-liability.tsx / liability/[id].tsx** — loan/emi/borrow types (card dues derived read-only from cardStore), PersonField for borrow lender, ledger links, Close = Mark as Repaid.
- **edit-transaction.tsx / transaction/[id].tsx / pick-transaction.tsx** — edit with category-retag-matching prompt; detail as shareable receipt PNG; picker screen fed by pickTxnStore.

### Insights
- **ai-insights.tsx** — full list of server-generated insights.
- **analytics.tsx** — period selector, spent/earned/saved, income-vs-expense chart, category/merchant rankings — all computed client-side from transactionStore.
- **badge.tsx** — net-worth tier achievement card (shareable PNG, never reveals exact figure).

### Settings
- **preferences.tsx** — currency, hide-amounts toggle.
- **security.tsx** — App Lock toggle (biometric-gated), 2FA toggle, inline password set/change.
- **sessions.tsx** — list/revoke device sessions.
- **edit-profile.tsx** — name + phone.
- **vault.tsx** — PIN-gated reveal of full PAN/holder/account number/IFSC/branch; setup/unlock/change/forgot-PIN(email OTP)/24h lockout; blocks screenshots while open; loads via `GET /vault` only after unlock.

### Sharing
- **sharing.tsx** — Sharing tab (outgoing/incoming) + Contacts tab (discovery).
- **share-select.tsx** — alternate contact-discovery entry point.
- **share-config.tsx** — per-recipient category + per-item selection, saves via `upsertShare`.
- **shared/[ownerId].tsx** — read-only view of what another user shared, with opt-out.

## End-to-end flows

**Onboarding**: welcome → login (any method) → finishLogin → permissions (if notif-gate required) → setup (phone/currency, account, asset) → completeOnboarding + pushAllLocal → tabs.

**Auth**: all methods funnel through `services/auth.ts` → `finishLogin()`. 2FA makes email login return `{twoFactor:true}` instead of a session, forcing OTP even after correct password. Guest mode never touches the auth backend — all requests carry `X-Device-Key/Id[/Hardware-Id]` instead.

**Vault PIN**: first visit → setup (enter/confirm) → `POST /auth/vault/setup`. Later visits → verify → attempts-left/24h lockout → forgot-PIN → email OTP → reset. Independent from App Lock (OS biometrics, `securityStore`).

**Sharing**: discover contacts (hash → `POST /share/discover`) → pick person → share-config (category+item picks) → `PUT /share/out`. Recipient opens `shared/[ownerId]` → `GET /share/in/:ownerId` (server enforces visible categories/items).

**Transaction capture (core automation)**:
1. `index.js` registers the headless notification task at startup.
2. User grants notification-listener access (permissions screen or in-app banner).
3. Bank/UPI notification arrives → headless task → `processedNotifKeys` (durable dedup) → `notifDedup` (5-min window) → `bankIngest.ingestMessage` → `bankMessageParser` (sender-code → bank, then per-bank rules) → creates Transaction + updates matching Account.balance/Card.usage. Unmatched ("orphan") transactions still record but flag in transactions.tsx until the matching account/card is added, which then replays them.
4. On every foreground, `scanActiveNotifications()` re-reads the whole notification shade (native patch) to recover anything missed — idempotent via the same dedup guards.

**AI insights**: `ai-insights.tsx` and the Home teaser both call `GET /ai/insights` and purely render the returned strings — all aggregation happens server-side.
