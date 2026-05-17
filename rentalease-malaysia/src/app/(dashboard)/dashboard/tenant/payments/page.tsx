import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PaymentProofUploader from '@/components/ui/PaymentProofUploader';
import DepositProofUploader from '@/components/ui/DepositProofUploader';
import { PageHeader } from '@/components/ui/RedesignPrimitives';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  PAID: 'Paid',
  LATE: 'Late',
  WAIVED: 'Waived',
};

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_STYLE: Record<string, string> = {
  PENDING:      `${PILL_BASE} bg-white/8 text-white/50 ring-1 ring-[rgba(196,154,60,0.15)] ring-inset`,
  UNDER_REVIEW: `${PILL_BASE} bg-[rgba(196,154,60,0.12)] text-[#C49A3C] ring-1 ring-[rgba(196,154,60,0.3)] ring-inset`,
  PAID:         `${PILL_BASE} bg-[rgba(74,222,128,0.12)] text-[#4ade80] ring-1 ring-[rgba(74,222,128,0.3)] ring-inset`,
  LATE:         `${PILL_BASE} bg-[rgba(248,113,113,0.12)] text-[#f87171] ring-1 ring-[rgba(248,113,113,0.3)] ring-inset`,
  WAIVED:       `${PILL_BASE} bg-white/8 text-white/50 ring-1 ring-[rgba(196,154,60,0.15)] ring-inset`,
};

export default async function TenantPaymentsPage() {
  const session = await getServerSession(authOptions);
  // ✅ Correct role check — TENANT not LANDLORD
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      tenantId: session.user.id,
      status: { in: ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      room: {
        include: {
          property: { select: { address: true, city: true } },
        },
      },
      rentPayments: {
        orderBy: { dueDate: 'asc' },
        include: {
          proofs: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, imageUrl: true },
          },
        },
      },
      depositProofs: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, imageUrl: true },
      },
    },
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const today = new Date();

  return (
    <div>
      <PageHeader
        eyebrow="My payments"
        title="Payments"
        description="Track your rent and deposit payments."
      />

      {/* ── Deposit card — pinned at top when tenancy exists ───────────────── */}
      {tenancy && (
        <div
          className={`bg-[#1C2740] rounded-xl border p-5 mb-6 ${
            tenancy.depositStatus === 'UNDER_REVIEW'
              ? 'border-[rgba(251,191,36,0.25)]'
              : tenancy.depositStatus === 'PAID'
                ? 'border-[rgba(74,222,128,0.3)]'
                : tenancy.depositStatus === 'REJECTED'
                  ? 'border-[rgba(248,113,113,0.3)]'
                  : 'border-[rgba(196,154,60,0.15)]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">
                Security Deposit
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                {formatRM(tenancy.depositAmount)} · one-time payment
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                tenancy.depositStatus === 'PAID'
                  ? 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]'
                  : tenancy.depositStatus === 'UNDER_REVIEW'
                    ? 'bg-[rgba(251,191,36,0.08)] text-[#facc15]'
                    : tenancy.depositStatus === 'REJECTED'
                      ? 'bg-[rgba(248,113,113,0.12)] text-[#f87171]'
                      : 'bg-white/8 text-white/50'
              }`}
            >
              {tenancy.depositStatus === 'UNDER_REVIEW'
                ? 'Under Review'
                : tenancy.depositStatus === 'PAID'
                  ? 'Confirmed'
                  : tenancy.depositStatus === 'REJECTED'
                    ? 'Rejected'
                    : 'Pending'}
            </span>
          </div>
          <DepositProofUploader
            tenancyId={tenancy.id}
            depositStatus={tenancy.depositStatus}
            depositRejectionReason={tenancy.depositRejectionReason}
            existingProofs={tenancy.depositProofs}
            depositAmount={formatRM(tenancy.depositAmount)}
          />
        </div>
      )}

      {/* No active tenancy */}
      {!tenancy && (
        <div className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-12 text-center">
          <p className="text-white/70 font-semibold">No tenancy found</p>
          <p className="text-sm text-white/40 mt-1">
            Payment tracking will be available once your landlord links you to a tenancy.
          </p>
        </div>
      )}

      {tenancy && tenancy.rentPayments.length === 0 && (
        <div className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-12 text-center">
          <p className="text-white/70 font-semibold">No rent schedule yet</p>
          <p className="text-sm text-white/40 mt-1">
            Your monthly payment schedule will appear here once your agreement is signed.
          </p>
        </div>
      )}

      {tenancy && tenancy.rentPayments.length > 0 && (
        <div>
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Total',
                value: tenancy.rentPayments.length,
                color: 'text-white',
              },
              {
                label: 'Paid',
                value: tenancy.rentPayments.filter((p) => p.status === 'PAID')
                  .length,
                color: 'text-[#4ade80]',
              },
              {
                label: 'Pending',
                value: tenancy.rentPayments.filter(
                  (p) => p.status === 'PENDING' || p.status === 'LATE',
                ).length,
                color: 'text-[#facc15]',
              },
              {
                label: 'Under Review',
                value: tenancy.rentPayments.filter(
                  (p) => p.status === 'UNDER_REVIEW',
                ).length,
                color: 'text-[#C49A3C]',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-4 text-center"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Payment rows */}
          <div className="space-y-4">
            {tenancy.rentPayments.map((payment) => {
              const isOverdue =
                payment.status === 'PENDING' &&
                new Date(payment.dueDate) < today;

              return (
                <div
                  key={payment.id}
                  className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-5"
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {formatDate(payment.dueDate)}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatRM(payment.amount)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isOverdue
                          ? 'bg-[rgba(248,113,113,0.12)] text-[#f87171]'
                          : (STATUS_STYLE[payment.status] ??
                            'bg-white/8 text-white/50')
                      }`}
                    >
                      {isOverdue
                        ? 'Overdue'
                        : (STATUS_LABEL[payment.status] ?? payment.status)}
                    </span>
                  </div>

                  {/* The interactive uploader — handles all upload/preview/retry logic */}
                  <PaymentProofUploader
                    paymentId={payment.id}
                    currentStatus={payment.status}
                    rejectionReason={payment.rejectionReason}
                    existingProofs={payment.proofs.map((p) => ({
                      id: p.id,
                      imageUrl: p.imageUrl,
                    }))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
