'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgreementEditor from './AgreementEditor';

interface RedFlag {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  clause: string;
  issue: string;
  recommendation: string;
}

interface AgreementTimelineEvent {
  id: string;
  type: string;
  actorRole: string;
  summary: string;
  createdAt: Date | string;
}

interface AgreementRevisionSummary {
  id: string;
  versionNumber: number;
  createdAt: Date | string;
  rawContent: string;
  plainLanguageSummary: string;
  plainLanguageSummaryMs?: string | null;
}

interface AgreementChangeRequestSummary {
  id: string;
  category: string;
  requestedChange: string;
  reason: string;
  note?: string | null;
  status: string;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
}

interface FinalizeChecklistBase {
  hasRawContent: boolean;
  isWizardComplete: boolean;
  unresolvedStructuredRequests: number;
  hasRequiredIdentityData: boolean;
  isFinalizableStatus: boolean;
}

interface Props {
  agreementId: string;
  status: string;
  rawContent: string;
  plainLanguageSummary: string;
  plainLanguageSummaryMs?: string | null;
  redFlags: RedFlag[];
  redFlagsMs?: RedFlag[] | null;
  tenantName: string;
  propertyAddress: string;
  readOnly?: boolean;
  contentHash?: string | null;
  signedAt?: Date | string | null;
  signedByIp?: string | null;
  txHash?: string | null;
  events?: AgreementTimelineEvent[];
  revisions?: AgreementRevisionSummary[];
  changeRequests?: AgreementChangeRequestSummary[];
  finalizeChecklistBase?: FinalizeChecklistBase | null;
  editable?: boolean;
  editableInitialContent?: string;
  negotiationNotes?: string | null;
}

const PILL_BASE =
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  DRAFT: `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  FINALIZED: `${PILL_BASE} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset`,
  PENDING_SIGNATURE_PROOF: `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  SIGNED: `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  NEGOTIATING: `${PILL_BASE} bg-purple-50 text-purple-700 ring-1 ring-purple-200 ring-inset`,
};

const SEVERITY_CARD: Record<string, string> = {
  HIGH: 'bg-red-50 border border-red-200 text-red-900',
  MEDIUM: 'bg-amber-50 border border-amber-200 text-amber-900',
  LOW: 'bg-blue-50 border border-blue-200 text-blue-900',
};

const SEVERITY_PILL: Record<string, string> = {
  HIGH: `${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
  MEDIUM: `${PILL_BASE} bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset`,
  LOW: `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
};

const CHANGE_REQUEST_STATUS: Record<string, string> = {
  PENDING: `${PILL_BASE} bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset`,
  RESOLVED: `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
};

type Tab = 'agreement' | 'summary' | 'redflags' | 'edit' | 'history';
type DisplayLanguage = 'en' | 'ms';

export default function AgreementViewer({
  agreementId,
  status,
  rawContent,
  plainLanguageSummary,
  plainLanguageSummaryMs,
  redFlags,
  redFlagsMs,
  tenantName,
  propertyAddress,
  readOnly = false,
  contentHash,
  signedAt,
  signedByIp,
  txHash,
  events = [],
  revisions = [],
  changeRequests = [],
  finalizeChecklistBase = null,
  editable = false,
  editableInitialContent,
  negotiationNotes,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('agreement');
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage>('en');
  const [reviewedRedFlags, setReviewedRedFlags] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(
    revisions[0]?.id ?? null,
  );

  const displaySummary =
    displayLanguage === 'ms' && plainLanguageSummaryMs
      ? plainLanguageSummaryMs
      : plainLanguageSummary;
  const displayRedFlags =
    displayLanguage === 'ms' && redFlagsMs && redFlagsMs.length > 0
      ? redFlagsMs
      : redFlags;
  const isMalay = displayLanguage === 'ms';

  const highCount = redFlags.filter((flag) => flag.severity === 'HIGH').length;
  const isDraftLike = status === 'DRAFT' || status === 'NEGOTIATING';
  const isSigned = status === 'SIGNED';
  const showFinalizeButton = isDraftLike && !readOnly && finalizeChecklistBase;
  const showEditTab =
    editable &&
    !readOnly &&
    !isSigned &&
    status !== 'PENDING_SIGNATURE_PROOF';
  const currentVersion = revisions[0]?.versionNumber ?? 1;
  const latestEvents = [...events].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const selectedRevision =
    revisions.find((revision) => revision.id === selectedRevisionId) ??
    revisions[0] ??
    null;

  const checklistItems = useMemo(() => {
    if (!finalizeChecklistBase) return [];

    return [
      {
        key: 'content',
        label: 'Agreement content is present',
        passed: finalizeChecklistBase.hasRawContent,
      },
      {
        key: 'wizard',
        label: 'Agreement wizard has been completed',
        passed: finalizeChecklistBase.isWizardComplete,
      },
      {
        key: 'identity',
        label: 'Tenant identity details are available',
        passed: finalizeChecklistBase.hasRequiredIdentityData,
      },
      {
        key: 'status',
        label: 'Agreement is in a finalizable status',
        passed: finalizeChecklistBase.isFinalizableStatus,
      },
      {
        key: 'requests',
        label:
          finalizeChecklistBase.unresolvedStructuredRequests === 0
            ? 'No unresolved structured change requests remain'
            : `${finalizeChecklistBase.unresolvedStructuredRequests} structured change request(s) still need attention`,
        passed: finalizeChecklistBase.unresolvedStructuredRequests === 0,
      },
      {
        key: 'review',
        label: 'Red flags have been reviewed before sending to the tenant',
        passed: reviewedRedFlags,
      },
    ];
  }, [finalizeChecklistBase, reviewedRedFlags]);

  const finalizeBlocked = checklistItems.some((item) => !item.passed);

  const handleFinalize = async () => {
    setIsFinalizing(true);
    setFinalizeError(null);

    try {
      const response = await fetch(`/api/agreements/${agreementId}/finalize`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewedRedFlags }),
      });

      const result = await response.json();
      if (!response.ok) {
        setFinalizeError(result.error || 'Failed to finalize');
        return;
      }

      router.refresh();
    } catch {
      setFinalizeError('Network error. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  };

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'agreement', label: 'Full Agreement' },
    { key: 'summary', label: 'Plain Language' },
    { key: 'redflags', label: 'Red Flags', badge: redFlags.length },
    ...(showEditTab ? [{ key: 'edit' as const, label: 'Edit Agreement' }] : []),
    { key: 'history', label: 'History', badge: latestEvents.length },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenancy Agreement</h1>
          <p className="text-gray-500 text-sm mt-1">
            {propertyAddress} · Tenant: {tenantName}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
          <span
            className={STATUS_PILL[status] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}
          >
            {status.replace(/_/g, ' ')}
          </span>

          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
            Version {currentVersion}
          </span>

          <div className="xl:hidden flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDisplayLanguage('en')}
              className={`px-2.5 py-2 transition-colors ${
                displayLanguage === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setDisplayLanguage('ms')}
              className={`px-2.5 py-2 transition-colors ${
                displayLanguage === 'ms'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              BM
            </button>
          </div>

          <a
            href={`/api/agreements/${agreementId}/pdf`}
            download
            className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Download PDF
          </a>

        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-sm text-blue-800">
        <p className="font-semibold">Agreement-side bilingual support</p>
        <p className="text-xs text-blue-700 mt-1">
          The EN / BM switch only changes the plain-language summary and red
          flag analysis on this agreement page. The legal agreement text remains
          in English.
        </p>
      </div>

      {highCount > 0 && isDraftLike && !readOnly && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-800">
          <svg
            className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="font-semibold">
              {highCount} high-severity {highCount === 1 ? 'issue' : 'issues'} detected
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              Review the Red Flags tab before finalizing this agreement.
            </p>
          </div>
        </div>
      )}

      {finalizeError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {finalizeError}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* Left: section navigation */}
        <aside className="hidden xl:block rounded-xl border border-gray-200 bg-white p-4 self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sections</p>
          <div className="mt-3 flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Center: document content */}
        <main className="min-w-0">
          {/* Mobile tab bar */}
          <div className="flex border-b border-gray-200 mb-0 xl:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {activeTab === 'agreement' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              AI-generated agreement text based on the tenancy terms. Review
              carefully before {readOnly ? 'responding.' : 'finalizing.'}
            </p>
            {isMalay && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 mb-5">
                Full agreement text remains in English. Use the Plain Language
                and Red Flags tabs for Bahasa Malaysia support.
              </div>
            )}
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
              {rawContent}
            </pre>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <p className="text-xs text-gray-400">
                {isMalay
                  ? 'Setiap fasal dijelaskan dalam bahasa mudah untuk membantu kedua-dua pihak menyemak terma utama.'
                  : 'Each clause is explained in plain language so both parties can review the key terms more easily.'}
              </p>
              {isMalay && !plainLanguageSummaryMs && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Malay summary unavailable, showing English
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
              {displaySummary}
            </pre>
          </div>
        )}

        {activeTab === 'redflags' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              {isMalay
                ? 'Analisis AI tentang isu, kekaburan, atau terma yang mungkin perlu disemak sebelum persetujuan akhir.'
                : 'AI analysis of issues, ambiguities, or terms that may need review before final agreement.'}
            </p>

            {showEditTab && (
              <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Need to fix this?
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Go to Edit Agreement, save your revised text, then refresh AI
                    analysis to update the red flags for this version.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className="shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Go to Edit Agreement
                </button>
              </div>
            )}

            {displayRedFlags.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold">
                  {isMalay ? 'Tiada bendera merah dikesan' : 'No red flags detected'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {isMalay
                    ? 'Analisis AI tidak menemui isu ketara untuk versi ini.'
                    : 'The AI analysis found no significant issues for this version.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayRedFlags.map((flag, index) => (
                  <div key={index} className={`rounded-xl p-5 ${SEVERITY_CARD[flag.severity]}`}>
                    <div className="flex items-center justify-between mb-2 gap-3">
                      <p className="font-semibold text-sm">{flag.clause}</p>
                      <span className={SEVERITY_PILL[flag.severity]}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{flag.issue}</p>
                    <p className="text-xs opacity-80">
                      <span className="font-semibold">
                        {isMalay ? 'Cadangan:' : 'Recommendation:'}
                      </span>{' '}
                      {flag.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'edit' && showEditTab && (
          <div className="p-6 md:p-8">
            <div className="mb-5 pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Agreement</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update the agreement text directly or use AI Assist to apply one
                specific change. After saving, refresh AI analysis before
                re-finalizing this version for the tenant.
              </p>
            </div>

            <AgreementEditor
              agreementId={agreementId}
              initialContent={editableInitialContent ?? rawContent}
              negotiationNotes={negotiationNotes}
              changeRequests={changeRequests}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Current Version
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  Version {currentVersion}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {revisions.length} recorded revision(s)
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Timeline Events
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {latestEvents.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Agreement activity since tracking was enabled
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Change Requests
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-2">
                  {changeRequests.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Structured tenant requests recorded on this agreement
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Agreement Timeline
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Start here to understand what happened on this agreement. Open
                recorded versions only when you need to inspect revision
                metadata.
              </p>
              {latestEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No agreement history has been recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {latestEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-gray-200 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {event.summary}
                        </p>
                        <span className="text-xs text-gray-400 uppercase tracking-wide">
                          {event.actorRole}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.createdAt).toLocaleString('en-MY')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Recorded Versions
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Version records are available for audit reference, but
                      hidden by default to keep this view focused on history.
                    </p>
                  </div>
                  {revisions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowVersionHistory((current) => !current)}
                      className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {showVersionHistory ? 'Hide versions' : 'View versions'}
                    </button>
                  )}
                </div>

                {revisions.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                    No agreement versions have been recorded yet.
                  </div>
                ) : showVersionHistory ? (
                  <div className="space-y-3 mt-4">
                    {revisions.map((revision) => (
                      <button
                        type="button"
                        key={revision.id}
                        onClick={() => setSelectedRevisionId(revision.id)}
                        className={`w-full rounded-xl border px-4 py-4 flex items-center justify-between gap-3 text-left transition-colors ${
                          selectedRevision?.id === revision.id
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Version {revision.versionNumber}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Saved on {new Date(revision.createdAt).toLocaleString('en-MY')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentVersion === revision.versionNumber && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200">
                              Current
                            </span>
                          )}
                          <span className="text-xs font-semibold text-gray-500">
                            {selectedRevision?.id === revision.id ? 'Viewing' : 'View'}
                          </span>
                        </div>
                      </button>
                    ))}

                    {selectedRevision && (
                      <div className="rounded-xl border border-gray-200 bg-white mt-4 overflow-hidden">
                        <div className="border-b border-gray-200 px-4 py-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Version {selectedRevision.versionNumber} Preview
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Read-only snapshot saved on{' '}
                              {new Date(selectedRevision.createdAt).toLocaleString('en-MY')}
                            </p>
                          </div>
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                            History snapshot
                          </span>
                        </div>

                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
                              Agreement Text
                            </p>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 max-h-80 overflow-y-auto">
                              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-700">
                                {selectedRevision.rawContent}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 mb-2">
                              Plain Language Summary
                            </p>
                            <div className="rounded-lg border border-gray-200 bg-white px-4 py-4 max-h-48 overflow-y-auto">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                                {displayLanguage === 'ms' &&
                                selectedRevision.plainLanguageSummaryMs
                                  ? selectedRevision.plainLanguageSummaryMs
                                  : selectedRevision.plainLanguageSummary}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
                    {revisions.length} recorded version(s). Expand this section
                    only when you need revision metadata.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Structured Change Requests
              </h3>
              {changeRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                  No structured change requests have been recorded for this
                  agreement.
                </div>
              ) : (
                <div className="space-y-3">
                  {changeRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-xl border border-gray-200 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {request.category}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted on {new Date(request.createdAt).toLocaleString('en-MY')}
                          </p>
                        </div>
                        <span
                          className={
                            CHANGE_REQUEST_STATUS[request.status] ??
                            `${PILL_BASE} bg-gray-100 text-gray-500`
                          }
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 mt-3">
                        {request.requestedChange}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        <span className="font-medium text-gray-700">Reason:</span>{' '}
                        {request.reason}
                      </p>
                      {request.note && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium text-gray-700">
                            Additional note:
                          </span>{' '}
                          {request.note}
                        </p>
                      )}
                      {request.resolvedAt && (
                        <p className="text-xs text-green-700 mt-3">
                          Resolved on {new Date(request.resolvedAt).toLocaleString('en-MY')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        </main>

        {/* Right: review/action panel */}
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Review checklist</p>

          {showFinalizeButton && (
            <div className="mt-3 space-y-2">
              {checklistItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    item.passed
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-amber-200 bg-white text-amber-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                      item.passed ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {item.passed ? '✓' : '!'}
                  </div>
                  <p className="font-medium leading-tight">{item.label}</p>
                </div>
              ))}

              <label className="flex items-start gap-2 p-3 bg-white rounded-lg border border-amber-200 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reviewedRedFlags}
                  onChange={(event) => setReviewedRedFlags(event.target.checked)}
                  className="mt-0.5 accent-blue-600 w-3.5 h-3.5 shrink-0"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  I have reviewed the red-flag analysis and am ready to send to the tenant.
                </span>
              </label>

              <button
                onClick={handleFinalize}
                disabled={isFinalizing || finalizeBlocked}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                {isFinalizing ? 'Finalizing…' : 'Send Finalized Agreement'}
              </button>

              {finalizeError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mt-2">
                  {finalizeError}
                </div>
              )}
            </div>
          )}

          {!showFinalizeButton && (
            <div className="mt-3 space-y-2">
              {redFlags.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-800">
                  <p className="font-semibold">{redFlags.length} red {redFlags.length === 1 ? 'flag' : 'flags'} detected</p>
                  <p className="mt-0.5 text-amber-700">Review the Red Flags tab for details.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-green-200 bg-white px-3 py-2 text-xs text-green-800">
                  <p className="font-semibold">No red flags detected</p>
                  <p className="mt-0.5 text-green-700">AI analysis found no significant issues.</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-amber-200 space-y-2">
            <p className="text-xs font-semibold text-amber-700">Actions</p>

            <div className="flex items-center gap-1 border border-amber-200 rounded-lg overflow-hidden text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDisplayLanguage('en')}
                className={`flex-1 py-2 transition-colors ${
                  displayLanguage === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setDisplayLanguage('ms')}
                className={`flex-1 py-2 transition-colors ${
                  displayLanguage === 'ms' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                BM
              </button>
            </div>

            <a
              href={`/api/agreements/${agreementId}/pdf`}
              download
              className="block w-full text-center border border-amber-300 bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              Download PDF
            </a>
          </div>
        </aside>
      </div>

      {isSigned && contentHash && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-5 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Signing Audit Record
          </p>

          <div className="space-y-3 text-xs text-gray-500">
            {signedAt && (
              <div className="flex items-start gap-3">
                <svg
                  className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-600 mb-0.5">Signed at</p>
                  <p>{new Date(signedAt).toLocaleString('en-MY')}</p>
                </div>
              </div>
            )}

            {signedByIp && (
              <div className="flex items-start gap-3">
                <svg
                  className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
                  />
                </svg>
                <div>
                  <p className="font-medium text-gray-600 mb-0.5">
                    Signed from IP
                  </p>
                  <p>{signedByIp}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <svg
                className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div className="min-w-0">
                <p className="font-medium text-gray-600 mb-0.5">
                  Document SHA-256 fingerprint
                </p>
                <p className="font-mono break-all text-gray-500">{contentHash}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg
                className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <div className="min-w-0">
                <p className="font-medium text-gray-600 mb-0.5">
                  Blockchain anchor (Ethereum Sepolia testnet)
                </p>
                {txHash ? (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono break-all text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {txHash}
                  </a>
                ) : (
                  <p className="text-gray-400">
                    Blockchain anchoring is still in progress.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
