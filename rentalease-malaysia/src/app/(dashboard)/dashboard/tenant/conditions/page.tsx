import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ConditionReportCard from '@/components/ui/ConditionReportCard';
import ConditionPhotoUploader from '@/components/ui/ConditionPhotoUploader';
import CreateConditionReport from '@/components/ui/CreateConditionReport';

export default async function TenantConditionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  // Find the tenant's most recent active or pending tenancy
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      tenantId: session.user.id,
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    include: {
      property: {
        include: {
          landlord: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!tenancy) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Property Condition
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Document and track property condition for your tenancy.
          </p>
        </div>
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">📷</p>
          <p className="text-gray-700 font-semibold text-lg">
            No active tenancy
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Condition reports will be available once your landlord links you to
            a tenancy.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all condition reports for this tenancy
  const reports = await prisma.conditionReport.findMany({
    where: { tenancyId: tenancy.id },
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

  // Check if there are any reports pending the tenant's acknowledgement
  const pendingAck = reports.filter(
    (r) => !r.acknowledgedAt && r.createdBy.id !== session.user.id,
  ).length;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Property Condition
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {tenancy.property.address}, {tenancy.property.city} · Landlord:{' '}
            {tenancy.property.landlord.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingAck > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pendingAck} to review
            </span>
          )}
          <CreateConditionReport tenancyId={tenancy.id} />
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
        <p className="text-blue-800 text-sm font-medium">
          📸 Protect yourself with photo evidence
        </p>
        <p className="text-blue-600 text-xs mt-1">
          Upload photos to document the property condition when you move in.
          This evidence protects your security deposit — if there&apos;s a
          dispute at move-out, you can compare photos from both dates.
        </p>
      </div>

      {/* Reports */}
      {reports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">📷</p>
          <p className="text-gray-700 font-semibold text-lg">
            No condition reports yet
          </p>
          <p className="text-gray-400 text-sm mt-1 max-w-sm mx-auto">
            Create a move-in report to document the property&apos;s condition
            before you settle in. Your landlord may also create one.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => {
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
