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

const defaultContent: CmsContent = {
  hero: {
    badge: 'Trusted by 500+ pet families',
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
    paragraph1: 'Founded in 2019, Vetnora Animal Hospital has grown from a single-vet practice to a multi-branch clinic serving over 500 pet families across the Bay Area. Our team of 13 veterinarians, nurses, and support staff share one mission: to treat every animal as if they were our own.',
    paragraph2: 'We invest in the latest diagnostic equipment and continuous training, but we never lose sight of the human-animal bond. Our fear-free approach, transparent communication, and follow-up care set us apart.',
    stats: [
      { id: 'stat-1', label: 'Happy pets', value: '500+' },
      { id: 'stat-2', label: 'Years of service', value: '7' },
      { id: 'stat-3', label: 'Expert staff', value: '13' },
      { id: 'stat-4', label: 'Branches', value: '2' },
    ],
    aboutImage: 'https://images.pexels.com/photos/33394308/pexels-photo-33394308.jpeg',
  },
  testimonials: {
    sectionTitle: 'What pet families say',
    sectionSubtitle: 'Real stories from clients who trust us with their companions.',
    items: [
      { id: 'tst-1', name: 'Eleanor Hayes', pet: 'Buddy — Golden Retriever', text: 'The team at Vetnora treated Buddy like family. Dr. Rivera explained every option clearly and the follow-up calls after his surgery meant the world to us.', rating: 5 },
      { id: 'tst-2', name: 'Marcus Chen', pet: 'Luna — Persian Cat', text: 'Best vet experience we have had. The fear-free approach actually worked — Luna was calm for the first time during a visit.', rating: 5 },
      { id: 'tst-3', name: 'Sofia Reyes', pet: 'Max — Beagle', text: 'They caught Max\'s diabetes early during a routine check-up. The online portal makes tracking his prescriptions and appointments so easy.', rating: 5 },
    ],
  },
  contact: {
    sectionTitle: 'Get in touch',
    phone: '+1 415 555 0100',
    email: 'reception@vetnoravet.com',
    address: '128 Maple Avenue, Vetnora, CA 94110',
    hours: 'Mon–Fri: 8:00 AM – 6:00 PM\nSat: 9:00 AM – 2:00 PM\nSun: Closed',
    mapImage: 'https://images.pexels.com/photos/6816845/pexels-photo-6816845.jpeg',
  },
  footer: {
    tagline: 'Compassionate veterinary care for the Bay Area community.',
    copyright: '© 2026 Vetnora Animal Hospital. All rights reserved.',
    socialLinks: [
      { id: 'soc-1', platform: 'Facebook', url: 'https://facebook.com/vetnoravet' },
      { id: 'soc-2', platform: 'Instagram', url: 'https://instagram.com/vetnoravet' },
      { id: 'soc-3', platform: 'X', url: 'https://x.com/vetnoravet' },
    ],
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
  metaTitle: 'Vetnora Animal Hospital | Compassionate Veterinary Care in the Bay Area',
  metaDescription: 'Vetnora Animal Hospital provides comprehensive veterinary care including consultations, surgery, dental, grooming, boarding, and pharmacy services. Fear-free approach. Book your appointment today.',
  keywords: 'veterinary clinic, animal hospital, pet care, vet near me, vaccination, pet surgery, pet grooming, pet boarding, Vetnora, Bay Area, California',
  ogTitle: 'Vetnora Animal Hospital — Compassionate Care for Every Paw',
  ogDescription: 'Modern veterinary medicine with a fear-free approach. Serving 500+ pet families across the Bay Area. Book an appointment today.',
  ogImage: 'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200',
  twitterCard: 'summary_large_image',
  canonicalUrl: 'https://vetnora.netlify.app',
  robotsIndex: true,
  robotsFollow: true,
  sitemapEnabled: true,
  googleAnalyticsId: 'G-XXXXXXXXXX',
  googleSearchConsole: '',
  faviconUrl: '/favicon.ico',
  favicon32Url: '/favicon-32x32.png',
  favicon16Url: '/favicon-16x16.png',
  appleTouchIconUrl: '/apple-touch-icon.png',
  webManifestName: 'Vetnora Animal Hospital',
  webManifestShortName: 'Vetnora',
  themeColor: '#4C1D95',
  ogSiteName: 'Vetnora Animal Hospital',
  ogType: 'website',
  ogLocale: 'en_US',
  twitterSite: '@vetnoravet',
  twitterCreator: '@vetnoravet',
  structuredDataType: 'VeterinaryCare',
  structuredData: JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VeterinaryCare',
    name: 'Vetnora Animal Hospital',
    description: 'Compassionate veterinary care for the Bay Area community.',
    url: 'https://vetnora.netlify.app',
    telephone: '+14155550100',
    email: 'reception@vetnoravet.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '128 Maple Avenue',
      addressLocality: 'Vetnora',
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
