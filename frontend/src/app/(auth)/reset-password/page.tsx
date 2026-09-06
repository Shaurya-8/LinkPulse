'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { Button, Input, toast } from '@/components/ui';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must include uppercase')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type ForgotForm = z.infer<typeof forgotSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Forgot password form
  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });
  const forgotMutation = useMutation({
    mutationFn: (data: ForgotForm) => authApi.forgotPassword(data.email),
    onSuccess: () => setEmailSent(true),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed. Try again.';
      forgotForm.setError('root', { message: msg });
    },
  });

  // Reset password form
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });
  const resetMutation = useMutation({
    mutationFn: (data: ResetForm) =>
      authApi.resetPassword({ token: token!, ...data }),
    onSuccess: () => {
      setResetDone(true);
      setTimeout(() => router.push('/login'), 3000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Reset failed.';
      resetForm.setError('root', { message: msg });
    },
  });

  // ── Has token: show reset form ──
  if (token) {
    if (resetDone) {
      return (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Password reset!</h2>
          <p className="mt-3 text-gray-600">Redirecting you to the login page…</p>
        </div>
      );
    }

    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="mt-2 text-sm text-gray-600">Choose a strong password for your account.</p>
        </div>
        <form onSubmit={resetForm.handleSubmit((d) => resetMutation.mutate(d))} className="space-y-4" noValidate>
          {resetForm.formState.errors.root && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {resetForm.formState.errors.root.message}
            </div>
          )}
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={resetForm.formState.errors.password?.message}
            {...resetForm.register('password')}
          />
          <Input
            label="Confirm new password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={resetForm.formState.errors.confirmPassword?.message}
            {...resetForm.register('confirmPassword')}
          />
          <Button type="submit" className="w-full" size="lg" loading={resetMutation.isPending}>
            Reset password
          </Button>
        </form>
      </div>
    );
  }

  // ── No token: show forgot-password form ──
  if (emailSent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Check your inbox</h2>
        <p className="mt-3 text-gray-600">
          If an account with that email exists, we've sent a password reset link. Check your spam folder too.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Forgot your password?</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter your email and we'll send you a reset link.
        </p>
      </div>
      <form onSubmit={forgotForm.handleSubmit((d) => forgotMutation.mutate(d))} className="space-y-4" noValidate>
        {forgotForm.formState.errors.root && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {forgotForm.formState.errors.root.message}
          </div>
        )}
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          leftIcon={<Mail className="h-4 w-4" />}
          error={forgotForm.formState.errors.email?.message}
          {...forgotForm.register('email')}
        />
        <Button type="submit" className="w-full" size="lg" loading={forgotMutation.isPending}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
