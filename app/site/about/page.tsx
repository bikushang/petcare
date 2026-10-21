'use client';

import {
  HeartHandshake, Microscope, Receipt, Users, Sparkles, ScanLine, Activity,
  FlaskConical, Stethoscope, Scissors, ShieldAlert, Cat, Hotel, BadgeCheck,
  PawPrint, HandHeart, School, Scan, Target, Compass,
} from 'lucide-react';
import { useCms } from '../../lib/cms';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, StatStrip,
  FeatureCard, SITE_ROUTES,
} from '../_components/site-chrome';

/* ---------------------------------------------------------------- */
/* Static page data                                                  */
/* ---------------------------------------------------------------- */

const VALUES = [
  {
    icon: HeartHandshake,
    title: 'Fear-free by default',
    body: 'Low-stress handling is not an upgrade you ask for — it is how we work. Pheromone-treated rooms, non-slip tables, treats before touch, and a team that will reschedule rather than force a restraint.',
  },
  {
    icon: Microscope,
    title: 'Evidence-based medicine',
    body: 'Treatment plans follow current AAHA and AAFP guidelines, not habit. If the literature does not support a test or a drug for your pet, we will tell you and save you the cost.',
  },
  {
    icon: Receipt,
    title: 'Radical transparency',
    body: 'Written estimates before every procedure, a phone call the moment a plan needs to change, and itemised invoices you can actually read. Our price list is published on the website.',
  },
  {
    icon: Users,
    title: 'Lifelong relationships',
    body: 'We would rather know your pet for fifteen years than see them once. Continuity of vet, proactive reminders, and a nurse who phones after every surgery and new diagnosis.',
  },
];

const MILESTONES = [
  {
    year: '2019',
    title: 'A single-vet practice above a bakery',
    body: 'Dr. Amara Rivera opened Vetnora Animal Hospital in two rented rooms above a bakery on Maple Avenue, seeing eleven patients in the first week and doing her own reception.',
  },
  {
    year: '2020',
    title: 'In-house laboratory and digital radiography',
    body: 'We installed haematology and biochemistry analysers plus a digital x-ray suite, cutting the wait for bloodwork and imaging results from several days to roughly twenty minutes.',
  },
  {
    year: '2021',
    title: 'AAHA accreditation earned',
    body: 'After a twelve-month preparation programme we passed the American Animal Hospital Association evaluation across more than 900 standards — a mark held by around 15% of US practices.',
  },
  {
    year: '2022',
    title: 'Fear Free certification for all clinical staff',
    body: 'Every veterinarian, nurse and technician completed Fear Free certification, and we rebuilt our consult rooms, waiting area and handling protocols around the curriculum.',
  },
  {
    year: '2023',
    title: 'The Riverside branch opens',
    body: 'A second site with two sterile surgical theatres, an isolation ward and a separate feline entrance opened across the water, bringing routine care within a short drive for Riverside families.',
  },
  {
    year: '2024',
    title: '24/7 emergency line and records portal',
    body: 'Out-of-hours calls began reaching a real veterinarian instead of a voicemail, and the client portal went live with lab results, vaccination histories and prescription refills.',
  },
  {
    year: '2026',
    title: 'Our 500th pet family registered',
    body: 'Seven years after the first consultation we welcomed our 500th registered family, with thirteen staff across two branches and a 4.9-star average from 487 reviews.',
  },
];

const FACILITIES = [
  {
    icon: ScanLine,
    title: 'Digital radiography',
    body: 'Full-body digital x-ray at both branches with images on screen in seconds and instant sharing to specialists for a second read.',
  },
  {
    icon: Activity,
    title: 'Ultrasound',
    body: 'Abdominal and cardiac ultrasound used for everything from bladder stones to murmur workups, with guided fine-needle sampling.',
  },
  {
    icon: FlaskConical,
    title: 'In-house analysers',
    body: 'Haematology and biochemistry analysers return full blood panels, electrolytes and clotting times during your appointment.',
  },
  {
    icon: Stethoscope,
    title: 'Dedicated dental suite',
    body: 'A separate dental theatre with intraoral radiography, ultrasonic scaling and high-speed extraction equipment — never a shared table.',
  },
  {
    icon: Scissors,
    title: 'Two sterile surgical theatres',
    body: 'Dedicated operating rooms with multiparameter anaesthetic monitoring, forced-air warming and a nurse whose only job is your pet.',
  },
  {
    icon: ShieldAlert,
    title: 'Isolation ward',
    body: 'A negative-pressure ward with its own entrance, air handling and equipment for suspected infectious cases such as parvovirus.',
  },
  {
    icon: Cat,
    title: 'Separate feline waiting area',
    body: 'Cats wait in a quiet, dog-free room with elevated carrier shelves, pheromone diffusers and a direct route to the cat consult room.',
  },
  {
    icon: Hotel,
    title: 'Climate-controlled kennels',
    body: 'Boarding kennels held at a steady temperature with individual runs, sound dampening and a nurse on site for medication rounds.',
  },
];

const CREDENTIALS = [
  {
    monogram: 'AAHA',
    name: 'AAHA accredited',
    body: 'Evaluated against more than 900 standards of veterinary care, re-inspected every three years. First accredited in 2021.',
  },
  {
    monogram: 'FF',
    name: 'Fear Free certified practice',
    body: 'All thirteen staff hold individual Fear Free certification, and the practice itself is certified for low-stress facility design.',
  },
  {
    monogram: 'AVMA',
    name: 'AVMA member',
    body: 'Every veterinarian on staff is a member of the American Veterinary Medical Association and bound by its principles of ethics.',
  },
  {
    monogram: 'CVMA',
    name: 'California VMA',
    body: 'Active members of the California Veterinary Medical Association, including its continuing-education and legislative programmes.',
  },
  {
    monogram: 'CFP',
    name: 'Cat Friendly Practice — Gold',
    body: 'Gold-level recognition from the American Association of Feline Practitioners for feline-specific handling and facilities.',
  },
];

const OUTREACH = [
  {
    icon: Scan,
    title: 'Low-cost microchipping clinics',
    body: 'Every second Saturday we run a walk-in microchip clinic at the Vetnora branch for $20 including lifetime registration — 1,180 pets chipped so far.',
  },
  {
    icon: PawPrint,
    title: 'Bay Area Paws Rescue partnership',
    body: 'We provide free intake exams, vaccinations and desexing for every animal taken in by Bay Area Paws Rescue, and host their adoption days twice a year.',
  },
  {
    icon: School,
    title: 'School visits',
    body: 'Our nurses visit local primary schools with a teaching programme on responsible pet care, bite prevention and how to read an animal that wants to be left alone.',
  },
  {
    icon: HandHeart,
    title: 'Senior-pet subsidy fund',
    body: 'A client-funded pot that covers diagnostics and pain management for pets over twelve whose families are facing hardship. 46 pets helped in 2025.',
  },
];

const HERO_IMAGE = 'https://images.pexels.com/photos/2598683/pexels-photo-2598683.jpeg?auto=compress&cs=tinysrgb&w=800';

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function AboutPage() {
  const { content } = useCms();
  const about = content.about;

  return (
    <SitePage>
      {/* 1 — Hero */}
      <PageHero
        eyebrow="About us"
        title="Seven years of putting animals first"
        breadcrumb="About"
        subtitle="Vetnora Animal Hospital started in 2019 with one veterinarian and a second-hand exam table. Today we are thirteen people across two Bay Area branches, caring for more than 500 pet families with the same promise we opened with."
      >
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={SITE_ROUTES.team} variant="white" icon={Users}>Meet the team</CtaLink>
          <CtaLink href={SITE_ROUTES.book} variant="ghost">Book a visit</CtaLink>
        </div>
      </PageHero>

      {/* 2 — Our story */}
      <Section id="story">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-plum mb-2.5">
              Our story
            </span>
            <h2 className="text-2xl md:text-[34px] font-bold text-ink leading-[1.15] tracking-tight">
              {about.sectionTitle}
            </h2>
            <div className="mt-5 space-y-4 text-[15px] text-ink/65 leading-relaxed">
              <p>{about.paragraph1}</p>
              <p>{about.paragraph2}</p>
              <p>
                The turning point came in 2023, when we opened the Riverside branch. Families on the
                far side of the water were driving forty minutes for a vaccination appointment, so we
                fitted out a second site with its own surgical theatres, isolation ward and feline
                entrance — then staffed it with vets who already knew those patients by name. Two
                branches, one set of records, and no pet treated as a stranger.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {['Founded 2019', 'Vetnora & Riverside', '13 staff', 'Rated 4.9 from 487 reviews'].map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lilac text-plum text-[12px] font-semibold"
                >
                  <BadgeCheck className="w-3.5 h-3.5" /> {pill}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-8 -right-6 w-56 h-56 rounded-full bg-lilac blur-3xl" aria-hidden="true" />
            <img
              src={about.aboutImage}
              alt="A veterinarian examining a calm dog on a consulting table at Vetnora Animal Hospital"
              className="relative w-full h-[320px] sm:h-[420px] object-cover rounded-3xl border border-line shadow-lift"
            />
            <div className="relative -mt-10 ml-4 mr-8 sm:mr-16 rounded-2xl border border-line bg-white p-5 shadow-lift-sm">
              <p className="text-[13px] text-ink/65 leading-relaxed italic">
                &ldquo;We opened with eleven patients in the first week. The promise has not changed
                since — explain everything, rush nothing, and treat the animal in front of you like
                your own.&rdquo;
              </p>
              <p className="mt-3 text-[12px] font-semibold text-plum">
                Dr. Amara Rivera, DVM · Clinical Director &amp; co-founder
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 3 — Mission & values */}
      <Section id="values" alt>
        <SectionHeading
          eyebrow="Mission & values"
          title="Medicine we would want for our own animals"
          subtitle="Four commitments shape every consultation, estimate and follow-up call at Vetnora. They are written on the wall of the staff room, and they decide how we hire."
        />

        <div className="relative overflow-hidden rounded-3xl bg-grape p-8 md:p-12 mb-10">
          <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-iris/30 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-28 -left-14 w-72 h-72 rounded-full bg-plum/50 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-coral mb-3">
              <Target className="w-3.5 h-3.5" /> Our mission
            </span>
            <p className="text-xl md:text-2xl font-semibold text-white leading-snug tracking-tight">
              To give every animal in our community modern, evidence-based veterinary medicine
              delivered without fear — and to give every owner enough information to make a decision
              they feel good about.
            </p>
            <p className="mt-5 text-[14px] text-white/65 leading-relaxed">
              That means investing in diagnostics a practice our size is not expected to own,
              publishing our prices, and protecting the unhurried thirty-minute consultation even
              when the waiting room is full.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => (
            <FeatureCard key={v.title} icon={v.icon} title={v.title}>
              {v.body}
            </FeatureCard>
          ))}
        </div>
      </Section>

      {/* 4 — Milestones at a glance */}
      <Section id="numbers" tight>
        <div className="max-w-3xl mx-auto text-center mb-9">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-plum mb-2.5">
            By the numbers
          </span>
          <p className="text-[15px] text-ink/60 leading-relaxed">
            Seven years of steady, deliberate growth — never faster than we could hire and train for.
          </p>
        </div>
        <StatStrip
          stats={[
            { value: '500+', label: 'Pet families' },
            { value: '7', label: 'Years of service' },
            { value: '13', label: 'Staff members' },
            { value: '2', label: 'Branches' },
            { value: '4.9', label: 'From 487 reviews' },
          ]}
        />
      </Section>

      {/* 5 — Timeline */}
      <Section id="timeline" className="border-t border-line">
        <SectionHeading
          eyebrow="Timeline"
          title="How a two-room practice became a two-branch hospital"
          subtitle="Every step below was funded out of the practice rather than borrowed against it, which is why it took seven years instead of three."
        />

        <div className="relative">
          <span
            className="absolute left-[11px] lg:left-1/2 top-2 bottom-2 w-px bg-line lg:-translate-x-[0.5px]"
            aria-hidden="true"
          />

          <ol className="space-y-7 lg:space-y-10">
            {MILESTONES.map((m, i) => (
              <li key={m.year} className="relative pl-10 lg:pl-0 lg:grid lg:grid-cols-2 lg:gap-14">
                <span
                  className="absolute left-[11px] lg:left-1/2 top-5 w-3 h-3 -translate-x-1/2 rounded-full bg-iris ring-4 ring-white"
                  aria-hidden="true"
                />
                <div className={i % 2 === 0 ? 'lg:text-right lg:pr-2' : 'lg:col-start-2 lg:pl-2'}>
                  <div className="hv-card rounded-2xl border border-line bg-white p-5 md:p-6 hover:border-plum/25">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-lilac text-plum text-[12px] font-bold tracking-wide">
                      {m.year}
                    </span>
                    <h3 className="mt-3 text-[16px] font-semibold text-ink">{m.title}</h3>
                    <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">{m.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* 6 — Facilities & equipment */}
      <Section id="facilities" alt>
        <SectionHeading
          eyebrow="Facilities & equipment"
          title="Diagnostics and surgery handled on site"
          subtitle="Almost nothing gets sent away. Owning the equipment means same-visit answers, fewer referrals, and a price we control."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FACILITIES.map((f) => (
            <div
              key={f.title}
              className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-[13px] text-ink/55 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 7 — Accreditations & memberships */}
      <Section id="accreditations">
        <SectionHeading
          eyebrow="Accreditations & memberships"
          title="Standards we are measured against"
          subtitle="Accreditation is voluntary in the United States, and most practices never apply. We did, and we are re-inspected on a schedule we do not control."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CREDENTIALS.map((c) => (
            <div
              key={c.monogram}
              className="hv-card group flex items-start gap-4 rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <span className="hv-tile shrink-0 w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center font-bold text-[13px] tracking-tight border border-plum/10">
                {c.monogram}
              </span>
              <div>
                <h3 className="text-[15px] font-semibold text-ink flex items-center gap-1.5">
                  {c.name}
                  <BadgeCheck className="w-4 h-4 text-iris shrink-0" />
                </h3>
                <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-7 text-[12px] text-ink/45 max-w-2xl">
          Licence and accreditation certificates are displayed at reception in both branches. We are
          happy to show you the inspection reports on request.
        </p>
      </Section>

      {/* 8 — Community outreach */}
      <Section id="community" alt>
        <SectionHeading
          eyebrow="Community outreach"
          title="Care beyond the consult room"
          subtitle="Roughly five percent of our clinical hours are given to the community each year. These are the four programmes we commit to."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {OUTREACH.map((o) => (
              <div
                key={o.title}
                className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
              >
                <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <o.icon className="w-6 h-6" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2">{o.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{o.body}</p>
              </div>
            ))}
          </div>

          <div className="space-y-5">
            <img
              src={HERO_IMAGE}
              alt="A rescue dog waiting to be examined during a Bay Area Paws Rescue adoption day"
              className="w-full h-48 object-cover rounded-2xl border border-line shadow-lift-sm"
            />
            <div className="relative overflow-hidden rounded-2xl bg-plum p-6 text-white">
              <div
                className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-iris/40 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <span className="hv-tile w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="text-[16px] font-semibold">Want to give back with us?</h3>
                <p className="mt-2 text-[13px] text-white/70 leading-relaxed">
                  Round your invoice up to the nearest dollar and the difference goes straight into
                  the senior-pet subsidy fund. Ask reception, or add it when you book — it raised
                  $9,400 last year.
                </p>
                <div className="mt-5">
                  <CtaLink href={SITE_ROUTES.contact} variant="white" icon={HandHeart}>
                    Join the fund
                  </CtaLink>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-white p-5">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </span>
              <p className="text-[12px] text-ink/55 leading-relaxed">
                Microchip clinics run every second Saturday, 9:00–13:00, at 128 Maple Avenue,
                Vetnora. No appointment needed — bring any paperwork you already have.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 9 — CTA band */}
      <CtaBand
        title="Come and see the practice for yourself"
        subtitle="Book a consultation, or ask reception for a tour of the Vetnora or Riverside branch before you register — we are glad to show you the wards and theatres."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Meet the team"
        secondaryHref={SITE_ROUTES.team}
      />
    </SitePage>
  );
}
