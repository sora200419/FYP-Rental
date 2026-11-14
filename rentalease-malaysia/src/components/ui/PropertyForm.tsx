'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MALAYSIAN_STATES,
  PROPERTY_TYPES,
  propertySchema,
  type PropertyFormInput,
  type PropertyFormValues,
} from '@/lib/propertySchema';

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/70 mb-1">{label}</label>
      {children}
      {hint && !error && <p className="text-white/40 text-xs mt-1">{hint}</p>}
      {error && <p className="text-[#f87171] text-xs mt-1">{error}</p>}
    </div>
  );
}

type Props =
  | { mode: 'create' }
  | {
      mode: 'edit';
      propertyId: string;
      defaultValues: PropertyFormValues;
      /** Location can't change while a tenancy is open on any room. */
      locationLocked: boolean;
    };

export default function PropertyForm(props: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = props.mode === 'edit';
  const locationLocked = isEdit && props.locationLocked;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormInput, unknown, PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: isEdit ? props.defaultValues : undefined,
  });

  const onSubmit = async (data: PropertyFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const response = await fetch(
        isEdit ? `/api/properties/${props.propertyId}` : '/api/properties',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setServerError(result?.error || 'Failed to save property');
        return;
      }
      const id = isEdit ? props.propertyId : result.property.id;
      router.push(`/dashboard/landlord/properties/${id}`);
      router.refresh();
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[rgba(196,154,60,0.5)] focus:outline-none focus:ring-0 transition-colors disabled:opacity-50';
  const cancelHref = isEdit
    ? `/dashboard/landlord/properties/${props.propertyId}`
    : '/dashboard/landlord/properties';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Location</p>
        {locationLocked && (
          <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
            The address can&apos;t be changed while a room has an active or pending tenancy.
          </p>
        )}
        <div className="space-y-4">
          <Field label="Street Address" error={errors.address?.message}>
            <input
              {...register('address')}
              readOnly={locationLocked}
              placeholder="e.g. No. 12, Jalan Bukit Bintang"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" error={errors.city?.message}>
              <input
                {...register('city')}
                readOnly={locationLocked}
                placeholder="e.g. Kuala Lumpur"
                className={inputClass}
              />
            </Field>
            <Field label="Postcode" error={errors.postcode?.message} hint="5-digit Malaysian postcode">
              <input
                {...register('postcode')}
                readOnly={locationLocked}
                placeholder="e.g. 50450"
                maxLength={5}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="State" error={errors.state?.message}>
            {/* A read-only <select> isn't a thing; when locked, show the value as text
                (the hidden input keeps it in the submitted form). */}
            {locationLocked ? (
              <>
                <input type="hidden" {...register('state')} />
                <input
                  value={props.mode === 'edit' ? props.defaultValues.state : ''}
                  readOnly
                  className={inputClass}
                />
              </>
            ) : (
              <select {...register('state')} className={`${inputClass} bg-[#1C2740]`}>
                <option value="">Select a state</option>
                {MALAYSIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
          Property Details
        </p>
        <div className="space-y-4">
          <Field label="Property Type" error={errors.type?.message}>
            <select {...register('type')} className={`${inputClass} bg-[#1C2740]`}>
              <option value="">Select property type</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description (optional)" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Any additional details"
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>
      </div>

      {!isEdit && (
        <div className="bg-[rgba(196,154,60,0.06)] border border-[rgba(196,154,60,0.2)] rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-[#C49A3C]">What happens after you save?</p>
          <p className="text-xs text-[#C49A3C] mt-1">
            You&apos;ll be taken to the property detail page where you can add rooms (e.g.
            &ldquo;Entire Unit&rdquo;, &ldquo;Master Room&rdquo;) with individual rent amounts.
          </p>
        </div>
      )}

      {serverError && (
        <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.25)] text-[#f87171] text-sm rounded-lg px-4 py-3">
          {serverError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Link
          href={cancelHref}
          className="flex-1 text-center border border-white/10 text-white/60 hover:bg-white/5 font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] hover:opacity-90 disabled:opacity-50 text-[#1C2740] font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Property'}
        </button>
      </div>
    </form>
  );
}
