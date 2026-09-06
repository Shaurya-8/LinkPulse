import Link from 'next/link';
import { Link2, LucideIcon } from 'lucide-react';

interface LinkStatePage {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
}

export function LinkStatePage({
  icon: Icon, iconColor, iconBg, title, description, badge, badgeColor,
}: LinkStatePage) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-10">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Link2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">LinkPulse</span>
        </Link>

        <div className="card shadow-lg">
          {badge && (
            <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-4 ${badgeColor}`}>
              {badge}
            </div>
          )}
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${iconBg}`}>
            <Icon className={`h-8 w-8 ${iconColor}`} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{description}</p>

          <Link href="/" className="btn-primary w-full justify-center">
            Create your own short link
          </Link>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Short links powered by <span className="font-semibold text-brand-600">LinkPulse</span>
        </p>
      </div>
    </div>
  );
}
