'use client';

import { useState } from 'react';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Button, Input, toast } from '@/components/ui';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/lib/utils';

const schema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().max(50).optional(),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type FormData = z.infer<typeof schema>;

const passwordChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const setVerification = useAuthStore((s) => s.setVerification);
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const password = watch('password', '');

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      const { data } = res.data;
      setVerification(data);
      setRegistered(true);
      router.push('/verify-otp');
    },
    onError: (err) => {
      if (err instanceof AxiosError) {
        const data = err.response?.data;

        const msg =
          data?.message ??
          data?.error ??
          "Registration failed.";

        if (msg.toLowerCase().includes("email")) {
          setError("email", { message: msg });
        } else {
          setError("root", { message: msg });
        }
      }
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4" noValidate>
        {errors.root && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            placeholder="Jane"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            placeholder="Doe"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
          {password && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {passwordChecks.map((check) => (
                <div key={check.label} className={`flex items-center gap-1.5 text-xs ${check.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                  <CheckCircle2 className="h-3 w-3" />
                  {check.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" size="lg" loading={isPending}>
          Create account
        </Button>

        <p className="text-center text-xs text-gray-500">
          By registering, you agree to our{' '}
          <Link href="/terms" className="text-brand-600 hover:underline">Terms</Link> and{' '}
          <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
        </p>
      </form>
    </div>
  );
}
