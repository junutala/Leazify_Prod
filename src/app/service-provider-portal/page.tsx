'use client';

import AppLayout from '@/components/AppLayout';
import ServiceProviderPortalClient from './components/ServiceProviderPortalClient';
import { useAuth } from '@/contexts/AuthContext';

export default function ServiceProviderPortalPage() {
  const { mimicTarget } = useAuth();
  const mimicProviderId = mimicTarget?.role === 'service_provider' ? mimicTarget?.provider_id : undefined;

  return (
    <AppLayout>
      <ServiceProviderPortalClient mimicProviderId={mimicProviderId} />
    </AppLayout>
  );
}
