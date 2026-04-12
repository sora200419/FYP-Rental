'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tenancyId: string;
}

const REPORT_TYPES = [
  {
    value: 'MOVE_IN',
    label: '📦 Move-In Report',
    description: 'Document property condition at the start of tenancy',
  },
  {
    value: 'MOVE_OUT',
    label: '🚚 Move-Out Report',
    description: 'Document property condition when tenant is leaving',
  },
  {
    value: 'INSPECTION',
    label: '🔍 Mid-Tenancy Inspection',
    description: 'Periodic check on property condition during tenancy',
  },
];

export default function CreateConditionReport({ tenancyId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('MOVE_IN');
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
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        + New Condition Report
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Create New Condition Report
      </h3>

      {/* Report type selector */}
      <div className="space-y-2 mb-4">
        {REPORT_TYPES.map((type) => (
          <label
            key={type.value}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedType === type.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
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
              <p className="text-sm font-medium text-gray-900">{type.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          General Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Pre-existing damage noted on east wall of living room. All appliances tested and working."
          maxLength={2000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
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
          className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {isLoading ? 'Creating…' : 'Create Report'}
        </button>
      </div>
    </div>
  );
}
