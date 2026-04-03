import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import PaymentVerificationCard from '@/components/ui/PaymentVerficationCard';

export default async function LandlordPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  // Fetch all payments under review across all of this landlord's properties
  const pendingPayments = await prisma.rentPayment.findMany({
    where: {
      status: 'UNDER_REVIEW',
      tenancy: { property: { landlordId: session.user.id } },
    },
    include: {
      proofs: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, imageUrl: true, createdAt: true },
      },
      tenancy: {
        include: {
          property: { select: { address: true, city: true } },
          tenant: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' }, // oldest first — most urgent at top
  });

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Inbox</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Review and verify payment proof submitted by your tenants.
            </p>
          </div>
          {pendingPayments.length > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingPayments.length} pending{' '}
              {pendingPayments.length === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">✅</p>
          <p className="text-gray-700 font-semibold text-lg">All caught up</p>
          <p className="text-gray-400 text-sm mt-1">
            No payment proofs are waiting for your review right now.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map((payment) => (
            <div key={payment.id}>
              {/* Property + tenant context header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {payment.tenancy.property.address},{' '}
                    {payment.tenancy.property.city}
                  </p>
                  <p className="text-xs text-gray-400">
                    Tenant: {payment.tenancy.tenant.name} ·{' '}
                    {payment.tenancy.tenant.email}
                  </p>
                </div>
                <Link
                  href={`/dashboard/landlord/tenancies/${payment.tenancy.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View tenancy →
                </Link>
              </div>

              {/* The reusable verification card component */}
              <PaymentVerificationCard
                paymentId={payment.id}
                dueDate={formatDate(payment.dueDate)}
                amount={formatRM(payment.amount)}
                status={payment.status}
                proofs={payment.proofs.map((p) => ({
                  ...p,
                  createdAt: p.createdAt,
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
