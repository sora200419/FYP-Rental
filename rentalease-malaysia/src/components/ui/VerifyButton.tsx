'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  disabled?: boolean;
}

type State = 'idle' | 'rejecting' | 'verified' | 'rejected';

export default function VerifyButton({ userId, disabled = false }: Props) {
  const [state, setState] = useState<State>('idle');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, { method: 'PATCH' });
      if (res.ok) {
        setState('verified');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        setState('rejected');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (state === 'verified') {
    return (
      <span className="text-green-700 text-sm font-semibold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
        Verified
      </span>
    );
  }

  if (state === 'rejected') {
    return (
      <span className="text-red-700 text-sm font-semibold bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
        Rejected
      </span>
    );
  }

  if (state === 'rejecting') {
    return (
      <div className="flex flex-col gap-2 w-48">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection…"
          rows={3}
          autoFocus
          className="w-full text-xs border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
        <div className="flex gap-1.5">
          <button
            onClick={handleReject}
            disabled={loading || !reason.trim()}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            {loading ? 'Rejecting…' : 'Confirm'}
          </button>
          <button
            onClick={() => { setState('idle'); setReason(''); }}
            disabled={loading}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleVerify}
        disabled={loading || disabled}
        title={disabled ? 'Cannot verify — user has not uploaded their IC photo yet' : undefined}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
      >
        Verify
      </button>
      <button
        onClick={() => setState('rejecting')}
        disabled={loading}
        className="border border-red-200 hover:bg-red-50 text-red-600 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
      >
        Reject
      </button>
    </div>
  );
}
