# Agreement Flow And Admin Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add agreement-local bilingual viewing, persistent agreement history/versioning, structured tenant change requests, tenant sign acknowledgement, landlord finalize checklist, and `.env`-only admin bootstrap.

**Architecture:** Persist the new agreement workflow state in dedicated Prisma models (`AgreementEvent`, `AgreementRevision`, `AgreementChangeRequest`) and surface it through small server-side helper functions that are called from the existing agreement APIs. Keep the bilingual change local to the agreement viewer by moving display-language state into the agreement UI instead of the session/profile layer, and isolate admin bootstrap behind one internal route that reads only `.env`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, NextAuth, Zod, Vitest

---

## File Structure

### New files

- `vitest.config.ts`
- `src/lib/agreements/history.ts`
- `src/lib/admin/bootstrap.ts`
- `src/components/ui/AgreementLanguageToggle.tsx`
- `src/components/ui/AgreementTimeline.tsx`
- `src/components/ui/AgreementFinalizeChecklist.tsx`
- `src/components/ui/TenantChangeRequestForm.tsx`
- `src/app/api/internal/bootstrap-admin/route.ts`
- `tests/lib/agreements/history.test.ts`
- `tests/lib/admin/bootstrap.test.ts`
- `tests/components/agreement-viewer-language.test.tsx`

### Modified files

- `package.json`
- `prisma/schema.prisma`
- `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`
- `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- `src/components/ui/AgreementViewer.tsx`
- `src/components/ui/AgreementEditor.tsx`
- `src/components/ui/TenantAgreementActions.tsx`
- `src/components/ui/TopNav.tsx`
- `src/components/ui/Sidebar.tsx`
- `src/app/api/agreements/generate/route.ts`
- `src/app/api/agreements/[id]/content/route.ts`
- `src/app/api/agreements/[id]/finalize/route.ts`
- `src/app/api/agreements/[id]/respond/route.ts`
- `prisma/seed.ts`

---

### Task 1: Add A Real Test Harness And Agreement/Admin Helpers

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `src/lib/agreements/history.ts`
- Create: `src/lib/admin/bootstrap.ts`
- Create: `tests/lib/agreements/history.test.ts`
- Create: `tests/lib/admin/bootstrap.test.ts`

- [ ] **Step 1: Write the failing helper tests**

```ts
// tests/lib/agreements/history.test.ts
import { describe, expect, it } from 'vitest';
import {
  buildAgreementEvent,
  buildAgreementRevision,
  isFinalizeBlocked,
} from '@/lib/agreements/history';

describe('agreement history helpers', () => {
  it('builds a generated event summary', () => {
    const event = buildAgreementEvent({
      agreementId: 'agreement_1',
      type: 'GENERATED',
      actorRole: 'LANDLORD',
      actorUserId: 'user_1',
      summary: 'Agreement generated from wizard answers',
    });

    expect(event.type).toBe('GENERATED');
    expect(event.summary).toContain('generated');
  });

  it('builds a versioned revision snapshot', () => {
    const revision = buildAgreementRevision({
      agreementId: 'agreement_1',
      versionNumber: 2,
      rawContent: 'Clause 1',
      plainLanguageSummary: 'Summary',
      plainLanguageSummaryMs: null,
      redFlags: '[]',
      redFlagsMs: null,
      createdByUserId: 'user_1',
    });

    expect(revision.versionNumber).toBe(2);
    expect(revision.rawContent).toBe('Clause 1');
  });

  it('blocks finalization when required checklist items are missing', () => {
    const result = isFinalizeBlocked({
      hasRawContent: true,
      isWizardComplete: true,
      hasReviewedRedFlags: false,
      unresolvedStructuredRequests: 1,
      hasRequiredIdentityData: true,
      isFinalizableStatus: true,
    });

    expect(result.blocked).toBe(true);
    expect(result.items.some((item) => item.key === 'review-red-flags')).toBe(true);
    expect(result.items.some((item) => item.key === 'resolve-change-requests')).toBe(true);
  });
});
```

```ts
// tests/lib/admin/bootstrap.test.ts
import { describe, expect, it } from 'vitest';
import { buildAdminBootstrapDecision } from '@/lib/admin/bootstrap';

describe('admin bootstrap decision', () => {
  it('requires ADMIN_EMAIL and ADMIN_PASSWORD', () => {
    const result = buildAdminBootstrapDecision({
      env: { ADMIN_EMAIL: '', ADMIN_PASSWORD: '', ADMIN_NAME: '' },
      existingUser: null,
    });

    expect(result.status).toBe('missing-env');
  });

  it('creates an admin when no user exists', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'Secret123!',
        ADMIN_NAME: 'RentalEase Admin',
      },
      existingUser: null,
    });

    expect(result.status).toBe('create');
    expect(result.email).toBe('admin@example.com');
  });

  it('promotes a matching non-admin user', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'Secret123!',
        ADMIN_NAME: 'RentalEase Admin',
      },
      existingUser: { id: 'user_1', role: 'TENANT', name: 'Alex' },
    });

    expect(result.status).toBe('promote');
    expect(result.userId).toBe('user_1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx.cmd vitest run tests/lib/agreements/history.test.ts tests/lib/admin/bootstrap.test.ts`

Expected: FAIL with module resolution errors because `vitest` and the helper modules do not exist yet.

- [ ] **Step 3: Add the minimal test harness**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

```json
// package.json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 4: Implement the minimal helper modules**

```ts
// src/lib/agreements/history.ts
export type AgreementEventType =
  | 'GENERATED'
  | 'EDITED'
  | 'FINALIZED'
  | 'REQUESTED_CHANGES'
  | 'SIGNED';

export type AgreementChecklistInput = {
  hasRawContent: boolean;
  isWizardComplete: boolean;
  hasReviewedRedFlags: boolean;
  unresolvedStructuredRequests: number;
  hasRequiredIdentityData: boolean;
  isFinalizableStatus: boolean;
};

export function buildAgreementEvent(input: {
  agreementId: string;
  type: AgreementEventType;
  actorRole: 'LANDLORD' | 'TENANT' | 'SYSTEM';
  actorUserId: string | null;
  summary: string;
}) {
  return {
    agreementId: input.agreementId,
    type: input.type,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    summary: input.summary,
    metadata: null,
  };
}

export function buildAgreementRevision(input: {
  agreementId: string;
  versionNumber: number;
  rawContent: string;
  plainLanguageSummary: string;
  plainLanguageSummaryMs: string | null;
  redFlags: string;
  redFlagsMs: string | null;
  createdByUserId: string | null;
}) {
  return input;
}

export function isFinalizeBlocked(input: AgreementChecklistInput) {
  const items = [
    {
      key: 'has-content',
      passed: input.hasRawContent,
      blocking: true,
    },
    {
      key: 'wizard-complete',
      passed: input.isWizardComplete,
      blocking: true,
    },
    {
      key: 'review-red-flags',
      passed: input.hasReviewedRedFlags,
      blocking: true,
    },
    {
      key: 'resolve-change-requests',
      passed: input.unresolvedStructuredRequests === 0,
      blocking: true,
    },
    {
      key: 'identity-ready',
      passed: input.hasRequiredIdentityData,
      blocking: true,
    },
    {
      key: 'status-finalizable',
      passed: input.isFinalizableStatus,
      blocking: true,
    },
  ];

  return {
    blocked: items.some((item) => item.blocking && !item.passed),
    items,
  };
}
```

```ts
// src/lib/admin/bootstrap.ts
export function buildAdminBootstrapDecision(input: {
  env: {
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_NAME?: string;
  };
  existingUser: { id: string; role: string; name: string } | null;
}) {
  const email = input.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';
  const password = input.env.ADMIN_PASSWORD?.trim() ?? '';
  const name = input.env.ADMIN_NAME?.trim() || 'RentalEase Admin';

  if (!email || !password) {
    return { status: 'missing-env' as const };
  }

  if (!input.existingUser) {
    return { status: 'create' as const, email, password, name };
  }

  if (input.existingUser.role !== 'ADMIN') {
    return {
      status: 'promote' as const,
      userId: input.existingUser.id,
      email,
      name,
    };
  }

  return { status: 'noop' as const, userId: input.existingUser.id, email, name };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx.cmd vitest run tests/lib/agreements/history.test.ts tests/lib/admin/bootstrap.test.ts`

Expected: PASS with 6 passing tests.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts src/lib/agreements/history.ts src/lib/admin/bootstrap.ts tests/lib/agreements/history.test.ts tests/lib/admin/bootstrap.test.ts
git commit -m "test: add agreement helper and admin bootstrap test harness"
```

### Task 2: Add Prisma Models For Revisions, Events, And Structured Change Requests

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/agreements/history.ts`
- Test: `tests/lib/agreements/history.test.ts`

- [ ] **Step 1: Extend the failing tests for structured requests**

```ts
// tests/lib/agreements/history.test.ts
it('normalizes a structured tenant change request payload', () => {
  const request = normalizeChangeRequest({
    category: 'UTILITIES',
    requestedChange: 'Clarify that water is included in rent',
    reason: 'The current wording is ambiguous',
    note: 'Please keep internet unchanged',
  });

  expect(request.category).toBe('UTILITIES');
  expect(request.note).toContain('internet');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx.cmd vitest run tests/lib/agreements/history.test.ts`

Expected: FAIL because `normalizeChangeRequest` does not exist.

- [ ] **Step 3: Add the Prisma schema models**

```prisma
// prisma/schema.prisma
model AgreementEvent {
  id          String   @id @default(cuid())
  agreementId String
  agreement   Agreement @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  type        AgreementEventType
  actorRole   Role
  actorUserId String?
  summary     String
  metadata    String?  @db.Text
  createdAt   DateTime @default(now())

  @@index([agreementId, createdAt])
}

model AgreementRevision {
  id                     String   @id @default(cuid())
  agreementId            String
  agreement              Agreement @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  versionNumber          Int
  rawContent             String   @db.Text
  plainLanguageSummary   String   @db.Text
  plainLanguageSummaryMs String?  @db.Text
  redFlags               String?  @db.Text
  redFlagsMs             String?  @db.Text
  createdByUserId        String?
  createdAt              DateTime @default(now())

  @@unique([agreementId, versionNumber])
}

model AgreementChangeRequest {
  id              String   @id @default(cuid())
  agreementId     String
  agreement       Agreement @relation(fields: [agreementId], references: [id], onDelete: Cascade)
  category        String
  requestedChange String   @db.Text
  reason          String   @db.Text
  note            String?  @db.Text
  status          ChangeRequestStatus @default(PENDING)
  createdByUserId String
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([agreementId, status])
}

enum AgreementEventType {
  GENERATED
  EDITED
  FINALIZED
  REQUESTED_CHANGES
  SIGNED
}

enum ChangeRequestStatus {
  PENDING
  RESOLVED
}
```

Also add the reverse relations on `Agreement`:

```prisma
events         AgreementEvent[]
revisions      AgreementRevision[]
changeRequests AgreementChangeRequest[]
```

- [ ] **Step 4: Implement the request normalizer helper**

```ts
// src/lib/agreements/history.ts
export function normalizeChangeRequest(input: {
  category: string;
  requestedChange: string;
  reason: string;
  note?: string | null;
}) {
  return {
    category: input.category.trim(),
    requestedChange: input.requestedChange.trim(),
    reason: input.reason.trim(),
    note: input.note?.trim() || null,
  };
}
```

- [ ] **Step 5: Run tests and generate the migration**

Run:
- `npx.cmd vitest run tests/lib/agreements/history.test.ts`
- `npx.cmd prisma format`
- `npx.cmd prisma migrate dev --name agreement-history-and-change-requests`

Expected:
- tests PASS
- Prisma schema formats cleanly
- a new migration file is created

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/agreements/history.ts tests/lib/agreements/history.test.ts
git commit -m "feat: add agreement history and change request schema"
```

### Task 3: Persist Agreement Events And Revisions In Existing APIs

**Files:**
- Modify: `src/app/api/agreements/generate/route.ts`
- Modify: `src/app/api/agreements/[id]/content/route.ts`
- Modify: `src/app/api/agreements/[id]/finalize/route.ts`
- Modify: `src/app/api/agreements/[id]/respond/route.ts`
- Modify: `src/lib/agreements/history.ts`
- Test: `tests/lib/agreements/history.test.ts`

- [ ] **Step 1: Add failing persistence tests for version numbering**

```ts
// tests/lib/agreements/history.test.ts
it('increments the next revision version number from prior revisions', () => {
  expect(getNextRevisionVersion([{ versionNumber: 1 }, { versionNumber: 2 }])).toBe(3);
  expect(getNextRevisionVersion([])).toBe(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx.cmd vitest run tests/lib/agreements/history.test.ts`

Expected: FAIL because `getNextRevisionVersion` does not exist.

- [ ] **Step 3: Add helper functions for event and revision writes**

```ts
// src/lib/agreements/history.ts
export function getNextRevisionVersion(
  revisions: Array<{ versionNumber: number }>,
) {
  if (revisions.length === 0) return 1;
  return Math.max(...revisions.map((revision) => revision.versionNumber)) + 1;
}
```

Add two Prisma-oriented helpers in the same module:

```ts
export function buildGeneratedRevisionPayload(input: {
  agreementId: string;
  versionNumber: number;
  rawContent: string;
  plainLanguageSummary: string;
  plainLanguageSummaryMs: string | null;
  redFlags: string | null;
  redFlagsMs: string | null;
  createdByUserId: string | null;
}) {
  return input;
}

export function buildEventSummary(type: AgreementEventType) {
  switch (type) {
    case 'GENERATED':
      return 'Agreement generated from wizard answers';
    case 'EDITED':
      return 'Landlord saved a revised agreement draft';
    case 'FINALIZED':
      return 'Landlord finalized the agreement for tenant review';
    case 'REQUESTED_CHANGES':
      return 'Tenant requested agreement changes';
    case 'SIGNED':
      return 'Tenant signed the agreement';
  }
}
```

- [ ] **Step 4: Update the API write paths minimally**

Use a transaction in each route to write the agreement row plus history rows.

Key code to add:

```ts
// src/app/api/agreements/generate/route.ts
const priorRevisions = existingAgreement
  ? await prisma.agreementRevision.findMany({
      where: { agreementId: existingAgreement.id },
      select: { versionNumber: true },
    })
  : [];

const versionNumber = getNextRevisionVersion(priorRevisions);
```

```ts
await prisma.$transaction(async (tx) => {
  const agreement = await tx.agreement.upsert({ /* existing payload */ });

  await tx.agreementRevision.create({
    data: buildGeneratedRevisionPayload({
      agreementId: agreement.id,
      versionNumber,
      rawContent: generated.rawContent,
      plainLanguageSummary: generated.plainLanguageSummary,
      plainLanguageSummaryMs,
      redFlags: generated.redFlags,
      redFlagsMs,
      createdByUserId: session.user.id,
    }),
  });

  await tx.agreementEvent.create({
    data: buildAgreementEvent({
      agreementId: agreement.id,
      type: 'GENERATED',
      actorRole: 'LANDLORD',
      actorUserId: session.user.id,
      summary: buildEventSummary('GENERATED'),
    }),
  });
});
```

Apply the same pattern to:
- content save: `EDITED` + new revision
- finalize: `FINALIZED` event only
- sign: `SIGNED` event only

- [ ] **Step 5: Run tests and targeted verification**

Run:
- `npx.cmd vitest run tests/lib/agreements/history.test.ts`
- `npx.cmd tsc --noEmit`

Expected:
- history tests PASS
- type-check PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/agreements/history.ts src/app/api/agreements/generate/route.ts src/app/api/agreements/[id]/content/route.ts src/app/api/agreements/[id]/finalize/route.ts src/app/api/agreements/[id]/respond/route.ts tests/lib/agreements/history.test.ts
git commit -m "feat: persist agreement events and revisions"
```

### Task 4: Add Tenant Structured Change Requests And Sign Acknowledgement

**Files:**
- Create: `src/components/ui/TenantChangeRequestForm.tsx`
- Modify: `src/components/ui/TenantAgreementActions.tsx`
- Modify: `src/app/api/agreements/[id]/respond/route.ts`
- Modify: `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- Test: `tests/components/agreement-viewer-language.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
// tests/components/agreement-viewer-language.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TenantAgreementActions from '@/components/ui/TenantAgreementActions';

it('disables sign until acknowledgement is checked', async () => {
  render(<TenantAgreementActions agreementId="agreement_1" />);

  const signButton = screen.getByRole('button', { name: /sign agreement/i });
  expect(signButton).toBeDisabled();

  await userEvent.click(screen.getByLabelText(/i have reviewed and understood/i));
  expect(signButton).toBeEnabled();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx.cmd vitest run tests/components/agreement-viewer-language.test.tsx`

Expected: FAIL because the current tenant action component does not render the acknowledgement checkbox.

- [ ] **Step 3: Update the tenant response API contract**

```ts
// src/app/api/agreements/[id]/respond/route.ts
const { action, negotiationNotes, signedAcknowledged, changeRequests } = body;

if (action === 'SIGN' && signedAcknowledged !== true) {
  return NextResponse.json(
    { error: 'You must acknowledge that you reviewed the agreement before signing.' },
    { status: 400 },
  );
}

if (action === 'REQUEST_CHANGES' && (!Array.isArray(changeRequests) || changeRequests.length === 0)) {
  return NextResponse.json(
    { error: 'Please add at least one structured change request.' },
    { status: 400 },
  );
}
```

Persist request rows with:

```ts
await tx.agreementChangeRequest.createMany({
  data: changeRequests.map((request: {
    category: string;
    requestedChange: string;
    reason: string;
    note?: string | null;
  }) => ({
    agreementId: id,
    createdByUserId: session.user.id,
    ...normalizeChangeRequest(request),
  })),
});
```

- [ ] **Step 4: Replace the tenant action UI with explicit panels**

Core structure to add in `src/components/ui/TenantAgreementActions.tsx`:

```tsx
const [signedAcknowledged, setSignedAcknowledged] = useState(false);
const [requests, setRequests] = useState([
  { category: 'UTILITIES', requestedChange: '', reason: '', note: '' },
]);

<label className="flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3">
  <input
    type="checkbox"
    checked={signedAcknowledged}
    onChange={(event) => setSignedAcknowledged(event.target.checked)}
    className="mt-1"
  />
  <span className="text-sm text-gray-700">
    I have reviewed and understood this agreement before signing.
  </span>
</label>

<button
  disabled={!signedAcknowledged || isSubmitting}
  onClick={() => submitAction('SIGN')}
>
  Sign Agreement
</button>
```

Render the new form component above the request-changes submit button:

```tsx
<TenantChangeRequestForm
  value={requests}
  onChange={setRequests}
/>
```

- [ ] **Step 5: Run tests and verify the tenant flow**

Run:
- `npx.cmd vitest run tests/components/agreement-viewer-language.test.tsx`
- `npx.cmd tsc --noEmit`

Expected:
- component test PASS
- type-check PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/TenantChangeRequestForm.tsx src/components/ui/TenantAgreementActions.tsx src/app/api/agreements/[id]/respond/route.ts src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx tests/components/agreement-viewer-language.test.tsx
git commit -m "feat: add structured agreement change requests and sign acknowledgement"
```

### Task 5: Add Agreement Timeline, Version UI, Finalize Checklist, And Local Language Toggle

**Files:**
- Create: `src/components/ui/AgreementLanguageToggle.tsx`
- Create: `src/components/ui/AgreementTimeline.tsx`
- Create: `src/components/ui/AgreementFinalizeChecklist.tsx`
- Modify: `src/components/ui/AgreementViewer.tsx`
- Modify: `src/components/ui/AgreementEditor.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- Modify: `src/components/ui/TopNav.tsx`
- Modify: `src/components/ui/Sidebar.tsx`
- Test: `tests/components/agreement-viewer-language.test.tsx`

- [ ] **Step 1: Extend the failing viewer test for local language**

```tsx
// tests/components/agreement-viewer-language.test.tsx
import AgreementViewer from '@/components/ui/AgreementViewer';

it('switches agreement-side text locally without relying on session language', async () => {
  render(
    <AgreementViewer
      agreementId="agreement_1"
      status="FINALIZED"
      rawContent="Clause 1"
      plainLanguageSummary="English summary"
      plainLanguageSummaryMs="Ringkasan Bahasa Malaysia"
      redFlags={[]}
      redFlagsMs={[]}
      tenantName="Aisyah"
      propertyAddress="Test Address"
      readOnly
    />,
  );

  expect(screen.getByText('English summary')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /bm/i }));
  expect(screen.getByText('Ringkasan Bahasa Malaysia')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx.cmd vitest run tests/components/agreement-viewer-language.test.tsx`

Expected: FAIL because `AgreementViewer` currently reads display language from props/session rather than local toggle state.

- [ ] **Step 3: Add the new UI components**

```tsx
// src/components/ui/AgreementLanguageToggle.tsx
export default function AgreementLanguageToggle({
  language,
  onChange,
}: {
  language: 'en' | 'ms';
  onChange: (language: 'en' | 'ms') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
      <button
        type="button"
        onClick={() => onChange('en')}
        className={language === 'en' ? 'bg-blue-600 px-3 py-2 text-white' : 'px-3 py-2 text-gray-600'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange('ms')}
        className={language === 'ms' ? 'bg-blue-600 px-3 py-2 text-white' : 'px-3 py-2 text-gray-600'}
      >
        BM
      </button>
    </div>
  );
}
```

```tsx
// src/components/ui/AgreementFinalizeChecklist.tsx
export default function AgreementFinalizeChecklist({
  items,
}: {
  items: Array<{ key: string; passed: boolean; blocking: boolean }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <h2 className="text-sm font-semibold text-gray-900">Ready to finalize</h2>
      <ul className="mt-3 space-y-2 text-sm text-gray-700">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span>{item.passed ? '✓' : '!'}</span>
            <span>{item.key}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Rework `AgreementViewer` and page composition**

Key changes:

```tsx
// src/components/ui/AgreementViewer.tsx
const [displayLanguage, setDisplayLanguage] = useState<'en' | 'ms'>('en');

const displaySummary =
  displayLanguage === 'ms' && plainLanguageSummaryMs
    ? plainLanguageSummaryMs
    : plainLanguageSummary;

const displayRedFlags =
  displayLanguage === 'ms' && redFlagsMs && redFlagsMs.length > 0
    ? redFlagsMs
    : redFlags;
```

Render:

```tsx
<AgreementLanguageToggle
  language={displayLanguage}
  onChange={setDisplayLanguage}
/>
```

Remove the language toggle logic from:
- `src/components/ui/TopNav.tsx`
- `src/components/ui/Sidebar.tsx`

Add timeline and checklist on the landlord agreement page using server-fetched events, revisions, and pending change requests.

- [ ] **Step 5: Run tests and full verification**

Run:
- `npx.cmd vitest run tests/components/agreement-viewer-language.test.tsx`
- `npm.cmd run lint`
- `npx.cmd tsc --noEmit`

Expected:
- component tests PASS
- lint exits without new errors
- type-check PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/AgreementLanguageToggle.tsx src/components/ui/AgreementTimeline.tsx src/components/ui/AgreementFinalizeChecklist.tsx src/components/ui/AgreementViewer.tsx src/components/ui/AgreementEditor.tsx src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx src/components/ui/TopNav.tsx src/components/ui/Sidebar.tsx tests/components/agreement-viewer-language.test.tsx
git commit -m "feat: add local agreement language toggle and workflow timeline"
```

### Task 6: Replace Seed/Script Admin Creation With `.env`-Only Internal Bootstrap

**Files:**
- Create: `src/app/api/internal/bootstrap-admin/route.ts`
- Modify: `src/lib/admin/bootstrap.ts`
- Modify: `prisma/seed.ts`
- Test: `tests/lib/admin/bootstrap.test.ts`

- [ ] **Step 1: Extend the failing bootstrap tests for idempotency**

```ts
// tests/lib/admin/bootstrap.test.ts
it('returns noop when the matching admin already exists', () => {
  const result = buildAdminBootstrapDecision({
    env: {
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_PASSWORD: 'Secret123!',
      ADMIN_NAME: 'RentalEase Admin',
    },
    existingUser: { id: 'user_1', role: 'ADMIN', name: 'Admin' },
  });

  expect(result.status).toBe('noop');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx.cmd vitest run tests/lib/admin/bootstrap.test.ts`

Expected: FAIL if `noop` handling is not yet covered in the implementation.

- [ ] **Step 3: Add the internal bootstrap route and retire seed behavior**

```ts
// src/app/api/internal/bootstrap-admin/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { buildAdminBootstrapDecision } from '@/lib/admin/bootstrap';

export async function POST() {
  const existingUser = await prisma.user.findUnique({
    where: { email: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '' },
    select: { id: true, role: true, name: true },
  });

  const decision = buildAdminBootstrapDecision({
    env: process.env,
    existingUser,
  });

  if (decision.status === 'missing-env') {
    return NextResponse.json({ error: 'Missing ADMIN_EMAIL or ADMIN_PASSWORD' }, { status: 400 });
  }

  if (decision.status === 'noop') {
    return NextResponse.json({ ok: true, status: 'noop' });
  }

  if (decision.status === 'promote') {
    await prisma.user.update({
      where: { id: decision.userId },
      data: { role: 'ADMIN', isVerified: true },
    });
    return NextResponse.json({ ok: true, status: 'promoted' });
  }

  const hashedPassword = await bcrypt.hash(decision.password, 12);
  await prisma.user.create({
    data: {
      name: decision.name,
      email: decision.email,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  return NextResponse.json({ ok: true, status: 'created' });
}
```

Replace `prisma/seed.ts` with a no-op notice:

```ts
console.warn('Admin bootstrap has moved to /api/internal/bootstrap-admin and reads only from .env');
```

- [ ] **Step 4: Run tests and build verification**

Run:
- `npx.cmd vitest run tests/lib/admin/bootstrap.test.ts`
- `npm.cmd run build`

Expected:
- bootstrap tests PASS
- production build PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/internal/bootstrap-admin/route.ts src/lib/admin/bootstrap.ts prisma/seed.ts tests/lib/admin/bootstrap.test.ts
git commit -m "feat: move admin bootstrap to env-only internal path"
```

## Self-Review

### Spec coverage

- Agreement-local bilingual toggle: Task 5
- Agreement history/versioning: Tasks 2, 3, 5
- Tenant sign acknowledgement: Task 4
- Structured change requests: Tasks 2, 4
- Landlord pre-finalize checklist: Tasks 1, 5
- `.env`-only admin bootstrap: Tasks 1, 6

No accepted spec section is left without a task.

### Placeholder scan

- No `TBD`, `TODO`, or deferred placeholders remain.
- Each task includes actual paths, commands, and code snippets.

### Type consistency

- Agreement event types are consistent across schema, helper, and API tasks.
- Change request shape uses the same keys across tests, helper, API, and UI tasks.
- Admin bootstrap decision states are consistent across helper and route tasks.

