'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_AREAS = [
  'Bedroom / Rented Room',
  'Bathroom',
  'Kitchen / Shared Area',
  'Door, Lock and Keys',
  'Walls, Floor and Ceiling',
  'Furniture / Appliances',
];

const REASON_OPTIONS = [
  { value: 'PHOTO_UPLOADED', label: 'Photo uploaded' },
  { value: 'NO_ISSUE_OBSERVED', label: 'No issue observed' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
  { value: 'CANNOT_ACCESS', label: 'Cannot access' },
] as const;

type CompletionReason = (typeof REASON_OPTIONS)[number]['value'];

interface ChecklistItem {
  area: string;
  completionReason: CompletionReason;
}

interface Props {
  reportId: string;
  existingItems: ChecklistItem[];
}

export default function ConditionChecklistEditor({
  reportId,
  existingItems,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const completedAreas = new Map(
    existingItems.map((i) => [i.area, i.completionReason]),
  );

  const handleSelect = async (area: string, completionReason: CompletionReason) => {
    setSaving(area);
    setError(null);

    try {
      const res = await fetch(
        `/api/condition-reports/${reportId}/checklist`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ area, completionReason }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to save. Please try again.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-700 mb-1">
        Evidence Checklist
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Mark how you have documented each required area.
      </p>

      <div className="space-y-3">
        {DEFAULT_AREAS.map((area) => {
          const current = completedAreas.get(area);
          const isSaving = saving === area;

          return (
            <div key={area} className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${current ? 'bg-green-500' : 'bg-gray-300'}`}
              />
              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
                {area}
              </span>
              <select
                value={current ?? ''}
                onChange={(e) =>
                  handleSelect(area, e.target.value as CompletionReason)
                }
                disabled={isSaving}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="" disabled>
                  Select…
                </option>
                {REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
    </div>
  );
}
