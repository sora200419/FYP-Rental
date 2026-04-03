'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Props {
  paymentId: string;
  // Status tells the uploader what UI to show — PENDING/LATE shows upload,
  // UNDER_REVIEW shows "proof submitted", PAID shows "verified"
  currentStatus: string;
  rejectionReason?: string | null;
  existingProofs: { id: string; imageUrl: string }[];
}

export default function PaymentProofUploader({
  paymentId,
  currentStatus,
  rejectionReason,
  existingProofs,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);

    // Show local previews immediately before upload — improves perceived speed
    const localPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews(localPreviews);
    setIsUploading(true);

    try {
      // Upload all selected files in parallel for speed
      await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`/api/payments/${paymentId}/proof`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header — browser sets it automatically
            // with the correct multipart boundary when using FormData
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error ?? 'Upload failed');
          }
        }),
      );

      // Refresh server component to show the newly uploaded proofs
      router.refresh();
      setPreviews([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
      setPreviews([]);
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // PAID — show a clean verified state, no upload UI needed
  if (currentStatus === 'PAID') {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
        <span>✓</span>
        <span>Payment verified by landlord</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Show rejection reason prominently if the landlord rejected */}
      {currentStatus === 'PENDING' && rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-800 text-sm font-semibold mb-1">
            ⚠ Proof rejected — please re-upload
          </p>
          <p className="text-red-600 text-xs">{rejectionReason}</p>
        </div>
      )}

      {/* Already submitted indicator */}
      {currentStatus === 'UNDER_REVIEW' && (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <span>⏳</span>
          <span>Proof submitted — awaiting landlord verification</span>
        </div>
      )}

      {/* Existing proof thumbnails */}
      {existingProofs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingProofs.map((proof) => (
            <a
              key={proof.id}
              href={proof.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
            >
              <Image
                src={proof.imageUrl}
                alt="Payment proof"
                fill
                className="object-cover"
                sizes="64px"
              />
            </a>
          ))}
        </div>
      )}

      {/* Upload previews while uploading */}
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div
              key={i}
              className="relative w-16 h-16 rounded-lg overflow-hidden border border-blue-200 opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Uploading..."
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id={`proof-upload-${paymentId}`}
        />
        <label
          htmlFor={`proof-upload-${paymentId}`}
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
            <>
              📎{' '}
              {currentStatus === 'UNDER_REVIEW'
                ? 'Add more proof'
                : 'Upload payment proof'}
            </>
          )}
        </label>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
