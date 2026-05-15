# Stronger Signing Audit Trail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the agreement signing audit trail by storing signer account ID, user agent, agreement version, and final document hash references at signing time.

**Architecture:** Extend the existing `Agreement` signing fields instead of creating a separate audit table. Record immutable signing evidence during the tenant/signatory `SIGN` action and expose it in the agreement viewer/PDF audit section.

**Tech Stack:** Next.js App Router, TypeScript, Prisma/PostgreSQL, Node `crypto`, existing agreement history/revision system, `@react-pdf/renderer`

---

## Specification

### Problem

The current signing workflow stores acknowledgement, timestamp, IP address, and `rawContent` hash. This is useful, but it does not clearly record the signer account ID, browser user agent, or agreement revision/version that was signed. If a dispute happens later, the system should be able to show exactly which account signed which version of the agreement from which client context.

### Target Behavior

When a tenant or corporate authorized signatory signs an agreement, the system should store:

- signer user ID
- signer name snapshot
- signer role snapshot
- signed timestamp
- signed IP address
- signed user agent
- signed acknowledgement flag
- signed agreement version number
- signed agreement revision ID, if available
- content hash of the signed agreement text
- optional final PDF hash when final PDF hashing is implemented later

### Scope

In scope:

- add audit fields to `Agreement`
- populate audit fields during the existing `SIGN` action
- resolve latest agreement revision/version at signing time
- display audit data in `AgreementViewer`
- include audit data in generated PDF
- add focused test coverage for extracting audit metadata

Out of scope:

- production email OTP
- government-certified digital signature
- LHDN stamping
- separate append-only audit table
- final rendered PDF hash implementation, except reserving a nullable field for it

### Acceptance Criteria

- Signing stores `signedByUserId`.
- Signing stores `signedByUserAgent`.
- Signing stores signer name and role snapshots.
- Signing stores the latest agreement version number.
- Signing continues to require `signedAcknowledged === true`.
- Existing blockchain anchor remains best-effort and does not block signing.
- Agreement viewer and PDF show the stronger audit details when available.

## File Structure

### Modified files

- `prisma/schema.prisma`
- `src/app/api/agreements/[id]/respond/route.ts`
- `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`
- `src/components/ui/AgreementViewer.tsx`
- `src/lib/pdf/AgreementPDF.tsx`

### New files

- `src/lib/signingAudit.ts`
- `tests/unit/signing-audit.test.ts`

### Migration output expected

- `prisma/migrations/<timestamp>_strengthen_signing_audit_trail/`

---

## Implementation Plan

### Task 1: Extend the `Agreement` schema

**Files:**

- Modify: `prisma/schema.prisma`
- Create migration: `prisma/migrations/<timestamp>_strengthen_signing_audit_trail/`

- [ ] **Step 1: Add audit fields to `Agreement`**

Add these fields near the existing signing fields:

```prisma
signedByUserId          String?
signedByNameSnapshot    String?
signedByRoleSnapshot    String?
signedByUserAgent       String? @db.Text
signedRevisionId        String?
signedVersionNumber     Int?
finalPdfHash            String?
```

Keep the existing fields:

```prisma
contentHash        String?
signedAt           DateTime?
signedByIp         String?
signedAcknowledged Boolean   @default(false)
txHash             String?
```

- [ ] **Step 2: Create migration**

Run:

```bash
npx.cmd prisma migrate dev --name strengthen_signing_audit_trail
```

Expected: nullable columns are added to `Agreement`.

### Task 2: Add a signing audit helper

**Files:**

- Create: `src/lib/signingAudit.ts`
- Create: `tests/unit/signing-audit.test.ts`

- [ ] **Step 1: Create helper functions**

```ts
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded?.trim()) return forwarded.split(',')[0].trim();

  const realIp = headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  return 'unknown';
}

export function extractUserAgent(headers: Headers): string {
  const userAgent = headers.get('user-agent')?.trim();
  return userAgent || 'unknown';
}

export function normalizeSignerSnapshot(input: {
  name?: string | null;
  role: string;
}) {
  return {
    signedByNameSnapshot: input.name?.trim() || 'Unknown signer',
    signedByRoleSnapshot: input.role,
  };
}
```

- [ ] **Step 2: Add unit tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  extractClientIp,
  extractUserAgent,
  normalizeSignerSnapshot,
} from '@/lib/signingAudit';

describe('signing audit helpers', () => {
  it('extracts the first forwarded IP address', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      'user-agent': 'Vitest Browser',
    });

    expect(extractClientIp(headers)).toBe('203.0.113.10');
    expect(extractUserAgent(headers)).toBe('Vitest Browser');
  });

  it('falls back when headers are missing', () => {
    const headers = new Headers();

    expect(extractClientIp(headers)).toBe('unknown');
    expect(extractUserAgent(headers)).toBe('unknown');
  });

  it('normalizes signer snapshots', () => {
    expect(
      normalizeSignerSnapshot({ name: '  Tan Mei Ling ', role: 'TENANT' }),
    ).toEqual({
      signedByNameSnapshot: 'Tan Mei Ling',
      signedByRoleSnapshot: 'TENANT',
    });
  });
});
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm.cmd run test -- signing-audit
```

Expected: helper tests pass.

### Task 3: Store audit fields during signing

**Files:**

- Modify: `src/app/api/agreements/[id]/respond/route.ts`

- [ ] **Step 1: Import helper functions**

```ts
import {
  extractClientIp,
  extractUserAgent,
  normalizeSignerSnapshot,
} from '@/lib/signingAudit';
```

- [ ] **Step 2: Include latest revision in the agreement query**

Add latest revision selection to the `agreement` query:

```ts
revisions: {
  orderBy: { versionNumber: 'desc' },
  take: 1,
  select: { id: true, versionNumber: true },
},
```

- [ ] **Step 3: Replace local IP parsing**

Replace:

```ts
const forwarded = request.headers.get('x-forwarded-for');
const signedByIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
```

With:

```ts
const signedByIp = extractClientIp(request.headers);
const signedByUserAgent = extractUserAgent(request.headers);
```

- [ ] **Step 4: Build signer snapshot**

```ts
const signerSnapshot = normalizeSignerSnapshot({
  name: signerLabel,
  role:
    agreement.tenancy.leasePartyType === 'CORPORATE'
      ? 'AUTHORIZED_SIGNATORY'
      : 'TENANT',
});

const signedRevision = agreement.revisions[0] ?? null;
```

- [ ] **Step 5: Save stronger audit fields**

Add these fields to `prisma.agreement.update` in the `SIGN` transaction:

```ts
signedByUserId: session.user.id,
signedByNameSnapshot: signerSnapshot.signedByNameSnapshot,
signedByRoleSnapshot: signerSnapshot.signedByRoleSnapshot,
signedByUserAgent,
signedRevisionId: signedRevision?.id ?? null,
signedVersionNumber: signedRevision?.versionNumber ?? null,
```

### Task 4: Expose audit fields to the agreement viewer

**Files:**

- Modify: `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`
- Modify: `src/components/ui/AgreementViewer.tsx`

- [ ] **Step 1: Select audit fields in page queries**

Where agreement data is loaded for `AgreementViewer`, include:

```ts
signedByUserId: true,
signedByNameSnapshot: true,
signedByRoleSnapshot: true,
signedByUserAgent: true,
signedRevisionId: true,
signedVersionNumber: true,
finalPdfHash: true,
```

- [ ] **Step 2: Add props to `AgreementViewer`**

```ts
signedByUserId?: string | null;
signedByNameSnapshot?: string | null;
signedByRoleSnapshot?: string | null;
signedByUserAgent?: string | null;
signedRevisionId?: string | null;
signedVersionNumber?: number | null;
finalPdfHash?: string | null;
```

- [ ] **Step 3: Render audit fields**

Add these rows inside the existing "Signing Audit Record" section:

```tsx
{signedByNameSnapshot && (
  <div>
    <p className="font-medium text-gray-600 mb-0.5">Signed by</p>
    <p>{signedByNameSnapshot}</p>
  </div>
)}

{signedByRoleSnapshot && (
  <div>
    <p className="font-medium text-gray-600 mb-0.5">Signer role</p>
    <p>{signedByRoleSnapshot}</p>
  </div>
)}

{signedVersionNumber && (
  <div>
    <p className="font-medium text-gray-600 mb-0.5">Signed version</p>
    <p>Version {signedVersionNumber}</p>
  </div>
)}

{signedByUserAgent && (
  <div className="sm:col-span-2">
    <p className="font-medium text-gray-600 mb-0.5">User agent</p>
    <p className="break-all">{signedByUserAgent}</p>
  </div>
)}
```

### Task 5: Include stronger audit fields in PDF

**Files:**

- Modify: `src/app/api/agreements/[id]/pdf/route.ts`
- Modify: `src/lib/pdf/AgreementPDF.tsx`

- [ ] **Step 1: Pass audit fields from PDF route**

Add these props when creating `AgreementPDF`:

```ts
signedByNameSnapshot: agreement.signedByNameSnapshot,
signedByRoleSnapshot: agreement.signedByRoleSnapshot,
signedVersionNumber: agreement.signedVersionNumber,
signedByUserAgent: agreement.signedByUserAgent,
finalPdfHash: agreement.finalPdfHash,
```

- [ ] **Step 2: Extend `AgreementPDFProps`**

```ts
signedByNameSnapshot?: string | null;
signedByRoleSnapshot?: string | null;
signedVersionNumber?: number | null;
signedByUserAgent?: string | null;
finalPdfHash?: string | null;
```

- [ ] **Step 3: Render rows in the PDF audit trail**

Add rows for:

- signed by
- signer role
- signed version
- user agent
- final PDF hash, only if available

### Task 6: Manual verification

**Files:**

- Verify: tenant signing flow
- Verify: agreement viewer
- Verify: downloaded PDF

- [ ] Finalize an agreement.
- [ ] Sign as a tenant.
- [ ] Confirm agreement stores `signedByUserId`, `signedByUserAgent`, `signedByNameSnapshot`, and `signedVersionNumber`.
- [ ] Confirm agreement viewer shows the stronger audit trail.
- [ ] Download the PDF and confirm the signing audit trail appears.
- [ ] Confirm signing still fails when `signedAcknowledged !== true`.

## FYP Report Note

This feature improves non-repudiation evidence by storing stronger signing metadata. It does not make the system a certified digital signature platform under the Malaysian Digital Signature Act, but it strengthens the audit trail for academic and prototype purposes.
