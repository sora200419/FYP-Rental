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
  tenancyId: string;
  status: string;
  rawContent: string;
  plainLanguageSummary: string;
  redFlags: RedFlag[];
  tenantName: string;
  propertyAddress: string;
  readOnly?: boolean; // ← When true, hides the finalize button (used for tenant view)
}

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200',
};

type Tab = 'agreement' | 'summary' | 'redflags';

export default function AgreementViewer({
  agreementId,
  tenancyId: _tenancyId, // prefixed with _ to signal intentionally unused
  status,
  rawContent,
  plainLanguageSummary,
  redFlags,
  tenantName,
  propertyAddress,
  readOnly = false, // default to false so landlord pages work without passing it
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('agreement');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  const highCount = redFlags.filter((f) => f.severity === 'HIGH').length;
  // Only show finalize UI if it's a draft AND the viewer is not in read-only mode
  const isDraft = status === 'DRAFT';
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
      {/* Header */}
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

          {/* Download available to both landlord and tenant */}
          <a
            href={`/api/agreements/${agreementId}/pdf`}
            download
            className="text-sm font-semibold px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            ⬇ Download
          </a>

          {/* Finalize button only shown to landlords (readOnly = false) */}
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

      {/* High-severity warning banner */}
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

      {/* Tab navigation */}
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

      {/* Tab content */}
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
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              Each clause explained in plain language — designed for tenants and
              landlords without legal training.
            </p>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
              {plainLanguageSummary}
            </pre>
          </div>
        )}

        {activeTab === 'redflags' && (
          <div className="p-6 md:p-8">
            <p className="text-xs text-gray-400 mb-5 pb-4 border-b border-gray-100">
              AI analysis of potential issues, ambiguities, or unfair terms in
              the agreement.
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
    </div>
  );
}
