import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function TenantDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      tenantId: session.user.id,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    include: {
      agreement: { select: { status: true } },
      rentPayments: {
        where: { status: { in: ['PENDING', 'LATE'] } },
      },
      property: { select: { address: true, city: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const pendingPayments = tenancy?.rentPayments.length ?? 0;
  const agreementStatus = tenancy?.agreement?.status ?? null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {tenancy
            ? `Your tenancy at ${tenancy.property.address}, ${tenancy.property.city}`
            : 'You have no active tenancy yet.'}
        </p>
      </div>

      {!tenancy ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <p className="font-semibold text-blue-900">
            Waiting for your landlord
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Once your landlord creates a tenancy and generates an agreement, it
            will appear here for you to review.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            <Link
              href="/dashboard/tenant/tenancy"
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <p className="text-sm font-medium text-gray-500">Agreement</p>
              <p className="text-2xl font-bold mt-2 text-blue-600">
                {agreementStatus
                  ? agreementStatus.charAt(0) +
                    agreementStatus.slice(1).toLowerCase()
                  : 'None yet'}
              </p>
              <p className="text-xs text-gray-400 mt-2">View agreement →</p>
            </Link>

            <Link
              href="/dashboard/tenant/payments"
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <p className="text-sm font-medium text-gray-500">
                Pending Payments
              </p>
              <p
                className={`text-4xl font-bold mt-2 ${
                  pendingPayments > 0 ? 'text-amber-600' : 'text-green-600'
                }`}
              >
                {pendingPayments}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                View payment schedule →
              </p>
            </Link>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">
                Tenancy Status
              </p>
              <p
                className={`text-2xl font-bold mt-2 ${
                  tenancy.status === 'ACTIVE'
                    ? 'text-green-600'
                    : 'text-amber-600'
                }`}
              >
                {tenancy.status.charAt(0) +
                  tenancy.status.slice(1).toLowerCase()}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {tenancy.status === 'ACTIVE'
                  ? 'Tenancy is live'
                  : 'Awaiting agreement'}
              </p>
            </div>
          </div>

          {/* Contextual prompt based on agreement state */}
          {agreementStatus === 'FINALIZED' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center justify-between">
              <div>
                <p className="font-semibold text-amber-900">
                  Agreement ready for your review
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Your landlord has finalised the agreement. Please review and
                  accept or request changes.
                </p>
              </div>
              <Link
                href="/dashboard/tenant/tenancy"
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap ml-4"
              >
                Review Now
              </Link>
            </div>
          )}

          {agreementStatus === 'NEGOTIATING' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="font-semibold text-blue-900">Change request sent</p>
              <p className="text-sm text-blue-700 mt-1">
                Your landlord has been notified and will revise the agreement
                based on your feedback.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
