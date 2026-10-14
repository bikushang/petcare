'use client';

/* ════════════════════════════════════════════════════════════════════
   AppChrome — applies the user's saved settings to the live document
   ────────────────────────────────────────────────────────────────────
   Two editors used to write to localStorage and have no effect at all:

   • /settings  — clinic profile, currency, appearance. Now applied via
                  `useSettings()`, which writes the CSS custom properties
                  that every brand colour resolves through.
   • /seo       — titles, canonical URL, robots, Open Graph, favicons,
                  structured data. The root layout hardcoded all of it.
                  Now synced onto <head> here.

   Server-rendered metadata in layout.tsx remains the default (and is what
   crawlers without JS see); this reconciles it with the saved overrides.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useSettings } from '../lib/settings';
import { useSeo } from '../lib/cms';

function upsertMeta(selector: string, attrs: Record<string, string>) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    document.head.appendChild(el);
  }
  for (const [k, val] of Object.entries(attrs)) el.setAttribute(k, val);
}

function removeIf(selector: string, condition: boolean) {
  if (!condition || typeof document === 'undefined') return;
  document.head.querySelectorAll(selector).forEach((n) => n.remove());
}

export default function AppChrome() {
  // Applies theme + font size as a side effect of mounting.
  const { settings, loaded: settingsLoaded } = useSettings();
  const { seo, loaded: seoLoaded } = useSeo();

  /* ── SEO / head sync ─────────────────────────────────────── */
  useEffect(() => {
    if (!seoLoaded) return;

    if (seo.metaTitle) document.title = seo.metaTitle;
    if (seo.metaDescription) {
      upsertMeta('meta[name="description"]', { name: 'description', content: seo.metaDescription });
    }
    if (seo.keywords) {
      upsertMeta('meta[name="keywords"]', { name: 'keywords', content: seo.keywords });
    }

    upsertMeta('meta[name="robots"]', {
      name: 'robots',
      content: `${seo.robotsIndex ? 'index' : 'noindex'},${seo.robotsFollow ? 'follow' : 'nofollow'}`,
    });

    if (seo.canonicalUrl) {
      upsertMeta('link[rel="canonical"]', { rel: 'canonical', href: seo.canonicalUrl });
    }

    /* Open Graph */
    const og: Record<string, string> = {
      'og:title': seo.ogTitle,
      'og:description': seo.ogDescription,
      'og:image': seo.ogImage,
      'og:site_name': seo.ogSiteName,
      'og:type': seo.ogType,
      'og:locale': seo.ogLocale,
      'og:url': seo.canonicalUrl,
    };
    for (const [property, content] of Object.entries(og)) {
      if (content) upsertMeta(`meta[property="${property}"]`, { property, content });
    }

    /* Twitter */
    const tw: Record<string, string> = {
      'twitter:card': seo.twitterCard,
      'twitter:title': seo.ogTitle,
      'twitter:description': seo.ogDescription,
      'twitter:image': seo.ogImage,
      'twitter:site': seo.twitterSite,
      'twitter:creator': seo.twitterCreator,
    };
    for (const [name, content] of Object.entries(tw)) {
      if (content) upsertMeta(`meta[name="${name}"]`, { name, content });
    }

    /* Favicons */
    if (seo.faviconUrl) {
      upsertMeta('link[rel="icon"]:not([sizes])', { rel: 'icon', href: seo.faviconUrl });
    }
    if (seo.favicon32Url) {
      upsertMeta('link[rel="icon"][sizes="32x32"]', {
        rel: 'icon', type: 'image/png', sizes: '32x32', href: seo.favicon32Url,
      });
    }
    if (seo.favicon16Url) {
      upsertMeta('link[rel="icon"][sizes="16x16"]', {
        rel: 'icon', type: 'image/png', sizes: '16x16', href: seo.favicon16Url,
      });
    }
    if (seo.appleTouchIconUrl) {
      upsertMeta('link[rel="apple-touch-icon"]', { rel: 'apple-touch-icon', href: seo.appleTouchIconUrl });
    }

    /* Structured data — replace the server-rendered block */
    if (seo.structuredData?.trim()) {
      try {
        JSON.parse(seo.structuredData); // only inject if it is valid JSON
        let el = document.head.querySelector('script[data-seo-ld="1"]');
        if (!el) {
          el = document.createElement('script');
          el.setAttribute('type', 'application/ld+json');
          el.setAttribute('data-seo-ld', '1');
          document.head.appendChild(el);
        }
        el.textContent = seo.structuredData;
      } catch {
        /* invalid JSON in the editor — leave the default block in place */
      }
    }

    // Respect "no sitemap" by dropping the link hint.
    removeIf('link[rel="sitemap"]', !seo.sitemapEnabled);
  }, [seo, seoLoaded]);

  /* ── Clinic name in the tab title when SEO has no override ── */
  useEffect(() => {
    if (!settingsLoaded || seo.metaTitle) return;
    if (settings.clinicName) document.title = settings.clinicName;
  }, [settings.clinicName, settingsLoaded, seo.metaTitle]);

  return null;
}
