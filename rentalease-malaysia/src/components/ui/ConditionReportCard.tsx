'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ConditionEvidenceProgress from '@/components/ui/ConditionEvidenceProgress';
import ConditionReviewActions from '@/components/ui/ConditionReviewActions';

interface Photo {
  id: string;
  room: string;
  imageUrl: string;
  caption: string | null;
  uploadedById: string;
}

interface ChecklistItem {
  area: string;
  completionReason: string;
}

interface Props {
  reportId: string;
  type: 'MOVE_IN' | 'MOVE_OUT' | 'INSPECTION';
  status: string;
  notes: string | null;
  correctionNote: string | null;
  counterNote: string | null;
  createdAt: string;
  createdByName: string;
  createdByRole: string;
  createdById: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  photos: Photo[];
  checklistItems: ChecklistItem[];
  currentUserId: string;
}

const TYPE_LABELS: Record<string, string> = {
  MOVE_IN: 'Move-In',
  MOVE_OUT: 'Move-Out',
  INSPECTION: 'Inspection',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-amber-100 text-amber-700' },
  CORRECTION_REQUESTED: { label: 'Correction Requested', className: 'bg-orange-100 text-orange-700' },
  COUNTER_EVIDENCE_ADDED: { label: 'Counter Evidence', className: 'bg-purple-100 text-purple-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  DISPUTED: { label: 'Disputed', className: 'bg-red-100 text-red-700' },
  LOCKED: { label: 'Locked', className: 'bg-gray-200 text-gray-700' },
};

function DeletePhotoButton({ reportId, photoId }: { reportId: string; photoId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) router.refresh();
    } catch { /* silent fail */ } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
      title="Delete photo"
    >
      {isDeleting ? '…' : '×'}
    </button>
  );
}

function SubmitForReviewButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/condition-reports/${reportId}/submit`, { method: 'PATCH' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit for Review'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function ConditionReportCard({
  reportId, type, status, notes, correctionNote, counterNote,
  createdAt, createdByName, createdByRole, createdById,
  reviewedAt, reviewedByName, photos, checklistItems, currentUserId,
}: Props) {
  const LOCKED_STATUSES = ['ACCEPTED', 'DISPUTED', 'LOCKED'];
  const isLocked = LOCKED_STATUSES.includes(status);
  const isCreator = createdById === currentUserId;
  const canReview = !isCreator && ['SUBMITTED', 'PENDING_REVIEW', 'COUNTER_EVIDENCE_ADDED'].includes(status);
  const canSubmit = isCreator && ['DRAFT', 'CORRECTION_REQUESTED'].includes(status);

  const badge = STATUS_BADGE[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  const typeLabel = TYPE_LABELS[type] ?? type;

  const photosByRoom = photos.reduce<Record<string, Photo[]>>((acc, p) => {
    if (!acc[p.room]) acc[p.room] = [];
    acc[p.room].push(p);
    return acc;
  }, {});

  const creatorPhotos = photos.filter((p) => p.uploadedById === createdById);
  const counterPhotos = photos.filter((p) => p.uploadedById !== createdById);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const renderPhotoGrid = (photoList: Photo[], showDelete: boolean) => {
    const byRoom = photoList.reduce<Record<string, Photo[]>>((acc, p) => {
      if (!acc[p.room]) acc[p.room] = [];
      acc[p.room].push(p);
      return acc;
    }, {});

    return Object.keys(byRoom).sort().map((room) => (
      <div key={room}>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{room}</p>
        <div className="flex flex-wrap gap-3">
          {byRoom[room].map((photo) => (
            <div key={photo.id} className="group relative">
              <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer"
                className="relative block w-28 h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                title={photo.caption ?? `${room} photo`}>
                <Image src={photo.imageUrl} alt={photo.caption ?? `${room} condition`}
                  fill className="object-cover" sizes="112px" />
              </a>
              {showDelete && !isLocked && (
                <DeletePhotoButton reportId={reportId} photoId={photo.id} />
              )}
              {photo.caption && (
                <p className="text-xs text-gray-500 mt-1 max-w-[112px] truncate">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">{typeLabel} Report</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Created by {createdByName} ({createdByRole.toLowerCase()}) · {formatDate(createdAt)}
          </p>
        </div>
        <p className="text-xs text-gray-400">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</p>
      </div>

      {/* Notes */}
      {notes && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      )}

      {/* Correction note */}
      {correctionNote && (
        <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
          <p className="text-xs font-semibold text-orange-700 mb-1">Correction Requested</p>
          <p className="text-sm text-orange-800">{correctionNote}</p>
        </div>
      )}

      {/* Evidence progress — shown when creator can still edit */}
      {canSubmit && (
        <div className="px-6 border-b border-gray-100">
          <ConditionEvidenceProgress
            reportType={type}
            photoCount={photos.length}
            checklistCount={checklistItems.length}
          />
        </div>
      )}

      {/* Photos — split view if disputed */}
      <div className="px-6 py-4 space-y-5">
        {status === 'DISPUTED' && counterPhotos.length > 0 ? (
          <>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Original Evidence ({creatorPhotos.length} photos)
              </p>
              <div className="space-y-4">
                {renderPhotoGrid(creatorPhotos, false)}
              </div>
            </div>
            <div className="border-t border-red-100 pt-4">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3">
                Counter Evidence ({counterPhotos.length} photos)
              </p>
              {counterNote && (
                <div className="bg-red-50 rounded-lg px-4 py-3 mb-3">
                  <p className="text-xs text-red-600 font-medium mb-1">Counter note</p>
                  <p className="text-sm text-red-800">{counterNote}</p>
                </div>
              )}
              <div className="space-y-4">
                {renderPhotoGrid(counterPhotos, false)}
              </div>
            </div>
          </>
        ) : photos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No photos uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(photosByRoom).sort().map((room) => (
              <div key={room}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{room}</p>
                <div className="flex flex-wrap gap-3">
                  {photosByRoom[room].map((photo) => {
                    const canDelete = photo.uploadedById === currentUserId && !isLocked;
                    return (
                      <div key={photo.id} className="group relative">
                        <a href={photo.imageUrl} target="_blank" rel="noopener noreferrer"
                          className="relative block w-28 h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                          title={photo.caption ?? `${room} photo`}>
                          <Image src={photo.imageUrl} alt={photo.caption ?? `${room} condition`}
                            fill className="object-cover" sizes="112px" />
                          {photo.uploadedById !== createdById && (
                            <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              Other party
                            </div>
                          )}
                        </a>
                        {canDelete && <DeletePhotoButton reportId={reportId} photoId={photo.id} />}
                        {photo.caption && (
                          <p className="text-xs text-gray-500 mt-1 max-w-[112px] truncate">{photo.caption}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        {status === 'ACCEPTED' && reviewedAt && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Accepted by {reviewedByName} on {formatDate(reviewedAt)}</span>
          </div>
        )}

        {status === 'DISPUTED' && reviewedAt && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <span>Disputed — counter evidence submitted by {reviewedByName} on {formatDate(reviewedAt)}</span>
          </div>
        )}

        {canSubmit && <SubmitForReviewButton reportId={reportId} />}

        {isCreator && !canSubmit && !isLocked && (
          <p className="text-xs text-gray-400">Waiting for the other party to review.</p>
        )}

        {canReview && <ConditionReviewActions reportId={reportId} />}
      </div>
    </div>
  );
}
