# Condition Report Evidence and Dispute Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-acknowledgement condition report system with a structured evidence workflow — minimum photo/checklist requirements, three-way review decisions (accept / request correction / counter evidence), status-driven locking, and deposit settlement warnings.

**Architecture:** Add `ReportStatus`, `ReviewDecision`, and `ChecklistCompletionReason` enums; a new `EvidenceChecklistItem` model; and a `status` field on `ConditionReport` to drive locking and UI state. Five new API endpoints replace the old `/acknowledge` and add checklist, submit, request-correction, and counter-evidence actions. Frontend replaces the single Acknowledge button with status-aware cards showing progress indicators, a checklist editor, and three review actions.

**Tech Stack:** Next.js 16 App Router, Prisma ORM (PostgreSQL), NextAuth v4, Tailwind CSS v4, TypeScript. No automated test runner — verification is done with curl commands and browser testing.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `src/app/api/condition-reports/[id]/checklist/route.ts` |
| Create | `src/app/api/condition-reports/[id]/submit/route.ts` |
| Create | `src/app/api/condition-reports/[id]/accept/route.ts` |
| Create | `src/app/api/condition-reports/[id]/request-correction/route.ts` |
| Create | `src/app/api/condition-reports/[id]/counter-evidence/route.ts` |
| Modify | `src/app/api/condition-reports/route.ts` |
| Modify | `src/app/api/condition-reports/[id]/photos/route.ts` |
| Modify | `src/app/api/condition-reports/[id]/photos/[photoId]/route.ts` |
| Modify | `src/app/api/condition-reports/[id]/acknowledge/route.ts` |
| Create | `src/components/ui/ConditionEvidenceProgress.tsx` |
| Create | `src/components/ui/ConditionChecklistEditor.tsx` |
| Create | `src/components/ui/ConditionReviewActions.tsx` |
| Modify | `src/components/ui/ConditionReportCard.tsx` |
| Modify | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx` |
| Modify | `src/app/(dashboard)/dashboard/tenant/conditions/page.tsx` |
| Modify | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/deposit-settlement/page.tsx` |

---

## Task 1: Prisma Schema — New Enums, Model, and Fields

**Files:**
- Modify: `prisma/schema.prisma`

### What to add

**Step 1: Add new enums**

- [ ] In `prisma/schema.prisma`, after the `enum ReportType` block (currently around line 415), add:

```prisma
enum ReportStatus {
  DRAFT
  SUBMITTED
  PENDING_REVIEW
  CORRECTION_REQUESTED
  COUNTER_EVIDENCE_ADDED
  ACCEPTED
  DISPUTED
  LOCKED
}

enum ReviewDecision {
  ACCEPTED
  CORRECTION_REQUESTED
  COUNTER_EVIDENCE_ADDED
}

enum ChecklistCompletionReason {
  PHOTO_UPLOADED
  NO_ISSUE_OBSERVED
  NOT_APPLICABLE
  CANNOT_ACCESS
}
```

- [ ] Add new `NotificationType` values to the existing `enum NotificationType` block (after `CONDITION_REPORT_ACKNOWLEDGED`):

```prisma
  CONDITION_REPORT_SUBMITTED
  CONDITION_REPORT_CORRECTION_REQUESTED
  CONDITION_REPORT_COUNTER_EVIDENCE
  CONDITION_REPORT_ACCEPTED
  CONDITION_REPORT_DISPUTED
```

**Step 2: Extend `ConditionReport` model**

- [ ] Replace the current `ConditionReport` model with:

```prisma
model ConditionReport {
  id             String         @id @default(cuid())
  type           ReportType
  notes          String?        @db.Text
  status         ReportStatus   @default(DRAFT)
  submittedAt    DateTime?
  reviewDecision ReviewDecision?
  reviewedAt     DateTime?
  correctionNote String?        @db.Text
  counterNote    String?        @db.Text
  acknowledgedAt DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  tenancyId String
  tenancy   Tenancy @relation(fields: [tenancyId], references: [id], onDelete: Cascade)

  createdById String
  createdBy   User   @relation("CreatedReports", fields: [createdById], references: [id])

  acknowledgedById String?
  acknowledgedBy   User?   @relation("AcknowledgedReports", fields: [acknowledgedById], references: [id])

  reviewedById String?
  reviewedBy   User?   @relation("ReviewedReports", fields: [reviewedById], references: [id])

  photos         ConditionPhoto[]
  checklistItems EvidenceChecklistItem[]
}
```

**Step 3: Add `EvidenceChecklistItem` model**

- [ ] After the `ConditionPhoto` model block, add:

```prisma
// ─── EVIDENCE CHECKLIST ──────────────────────────────────────────────────────
model EvidenceChecklistItem {
  id               String                    @id @default(cuid())
  area             String
  completionReason ChecklistCompletionReason
  createdAt        DateTime                  @default(now())
  updatedAt        DateTime                  @updatedAt

  reportId String
  report   ConditionReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@unique([reportId, area])
}
```

**Step 4: Add `reviewedReports` back-relation to the `User` model**

- [ ] Find the `User` model in `prisma/schema.prisma`. It already has `createdReports` and `acknowledgedReports` relation fields. Add alongside them:

```prisma
  reviewedReports  ConditionReport[] @relation("ReviewedReports")
```

**Step 5: Run migration**

- [ ] Run:
```bash
npx prisma migrate dev --name add-report-workflow
```

Expected output: `Your database is now in sync with your schema.` and a new migration file in `prisma/migrations/`.

- [ ] Verify Prisma client generated successfully (no TypeScript errors):
```bash
npx tsc --noEmit
```

---

## Task 2: Data Migration — Set Status on Existing Reports

**Files:**
- Modify: the generated migration SQL file from Task 1 (e.g. `prisma/migrations/<timestamp>_add_report_workflow/migration.sql`)

The schema migration creates the `status` column with `DEFAULT 'DRAFT'` so all existing rows get DRAFT. We need to correct this for reports that were already acknowledged or had photos.

- [ ] Open the migration SQL file generated in Task 1 and append the following SQL at the end:

```sql
-- Migrate existing acknowledged reports → ACCEPTED status
UPDATE "ConditionReport"
SET
  status = 'ACCEPTED',
  "reviewDecision" = 'ACCEPTED',
  "reviewedAt" = "acknowledgedAt",
  "reviewedById" = "acknowledgedById"
WHERE "acknowledgedAt" IS NOT NULL;

-- Reports with photos but not yet acknowledged → SUBMITTED
UPDATE "ConditionReport"
SET status = 'SUBMITTED'
WHERE "acknowledgedAt" IS NULL
  AND id IN (
    SELECT DISTINCT "reportId" FROM "ConditionPhoto"
  );

-- Reports with no photos remain DRAFT (already set by DEFAULT)
```

- [ ] Re-run the migration to apply the data changes:
```bash
npx prisma migrate dev
```

Expected: `Already in sync` or applies the updated migration. If the migration was already applied, reset with `npx prisma migrate reset` (dev only — this drops and re-creates the DB).

- [ ] Spot-check via Prisma Studio:
```bash
npx prisma studio
```
Open `ConditionReport` table. Verify rows with `acknowledgedAt` set show `status = ACCEPTED`, rows with photos but no `acknowledgedAt` show `status = SUBMITTED`, rows with no photos show `status = DRAFT`.

---

## Task 3: Checklist API — POST `/api/condition-reports/[id]/checklist`

**Files:**
- Create: `src/app/api/condition-reports/[id]/checklist/route.ts`

This endpoint upserts a checklist item for a given area on a draft or correction-requested report.

- [ ] Create the file with this content:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];

const VALID_REASONS = [
  'PHOTO_UPLOADED',
  'NO_ISSUE_OBSERVED',
  'NOT_APPLICABLE',
  'CANNOT_ACCESS',
] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: reportId } = await params;
  const body = await request.json();
  const { area, completionReason } = body;

  if (!area || typeof area !== 'string' || area.trim().length === 0)
    return NextResponse.json({ error: 'area is required' }, { status: 400 });

  if (!VALID_REASONS.includes(completionReason))
    return NextResponse.json(
      { error: `completionReason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 },
    );

  const report = await prisma.conditionReport.findFirst({
    where: {
      id: reportId,
      tenancy: {
        OR: [
          { tenantId: session.user.id },
          { room: { property: { landlordId: session.user.id } } },
        ],
      },
    },
    select: { id: true, status: true },
  });

  if (!report)
    return NextResponse.json(
      { error: 'Report not found or access denied' },
      { status: 404 },
    );

  if (LOCKED_STATUSES.includes(report.status))
    return NextResponse.json(
      { error: 'This report is locked and cannot be modified.' },
      { status: 409 },
    );

  const item = await prisma.evidenceChecklistItem.upsert({
    where: { reportId_area: { reportId, area: area.trim() } },
    create: { reportId, area: area.trim(), completionReason },
    update: { completionReason },
  });

  return NextResponse.json(item, { status: 200 });
}
```

- [ ] Verify it compiles:
```bash
npx tsc --noEmit
```

---

## Task 4: Submit API — PATCH `/api/condition-reports/[id]/submit`

**Files:**
- Create: `src/app/api/condition-reports/[id]/submit/route.ts`

This endpoint validates minimum evidence and transitions the report to `PENDING_REVIEW`.

- [ ] Create the file:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

const MOVE_IN_OUT_MIN_PHOTOS = 6;
const MOVE_IN_OUT_MIN_CHECKLIST = 4;
const INSPECTION_MIN_PHOTOS = 1;

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const report = await prisma.conditionReport.findFirst({
    where: {
      id,
      createdById: session.user.id,
    },
    include: {
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: { select: { landlordId: true, address: true } },
            },
          },
        },
      },
      _count: {
        select: { photos: true, checklistItems: true },
      },
    },
  });

  if (!report)
    return NextResponse.json(
      { error: 'Report not found or you are not the creator' },
      { status: 404 },
    );

  if (!['DRAFT', 'CORRECTION_REQUESTED'].includes(report.status))
    return NextResponse.json(
      { error: 'Only DRAFT or CORRECTION_REQUESTED reports can be submitted.' },
      { status: 409 },
    );

  const photoCount = report._count.photos;
  const checklistCount = report._count.checklistItems;

  if (report.type !== 'INSPECTION') {
    if (photoCount < MOVE_IN_OUT_MIN_PHOTOS)
      return NextResponse.json(
        { error: `At least ${MOVE_IN_OUT_MIN_PHOTOS} photos are required for a ${report.type.replace('_', '-').toLowerCase()} report. Currently: ${photoCount}.` },
        { status: 422 },
      );
    if (checklistCount < MOVE_IN_OUT_MIN_CHECKLIST)
      return NextResponse.json(
        { error: `At least ${MOVE_IN_OUT_MIN_CHECKLIST} evidence areas must be completed. Currently: ${checklistCount}.` },
        { status: 422 },
      );
  } else {
    if (photoCount < INSPECTION_MIN_PHOTOS)
      return NextResponse.json(
        { error: 'At least 1 photo is required for an inspection report.' },
        { status: 422 },
      );
  }

  await prisma.conditionReport.update({
    where: { id },
    data: {
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
      correctionNote: null,
    },
  });

  const landlordId = report.tenancy.room.property.landlordId;
  const isCreatorLandlord = landlordId === session.user.id;
  const reportTypeLabel =
    report.type === 'MOVE_IN' ? 'Move-in'
    : report.type === 'MOVE_OUT' ? 'Move-out'
    : 'Inspection';

  if (isCreatorLandlord) {
    await createNotification(
      report.tenancy.tenant.id,
      'CONDITION_REPORT_SUBMITTED',
      `${reportTypeLabel} condition report ready for review`,
      `Your landlord submitted a ${reportTypeLabel.toLowerCase()} condition report for ${report.tenancy.room.property.address}. Please review and respond.`,
      `/dashboard/tenant/conditions`,
    );
  } else {
    await createNotification(
      landlordId,
      'CONDITION_REPORT_SUBMITTED',
      `${reportTypeLabel} condition report ready for review`,
      `${report.tenancy.tenant.name} submitted a ${reportTypeLabel.toLowerCase()} condition report. Please review and respond.`,
      `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`,
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] Verify:
```bash
npx tsc --noEmit
```

---

## Task 5: Accept API — PATCH `/api/condition-reports/[id]/accept`

**Files:**
- Create: `src/app/api/condition-reports/[id]/accept/route.ts`
- Modify: `src/app/api/condition-reports/[id]/acknowledge/route.ts`

The new `/accept` endpoint replaces `/acknowledge`. Update the old endpoint to delegate to the same logic so any cached UI calls still work.

- [ ] Create `src/app/api/condition-reports/[id]/accept/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const report = await prisma.conditionReport.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: { select: { landlordId: true, address: true } },
            },
          },
        },
      },
      _count: { select: { photos: true } },
    },
  });

  if (!report)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const landlordId = report.tenancy.room.property.landlordId;
  const tenantId = report.tenancy.tenant.id;
  const isLandlord = landlordId === session.user.id;
  const isTenant = tenantId === session.user.id;

  if (!isLandlord && !isTenant)
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  if (report.createdById === session.user.id)
    return NextResponse.json(
      { error: 'You cannot accept your own report.' },
      { status: 400 },
    );

  if (!['SUBMITTED', 'PENDING_REVIEW', 'COUNTER_EVIDENCE_ADDED'].includes(report.status))
    return NextResponse.json(
      { error: 'This report is not in a reviewable state.' },
      { status: 409 },
    );

  if (report._count.photos === 0)
    return NextResponse.json(
      { error: 'A report with no photos cannot be accepted.' },
      { status: 422 },
    );

  const now = new Date();
  await prisma.conditionReport.update({
    where: { id },
    data: {
      status: 'ACCEPTED',
      reviewDecision: 'ACCEPTED',
      reviewedAt: now,
      reviewedById: session.user.id,
      acknowledgedAt: now,
      acknowledgedById: session.user.id,
    },
  });

  const creatorRole = report.createdBy.role === 'LANDLORD' ? 'landlord' : 'tenant';
  const reportTypeLabel =
    report.type === 'MOVE_IN' ? 'Move-in'
    : report.type === 'MOVE_OUT' ? 'Move-out'
    : 'Inspection';

  await createNotification(
    report.createdBy.id,
    'CONDITION_REPORT_ACCEPTED',
    `${reportTypeLabel} condition report accepted`,
    `${session.user.name ?? 'The other party'} accepted your ${reportTypeLabel.toLowerCase()} condition report for ${report.tenancy.room.property.address}.`,
    creatorRole === 'landlord'
      ? `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`
      : `/dashboard/tenant/conditions`,
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] Update `src/app/api/condition-reports/[id]/acknowledge/route.ts` to delegate to the accept logic. Replace the entire file content with:

```typescript
// Legacy endpoint — delegates to the new accept route logic.
// Kept so existing UI that still calls /acknowledge continues to work.
export { PATCH } from '@/app/api/condition-reports/[id]/accept/route';
```

- [ ] Verify:
```bash
npx tsc --noEmit
```

---

## Task 6: Request Correction API — PATCH `/api/condition-reports/[id]/request-correction`

**Files:**
- Create: `src/app/api/condition-reports/[id]/request-correction/route.ts`

- [ ] Create the file:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { correctionNote } = body;

  if (!correctionNote || typeof correctionNote !== 'string' || correctionNote.trim().length === 0)
    return NextResponse.json(
      { error: 'correctionNote is required and must not be empty.' },
      { status: 400 },
    );

  const report = await prisma.conditionReport.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: { select: { landlordId: true, address: true } },
            },
          },
        },
      },
    },
  });

  if (!report)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const landlordId = report.tenancy.room.property.landlordId;
  const tenantId = report.tenancy.tenant.id;
  const isLandlord = landlordId === session.user.id;
  const isTenant = tenantId === session.user.id;

  if (!isLandlord && !isTenant)
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  if (report.createdById === session.user.id)
    return NextResponse.json(
      { error: 'You cannot request correction on your own report.' },
      { status: 400 },
    );

  if (!['SUBMITTED', 'PENDING_REVIEW'].includes(report.status))
    return NextResponse.json(
      { error: 'This report is not in a reviewable state.' },
      { status: 409 },
    );

  await prisma.conditionReport.update({
    where: { id },
    data: {
      status: 'CORRECTION_REQUESTED',
      reviewDecision: 'CORRECTION_REQUESTED',
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      correctionNote: correctionNote.trim(),
    },
  });

  const reportTypeLabel =
    report.type === 'MOVE_IN' ? 'Move-in'
    : report.type === 'MOVE_OUT' ? 'Move-out'
    : 'Inspection';
  const creatorRole = report.createdBy.role === 'LANDLORD' ? 'landlord' : 'tenant';

  await createNotification(
    report.createdBy.id,
    'CONDITION_REPORT_CORRECTION_REQUESTED',
    `Correction requested for ${reportTypeLabel.toLowerCase()} condition report`,
    `${session.user.name ?? 'The other party'} requested corrections: "${correctionNote.trim().slice(0, 100)}"`,
    creatorRole === 'landlord'
      ? `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`
      : `/dashboard/tenant/conditions`,
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] Verify:
```bash
npx tsc --noEmit
```

---

## Task 7: Counter Evidence API — PATCH `/api/condition-reports/[id]/counter-evidence`

**Files:**
- Create: `src/app/api/condition-reports/[id]/counter-evidence/route.ts`

Counter photos are uploaded via the existing `POST /photos` endpoint before calling this endpoint. This endpoint sets the counter note and transitions the status to `DISPUTED`.

- [ ] Create the file:

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { counterNote } = body;

  const report = await prisma.conditionReport.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      tenancy: {
        include: {
          tenant: { select: { id: true, name: true } },
          room: {
            include: {
              property: { select: { landlordId: true, address: true } },
            },
          },
        },
      },
    },
  });

  if (!report)
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const landlordId = report.tenancy.room.property.landlordId;
  const tenantId = report.tenancy.tenant.id;
  const isLandlord = landlordId === session.user.id;
  const isTenant = tenantId === session.user.id;

  if (!isLandlord && !isTenant)
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  if (report.createdById === session.user.id)
    return NextResponse.json(
      { error: 'You cannot add counter evidence to your own report.' },
      { status: 400 },
    );

  if (!['SUBMITTED', 'PENDING_REVIEW', 'COUNTER_EVIDENCE_ADDED'].includes(report.status))
    return NextResponse.json(
      { error: 'This report is not in a reviewable state.' },
      { status: 409 },
    );

  // Reviewer must have either uploaded at least one photo or provided a counter note
  const counterPhotoCount = await prisma.conditionPhoto.count({
    where: { reportId: id, uploadedById: session.user.id },
  });

  const hasNote = typeof counterNote === 'string' && counterNote.trim().length > 0;
  if (!hasNote && counterPhotoCount === 0)
    return NextResponse.json(
      { error: 'Counter evidence must include a note or at least one uploaded photo.' },
      { status: 422 },
    );

  await prisma.conditionReport.update({
    where: { id },
    data: {
      status: 'DISPUTED',
      reviewDecision: 'COUNTER_EVIDENCE_ADDED',
      reviewedAt: new Date(),
      reviewedById: session.user.id,
      counterNote: hasNote ? counterNote.trim() : null,
    },
  });

  const reportTypeLabel =
    report.type === 'MOVE_IN' ? 'Move-in'
    : report.type === 'MOVE_OUT' ? 'Move-out'
    : 'Inspection';
  const creatorRole = report.createdBy.role === 'LANDLORD' ? 'landlord' : 'tenant';

  await createNotification(
    report.createdBy.id,
    'CONDITION_REPORT_COUNTER_EVIDENCE',
    `Counter evidence added to ${reportTypeLabel.toLowerCase()} condition report`,
    `${session.user.name ?? 'The other party'} added counter evidence to your ${reportTypeLabel.toLowerCase()} condition report. The report is now marked as disputed.`,
    creatorRole === 'landlord'
      ? `/dashboard/landlord/tenancies/${report.tenancyId}/conditions`
      : `/dashboard/tenant/conditions`,
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] Verify:
```bash
npx tsc --noEmit
```

---

## Task 8: Update Photo Routes — Status-Based Locking

**Files:**
- Modify: `src/app/api/condition-reports/[id]/photos/route.ts`
- Modify: `src/app/api/condition-reports/[id]/photos/[photoId]/route.ts`

Replace the `acknowledgedAt` lock check with a status-based check. Locked statuses are `ACCEPTED`, `DISPUTED`, and `LOCKED`.

- [ ] In `src/app/api/condition-reports/[id]/photos/route.ts`, replace the lock check block:

Old:
```typescript
  if (report.acknowledgedAt)
    return NextResponse.json(
      {
        error:
          'This report has already been acknowledged. No further changes are allowed.',
      },
      { status: 409 },
    );
```

New:
```typescript
  const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];
  if (LOCKED_STATUSES.includes(report.status))
    return NextResponse.json(
      { error: 'This report is locked. No further changes are allowed.' },
      { status: 409 },
    );
```

- [ ] Also update the `findFirst` select so `status` is fetched instead of only checking `acknowledgedAt`. The current query uses `where` only (no `select`), so `report` returns all fields. No change needed there — `report.status` will be available automatically after the schema migration.

- [ ] In `src/app/api/condition-reports/[id]/photos/[photoId]/route.ts`, replace the photo include and lock check:

Old include:
```typescript
    include: {
      report: {
        select: { acknowledgedAt: true },
      },
    },
```

New include:
```typescript
    include: {
      report: {
        select: { status: true },
      },
    },
```

Old lock check:
```typescript
  if (photo.report.acknowledgedAt)
    return NextResponse.json(
      {
        error:
          'This report has been acknowledged and can no longer be modified.',
      },
      { status: 409 },
    );
```

New lock check:
```typescript
  const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];
  if (LOCKED_STATUSES.includes(photo.report.status))
    return NextResponse.json(
      { error: 'This report is locked and can no longer be modified.' },
      { status: 409 },
    );
```

- [ ] Verify:
```bash
npx tsc --noEmit
```

---

## Task 9: Update GET `/api/condition-reports` — Include New Fields

**Files:**
- Modify: `src/app/api/condition-reports/route.ts`

Update the `findMany` include so the response includes `status`, `submittedAt`, `reviewedAt`, `reviewedBy`, `correctionNote`, `counterNote`, and `checklistItems`.

- [ ] In the `GET` handler's `findMany` call, replace the `include` block:

Old:
```typescript
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      photos: {
        orderBy: { createdAt: 'asc' },
      },
    },
```

New:
```typescript
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      photos: { orderBy: { createdAt: 'asc' } },
      checklistItems: { orderBy: { area: 'asc' } },
    },
```

- [ ] Verify:
```bash
npx tsc --noEmit
```

---

## Task 10: `ConditionEvidenceProgress` Component

**Files:**
- Create: `src/components/ui/ConditionEvidenceProgress.tsx`

A read-only progress bar showing how close the report is to the minimum submission requirements.

- [ ] Create the file:

```typescript
'use client';

interface Props {
  reportType: 'MOVE_IN' | 'MOVE_OUT' | 'INSPECTION';
  photoCount: number;
  checklistCount: number;
}

const MOVE_IN_OUT_MIN_PHOTOS = 6;
const MOVE_IN_OUT_MIN_CHECKLIST = 4;
const INSPECTION_MIN_PHOTOS = 1;

export default function ConditionEvidenceProgress({
  reportType,
  photoCount,
  checklistCount,
}: Props) {
  const isStrict = reportType !== 'INSPECTION';
  const minPhotos = isStrict ? MOVE_IN_OUT_MIN_PHOTOS : INSPECTION_MIN_PHOTOS;
  const minChecklist = isStrict ? MOVE_IN_OUT_MIN_CHECKLIST : 0;

  const photoProgress = Math.min(photoCount / minPhotos, 1);
  const photoMet = photoCount >= minPhotos;

  const checklistProgress = minChecklist > 0 ? Math.min(checklistCount / minChecklist, 1) : 1;
  const checklistMet = checklistCount >= minChecklist;

  return (
    <div className="space-y-3 py-3">
      {/* Photos progress */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-600">Photos</span>
          <span className={`text-xs font-semibold ${photoMet ? 'text-green-600' : 'text-amber-600'}`}>
            {photoCount} / {minPhotos} minimum
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${photoMet ? 'bg-green-500' : 'bg-amber-400'}`}
            style={{ width: `${photoProgress * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist progress — only for move-in/out */}
      {isStrict && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-600">Evidence areas</span>
            <span className={`text-xs font-semibold ${checklistMet ? 'text-green-600' : 'text-amber-600'}`}>
              {checklistCount} / {minChecklist} required
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${checklistMet ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${checklistProgress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 11: `ConditionChecklistEditor` Component

**Files:**
- Create: `src/components/ui/ConditionChecklistEditor.tsx`

An interactive checklist that lets the creator mark required evidence areas. Calls `POST /api/condition-reports/[id]/checklist`.

- [ ] Create the file:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_AREAS = [
  'Bedroom / Rented Room',
  'Bathroom',
  'Kitchen / Shared Area',
  'Door, Lock and Keys',
  'Walls, Floor and Ceiling',
  'Furniture / Appliances',
];

const REASON_OPTIONS = [
  { value: 'PHOTO_UPLOADED', label: 'Photo uploaded' },
  { value: 'NO_ISSUE_OBSERVED', label: 'No issue observed' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
  { value: 'CANNOT_ACCESS', label: 'Cannot access' },
] as const;

type CompletionReason = typeof REASON_OPTIONS[number]['value'];

interface ChecklistItem {
  area: string;
  completionReason: CompletionReason;
}

interface Props {
  reportId: string;
  existingItems: ChecklistItem[];
}

export default function ConditionChecklistEditor({ reportId, existingItems }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completedAreas = new Map(existingItems.map((i) => [i.area, i.completionReason]));

  const handleSelect = async (area: string, completionReason: CompletionReason) => {
    setSaving(area);
    setError(null);

    try {
      const res = await fetch(`/api/condition-reports/${reportId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, completionReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save. Please try again.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-700 mb-1">Evidence Checklist</p>
      <p className="text-xs text-gray-500 mb-4">
        Mark how you have documented each required area.
      </p>

      <div className="space-y-3">
        {DEFAULT_AREAS.map((area) => {
          const current = completedAreas.get(area);
          const isSaving = saving === area;

          return (
            <div key={area} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${current ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{area}</span>
              <select
                value={current ?? ''}
                onChange={(e) => handleSelect(area, e.target.value as CompletionReason)}
                disabled={isSaving}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="" disabled>Select…</option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
    </div>
  );
}
```

---

## Task 12: `ConditionReviewActions` Component

**Files:**
- Create: `src/components/ui/ConditionReviewActions.tsx`

The three-action review panel shown to the non-creator when the report is in `PENDING_REVIEW` or similar states.

- [ ] Create the file:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  reportId: string;
}

type Action = 'accept' | 'correction' | 'counter' | null;

export default function ConditionReviewActions({ reportId }: Props) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<Action>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [counterNote, setCounterNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/accept`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to accept.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCorrection = async () => {
    if (!correctionNote.trim()) {
      setError('Please describe what needs to be corrected.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/request-correction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctionNote: correctionNote.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to request correction.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCounterEvidence = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/counter-evidence`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterNote: counterNote.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit counter evidence.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Review this report and choose an action:
      </p>

      {/* Accept */}
      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Accept Report</p>
            <p className="text-xs text-green-600 mt-0.5">
              Confirms you reviewed the evidence and agree with the documented condition.
            </p>
          </div>
          <button
            onClick={() => { setActiveAction('accept'); handleAccept(); }}
            disabled={loading}
            className="ml-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {loading && activeAction === 'accept' ? 'Accepting…' : 'Accept'}
          </button>
        </div>
      </div>

      {/* Request Correction */}
      <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Request Correction</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Ask the creator to add missing or clearer evidence.
            </p>
          </div>
          <button
            onClick={() => setActiveAction(activeAction === 'correction' ? null : 'correction')}
            className="ml-4 border border-amber-400 text-amber-700 hover:bg-amber-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Request
          </button>
        </div>
        {activeAction === 'correction' && (
          <div className="mt-3 space-y-2">
            <textarea
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="e.g. Missing bathroom photos. The wall photo is too blurry."
              rows={3}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={handleRequestCorrection}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading && activeAction === 'correction' ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        )}
      </div>

      {/* Counter Evidence */}
      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-800">Add Counter Evidence</p>
            <p className="text-xs text-red-600 mt-0.5">
              Upload your own photos (using Add Photos above) then submit a note explaining your disagreement.
            </p>
          </div>
          <button
            onClick={() => setActiveAction(activeAction === 'counter' ? null : 'counter')}
            className="ml-4 border border-red-300 text-red-700 hover:bg-red-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Dispute
          </button>
        </div>
        {activeAction === 'counter' && (
          <div className="mt-3 space-y-2">
            <textarea
              value={counterNote}
              onChange={(e) => setCounterNote(e.target.value)}
              placeholder="e.g. The wall damage shown was pre-existing when I moved in."
              rows={3}
              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <button
              onClick={handleCounterEvidence}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {loading && activeAction === 'counter' ? 'Submitting…' : 'Submit Counter Evidence'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
```

---

## Task 13: Rewrite `ConditionReportCard`

**Files:**
- Modify: `src/components/ui/ConditionReportCard.tsx`

Replace the single Acknowledge button with status badges, evidence progress, correction/dispute notes, and conditional `ConditionReviewActions`.

- [ ] Replace the entire file content with:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ConditionEvidenceProgress from '@/components/ui/ConditionEvidenceProgress';
import ConditionReviewActions from '@/components/ui/ConditionReviewActions';

interface Photo {
  id: string;
  room: string;
  imageUrl: string;
  caption: string | null;
  uploadedById: string;
}

interface ChecklistItem {
  area: string;
  completionReason: string;
}

interface Props {
  reportId: string;
  type: 'MOVE_IN' | 'MOVE_OUT' | 'INSPECTION';
  status: string;
  notes: string | null;
  correctionNote: string | null;
  counterNote: string | null;
  createdAt: string;
  createdByName: string;
  createdByRole: string;
  createdById: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  photos: Photo[];
  checklistItems: ChecklistItem[];
  currentUserId: string;
}

const TYPE_LABELS: Record<string, string> = {
  MOVE_IN: 'Move-In',
  MOVE_OUT: 'Move-Out',
  INSPECTION: 'Inspection',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700' },
  CORRECTION_REQUESTED: { label: 'Correction Requested', className: 'bg-orange-100 text-orange-700' },
  COUNTER_EVIDENCE_ADDED: { label: 'Counter Evidence', className: 'bg-purple-100 text-purple-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  DISPUTED: { label: 'Disputed', className: 'bg-red-100 text-red-700' },
  LOCKED: { label: 'Locked', className: 'bg-gray-200 text-gray-700' },
};

function DeletePhotoButton({ reportId, photoId }: { reportId: string; photoId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch { /* silent fail */ } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
      title="Delete photo"
    >
      {isDeleting ? '…' : '×'}
    </button>
  );
}

function SubmitForReviewButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/submit`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit for Review'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function ConditionReportCard({
  reportId, type, status, notes, correctionNote, counterNote,
  createdAt, createdByName, createdByRole, createdById,
  reviewedAt, reviewedByName, photos, checklistItems, currentUserId,
}: Props) {
  const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];
  const isLocked = LOCKED_STATUSES.includes(status);
  const isCreator = createdById === currentUserId;
  const canReview = !isCreator && ['SUBMITTED', 'PENDING_REVIEW', 'COUNTER_EVIDENCE_ADDED'].includes(status);
  const canSubmit = isCreator && ['DRAFT', 'CORRECTION_REQUESTED'].includes(status);

  const badge = STATUS_BADGE[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  const typeLabel = TYPE_LABELS[type] ?? type;

  const photosByRoom = photos.reduce<Record<string, Photo[]>>((acc, p) => {
    if (!acc[p.room]) acc[p.room] = [];
    acc[p.room].push(p);
    return acc;
  }, {});

  const creatorPhotos = photos.filter((p) => p.uploadedById === createdById);
  const counterPhotos = photos.filter((p) => p.uploadedById !== createdById);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const renderPhotoGrid = (photoList: Photo[], showDelete: boolean) => {
    const byRoom = photoList.reduce<Record<string, Photo[]>>((acc, p) => {
      if (!acc[p.room]) acc[p.room] = [];
      acc[p.room].push(p);
      return acc;
    }, {});

    return Object.keys(byRoom).sort().map((room) => (
      <div key={room}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{room}</p>
        <div className="flex flex-wrap gap-3">
          {byRoom[room].map((photo) => (
            <div key={photo.id} className="group relative">
              <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer"
                className="relative block w-28 h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                title={photo.caption ?? `${room} photo`}>
                <Image src={photo.imageUrl} alt={photo.caption ?? `${room} condition`}
                  fill className="object-cover" sizes="112px" />
              </a>
              {showDelete && !isLocked && (
                <DeletePhotoButton reportId={reportId} photoId={photo.id} />
              )}
              {photo.caption && (
                <p className="text-xs text-gray-500 mt-1 max-w-[112px] truncate">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">{typeLabel} Report</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Created by {createdByName} ({createdByRole.toLowerCase()}) · {formatDate(createdAt)}
          </p>
        </div>
        <p className="text-xs text-gray-400">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</p>
      </div>

      {/* Notes */}
      {notes && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      )}

      {/* Correction note */}
      {correctionNote && (
        <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
          <p className="text-xs font-semibold text-orange-700 mb-1">Correction Requested</p>
          <p className="text-sm text-orange-800">{correctionNote}</p>
        </div>
      )}

      {/* Evidence progress — shown when creator can still edit */}
      {canSubmit && (
        <div className="px-6 border-b border-gray-100">
          <ConditionEvidenceProgress
            reportType={type}
            photoCount={photos.length}
            checklistCount={checklistItems.length}
          />
        </div>
      )}

      {/* Photos — split view if disputed */}
      <div className="px-6 py-4 space-y-5">
        {status === 'DISPUTED' && counterPhotos.length > 0 ? (
          <>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Original Evidence ({creatorPhotos.length} photos)
              </p>
              <div className="space-y-4">
                {renderPhotoGrid(creatorPhotos, false)}
              </div>
            </div>
            <div className="border-t border-red-100 pt-4">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">
                Counter Evidence ({counterPhotos.length} photos)
              </p>
              {counterNote && (
                <div className="bg-red-50 rounded-lg px-4 py-3 mb-3">
                  <p className="text-xs text-red-600 font-medium mb-1">Counter note</p>
                  <p className="text-sm text-red-800">{counterNote}</p>
                </div>
              )}
              <div className="space-y-4">
                {renderPhotoGrid(counterPhotos, false)}
              </div>
            </div>
          </>
        ) : photos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No photos uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(photosByRoom).sort().map((room) => (
              <div key={room}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{room}</p>
                <div className="flex flex-wrap gap-3">
                  {photosByRoom[room].map((photo) => {
                    const canDelete = photo.uploadedById === currentUserId && !isLocked;
                    return (
                      <div key={photo.id} className="group relative">
                        <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer"
                          className="relative block w-28 h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                          title={photo.caption ?? `${room} photo`}>
                          <Image src={photo.imageUrl} alt={photo.caption ?? `${room} condition`}
                            fill className="object-cover" sizes="112px" />
                          {photo.uploadedById !== createdById && (
                            <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              Other party
                            </div>
                          )}
                        </a>
                        {canDelete && <DeletePhotoButton reportId={reportId} photoId={photo.id} />}
                        {photo.caption && (
                          <p className="text-xs text-gray-500 mt-1 max-w-[112px] truncate">{photo.caption}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        {status === 'ACCEPTED' && reviewedAt && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Accepted by {reviewedByName} on {formatDate(reviewedAt)}</span>
          </div>
        )}

        {status === 'DISPUTED' && reviewedAt && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <span>Disputed — counter evidence submitted by {reviewedByName} on {formatDate(reviewedAt)}</span>
          </div>
        )}

        {canSubmit && <SubmitForReviewButton reportId={reportId} />}

        {isCreator && !canSubmit && !isLocked && (
          <p className="text-xs text-gray-400">Waiting for the other party to review.</p>
        )}

        {canReview && <ConditionReviewActions reportId={reportId} />}
      </div>
    </div>
  );
}
```

- [ ] Verify (TypeScript):
```bash
npx tsc --noEmit
```

---

## Task 14: Update Conditions Pages — Landlord and Tenant

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/conditions/page.tsx`

Update the Prisma query includes and the `ConditionReportCard` props to pass the new fields.

### Landlord conditions page

- [ ] In `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx`, update the `findMany` include:

Old:
```typescript
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      photos: {
        select: {
          id: true, room: true, imageUrl: true, caption: true, uploadedById: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
```

New:
```typescript
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      reviewedBy: { select: { id: true, name: true } },
      photos: {
        select: { id: true, room: true, imageUrl: true, caption: true, uploadedById: true },
        orderBy: { createdAt: 'asc' },
      },
      checklistItems: { orderBy: { area: 'asc' } },
    },
```

- [ ] Add `ConditionChecklistEditor` import at the top of the file (alongside existing imports):
```typescript
import ConditionChecklistEditor from '@/components/ui/ConditionChecklistEditor';
```

- [ ] Replace the report render block in the page body. Old:
```typescript
          {reports.map((report) => {
            const canUpload = !report.acknowledgedAt;
            return (
              <div key={report.id} className="space-y-3">
                <ConditionReportCard
                  reportId={report.id}
                  type={report.type}
                  notes={report.notes}
                  createdAt={report.createdAt.toISOString()}
                  createdByName={report.createdBy.name}
                  createdByRole={report.createdBy.role}
                  createdById={report.createdBy.id}
                  acknowledgedAt={report.acknowledgedAt?.toISOString() ?? null}
                  acknowledgedByName={report.acknowledgedBy?.name ?? null}
                  photos={report.photos}
                  currentUserId={session.user.id}
                />
                {canUpload && <ConditionPhotoUploader reportId={report.id} />}
              </div>
            );
          })}
```

New:
```typescript
          {reports.map((report) => {
            const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];
            const isLocked = LOCKED_STATUSES.includes(report.status);
            const isCreator = report.createdBy.id === session.user.id;
            const showChecklist = isCreator && ['DRAFT', 'CORRECTION_REQUESTED'].includes(report.status) && report.type !== 'INSPECTION';
            return (
              <div key={report.id} className="space-y-3">
                <ConditionReportCard
                  reportId={report.id}
                  type={report.type as 'MOVE_IN' | 'MOVE_OUT' | 'INSPECTION'}
                  status={report.status}
                  notes={report.notes}
                  correctionNote={report.correctionNote}
                  counterNote={report.counterNote}
                  createdAt={report.createdAt.toISOString()}
                  createdByName={report.createdBy.name}
                  createdByRole={report.createdBy.role}
                  createdById={report.createdBy.id}
                  reviewedAt={report.reviewedAt?.toISOString() ?? null}
                  reviewedByName={report.reviewedBy?.name ?? null}
                  photos={report.photos}
                  checklistItems={report.checklistItems.map((i) => ({
                    area: i.area,
                    completionReason: i.completionReason,
                  }))}
                  currentUserId={session.user.id}
                />
                {!isLocked && <ConditionPhotoUploader reportId={report.id} />}
                {showChecklist && (
                  <ConditionChecklistEditor
                    reportId={report.id}
                    existingItems={report.checklistItems.map((i) => ({
                      area: i.area,
                      completionReason: i.completionReason as 'PHOTO_UPLOADED' | 'NO_ISSUE_OBSERVED' | 'NOT_APPLICABLE' | 'CANNOT_ACCESS',
                    }))}
                  />
                )}
              </div>
            );
          })}
```

### Tenant conditions page

- [ ] In `src/app/(dashboard)/dashboard/tenant/conditions/page.tsx`, add the import:
```typescript
import ConditionChecklistEditor from '@/components/ui/ConditionChecklistEditor';
```

- [ ] Update the `findMany` include (same change as landlord page):
```typescript
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      reviewedBy: { select: { id: true, name: true } },
      photos: {
        select: { id: true, room: true, imageUrl: true, caption: true, uploadedById: true },
        orderBy: { createdAt: 'asc' },
      },
      checklistItems: { orderBy: { area: 'asc' } },
    },
```

- [ ] Update the `pendingAck` count to use status instead of `acknowledgedAt`:
```typescript
  const pendingAck = reports.filter(
    (r) =>
      ['SUBMITTED', 'PENDING_REVIEW', 'COUNTER_EVIDENCE_ADDED'].includes(r.status) &&
      r.createdBy.id !== session.user.id,
  ).length;
```

- [ ] Replace the report render block:
```typescript
          {reports.map((report) => {
            const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];
            const isLocked = LOCKED_STATUSES.includes(report.status);
            const isCreator = report.createdBy.id === session.user.id;
            const showChecklist = isCreator && ['DRAFT', 'CORRECTION_REQUESTED'].includes(report.status) && report.type !== 'INSPECTION';
            return (
              <div key={report.id} className="space-y-3">
                <ConditionReportCard
                  reportId={report.id}
                  type={report.type as 'MOVE_IN' | 'MOVE_OUT' | 'INSPECTION'}
                  status={report.status}
                  notes={report.notes}
                  correctionNote={report.correctionNote}
                  counterNote={report.counterNote}
                  createdAt={report.createdAt.toISOString()}
                  createdByName={report.createdBy.name}
                  createdByRole={report.createdBy.role}
                  createdById={report.createdBy.id}
                  reviewedAt={report.reviewedAt?.toISOString() ?? null}
                  reviewedByName={report.reviewedBy?.name ?? null}
                  photos={report.photos}
                  checklistItems={report.checklistItems.map((i) => ({
                    area: i.area,
                    completionReason: i.completionReason,
                  }))}
                  currentUserId={session.user.id}
                />
                {!isLocked && <ConditionPhotoUploader reportId={report.id} />}
                {showChecklist && (
                  <ConditionChecklistEditor
                    reportId={report.id}
                    existingItems={report.checklistItems.map((i) => ({
                      area: i.area,
                      completionReason: i.completionReason as 'PHOTO_UPLOADED' | 'NO_ISSUE_OBSERVED' | 'NOT_APPLICABLE' | 'CANNOT_ACCESS',
                    }))}
                  />
                )}
              </div>
            );
          })}
```

- [ ] Verify both pages compile:
```bash
npx tsc --noEmit
```

- [ ] Start dev server and open the landlord conditions page in the browser:
```bash
npm run dev
```

Navigate to `/dashboard/landlord/tenancies/<id>/conditions`. Verify:
- Report cards show status badges
- Draft reports show progress bars and checklist editor
- Pending review reports show three review action buttons for the other party
- Accepted reports show the accepted banner

---

## Task 15: Deposit Settlement — Condition Report Warnings

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/deposit-settlement/page.tsx`

Add move-in report status to the server query and show evidence warnings before the settlement client component.

- [ ] In the `findFirst` call, update the `conditionReports` include to also fetch move-in:

Old:
```typescript
      conditionReports: {
        where: { type: 'MOVE_OUT' },
        include: {
          photos: { select: { id: true, room: true, imageUrl: true } },
        },
      },
```

New:
```typescript
      conditionReports: {
        where: { type: { in: ['MOVE_IN', 'MOVE_OUT'] } },
        include: {
          photos: { select: { id: true, room: true, imageUrl: true } },
          checklistItems: { select: { area: true } },
        },
      },
```

- [ ] Update the variables derived from the query (after `const moveOutReport = ...`):

```typescript
  const moveInReport = tenancy.conditionReports.find((r) => r.type === 'MOVE_IN') ?? null;
  const moveOutReport = tenancy.conditionReports.find((r) => r.type === 'MOVE_OUT') ?? null;

  const moveInStatus = moveInReport?.status ?? null;
  const moveOutStatus = moveOutReport?.status ?? null;

  const warnings: string[] = [];
  if (!moveInReport) warnings.push('No move-in report exists. Baseline evidence is missing.');
  else if (moveInStatus !== 'ACCEPTED') warnings.push(`Move-in report is not accepted (status: ${moveInStatus}). Baseline evidence may be disputed.`);
  if (!moveOutReport) warnings.push('No move-out report exists. Deduction evidence is missing.');
  else if (moveOutStatus === 'DISPUTED') warnings.push('Move-out report is disputed. Review counter evidence before confirming deductions.');
```

- [ ] Add the warnings block to the JSX, just before `<DepositSettlementClient`. After the `<div className="mb-6">` heading block:

```tsx
      {warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm text-amber-800">{w}</p>
            </div>
          ))}
        </div>
      )}
```

- [ ] Verify:
```bash
npx tsc --noEmit
npm run build
```

Expected: clean build, no type errors.

- [ ] Manual test: open `/dashboard/landlord/tenancies/<id>/deposit-settlement` on a tenancy with no condition reports. Verify the two warnings appear ("No move-in report", "No move-out report").

---

## Commit Checkpoints

After each task passes verification, commit:

```
feat: add ReportStatus enums and EvidenceChecklistItem schema
feat: migrate existing report acknowledged state to status field
feat: add checklist upsert endpoint
feat: add submit-for-review endpoint with minimum evidence validation
feat: add accept endpoint, migrate acknowledge route
feat: add request-correction endpoint
feat: add counter-evidence endpoint (sets DISPUTED status)
fix: use status-based locking in photo upload and delete routes
feat: update GET condition-reports to include checklist and review fields
feat: add ConditionEvidenceProgress and ConditionChecklistEditor components
feat: add ConditionReviewActions component
feat: rewrite ConditionReportCard with status-aware UI and dispute view
feat: update conditions pages to use new report card props and checklist
feat: add condition report evidence warnings to deposit settlement
```
