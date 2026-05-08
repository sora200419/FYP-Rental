# RentalEase Malaysia — Code Review & Modification Report

> Reviewed against: full source tree, all API routes, Prisma schema, middleware, and core libs.
> Last updated: 2026-05-08
> Severity: 🔴 Critical · 🟠 Major · 🟡 Minor · 🟢 Enhancement
> Status: ✅ Fixed · ⚠️ Open · 🔄 Partial

---

## Part 1 — Logic Bugs & Errors

---

### BUG-01 🔴 ✅ Password Reset Token Leaked Directly in API Response

**File:** `src/app/api/forgot-password/route.ts`

~~The reset token was returned in the HTTP response body.~~

**Fixed:** Token is no longer in the response. `sendPasswordResetEmail()` sends it exclusively via email. Response is `{ success: true }` only. Previous tokens for the user are also invalidated before issuing a new one.

---

### BUG-02 🔴 ✅ Deposit Deduction "All Resolved" Check Reads Stale Pre-Update Data

**File:** `src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts:88–99`

~~`deduction.refund.deductions` was fetched before the update, so the last PROPOSED deduction still appeared as PROPOSED in-memory. `allResolved` was always `false` for the final deduction.~~

**Fixed:** A fresh DB query (`prisma.depositDeduction.findMany`) is now issued after the update. The `allResolved` check uses this fresh data. The deposit refund status correctly auto-transitions to `AGREED` or `DISPUTED` when all deductions are resolved.

---

### BUG-03 🔴 ✅ Deposit Deduction Withdrawal Filters by Amount Instead of ID

**File:** `src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts:147–150`

~~Filter used `d.amount !== deduction.amount`, silently removing all deductions with the same amount.~~

**Fixed:** Filter now uses `d.id !== deductionId`. The `deductions` select also fetches `id` explicitly to enable this check.

---

### BUG-04 🟠 ✅ Declining an Invitation Sets Status to `TERMINATED`

**File:** `src/app/api/tenancies/[id]/respond/route.ts:81–89`

~~`data: { status: 'TERMINATED' }` made declined invitations indistinguishable from genuinely terminated active tenancies.~~

**Fixed:** Declining an invitation now deletes the tenancy record entirely (it was never accepted and no financial records are attached) and frees the room in a `$transaction`. Returns `{ ok: true, status: 'DECLINED' }`.

---

### BUG-05 🟠 ✅ No Automatic ACTIVE → EXPIRED Transition

**Files:** All API routes, Prisma schema

~~No cron job or scheduled function transitioned tenancies from `ACTIVE` to `EXPIRED` when `endDate` passed.~~

**Fixed:** Cron route implemented at `src/app/api/cron/expire-tenancies/route.ts`. Runs `prisma.tenancy.updateMany({ where: { status: 'ACTIVE', endDate: { lt: now } }, data: { status: 'EXPIRED' } })` daily. Protected by `CRON_SECRET` env variable. Also sends `TENANCY_ENDING_SOON` notifications at 30 and 7 days (see FEAT-10).

---

### BUG-06 🟠 ✅ Tenancy Edit Blocked Indefinitely Once Any Agreement Exists

**File:** `src/app/api/tenancies/[id]/route.ts:98–113`

~~Any existing agreement record blocked edits, but there was no way to delete a draft agreement.~~

**Fixed:** Edits are only blocked when the agreement status is `FINALIZED` or `SIGNED`. `DRAFT` and `NEGOTIATING` agreements allow term corrections.

---

### BUG-07 🟠 ✅ Room DELETE Blocks on Historical Terminated Tenancies Forever

**File:** `src/app/api/rooms/[id]/route.ts:68–74`

~~`room.tenancies.length > 0` included all historical tenancies (EXPIRED, TERMINATED).~~

**Fixed:** Query now filters with `where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } }`. Rooms with only historical tenancies can be deleted. Error message updated to "Cannot delete a room with an active or pending tenancy."

---

### BUG-08 🟠 ✅ Tenancy Invite — No `endDate > startDate` Validation

**File:** `src/app/api/tenancies/route.ts:105–109`

~~Only `startDate < today` was validated. Swapped dates caused invalid payment schedules.~~

**Fixed:** Check `if (endDate <= startDate)` now returns HTTP 400 before any DB writes.

---

### BUG-09 🟠 ✅ Tenancy Renewal Does Not Mark the Room Unavailable

**File:** `src/app/api/tenancies/[id]/renew/route.ts:51–68`

~~Renewal created the tenancy but didn't set `room.isAvailable = false`, leaving a window for double-booking.~~

**Fixed:** `prisma.tenancy.create` and `prisma.room.update({ data: { isAvailable: false } })` are now wrapped in a `prisma.$transaction([...])`.

---

### BUG-10 🟡 ✅ Condition Report Acknowledgement Notification Links to a 404 Route

**File:** `src/app/api/condition-reports/[id]/acknowledge/route.ts:85–88`

~~Link was `/dashboard/${creatorDashboardRole}/condition-reports/${report.id}` — a non-existent route.~~

**Fixed:** Notification link now correctly uses:
- Landlord creator → `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`
- Tenant creator → `/dashboard/tenant/conditions`

---

### BUG-11 🟡 ✅ Condition Reports Have No Tenancy Status Guard

**File:** `src/app/api/condition-reports/route.ts:107–118`

~~Reports could be created for INVITED tenancies (not yet accepted).~~

**Fixed:** `allowedStatuses` enforced before creation:
- `MOVE_OUT` reports: `ACTIVE`, `EXPIRED`, `TERMINATED` only
- Other types: `PENDING`, `ACTIVE`, `EXPIRED`, `TERMINATED`

Returns HTTP 409 for INVITED tenancies.

---

### BUG-12 🟡 ✅ IC Photo Not Enforced at the API Level

**File:** `src/app/api/register/route.ts:72–74`

~~IC photo was optional at the API level — a direct API call could bypass the form validation.~~

**Fixed:** Returns HTTP 400 immediately if `file` is absent or `file.size === 0`. File size and MIME type are also validated before the DB write.

---

### BUG-13 🟡 ✅ `PaymentProof.isReadByTenant` Field Is Never Written

**Schema:** `prisma/schema.prisma`

~~The `isReadByTenant` field existed on `PaymentProof` but was never written anywhere, making it dead schema weight.~~

**Fixed:** Field removed from schema in migration `20260507155418_fix_cascades_remove_read_by_tenant`. All references in `src/app/(dashboard)/dashboard/tenant/payments/page.tsx` cleaned up — the unread-badge UI that depended on this field has been removed.

---

### BUG-14 🟡 ✅ No PATCH Endpoint for Room Updates

**File:** `src/app/api/rooms/[id]/route.ts`

~~No `PATCH /api/rooms/[id]` handler existed. Landlords couldn't update rent, furnishing, or notes after creation.~~

**Fixed:** Full `PATCH` handler added. Validates with `roomSchema` (Zod), verifies landlord ownership via property chain, and updates the room.

---

### BUG-15 🟡 ✅ No Limit on Agreement Negotiation Rounds

**File:** `src/app/api/agreements/generate/route.ts`

~~No upper bound on `negotiationRound` — landlord could regenerate indefinitely.~~

**Fixed:** Guard added before generation: if `existingAgreement.negotiationRound >= 5`, returns HTTP 409. Constant `MAX_NEGOTIATION_ROUNDS = 5` defined inline.

---

## Part 2 — Improvements

---

### IMP-01 — ✅ Email Delivery Is Implemented

`src/lib/email.ts`

~~No email transport existed — the forgot-password flow generated tokens but never sent them.~~

**Fixed:** Resend integration implemented. Emails sent for: welcome, password reset, invitation received, KYC approved/rejected, payment approved/rejected, agreement signed.

---

### IMP-02 — ✅ Rate Limiting on Expensive Endpoints

`src/app/api/agreements/generate/route.ts`, `src/app/api/agreements/[id]/assist/route.ts`

~~No rate limiting existed on Gemini API calls.~~

**Fixed:** Upstash rate limiting applied to agreement generation (5 calls per hour per user).

---

### IMP-03 — ✅ Rent Payment Schedule Now Respects `rentDueDay`

`src/app/api/agreements/[id]/respond/route.ts:88–121`

~~Payment schedule used `startDate` as the first due date and incremented monthly from there, ignoring the wizard's `rentDueDay`.~~

**Fixed:** `dueDateForMonth()` helper computes the correct day of each month, clamped to the last day for short months (e.g. day 31 in February → Feb 28/29). First due date is the first occurrence of `rentDueDay` on or after `startDate`. Fetches `agreementPreferences.rentDueDay`; falls back to `startDate.getDate()` if absent.

---

### IMP-04 — ✅ Duplicate Condition Report Prevention

`src/app/api/condition-reports/route.ts:120–132`

**Fixed:** Before creating a non-`INSPECTION` report, the route checks for an existing report of the same type for the same tenancy and returns HTTP 409 if one already exists.

---

### IMP-05 — ⚠️ No Financial Summary on Dashboards

The landlord dashboard currently shows only counts (pending payments, active tenancies). There are no financial summary figures: total monthly rental income, total outstanding payments, or occupancy rate.

**Suggestion:** Add a summary card row to `/dashboard/landlord`:
- Total confirmed monthly income (sum of ACTIVE tenancy rents)
- Pending payment proofs awaiting review
- Total outstanding (PENDING payments with `dueDate < now`)
- Occupancy rate per property

---

### IMP-06 — ✅ Message `read` Field Now Updated

`src/app/api/messages/route.ts:44–47`

~~`Message.read` was never set to `true`, causing permanently stuck unread badges.~~

**Fixed:** `GET /api/messages?tenancyId=xxx` now runs `prisma.message.updateMany({ where: { tenancyId, receiverId: session.user.id, read: false }, data: { read: true } })` concurrently with the message fetch using `Promise.all`.

---

### IMP-07 — ✅ Deposit Refund Amount Recalculated on Deduction Accept

`src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts:101–108`

~~`refundAmount` was only recalculated when the landlord withdrew a deduction, not when the tenant accepted one.~~

**Fixed:** When all deductions are resolved, `refundAmount` is recalculated as `originalAmount - sum(all non-withdrawn deductions)` before the `DepositRefund` status update.

---

### IMP-08 — ✅ Cascade Deletes Added to Core Relations

`prisma/schema.prisma`

~~`ConditionReport` and `ConditionPhoto` were missing `onDelete: Cascade`.~~

**Fixed:** Added `onDelete: Cascade` to:
- `ConditionReport.tenancy` → deleting a Tenancy now also deletes its condition reports
- `ConditionPhoto.report` → deleting a ConditionReport also deletes its photos

Migration: `20260507155418_fix_cascades_remove_read_by_tenant`. `RentPayment`, `Message`, `Agreement`, `AgreementPreferences`, `CoTenant`, and `DepositRefund` already had cascade or were already covered.

---

### IMP-09 — ⚠️ Admin Cannot See Previous KYC Rejection Reason When Re-Reviewing

`src/app/(dashboard)/dashboard/admin/verify/page.tsx`

When an admin rejects a user and the user re-uploads their IC, the admin queue shows no context about why it was previously rejected. The admin cannot tell if the user fixed the specific issue.

**Suggestion:** Display `kycRejectedReason` as a visible banner on the admin verification card even after a new document is submitted.

---

### IMP-10 — ✅ Single-Record Tenancy Fetch Endpoint Added

`src/app/api/tenancies/[id]/route.ts`

~~No `GET /api/tenancies/[id]` existed — the frontend had to fetch the full list and filter client-side.~~

**Fixed:** `GET` handler added. Authorization checks both landlord (via property chain) and tenant ownership. Returns the same shape as the list endpoint.

---

### IMP-11 — 🔄 Agreement Generation Validation Improved

`src/lib/gemini.ts`

**Partially fixed:** Replaced the ad-hoc field presence check with a full Zod schema validation:
```ts
z.object({
  rawContent: z.string().min(200),
  plainLanguageSummary: z.string().min(50),
  redFlags: z.array(z.object({
    severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    clause: z.string(), issue: z.string(), recommendation: z.string(),
  })),
})
```
If Gemini returns a malformed response, generation throws a clear error rather than storing garbage.

**Remaining:** PDF renderer at `src/app/api/agreements/[id]/pdf/route.ts` does not yet validate the `fileUrl` fallback path.

---

### IMP-12 — ✅ "Deposit Settlement AGREED" Notification Added

`src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts:110–120`

~~No notification was sent when all deductions were resolved and the refund transitioned to `AGREED`.~~

**Fixed:** When `finalStatus === 'AGREED'`, a `DEPOSIT_REFUND_PAID` notification is created for the landlord prompting them to upload the refund proof.

---

### IMP-13 — ⚠️ `LATE` Enum Value Still Exists in Schema

`prisma/schema.prisma` — `PaymentStatus.LATE`

```prisma
LATE // Legacy value — no longer written; existing rows kept for safety
```

New developers may try to use `LATE`, which breaks the dynamic "late" computation logic. The comment lacks a migration timeline.

**Suggestion:** Run `UPDATE "RentPayment" SET status = 'PENDING' WHERE status = 'LATE'` and remove the enum value in the next Prisma migration.

---

### IMP-14 — ✅ Login Rate Limiting Added

`src/lib/auth.ts`, `src/lib/ratelimit.ts`

**Fixed:** `loginRateLimit` added to `ratelimit.ts` (5 attempts per email per 15 minutes via Upstash sliding window). Called at the start of the `authorize()` callback in `auth.ts`. If Redis is unavailable, the error is caught and logged but auth proceeds (non-blocking degradation).

---

### IMP-15 — ✅ IC Numbers Masked Before Sending to Gemini

`src/lib/gemini.ts`

**Fixed:** Added `maskIc()` helper that exposes only the last 4 digits (`****-**-5678`). Applied to both the primary tenant's IC and all co-tenant ICs in the prompt. The full IC number remains in the database and on the signed agreement — Gemini only receives the masked version, reducing PDPA 2010 exposure.

---

## Part 3 — New Features to Add

---

### FEAT-01 — ✅ Automated Tenancy Expiry

**Implemented:** `src/app/api/cron/expire-tenancies/route.ts`

Daily cron route transitions ACTIVE tenancies past their `endDate` to `EXPIRED`. Protected by `CRON_SECRET`. Example `vercel.json` cron entry is documented in the file header.

---

### FEAT-02 — ✅ Email Notification System Complete

`src/lib/email.ts`

All transactional emails are now implemented:

| Event | Status |
|-------|--------|
| Welcome (registration) | ✅ `sendWelcomeEmail` |
| Password reset | ✅ `sendPasswordResetEmail` |
| Invitation received | ✅ `sendInvitationEmail` |
| KYC approved | ✅ `sendKycApprovedEmail` (called from admin verify route) |
| KYC rejected | ✅ `sendKycRejectedEmail` (called from admin reject route) |
| Agreement ready to sign | ✅ `sendAgreementReadyEmail` |
| Agreement signed | ✅ `sendAgreementSignedEmail` |
| Payment approved | ✅ `sendPaymentApprovedEmail` |
| Payment rejected | ✅ `sendPaymentRejectedEmail` |
| Deposit settlement initiated | ✅ `sendDepositSettlementEmail` (called from deposit-refund POST) |
| Deposit refund paid | ✅ `sendDepositRefundPaidEmail` (called from mark-paid route) |
| Tenancy ending soon | ✅ `sendTenancyEndingSoonEmail` (called from cron job at 30d and 7d) |

---

### FEAT-03 — ⚠️ Maintenance Request Module

No structured maintenance request system exists. Tenants can only message landlords informally.

**Proposed model:**
```prisma
model MaintenanceRequest {
  id          String   @id @default(cuid())
  tenancyId   String
  tenancy     Tenancy  @relation(...)
  submittedById String
  title       String
  description String   @db.Text
  urgency     String   // LOW | MEDIUM | HIGH | EMERGENCY
  status      String   @default("OPEN") // OPEN | IN_PROGRESS | RESOLVED
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

This maps directly to the `minorRepairResponsible` and `urgentResponseTime` fields already captured in `AgreementPreferences`.

---

### FEAT-04 — ⚠️ Landlord Financial Dashboard

Add a financial summary section to the landlord dashboard:

- Monthly income chart (paid payments per month)
- Occupancy rate (active rooms / total rooms per property)
- Outstanding payments (PENDING + past due date)
- Export payment history to CSV (for tax/accounting)

---

### FEAT-05 — ✅ Tenant Can Withdraw from PENDING Tenancy

**Implemented:** `src/app/api/tenancies/[id]/withdraw/route.ts`

`DELETE /api/tenancies/[id]/withdraw` — tenant only, PENDING status only. Deletes the tenancy (cascades clean Agreement, Messages, ConditionReports), frees the room in a `$transaction`, and notifies the landlord. INVITED → decline is still handled by `/respond`.

---

### FEAT-06 — ⚠️ Agreement Version History

When a new agreement is generated, the previous draft is overwritten with no trace. After multiple negotiation rounds, neither party can see what changed between versions.

**Proposed model:**
```prisma
model AgreementVersion {
  id          String    @id @default(cuid())
  agreementId String
  round       Int
  rawContent  String    @db.Text
  createdAt   DateTime  @default(now())
  agreement   Agreement @relation(fields: [agreementId], references: [id])
}
```

Store a snapshot on every generate/regenerate. The UI can show a "View History" panel comparing round N-1 vs round N.

---

### FEAT-07 — ⚠️ Public Room Listing (Marketplace)

Landlords currently find tenants outside the platform and invite them by email. A lightweight public listing would close the tenant-acquisition loop:

- Verified landlords can mark rooms as publicly listed
- Public page at `/rooms` shows verified available rooms with rent, location, and furnishing
- Prospective tenants submit an enquiry (creates a message thread and starts the invitation flow)
- No financial data exposed publicly

---

### FEAT-08 — ⚠️ Admin User Management Panel

The admin dashboard handles KYC and property verification only. A full user management view would add:

- List all users with role, verification status, and account age
- Suspend / unsuspend an account (`isSuspended Boolean` on User)
- Correct a user's role (LANDLORD ↔ TENANT)
- View a user's tenancies and documents without impersonation

---

### FEAT-09 — ⚠️ Two-Factor Authentication for Agreement Signing

Agreement signing has legal implications but currently requires only an active NextAuth session. A TOTP or SMS OTP step before signing would:

- Prove the account holder performed the action (not a session hijacker)
- Strengthen non-repudiation alongside the existing IP + SHA-256 + blockchain anchoring

Stack: `otplib` for TOTP generation, `qrcode` for setup QR, new `UserTotp` model in schema.

---

### FEAT-10 — ✅ Tenancy ENDING SOON Notifications

**Implemented:** `src/app/api/cron/expire-tenancies/route.ts:31–91`

`TENANCY_ENDING_SOON` notifications are now sent to both landlord and tenant at 30 days and 7 days before `endDate`. Landlord notification links to the renewal page; tenant notification links to their tenancy page.

---

### FEAT-11 — ✅ IC Number Update Flow After KYC Rejection

**Implemented:** `src/app/api/profile/route.ts`

The profile `PATCH` endpoint now accepts `icNumber`. If the submitted value differs from the stored value:
- Strips hyphens and validates 12-digit format
- Checks uniqueness (returns HTTP 409 on conflict)
- Resets `isVerified = false` so admin must re-review
- Echoing back the same IC number (e.g. during a name-only save) does **not** reset verification

---

## Summary Table

| ID | Severity | Status | Category | File / Area |
|----|----------|--------|----------|-------------|
| BUG-01 | 🔴 Critical | ✅ Fixed | Security | `api/forgot-password/route.ts` |
| BUG-02 | 🔴 Critical | ✅ Fixed | Logic | `api/deposit-refund/.../deductions/[id]/route.ts` |
| BUG-03 | 🔴 Critical | ✅ Fixed | Logic | `api/deposit-refund/.../deductions/[id]/route.ts` |
| BUG-04 | 🟠 Major | ✅ Fixed | Data integrity | `api/tenancies/[id]/respond/route.ts` |
| BUG-05 | 🟠 Major | ✅ Fixed | Business logic | `api/cron/expire-tenancies/route.ts` |
| BUG-06 | 🟠 Major | ✅ Fixed | UX / workflow | `api/tenancies/[id]/route.ts` |
| BUG-07 | 🟠 Major | ✅ Fixed | Data integrity | `api/rooms/[id]/route.ts` |
| BUG-08 | 🟠 Major | ✅ Fixed | Validation | `api/tenancies/route.ts` |
| BUG-09 | 🟠 Major | ✅ Fixed | Concurrency | `api/tenancies/[id]/renew/route.ts` |
| BUG-10 | 🟡 Minor | ✅ Fixed | UX | `api/condition-reports/[id]/acknowledge/route.ts` |
| BUG-11 | 🟡 Minor | ✅ Fixed | Validation | `api/condition-reports/route.ts` |
| BUG-12 | 🟡 Minor | ✅ Fixed | Security | `api/register/route.ts` |
| BUG-13 | 🟡 Minor | ✅ Fixed | Dead code | `PaymentProof.isReadByTenant` removed |
| BUG-14 | 🟡 Minor | ✅ Fixed | Missing CRUD | `api/rooms/[id]/route.ts` |
| BUG-15 | 🟡 Minor | ✅ Fixed | UX / abuse | `api/agreements/generate/route.ts` |
| IMP-01 | 🟠 | ✅ Fixed | Email | `lib/email.ts` |
| IMP-02 | 🟠 | ✅ Fixed | Security | `api/agreements/generate/route.ts` |
| IMP-03 | 🟡 | ✅ Fixed | Logic | `api/agreements/[id]/respond/route.ts` |
| IMP-04 | 🟡 | ✅ Fixed | Validation | `api/condition-reports/route.ts` |
| IMP-05 | 🟢 | ⚠️ Open | UX | Landlord dashboard |
| IMP-06 | 🟠 | ✅ Fixed | UX | `api/messages/route.ts` |
| IMP-07 | 🟡 | ✅ Fixed | Logic | `api/deposit-refund/.../deductions/[id]/route.ts` |
| IMP-08 | 🟡 | ✅ Fixed | DB | Schema cascade deletes (ConditionReport, ConditionPhoto) |
| IMP-09 | 🟡 | ⚠️ Open | UX | Admin KYC review page |
| IMP-10 | 🟡 | ✅ Fixed | API | `api/tenancies/[id]/route.ts` |
| IMP-11 | 🟡 | 🔄 Partial | Reliability | Gemini validation improved; PDF fallback pending |
| IMP-12 | 🟡 | ✅ Fixed | UX | `api/deposit-refund/.../deductions/[id]/route.ts` |
| IMP-13 | 🟡 | ⚠️ Open | Cleanup | `LATE` enum in schema |
| IMP-14 | 🟠 | ✅ Fixed | Security | Login rate limiting (5/15min per email) |
| IMP-15 | 🟡 | ✅ Fixed | Privacy / PDPA | IC masked to last 4 digits before Gemini |
| FEAT-01 | 🔴 | ✅ Fixed | Core flow | `api/cron/expire-tenancies/route.ts` |
| FEAT-02 | 🟠 | ✅ Fixed | Core flow | `lib/email.ts` — all 12 transactional emails |
| FEAT-03 | 🟢 | ⚠️ Open | New module | Maintenance requests |
| FEAT-04 | 🟢 | ⚠️ Open | New module | Financial dashboard |
| FEAT-05 | 🟢 | ✅ Fixed | Workflow | `api/tenancies/[id]/withdraw/route.ts` |
| FEAT-06 | 🟢 | ⚠️ Open | Transparency | Agreement version history |
| FEAT-07 | 🟢 | ⚠️ Open | Growth | Public room listing |
| FEAT-08 | 🟢 | ⚠️ Open | Admin | User management panel |
| FEAT-09 | 🟢 | ⚠️ Open | Security | 2FA for agreement signing |
| FEAT-10 | 🟢 | ✅ Fixed | Workflow | `TENANCY_ENDING_SOON` notification |
| FEAT-11 | 🟢 | ✅ Fixed | Workflow | IC number correction after rejection |
