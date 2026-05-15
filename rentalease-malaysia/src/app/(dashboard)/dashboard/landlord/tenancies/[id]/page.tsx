import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import GenerateAgreementButton from '@/components/ui/GenerateAgreementButton';
import EditTenancyTerms from './EditTenancyTerms';
import { EndOfTenancyBanner } from '@/components/ui/EndOfTenancyBanner';
import DepositVerificationCard from '@/components/ui/DepositVerificationCard';
import CoTenantManager from '@/components/ui/CoTenantManager';
import LandlordAgreementSignatureProofReview from '@/components/ui/LandlordAgreementSignatureProofReview';
import CorporateOccupantRosterManager from '@/components/ui/CorporateOccupantRosterManager';
import PropertyCover from '@/components/ui/PropertyCover';
import { PageHeader } from '@/components/ui/RedesignPrimitives';
import { getPropertyCover, TENANCY_STEPS, getTenancyStep } from '@/lib/uiRedesign';

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  INVITED:    `${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
  PENDING:    `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  ACTIVE:     `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  EXPIRED:    `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  TERMINATED: `${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
};

const AGREEMENT_PILL: Record<string, string> = {
  DRAFT:           `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  FINALIZED:       `${PILL_BASE} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset`,
  PENDING_SIGNATURE_PROOF: `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  SIGNED:          `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  NEGOTIATING:     `${PILL_BASE} bg-purple-50 text-purple-700 ring-1 ring-purple-200 ring-inset`,
};

const PAYMENT_PILL = {
  PAID:         `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  UNDER_REVIEW: `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  PENDING:      `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  OVERDUE:      `${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
};


const STATUS_HEADLINE: Record<string, { headline: string; description: string }> = {
  INVITED:    { headline: 'Invitation sent', description: 'Waiting for tenant to accept the invitation.' },
  PENDING:    { headline: 'Agreement in progress', description: 'Review and finalize the tenancy agreement.' },
  ACTIVE:     { headline: 'Tenancy active', description: 'Tenancy is running. Monitor payments and condition reports.' },
  EXPIRED:    { headline: 'Tenancy ended', description: 'This tenancy has expired.' },
  TERMINATED: { headline: 'Tenancy terminated', description: 'This tenancy was terminated early.' },
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
    where: { id, room: { property: { landlordId: session.user.id } } },
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
            },
          },
        },
      },
      tenant: { select: { name: true, email: true, phone: true } },
      authorizedSignatoryUser: {
        select: { id: true, name: true, email: true },
      },
      agreement: {
        select: {
          id: true, status: true, plainLanguageSummary: true,
          redFlags: true, negotiationNotes: true, negotiationRound: true,
          createdAt: true, updatedAt: true,
          signatureProofs: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              fileUrl: true,
              originalName: true,
              mimeType: true,
              fileSize: true,
              status: true,
              rejectionReason: true,
              createdAt: true,
              reviewedAt: true,
            },
          },
        },
      },
      rentPayments: { orderBy: { dueDate: 'asc' } },
      conditionReports: { select: { id: true, type: true, acknowledgedAt: true } },
      agreementPreferences: { select: { isComplete: true, completedSteps: true } },
      depositRefund: { select: { id: true, status: true, refundAmount: true } },
      depositProofs: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, imageUrl: true, createdAt: true },
      },
      corporateOccupants: {
        orderBy: { createdAt: 'asc' },
        include: {
          linkedUser: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      coTenants: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!tenancy) notFound();

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' });

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  let redFlagCount = 0;
  if (tenancy.agreement?.redFlags) {
    try {
      const flags = JSON.parse(tenancy.agreement.redFlags);
      redFlagCount = Array.isArray(flags) ? flags.length : 0;
    } catch { redFlagCount = 0; }
  }
  const latestSignatureProof = tenancy.agreement?.signatureProofs[0] ?? null;
  const isCorporate = tenancy.leasePartyType === 'CORPORATE';
  const canManageCorporateRoster = true;

  const totalReports = tenancy.conditionReports.length;
  const pendingAckReports = tenancy.conditionReports.filter((r) => !r.acknowledgedAt).length;
  const now = new Date();

  const daysUntilEnd = Math.ceil(
    (new Date(tenancy.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isEndingSoon = tenancy.status === 'ACTIVE' && daysUntilEnd <= 30 && daysUntilEnd > 0;

  const hasMoveOutReport = tenancy.conditionReports.some((r) => r.type === 'MOVE_OUT');
  const acknowledgedMoveOut = tenancy.conditionReports.find(
    (r) => r.type === 'MOVE_OUT' && r.acknowledgedAt,
  );

  const isOverdue = (dueDate: Date, status: string) =>
    status === 'PENDING' && new Date(dueDate) < now;

  const cover = getPropertyCover(tenancy.room.property.photos ?? []);
  const activeStep = getTenancyStep(tenancy.status, tenancy.agreement?.status, tenancy.depositStatus);
  const statusInfo = STATUS_HEADLINE[tenancy.status] ?? { headline: tenancy.status, description: '' };

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/dashboard/landlord/tenancies" className="hover:text-blue-600 transition-colors">
          Tenancies
        </Link>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium truncate">
          {tenancy.room.property.address} — {tenancy.room.label}
        </span>
      </div>

      <PageHeader
        eyebrow="Tenancy detail"
        title={tenancy.room.property.address}
        description={`Room ${tenancy.room.label} · ${tenancy.tenant.name}`}
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
            address={tenancy.room.property.address}
            imageUrl={cover?.imageUrl}
            caption={cover?.caption}
            className="rounded-none border-0"
            heightClassName="h-56"
          />
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Current status</p>
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{statusInfo.headline}</h2>
              <span className={STATUS_PILL[tenancy.status] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}>
                {tenancy.status.charAt(0) + tenancy.status.slice(1).toLowerCase()}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{statusInfo.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {tenancy.agreement && (
                <Link
                  href={`/dashboard/landlord/tenancies/${tenancy.id}/agreement`}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                >
                  View Agreement
                </Link>
              )}
              {!tenancy.agreement && tenancy.status !== 'INVITED' && (
                !tenancy.agreementPreferences?.isComplete ? (
                  <Link
                    href={`/dashboard/landlord/tenancies/${tenancy.id}/wizard`}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Start Agreement Wizard
                  </Link>
                ) : (
                  <GenerateAgreementButton tenancyId={tenancy.id} label="Generate Agreement" variant="primary" />
                )
              )}
              {tenancy.status === 'ACTIVE' && !isEndingSoon && (
                <Link
                  href={`/dashboard/landlord/tenancies/${id}/terminate`}
                  className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  Serve Notice to Quit
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Right: next actions aside */}
        <aside className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="text-sm font-semibold text-blue-900">Next actions</h2>
          <div className="mt-4 space-y-3">
            {tenancy.agreement && (
              <Link
                href={`/dashboard/landlord/tenancies/${tenancy.id}/agreement`}
                className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Agreement
              </Link>
            )}
            <Link
              href="/dashboard/landlord/payments"
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Payments
            </Link>
            <Link
              href="/dashboard/landlord/messages"
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Messages
            </Link>
            <Link
              href={`/dashboard/landlord/tenancies/${tenancy.id}/conditions`}
              className="flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Condition Reports
            </Link>
          </div>
        </aside>
      </div>

      <div className="space-y-5">
        {/* End-of-tenancy banner */}
        {isEndingSoon && (
          <EndOfTenancyBanner
            tenancyId={id}
            daysLeft={daysUntilEnd}
            role="LANDLORD"
            hasMoveOutReport={hasMoveOutReport}
            acknowledgedMoveOut={!!acknowledgedMoveOut}
            depositRefundStatus={tenancy.depositRefund?.status ?? null}
          />
        )}

        {/* EXPIRED/TERMINATED — next steps */}
        {(tenancy.status === 'EXPIRED' || tenancy.status === 'TERMINATED') && (
          <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold mb-1">
                {tenancy.status === 'TERMINATED' ? 'Tenancy Terminated' : 'Tenancy Expired'}
              </p>
              {!hasMoveOutReport && (
                <p className="text-gray-500 text-xs">
                  Create a Move-Out Condition Report to document the property state, then proceed to Deposit Settlement.
                </p>
              )}
              {hasMoveOutReport && !acknowledgedMoveOut && (
                <p className="text-amber-600 text-xs">Move-out report awaiting acknowledgement before deposit settlement can begin.</p>
              )}
              {acknowledgedMoveOut && !tenancy.depositRefund && (
                <Link
                  href={`/dashboard/landlord/tenancies/${id}/deposit-settlement`}
                  className="text-sm font-medium text-blue-600 hover:underline mt-1 block"
                >
                  Start Deposit Settlement
                </Link>
              )}
            </div>
          </div>
        )}

        {/* INVITED — waiting for tenant */}
        {tenancy.status === 'INVITED' && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Waiting for tenant to accept</p>
              <p className="text-blue-600 text-xs mt-0.5">
                An invitation has been sent to {tenancy.tenant.name}. You can generate an agreement once they accept.
              </p>
            </div>
          </div>
        )}

        {/* Tenant info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tenant</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
              {tenancy.tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{tenancy.tenant.name}</p>
              <p className="text-sm text-gray-400">{tenancy.tenant.email}</p>
              {tenancy.tenant.phone && (
                <p className="text-sm text-gray-400">{tenancy.tenant.phone}</p>
              )}
            </div>
          </div>
        </div>

        {isCorporate ? (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Corporate Lease Party
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Company</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {tenancy.companyName ?? 'Corporate tenant'}
                  </p>
                  {tenancy.companyRegistrationNo && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Registration No. {tenancy.companyRegistrationNo}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Authorized Signatory</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {tenancy.authorizedSignatoryName ?? tenancy.tenant.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tenancy.authorizedSignatoryRole ??
                      'Role not specified'}
                    {tenancy.authorizedSignatoryIC
                      ? ` · ${tenancy.authorizedSignatoryIC}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
            <CorporateOccupantRosterManager
              tenancyId={id}
              initialOccupants={tenancy.corporateOccupants}
              canManage={canManageCorporateRoster}
            />
          </>
        ) : (
          <CoTenantManager
            tenancyId={id}
            initialCoTenants={tenancy.coTenants}
            readonly={
              tenancy.status === 'EXPIRED' || tenancy.status === 'TERMINATED'
            }
          />
        )}

        {/* Tenancy terms card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tenancy Terms</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Room</p>
              <p className="font-medium text-gray-900 mt-0.5">{tenancy.room.label}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Property Type</p>
              <p className="font-medium text-gray-900 mt-0.5">{tenancy.room.property.type}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Start Date</p>
              <p className="font-medium text-gray-900 mt-0.5">{formatDate(tenancy.startDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">End Date</p>
              <p className="font-medium text-gray-900 mt-0.5">{formatDate(tenancy.endDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Monthly Rent</p>
              <p className="font-medium text-gray-900 mt-0.5">{formatRM(tenancy.monthlyRent)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Security Deposit</p>
              <p className="font-medium text-gray-900 mt-0.5">{formatRM(tenancy.depositAmount)}</p>
            </div>
          </div>
          {(tenancy.status === 'INVITED' || tenancy.status === 'PENDING') && !tenancy.agreement && (
            <EditTenancyTerms
              tenancyId={tenancy.id}
              currentStartDate={tenancy.startDate.toISOString()}
              currentEndDate={tenancy.endDate.toISOString()}
              currentMonthlyRent={Number(tenancy.monthlyRent)}
              currentDepositAmount={Number(tenancy.depositAmount)}
              tenancyStatus={tenancy.status}
              leasePartyType={tenancy.leasePartyType}
              currentInvitationEmail={
                tenancy.leasePartyType === 'CORPORATE'
                  ? tenancy.authorizedSignatoryUser?.email ?? tenancy.tenant.email
                  : tenancy.tenant.email
              }
            />
          )}
        </div>

        {/* Deposit verification */}
        {(tenancy.status === 'PENDING' || tenancy.status === 'ACTIVE') && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Security Deposit</h2>
            <DepositVerificationCard
              tenancyId={tenancy.id}
              depositAmount={formatRM(tenancy.depositAmount)}
              depositStatus={tenancy.depositStatus}
              proofs={tenancy.depositProofs}
              rejectionReason={tenancy.depositRejectionReason}
            />
          </div>
        )}

        {/* Property condition */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Property Condition</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {totalReports} {totalReports === 1 ? 'report' : 'reports'} created
              </p>
              {pendingAckReports > 0 && (
                <p className="text-amber-600 text-xs mt-0.5">{pendingAckReports} pending acknowledgement</p>
              )}
              {totalReports === 0 && (
                <p className="text-gray-400 text-xs mt-0.5">Document property condition with photos grouped by room</p>
              )}
            </div>
            <Link
              href={`/dashboard/landlord/tenancies/${tenancy.id}/conditions`}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {totalReports === 0 ? 'Start Report' : 'View Reports'}
            </Link>
          </div>
        </div>

        {tenancy.agreement?.status === 'PENDING_SIGNATURE_PROOF' && (
          <LandlordAgreementSignatureProofReview
            agreementId={tenancy.agreement.id}
            proof={latestSignatureProof}
            tenantName={tenancy.tenant.name}
          />
        )}

        {/* Agreement card */}
        {tenancy.status !== 'INVITED' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Tenancy Agreement</h2>

            {tenancy.agreement ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={AGREEMENT_PILL[tenancy.agreement.status] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}>
                      {tenancy.agreement.status.replace(/_/g, ' ')}
                    </span>
                    {redFlagCount > 0 && (
                      <span className={`${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`}>
                        {redFlagCount} red {redFlagCount === 1 ? 'flag' : 'flags'}
                      </span>
                    )}
                    {(tenancy.agreement.negotiationRound ?? 0) > 0 && (
                      <span className="text-xs text-gray-400">
                        Round {tenancy.agreement.negotiationRound}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Updated {formatDate(tenancy.agreement.updatedAt)}</p>
                </div>

                {tenancy.agreement.status === 'NEGOTIATING' && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-800">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <div>
                      <p className="font-semibold mb-1">Tenant has requested changes</p>
                      {tenancy.agreement.negotiationNotes && (
                        <div className="bg-white rounded-lg border border-blue-200 px-3 py-2 mb-2">
                          <p className="text-xs text-gray-400 mb-1">Tenant&apos;s feedback:</p>
                          <p className="text-sm text-gray-700">{tenancy.agreement.negotiationNotes}</p>
                        </div>
                      )}
                      <p className="text-blue-600 text-xs">
                        Use Regenerate to produce a revised agreement, or view the agreement to edit specific clauses manually.
                      </p>
                    </div>
                  </div>
                )}

                {tenancy.agreement.status === 'SIGNED' && (
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm text-green-800">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="font-semibold">Agreement fully approved — Tenancy is active</p>
                      <p className="text-green-600 text-xs mt-0.5">The digital signature and signed hard-copy proof are both complete. The rent payment schedule has been generated.</p>
                    </div>
                  </div>
                )}

                {tenancy.agreement.status === 'PENDING_SIGNATURE_PROOF' && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-sm text-blue-800">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold">Waiting for signed hard-copy approval</p>
                      <p className="text-blue-600 text-xs mt-0.5">
                        The tenant has completed digital signing. Review the uploaded signed copy below before the tenancy can become active.
                      </p>
                    </div>
                  </div>
                )}

                {tenancy.agreement.status === 'FINALIZED' && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 text-sm text-amber-800">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold">Awaiting tenant review</p>
                      <p className="text-amber-600 text-xs mt-0.5">The agreement has been sent to the tenant for review.</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/landlord/tenancies/${tenancy.id}/agreement`}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    View Agreement
                  </Link>
                  {!['SIGNED', 'PENDING_SIGNATURE_PROOF'].includes(tenancy.agreement.status) && (
                    <>
                      <GenerateAgreementButton tenancyId={tenancy.id} label="Regenerate" variant="secondary" />
                      <Link
                        href={`/dashboard/landlord/tenancies/${tenancy.id}/wizard`}
                        className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                      >
                        Edit Wizard Answers
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold">No agreement generated yet</p>
                <p className="text-sm text-gray-400 mt-1 mb-5 max-w-sm mx-auto">
                  Use the guided wizard to capture your policy decisions, then let the AI generate a tailored agreement.
                </p>
                {!tenancy.agreementPreferences?.isComplete ? (
                  <Link
                    href={`/dashboard/landlord/tenancies/${tenancy.id}/wizard`}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                  >
                    Start Agreement Wizard
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-3 text-sm text-green-800 text-left">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Wizard complete — ready to generate
                    </div>
                    <div className="flex gap-3 justify-center">
                      <GenerateAgreementButton tenancyId={tenancy.id} label="Generate Agreement" variant="primary" />
                      <Link
                        href={`/dashboard/landlord/tenancies/${tenancy.id}/wizard`}
                        className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
                      >
                        Edit Wizard Answers
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rent payment schedule */}
        {tenancy.rentPayments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Rent Payment Schedule</h2>
            <div className="divide-y divide-gray-100">
              {tenancy.rentPayments.map((payment) => {
                const overdue = isOverdue(payment.dueDate, payment.status);
                const pillClass = payment.status === 'PAID'
                  ? PAYMENT_PILL.PAID
                  : overdue
                  ? PAYMENT_PILL.OVERDUE
                  : payment.status === 'UNDER_REVIEW'
                  ? PAYMENT_PILL.UNDER_REVIEW
                  : PAYMENT_PILL.PENDING;

                return (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <p className="text-sm text-gray-700">{formatDate(payment.dueDate)}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-900">{formatRM(payment.amount)}</p>
                      <span className={pillClass}>
                        {overdue ? 'Overdue' : payment.status.charAt(0) + payment.status.slice(1).toLowerCase().replace('_', ' ')}
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
