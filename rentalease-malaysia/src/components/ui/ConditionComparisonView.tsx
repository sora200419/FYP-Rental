// src/components/ui/ConditionComparisonView.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ComparisonResult, RoomGroup, ComparisonPhoto } from '@/lib/compareConditionReports'

type ReportSummary = {
  createdAt: string
  createdByName: string
  status: string
  photoCount: number
}

type Props = {
  moveInReport: ReportSummary
  moveOutReport: ReportSummary
  comparison: ComparisonResult
  backHref: string
  propertyLabel: string
  tenantName: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:                  { label: 'Draft',             className: 'bg-gray-100 text-gray-600' },
  SUBMITTED:              { label: 'Submitted',         className: 'bg-blue-100 text-blue-700' },
  PENDING_REVIEW:         { label: 'Pending Review',    className: 'bg-blue-100 text-blue-700' },
  CORRECTION_REQUESTED:   { label: 'Correction Needed', className: 'bg-amber-100 text-amber-700' },
  COUNTER_EVIDENCE_ADDED: { label: 'Counter Evidence',  className: 'bg-orange-100 text-orange-700' },
  ACCEPTED:               { label: 'Accepted',          className: 'bg-green-100 text-green-700' },
  DISPUTED:               { label: 'Disputed',          className: 'bg-red-100 text-red-700' },
  LOCKED:                 { label: 'Locked',            className: 'bg-gray-100 text-gray-600' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function PhotoGrid({ photos }: { photos: ComparisonPhoto[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-lg bg-gray-50 border border-dashed border-gray-200">
        <p className="text-xs text-gray-400">Not documented</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((photo) => (
        <div key={photo.id}>
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={photo.imageUrl}
              alt={photo.caption ?? 'Condition photo'}
              fill
              className="object-cover"
              sizes="120px"
            />
          </div>
          {photo.caption && (
            <p className="text-[10px] text-gray-400 mt-1 text-center truncate">
              {photo.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function RoomCard({ group }: { group: RoomGroup }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{group.roomLabel}</span>
        <span className="text-xs text-gray-400">
          · {group.moveInPhotos.length} move-in · {group.moveOutPhotos.length} move-out
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        <div className="p-4">
          <PhotoGrid photos={group.moveInPhotos} />
        </div>
        <div className="p-4">
          <PhotoGrid photos={group.moveOutPhotos} />
        </div>
      </div>
    </div>
  )
}

export default function ConditionComparisonView({
  moveInReport,
  moveOutReport,
  comparison,
  backHref,
  propertyLabel,
  tenantName,
}: Props) {
  const { matched, moveInOnly, moveOutOnly } = comparison
  const isEmpty = matched.length === 0 && moveInOnly.length === 0 && moveOutOnly.length === 0

  return (
    <div className="max-w-4xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
      >
        ← Back to Condition Reports
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Move-In vs Move-Out</h1>
        <p className="text-gray-500 text-sm mt-1">
          {propertyLabel} · Tenant: {tenantName}
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Move-In</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {new Date(moveInReport.createdAt).toLocaleDateString('en-MY', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            <StatusBadge status={moveInReport.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            By {moveInReport.createdByName} · {moveInReport.photoCount}{' '}
            {moveInReport.photoCount === 1 ? 'photo' : 'photos'}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: '#f59e0b' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-1">Move-Out</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {new Date(moveOutReport.createdAt).toLocaleDateString('en-MY', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
            <StatusBadge status={moveOutReport.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            By {moveOutReport.createdByName} · {moveOutReport.photoCount}{' '}
            {moveOutReport.photoCount === 1 ? 'photo' : 'photos'}
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-700 font-semibold text-lg">No photos to compare</p>
          <p className="text-gray-400 text-sm mt-1">
            Neither report has any photos uploaded yet.
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-4 px-1 mb-2">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-500">← Move-In Photos</p>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-500">Move-Out Photos →</p>
          </div>

          {/* Matched rooms */}
          {matched.length > 0 && (
            <div className="space-y-3 mb-6">
              {matched.map((group) => (
                <RoomCard key={group.roomLabel} group={group} />
              ))}
            </div>
          )}

          {/* Move-in only */}
          {moveInOnly.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Move-In only (no matching move-out room)
              </p>
              <div className="space-y-3">
                {moveInOnly.map((group) => (
                  <RoomCard key={group.roomLabel} group={group} />
                ))}
              </div>
            </div>
          )}

          {/* Move-out only */}
          {moveOutOnly.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Move-Out only (no matching move-in room)
              </p>
              <div className="space-y-3">
                {moveOutOnly.map((group) => (
                  <RoomCard key={group.roomLabel} group={group} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
