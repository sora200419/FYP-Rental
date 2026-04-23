'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type DeductionStatus = 'PROPOSED' | 'ACCEPTED' | 'DISPUTED' | 'WITHDRAWN';
type RefundStatus = 'PROPOSED' | 'IN_REVIEW' | 'AGREED' | 'DISPUTED' | 'PAID';

interface Deduction {
  id: string;
  reason: string;
  amount: number;
  status: DeductionStatus;
  tenantDisputeNote?: string | null;
}

interface Refund {
  id: string;
  status: RefundStatus;
  originalAmount: number;
  refundAmount: number;
  paidAt?: string | null;
  paidProofUrl?: string | null;
  deductions: Deduction[];
}

interface Props {
  refund: Refund;
}

const STATUS_LABEL: Record<RefundStatus, string> = {
  PROPOSED: 'Awaiting your review',
  IN_REVIEW: 'Under review',
  AGREED: 'Agreed — awaiting payment',
  DISPUTED: 'Dispute raised',
  PAID: 'Refund paid',
};

const STATUS_STYLE: Record<RefundStatus, string> = {
  PROPOSED: 'bg-amber-100 text-amber-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  AGREED: 'bg-green-100 text-green-700',
  DISPUTED: 'bg-red-100 text-red-600',
  PAID: 'bg-green-100 text-green-700',
};

export default function TenantDepositReview({ refund: initialRefund }: Props) {
  const router = useRouter();
  const [refund, setRefund] = useState<Refund>(initialRefund);
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});
  const [responding, setResponding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatRM = (n: number) =>
    `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const respond = async (deductionId: string, action: 'ACCEPT' | 'DISPUTE') => {
    setResponding(deductionId);
    setError(null);
    try {
      const res = await fetch(`/api/deposit-refund/${refund.id}/deductions/${deductionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          disputeNote: action === 'DISPUTE' ? disputeNotes[deductionId] : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');

      const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'DISPUTED';
      setRefund((prev) => ({
        ...prev,
        deductions: prev.deductions.map((d) =>
          d.id === deductionId
            ? { ...d, status: newStatus as DeductionStatus, tenantDisputeNote: disputeNotes[deductionId] ?? null }
            : d
        ),
        status: 'IN_REVIEW',
      }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setResponding(null);
    }
  };

  const pendingDeductions = refund.deductions.filter((d) => d.status === 'PROPOSED');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Deposit Settlement
        </h2>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[refund.status]}`}>
          {STATUS_LABEL[refund.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-400 text-xs">Original deposit</p>
          <p className="font-semibold text-gray-900">{formatRM(refund.originalAmount)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-xs">Refund amount</p>
          <p className={`font-bold text-lg ${refund.refundAmount === 0 ? 'text-red-600' : 'text-green-700'}`}>
            {formatRM(refund.refundAmount)}
          </p>
        </div>
      </div>

      {refund.deductions.length > 0 && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deductions proposed by landlord</p>

          {refund.deductions
            .filter((d) => d.status !== 'WITHDRAWN')
            .map((d) => (
              <div key={d.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800 flex-1">{d.reason}</p>
                  <span className="text-sm font-semibold text-gray-900 ml-3">{formatRM(d.amount)}</span>
                </div>

                {d.status === 'PROPOSED' ? (
                  <div className="space-y-2">
                    <textarea
                      value={disputeNotes[d.id] ?? ''}
                      onChange={(e) => setDisputeNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      placeholder="Note (required if disputing)…"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => respond(d.id, 'ACCEPT')}
                        disabled={responding === d.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-lg text-xs"
                      >
                        {responding === d.id ? '…' : '✓ Accept'}
                      </button>
                      <button
                        onClick={() => respond(d.id, 'DISPUTE')}
                        disabled={responding === d.id || !disputeNotes[d.id]?.trim()}
                        className="flex-1 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 font-semibold px-3 py-1.5 rounded-lg text-xs border border-red-200"
                      >
                        {responding === d.id ? '…' : '⚠ Dispute'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">
                    <span className={`text-xs font-medium ${d.status === 'ACCEPTED' ? 'text-green-600' : 'text-red-600'}`}>
                      {d.status === 'ACCEPTED' ? '✓ You accepted this deduction' : '⚠ You disputed this deduction'}
                    </span>
                    {d.tenantDisputeNote && (
                      <p className="text-xs text-gray-500 mt-0.5">Your note: &quot;{d.tenantDisputeNote}&quot;</p>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {pendingDeductions.length === 0 && refund.status === 'IN_REVIEW' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
          All deductions reviewed. Waiting for landlord to finalise the settlement.
        </div>
      )}

      {refund.status === 'AGREED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-xs text-green-700">
          ✓ Settlement agreed. Your landlord will transfer {formatRM(refund.refundAmount)} to you.
        </div>
      )}

      {refund.status === 'PAID' && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-xs text-green-700 font-semibold">✅ Refund paid</p>
          {refund.paidAt && (
            <p className="text-xs text-green-600">
              {new Date(refund.paidAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {refund.paidProofUrl && (
            <a href={refund.paidProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
              View proof ↗
            </a>
          )}
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
