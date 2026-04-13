import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PaymentProofUploader from '@/components/ui/PaymentProofUploader';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  PAID: 'Paid',
  LATE: 'Late',
  WAIVED: 'Waived',
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  LATE: 'bg-red-100 text-red-600',
  WAIVED: 'bg-gray-100 text-gray-500',
};

export default async function TenantPaymentsPage() {
  const session = await getServerSession(authOptions);
  // ✅ Correct role check — TENANT not LANDLORD
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      tenantId: session.user.id,
      status: 'ACTIVE',
    },
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
            select: { id: true, imageUrl: true, isReadByTenant: true },
          },
        },
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

  // Count how many landlord decisions the tenant hasn't seen yet
  const unreadDecisions =
    tenancy?.rentPayments.reduce(
      (sum, p) => sum + p.proofs.filter((pr) => !pr.isReadByTenant).length,
      0,
    ) ?? 0;

  // Fire-and-forget: mark all proofs as read now that tenant is viewing this page
  if (unreadDecisions > 0 && tenancy) {
    const paymentIds = tenancy.rentPayments.map((p) => p.id);
    prisma.paymentProof
      .updateMany({
        where: { paymentId: { in: paymentIds }, isReadByTenant: false },
        data: { isReadByTenant: true },
      })
      .catch(console.error);
  }

  const today = new Date();

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Upload proof of payment and track verification status.
            </p>
          </div>
          {unreadDecisions > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadDecisions} new{' '}
              {unreadDecisions === 1 ? 'update' : 'updates'}
            </span>
          )}
        </div>
      </div>

      {/* No active tenancy */}
      {!tenancy && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">💳</p>
          <p className="text-gray-700 font-semibold text-lg">
            No active tenancy
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Payment tracking will be available once your tenancy is active.
          </p>
        </div>
      )}

      {tenancy && tenancy.rentPayments.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">💳</p>
          <p className="text-gray-700 font-semibold text-lg">No payments yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Your payment schedule is being prepared.
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
                color: 'text-gray-900',
              },
              {
                label: 'Paid',
                value: tenancy.rentPayments.filter((p) => p.status === 'PAID')
                  .length,
                color: 'text-green-600',
              },
              {
                label: 'Pending',
                value: tenancy.rentPayments.filter(
                  (p) => p.status === 'PENDING' || p.status === 'LATE',
                ).length,
                color: 'text-amber-600',
              },
              {
                label: 'Under Review',
                value: tenancy.rentPayments.filter(
                  (p) => p.status === 'UNDER_REVIEW',
                ).length,
                color: 'text-blue-600',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-4 text-center"
              >
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Payment rows */}
          <div className="space-y-4">
            {tenancy.rentPayments.map((payment) => {
              const hasUnread = payment.proofs.some((p) => !p.isReadByTenant);
              const isOverdue =
                payment.status === 'PENDING' &&
                new Date(payment.dueDate) < today;

              return (
                <div
                  key={payment.id}
                  className={`bg-white rounded-xl border p-5 ${
                    hasUnread ? 'border-blue-300 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  {/* Row header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(payment.dueDate)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatRM(payment.amount)}
                        </p>
                      </div>
                      {/* Blue dot = landlord made a decision the tenant hasn't seen */}
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isOverdue
                          ? 'bg-red-100 text-red-600'
                          : (STATUS_STYLE[payment.status] ??
                            'bg-gray-100 text-gray-500')
                      }`}
                    >
                      {isOverdue
                        ? 'Overdue'
                        : (STATUS_LABEL[payment.status] ?? payment.status)}
                    </span>
                  </div>

                  {/* Rejection reason if the landlord rejected the proof */}
                  {payment.status === 'PENDING' && payment.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
                      <p className="text-red-800 text-sm font-semibold mb-1">
                        Proof rejected — please re-upload
                      </p>
                      <p className="text-red-600 text-xs">
                        {payment.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Approval notification banner */}
                  {payment.status === 'PAID' && hasUnread && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3">
                      <p className="text-green-800 text-sm font-semibold">
                        ✓ Your payment proof has been approved by the landlord
                      </p>
                    </div>
                  )}

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
