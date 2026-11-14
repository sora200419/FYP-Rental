import Link from 'next/link';
import PropertyForm from '@/components/ui/PropertyForm';

export default function NewPropertyPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <Link href="/dashboard/landlord/properties" className="hover:text-[#C49A3C] transition-colors">
          Properties
        </Link>
        <span>/</span>
        <span className="text-white/70 font-medium">Add New Property</span>
      </div>

      <div className="bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)] p-8">
        <h1 className="text-xl font-bold text-white mb-1">Add New Property</h1>
        <p className="text-white/40 text-sm mb-7">
          Enter the property address and type. After saving, you&apos;ll add individual rooms with
          their rent amounts.
        </p>
        <PropertyForm mode="create" />
      </div>
    </div>
  );
}
