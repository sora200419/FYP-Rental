// src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AgreementViewer from '@/components/ui/AgreementViewer';
import TenantAgreementActions from '@/components/ui/TenantAgreementActions';
import TenantDepositReview from '@/components/ui/TenantDepositReview';
import TenantInvitationActions from '@/components/ui/TenantInvitationActions';
import TenantWithdrawButton from '@/components/ui/TenantWithdrawButton';
import DepositProofUploader from '@/components/ui/DepositProofUploader';
import TenantAgreementSignatureProofUploader from '@/components/ui/TenantAgreementSignatureProofUploader';
import CorporateSignatoryInvitationCard from '@/components/ui/CorporateSignatoryInvitationCard';
import Link from 'next/link';
import PropertyCover from '@/components/ui/PropertyCover';
import { PageHeader } from '@/components/ui/RedesignPrimitives';
import { getPropertyCover, TENANCY_STEPS, getTenancyStep } from '@/lib/uiRedesign';


const STATUS_HEADLINE: Record<string, { headline: string; description: string }> = {
  INVITED:    { headline: 'Invitation received', description: 'Review and accept or decline your tenancy invitation.' },
  PENDING:    { headline: 'Agreement in progress', description: 'Wait for the landlord to prepare your tenancy agreement.' },
  ACTIVE:     { headline: 'Tenancy active', description: 'Your tenancy is running. Monitor payments and reports.' },
  EXPIRED:    { headline: 'Tenancy ended', description: 'This tenancy has expired.' },
  TERMINATED: { headline: 'Tenancy terminated', description: 'This tenancy was terminated early.' },
};

export default async function TenantTenancyPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      tenantId: session.user.id,
      status: { in: ['INVITED', 'PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      room: {
        include: {
          property: {
            include: {
              landlord: { select: { name: true, email: true, phone: true } },
              photos: {
                select: { imageUrl: true, caption: true, order: true, createdAt: true },
                orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
                take: 1,
              },
            },
          },
        },
      },
      agreement: {
        include: {
          events: { orderBy: { createdAt: 'desc' } },
          revisions: { orderBy: { versionNumber: 'desc' } },
          changeRequests: { orderBy: { createdAt: 'desc' } },
          signatureProofs: { orderBy: { createdAt: 'desc' } },
        },
      },
      corporateOccupants: {
        where: { status: { in: ['UNLINKED', 'LINKED'] } },
        include: {
          linkedUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      depositProofs: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, imageUrl: true },
      },
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
    try { redFlags = JSON.parse(tenancy.agreement.redFlags); } catch { redFlags = []; }
  }

  let redFlagsMs: RedFlag[] | null = null;
  if (tenancy?.agreement?.redFlagsMs) {
    try { redFlagsMs = JSON.parse(tenancy.agreement.redFlagsMs); } catch { redFlagsMs = null; }
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
          <svg className="w-12 h-12 text-gray-200 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
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
  const isCorporate = tenancy.leasePartyType === 'CORPORATE';
  const signerLabel =
    tenancy.authorizedSignatoryRole?.trim() || 'authorized signatory';
  const isCurrentUserAuthorizedSignatory =
    !isCorporate || tenancy.authorizedSignatoryUserId === session.user.id;
  const fullAddress = `${property.address}, ${property.city} — ${tenancy.room.label}`;

  const cover = getPropertyCover(property.photos ?? []);
  const activeStep = getTenancyStep(tenancy.status, tenancy.agreement?.status, tenancy.depositStatus);
  const statusInfo = STATUS_HEADLINE[tenancy.status] ?? { headline: tenancy.status, description: '' };

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="My tenancy"
        title={property.address}
        description={`${property.city} · ${tenancy.room.label}`}
      />

      {/* 5-step progress timeline */}
      <div className="mb-6 grid gap-2 sm:grid-cols-5">
        {TENANCY_STEPS.map((step, index) => (
          <div
            key={step}
            className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
              index < activeStep
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : index === activeStep
                ? 'border-blue-400 bg-blue-100 text-blue-800 ring-1 ring-blue-300 ring-inset'
                : 'border-gray-200 bg-gray-50 text-gray-400'
            }`}
          >
            {step}
          </div>
        ))}
      </div>

      {/* Two-column guided layout */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        {/* Left: property cover + status */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <PropertyCover
            address={property.address}
            imageUrl={cover?.imageUrl}
            caption={cover?.caption}
            className="rounded-none border-0"
            heightClassName="h-56"
          />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Current status</p>
            <h2 className="mt-2 text-xl font-bold text-gray-900">{statusInfo.headline}</h2>
            <p className="mt-2 text-sm text-gray-500">{statusInfo.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {tenancy.agreement?.status === 'FINALIZED' && (
                <a
                  href="#agreement-section"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  Review Agreement
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Right: next actions aside */}
        <aside className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="text-sm font-semibold text-blue-900">Next actions</h2>
          <div className="mt-4 space-y-3">
            <a
              href="#agreement-section"
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Agreement
            </a>
            <Link
              href="/dashboard/tenant/payments"
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Payments
            </Link>
            <Link
              href="/dashboard/tenant/messages"
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
            </Link>
          </div>
        </aside>
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

        {/* ── Deposit payment section — shown for PENDING and ACTIVE tenancies ── */}
        {(tenancy.status === 'PENDING' || tenancy.status === 'ACTIVE') && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Security Deposit
            </h2>
            <DepositProofUploader
              tenancyId={tenancy.id}
              depositStatus={tenancy.depositStatus}
              depositRejectionReason={tenancy.depositRejectionReason}
              existingProofs={tenancy.depositProofs}
              depositAmount={formatRM(tenancy.depositAmount)}
            />
          </div>
        )}

        {/* ── Case 2: INVITED — waiting for tenant to accept or decline ──────── */}
        {tenancy.status === 'INVITED' && (
          <div className="space-y-4">
            {isCorporate && (
              <CorporateSignatoryInvitationCard
                companyName={tenancy.companyName ?? 'Corporate lease party'}
                authorizedSignatoryName={
                  tenancy.authorizedSignatoryName ?? 'Authorized signatory'
                }
                isCurrentUserAuthorizedSignatory={
                  isCurrentUserAuthorizedSignatory
                }
              />
            )}
            <TenantInvitationActions tenancyId={tenancy.id} />
          </div>
        )}

        {/* ── Case 3: No agreement generated yet ────────────────────────────── */}
        {tenancy.status === 'PENDING' && !tenancy.agreement && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-center py-6">
              <svg className="w-10 h-10 text-gray-200 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-700 font-semibold">
                Agreement not ready yet
              </p>
              <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
                Your landlord is preparing the tenancy agreement. It will appear
                here once they have finalised it.
              </p>
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <TenantWithdrawButton tenancyId={tenancy.id} />
            </div>
          </div>
        )}

        {/* ── Case 4: DRAFT ──────────────────────────────────────────────────── */}
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
                Change request sent
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
              plainLanguageSummaryMs={tenancy.agreement.plainLanguageSummaryMs}
              redFlags={redFlags}
              redFlagsMs={redFlagsMs}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
              events={tenancy.agreement.events}
              revisions={tenancy.agreement.revisions}
              changeRequests={tenancy.agreement.changeRequests}
            />
          </>
        )}

        {/* ── Case 5: SIGNED — now with audit trail props ───────────────────── */}
        {tenancy.agreement?.status === 'PENDING_SIGNATURE_PROOF' && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
              <p className="text-blue-800 font-semibold text-sm">
                Digital signature recorded
              </p>
              <p className="text-blue-600 text-xs mt-0.5">
                Your digital signature has been stored, but the tenancy will
                only start after you upload the signed hard-copy agreement and
                the landlord approves it.
              </p>
            </div>
            <AgreementViewer
              agreementId={tenancy.agreement.id}
              status={tenancy.agreement.status}
              rawContent={tenancy.agreement.rawContent}
              plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
              plainLanguageSummaryMs={tenancy.agreement.plainLanguageSummaryMs}
              redFlags={redFlags}
              redFlagsMs={redFlagsMs}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
              events={tenancy.agreement.events}
              revisions={tenancy.agreement.revisions}
              changeRequests={tenancy.agreement.changeRequests}
            />
            <TenantAgreementSignatureProofUploader
              agreementId={tenancy.agreement.id}
              status="PENDING_SIGNATURE_PROOF"
              isCorporate={isCorporate}
              signerLabel={signerLabel}
              proofs={tenancy.agreement.signatureProofs.map((proof) => ({
                id: proof.id,
                fileUrl: proof.fileUrl,
                originalName: proof.originalName,
                mimeType: proof.mimeType,
                fileSize: proof.fileSize,
                status: proof.status,
                rejectionReason: proof.rejectionReason,
                createdAt: proof.createdAt,
                reviewedAt: proof.reviewedAt,
              }))}
            />
          </div>
        )}

        {tenancy.agreement?.status === 'SIGNED' && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <p className="text-green-800 font-semibold text-sm">
                Agreement fully approved — Tenancy is active
              </p>
              <p className="text-green-600 text-xs mt-0.5">
                Your digital signature and hard-copy proof have both been
                approved. Your tenancy is now live and your payment schedule
                has been generated.
              </p>
            </div>
            <AgreementViewer
              agreementId={tenancy.agreement.id}
              status={tenancy.agreement.status}
              rawContent={tenancy.agreement.rawContent}
              plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
              plainLanguageSummaryMs={tenancy.agreement.plainLanguageSummaryMs}
              redFlags={redFlags}
              redFlagsMs={redFlagsMs}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
              contentHash={tenancy.agreement.contentHash}
              signedAt={tenancy.agreement.signedAt}
              signedByIp={tenancy.agreement.signedByIp}
              txHash={tenancy.agreement.txHash}
              events={tenancy.agreement.events}
              revisions={tenancy.agreement.revisions}
              changeRequests={tenancy.agreement.changeRequests}
            />
          </>
        )}

        {/* ── Case 6: FINALIZED ─────────────────────────────────────────────── */}
        {tenancy.agreement?.status === 'FINALIZED' && (
          <div id="agreement-section" className="space-y-5">
            <AgreementViewer
              agreementId={tenancy.agreement.id}
              status={tenancy.agreement.status}
              rawContent={tenancy.agreement.rawContent}
              plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
              plainLanguageSummaryMs={tenancy.agreement.plainLanguageSummaryMs}
              redFlags={redFlags}
              redFlagsMs={redFlagsMs}
              tenantName={session.user.name ?? 'Tenant'}
              propertyAddress={fullAddress}
              readOnly
              events={tenancy.agreement.events}
              revisions={tenancy.agreement.revisions}
              changeRequests={tenancy.agreement.changeRequests}
            />
            <TenantAgreementActions
              agreementId={tenancy.agreement.id}
              currentVersion={tenancy.agreement.revisions[0]?.versionNumber ?? 1}
              isCorporate={isCorporate}
              signerLabel={signerLabel}
            />
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
              {tenancy.status === 'TERMINATED' ? 'Tenancy Terminated' : 'Tenancy Expired'}
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
