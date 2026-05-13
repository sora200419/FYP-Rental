'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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

const emailSchema = z.string().email('Please enter a valid email address');

const tenancySchema = z
  .object({
    leasePartyType: z.enum(['INDIVIDUAL', 'CORPORATE']).default('INDIVIDUAL'),
    tenantEmail: z.string().trim().default(''),
    companyName: z.string().trim().default(''),
    companyRegistrationNo: z.string().trim().default(''),
    authorizedSignatoryName: z.string().trim().default(''),
    authorizedSignatoryIC: z.string().trim().default(''),
    authorizedSignatoryRole: z.string().trim().default(''),
    authorizedSignatoryEmail: z.string().trim().default(''),
    occupants: z
      .array(
        z.object({
          name: z.string().trim().default(''),
          icNumber: z.string().trim().default(''),
          phone: z.string().trim().default(''),
          roleLabel: z.string().trim().default(''),
        }),
      )
      .default([]),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    monthlyRent: z.coerce
      .number()
      .positive('Monthly rent must be greater than 0'),
    depositAmount: z.coerce.number().min(0, 'Deposit must be 0 or more'),
  })
  .superRefine((data, ctx) => {
    if (data.leasePartyType === 'INDIVIDUAL') {
      if (!data.tenantEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tenant email is required',
          path: ['tenantEmail'],
        });
      } else if (!emailSchema.safeParse(data.tenantEmail).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid email address',
          path: ['tenantEmail'],
        });
      }
    }

    if (data.leasePartyType === 'CORPORATE') {
      if (!data.companyName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Company name is required',
          path: ['companyName'],
        });
      }

      if (!data.authorizedSignatoryName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Authorized signatory name is required',
          path: ['authorizedSignatoryName'],
        });
      }

      if (!data.authorizedSignatoryEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Authorized signatory email is required',
          path: ['authorizedSignatoryEmail'],
        });
      } else if (!emailSchema.safeParse(data.authorizedSignatoryEmail).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid email address',
          path: ['authorizedSignatoryEmail'],
        });
      }
    }
  })
  .refine(
    (data) => data.startDate >= new Date().toISOString().split('T')[0],
    { message: 'Start date cannot be in the past', path: ['startDate'] },
  )
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
  const today = new Date().toISOString().split('T')[0];
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantLookup, setTenantLookup] = useState<TenantLookup>({
    status: 'idle',
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TenancyFormInput, unknown, TenancyFormOutput>({
    resolver: zodResolver(tenancySchema),
    defaultValues: {
      leasePartyType: 'INDIVIDUAL',
      tenantEmail: '',
      companyName: '',
      companyRegistrationNo: '',
      authorizedSignatoryName: '',
      authorizedSignatoryIC: '',
      authorizedSignatoryRole: '',
      authorizedSignatoryEmail: '',
      occupants: [{ name: '', icNumber: '', phone: '', roleLabel: '' }],
      monthlyRent: defaultRent,
      depositAmount: 0,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'occupants',
  });

  const leasePartyType = watch('leasePartyType');
  const watchedEmail = watch('tenantEmail');

  useEffect(() => {
    if (leasePartyType !== 'INDIVIDUAL') {
      setTenantLookup({ status: 'idle' });
    }
  }, [leasePartyType]);

  const handleTenantLookup = async () => {
    if (leasePartyType !== 'INDIVIDUAL') {
      return;
    }

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
        Create an individual or corporate tenancy for {propertyAddress}. The
        invited lease party must accept before you can generate the agreement.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Lease Party
          </p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['INDIVIDUAL', 'CORPORATE'] as const).map((value) => {
                const checked = leasePartyType === value;
                const label =
                  value === 'INDIVIDUAL' ? 'Individual' : 'Corporate / Employer';
                const description =
                  value === 'INDIVIDUAL'
                    ? 'Invite a registered tenant account directly.'
                    : 'Create the lease under a company and list occupants separately.';

                return (
                  <label
                    key={value}
                    className={`rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      {...register('leasePartyType')}
                      type="radio"
                      value={value}
                      className="sr-only"
                    />
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                  </label>
                );
              })}
            </div>

            {leasePartyType === 'INDIVIDUAL' && (
              <>
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
                    <svg
                      className="w-5 h-5 text-green-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        {tenantLookup.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {tenantLookup.email}
                      </p>
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
              </>
            )}

            {leasePartyType === 'CORPORATE' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Company Name"
                    error={errors.companyName?.message}
                  >
                    <input
                      {...register('companyName')}
                      type="text"
                      placeholder="ABC Manufacturing Sdn. Bhd."
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Company Registration No."
                    error={errors.companyRegistrationNo?.message}
                    hint="Optional"
                  >
                    <input
                      {...register('companyRegistrationNo')}
                      type="text"
                      placeholder="202401012345"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Authorized Signatory Name"
                    error={errors.authorizedSignatoryName?.message}
                  >
                    <input
                      {...register('authorizedSignatoryName')}
                      type="text"
                      placeholder="Person signing for the company"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Authorized Signatory Role"
                    error={errors.authorizedSignatoryRole?.message}
                    hint="Optional"
                  >
                    <input
                      {...register('authorizedSignatoryRole')}
                      type="text"
                      placeholder="HR Manager, Director, etc."
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="Authorized Signatory IC"
                    error={errors.authorizedSignatoryIC?.message}
                    hint="Optional"
                  >
                    <input
                      {...register('authorizedSignatoryIC')}
                      type="text"
                      placeholder="Optional IC / passport number"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Authorized Signatory Email"
                    error={errors.authorizedSignatoryEmail?.message}
                    hint="Required. This must match a registered tenant account so the signatory can receive the legal invitation."
                  >
                    <input
                      {...register('authorizedSignatoryEmail')}
                      type="email"
                      placeholder="signatory@company.com"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Occupant Roster
                      </p>
                      <p className="text-xs text-gray-500">
                        Add the employees or occupants who will stay in this
                        room.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        append({
                          name: '',
                          icNumber: '',
                          phone: '',
                          roleLabel: '',
                        })
                      }
                      className="shrink-0 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Add Occupant
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="rounded-xl border border-gray-200 p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">
                            Occupant {index + 1}
                          </p>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-sm font-medium text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field
                            label="Full Name"
                            error={errors.occupants?.[index]?.name?.message}
                            hint="Leave blank to skip this row"
                          >
                            <input
                              {...register(`occupants.${index}.name`)}
                              type="text"
                              placeholder="Occupant full name"
                              className={inputClass}
                            />
                          </Field>
                          <Field
                            label="Role / Label"
                            error={errors.occupants?.[index]?.roleLabel?.message}
                            hint="Optional"
                          >
                            <input
                              {...register(`occupants.${index}.roleLabel`)}
                              type="text"
                              placeholder="Engineer, Technician, etc."
                              className={inputClass}
                            />
                          </Field>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field
                            label="IC / Passport No."
                            error={errors.occupants?.[index]?.icNumber?.message}
                            hint="Optional"
                          >
                            <input
                              {...register(`occupants.${index}.icNumber`)}
                              type="text"
                              placeholder="Optional IC / passport number"
                              className={inputClass}
                            />
                          </Field>
                          <Field
                            label="Phone Number"
                            error={errors.occupants?.[index]?.phone?.message}
                            hint="Optional"
                          >
                            <input
                              {...register(`occupants.${index}.phone`)}
                              type="text"
                              placeholder="Optional mobile number"
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Tenancy Terms
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Start Date" error={errors.startDate?.message}>
                <input
                  {...register('startDate')}
                  type="date"
                  min={today}
                  className={inputClass}
                />
              </Field>
              <Field label="End Date" error={errors.endDate?.message}>
                <input
                  {...register('endDate')}
                  type="date"
                  min={today}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                hint="Typically 2-3 months rent in Malaysia"
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
            {leasePartyType === 'INDIVIDUAL'
              ? 'An invitation will be sent to the tenant account. They must accept before you can generate the agreement.'
              : 'The corporate tenancy will be created under the company, and the authorized signatory tenant account will receive the legal invitation immediately.'}{' '}
            Status starts as <strong>Invited</strong>.
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
