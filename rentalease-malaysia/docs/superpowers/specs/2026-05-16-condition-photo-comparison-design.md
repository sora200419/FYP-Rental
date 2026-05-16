# Condition Photo Comparison View — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

---

## Overview

Add a side-by-side MOVE_IN vs MOVE_OUT condition photo comparison view accessible to both landlords and tenants. Photos are grouped by room label (case-insensitive match) so both parties can clearly see what changed between move-in and move-out.

---

## Goals

- Let the landlord and tenant see MOVE_IN and MOVE_OUT photos next to each other, room by room.
- Surface rooms that were documented in one report but not the other (unmatched rooms).
- Reuse the existing room-label tagging system — no schema changes needed.

## Non-Goals

- No damage flagging or annotation feature (manual visual comparison only).
- No link to the DepositRefund flow from this page.
- No checklist comparison (checklist areas don't map 1:1 to photo room labels).
- No lightbox / photo zoom (YAGNI — thumbnails are sufficient for FYP scope).

---

## File Structure

### New files

| File | Purpose |
|---|---|
| `src/lib/compareConditionReports.ts` | Pure grouping utility — no framework dependencies |
| `src/components/ui/ConditionComparisonView.tsx` | Shared client component used by both role pages |
| `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/compare/page.tsx` | Landlord compare page (server component) |
| `src/app/(dashboard)/dashboard/tenant/conditions/compare/page.tsx` | Tenant compare page (server component) |

### Modified files

| File | Change |
|---|---|
| `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/page.tsx` | Add "Compare" button when both MOVE_IN + MOVE_OUT exist |
| `src/app/(dashboard)/dashboard/tenant/conditions/page.tsx` | Add "Compare" button when both MOVE_IN + MOVE_OUT exist |

---

## Grouping Utility (`compareConditionReports.ts`)

Pure function, no side effects, no imports from Next.js or Prisma.

### Types

```ts
type Photo = {
  id: string
  imageUrl: string
  room: string
  caption: string | null
}

type RoomGroup = {
  roomLabel: string      // display label — move-in label if matched, otherwise whichever side has it
  moveInPhotos: Photo[]
  moveOutPhotos: Photo[]
}

type ComparisonResult = {
  matched: RoomGroup[]     // rooms present in both reports
  moveInOnly: RoomGroup[]  // rooms only in the MOVE_IN report
  moveOutOnly: RoomGroup[] // rooms only in the MOVE_OUT report
}
```

### Algorithm

1. Collect all unique room labels from both photo arrays, normalised as `label.trim().toLowerCase()`.
2. For each unique normalised label:
   - Gather all move-in photos whose normalised room matches.
   - Gather all move-out photos whose normalised room matches.
   - Determine display label: use the original casing from move-in photos if any exist, else from move-out photos.
3. Split results into `matched` (both sides non-empty), `moveInOnly`, `moveOutOnly`.
4. Sort each group alphabetically by `roomLabel`.

---

## Page Components

### Landlord page — `/dashboard/landlord/tenancies/[id]/conditions/compare`

Server component. Auth + data flow:

1. `getServerSession` — redirect to `/login` if not `LANDLORD`.
2. `prisma.tenancy.findFirst` — verify `room.property.landlordId === session.user.id`; `notFound()` otherwise.
3. Fetch MOVE_IN and MOVE_OUT reports for the tenancy with their photos.
4. If either report is missing, `redirect` back to `.../conditions`.
5. Call `groupPhotosForComparison(moveInPhotos, moveOutPhotos)`.
6. Render `<ConditionComparisonView />` with the result.

Breadcrumb: `Tenancies / [address] / Condition Reports / Compare`

### Tenant page — `/dashboard/tenant/conditions/compare`

Server component. Auth + data flow:

1. `getServerSession` — redirect to `/login` if not `TENANT`.
2. `prisma.tenancy.findFirst` where `tenantId === session.user.id` and status is `ACTIVE | EXPIRED | TERMINATED` — `notFound()` otherwise.
3. Same fetch + redirect logic as landlord page.
4. Render the same `<ConditionComparisonView />`.

Breadcrumb: `Condition Reports / Compare`

---

## Shared Component (`ConditionComparisonView.tsx`)

Client component. Props:

```ts
type Props = {
  moveInReport: {
    id: string
    createdAt: string
    createdByName: string
    status: string
    photoCount: number
  }
  moveOutReport: {
    id: string
    createdAt: string
    createdByName: string
    status: string
    photoCount: number
  }
  comparison: ComparisonResult
  backHref: string         // e.g. "/dashboard/landlord/tenancies/[id]/conditions"
  propertyLabel: string    // e.g. "No. 12, Jalan Ampang, KL"
  tenantName: string
}
```

### Layout (top to bottom)

1. **Breadcrumb** — uses `backHref`.
2. **Page title** — "Move-In vs Move-Out Comparison", subtitle with property + tenant name.
3. **Summary bar** — two cards side by side:
   - Left (blue accent): MOVE_IN date, created-by name, status badge, photo count.
   - Right (amber accent): MOVE_OUT date, created-by name, status badge, photo count.
4. **Column headers** — "Room / Area" | "← Move-In" | "Move-Out →".
5. **Matched room sections** — one card per room in `comparison.matched`.
6. **Unmatched sections** — labelled "Move-In only" and "Move-Out only", one card each.

### Room card

Each room card contains:
- **Header row**: room label + photo counts per side.
- **Body** (3-column grid):
  - Left: MOVE_IN photo thumbnails (`<Image>` from next/image, aspect-ratio 1:1).
  - Right: MOVE_OUT photo thumbnails.
  - If one side has no photos: show a "Not documented" placeholder.
- Photo captions shown below each thumbnail if present.

### Matching: case-insensitive, trim

Implemented in `compareConditionReports.ts`; the component receives the already-grouped `ComparisonResult` and does no matching logic itself.

---

## Navigation Integration (Compare Button)

On both existing conditions pages, after reports are fetched:

```ts
const moveInReport = reports.find(r => r.type === 'MOVE_IN')
const moveOutReport = reports.find(r => r.type === 'MOVE_OUT')
const canCompare = !!moveInReport && !!moveOutReport
```

If `canCompare`:
- Render a secondary button "Compare Move-In vs Move-Out" next to the existing "Create Report" button.
- Landlord href: `/dashboard/landlord/tenancies/${tenancyId}/conditions/compare`
- Tenant href: `/dashboard/tenant/conditions/compare`

Button is hidden (not disabled) when either report is missing. No status restriction — comparison is available even for DRAFT reports.

---

## Behaviour Edge Cases

| Situation | Behaviour |
|---|---|
| Only MOVE_IN exists | Compare button hidden on conditions page |
| Only MOVE_OUT exists | Compare button hidden on conditions page |
| User navigates directly to `/compare` URL with only one report | Server redirects to conditions page |
| Room label differs only in casing ("Bathroom 1" vs "bathroom 1") | Matched — treated as same room |
| Genuinely different custom labels ("Shower Room" vs "Bathroom 1") | Unmatched — appear in their respective solo sections |
| A report has zero photos | Shown in summary bar; all its rooms appear as unmatched |

---

## No Schema Changes

All data is already in the database. The `ConditionPhoto.room` field is a plain string. No migrations required.
