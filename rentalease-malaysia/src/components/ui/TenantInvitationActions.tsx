'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
}

export default function TenantInvitationActions({ tenancyId }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<'ACCEPT' | 'DECLINE' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: 'ACCEPT' | 'DECLINE') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenancies/${tenancyId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Respond to Invitation
      </h2>

      {confirming === null && (
        <>
          <p className="text-sm text-gray-600 mb-5">
            Review the tenancy terms above. Accepting moves the tenancy to{' '}
            <strong>Pending</strong> — your landlord will then generate the
            agreement for you to sign.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setConfirming('ACCEPT')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Accept Invitation
            </button>
            <button
              onClick={() => setConfirming('DECLINE')}
              className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Decline Invitation
            </button>
          </div>
        </>
      )}

      {confirming === 'ACCEPT' && (
        <div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-5">
            <p className="text-green-800 font-semibold text-sm">
              Confirm acceptance
            </p>
            <p className="text-green-700 text-xs mt-1">
              You are agreeing to the tenancy terms shown above. The landlord
              will be notified and will prepare the formal agreement.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setConfirming(null); setError(null); }}
              disabled={isLoading}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={() => respond('ACCEPT')}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Accepting…' : 'Confirm Accept'}
            </button>
          </div>
        </div>
      )}

      {confirming === 'DECLINE' && (
        <div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-5">
            <p className="text-red-800 font-semibold text-sm">
              Confirm decline
            </p>
            <p className="text-red-700 text-xs mt-1">
              Declining will cancel this invitation and free the room. This
              cannot be undone.
            </p>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setConfirming(null); setError(null); }}
              disabled={isLoading}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={() => respond('DECLINE')}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Declining…' : 'Confirm Decline'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
