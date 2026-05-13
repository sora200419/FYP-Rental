'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SignatureProofSummary {
  id: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  createdAt: Date | string;
  reviewedAt?: Date | string | null;
}

interface Props {
  agreementId: string;
  status: 'PENDING_SIGNATURE_PROOF' | 'SIGNED';
  proofs: SignatureProofSummary[];
  isCorporate?: boolean;
  signerLabel?: string;
}

const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.heic,.heif';

export default function TenantAgreementSignatureProofUploader({
  agreementId,
  status,
  proofs,
  isCorporate = false,
  signerLabel = 'authorized signatory',
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestProof = proofs[0] ?? null;
  const canUpload =
    status === 'PENDING_SIGNATURE_PROOF' &&
    (!latestProof || latestProof.status === 'REJECTED');

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/agreements/${agreementId}/signature-proof`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? 'Upload failed. Please try again.');
        return;
      }

      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Signed Hard-Copy Proof
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Your tenancy will only start after the landlord approves your
            digitally signed agreement together with the uploaded hard-copy
            signature proof.
          </p>
          {isCorporate && (
            <p className="text-xs text-blue-700 mt-2">
              The uploaded file should show the signature of the {signerLabel}{' '}
              acting for the corporate lease party.
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            status === 'SIGNED'
              ? 'bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset'
              : latestProof?.status === 'UNDER_REVIEW'
                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset'
                : latestProof?.status === 'REJECTED'
                  ? 'bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset'
          }`}
        >
          {status === 'SIGNED'
            ? 'Approved'
            : latestProof?.status === 'UNDER_REVIEW'
              ? 'Under Review'
              : latestProof?.status === 'REJECTED'
                ? 'Re-upload Needed'
                : 'Upload Required'}
        </span>
      </div>

      {!latestProof && status === 'PENDING_SIGNATURE_PROOF' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mb-4">
          <p className="text-sm font-semibold text-amber-900">
            Digital signature complete
          </p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            Upload the signed hard-copy file next. Accepted formats: PDF, JPG,
            PNG, or HEIC, up to 10 MB.
          </p>
          {isCorporate && (
            <p className="text-xs text-amber-800 mt-2 leading-relaxed">
              Make sure the uploaded document is signed by the {signerLabel},
              not just by a room occupant.
            </p>
          )}
        </div>
      )}

      {latestProof?.status === 'UNDER_REVIEW' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-4 mb-4">
          <p className="text-sm font-semibold text-blue-900">
            Signed hard-copy submitted
          </p>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            The landlord is reviewing your uploaded signed copy. Move-in only
            starts after approval.
          </p>
        </div>
      )}

      {latestProof?.status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-4">
          <p className="text-sm font-semibold text-red-900">
            Re-upload requested
          </p>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            The landlord rejected the last uploaded file. Upload a clearer or
            correctly signed copy to continue.
          </p>
          {latestProof.rejectionReason && (
            <p className="text-xs text-red-700 mt-2">
              <span className="font-semibold">Reason:</span>{' '}
              {latestProof.rejectionReason}
            </p>
          )}
        </div>
      )}

      {latestProof && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Latest uploaded file
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {latestProof.originalName} ·{' '}
                {(latestProof.fileSize / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Uploaded on {new Date(latestProof.createdAt).toLocaleString('en-MY')}
              </p>
              {latestProof.reviewedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Reviewed on {new Date(latestProof.reviewedAt).toLocaleString('en-MY')}
                </p>
              )}
            </div>
            <a
              href={latestProof.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Open File
            </a>
          </div>
        </div>
      )}

      {canUpload && (
        <div className="space-y-3">
          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              Upload signed hard-copy file
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 px-4 py-4">
              <p className="text-sm font-semibold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = '';
                    setError(null);
                  }}
                  disabled={isUploading}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? 'Uploading…' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setError(null);
            }}
          />

          <p className="text-xs text-gray-500">
            Accepted formats: PDF, JPG, PNG, HEIC. Maximum size: 10 MB.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
    </div>
  );
}
