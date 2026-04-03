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
  paymentId: string;
  dueDate: string; // pre-formatted date string from server
  amount: string; // pre-formatted RM amount from server
  status: string;
  proofs: Proof[];
}

export default function PaymentVerificationCard({
  paymentId,
  dueDate,
  amount,
  status,
  proofs,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [rejectReason, setRejectReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (action: 'approve' | 'reject') => {
    setIsLoading(true);
    setError(null);

    const body =
      action === 'approve' ? { action } : { action, reason: rejectReason };

    try {
      const response = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Payment header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{dueDate}</p>
          <p className="text-gray-400 text-xs mt-0.5">{amount}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            status === 'PAID'
              ? 'bg-green-100 text-green-700'
              : status === 'UNDER_REVIEW'
                ? 'bg-amber-100 text-amber-700'
                : status === 'LATE'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-500'
          }`}
        >
          {status === 'UNDER_REVIEW'
            ? 'Under Review'
            : status.charAt(0) + status.slice(1).toLowerCase()}
        </span>
      </div>

      {/* Proof thumbnails — clicking opens full size in new tab */}
      {proofs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
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
                alt="Payment proof"
                fill
                className="object-cover"
                sizes="80px"
              />
            </a>
          ))}
        </div>
      )}

      {/* Action area — only shown when payment is UNDER_REVIEW */}
      {status === 'UNDER_REVIEW' && mode === 'idle' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleVerify('approve')}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {isLoading ? 'Processing…' : '✓ Approve'}
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

      {/* Rejection reason input — expands inline */}
      {status === 'UNDER_REVIEW' && mode === 'rejecting' && (
        <div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Explain why the proof is insufficient, e.g. 'The photo is blurry and the amount is not visible. Please re-upload a clearer screenshot.'"
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
              onClick={() => handleVerify('reject')}
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
