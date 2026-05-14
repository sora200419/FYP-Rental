# Admin User Management — Design Spec

**Date:** 2026-05-14
**Scope:** Admin-only feature. No profile self-delete. No changes to landlord or tenant dashboards.

---

## Purpose

Give the admin role the ability to view all non-admin user accounts, suspend/reactivate them, and permanently delete accounts that have no active obligations. This closes the gap where a bad actor (fraudulent landlord, non-paying tenant) could not be actioned from the platform — the only recourse was direct database access.

---

## What Is Not In Scope

- Profile self-delete for landlords or tenants (deliberately excluded — admin handles all account removal)
- Role changes (cannot change a user's role)
- Impersonation or login-as-user
- Email or password changes by admin
- Bulk suspend or bulk delete

---

## Data Model Changes

### `prisma/schema.prisma`

Add one field to the `User` model:

```
isSuspended Boolean @default(false)
```

No other schema changes. Hard delete uses existing Prisma cascade relations — no `deletedAt` soft-delete approach.

### JWT / Session (`src/lib/auth.ts`)

Add `isSuspended: boolean` to the JWT token and session object alongside the existing `id`, `email`, `role`, and `language` fields. This allows the proxy to read the suspension state without a DB round-trip on every request.

---

## New Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/dashboard/admin/users/page.tsx` | Server component — fetches and renders user list |
| `src/components/ui/SuspendButton.tsx` | Client component — suspend/unsuspend toggle with optimistic UI |
| `src/components/ui/DeleteUserButton.tsx` | Client component — confirmation dialog + delete call |
| `src/app/api/admin/users/[id]/suspend/route.ts` | PATCH — toggles `isSuspended` |
| `src/app/api/admin/users/[id]/delete/route.ts` | DELETE — guard check then hard delete |

---

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `isSuspended Boolean @default(false)` to User |
| `src/lib/auth.ts` | Add `isSuspended` to JWT token and session |
| `src/proxy.ts` | Redirect suspended users to `/login?reason=suspended` |
| `src/components/ui/AdminTabBar.tsx` | Add "Users" tab linking to `/dashboard/admin/users` |

---

## Admin Users Page (`/dashboard/admin/users`)

### Layout

Follows the existing admin page pattern (same as `verify` and `properties` pages):

1. `AdminTabBar` — with Users as the active tab
2. `PageHeader` — eyebrow="Admin", title="User Management", description="View, suspend, and remove user accounts."
3. KPI strip (3 `StatCard` components):
   - Total users (non-admin count)
   - Suspended (amber tone, count of `isSuspended = true`)
   - Breakdown label: e.g. "12 landlords · 34 tenants"
4. Search + filter row (server-side via query params):
   - Text input: search by name or email (`?q=`)
   - Role dropdown: All / Landlord / Tenant (`?role=`)
   - Status dropdown: All / Active / Suspended (`?status=`)
5. User list — one row per user
6. Empty state when no results match filters

### User Row

Each row displays:
- **Name** + **email** (truncated)
- **Role badge** — blue for Landlord, green for Tenant
- **KYC badge** — green "Verified" / amber "Pending" (has IC doc, not yet verified) / gray "Unverified"
- **Activity** — for Landlord: active property count; for Tenant: active tenancy count
- **Joined** — `createdAt` formatted as date
- **Suspended badge** — red "Suspended" pill if `isSuspended = true`
- **Actions** — Suspend/Unsuspend button + Delete button

### Prisma Query

```ts
prisma.user.findMany({
  where: {
    role: { not: 'ADMIN' },
    // apply role/status/search filters from query params
  },
  select: {
    id: true, name: true, email: true, role: true,
    isVerified: true, isSuspended: true, createdAt: true,
    tenantDocuments: { select: { id: true }, take: 1 },
    ownedProperties: {
      where: { isVerified: true },
      select: { id: true },
    },
    tenancies: {
      where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
      select: { id: true },
    },
  },
  orderBy: { createdAt: 'desc' },
})
```

---

## Suspend / Unsuspend API

**Route:** `PATCH /api/admin/users/[id]/suspend`

**Auth:** Requires `ADMIN` role session.

**Body:** `{ suspended: boolean }`

**Guards:**
- Returns `403` if target user `role === 'ADMIN'`
- Returns `404` if user not found

**On suspend (`suspended: true`):**
1. Set `isSuspended = true`
2. Create in-app notification for user: *"Your account has been suspended. Contact support for assistance."*
3. Return `200`

**On unsuspend (`suspended: false`):**
1. Set `isSuspended = false`
2. Create in-app notification for user: *"Your account has been reactivated. You can now log in."*
3. Return `200`

**No confirmation required** — action is reversible.

---

## Hard Delete API

**Route:** `DELETE /api/admin/users/[id]/delete`

**Auth:** Requires `ADMIN` role session.

**Guards (checked in this order):**
1. Target user `role === 'ADMIN'` → `403 Forbidden`
2. User not found → `404`
3. Has tenancy with `status IN ('INVITED', 'PENDING', 'ACTIVE')` → `400` with message listing count
4. Has `RentPayment` with `status = 'PENDING'` and `dueDate < now()` → `400` with count
5. Has `DepositRefund` with `status NOT IN ('COMPLETED')` → `400` with count
6. Has `Agreement` with `status NOT IN ('FINALIZED')` → `400` with count

If multiple guards trigger, the `400` response lists all blocking reasons:
```json
{ "error": "Cannot delete: 1 active tenancy, 2 overdue payments." }
```

**On success:**
- `prisma.user.delete({ where: { id } })` — Prisma cascades through all relations
- Return `200`

**No notification sent** — the user account no longer exists.

---

## Proxy / Middleware Change (`src/proxy.ts`)

After the existing auth check, add:

```ts
if (token?.isSuspended === true && !pathname.startsWith('/api/auth')) {
  await signOut({ redirect: false });
  return NextResponse.redirect(new URL('/login?reason=suspended', req.url));
}
```

The login page reads `?reason=suspended` and shows a banner:
*"Your account has been suspended. Please contact support."*

---

## Client Components

### `SuspendButton.tsx`

- Props: `userId`, `isSuspended`, `userName`
- Renders "Suspend" (amber outlined) or "Unsuspend" (green outlined) based on current state
- On click: calls the suspend API, triggers `router.refresh()` on success
- Shows inline error text on failure
- Disabled during in-flight request

### `DeleteUserButton.tsx`

- Props: `userId`, `userName`
- Renders "Delete" (red outlined)
- On click: shows a browser `confirm()` dialog:
  *"Permanently delete [userName]? This cannot be undone. All their data will be removed."*
- If confirmed: calls the delete API
- On `400` (guard blocked): shows inline error with the blocking reason message from the API
- On `200`: triggers `router.refresh()`
- Disabled during in-flight request

---

## Login Page Change (`src/app/(auth)/login/page.tsx`)

Read `?reason` from search params. If `reason === 'suspended'`, show an amber banner above the form:
*"Your account has been suspended. Please contact the platform administrator."*

No other login page changes.

---

## Notifications

| Trigger | Recipient | Message |
|---------|-----------|---------|
| Account suspended | Affected user | "Your account has been suspended. Contact support for assistance." |
| Account unsuspended | Affected user | "Your account has been reactivated. You can now log in." |

No email notifications for suspend/unsuspend in this version (in-app only).

---

## Accessibility & Security

- All action buttons have descriptive `aria-label` attributes including the user's name
- Admin cannot target another admin for any action (enforced at API level)
- All API routes verify `session.user.role === 'ADMIN'` before any DB operation
- Hard delete is irreversible — the confirmation dialog text makes this explicit
- `isSuspended` is read from the JWT on every proxied request — no extra DB call needed

---

## Out of Scope (Future)

- Audit log of admin actions (who suspended whom, when)
- Email notifications on suspend/unsuspend
- Bulk actions
- Admin-initiated password reset
- Viewing a user's full tenancy/payment history from the admin panel
