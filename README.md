# NetWorth App

Expo / React Native (Expo Router, typed routes). Personal-finance tracker with automatic transaction capture from bank notifications, a PIN-gated vault for sensitive numbers, and per-item sharing. Works fully offline/local when `EXPO_PUBLIC_API_URL` is unset. Backend: [../api](../api).

For directory map, stores/services tables, screen-by-screen breakdown, and end-to-end flows, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**. For setup/run/debug/deploy, see **[RUNBOOK.md](./RUNBOOK.md)**.

## Quick start

```bash
npm install
npx expo start
```

## Checks

No jest — this repo uses lightweight standalone self-checks (`*.check.ts`, plain assertions, no framework):

```bash
npm run check   # runs every src/**/*.check.ts via tsx
```

## Branches

`develop` is the default/working branch; `main` tracks production. Open PRs against `develop`.
