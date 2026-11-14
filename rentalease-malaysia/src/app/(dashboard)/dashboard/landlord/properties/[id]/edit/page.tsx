import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PropertyForm from '@/components/ui/PropertyForm';

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id } = await params;
  const property = await prisma.property.findFirst({
    where: { id, landlordId: session.user.id },
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      postcode: true,
      type: true,
      description: true,
      isVerified: true,
      rejectedReason: true,
      _count: {
        select: {
          rooms: { where: { tenancies: { some: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } } } } },
        },
      },
    },
  });
  if (!property) notFound();

  const locationLocked = property._count.rooms > 0;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <Link href="/dashboard/landlord/properties" className="hover:text-[#C49A3C] transition-colors">
          Properties
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/landlord/properties/${property.id}`}
          className="hover:text-[#C49A3C] transition-colors"
        >
          {property.address}
        </Link>
        <span>/</span>
        <span className="text-white/70 font-medium">Edit</span>
      </div>

      <div className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-8">
        <h1 className="text-xl font-bold text-white mb-1">Edit Property</h1>
        <p className="text-white/40 text-sm mb-5">
          {property.rejectedReason
            ? 'Saving will send the listing back to an admin for review.'
            : property.isVerified
              ? 'Changing the address, city, state or postcode sends the listing back for admin review. Type and description changes keep it verified.'
              : 'This listing is waiting for admin review.'}
        </p>

        {property.rejectedReason && (
          <div className="mb-6 rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#f87171]">
            <p className="font-semibold">Admin feedback</p>
            <p className="mt-1 text-xs">{property.rejectedReason}</p>
          </div>
        )}

        <PropertyForm
          mode="edit"
          propertyId={property.id}
          locationLocked={locationLocked}
          defaultValues={{
            address: property.address,
            city: property.city,
            state: property.state,
            postcode: property.postcode,
            type: property.type,
            description: property.description ?? '',
          }}
        />
      </div>
    </div>
  );
}
