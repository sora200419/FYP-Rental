# Hybrid Deletion Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a hybrid deletion strategy — soft delete for User accounts, AuditLog snapshots before hard-deleting all other entities, and no deletion allowed for legally sensitive records.

**Architecture:** User rows are never removed from the database; instead `deletedAt/deletedById/deletedReason` fields mark them as deleted and block login. All other hard deletes are preceded by writing a full JSON snapshot to a new `AuditLog` table. Legally sensitive records (Agreement, RentPayment, DepositRefund, PaymentProof) have no delete route and remain protected by the existing cascade/blocker logic.

**Tech Stack:** Next.js 15, Prisma ORM, PostgreSQL, NextAuth.js v4, TypeScript

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add soft-delete fields to User; add AuditLog model |
| `src/lib/audit.ts` | **Create** — `logAudit()` helper |
| `src/lib/auth.ts` | Block login for deleted users |
| `src/app/api/admin/users/[id]/delete/route.ts` | Change hard delete → soft delete |
| `src/app/api/properties/[id]/route.ts` | Log rooms + property to AuditLog before delete |
| `src/app/api/rooms/[id]/route.ts` | Log room to AuditLog before delete |
| `src/app/api/tenant-documents/[id]/route.ts` | Log document to AuditLog before delete |
| `src/app/api/condition-reports/[id]/photos/[photoId]/route.ts` | Log photo to AuditLog before delete |
| `src/app/api/tenancies/[id]/co-tenants/[coTenantId]/route.ts` | Log co-tenant to AuditLog before delete |
| `src/app/api/properties/[id]/photos/route.ts` | Log property photo to AuditLog before delete |
| `src/app/(dashboard)/dashboard/admin/users/page.tsx` | Show deleted users with "Deleted" badge |
| `src/app/(dashboard)/dashboard/admin/audit-log/page.tsx` | **Create** — AuditLog viewer for admins |

---

## Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add soft-delete fields to User model**

In `prisma/schema.prisma`, add these three lines inside the `User` model block, after `kycRejectedReason`:

```prisma
  deletedAt     DateTime?
  deletedById   String?
  deletedReason String?

  deletedBy     User?  @relation("DeletedUsers", fields: [deletedById], references: [id])
  deletedUsers  User[] @relation("DeletedUsers")
```

- [ ] **Step 2: Add AuditLog model**

Append at the end of `prisma/schema.prisma`:

```prisma
// ─── AUDIT LOG ───────────────────────────────────────────────────────────────
// Immutable record written before any hard delete. Stores a full JSON snapshot
// of the deleted record so data can be reviewed or recovered by admins.
model AuditLog {
  id           String   @id @default(cuid())
  actorId      String
  actor        User     @relation("AuditLogActor", fields: [actorId], references: [id])
  action       String   // e.g. "USER_DELETED", "PROPERTY_DELETED", "ROOM_DELETED"
  entityName   String   // Prisma model name: "User", "Property", "Room", etc.
  entityId     String   // The deleted record's ID
  previousData Json     // Full snapshot of the record at time of deletion
  ipAddress    String?
  reason       String?
  createdAt    DateTime @default(now())

  @@index([entityName, entityId])
  @@index([actorId, createdAt])
}
```

Also add the missing relation on User:
```prisma
  auditLogsAuthored AuditLog[] @relation("AuditLogActor")
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name add-soft-delete-and-audit-log
```

Expected: Migration applied, Prisma Client regenerated.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add User soft-delete fields and AuditLog model"
```

---

## Task 2: AuditLog Helper

**Files:**
- Create: `src/lib/audit.ts`

- [ ] **Step 1: Create the helper**

Create `src/lib/audit.ts`:

```typescript
import { prisma } from '@/lib/prisma';

export async function logAudit({
  actorId,
  action,
  entityName,
  entityId,
  previousData,
  ipAddress,
  reason,
}: {
  actorId: string;
  action: string;
  entityName: string;
  entityId: string;
  previousData: object;
  ipAddress?: string | null;
  reason?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityName,
      entityId,
      previousData,
      ipAddress: ipAddress ?? null,
      reason: reason ?? null,
    },
  });
}

export function getIp(request: Request): string | null {
  return (
    (request.headers as Headers).get('x-forwarded-for')?.split(',')[0].trim() ??
    (request.headers as Headers).get('x-real-ip') ??
    null
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/audit.ts
git commit -m "feat: add logAudit helper for audit trail"
```

---

## Task 3: Block Deleted Users from Login

**Files:**
- Modify: `src/lib/auth.ts` lines 37–48 (the `findUnique` select block)

- [ ] **Step 1: Add `deletedAt` to the user select**

Replace the `select` block inside `findUnique` (lines 39–48):

```typescript
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            language: true,
            isSuspended: true,
            deletedAt: true,
          },
        });
```

- [ ] **Step 2: Add deleted check after the `if (!user)` block**

After line `if (!user) { throw new Error('No account found with this email'); }`, add:

```typescript
        if (user.deletedAt) {
          throw new Error('This account has been removed.');
        }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: block login for soft-deleted user accounts"
```

---

## Task 4: Admin User Delete — Soft Delete

**Files:**
- Modify: `src/app/api/admin/users/[id]/delete/route.ts`

- [ ] **Step 1: Replace hard delete with soft delete**

Replace the entire DELETE handler body from line 37 to end with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit, getIp } from '@/lib/audit';

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
    blockers.push(
      `${activeTenancyCount} active ${activeTenancyCount === 1 ? 'tenancy' : 'tenancies'}`,
    );
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const url = new URL(request.url);
  const reason = url.searchParams.get('reason') ?? undefined;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, deletedAt: true },
  });

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.role === 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (user.deletedAt)
    return NextResponse.json({ error: 'User already deleted' }, { status: 409 });

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
          status: { not: 'PAID' },
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

  const fullUser = await prisma.user.findUnique({
    where: { id },
  });

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: now,
      deletedById: session.user.id,
      deletedReason: reason ?? null,
    },
  });

  await logAudit({
    actorId: session.user.id,
    action: 'USER_DELETED',
    entityName: 'User',
    entityId: id,
    previousData: fullUser as object,
    ipAddress: getIp(request),
    reason,
  });

  return NextResponse.json({ message: 'User deleted successfully' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/users/[id]/delete/route.ts
git commit -m "feat: soft-delete user accounts instead of hard delete"
```

---

## Task 5: Property Delete — AuditLog

**Files:**
- Modify: `src/app/api/properties/[id]/route.ts`

- [ ] **Step 1: Replace the DELETE handler**

Replace the entire DELETE export with:

```typescript
import { logAudit, getIp } from '@/lib/audit';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const property = await prisma.property.findFirst({
    where: { id, landlordId: session.user.id },
    include: {
      rooms: {
        include: {
          tenancies: { select: { id: true } },
        },
      },
    },
  });

  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const hasAnyTenancy = property.rooms.some((r) => r.tenancies.length > 0);
  if (hasAnyTenancy) {
    return NextResponse.json(
      { error: 'Cannot delete a property that has tenancy records. Remove all tenancies first.' },
      { status: 409 },
    );
  }

  const ip = getIp(req);

  // Log each room before deleting
  for (const room of property.rooms) {
    await logAudit({
      actorId: session.user.id,
      action: 'ROOM_DELETED',
      entityName: 'Room',
      entityId: room.id,
      previousData: room as object,
      ipAddress: ip,
    });
  }

  await logAudit({
    actorId: session.user.id,
    action: 'PROPERTY_DELETED',
    entityName: 'Property',
    entityId: id,
    previousData: property as object,
    ipAddress: ip,
  });

  await prisma.room.deleteMany({ where: { propertyId: id } });
  await prisma.property.delete({ where: { id } });

  return NextResponse.json({ message: 'Property deleted' });
}
```

Also add the import at the top of the file:
```typescript
import { logAudit, getIp } from '@/lib/audit';
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/properties/[id]/route.ts
git commit -m "feat: log property and room to AuditLog before delete"
```

---

## Task 6: Room Delete — AuditLog

**Files:**
- Modify: `src/app/api/rooms/[id]/route.ts`

- [ ] **Step 1: Add import and update DELETE handler**

Add import at top:
```typescript
import { logAudit, getIp } from '@/lib/audit';
```

Replace the DELETE handler body (lines 56–89) with:

```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const room = await prisma.room.findFirst({
    where: { id, property: { landlordId: session.user.id } },
    include: {
      tenancies: {
        where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
        select: { id: true },
      },
    },
  });

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  if (room.tenancies.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete a room with an active or pending tenancy.' },
      { status: 409 },
    );
  }

  await logAudit({
    actorId: session.user.id,
    action: 'ROOM_DELETED',
    entityName: 'Room',
    entityId: id,
    previousData: room as object,
    ipAddress: getIp(req),
  });

  await prisma.room.delete({ where: { id } });

  return NextResponse.json({ message: 'Room deleted' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/rooms/[id]/route.ts
git commit -m "feat: log room to AuditLog before delete"
```

---

## Task 7: TenantDocument Delete — AuditLog

**Files:**
- Modify: `src/app/api/tenant-documents/[id]/route.ts`

- [ ] **Step 1: Add import and update DELETE handler**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteTenantDocument } from '@/lib/cloudinary';
import { logAudit, getIp } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id } = await params;

  const doc = await prisma.tenantDocument.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await logAudit({
    actorId: session.user.id,
    action: 'TENANT_DOCUMENT_DELETED',
    entityName: 'TenantDocument',
    entityId: id,
    previousData: doc as object,
    ipAddress: getIp(request),
  });

  try {
    await deleteTenantDocument(doc.publicId);
  } catch {
    console.error('Cloudinary delete failed for tenant document:', doc.publicId);
  }

  await prisma.tenantDocument.delete({ where: { id } });
  return NextResponse.json({ message: 'Document deleted' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tenant-documents/[id]/route.ts
git commit -m "feat: log tenant document to AuditLog before delete"
```

---

## Task 8: ConditionPhoto Delete — AuditLog

**Files:**
- Modify: `src/app/api/condition-reports/[id]/photos/[photoId]/route.ts`

- [ ] **Step 1: Add import and log before delete**

Add import at top of file:
```typescript
import { logAudit, getIp } from '@/lib/audit';
```

After the `if (photo.report.acknowledgedAt)` guard block, and before the Cloudinary delete, add:

```typescript
  await logAudit({
    actorId: session.user.id,
    action: 'CONDITION_PHOTO_DELETED',
    entityName: 'ConditionPhoto',
    entityId: photoId,
    previousData: photo as object,
    ipAddress: getIp(request),
  });
```

Also update the function signature from `request: NextRequest` to ensure `request` is available. The parameter is already named `request` in the existing file.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/condition-reports/[id]/photos/[photoId]/route.ts
git commit -m "feat: log condition photo to AuditLog before delete"
```

---

## Task 9: CoTenant Delete — AuditLog

**Files:**
- Modify: `src/app/api/tenancies/[id]/co-tenants/[coTenantId]/route.ts`

- [ ] **Step 1: Add import and log before delete**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAudit, getIp } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coTenantId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { id, coTenantId } = await params;

  const coTenant = await prisma.coTenant.findFirst({
    where: {
      id: coTenantId,
      tenancy: {
        id,
        room: { property: { landlordId: session.user.id } },
      },
    },
  });

  if (!coTenant)
    return NextResponse.json({ error: 'Co-tenant not found' }, { status: 404 });

  await logAudit({
    actorId: session.user.id,
    action: 'CO_TENANT_DELETED',
    entityName: 'CoTenant',
    entityId: coTenantId,
    previousData: coTenant as object,
    ipAddress: getIp(request),
  });

  await prisma.coTenant.delete({ where: { id: coTenantId } });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tenancies/[id]/co-tenants/[coTenantId]/route.ts
git commit -m "feat: log co-tenant to AuditLog before delete"
```

---

## Task 10: PropertyPhoto Delete — AuditLog

**Files:**
- Modify: `src/app/api/properties/[id]/photos/route.ts`

- [ ] **Step 1: Add import and log before delete**

Add import at top of file:
```typescript
import { logAudit, getIp } from '@/lib/audit';
```

In the DELETE handler, after the `if (!photo)` guard and before `deletePropertyPhoto`, add:

```typescript
  await logAudit({
    actorId: session.user.id,
    action: 'PROPERTY_PHOTO_DELETED',
    entityName: 'PropertyPhoto',
    entityId: photoId,
    previousData: photo as object,
    ipAddress: getIp(request),
  });
```

Also change the DELETE parameter from `request: Request` to `request: NextRequest` and add the `NextRequest` import if not already present.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/properties/[id]/photos/route.ts
git commit -m "feat: log property photo to AuditLog before delete"
```

---

## Task 11: Admin Users Page — Show Deleted Users

**Files:**
- Modify: `src/app/(dashboard)/dashboard/admin/users/page.tsx`

- [ ] **Step 1: Update `getKycBadge` and add deleted badge logic**

Replace the `getKycBadge` function (lines 10–14):

```typescript
function getKycBadge(isVerified: boolean, hasDocument: boolean) {
  if (isVerified) return { label: 'Verified', cls: 'bg-green-100 text-green-700' };
  if (hasDocument) return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Unverified', cls: 'bg-gray-100 text-gray-500' };
}
```

(No change needed — keep as is.)

- [ ] **Step 2: Add `deletedAt` to the Prisma select**

In the `prisma.user.findMany` select block, add:
```typescript
        deletedAt: true,
        deletedReason: true,
```

- [ ] **Step 3: Add deleted user badge in the user card**

In the JSX where badges are rendered (after the `isSuspended` badge), add:

```tsx
{user.deletedAt && (
  <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-800">
    Deleted
  </span>
)}
```

- [ ] **Step 4: Disable action buttons for deleted users**

Wrap the `SuspendButton` and `DeleteUserButton` in a conditional:

```tsx
{!user.deletedAt && (
  <div className="flex shrink-0 items-center gap-2">
    <SuspendButton
      userId={user.id}
      userName={user.name}
      isSuspended={user.isSuspended}
    />
    <DeleteUserButton userId={user.id} userName={user.name} />
  </div>
)}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/admin/users/page.tsx
git commit -m "feat: show deleted users with badge in admin user management"
```

---

## Task 12: Admin AuditLog Viewer Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/admin/audit-log/page.tsx`

- [ ] **Step 1: Create the AuditLog viewer page**

Create `src/app/(dashboard)/dashboard/admin/audit-log/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/RedesignPrimitives';
import { AdminNav } from '@/components/ui/AdminTabBar';

const ACTION_LABELS: Record<string, string> = {
  USER_DELETED: 'User Deleted',
  PROPERTY_DELETED: 'Property Deleted',
  ROOM_DELETED: 'Room Deleted',
  TENANT_DOCUMENT_DELETED: 'Document Deleted',
  CONDITION_PHOTO_DELETED: 'Condition Photo Deleted',
  CO_TENANT_DELETED: 'Co-tenant Deleted',
  PROPERTY_PHOTO_DELETED: 'Property Photo Deleted',
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; page?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard/admin');

  const params = await searchParams;
  const entityFilter = params.entity ?? 'all';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 20;

  const where = entityFilter !== 'all' ? { entityName: entityFilter } : {};

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const entities = ['User', 'Property', 'Room', 'TenantDocument', 'ConditionPhoto', 'CoTenant', 'PropertyPhoto'];

  return (
    <div className="max-w-5xl">
      <AdminNav active="audit-log" />
      <PageHeader
        eyebrow="Admin"
        title="Audit Log"
        description="Full record of all deletion events in the system."
      />

      <form method="GET" className="mb-6 flex gap-3">
        <select
          name="entity"
          defaultValue={entityFilter}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        >
          <option value="all">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Filter
        </button>
      </form>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-gray-700">No audit records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {log.entityName} — <span className="font-mono text-xs text-gray-500">{log.entityId}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    By {log.actor.name} ({log.actor.email})
                    {log.reason && <> · Reason: {log.reason}</>}
                    {log.ipAddress && <> · IP: {log.ipAddress}</>}
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString('en-MY')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`?entity=${entityFilter}&page=${page - 1}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Previous
            </a>
          )}
          <span className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`?entity=${entityFilter}&page=${page + 1}`}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add "audit-log" to AdminNav**

Open `src/components/ui/AdminTabBar.tsx` (or wherever `AdminNav` is defined) and add an Audit Log tab:

```tsx
{ href: '/dashboard/admin/audit-log', label: 'Audit Log', key: 'audit-log' }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/admin/audit-log/page.tsx
git add src/components/ui/AdminTabBar.tsx
git commit -m "feat: add admin AuditLog viewer page"
```

---

## Self-Review

**Spec coverage check:**
- [x] User soft delete — Task 4
- [x] `deletedAt`, `deletedById`, `deletedReason` on User — Task 1
- [x] Login blocked for deleted users — Task 3
- [x] AuditLog for all other hard deletes — Tasks 5–10
- [x] Admin can see deleted users — Task 11
- [x] Admin can view full audit trail — Task 12
- [x] Legally sensitive records (Agreement, RentPayment, DepositRefund) untouched — no delete routes exist for these; protected by existing cascade/blocker logic

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `logAudit` signature used consistently across Tasks 4–10. `getIp` used consistently. `previousData: object` cast used consistently.
