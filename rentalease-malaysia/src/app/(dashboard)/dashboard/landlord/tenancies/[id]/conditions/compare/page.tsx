// src/app/(dashboard)/dashboard/landlord/tenancies/[id]/conditions/compare/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ConditionComparisonView from '@/components/ui/ConditionComparisonView'
import { groupPhotosForComparison } from '@/lib/compareConditionReports'

export default async function LandlordCompareConditionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'LANDLORD') redirect('/login')

  const { id: tenancyId } = await params

  const tenancy = await prisma.tenancy.findFirst({
    where: {
      id: tenancyId,
      room: { property: { landlordId: session.user.id } },
    },
    include: {
      room: {
        include: {
          property: { select: { address: true, city: true } },
        },
      },
      tenant: { select: { name: true } },
    },
  })

  if (!tenancy) notFound()

  const [moveInReport, moveOutReport] = await Promise.all([
    prisma.conditionReport.findFirst({
      where: { tenancyId, type: 'MOVE_IN' },
      include: {
        createdBy: { select: { name: true } },
        photos: {
          select: { id: true, room: true, imageUrl: true, caption: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.conditionReport.findFirst({
      where: { tenancyId, type: 'MOVE_OUT' },
      include: {
        createdBy: { select: { name: true } },
        photos: {
          select: { id: true, room: true, imageUrl: true, caption: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
  ])

  if (!moveInReport || !moveOutReport) {
    redirect(`/dashboard/landlord/tenancies/${tenancyId}/conditions`)
  }

  const comparison = groupPhotosForComparison(moveInReport.photos, moveOutReport.photos)
  const backHref = `/dashboard/landlord/tenancies/${tenancyId}/conditions`
  const propertyLabel = `${tenancy.room.property.address}, ${tenancy.room.property.city}`

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/landlord/tenancies" className="hover:text-blue-600 transition-colors">
          Tenancies
        </Link>
        <span>/</span>
        <Link href={`/dashboard/landlord/tenancies/${tenancyId}`} className="hover:text-blue-600 transition-colors">
          {tenancy.room.property.address}
        </Link>
        <span>/</span>
        <Link href={backHref} className="hover:text-blue-600 transition-colors">
          Condition Reports
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Compare</span>
      </div>

      <ConditionComparisonView
        moveInReport={{
          createdAt: moveInReport.createdAt.toISOString(),
          createdByName: moveInReport.createdBy.name ?? 'Unknown',
          status: moveInReport.status,
          photoCount: moveInReport.photos.length,
        }}
        moveOutReport={{
          createdAt: moveOutReport.createdAt.toISOString(),
          createdByName: moveOutReport.createdBy.name ?? 'Unknown',
          status: moveOutReport.status,
          photoCount: moveOutReport.photos.length,
        }}
        comparison={comparison}
        backHref={backHref}
        propertyLabel={propertyLabel}
        tenantName={tenancy.tenant.name ?? 'Tenant'}
      />
    </div>
  )
}
