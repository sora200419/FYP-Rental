# Admin Features Design — 2026-05-14

## Overview

Four missing admin features for RentalEase Malaysia. All changes are within the existing
data model scope. One Prisma migration required (4 new enum values).

---

## Feature 1: Verified Entity Browsing

**Goal:** Admin can view already-verified users and properties, not just the pending queue.

**Approach:** Add "Pending | Verified" tabs to the two existing admin queue pages using URL
search params (`?tab=pending` / `?tab=verified`). No new sidebar entries needed.

- `/dashboard/admin/verify` — Pending tab (current behaviour) + Verified tab (verified users)
- `/dashboard/admin/properties` — Pending tab (current behaviour) + Verified tab (verified properties)

Tab state is driven by `searchParams.tab` on each RSC page. A new tiny `AdminTabBar` client
component renders the two anchor tags. The verified tab shows read-only cards with the Revoke
button (Feature 2).

---

## Feature 2: Revocation of Verification

**Goal:** Admin can de-verify a previously approved user or property.

**New API routes:**

- `PATCH /api/admin/users/[id]/revoke`
  - Sets `isVerified = false`, stores reason in `kycRejectedReason`
  - Sends `ACCOUNT_VERIFICATION_REVOKED` notification to user
- `PATCH /api/admin/properties/[id]/revoke`
  - Sets `isVerified = false`, stores reason in `rejectedReason`
  - Sends `PROPERTY_VERIFICATION_REVOKED` notification to landlord

Both routes require `{ reason: string }` in the request body (mandatory).

**New UI component:** `RevokeButton` — single generic component accepting a `revokeUrl` prop.
State machine: `idle → revoking (textarea for reason) → revoked`. Reused on both verified tabs.

After revocation the user/property re-enters the pending queue on next IC/property resubmission.

---

## Feature 3: KYC Queue Filtering

**Goal:** Pending KYC queue only shows users who have actually submitted an IC document.
Users who registered but haven't uploaded anything yet are excluded.

**Change:** Add `tenantDocuments: { some: { type: 'IC_COPY' } }` to the `where` clause of
the pending query in `/dashboard/admin/verify/page.tsx`.

Also surface the IC submission date on the card (already fetched, just displayed).

---

## Feature 4: Admin Notifications

**Goal:** Admin receives an in-app notification when a new KYC submission or property arrives,
instead of having to manually poll the dashboard.

**Schema — 4 new NotificationType enum values:**

```
KYC_SUBMITTED                 // notifies admin when user uploads IC_COPY
PROPERTY_SUBMITTED            // notifies admin when landlord creates a property
ACCOUNT_VERIFICATION_REVOKED  // notifies user when their verification is revoked
PROPERTY_VERIFICATION_REVOKED // notifies landlord when property verification is revoked
```

**Trigger points:**

- `POST /api/tenant-documents` — after successful `IC_COPY` upsert, query all `role: ADMIN`
  users and call `createNotification` for each with `KYC_SUBMITTED`. Fires on first upload
  and re-upload. Non-blocking (createNotification swallows errors).
- `POST /api/properties` — after successful property create, notify all admins with
  `PROPERTY_SUBMITTED`. Same non-blocking pattern.

**UI:** Remove `role !== 'ADMIN'` guard from the notification bell block in `DashboardShell.tsx`.
The messages link guard stays (admins have no tenancy messages). The existing `NotificationBell`
and `NotificationDropdown` components are role-agnostic and work as-is.

---

## Files Changed

| File | Type | Change |
|------|------|--------|
| `prisma/schema.prisma` | Schema | +4 NotificationType enum values |
| `POST /api/tenant-documents` | Modified | Notify admins on IC_COPY upload |
| `POST /api/properties` | Modified | Notify admins on property create |
| `PATCH /api/admin/users/[id]/revoke` | New | Revoke user verification |
| `PATCH /api/admin/properties/[id]/revoke` | New | Revoke property verification |
| `src/components/ui/RevokeButton.tsx` | New | Generic revoke UI component |
| `src/components/ui/AdminTabBar.tsx` | New | Pending/Verified tab switcher |
| `src/app/(dashboard)/dashboard/admin/verify/page.tsx` | Modified | Tabs + IC filter + IC date |
| `src/app/(dashboard)/dashboard/admin/properties/page.tsx` | Modified | Tabs + verified list |
| `src/components/ui/DashboardShell.tsx` | Modified | Enable bell for admin (1 line) |

---

## Constraints

- No changes to existing tenancy, payment, or agreement flows
- Revocation does not terminate active tenancies — it only affects the `isVerified` flag
- Admin has no message inbox — messages link stays hidden
- `createNotification` errors are always swallowed; primary actions are never affected
