import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import ConditionReportCard from '@/components/ui/ConditionReportCard';
import ConditionPhotoUploader from '@/components/ui/ConditionPhotoUploader';
import CreateConditionReport from '@/components/ui/CreateConditionReport';

export default async function LandlordConditionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id: tenancyId } = await params;

  // Verify this tenancy belongs to the current landlord
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      property: { landlordId: session.user.id },
    },
    include: {
      property: { select: { address: true, city: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!tenancy) notFound();

  // Fetch all condition reports for this tenancy
  const reports = await prisma.conditionReport.findMany({
    where: { tenancyId },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      acknowledgedBy: { select: { id: true, name: true } },
      photos: {
        select: {
          id: true,
          room: true,
          imageUrl: true,
          caption: true,
          uploadedById: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

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
          href={`/dashboard/landlord/tenancies/${tenancyId}`}
          className="hover:text-blue-600 transition-colors"
        >
          {tenancy.property.address}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Condition Reports</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Property Condition
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {tenancy.property.address}, {tenancy.property.city} · Tenant:{' '}
            {tenancy.tenant.name}
          </p>
        </div>
        <CreateConditionReport tenancyId={tenancyId} />
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
        <p className="text-blue-800 text-sm font-medium">
          📸 Document property condition for evidence
        </p>
        <p className="text-blue-600 text-xs mt-1">
          Both you and your tenant can upload photos grouped by room. Once a
          report is acknowledged by both parties, it becomes an immutable record
          for deposit disputes.
        </p>
      </div>

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">📷</p>
          <p className="text-gray-700 font-semibold text-lg">
            No condition reports yet
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Create a move-in report to document the property&apos;s starting
            condition.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
            // Only show uploader if the report hasn't been acknowledged yet
            const canUpload = !report.acknowledgedAt;

            return (
              <div key={report.id} className="space-y-3">
                <ConditionReportCard
                  reportId={report.id}
                  type={report.type}
                  notes={report.notes}
                  createdAt={report.createdAt.toISOString()}
                  createdByName={report.createdBy.name}
                  createdByRole={report.createdBy.role}
                  createdById={report.createdBy.id}
                  acknowledgedAt={report.acknowledgedAt?.toISOString() ?? null}
                  acknowledgedByName={report.acknowledgedBy?.name ?? null}
                  photos={report.photos}
                  currentUserId={session.user.id}
                />
                {canUpload && <ConditionPhotoUploader reportId={report.id} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
