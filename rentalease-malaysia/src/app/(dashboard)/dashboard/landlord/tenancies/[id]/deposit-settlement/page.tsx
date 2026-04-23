import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import DepositSettlementClient from './DepositSettlementClient';

export default async function DepositSettlementPage({
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
      status: { in: ['EXPIRED', 'TERMINATED', 'ACTIVE'] },
    },
    include: {
      tenant: { select: { name: true, email: true } },
      room: { include: { property: { select: { address: true } } } },
      depositRefund: {
        include: {
          deductions: { orderBy: { createdAt: 'asc' } },
        },
      },
      conditionReports: {
        where: { type: 'MOVE_OUT' },
        include: {
          photos: { select: { id: true, room: true, imageUrl: true } },
        },
      },
    },
  });

  if (!tenancy) notFound();

  const moveOutReport = tenancy.conditionReports[0] ?? null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/landlord/tenancies" className="hover:text-blue-600 transition-colors">
          Tenancies
        </Link>
        <span>/</span>
        <Link href={`/dashboard/landlord/tenancies/${id}`} className="hover:text-blue-600 transition-colors">
          {tenancy.room.property.address} — {tenancy.room.label}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Deposit Settlement</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deposit Settlement</h1>
        <p className="text-gray-500 text-sm mt-1">
          Security deposit: RM {Number(tenancy.depositAmount).toLocaleString('en-MY', { minimumFractionDigits: 2 })} · Tenant: {tenancy.tenant.name}
        </p>
      </div>

      <DepositSettlementClient
        tenancyId={id}
        tenantName={tenancy.tenant.name}
        depositAmount={Number(tenancy.depositAmount)}
        existingRefund={tenancy.depositRefund ? {
          id: tenancy.depositRefund.id,
          status: tenancy.depositRefund.status,
          originalAmount: Number(tenancy.depositRefund.originalAmount),
          refundAmount: Number(tenancy.depositRefund.refundAmount),
          paidAt: tenancy.depositRefund.paidAt?.toISOString() ?? null,
          paidProofUrl: tenancy.depositRefund.paidProofUrl,
          deductions: tenancy.depositRefund.deductions.map((d) => ({
            id: d.id,
            reason: d.reason,
            amount: Number(d.amount),
            status: d.status,
            tenantDisputeNote: d.tenantDisputeNote,
          })),
        } : null}
        moveOutPhotos={moveOutReport?.photos.map((p) => ({ id: p.id, area: p.room, imageUrl: p.imageUrl })) ?? []}
      />
    </div>
  );
}
