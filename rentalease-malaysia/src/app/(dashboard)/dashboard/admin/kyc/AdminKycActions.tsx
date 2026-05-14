'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props { submissionId: string; }

export default function AdminKycActions({ submissionId }: Props) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${submissionId}/approve`, { method: 'PATCH' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) { setError('Reason is required'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/kyc/${submissionId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      {rejecting ? (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection (required)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button onClick={() => { setRejecting(false); setReason(''); setError(null); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleReject} disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {loading ? 'Rejecting…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={handleApprove} disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? 'Approving…' : 'Approve'}
          </button>
          <button onClick={() => { setRejecting(true); setError(null); }} disabled={loading}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
