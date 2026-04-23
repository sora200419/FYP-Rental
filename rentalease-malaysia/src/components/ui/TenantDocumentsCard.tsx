'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface TenantDocument {
  id: string;
  type: 'IC_COPY' | 'INCOME_PROOF';
  imageUrl: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  IC_COPY: 'IC / NRIC Copy',
  INCOME_PROOF: 'Income Proof',
};

interface Props {
  tenancyId: string;
  tenantName: string;
}

export default function TenantDocumentsCard({ tenancyId, tenantName }: Props) {
  const [docs, setDocs] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tenant-documents/for-tenancy/${tenancyId}`)
      .then(async (res) => {
        if (res.status === 403) {
          const data = await res.json();
          if (data.accessRevoked) {
            setAccessRevoked(true);
            return;
          }
        }
        if (!res.ok) throw new Error('Failed to load documents');
        const data = await res.json();
        setDocs(data.documents ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenancyId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Tenant Documents
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          Loading documents…
        </div>
      </div>
    );
  }

  if (accessRevoked) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tenant Documents
        </h2>
        <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-gray-400 text-base mt-0.5">🔒</span>
          <p className="text-xs text-gray-500 leading-relaxed">
            Document access has been revoked. Under PDPA data minimisation principles, landlords may only view tenant documents during an active tenancy relationship.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tenant Documents
        </h2>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Tenant Documents
      </h2>

      {docs.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-2xl mb-2">📂</p>
          <p className="text-sm text-gray-500">{tenantName} has not uploaded any documents yet.</p>
          <p className="text-xs text-gray-400 mt-1">They can upload IC copy and income proof from their profile page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(['IC_COPY', 'INCOME_PROOF'] as const).map((type) => {
            const doc = docs.find((d) => d.type === type);
            if (!doc) {
              return (
                <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{TYPE_LABELS[type]}</p>
                    <p className="text-xs text-gray-400">Not uploaded</p>
                  </div>
                  <span className="text-xs text-gray-400">—</span>
                </div>
              );
            }

            const isPdf = doc.mimeType === 'application/pdf';
            const fileSizeKb = Math.round(doc.fileSize / 1024);

            return (
              <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  {isPdf ? (
                    <span className="text-2xl flex-shrink-0">📄</span>
                  ) : (
                    <a
                      href={doc.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity flex-shrink-0"
                    >
                      <Image
                        src={doc.imageUrl}
                        alt={TYPE_LABELS[type]}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </a>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700">{TYPE_LABELS[type]}</p>
                    <p className="text-xs text-gray-400 truncate">{doc.originalName} · {fileSizeKb} KB</p>
                    <p className="text-xs text-gray-400">
                      {new Date(doc.uploadedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline flex-shrink-0 ml-3"
                >
                  View ↗
                </a>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-300 mt-4">
        🔒 PDPA: document access automatically revokes when this tenancy closes.
      </p>
    </div>
  );
}
