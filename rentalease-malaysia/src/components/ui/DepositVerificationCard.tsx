'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Proof {
  id: string;
  imageUrl: string;
  createdAt: Date;
}

interface Props {
  tenancyId: string;
  depositAmount: string;
  depositStatus: string;
  proofs: Proof[];
  rejectionReason?: string | null;
}

export default function DepositVerificationCard({
  tenancyId,
  depositAmount,
  depositStatus,
  proofs,
  rejectionReason,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (action: 'APPROVE' | 'REJECT') => {
    setIsLoading(true);
    setError(null);

    const body =
      action === 'APPROVE'
        ? { action }
        : { action, rejectionReason: rejectReason };

    try {
      const res = await fetch(
        `/api/tenancies/${tenancyId}/deposit-proof/verify`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const statusBadge: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-500',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    PAID: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-600',
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    PAID: 'Paid',
    REJECTED: 'Rejected',
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">
          Deposit — {depositAmount}
        </p>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[depositStatus] ?? 'bg-gray-100 text-gray-500'}`}
        >
          {statusLabel[depositStatus] ?? depositStatus}
        </span>
      </div>

      {depositStatus === 'REJECTED' && rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-red-700">
            <span className="font-semibold">Rejected:</span> {rejectionReason}
          </p>
        </div>
      )}

      {proofs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {proofs.map((proof) => (
            <a
              key={proof.id}
              href={proof.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
              title="Click to view full size"
            >
              <Image
                src={proof.imageUrl}
                alt="Deposit proof"
                fill
                className="object-cover"
                sizes="80px"
              />
            </a>
          ))}
        </div>
      )}

      {depositStatus === 'PENDING' && (
        <p className="text-xs text-gray-400 italic">
          Tenant has not uploaded deposit proof yet.
        </p>
      )}

      {depositStatus === 'UNDER_REVIEW' && mode === 'idle' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleVerify('APPROVE')}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Processing…' : '✓ Confirm Paid'}
          </button>
          <button
            onClick={() => setMode('rejecting')}
            disabled={isLoading}
            className="flex-1 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      )}

      {depositStatus === 'UNDER_REVIEW' && mode === 'rejecting' && (
        <div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why the proof is insufficient…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode('idle');
                setRejectReason('');
              }}
              disabled={isLoading}
              className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleVerify('REJECT')}
              disabled={isLoading || rejectReason.trim().length < 10}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'Sending…' : 'Send Rejection'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
