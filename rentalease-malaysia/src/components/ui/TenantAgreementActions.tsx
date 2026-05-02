'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  agreementId: string;
}

type Mode = 'idle' | 'signing_modal' | 'requesting_changes';

export default function TenantAgreementActions({ agreementId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [notes, setNotes] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAccept = async () => {
    // The API enforces acknowledged=true server-side,
    // but we also gate the button in the UI so the user can't accidentally submit.
    if (!acknowledged) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agreements/${agreementId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SIGN' }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Something went wrong.');
        return;
      }

      setSuccess('Agreement signed successfully. Your tenancy is now active.');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agreements/${agreementId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_CHANGES', negotiationNotes: notes }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Something went wrong.');
        return;
      }

      setSuccess('Your change request has been sent to the landlord.');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Once the tenant has submitted any response, show a clean confirmation.
  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
        <span className="text-green-500 text-xl">✓</span>
        <p className="text-green-800 font-medium text-sm">{success}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Your Response
      </h2>

      {/* ── Step 1: Initial choice buttons ──────────────────────────────── */}
      {mode === 'idle' && (
        <div>
          <p className="text-sm text-gray-600 mb-5">
            Review all three tabs above carefully before responding. Once you
            accept, the tenancy becomes active and a payment schedule is
            generated automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setMode('signing_modal')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              ✓ Accept Agreement
            </button>
            <button
              onClick={() => setMode('requesting_changes')}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              ✏️ Request Changes
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2a: Signing modal (shown when tenant clicks Accept) ────── */}
      {/* This is the consent gate — the tenant must explicitly tick the    */}
      {/* checkbox before the final confirm button becomes active.          */}
      {mode === 'signing_modal' && (
        <div>
          {/* Legal acknowledgement banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5">
            <p className="text-amber-900 font-semibold text-sm mb-1">
              ⚖️ Before you sign
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              By accepting this agreement, you confirm that you have read and
              understood all clauses, including the plain-language summary and
              any red-flag warnings. This constitutes your electronic acceptance
              under the Malaysian Electronic Commerce Act 2006. Your acceptance
              will be recorded with a timestamp and a cryptographic fingerprint
              of this document.
            </p>
          </div>

          {/* Acknowledgement checkbox — the gate */}
          <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer mb-5 hover:border-blue-300 transition-colors">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 accent-green-600 w-4 h-4 shrink-0"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              I have read and understood the full tenancy agreement, the
              plain-language summary, and all red-flag warnings. I agree to be
              legally bound by all terms and conditions in this agreement.
            </span>
          </label>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setMode('idle');
                setAcknowledged(false);
                setError(null);
              }}
              disabled={isLoading}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handleAccept}
              // Button is disabled until the checkbox is ticked AND the request isn't in flight.
              // This is the UX enforcement — the API enforces it server-side too.
              disabled={!acknowledged || isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {isLoading
                ? 'Processing…'
                : acknowledged
                  ? '✓ Confirm and Sign'
                  : 'Tick the checkbox to continue'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2b: Request changes form ──────────────────────────────── */}
      {mode === 'requesting_changes' && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Describe which clauses you would like to discuss. Your landlord will
            see this message and can generate a revised agreement based on your
            feedback.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Clause 4 — the security deposit of RM 3,000 seems high. I would like to request a reduction. Also Clause 9 — can the termination notice period be reduced from 2 months to 1 month?"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
          />

          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setMode('idle');
                setNotes('');
                setError(null);
              }}
              disabled={isLoading}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleRequestChanges}
              disabled={isLoading || notes.trim().length < 10}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Sending…' : 'Send to Landlord'}
            </button>
          </div>
        </div>
      )}

      {error && mode === 'idle' && (
        <p className="text-red-500 text-sm mt-3">{error}</p>
      )}
    </div>
  );
}
