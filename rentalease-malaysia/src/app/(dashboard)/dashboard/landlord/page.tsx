// src/app/(dashboard)/dashboard/landlord/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DashboardBanners } from '@/components/ui/DashboardBanners';
import { triggerEndingSoonNotifications } from '@/lib/endingSoonNotifications';

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
    // Financial summary queries (IMP-05 / FEAT-04)
    activeRentPayments,
    overduePayments,
  ] = await Promise.all([
    prisma.property.findMany({
      where: { landlordId },
      include: {
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

    // All rent payments for ACTIVE tenancies — used to sum confirmed monthly income
    prisma.rentPayment.findMany({
      where: {
        status: 'PAID',
        tenancy: {
          status: 'ACTIVE',
          room: { property: { landlordId } },
        },
        // Paid in the last 30 days
        paidDate: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { amount: true },
    }),

    // Overdue: PENDING payments past their due date
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

  // Financial calculations
  const confirmedIncome30d = activeRentPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalOverdue = overduePayments.reduce((s, p) => s + Number(p.amount), 0);
  const occupancyRate = totalRooms > 0 ? Math.round((activeRooms / totalRooms) * 100) : 0;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your properties, tenants, and agreements
        </p>
      </div>

      <DashboardBanners
        role="LANDLORD"
        pendingChangesRequested={pendingChangesRequested}
        pendingPaymentVerifications={pendingPaymentVerifications}
        unacknowledgedConditionReports={unacknowledgedConditionReports}
      />

      {/* Financial summary (IMP-05 / FEAT-04) */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Financial Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <FinancialCard
            label="Income (last 30 days)"
            value={`RM ${confirmedIncome30d.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
            color="green"
          />
          <FinancialCard
            label="Overdue payments"
            value={`RM ${totalOverdue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`}
            color={totalOverdue > 0 ? 'red' : 'gray'}
          />
          <FinancialCard
            label="Pending proofs"
            value={String(pendingPaymentVerifications)}
            color={pendingPaymentVerifications > 0 ? 'amber' : 'gray'}
          />
          <FinancialCard
            label="Occupancy rate"
            value={`${occupancyRate}%`}
            sub={`${activeRooms} / ${totalRooms} rooms`}
            color="blue"
          />
        </div>
      </section>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Properties" value={properties.length} />
        <StatCard label="Total Rooms" value={totalRooms} />
        <StatCard label="Occupied" value={activeRooms} />
        <StatCard label="Pending Invites" value={invitedTenancies} accent />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/dashboard/landlord/properties/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Property
        </Link>
        <Link
          href="/dashboard/landlord/tenancies/new"
          className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          Invite Tenant
        </Link>
        <Link
          href="/dashboard/landlord/payments"
          className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          View Payments
        </Link>
      </div>

      {/* Recent tenancies */}
      {recentTenancies.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Active &amp; Pending Tenancies
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {recentTenancies.map((tenancy) => (
              <TenancyRow key={tenancy.id} tenancy={tenancy} />
            ))}
          </div>
        </section>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-8">
          <p className="text-sm text-gray-400">
            No active tenancies yet.{' '}
            <Link href="/dashboard/landlord/tenancies/new" className="text-blue-600 hover:underline">
              Invite a tenant
            </Link>{' '}
            to get started.
          </p>
        </div>
      )}

      {/* Properties overview */}
      {properties.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Properties</h2>
            <Link href="/dashboard/landlord/properties" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.slice(0, 6).map((property) => (
              <div key={property.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                <p className="font-medium text-gray-900 text-sm truncate">{property.address}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {property.city}, {property.state}
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span>{property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''}</span>
                  <span>&middot;</span>
                  <span>{property.rooms.filter((r) => !r.isAvailable).length} occupied</span>
                </div>
                <Link
                  href={`/dashboard/landlord/properties/${property.id}`}
                  className="block mt-3 text-xs text-blue-600 hover:underline"
                >
                  Manage &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const COLOR_MAP = {
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
  red:   { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  blue:  { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-100' },
  gray:  { bg: 'bg-gray-50',  text: 'text-gray-700',  border: 'border-gray-100' },
} as const;

function FinancialCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${c.border}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  INVITED:   `${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
  PENDING:   `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  ACTIVE:    `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  EXPIRED:   `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  TERMINATED:`${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
};

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${accent ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function TenancyRow({ tenancy }: { tenancy: ReturnType<typeof buildTenancyRow> }) {
  const hasProofToVerify = tenancy.rentPayments.length > 0;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{tenancy.tenant.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {tenancy.room.property.address}, {tenancy.room.property.city}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {hasProofToVerify && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset">
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
