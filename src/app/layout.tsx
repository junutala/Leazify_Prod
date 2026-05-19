import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new'),
  title: 'PropFlow — Commercial Real Estate Management',
  description: 'PropFlow helps property managers track leases, financials, and maintenance across commercial real estate portfolios from a single dashboard.',
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
    languages: {
      'en': process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
      'ar': process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
    },
  },
  openGraph: {
    title: 'PropFlow — Real Estate Management',
    description: 'Manage leases, financials, and maintenance from one dashboard.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
    siteName: 'PropFlow',
    locale: 'en_US',
    alternateLocale: ['ar_AE'],
    type: 'website',
    images: [
      {
        url: '/assets/images/app_logo.png',
        width: 1200,
        height: 630,
        alt: 'PropFlow - Commercial real estate management platform for property managers and landlords',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropFlow — Real Estate Management',
    description: 'Manage leases, financials, and maintenance from one dashboard.',
    images: ['/assets/images/app_logo.png'],
  },
  icons: {
    icon: [
      { url: '/assets/images/color-1779168809332.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: [{ url: '/assets/images/color-1779168809332.png', type: 'image/png' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'PropFlow',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new'}/assets/images/app_logo.png`,
              description: 'Commercial real estate management platform for property managers, landlords, and service providers.',
              sameAs: [],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'PropFlow — Commercial Real Estate Management',
              description: 'PropFlow helps property managers track leases, financials, and maintenance across commercial real estate portfolios from a single dashboard.',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
              publisher: {
                '@type': 'Organization',
                name: 'PropFlow',
                logo: {
                  '@type': 'ImageObject',
                  url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new'}/assets/images/app_logo.png`,
                },
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PropFlow',
              description: 'Commercial real estate management platform for tracking leases, financials, and maintenance.',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://propflow2839.builtwithrocket.new',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'AED',
              },
            }),
          }}
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fpropflow2839back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.18" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}