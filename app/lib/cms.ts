'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, saveConfig } from './api';

const CMS_KEY = 'petcare-pro-cms';
export const CMS_CONFIG_KEY = 'cms-content';

export type CmsContent = {
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    heroImage: string;
  };
  services: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: { id: string; icon: string; title: string; description: string }[];
  };
  about: {
    sectionTitle: string;
    paragraph1: string;
    paragraph2: string;
    stats: { id: string; label: string; value: string }[];
    aboutImage: string;
  };
  testimonials: {
    sectionTitle: string;
    sectionSubtitle: string;
    items: { id: string; name: string; pet: string; text: string; rating: number }[];
  };
  contact: {
    sectionTitle: string;
    phone: string;
    email: string;
    address: string;
    hours: string;
    mapImage: string;
  };
  footer: {
    tagline: string;
    copyright: string;
    socialLinks: { id: string; platform: string; url: string }[];
  };
  nav: {
    links: { id: string; label: string; url: string }[];
  };
};

// Fictional demo content only. Replace all clinic details and claims before production use.
const defaultContent: CmsContent = {
  hero: {
    badge: 'Fictional demo content - sample data only',
    title: 'Compassionate care for every paw, claw, and feather',
    subtitle: 'Vetnora Animal Hospital combines modern medicine with a warm, fear-free approach — so your pet feels safe and you feel informed every step of the way.',
    ctaPrimary: 'Book an appointment',
    ctaSecondary: 'Meet our team',
    heroImage: 'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  services: {
    sectionTitle: 'Our services',
    sectionSubtitle: 'Comprehensive veterinary care under one roof — from routine check-ups to complex surgeries.',
    items: [
      { id: 'svc-1', icon: 'Stethoscope', title: 'General Consultations', description: 'Thorough health exams with personalised treatment plans for pets of all ages.' },
      { id: 'svc-2', icon: 'Syringe', title: 'Vaccinations', description: 'Core and lifestyle vaccines with automated reminder schedules.' },
      { id: 'svc-3', icon: 'Stethoscope', title: 'Surgery', description: 'Soft-tissue and orthopaedic surgery with modern anaesthesia monitoring.' },
      { id: 'svc-4', icon: 'FlaskConical', title: 'Laboratory & Diagnostics', description: 'In-house blood work, urinalysis, and rapid result turnaround.' },
      { id: 'svc-5', icon: 'Pill', title: 'Pharmacy', description: 'Full-service dispensing with refill tracking and interaction checks.' },
      { id: 'svc-6', icon: 'Scissors', title: 'Grooming', description: 'Breed-specific grooming with gentle, stress-reduced handling.' },
      { id: 'svc-7', icon: 'Hotel', title: 'Boarding', description: 'Comfortable overnight stays with feeding and medication schedules.' },
      { id: 'svc-8', icon: 'PawPrint', title: 'Dental Care', description: 'Cleanings, extractions, and oral health assessments.' },
    ],
  },
  about: {
    sectionTitle: 'About our clinic',
    paragraph1: 'Vetnora is a fictional sample clinic used to demonstrate veterinary practice software. All names, locations, services, and operational claims in this content are synthetic.',
    paragraph2: 'This demo contains placeholder workflows and sample records only. It does not represent a real provider, patient population, or available service.',
    stats: [
      { id: 'stat-1', label: 'Sample pets', value: '0' },
      { id: 'stat-2', label: 'Real years of service', value: '0' },
      { id: 'stat-3', label: 'Real staff', value: '0' },
      { id: 'stat-4', label: 'Real branches', value: '0' },
    ],
    aboutImage: 'https://images.pexels.com/photos/33394308/pexels-photo-33394308.jpeg',
  },
  testimonials: {
    sectionTitle: 'What pet families say',
    sectionSubtitle: 'Fictional sample testimonials for interface demonstration only.',
    items: [
      { id: 'tst-1', name: 'Eleanor Hayes', pet: 'Buddy — Golden Retriever', text: 'The team at Vetnora treated Buddy like family. Dr. Rivera explained every option clearly and the follow-up calls after his surgery meant the world to us.', rating: 5 },
      { id: 'tst-2', name: 'Marcus Chen', pet: 'Luna — Persian Cat', text: 'Best vet experience we have had. The fear-free approach actually worked — Luna was calm for the first time during a visit.', rating: 5 },
      { id: 'tst-3', name: 'Sofia Reyes', pet: 'Max — Beagle', text: 'They caught Max\'s diabetes early during a routine check-up. The online portal makes tracking his prescriptions and appointments so easy.', rating: 5 },
    ],
  },
  contact: {
    sectionTitle: 'Get in touch',
    phone: '+1 202 555 0100 (fictional)',
    email: 'demo@example.invalid',
    address: '100 Example Avenue, Example City, ZZ 00000 (fictional)',
    hours: 'Mon–Fri: 8:00 AM – 6:00 PM\nSat: 9:00 AM – 2:00 PM\nSun: Closed',
    mapImage: 'https://images.pexels.com/photos/6816845/pexels-photo-6816845.jpeg',
  },
  footer: {
    tagline: 'Fictional veterinary software demo - not a real clinic or verified service.',
    copyright: '© 2026 Vetnora Animal Hospital. All rights reserved.',
    socialLinks: [],
  },
  nav: {
    links: [
      { id: 'nav-1', label: 'Home', url: '/site' },
      { id: 'nav-2', label: 'Services', url: '/site/services' },
      { id: 'nav-3', label: 'Pricing', url: '/site/pricing' },
      { id: 'nav-4', label: 'About', url: '/site/about' },
      { id: 'nav-5', label: 'Blog', url: '/site/blog' },
      { id: 'nav-6', label: 'Contact', url: '/site/contact' },
    ],
  },
};

export type SeoSettings = {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  structuredData: string;
  sitemapEnabled: boolean;
  googleAnalyticsId: string;
  googleSearchConsole: string;
  faviconUrl: string;
  favicon32Url: string;
  favicon16Url: string;
  appleTouchIconUrl: string;
  webManifestName: string;
  webManifestShortName: string;
  themeColor: string;
  ogSiteName: string;
  ogType: string;
  ogLocale: string;
  twitterSite: string;
  twitterCreator: string;
  structuredDataType: 'LocalBusiness' | 'VeterinaryCare' | 'Organization';
};

const defaultSeo: SeoSettings = {
  metaTitle: 'Vetnora Demo Clinic | Fictional Veterinary Practice',
  metaDescription: 'Fictional demo content for veterinary practice software. Not a real clinic or verified service.',
  keywords: 'fictional demo, sample veterinary software, demo clinic',
  ogTitle: 'Vetnora Demo Clinic | Fictional Veterinary Practice',
  ogDescription: 'Fictional demo content for veterinary practice software. Not a real clinic or verified service.',
  ogImage: 'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200',
  twitterCard: 'summary_large_image',
  canonicalUrl: 'https://example.invalid/vetnora-demo',
  robotsIndex: true,
  robotsFollow: true,
  sitemapEnabled: true,
  googleAnalyticsId: 'G-XXXXXXXXXX',
  googleSearchConsole: '',
  faviconUrl: '/favicon.ico',
  favicon32Url: '/favicon-32x32.png',
  favicon16Url: '/favicon-16x16.png',
  appleTouchIconUrl: '/apple-touch-icon.png',
  webManifestName: 'Vetnora Demo Clinic',
  webManifestShortName: 'Vetnora Demo',
  themeColor: '#4C1D95',
  ogSiteName: 'Vetnora Demo',
  ogType: 'website',
  ogLocale: 'en_US',
  twitterSite: '',
  twitterCreator: '',
  structuredDataType: 'VeterinaryCare',
  structuredData: JSON.stringify({
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
  }, null, 2),
};

function readContent(): CmsContent {
  if (typeof window === 'undefined') return defaultContent;
  try {
    const raw = window.localStorage.getItem(CMS_KEY);
    if (!raw) return defaultContent;
    const parsed = JSON.parse(raw);
    return { ...defaultContent, ...parsed };
  } catch {
    return defaultContent;
  }
}

function writeContent(c: CmsContent) {
  if (typeof window !== 'undefined') window.localStorage.setItem(CMS_KEY, JSON.stringify(c));
}

const SEO_KEY = 'petcare-pro-seo';
export const SEO_CONFIG_KEY = 'seo-settings';

function readSeo(): SeoSettings {
  if (typeof window === 'undefined') return defaultSeo;
  try {
    const raw = window.localStorage.getItem(SEO_KEY);
    if (!raw) return defaultSeo;
    return { ...defaultSeo, ...JSON.parse(raw) };
  } catch {
    return defaultSeo;
  }
}

function writeSeo(s: SeoSettings) {
  if (typeof window !== 'undefined') window.localStorage.setItem(SEO_KEY, JSON.stringify(s));
}

export function useCms() {
  const [content, setContent] = useState<CmsContent>(defaultContent);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setContent(readContent());

    fetchConfig<CmsContent>(CMS_CONFIG_KEY)
      .then((serverContent) => {
        if (!mounted || !serverContent) return;
        const merged = { ...defaultContent, ...serverContent };
        setContent(merged);
        writeContent(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => { mounted = false; };
  }, []);

  const update = useCallback((updater: (prev: CmsContent) => CmsContent) => {
    setContent((prev) => {
      const next = updater(prev);
      writeContent(next);
      saveConfig(CMS_CONFIG_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setContent(defaultContent);
    writeContent(defaultContent);
    saveConfig(CMS_CONFIG_KEY, defaultContent).catch(() => {});
  }, []);

  return { content, update, loaded, reset };
}

export function useSeo() {
  const [seo, setSeo] = useState<SeoSettings>(defaultSeo);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setSeo(readSeo());

    fetchConfig<SeoSettings>(SEO_CONFIG_KEY)
      .then((serverSeo) => {
        if (!mounted || !serverSeo) return;
        const merged = { ...defaultSeo, ...serverSeo };
        setSeo(merged);
        writeSeo(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => { mounted = false; };
  }, []);

  const update = useCallback((updater: (prev: SeoSettings) => SeoSettings) => {
    setSeo((prev) => {
      const next = updater(prev);
      writeSeo(next);
      saveConfig(SEO_CONFIG_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSeo(defaultSeo);
    writeSeo(defaultSeo);
    saveConfig(SEO_CONFIG_KEY, defaultSeo).catch(() => {});
  }, []);

  return { seo, update, loaded, reset };
}

export const defaultCmsContent = defaultContent;
export const defaultSeoSettings = defaultSeo;
