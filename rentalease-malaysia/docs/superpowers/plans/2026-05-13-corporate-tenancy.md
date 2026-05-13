# Corporate Tenancy Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real corporate tenancy workflow where a company-authorized signatory handles legal agreement actions while linked staff occupants use normal tenant operational features.

**Architecture:** Keep the current room-based tenancy model and extend it with a corporate branch instead of replacing the individual flow. Add a dedicated authorized-signatory linkage and corporate occupant roster, then thread those through tenancy creation, invitation/acceptance, agreement signing, dual-signature proof, and tenant/landlord views.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma 5, PostgreSQL, NextAuth, Zod, Vitest, ESLint

---

## File Map

**Create**
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\vitest.config.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\corporate-tenancy.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\corporate-tenancy-access.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\CorporateOccupantRosterManager.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\CorporateSignatoryInvitationCard.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-signatory\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-occupants\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-occupants\[occupantId]\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-occupants\[occupantId]\link\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\tests\unit\corporate-tenancy.test.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\tests\unit\corporate-tenancy-access.test.ts`

**Modify**
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\package.json`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\prisma\schema.prisma`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\respond\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\agreements\generate\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\agreements\[id]\respond\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\agreements\[id]\signature-proof\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\agreements\[id]\signature-proof\[proofId]\review\route.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\landlord\tenancies\new\NewTenancyForm.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\landlord\tenancies\[id]\page.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\tenant\tenancy\page.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\TenantAgreementActions.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\TenantAgreementSignatureProofUploader.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\AgreementViewer.tsx`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\gemini.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\agreements\history.ts`
- `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\test data.md`

---

### Task 1: Add a Small Test Harness for Corporate-Tenancy Helpers

**Files:**
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\vitest.config.ts`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\tests\unit\corporate-tenancy.test.ts`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\tests\unit\corporate-tenancy-access.test.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\package.json`

- [ ] **Step 1: Add Vitest scripts and config**

```ts
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

```json
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Install Vitest**

Run: `npm.cmd install --save-dev vitest@^3.2.4`  
Expected: install completes and `package.json` / lockfile update

- [ ] **Step 3: Write failing unit tests for corporate helper behavior**

```ts
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\tests\unit\corporate-tenancy.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildCorporateTenancyCreateInput,
  normalizeCorporateOccupants,
} from '@/lib/corporate-tenancy';

describe('normalizeCorporateOccupants', () => {
  it('keeps named occupants and drops blank rows', () => {
    expect(
      normalizeCorporateOccupants([
        { name: '  Lim Mei Ling  ', phone: '', icNumber: '' },
        { name: '   ', phone: '012', icNumber: '900101-10-1234' },
      ]),
    ).toEqual([
      { name: 'Lim Mei Ling', phone: null, icNumber: null, roleLabel: null },
    ]);
  });
});

describe('buildCorporateTenancyCreateInput', () => {
  it('marks a tenancy as corporate and preserves signatory fields', () => {
    const input = buildCorporateTenancyCreateInput({
      roomId: 'room_1',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      monthlyRent: 1500,
      depositAmount: 3000,
      companyName: 'Restoran Maju Sdn Bhd',
      companyRegistrationNo: '202601001234',
      authorizedSignatoryName: 'Ahmad Razif',
      authorizedSignatoryIC: '850101-14-5678',
      authorizedSignatoryRole: 'Owner',
      authorizedSignatoryEmail: 'boss@test.my',
      occupants: [{ name: 'Worker A', phone: null, icNumber: null, roleLabel: null }],
    });

    expect(input.leasePartyType).toBe('CORPORATE');
    expect(input.authorizedSignatoryName).toBe('Ahmad Razif');
    expect(input.occupants).toHaveLength(1);
  });
});
```

```ts
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\tests\unit\corporate-tenancy-access.test.ts
import { describe, expect, it } from 'vitest';
import {
  canManageCorporateOccupants,
  canLegallySignCorporateAgreement,
} from '@/lib/corporate-tenancy-access';

describe('corporate tenancy access', () => {
  it('allows landlord and authorized signatory to manage occupants', () => {
    expect(canManageCorporateOccupants({ actorRole: 'LANDLORD', isAuthorizedSignatory: false })).toBe(true);
    expect(canManageCorporateOccupants({ actorRole: 'TENANT', isAuthorizedSignatory: true })).toBe(true);
    expect(canManageCorporateOccupants({ actorRole: 'TENANT', isAuthorizedSignatory: false })).toBe(false);
  });

  it('allows only the authorized signatory to legally sign', () => {
    expect(canLegallySignCorporateAgreement({ leasePartyType: 'CORPORATE', isAuthorizedSignatory: true })).toBe(true);
    expect(canLegallySignCorporateAgreement({ leasePartyType: 'CORPORATE', isAuthorizedSignatory: false })).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests to verify failure**

Run: `npm.cmd run test -- tests/unit/corporate-tenancy.test.ts tests/unit/corporate-tenancy-access.test.ts`  
Expected: FAIL with missing module errors for `@/lib/corporate-tenancy` and `@/lib/corporate-tenancy-access`

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.ts tests/unit/corporate-tenancy.test.ts tests/unit/corporate-tenancy-access.test.ts
git commit -m "test: add corporate tenancy planning harness"
```

### Task 2: Add Corporate-Tenancy Domain Helpers and Prisma Schema

**Files:**
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\corporate-tenancy.ts`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\corporate-tenancy-access.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\prisma\schema.prisma`

- [ ] **Step 1: Implement the minimal helper functions to satisfy Task 1**

```ts
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\corporate-tenancy.ts
export type CorporateOccupantDraft = {
  name: string;
  icNumber?: string | null;
  phone?: string | null;
  roleLabel?: string | null;
};

export function normalizeCorporateOccupants(rows: CorporateOccupantDraft[]) {
  return rows
    .map((row) => ({
      name: row.name.trim(),
      icNumber: row.icNumber?.trim() || null,
      phone: row.phone?.trim() || null,
      roleLabel: row.roleLabel?.trim() || null,
    }))
    .filter((row) => row.name.length > 0);
}

export function buildCorporateTenancyCreateInput(input: {
  roomId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  companyName: string;
  companyRegistrationNo?: string;
  authorizedSignatoryName: string;
  authorizedSignatoryIC?: string;
  authorizedSignatoryRole?: string;
  authorizedSignatoryEmail?: string;
  occupants: CorporateOccupantDraft[];
}) {
  return {
    roomId: input.roomId,
    startDate: input.startDate,
    endDate: input.endDate,
    monthlyRent: input.monthlyRent,
    depositAmount: input.depositAmount,
    leasePartyType: 'CORPORATE' as const,
    companyName: input.companyName.trim(),
    companyRegistrationNo: input.companyRegistrationNo?.trim() || null,
    authorizedSignatoryName: input.authorizedSignatoryName.trim(),
    authorizedSignatoryIC: input.authorizedSignatoryIC?.trim() || null,
    authorizedSignatoryRole: input.authorizedSignatoryRole?.trim() || null,
    authorizedSignatoryEmail: input.authorizedSignatoryEmail?.trim().toLowerCase() || null,
    occupants: normalizeCorporateOccupants(input.occupants),
  };
}
```

```ts
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\corporate-tenancy-access.ts
export function canManageCorporateOccupants(input: {
  actorRole: 'LANDLORD' | 'TENANT' | 'ADMIN';
  isAuthorizedSignatory: boolean;
}) {
  return input.actorRole === 'LANDLORD' || input.isAuthorizedSignatory;
}

export function canLegallySignCorporateAgreement(input: {
  leasePartyType: 'INDIVIDUAL' | 'CORPORATE';
  isAuthorizedSignatory: boolean;
}) {
  if (input.leasePartyType === 'INDIVIDUAL') return true;
  return input.isAuthorizedSignatory;
}
```

- [ ] **Step 2: Extend Prisma schema with corporate linkage and occupant roster**

```prisma
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\prisma\schema.prisma
model Tenancy {
  // existing fields...
  authorizedSignatoryUserId String?
  authorizedSignatoryUser   User?               @relation("AuthorizedCorporateTenancies", fields: [authorizedSignatoryUserId], references: [id])
  corporateOccupants        CorporateOccupant[]
}

model User {
  // existing fields...
  authorizedCorporateTenancies Tenancy[]           @relation("AuthorizedCorporateTenancies")
  linkedCorporateOccupancies   CorporateOccupant[] @relation("LinkedCorporateOccupancies")
}

model CorporateOccupant {
  id           String   @id @default(cuid())
  tenancyId     String
  tenancy       Tenancy  @relation(fields: [tenancyId], references: [id], onDelete: Cascade)
  name          String
  icNumber      String?
  phone         String?
  roleLabel     String?
  linkedUserId  String?
  linkedUser    User?    @relation("LinkedCorporateOccupancies", fields: [linkedUserId], references: [id])
  status        CorporateOccupantStatus @default(UNLINKED)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([tenancyId, status])
}

enum CorporateOccupantStatus {
  UNLINKED
  LINKED
  REPLACED
  REMOVED
}
```

- [ ] **Step 3: Generate and apply the migration**

Run: `npx.cmd prisma migrate dev --name corporate_tenancy_workflow`  
Expected: migration created under `prisma/migrations/...` and Prisma Client regenerated

- [ ] **Step 4: Re-run unit tests**

Run: `npm.cmd run test -- tests/unit/corporate-tenancy.test.ts tests/unit/corporate-tenancy-access.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/corporate-tenancy.ts src/lib/corporate-tenancy-access.ts tests/unit/corporate-tenancy.test.ts tests/unit/corporate-tenancy-access.test.ts
git commit -m "feat: add corporate tenancy schema and helpers"
```

### Task 3: Add Corporate Tenancy Creation in Landlord Flow

**Files:**
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\landlord\tenancies\new\NewTenancyForm.tsx`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\route.ts`

- [ ] **Step 1: Add form fields and validation for `INDIVIDUAL` vs `CORPORATE`**

```ts
// in NewTenancyForm.tsx
const tenancySchema = z.object({
  leasePartyType: z.enum(['INDIVIDUAL', 'CORPORATE']).default('INDIVIDUAL'),
  tenantEmail: z.string().email().optional(),
  companyName: z.string().optional(),
  companyRegistrationNo: z.string().optional(),
  authorizedSignatoryName: z.string().optional(),
  authorizedSignatoryIC: z.string().optional(),
  authorizedSignatoryRole: z.string().optional(),
  authorizedSignatoryEmail: z.string().email().optional(),
  occupants: z.array(
    z.object({
      name: z.string().optional(),
      icNumber: z.string().optional(),
      phone: z.string().optional(),
      roleLabel: z.string().optional(),
    }),
  ).default([{ name: '', icNumber: '', phone: '', roleLabel: '' }]),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  monthlyRent: z.coerce.number().positive(),
  depositAmount: z.coerce.number().min(0),
}).superRefine((data, ctx) => {
  if (data.leasePartyType === 'INDIVIDUAL' && !data.tenantEmail) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantEmail'], message: 'Tenant email is required' });
  }
  if (data.leasePartyType === 'CORPORATE') {
    if (!data.companyName?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['companyName'], message: 'Company name is required' });
    if (!data.authorizedSignatoryName?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['authorizedSignatoryName'], message: 'Authorized signatory name is required' });
  }
});
```

- [ ] **Step 2: Branch the tenancy-create API for corporate mode**

```ts
// in src/app/api/tenancies/route.ts
if (body.leasePartyType === 'CORPORATE') {
  const corporateInput = buildCorporateTenancyCreateInput({
    roomId,
    startDate,
    endDate,
    monthlyRent,
    depositAmount,
    companyName: body.companyName,
    companyRegistrationNo: body.companyRegistrationNo,
    authorizedSignatoryName: body.authorizedSignatoryName,
    authorizedSignatoryIC: body.authorizedSignatoryIC,
    authorizedSignatoryRole: body.authorizedSignatoryRole,
    authorizedSignatoryEmail: body.authorizedSignatoryEmail,
    occupants: body.occupants ?? [],
  });

  const signatoryUser = corporateInput.authorizedSignatoryEmail
    ? await prisma.user.findUnique({
        where: { email: corporateInput.authorizedSignatoryEmail },
        select: { id: true, role: true, email: true, name: true },
      })
    : null;

  const tenancy = await prisma.tenancy.create({
    data: {
      roomId,
      tenantId: signatoryUser?.id ?? session.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      monthlyRent,
      depositAmount,
      status: 'INVITED',
      leasePartyType: 'CORPORATE',
      companyName: corporateInput.companyName,
      companyRegistrationNo: corporateInput.companyRegistrationNo,
      authorizedSignatoryName: corporateInput.authorizedSignatoryName,
      authorizedSignatoryIC: corporateInput.authorizedSignatoryIC,
      authorizedSignatoryRole: corporateInput.authorizedSignatoryRole,
      authorizedSignatoryUserId: signatoryUser?.id ?? null,
      corporateOccupants: {
        create: corporateInput.occupants,
      },
    },
  });
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npx.cmd tsc --noEmit`  
Expected: PASS

Run: `npm.cmd run lint`  
Expected: PASS with existing baseline warnings only

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tenancies/route.ts src/app/(dashboard)/dashboard/landlord/tenancies/new/NewTenancyForm.tsx
git commit -m "feat: add corporate tenancy creation flow"
```

### Task 4: Add Corporate Invitation Acceptance and Access Rules

**Files:**
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\respond\route.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\tenant\tenancy\page.tsx`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\CorporateSignatoryInvitationCard.tsx`

- [ ] **Step 1: Make invitation acceptance corporate-aware**

```ts
// in src/app/api/tenancies/[id]/respond/route.ts
const isCorporate = tenancy.leasePartyType === 'CORPORATE';
const isAuthorizedSignatory =
  !!tenancy.authorizedSignatoryUserId &&
  tenancy.authorizedSignatoryUserId === session.user.id;

if (isCorporate && !isAuthorizedSignatory) {
  return NextResponse.json(
    { error: 'Only the authorized signatory can accept this corporate tenancy invitation.' },
    { status: 403 },
  );
}
```

- [ ] **Step 2: Add a tenant/signatory-specific invitation card**

```tsx
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\CorporateSignatoryInvitationCard.tsx
export default function CorporateSignatoryInvitationCard({
  companyName,
  authorizedSignatoryName,
}: {
  companyName: string;
  authorizedSignatoryName: string;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
      <p className="text-blue-800 font-semibold text-sm">
        Corporate tenancy invitation
      </p>
      <p className="text-blue-600 text-xs mt-1">
        This tenancy is for {companyName}. Only the authorized signatory,
        {` ${authorizedSignatoryName}`}, can complete the legal agreement steps.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Add unit coverage for signatory-only acceptance logic**

```ts
// append to tests/unit/corporate-tenancy-access.test.ts
it('blocks non-signatory tenant users from legal corporate actions', () => {
  expect(canLegallySignCorporateAgreement({ leasePartyType: 'CORPORATE', isAuthorizedSignatory: false })).toBe(false);
});
```

- [ ] **Step 4: Run focused tests and lint**

Run: `npm.cmd run test -- tests/unit/corporate-tenancy-access.test.ts`  
Expected: PASS

Run: `npx.cmd tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tenancies/[id]/respond/route.ts src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx src/components/ui/CorporateSignatoryInvitationCard.tsx tests/unit/corporate-tenancy-access.test.ts
git commit -m "feat: enforce corporate signatory invitation flow"
```

### Task 5: Add Corporate Occupant Roster APIs and Management UI

**Files:**
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-occupants\route.ts`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-occupants\[occupantId]\route.ts`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\tenancies\[id]\corporate-occupants\[occupantId]\link\route.ts`
- Create: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\CorporateOccupantRosterManager.tsx`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\landlord\tenancies\[id]\page.tsx`

- [ ] **Step 1: Implement create/update/link routes for corporate occupants**

```ts
// pattern for all three routes
const tenancy = await prisma.tenancy.findFirst({
  where: {
    id,
    OR: [
      { room: { property: { landlordId: session.user.id } } },
      { authorizedSignatoryUserId: session.user.id },
    ],
    leasePartyType: 'CORPORATE',
  },
});

if (!tenancy) {
  return NextResponse.json({ error: 'Corporate tenancy not found' }, { status: 404 });
}
```

```ts
// link route core
await prisma.corporateOccupant.update({
  where: { id: occupantId },
  data: {
    linkedUserId: targetUser.id,
    status: 'LINKED',
  },
});
```

- [ ] **Step 2: Add landlord/signatory roster manager UI**

```tsx
// C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\CorporateOccupantRosterManager.tsx
type Occupant = {
  id: string;
  name: string;
  icNumber: string | null;
  phone: string | null;
  roleLabel: string | null;
  status: 'UNLINKED' | 'LINKED' | 'REPLACED' | 'REMOVED';
  linkedUser: { id: string; name: string; email: string } | null;
};
```

The component should support:
- add occupant
- remove occupant
- replace occupant
- link occupant to an existing user email

- [ ] **Step 3: Add route-level unit tests for roster normalization helpers if needed**

```ts
// extend tests/unit/corporate-tenancy.test.ts
it('normalizes occupant replacements without losing existing optional fields', () => {
  const result = normalizeCorporateOccupants([
    { name: 'Worker B', phone: '012-3456789', icNumber: '900101-10-1234', roleLabel: 'Kitchen Crew' },
  ]);
  expect(result[0].roleLabel).toBe('Kitchen Crew');
});
```

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `npm.cmd run test -- tests/unit/corporate-tenancy.test.ts tests/unit/corporate-tenancy-access.test.ts`  
Expected: PASS

Run: `npx.cmd tsc --noEmit`  
Expected: PASS

Run: `npm.cmd run lint`  
Expected: PASS with baseline warnings only

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tenancies/[id]/corporate-occupants src/components/ui/CorporateOccupantRosterManager.tsx src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx tests/unit/corporate-tenancy.test.ts
git commit -m "feat: add corporate occupant roster management"
```

### Task 6: Thread Corporate Rules Through Agreement Generation and Signing

**Files:**
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\gemini.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\agreements\generate\route.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\api\agreements\[id]\respond\route.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\TenantAgreementActions.tsx`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\TenantAgreementSignatureProofUploader.tsx`

- [ ] **Step 1: Include corporate party details in agreement generation**

```ts
// in src/lib/gemini.ts tenancy input type
leasePartyType?: 'INDIVIDUAL' | 'CORPORATE';
companyName?: string | null;
authorizedSignatoryName?: string | null;
authorizedSignatoryRole?: string | null;
corporateOccupants?: { name: string; roleLabel?: string | null }[];
```

```ts
// in agreement prompt assembly
const corporateBlock =
  tenancy.leasePartyType === 'CORPORATE'
    ? `
Corporate Lease Party:
- Company: ${tenancy.companyName}
- Authorized Signatory: ${tenancy.authorizedSignatoryName}${tenancy.authorizedSignatoryRole ? ` (${tenancy.authorizedSignatoryRole})` : ''}
- Occupants:
${(tenancy.corporateOccupants ?? []).map((o) => `  - ${o.name}${o.roleLabel ? ` (${o.roleLabel})` : ''}`).join('\n')}
`
    : '';
```

- [ ] **Step 2: Enforce signatory-only legal agreement response**

```ts
// in src/app/api/agreements/[id]/respond/route.ts
if (
  agreement.tenancy.leasePartyType === 'CORPORATE' &&
  agreement.tenancy.authorizedSignatoryUserId !== session.user.id
) {
  return NextResponse.json(
    { error: 'Only the authorized signatory can complete the legal agreement response for this corporate tenancy.' },
    { status: 403 },
  );
}
```

- [ ] **Step 3: Update agreement UI copy for corporate tenancies**

```tsx
// TenantAgreementActions.tsx copy branch
const signingLabel = isCorporate
  ? 'Authorized signatory acknowledgement and digital signature'
  : 'Tenant acknowledgement and digital signature';
```

- [ ] **Step 4: Run verification**

Run: `npx.cmd tsc --noEmit`  
Expected: PASS

Run: `npm.cmd run lint`  
Expected: PASS with baseline warnings only

- [ ] **Step 5: Commit**

```bash
git add src/lib/gemini.ts src/app/api/agreements/generate/route.ts src/app/api/agreements/[id]/respond/route.ts src/components/ui/TenantAgreementActions.tsx src/components/ui/TenantAgreementSignatureProofUploader.tsx
git commit -m "feat: apply corporate rules to agreement workflow"
```

### Task 7: Expose Corporate Views and Update Manual Test Data

**Files:**
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\landlord\tenancies\[id]\page.tsx`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\app\(dashboard)\dashboard\tenant\tenancy\page.tsx`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\components\ui\AgreementViewer.tsx`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\src\lib\agreements\history.ts`
- Modify: `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia\test data.md`

- [ ] **Step 1: Add lease-party and occupant-roster sections to landlord and tenant detail pages**

```tsx
// landlord tenancy detail card
{tenancy.leasePartyType === 'CORPORATE' && (
  <>
    <CorporateSignatoryInvitationCard
      companyName={tenancy.companyName ?? 'Corporate tenant'}
      authorizedSignatoryName={tenancy.authorizedSignatoryName ?? 'Unknown signatory'}
    />
    <CorporateOccupantRosterManager
      tenancyId={tenancy.id}
      initialOccupants={tenancy.corporateOccupants}
      canManage={isLandlord || isAuthorizedSignatory}
    />
  </>
)}
```

- [ ] **Step 2: Add history event labels for corporate roster/signatory events**

```ts
// in src/lib/agreements/history.ts mapping
CORPORATE_SIGNATORY_LINKED: 'Authorized signatory linked',
CORPORATE_OCCUPANT_ADDED: 'Corporate occupant added',
CORPORATE_OCCUPANT_LINKED: 'Corporate occupant linked',
CORPORATE_OCCUPANT_REPLACED: 'Corporate occupant replaced',
CORPORATE_OCCUPANT_REMOVED: 'Corporate occupant removed',
```

- [ ] **Step 3: Expand manual test data with a restaurant-boss scenario**

```md
## Corporate Tenancy Test Scenario

- Company: `Restoran Maju Sdn Bhd`
- Authorized signatory: `boss@test.my`
- Occupants:
  - `Worker A`
  - `Worker B`
- Flow:
  1. Landlord creates a corporate tenancy for one room or entire unit.
  2. Boss accepts as authorized signatory.
  3. Boss completes digital signature.
  4. Boss uploads signed hard-copy proof.
  5. Landlord approves proof.
  6. Later, landlord or boss links `Worker A` and `Worker B` accounts.
```

- [ ] **Step 4: Run final verification**

Run: `npm.cmd run test -- tests/unit/corporate-tenancy.test.ts tests/unit/corporate-tenancy-access.test.ts`  
Expected: PASS

Run: `npx.cmd tsc --noEmit`  
Expected: PASS

Run: `npm.cmd run lint`  
Expected: PASS with baseline warnings only

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx src/components/ui/AgreementViewer.tsx src/lib/agreements/history.ts "test data.md"
git commit -m "feat: expose corporate tenancy workflow in UI"
```

## Self-Review

- Spec coverage:
  - active corporate workflow: Tasks 3-7
  - authorized signatory vs occupant separation: Tasks 2, 4, 6
  - room/unit-based tenancy model: Tasks 2-3
  - later staff linking: Task 5
  - dual-signature compatibility: Task 6
- Placeholder scan: no `TODO` or `TBD` placeholders included
- Type consistency:
  - `leasePartyType`: `INDIVIDUAL | CORPORATE`
  - `authorizedSignatoryUserId` kept consistent across tasks
  - `CorporateOccupantStatus`: `UNLINKED | LINKED | REPLACED | REMOVED`

