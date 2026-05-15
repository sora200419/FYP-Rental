'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/PasswordInput';

const IC_REGEX = /^\d{6}-?\d{2}-?\d{4}$/;

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['LANDLORD', 'TENANT']),
    phone: z.string().optional(),
    icNumber: z
      .string()
      .min(1, 'IC number is required')
      .regex(IC_REGEX, 'Invalid format - e.g. 900101-14-5678'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'TENANT' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const { confirmPassword: _, ...fields } = data;
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== '') formData.append(key, value);
      });

      const response = await fetch('/api/register', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || 'Registration failed');
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-5/12 bg-gray-900 flex-col items-center justify-center p-12">
        <span className="text-4xl font-bold tracking-tight text-white">RentalEase</span>
        <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-gray-400">
          A guided tenancy workspace for Malaysian rentals, from invitation to agreement, payment, and handover records.
        </p>
        <ul className="mt-10 space-y-3 text-sm text-gray-400 max-w-xs w-full">
          {[
            'AI-assisted tenancy agreement review',
            'Identity and property verification workflows',
            'Payment proof and deposit records',
            'Tenant-landlord messages in context',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <p className="lg:hidden text-2xl font-bold text-gray-900 mb-1">RentalEase</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create account</h2>
          <p className="text-sm text-gray-500 mb-8">Join RentalEase today</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                {...register('name')}
                type="text"
                placeholder="e.g. Ahmad bin Abdullah"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="e.g. 012-3456789"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Malaysian IC Number <span className="text-red-500">*</span>
              </label>
              <input
                {...register('icNumber')}
                type="text"
                placeholder="e.g. 900101-14-5678"
                maxLength={14}
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
              {errors.icNumber ? (
                <p className="text-xs text-red-500 mt-1">{errors.icNumber.message}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">12 digits, dashes optional (YYMMDD-SS-####)</p>
              )}
            </div>

            <PasswordInput
              registration={register('password')}
              label="Password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
            />
            <PasswordInput
              registration={register('confirmPassword')}
              label="Confirm Password"
              placeholder="Re-enter your password"
              error={errors.confirmPassword?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {(['TENANT', 'LANDLORD'] as const).map((r) => (
                  <label key={r} className="relative flex cursor-pointer">
                    <input {...register('role')} type="radio" value={r} className="sr-only peer" />
                    <div className="w-full text-center py-2.5 rounded-lg border-2 border-gray-200 text-sm font-medium text-gray-600 peer-checked:border-blue-500 peer-checked:text-blue-600 peer-checked:bg-blue-50 transition-all">
                      {r === 'TENANT' ? 'Tenant' : 'Landlord'}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {serverError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
