'use client';

/* Shared chrome + section primitives for the public marketing site. */

import { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PawPrint, Menu, X, Calendar, ChevronDown, ChevronRight, Phone, Mail, MapPin,
  Clock, Facebook, Instagram, Twitter, Linkedin, Youtube, Globe, Siren, ArrowRight,
  LucideIcon,
} from 'lucide-react';
import { useCms } from '../../lib/cms';

/* ---------------------------------------------------------------- */
/* Routes                                                            */
/* ---------------------------------------------------------------- */

export const SITE_ROUTES = {
  home: '/site',
  about: '/site/about',
  team: '/site/team',
  reviews: '/site/reviews',
  faq: '/site/faq',
  services: '/site/services',
  pricing: '/site/pricing',
  blog: '/site/blog',
  emergency: '/site/emergency',
  contact: '/site/contact',
  book: '/site/book',
  privacy: '/site/privacy',
  terms: '/site/terms',
} as const;

const ABOUT_MENU = [
  { href: SITE_ROUTES.about, label: 'About us', hint: 'Our story and mission' },
  { href: SITE_ROUTES.team, label: 'Our team', hint: 'Meet the veterinarians' },
  { href: SITE_ROUTES.reviews, label: 'Reviews', hint: 'What pet families say' },
  { href: SITE_ROUTES.faq, label: 'FAQ', hint: 'Common questions answered' },
];

/** Fallback nav, used when the CMS nav list has been emptied. */
const MAIN_NAV = [
  { href: SITE_ROUTES.home, label: 'Home' },
  { href: SITE_ROUTES.services, label: 'Services' },
  { href: SITE_ROUTES.pricing, label: 'Pricing' },
  { href: SITE_ROUTES.blog, label: 'Blog' },
  { href: SITE_ROUTES.contact, label: 'Contact' },
];

/**
 * Routes that have no entry in the visible nav but still need to light up
 * when you are on them — Book has its own button, Emergency lives in the
 * top strip. Without these, neither page ever read as "current".
 */
export const SECONDARY_ROUTES: string[] = [SITE_ROUTES.book, SITE_ROUTES.emergency];

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

/** Non-empty lines of the CMS opening-hours block. */
function hourLines(hours: string): string[] {
  return (hours || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** `tel:` href for a human-formatted phone number. */
export function telHref(phone: string): string {
  return `tel:${(phone || '').replace(/[^+\d]/g, '')}`;
}

/* ---------------------------------------------------------------- */
/* SiteHeader                                                        */
/* ---------------------------------------------------------------- */

export function SiteHeader() {
  const pathname = usePathname();
  const { content } = useCms();
  const contact = content.contact;
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); setAboutOpen(false); }, [pathname]);

  /**
   * The mobile sheet used to close only when the pathname changed, so tapping
   * the page you were already on — or anywhere else on the page — left it open
   * over the content with no way back except the toggle.
   */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  /* Nav comes from the CMS so editing it in /cms actually changes the header.
     About-menu destinations are filtered out because the dropdown covers them,
     and an emptied list falls back to the built-in nav rather than nothing. */
  const navLinks = useMemo(() => {
    const aboutHrefs = new Set<string>(ABOUT_MENU.map((m) => m.href));
    const fromCms = (content.nav?.links ?? [])
      .filter((l) => l.label?.trim() && l.url?.trim())
      .map((l) => ({ href: l.url.trim(), label: l.label.trim() }))
      .filter((l) => !aboutHrefs.has(l.href));
    return fromCms.length > 0 ? fromCms : MAIN_NAV;
  }, [content.nav]);

  const isActive = (href: string) => pathname === href;
  const aboutActive = ABOUT_MENU.some((m) => pathname === m.href);
  const bookActive = isActive(SITE_ROUTES.book);
  const emergencyActive = isActive(SITE_ROUTES.emergency);
  const hours = hourLines(contact.hours);
  const stripHours = hours.filter((l) => !/closed/i.test(l)).slice(0, 2).join(' · ') || hours.join(' · ');

  /* Mobile sheet: nav + about menu + the two secondary routes. */
  const mobileLinks = [
    ...navLinks.slice(0, 1),
    ...ABOUT_MENU.map((m) => ({ href: m.href, label: m.label })),
    ...navLinks.slice(1),
    { href: SITE_ROUTES.emergency, label: 'Emergency care' },
  ];

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/92 backdrop-blur-md border-b border-line shadow-[0_2px_16px_rgba(26,13,46,0.05)]' : 'bg-white border-b border-transparent'
      }`}
    >
      {/* Emergency strip */}
      <div className="hidden md:block bg-grape text-white/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-4">
            <a href={telHref(contact.phone)} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="w-3 h-3" /> {contact.phone}
            </a>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {stripHours}</span>
          </span>
          <Link
            href={SITE_ROUTES.emergency}
            aria-current={emergencyActive ? 'page' : undefined}
            className={`hv-slide-parent flex items-center gap-1.5 font-semibold transition-colors ${
              emergencyActive ? 'text-coral' : 'text-white hover:text-coral'
            }`}
          >
            <Siren className="w-3.5 h-3.5" /> 24/7 emergency care <ChevronRight className="w-3 h-3 hv-slide" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href={SITE_ROUTES.home} className="hv-slide-parent group flex items-center gap-2.5 shrink-0">
            <span className="hv-tile w-9 h-9 rounded-xl bg-plum text-white flex items-center justify-center shadow-lift-sm">
              <PawPrint className="w-5 h-5" />
            </span>
            <span className="text-sm font-bold text-ink leading-tight">
              Northgate<span className="hidden sm:inline"> Animal Hospital</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 1).map((l) => <NavLink key={l.href} {...l} active={isActive(l.href)} />)}

            {/* About dropdown */}
            <div className="relative" onMouseEnter={() => setAboutOpen(true)} onMouseLeave={() => setAboutOpen(false)}>
              <button
                type="button"
                onClick={() => setAboutOpen((o) => !o)}
                className={`inline-flex items-center gap-1 px-3 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                  aboutActive ? 'text-plum bg-lilac' : 'text-ink/70 hover:text-plum hover:bg-lilac/60'
                }`}
              >
                About <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${aboutOpen ? 'rotate-180' : ''}`} />
              </button>
              {aboutOpen && (
                <div className="absolute top-full left-0 pt-2 w-60">
                  <div className="bg-white rounded-xl border border-line shadow-[0_16px_40px_-8px_rgba(26,13,46,0.22)] p-1.5 animate-popIn">
                    {ABOUT_MENU.map((m) => (
                      <Link
                        key={m.href}
                        href={m.href}
                        className={`block px-3 py-2 rounded-lg transition-colors duration-150 ${
                          pathname === m.href ? 'bg-lilac' : 'hover:bg-lilac/60'
                        }`}
                      >
                        <span className={`block text-xs font-semibold ${pathname === m.href ? 'text-plum' : 'text-ink'}`}>{m.label}</span>
                        <span className="block text-[11px] text-ink/45 mt-0.5">{m.hint}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {navLinks.slice(1).map((l) => <NavLink key={l.href} {...l} active={isActive(l.href)} />)}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={SITE_ROUTES.book}
              aria-current={bookActive ? 'page' : undefined}
              className={`hv-lift hidden sm:inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold shadow-sm ${
                bookActive
                  ? 'bg-grape text-white ring-2 ring-iris'
                  : 'bg-plum text-white hover:bg-grape hover:shadow-lift'
              }`}
            >
              <Calendar className="w-4 h-4" /> Book now
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="hv-icon lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-ink hover:bg-lilac hover:text-plum"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="lg:hidden border-t border-line bg-white px-4 py-3 max-h-[70vh] overflow-y-auto animate-fadeIn">
          {mobileLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between py-2.5 px-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === l.href ? 'text-plum bg-lilac' : 'text-ink/75 hover:text-plum hover:bg-lilac/50'
              }`}
            >
              {l.label} <ChevronRight className="w-4 h-4 opacity-40" />
            </Link>
          ))}
          <Link
            href={SITE_ROUTES.book}
            onClick={() => setOpen(false)}
            aria-current={bookActive ? 'page' : undefined}
            className={`mt-3 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-white ${
              bookActive ? 'bg-grape ring-2 ring-iris' : 'bg-plum'
            }`}
          >
            <Calendar className="w-4 h-4" /> Book an appointment
          </Link>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 h-9 inline-flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
        active ? 'text-plum bg-lilac' : 'text-ink/70 hover:text-plum hover:bg-lilac/60'
      }`}
    >
      {label}
    </Link>
  );
}

/* ---------------------------------------------------------------- */
/* SiteFooter                                                        */
/* ---------------------------------------------------------------- */

export function SiteFooter() {
  const { content } = useCms();
  const { footer, contact } = content;
  const socials = (footer.socialLinks ?? []).filter((s) => s.platform?.trim() && s.url?.trim());

  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-10">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-9 h-9 rounded-xl bg-plum flex items-center justify-center">
                <PawPrint className="w-5 h-5 text-white" />
              </span>
              <span className="text-sm font-bold">Northgate Animal Hospital</span>
            </div>
            <p className="text-[13px] text-white/55 leading-relaxed max-w-sm whitespace-pre-line">
              {footer.tagline}
            </p>
            {socials.length > 0 && (
              <div className="flex items-center gap-2.5 mt-5">
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.platform.trim().toLowerCase()] ?? Globe;
                  return (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={s.platform}
                      className="hv-icon w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-plum"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <FooterCol
            title="Services"
            links={[
              { label: 'All services', href: SITE_ROUTES.services },
              { label: 'Pricing', href: SITE_ROUTES.pricing },
              { label: 'Emergency care', href: SITE_ROUTES.emergency },
              { label: 'Book appointment', href: SITE_ROUTES.book },
            ]}
          />
          <FooterCol
            title="Clinic"
            links={[
              { label: 'About us', href: SITE_ROUTES.about },
              { label: 'Our team', href: SITE_ROUTES.team },
              { label: 'Reviews', href: SITE_ROUTES.reviews },
              { label: 'Blog', href: SITE_ROUTES.blog },
            ]}
          />
          <FooterCol
            title="Support"
            links={[
              { label: 'Contact', href: SITE_ROUTES.contact },
              { label: 'FAQ', href: SITE_ROUTES.faq },
              { label: 'Privacy policy', href: SITE_ROUTES.privacy },
              { label: 'Client portal', href: '/login' },
            ]}
          />
        </div>

        <div className="mt-10 pt-7 border-t border-white/10 grid sm:grid-cols-3 gap-4 text-[12px] text-white/55">
          <span className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-plum" /> {contact.address}
          </span>
          <a href={telHref(contact.phone)} className="flex items-start gap-2 hover:text-white transition-colors">
            <Phone className="w-3.5 h-3.5 mt-0.5 shrink-0 text-plum" /> {contact.phone}
          </a>
          <a href={`mailto:${contact.email}`} className="flex items-start gap-2 hover:text-white transition-colors">
            <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 text-plum" /> {contact.email}
          </a>
        </div>

        <div className="mt-7 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-white/40">
          <span>{footer.copyright}</span>
          <span className="flex items-center gap-4">
            <Link href={SITE_ROUTES.privacy} className="hover:text-white/70 transition-colors">Privacy policy</Link>
            <Link href={SITE_ROUTES.terms} className="hover:text-white/70 transition-colors">Terms of service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3.5">{title}</h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="hv-slide-parent group inline-flex items-center gap-1 text-[13px] text-white/65 hover:text-white transition-colors">
              {l.label}
              <ChevronRight className="hv-slide w-3 h-3 opacity-0 group-hover:opacity-70 transition-opacity" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Layout + section primitives                                       */
/* ---------------------------------------------------------------- */

/** Wraps a public page: fixed header offset + footer. */
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="pt-16 md:pt-[100px]">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Section({
  children, id, alt, tight, className = '',
}: { children: ReactNode; id?: string; alt?: boolean; tight?: boolean; className?: string }) {
  return (
    <section
      id={id}
      /* The header is fixed and ~100px tall, so without a scroll margin every
         in-page anchor landed with its heading hidden underneath it. */
      className={`${id ? 'scroll-mt-[72px] md:scroll-mt-[108px]' : ''} ${tight ? 'py-12 md:py-16' : 'py-16 md:py-24'} ${alt ? 'bg-canvas' : ''} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow, title, subtitle, center = true, className = '',
}: { eyebrow?: string; title: string; subtitle?: string; center?: boolean; className?: string }) {
  return (
    <div className={`${center ? 'text-center mx-auto' : ''} max-w-3xl mb-12 ${className}`}>
      {eyebrow && (
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-plum mb-2.5">{eyebrow}</span>
      )}
      <h2 className="text-2xl md:text-[34px] font-bold text-ink leading-[1.15] tracking-tight">{title}</h2>
      {subtitle && <p className="mt-3.5 text-[15px] text-ink/60 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/** Inner-page hero with breadcrumb. */
export function PageHero({
  eyebrow, title, subtitle, breadcrumb, children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumb: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-grape text-white">
      <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-plum/50 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-iris/20 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <nav className="flex items-center gap-1.5 text-[12px] text-white/50 mb-5">
          <Link href={SITE_ROUTES.home} className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/80">{breadcrumb}</span>
        </nav>
        {eyebrow && (
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-coral mb-3">{eyebrow}</span>
        )}
        <h1 className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight max-w-3xl">{title}</h1>
        {subtitle && <p className="mt-5 text-base md:text-lg text-white/65 leading-relaxed max-w-2xl">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/** Primary / secondary CTA link pair. */
export function CtaLink({
  href, children, variant = 'primary', icon: Icon, className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'white' | 'ghost';
  icon?: LucideIcon;
  className?: string;
}) {
  const variants = {
    primary: 'bg-plum text-white hover:bg-grape shadow-sm hover:shadow-lift',
    outline: 'border border-line bg-white text-ink hover:border-plum hover:text-plum hover:shadow-lift-sm',
    white: 'bg-white text-plum hover:bg-lilac shadow-sm hover:shadow-lift',
    ghost: 'border border-white/25 text-white hover:bg-white/10 hover:border-white/50',
  };
  return (
    <Link
      href={href}
      className={`hv-lift inline-flex items-center gap-2 px-6 h-12 rounded-xl text-sm font-semibold outline-none focus-visible:ring-4 focus-visible:ring-lilac ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
      <ArrowRight className="hv-slide w-4 h-4" />
    </Link>
  );
}

/** Full-width conversion band — use near the bottom of every page. */
export function CtaBand({
  title = 'Ready to give your pet the care they deserve?',
  subtitle = 'Book an appointment in under two minutes, or call us and we will find a slot that works for you.',
  primaryLabel = 'Book an appointment',
  primaryHref = SITE_ROUTES.book,
  secondaryLabel = 'Talk to us',
  secondaryHref = SITE_ROUTES.contact,
}: {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-plum">
      <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-iris/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-10 w-80 h-80 rounded-full bg-grape/60 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight tracking-tight max-w-3xl mx-auto">{title}</h2>
        <p className="mt-4 text-white/70 max-w-xl mx-auto leading-relaxed">{subtitle}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <CtaLink href={primaryHref} variant="white" icon={Calendar}>{primaryLabel}</CtaLink>
          <CtaLink href={secondaryHref} variant="ghost">{secondaryLabel}</CtaLink>
        </div>
      </div>
    </section>
  );
}

/** Stat strip — 4 up. */
export function StatStrip({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="hv-card rounded-2xl border border-line bg-white p-5 text-center hover:border-plum/25">
          <div className="text-[28px] md:text-3xl font-bold text-plum leading-none tracking-tight">{s.value}</div>
          <div className="text-[11px] uppercase tracking-wide text-ink/45 mt-2 font-medium">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Icon + title + body card. */
export function FeatureCard({
  icon: Icon, title, children, href,
}: { icon: LucideIcon; title: string; children: ReactNode; href?: string }) {
  const inner = (
    <>
      <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </span>
      <h3 className="text-[15px] font-semibold text-ink mb-2">{title}</h3>
      <p className="text-[13px] text-ink/55 leading-relaxed">{children}</p>
      {href && (
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-plum">
          Learn more <ChevronRight className="hv-slide w-3.5 h-3.5" />
        </span>
      )}
    </>
  );
  const cls = 'hv-card group block rounded-2xl border border-line bg-white p-6 hover:border-plum/25';
  return href ? <Link href={href} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
