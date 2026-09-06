'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { Mail } from 'lucide-react';

import { useAuthStore } from '@/lib/utils';

import { Button, toast } from '@/components/ui';
import { authApi } from '@/lib/api';

const schema = z.object({
  otp: z
    .string()
    .length(6, 'Please enter the 6-digit verification code')
    .regex(/^\d+$/, 'OTP must contain only numbers'),
});

type FormData = z.infer<typeof schema>;

export default function VerifyOtpPage() {
  const router = useRouter();
  const {
    verificationId,
    requestId,
    purpose,
    setVerification,
    setAuth,
  } = useAuthStore((state) => ({
    verificationId: state.verificationId,
    requestId: state.requestId,
    purpose: state.purpose,
    setVerification: state.setVerification,
    setAuth: state.setAuth,
  }));
  const hasVerification =
    verificationId && requestId && purpose;

  const [otp, setOtp] = useState(Array(6).fill(''));
  const [timer, setTimer] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), });

  useEffect(() => {
    setValue('otp', otp.join(''));
  }, [otp, setValue]);

  useEffect(() => {
    if (timer === 0) return;

    const id = setTimeout(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearTimeout(id);
  }, [timer]);

  const { mutate, isPending } = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (res) => {
      console.log(res.data);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      router.push('/');
      toast.success('OTP verified successfully.');
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ??
        'Invalid verification code.';

      setError('otp', { message: msg });
    },
  });


  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const updated = [...otp];
        updated[index] = '';
        setOtp(updated);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();

    if (e.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  };
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startIndex: number
  ) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6 - startIndex);

    if (!pasted) return;

    const updated = [...otp];

    pasted.split("").forEach((digit, i) => {
      updated[startIndex + i] = digit;
    });

    setOtp(updated);

    inputRefs.current[
      Math.min(startIndex + pasted.length, 5)
    ]?.focus();
  };

  const { mutate: resendOtp, isPending: isResending } = useMutation({
    mutationFn: authApi.resendOtp,

    onSuccess: (res) => {
      const { data } = res.data;

      setVerification(data);
      setTimer(60);

      toast.success("OTP sent successfully.");
    },

    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ?? "Unable to send OTP."
      );
    },
  });

  const handleResendOtp = useCallback(() => {
    console.log("resnde")
    if (!hasVerification) {
      toast.error("Verification session expired.");
      console.error("Verification detail missing");
      return;
    }
    console.log("resnde 3")

    resendOtp({
      verificationId,
      requestId,
      purpose,
    });
  }, [verificationId, requestId, purpose, resendOtp]);
  const onSubmit = () => {
    if (!hasVerification) {
      toast.error('Verification session expired.');
      router.replace('/login');
      return;
    }
    mutate({
      verificationId,
      requestId,
      purpose,
      otp: otp.join(''),
    });
  };
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
          <Mail className="h-7 w-7 text-brand-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Verify your email
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          We've sent a 6-digit verification code to
        </p>

        <p className="mt-1 font-medium text-gray-900">
          { }
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div>
          <div className="flex justify-center gap-3">
            {otp.map((digit, index) => (
              <input
                disabled={isPending}
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={digit}
                onChange={(e) =>
                  handleChange(e.target.value, index)
                }
                onKeyDown={(e) =>
                  handleKeyDown(e, index)
                }
                onPaste={(e) => handlePaste(e, index)}
                maxLength={1}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="
                  h-14
                  w-12
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  text-center
                  text-xl
                  font-semibold
                  outline-none
                  transition
                  focus:border-brand-500
                  focus:ring-2
                  focus:ring-brand-100
                "
              />
            ))}
          </div>

          {errors.otp && (
            <p className="mt-3 text-center text-sm text-red-600">
              {errors.otp.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isPending}
          disabled={otp.length < 6 || otp.some((d) => d === '')}
        >
          Verify OTP
        </Button>
      </form>

      <div className="mt-6 text-center">
        {(/**timer > 0 ||*/ isResending) ? (
          <p className="text-sm text-gray-500">
            Resend code in{' '}
            <span className="font-semibold text-brand-600">
              {/* {timer}s */}
            </span>
          </p>
        ) : (
          <button
            onClick={handleResendOtp}
            className="text-sm font-medium text-brand-600 hover:text-brand-900"
          >
            Resend OTP
          </button>
        )}
      </div>

      <div className="mt-8 text-center">
        <Button
          onClick={router.back}
          className="text-sm text-gray-600 hover:text-brand-600"
        >
          ← Back to register
        </Button>
      </div>
    </div>
  );
}

