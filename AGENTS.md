# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**pgsuite** (`pg-manager-api/`) is a multi-tenant PG (Paying Guest) management REST API built with:
- **Runtime:** Node.js 22 + TypeScript + Express 5
- **ORM:** Prisma 7 with `@prisma/adapter-pg` (driver adapter required in v7)
- **Database:** PostgreSQL 16
- **Validation:** Zod v4
- **Testing:** Jest + ts-jest + Supertest

### Architecture

- `pg-manager-api/` — Express 5 REST API (backend)
- `pg-manager-app/` — Expo React Native app (frontend, runs on web/iOS/Android)

### Quickstart — API

All commands run from `pg-manager-api/`:

| Task | Command |
|---|---|
| Install deps | `pnpm install` |
| Generate Prisma client | `npx prisma generate` |
| Run migrations | `npx prisma migrate dev` |
| Seed database | `pnpm run db:seed` |
| Dev server | `pnpm run dev` (port 3000) |
| Lint | `pnpm run lint` |
| Test | `pnpm test` |
| Build | `pnpm run build` |

### Quickstart — Mobile App

All commands run from `pg-manager-app/`:

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Web dev | `npm run web` (port 8081) |
| iOS | `npm run ios` |
| Android | `npm run android` |

The mobile app connects to the API at `localhost:3000` — **start the API first**.

### Non-obvious caveats

- **PostgreSQL must be running** before any Prisma command. Start with `sudo pg_ctlcluster 16 main start`.
- **Prisma v7 requires a driver adapter** — `new PrismaClient()` without `{ adapter }` will throw. See `src/config/db.ts` and `prisma/seed.ts` for the pattern.
- **Prisma config lives at the project root** as `prisma.config.ts` (not inside `prisma/`). The `datasource.url` is set there, not in `schema.prisma`.
- **Dev auth uses headers** `x-user-id` and `x-user-role` instead of JWT. OTP is always `123456`.
- **Express 5 params** are typed `string | string[]`, so route handlers cast `req.params.id as string`.
- The `.env` file contains the local `DATABASE_URL` — it is gitignored; copy from `.env.example`.
