'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
  // Current values pre-fill the form so the landlord sees what's already
  // there and only needs to correct what's wrong — no retyping everything.
  currentStartDate: string; // ISO string from tenancy.startDate.toISOString()
  currentEndDate: string; // ISO string from tenancy.endDate.toISOString()
  currentMonthlyRent: number;
  currentDepositAmount: number;
}

export default function EditTenancyTerms({
  tenancyId,
  currentStartDate,
  currentEndDate,
  currentMonthlyRent,
  currentDepositAmount,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // HTML date inputs require YYYY-MM-DD — slice the ISO string to get that.
  // e.g. "2026-06-01T00:00:00.000Z" → "2026-06-01"
  const toDateInput = (iso: string) => iso.slice(0, 10);

  const [startDate, setStartDate] = useState(toDateInput(currentStartDate));
  const [endDate, setEndDate] = useState(toDateInput(currentEndDate));
  const [monthlyRent, setMonthlyRent] = useState(String(currentMonthlyRent));
  const [depositAmount, setDepositAmount] = useState(
    String(currentDepositAmount),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic client-side date validation before hitting the network.
    // The API validates server-side too, but catching it here gives instant feedback.
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after the start date.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/tenancies/${tenancyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          monthlyRent: Number(monthlyRent),
          depositAmount: Number(depositAmount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update tenancy terms.');
        return;
      }

      setIsOpen(false);
      // router.refresh() triggers Next.js to re-run the server component,
      // so the updated values appear immediately without a full page reload.
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form fields back to their original values when cancelling,
    // so stale edits don't persist if the landlord re-opens the form later.
    setStartDate(toDateInput(currentStartDate));
    setEndDate(toDateInput(currentEndDate));
    setMonthlyRent(String(currentMonthlyRent));
    setDepositAmount(String(currentDepositAmount));
    setError(null);
    setIsOpen(false);
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  // ── Collapsed state: just a small link ────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium mt-3 inline-block"
      >
        ✏️ Edit terms
      </button>
    );
  }

  // ── Expanded state: the edit form ─────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 pt-4 border-t border-gray-100 space-y-4"
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Edit Tenancy Terms
      </p>

      {/* Dates row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Rent and deposit row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Monthly Rent (RM)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Security Deposit (RM)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className={inputClass}
            required
          />
          {/* Dynamic suggestion based on the current rent value.
              Malaysian norm is 2 months deposit for residential tenancies. */}
          {Number(monthlyRent) > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Suggested: RM{' '}
              {(Number(monthlyRent) * 2).toLocaleString('en-MY', {
                minimumFractionDigits: 2,
              })}{' '}
              (2 months rent)
            </p>
          )}
        </div>
      </div>

      {/* Inline explanation of when editing is allowed */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
        <p className="text-xs text-amber-700">
          ⚠️ Terms can only be edited before an agreement is generated. Once you
          click &ldquo;Generate Agreement&rdquo;, these values will be locked
          into the agreement text.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1 text-sm font-medium text-gray-500 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 py-2 rounded-lg transition-colors"
        >
          {isLoading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
