# Ledgerly

Premium personal finance app for Android, iOS and web. People record transactions by hand in any common currency.

- `app/` — Expo SDK 57 app (Expo Router, React Native Paper). Calls the API through `EXPO_PUBLIC_API_URL`.
- `api/` — Node.js + TypeScript, Express 5, Prisma 7 + PostgreSQL, Zod, JWT with role checks.

Requires Node 22.13.x.

## Run locally

```bash
# 1. API
cd api
npm install
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
npm run db:local              # optional: dev-only embedded PostgreSQL on :5433 (leave running)
npx prisma migrate deploy
npx prisma generate
npm run db:seed:dev           # idempotent
npm run dev                   # http://0.0.0.0:4600

# 2. App
cd app
npm install
cp .env.example .env          # EXPO_PUBLIC_API_URL=http://localhost:4600
npx expo start --web          # or press a / i for Android / iOS
```

On a physical phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, e.g. `http://192.168.1.20:4600`.

## Seeded accounts

| Email | Password | State |
| --- | --- | --- |
| alex@ledgerly.app | Ledgerly123! | ADMIN, USD, ~46 transactions across 3 months and 5 currencies |
| sam@ledgerly.app | Ledgerly123! | USER, EUR, no transactions (real empty state) |

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Checks database connectivity |
| POST | `/auth/register` | `{ name, email, password, currency }` |
| POST | `/auth/sign-in` | `{ email, password }` → `{ token, user }` |
| GET / PATCH | `/auth/me` | Current user |
| GET | `/transactions?q=&type=INCOME\|EXPENSE` | Signed-in user's transactions only |
| POST | `/transactions` | `{ type, amount, currency, categoryId?, note?, date }` |
| GET / PATCH / DELETE | `/transactions/:id` | 404 for anyone but the owner |
| GET / POST | `/categories`, DELETE `/categories/:id` | Per-user categories |
| GET | `/summary?month=YYYY-MM` | Month income/spending and balance per currency |
| GET | `/admin/stats` | `ADMIN` role only |

Amounts are decimal strings validated against each currency's minor units (JPY 0, USD 2, KWD 3). Currencies are never converted or summed together.

## Build

```bash
cd api && npm run build && npm start         # build runs prisma generate
cd app && npx expo export --platform web     # output: app/dist
```
