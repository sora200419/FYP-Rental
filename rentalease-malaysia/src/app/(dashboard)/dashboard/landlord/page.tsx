// src/app/(dashboard)/dashboard/landlord/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DashboardBanners } from '@/components/ui/DashboardBanners';
import PropertyCover from '@/components/ui/PropertyCover';
import { AttentionHero, PageHeader, SectionCard, StatCard } from '@/components/ui/RedesignPrimitives';
import { triggerEndingSoonNotifications } from '@/lib/endingSoonNotifications';
import { getDashboardAttention, getPropertyCover } from '@/lib/uiRedesign';

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');
  if (session.user.role !== 'LANDLORD') redirect('/dashboard/tenant');

  const landlordId = session.user.id;

  void triggerEndingSoonNotifications(landlordId, 'LANDLORD');

  const now = new Date();

  const [
    properties,
    recentTenancies,
    pendingChangesRequested,
    pendingPaymentVerifications,
    unacknowledgedConditionReports,
    activeRentPayments,
    overduePayments,
  ] = await Promise.all([
    prisma.property.findMany({
      where: { landlordId },
      include: {
        photos: {
          select: { imageUrl: true, caption: true, order: true, createdAt: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          take: 1,
        },
        rooms: {
          include: {
            tenancies: {
              where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
              include: {
                tenant: { select: { id: true, name: true, email: true } },
                agreement: { select: { id: true, status: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.tenancy.findMany({
      where: {
        room: { property: { landlordId } },
        status: { in: ['INVITED', 'PENDING', 'ACTIVE'] },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        room: {
          include: {
            property: { select: { id: true, address: true, city: true } },
          },
        },
        agreement: { select: { id: true, status: true } },
        rentPayments: {
          where: { status: 'UNDER_REVIEW' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    prisma.agreement.count({
      where: {
        status: 'NEGOTIATING',
        tenancy: { room: { property: { landlordId } } },
      },
    }),

    prisma.rentPayment.count({
      where: {
        status: 'UNDER_REVIEW',
        tenancy: { room: { property: { landlordId } } },
      },
    }),

    prisma.conditionReport.count({
      where: {
        acknowledgedAt: null,
        tenancy: { room: { property: { landlordId } } },
        createdBy: { role: 'TENANT' },
      },
    }),

    prisma.rentPayment.findMany({
      where: {
        status: 'PAID',
        tenancy: {
          status: 'ACTIVE',
          room: { property: { landlordId } },
        },
        paidDate: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { amount: true },
    }),

    prisma.rentPayment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: now },
        tenancy: {
          status: 'ACTIVE',
          room: { property: { landlordId } },
        },
      },
      select: { amount: true },
    }),
  ]);

  const totalRooms = properties.reduce((sum, p) => sum + p.rooms.length, 0);
  const activeRooms = properties.reduce(
    (sum, p) =>
      sum + p.rooms.filter((r) => r.tenancies.some((t) => t.status === 'ACTIVE')).length,
    0,
  );
  const invitedTenancies = recentTenancies.filter((t) => t.status === 'INVITED').length;
  const confirmedIncome30d = activeRentPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = overduePayments.reduce((s, p) => s + Number(p.amount), 0);
  const occupancyRate = totalRooms > 0 ? Math.round((activeRooms / totalRooms) * 100) : 0;
  const attention = getDashboardAttention({
    role: 'LANDLORD',
    pendingPaymentVerifications,
    pendingAgreementReviews: pendingChangesRequested,
    unacknowledgedConditionReports,
  });
  const primaryHref =
    pendingPaymentVerifications > 0
      ? '/dashboard/landlord/payments'
      : pendingChangesRequested > 0
      ? '/dashboard/landlord/tenancies'
      : '/dashboard/landlord/properties';

  return (
    <div>
      <PageHeader
        eyebrow="Landlord command center"
        title={`Welcome back, ${session.user.name}`}
        description="Manage income, tenant progress, and property readiness from one queue."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/landlord/properties/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Add Property
            </Link>
            <Link
              href="/dashboard/landlord/tenancies/new"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Invite Tenant
            </Link>
            <Link
              href="/dashboard/landlord/payments"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              View Payments
            </Link>
          </div>
        }
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
        href={primaryHref}
        secondary={
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Priority queue</p>
            <PriorityLink href="/dashboard/landlord/payments" label="Payment proofs" value={pendingPaymentVerifications} />
            <PriorityLink href="/dashboard/landlord/tenancies" label="Agreement reviews" value={pendingChangesRequested} />
            <PriorityLink href="/dashboard/landlord/properties" label="Condition reports" value={unacknowledgedConditionReports} />
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Income 30d"
          value={`RM ${confirmedIncome30d.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
          tone="green"
        />
        <StatCard
          label="Overdue"
          value={`RM ${totalOverdue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
          tone={totalOverdue > 0 ? 'red' : 'default'}
        />
        <StatCard label="Occupancy" value={`${occupancyRate}%`} detail={`${activeRooms} / ${totalRooms} rooms`} tone="blue" />
        <StatCard
          label="Pending invites"
          value={invitedTenancies}
          detail={`${properties.length} properties`}
          tone={invitedTenancies > 0 ? 'amber' : 'default'}
        />
      </div>

      {recentTenancies.length > 0 ? (
        <div className="mb-8">
          <SectionCard
            title="Active & pending tenancies"
            action={
              <Link href="/dashboard/landlord/tenancies" className="text-sm font-medium text-blue-600 hover:underline">
                View all
              </Link>
            }
          >
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {recentTenancies.map((tenancy) => (
                <TenancyRow key={tenancy.id} tenancy={tenancy} />
              ))}
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-400">
            No active tenancies yet.{' '}
            <Link href="/dashboard/landlord/tenancies/new" className="text-blue-600 hover:underline">
              Invite a tenant
            </Link>{' '}
            to get started.
          </p>
        </div>
      )}

      {properties.length > 0 && (
        <SectionCard
          title="Your properties"
          action={
            <Link href="/dashboard/landlord/properties" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.slice(0, 6).map((property) => {
              const cover = getPropertyCover(property.photos);
              const occupiedCount = property.rooms.filter((r) => !r.isAvailable).length;

              return (
                <div key={property.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300">
                  <PropertyCover
                    address={property.address}
                    imageUrl={cover?.imageUrl}
                    caption={cover?.caption}
                    className="rounded-t-xl"
                    heightClassName="h-36"
                  />
                  <div className="p-5">
                    <p className="truncate text-sm font-semibold text-gray-900">{property.address}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {property.city}, {property.state}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                      <span>{property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''}</span>
                      <span>&middot;</span>
                      <span>{occupiedCount} occupied</span>
                    </div>
                    <Link
                      href={`/dashboard/landlord/properties/${property.id}`}
                      className="mt-3 inline-flex text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Manage &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function PriorityLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm transition-colors hover:bg-blue-100">
      <span className="font-medium text-gray-700">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${value > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {value}
      </span>
    </Link>
  );
}

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  INVITED: `${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
  PENDING: `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  ACTIVE: `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  EXPIRED: `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  TERMINATED: `${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
};

function TenancyRow({ tenancy }: { tenancy: ReturnType<typeof buildTenancyRow> }) {
  const hasProofToVerify = tenancy.rentPayments.length > 0;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{tenancy.tenant.name}</p>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {tenancy.room.property.address}, {tenancy.room.property.city}
        </p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        {hasProofToVerify && (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200 ring-inset">
            Proof to verify
          </span>
        )}
        <span className={STATUS_PILL[tenancy.status] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}>
          {tenancy.status}
        </span>
        <Link href={`/dashboard/landlord/tenancies/${tenancy.id}`} className="text-xs text-blue-600 hover:underline">
          View
        </Link>
      </div>
    </div>
  );
}

function buildTenancyRow(t: unknown) {
  return t as {
    id: string;
    status: string;
    tenant: { id: string; name: string; email: string };
    room: { property: { id: string; address: string; city: string } };
    agreement: { id: string; status: string } | null;
    rentPayments: { id: string }[];
  };
}
