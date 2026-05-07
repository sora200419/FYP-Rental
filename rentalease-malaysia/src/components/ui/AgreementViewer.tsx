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
  language?: string; // 'en' | 'ms' — user's language preference
}

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  DRAFT:           `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  FINALIZED:       `${PILL_BASE} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset`,
  SIGNED:          `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  NEGOTIATING:     `${PILL_BASE} bg-purple-50 text-purple-700 ring-1 ring-purple-200 ring-inset`,
  PENDING_TENANT:  `${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
  PENDING_LANDLORD:`${PILL_BASE} bg-orange-50 text-orange-700 ring-1 ring-orange-200 ring-inset`,
};

const SEVERITY_CARD: Record<string, string> = {
  HIGH:   'bg-red-50 border border-red-200 text-red-900',
  MEDIUM: 'bg-amber-50 border border-amber-200 text-amber-900',
  LOW:    'bg-blue-50 border border-blue-200 text-blue-900',
};

const SEVERITY_PILL: Record<string, string> = {
  HIGH:   `${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
  MEDIUM: `${PILL_BASE} bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset`,
  LOW:    `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
};

type Tab = 'agreement' | 'summary' | 'redflags';

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
  language = 'en',
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('agreement');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Pick the right language for summary and red flags, with fallback to English
  const displaySummary =
    language === 'ms' && plainLanguageSummaryMs
      ? plainLanguageSummaryMs
      : plainLanguageSummary;
  const displayRedFlags =
    language === 'ms' && redFlagsMs && redFlagsMs.length > 0 ? redFlagsMs : redFlags;
  const isMalay = language === 'ms';

  const highCount = redFlags.filter((f) => f.severity === 'HIGH').length;
  const isDraft = status === 'DRAFT';
  const isSigned = status === 'SIGNED';
  const showFinalizeButton = isDraft && !readOnly;

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
  ];

  return (
    <div>
      {/* ── Header row ──────────────────────────────────────────────────── */}
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
          <span className={STATUS_PILL[status] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}>
            {status.replace(/_/g, ' ')}
          </span>

          <a
            href={`/api/agreements/${agreementId}/pdf`}
            download
            className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Download PDF
          </a>

          {showFinalizeButton && (
            <button
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              {isFinalizing ? 'Finalizing…' : 'Mark as Finalized'}
            </button>
          )}
        </div>
      </div>

      {highCount > 0 && isDraft && !readOnly && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5 text-sm text-red-800">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

      {/* ── Tab navigation ──────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 mb-0">
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

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeTab === 'agreement' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              AI-generated agreement text based on the tenancy terms. Review
              carefully before {readOnly ? 'responding.' : 'finalizing.'}
            </p>
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
                  ? 'Setiap fasal dijelaskan dalam bahasa mudah — direka untuk penyewa dan tuan tanah tanpa latihan undang-undang.'
                  : 'Each clause explained in plain language — designed for tenants and landlords without legal training.'}
              </p>
              {isMalay && !plainLanguageSummaryMs && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Not available in Malay — showing English
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
                ? 'Analisis AI tentang isu-isu, kekaburan, atau terma yang tidak adil dalam perjanjian di bawah undang-undang Malaysia.'
                : 'AI analysis of potential issues, ambiguities, or unfair terms in the agreement under Malaysian law.'}
            </p>

            {displayRedFlags.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold">
                  {isMalay ? 'Tiada bendera merah dikesan' : 'No red flags detected'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {isMalay
                    ? 'Analisis AI tidak menemui sebarang isu ketara dengan perjanjian ini.'
                    : 'The AI analysis found no significant issues with this agreement.'}
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
                      <span className="font-semibold">{isMalay ? 'Cadangan:' : 'Recommendation:'}</span>{' '}
                      {flag.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Signing Audit Record (Phase 11 + Phase 14) ──────────────────── */}
      {/*                                                                     */}
      {/* This panel combines the database-level audit trail (SHA-256 hash,   */}
      {/* timestamp, IP address) with the blockchain-level anchor (Sepolia     */}
      {/* txHash). Together these satisfy the Electronic Commerce Act 2006     */}
      {/* requirements for a reliable electronic record.                       */}
      {isSigned && contentHash && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-5 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Signing Audit Record
          </p>

          <div className="space-y-3 text-xs text-gray-500">
            {signedAt && (
              <div className="flex items-start gap-3">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <p className="font-medium text-gray-600 mb-0.5">Signed at</p>
                  <p>
                    {new Date(signedAt).toLocaleString('en-MY', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

            {signedByIp && (
              <div className="flex items-start gap-3">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
                <div>
                  <p className="font-medium text-gray-600 mb-0.5">
                    Signed from IP
                  </p>
                  <p>{signedByIp}</p>
                </div>
              </div>
            )}

            {/* SHA-256 hash — the document fingerprint */}
            <div className="flex items-start gap-3">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <div className="min-w-0">
                <p className="font-medium text-gray-600 mb-0.5">
                  Document SHA-256 fingerprint
                </p>
                <p className="font-mono break-all text-gray-500">
                  {contentHash}
                </p>
                <p className="text-gray-400 mt-1">
                  This hash uniquely identifies the agreement text at the moment
                  of signing. If the document content is ever altered, this hash
                  will no longer match.
                </p>
              </div>
            </div>

            {/* Blockchain anchor — the on-chain proof */}
            <div className="flex items-start gap-3">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <div className="min-w-0">
                <p className="font-medium text-gray-600 mb-0.5">
                  Blockchain anchor (Ethereum Sepolia testnet)
                </p>

                {txHash ? (
                  <>
                    {/* The txHash links directly to Sepolia Etherscan so either
                        party can independently verify the on-chain record */}
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono break-all text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {txHash}
                    </a>
                    <p className="text-gray-400 mt-1">
                      The document fingerprint above has been permanently
                      recorded on the Ethereum Sepolia blockchain. Click the
                      transaction hash to verify independently on Etherscan.
                    </p>
                  </>
                ) : (
                  // Shown briefly after signing while the blockchain tx is broadcast
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400">
                      Blockchain anchoring in progress — this may take a few
                      moments. Refresh the page to check.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Legal context note */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400 leading-relaxed">
              This audit record was generated under the Malaysian Electronic
              Commerce Act 2006 (ECA 2006). The SHA-256 fingerprint provides
              document integrity verification. The blockchain anchor provides an
              independent, tamper-proof timestamp on the Ethereum public ledger.
              Together, these constitute a reliable electronic record of
              agreement acceptance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
