// src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AgreementViewer from '@/components/ui/AgreementViewer';
import TenantAgreementActions from '@/components/ui/TenantAgreementActions';
import TenantDepositReview from '@/components/ui/TenantDepositReview';

export default async function TenantTenancyPage() {
  const session = await getServerSession(authOptions);
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
          property: {
            include: {
              landlord: { select: { name: true, email: true, phone: true } },
            },
          },
        },
      },
      agreement: true, // full include — contentHash, signedAt, signedByIp all present
      depositRefund: {
        include: { deductions: { orderBy: { createdAt: 'asc' } } },
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

  type RedFlag = {
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    clause: string;
    issue: string;
    recommendation: string;
  };

  let redFlags: RedFlag[] = [];
  if (tenancy?.agreement?.redFlags) {
    try {
      redFlags = JSON.parse(tenancy.agreement.redFlags);
    } catch {
      redFlags = [];
    }
  }

  // ── Case 1: No PENDING/ACTIVE tenancy for this tenant ─────────────────────
  if (!tenancy) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Tenancy</h1>
          <p className="text-gray-500 mt-1 text-sm">
            View your current tenancy agreement and details.
          </p>
        </div>
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">🏠</p>
          <p className="text-gray-700 font-semibold text-lg">No tenancy yet</p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Your tenancy details will appear here once your landlord creates an
            invitation and you accept it.
          </p>
        </div>
      </div>
    );
  }

  const property = tenancy.room.property;
  const landlord = property.landlord;
  const fullAddress = `${property.address}, ${property.city} — ${tenancy.room.label}`;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tenancy</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {property.address}, {property.city}
        </p>
      </div>

      <div className="space-y-5">
        {/* ── Tenancy summary card ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Tenancy Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-5">
            <div>
              <p className="text-gray-400">Property</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {property.address}
              </p>
              <p className="text-gray-400 text-xs">
                {property.city}, {property.state}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Room</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {tenancy.room.label}
              </p>
              <p className="text-gray-400 text-xs capitalize">
                {property.type}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Status</p>
              <span
                className={`inline-block mt-0.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  tenancy.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {tenancy.status.charAt(0) +
                  tenancy.status.slice(1).toLowerCase()}
              </span>
            </div>
            <div>
              <p className="text-gray-400">Tenancy Period</p>
              <p className="font-medium text-gray-900 mt-0.5 text-xs">
                {formatDate(tenancy.startDate)} — {formatDate(tenancy.endDate)}
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

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 mb-2">Landlord</p>
            <p className="text-sm font-medium text-gray-800">{landlord.name}</p>
            <p className="text-xs text-gray-400">{landlord.email}</p>
            {landlord.phone && (
              <p className="text-xs text-gray-400">{landlord.phone}</p>
            )}
          </div>
        </div>

        {/* ── Case 2: No agreement generated yet ────────────────────────────── */}
        {!tenancy.agreement && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-gray-700 font-semibold">
              Agreement not ready yet
            </p>
            <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
              Your landlord is preparing the tenancy agreement. It will appear
              here once they have finalised it.
            </p>
          </div>
        )}

        {/* ── Case 3: DRAFT ──────────────────────────────────────────────────── */}
        {tenancy.agreement?.status === 'DRAFT' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-amber-800 font-semibold text-sm">
              Agreement under review
            </p>
            <p className="text-amber-600 text-xs mt-0.5">
              Your landlord is reviewing the AI-generated agreement. It will
              appear here once they finalise it.
            </p>
          </div>
        )}

        {/* ── Case 4: NEGOTIATING ────────────────────────────────────────────── */}
        {tenancy.agreement?.status === 'NEGOTIATING' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
              <p className="text-blue-800 font-semibold text-sm">
                Change request sent ✓
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Your landlord has been notified. They will revise the agreement
                and send you a new version to review.
              </p>
              {tenancy.agreement.negotiationNotes && (
                <div className="mt-3 bg-white rounded-lg border border-blue-200 px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Your request:</p>
                  <p className="text-sm text-gray-700">
                    {tenancy.agreement.negotiationNotes}
                  </p>
                </div>
              )}
            </div>
            <AgreementViewer
              agreementId={tenancy.agreement.id}
              status={tenancy.agreement.status}
              rawContent={tenancy.agreement.rawContent}
              plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
              redFlags={redFlags}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
            />
          </>
        )}

        {/* ── Case 5: SIGNED — now with audit trail props ───────────────────── */}
        {tenancy.agreement?.status === 'SIGNED' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <p className="text-green-800 font-semibold text-sm">
                ✓ Agreement signed — Tenancy is active
              </p>
              <p className="text-green-600 text-xs mt-0.5">
                You have accepted this agreement. Your tenancy is now live and
                your payment schedule has been generated.
              </p>
            </div>
            <AgreementViewer
              agreementId={tenancy.agreement.id}
              status={tenancy.agreement.status}
              rawContent={tenancy.agreement.rawContent}
              plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
              redFlags={redFlags}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
              // Phase 11: signing audit trail — the panel renders once these are non-null
              contentHash={tenancy.agreement.contentHash}
              signedAt={tenancy.agreement.signedAt}
              signedByIp={tenancy.agreement.signedByIp}
              txHash={tenancy.agreement.txHash}
            />
          </>
        )}

        {/* ── Case 6: FINALIZED ─────────────────────────────────────────────── */}
        {tenancy.agreement?.status === 'FINALIZED' && (
          <div className="space-y-5">
            <AgreementViewer
              agreementId={tenancy.agreement.id}
              status={tenancy.agreement.status}
              rawContent={tenancy.agreement.rawContent}
              plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
              redFlags={redFlags}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
            />
            <TenantAgreementActions agreementId={tenancy.agreement.id} />
          </div>
        )}

        {/* Deposit settlement — shown when landlord has initiated the process */}
        {tenancy.depositRefund && (
          <TenantDepositReview
            refund={{
              id: tenancy.depositRefund.id,
              status: tenancy.depositRefund.status,
              originalAmount: Number(tenancy.depositRefund.originalAmount),
              refundAmount: Number(tenancy.depositRefund.refundAmount),
              paidAt: tenancy.depositRefund.paidAt?.toISOString() ?? null,
              paidProofUrl: tenancy.depositRefund.paidProofUrl,
              deductions: tenancy.depositRefund.deductions.map((d) => ({
                id: d.id,
                reason: d.reason,
                amount: Number(d.amount),
                status: d.status,
                tenantDisputeNote: d.tenantDisputeNote,
              })),
            }}
          />
        )}

        {/* End-of-tenancy status card */}
        {(tenancy.status === 'EXPIRED' || tenancy.status === 'TERMINATED') && !tenancy.depositRefund && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
            <p className="font-semibold text-gray-700 text-sm">
              {tenancy.status === 'TERMINATED' ? '🔴 Tenancy Terminated' : '⏹ Tenancy Expired'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Your landlord will initiate the deposit settlement process. You will be notified when it is ready for your review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
