import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import AppChrome from './components/AppChrome';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta' });

export const metadata: Metadata = {
  title: 'Vetnora Demo Clinic | Fictional Veterinary Practice',
  description: 'Fictional demo application for a veterinary practice. This is sample data only and is not a real clinic or healthcare service.',
  keywords: ['fictional demo', 'sample veterinary software', 'demo clinic'],
  authors: [{ name: 'Vetnora Demo' }],
  creator: 'Vetnora Demo',
  publisher: 'Vetnora Demo',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://example.invalid/vetnora-demo' },
  openGraph: {
    title: 'Vetnora Demo Clinic - Fictional Veterinary Practice',
    description: 'Fictional demo content for veterinary practice software. Not a real clinic or verified service.',
    url: 'https://example.invalid/vetnora-demo',
    siteName: 'Vetnora Demo',
    locale: 'en_US',
    type: 'website',
    images: [{ url: 'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200', width: 1200, height: 630, alt: 'Veterinarian caring for a pet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vetnora Demo Clinic - Fictional Veterinary Practice',
    description: 'Fictional demo content for veterinary practice software. Not a real clinic or verified service.',
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
  themeColor: '#4C1D95',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/*
          Apply the saved theme before first paint. Without this the page
          renders with the default violet palette for a frame and then
          snaps to the user's chosen colour / dark mode.
          Kept in sync with themeVarsFor() in app/lib/settings.ts.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
var s=JSON.parse(localStorage.getItem('petcare-pro-settings')||'{}');
var hex=(s.primaryColor||'#4C1D95').replace('#','');
if(hex.length!==6)hex='4C1D95';
var r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
function mix(a){var t=a>0?255:0,k=Math.abs(a);return [Math.round(r+(t-r)*k),Math.round(g+(t-g)*k),Math.round(b+(t-b)*k)].join(' ');}
var th=s.theme||'light';
if(th==='auto')th=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var d=document.documentElement,dark=th==='dark';
d.style.setProperty('--c-plum',r+' '+g+' '+b);
d.style.setProperty('--c-grape',mix(-0.38));
d.style.setProperty('--c-iris',mix(0.26));
d.style.setProperty('--c-lilac',mix(dark?-0.62:0.88));
d.style.setProperty('--c-ink',dark?'237 233 254':'26 13 46');
d.style.setProperty('--c-canvas',dark?'20 12 33':'250 249 253');
d.style.setProperty('--c-line',dark?'54 38 82':'232 227 243');
d.style.setProperty('--c-surface',dark?'30 20 48':'255 255 255');
d.style.setProperty('--app-font-size',{small:'14px',medium:'16px',large:'18px'}[s.fontSize||'medium']||'16px');
d.dataset.theme=th;d.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Vetnora Demo Clinic',
              description: 'Fictional sample data for a veterinary practice application. Not a real clinic or verified service.',
              url: 'https://example.invalid/vetnora-demo',
              telephone: '+12025550100',
              email: 'demo@example.invalid',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '100 Example Avenue',
                addressLocality: 'Example City',
                addressRegion: 'ZZ',
                postalCode: '00000',
                addressCountry: 'ZZ',
              },
            }),
          }}
        />
      </head>
      <body className={plusJakarta.variable}>
        <AppChrome />
        {children}
      </body>
    </html>
  );
}
