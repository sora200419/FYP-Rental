# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Users page to the admin dashboard that lets the admin view all non-admin accounts, suspend/reactivate them, and hard-delete accounts with no active obligations.

**Architecture:** Add `isSuspended` to the Prisma User model and JWT session, update the proxy to redirect suspended users on login, then build two API routes (suspend toggle + guarded delete) and a new server-rendered admin page with two client-action components. The delete guard logic is extracted as a pure helper so it can be unit-tested without a database.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, NextAuth v4 JWT, Tailwind CSS v4, Vitest.

---

## Scope Guard

Only create or modify UI-facing files, API routes under `/api/admin/`, schema, and auth. Do not change tenancy business logic, payment logic, agreement generation, or blockchain anchoring.

**Approved design spec:** `docs/superpowers/specs/2026-05-14-admin-user-management-design.md`

**Command convention:**
- Run `npm.cmd` commands from `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia`
- Run `git add` and `git commit` from `C:\Users\ONG\OneDrive\Desktop\FYP Rental`
- Quote paths containing `(dashboard)` or `[id]` in PowerShell

---

## File Structure

**New files:**
- `src/app/api/admin/users/[id]/suspend/route.ts` — PATCH toggle isSuspended
- `src/app/api/admin/users/[id]/delete/route.ts` — DELETE with guard check + exported `getUserDeleteBlockers` helper
- `src/components/ui/SuspendButton.tsx` — client component, suspend/unsuspend toggle
- `src/components/ui/DeleteUserButton.tsx` — client component, confirm + delete
- `src/app/(dashboard)/dashboard/admin/users/page.tsx` — server component, user list page
- `tests/unit/admin-user-management.test.ts` — Vitest unit tests for `getUserDeleteBlockers`

**Modified files:**
- `prisma/schema.prisma` — add `isSuspended Boolean @default(false)` to User; add `ACCOUNT_SUSPENDED` and `ACCOUNT_REACTIVATED` to NotificationType enum
- `src/lib/auth.ts` — add `isSuspended` to JWT token and session
- `src/proxy.ts` — redirect suspended users to `/login?reason=suspended`
- `src/app/(auth)/login/page.tsx` — show amber banner when `?reason=suspended`
- `src/components/ui/Sidebar.tsx` — add Users link to admin navigation section

---

## Task 1: Schema, Auth, Proxy, Login Banner

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/auth.ts`
- Modify: `src/proxy.ts`
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add `isSuspended` to User model and new notification types to schema**

In `prisma/schema.prisma`, add inside the `User` model after `isVerified`:
```prisma
isSuspended Boolean  @default(false)
```

Also find the `NotificationType` enum (search for `enum NotificationType`) and add two new values:
```prisma
ACCOUNT_SUSPENDED
ACCOUNT_REACTIVATED
```

- [ ] **Step 2: Run migration**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
npx.cmd prisma migrate dev --name add_is_suspended
Pop-Location
```

Expected: migration created and applied, Prisma client regenerated.

- [ ] **Step 3: Add `isSuspended` to auth JWT and session**

Read `src/lib/auth.ts`. Find the `authorize` function inside `CredentialsProvider`. It currently returns a user object. Update the `prisma.user.findUnique` inside `authorize` to also select `isSuspended`:

```ts
const user = await prisma.user.findUnique({
  where: { email: credentials.email },
  select: {
    id: true,
    email: true,
    name: true,
    password: true,
    role: true,
    language: true,
    isSuspended: true,   // add this
  },
});
```

Then in the return value of `authorize`, include `isSuspended`:
```ts
return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  language: user.language,
  isSuspended: user.isSuspended,   // add this
};
```

In the `jwt` callback, add:
```ts
if (user) {
  // existing: token.id, token.role, token.language
  token.isSuspended = (user as { isSuspended: boolean }).isSuspended ?? false;
}
```

In the `session` callback, add:
```ts
session.user.isSuspended = token.isSuspended as boolean;
```

Find the TypeScript module augmentation block (it augments `next-auth` types). Add `isSuspended: boolean` to the `Session` user interface and `JWT` interface:
```ts
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      language: string;
      isSuspended: boolean;   // add
    } & DefaultSession['user'];
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    language: string;
    isSuspended: boolean;   // add
  }
}
```

- [ ] **Step 4: Add suspended redirect to proxy**

Read `src/proxy.ts`. Inside the `proxy` function, add this block **before** the role-based redirect logic (i.e., before the `if (role === 'ADMIN')` check):

```ts
// Redirect suspended users out regardless of role
if (token?.isSuspended === true) {
  return NextResponse.redirect(new URL('/login?reason=suspended', req.url));
}
```

- [ ] **Step 5: Add suspended banner to login page**

Read `src/app/(auth)/login/page.tsx`. The component signature currently uses `searchParams` or just renders — check how it receives props. Update the component to accept `searchParams`:

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const isSuspended = params.reason === 'suspended';
  // rest of component...
```

Inside the right-panel form area, add this banner immediately above the form title (only when `isSuspended` is true):

```tsx
{isSuspended && (
  <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
    Your account has been suspended. Please contact the platform administrator.
  </div>
)}
```

- [ ] **Step 6: Run build to verify schema + auth changes compile**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
Pop-Location
```

Expected: no TypeScript or build errors.

- [ ] **Step 7: Commit Task 1**

```
cd "C:\Users\ONG\OneDrive\Desktop\FYP Rental"
git add "rentalease-malaysia/prisma/schema.prisma" "rentalease-malaysia/prisma/migrations" "rentalease-malaysia/src/lib/auth.ts" "rentalease-malaysia/src/proxy.ts" "rentalease-malaysia/src/app/(auth)/login/page.tsx"
git commit -m "feat: add isSuspended field and auth/proxy support"
```

---

## Task 2: Suspend / Unsuspend API Route + Tests

**Files:**
- Create: `tests/unit/admin-user-management.test.ts` (partial — guard helper tests added in Task 3)
- Create: `src/app/api/admin/users/[id]/suspend/route.ts`

- [ ] **Step 1: Create the suspend route**

Create `src/app/api/admin/users/[id]/suspend/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json() as { suspended: boolean };
  const { suspended } = body;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true },
  });

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.role === 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.user.update({
    where: { id },
    data: { isSuspended: suspended },
  });

  if (suspended) {
    await createNotification(
      id,
      'ACCOUNT_SUSPENDED',
      'Account suspended',
      'Your account has been suspended. Contact support for assistance.',
      '/login',
    );
  } else {
    await createNotification(
      id,
      'ACCOUNT_REACTIVATED',
      'Account reactivated',
      'Your account has been reactivated. You can now log in.',
      user.role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant',
    );
  }

  return NextResponse.json({
    message: suspended ? 'User suspended' : 'User reactivated',
  });
}
```

- [ ] **Step 2: Run build to verify route compiles**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
Pop-Location
```

Expected: no errors.

- [ ] **Step 3: Commit Task 2**

```
cd "C:\Users\ONG\OneDrive\Desktop\FYP Rental"
git add "rentalease-malaysia/src/app/api/admin/users/[id]/suspend/route.ts"
git commit -m "feat: add suspend/unsuspend API route"
```

---

## Task 3: Delete API Route + Unit Tests

**Files:**
- Create: `src/app/api/admin/users/[id]/delete/route.ts`
- Create: `tests/unit/admin-user-management.test.ts`

- [ ] **Step 1: Write failing unit tests**

Create `tests/unit/admin-user-management.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getUserDeleteBlockers } from '../../src/app/api/admin/users/[id]/delete/route';

describe('getUserDeleteBlockers', () => {
  it('returns empty array when account has no active obligations', () => {
    expect(
      getUserDeleteBlockers({
        activeTenancyCount: 0,
        overduePaymentCount: 0,
        pendingDepositCount: 0,
        unfinishedAgreementCount: 0,
      }),
    ).toEqual([]);
  });

  it('blocks on a single active tenancy', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 1,
      overduePaymentCount: 0,
      pendingDepositCount: 0,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toEqual(['1 active tenancy']);
  });

  it('uses singular for one overdue payment', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 0,
      overduePaymentCount: 1,
      pendingDepositCount: 0,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toContain('1 overdue payment');
  });

  it('uses plural for multiple overdue payments', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 0,
      overduePaymentCount: 3,
      pendingDepositCount: 0,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toContain('3 overdue payments');
  });

  it('reports all four blockers when all are non-zero', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 1,
      overduePaymentCount: 2,
      pendingDepositCount: 1,
      unfinishedAgreementCount: 1,
    });
    expect(blockers).toHaveLength(4);
    expect(blockers).toContain('1 active tenancy');
    expect(blockers).toContain('2 overdue payments');
    expect(blockers).toContain('1 pending deposit refund');
    expect(blockers).toContain('1 unfinished agreement');
  });

  it('uses plural for multiple deposit refunds', () => {
    const blockers = getUserDeleteBlockers({
      activeTenancyCount: 0,
      overduePaymentCount: 0,
      pendingDepositCount: 2,
      unfinishedAgreementCount: 0,
    });
    expect(blockers).toContain('2 pending deposit refunds');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
npm.cmd run test -- tests/unit/admin-user-management.test.ts
Pop-Location
```

Expected: FAIL — `getUserDeleteBlockers` not found.

- [ ] **Step 3: Create the delete route with the exported helper**

Create `src/app/api/admin/users/[id]/delete/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export function getUserDeleteBlockers({
  activeTenancyCount,
  overduePaymentCount,
  pendingDepositCount,
  unfinishedAgreementCount,
}: {
  activeTenancyCount: number;
  overduePaymentCount: number;
  pendingDepositCount: number;
  unfinishedAgreementCount: number;
}): string[] {
  const blockers: string[] = [];
  if (activeTenancyCount > 0)
    blockers.push(`${activeTenancyCount} active tenancy`);
  if (overduePaymentCount > 0)
    blockers.push(
      `${overduePaymentCount} overdue payment${overduePaymentCount > 1 ? 's' : ''}`,
    );
  if (pendingDepositCount > 0)
    blockers.push(
      `${pendingDepositCount} pending deposit refund${pendingDepositCount > 1 ? 's' : ''}`,
    );
  if (unfinishedAgreementCount > 0)
    blockers.push(
      `${unfinishedAgreementCount} unfinished agreement${unfinishedAgreementCount > 1 ? 's' : ''}`,
    );
  return blockers;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.role === 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();

  const [activeTenancies, overduePayments, pendingDeposits, unfinishedAgreements] =
    await Promise.all([
      prisma.tenancy.count({
        where: { tenantId: id, status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
      }),
      prisma.rentPayment.count({
        where: {
          tenancy: { tenantId: id },
          status: 'PENDING',
          dueDate: { lt: now },
        },
      }),
      prisma.depositRefund.count({
        where: {
          tenancy: { tenantId: id },
          status: { not: 'COMPLETED' },
        },
      }),
      prisma.agreement.count({
        where: {
          tenancy: { tenantId: id },
          status: { not: 'FINALIZED' },
        },
      }),
    ]);

  const blockers = getUserDeleteBlockers({
    activeTenancyCount: activeTenancies,
    overduePaymentCount: overduePayments,
    pendingDepositCount: pendingDeposits,
    unfinishedAgreementCount: unfinishedAgreements,
  });

  if (blockers.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${blockers.join(', ')}.` },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: 'User deleted successfully' });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
npm.cmd run test -- tests/unit/admin-user-management.test.ts
Pop-Location
```

Expected: 6/6 PASS.

- [ ] **Step 5: Commit Task 3**

```
cd "C:\Users\ONG\OneDrive\Desktop\FYP Rental"
git add "rentalease-malaysia/src/app/api/admin/users/[id]/delete/route.ts" "rentalease-malaysia/tests/unit/admin-user-management.test.ts"
git commit -m "feat: add delete user API route with guard helper"
```

---

## Task 4: SuspendButton and DeleteUserButton Components

**Files:**
- Create: `src/components/ui/SuspendButton.tsx`
- Create: `src/components/ui/DeleteUserButton.tsx`

- [ ] **Step 1: Create SuspendButton**

Create `src/components/ui/SuspendButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  userName: string;
  isSuspended: boolean;
}

export default function SuspendButton({ userId, userName, isSuspended }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !isSuspended }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Something went wrong');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={isSuspended ? `Unsuspend ${userName}` : `Suspend ${userName}`}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
          isSuspended
            ? 'border-green-300 text-green-700 hover:bg-green-50'
            : 'border-amber-300 text-amber-700 hover:bg-amber-50'
        }`}
      >
        {loading ? '…' : isSuspended ? 'Unsuspend' : 'Suspend'}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create DeleteUserButton**

Create `src/components/ui/DeleteUserButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  userName: string;
}

export default function DeleteUserButton({ userId, userName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(
      `Permanently delete ${userName}? This cannot be undone. All their data including properties, tenancies, messages, and payment records will be removed.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Something went wrong');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={`Delete ${userName}`}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40"
      >
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Run build to verify components compile**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build 2>&1 | Select-String "error|Error" | Select-Object -First 20
Pop-Location
```

Expected: no errors.

- [ ] **Step 4: Commit Task 4**

```
cd "C:\Users\ONG\OneDrive\Desktop\FYP Rental"
git add "rentalease-malaysia/src/components/ui/SuspendButton.tsx" "rentalease-malaysia/src/components/ui/DeleteUserButton.tsx"
git commit -m "feat: add SuspendButton and DeleteUserButton components"
```

---

## Task 5: Admin Users Page + Sidebar Navigation Link

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/users/page.tsx`
- Modify: `src/components/ui/Sidebar.tsx`

- [ ] **Step 1: Create the admin users page**

Create `src/app/(dashboard)/dashboard/admin/users/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, StatCard } from '@/components/ui/RedesignPrimitives';
import AdminTabBar from '@/components/ui/AdminTabBar';
import SuspendButton from '@/components/ui/SuspendButton';
import DeleteUserButton from '@/components/ui/DeleteUserButton';

function getKycBadge(isVerified: boolean, hasDocument: boolean) {
  if (isVerified) return { label: 'Verified', cls: 'bg-green-100 text-green-700' };
  if (hasDocument) return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Unverified', cls: 'bg-gray-100 text-gray-500' };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard/admin');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const roleFilter = params.role ?? 'all';
  const statusFilter = params.status ?? 'all';

  const where = {
    role: { not: 'ADMIN' as const },
    ...(roleFilter !== 'all' && { role: roleFilter as 'LANDLORD' | 'TENANT' }),
    ...(statusFilter === 'suspended' && { isSuspended: true }),
    ...(statusFilter === 'active' && { isSuspended: false }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, totalCount, suspendedCount, landlordCount, tenantCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        createdAt: true,
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
    }),
    prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    prisma.user.count({ where: { role: { not: 'ADMIN' }, isSuspended: true } }),
    prisma.user.count({ where: { role: 'LANDLORD' } }),
    prisma.user.count({ where: { role: 'TENANT' } }),
  ]);

  return (
    <div className="max-w-5xl">
      <AdminTabBar activeTab="users" />

      <PageHeader
        eyebrow="Admin"
        title="User Management"
        description="View, suspend, and remove user accounts."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total users" value={totalCount} />
        <StatCard label="Suspended" value={suspendedCount} tone={suspendedCount > 0 ? 'amber' : 'default'} />
        <StatCard label="Breakdown" value={`${landlordCount}L · ${tenantCount}T`} />
      </div>

      <form method="GET" className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        >
          <option value="all">All roles</option>
          <option value="LANDLORD">Landlord</option>
          <option value="TENANT">Tenant</option>
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 md:col-span-3"
        >
          Filter
        </button>
      </form>

      {users.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-gray-700">No users found</p>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const kyc = getKycBadge(user.isVerified, user.tenantDocuments.length > 0);
            const activityCount =
              user.role === 'LANDLORD'
                ? user.ownedProperties.length
                : user.tenancies.length;
            const activityLabel =
              user.role === 'LANDLORD'
                ? `${activityCount} active propert${activityCount !== 1 ? 'ies' : 'y'}`
                : `${activityCount} active tenanc${activityCount !== 1 ? 'ies' : 'y'}`;

            return (
              <div
                key={user.id}
                className={`rounded-xl border bg-white p-4 ${user.isSuspended ? 'border-red-200' : 'border-gray-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.role === 'LANDLORD'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {user.role === 'LANDLORD' ? 'Landlord' : 'Tenant'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kyc.cls}`}>
                        {kyc.label}
                      </span>
                      {user.isSuspended && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {activityLabel} · Joined {new Date(user.createdAt).toLocaleDateString('en-MY')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SuspendButton
                      userId={user.id}
                      userName={user.name}
                      isSuspended={user.isSuspended}
                    />
                    <DeleteUserButton userId={user.id} userName={user.name} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AdminTabBar to support the Users tab**

Read `src/components/ui/AdminTabBar.tsx`. The current component accepts `activeTab: 'pending' | 'verified'` and renders within-page tabs. This component is used inside the verify and properties pages.

For the Users page, we need a **separate** top-level admin section navigation. Add a new component export to AdminTabBar.tsx for cross-page navigation:

```tsx
// Add this new component at the bottom of AdminTabBar.tsx

interface AdminNavProps {
  active: 'kyc' | 'properties' | 'users';
}

export function AdminNav({ active }: AdminNavProps) {
  const base = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';
  const activeClass = 'bg-blue-600 text-white';
  const inactiveClass = 'text-gray-600 hover:bg-gray-100';

  return (
    <div className="flex gap-2 mb-6">
      <a href="/dashboard/admin/verify" className={`${base} ${active === 'kyc' ? activeClass : inactiveClass}`}>
        KYC
      </a>
      <a href="/dashboard/admin/properties" className={`${base} ${active === 'properties' ? activeClass : inactiveClass}`}>
        Properties
      </a>
      <a href="/dashboard/admin/users" className={`${base} ${active === 'users' ? activeClass : inactiveClass}`}>
        Users
      </a>
    </div>
  );
}
```

Then update the `AdminUsersPage` to use `AdminNav` instead of `AdminTabBar`:

In `src/app/(dashboard)/dashboard/admin/users/page.tsx`, replace:
```tsx
import AdminTabBar from '@/components/ui/AdminTabBar';
// ...
<AdminTabBar activeTab="users" />
```

With:
```tsx
import { AdminNav } from '@/components/ui/AdminTabBar';
// ...
<AdminNav active="users" />
```

- [ ] **Step 3: Add Users link to Sidebar**

Read `src/components/ui/Sidebar.tsx`. Find the section that renders admin navigation links (look for `/dashboard/admin` hrefs). Add a Users link following the same pattern as the existing admin links:

```tsx
// Add alongside other admin nav links, following the same Link/className pattern:
<Link href="/dashboard/admin/users" className={/* same className pattern as other admin links */}>
  Users
</Link>
```

Match the exact className pattern used by the existing KYC and Properties sidebar links for admin.

- [ ] **Step 4: Run full tests and build**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
npm.cmd run test --
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: all tests PASS, build PASS.

- [ ] **Step 5: Commit Task 5**

```
cd "C:\Users\ONG\OneDrive\Desktop\FYP Rental"
git add "rentalease-malaysia/src/app/(dashboard)/dashboard/admin/users/page.tsx" "rentalease-malaysia/src/components/ui/AdminTabBar.tsx" "rentalease-malaysia/src/components/ui/Sidebar.tsx"
git commit -m "feat: add admin user management page"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run full unit test suite**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
npm.cmd run test --
Pop-Location
```

Expected: all tests pass including the 6 new `admin-user-management` tests.

- [ ] **Step 2: Run production build**

```powershell
Push-Location "C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia"
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Verify key pages load**

Start dev server (`npm.cmd run dev`) and check:

| URL | What to verify |
|-----|----------------|
| `/dashboard/admin/users` | Page loads, KPI strip shows counts, user rows render |
| `/dashboard/admin/users?role=LANDLORD` | Only landlord rows shown |
| `/dashboard/admin/users?status=suspended` | Only suspended rows shown |
| `/dashboard/admin/verify` | Still works — AdminTabBar pending/verified tabs unaffected |
| `/dashboard/admin/properties` | Still works — unaffected |
| `/login?reason=suspended` | Amber banner visible above form |

- [ ] **Step 4: Commit any fixes**

If any defects found, fix them with targeted edits and commit:

```
cd "C:\Users\ONG\OneDrive\Desktop\FYP Rental"
git add [specific files]
git commit -m "fix: [description of fix]"
```

If no fixes needed, do not create an empty commit.

---

## Self-Review Notes

- **Spec coverage:** All spec sections covered — isSuspended field, JWT/proxy, suspend API, delete API with guards, SuspendButton, DeleteUserButton, admin users page with KPI/search/filter/list, login banner, AdminNav, Sidebar link.
- **Guard logic tested:** `getUserDeleteBlockers` is a pure exported function covered by 6 unit tests including singular/plural edge cases.
- **Admin-on-admin protection:** Both API routes return 403 if target user is ADMIN — enforced in route code.
- **No regressions:** AdminTabBar within-page tabs are preserved; new `AdminNav` is an additional export, not a replacement.
- **Type consistency:** `getUserDeleteBlockers` accepts `{ activeTenancyCount, overduePaymentCount, pendingDepositCount, unfinishedAgreementCount }` — same names used in tests and route implementation.
