import { LinkStatePage } from '@/components/ui/LinkStatePage';
import { Clock } from 'lucide-react';

export default function ExpiredPage() {
  return (
    <LinkStatePage
      icon={Clock}
      iconBg="bg-amber-100"
      iconColor="text-amber-500"
      badge="Link Expired"
      badgeColor="bg-amber-100 text-amber-700"
      title="This link has expired"
      description="The short link you followed was only valid until a certain date and is no longer active. The creator may have set an expiration time or click limit."
    />
  );
}
