// src/app/(dashboard)/dashboard/tenant/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DashboardBanners } from '@/components/ui/DashboardBanners';
import { triggerEndingSoonNotifications } from '@/lib/endingSoonNotifications';

export default async function TenantDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');
  if (session.user.role !== 'TENANT') redirect('/dashboard/landlord');

  const tenantId = session.user.id;

  void triggerEndingSoonNotifications(tenantId, 'TENANT');

  const [
    tenancies,
    pendingAgreementReviews,
    rejectedPayments,
    unacknowledgedConditionReports,
  ] = await Promise.all([
    // All tenancies for this tenant
    prisma.tenancy.findMany({
      where: { tenantId },
      include: {
        room: {
          include: {
            property: {
              include: {
                landlord: {
                  select: { id: true, name: true, email: true, phone: true },
                },
              },
            },
          },
        },
        agreement: { select: { id: true, status: true } },
        rentPayments: {
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            dueDate: true,
            amount: true,
            status: true,
            rejectionReason: true,
            proofs: { select: { id: true, imageUrl: true, createdAt: true } },
          },
        },
        conditionReports: {
          select: {
            id: true,
            type: true,
            acknowledgedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // ── Banner counts ────────────────────────────────────────────────────────
    // Agreements in FINALIZED status (ready for tenant to sign)
    prisma.agreement.count({
      where: {
        status: 'FINALIZED',
        tenancy: { tenantId },
      },
    }),

    // Payments where proof was rejected (needs re-upload)
    prisma.rentPayment.count({
      where: {
        status: 'PENDING',
        rejectionReason: { not: null },
        tenancy: { tenantId },
      },
    }),

    // Condition reports created by landlord, not yet acknowledged by tenant
    prisma.conditionReport.count({
      where: {
        acknowledgedAt: null,
        tenancy: { tenantId },
        createdBy: { role: 'LANDLORD' },
      },
    }),
  ]);

  const activeTenancies = tenancies.filter((t) => t.status === 'ACTIVE');
  const pendingTenancies = tenancies.filter((t) =>
    ['INVITED', 'PENDING'].includes(t.status),
  );

  // Find the next upcoming payment across all active tenancies
  const nextPayment = activeTenancies
    .flatMap((t) => t.rentPayments)
    .filter((p) => p.status === 'PENDING')
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Your tenancy overview</p>
        </div>

        {/* Dashboard banners — Phase B: shows urgent items needing action */}
        <DashboardBanners
          role="TENANT"
          pendingAgreementReviews={pendingAgreementReviews}
          rejectedPayments={rejectedPayments}
          unacknowledgedConditionReports={unacknowledgedConditionReports}
        />

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Active Tenancies" value={activeTenancies.length} />
          <StatCard label="Pending" value={pendingTenancies.length} accent />
          <StatCard
            label="Next Payment"
            value={
              nextPayment
                ? `RM ${Number(nextPayment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
                : '—'
            }
          />
        </div>

        {/* Pending invitations */}
        {pendingTenancies.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Pending Invitations
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {pendingTenancies.map((tenancy) => (
                <div
                  key={tenancy.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {tenancy.room.property.address}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tenancy.room.property.city} · {tenancy.room.label} ·
                      Landlord: {tenancy.room.property.landlord.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                      {tenancy.status}
                    </span>
                    <Link
                      href="/dashboard/tenant/tenancy"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active tenancies */}
        {activeTenancies.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Active Tenancies
            </h2>
            <div className="space-y-4">
              {activeTenancies.map((tenancy) => (
                <ActiveTenancyCard key={tenancy.id} tenancy={tenancy} />
              ))}
            </div>
          </section>
        ) : (
          tenancies.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 text-sm">
                You don&apos;t have any tenancies yet. Your landlord will send
                you an invitation when they list a room for you.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 truncate ${
          accent ? 'text-blue-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ActiveTenancyCard({ tenancy }: { tenancy: ActiveTenancyType }) {
  const agreementStatus = tenancy.agreement?.status;

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    FINALIZED: 'bg-blue-100 text-blue-700',
    NEGOTIATING: 'bg-amber-100 text-amber-700',
    SIGNED: 'bg-green-100 text-green-700',
  };

  const nextPayment = tenancy.rentPayments
    .filter((p) => p.status === 'PENDING')
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )[0];

  const hasRejectedPayment = tenancy.rentPayments.some(
    (p) => p.status === 'PENDING' && p.rejectionReason,
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {tenancy.room.property.address}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenancy.room.property.city} · {tenancy.room.label}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Landlord: {tenancy.room.property.landlord.name}
          </p>
        </div>
        <Link
          href="/dashboard/tenant/tenancy"
          className="text-sm text-blue-600 hover:underline flex-shrink-0"
        >
          View details →
        </Link>
      </div>

      {/* Agreement status row */}
      {agreementStatus && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-gray-500">Agreement:</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              statusColors[agreementStatus] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {agreementStatus}
          </span>
          {agreementStatus === 'FINALIZED' && (
            <Link
              href={`/dashboard/tenant/agreements/${tenancy.agreement?.id}`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Review &amp; sign →
            </Link>
          )}
        </div>
      )}

      {/* Next payment */}
      {nextPayment && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-gray-500">Next payment:</span>
          <span className="text-xs font-medium text-gray-900">
            RM{' '}
            {Number(nextPayment.amount).toLocaleString('en-MY', {
              minimumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs text-gray-400">
            due {new Date(nextPayment.dueDate).toLocaleDateString('en-MY')}
          </span>
          {hasRejectedPayment && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              Proof rejected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Type extracted to keep JSX clean
type ActiveTenancyType = {
  id: string;
  status: string;
  room: {
    label: string;
    property: {
      address: string;
      city: string;
      landlord: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
      };
    };
  };
  agreement: { id: string; status: string } | null;
  rentPayments: {
    id: string;
    dueDate: Date;
    amount: unknown;
    status: string;
    rejectionReason: string | null;
    proofs: { id: string; imageUrl: string; createdAt: Date }[];
  }[];
  conditionReports: {
    id: string;
    type: string;
    acknowledgedAt: Date | null;
    createdAt: Date;
  }[];
};
