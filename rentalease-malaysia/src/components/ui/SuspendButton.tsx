'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  userName: string;
  isSuspended: boolean;
}

export default function SuspendButton({ userId, userName, isSuspended }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended: !isSuspended }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? 'Something went wrong');
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={isSuspended ? `Unsuspend ${userName}` : `Suspend ${userName}`}
        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
          isSuspended
            ? 'border-green-300 text-green-700 hover:bg-green-50'
            : 'border-amber-300 text-amber-700 hover:bg-amber-50'
        }`}
      >
        {loading ? '…' : isSuspended ? 'Unsuspend' : 'Suspend'}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
