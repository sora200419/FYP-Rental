import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AgreementViewer from '@/components/ui/AgreementViewer';

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id } = await params; // this is the tenancyId

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id,
      property: { landlordId: session.user.id },
    },
    include: {
      property: { select: { address: true, city: true } },
      tenant: { select: { name: true } },
      agreement: true, // full agreement needed here
    },
  });

  if (!tenancy || !tenancy.agreement) notFound();

  // Parse redFlags from JSON string → typed array for the client component
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

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
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
          {tenancy.property.address}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Agreement</span>
      </div>

      {/* Pass all data to the client component for interactive tabs */}
      <AgreementViewer
        agreementId={tenancy.agreement.id}
        tenancyId={id}
        status={tenancy.agreement.status}
        rawContent={tenancy.agreement.rawContent}
        plainLanguageSummary={tenancy.agreement.plainLanguageSummary}
        redFlags={redFlags}
        tenantName={tenancy.tenant.name}
        propertyAddress={`${tenancy.property.address}, ${tenancy.property.city}`}
      />
    </div>
  );
}
