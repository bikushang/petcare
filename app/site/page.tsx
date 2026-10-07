'use client';

import { useState, useEffect } from 'react';
import {
  PawPrint, Stethoscope, Syringe, FlaskConical, Pill, Scissors, Hotel,
  Phone, Mail, MapPin, Clock, Star, Menu, X, ArrowRight, Calendar,
  Heart, Shield, Award, Users, ChevronRight, Facebook, Instagram, Twitter,
} from 'lucide-react';
import Link from 'next/link';
import { useCms, type CmsContent } from '../lib/cms';

const iconMap: Record<string, typeof Stethoscope> = {
  Stethoscope, Syringe, FlaskConical, Pill, Scissors, Hotel, PawPrint,
};

export default function PublicSitePage() {
  const { content, loaded } = useCms();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><PawPrint className="w-8 h-8 text-sage animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-sage text-white flex items-center justify-center"><PawPrint className="w-5 h-5" /></div>
              <span className="text-sm font-bold text-ink">Northgate Animal Hospital</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              {content.nav.links.map((link) => (
                <a key={link.id} href={link.url} className="text-sm font-medium text-ink/70 hover:text-sage transition-colors">{link.label}</a>
              ))}
              <Link href="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sage text-white text-sm font-medium hover:bg-sage/90 transition-all">
                <Calendar className="w-4 h-4" /> Book now
              </Link>
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-ink">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-line bg-white px-4 py-3 space-y-2">
            {content.nav.links.map((link) => (
              <a key={link.id} href={link.url} onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-ink/70 hover:text-sage">{link.label}</a>
            ))}
            <Link href="/login" className="block py-2 text-sm font-medium text-sage">Book now →</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section id="home" className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint text-sage text-xs font-semibold mb-4">
                <Heart className="w-3.5 h-3.5" /> {content.hero.badge}
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-ink leading-tight">{content.hero.title}</h1>
              <p className="mt-5 text-base md:text-lg text-ink/60 leading-relaxed max-w-xl">{content.hero.subtitle}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sage text-white text-sm font-semibold hover:bg-sage/90 transition-all shadow-sm shadow-sage/20">
                  {content.hero.ctaPrimary} <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#about" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-line text-ink text-sm font-semibold hover:bg-canvas transition-all">
                  {content.hero.ctaSecondary}
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-mint/40 blur-3xl" />
              <div className="absolute -bottom-6 -right-6 w-40 h-40 rounded-full bg-coral/10 blur-3xl" />
              <img src={content.hero.heroImage} alt="Veterinarian caring for a pet" className="relative rounded-3xl shadow-soft w-full object-cover" style={{ maxHeight: '480px' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-16 md:py-24 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ink">{content.services.sectionTitle}</h2>
            <p className="mt-3 text-ink/60 max-w-2xl mx-auto">{content.services.sectionSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.services.items.map((svc) => {
              const Icon = iconMap[svc.icon] || PawPrint;
              return (
                <div key={svc.id} className="bg-white rounded-2xl border border-line p-6 hover:shadow-soft hover:border-sage/20 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-mint text-sage flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-ink mb-2">{svc.title}</h3>
                  <p className="text-xs text-ink/55 leading-relaxed">{svc.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-mint/30 blur-2xl" />
              <img src={content.about.aboutImage} alt="Our veterinary clinic" className="relative rounded-3xl shadow-soft w-full object-cover" style={{ maxHeight: '400px' }} />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-5">{content.about.sectionTitle}</h2>
              <p className="text-ink/60 leading-relaxed mb-4">{content.about.paragraph1}</p>
              <p className="text-ink/60 leading-relaxed mb-6">{content.about.paragraph2}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {content.about.stats.map((stat) => (
                  <div key={stat.id} className="text-center p-3 rounded-xl bg-canvas">
                    <div className="text-2xl font-bold text-sage">{stat.value}</div>
                    <div className="text-[11px] text-ink/50 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 md:py-24 bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ink">{content.testimonials.sectionTitle}</h2>
            <p className="mt-3 text-ink/60 max-w-2xl mx-auto">{content.testimonials.sectionSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.testimonials.items.map((tst) => (
              <div key={tst.id} className="bg-white rounded-2xl border border-line p-6">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: tst.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-ink/70 leading-relaxed mb-4 italic">"{tst.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sage/10 text-sage flex items-center justify-center text-xs font-bold">
                    {tst.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{tst.name}</div>
                    <div className="text-[11px] text-ink/50">{tst.pet}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-ink">{content.contact.sectionTitle}</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-line">
                <div className="w-11 h-11 rounded-xl bg-sage/10 text-sage flex items-center justify-center shrink-0"><Phone className="w-5 h-5" /></div>
                <div><div className="text-xs font-medium text-ink/50 uppercase tracking-wide">Phone</div><div className="text-sm text-ink mt-1">{content.contact.phone}</div></div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-line">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0"><Mail className="w-5 h-5" /></div>
                <div><div className="text-xs font-medium text-ink/50 uppercase tracking-wide">Email</div><div className="text-sm text-ink mt-1">{content.contact.email}</div></div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-line">
                <div className="w-11 h-11 rounded-xl bg-coral/15 text-coral flex items-center justify-center shrink-0"><MapPin className="w-5 h-5" /></div>
                <div><div className="text-xs font-medium text-ink/50 uppercase tracking-wide">Address</div><div className="text-sm text-ink mt-1">{content.contact.address}</div></div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-line">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Clock className="w-5 h-5" /></div>
                <div><div className="text-xs font-medium text-ink/50 uppercase tracking-wide">Hours</div><div className="text-sm text-ink mt-1 whitespace-pre-line">{content.contact.hours}</div></div>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sage text-white text-sm font-semibold hover:bg-sage/90 transition-all">
                <Calendar className="w-4 h-4" /> Book an appointment
              </Link>
            </div>
            <img src={content.contact.mapImage} alt="Clinic location map" className="rounded-3xl shadow-soft w-full object-cover" style={{ maxHeight: '400px' }} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sage flex items-center justify-center"><PawPrint className="w-5 h-5 text-white" /></div>
              <div>
                <div className="text-sm font-bold">Northgate Animal Hospital</div>
                <div className="text-[11px] text-white/50">{content.footer.tagline}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {content.footer.socialLinks.map((link) => {
                const Icon = link.platform === 'Facebook' ? Facebook : link.platform === 'Instagram' ? Instagram : Twitter;
                return (
                  <a key={link.id} href={link.url} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-sage transition-colors" aria-label={link.platform}>
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 text-center text-[11px] text-white/40">{content.footer.copyright}</div>
        </div>
      </footer>
    </div>
  );
}
