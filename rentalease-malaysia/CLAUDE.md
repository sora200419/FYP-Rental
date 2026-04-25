# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # prisma generate + next build
npm run lint       # ESLint check
npx prisma migrate dev   # Apply schema changes and generate client
npx prisma studio        # GUI to inspect/edit DB data
```

No test suite is currently configured.

## Environment Variables

Required in `.env` (no `.env.example` exists):

```
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="<64-char-hex>"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="<Google API key>"
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
CLOUDINARY_UPLOAD_PRESET="rentalease_payments"
BLOCKCHAIN_PRIVATE_KEY="0x..."   # Sepolia testnet wallet
SEPOLIA_RPC_URL="https://..."
USE_MOCK_GEMINI=true             # Skip real Gemini calls during dev
```

Set `USE_MOCK_GEMINI=true` during UI development. Turn it off for integration testing and demos.

## Architecture

### Route Groups

```
src/app/
├── (auth)/           # /login, /register — public
├── (dashboard)/      # /dashboard/landlord/*, /dashboard/tenant/*
└── api/              # 17+ API routes
```

`src/middleware.ts` wraps all `/dashboard/*` routes with NextAuth's `withAuth`, and redirects users to their role-appropriate sub-path (LANDLORD → `/dashboard/landlord`, TENANT → `/dashboard/tenant`).

### Auth

NextAuth.js v4 with a Credentials provider. JWT tokens carry `id`, `email`, `role`, and `language`. Config lives in `src/lib/auth.ts`. Passwords are bcrypt-hashed. Role is an enum: `LANDLORD | TENANT`.

### Data Model (Prisma + PostgreSQL)

Key access-control chain: `User → Property → Room → Tenancy`. API routes authorize by traversing this chain (e.g., `Room.property.landlordId === session.user.id`).

Core status flows:
- **Tenancy**: `INVITED → PENDING → ACTIVE → EXPIRED | TERMINATED`
- **Agreement**: draft → `PENDING_TENANT | PENDING_LANDLORD → FINALIZED`
- **RentPayment**: `PENDING → PAID` — **"late" is computed dynamically** (`dueDate < now() && status === PENDING`), not stored as a DB enum.
- **DepositRefund**: `PROPOSED → NEGOTIATING → AGREED → COMPLETED`

Financial amounts use `Decimal` with 10,2 precision.

### AI Agreement Generation (`src/lib/gemini.ts`)

Two-step Gemini call sequence for each agreement:

1. **`generateTenancyAgreement(tenancy, preferences)`** — calls `gemini-2.0-flash` in JSON mode. Returns `rawContent` (full legal text), `plainLanguageSummary` (English clause explanations), and `redFlags` (array of `{severity, clause, issue, recommendation}`).
2. **`translateAgreementOutputs(...)`** — separate call to translate `plainLanguageSummary` and `redFlags` into formal Bahasa Malaysia (`plainLanguageSummaryMs`, `redFlagsMs`).

Enum values are converted to human-readable strings before being sent to Gemini (see `src/lib/wizardFormatters.ts`). Mock fixtures live in `src/lib/mockGemini.ts`.

API integration points: `POST /api/agreements/generate`, `POST /api/agreements/[id]/assist`.

### Blockchain Anchoring (`src/lib/blockchain.ts`)

On agreement finalization (`POST /api/agreements/[id]/finalize`), a SHA-256 hash of the agreement content is written to a zero-value Sepolia transaction as `RentalEase:sha256:<hex>`. Returns the tx hash immediately without waiting for confirmation. Verifiable at `https://sepolia.etherscan.io/tx/{txHash}`.

### File Storage

Cloudinary hosts all uploaded files: payment receipts (`PaymentProof`), condition report photos (`ConditionPhoto`), and tenant documents (`TenantDocument`). `src/lib/cloudinary.ts` handles upload/delete. `next.config.ts` whitelists `res.cloudinary.com` for `<Image>` optimization.

### i18n

Bilingual English / Bahasa Malaysia throughout. `src/lib/i18n.ts` provides translation helpers. Agreement model stores both language versions of summaries and red flags.

### Key Libraries

- **Form validation**: React Hook Form + Zod
- **PDF export**: `@react-pdf/renderer`
- **Web3**: ethers.js v6 (Sepolia testnet only)
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss`
- **Path alias**: `@/*` → `src/*`
