'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
  isInvitation: boolean;
}

// Landlord action: cancel an invitation, or a tenancy that has not started.
export default function CancelTenancyButton({ tenancyId, isInvitation }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noun = isInvitation ? 'invitation' : 'tenancy';

  const cancel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenancies/${tenancyId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || 'Something went wrong.');
        return;
      }
      // The tenancy no longer exists; its page redirects to the property.
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="border border-[rgba(248,113,113,0.25)] text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
      >
        Cancel {noun}
      </button>
    );
  }

  return (
    <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.25)] rounded-xl p-4">
      <p className="text-[#f87171] font-semibold text-sm mb-1">Cancel this {noun}?</p>
      <p className="text-[#f87171] text-xs mb-4">
        The tenant will be notified, any draft agreement is deleted and the room becomes
        available again. This cannot be undone.
      </p>
      {error && <p className="text-[#f87171] text-sm mb-3">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={isLoading}
          className="flex-1 border border-white/10 text-white/60 hover:bg-white/5 font-semibold py-2 rounded-lg transition-colors text-sm"
        >
          Keep it
        </button>
        <button
          onClick={cancel}
          disabled={isLoading}
          className="flex-1 bg-[rgba(248,113,113,0.15)] border border-[rgba(248,113,113,0.4)] text-[#f87171] hover:bg-[rgba(248,113,113,0.25)] disabled:opacity-50 font-semibold py-2 rounded-lg transition-colors text-sm"
        >
          {isLoading ? 'Cancelling…' : `Cancel ${noun}`}
        </button>
      </div>
    </div>
  );
}
