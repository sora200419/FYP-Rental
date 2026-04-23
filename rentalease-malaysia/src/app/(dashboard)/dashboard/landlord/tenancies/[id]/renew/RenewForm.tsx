'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
  currentEndDate: string;
  currentMonthlyRent: number;
  currentDepositAmount: number;
}

export default function RenewForm({ tenancyId, currentEndDate, currentMonthlyRent, currentDepositAmount }: Props) {
  const router = useRouter();

  // Default: new term starts day after current end, runs 12 months
  const defaultStart = new Date(currentEndDate);
  defaultStart.setDate(defaultStart.getDate() + 1);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);

  const toDateInput = (d: Date) => d.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(toDateInput(defaultStart));
  const [endDate, setEndDate] = useState(toDateInput(defaultEnd));
  const [monthlyRent, setMonthlyRent] = useState(String(currentMonthlyRent));
  const [depositAmount, setDepositAmount] = useState(String(currentDepositAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tenancies/${tenancyId}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          monthlyRent: parseFloat(monthlyRent),
          depositAmount: parseFloat(depositAmount),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create renewal');
      }

      const data = await res.json();
      router.push(`/dashboard/landlord/tenancies/${data.tenancyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>New Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>New End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Monthly Rent (RM)</label>
          <input
            type="number"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
            min="0"
            step="0.01"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Security Deposit (RM)</label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="0"
            step="0.01"
            className={inputClass}
            required
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
        A new tenancy invitation will be sent to the tenant. They must accept before you can draft a new agreement.
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
        >
          {submitting ? 'Creating renewal…' : '✓ Create Renewal Tenancy'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
