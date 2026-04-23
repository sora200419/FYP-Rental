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

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100   text-red-700   border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-blue-100  text-blue-700  border-blue-200',
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
    { key: 'agreement', label: '📄 Full Agreement' },
    { key: 'summary', label: '💬 Plain Language' },
    { key: 'redflags', label: '⚠️ Red Flags', badge: redFlags.length },
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
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              status === 'FINALIZED'
                ? 'bg-green-100 text-green-700'
                : status === 'SIGNED'
                  ? 'bg-blue-100 text-blue-700'
                  : status === 'NEGOTIATING'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-amber-100 text-amber-700'
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>

          <a
            href={`/api/agreements/${agreementId}/pdf`}
            download
            className="text-sm font-semibold px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            ⬇ Download
          </a>

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

      {finalizeError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {finalizeError}
        </div>
      )}

      {/* ── Tab navigation ──────────────────────────────────────────────── */}
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
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
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
                <p className="text-4xl mb-3">✅</p>
                <p className="text-gray-700 font-semibold">
                  {isMalay ? 'Tiada bendera merah dikesan' : 'No red flags detected'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {isMalay
                    ? 'Analisis AI tidak menemui sebarang isu ketara dengan perjanjian ini.'
                    : 'The AI analysis found no significant issues with this agreement.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayRedFlags.map((flag, index) => (
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
                <span className="text-gray-400 shrink-0 mt-0.5">🕐</span>
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
                <span className="text-gray-400 shrink-0 mt-0.5">🌐</span>
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
              <span className="text-gray-400 shrink-0 mt-0.5">🔒</span>
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
              <span className="text-gray-400 shrink-0 mt-0.5">⛓️</span>
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
