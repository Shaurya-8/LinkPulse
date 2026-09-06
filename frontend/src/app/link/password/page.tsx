'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Lock, Eye, EyeOff, Link2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export default function PasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const shortCode = params.get('code') ?? '';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      axios.post(`${API_URL}/api/redirect/verify-password`, { shortCode, password }),
    onSuccess: (res) => {
      const redirectUrl = res.data?.redirectUrl;
      if (redirectUrl) window.location.href = redirectUrl;
      else router.push(`/${shortCode}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Incorrect password. Please try again.');
      setPassword('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) { setError('Please enter the password.'); return; }
    setError('');
    mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
              <Link2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LinkPulse</span>
          </div>
        </div>

        {/* Card */}
        <div className="card shadow-lg">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
              <Lock className="h-7 w-7 text-brand-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Password Required</h1>
            <p className="mt-2 text-sm text-gray-500">
              This link is protected. Enter the password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
              error={error}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Button type="submit" className="w-full" size="lg" loading={isPending}>
              Unlock & Continue
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            You will be redirected once the password is verified.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-brand-600">LinkSnap</span>
        </p>
      </div>
    </div>
  );
}
