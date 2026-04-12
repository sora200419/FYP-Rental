'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Photo {
  id: string;
  room: string;
  imageUrl: string;
  caption: string | null;
  uploadedById: string;
}

interface Props {
  reportId: string;
  type: string;
  notes: string | null;
  createdAt: string;
  createdByName: string;
  createdByRole: string;
  createdById: string;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  photos: Photo[];
  currentUserId: string;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  MOVE_IN: { label: 'Move-In', icon: '📦' },
  MOVE_OUT: { label: 'Move-Out', icon: '🚚' },
  INSPECTION: { label: 'Inspection', icon: '🔍' },
};

export default function ConditionReportCard({
  reportId,
  type,
  notes,
  createdAt,
  createdByName,
  createdByRole,
  createdById,
  acknowledgedAt,
  acknowledgedByName,
  photos,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group photos by room for the organized display
  const photosByRoom = photos.reduce<Record<string, Photo[]>>((acc, photo) => {
    if (!acc[photo.room]) acc[photo.room] = [];
    acc[photo.room].push(photo);
    return acc;
  }, {});

  const roomNames = Object.keys(photosByRoom).sort();
  const isCreator = createdById === currentUserId;
  const isAcknowledged = !!acknowledgedAt;
  const canAcknowledge = !isCreator && !isAcknowledged;

  const typeInfo = TYPE_LABELS[type] ?? { label: type, icon: '📋' };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/condition-reports/${reportId}/acknowledge`,
        { method: 'PATCH' },
      );

      if (!response.ok) {
        const result = await response.json();
        setError(result.error ?? 'Failed to acknowledge.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Report header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeInfo.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">
                {typeInfo.label} Report
              </p>
              {isAcknowledged ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">
                  Acknowledged
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Pending Acknowledgement
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Created by {createdByName} ({createdByRole.toLowerCase()}) ·{' '}
              {formatDate(createdAt)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
        </p>
      </div>

      {/* Notes section */}
      {notes && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      )}

      {/* Photos grouped by room */}
      <div className="px-6 py-4">
        {roomNames.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📷</p>
            <p className="text-gray-500 text-sm">No photos uploaded yet</p>
            <p className="text-gray-400 text-xs mt-1">
              Add photos to document the property condition.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {roomNames.map((room) => (
              <div key={room}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {room}
                </p>
                <div className="flex flex-wrap gap-3">
                  {photosByRoom[room].map((photo) => (
                    <div key={photo.id} className="group">
                      <a
                        href={photo.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block w-28 h-28 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                        title={photo.caption ?? `${room} photo`}
                      >
                        <Image
                          src={photo.imageUrl}
                          alt={photo.caption ?? `${room} condition`}
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                        {/* Show who uploaded this photo — useful when both parties contribute */}
                        {photo.uploadedById !== createdById && (
                          <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            Other party
                          </div>
                        )}
                      </a>
                      {photo.caption && (
                        <p className="text-xs text-gray-500 mt-1 max-w-[112px] truncate">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acknowledgement section */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
        {isAcknowledged && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <span>✓</span>
            <span>
              Acknowledged by {acknowledgedByName} on{' '}
              {formatDate(acknowledgedAt!)}
            </span>
          </div>
        )}

        {canAcknowledge && photos.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              By acknowledging, you confirm you have reviewed all photos and
              agree with the documented condition of the property.
            </p>
            <button
              onClick={handleAcknowledge}
              disabled={isAcknowledging}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {isAcknowledging ? 'Acknowledging…' : '✓ Acknowledge Report'}
            </button>
          </div>
        )}

        {isCreator && !isAcknowledged && (
          <p className="text-xs text-gray-400">
            Waiting for the other party to acknowledge this report.
          </p>
        )}

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
}
