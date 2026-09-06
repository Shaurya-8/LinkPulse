import { LinkStatePage } from '@/components/ui/LinkStatePage';
import { MousePointerClick } from 'lucide-react';

export default function LimitReachedPage() {
  return (
    <LinkStatePage
      icon={MousePointerClick}
      iconBg="bg-red-100"
      iconColor="text-red-500"
      badge="Click Limit Reached"
      badgeColor="bg-red-100 text-red-700"
      title="Click limit reached"
      description="This link has reached its maximum number of allowed clicks and is no longer active. It may have been a one-time use link or had a usage limit set by its creator."
    />
  );
}
