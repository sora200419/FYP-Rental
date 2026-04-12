'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Common room labels for Malaysian residential properties.
// The user can also type a custom label for unusual spaces.
const ROOM_OPTIONS = [
  'Living Room',
  'Kitchen',
  'Dining Area',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Bathroom 1',
  'Bathroom 2',
  'Balcony',
  'Store Room',
  'Car Park',
  'Exterior',
];

interface Props {
  reportId: string;
}

export default function ConditionPhotoUploader({ reportId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedRoom, setSelectedRoom] = useState(ROOM_OPTIONS[0]);
  const [customRoom, setCustomRoom] = useState('');
  const [useCustomRoom, setUseCustomRoom] = useState(false);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const effectiveRoom = useCustomRoom ? customRoom.trim() : selectedRoom;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant preview while the upload happens
    setPreview(URL.createObjectURL(file));
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    if (!effectiveRoom) {
      setError('Please select or enter a room/area label.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room', effectiveRoom);
      if (caption.trim()) formData.append('caption', caption.trim());

      const response = await fetch(
        `/api/condition-reports/${reportId}/photos`,
        { method: 'POST', body: formData },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? 'Upload failed');
      }

      // Success — clear form and refresh
      setCaption('');
      setPreview(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
      setPreview(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
      <p className="text-sm font-semibold text-gray-700 mb-4">📷 Add Photos</p>

      {/* Room selector */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Room / Area
        </label>
        {!useCustomRoom ? (
          <div className="flex gap-2">
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROOM_OPTIONS.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setUseCustomRoom(true)}
              className="text-xs text-blue-600 hover:underline px-2 shrink-0"
            >
              Custom
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={customRoom}
              onChange={(e) => setCustomRoom(e.target.value)}
              placeholder="e.g. Laundry Area, Rooftop"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                setUseCustomRoom(false);
                setCustomRoom('');
              }}
              className="text-xs text-gray-500 hover:underline px-2 shrink-0"
            >
              Preset
            </button>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Caption <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="e.g. Scratch on wall near window"
          maxLength={500}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Upload preview */}
      {preview && (
        <div className="mb-3 relative w-20 h-20 rounded-lg overflow-hidden border border-blue-200 opacity-60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Uploading..."
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* File input + upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id={`condition-upload-${reportId}`}
        />
        <label
          htmlFor={`condition-upload-${reportId}`}
          className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
            isUploading
              ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
              : 'border-blue-300 text-blue-600 hover:bg-blue-50 bg-white'
          }`}
        >
          {isUploading ? (
            <>
              <span className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : (
            <>📎 Choose Photo</>
          )}
        </label>
      </div>

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
