'use client';

import { useState, useRef } from 'react';
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
      .regex(IC_REGEX, 'Invalid format — e.g. 900101-14-5678'),
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
  const [icFile, setIcFile] = useState<File | null>(null);
  const [icPreview, setIcPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'TENANT' },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setIcFile(file);
    if (file && file.type.startsWith('image/')) {
      setIcPreview(URL.createObjectURL(file));
    } else {
      setIcPreview(null);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!icFile) {
      setServerError('Please upload a photo of your IC.');
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      const { confirmPassword: _, ...fields } = data;

      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== '') formData.append(key, value);
      });
      formData.append('icPhoto', icFile);

      const response = await fetch('/api/register', {
        method: 'POST',
        body: formData,
      });

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">RentalEase</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Ahmad bin Abdullah"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="e.g. 012-3456789"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* IC Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Malaysian IC Number <span className="text-red-500">*</span>
            </label>
            <input
              {...register('icNumber')}
              type="text"
              placeholder="e.g. 900101-14-5678"
              maxLength={14}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.icNumber ? (
              <p className="text-red-500 text-xs mt-1">{errors.icNumber.message}</p>
            ) : (
              <p className="text-gray-400 text-xs mt-1">12 digits, dashes optional (YYMMDD-SS-####)</p>
            )}
          </div>

          {/* IC Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IC Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Upload a clear photo or scan of your MyKad — required for identity verification.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                icFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {icPreview ? (
                <img src={icPreview} alt="IC preview" className="max-h-28 mx-auto rounded object-contain" />
              ) : icFile ? (
                <p className="text-sm text-green-700 font-medium">{icFile.name}</p>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Click to upload IC photo</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP, or PDF · max 10 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {!icFile && serverError?.includes('IC') && (
              <p className="text-red-500 text-xs mt-1">Please upload your IC photo.</p>
            )}
          </div>

          {/* Password */}
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

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative flex cursor-pointer">
                <input {...register('role')} type="radio" value="TENANT" className="sr-only peer" />
                <div className="w-full text-center py-3 rounded-lg border-2 border-gray-200 text-sm font-medium text-gray-600 peer-checked:border-blue-500 peer-checked:text-blue-600 peer-checked:bg-blue-50 transition-all">
                  Tenant
                </div>
              </label>
              <label className="relative flex cursor-pointer">
                <input {...register('role')} type="radio" value="LANDLORD" className="sr-only peer" />
                <div className="w-full text-center py-3 rounded-lg border-2 border-gray-200 text-sm font-medium text-gray-600 peer-checked:border-blue-500 peer-checked:text-blue-600 peer-checked:bg-blue-50 transition-all">
                  Landlord
                </div>
              </label>
            </div>
          </div>

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
            {isLoading ? 'Creating account…' : 'Create Account'}
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
  );
}
