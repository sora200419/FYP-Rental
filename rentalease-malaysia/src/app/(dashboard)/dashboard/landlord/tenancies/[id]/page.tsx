import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import GenerateAgreementButton from '@/components/ui/GenerateAgreementButton';

const STATUS_STYLES: Record<string, string> = {
  INVITED: 'bg-blue-100 text-blue-700',
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

  // Authorization chain: Tenancy → Room → Property → landlordId
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id,
      room: { property: { landlordId: session.user.id } },
    },
    include: {
      room: {
        include: {
          property: true, // full property for address, city, type etc.
        },
      },
      tenant: { select: { name: true, email: true, phone: true } },
      agreement: {
        select: {
          id: true,
          status: true,
          plainLanguageSummary: true,
          redFlags: true,
          negotiationNotes: true,
          negotiationRound: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      rentPayments: { orderBy: { dueDate: 'asc' } },
      conditionReports: {
        select: { id: true, type: true, acknowledgedAt: true },
      },
    },
  });

  if (!tenancy) notFound();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  let redFlagCount = 0;
  if (tenancy.agreement?.redFlags) {
    try {
      const flags = JSON.parse(tenancy.agreement.redFlags);
      redFlagCount = Array.isArray(flags) ? flags.length : 0;
    } catch {
      redFlagCount = 0;
    }
  }

  const totalReports = tenancy.conditionReports.length;
  const pendingAckReports = tenancy.conditionReports.filter(
    (r) => !r.acknowledgedAt,
  ).length;

  // A payment is overdue when it is PENDING and its due date has passed.
  // We compute this dynamically rather than storing a LATE status in the DB.
  const isOverdue = (dueDate: Date, status: string) =>
    status === 'PENDING' && new Date(dueDate) < new Date();

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
          {tenancy.room.property.address} — {tenancy.room.label}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenancy Details</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tenancy.room.property.address}, {tenancy.room.property.city}
            {' · '}
            <span className="font-medium">{tenancy.room.label}</span>
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
        {/* INVITED state banner — tenant hasn't accepted yet */}
        {tenancy.status === 'INVITED' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
            <p className="text-blue-800 font-semibold text-sm">
              ⏳ Waiting for tenant to accept
            </p>
            <p className="text-blue-600 text-xs mt-1">
              An invitation has been sent to {tenancy.tenant.name}. You can
              generate an agreement once they accept. If they decline, the room
              will become available again.
            </p>
          </div>
        )}

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
              <p className="text-gray-400">Room</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {tenancy.room.label}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Property Type</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {tenancy.room.property.type}
              </p>
            </div>
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

        {/* Property condition card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Property Condition
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-2xl">📷</span>
              <div>
                <p className="font-medium text-gray-900">
                  {totalReports} {totalReports === 1 ? 'report' : 'reports'}{' '}
                  created
                </p>
                {pendingAckReports > 0 && (
                  <p className="text-amber-600 text-xs mt-0.5">
                    {pendingAckReports} pending acknowledgement
                  </p>
                )}
                {totalReports === 0 && (
                  <p className="text-gray-400 text-xs mt-0.5">
                    Document property condition with photos grouped by room
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/dashboard/landlord/tenancies/${tenancy.id}/conditions`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {totalReports === 0 ? '📷 Start Report' : 'View Reports →'}
            </Link>
          </div>
        </div>

        {/* Agreement card — only show for PENDING or later */}
        {tenancy.status !== 'INVITED' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Tenancy Agreement
            </h2>

            {tenancy.agreement ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        tenancy.agreement.status === 'FINALIZED'
                          ? 'bg-green-100 text-green-700'
                          : tenancy.agreement.status === 'SIGNED'
                            ? 'bg-blue-100 text-blue-700'
                            : tenancy.agreement.status === 'NEGOTIATING'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {tenancy.agreement.status.charAt(0) +
                        tenancy.agreement.status.slice(1).toLowerCase()}
                    </span>
                    {redFlagCount > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                        ⚠️ {redFlagCount} red{' '}
                        {redFlagCount === 1 ? 'flag' : 'flags'}
                      </span>
                    )}
                    {(tenancy.agreement.negotiationRound ?? 0) > 0 && (
                      <span className="text-xs text-gray-400">
                        Round {tenancy.agreement.negotiationRound}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Updated {formatDate(tenancy.agreement.updatedAt)}
                  </p>
                </div>

                {tenancy.agreement.status === 'NEGOTIATING' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-4">
                    <p className="text-blue-800 font-semibold text-sm mb-2">
                      💬 Tenant has requested changes
                    </p>
                    {tenancy.agreement.negotiationNotes && (
                      <div className="bg-white rounded-lg border border-blue-200 px-4 py-3 mb-3">
                        <p className="text-xs text-gray-400 mb-1">
                          Tenant&apos;s feedback:
                        </p>
                        <p className="text-sm text-gray-700">
                          {tenancy.agreement.negotiationNotes}
                        </p>
                      </div>
                    )}
                    <p className="text-blue-600 text-xs">
                      Use Regenerate to produce a revised agreement that
                      incorporates their feedback, or view the agreement to edit
                      specific clauses manually.
                    </p>
                  </div>
                )}

                {tenancy.agreement.status === 'SIGNED' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-4">
                    <p className="text-green-800 font-semibold text-sm">
                      ✓ Agreement signed by tenant — Tenancy is active
                    </p>
                    <p className="text-green-600 text-xs mt-0.5">
                      Both parties have agreed. The rent payment schedule has
                      been generated.
                    </p>
                  </div>
                )}

                {tenancy.agreement.status === 'FINALIZED' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4">
                    <p className="text-amber-800 font-semibold text-sm">
                      ⏳ Awaiting tenant review
                    </p>
                    <p className="text-amber-600 text-xs mt-0.5">
                      The agreement has been sent to the tenant for review.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/landlord/tenancies/${tenancy.id}/agreement`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                  >
                    View Agreement
                  </Link>
                  <GenerateAgreementButton
                    tenancyId={tenancy.id}
                    label="🔄 Regenerate"
                    variant="secondary"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-gray-700 font-semibold">
                  No agreement generated yet
                </p>
                <p className="text-gray-400 text-sm mt-1 mb-5 max-w-sm mx-auto">
                  Generate an AI-assisted agreement based on the tenancy terms.
                  Includes plain-language explanations and red-flag warnings.
                </p>
                <GenerateAgreementButton
                  tenancyId={tenancy.id}
                  label="✨ Generate Agreement"
                  variant="primary"
                />
              </div>
            )}
          </div>
        )}

        {/* Rent payment schedule */}
        {tenancy.rentPayments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Rent Payment Schedule
            </h2>
            <div className="space-y-2">
              {tenancy.rentPayments.map((payment) => {
                const overdue = isOverdue(payment.dueDate, payment.status);
                return (
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
                            : overdue
                              ? 'bg-red-100 text-red-600'
                              : payment.status === 'UNDER_REVIEW'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {overdue
                          ? 'Overdue'
                          : payment.status.charAt(0) +
                            payment.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
