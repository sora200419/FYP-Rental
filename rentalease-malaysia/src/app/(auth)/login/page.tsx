'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/PasswordInput';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const justReset = searchParams.get('reset') === 'true';

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setServerError('Invalid email or password');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <>
      {justRegistered && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium mb-6">
          <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Account created. Please sign in.
        </div>
      )}

      {justReset && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 font-medium mb-6">
          <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Password reset successfully. Please sign in with your new password.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <PasswordInput
            registration={register('password')}
            label="Password"
            placeholder="Your password"
            error={errors.password?.message}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
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
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-5/12 bg-gray-900 flex-col items-center justify-center p-12">
        <span className="text-4xl font-bold text-white tracking-tight">RentalEase</span>
        <p className="text-gray-400 mt-3 text-center text-sm leading-relaxed max-w-xs">
          AI-Assisted Digital Tenancy Platform for Malaysian Residential Rentals
        </p>
        <ul className="mt-10 space-y-3 text-sm text-gray-400 max-w-xs w-full">
          {[
            'AI-powered agreement generation',
            'Blockchain-verified contracts',
            'Bilingual EN / BM support',
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

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <p className="lg:hidden text-2xl font-bold text-gray-900 mb-1">RentalEase</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-8">Welcome back</p>

          <Suspense
            fallback={
              <div className="space-y-5 animate-pulse">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
