'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  agreementId: string;
}

type Mode = 'idle' | 'requesting_changes';

export default function TenantAgreementActions({ agreementId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRespond = async (action: 'accept' | 'request_changes') => {
    setIsLoading(true);
    setError(null);

    const body = action === 'accept' ? { action } : { action, notes };

    try {
      const response = await fetch(`/api/agreements/${agreementId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Something went wrong.');
        return;
      }

      setSuccess(result.message);
      // Refresh the server component so the page reflects the new status
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Once tenant has submitted, show a clean confirmation state
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

      {mode === 'idle' && (
        <div>
          <p className="text-sm text-gray-600 mb-5">
            Review all three tabs above carefully before responding. Once you
            accept, the tenancy becomes active and a payment schedule is
            generated automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleRespond('accept')}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Processing…' : '✓ Accept Agreement'}
            </button>
            <button
              onClick={() => setMode('requesting_changes')}
              disabled={isLoading}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              ✏️ Request Changes
            </button>
          </div>
        </div>
      )}

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
              onClick={() => handleRespond('request_changes')}
              // Disabled until notes are at least 10 chars — matches server validation
              disabled={isLoading || notes.trim().length < 10}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Sending…' : 'Send to Landlord'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
}
