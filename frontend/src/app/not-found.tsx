import { LinkStatePage } from '@/components/ui/LinkStatePage';
import { AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <LinkStatePage
      icon={AlertCircle}
      iconBg="bg-blue-100"
      iconColor="text-blue-500"
      badge="404 Not Found"
      badgeColor="bg-blue-100 text-blue-700"
      title="Link not found"
      description="The short link you followed doesn't exist. It may have been deleted, or the URL may be mistyped. Double-check the link and try again."
    />
  );
}
