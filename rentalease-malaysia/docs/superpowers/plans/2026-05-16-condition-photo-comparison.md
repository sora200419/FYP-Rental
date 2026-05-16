# Condition Photo Comparison View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-by-side MOVE_IN vs MOVE_OUT condition photo comparison page for both landlords and tenants, with photos grouped by room label (case-insensitive match).

**Architecture:** A pure utility function (`groupPhotosForComparison`) groups photos into matched/moveInOnly/moveOutOnly buckets using case-insensitive room label matching. A single shared client component (`ConditionComparisonView`) renders the full comparison UI. Two thin server-component pages (landlord + tenant) handle auth, fetch the two reports, and pass pre-grouped data to the component. A "Compare" button is conditionally added to both existing conditions pages only when both MOVE_IN and MOVE_OUT reports exist.

**Tech Stack:** Next.js App Router (Server Components + `'use client'`), Prisma, NextAuth v4, Tailwind CSS v4, `next/image`

---

## File Map

| Status | File | Responsibility |
|---|---|---|
| Create | `src/lib/compareConditionReports.ts` | Types + `groupPhotosForComparison()` pure utility |
| Create | `src/components/ui/ConditionComparisonView.tsx` | Client component — full comparison UI |
| Create | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/compare/page.tsx` | Landlord compare server page |
| Create | `src/app/(dashboard)/dashboard/tenant/conditions/compare/page.tsx` | Tenant compare server page |
| Modify | `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx` | Add Compare button |
| Modify | `src/app/(dashboard)/dashboard/tenant/conditions/page.tsx` | Add Compare button + Link import |

---

## Task 1: Grouping utility

**Files:**
- Create: `src/lib/compareConditionReports.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/compareConditionReports.ts

export type ComparisonPhoto = {
  id: string
  imageUrl: string
  room: string
  caption: string | null
}

export type RoomGroup = {
  roomLabel: string
  moveInPhotos: ComparisonPhoto[]
  moveOutPhotos: ComparisonPhoto[]
}

export type ComparisonResult = {
  matched: RoomGroup[]
  moveInOnly: RoomGroup[]
  moveOutOnly: RoomGroup[]
}

export function groupPhotosForComparison(
  moveInPhotos: ComparisonPhoto[],
  moveOutPhotos: ComparisonPhoto[],
): ComparisonResult {
  const normalise = (s: string) => s.trim().toLowerCase()

  const groups = new Map<
    string,
    { displayLabel: string; moveIn: ComparisonPhoto[]; moveOut: ComparisonPhoto[] }
  >()

  for (const photo of moveInPhotos) {
    const key = normalise(photo.room)
    if (!groups.has(key)) {
      groups.set(key, { displayLabel: photo.room, moveIn: [], moveOut: [] })
    }
    groups.get(key)!.moveIn.push(photo)
  }

  for (const photo of moveOutPhotos) {
    const key = normalise(photo.room)
    if (!groups.has(key)) {
      groups.set(key, { displayLabel: photo.room, moveIn: [], moveOut: [] })
    }
    groups.get(key)!.moveOut.push(photo)
  }

  const matched: RoomGroup[] = []
  const moveInOnly: RoomGroup[] = []
  const moveOutOnly: RoomGroup[] = []

  for (const [, { displayLabel, moveIn, moveOut }] of groups) {
    const group: RoomGroup = {
      roomLabel: displayLabel,
      moveInPhotos: moveIn,
      moveOutPhotos: moveOut,
    }
    if (moveIn.length > 0 && moveOut.length > 0) {
      matched.push(group)
    } else if (moveIn.length > 0) {
      moveInOnly.push(group)
    } else {
      moveOutOnly.push(group)
    }
  }

  const byLabel = (a: RoomGroup, b: RoomGroup) =>
    a.roomLabel.localeCompare(b.roomLabel)
  matched.sort(byLabel)
  moveInOnly.sort(byLabel)
  moveOutOnly.sort(byLabel)

  return { matched, moveInOnly, moveOutOnly }
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compareConditionReports.ts
git commit -m "feat: add groupPhotosForComparison utility"
```

---

## Task 2: ConditionComparisonView client component

**Files:**
- Create: `src/components/ui/ConditionComparisonView.tsx`

This receives already-grouped data from the server page and renders the full UI. It does no data fetching.

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/ConditionComparisonView.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ComparisonResult, RoomGroup, ComparisonPhoto } from '@/lib/compareConditionReports'

type ReportSummary = {
  createdAt: string
  createdByName: string
  status: string
  photoCount: number
}

type Props = {
  moveInReport: ReportSummary
  moveOutReport: ReportSummary
  comparison: ComparisonResult
  backHref: string
  propertyLabel: string
  tenantName: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:                  { label: 'Draft',             className: 'bg-gray-100 text-gray-600' },
  SUBMITTED:              { label: 'Submitted',         className: 'bg-blue-100 text-blue-700' },
  PENDING_REVIEW:         { label: 'Pending Review',    className: 'bg-blue-100 text-blue-700' },
  CORRECTION_REQUESTED:   { label: 'Correction Needed', className: 'bg-amber-100 text-amber-700' },
  COUNTER_EVIDENCE_ADDED: { label: 'Counter Evidence',  className: 'bg-orange-100 text-orange-700' },
  ACCEPTED:               { label: 'Accepted',          className: 'bg-green-100 text-green-700' },
  DISPUTED:               { label: 'Disputed',          className: 'bg-red-100 text-red-700' },
  LOCKED:                 { label: 'Locked',            className: 'bg-gray-100 text-gray-600' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function PhotoGrid({ photos }: { photos: ComparisonPhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-lg bg-gray-50 border border-dashed border-gray-200">
        <p className="text-xs text-gray-400">Not documented</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id}>
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={photo.imageUrl}
              alt={photo.caption ?? 'Condition photo'}
              fill
              className="object-cover"
              sizes="120px"
            />
          </div>
          {photo.caption && (
            <p className="text-[10px] text-gray-400 mt-1 text-center truncate">
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function RoomCard({ group }: { group: RoomGroup }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{group.roomLabel}</span>
        <span className="text-xs text-gray-400">
          · {group.moveInPhotos.length} move-in · {group.moveOutPhotos.length} move-out
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <div className="p-4">
          <PhotoGrid photos={group.moveInPhotos} />
        </div>
        <div className="p-4">
          <PhotoGrid photos={group.moveOutPhotos} />
        </div>
      </div>
    </div>
  )
}

export default function ConditionComparisonView({
  moveInReport,
  moveOutReport,
  comparison,
  backHref,
  propertyLabel,
  tenantName,
}: Props) {
  const { matched, moveInOnly, moveOutOnly } = comparison
  const isEmpty = matched.length === 0 && moveInOnly.length === 0 && moveOutOnly.length === 0

  return (
    <div className="max-w-4xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
      >
        ← Back to Condition Reports
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Move-In vs Move-Out</h1>
        <p className="text-gray-500 text-sm mt-1">
          {propertyLabel} · Tenant: {tenantName}
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Move-In</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {new Date(moveInReport.createdAt).toLocaleDateString('en-MY', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            <StatusBadge status={moveInReport.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            By {moveInReport.createdByName} · {moveInReport.photoCount}{' '}
            {moveInReport.photoCount === 1 ? 'photo' : 'photos'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-1">Move-Out</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {new Date(moveOutReport.createdAt).toLocaleDateString('en-MY', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            <StatusBadge status={moveOutReport.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            By {moveOutReport.createdByName} · {moveOutReport.photoCount}{' '}
            {moveOutReport.photoCount === 1 ? 'photo' : 'photos'}
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-700 font-semibold text-lg">No photos to compare</p>
          <p className="text-gray-400 text-sm mt-1">
            Neither report has any photos uploaded yet.
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-4 px-1 mb-2">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-500">← Move-In Photos</p>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-500">Move-Out Photos →</p>
          </div>

          {/* Matched rooms */}
          {matched.length > 0 && (
            <div className="space-y-3 mb-6">
              {matched.map((group) => (
                <RoomCard key={group.roomLabel} group={group} />
              ))}
            </div>
          )}

          {/* Move-in only */}
          {moveInOnly.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Move-In only (no matching move-out room)
              </p>
              <div className="space-y-3">
                {moveInOnly.map((group) => (
                  <RoomCard key={group.roomLabel} group={group} />
                ))}
              </div>
            </div>
          )}

          {/* Move-out only */}
          {moveOutOnly.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Move-Out only (no matching move-in room)
              </p>
              <div className="space-y-3">
                {moveOutOnly.map((group) => (
                  <RoomCard key={group.roomLabel} group={group} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ConditionComparisonView.tsx
git commit -m "feat: add ConditionComparisonView component"
```

---

## Task 3: Landlord compare page

**Files:**
- Create: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/compare/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/compare/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ConditionComparisonView from '@/components/ui/ConditionComparisonView'
import { groupPhotosForComparison } from '@/lib/compareConditionReports'

export default async function LandlordCompareConditionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'LANDLORD') redirect('/login')

  const { id: tenancyId } = await params

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      room: { property: { landlordId: session.user.id } },
    },
    include: {
      room: {
        include: {
          property: { select: { address: true, city: true } },
        },
      },
      tenant: { select: { name: true } },
    },
  })

  if (!tenancy) notFound()

  const [moveInReport, moveOutReport] = await Promise.all([
    prisma.conditionReport.findFirst({
      where: { tenancyId, type: 'MOVE_IN' },
      include: {
        createdBy: { select: { name: true } },
        photos: {
          select: { id: true, room: true, imageUrl: true, caption: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.conditionReport.findFirst({
      where: { tenancyId, type: 'MOVE_OUT' },
      include: {
        createdBy: { select: { name: true } },
        photos: {
          select: { id: true, room: true, imageUrl: true, caption: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ])

  if (!moveInReport || !moveOutReport) {
    redirect(`/dashboard/landlord/tenancies/${tenancyId}/conditions`)
  }

  const comparison = groupPhotosForComparison(moveInReport.photos, moveOutReport.photos)
  const backHref = `/dashboard/landlord/tenancies/${tenancyId}/conditions`
  const propertyLabel = `${tenancy.room.property.address}, ${tenancy.room.property.city}`

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/landlord/tenancies" className="hover:text-blue-600 transition-colors">
          Tenancies
        </Link>
        <span>/</span>
        <Link href={`/dashboard/landlord/tenancies/${tenancyId}`} className="hover:text-blue-600 transition-colors">
          {tenancy.room.property.address}
        </Link>
        <span>/</span>
        <Link href={backHref} className="hover:text-blue-600 transition-colors">
          Condition Reports
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Compare</span>
      </div>

      <ConditionComparisonView
        moveInReport={{
          createdAt: moveInReport.createdAt.toISOString(),
          createdByName: moveInReport.createdBy.name ?? 'Unknown',
          status: moveInReport.status,
          photoCount: moveInReport.photos.length,
        }}
        moveOutReport={{
          createdAt: moveOutReport.createdAt.toISOString(),
          createdByName: moveOutReport.createdBy.name ?? 'Unknown',
          status: moveOutReport.status,
          photoCount: moveOutReport.photos.length,
        }}
        comparison={comparison}
        backHref={backHref}
        propertyLabel={propertyLabel}
        tenantName={tenancy.tenant.name ?? 'Tenant'}
      />
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/compare/page.tsx"
git commit -m "feat: add landlord compare conditions page"
```

---

## Task 4: Tenant compare page

**Files:**
- Create: `src/app/(dashboard)/dashboard/tenant/conditions/compare/page.tsx`

Note: The tenant's active tenancy is fetched using `tenantId: session.user.id` (no tenancy ID in the URL). The status filter includes `ACTIVE`, `EXPIRED`, and `TERMINATED` because a comparison is most useful after the tenancy ends. The landlord name comes from `tenancy.room.property.landlord.name` (same pattern as the existing tenant conditions page).

- [ ] **Step 1: Create the page**

```tsx
// src/app/(dashboard)/dashboard/tenant/conditions/compare/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ConditionComparisonView from '@/components/ui/ConditionComparisonView'
import { groupPhotosForComparison } from '@/lib/compareConditionReports'

export default async function TenantCompareConditionsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'TENANT') redirect('/login')

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      tenantId: session.user.id,
      status: { in: ['ACTIVE', 'EXPIRED', 'TERMINATED'] },
    },
    include: {
      room: {
        include: {
          property: {
            include: {
              landlord: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!tenancy) notFound()

  const [moveInReport, moveOutReport] = await Promise.all([
    prisma.conditionReport.findFirst({
      where: { tenancyId: tenancy.id, type: 'MOVE_IN' },
      include: {
        createdBy: { select: { name: true } },
        photos: {
          select: { id: true, room: true, imageUrl: true, caption: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.conditionReport.findFirst({
      where: { tenancyId: tenancy.id, type: 'MOVE_OUT' },
      include: {
        createdBy: { select: { name: true } },
        photos: {
          select: { id: true, room: true, imageUrl: true, caption: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ])

  if (!moveInReport || !moveOutReport) {
    redirect('/dashboard/tenant/conditions')
  }

  const comparison = groupPhotosForComparison(moveInReport.photos, moveOutReport.photos)
  const backHref = '/dashboard/tenant/conditions'
  const propertyLabel = `${tenancy.room.property.address}, ${tenancy.room.property.city}`

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href={backHref} className="hover:text-blue-600 transition-colors">
          Condition Reports
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Compare</span>
      </div>

      <ConditionComparisonView
        moveInReport={{
          createdAt: moveInReport.createdAt.toISOString(),
          createdByName: moveInReport.createdBy.name ?? 'Unknown',
          status: moveInReport.status,
          photoCount: moveInReport.photos.length,
        }}
        moveOutReport={{
          createdAt: moveOutReport.createdAt.toISOString(),
          createdByName: moveOutReport.createdBy.name ?? 'Unknown',
          status: moveOutReport.status,
          photoCount: moveOutReport.photos.length,
        }}
        comparison={comparison}
        backHref={backHref}
        propertyLabel={propertyLabel}
        tenantName={session.user.name ?? 'Tenant'}
      />
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/tenant/conditions/compare/page.tsx"
git commit -m "feat: add tenant compare conditions page"
```

---

## Task 5: Compare button on landlord conditions page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx`

`Link` is already imported at the top of this file.

- [ ] **Step 1: Add `canCompare` after the reports are fetched**

The file currently ends the `reports` fetch at line 51. Add these three lines immediately after:

```ts
const moveInExists = reports.some((r) => r.type === 'MOVE_IN')
const moveOutExists = reports.some((r) => r.type === 'MOVE_OUT')
const canCompare = moveInExists && moveOutExists
```

- [ ] **Step 2: Replace the header JSX**

Find this block (around line 75–86):

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">
      Property Condition
    </h1>
    <p className="text-gray-500 text-sm mt-1">
      {tenancy.room.property.address}, {tenancy.room.property.city}{' '}
      &middot; Tenant: {tenancy.tenant.name}
    </p>
  </div>
  <CreateConditionReport tenancyId={tenancyId} />
</div>
```

Replace with:

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">
      Property Condition
    </h1>
    <p className="text-gray-500 text-sm mt-1">
      {tenancy.room.property.address}, {tenancy.room.property.city}{' '}
      &middot; Tenant: {tenancy.tenant.name}
    </p>
  </div>
  <div className="flex items-center gap-2">
    {canCompare && (
      <Link
        href={`/dashboard/landlord/tenancies/${tenancyId}/conditions/compare`}
        className="inline-flex items-center text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors bg-white"
      >
        Compare Move-In vs Move-Out
      </Link>
    )}
    <CreateConditionReport tenancyId={tenancyId} />
  </div>
</div>
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx"
git commit -m "feat: add compare button to landlord conditions page"
```

---

## Task 6: Compare button on tenant conditions page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/tenant/conditions/page.tsx`

`Link` is NOT currently imported in this file — it must be added.

- [ ] **Step 1: Add Link import at the top of the file**

The file currently starts with:

```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
```

Add one line:

```ts
import Link from 'next/link';
```

- [ ] **Step 2: Add `canCompare` after the reports are fetched**

After line 73 (`orderBy: { createdAt: 'desc' },`), the `reports` query closes. Add immediately after:

```ts
const moveInExists = reports.some((r) => r.type === 'MOVE_IN')
const moveOutExists = reports.some((r) => r.type === 'MOVE_OUT')
const canCompare = moveInExists && moveOutExists
```

- [ ] **Step 3: Add Compare button inside the existing button row**

Find the existing button container (around line 94–101):

```tsx
<div className="flex items-center gap-3">
  {pendingAck > 0 && (
    <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
      {pendingAck} to review
    </span>
  )}
  <CreateConditionReport tenancyId={tenancy.id} />
</div>
```

Replace with:

```tsx
<div className="flex items-center gap-3">
  {pendingAck > 0 && (
    <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
      {pendingAck} to review
    </span>
  )}
  {canCompare && (
    <Link
      href="/dashboard/tenant/conditions/compare"
      className="inline-flex items-center text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors bg-white"
    >
      Compare Move-In vs Move-Out
    </Link>
  )}
  <CreateConditionReport tenancyId={tenancy.id} />
</div>
```

- [ ] **Step 4: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/tenant/conditions/page.tsx
git commit -m "feat: add compare button to tenant conditions page"
```

---

## Task 7: Manual verification

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Landlord golden path**

1. Log in as a landlord.
2. Go to a tenancy that has both a MOVE_IN and MOVE_OUT report with photos uploaded.
3. On the Condition Reports page, the "Compare Move-In vs Move-Out" button should appear next to the Create Report button.
4. Click it — should navigate to `/dashboard/landlord/tenancies/[id]/conditions/compare`.
5. Summary bar shows both report dates, creator names, statuses, and photo counts.
6. Rooms photographed in both reports appear as matched cards with MOVE_IN photos on the left and MOVE_OUT on the right.
7. Rooms photographed in only one report appear in their respective unmatched section below.

- [ ] **Step 3: Case-insensitive matching**

If a room is labelled "Bathroom 1" in the MOVE_IN report and "bathroom 1" in the MOVE_OUT report, they must appear as a single matched card, not two unmatched ones.

- [ ] **Step 4: No button when only one report exists**

Go to a tenancy with only a MOVE_IN report. The Compare button must not appear on the conditions page.

- [ ] **Step 5: Direct URL redirect**

Navigate directly to `/dashboard/landlord/tenancies/[id]/conditions/compare` for a tenancy that has only a MOVE_IN report. The page must redirect to the conditions page instead of showing an error.

- [ ] **Step 6: Tenant view**

Log in as the tenant of the same tenancy. Go to Condition Reports. The Compare button appears. Clicking it loads the same comparison layout at `/dashboard/tenant/conditions/compare`.

- [ ] **Step 7: Empty state**

If both reports exist but neither has any photos, the comparison page shows the "No photos to compare" empty state (not a crash).
