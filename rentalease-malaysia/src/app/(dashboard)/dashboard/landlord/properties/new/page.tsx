'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'; // ← back to normal import
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const MALAYSIAN_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'W.P. Kuala Lumpur',
  'W.P. Labuan',
  'W.P. Putrajaya',
];

const PROPERTY_TYPES = [
  'Apartment',
  'Condominium',
  'Terrace House',
  'Semi-Detached House',
  'Bungalow',
  'Studio',
  'Townhouse',
  'Service Apartment',
];

const propertySchema = z.object({
  address: z.string().min(5, 'Please enter a full street address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(1, 'Please select a state'),
  postcode: z.string().regex(/^\d{5}$/, 'Postcode must be exactly 5 digits'),
  type: z.string().min(1, 'Please select a property type'),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(1).max(20),
  rentAmount: z.coerce.number().positive('Rent amount must be greater than 0'),
  description: z.string().optional(),
});

// Explicitly separate input (what the form fields produce — strings from HTML inputs)
// from output (what Zod parses them into — numbers after coercion).
// This is the correct Zod v4 + RHF pattern when coerce is involved.
type PropertyFormInput = z.input<typeof propertySchema>;
type PropertyFormOutput = z.output<typeof propertySchema>;

export default function NewPropertyPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormInput, unknown, PropertyFormOutput>({
    // Three type params: <InputType, Context, OutputType>
    // InputType  = what the form fields contain (strings)
    // Context    = unused, set to unknown
    // OutputType = what onSubmit receives after Zod coerces the values (numbers)
    resolver: zodResolver(propertySchema),
    defaultValues: {
      bedrooms: 3,
      bathrooms: 2,
    },
  });

  // onSubmit now correctly receives PropertyFormOutput — bedrooms/bathrooms/rentAmount
  // are already numbers because Zod coerced them before this function is called
  const onSubmit = async (data: PropertyFormOutput) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || 'Failed to add property');
        return;
      }

      router.push('/dashboard/landlord/properties');
      router.refresh();
    } catch (error) {
      console.error('Add property error:', error);
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({
    label,
    error,
    children,
    hint,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
    hint?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          href="/dashboard/landlord/properties"
          className="hover:text-blue-600 transition-colors"
        >
          Properties
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Add New Property</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Add New Property
        </h1>
        <p className="text-gray-400 text-sm mb-7">
          Fill in the details below. You can add a tenant and generate an
          agreement after saving.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Location
            </p>
            <div className="space-y-4">
              <Field label="Street Address" error={errors.address?.message}>
                <input
                  {...register('address')}
                  placeholder="e.g. No. 12, Jalan Bukit Bintang"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="City" error={errors.city?.message}>
                  <input
                    {...register('city')}
                    placeholder="e.g. Kuala Lumpur"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Postcode"
                  error={errors.postcode?.message}
                  hint="5-digit Malaysian postcode"
                >
                  <input
                    {...register('postcode')}
                    placeholder="e.g. 50450"
                    maxLength={5}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="State" error={errors.state?.message}>
                <select {...register('state')} className={inputClass}>
                  <option value="">Select a state</option>
                  {MALAYSIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Property Details
            </p>
            <div className="space-y-4">
              <Field label="Property Type" error={errors.type?.message}>
                <select {...register('type')} className={inputClass}>
                  <option value="">Select property type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Bedrooms" error={errors.bedrooms?.message}>
                  <input
                    {...register('bedrooms')}
                    type="number"
                    min={0}
                    max={20}
                    className={inputClass}
                  />
                </Field>
                <Field label="Bathrooms" error={errors.bathrooms?.message}>
                  <input
                    {...register('bathrooms')}
                    type="number"
                    min={1}
                    max={20}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Monthly Rent (RM)"
                  error={errors.rentAmount?.message}
                >
                  <input
                    {...register('rentAmount')}
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="e.g. 1500"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Description" error={errors.description?.message}>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Optional — any additional details about the property"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {serverError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard/landlord/properties"
              className="flex-1 text-center border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Saving...' : 'Save Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
