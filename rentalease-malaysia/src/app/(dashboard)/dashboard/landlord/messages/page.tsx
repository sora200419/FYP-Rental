import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LandlordMessagesClient from '@/components/ui/LandlordMessagesClient';

export default async function LandlordMessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  // Fetch all tenancies with message metadata.
  // The unread count per tenancy tells which conversations have
  // new activity so that can show badges in the sidebar.
  const tenancies = await prisma.tenancy.findMany({
    where: {
      room: { property: { landlordId: session.user.id } },
      status: { in: ['PENDING', 'ACTIVE'] },
    },
    include: {
      room: {
        include: {
          property: { select: { address: true, city: true } },
        },
      },
      tenant: { select: { name: true } },
      // Count unread messages for this landlord in each tenancy
      messages: {
        where: { receiverId: session.user.id, read: false },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Shape the data for the client component.
  const tenancyList = tenancies.map((t) => ({
    id: t.id,
    propertyAddress: t.room.property.address,
    propertyCity: t.room.property.city,
    tenantName: t.tenant.name,
    unreadCount: t.messages.length,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1 text-sm">
          In-platform messaging with your tenants.
        </p>
      </div>

      {tenancyList.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-gray-700 font-semibold text-lg">
            No active tenancies
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Messaging will be available once you have active tenancies.
          </p>
        </div>
      ) : (
        <LandlordMessagesClient
          tenancies={tenancyList}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}
