'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-gray-400 text-xs mt-1">{hint}</p>}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const tenancySchema = z
  .object({
    tenantEmail: z.string().email('Please enter a valid email address'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: z.coerce
      .number()
      .positive('Monthly rent must be greater than 0'),
    depositAmount: z.coerce.number().min(0, 'Deposit must be 0 or more'),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });

type TenancyFormInput = z.input<typeof tenancySchema>;
type TenancyFormOutput = z.output<typeof tenancySchema>;

type TenantLookup =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; name: string; email: string }
  | { status: 'not_found' };

export default function NewTenancyForm({
  roomId,
  defaultRent,
  propertyAddress,
}: {
  roomId: string;
  defaultRent: number;
  propertyAddress: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantLookup, setTenantLookup] = useState<TenantLookup>({
    status: 'idle',
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TenancyFormInput, unknown, TenancyFormOutput>({
    resolver: zodResolver(tenancySchema),
    defaultValues: { monthlyRent: defaultRent },
  });

  const watchedEmail = watch('tenantEmail');

  const handleTenantLookup = async () => {
    if (!watchedEmail?.includes('@')) {
      setTenantLookup({ status: 'not_found' });
      return;
    }
    setTenantLookup({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/tenants/lookup?email=${encodeURIComponent(watchedEmail)}`,
      );
      const data = await res.json();
      if (res.ok && data.tenant) {
        setTenantLookup({
          status: 'found',
          name: data.tenant.name,
          email: data.tenant.email,
        });
      } else {
        setTenantLookup({ status: 'not_found' });
      }
    } catch {
      setTenantLookup({ status: 'not_found' });
    }
  };

  const onSubmit = async (data: TenancyFormOutput) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const response = await fetch('/api/tenancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, roomId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setServerError(result.error || 'Failed to create tenancy');
        return;
      }
      router.push(`/dashboard/landlord/tenancies/${result.id}`);
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const { onChange: emailRhfOnChange, ...emailRestProps } =
    register('tenantEmail');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        Create New Tenancy
      </h1>
      <p className="text-gray-400 text-sm mb-7">
        Link a registered tenant to this room. An invitation will be sent — they
        must accept before you can generate the agreement.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Tenant
          </p>
          <div className="space-y-4">
            <Field
              label="Tenant Email Address"
              error={errors.tenantEmail?.message}
              hint="The tenant must already have a RentalEase account with the Tenant role"
            >
              <div className="flex gap-2">
                <input
                  {...emailRestProps}
                  type="email"
                  placeholder="tenant@example.com"
                  className={inputClass}
                  onChange={(e) => {
                    emailRhfOnChange(e);
                    setTenantLookup({ status: 'idle' });
                  }}
                />
                <button
                  type="button"
                  onClick={handleTenantLookup}
                  disabled={tenantLookup.status === 'loading'}
                  className="shrink-0 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  {tenantLookup.status === 'loading' ? '...' : 'Look up'}
                </button>
              </div>
            </Field>

            {tenantLookup.status === 'found' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-green-600 text-lg">✓</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {tenantLookup.name}
                  </p>
                  <p className="text-xs text-green-600">{tenantLookup.email}</p>
                </div>
              </div>
            )}
            {tenantLookup.status === 'not_found' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-700 font-medium">
                  No tenant account found with this email.
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  Ask your tenant to register on RentalEase first, then try
                  again.
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Tenancy Terms
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" error={errors.startDate?.message}>
                <input
                  {...register('startDate')}
                  type="date"
                  className={inputClass}
                />
              </Field>
              <Field label="End Date" error={errors.endDate?.message}>
                <input
                  {...register('endDate')}
                  type="date"
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Monthly Rent (RM)"
                error={errors.monthlyRent?.message}
              >
                <input
                  {...register('monthlyRent')}
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Security Deposit (RM)"
                error={errors.depositAmount?.message}
                hint="Typically 2–3 months rent in Malaysia"
              >
                <input
                  {...register('depositAmount')}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 3000"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            What happens after you save?
          </p>
          <p className="text-xs text-blue-600 mt-1">
            An invitation will be sent to the tenant. They must accept before
            you can generate the agreement. Status starts as{' '}
            <strong>Invited</strong>.
          </p>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {serverError}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/dashboard/landlord/tenancies"
            className="flex-1 text-center border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {isLoading ? 'Sending Invitation...' : 'Send Tenancy Invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}
