import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import NewTenancyForm from './NewTenancyForm';
import Link from 'next/link';

export default async function NewTenancyPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { roomId } = await searchParams;

  if (!roomId) {
    return (
      <div className="max-w-2xl">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="font-semibold text-amber-900">No room selected</p>
          <p className="text-sm text-amber-700 mt-1">
            Please go to a property, select an available room, and click
            &ldquo;Create Tenancy&rdquo; from there.
          </p>
          <Link
            href="/dashboard/landlord/properties"
            className="inline-block mt-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Go to Properties
          </Link>
        </div>
      </div>
    );
  }

  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      property: { landlordId: session.user.id },
    },
    include: {
      property: {
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          type: true,
        },
      },
    },
  });

  if (!room) {
    return (
      <div className="max-w-2xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="font-semibold text-red-900">Room not found</p>
          <p className="text-sm text-red-700 mt-1">
            This room does not exist or does not belong to your account.
          </p>
          <Link
            href="/dashboard/landlord/properties"
            className="inline-block mt-4 text-sm text-red-600 hover:underline"
          >
            ← Back to Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          href="/dashboard/landlord/tenancies"
          className="hover:text-blue-600 transition-colors"
        >
          Tenancies
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Create New Tenancy</span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-5">
        <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold mb-1">
          Creating tenancy for
        </p>
        <p className="font-semibold text-blue-900">{room.label}</p>
        <p className="text-sm text-blue-700 mt-0.5">
          {room.property.address}, {room.property.city} — {room.property.type}
        </p>
        <p className="text-xs text-blue-500 mt-1">
          Default rent: RM{' '}
          {Number(room.rentAmount).toLocaleString('en-MY', {
            minimumFractionDigits: 2,
          })}
          /month
        </p>
        <Link
          href={`/dashboard/landlord/properties/${room.property.id}`}
          className="text-xs text-blue-600 hover:underline mt-2 inline-block"
        >
          ← Change room
        </Link>
      </div>

      <NewTenancyForm
        roomId={roomId}
        defaultRent={Number(room.rentAmount)}
        propertyAddress={`${room.property.address}, ${room.property.city}`}
      />
    </div>
  );
}
