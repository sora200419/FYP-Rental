import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import PaymentVerificationCard from '@/components/ui/PaymentVerficationCard';
import DepositVerificationCard from '@/components/ui/DepositVerificationCard';

export default async function LandlordPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const [allPayments, allDepositTenancies] = await Promise.all([
    prisma.rentPayment.findMany({
      where: {
        tenancy: { room: { property: { landlordId: session.user.id } } },
      },
      include: {
        proofs: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, imageUrl: true, createdAt: true },
        },
        tenancy: {
          include: {
            room: {
              include: {
                property: { select: { address: true, city: true } },
              },
            },
            tenant: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    }),

    // Fetch tenancies where tenant has acted on deposit (not PENDING)
    prisma.tenancy.findMany({
      where: {
        room: { property: { landlordId: session.user.id } },
        status: { in: ['PENDING', 'ACTIVE'] },
        NOT: { depositStatus: 'PENDING' },
      },
      include: {
        depositProofs: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, imageUrl: true, createdAt: true },
        },
        room: {
          include: {
            property: { select: { address: true, city: true } },
          },
        },
        tenant: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const today = new Date();

  const underReview = allPayments.filter((p) => p.status === 'UNDER_REVIEW');
  const pending = allPayments.filter(
    (p) => p.status === 'PENDING' || p.status === 'LATE',
  );
  const paid = allPayments.filter(
    (p) => p.status === 'PAID' || p.status === 'WAIVED',
  );
  const overdue = pending.filter((p) => new Date(p.dueDate) < today);

  const depositsUnderReview = allDepositTenancies.filter(
    (t) => t.depositStatus === 'UNDER_REVIEW',
  );
  const depositsConfirmed = allDepositTenancies.filter(
    (t) => t.depositStatus === 'PAID',
  );
  const depositsRejected = allDepositTenancies.filter(
    (t) => t.depositStatus === 'REJECTED',
  );

  const totalAwaiting = underReview.length + depositsUnderReview.length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Full payment overview across all your tenancies.
            </p>
          </div>
          {totalAwaiting > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {totalAwaiting} awaiting review
            </span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Rent Total', value: allPayments.length, color: 'text-gray-900' },
          { label: 'Rent Under Review', value: underReview.length, color: 'text-amber-600' },
          { label: 'Overdue', value: overdue.length, color: 'text-red-600' },
          { label: 'Rent Paid', value: paid.length, color: 'text-green-600' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-4 text-center"
          >
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Security Deposits ────────────────────────────────────────────────── */}
      {allDepositTenancies.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Security Deposits
            </h2>
          </div>
          <div className="space-y-4">
            {/* Under review — approve/reject */}
            {depositsUnderReview.map((t) => (
              <DepositRow
                key={t.id}
                tenancy={t}
                formatRM={formatRM}
              >
                <DepositVerificationCard
                  tenancyId={t.id}
                  depositAmount={formatRM(t.depositAmount)}
                  depositStatus={t.depositStatus}
                  proofs={t.depositProofs}
                  rejectionReason={t.depositRejectionReason}
                />
              </DepositRow>
            ))}

            {/* Rejected — waiting for tenant re-upload */}
            {depositsRejected.map((t) => (
              <DepositRow
                key={t.id}
                tenancy={t}
                formatRM={formatRM}
              >
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                    Rejected — awaiting re-upload from tenant
                  </span>
                  {t.depositRejectionReason && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Reason: {t.depositRejectionReason}
                    </p>
                  )}
                </div>
              </DepositRow>
            ))}

            {/* Confirmed */}
            {depositsConfirmed.map((t) => (
              <DepositRow
                key={t.id}
                tenancy={t}
                formatRM={formatRM}
              >
                <div className="mt-4 border-t border-gray-100 pt-4 flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    Confirmed
                  </span>
                  {t.depositProofs.length > 0 && (
                    <a
                      href={t.depositProofs[0].imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View proof
                    </a>
                  )}
                </div>
              </DepositRow>
            ))}
          </div>
        </div>
      )}

      {allPayments.length === 0 && allDepositTenancies.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">💳</p>
          <p className="text-gray-700 font-semibold text-lg">No payments yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Payment schedules are generated when tenants sign their agreements.
          </p>
        </div>
      )}

      {/* ── Rent: Awaiting Review ────────────────────────────────────────────── */}
      {underReview.length > 0 && (
        <Section title="Rent — Awaiting Review" accent="amber">
          {underReview.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              formatDate={formatDate}
              formatRM={formatRM}
            >
              <PaymentVerificationCard
                paymentId={payment.id}
                dueDate={formatDate(payment.dueDate)}
                amount={formatRM(payment.amount)}
                status={payment.status}
                proofs={payment.proofs}
              />
            </PaymentRow>
          ))}
        </Section>
      )}

      {/* ── Rent: Pending / Overdue ──────────────────────────────────────────── */}
      {pending.length > 0 && (
        <Section title="Rent — Pending" accent="gray">
          {pending.map((payment) => {
            const isOverdue = new Date(payment.dueDate) < today;
            return (
              <PaymentRow
                key={payment.id}
                payment={payment}
                formatDate={formatDate}
                formatRM={formatRM}
              >
                <div className="mt-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isOverdue
                        ? 'bg-red-100 text-red-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isOverdue ? 'Overdue' : 'Pending'}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    Due {formatDate(payment.dueDate)}
                  </span>
                </div>
              </PaymentRow>
            );
          })}
        </Section>
      )}

      {/* ── Rent: Paid ──────────────────────────────────────────────────────── */}
      {paid.length > 0 && (
        <Section title="Rent — Paid" accent="green">
          {paid.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              formatDate={formatDate}
              formatRM={formatRM}
            >
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  {payment.status === 'WAIVED' ? 'Waived' : 'Paid'}
                </span>
                <span className="text-xs text-gray-400">
                  Due {formatDate(payment.dueDate)}
                </span>
                {payment.proofs.length > 0 && (
                  <a
                    href={payment.proofs[0].imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View proof
                  </a>
                )}
              </div>
            </PaymentRow>
          ))}
        </Section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: 'amber' | 'green' | 'gray';
  children: React.ReactNode;
}) {
  const dot: Record<string, string> = {
    amber: 'bg-amber-400',
    green: 'bg-green-400',
    gray: 'bg-gray-300',
  };
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dot[accent]}`} />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

type PaymentWithRelations = {
  id: string;
  dueDate: Date;
  amount: unknown;
  status: string;
  proofs: { id: string; imageUrl: string; createdAt: Date }[];
  tenancy: {
    id: string;
    room: {
      label: string;
      property: { address: string; city: string };
    };
    tenant: { name: string; email: string };
  };
};

function PaymentRow({
  payment,
  formatDate,
  formatRM,
  children,
}: {
  payment: PaymentWithRelations;
  formatDate: (d: Date) => string;
  formatRM: (a: unknown) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {payment.tenancy.room.property.address},{' '}
            {payment.tenancy.room.property.city}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Room: {payment.tenancy.room.label} · Tenant:{' '}
            {payment.tenancy.tenant.name} · {formatRM(payment.amount)}
          </p>
        </div>
        <Link
          href={`/dashboard/landlord/tenancies/${payment.tenancy.id}`}
          className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-4"
        >
          View tenancy →
        </Link>
      </div>
      {children}
    </div>
  );
}

type DepositTenancy = {
  id: string;
  depositAmount: unknown;
  depositStatus: string;
  depositRejectionReason: string | null;
  depositProofs: { id: string; imageUrl: string; createdAt: Date }[];
  room: {
    label: string;
    property: { address: string; city: string };
  };
  tenant: { name: string; email: string };
};

function DepositRow({
  tenancy,
  formatRM,
  children,
}: {
  tenancy: DepositTenancy;
  formatRM: (a: unknown) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {tenancy.room.property.address}, {tenancy.room.property.city}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Room: {tenancy.room.label} · Tenant: {tenancy.tenant.name} ·{' '}
            {formatRM(tenancy.depositAmount)}
          </p>
        </div>
        <Link
          href={`/dashboard/landlord/tenancies/${tenancy.id}`}
          className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-4"
        >
          View tenancy →
        </Link>
      </div>
      {children}
    </div>
  );
}
