import { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import AuditLogClient from './components/AuditLogClient';

export const metadata: Metadata = {
  title: 'Audit Log | PropFlow',
  description: 'Track all entity changes with timestamps, users, and before/after values',
};

export default function AuditLogPage() {
  return (
    <AppLayout>
      <AuditLogClient />
    </AppLayout>
  );
}
