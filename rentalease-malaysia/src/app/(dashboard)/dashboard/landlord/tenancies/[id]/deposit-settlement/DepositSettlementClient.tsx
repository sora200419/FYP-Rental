'use client';

import { useState, useRef } from 'react';
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
  paidAt: string | null;
  paidProofUrl: string | null;
  deductions: Deduction[];
}

interface MoveOutPhoto {
  id: string;
  area: string;
  imageUrl: string;
}

interface Props {
  tenancyId: string;
  tenantName: string;
  depositAmount: number;
  existingRefund: Refund | null;
  moveOutPhotos: MoveOutPhoto[];
}

const STATUS_LABEL: Record<RefundStatus, string> = {
  PROPOSED: 'Proposed',
  IN_REVIEW: 'Under Review',
  AGREED: 'Agreed',
  DISPUTED: 'Disputed',
  PAID: 'Paid',
};

const STATUS_STYLE: Record<RefundStatus, string> = {
  PROPOSED: 'bg-amber-100 text-amber-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  AGREED: 'bg-green-100 text-green-700',
  DISPUTED: 'bg-red-100 text-red-600',
  PAID: 'bg-green-100 text-green-700',
};

const DEDUCTION_STYLE: Record<DeductionStatus, string> = {
  PROPOSED: 'text-amber-600',
  ACCEPTED: 'text-green-600',
  DISPUTED: 'text-red-600',
  WITHDRAWN: 'text-gray-300 line-through',
};

export default function DepositSettlementClient({
  tenancyId,
  tenantName,
  depositAmount,
  existingRefund: initialRefund,
  moveOutPhotos,
}: Props) {
  const router = useRouter();
  const [refund, setRefund] = useState<Refund | null>(initialRefund);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New deduction form
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [addingDeduction, setAddingDeduction] = useState(false);

  // Mark-paid proof upload
  const proofFileRef = useRef<HTMLInputElement>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  const formatRM = (n: number) =>
    `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  // Create initial refund record
  const createRefund = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deposit-refund/${tenancyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductions: [] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const data = await res.json();
      setRefund(data.refund);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Add a deduction
  const addDeduction = async () => {
    if (!refund || !newReason.trim() || !newAmount) return;
    setAddingDeduction(true);
    setError(null);
    try {
      const res = await fetch(`/api/deposit-refund/${refund.id}/deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: newReason.trim(),
          amount: parseFloat(newAmount),
          photoIds: selectedPhotos,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      const data = await res.json();
      setRefund((prev) => {
        if (!prev) return prev;
        const newTotal = [...prev.deductions, data.deduction]
          .filter((d) => d.status !== 'WITHDRAWN')
          .reduce((s, d) => s + d.amount, 0);
        return {
          ...prev,
          deductions: [...prev.deductions, data.deduction],
          refundAmount: Math.max(0, prev.originalAmount - newTotal),
        };
      });
      setNewReason('');
      setNewAmount('');
      setSelectedPhotos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setAddingDeduction(false);
    }
  };

  // Withdraw a deduction
  const withdrawDeduction = async (deductionId: string) => {
    if (!refund) return;
    setError(null);
    try {
      const res = await fetch(`/api/deposit-refund/${refund.id}/deductions/${deductionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'WITHDRAW' }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setRefund((prev) => {
        if (!prev) return prev;
        const updated = prev.deductions.map((d) =>
          d.id === deductionId ? { ...d, status: 'WITHDRAWN' as DeductionStatus } : d
        );
        const newTotal = updated
          .filter((d) => d.status !== 'WITHDRAWN')
          .reduce((s, d) => s + d.amount, 0);
        return { ...prev, deductions: updated, refundAmount: Math.max(0, prev.originalAmount - newTotal) };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  // Upload paid proof
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!refund || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    setUploadingProof(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/deposit-refund/${refund.id}/mark-paid`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Upload failed');
      setRefund((prev) => prev ? { ...prev, status: 'PAID', paidAt: new Date().toISOString() } : prev);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setUploadingProof(false);
      if (proofFileRef.current) proofFileRef.current.value = '';
    }
  };

  if (!refund) {
    return (
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-3xl mb-3">💰</p>
          <p className="font-semibold text-gray-800">Start deposit settlement</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Create a deposit refund record. You can then add deductions for any damages or unpaid amounts, and {tenantName} will be notified to review.
          </p>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            onClick={createRefund}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm"
          >
            {loading ? 'Creating…' : '→ Start Settlement'}
          </button>
        </div>
      </div>
    );
  }

  const activeDeductions = refund.deductions.filter((d) => d.status !== 'WITHDRAWN');
  const canAddDeductions = ['PROPOSED', 'IN_REVIEW'].includes(refund.status);
  const canMarkPaid = refund.status === 'AGREED';

  return (
    <div className="space-y-5">
      {/* Status header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Refund Status</p>
          <span className={`inline-block mt-1 text-sm font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[refund.status]}`}>
            {STATUS_LABEL[refund.status]}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Original deposit</p>
          <p className="font-semibold text-gray-900">{formatRM(refund.originalAmount)}</p>
          <p className="text-xs text-gray-400 mt-2">Refund amount</p>
          <p className={`font-bold text-lg ${refund.refundAmount === 0 ? 'text-red-600' : 'text-green-700'}`}>
            {formatRM(refund.refundAmount)}
          </p>
        </div>
      </div>

      {/* Deductions list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Deductions
        </h2>

        {refund.deductions.length === 0 && (
          <p className="text-sm text-gray-400 mb-4">No deductions added. Full deposit will be refunded.</p>
        )}

        {refund.deductions.length > 0 && (
          <div className="space-y-3 mb-4">
            {refund.deductions.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${d.status === 'WITHDRAWN' ? 'text-gray-300 line-through' : 'text-gray-800'}`}>
                    {d.reason}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-medium ${DEDUCTION_STYLE[d.status]}`}>
                      {d.status === 'PROPOSED' ? 'Pending response' :
                       d.status === 'ACCEPTED' ? '✓ Accepted' :
                       d.status === 'DISPUTED' ? '⚠ Disputed' : 'Withdrawn'}
                    </span>
                    {d.tenantDisputeNote && (
                      <span className="text-xs text-red-500 truncate max-w-[200px]" title={d.tenantDisputeNote}>
                        — &quot;{d.tenantDisputeNote}&quot;
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-sm font-semibold ${d.status === 'WITHDRAWN' ? 'text-gray-300' : 'text-gray-900'}`}>
                    {formatRM(d.amount)}
                  </span>
                  {d.status === 'PROPOSED' && canAddDeductions && (
                    <button
                      onClick={() => withdrawDeduction(d.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}

            {activeDeductions.length > 0 && (
              <div className="flex justify-between pt-2 text-sm">
                <span className="text-gray-500">Total deductions</span>
                <span className="font-semibold text-gray-900">
                  {formatRM(activeDeductions.reduce((s, d) => s + d.amount, 0))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Add deduction form */}
        {canAddDeductions && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Add Deduction</p>
            <div className="space-y-3">
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Reason (e.g. damaged bedroom door, RM 350)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="Amount (RM)"
                  min="0"
                  step="0.01"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addDeduction}
                  disabled={addingDeduction || !newReason.trim() || !newAmount}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm"
                >
                  {addingDeduction ? '…' : '+ Add'}
                </button>
              </div>

              {/* Move-out photo references */}
              {moveOutPhotos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Attach move-out photos as evidence (optional)</p>
                  <div className="flex flex-wrap gap-2">
                    {moveOutPhotos.map((photo) => (
                      <label key={photo.id} className="cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selectedPhotos.includes(photo.id)}
                          onChange={(e) =>
                            setSelectedPhotos((prev) =>
                              e.target.checked ? [...prev, photo.id] : prev.filter((id) => id !== photo.id)
                            )
                          }
                        />
                        <div className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${selectedPhotos.includes(photo.id) ? 'border-blue-500' : 'border-gray-200'}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.imageUrl} alt={photo.area} className="w-full h-full object-cover" />
                          {selectedPhotos.includes(photo.id) && (
                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                              <span className="text-white text-lg">✓</span>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mark as paid */}
      {canMarkPaid && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="font-semibold text-green-800 text-sm mb-1">✓ All parties agreed — ready to pay</p>
          <p className="text-green-700 text-xs mb-4">
            Refund {formatRM(refund.refundAmount)} to {tenantName} and upload proof of transfer.
          </p>
          <input
            ref={proofFileRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleProofUpload}
            className="hidden"
            id="proof-upload"
          />
          <label
            htmlFor="proof-upload"
            className={`inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-pointer transition-colors ${
              uploadingProof
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {uploadingProof ? 'Uploading…' : '📎 Upload Payment Proof & Mark Paid'}
          </label>
        </div>
      )}

      {/* Paid state */}
      {refund.status === 'PAID' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800 text-sm">Deposit refund paid</p>
            {refund.paidAt && (
              <p className="text-green-600 text-xs mt-0.5">
                Paid on {new Date(refund.paidAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {refund.paidProofUrl && (
              <a href={refund.paidProofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                View proof ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Disputed state */}
      {refund.status === 'DISPUTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="font-semibold text-red-800 text-sm">⚠ Dispute unresolved</p>
          <p className="text-red-600 text-xs mt-1 leading-relaxed">
            One or more deductions are disputed. Consider withdrawing the disputed deductions to reach agreement, or proceed to external mediation.
          </p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
