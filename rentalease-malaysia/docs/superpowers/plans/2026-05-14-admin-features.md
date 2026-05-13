# Admin Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verified entity browsing, verification revocation, KYC queue filtering, and admin in-app notifications to the admin dashboard.

**Architecture:** Schema gets 4 new `NotificationType` enum values. Two new API routes handle revocation. Two existing API routes are extended to notify admins on IC upload and property creation. Two existing RSC pages gain a Pending/Verified tab controlled by `?tab=` search param. Two new small components (`RevokeButton`, `AdminTabBar`) are added. One line removed from `DashboardShell` to enable the notification bell for admin.

**Tech Stack:** Next.js 16 (App Router, RSC, Turbopack), Prisma 5.22, PostgreSQL (Neon), NextAuth v4, Tailwind CSS v4, TypeScript

---

## File Map

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — +4 NotificationType enum values |
| `src/app/api/admin/users/[id]/revoke/route.ts` | Create |
| `src/app/api/admin/properties/[id]/revoke/route.ts` | Create |
| `src/app/api/tenant-documents/route.ts` | Modify — notify admins on IC_COPY upload |
| `src/app/api/properties/route.ts` | Modify — notify admins on property create |
| `src/components/ui/RevokeButton.tsx` | Create |
| `src/components/ui/AdminTabBar.tsx` | Create |
| `src/app/(dashboard)/dashboard/admin/verify/page.tsx` | Modify — tabs, IC filter, IC date, verified list |
| `src/app/(dashboard)/dashboard/admin/properties/page.tsx` | Modify — tabs, verified list |
| `src/components/ui/DashboardShell.tsx` | Modify — enable notification bell for admin |

---

## Task 1: Schema — add 4 NotificationType enum values + migrate

**Files:**
- Modify: `prisma/schema.prisma`

The `NotificationType` enum currently ends with `PROPERTY_VERIFICATION_REJECTED`. Add four values after it.

- [ ] **Step 1: Edit schema.prisma**

Open `prisma/schema.prisma`. Find the `NotificationType` enum (currently ends at `PROPERTY_VERIFICATION_REJECTED`). Add the four new values:

```prisma
enum NotificationType {
  INVITATION_RECEIVED
  INVITATION_RESPONDED
  AGREEMENT_READY
  AGREEMENT_CHANGES_REQUESTED
  AGREEMENT_SIGNED
  AGREEMENT_SIGNATURE_PROOF_UPLOADED
  AGREEMENT_SIGNATURE_PROOF_APPROVED
  AGREEMENT_SIGNATURE_PROOF_REJECTED
  PAYMENT_PROOF_UPLOADED
  PAYMENT_APPROVED
  PAYMENT_REJECTED
  CONDITION_REPORT_CREATED
  CONDITION_REPORT_ACKNOWLEDGED
  DEPOSIT_DEDUCTION_FILED
  DEPOSIT_REFUND_PAID
  TENANCY_ENDING_SOON
  MUTUAL_TERMINATION_PROPOSED
  MUTUAL_TERMINATION_RESPONDED
  DEPOSIT_PROOF_UPLOADED
  DEPOSIT_PROOF_APPROVED
  DEPOSIT_PROOF_REJECTED
  ACCOUNT_VERIFIED
  ACCOUNT_KYC_REJECTED
  PROPERTY_VERIFICATION_APPROVED
  PROPERTY_VERIFICATION_REJECTED
  KYC_SUBMITTED
  PROPERTY_SUBMITTED
  ACCOUNT_VERIFICATION_REVOKED
  PROPERTY_VERIFICATION_REVOKED
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-admin-notification-types
```

Expected output includes:
```
✓ Generated Prisma Client
The following migration(s) have been applied: ..._add_admin_notification_types
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add KYC_SUBMITTED, PROPERTY_SUBMITTED, ACCOUNT_VERIFICATION_REVOKED, PROPERTY_VERIFICATION_REVOKED notification types"
```

---

## Task 2: RevokeButton component

**Files:**
- Create: `src/components/ui/RevokeButton.tsx`

Generic client component. Accepts `revokeUrl` as a prop so it works for both user and property revocation. State machine: `idle → revoking → revoked`. Reason is mandatory before confirm. Uses orange colour to distinguish from the red reject action.

- [ ] **Step 1: Create the file**

`src/components/ui/RevokeButton.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  revokeUrl: string;
}

type State = 'idle' | 'revoking' | 'revoked';

export default function RevokeButton({ revokeUrl }: Props) {
  const [state, setState] = useState<State>('idle');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRevoke = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(revokeUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        setState('revoked');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (state === 'revoked') {
    return (
      <span className="text-orange-700 text-sm font-semibold bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">
        Revoked
      </span>
    );
  }

  if (state === 'revoking') {
    return (
      <div className="flex flex-col gap-2 w-48">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for revocation…"
          rows={3}
          autoFocus
          className="w-full text-xs border border-orange-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
        <div className="flex gap-1.5">
          <button
            onClick={handleRevoke}
            disabled={loading || !reason.trim()}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            {loading ? 'Revoking…' : 'Confirm'}
          </button>
          <button
            onClick={() => { setState('idle'); setReason(''); }}
            disabled={loading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState('revoking')}
      className="border border-orange-200 hover:bg-orange-50 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
    >
      Revoke
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/RevokeButton.tsx
git commit -m "feat: add RevokeButton component"
```

---

## Task 3: AdminTabBar component

**Files:**
- Create: `src/components/ui/AdminTabBar.tsx`

Tiny client component. Receives `activeTab`, `pendingCount`, and `verifiedCount` as props from the RSC parent (avoids `useSearchParams` and its Suspense requirement). Renders two `<Link>` tags that update `?tab=`.

- [ ] **Step 1: Create the file**

`src/components/ui/AdminTabBar.tsx`:

```tsx
'use client';

import Link from 'next/link';

interface Props {
  activeTab: 'pending' | 'verified';
  pendingCount: number;
  verifiedCount: number;
}

export default function AdminTabBar({ activeTab, pendingCount, verifiedCount }: Props) {
  const base = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';
  const active = 'bg-blue-600 text-white';
  const inactive = 'text-gray-600 hover:bg-gray-100';

  return (
    <div className="flex gap-2 mb-6">
      <Link
        href="?tab=pending"
        className={`${base} ${activeTab === 'pending' ? active : inactive}`}
      >
        Pending ({pendingCount})
      </Link>
      <Link
        href="?tab=verified"
        className={`${base} ${activeTab === 'verified' ? active : inactive}`}
      >
        Verified ({verifiedCount})
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AdminTabBar.tsx
git commit -m "feat: add AdminTabBar component"
```

---

## Task 4: User revoke API route

**Files:**
- Create: `src/app/api/admin/users/[id]/revoke/route.ts`

Mirrors the shape of the existing reject route. Guards: must be ADMIN, reason required, target must be a non-admin verified user. Sets `isVerified = false`, stores reason in `kycRejectedReason`, sends `ACCOUNT_VERIFICATION_REVOKED` notification.

- [ ] **Step 1: Create the file**

`src/app/api/admin/users/[id]/revoke/route.ts`:

```typescript
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
  const body = await request.json();
  const reason = (body.reason as string)?.trim();

  if (!reason)
    return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, isVerified: true },
  });

  if (!user || user.role === 'ADMIN')
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (!user.isVerified)
    return NextResponse.json({ error: 'User is not currently verified' }, { status: 400 });

  await prisma.user.update({
    where: { id },
    data: { isVerified: false, kycRejectedReason: reason },
  });

  await createNotification(
    id,
    'ACCOUNT_VERIFICATION_REVOKED',
    'Identity verification revoked',
    `Your identity verification has been revoked by an admin. Reason: ${reason}. Please re-upload your documents for review.`,
    '/dashboard/profile',
  );

  return NextResponse.json({ message: 'Verification revoked' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/users/
git commit -m "feat: add user verification revoke API route"
```

---

## Task 5: Property revoke API route

**Files:**
- Create: `src/app/api/admin/properties/[id]/revoke/route.ts`

Same shape as the user revoke route. Sets `isVerified = false`, stores reason in `rejectedReason`, sends `PROPERTY_VERIFICATION_REVOKED` notification to the landlord.

- [ ] **Step 1: Create the file**

`src/app/api/admin/properties/[id]/revoke/route.ts`:

```typescript
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
  const body = await request.json();
  const reason = (body.reason as string)?.trim();

  if (!reason)
    return NextResponse.json({ error: 'Revocation reason is required' }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, address: true, landlordId: true, isVerified: true },
  });

  if (!property)
    return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  if (!property.isVerified)
    return NextResponse.json({ error: 'Property is not currently verified' }, { status: 400 });

  await prisma.property.update({
    where: { id },
    data: { isVerified: false, rejectedReason: reason },
  });

  await createNotification(
    property.landlordId,
    'PROPERTY_VERIFICATION_REVOKED',
    'Property verification revoked',
    `Your property at "${property.address}" has had its verification revoked. Reason: ${reason}. Please update the listing and it will be reviewed again.`,
    '/dashboard/landlord/properties',
  );

  return NextResponse.json({ message: 'Property verification revoked' });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/properties/
git commit -m "feat: add property verification revoke API route"
```

---

## Task 6: Notify admins on IC upload

**Files:**
- Modify: `src/app/api/tenant-documents/route.ts`

After the successful `IC_COPY` upsert, fetch all admin user IDs and call `createNotification` for each. Fire-and-forget — errors are swallowed by `createNotification`. Uses `session.user.email` (name is not in the session JWT).

- [ ] **Step 1: Add import at top of file**

In `src/app/api/tenant-documents/route.ts`, add `createNotification` to the existing imports:

```typescript
import { createNotification } from '@/lib/notifications';
```

- [ ] **Step 2: Add admin notification after the upsert**

After the `prisma.tenantDocument.upsert(...)` call (currently the last DB operation before the return), add:

```typescript
    if (type === 'IC_COPY') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      await Promise.all(
        admins.map((admin) =>
          createNotification(
            admin.id,
            'KYC_SUBMITTED',
            'New KYC submission',
            `${session.user.email} has submitted their identity document for review.`,
            '/dashboard/admin/verify',
          ),
        ),
      );
    }
```

The full POST handler body after this change (lines 25–87 of the original, with the addition):

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role === 'ADMIN')
    return NextResponse.json({ error: 'Admins do not upload identity documents' }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!type || !['IC_COPY', 'INCOME_PROOF'].includes(type))
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });

    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPG, PNG, WebP, PDF' },
        { status: 400 },
      );

    const existing = await prisma.tenantDocument.findUnique({
      where: { userId_type: { userId: session.user.id, type: type as 'IC_COPY' | 'INCOME_PROOF' } },
    });
    if (existing) {
      try { await deleteTenantDocument(existing.publicId); } catch { /* non-blocking */ }
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { url, publicId } = await uploadTenantDocument(buffer, file.name, file.type);

    const doc = await prisma.tenantDocument.upsert({
      where: { userId_type: { userId: session.user.id, type: type as 'IC_COPY' | 'INCOME_PROOF' } },
      create: {
        userId: session.user.id,
        type: type as 'IC_COPY' | 'INCOME_PROOF',
        imageUrl: url,
        publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
      update: {
        imageUrl: url,
        publicId,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date(),
      },
    });

    if (type === 'IC_COPY') {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      await Promise.all(
        admins.map((admin) =>
          createNotification(
            admin.id,
            'KYC_SUBMITTED',
            'New KYC submission',
            `${session.user.email} has submitted their identity document for review.`,
            '/dashboard/admin/verify',
          ),
        ),
      );
    }

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (error) {
    console.error('Tenant document upload error:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tenant-documents/route.ts
git commit -m "feat: notify admins when IC document is uploaded"
```

---

## Task 7: Notify admins on property create

**Files:**
- Modify: `src/app/api/properties/route.ts`

After the successful `prisma.property.create`, fetch all admin IDs and notify. The property address is available from the create result.

- [ ] **Step 1: Add import at top of file**

In `src/app/api/properties/route.ts`, add `createNotification` to the existing imports:

```typescript
import { createNotification } from '@/lib/notifications';
```

- [ ] **Step 2: Add admin notification after property create**

After the `prisma.property.create(...)` call, add the notification block. The full POST handler after the change:

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session)
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (session.user.role !== 'LANDLORD')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isVerified: true },
  });
  if (!currentUser?.isVerified) {
    return NextResponse.json(
      { error: 'Your account must be verified before you can list properties. Please wait for admin approval of your identity documents.' },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const data = propertySchema.parse(body);

    const property = await prisma.property.create({
      data: {
        ...data,
        landlordId: session.user.id,
      },
      select: {
        id: true,
        address: true,
        city: true,
        type: true,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        createNotification(
          admin.id,
          'PROPERTY_SUBMITTED',
          'New property submitted',
          `A new property at "${property.address}" has been submitted for verification.`,
          '/dashboard/admin/properties',
        ),
      ),
    );

    return NextResponse.json(
      { message: 'Property created successfully', property },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 },
      );
    console.error('Create property error:', error);
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/properties/route.ts
git commit -m "feat: notify admins when a property is submitted"
```

---

## Task 8: Update admin/verify page — tabs, IC filter, IC date, verified list

**Files:**
- Modify: `src/app/(dashboard)/dashboard/admin/verify/page.tsx`

Replace the entire file. Key changes:
- Accept `searchParams` prop (Next.js 16 RSC — it's a Promise)
- Always fetch `pendingUsers` (with IC filter) and `verifiedCount` in parallel
- Fetch `verifiedUsers` only when `tab === 'verified'`
- Render `AdminTabBar`, then the appropriate card list
- Pending cards show `VerifyButton`; verified cards show `RevokeButton`
- IC submission date shown on every card

- [ ] **Step 1: Replace the file**

`src/app/(dashboard)/dashboard/admin/verify/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import VerifyButton from '@/components/ui/VerifyButton';
import RevokeButton from '@/components/ui/RevokeButton';
import AdminTabBar from '@/components/ui/AdminTabBar';

export default async function AdminVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const { tab } = await searchParams;
  const activeTab = tab === 'verified' ? 'verified' : 'pending';

  const [pendingUsers, verifiedCount] = await Promise.all([
    prisma.user.findMany({
      where: {
        isVerified: false,
        role: { not: 'ADMIN' },
        tenantDocuments: { some: { type: 'IC_COPY' } },
      },
      include: {
        tenantDocuments: {
          where: { type: 'IC_COPY' },
          select: { imageUrl: true, uploadedAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.count({ where: { isVerified: true, role: { not: 'ADMIN' } } }),
  ]);

  const verifiedUsers =
    activeTab === 'verified'
      ? await prisma.user.findMany({
          where: { isVerified: true, role: { not: 'ADMIN' } },
          include: {
            tenantDocuments: {
              where: { type: 'IC_COPY' },
              select: { imageUrl: true, uploadedAt: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

  const displayUsers = activeTab === 'pending' ? pendingUsers : verifiedUsers;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">KYC Verification</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
      </div>

      <AdminTabBar
        activeTab={activeTab}
        pendingCount={pendingUsers.length}
        verifiedCount={verifiedCount}
      />

      {displayUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold">
            {activeTab === 'pending' ? 'No pending KYC submissions' : 'No verified users yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'pending'
              ? 'Users who have uploaded their IC will appear here.'
              : 'Approved users will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayUsers.map((user) => {
            const icDoc = user.tenantDocuments[0] ?? null;
            const wasRejected = !!user.kycRejectedReason;
            return (
              <div
                key={user.id}
                className={`bg-white border rounded-xl p-5 flex items-start gap-5 ${
                  wasRejected && activeTab === 'pending' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center mt-0.5">
                  {icDoc ? (
                    <Image
                      src={icDoc.imageUrl}
                      alt="IC copy"
                      width={80}
                      height={56}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 text-center leading-tight px-1">
                      No IC<br />uploaded
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'LANDLORD'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {user.role}
                    </span>
                    {wasRejected && activeTab === 'pending' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Previously rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {user.icNumber ? (
                    <p className="text-xs text-gray-500 mt-0.5">IC: {user.icNumber}</p>
                  ) : (
                    <p className="text-xs text-amber-500 mt-0.5">IC number not provided</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Registered:{' '}
                    {new Date(user.createdAt).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {icDoc && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      IC submitted:{' '}
                      {new Date(icDoc.uploadedAt).toLocaleDateString('en-MY', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  )}

                  {wasRejected && activeTab === 'pending' && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 mb-0.5">
                        Previous rejection reason
                      </p>
                      <p className="text-xs text-red-600">{user.kycRejectedReason}</p>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  {icDoc && (
                    <a
                      href={icDoc.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View full IC
                    </a>
                  )}
                  {activeTab === 'pending' ? (
                    <VerifyButton userId={user.id} disabled={!icDoc && !user.icNumber} />
                  ) : (
                    <RevokeButton revokeUrl={`/api/admin/users/${user.id}/revoke`} />
                  )}
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

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/dashboard/admin/verify/page.tsx"
git commit -m "feat: add pending/verified tabs and IC filter to KYC queue"
```

---

## Task 9: Update admin/properties page — tabs and verified list

**Files:**
- Modify: `src/app/(dashboard)/dashboard/admin/properties/page.tsx`

Same tab pattern as Task 8. Pending tab shows the existing unverified property cards with `VerifyPropertyButton`. Verified tab shows verified properties with `RevokeButton`.

- [ ] **Step 1: Replace the file**

`src/app/(dashboard)/dashboard/admin/properties/page.tsx`:

```tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import VerifyPropertyButton from '@/components/ui/VerifyPropertyButton';
import RevokeButton from '@/components/ui/RevokeButton';
import AdminTabBar from '@/components/ui/AdminTabBar';

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const { tab } = await searchParams;
  const activeTab = tab === 'verified' ? 'verified' : 'pending';

  const [unverifiedProperties, verifiedCount] = await Promise.all([
    prisma.property.findMany({
      where: { isVerified: false },
      include: {
        landlord: { select: { name: true, email: true, icNumber: true, isVerified: true } },
        rooms: { select: { id: true } },
        photos: { select: { imageUrl: true, caption: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.property.count({ where: { isVerified: true } }),
  ]);

  const verifiedProperties =
    activeTab === 'verified'
      ? await prisma.property.findMany({
          where: { isVerified: true },
          include: {
            landlord: { select: { name: true, email: true, icNumber: true, isVerified: true } },
            rooms: { select: { id: true } },
            photos: { select: { imageUrl: true, caption: true }, orderBy: { order: 'asc' } },
          },
          orderBy: { updatedAt: 'desc' },
        })
      : [];

  const displayProperties = activeTab === 'pending' ? unverifiedProperties : verifiedProperties;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
        <Link href="/dashboard/admin" className="hover:text-blue-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Property Verification</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Property Verification</h1>
      </div>

      <AdminTabBar
        activeTab={activeTab}
        pendingCount={unverifiedProperties.length}
        verifiedCount={verifiedCount}
      />

      {displayProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold">
            {activeTab === 'pending' ? 'All properties are verified' : 'No verified properties yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'pending'
              ? 'No pending property approvals.'
              : 'Approved properties will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayProperties.map((property) => {
            const wasRejected = !!property.rejectedReason;
            return (
              <div
                key={property.id}
                className={`bg-white border rounded-xl p-5 flex items-start gap-5 ${
                  wasRejected && activeTab === 'pending' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{property.address}</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {property.type}
                    </span>
                    {wasRejected && activeTab === 'pending' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        Previously rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {property.city}, {property.state} {property.postcode}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''} &middot; Listed{' '}
                    {new Date(property.createdAt).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>

                  {property.photos.length > 0 ? (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {property.photos.map((photo, i) => (
                        <a key={i} href={photo.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={photo.imageUrl}
                            alt={photo.caption ?? `Photo ${i + 1}`}
                            className="w-20 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600 font-medium">No photos uploaded</p>
                  )}

                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-600 font-medium">
                      Landlord: {property.landlord.name}
                    </p>
                    <p className="text-xs text-gray-400">{property.landlord.email}</p>
                    {property.landlord.icNumber && (
                      <p className="text-xs text-gray-400">IC: {property.landlord.icNumber}</p>
                    )}
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${
                        property.landlord.isVerified
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      Landlord {property.landlord.isVerified ? 'Identity Verified' : 'Identity Pending'}
                    </span>
                  </div>

                  {wasRejected && activeTab === 'pending' && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-700 mb-0.5">Previous rejection reason</p>
                      <p className="text-xs text-red-600">{property.rejectedReason}</p>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {activeTab === 'pending' ? (
                    <VerifyPropertyButton propertyId={property.id} />
                  ) : (
                    <RevokeButton revokeUrl={`/api/admin/properties/${property.id}/revoke`} />
                  )}
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

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/dashboard/admin/properties/page.tsx"
git commit -m "feat: add pending/verified tabs to property verification queue"
```

---

## Task 10: Enable notification bell for admin in DashboardShell

**Files:**
- Modify: `src/components/ui/DashboardShell.tsx`

Remove `role !== 'ADMIN'` from the notification bell/dropdown block only. The messages link guard stays — admins have no tenancy messages.

- [ ] **Step 1: Edit DashboardShell.tsx**

Find the notification bell block (currently lines 80–93):

```tsx
          {/* Notification bell — not for ADMIN */}
          {role !== 'ADMIN' && (
            <div className="relative">
              <NotificationBell
                count={unreadCounts.notificationCount}
                onClick={() => setNotificationOpen((v) => !v)}
              />
              <NotificationDropdown
                open={notificationOpen}
                onClose={() => setNotificationOpen(false)}
                onCountChanged={fetchUnreadCounts}
              />
            </div>
          )}
```

Replace with (remove the `role !== 'ADMIN' &&` condition and update the comment):

```tsx
          {/* Notification bell */}
          <div className="relative">
            <NotificationBell
              count={unreadCounts.notificationCount}
              onClick={() => setNotificationOpen((v) => !v)}
            />
            <NotificationDropdown
              open={notificationOpen}
              onClose={() => setNotificationOpen(false)}
              onCountChanged={fetchUnreadCounts}
            />
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/DashboardShell.tsx
git commit -m "feat: enable notification bell for admin role"
```

---

## Manual Verification Checklist

After all tasks are complete, start the dev server (`npm run dev`) and verify:

- [ ] `/dashboard/admin/verify` shows "Pending (N)" and "Verified (N)" tabs
- [ ] Pending tab only shows users who have uploaded an IC document (users with no IC upload are absent)
- [ ] Each pending card shows an "IC submitted: …" date
- [ ] Clicking "Verified" tab shows verified users with orange "Revoke" button
- [ ] Clicking Revoke opens a textarea; submitting with a reason shows "Revoked" badge and the user disappears from the verified tab on refresh
- [ ] `/dashboard/admin/properties` shows "Pending / Verified" tabs with the same pattern
- [ ] Admin notification bell is visible in the header
- [ ] Uploading an IC as a tenant creates a notification visible in the admin bell
- [ ] Creating a property as a landlord creates a notification visible in the admin bell
- [ ] Revoked user receives an in-app notification on next login
