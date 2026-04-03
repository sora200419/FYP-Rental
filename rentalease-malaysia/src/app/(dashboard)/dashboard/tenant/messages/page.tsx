import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import MessageThread from '@/components/ui/MessageThread';

export default async function TenantMessagesPage() {
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Communication with your landlord for your tenancy.
        </p>
      </div>

      {!tenancy ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-gray-700 font-semibold text-lg">
            No active tenancy
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Messaging will be available once your landlord links you to a
            tenancy.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl">
          <div className="mb-3 px-1">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{tenancy.property.address}</span>
              {' · '}Landlord: {tenancy.property.landlord.name}
            </p>
          </div>
          {/* MessageThread is a client component — it handles all
              the interactive state, polling, and sending logic */}
          <MessageThread
            tenancyId={tenancy.id}
            currentUserId={session.user.id}
            otherPartyName={tenancy.property.landlord.name}
          />
        </div>
      )}
    </div>
  );
}
