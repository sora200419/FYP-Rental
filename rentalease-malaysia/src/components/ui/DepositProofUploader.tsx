'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ExistingProof {
  id: string;
  imageUrl: string;
}

interface Props {
  tenancyId: string;
  depositStatus: string; // PENDING | UNDER_REVIEW | PAID | REJECTED
  depositRejectionReason?: string | null;
  existingProofs: ExistingProof[];
  depositAmount: string; // pre-formatted RM string
}

export default function DepositProofUploader({
  tenancyId,
  depositStatus,
  depositRejectionReason,
  existingProofs,
  depositAmount,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = depositStatus === 'PENDING' || depositStatus === 'REJECTED';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/tenancies/${tenancyId}/deposit-proof`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? 'Upload failed. Please try again.');
        return;
      }

      setFile(null);
      setPreview(null);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  // ── PAID ──────────────────────────────────────────────────────────────────
  if (depositStatus === 'PAID') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-green-600 font-bold text-sm">
            ✓ Deposit Confirmed
          </span>
          <span className="text-xs text-gray-400">{depositAmount}</span>
        </div>
        {existingProofs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingProofs.map((p) => (
              <a
                key={p.id}
                href={p.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-16 h-16 rounded-lg overflow-hidden border border-green-200 hover:opacity-80 transition-opacity"
              >
                <Image
                  src={p.imageUrl}
                  alt="Deposit proof"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── UNDER REVIEW ─────────────────────────────────────────────────────────
  if (depositStatus === 'UNDER_REVIEW') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-800 text-sm font-semibold mb-2">
          ⏳ Deposit proof submitted — awaiting landlord confirmation
        </p>
        {existingProofs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {existingProofs.map((p) => (
              <a
                key={p.id}
                href={p.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block w-16 h-16 rounded-lg overflow-hidden border border-blue-200 hover:opacity-80 transition-opacity"
              >
                <Image
                  src={p.imageUrl}
                  alt="Deposit proof"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── PENDING / REJECTED — show upload form ────────────────────────────────
  return (
    <div className="space-y-3">
      {depositStatus === 'REJECTED' && depositRejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-red-700 text-sm font-semibold">
            Proof rejected — please re-upload
          </p>
          <p className="text-red-600 text-xs mt-1">{depositRejectionReason}</p>
        </div>
      )}

      {/* Preview of selected file */}
      {preview && (
        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>
      )}

      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload deposit receipt ({depositAmount})
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            {isUploading ? 'Uploading…' : 'Submit proof'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isUploading}
            className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-semibold py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
