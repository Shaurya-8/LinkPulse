import { LinkStatePage } from '@/components/ui/LinkStatePage';
import { Power } from 'lucide-react';

export default function InactivePage() {
  return (
    <LinkStatePage
      icon={Power}
      iconBg="bg-gray-100"
      iconColor="text-gray-400"
      badge="Link Inactive"
      badgeColor="bg-gray-100 text-gray-600"
      title="This link is inactive"
      description="The short link you followed has been disabled by its creator. If you think this is a mistake, please contact the person who shared the link with you."
    />
  );
}
