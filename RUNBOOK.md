# NetWorth — Runbook

Operational reference for both repos (`app/`, `api/`): environment setup, running, debugging, building, and troubleshooting. For *what each piece does*, see `ARCHITECTURE.md` in each repo — this doc is about *running* it.

## Repo layout

Two independent git repos in one working folder, each on `develop` (default) with `main` as production:

- `app/` — Expo/React Native client → `origin` = `net-worth-app`
- `api/` — NestJS backend → `origin` = `net-worth-api`

PRs target `develop`. `main` is only fast-forwarded/merged for production releases.

## API — setup & run

**Requirements:** Node 22.x, a Postgres database (Neon in prod), optionally Redis (everything degrades to cache-miss without it — not a hard dependency).

**Env vars** (`api/.env`, none of these are optional except where noted):

| Var | Used for |
|---|---|
| `DATABASE_URL` | Prisma / Postgres connection |
| `REDIS_URL` | session/user cache, vault lockout counters, AI cache — optional, falls back to no-cache |
| `APP_JWT_SECRET` | signs the 15-min access token |
| `GOOGLE_CLIENT_ID` | verifies Google ID tokens for `/auth/google` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | OTP + login-notification emails |
| `GEMINI_API_KEY` | `/ai/insights` — without it, insights silently no-op (checked in `ai.service.ts`) |
| `GEMINI_MODEL` | optional, defaults to `gemini-2.5-flash` |
| `PORT` | local dev only, defaults 3000 |

```bash
cd api
npm install
npx prisma db push       # no migrations folder in this repo — push schema directly
npm run start:dev        # http://localhost:3000, Swagger UI at /docs
```

Seed data (banks, card products) reseeds itself on every boot from code (`banks.service.ts` / `card-products.service.ts` — `OnModuleInit`), nothing to run manually.

One-off backfill script (only needed once against pre-existing data missing `bankCode`):
```bash
npm run backfill:bank-code
```

## App — setup & run

**Requirements:** Node LTS, Expo CLI (`npx expo`), Android Studio/emulator or a physical Android device for testing transaction-capture (the notification-listener is Android-only and degrades gracefully on iOS/web).

**Env vars** (`.env` or shell, all `EXPO_PUBLIC_*` so they're inlined at build time):

| Var | Used for |
|---|---|
| `EXPO_PUBLIC_API_URL` | backend base URL. **Unset = fully offline/local mode** — useful for UI work without running the API |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In |
| `EXPO_PUBLIC_APP_URL` | used only in share-invite text and the badge screen |

```bash
cd app
npm install
npx expo start
```

For the transaction-capture flow you need a real Android build (dev client or EAS build), not Expo Go — the native notification-listener module isn't in Expo Go.

## Tests / checks

```bash
cd api && npm test        # jest, Prisma mocked, no DB needed
cd app && npm run check   # runs every src/**/*.check.ts (plain assert scripts, no framework)
```

Neither suite touches a real database or the network — safe to run anywhere, including CI, with no secrets.

## Debugging the transaction-capture pipeline

This is the app's core automation and the most common source of "why didn't this show up" reports. Order of operations (see `app/ARCHITECTURE.md` § Transaction capture for the full flow):

1. **Permission not granted** — check `permissions.tsx` / notification-listener status via `notificationListener.ts`. Without OS-level notification access, nothing fires.
2. **Notification never reached the headless task** — Android sometimes kills the listener; foreground re-scan (`scanActiveNotifications()`) is the recovery path, triggered on every app foreground.
3. **Message arrived but was deduped** — check `processedNotifKeys.ts` (durable, 500-entry FIFO) and `notifDedup.ts` (5-min exact-text window). A legitimately re-sent notification with identical text inside 5 minutes is dropped by design.
4. **Parsed but produced no match** — `bankMessageParser.ts` returned `null` or the account/card didn't match → becomes an "orphan" transaction, visible with a banner on `transactions.tsx` until the matching account/card is added (then `replayForNewAccount`/`replayForNewCard` backfills it).
5. **Parsing itself wrong** — add a case to `bankMessageParser.check.ts` reproducing the exact SMS/notification text and run `npm run check`; fix the regex in `bankMessageParser.ts` (or a `BANK_RULES` entry) until it passes.

## Vault / security debugging

- Vault PIN is verified **server-side only** (`api/src/auth/auth.service.ts` `verifyVaultPin`) — client sends a SHA-256 hash, never the PIN. 3 wrong attempts → 24h lockout (Redis-counted, see `AuthService`).
- App Lock (biometric, `securityStore` in the app) is a separate, independent mechanism from the vault PIN — don't conflate lockout symptoms between the two when triaging.

## Common issues

| Symptom | Likely cause | Where to look |
|---|---|---|
| App shows stale data after a write | AI-insights cache not busted, or account not syncing | `data.service.ts` (any write should bust `ai_insights:{userId}`); `sync.ts` |
| `403` on account/card write from the app | Cross-tenant id collision, working as intended | `data.service.ts` — creates/updates are always scoped `{id, userId}` |
| Offline txns don't reconcile after login | `bulkCreate` swallows individual failures by design (partial success is fine, client re-syncs on next bootstrap) | `data.service.ts` `bulkCreate`, `sync.ts` |
| Neon cold-start errors (`P1001`) on bootstrap | Expected on serverless cold start | `withDbRetry` in `data.service.ts` retries automatically |
| `/ai/insights` returns a placeholder, not real insights | Fewer than 3 confirmed transactions in the last 90 days, or `GEMINI_API_KEY` unset | `ai.service.ts` |

## Deploy

- **API**: single Vercel serverless function (`@vercel/node` → `src/main.ts`). Push to the branch Vercel is wired to (check the Vercel project's branch settings — don't assume `main`).
- **App**: EAS build (`eas.json` has the build profiles) for dev-client/production Android/iOS binaries; `npx expo start --web` for the web target.
