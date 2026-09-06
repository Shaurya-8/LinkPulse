'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/utils';
import { Button, Input, toast } from '@/components/ui';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { AxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success('Welcome back!');
      router.push('/');
    },
    onError: (err) => {
      const error = err as AxiosError<{
        message?: string | string[];
        error?: string;
      }>;

      const data = error.response?.data;

      const msg = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message ??
        data?.error ??
        'Login failed. Please try again.';

      console.log(data);

      if (msg.toLowerCase().includes('password')) {
        setError('password', { message: msg });
      } else if (msg.toLowerCase().includes('email')) {
        setError('email', { message: msg });
      } else {
        setError('root', { message: msg });
      }
    },
  });


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
            Sign up free
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4" noValidate>
        {errors.root && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {errors.root.message}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              {...register('rememberMe')}
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <Link href="/reset-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isPending}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
