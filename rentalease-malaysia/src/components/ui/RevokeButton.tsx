'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  revokeUrl: string;
}

type State = 'idle' | 'revoking' | 'revoked';

export default function RevokeButton({ revokeUrl }: Props) {
  const [state, setState] = useState<State>('idle');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRevoke = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(revokeUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (res.ok) {
        setState('revoked');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  if (state === 'revoked') {
    return (
      <span className="text-orange-700 text-sm font-semibold bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg">
        Revoked
      </span>
    );
  }

  if (state === 'revoking') {
    return (
      <div className="flex flex-col gap-2 w-48">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for revocation…"
          rows={3}
          autoFocus
          className="w-full text-xs border border-orange-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
        />
        <div className="flex gap-1.5">
          <button
            onClick={handleRevoke}
            disabled={loading || !reason.trim()}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
          >
            {loading ? 'Revoking…' : 'Confirm'}
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
    <button
      onClick={() => setState('revoking')}
      className="border border-orange-200 hover:bg-orange-50 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
    >
      Revoke
    </button>
  );
}
