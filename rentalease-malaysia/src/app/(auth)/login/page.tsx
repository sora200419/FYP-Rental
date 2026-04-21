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

/*
 * The inner form component reads query parameters to detect if the user
 * just arrived from registration. React 19 + Next.js 16 require any
 * component that calls useSearchParams() to be wrapped in a Suspense
 * boundary, otherwise production builds fail with a pre-render error.
 *
 * By isolating the query-param logic into this inner component, we keep
 * the Suspense boundary narrow — only the banner is inside it. The form
 * itself, which doesn't need query params, lives in the outer component
 * and renders without any suspense delay.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

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
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
          ✅ Account created! Please sign in.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <PasswordInput
          registration={register('password')}
          label="Password"
          placeholder="Your password"
          error={errors.password?.message}
        />

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </>
  );
}

/*
 * The outer page component is what Next.js renders for the /login route.
 * It provides the page chrome (header, layout, sign-up link) and wraps
 * the inner form in a Suspense boundary so the build-time pre-render
 * succeeds even though useSearchParams is called inside.
 *
 * The fallback is a minimal skeleton matching the form's dimensions so
 * the page doesn't visually jump when Suspense resolves. In practice the
 * resolution is instant on a real browser because the query params are
 * available immediately on first client render.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">RentalEase</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-5 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-12 bg-gray-100 rounded-lg" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
