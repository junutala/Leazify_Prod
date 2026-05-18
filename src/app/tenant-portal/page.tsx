'use client';

import AppLayout from '@/components/AppLayout';
import TenantPortalClient from './components/TenantPortalClient';
import { useAuth } from '@/contexts/AuthContext';

export default function TenantPortalPage() {
  const { mimicTarget } = useAuth();
  const mimicPersonId = mimicTarget?.role === 'tenant' ? mimicTarget?.person_id : undefined;

  return (
    <AppLayout>
      <TenantPortalClient mimicPersonId={mimicPersonId} />
    </AppLayout>
  );
}
