import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leazify — Smart Property Management for UAE Landlords',
  description: 'Streamline your property portfolio with Leazify. Manage leases, tenants, invoicing, maintenance, and more — all in one platform built for UAE real estate.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
