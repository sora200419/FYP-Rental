'use client';

import { useMemo, useState } from 'react';
import { buildAgreementDiff, type DiffRow } from '@/lib/agreements/textDiff';

interface Props {
  currentContent: string;
  suggestedContent: string;
  instruction?: string;
}

function getBlockStyles(
  side: 'current' | 'suggested',
  type: DiffRow['type'],
): string {
  if (type === 'unchanged') {
    return 'border border-gray-200 bg-white text-gray-700';
  }

  if (type === 'modified') {
    return side === 'current'
      ? 'border border-amber-300 bg-amber-50 text-amber-950'
      : 'border border-emerald-300 bg-emerald-50 text-emerald-950';
  }

  if (type === 'removed') {
    return side === 'current'
      ? 'border border-rose-300 bg-rose-50 text-rose-950'
      : 'border border-dashed border-gray-200 bg-gray-50 text-gray-400';
  }

  return side === 'suggested'
    ? 'border border-purple-300 bg-purple-50 text-purple-950'
    : 'border border-dashed border-gray-200 bg-gray-50 text-gray-400';
}

function getBadgeStyles(type: DiffRow['type']): string {
  if (type === 'unchanged') {
    return 'bg-gray-100 text-gray-500';
  }

  if (type === 'modified') {
    return 'bg-amber-100 text-amber-700';
  }

  if (type === 'removed') {
    return 'bg-rose-100 text-rose-700';
  }

  return 'bg-purple-100 text-purple-700';
}

function getBadgeLabel(type: DiffRow['type']): string {
  if (type === 'modified') return 'Changed';
  if (type === 'added') return 'Added';
  if (type === 'removed') return 'Removed';
  return 'Unchanged';
}

function renderBlock(text: string | null, emptyLabel: string) {
  if (!text) {
    return <p className="text-xs italic leading-relaxed">{emptyLabel}</p>;
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed">
      {text}
    </pre>
  );
}

function getBlockTitle(row: DiffRow): string {
  const source = row.suggestedText ?? row.currentText ?? '';
  const firstLine = source
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return 'Updated section';
  }

  return firstLine.length > 88 ? `${firstLine.slice(0, 88)}...` : firstLine;
}

export default function AgreementSuggestionDiff({
  currentContent,
  suggestedContent,
  instruction,
}: Props) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const { rows, summary } = buildAgreementDiff(currentContent, suggestedContent);
  const visibleRows = useMemo(
    () => (showUnchanged ? rows : rows.filter((row) => row.type !== 'unchanged')),
    [rows, showUnchanged],
  );
  const changedRows = useMemo(
    () => rows.filter((row) => row.type !== 'unchanged'),
    [rows],
  );

  return (
    <div className="bg-white">
      <div className="border-b border-purple-200 px-4 py-3">
        <p className="text-sm font-semibold text-purple-900">
          {summary.changedBlocks === 0
            ? 'No visible text changes detected'
            : `${summary.changedBlocks} changed block${summary.changedBlocks === 1 ? '' : 's'} detected`}
        </p>
        <p className="text-xs text-purple-700 mt-1">
          Left shows the current agreement. Right shows the AI suggestion.
          Changed blocks are highlighted before you apply anything to the editor.
        </p>
        {instruction ? (
          <p className="mt-2 text-xs text-purple-800">
            <span className="font-semibold">Instruction applied:</span>{' '}
            {instruction}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-medium">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
            {summary.modifiedBlocks} changed
          </span>
          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-700">
            {summary.addedBlocks} added
          </span>
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
            {summary.removedBlocks} removed
          </span>
        </div>
        {changedRows.length > 0 ? (
          <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/70 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-purple-700">
              Changed Sections
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {changedRows.map((row, index) => (
                <span
                  key={`summary-${index}`}
                  className="rounded-full border border-purple-200 bg-white px-2.5 py-1 text-[11px] text-purple-800"
                >
                  {getBlockTitle(row)}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <label className="mt-3 inline-flex items-center gap-2 text-xs text-purple-700">
          <input
            type="checkbox"
            checked={showUnchanged}
            onChange={(event) => setShowUnchanged(event.target.checked)}
            className="h-4 w-4 accent-purple-600"
          />
          Show unchanged blocks
        </label>
      </div>

      <div className="grid gap-3 px-4 py-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            Current Agreement
          </p>
          <div className="space-y-3">
            {visibleRows.map((row, index) => (
              <div
                key={`current-${index}`}
                className={`rounded-lg px-3 py-3 ${getBlockStyles('current', row.type)}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getBadgeStyles(row.type)}`}
                  >
                    {getBadgeLabel(row.type)}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Block {index + 1}
                  </span>
                </div>
                {renderBlock(row.currentText, 'No matching text in current version.')}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
            AI Suggested Agreement
          </p>
          <div className="space-y-3">
            {visibleRows.map((row, index) => (
              <div
                key={`suggested-${index}`}
                className={`rounded-lg px-3 py-3 ${getBlockStyles('suggested', row.type)}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getBadgeStyles(row.type)}`}
                  >
                    {getBadgeLabel(row.type)}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Block {index + 1}
                  </span>
                </div>
                {renderBlock(row.suggestedText, 'No matching text in suggested version.')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
