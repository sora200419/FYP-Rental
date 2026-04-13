'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RedFlag {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  clause: string;
  issue: string;
  recommendation: string;
}

interface Props {
  agreementId: string;

  // tenancyId has been intentionally removed in the AgreementViewer cleanup.
  // The component only needs agreementId — for the finalize PATCH call and
  // the download link. Parent pages no longer need to pass tenancyId here.

  status: string;
  rawContent: string;
  plainLanguageSummary: string;
  redFlags: RedFlag[];
  tenantName: string;
  propertyAddress: string;

  // readOnly = true hides the "Mark as Finalized" button.
  // Used on the tenant-side viewer so tenants can't accidentally finalize.
  readOnly?: boolean;

  // Phase 11: signing audit trail fields — passed from the parent page
  // only when the agreement has already been SIGNED.
  // All three are optional because they are null/undefined until signing occurs.
  contentHash?: string | null;
  signedAt?: Date | string | null;
  signedByIp?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100   text-red-700   border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-blue-100  text-blue-700  border-blue-200',
};

type Tab = 'agreement' | 'summary' | 'redflags';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgreementViewer({
  agreementId,
  status,
  rawContent,
  plainLanguageSummary,
  redFlags,
  tenantName,
  propertyAddress,
  readOnly = false,
  contentHash,
  signedAt,
  signedByIp,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('agreement');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Derived booleans that drive what UI is shown
  const highCount = redFlags.filter((f) => f.severity === 'HIGH').length;
  const isDraft = status === 'DRAFT';
  const isSigned = status === 'SIGNED';

  // The finalize button only appears for the landlord (readOnly=false)
  // and only when the agreement is still a draft awaiting confirmation.
  const showFinalizeButton = isDraft && !readOnly;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFinalize = async () => {
    setIsFinalizing(true);
    setFinalizeError(null);
    try {
      const response = await fetch(`/api/agreements/${agreementId}/finalize`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        const result = await response.json();
        setFinalizeError(result.error || 'Failed to finalize');
        return;
      }
      // Trigger a server-side re-render so the status badge updates immediately
      router.refresh();
    } catch {
      setFinalizeError('Network error. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  };

  // ── Tab configuration ────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'agreement', label: '📄 Full Agreement' },
    { key: 'summary', label: '💬 Plain Language' },
    { key: 'redflags', label: '⚠️ Red Flags', badge: redFlags.length },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Header row: title, status badge, download, finalize ─────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tenancy Agreement
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {propertyAddress} · Tenant: {tenantName}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Status badge changes colour based on current agreement state */}
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              status === 'FINALIZED'
                ? 'bg-green-100 text-green-700'
                : status === 'SIGNED'
                  ? 'bg-blue-100 text-blue-700'
                  : status === 'NEGOTIATING'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-700' // DRAFT
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>

          {/* Download link — available to both landlord and tenant at all stages */}
          <a
            href={`/api/agreements/${agreementId}/pdf`}
            download
            className="text-sm font-semibold px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            ⬇ Download
          </a>

          {/* Finalize button is landlord-only and only when status is DRAFT */}
          {showFinalizeButton && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="text-sm font-semibold px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isFinalizing ? 'Finalizing…' : '✓ Mark as Finalized'}
            </button>
          )}
        </div>
      </div>

      {/* ── High-severity warning (shown to landlord before finalizing) ─────── */}
      {highCount > 0 && isDraft && !readOnly && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-5 flex items-start gap-3">
          <span className="text-red-500 text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-red-800 font-semibold text-sm">
              {highCount} high-severity {highCount === 1 ? 'issue' : 'issues'}{' '}
              detected
            </p>
            <p className="text-red-600 text-xs mt-0.5">
              Review the Red Flags tab before finalizing this agreement.
            </p>
          </div>
        </div>
      )}

      {/* Inline error for the finalize action */}
      {finalizeError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {finalizeError}
        </div>
      )}

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {/* Badge on the Red Flags tab shows how many flags were found */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content panel ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Full agreement text tab */}
        {activeTab === 'agreement' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              AI-generated agreement text based on the tenancy terms. Review
              carefully before {readOnly ? 'responding.' : 'finalizing.'}
            </p>
            {/* pre-wrap preserves the paragraph structure Gemini generates */}
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
              {rawContent}
            </pre>
          </div>
        )}

        {/* Plain-language summary tab */}
        {activeTab === 'summary' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              Each clause explained in plain language — designed for tenants and
              landlords without legal training.
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
              {plainLanguageSummary}
            </pre>
          </div>
        )}

        {/* Red flags tab */}
        {activeTab === 'redflags' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              AI analysis of potential issues, ambiguities, or unfair terms in
              the agreement under Malaysian law.
            </p>

            {redFlags.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-gray-700 font-semibold">
                  No red flags detected
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  The AI analysis found no significant issues with this
                  agreement.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {redFlags.map((flag, index) => (
                  <div
                    key={index}
                    className={`border rounded-xl p-5 ${SEVERITY_STYLES[flag.severity]}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{flag.clause}</p>
                      <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                        {flag.severity}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{flag.issue}</p>
                    <p className="text-xs opacity-80">
                      <span className="font-semibold">Recommendation:</span>{' '}
                      {flag.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Phase 11: Signing audit trail panel ─────────────────────────────── */}
      {/*                                                                        */}
      {/* This section appears only when:                                        */}
      {/*   (a) the agreement status is SIGNED, AND                              */}
      {/*   (b) the contentHash was actually recorded (non-null).                */}
      {/*                                                                        */}
      {/* The panel surfaces the cryptographic fingerprint of the document,      */}
      {/* the server-side timestamp, and the client IP to both parties — giving  */}
      {/* them a verifiable record that stands up under ECA 2006.                */}
      {isSigned && contentHash && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Signing Audit Record
          </p>

          <div className="space-y-2 text-xs text-gray-500">
            {/* Signed timestamp — formatted in Malaysian locale for clarity */}
            {signedAt && (
              <p>
                <span className="font-medium text-gray-600">Signed at: </span>
                {new Date(signedAt).toLocaleString('en-MY', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}

            {/* Client IP at time of signing */}
            {signedByIp && (
              <p>
                <span className="font-medium text-gray-600">
                  Signed from IP:{' '}
                </span>
                {signedByIp}
              </p>
            )}

            {/* SHA-256 hash of rawContent at the moment of signing.           */}
            {/* font-mono makes the hex string legible and copy-pasteable.     */}
            {/* break-all prevents the long hex from overflowing its container.*/}
            <p className="font-mono break-all">
              <span className="font-medium text-gray-600 font-sans">
                Document SHA-256:{' '}
              </span>
              {contentHash}
            </p>
          </div>

          {/* Legal context note explaining what this record means */}
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            This record was generated under the Malaysian Electronic Commerce
            Act 2006. The SHA-256 hash above is a cryptographic fingerprint of
            the agreement content at the time of signing — if the document is
            ever altered, the hash will no longer match.
          </p>
        </div>
      )}
    </div>
  );
}
