# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `rentalease-malaysia/`:

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build
npm run lint      # ESLint
npx prisma migrate dev    # Apply schema changes + regenerate client
npx prisma studio         # Open Prisma DB browser
npx prisma generate       # Regenerate Prisma client after schema changes
```

## Architecture

**Stack:** Next.js 16 App Router, TypeScript 5, PostgreSQL + Prisma ORM, NextAuth v4 (JWT), Tailwind CSS v4, Google Gemini 1.5 Flash.

### Route Groups

- `(auth)/` — public routes: `/login`, `/register`
- `(dashboard)/` — all routes under `/dashboard/*`, protected by middleware
  - `dashboard/landlord/*` — landlord-only pages (properties, tenancies, messages)
  - `dashboard/tenant/*` — tenant-only pages (tenancy, payments, messages)

Middleware at `src/middleware.ts` enforces role-based access: LANDLORD → `/dashboard/landlord/*`, TENANT → `/dashboard/tenant/*`, ADMIN → `/dashboard/admin/*`. The root `/` redirects to `/login`.

### Key `src/lib/` Files

- `auth.ts` — NextAuth config: credentials provider, bcrypt comparison, JWT with `id`/`role`/`email`
- `prisma.ts` — singleton PrismaClient (global cache pattern for dev hot-reload)
- `gemini.ts` — Gemini AI client for agreement generation; returns structured JSON with `rawContent`, `plainLanguageSummary`, `redFlags`

### Data Model (Prisma)

Core flow: **User** (LANDLORD) owns **Property** → creates **Tenancy** linking a TENANT User → Tenancy has one **Agreement** (AI-generated) and many **RentPayment** records.

- `Agreement` status: `DRAFT → FINALIZED → SIGNED`
- `Tenancy` status: `PENDING → ACTIVE → EXPIRED / TERMINATED`
- `RentPayment` status: `PENDING / PAID / LATE / WAIVED`

### API Route Conventions

- Every API route calls `getServerSession(authOptions)` — never trust user IDs from the request body; always use `session.user.id`
- Input validation with Zod schemas on all POST endpoints
- Consistent JSON error responses with appropriate HTTP status codes
- Agreements use upsert so re-generation doesn't orphan records

### AI Agreement Generation

`/api/agreements/generate` calls Gemini with property + tenancy details. The prompt instructs Gemini to return JSON with three fields:
1. `rawContent` — formal legal text (references Malaysian law: Contracts Act 1950, Distress Act 1951, National Land Code 1965)
2. `plainLanguageSummary` — clause-by-clause plain English explanation
3. `redFlags` — array of `{ issue, severity: HIGH|MEDIUM|LOW, explanation }`

### TypeScript Path Alias

`@/*` maps to `src/*` — use this for all internal imports.

## Environment Variables

Required in `rentalease-malaysia/.env`:

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<random-string>
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=<Google-Gemini-API-key>
```

## Session Type Augmentation

`src/types/next-auth.d.ts` extends NextAuth's `Session` and `JWT` types to include `id` and `role`. Always import `Session` from `next-auth` — the augmentation applies automatically.
