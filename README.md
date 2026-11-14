# RentalEase Malaysia

AI-assisted digital tenancy platform for Malaysian residential rentals. Built as a Final Year Project.

Landlords list properties and rooms, invite tenants, and generate a tenancy agreement with Google Gemini from a six-step policy wizard. Tenants review a plain-language summary and red flags, in English or Bahasa Malaysia, before signing. After signing, the platform tracks:

- the deposit and monthly rent, with uploaded payment proofs;
- move-in and move-out condition reports, with photo evidence;
- the deposit refund settlement at the end of the tenancy.

Signed agreements are hashed (SHA-256), and the hash can optionally be anchored to the Ethereum Sepolia testnet as proof of existence.

## Features

| Area | What it does |
|---|---|
| Accounts and KYC | Registration with Malaysian IC validation. Identity verification uses IC front, IC back and a selfie, reviewed by an admin. Password reset by email. Accounts can be suspended or soft-deleted. |
| Properties and rooms | One property can hold several rentable rooms, each with its own rent, furnishing and bathroom type. Admins verify property ownership. Photo galleries. |
| Tenancies | Invitation flow (INVITED → PENDING → ACTIVE → EXPIRED / TERMINATED), for individual and corporate (company) tenants. Supports co-tenants, renewal and early termination. |
| AI agreement | Six-step policy wizard, then Gemini generates the agreement. Landlords can edit it with AI assist. Tenants get a plain-language summary and red flags in English and Bahasa Malaysia, and can request changes. Confirmed terms are extracted from the agreement and synced to the tenancy when it is finalised. |
| Signing | The tenant signs digitally, then uploads a signed hard copy for the landlord to approve. The content hash, timestamp and IP are recorded. Optional on-chain anchoring. PDF export. |
| Payments | Deposit and monthly rent, each paid by uploading proof (image or PDF) for the landlord to approve or reject. The rent schedule is generated automatically when the tenancy becomes active. |
| Condition reports | Move-in, move-out and inspection reports with a photo evidence checklist. The other party can accept, request a correction, add counter-evidence, or dispute. Move-in and move-out reports can be compared side by side. |
| Deposit settlement | The landlord proposes deductions linked to photo evidence. The tenant accepts or disputes each one. The landlord marks the refund paid by uploading proof. |
| Messaging and notifications | One message thread per tenancy, in-app notifications, transactional email, and reminders 30 and 7 days before a tenancy ends. |
| Admin | KYC queue, property verification, user management (verify, revoke, suspend, delete), and an audit log. |

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL with Prisma 5 |
| Auth | NextAuth 4 (credentials provider, JWT sessions) with role-based routing in `src/proxy.ts` |
| AI | Google Gemini (`@google/generative-ai`, model `gemini-2.5-flash`) |
| Files | Cloudinary |
| Email | Resend |
| Rate limiting | Upstash Redis |
| Blockchain | ethers v6 on the Ethereum Sepolia testnet |
| PDF | @react-pdf/renderer |
| Validation | zod 4, react-hook-form |
| Tests | Vitest |

## Repository layout

```
.
├── README.md
├── docs/                    Architecture, deployment, audit and roadmap notes
└── rentalease-malaysia/     The Next.js application (deploy root)
    ├── prisma/              schema.prisma and migrations
    ├── scripts/             One-off maintenance scripts
    ├── src/
    │   ├── app/             Routes: (auth) pages, (dashboard) pages, api/ route handlers
    │   ├── components/      UI components (ui/, wizard/, kyc/, providers/)
    │   ├── lib/             Domain logic, workflows and service clients
    │   ├── types/           NextAuth type augmentation
    │   └── proxy.ts         Auth and role guard (Next.js 16 "proxy", formerly middleware)
    ├── tests/unit/          Vitest unit tests for the workflow helpers
    ├── vercel.json          Daily cron for tenancy expiry and reminders
    └── .env.example         Every environment variable, documented
```

## Getting started

Prerequisites: Node.js 20.9 or later, a PostgreSQL database, and accounts for Gemini, Cloudinary, Upstash and Resend. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for where each key comes from.

```bash
cd rentalease-malaysia
```

```bash
npm install
```

```bash
cp .env.example .env
```

Fill in `.env`, then create the database schema:

```bash
npx prisma migrate deploy
```

```bash
npm run dev
```

Open http://localhost:3000. The admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` is created on the first page load.

## Scripts

Run these from `rentalease-malaysia/`.

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate`, then `prisma migrate deploy`, then `next build` |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (Next.js rules and type-aware checks) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): data model, state machines, auth and roles, external services
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Vercel setup, environment variables, database migrations, cron
- [`docs/AUDIT.md`](docs/AUDIT.md): known issues and limitations awaiting a decision
- [`docs/ROADMAP.md`](docs/ROADMAP.md): suggested improvements

## Disclaimer

Generated agreements are drafts produced by an AI model. They are not legal advice, and should be reviewed by both parties (and, where appropriate, a lawyer) before signing. On-chain anchoring uses a public **testnet** and is a proof-of-existence demonstration, not a legal record.
