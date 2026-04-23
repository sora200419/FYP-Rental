import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import TerminateForm from './TerminateForm';

export default async function TerminatePage({
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
      status: 'ACTIVE',
    },
    select: {
      id: true,
      endDate: true,
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
        <span className="text-gray-700 font-medium">Serve Notice</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Serve Notice to Quit</h1>
        <p className="text-gray-500 text-sm mt-1">
          Formally terminate this tenancy with {tenancy.tenant.name}. This action is recorded with a timestamp and cannot be undone.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6">
        <p className="text-red-800 font-semibold text-sm">⚠ This is a legal notice of termination</p>
        <p className="text-red-600 text-xs mt-1 leading-relaxed">
          Ensure you have provided the required notice period as stated in the tenancy agreement before proceeding. The tenancy status will be changed to Terminated immediately.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <TerminateForm tenancyId={id} />
      </div>
    </div>
  );
}
