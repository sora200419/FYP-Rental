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
                                 ├─► Claude       (src/lib/ai.ts)
                                 ├─► Cloudinary   (src/lib/cloudinary.ts)
                                 ├─► Resend       (src/lib/email.ts)
                                 ├─► Upstash      (src/lib/ratelimit.ts)
                                 └─► Sepolia RPC  (src/lib/blockchain.ts)
Vercel Cron ──► api/cron/expire-tenancies (daily)
```

## Roles and access

- **Roles:** `LANDLORD`, `TENANT` and `ADMIN` (enum `Role`). Registration offers landlord or tenant only. The admin account is created at build time from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`scripts/bootstrap-admin.ts` → `src/lib/admin/bootstrap.ts`). An existing non-admin account that uses that email is never promoted.
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
   │ decline / cancel /   │ withdraw / cancel (deleted)            │
   │ 30-day expiry        │                                        │
   ▼                      ▼                                        └──terminate──► TERMINATED
```

- **Creation.** Creating an invitation claims the room atomically.
- **Accepting.** Requires the tenant to be identity-verified.
- **Becoming ACTIVE.** Happens when both conditions hold: the agreement is `SIGNED` and the deposit is `PAID`. Either event can come second; see `getTenancyStatusAfter*` in `src/lib/tenancyLifecycle.ts`. The rent schedule (`buildRentScheduleEntries`, `src/lib/payments.ts`) is created at this point.
- **Termination.** Waives `PENDING` rent payments due after the termination date.
- **Renewal.** Creates a new `INVITED` tenancy linked by `renewalOfTenancyId`, copying any corporate lease fields. Only one renewal can be open at a time.
- **Cancelling before it starts.** The tenant can decline (INVITED) or withdraw (PENDING); the landlord can cancel either; unanswered invitations are removed after 30 days. Not allowed once the deposit is submitted or the tenant has signed (`getUnstartedTenancyCancellationBlocker`). All of these go through `deleteUnstartedTenancy` (`src/lib/tenancyCancellation.ts`), which writes the audit row in the same transaction.
- **Room availability.** Expiry, termination, decline, withdrawal and cancellation all recompute room availability.
- **Tenant view.** A tenant can have several tenancies (e.g. a renewal next to the live one): `/dashboard/tenant/tenancy` lists them and `/dashboard/tenant/tenancy/[id]` shows one. Links in notifications and emails use `tenantTenancyHref(id)` (`src/lib/tenantLinks.ts`).

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

## AI usage (`src/lib/ai.ts`)

All AI calls go to Claude Haiku 5.5 (`claude-haiku-5-5`) through the Anthropic SDK. Requests stream (long agreements would otherwise risk HTTP timeouts) and use adaptive thinking with an explicit `effort`.

| Function | Used by | Output | Effort |
|---|---|---|---|
| `generateTenancyAgreement` | `api/agreements/generate` | Full agreement plus summary and red flags, built from the tenancy, parties and wizard policy block (`buildWizardPolicyBlock`) | medium |
| `translateAgreementOutputs` | generate, analysis | Bahasa Malaysia summary and red flags | medium |
| `analyzeAgreementContent` | `api/agreements/[id]/analysis` | Re-analysis of edited text | medium |
| `extractAgreementTerms` | `api/agreements/[id]/extract-terms` | Rent, deposit and dates pulled from the final text for confirmation | low |
| `generateText` | `api/agreements/[id]/assist` | The agreement with one free-text instruction applied | medium |

- **Structured outputs.** Every JSON result is constrained by a Zod schema (`zodOutputFormat` → `output_config.format`) and validated with the same schema after the response arrives.
- **Stop reasons.** The response's `stop_reason` is checked before anything is parsed. A refusal raises `AiRefusalError`; a response cut off at `max_tokens` raises an error rather than saving a truncated agreement.
- **Changing the model.** Edit `AI_MODEL` in `src/lib/ai.ts`. If Haiku's agreements are not good enough, `claude-sonnet-5-5` is the next step up.
- **Rate limits.** Every AI endpoint is rate limited per user and agreement (`src/lib/ratelimit.ts`). If Redis is unavailable, the limits fail open.
- **IC numbers never reach the model.** `runClaude` replaces every Malaysian IC number with a placeholder such as `[[IC_1]]` (`src/lib/icRedaction.ts`) and puts the real numbers back afterwards: in full in the agreement text, masked (`******-**-1234`) in summaries and red flags.

## Files and privacy

- **Public assets.** Property photos, payment/deposit/refund proofs and condition photos are ordinary Cloudinary uploads. Pages only link them after an ownership check, but the URLs themselves are not secret.
- **Private assets.** KYC images and signed agreement scans are uploaded as `authenticated` assets. The UI links to `/api/files/kyc/[submissionId]/[part]` and `/api/files/signature-proofs/[proofId]`. These routes check the requester (owner, landlord of the tenancy, or admin) and redirect to a signed link that expires after 5 minutes (`getAssetAccessUrl` in `src/lib/cloudinary.ts`).
- **Upload validation.** Every upload is checked by its first bytes, not its declared MIME type (`validateUpload` in `src/lib/uploadValidation.ts`), and stored under a random public ID.

## Language

- **Where the text comes from.** UI text comes from `src/lib/i18n.ts`, which has an English and a Bahasa Malaysia dictionary. The Malay one is typed against the English one, so a missing translation fails the build.
- **How the language is chosen.** Users pick a language on their profile page. It is stored in `User.language`, re-read into the session on every request, and provided to client components by `LanguageProvider` from the dashboard layout.
- **Server components.** These call `t(key, toLanguage(session.user.language))`.
- **Other helpers:** `tc()` handles singular/plural, `statusLabel()` translates enum statuses, and `localeFor()` chooses the date/number locale.

## Background work

The only scheduled job is `GET /api/cron/expire-tenancies`, which runs daily at 17:00 UTC (01:00 Malaysia time) via `vercel.json` and is protected by `CRON_SECRET`. It:

- expires overdue `ACTIVE` tenancies and frees their rooms;
- removes invitations unanswered for 30 days;
- sends 30-day and 7-day ending-soon notifications and emails.

Dashboards also create ending-soon notifications when they load (`src/lib/endingSoonNotifications.ts`). Both paths use the same notification link, so they de-duplicate each other.
