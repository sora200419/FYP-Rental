# UI/UX Wireframe Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved RentalEase UI/UX wireframe redesign across core pages while preserving the existing dark-sidebar/light-dashboard visual system.

**Architecture:** Add small shared presentation helpers and UI primitives first, then migrate page groups in phases: dashboards/property photos, tenancy/agreement guided flows, ledger review pages, messages, and auth. Do not change API behavior, auth rules, Prisma schema, payment logic, agreement generation, or tenancy business rules.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, Prisma Client, Vitest.

---

## Scope Guard

Only edit UI-facing files and pure UI helper tests. Ignore unrelated dirty worktree changes unless they directly conflict with the current task. Do not run schema migrations, modify API route behavior, or change existing data models.

Approved design spec: `docs/superpowers/specs/2026-05-13-ui-ux-wireframe-redesign-design.md`

Command convention:

- Run `npm.cmd` commands from `C:\Users\ONG\OneDrive\Desktop\FYP Rental\rentalease-malaysia`.
- Run `git add` and `git commit` commands from `C:\Users\ONG\OneDrive\Desktop\FYP Rental`.
- Quote paths containing `(dashboard)` or `[id]` in PowerShell commands.

## File Structure

- Create `src/lib/uiRedesign.ts`: pure formatting and selection helpers for property covers, occupancy labels, and dashboard attention labels.
- Create `tests/unit/ui-redesign.test.ts`: Vitest coverage for helper behavior.
- Create `src/components/ui/PropertyCover.tsx`: reusable image/fallback display for property cards, tenancy headers, and verification rows.
- Create `src/components/ui/RedesignPrimitives.tsx`: reusable page header, attention hero, KPI card, section shell, empty state, and review-row layout.
- Modify dashboard pages:
  - `src/app/(dashboard)/dashboard/landlord/page.tsx`
  - `src/app/(dashboard)/dashboard/tenant/page.tsx`
  - `src/app/(dashboard)/dashboard/admin/page.tsx`
- Modify property pages:
  - `src/app/(dashboard)/dashboard/landlord/properties/page.tsx`
  - `src/app/(dashboard)/dashboard/landlord/properties/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/admin/properties/page.tsx`
- Modify tenancy/agreement pages:
  - `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`
  - `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
  - `src/components/ui/AgreementViewer.tsx`
  - `src/components/wizard/WizardContainer.tsx`
  - `src/components/wizard/WizardStepLayout.tsx`
- Modify ledger pages:
  - `src/app/(dashboard)/dashboard/landlord/payments/page.tsx`
  - `src/app/(dashboard)/dashboard/tenant/payments/page.tsx`
  - `src/app/(dashboard)/dashboard/admin/verify/page.tsx`
  - `src/components/ui/PaymentVerficationCard.tsx`
  - `src/components/ui/DepositVerificationCard.tsx`
- Modify messages:
  - `src/components/ui/LandlordMessagesClient.tsx`
  - `src/components/ui/MessageThread.tsx`
  - tenant messages page if it duplicates landlord message structure.
- Modify auth:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/register/page.tsx`
  - `src/app/(auth)/forgot-password/page.tsx`
  - `src/app/(auth)/reset-password/page.tsx`

---

### Task 1: Add UI Helper Tests And Shared Helpers

**Files:**
- Create: `src/lib/uiRedesign.ts`
- Create: `tests/unit/ui-redesign.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `tests/unit/ui-redesign.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getDashboardAttention,
  getOccupancySummary,
  getPropertyCover,
  getPropertyCoverAlt,
} from '../../src/lib/uiRedesign';

describe('uiRedesign helpers', () => {
  it('selects the first ordered property photo as the cover', () => {
    const cover = getPropertyCover([
      { id: '2', imageUrl: '/second.jpg', caption: 'Second', order: 2 },
      { id: '1', imageUrl: '/first.jpg', caption: 'Front view', order: 1 },
    ]);

    expect(cover).toEqual({
      imageUrl: '/first.jpg',
      caption: 'Front view',
    });
  });

  it('returns null when no property photos exist', () => {
    expect(getPropertyCover([])).toBeNull();
  });

  it('builds accessible alt text from caption and address', () => {
    expect(getPropertyCoverAlt('Jalan Ampang Residence', 'Front view')).toBe(
      'Front view for Jalan Ampang Residence',
    );
    expect(getPropertyCoverAlt('Jalan Ampang Residence')).toBe(
      'Property photo for Jalan Ampang Residence',
    );
  });

  it('formats occupancy summaries', () => {
    expect(getOccupancySummary({ totalRooms: 0, occupiedRooms: 0 })).toEqual({
      label: 'No rooms',
      tone: 'muted',
    });
    expect(getOccupancySummary({ totalRooms: 3, occupiedRooms: 3 })).toEqual({
      label: 'Fully occupied',
      tone: 'success',
    });
    expect(getOccupancySummary({ totalRooms: 4, occupiedRooms: 2 })).toEqual({
      label: '2/4 occupied',
      tone: 'warning',
    });
  });

  it('chooses role-specific dashboard attention copy', () => {
    expect(
      getDashboardAttention({
        role: 'LANDLORD',
        pendingPaymentVerifications: 2,
        pendingAgreementReviews: 0,
        unacknowledgedConditionReports: 0,
      }).title,
    ).toBe('2 payment proofs need review');

    expect(
      getDashboardAttention({
        role: 'TENANT',
        pendingPaymentVerifications: 0,
        pendingAgreementReviews: 1,
        unacknowledgedConditionReports: 0,
      }).actionLabel,
    ).toBe('Review agreement');

    expect(
      getDashboardAttention({
        role: 'ADMIN',
        pendingKyc: 0,
        pendingProperties: 3,
      }).title,
    ).toBe('3 properties need verification');
  });
});
```

- [ ] **Step 2: Run the helper tests to verify they fail**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
Pop-Location
```

Expected: FAIL because `src/lib/uiRedesign.ts` does not exist.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/uiRedesign.ts`:

```ts
export type PropertyPhotoLike = {
  id?: string;
  imageUrl: string;
  caption?: string | null;
  order?: number | null;
  createdAt?: Date | string;
};

export type Tone = 'default' | 'muted' | 'success' | 'warning' | 'danger' | 'info';

export function getPropertyCover(photos: PropertyPhotoLike[]) {
  if (photos.length === 0) return null;

  const [cover] = [...photos].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''));
  });

  return {
    imageUrl: cover.imageUrl,
    caption: cover.caption ?? null,
  };
}

export function getPropertyCoverAlt(address: string, caption?: string | null) {
  return caption ? `${caption} for ${address}` : `Property photo for ${address}`;
}

export function getOccupancySummary({
  totalRooms,
  occupiedRooms,
}: {
  totalRooms: number;
  occupiedRooms: number;
}): { label: string; tone: Tone } {
  if (totalRooms === 0) return { label: 'No rooms', tone: 'muted' };
  if (occupiedRooms === totalRooms) return { label: 'Fully occupied', tone: 'success' };
  if (occupiedRooms === 0) return { label: 'Vacant', tone: 'default' };
  return { label: `${occupiedRooms}/${totalRooms} occupied`, tone: 'warning' };
}

export function getDashboardAttention(input:
  | {
      role: 'LANDLORD';
      pendingPaymentVerifications: number;
      pendingAgreementReviews: number;
      unacknowledgedConditionReports: number;
    }
  | {
      role: 'TENANT';
      pendingPaymentVerifications: number;
      pendingAgreementReviews: number;
      unacknowledgedConditionReports: number;
    }
  | {
      role: 'ADMIN';
      pendingKyc: number;
      pendingProperties: number;
    },
) {
  if (input.role === 'ADMIN') {
    if (input.pendingKyc > 0) {
      return {
        title: `${input.pendingKyc} users need KYC verification`,
        description: 'Review identity documents so verified users can continue their rental workflow.',
        actionLabel: 'Open KYC queue',
      };
    }
    if (input.pendingProperties > 0) {
      return {
        title: `${input.pendingProperties} properties need verification`,
        description: 'Review property evidence before landlords invite tenants.',
        actionLabel: 'Open property queue',
      };
    }
    return {
      title: 'Verification queues are clear',
      description: 'No user or property reviews are waiting right now.',
      actionLabel: 'View dashboard',
    };
  }

  if (input.role === 'LANDLORD') {
    if (input.pendingPaymentVerifications > 0) {
      return {
        title: `${input.pendingPaymentVerifications} payment proofs need review`,
        description: 'Confirm or reject submitted payment evidence to keep rent records current.',
        actionLabel: 'Review payments',
      };
    }
    if (input.pendingAgreementReviews > 0) {
      return {
        title: `${input.pendingAgreementReviews} agreements need attention`,
        description: 'Review requested changes before sending the next agreement version.',
        actionLabel: 'Review agreements',
      };
    }
    if (input.unacknowledgedConditionReports > 0) {
      return {
        title: `${input.unacknowledgedConditionReports} condition reports need review`,
        description: 'Check tenant-submitted condition reports and keep the tenancy record complete.',
        actionLabel: 'Review reports',
      };
    }
    return {
      title: 'Portfolio is up to date',
      description: 'No urgent landlord actions are waiting right now.',
      actionLabel: 'View properties',
    };
  }

  if (input.pendingAgreementReviews > 0) {
    return {
      title: `${input.pendingAgreementReviews} agreement needs your review`,
      description: 'Review the latest agreement terms before signing or requesting changes.',
      actionLabel: 'Review agreement',
    };
  }
  if (input.pendingPaymentVerifications > 0) {
    return {
      title: `${input.pendingPaymentVerifications} payment item needs follow-up`,
      description: 'Check payment proof status and fix rejected uploads if needed.',
      actionLabel: 'View payments',
    };
  }
  if (input.unacknowledgedConditionReports > 0) {
    return {
      title: `${input.unacknowledgedConditionReports} condition report needs acknowledgement`,
      description: 'Review property condition evidence and acknowledge the report.',
      actionLabel: 'Review condition report',
    };
  }
  return {
    title: 'Your tenancy is up to date',
    description: 'No urgent tenant actions are waiting right now.',
    actionLabel: 'View tenancy',
  };
}
```

- [ ] **Step 4: Run helper tests to verify they pass**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
Pop-Location
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add "rentalease-malaysia/src/lib/uiRedesign.ts" "rentalease-malaysia/tests/unit/ui-redesign.test.ts"
git commit -m "test: add ui redesign helpers"
```

---

### Task 2: Add Shared UI Primitives

**Files:**
- Create: `src/components/ui/PropertyCover.tsx`
- Create: `src/components/ui/RedesignPrimitives.tsx`

- [ ] **Step 1: Create the property cover component**

Create `src/components/ui/PropertyCover.tsx`:

```tsx
import Image from 'next/image';
import { getPropertyCoverAlt } from '@/lib/uiRedesign';

type PropertyCoverProps = {
  address: string;
  imageUrl?: string | null;
  caption?: string | null;
  className?: string;
  heightClassName?: string;
  fallbackLabel?: string;
};

export default function PropertyCover({
  address,
  imageUrl,
  caption,
  className = '',
  heightClassName = 'h-40',
  fallbackLabel = 'No photo yet',
}: PropertyCoverProps) {
  const baseClass = `relative overflow-hidden bg-gray-100 ${heightClassName} ${className}`;

  if (!imageUrl) {
    return (
      <div className={`${baseClass} flex items-center justify-center border border-dashed border-gray-300`}>
        <div className="text-center px-4">
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2 1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-gray-500">{fallbackLabel}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">Add photos to improve recognition</p>
        </div>
      </div>
    );
  }

  return (
    <div className={baseClass}>
      <Image
        src={imageUrl}
        alt={getPropertyCoverAlt(address, caption)}
        fill
        sizes="(max-width: 768px) 100vw, 360px"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-3">
        <p className="text-xs font-semibold text-white drop-shadow">{caption ?? address}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create reusable redesign primitives**

Create `src/components/ui/RedesignPrimitives.tsx`:

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type AttentionHeroProps = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  secondary?: ReactNode;
};

export function AttentionHero({
  title,
  description,
  actionLabel,
  href,
  secondary,
}: AttentionHeroProps) {
  return (
    <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Today</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
          <Link
            href={href}
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {actionLabel}
          </Link>
        </div>
        {secondary && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">{secondary}</div>
        )}
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'blue' | 'green' | 'amber' | 'red';
};

const toneText = {
  default: 'text-gray-900',
  blue: 'text-blue-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
};

export function StatCard({ label, value, detail, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-2 truncate text-2xl font-bold ${toneText[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-400">{detail}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <p className="text-base font-semibold text-gray-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-gray-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Run build to catch import/type issues**

Run:

```powershell
Push-Location rentalease-malaysia
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: PASS through TypeScript/Next build.

- [ ] **Step 4: Commit Task 2**

```powershell
git add "rentalease-malaysia/src/components/ui/PropertyCover.tsx" "rentalease-malaysia/src/components/ui/RedesignPrimitives.tsx"
git commit -m "feat: add redesign ui primitives"
```

---

### Task 3: Redesign Role Dashboards And Property Cards

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/properties/page.tsx`

- [ ] **Step 1: Extend property queries to include cover photos**

In landlord dashboard and landlord properties page, update property includes:

```ts
photos: {
  select: { imageUrl: true, caption: true, order: true, createdAt: true },
  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  take: 1,
},
```

In tenant dashboard, update tenancy property include:

```ts
photos: {
  select: { imageUrl: true, caption: true, order: true, createdAt: true },
  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  take: 1,
},
```

- [ ] **Step 2: Apply Command Center layout to landlord dashboard**

In `src/app/(dashboard)/dashboard/landlord/page.tsx`, import:

```ts
import PropertyCover from '@/components/ui/PropertyCover';
import { AttentionHero, PageHeader, SectionCard, StatCard } from '@/components/ui/RedesignPrimitives';
import { getDashboardAttention, getPropertyCover } from '@/lib/uiRedesign';
```

Use:

```tsx
const attention = getDashboardAttention({
  role: 'LANDLORD',
  pendingPaymentVerifications,
  pendingAgreementReviews: pendingChangesRequested,
  unacknowledgedConditionReports,
});
```

Replace the page header, financial summary, summary stats, and quick actions with:

```tsx
<PageHeader
  eyebrow="Landlord workspace"
  title={`Welcome back, ${session.user.name}`}
  description="Manage property performance, tenancy actions, and payment reviews from one workspace."
/>

<DashboardBanners
  role="LANDLORD"
  pendingChangesRequested={pendingChangesRequested}
  pendingPaymentVerifications={pendingPaymentVerifications}
  unacknowledgedConditionReports={unacknowledgedConditionReports}
/>

<AttentionHero
  title={attention.title}
  description={attention.description}
  actionLabel={attention.actionLabel}
  href={
    pendingPaymentVerifications > 0
      ? '/dashboard/landlord/payments'
      : pendingChangesRequested > 0
        ? '/dashboard/landlord/tenancies'
        : '/dashboard/landlord/properties'
  }
  secondary={
    <div className="space-y-2 text-sm">
      <p className="font-semibold text-blue-900">Priority queue</p>
      <p className="text-blue-700">{pendingPaymentVerifications} payment proofs</p>
      <p className="text-blue-700">{pendingChangesRequested} agreement reviews</p>
      <p className="text-blue-700">{unacknowledgedConditionReports} condition reports</p>
    </div>
  }
/>

<div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
  <StatCard label="Income 30d" value={`RM ${confirmedIncome30d.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`} tone="green" />
  <StatCard label="Overdue" value={`RM ${totalOverdue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`} tone={totalOverdue > 0 ? 'red' : 'default'} />
  <StatCard label="Occupancy" value={`${occupancyRate}%`} detail={`${activeRooms} / ${totalRooms} rooms`} tone="blue" />
  <StatCard label="Pending invites" value={invitedTenancies} tone={invitedTenancies > 0 ? 'amber' : 'default'} />
</div>
```

Then render property cards with `PropertyCover`:

```tsx
const cover = getPropertyCover(property.photos);

<div key={property.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
  <PropertyCover
    address={property.address}
    imageUrl={cover?.imageUrl}
    caption={cover?.caption}
    className="rounded-none border-0"
    heightClassName="h-36"
  />
  <div className="p-5">
    <p className="truncate text-sm font-semibold text-gray-900">{property.address}</p>
    <p className="mt-0.5 text-xs text-gray-500">{property.city}, {property.state}</p>
    <p className="mt-3 text-xs text-gray-500">{property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''}</p>
    <Link href={`/dashboard/landlord/properties/${property.id}`} className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:underline">
      Manage property
    </Link>
  </div>
</div>
```

- [ ] **Step 3: Apply Command Center layout to tenant dashboard**

In `src/app/(dashboard)/dashboard/tenant/page.tsx`, import primitives and `PropertyCover`. Replace the current top cards with a tenant attention hero whose primary action points to:

```ts
const primaryTenantHref = pendingAgreementReviews > 0
  ? '/dashboard/tenant/tenancy'
  : rejectedPayments > 0
    ? '/dashboard/tenant/payments'
    : unacknowledgedConditionReports > 0
      ? '/dashboard/tenant/conditions'
      : '/dashboard/tenant/tenancy';
```

For each active tenancy card, include:

```tsx
const cover = getPropertyCover(tenancy.room.property.photos ?? []);

<PropertyCover
  address={tenancy.room.property.address}
  imageUrl={cover?.imageUrl}
  caption={cover?.caption}
  className="rounded-xl"
  heightClassName="h-36 sm:h-full"
/>
```

Place it in a responsive grid:

```tsx
<div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-[180px_1fr]">
  <PropertyCover ... />
  <div>existing tenancy status, agreement status, next payment, and actions</div>
</div>
```

- [ ] **Step 4: Apply verification-center layout to admin dashboard**

In `src/app/(dashboard)/dashboard/admin/page.tsx`, import `PageHeader`, `AttentionHero`, and `StatCard`. Replace the flat link list with an attention hero using `getDashboardAttention({ role: 'ADMIN', pendingKyc: unverifiedCount, pendingProperties: unverifiedPropertiesCount })`, then render two review cards linking to `/dashboard/admin/verify` and `/dashboard/admin/properties`.

- [ ] **Step 5: Apply photo-led grid to landlord properties page**

In `src/app/(dashboard)/dashboard/landlord/properties/page.tsx`, include photos in the query, import `PropertyCover`, `PageHeader`, `EmptyState`, `StatCard`, and `getPropertyCover`. Replace each property card top area with `PropertyCover` and keep existing occupancy/status logic.

- [ ] **Step 6: Run tests and build**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: tests PASS and build PASS.

- [ ] **Step 7: Commit Task 3**

```powershell
git add "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/tenant/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/admin/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/properties/page.tsx"
git commit -m "feat: redesign role dashboards"
```

---

### Task 4: Redesign Property Detail And Admin Property Verification

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/properties/[id]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/properties/page.tsx`

- [ ] **Step 1: Convert landlord property detail to image-led header**

In `src/app/(dashboard)/dashboard/landlord/properties/[id]/page.tsx`, import:

```ts
import PropertyCover from '@/components/ui/PropertyCover';
import { PageHeader, SectionCard, StatCard } from '@/components/ui/RedesignPrimitives';
import { getOccupancySummary, getPropertyCover } from '@/lib/uiRedesign';
```

Before `return`, add:

```ts
const cover = getPropertyCover(property.photos);
const occupancy = getOccupancySummary({ totalRooms, occupiedRooms });
```

Replace the header and first photo section with:

```tsx
<PageHeader
  eyebrow="Property detail"
  title={property.address}
  description={`${property.city}, ${property.state} ${property.postcode}`}
  action={<DeletePropertyButton propertyId={property.id} propertyAddress={property.address} />}
/>

<div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
  <PropertyCover
    address={property.address}
    imageUrl={cover?.imageUrl}
    caption={cover?.caption}
    className="rounded-none border-0"
    heightClassName="h-64"
  />
  <div className="grid gap-4 p-5 sm:grid-cols-3">
    <StatCard label="Property type" value={property.type} />
    <StatCard label="Occupancy" value={occupancy.label} tone={occupancy.tone === 'success' ? 'green' : occupancy.tone === 'warning' ? 'amber' : 'default'} />
    <StatCard label="Rooms" value={totalRooms} />
  </div>
</div>

<SectionCard title="Property photos">
  <PropertyPhotoGallery propertyId={property.id} photos={property.photos} />
  <div className="mt-4 border-t border-gray-100 pt-4">
    <p className="mb-3 text-xs font-medium text-gray-500">Add a photo</p>
    <PropertyPhotoUploader propertyId={property.id} />
  </div>
</SectionCard>
```

- [ ] **Step 2: Keep room management but improve scanability**

Wrap room cards in a two-column grid on large screens:

```tsx
<div className="grid gap-4 lg:grid-cols-2">
  {property.rooms.map((room) => (
    <div key={room.id} className={`rounded-xl border p-5 ${isOccupied ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
      existing room content
    </div>
  ))}
</div>
```

- [ ] **Step 3: Add property thumbnails to admin verification rows**

In `src/app/(dashboard)/dashboard/admin/properties/page.tsx`, import `PropertyCover`, `PageHeader`, and `SectionCard`. Use the first `property.photos[0]` as the thumbnail in each review row:

```tsx
<div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 lg:grid-cols-[160px_1fr_auto]">
  <PropertyCover
    address={property.address}
    imageUrl={property.photos[0]?.imageUrl}
    caption={property.photos[0]?.caption}
    heightClassName="h-32"
    className="rounded-xl"
  />
  <div>existing property details and owner details</div>
  <div className="flex gap-2 lg:flex-col">existing verify/reject actions</div>
</div>
```

- [ ] **Step 4: Run tests and build**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: tests PASS and build PASS.

- [ ] **Step 5: Commit Task 4**

```powershell
git add "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/properties/[id]/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/admin/properties/page.tsx"
git commit -m "feat: add photo-led property surfaces"
```

---

### Task 5: Redesign Tenancy And Agreement Guided Flows

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`
- Modify: `src/components/ui/AgreementViewer.tsx`
- Modify: `src/components/wizard/WizardContainer.tsx`
- Modify: `src/components/wizard/WizardStepLayout.tsx`

- [ ] **Step 1: Include property cover photos in tenancy detail queries**

In landlord and tenant tenancy detail queries, include:

```ts
photos: {
  select: { imageUrl: true, caption: true, order: true, createdAt: true },
  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  take: 1,
},
```

under `room.property`.

- [ ] **Step 2: Add tenancy progress helper inside each tenancy page**

Add local constants:

```ts
const TENANCY_STEPS = ['Invite', 'Agreement', 'Deposit', 'Condition', 'Active'];

function getTenancyStep(status: string, agreementStatus?: string | null, depositStatus?: string | null) {
  if (status === 'INVITED') return 0;
  if (!agreementStatus || ['DRAFT', 'NEGOTIATING', 'FINALIZED', 'PENDING_TENANT', 'PENDING_LANDLORD'].includes(agreementStatus)) return 1;
  if (depositStatus !== 'PAID') return 2;
  if (status !== 'ACTIVE') return 3;
  return 4;
}
```

Render:

```tsx
<div className="grid gap-2 sm:grid-cols-5">
  {TENANCY_STEPS.map((step, index) => (
    <div key={step} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${index <= activeStep ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
      {step}
    </div>
  ))}
</div>
```

- [ ] **Step 3: Convert landlord tenancy detail to two-column guided layout**

Use `PropertyCover`, `PageHeader`, `SectionCard`, and `StatCard`. Top section should be:

```tsx
<div className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <PropertyCover address={tenancy.room.property.address} imageUrl={cover?.imageUrl} caption={cover?.caption} className="rounded-none border-0" heightClassName="h-56" />
    <div className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Current status</p>
      <h2 className="mt-2 text-2xl font-bold text-gray-900">{statusHeadline}</h2>
      <p className="mt-2 text-sm text-gray-500">{statusDescription}</p>
      <div className="mt-4 flex flex-wrap gap-3">existing primary actions</div>
    </div>
  </section>
  <aside className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
    <h2 className="text-sm font-semibold text-blue-900">Next actions</h2>
    <div className="mt-4 space-y-3">agreement, deposit, condition, termination, and message actions</div>
  </aside>
</div>
```

Keep existing action components, but move them into the guided sections instead of leaving them as many same-weight cards.

- [ ] **Step 4: Convert tenant tenancy page to the same guided pattern**

Use the same property cover, timeline, current status, and next action pattern. Tenant next actions are `respond to invitation`, `review agreement`, `upload deposit proof`, `upload rent proof`, `acknowledge condition report`, and `message landlord`.

- [ ] **Step 5: Convert AgreementViewer desktop to three-zone layout**

In `AgreementViewer.tsx`, keep current tabs and logic. Wrap tab content in:

```tsx
<div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
  <aside className="rounded-xl border border-gray-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sections</p>
    <div className="mt-3 flex flex-col gap-1">{tabs.map(...)}</div>
  </aside>
  <main className="min-w-0 rounded-xl border border-gray-200 bg-white">{active tab content}</main>
  <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4">
    finalize checklist, red flag count, language switch, download button
  </aside>
</div>
```

Move the existing top action controls into the right panel while preserving the exact event handlers and API calls.

- [ ] **Step 6: Improve wizard step layout**

In `WizardStepLayout.tsx`, use a two-column shell:

```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
  <div className="rounded-xl border border-gray-200 bg-white p-6">{children}</div>
  <aside className="rounded-xl border border-blue-100 bg-blue-50 p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Step guidance</p>
    <h3 className="mt-2 text-base font-semibold text-blue-950">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-blue-800">{description}</p>
  </aside>
</div>
```

In `WizardContainer.tsx`, ensure the progress tracker is visible above step content and uses completed/current/upcoming styling.

- [ ] **Step 7: Run tests and build**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: tests PASS and build PASS.

- [ ] **Step 8: Commit Task 5**

```powershell
git add "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/tenancies/[id]/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx" "rentalease-malaysia/src/components/ui/AgreementViewer.tsx" "rentalease-malaysia/src/components/wizard/WizardContainer.tsx" "rentalease-malaysia/src/components/wizard/WizardStepLayout.tsx"
git commit -m "feat: redesign tenancy agreement flows"
```

---

### Task 6: Redesign Ledger Review Pages

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/payments/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/payments/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/admin/verify/page.tsx`
- Modify: `src/components/ui/PaymentVerficationCard.tsx`
- Modify: `src/components/ui/DepositVerificationCard.tsx`

- [ ] **Step 1: Add ledger page header and filter row to landlord payments**

Import `PageHeader`, `SectionCard`, and `StatCard`. Replace the page top with:

```tsx
<PageHeader
  eyebrow="Payment ledger"
  title="Payments"
  description="Review rent and deposit proof across all active and pending tenancies."
/>

<div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
  <StatCard label="Rent total" value={allPayments.length} />
  <StatCard label="Under review" value={underReview.length + depositsUnderReview.length} tone="amber" />
  <StatCard label="Overdue" value={overdue.length} tone={overdue.length > 0 ? 'red' : 'default'} />
  <StatCard label="Confirmed" value={paid.length + depositsConfirmed.length} tone="green" />
</div>

<div className="mb-5 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
  <input className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" placeholder="Search tenant or property" />
  <select className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm">
    <option>All statuses</option>
    <option>Under review</option>
    <option>Pending</option>
    <option>Paid</option>
  </select>
  <p className="text-xs leading-relaxed text-gray-400">Filters are visual in this phase; record grouping below remains server-rendered.</p>
</div>
```

- [ ] **Step 2: Convert payment/deposit rows to ledger rows**

Keep existing verification card components, but wrap each record in:

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-5">
  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
    <div>
      <p className="text-sm font-semibold text-gray-900">property and tenant</p>
      <p className="mt-1 text-xs text-gray-500">amount, due date, room, status</p>
    </div>
    <Link href={`/dashboard/landlord/tenancies/${id}`} className="text-xs font-semibold text-blue-600 hover:underline">
      View tenancy
    </Link>
  </div>
  <div className="mt-4 border-t border-gray-100 pt-4">verification component</div>
</div>
```

- [ ] **Step 3: Redesign tenant payments as a guided ledger**

In tenant payments, keep deposit pinned at top, but add `PageHeader`, current tenancy context, KPI strip, and grouped payment rows. Preserve `PaymentProofUploader` and `DepositProofUploader` props exactly.

- [ ] **Step 4: Redesign admin KYC verification**

In `src/app/(dashboard)/dashboard/admin/verify/page.tsx`, add a `PageHeader`, KPI count, and review rows. Each user row should keep the current IC document preview and verify/reject buttons.

- [ ] **Step 5: Improve proof cards thumbnail hierarchy**

In `PaymentVerficationCard.tsx` and `DepositVerificationCard.tsx`, keep existing form behavior. Change proof thumbnails to a responsive grid with larger first proof:

```tsx
<div className="grid gap-3 sm:grid-cols-2">
  {proofs.map((proof, index) => (
    <a key={proof.id} href={proof.imageUrl} target="_blank" rel="noopener noreferrer" className={index === 0 ? 'sm:col-span-2' : ''}>
      <img src={proof.imageUrl} alt="Payment proof" className={`w-full rounded-lg border border-gray-200 object-cover ${index === 0 ? 'h-56' : 'h-32'}`} />
    </a>
  ))}
</div>
```

- [ ] **Step 6: Run tests and build**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: tests PASS and build PASS.

- [ ] **Step 7: Commit Task 6**

```powershell
git add "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/payments/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/tenant/payments/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/admin/verify/page.tsx" "rentalease-malaysia/src/components/ui/PaymentVerficationCard.tsx" "rentalease-malaysia/src/components/ui/DepositVerificationCard.tsx"
git commit -m "feat: redesign review ledgers"
```

---

### Task 7: Redesign Messages And Auth Pages

**Files:**
- Modify: `src/components/ui/LandlordMessagesClient.tsx`
- Modify: `src/components/ui/MessageThread.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Add message thread context**

Extend `TenancyItem` in `LandlordMessagesClient.tsx` with optional context when available:

```ts
interface TenancyItem {
  id: string;
  propertyAddress: string;
  propertyCity: string;
  tenantName: string;
  unreadCount: number;
  status?: string;
}
```

Render thread buttons with address, city, unread count, and status badge. Keep selection state unchanged.

- [ ] **Step 2: Improve `MessageThread` header**

Change props:

```ts
interface Props {
  tenancyId: string;
  currentUserId: string;
  otherPartyName: string;
  contextLabel?: string;
}
```

Update header:

```tsx
<div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
  <p className="text-sm font-semibold text-gray-900">{otherPartyName}</p>
  <p className="mt-0.5 text-xs text-gray-400">{contextLabel ?? 'Messages are scoped to this tenancy'}</p>
</div>
```

- [ ] **Step 3: Keep chat behavior and improve composer usability**

Keep polling, send behavior, and Enter handling unchanged. Change composer wrapper to:

```tsx
<div className="border-t border-gray-100 bg-white px-4 py-3">
  {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
  <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
    <textarea ... className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-gray-900 outline-none" />
    <button ... className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-40">
      {isSending ? 'Sending' : 'Send'}
    </button>
  </div>
</div>
```

- [ ] **Step 4: Redesign auth split panels**

For login/register/forgot/reset pages, keep existing forms, validation, and submit handlers. Update the left panel feature list to:

```ts
[
  'AI-assisted tenancy agreement review',
  'Identity and property verification workflows',
  'Payment proof and deposit records',
  'Tenant-landlord messages in context',
]
```

Use left panel copy:

```tsx
<span className="text-4xl font-bold tracking-tight text-white">RentalEase</span>
<p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-gray-400">
  A guided tenancy workspace for Malaysian rentals, from invitation to agreement, payment, and handover records.
</p>
```

Keep the right panel `max-w-sm` for login/reset and use `max-w-md` for register because the IC upload form is longer.

- [ ] **Step 5: Run tests and build**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test -- tests/unit/ui-redesign.test.ts
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: tests PASS and build PASS.

- [ ] **Step 6: Commit Task 7**

```powershell
git add "rentalease-malaysia/src/components/ui/LandlordMessagesClient.tsx" "rentalease-malaysia/src/components/ui/MessageThread.tsx" "rentalease-malaysia/src/app/(auth)/login/page.tsx" "rentalease-malaysia/src/app/(auth)/register/page.tsx" "rentalease-malaysia/src/app/(auth)/forgot-password/page.tsx" "rentalease-malaysia/src/app/(auth)/reset-password/page.tsx"
git commit -m "feat: redesign messages and auth"
```

---

### Task 8: Final Verification And Visual QA

**Files:**
- Modify only files that need small fixes discovered during verification.

- [ ] **Step 1: Run full unit tests**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run test --
Pop-Location
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```powershell
Push-Location rentalease-malaysia
$env:PRISMA_GENERATE_NO_ENGINE='1'; npm.cmd run build
Pop-Location
```

Expected: PASS.

- [ ] **Step 3: Start dev server for browser verification**

Run:

```powershell
Push-Location rentalease-malaysia
npm.cmd run dev
Pop-Location
```

Expected: local dev server starts and prints the localhost URL.

- [ ] **Step 4: Browser-check core routes**

Open these routes with seeded/test users:

```text
/login
/register
/dashboard/landlord
/dashboard/landlord/properties
/dashboard/landlord/payments
/dashboard/tenant
/dashboard/tenant/payments
/dashboard/admin
/dashboard/admin/verify
/dashboard/admin/properties
```

Expected:

- No console errors.
- Sidebar and top bar render correctly.
- Property cards show photos when present.
- Property cards show a neutral fallback when no photos exist.
- Dashboard attention hero is visible above KPI cards.
- Payment/admin review pages use clear ledger rows.
- Auth pages remain usable on desktop and mobile widths.

- [ ] **Step 5: Browser-check representative dynamic routes**

Open at least one real record for each:

```text
/dashboard/landlord/properties/[id]
/dashboard/landlord/tenancies/[id]
/dashboard/landlord/tenancies/[id]/agreement
/dashboard/tenant/tenancy
/dashboard/landlord/messages
/dashboard/tenant/messages
```

Expected:

- Property detail shows image-led header or fallback.
- Tenancy detail shows current state, next action, timeline, and supporting cards.
- Agreement review remains functional with language switch, history, finalization, and edit tab.
- Messages can send and receive without layout breakage.

- [ ] **Step 6: Fix verification defects one at a time**

For each defect, make the smallest UI-only edit, rerun the relevant command, and record the result in the final response. If a defect requires backend/API/schema changes, stop and ask for a separate spec.

- [ ] **Step 7: Commit final verification fixes**

If verification edits touched only dashboard/property files from Tasks 3 and 4:

```powershell
git add "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/tenant/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/admin/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/properties/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/landlord/properties/[id]/page.tsx" "rentalease-malaysia/src/app/(dashboard)/dashboard/admin/properties/page.tsx"
git commit -m "fix: polish redesign verification issues"
```

If verification edits touched other UI files, use the exact quoted paths from the task that owns those files. If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage: dashboards, property photos, tenancy/agreement guided flows, ledger pages, messages, auth, accessibility, responsiveness, and verification all map to tasks.
- Scope guard: no API route behavior, auth rules, Prisma schema, payment logic, AI generation logic, or blockchain logic changes are included.
- Testing strategy: pure helper behavior is covered with Vitest; page-level UI changes are verified through build and browser QA because no React component testing harness is currently configured.
- Risk: the codebase has existing unrelated dirty worktree changes. Each task must stage only listed files and avoid broad `git add .`.
