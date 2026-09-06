import Link from 'next/link';
import { Link2 } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-purple-700 p-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Link2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">LinkPulse</span>
        </Link>

        <div>
          <blockquote className="text-xl font-medium leading-relaxed text-white/90">
            "LinkPulse transformed how our marketing team manages campaigns. The analytics and
            geo-routing features alone saved us hours every week."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Sarah Chen</p>
              <p className="text-xs text-white/60">Head of Growth, TechCorp</p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 text-white/60 text-sm">
          <span>2.4M+ links</span>
          <span>18B+ clicks</span>
          <span>99.9% uptime</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Link2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">LinkPulse</span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
