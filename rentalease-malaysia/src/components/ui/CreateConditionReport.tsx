'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
  tenancyStatus: string;
}

const ALL_REPORT_TYPES = [
  {
    value: 'MOVE_IN',
    label: 'Move-In Report',
    description: 'Document property condition at the start of tenancy',
  },
  {
    value: 'MOVE_OUT',
    label: 'Move-Out Report',
    description: 'Document property condition when tenant is leaving',
  },
  {
    value: 'INSPECTION',
    label: 'Mid-Tenancy Inspection',
    description: 'Periodic check on property condition during tenancy',
  },
];

function availableTypes(status: string) {
  if (status === 'ACTIVE') return ALL_REPORT_TYPES;
  if (status === 'EXPIRED' || status === 'TERMINATED') {
    return ALL_REPORT_TYPES.filter((t) => t.value !== 'MOVE_IN');
  }
  return []; // INVITED / PENDING — agreement not yet signed
}

export default function CreateConditionReport({ tenancyId, tenancyStatus }: Props) {
  const router = useRouter();
  const types = availableTypes(tenancyStatus);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(types[0]?.value ?? 'MOVE_IN');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/condition-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenancyId,
          type: selectedType,
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? 'Failed to create report.');
        return;
      }

      // Reset form and refresh
      setIsOpen(false);
      setNotes('');
      setSelectedType('MOVE_IN');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    if (types.length === 0) {
      return (
        <div className="text-right">
          <button
            disabled
            title="The tenancy agreement must be signed before creating condition reports"
            className="bg-white/5 text-white/40 text-sm font-semibold px-5 py-2.5 rounded-lg cursor-not-allowed"
          >
            + New Condition Report
          </button>
          <p className="text-xs text-white/40 mt-1">
            Available after agreement is signed
          </p>
        </div>
      );
    }
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] hover:opacity-90 text-[#1C2740] text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        + New Condition Report
      </button>
    );
  }

  return (
    <div className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-6">
      <h3 className="text-sm font-semibold text-white mb-4">
        Create New Condition Report
      </h3>

      {/* Report type selector */}
      <div className="space-y-2 mb-4">
        {types.map((type) => (
          <label
            key={type.value}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedType === type.value
                ? 'border-[rgba(196,154,60,0.5)] bg-[rgba(196,154,60,0.06)]'
                : 'border-[rgba(196,154,60,0.15)] hover:border-white/10'
            }`}
          >
            <input
              type="radio"
              name="reportType"
              value={type.value}
              checked={selectedType === type.value}
              onChange={() => setSelectedType(type.value)}
              className="sr-only"
            />
            <div>
              <p className="text-sm font-medium text-white">{type.label}</p>
              <p className="text-xs text-white/50 mt-0.5">{type.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-white/50 mb-1">
          General Notes <span className="text-white/40">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Pre-existing damage noted on east wall of living room. All appliances tested and working."
          maxLength={2000}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[rgba(196,154,60,0.5)] focus:outline-none focus:ring-0 transition-colors resize-none"
        />
      </div>

      {error && (
        <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.25)] text-[#f87171] text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            setIsOpen(false);
            setError(null);
            setNotes('');
          }}
          disabled={isLoading}
          className="flex-1 border border-white/10 text-white/60 hover:bg-white/5 font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] hover:opacity-90 disabled:opacity-50 text-[#1C2740] font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {isLoading ? 'Creating…' : 'Create Report'}
        </button>
      </div>
    </div>
  );
}
