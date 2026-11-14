# Architecture

All paths are relative to `rentalease-malaysia/`.

## Overview

RentalEase is a single Next.js 16 App Router application:

- **Server pages** (`src/app/(dashboard)/…`) read straight from Prisma and render per role.
- **Client components** (`src/components/…`) call **route handlers** (`src/app/api/…`) for every change to data.
- **Domain rules** that need to be unit-tested live as pure functions in `src/lib/*Workflow.ts`, `src/lib/tenancyLifecycle.ts` and similar modules.

```
Browser ──► src/proxy.ts (session + role routing)
        ──► (dashboard) server pages ──► Prisma ──► PostgreSQL
        ──► api/* route handlers ──► Prisma
                                 ├─► Gemini       (src/lib/gemini.ts)
                                 ├─► Cloudinary   (src/lib/cloudinary.ts)
                                 ├─► Resend       (src/lib/email.ts)
                                 ├─► Upstash      (src/lib/ratelimit.ts)
                                 └─► Sepolia RPC  (src/lib/blockchain.ts)
Vercel Cron ──► api/cron/expire-tenancies (daily)
```

## Roles and access

- **Roles:** `LANDLORD`, `TENANT` and `ADMIN` (enum `Role`). Registration offers landlord or tenant only. The admin account is bootstrapped from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`src/lib/admin/bootstrap.ts`).
- **Sessions:** NextAuth credentials provider with JWT sessions (`src/lib/auth.ts`).
  - The JWT callback re-reads `isSuspended`, `deletedAt` and `passwordChangedAt` on every request. Suspension, deletion and password changes therefore take effect on existing sessions.
  - Login is rate limited per (email, IP).
  - Wrong-email and wrong-password failures return the same message. Removed and suspended accounts get distinct messages, but only after the password has been verified.
- **`src/proxy.ts`:**
  - redirects unauthenticated users to `/login`;
  - sends each role to its own dashboard (`/dashboard/landlord`, `/dashboard/tenant`, `/dashboard/admin`);
  - returns 403 for suspended users on API calls.
- **Route handlers** do their own authentication and ownership checks with `getServerSession(authOptions)`:
  - landlord ownership is `tenancy.room.property.landlordId`;
  - tenant ownership is `tenancy.tenantId`.
- **Identity verification:** a tenant must be verified (`User.isVerified`, set when the admin approves KYC) to accept an invitation.

## Data model (Prisma)

| Group | Models |
|---|---|
| Users | `User`, `KycSubmission`, `PasswordResetToken`, `Notification`, `AuditLog` |
| Listings | `Property` → `Room` (rentable unit), `PropertyPhoto` |
| Tenancy | `Tenancy` (one per room per lease), `CoTenant`, `CorporateOccupant`, `AgreementPreferences` (wizard answers) |
| Agreement | `Agreement`, `AgreementRevision`, `AgreementEvent`, `AgreementChangeRequest`, `AgreementSignatureProof` |
| Money | `RentPayment` → `PaymentProof`, `DepositProof`, `DepositRefund` → `DepositDeduction` |
| Evidence | `ConditionReport` → `ConditionPhoto`, `EvidenceChecklistItem` |
| Messaging | `Message` (one thread per tenancy) |

- Money columns use `Decimal(10,2)`. Prisma `Decimal` values serialise to JSON as **strings**, so client code must convert them with `Number()` before doing arithmetic.
- `Room.isAvailable` is a denormalised flag. Keep it in sync with `syncRoomAvailability` (`src/lib/roomAvailability.ts`): a room is available when no tenancy on it is `INVITED`, `PENDING` or `ACTIVE`.

## State machines

### Tenancy (`TenancyStatus`)

```
INVITED ──accept──► PENDING ──signed agreement + deposit PAID──► ACTIVE ──endDate passed (cron)──► EXPIRED
   │ decline (deleted)    │ withdraw (deleted)                     │
   ▼                      ▼                                        └──terminate──► TERMINATED
```

- **Creation.** Creating an invitation claims the room atomically.
- **Accepting.** Requires the tenant to be identity-verified.
- **Becoming ACTIVE.** Happens when both conditions hold: the agreement is `SIGNED` and the deposit is `PAID`. Either event can come second; see `getTenancyStatusAfter*` in `src/lib/tenancyLifecycle.ts`. The rent schedule (`buildRentScheduleEntries`, `src/lib/payments.ts`) is created at this point.
- **Termination.** Waives `PENDING` rent payments due after the termination date.
- **Renewal.** Creates a new `INVITED` tenancy linked by `renewalOfTenancyId`, copying any corporate lease fields. Only one renewal can be open at a time.
- **Room availability.** Expiry, termination, decline and withdrawal all recompute room availability.

### Agreement (`AgreementStatus`)

```
(wizard complete) ─generate─► DRAFT ─finalize─► FINALIZED ─tenant signs─► PENDING_SIGNATURE_PROOF ─landlord approves hard copy─► SIGNED
                                ▲                   │
                                └──── regenerate/edit ◄── NEGOTIATING ◄── tenant requests changes
```

- **Finalize.** Extracts the confirmed terms (rent, deposit, dates) and writes them back onto the tenancy in the same transaction.
- **Tenant signing.** Stores a SHA-256 `contentHash`, the timestamp and the IP. It then tries to anchor the hash on Sepolia in the background (`txHash`).
- **After signing.** Once `PENDING_SIGNATURE_PROOF` or `SIGNED`, nothing can change the text or the terms behind it: regeneration, editing, AI assist, analysis, wizard answers and tenancy terms are all blocked.
- **Negotiation.** `negotiationRound` starts at 1 and increases by one per tenant change request.

### Deposit (`Tenancy.depositStatus`)

`PENDING → UNDER_REVIEW` (tenant uploads proof) → `PAID` or `REJECTED`. After a rejection the tenant re-uploads, which moves it back to `UNDER_REVIEW`. Uploads are only accepted while the tenancy is `PENDING` or `ACTIVE`.

### Rent payment (`PaymentStatus`)

`PENDING → UNDER_REVIEW → PAID`; a rejection moves it back to `PENDING`. Termination sets later instalments to `WAIVED`. `LATE` is a legacy value that is no longer written; lateness is computed from `dueDate`.

### Condition report (`ReportStatus`)

```
DRAFT ─submit─► PENDING_REVIEW ─other party─► ACCEPTED
                     ▲              ├────────► CORRECTION_REQUESTED ─creator resubmits─┐
                     └──────────────┼──────────────────────────────────────────────────┘
                                    └────────► COUNTER_EVIDENCE_ADDED ─creator─► ACCEPTED | DISPUTED
```

Pure rules live in `src/lib/conditionReportWorkflow.ts`. `SUBMITTED` and `LOCKED` exist in the enum but are not written.

### Deposit refund (`RefundStatus`)

- **Start.** The landlord starts the settlement once the tenancy is `EXPIRED` or `TERMINATED` and the deposit is `PAID`:
  - with deductions → `PROPOSED`;
  - with none → `AGREED` (full refund).
- **Tenant review.** The first response moves the refund to `IN_REVIEW`. Once every deduction is answered, it becomes `AGREED` (all accepted) or `DISPUTED`.
- **Landlord.** Can withdraw a deduction, which may turn a `DISPUTED` refund into `AGREED`.
- **Payment.** `AGREED → PAID` when the landlord uploads proof of transfer.

## AI usage (`src/lib/gemini.ts`)

| Function | Used by | Purpose |
|---|---|---|
| `generateTenancyAgreement` | `api/agreements/generate` | Full agreement plus summary and red flags, built from the tenancy, parties and wizard policy block (`buildWizardPolicyBlock`) |
| `translateAgreementOutputs` | generate, analysis | Bahasa Malaysia summary and red flags |
| `analyzeAgreementContent` | `api/agreements/[id]/analysis` | Re-analyse edited text |
| `extractAgreementTerms` | `api/agreements/[id]/extract-terms` | Pull rent, deposit and dates out of the final text for confirmation |
| `getGeminiModel` | `api/agreements/[id]/assist` | Apply one free-text instruction to the agreement |

Every Gemini endpoint is rate limited per user and agreement (`src/lib/ratelimit.ts`). If Redis is unavailable, the limits fail open.

## Background work

The only scheduled job is `GET /api/cron/expire-tenancies`, which runs daily at 17:00 UTC (01:00 Malaysia time) via `vercel.json` and is protected by `CRON_SECRET`. It:

- expires overdue `ACTIVE` tenancies and frees their rooms;
- sends 30-day and 7-day ending-soon notifications and emails.

Dashboards also create ending-soon notifications when they load (`src/lib/endingSoonNotifications.ts`). Both paths use the same notification link, so they de-duplicate each other.
