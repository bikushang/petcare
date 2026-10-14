'use client';

import Link from 'next/link';
import {
  PawPrint, Stethoscope, Syringe, FlaskConical, Pill, Scissors, Hotel,
  Star, ArrowRight, ChevronRight, Calendar, CalendarCheck, Clock, Heart,
  HeartHandshake, BadgeCheck, Siren, Microscope, Activity, Receipt,
  PhoneCall, FileText, Quote, Users, type LucideIcon,
} from 'lucide-react';
import { useCms } from '../lib/cms';
import {
  SitePage, Section, SectionHeading, CtaLink, CtaBand, StatStrip, SITE_ROUTES,
} from './_components/site-chrome';

/* ---------------------------------------------------------------- */
/* Static page data                                                  */
/* ---------------------------------------------------------------- */

/** CMS `icon` strings → real lucide components. */
const SERVICE_ICONS: Record<string, LucideIcon> = {
  Stethoscope, Syringe, FlaskConical, Pill, Scissors, Hotel, PawPrint,
  Microscope, Activity, Heart,
};

const CREDIBILITY = [
  { icon: BadgeCheck, label: 'AAHA-accredited', hint: 'Top 15% of US practices' },
  { icon: HeartHandshake, label: 'Fear Free certified', hint: 'Low-stress handling' },
  { icon: Siren, label: '24/7 emergency line', hint: 'A real vet answers' },
  { icon: Microscope, label: 'In-house lab', hint: 'Results in 20 minutes' },
];

const BENEFITS = [
  {
    icon: HeartHandshake,
    title: 'Fear-free handling',
    body: 'Every room is scented with species-specific pheromones and our team is Fear Free certified. We let anxious pets settle before we touch them — and we never force a restraint when a treat and patience will do.',
  },
  {
    icon: Activity,
    title: 'Same-day diagnostics',
    body: 'Our in-house laboratory, digital radiography and ultrasound mean bloodwork and imaging are read during your visit. You leave with answers, not a week of waiting.',
  },
  {
    icon: Receipt,
    title: 'Transparent pricing',
    body: 'You get a written estimate before any procedure begins, and we call you the moment a treatment plan needs to change. No surprise invoices, ever.',
  },
  {
    icon: PhoneCall,
    title: 'Proactive follow-up',
    body: 'A nurse phones within 48 hours of every surgery, dental and new diagnosis. Vaccine and medication reminders arrive automatically by text and email.',
  },
];

const STEPS = [
  {
    icon: CalendarCheck,
    title: 'Book in 60 seconds',
    body: 'Pick your vet, branch and time online — or call +1 415 555 0100 and reception will find you the first available slot, usually same week.',
  },
  {
    icon: Stethoscope,
    title: 'Visit & diagnose',
    body: 'A 30-minute consultation with unhurried time to talk. Bloodwork, x-rays and ultrasound are run on site, so your vet can explain findings before you leave.',
  },
  {
    icon: FileText,
    title: 'Follow-up & records',
    body: 'Notes, lab results and prescriptions land in your client portal the same day, and a nurse checks in by phone to see how your pet is recovering.',
  },
];

const TEAM = [
  { name: 'Dr. Amara Rivera', credential: 'DVM', role: 'Clinical Director', focus: 'Soft-tissue surgery' },
  { name: 'Dr. Jonah Pike', credential: 'DVM', role: 'Senior Veterinarian', focus: 'Internal medicine & cardiology' },
  { name: 'Dr. Mei-Lin Soto', credential: 'DVM', role: 'Veterinarian', focus: 'Feline medicine, Fear Free certified' },
  { name: 'Priya Raman', credential: 'RVT', role: 'Lead Veterinary Nurse', focus: 'Anaesthesia & critical care' },
];

const ARTICLES = [
  {
    title: 'Why your cat hides at the vet — and how we fix that',
    excerpt: 'Cats do not get anxious because they are difficult; they get anxious because a clinic smells like forty other animals. Here is the protocol we use to make feline visits genuinely calm.',
    category: 'Feline care',
    readTime: '6 min read',
    date: 'Sep 24, 2026',
  },
  {
    title: 'Dental disease affects 80% of dogs by age three',
    excerpt: 'Bad breath is not a quirk — it is the first sign of periodontal disease that can reach the heart and kidneys. What a dental exam actually looks for, and when to schedule one.',
    category: 'Dentistry',
    readTime: '5 min read',
    date: 'Sep 11, 2026',
  },
  {
    title: 'A month-by-month puppy vaccination calendar',
    excerpt: 'From the first distemper shot at six weeks to rabies at sixteen, here is exactly what your puppy needs and why the timing between boosters matters so much.',
    category: 'Preventive care',
    readTime: '7 min read',
    date: 'Aug 29, 2026',
  },
];

const HERO_IMAGE_FALLBACK =
  'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200';

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function PublicSitePage() {
  const { content, loaded } = useCms();

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <PawPrint className="w-8 h-8 text-plum animate-pulse" />
      </div>
    );
  }

  return (
    <SitePage>
      {/* ---------------------------------------------------------- */}
      {/* 1 — Hero (custom light hero)                               */}
      {/* ---------------------------------------------------------- */}
      <section id="home" className="relative overflow-hidden bg-white">
        <div className="absolute -top-32 left-1/3 w-[28rem] h-[28rem] rounded-full bg-lilac/50 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — copy */}
            <div className="animate-fadeIn">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lilac text-plum text-[11px] font-bold uppercase tracking-[0.1em]">
                <Heart className="w-3.5 h-3.5" /> {content.hero.badge}
              </span>

              <h1 className="mt-5 text-4xl md:text-6xl font-bold tracking-tight text-ink leading-[1.05]">
                {content.hero.title}
              </h1>

              <p className="mt-6 text-base md:text-lg text-ink/60 leading-relaxed max-w-xl">
                {content.hero.subtitle}
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <CtaLink href={SITE_ROUTES.book} variant="primary" icon={Calendar}>
                  {content.hero.ctaPrimary}
                </CtaLink>
                <CtaLink href={SITE_ROUTES.team} variant="outline" icon={Users}>
                  {content.hero.ctaSecondary}
                </CtaLink>
              </div>

              {/* Trust row */}
              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                  <span className="text-[13px] text-ink/70">
                    <strong className="font-bold text-ink">4.9</strong> from 487 reviews
                  </span>
                </span>
                <span className="hidden sm:block w-px h-5 bg-line" />
                <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-canvas border border-line text-[12px] font-medium text-ink/65">
                  <Clock className="w-3.5 h-3.5 text-plum" />
                  Open today until 6:00 PM
                </span>
              </div>
            </div>

            {/* Right — image */}
            <div className="relative">
              <div className="absolute -top-10 -right-10 w-72 h-72 rounded-full bg-iris/25 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-lilac/70 blur-3xl pointer-events-none" />

              <div className="relative rounded-3xl overflow-hidden border border-line bg-white shadow-lift p-2">
                <img
                  src={content.hero.heroImage || HERO_IMAGE_FALLBACK}
                  alt="A veterinarian examining a dog during a routine check-up at Northgate Animal Hospital"
                  className="w-full h-[320px] sm:h-[420px] lg:h-[480px] object-cover rounded-[1.25rem]"
                />
              </div>

              {/* Floating availability card */}
              <div className="absolute -bottom-6 left-4 sm:left-8 bg-white rounded-2xl border border-line shadow-lift p-4 flex items-center gap-3 animate-popIn">
                <span className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </span>
                <span className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">
                    Next available
                  </span>
                  <span className="block text-[13px] font-bold text-ink mt-0.5">today 2:40 PM</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* 2 — Trust / stats strip                                    */}
      {/* ---------------------------------------------------------- */}
      <Section id="trust" alt tight>
        <StatStrip stats={content.about.stats} />

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CREDIBILITY.map((c) => (
            <div
              key={c.label}
              className="group flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
            >
              <span className="hv-tile w-9 h-9 rounded-lg bg-lilac text-plum flex items-center justify-center shrink-0">
                <c.icon className="w-4 h-4" />
              </span>
              <span className="block min-w-0">
                <span className="block text-[13px] font-semibold text-ink truncate">{c.label}</span>
                <span className="block text-[11px] text-ink/45 truncate">{c.hint}</span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 3 — Services grid                                          */}
      {/* ---------------------------------------------------------- */}
      <Section id="services">
        <SectionHeading
          eyebrow="What we do"
          title={content.services.sectionTitle}
          subtitle={content.services.sectionSubtitle}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {content.services.items.map((svc) => {
            const Icon = SERVICE_ICONS[svc.icon] ?? PawPrint;
            return (
              <Link
                key={svc.id}
                href={SITE_ROUTES.services}
                className="hv-card group flex flex-col rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
              >
                <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2">{svc.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{svc.description}</p>
                <span className="mt-4 pt-3 border-t border-line/70 inline-flex items-center gap-1.5 text-xs font-semibold text-plum">
                  Learn more <ArrowRight className="hv-slide w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <CtaLink href={SITE_ROUTES.services} variant="outline" icon={Stethoscope}>
            Explore all services &amp; pricing
          </CtaLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 4 — Why choose us                                          */}
      {/* ---------------------------------------------------------- */}
      <Section id="why-us" alt>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image + stat badge */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -top-8 -left-8 w-56 h-56 rounded-full bg-iris/20 blur-3xl pointer-events-none" />
            <img
              src={content.about.aboutImage}
              alt="A nurse at Northgate Animal Hospital comforting a cat before its examination"
              className="relative rounded-3xl shadow-lift w-full h-[340px] sm:h-[420px] object-cover"
            />
            <div className="absolute -bottom-6 right-4 sm:right-8 bg-white rounded-2xl border border-line shadow-lift px-5 py-4 text-center">
              <div className="text-3xl font-bold text-plum leading-none tracking-tight">98%</div>
              <div className="text-[11px] uppercase tracking-wide text-ink/45 mt-1.5 font-medium">
                Would recommend us
              </div>
            </div>
          </div>

          {/* Benefit rows */}
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Why Northgate"
              title="Veterinary care that respects your pet — and your time"
              subtitle="Four things our clients tell us they cannot find anywhere else in the Bay Area."
              center={false}
              className="mb-8"
            />
            <div className="space-y-5">
              {BENEFITS.map((b) => (
                <div key={b.title} className="group flex gap-4">
                  <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                    <b.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">{b.title}</h3>
                    <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-9">
              <CtaLink href={SITE_ROUTES.about} variant="primary">
                More about our clinic
              </CtaLink>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 5 — How it works                                           */}
      {/* ---------------------------------------------------------- */}
      <Section id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps from worry to answers"
          subtitle="No phone tag, no waiting rooms full of barking, no vague invoices. Here is what a visit to Northgate actually looks like."
        />

        <div className="relative">
          {/* Dashed connector — desktop only */}
          <div
            className="hidden lg:block absolute top-8 left-[16.666%] right-[16.666%] border-t-2 border-dashed border-line"
            aria-hidden="true"
          />

          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="group text-center lg:px-4">
                <span className="relative z-10 mx-auto w-16 h-16 rounded-2xl bg-white border-2 border-line flex items-center justify-center shadow-lift-sm group-hover:border-plum/30 transition-colors">
                  <span className="text-2xl font-bold text-iris tracking-tight">{i + 1}</span>
                </span>
                <span className="hv-tile mt-5 mx-auto w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center">
                  <s.icon className="w-5 h-5" />
                </span>
                <h3 className="mt-4 text-[17px] font-bold text-ink tracking-tight">{s.title}</h3>
                <p className="mt-2.5 text-[13px] text-ink/55 leading-relaxed max-w-sm mx-auto">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <CtaLink href={SITE_ROUTES.book} variant="primary" icon={Calendar}>
            Start with step one
          </CtaLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 6 — Meet the team teaser                                   */}
      {/* ---------------------------------------------------------- */}
      <Section id="team">
        <SectionHeading
          eyebrow="Our people"
          title="Meet the team your pet will actually remember"
          subtitle="Thirteen veterinarians, nurses and support staff across our Northgate and Riverside branches — and you can request the same face every visit."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className="hv-card group rounded-2xl border border-line bg-white p-6 text-center hover:border-plum/25"
            >
              <span className="hv-tile mx-auto w-16 h-16 rounded-full bg-lilac text-plum font-bold text-lg flex items-center justify-center">
                {m.name.replace(/^Dr\.\s*/, '').split(' ').map((n) => n[0]).join('')}
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">
                {m.name} <span className="text-ink/40 font-medium">{m.credential}</span>
              </h3>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-wider text-plum">{m.role}</p>
              <p className="mt-2.5 text-[13px] text-ink/55 leading-relaxed">{m.focus}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <CtaLink href={SITE_ROUTES.team} variant="outline" icon={Users}>
            Meet the whole team
          </CtaLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 7 — Testimonials                                           */}
      {/* ---------------------------------------------------------- */}
      <Section id="testimonials" alt>
        <SectionHeading
          eyebrow="Client stories"
          title={content.testimonials.sectionTitle}
          subtitle={content.testimonials.sectionSubtitle}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {content.testimonials.items.map((tst) => (
            <div
              key={tst.id}
              className="hv-card group relative rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <Quote className="absolute top-5 right-5 w-8 h-8 text-lilac" aria-hidden="true" />
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: tst.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="relative text-[14px] text-ink/70 leading-relaxed">&ldquo;{tst.text}&rdquo;</p>
              <div className="mt-6 pt-5 border-t border-line/70 flex items-center gap-3">
                <span className="w-11 h-11 rounded-full bg-lilac text-plum font-bold text-[13px] flex items-center justify-center shrink-0">
                  {tst.name.split(' ').map((n) => n[0]).join('')}
                </span>
                <span className="block min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{tst.name}</span>
                  <span className="block text-[12px] text-ink/50">{tst.pet}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <CtaLink href={SITE_ROUTES.reviews} variant="outline" icon={Star}>
            Read all 487 reviews
          </CtaLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 8 — Pet care tips / blog teaser                            */}
      {/* ---------------------------------------------------------- */}
      <Section id="tips">
        <SectionHeading
          eyebrow="Pet care tips"
          title="Practical advice from our exam rooms"
          subtitle="Written by the vets who see these cases every week — no fluff, no scare tactics."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ARTICLES.map((a) => (
            <Link
              key={a.title}
              href={SITE_ROUTES.blog}
              className="hv-card group flex flex-col rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <span className="inline-flex self-start items-center px-2.5 py-1 rounded-full bg-lilac text-plum text-[10px] font-bold uppercase tracking-[0.1em]">
                {a.category}
              </span>
              <h3 className="mt-4 text-[16px] font-bold text-ink leading-snug tracking-tight">{a.title}</h3>
              <p className="mt-2.5 text-[13px] text-ink/55 leading-relaxed line-clamp-2">{a.excerpt}</p>
              <span className="mt-5 pt-4 border-t border-line/70 flex items-center justify-between text-[11px] text-ink/45">
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {a.readTime}
                  </span>
                  <span>{a.date}</span>
                </span>
                <ChevronRight className="hv-slide w-4 h-4 text-plum" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <CtaLink href={SITE_ROUTES.blog} variant="outline" icon={FileText}>
            Browse the blog
          </CtaLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------- */}
      {/* 9 — CTA band                                               */}
      {/* ---------------------------------------------------------- */}
      <CtaBand
        title="Ready to give your pet the care they deserve?"
        subtitle="Online booking takes under two minutes and you will get a confirmation text straight away. Prefer to talk it through? Reception is open Mon–Fri 8:00–18:00 and Sat 9:00–14:00."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Call +1 415 555 0100"
        secondaryHref="tel:+14155550100"
      />
    </SitePage>
  );
}
