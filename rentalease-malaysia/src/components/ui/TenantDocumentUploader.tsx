'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type DocumentType = 'IC_COPY' | 'INCOME_PROOF';

interface TenantDocument {
  id: string;
  type: DocumentType;
  imageUrl: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface SlotProps {
  type: DocumentType;
  label: string;
  description: string;
  doc: TenantDocument | null;
  onUpload: (type: DocumentType, file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUploading: boolean;
}

function DocumentSlot({ type, label, description, doc, onUpload, onDelete, isUploading }: SlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);
    try {
      await onUpload(type, file);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isPdf = doc?.mimeType === 'application/pdf';
  const fileSizeKb = doc ? Math.round(doc.fileSize / 1024) : 0;

  return (
    <div className="border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        {doc && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            ✓ Uploaded
          </span>
        )}
      </div>

      {doc && (
        <div className="flex items-center gap-3 mb-3">
          {isPdf ? (
            <a
              href={doc.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <span className="text-2xl">📄</span>
              <span className="truncate max-w-[200px]">{doc.originalName}</span>
            </a>
          ) : (
            <a
              href={doc.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity flex-shrink-0"
            >
              <Image
                src={doc.imageUrl}
                alt={label}
                fill
                className="object-cover"
                sizes="64px"
              />
            </a>
          )}
          <div className="text-xs text-gray-400 min-w-0">
            <p className="truncate">{doc.originalName}</p>
            <p>{fileSizeKb} KB · {new Date(doc.uploadedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleChange}
          className="hidden"
          id={`doc-upload-${type}`}
          disabled={isUploading}
        />
        <label
          htmlFor={`doc-upload-${type}`}
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
            isUploading
              ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
              : doc
              ? 'border-gray-300 text-gray-600 hover:bg-gray-50 bg-white'
              : 'border-blue-300 text-blue-600 hover:bg-blue-50 bg-white'
          }`}
        >
          {isUploading ? (
            <>
              <span className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              Uploading…
            </>
          ) : doc ? (
            '↩ Replace'
          ) : (
            '📎 Upload'
          )}
        </label>

        {doc && (
          <button
            onClick={() => onDelete(doc.id)}
            disabled={isUploading}
            className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>

      {localError && <p className="text-red-500 text-xs mt-2">{localError}</p>}
    </div>
  );
}

interface Props {
  initialDocuments: TenantDocument[];
}

export default function TenantDocumentUploader({ initialDocuments }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<TenantDocument[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const getDoc = (type: DocumentType) => docs.find((d) => d.type === type) ?? null;

  const handleUpload = async (type: DocumentType, file: File) => {
    setIsUploading(true);
    setGlobalError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/tenant-documents', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Upload failed');
      }
      router.refresh();
      const data = await res.json();
      setDocs((prev) => {
        const filtered = prev.filter((d) => d.type !== type);
        return [...filtered, data.document];
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsUploading(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/tenant-documents/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Delete failed');
      }
      setDocs((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to remove document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <span className="text-blue-500 text-base mt-0.5">🔒</span>
        <p className="text-xs text-blue-700 leading-relaxed">
          Your documents are stored securely and only visible to landlords with an active tenancy relationship with you. Access is automatically revoked when the tenancy ends — in accordance with PDPA data minimisation principles.
        </p>
      </div>

      <DocumentSlot
        type="IC_COPY"
        label="IC / NRIC Copy"
        description="Front and back of your Malaysian identity card. Accepted: JPG, PNG, WebP, PDF (max 10 MB)"
        doc={getDoc('IC_COPY')}
        onUpload={handleUpload}
        onDelete={handleDelete}
        isUploading={isUploading}
      />

      <DocumentSlot
        type="INCOME_PROOF"
        label="Income Proof"
        description="Latest 3 months payslips, EA form, or bank statement. Accepted: JPG, PNG, WebP, PDF (max 10 MB)"
        doc={getDoc('INCOME_PROOF')}
        onUpload={handleUpload}
        onDelete={handleDelete}
        isUploading={isUploading}
      />

      {globalError && (
        <p className="text-red-500 text-xs">{globalError}</p>
      )}
    </div>
  );
}
