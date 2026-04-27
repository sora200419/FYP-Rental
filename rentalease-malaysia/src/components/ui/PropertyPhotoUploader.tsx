'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PropertyPhotoUploader({
  propertyId,
}: {
  propertyId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Please select a photo first.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (caption.trim()) formData.append('caption', caption.trim());

    try {
      const res = await fetch(`/api/properties/${propertyId}/photos`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');

      setPreview(null);
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          id="property-photo-input"
          onChange={handleFileChange}
        />
        <label htmlFor="property-photo-input" className="cursor-pointer block">
          {preview ? (
            <Image
              src={preview}
              alt="Preview"
              width={400}
              height={200}
              className="w-full h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="py-6">
              <p className="text-2xl mb-1">📸</p>
              <p className="text-sm text-gray-500">Click to select a photo</p>
              <p className="text-xs text-gray-400 mt-0.5">
                JPEG, PNG or WebP · max 10 MB
              </p>
            </div>
          )}
        </label>
      </div>

      {preview && (
        <input
          type="text"
          placeholder="Caption (optional, e.g. Living Room)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={200}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!preview || uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
      >
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </button>
    </div>
  );
}
