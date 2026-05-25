import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DataRefreshProvider } from '@/contexts/DataRefreshContext';
import { Analytics } from '@vercel/analytics/next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export const metadata: Metadata = {
  metadataBase: new URL('https://leazify.me'),
  title: 'Leazify - Rental Applications for Retail, Commercial & Malls',
  description: 'Leazify helps property managers track leases, financials, and maintenance across commercial real estate portfolios from a single dashboard.',
  alternates: {
    canonical: 'https://leazify.me',
    languages: {
      'en': 'https://leazify.me',
      'ar': 'https://leazify.me'
    }
  },
  openGraph: {
    title: 'Leazify - Rental Applications for Retail, Commercial & Malls',
    description: 'Manage leases, financials, and maintenance from one dashboard.',
    url: 'https://leazify.me',
    siteName: 'Leazify',
    locale: 'en_US',
    alternateLocale: ['ar_AE'],
    type: 'website',
    images: [
    {
      url: '/assets/images/app_logo.png',
      width: 1200,
      height: 630,
      alt: 'Leazify - Rental application platform for retail, commercial buildings and malls',
      type: 'image/png'
    }]

  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leazify - Rental Applications for Retail, Commercial & Malls',
    description: 'Manage leases, financials, and maintenance from one dashboard.',
    images: ['/assets/images/app_logo.png']
  },
  icons: {
    icon: [
    { url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/assets/images/app_logo.png', type: 'image/png' }]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Leazify',
              url: 'https://leazify.me',
              logo: "https://www.leazify.me/assets/images/app_logo.png",
              description: 'Rental application platform for retail, commercial buildings, malls, and residential properties.',
              sameAs: []
            })
          }} />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebPage',
              name: 'Leazify - Rental Applications for Retail, Commercial & Malls',
              description: 'Leazify helps property managers track leases, financials, and maintenance across commercial real estate portfolios from a single dashboard.',
              url: 'https://leazify.me',
              publisher: {
                '@type': 'Organization',
                name: 'Leazify',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://leazify.me/assets/images/app_logo.png'
                }
              }
            })
          }} />
        
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Leazify',
              description: 'Rental application platform for retail, commercial buildings, malls, and residential properties.',
              url: 'https://leazify.me',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'AED'
              }
            })
          }} />

       </head>
      <body>
        <AuthProvider>
          <LanguageProvider>
            <DataRefreshProvider>
              {children}
            </DataRefreshProvider>
          </LanguageProvider>
        </AuthProvider>
        <Toaster position="bottom-right" richColors closeButton />
        <Analytics />
      </body>
    </html>);

}
