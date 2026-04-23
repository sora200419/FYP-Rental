import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import RenewForm from './RenewForm';

export default async function RenewPage({
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
      status: { in: ['ACTIVE', 'EXPIRED'] },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      monthlyRent: true,
      depositAmount: true,
      tenant: { select: { name: true } },
      room: { select: { label: true, property: { select: { address: true } } } },
    },
  });

  if (!tenancy) notFound();

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/landlord/tenancies" className="hover:text-blue-600 transition-colors">
          Tenancies
        </Link>
        <span>/</span>
        <Link href={`/dashboard/landlord/tenancies/${id}`} className="hover:text-blue-600 transition-colors">
          {tenancy.room.property.address} — {tenancy.room.label}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Renew</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Renew Tenancy</h1>
        <p className="text-gray-500 text-sm mt-1">
          Create a new tenancy for {tenancy.tenant.name} in the same room. The tenant will receive an invitation to accept the renewed terms.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <RenewForm
          tenancyId={id}
          currentEndDate={tenancy.endDate.toISOString()}
          currentMonthlyRent={Number(tenancy.monthlyRent)}
          currentDepositAmount={Number(tenancy.depositAmount)}
        />
      </div>
    </div>
  );
}
