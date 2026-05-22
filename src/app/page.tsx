import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Leazify — Complete Leasing Control for Landlords',
  description: 'Leazify brings every leasing milestone — from tenant onboarding and rent escalation to invoices and maintenance — into a single, transparent platform built for landlords.',
  alternates: {
    canonical: 'https://leazify.me',
  },
  openGraph: {
    title: 'Leazify — Complete Leasing Control for Landlords',
    description: 'Complete leasing control for landlords — from first key to final invoice.',
    url: 'https://leazify.me',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/assets/images/app_logo.png',
        width: 1200,
        height: 630,
        alt: 'Leazify - Complete leasing control for landlords',
      },
    ],
  },
};

export default function Page() {
  return <LandingPage />;
}
