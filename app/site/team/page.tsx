'use client';

import {
  Stethoscope, HeartPulse, Cat, Bone, Bird, Siren, Syringe, Scan, Apple,
  Activity, Phone, Receipt, Scissors, Users, GraduationCap, CalendarDays,
  ShieldCheck, MessageSquare, Languages, MapPin, Clock, Wallet, BadgeCheck,
  Briefcase, type LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, SITE_ROUTES,
} from '../_components/site-chrome';

/* ---------------------------------------------------------------- */
/* Static page data                                                  */
/* ---------------------------------------------------------------- */

type Person = {
  name: string;
  credential?: string;
  role: string;
  initials: string;
  focus: string[];
  bio: string;
  languages: string;
  icon: LucideIcon;
};

const LEADERSHIP: Person[] = [
  {
    name: 'Dr. Amara Rivera',
    credential: 'DVM',
    role: 'Clinical Director & co-founder',
    initials: 'AR',
    focus: ['Soft-tissue surgery', 'UC Davis', '14 years in practice', 'Fear Free certified'],
    bio: 'Amara graduated from UC Davis School of Veterinary Medicine and spent six years in a busy referral hospital before opening Northgate in two rented rooms on Maple Avenue in 2019. She still operates four days a week — soft-tissue work is her first love, from complex wound reconstruction to gastrointestinal foreign bodies — and she sets the clinical protocols both branches follow. If a case is complicated, she is the one who phones you at the end of the day to talk it through.',
    languages: 'English, Spanish',
    icon: Stethoscope,
  },
  {
    name: 'Nadia Okonkwo',
    role: 'Practice Manager',
    initials: 'NO',
    focus: ['Operations', 'Client care', 'Joined 2020', 'Two-branch scheduling'],
    bio: 'Nadia joined in 2020 when the practice had four staff and one appointment book, and she built everything that keeps thirteen people and two branches running: the rota, the stock system, the reminder schedules and the complaints process. She owns client care, which means she personally reads every piece of feedback we receive and answers the difficult emails herself. If you have ever had a billing query sorted out in one phone call, that was her work.',
    languages: 'English, Igbo',
    icon: Briefcase,
  },
];

const VETS: Person[] = [
  {
    name: 'Dr. Jonah Pike',
    credential: 'DVM',
    role: 'Senior Veterinarian',
    initials: 'JP',
    focus: ['Internal medicine', 'Cardiology', 'Echocardiography'],
    bio: 'Runs our cardiology clinic and works up the chronic cases — heart murmurs, kidney disease and the diabetics who need their curves read properly.',
    languages: 'English',
    icon: HeartPulse,
  },
  {
    name: 'Dr. Mei-Lin Soto',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'MS',
    focus: ['Feline medicine', 'Fear Free certified', 'Cat Friendly Practice'],
    bio: 'Led our Gold-level Cat Friendly Practice accreditation and sees cats almost exclusively, often on the floor of the consult room rather than the table.',
    languages: 'English, Mandarin',
    icon: Cat,
  },
  {
    name: 'Dr. Thomas Abara',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'TA',
    focus: ['Orthopaedic surgery', 'Cruciate repair', 'Fracture management'],
    bio: 'Handles our orthopaedic caseload, from cruciate and patella work to fracture repair, and reviews every post-operative rehabilitation plan himself.',
    languages: 'English, Yoruba',
    icon: Bone,
  },
  {
    name: 'Dr. Hana Feldman',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'HF',
    focus: ['Exotics', 'Avian medicine', 'Small mammals'],
    bio: 'Our exotics vet — rabbits, guinea pigs, parrots, reptiles — with a dedicated quiet room and species-appropriate housing for every exotic inpatient.',
    languages: 'English, Hebrew',
    icon: Bird,
  },
  {
    name: 'Dr. Lucas Grant',
    credential: 'DVM',
    role: 'Veterinarian',
    initials: 'LG',
    focus: ['Emergency medicine', 'Critical care', 'Toxicology'],
    bio: 'Covers emergency and critical care and is usually the voice on the end of the 24/7 line when something goes wrong at two in the morning.',
    languages: 'English, French',
    icon: Siren,
  },
];

const NURSES = [
  {
    name: 'Priya Raman',
    credential: 'RVT',
    role: 'Lead Veterinary Nurse',
    initials: 'PR',
    focus: ['Anaesthesia', 'Theatre management', 'Mentoring'],
    bio: 'Priya monitors anaesthesia for every major surgery and trains the nursing team. She is the reason our theatre checklists exist.',
    icon: Syringe,
  },
  {
    name: 'Dev Oyelaran',
    credential: 'RVT',
    role: 'Veterinary Nurse',
    initials: 'DO',
    focus: ['Dentistry', 'Radiography', 'Intraoral imaging'],
    bio: 'Dev runs the dental suite alongside the vets and takes most of our radiographs, including the intraoral films that find hidden root disease.',
    icon: Scan,
  },
  {
    name: 'Clara Nwosu',
    credential: 'VA',
    role: 'Veterinary Assistant',
    initials: 'CN',
    focus: ['Nutrition counselling', 'Weight clinics', 'Puppy classes'],
    bio: 'Clara leads our free weight-management clinics and builds the feeding plans for pets recovering from surgery or managing kidney disease.',
    icon: Apple,
  },
  {
    name: 'Owen Bexley',
    credential: 'RVT',
    role: 'Veterinary Nurse',
    initials: 'OB',
    focus: ['Emergency triage', 'Fluid therapy', 'Inpatient care'],
    bio: 'Owen triages every walk-in emergency and runs the inpatient ward overnight, which means he knows exactly how your pet slept.',
    icon: Activity,
  },
];

const SUPPORT = [
  {
    name: 'Rosa Delgado',
    role: 'Reception Lead',
    initials: 'RD',
    focus: ['Front desk', 'Appointment triage', 'Both branches'],
    bio: 'Rosa and her two colleagues answer the phones, judge which calls need a vet today rather than next week, and remember your pet\'s name before you give it.',
    languages: 'English, Spanish',
    icon: Phone,
  },
  {
    name: 'Marcus Idowu',
    role: 'Billing & Insurance Coordinator',
    initials: 'MI',
    focus: ['Written estimates', 'Insurance claims', 'Payment plans'],
    bio: 'Marcus prepares every written estimate, submits insurance claims directly to the major providers, and arranges staged payment plans where treatment cannot wait.',
    languages: 'English',
    icon: Receipt,
  },
  {
    name: 'Fiona Brady',
    role: 'Grooming & Boarding Supervisor',
    initials: 'FB',
    focus: ['Breed grooming', 'Boarding rounds', 'Medicated baths'],
    bio: 'Fiona supervises the grooming room and the boarding kennels, coordinating medication rounds with the nursing team for pets staying with us.',
    languages: 'English',
    icon: Scissors,
  },
];

const CULTURE = [
  {
    icon: Users,
    title: 'Weekly case rounds',
    body: 'Every Wednesday the whole clinical team sits down for ninety minutes to present difficult cases. Nurses present as often as vets, and nothing is too basic to ask.',
  },
  {
    icon: ShieldCheck,
    title: 'Mandatory Fear Free certification',
    body: 'Every clinical hire completes Fear Free certification within their first six months, paid for by the practice and protected in work time rather than done on a weekend.',
  },
  {
    icon: GraduationCap,
    title: 'Continuing-education stipend',
    body: 'Each member of staff gets an annual CE budget and paid study leave — $3,000 and five days for veterinarians, $1,200 and three days for nurses and assistants.',
  },
  {
    icon: MessageSquare,
    title: 'No-shame error reporting',
    body: 'Near misses are logged without blame and reviewed monthly for what the system got wrong, not who did. It is the single biggest reason our medication error rate is so low.',
  },
  {
    icon: CalendarDays,
    title: 'Four-day clinical weeks',
    body: 'Clinical staff work four longer days rather than five. Burnout is the profession\'s worst problem, and a rested vet makes better decisions on the fourth consult of the morning.',
  },
  {
    icon: BadgeCheck,
    title: 'Continuity of care',
    body: 'We roster so your pet sees the same veterinarian wherever possible, and we hand over in person — never by note alone — when a case changes hands between branches.',
  },
];

const ROLES = [
  {
    title: 'Associate Veterinarian',
    branch: 'Riverside branch',
    type: 'Full-time · 4-day week',
    salary: '$130,000 – $165,000 DOE',
    body: 'A four-day clinical week with mentorship from our Clinical Director, a protected 30-minute consult model, and a genuine say in your own caseload. New graduates with a structured first year are welcome to apply.',
  },
  {
    title: 'Registered Veterinary Technician',
    branch: 'Northgate branch',
    type: 'Full-time',
    salary: '$68,000 – $82,000 DOE',
    body: 'Join Priya\'s nursing team across anaesthesia, dentistry and inpatient care. RVT licence required; we will fund your Fear Free certification and a VTS pathway if you want one.',
  },
  {
    title: 'Weekend Client Care Associate',
    branch: 'Northgate branch',
    type: 'Part-time · Sat & alternate Fri',
    salary: '$24 – $29 per hour',
    body: 'Front-desk work for someone who is calm on the phone and warm in person. No veterinary experience needed — we train, and plenty of our nurses started at the front desk.',
  },
];

const BENEFITS = [
  { icon: Wallet, label: 'Health, dental & vision from day one' },
  { icon: GraduationCap, label: 'Annual CE budget + paid study leave' },
  { icon: CalendarDays, label: '4-day clinical weeks, no on-call rota' },
  { icon: ShieldCheck, label: '100% staff pet care at cost' },
  { icon: Clock, label: '21 days PTO rising with tenure' },
];

/* ---------------------------------------------------------------- */
/* Small building blocks                                             */
/* ---------------------------------------------------------------- */

function Monogram({ initials, size = 'md' }: { initials: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={`hv-tile shrink-0 rounded-full bg-lilac text-plum font-bold flex items-center justify-center ${
        size === 'lg' ? 'w-20 h-20 text-xl' : 'w-12 h-12 text-sm'
      }`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-lilac text-plum text-[11px] font-semibold">
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function TeamPage() {
  return (
    <SitePage>
      {/* 1 — Hero */}
      <PageHero
        eyebrow="Our people"
        title="Thirteen people who treat your pet like their own"
        breadcrumb="Team"
        subtitle="Six veterinarians, four nurses and technicians, and three client-care staff across our Northgate and Riverside branches. Every clinical member of the team is Fear Free certified, and most of them have been here for years — which is exactly the point."
      >
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={SITE_ROUTES.book} variant="white">Book with a vet</CtaLink>
          <CtaLink href={SITE_ROUTES.about} variant="ghost">Our story</CtaLink>
        </div>
      </PageHero>

      {/* 2 — Leadership */}
      <Section id="leadership">
        <SectionHeading
          eyebrow="Leadership"
          title="The two people who set the standard"
          subtitle="One runs the medicine, the other runs everything that lets the medicine happen on time. Between them they have been here since the first week."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {LEADERSHIP.map((p) => (
            <article
              key={p.name}
              className="hv-card group rounded-3xl border border-line bg-white p-7 md:p-8 hover:border-plum/25"
            >
              <div className="flex items-start gap-5">
                <Monogram initials={p.initials} size="lg" />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-ink tracking-tight">
                    {p.name}
                    {p.credential && <span className="text-ink/45 font-semibold"> {p.credential}</span>}
                  </h3>
                  <p className="mt-1 text-[13px] font-semibold text-plum">{p.role}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink/50">
                    <Languages className="w-3.5 h-3.5 shrink-0" /> {p.languages}
                  </p>
                </div>
                <span className="ml-auto hidden sm:flex shrink-0 w-11 h-11 rounded-xl bg-canvas text-plum items-center justify-center border border-line">
                  <p.icon className="w-5 h-5" />
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {p.focus.map((f) => <Pill key={f}>{f}</Pill>)}
              </div>

              <p className="mt-5 text-[14px] text-ink/60 leading-relaxed">{p.bio}</p>

              <div className="mt-6 pt-5 border-t border-line">
                <CtaLink href={SITE_ROUTES.book} variant="outline">
                  Book with {p.name.split(' ').slice(0, 2).join(' ')}
                </CtaLink>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* 3 — Veterinarians */}
      <Section id="veterinarians" alt>
        <SectionHeading
          eyebrow="Veterinarians"
          title="Five vets with five different specialisms"
          subtitle="We roster deliberately so that a cardiology case, a rabbit and a 3am emergency each reach the person best placed to handle it — without a referral and without a wait."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {VETS.map((p) => (
            <article
              key={p.name}
              className="hv-card group flex flex-col rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <div className="flex items-start gap-4">
                <Monogram initials={p.initials} />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-ink leading-snug">
                    {p.name}
                    {p.credential && <span className="text-ink/45"> {p.credential}</span>}
                  </h3>
                  <p className="mt-0.5 text-[12px] font-semibold text-plum">{p.role}</p>
                </div>
                <span className="ml-auto shrink-0 text-plum/70">
                  <p.icon className="w-5 h-5" />
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.focus.map((f) => <Pill key={f}>{f}</Pill>)}
              </div>

              <p className="mt-4 text-[13px] text-ink/55 leading-relaxed">{p.bio}</p>

              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink/45">
                <Languages className="w-3.5 h-3.5 shrink-0" /> {p.languages}
              </p>

              <div className="mt-5 pt-4 border-t border-line">
                <CtaLink href={SITE_ROUTES.book} variant="outline" className="!h-10 !px-4 !text-[13px]">
                  Book with {p.name.split(' ').slice(0, 2).join(' ')}
                </CtaLink>
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* 4 — Nurses & technicians */}
      <Section id="nurses">
        <SectionHeading
          eyebrow="Veterinary nurses & technicians"
          title="The people your pet actually spends the day with"
          subtitle="Our nurses monitor anaesthesia, run the dental suite, build nutrition plans and sit with inpatients overnight. They are registered professionals, not assistants."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {NURSES.map((p) => (
            <article
              key={p.name}
              className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <div className="flex items-center gap-3">
                <Monogram initials={p.initials} />
                <span className="ml-auto w-9 h-9 rounded-lg bg-canvas border border-line text-plum flex items-center justify-center shrink-0">
                  <p.icon className="w-4 h-4" />
                </span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold text-ink">
                {p.name} <span className="text-ink/45">{p.credential}</span>
              </h3>
              <p className="mt-0.5 text-[12px] font-semibold text-plum">{p.role}</p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {p.focus.map((f) => <Pill key={f}>{f}</Pill>)}
              </div>
              <p className="mt-3.5 text-[13px] text-ink/55 leading-relaxed">{p.bio}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* 5 — Client care & support */}
      <Section id="support" alt>
        <SectionHeading
          eyebrow="Client care & support"
          title="Reception, billing and boarding"
          subtitle="Three people who make sure the phone is answered by someone who can help, the estimate is written down before anything starts, and your boarding pet gets their tablets on time."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SUPPORT.map((p) => (
            <article
              key={p.name}
              className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <div className="flex items-start gap-4">
                <Monogram initials={p.initials} />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-ink leading-snug">{p.name}</h3>
                  <p className="mt-0.5 text-[12px] font-semibold text-plum">{p.role}</p>
                </div>
                <span className="ml-auto shrink-0 text-plum/70">
                  <p.icon className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.focus.map((f) => <Pill key={f}>{f}</Pill>)}
              </div>
              <p className="mt-4 text-[13px] text-ink/55 leading-relaxed">{p.bio}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink/45">
                <Languages className="w-3.5 h-3.5 shrink-0" /> {p.languages}
              </p>
            </article>
          ))}
        </div>
      </Section>

      {/* 6 — Our culture */}
      <Section id="culture">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-2">
            <SectionHeading
              eyebrow="Our culture"
              title="How this team actually works"
              subtitle="Good medicine is a staffing decision. These are the six practices we protect even when the diary is full — and the reason our average tenure is over four years."
              center={false}
              className="mb-8"
            />
            <img
              src="https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Veterinary staff discussing a patient's notes together in the Northgate treatment room"
              className="w-full h-56 object-cover rounded-2xl border border-line shadow-lift-sm"
            />
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-canvas border border-line p-5">
              <span className="shrink-0 w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
                <Users className="w-5 h-5" />
              </span>
              <p className="text-[12px] text-ink/55 leading-relaxed">
                Thirteen staff, two branches, and an average tenure of four years and three months.
                Nine of the thirteen have been here since before the Riverside branch opened.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 divide-y divide-line rounded-2xl border border-line bg-white">
            {CULTURE.map((c) => (
              <div key={c.title} className="group flex items-start gap-4 p-5 md:p-6">
                <span className="hv-tile shrink-0 w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center">
                  <c.icon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 7 — Careers */}
      <Section id="careers" alt>
        <SectionHeading
          eyebrow="Careers"
          title="Three roles open right now"
          subtitle="We hire for temperament first and train for the rest. Send a CV and a short note about the kind of practice you want to work in — Nadia reads every application herself."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {ROLES.map((r) => (
            <article
              key={r.title}
              className="hv-card group flex flex-col rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </span>
              <h3 className="text-[16px] font-semibold text-ink leading-snug">{r.title}</h3>

              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex items-center gap-2 text-ink/60">
                  <dt className="sr-only">Location</dt>
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-plum" />
                  <dd>{r.branch}</dd>
                </div>
                <div className="flex items-center gap-2 text-ink/60">
                  <dt className="sr-only">Type</dt>
                  <Clock className="w-3.5 h-3.5 shrink-0 text-plum" />
                  <dd>{r.type}</dd>
                </div>
                <div className="flex items-center gap-2 text-ink/60">
                  <dt className="sr-only">Salary band</dt>
                  <Wallet className="w-3.5 h-3.5 shrink-0 text-plum" />
                  <dd className="font-semibold text-ink/75">{r.salary}</dd>
                </div>
              </dl>

              <p className="mt-4 text-[13px] text-ink/55 leading-relaxed flex-1">{r.body}</p>

              <div className="mt-6">
                <CtaLink href={SITE_ROUTES.contact} variant="primary" className="!h-10 !px-4 !text-[13px]">
                  Apply
                </CtaLink>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-white p-6">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-plum mb-5">
            What we offer every member of staff
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {BENEFITS.map((b) => (
              <div key={b.label} className="flex items-start gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-lilac text-plum flex items-center justify-center">
                  <b.icon className="w-4 h-4" />
                </span>
                <p className="text-[12px] text-ink/60 leading-relaxed">{b.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[12px] text-ink/45">
            No suitable role listed? Speculative applications are genuinely welcome — email
            reception@northgatevet.com and we will keep your details on file for six months.
          </p>
        </div>
      </Section>

      {/* 8 — CTA band */}
      <CtaBand
        title="Choose your vet and book a time that suits you"
        subtitle="Request a specific veterinarian when you book, or call +1 415 555 0100 and reception will match you to the right person for your pet."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Ask us a question"
        secondaryHref={SITE_ROUTES.contact}
      />
    </SitePage>
  );
}
