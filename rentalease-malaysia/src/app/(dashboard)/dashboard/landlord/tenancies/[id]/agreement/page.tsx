// src/app/(dashboard)/dashboard/landlord/tenancies/[id]/agreement/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AgreementViewer from '@/components/ui/AgreementViewer';
import AgreementEditor from '@/components/ui/AgreementEditor';

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id } = await params;

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id,
      room: { property: { landlordId: session.user.id } },
    },
    include: {
      room: {
        include: {
          property: { select: { address: true, city: true } },
        },
      },
      tenant: { select: { name: true } },
      agreement: true, // full include — contentHash, signedAt, signedByIp all present
    },
  });

  if (!tenancy || !tenancy.agreement) notFound();

  let redFlags: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    clause: string;
    issue: string;
    recommendation: string;
  }> = [];
  if (tenancy.agreement.redFlags) {
    try {
      redFlags = JSON.parse(tenancy.agreement.redFlags);
    } catch {
      redFlags = [];
    }
  }

  const isSigned = tenancy.agreement.status === 'SIGNED';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          href="/dashboard/landlord/tenancies"
          className="hover:text-blue-600 transition-colors"
        >
          Tenancies
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/landlord/tenancies/${id}`}
          className="hover:text-blue-600 transition-colors"
        >
          {tenancy.room.property.address}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Agreement</span>
      </div>

      {/* Viewer — always shown */}
      <AgreementViewer
        agreementId={tenancy.agreement.id}
        status={tenancy.agreement.status}
        rawContent={tenancy.agreement.rawContent}
        plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
        redFlags={redFlags}
        tenantName={tenancy.tenant.name}
        propertyAddress={`${tenancy.room.property.address}, ${tenancy.room.property.city} — ${tenancy.room.label}`}
        // Phase 11: pass signing audit trail fields so the panel renders
        contentHash={tenancy.agreement.contentHash}
        signedAt={tenancy.agreement.signedAt}
        signedByIp={tenancy.agreement.signedByIp}
        txHash={tenancy.agreement.txHash}
      />

      {/* Editor — only for landlord, only before signing */}
      {!isSigned && (
        <div className="mt-8 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            Edit Agreement
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Edit the agreement text directly or use AI Assist to apply a
            specific change. After saving, re-finalize to send the updated
            version to your tenant.
          </p>
          <AgreementEditor
            agreementId={tenancy.agreement.id}
            initialContent={tenancy.agreement.rawContent}
            negotiationNotes={tenancy.agreement.negotiationNotes}
          />
        </div>
      )}

      {/* If signed, explain why editing is locked */}
      {isSigned && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
          <p className="text-sm text-gray-500">
            🔒 This agreement has been signed by the tenant and cannot be
            edited. If both parties agree to changes, a new tenancy agreement
            would need to be created.
          </p>
        </div>
      )}
    </div>
  );
}
