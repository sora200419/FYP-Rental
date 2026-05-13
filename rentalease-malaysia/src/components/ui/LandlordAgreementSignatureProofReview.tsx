'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SignatureProofSummary {
  id: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: Date | string;
  reviewedAt?: Date | string | null;
}

interface Props {
  agreementId: string;
  proof: SignatureProofSummary | null;
  tenantName: string;
}

export default function LandlordAgreementSignatureProofReview({
  agreementId,
  proof,
  tenantName,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!proof) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Signature Proof Review
        </h2>
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
          {tenantName} has completed digital signing, but has not uploaded the
          signed hard-copy file yet.
        </div>
      </div>
    );
  }

  const handleReview = async (action: 'APPROVE' | 'REJECT') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/agreements/${agreementId}/signature-proof/${proof.id}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            action === 'APPROVE'
              ? { action }
              : { action, rejectionReason },
          ),
        },
      );

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
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Signature Proof Review
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Review the uploaded signed hard-copy agreement before the tenancy
            becomes active.
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            proof.status === 'APPROVED'
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset'
              : proof.status === 'REJECTED'
                ? 'bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset'
                : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset'
          }`}
        >
          {proof.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {proof.originalName}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Uploaded on {new Date(proof.createdAt).toLocaleString('en-MY')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(proof.fileSize / (1024 * 1024)).toFixed(2)} MB · {proof.mimeType}
            </p>
            {proof.rejectionReason && (
              <p className="text-xs text-red-600 mt-2">
                <span className="font-semibold">Last rejection reason:</span>{' '}
                {proof.rejectionReason}
              </p>
            )}
          </div>
          <a
            href={proof.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Open File
          </a>
        </div>
      </div>

      {proof.status === 'UNDER_REVIEW' && mode === 'idle' && (
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => handleReview('APPROVE')}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Processing…' : 'Approve Signed Copy'}
          </button>
          <button
            type="button"
            onClick={() => setMode('rejecting')}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            Reject and Request Re-upload
          </button>
        </div>
      )}

      {proof.status === 'UNDER_REVIEW' && mode === 'rejecting' && (
        <div className="mt-4 space-y-3">
          <textarea
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            rows={3}
            placeholder="Explain what is missing or incorrect about the uploaded signed copy…"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setRejectionReason('');
                setError(null);
              }}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleReview('REJECT')}
              disabled={isLoading || rejectionReason.trim().length < 10}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Sending…' : 'Send Rejection'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}
