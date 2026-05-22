import AppLayout from '@/components/AppLayout';

export default function AppPagesLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
