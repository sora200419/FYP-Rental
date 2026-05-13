// src/app/(dashboard)/dashboard/tenant/page.tsx
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
                photos: {
                  select: { imageUrl: true, caption: true, order: true, createdAt: true },
                  orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                  take: 1,
                },
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

  const attention = getDashboardAttention({
    role: 'TENANT',
    pendingPaymentVerifications: rejectedPayments,
    pendingAgreementReviews,
    unacknowledgedConditionReports,
  });
  const primaryTenantHref =
    pendingAgreementReviews > 0
      ? '/dashboard/tenant/tenancy'
      : rejectedPayments > 0
      ? '/dashboard/tenant/payments'
      : unacknowledgedConditionReports > 0
      ? '/dashboard/tenant/conditions'
      : '/dashboard/tenant/tenancy';
  const pendingActions =
    pendingTenancies.length + pendingAgreementReviews + rejectedPayments + unacknowledgedConditionReports;

  return (
    <div>
      <PageHeader
        eyebrow="Tenant command center"
        title={`Welcome back, ${session.user.name}`}
        description="Track your home, agreement, rent payments, and required responses."
      />

      <DashboardBanners
        role="TENANT"
        pendingAgreementReviews={pendingAgreementReviews}
        rejectedPayments={rejectedPayments}
        unacknowledgedConditionReports={unacknowledgedConditionReports}
      />

      <AttentionHero
        title={attention.title}
        description={attention.description}
        actionLabel={attention.actionLabel}
        href={primaryTenantHref}
        secondary={
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Current queue</p>
            <QueueMetric label="Pending invitations" value={pendingTenancies.length} />
            <QueueMetric label="Agreement reviews" value={pendingAgreementReviews} />
            <QueueMetric label="Payment follow-ups" value={rejectedPayments} />
            <QueueMetric label="Condition reports" value={unacknowledgedConditionReports} />
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Active tenancies" value={activeTenancies.length} tone="blue" />
        <StatCard label="Pending actions" value={pendingActions} tone={pendingActions > 0 ? 'amber' : 'default'} />
        <StatCard
          label="Next payment"
          value={
            nextPayment
              ? `RM ${Number(nextPayment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
              : '-'
          }
          detail={nextPayment ? `Due ${new Date(nextPayment.dueDate).toLocaleDateString('en-MY')}` : 'No rent due'}
          tone={nextPayment ? 'green' : 'default'}
        />
      </div>

      {pendingTenancies.length > 0 && (
        <div className="mb-8">
          <SectionCard title="Pending invitations">
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {pendingTenancies.map((tenancy) => (
                <div key={tenancy.id} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tenancy.room.property.address}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {tenancy.room.property.city} &middot; {tenancy.room.label} &middot; Landlord: {tenancy.room.property.landlord.name}
                    </p>
                  </div>
                  <div className="ml-4 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-yellow-200 ring-inset">
                      {tenancy.status}
                    </span>
                    <Link href="/dashboard/tenant/tenancy" className="text-xs text-blue-600 hover:underline">
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTenancies.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Active tenancies</h2>
          <div className="space-y-4">
            {activeTenancies.map((tenancy) => (
              <ActiveTenancyCard key={tenancy.id} tenancy={tenancy} />
            ))}
          </div>
        </section>
      ) : (
        tenancies.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">
              You don&apos;t have any tenancies yet. Your landlord will send you an invitation when they list a room for you.
            </p>
          </div>
        )
      )}
    </div>
  );
}

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const AGREEMENT_PILL: Record<string, string> = {
  DRAFT: `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  FINALIZED: `${PILL_BASE} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset`,
  NEGOTIATING: `${PILL_BASE} bg-purple-50 text-purple-700 ring-1 ring-purple-200 ring-inset`,
  PENDING_TENANT: `${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
};

function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
      <span className="font-medium text-gray-700">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${value > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {value}
      </span>
    </div>
  );
}

function ActiveTenancyCard({ tenancy }: { tenancy: ActiveTenancyType }) {
  const agreementStatus = tenancy.agreement?.status;
  const cover = getPropertyCover(tenancy.room.property.photos ?? []);

  const nextPayment = tenancy.rentPayments
    .filter((p) => p.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const hasRejectedPayment = tenancy.rentPayments.some(
    (p) => p.status === 'PENDING' && p.rejectionReason,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
      <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
        <PropertyCover
          address={tenancy.room.property.address}
          imageUrl={cover?.imageUrl}
          caption={cover?.caption}
          className="rounded-xl"
          heightClassName="h-36 sm:h-full"
        />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{tenancy.room.property.address}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {tenancy.room.property.city} &middot; {tenancy.room.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Landlord: {tenancy.room.property.landlord.name}
              </p>
            </div>
            <Link href="/dashboard/tenant/tenancy" className="shrink-0 text-sm text-blue-600 hover:underline">
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
                <Link href="/dashboard/tenant/tenancy" className="text-xs font-medium text-blue-600 hover:underline">
                  Review &amp; sign &rarr;
                </Link>
              )}
            </div>
          )}

          {nextPayment && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-500">Next payment:</span>
              <span className="text-xs font-medium text-gray-900">
                RM {Number(nextPayment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-gray-400">
                due {new Date(nextPayment.dueDate).toLocaleDateString('en-MY')}
              </span>
              {hasRejectedPayment && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200 ring-inset">
                  Proof rejected
                </span>
              )}
            </div>
          )}
        </div>
      </div>
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
      photos: { imageUrl: string; caption: string | null; order: number | null; createdAt: Date }[];
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
