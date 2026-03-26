import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-100 text-red-600',
};

export default async function TenancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id,
      property: { landlordId: session.user.id },
    },
    include: {
      property: true,
      tenant: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      agreement: {
        select: {
          id: true,
          status: true,
          plainLanguageSummary: true,
          redFlags: true,
          createdAt: true,
        },
      },
      rentPayments: {
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  // If the tenancy doesn't exist or doesn't belong to this landlord, show 404
  if (!tenancy) notFound();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          href="/dashboard/landlord/tenancies"
          className="hover:text-blue-600 transition-colors"
        >
          Tenancies
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">
          {tenancy.property.address}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenancy Details</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tenancy.property.address}, {tenancy.property.city}
          </p>
        </div>
        <span
          className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
            STATUS_STYLES[tenancy.status] ?? 'bg-gray-100 text-gray-500'
          }`}
        >
          {tenancy.status.charAt(0) + tenancy.status.slice(1).toLowerCase()}
        </span>
      </div>

      <div className="space-y-5">
        {/* Tenant info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Tenant
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
              {tenancy.tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {tenancy.tenant.name}
              </p>
              <p className="text-sm text-gray-400">{tenancy.tenant.email}</p>
              {tenancy.tenant.phone && (
                <p className="text-sm text-gray-400">{tenancy.tenant.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tenancy terms card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Tenancy Terms
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Start Date</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {formatDate(tenancy.startDate)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">End Date</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {formatDate(tenancy.endDate)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Monthly Rent</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {formatRM(tenancy.monthlyRent)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Security Deposit</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {formatRM(tenancy.depositAmount)}
              </p>
            </div>
          </div>
        </div>

        {/* Agreement card — this is where Gemini integration goes in Phase 6 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Tenancy Agreement
          </h2>

          {tenancy.agreement ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">
                  Status:
                </span>
                <span className="text-sm text-gray-500">
                  {tenancy.agreement.status.charAt(0) +
                    tenancy.agreement.status.slice(1).toLowerCase()}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Generated on {formatDate(tenancy.agreement.createdAt)}
              </p>
              <Link
                href={`/dashboard/landlord/tenancies/${tenancy.id}/agreement`}
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                View Agreement
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-gray-700 font-semibold">
                No agreement generated yet
              </p>
              <p className="text-gray-400 text-sm mt-1 mb-5">
                Generate an AI-assisted tenancy agreement based on the terms
                above. The agreement will include plain-language explanations
                and red-flag warnings.
              </p>
              {/* This button will trigger Gemini in Phase 6 */}
              <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed">
                ✨ Generate Agreement
                <span className="text-xs font-normal">(Phase 6)</span>
              </div>
            </div>
          )}
        </div>

        {/* Rent payment schedule — empty for now, populated in Phase 6 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Rent Payment Schedule
          </h2>
          {tenancy.rentPayments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Rent schedule will be created when the agreement is finalised.
            </p>
          ) : (
            <div className="space-y-2">
              {tenancy.rentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm text-gray-700">
                    {formatDate(payment.dueDate)}
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      {formatRM(payment.amount)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        payment.status === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : payment.status === 'LATE'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {payment.status.charAt(0) +
                        payment.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
