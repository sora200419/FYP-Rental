# RentalEase Malaysia — Code Review & Modification Report

> Reviewed against: full source tree, all API routes, Prisma schema, middleware, and core libs.
> Severity: 🔴 Critical · 🟠 Major · 🟡 Minor · 🟢 Enhancement

---

## Part 1 — Logic Bugs & Errors

---

### BUG-01 🔴 Password Reset Token Leaked Directly in API Response

**File:** `src/app/api/forgot-password/route.ts:31`

```ts
return NextResponse.json({ success: true, token });
```

The reset token is returned in the HTTP response body. Anyone intercepting network traffic (or inspecting DevTools) gets the token without needing access to the email inbox. The entire purpose of an email-based reset flow is to prove inbox ownership — returning the token in the response breaks that guarantee entirely.

**Fix:** Remove `token` from the response. Send it exclusively via email (Nodemailer / SendGrid). The response should only return `{ success: true }`.

---

### BUG-02 🔴 Deposit Deduction "All Resolved" Check Reads Stale Pre-Update Data

**File:** `src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts:88–99`

```ts
const allResolved = deduction.refund.deductions
  .filter((d) => d.status !== 'WITHDRAWN')
  .every((d) => ['ACCEPTED', 'DISPUTED'].includes(d.status));
```

`deduction.refund.deductions` is fetched from the DB **before** `prisma.depositDeduction.update()` runs. When the tenant responds to the **last PROPOSED deduction**, that deduction still appears as `PROPOSED` in the in-memory array. So `allResolved` is always `false` for the final deduction, and `DepositRefund` never auto-transitions to `AGREED` or `DISPUTED`. Also note the `allDeductions` variable constructed on line 88 is **never used** anywhere — a dead code block.

**Impact:** The deposit settlement workflow stalls permanently at `IN_REVIEW` status. The landlord can never mark the refund as paid because the status never reaches `AGREED`.

**Fix:** Re-fetch all deduction statuses from the DB after the update, or manually patch the in-memory array to reflect the just-updated status before the `allResolved` check.

---

### BUG-03 🔴 Deposit Deduction Withdrawal Filters by Amount Instead of ID

**File:** `src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts:127–129`

```ts
const remaining = deduction.refund.deductions
  .filter((d) => d.status !== 'WITHDRAWN' && d.amount !== deduction.amount)
  .reduce((s, d) => s + Number(d.amount), 0);
```

The filter excludes every deduction whose `amount` matches the withdrawn one. If a landlord has two separate deductions for the same amount (e.g., RM 200 cleaning + RM 200 painting), withdrawing one silently removes **both** from the sum, causing `refundAmount` to be over-calculated by RM 200.

**Fix:** Add `id` to the deductions select and filter by `d.id !== deductionId`:
```ts
.filter((d) => d.status !== 'WITHDRAWN' && d.id !== deductionId)
```

---

### BUG-04 🟠 Declining an Invitation Sets Status to `TERMINATED`

**File:** `src/app/api/tenancies/[id]/respond/route.ts:83`

```ts
data: { status: 'TERMINATED' },
```

A declined invitation is semantically different from a terminated tenancy. Both are now indistinguishable in the database — the landlord's tenancy list will show old declined invitations alongside genuinely terminated active tenancies with no way to tell them apart. Any reporting, filtering, or deposit settlement guard that checks for `TERMINATED` will also trigger on declined invitations.

**Fix:** Add a `CANCELLED` or `DECLINED` enum value to `TenancyStatus`, or delete the tenancy record on decline (preferred — it was never accepted and no financial records are attached).

---

### BUG-05 🟠 No Automatic ACTIVE → EXPIRED Transition

**Files:** All API routes, Prisma schema

There is no cron job, scheduled function, or on-read computation to transition tenancies from `ACTIVE` to `EXPIRED` when `endDate` passes. Tenancies remain `ACTIVE` indefinitely past their end date.

**Direct consequence:** `POST /api/deposit-refund/[id]` requires `status IN ('EXPIRED', 'TERMINATED')`. A tenancy whose end date passed but status is still `ACTIVE` will be blocked from deposit settlement with a misleading error. The landlord must manually "terminate" an already-ended tenancy just to initiate the refund.

**Fix options:**
1. Add a `computed` helper that checks `endDate < now()` and returns `EXPIRED` — update all queries that check tenancy status to also handle this case.
2. Run a daily DB update via a Next.js route handler protected by a cron secret (e.g. Vercel Cron).
3. Check and auto-expire on every tenancy fetch via a middleware-level intercept.

---

### BUG-06 🟠 Tenancy Edit Blocked Indefinitely Once Any Agreement Exists (Catch-22)

**File:** `src/app/api/tenancies/[id]/route.ts:63–76`

```ts
if (existingAgreement) {
  return NextResponse.json({ error: 'An agreement has already been generated...' });
}
```

If a landlord generates an agreement draft and then notices a wrong start date or rent amount, they cannot correct the tenancy terms because the PATCH blocks as soon as any agreement record exists. However, there is no `DELETE /api/agreements/[id]` endpoint to clear the draft. The error message says "Regenerate the agreement after making changes" but changes cannot be made because the PATCH is blocked.

**Fix:** Allow tenancy term edits when the agreement status is `DRAFT` or `NEGOTIATING`. Only block edits when status is `FINALIZED` or `SIGNED`.

---

### BUG-07 🟠 Room DELETE Blocks on Historical Terminated Tenancies Forever

**File:** `src/app/api/rooms/[id]/route.ts:23`

```ts
if (room.tenancies.length > 0) {
  return NextResponse.json({ error: 'Cannot delete a room that has tenancy records.' });
}
```

This includes **all** tenancy records — INVITED, PENDING, ACTIVE, EXPIRED, and TERMINATED. A room that had a tenant two years ago and has been empty ever since can never be deleted. Combined with BUG-06 (no room PATCH), this means a landlord who entered wrong room details cannot fix or remove the room if any tenancy ever existed.

**Fix:** Only block deletion if the room has tenancies in `{ INVITED, PENDING, ACTIVE }` status:
```ts
where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } }
```

---

### BUG-08 🟠 Tenancy Invite — No `endDate > startDate` Validation

**File:** `src/app/api/tenancies/route.ts:96`

The only date validation is:
```ts
if (startDate < today) { return error('Start date cannot be in the past') }
```

There is no check that `endDate > startDate`. If a landlord accidentally swaps the dates, the rent payment schedule generation in `respond/route.ts` will produce either 0 payments or nonsensical entries, and the wizard logic will also produce wrong notice period calculations.

**Fix:** Add `if (endDate <= startDate) return 400('End date must be after start date')`.

---

### BUG-09 🟠 Tenancy Renewal Does Not Mark the Room Unavailable

**File:** `src/app/api/tenancies/[id]/renew/route.ts`

When a renewal tenancy is created, it creates the record in `INVITED` status but never sets `room.isAvailable = false`. Since termination of the original tenancy sets the room to available, the room appears available in the interim. During the renewal invitation window, a concurrent request from a different tenant could accept a new invitation for the same room, resulting in two overlapping live tenancies for the same room.

**Fix:** Wrap the renewal creation and `room.update({ isAvailable: false })` in a `$transaction`.

---

### BUG-10 🟡 Condition Report Acknowledgement Notification Links to a 404 Route

**File:** `src/app/api/condition-reports/[id]/acknowledge/route.ts:85`

```ts
`/dashboard/${creatorDashboardRole}/condition-reports/${report.id}`
```

No such page exists. The correct routes are `/dashboard/landlord/tenancies/[tenancyId]/conditions` and `/dashboard/tenant/conditions`. Clicking this notification takes the user to a 404 page.

**Fix:** Change the notification link to use the tenancy-scoped conditions page:
```ts
isLandlord
  ? `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`
  : `/dashboard/tenant/conditions`
```

---

### BUG-11 🟡 Condition Reports Have No Tenancy Status Guard

**File:** `src/app/api/condition-reports/route.ts:58`

A MOVE_IN or MOVE_OUT report can be created for a tenancy that is still `INVITED` (tenant hasn't accepted yet). Creating move-in documentation before a tenant has agreed to the tenancy is meaningless and creates confusing records.

**Fix:** Validate that the tenancy status is at minimum `PENDING` before allowing report creation. For `MOVE_OUT` reports, restrict to `ACTIVE`, `EXPIRED`, or `TERMINATED`.

---

### BUG-12 🟡 IC Photo Not Enforced at the API Level

**File:** `src/app/api/register/route.ts:73`

```ts
if (file && file.size > 0) { /* upload */ }
```

The IC photo is optional at the API level. Only the React form enforces it. A direct API call skips the photo entirely, creating an account with no IC document. The admin KYC queue then shows a user with an IC number but no photo to review.

**Fix:** Return HTTP 400 if `file` is absent or empty in the registration route.

---

### BUG-13 🟡 `PaymentProof.isReadByTenant` Field Is Never Written

**Schema:** `prisma/schema.prisma:296`

The `isReadByTenant Boolean @default(false)` field exists on `PaymentProof` but no route ever sets it to `true`. Landlord rejection reasons land on `RentPayment.rejectionReason`, which is visible to the tenant, but `isReadByTenant` has no effect anywhere in the application.

**Fix:** Either remove the field (cleanup) or implement it — set `isReadByTenant = true` when a tenant visits the payments page and reads a proof that the landlord has actioned.

---

### BUG-14 🟡 No PATCH Endpoint for Room Updates

**File:** `src/app/api/rooms/[id]/route.ts` — DELETE only

There is no `PATCH /api/rooms/[id]` handler. Landlords cannot update a room's rent amount, furnishing level, utilities, or notes after creation. Combined with BUG-07 (DELETE blocked by historical tenancies), once a room has hosted any tenancy there is no way to either edit or remove it.

**Fix:** Add a `PATCH` handler that validates with the same `roomSchema` and updates the room fields.

---

## Part 2 — Improvements

---

### IMP-01 — Email Delivery Is Not Implemented

`src/app/api/forgot-password/route.ts`, `src/app/api/register/route.ts`

Password reset is the only flow that truly requires email, but no email transport exists. The system generates the token and stores it in the DB but never sends a message. Without this, the feature is non-functional in a real deployment.

**Suggestion:** Integrate [Resend](https://resend.com) (free tier, easy Next.js setup) or Nodemailer with an SMTP provider. Add `EMAIL_FROM`, `RESEND_API_KEY` (or SMTP credentials) to `.env`. Send emails for: password reset, invitation received, agreement ready, payment approved/rejected.

---

### IMP-02 — No Rate Limiting on Expensive Endpoints

`src/app/api/agreements/generate/route.ts`, `src/app/api/agreements/[id]/assist/route.ts`

Calling the Gemini API has real cost and quota implications. Both the generate and AI-assist endpoints can be called without any rate limiting. A single landlord could call generate 100 times in a minute, burning API quota.

**Suggestion:** Add [Upstash Rate Limit](https://upstash.com/docs/redis/sdks/ratelimit/overview) or a simple Redis-backed counter. Limit agreement generation to, for example, 5 calls per tenancy per hour.

---

### IMP-03 — Rent Payment Schedule Ignores `rentDueDay` from Wizard

`src/app/api/agreements/[id]/respond/route.ts:86–99`

The wizard captures `rentDueDay` (e.g., the 5th of each month) as an agreement preference. However, the auto-generated rent payment schedule simply uses `startDate` as the first due date and increments monthly from there. If `startDate = 2025-07-01` but `rentDueDay = 5`, the payment records will have `dueDate = 2025-07-01`, `2025-08-01`, etc. — not the 5th. The agreement says "rent due on the 5th" but the app shows the 1st.

**Suggestion:** When building the payment schedule, set each `dueDate` to the `rentDueDay` of each month in the tenancy range, starting from the first occurrence of that day on or after `startDate`.

---

### IMP-04 — Tenancy `ACTIVE` Status Not Verified Before Creating Condition Reports

`src/app/api/condition-reports/route.ts`

Described in BUG-11. Beyond that fix, consider adding a **duplicate type prevention**: it makes no sense to have two MOVE_IN reports for the same tenancy. An easy guard:

```ts
const existing = await prisma.conditionReport.findFirst({
  where: { tenancyId, type }
});
if (existing && type !== 'INSPECTION') return 409('A report of this type already exists');
```

---

### IMP-05 — No Financial Summary on Dashboards

The landlord dashboard currently shows counts (pending payments, active tenancies). There are no financial summary figures: total monthly rental income, total outstanding (late/pending) payments, occupancy rate across properties.

**Suggestion:** Add a summary card row at the top of `/dashboard/landlord` showing:
- Total confirmed monthly income (sum of ACTIVE tenancy monthly rents)
- Pending payment proofs awaiting review
- Total outstanding (past due, status PENDING with dueDate < now)

---

### IMP-06 — Message `read` Field Is Never Updated

`prisma/schema.prisma` — `Message.read Boolean @default(false)`

Messages are created with `read: false`. There is no API endpoint or frontend hook that ever sets `read: true` when the recipient views the conversation thread. The unread count (`GET /api/messages/unread`) is likely always non-zero, causing a permanently stuck badge.

**Suggestion:** When `GET /api/messages?tenancyId=xxx` is called, mark all messages in that thread as `read = true` where `receiverId = session.user.id`. Or provide a separate `PATCH /api/messages/read-thread?tenancyId=xxx` endpoint.

---

### IMP-07 — Condition Report Deductions Should Auto-Update `refundAmount` on Accept

`src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts`

When a tenant **accepts** a deduction, `refundAmount` on the `DepositRefund` is never updated. Only when the landlord withdraws a deduction is it recalculated. This means the displayed refund amount stays at the original proposal amount until the landlord takes an action. The tenant sees an inconsistent figure.

**Suggestion:** After each ACCEPT, recompute and store `refundAmount = originalAmount - sum(ACCEPTED deductions)`.

---

### IMP-08 — No Cascade Deletes on Core Relations

`prisma/schema.prisma`

`RentPayment`, `Message`, `Agreement`, and `ConditionReport` all reference `Tenancy` without `onDelete: Cascade`. In a test/dev environment, deleting a tenancy (or a user) results in a foreign key violation rather than a clean cascade. While production tenancies are soft-deleted (status TERMINATED), this makes database cleanup and seeding harder.

**Suggestion:** Add `onDelete: Cascade` at minimum to `RentPayment`, `Message`, and `Agreement` relations from `Tenancy`.

---

### IMP-09 — Admin Cannot See Previous KYC Rejection Reason When Re-Reviewing

`src/app/(dashboard)/dashboard/admin/verify/page.tsx`

When an admin rejects a user and sets `kycRejectedReason`, and the user re-uploads their IC, the admin queue shows the new submission but displays no context about why it was previously rejected. The admin cannot tell if the user fixed the specific issue or just re-uploaded the same photo.

**Suggestion:** Show `kycRejectedReason` (if set) as a visible banner on the admin verification card for that user, even after the new document is submitted.

---

### IMP-10 — Tenancy List Has No Single-Record Fetch Endpoint

`src/app/api/tenancies/[id]/route.ts` — PATCH only

There is no `GET /api/tenancies/[id]`. The frontend must fetch the entire list and filter client-side to hydrate a single tenancy detail page. For a landlord with many tenancies, this is wasteful.

**Suggestion:** Add a `GET` handler to `src/app/api/tenancies/[id]/route.ts` with the same authorization chain.

---

### IMP-11 — Agreement PDF Relies on `rawContent` Stored as Markdown/HTML

`src/app/api/agreements/[id]/pdf/route.ts`

The PDF is rendered from `rawContent` (Gemini output). If Gemini returns inconsistent formatting between runs, the PDF layout will vary. There is also no fallback for when `fileUrl` on the `Agreement` model is null.

**Suggestion:** Standardize the Gemini prompt to always return structured HTML sections (preamble, definitions, clauses, signatures), and validate the output shape before storing. This makes the PDF renderer predictable.

---

### IMP-12 — Notification for "Deposit Settlement AGREED" Is Missing

`src/app/api/deposit-refund/[id]/deductions/[deductionId]/route.ts`

When `DepositRefund` transitions to `AGREED` (all deductions resolved), the landlord should receive a notification prompting them to upload the refund proof. Currently no notification is sent for this transition, so the landlord has to manually check the settlement page.

**Suggestion:** After setting status to `AGREED`, call `createNotification(landlordId, ...)` with a message like "All deductions agreed. Please mark the deposit refund as paid."

---

### IMP-13 — `LATE` Enum Value Exists in Schema but Is Flagged as Legacy

`prisma/schema.prisma:284`

```prisma
LATE // Legacy value — no longer written; existing rows kept for safety
```

The `LATE` enum value is retained for backward compatibility but creates confusion: new developers reading the schema may try to use it, and the comment says it's "no longer written" but doesn't indicate a timeline for removal or migration.

**Suggestion:** Either migrate all existing `LATE` rows to `PENDING` and remove the enum value in the next migration, or document it formally in CLAUDE.md with a migration note.

---

## Part 3 — New Features to Add

---

### FEAT-01 — Automated Tenancy Expiry (High Priority)

Without auto-expiry, the deposit settlement flow is broken for naturally-ending tenancies. Implement one of:

**Option A (Cron + Route):** Add `GET /api/cron/expire-tenancies` protected by a shared `CRON_SECRET` env variable. Call it daily via Vercel Cron or any external scheduler:
```ts
await prisma.tenancy.updateMany({
  where: { status: 'ACTIVE', endDate: { lt: new Date() } },
  data: { status: 'EXPIRED' },
});
```

**Option B (On-Read):** In the tenancies list query, add a `virtual` status layer — if `status === 'ACTIVE' && endDate < now`, treat as EXPIRED for all display and business logic.

---

### FEAT-02 — Email Notification System (High Priority)

Replace the stub `forgot-password` flow and add email delivery for the full notification lifecycle:

| Event | Recipient |
|-------|-----------|
| Account registered | Tenant/Landlord — welcome |
| KYC approved / rejected | Tenant/Landlord |
| Invitation received | Tenant |
| Agreement ready to sign | Tenant |
| Agreement signed | Landlord |
| Payment approved / rejected | Tenant |
| Deposit settlement initiated | Tenant |
| Deposit refund paid | Tenant |

Use Resend (free tier) with a React Email template. Add `RESEND_API_KEY` and `EMAIL_FROM` to `.env`.

---

### FEAT-03 — Maintenance Request Module

Tenants frequently need to report issues (leaking tap, broken appliance). Currently they can only message the landlord informally. A structured maintenance request module would provide:

- Tenant submits request (title, description, urgency, photos)
- Landlord acknowledges and updates status: `OPEN → IN_PROGRESS → RESOLVED`
- Both parties can add comments
- Resolution timestamp recorded

This directly maps to the `minorRepairResponsible` and `urgentResponseTime` fields already captured in `AgreementPreferences`.

---

### FEAT-04 — Landlord Financial Dashboard

Add a financial summary section to the landlord dashboard:

- Monthly income chart (paid payments per month)
- Occupancy rate (active rooms / total rooms per property)
- Outstanding payments (PENDING + past due date)
- Export payment history to CSV (for tax/accounting use)

---

### FEAT-05 — Tenant Can Withdraw from PENDING Tenancy

Currently only ACTIVE and EXPIRED tenancies can be terminated. If a tenant accepts an invitation (PENDING) but later decides not to proceed before signing the agreement, they have no way to withdraw. The landlord must terminate on their behalf.

**Proposed flow:**  
Tenant clicks "Withdraw" on a PENDING tenancy → status → `CANCELLED` (new enum, see BUG-04) → room freed → landlord notified. The agreement draft (if any) is deleted.

---

### FEAT-06 — Agreement Version History

Currently when a new agreement is generated (`upsert`), the previous draft is overwritten with no trace. After multiple negotiation rounds the parties cannot see what changed between versions.

**Proposed model:**
```prisma
model AgreementVersion {
  id          String   @id @default(cuid())
  agreementId String
  round       Int
  rawContent  String   @db.Text
  createdAt   DateTime @default(now())
  agreement   Agreement @relation(...)
}
```

Store a snapshot on every generate/regenerate. The UI can show a "View History" panel comparing round N-1 vs round N.

---

### FEAT-07 — Public Room Listing (Marketplace)

Landlords currently find tenants outside the platform and then invite them by email. A lightweight public listing would complete the tenant acquisition loop:

- Verified landlords can mark rooms as publicly listed
- Public page at `/rooms` shows available verified rooms with photos, rent, location, and furnishing
- Prospective tenants can submit an enquiry (creates a Message thread and puts the tenant in the invitation flow)
- No financial data exposed publicly

---

### FEAT-08 — Admin User Management Panel

The admin dashboard currently only handles KYC and property verification. Add a full user management view:

- List all users with role, verification status, and account age
- Suspend/unsuspend an account (add `isSuspended Boolean` to User)
- Promote a user to LANDLORD or TENANT (role correction)
- View a user's tenancies and documents without impersonation

---

### FEAT-09 — Two-Factor Authentication for Agreement Signing

Agreement signing has legal implications. Currently it requires only a NextAuth session (email + password). Adding a time-based OTP (TOTP) or SMS OTP step before signing would:

- Prove the account holder performed the action (not a session hijacker)
- Provide stronger non-repudiation alongside the existing IP + SHA-256 + blockchain anchoring

Stack: `otplib` for TOTP generation, `qrcode` for setup QR, new `UserTotp` model in schema.

---

### FEAT-10 — Tenancy ENDING SOON Notification

The `TENANCY_ENDING_SOON` notification type already exists in the `NotificationType` enum but is never created anywhere in the codebase. Wire it up:

- In the expiry cron job (FEAT-01), also notify both parties 30 days and 7 days before `endDate`.
- Link to the renewal page for the landlord.
- This is a two-line addition to the cron handler once FEAT-01 is implemented.

---

### FEAT-11 — IC Number Update Flow After KYC Rejection

When a user's KYC is rejected, they can re-upload the IC photo from the profile page. However, if the rejection reason is "Wrong IC number" (e.g., a typo during registration), there is no way to correct `User.icNumber`. The profile PATCH endpoint only allows updating `name`, `phone`, and `language`.

**Proposed flow:** After a KYC rejection, allow the user to submit a corrected IC number via the profile page. The update goes through a new `PATCH /api/profile/ic` endpoint that:
1. Re-validates the IC format
2. Checks uniqueness
3. Updates the user record
4. Does **not** require re-verification — the admin will see the corrected number when they next review the IC photo

---

## Summary Table

| ID | Severity | Category | File / Area |
|----|----------|----------|-------------|
| BUG-01 | 🔴 Critical | Security | `api/forgot-password/route.ts` |
| BUG-02 | 🔴 Critical | Logic | `api/deposit-refund/.../deductions/[id]/route.ts` |
| BUG-03 | 🔴 Critical | Logic | `api/deposit-refund/.../deductions/[id]/route.ts` |
| BUG-04 | 🟠 Major | Data integrity | `api/tenancies/[id]/respond/route.ts` |
| BUG-05 | 🟠 Major | Business logic | Schema + all routes |
| BUG-06 | 🟠 Major | UX / workflow | `api/tenancies/[id]/route.ts` |
| BUG-07 | 🟠 Major | Data integrity | `api/rooms/[id]/route.ts` |
| BUG-08 | 🟠 Major | Validation | `api/tenancies/route.ts` |
| BUG-09 | 🟠 Major | Concurrency | `api/tenancies/[id]/renew/route.ts` |
| BUG-10 | 🟡 Minor | UX | `api/condition-reports/[id]/acknowledge/route.ts` |
| BUG-11 | 🟡 Minor | Validation | `api/condition-reports/route.ts` |
| BUG-12 | 🟡 Minor | Security | `api/register/route.ts` |
| BUG-13 | 🟡 Minor | Dead code | `PaymentProof.isReadByTenant` |
| BUG-14 | 🟡 Minor | Missing CRUD | `api/rooms/[id]/route.ts` |
| IMP-01 | 🟠 | Email | `api/forgot-password` |
| IMP-02 | 🟠 | Security | `api/agreements/generate` |
| IMP-03 | 🟡 | Logic | `api/agreements/[id]/respond` |
| IMP-04 | 🟡 | Validation | `api/condition-reports` |
| IMP-05 | 🟢 | UX | Landlord dashboard |
| IMP-06 | 🟠 | UX | Message `read` field |
| IMP-07 | 🟡 | Logic | Deduction refund recalculation |
| IMP-08 | 🟡 | DB | Schema cascade deletes |
| IMP-09 | 🟡 | UX | Admin KYC review page |
| IMP-10 | 🟡 | API | `api/tenancies/[id]` — missing GET |
| IMP-11 | 🟡 | Reliability | Agreement PDF rendering |
| IMP-12 | 🟡 | UX | Deposit AGREED notification |
| IMP-13 | 🟡 | Cleanup | `LATE` enum value |
| FEAT-01 | 🔴 | Core flow | Auto tenancy expiry |
| FEAT-02 | 🟠 | Core flow | Email notifications |
| FEAT-03 | 🟢 | New module | Maintenance requests |
| FEAT-04 | 🟢 | New module | Financial dashboard |
| FEAT-05 | 🟢 | Workflow | Tenant withdrawal from PENDING |
| FEAT-06 | 🟢 | Transparency | Agreement version history |
| FEAT-07 | 🟢 | Growth | Public room listing |
| FEAT-08 | 🟢 | Admin | User management panel |
| FEAT-09 | 🟢 | Security | 2FA for signing |
| FEAT-10 | 🟢 | Workflow | TENANCY_ENDING_SOON notification |
| FEAT-11 | 🟢 | Workflow | IC number correction after rejection |
