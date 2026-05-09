# RentalEase Malaysia — Code Review & Improvement Notes

> Reviewed on: 2026-05-08  
> Branch: claude/allow-ic-number-changes-1pUWr  
> Reviewer: Claude Code (automated + manual analysis)

---

## Severity Legend

| Level        | Meaning                                                       |
| ------------ | ------------------------------------------------------------- |
| **CRITICAL** | Security hole or data-loss risk — fix before going live       |
| **HIGH**     | Functional bug or serious misuse vector                       |
| **MEDIUM**   | Reliability / code-quality issue that will bite in production |
| **LOW**      | Polish, maintainability, or minor edge-case                   |

---

## 1. CRITICAL Issues

### 1.1 CRON endpoint unprotected when `CRON_SECRET` is not set

**File:** `src/app/api/cron/expire-tenancies/route.ts` · lines 16–22

```ts
// Current — skips auth entirely if env var is absent
const secret = process.env.CRON_SECRET;
if (secret) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) { ... }
}
```

**Problem:** If `CRON_SECRET` is missing from `.env`, any anonymous HTTP request can expire every active tenancy instantly.

**Fix:**

```ts
const secret = process.env.CRON_SECRET;
if (!secret) {
  return NextResponse.json(
    { error: 'CRON_SECRET not configured' },
    { status: 500 },
  );
}
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${secret}`) {
  return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
}
```

---

### 1.2 No file-type or file-size validation before Cloudinary upload (two routes)

**Files:**

- `src/app/api/payments/[id]/proof/route.ts` · lines 71–86
- `src/app/api/tenancies/[id]/deposit-proof/route.ts` · similar section

**Problem:** Cloudinary receives the raw file with no type or size check. An attacker can upload a 100 MB PDF, an SVG with embedded scripts, or any binary, consuming Cloudinary quota and potentially triggering downstream rendering issues.

**Fix — add before the Cloudinary upload call:**

```ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json(
    { error: 'Only JPEG, PNG, or WebP images are accepted' },
    { status: 415 },
  );
}
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: 'File must be under 10 MB' },
    { status: 413 },
  );
}
```

Apply the same pattern in `condition-reports/[id]/photos/route.ts` and `tenant-documents/route.ts` (all file-upload endpoints).

---

### 1.3 Unhandled JSON parse error crashes API routes

**Files:** `src/app/api/condition-reports/route.ts` and several others that call `await request.json()` without a try-catch.

**Problem:** A malformed request body causes Next.js to return a raw 500 with a stack trace instead of a clean 400.

**Fix:**

```ts
let body: unknown;
try {
  body = await request.json();
} catch {
  return NextResponse.json(
    { error: 'Invalid JSON in request body' },
    { status: 400 },
  );
}
```

---

## 2. HIGH Issues

### 2.1 Weak / missing Zod validation on tenancy creation

**File:** `src/app/api/tenancies/route.ts` · lines 73–95

**Problem:** `monthlyRent`, `depositAmount`, `startDate`, and `endDate` are accepted as raw strings/numbers with only a presence check. No format validation, no range check, no type coercion — a negative rent or a non-date string will cause a Prisma error with a raw 500 response.

**Fix:**

```ts
import { z } from 'zod';
const schema = z.object({
  roomId: z.string().cuid(),
  tenantEmail: z.string().email(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlyRent: z.coerce.number().positive().max(99999),
  depositAmount: z.coerce.number().min(0).max(99999),
});
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
}
```

---

### 2.2 Date comparison is fragile (string comparison)

**File:** `src/app/api/tenancies/route.ts` · lines 97–103

```ts
const today = new Date().toISOString().split('T')[0];
if (startDate < today) { ... }  // string lexicographic comparison
```

**Problem:** Works only because ISO dates happen to sort lexicographically, but breaks the moment a non-ISO string is passed (e.g. `"2025/06/01"`).

**Fix:**

```ts
const todayMs = new Date().setHours(0, 0, 0, 0);
const startMs = new Date(startDate).getTime();
if (isNaN(startMs))
  return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
if (startMs < todayMs)
  return NextResponse.json(
    { error: 'Start date cannot be in the past' },
    { status: 400 },
  );
```

---

### 2.3 Email HTML injection / XSS in email templates

**File:** `src/lib/email.ts`

**Problem:** User-supplied values (name, property address, etc.) are interpolated directly into raw HTML strings with template literals. A user who registers with the name `<script>alert(1)</script>` would inject that into every email they receive.

**Fix:** Add and use an HTML escape helper:

```ts
function h(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
// Replace every ${name} → ${h(name)}, ${address} → ${h(address)}, etc.
```

---

### 2.4 No rate limiting on password-reset email endpoint

**File:** `src/app/api/forgot-password/route.ts`

**Problem:** There is no rate limit. Anyone can spam-send password-reset emails to any address, burning your Resend quota and harassing users. The system already has `src/lib/ratelimit.ts` — it just needs to be applied here.

**Fix:**

```ts
import { loginRateLimit } from '@/lib/ratelimit';
const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
const { success } = await loginRateLimit.limit(ip);
if (!success)
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
```

---

### 2.5 Cloudinary config duplicated across route files

**Files:** `payments/[id]/proof/route.ts`, `tenancies/[id]/deposit-proof/route.ts`, and others

**Problem:** `cloudinary.config({...})` is copy-pasted into multiple files. If `CLOUDINARY_*` env var names ever change, every file needs updating independently. Also increases risk of one file being missed.

**Fix:** Centralise in `src/lib/cloudinary.ts` and export the already-configured `cloudinary` object:

```ts
// src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export { cloudinary };
```

Then in each route: `import { cloudinary } from '@/lib/cloudinary';` (no `.config()` call needed).

---

## 3. MEDIUM Issues

### 3.1 Missing Prisma error handling — all routes return raw 500 on DB errors

**Files:** All API routes

**Problem:** None of the routes catch `PrismaClientKnownRequestError`. A unique-constraint violation (P2002), missing FK (P2025), or the database being unavailable all produce an unhandled exception and a 500 with a Prisma stack trace exposed to the client.

**Fix — create `src/lib/prismaError.ts`:**

```ts
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
export function handlePrismaError(e: unknown): [string, number] {
  if (e instanceof PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return ['This record already exists', 409];
    if (e.code === 'P2025') return ['Record not found', 404];
    if (e.code === 'P2014')
      return ['Cannot complete due to a related record', 409];
  }
  console.error(e);
  return ['Internal server error', 500];
}
```

Then wrap route bodies with `try/catch` using this helper.

---

### 3.2 Agreement status machine does not guard against re-finalization

**File:** `src/app/api/agreements/[id]/finalize/route.ts`

**Problem:** If the landlord calls `POST /api/agreements/{id}/finalize` twice, the second call succeeds silently and resets `signedAt`, `contentHash`, and `txHash`. This corrupts the audit trail.

**Fix:** Add a guard before processing:

```ts
if (agreement.status === 'FINALIZED' || agreement.status === 'SIGNED') {
  return NextResponse.json(
    { error: 'Agreement already finalised' },
    { status: 409 },
  );
}
```

---

### 3.3 Landlord queries in cron loop — N+1 pattern

**File:** `src/app/api/cron/expire-tenancies/route.ts` · lines 81–84, 108–111

**Problem:** For each ending tenancy, the cron fetches the landlord user individually with `findUnique`. With 20 ending tenancies, that is 20 extra queries. The landlord data is already present in the tenancy via `room.property.landlordId` — a single `findMany` on users would suffice.

**Fix:** Collect all landlord IDs first, batch-fetch them, then look up by ID:

```ts
const landlordIds = [
  ...new Set([...ending30, ...ending7].map((t) => t.room.property.landlordId)),
];
const landlords = await prisma.user.findMany({
  where: { id: { in: landlordIds } },
  select: { id: true, name: true, email: true },
});
const landlordMap = Object.fromEntries(landlords.map((l) => [l.id, l]));
// Replace: await prisma.user.findUnique(...) → landlordMap[landlordId]
```

---

### 3.4 Deposit refund deduction reason has no max length

**File:** `src/app/api/deposit-refund/[id]/route.ts`

**Problem:** `reason: z.string().min(5)` has no upper bound. A 100,000-character reason string passes validation, goes into `@db.Text`, and renders as a wall of text in the UI.

**Fix:** `reason: z.string().min(5).max(500)`

---

### 3.5 Inconsistent "Unauthorised" / "Unauthorized" spelling

**Files:** Various API routes

Some routes return `"Unauthorised"` (British), others `"Unauthorized"` (American, as per HTTP 401 spec). Any client code doing `if (error === 'Unauthorized')` will silently fail for the British-spelled routes.

**Fix:** Standardise to `"Unauthorized"` everywhere to match the HTTP 401 status description.

---

### 3.6 Notifications not awaited in several routes

**Files:** `src/app/api/tenancies/route.ts` (line 196 — `sendInvitationEmail` called without `await`), `withdraw/route.ts`, and others.

**Problem:** Fire-and-forget is fine for non-critical notifications, but unawaited promises can swallow errors silently in serverless environments. Also, unhandled promise rejections can cause Next.js edge runtime warnings.

**Fix:** Either `await` the calls, or explicitly `.catch(console.error)` to make the intent clear:

```ts
sendInvitationEmail(...).catch(console.error);
```

---

### 3.7 `isVerified` check not applied to tenants before tenancy activation

**File:** `src/app/api/tenancies/route.ts` (POST) and `tenancies/[id]/respond/route.ts`

**Problem:** Landlords can invite unverified tenants and proceed to agreement generation. The `User.isVerified` field exists for KYC, but the tenancy invite flow does not check it, allowing unverified users to sign legal agreements.

**Fix:** After fetching the tenant, add:

```ts
if (!tenant.isVerified) {
  return NextResponse.json(
    { error: 'Tenant account is not yet verified by admin' },
    { status: 403 },
  );
}
```

---

## 4. LOW Issues

### 4.1 Magic numbers — no shared constants file

**Problem:** Values like `10 * 1024 * 1024` (file size), `20` (max occupants), `1`–`28` (rent due day range) appear inline in multiple files. A change to one limit requires hunting all callsites.

**Fix:** Create `src/lib/constants.ts`:

```ts
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const RENT_DUE_DAY_MIN = 1;
export const RENT_DUE_DAY_MAX = 28;
```

---

### 4.2 No pagination on tenancy / payment list endpoints

**Files:** `src/app/api/tenancies/route.ts`, `src/app/api/payments/*`

**Problem:** All tenancies/payments for a landlord or tenant are returned in a single query. A landlord with 50 rooms over 5 years could have thousands of records, causing slow page loads.

**Fix:** Add cursor-based pagination (same pattern as the notifications endpoint already uses).

---

### 4.3 Blockchain failure is completely silent

**File:** `src/app/api/agreements/[id]/respond/route.ts` · blockchain anchoring section

**Problem:** If `sendAgreementToBlockchain()` throws, the error is caught and ignored. The agreement is marked SIGNED but `txHash` remains `null` with no indication to the user or admin.

**Fix:** Log the error prominently and store a retry flag:

```ts
try {
  const txHash = await sendAgreementToBlockchain(agreement.rawContent);
  await prisma.agreement.update({ where: { id }, data: { txHash } });
} catch (err) {
  console.error('[blockchain] Anchor failed for agreement', id, err);
  // Optionally: store a blockchainRetryPending flag in DB
}
```

---

### 4.4 `PasswordResetToken.usedAt` not checked — potential token replay

**File:** `src/app/api/reset-password/route.ts`

**Problem:** The endpoint checks `expiresAt` but should also verify `usedAt === null`. If the same token is somehow replayed before the cron deletes it, the same token could reset a password twice.

**Fix:** Add to the `where` clause:

```ts
where: { token, usedAt: null, expiresAt: { gt: new Date() } }
```

---

### 4.5 No audit logging for sensitive operations

**Problem:** Agreement signing, payment approval, deposit deduction, and admin verification are high-value operations with no audit trail beyond the DB record. Console logs disappear in production.

**Recommendation:** Add structured logging (e.g. to a `AuditLog` table or a logging service) for: agreement signed, payment approved/rejected, deposit refund paid, admin user/property verified/rejected.

---

### 4.6 `AgreementPreferences.completedSteps` can de-sync

**File:** `src/app/api/agreement-preferences/route.ts`

**Problem:** The wizard tracks `completedSteps` as an integer, but there is no server-side enforcement that steps are completed in order. A client could POST step 6 data without ever completing steps 1–5.

**Fix:** Validate that `completedSteps >= step - 1` before accepting a step's data.

---

## 5. Architecture / Future Improvements

These are out of immediate bug-fix scope but worth noting for the project roadmap.

| #   | Suggestion                                                                                                                                      | Rationale                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| A   | Add a `vercel.json` cron schedule entry for `/api/cron/expire-tenancies`                                                                        | The cron route exists but is never called unless manually triggered       |
| B   | Add Zod schemas for all API request bodies (a shared `src/lib/schemas/` folder)                                                                 | Eliminates category of raw-body bugs in one pass                          |
| C   | Migrate remaining `cloudinary.config()` inline calls to use the centralised `src/lib/cloudinary.ts`                                             | Single source of truth for cloud credentials                              |
| D   | Add a `RentPayment` index on `(tenancyId, dueDate)`                                                                                             | Queries filtering by tenancy + date appear on every landlord payment page |
| E   | Add OpenAPI / JSDoc comments to all API routes                                                                                                  | Needed for maintainability and future API client generation               |
| F   | Consider replacing string-stored JSON fields (`acceptablePaymentMethods`, `deductionCategories`, `photoIds`) with proper Prisma relation tables | These fields are not queryable and break type safety                      |
