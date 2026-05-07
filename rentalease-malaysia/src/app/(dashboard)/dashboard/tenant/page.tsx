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
          select: { id: true, type: true, acknowledgedAt: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.agreement.count({ where: { status: 'FINALIZED', tenancy: { tenantId } } }),
    prisma.rentPayment.count({
      where: { status: 'PENDING', rejectionReason: { not: null }, tenancy: { tenantId } },
    }),
    prisma.conditionReport.count({
      where: { acknowledgedAt: null, tenancy: { tenantId }, createdBy: { role: 'LANDLORD' } },
    }),
  ]);

  const activeTenancies = tenancies.filter((t) => t.status === 'ACTIVE');
  const pendingTenancies = tenancies.filter((t) => ['INVITED', 'PENDING'].includes(t.status));

  const nextPayment = activeTenancies
    .flatMap((t) => t.rentPayments)
    .filter((p) => p.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Your tenancy overview</p>
      </div>

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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {pendingTenancies.map((tenancy) => (
              <div key={tenancy.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tenancy.room.property.address}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tenancy.room.property.city} &middot; {tenancy.room.label} &middot; Landlord: {tenancy.room.property.landlord.name}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset">
                    {tenancy.status}
                  </span>
                  <Link href="/dashboard/tenant/tenancy" className="text-xs text-blue-600 hover:underline">
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Tenancies</h2>
          <div className="space-y-4">
            {activeTenancies.map((tenancy) => (
              <ActiveTenancyCard key={tenancy.id} tenancy={tenancy} />
            ))}
          </div>
        </section>
      ) : (
        tenancies.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-sm text-gray-400">
              You don&apos;t have any tenancies yet. Your landlord will send you an invitation when they list a room for you.
            </p>
          </div>
        )
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const AGREEMENT_PILL: Record<string, string> = {
  DRAFT:         `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  FINALIZED:     `${PILL_BASE} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset`,
  NEGOTIATING:   `${PILL_BASE} bg-purple-50 text-purple-700 ring-1 ring-purple-200 ring-inset`,
  PENDING_TENANT:`${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
};

function StatCard({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-2 truncate ${accent ? 'text-blue-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function ActiveTenancyCard({ tenancy }: { tenancy: ActiveTenancyType }) {
  const agreementStatus = tenancy.agreement?.status;

  const nextPayment = tenancy.rentPayments
    .filter((p) => p.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const hasRejectedPayment = tenancy.rentPayments.some(
    (p) => p.status === 'PENDING' && p.rejectionReason,
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{tenancy.room.property.address}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenancy.room.property.city} &middot; {tenancy.room.label}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Landlord: {tenancy.room.property.landlord.name}
          </p>
        </div>
        <Link href="/dashboard/tenant/tenancy" className="text-sm text-blue-600 hover:underline shrink-0">
          View details &rarr;
        </Link>
      </div>

      {agreementStatus && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-gray-500">Agreement:</span>
          <span className={AGREEMENT_PILL[agreementStatus] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}>
            {agreementStatus.replace('_', ' ')}
          </span>
          {agreementStatus === 'FINALIZED' && (
            <Link href="/dashboard/tenant/tenancy" className="text-xs text-blue-600 hover:underline font-medium">
              Review &amp; sign &rarr;
            </Link>
          )}
        </div>
      )}

      {nextPayment && (
        <div className="mt-3 flex items-center flex-wrap gap-3">
          <span className="text-xs text-gray-500">Next payment:</span>
          <span className="text-xs font-medium text-gray-900">
            RM {Number(nextPayment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-gray-400">
            due {new Date(nextPayment.dueDate).toLocaleDateString('en-MY')}
          </span>
          {hasRejectedPayment && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset">
              Proof rejected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

type ActiveTenancyType = {
  id: string;
  status: string;
  room: {
    label: string;
    property: {
      address: string;
      city: string;
      landlord: { id: string; name: string; email: string; phone: string | null };
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
  conditionReports: { id: string; type: string; acknowledgedAt: Date | null; createdAt: Date }[];
};
