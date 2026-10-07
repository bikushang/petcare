import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

export const metadata: Metadata = {
  title: 'Northgate Animal Hospital | Compassionate Veterinary Care in the Bay Area',
  description: 'Northgate Animal Hospital provides comprehensive veterinary care including consultations, surgery, dental, grooming, boarding, and pharmacy services. Fear-free approach. Book your appointment today.',
  keywords: ['veterinary clinic', 'animal hospital', 'pet care', 'vet near me', 'vaccination', 'pet surgery', 'pet grooming', 'pet boarding', 'Northgate', 'Bay Area', 'California'],
  authors: [{ name: 'Northgate Animal Hospital' }],
  creator: 'Northgate Animal Hospital',
  publisher: 'Northgate Animal Hospital',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.northgatevet.com' },
  openGraph: {
    title: 'Northgate Animal Hospital — Compassionate Care for Every Paw',
    description: 'Modern veterinary medicine with a fear-free approach. Serving 500+ pet families across the Bay Area. Book an appointment today.',
    url: 'https://www.northgatevet.com',
    siteName: 'Northgate Animal Hospital',
    locale: 'en_US',
    type: 'website',
    images: [{ url: 'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200', width: 1200, height: 630, alt: 'Veterinarian caring for a pet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Northgate Animal Hospital — Compassionate Care for Every Paw',
    description: 'Modern veterinary medicine with a fear-free approach. Serving 500+ pet families across the Bay Area.',
    creator: '@northgatevet',
    site: '@northgatevet',
    images: ['https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicon-16x16.png' },
    ],
  },
  manifest: '/manifest.json',
  category: 'medical',
};

export const viewport: Viewport = {
  themeColor: '#2d7766',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'VeterinaryCare',
              name: 'Northgate Animal Hospital',
              description: 'Compassionate veterinary care for the Bay Area community.',
              url: 'https://www.northgatevet.com',
              telephone: '+14155550100',
              email: 'reception@northgatevet.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '128 Maple Avenue',
                addressLocality: 'Northgate',
                addressRegion: 'CA',
                postalCode: '94110',
                addressCountry: 'US',
              },
              openingHours: ['Mo-Fr 08:00-18:00', 'Sa 09:00-14:00'],
              priceRange: '$$',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                reviewCount: '487',
              },
            }),
          }}
        />
      </head>
      <body className={plusJakarta.variable}>{children}</body>
    </html>
  );
}
