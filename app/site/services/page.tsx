'use client';

import {
  PawPrint, Stethoscope, Syringe, FlaskConical, Pill, Scissors, Hotel,
  Calendar, Check, ChevronRight, Clock, Microscope, HeartPulse, Activity,
  ShieldCheck, Bath, Dog, Cat, Video, Truck, BellRing, Sparkles, ClipboardList,
  Thermometer, Droplets, Timer, Smile, TestTubes, Gauge, Package, ListChecks,
  Weight, Users, ScanLine, type LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, StatStrip,
  SITE_ROUTES,
} from '../_components/site-chrome';
import { useCms } from '../../lib/cms';

/* ---------------------------------------------------------------- */
/* Static data                                                       */
/* ---------------------------------------------------------------- */

const SERVICE_ICONS: Record<string, LucideIcon> = {
  Stethoscope,
  Syringe,
  FlaskConical,
  Pill,
  Scissors,
  Hotel,
  PawPrint,
  Microscope,
  HeartPulse,
};

/** Which detail section each CMS service card jumps to. */
const SERVICE_ANCHORS: Record<string, string> = {
  'svc-1': '#wellness',
  'svc-2': '#wellness',
  'svc-3': '#surgery',
  'svc-4': '#diagnostics',
  'svc-5': '#pharmacy',
  'svc-6': '#grooming',
  'svc-7': '#grooming',
  'svc-8': '#dentistry',
};

const WELLNESS_CHECKLIST = [
  { title: 'Annual nose-to-tail examination', body: 'Weight, body-condition score, heart and lung auscultation, eyes, ears, skin, joints and abdomen.' },
  { title: 'Core and lifestyle vaccines', body: 'DHPP, rabies and FVRCP as standard; leptospirosis, kennel cough and FeLV where the pet’s lifestyle warrants it.' },
  { title: 'Parasite prevention', body: 'Year-round flea, tick and worm cover matched to your pet’s weight, plus a faecal screen.' },
  { title: 'Weight and nutrition plan', body: 'A written calorie target and food recommendation, with free nurse weigh-ins every six weeks.' },
  { title: 'Dental scoring', body: 'Every mouth is graded 0–4 so you can see plaque and gingivitis trends year over year.' },
  { title: 'Bloodwork baselines for seniors', body: 'From age seven we run an annual panel so subtle kidney, liver and thyroid changes are caught early.' },
];

const DIAGNOSTIC_CAPABILITIES = [
  { icon: TestTubes, title: 'In-house haematology & biochemistry', body: 'Full blood count and organ panels run in our own lab, with results reviewed by the vet in under 30 minutes.' },
  { icon: ScanLine, title: 'Digital radiography', body: 'Low-dose digital X-ray with instant image review, so we can reposition without a second sedation.' },
  { icon: HeartPulse, title: 'Abdominal & cardiac ultrasound', body: 'Real-time imaging of liver, bladder, kidneys and heart — including echocardiography for murmur work-ups.' },
  { icon: Microscope, title: 'Cytology', body: 'Same-visit microscopy for ear swabs, skin scrapes, fine-needle aspirates and fluid analysis.' },
  { icon: Droplets, title: 'Urinalysis', body: 'Dipstick, specific gravity, sediment review and in-house culture screening for recurrent cystitis.' },
  { icon: FlaskConical, title: 'External reference laboratory', body: 'Histopathology, endocrine assays and PCR panels sent to our partner lab with courier collection twice daily.' },
];

const TURNAROUND = [
  { test: 'Blood count & biochemistry', time: 'Under 30 minutes' },
  { test: 'Urinalysis', time: 'Same visit' },
  { test: 'Cytology & ear swabs', time: 'Same visit' },
  { test: 'Digital radiographs', time: 'Immediate review' },
  { test: 'Endocrine & PCR panels', time: '2–3 working days' },
  { test: 'Histopathology', time: '3–5 working days' },
];

const SOFT_TISSUE = [
  'Spay and neuter, including paediatric and large-breed protocols',
  'Mass and lump removal with margins planned from cytology',
  'Cystotomy for bladder stones',
  'Foreign-body retrieval from stomach and intestine',
  'Wound reconstruction, abscess drainage and laceration repair',
];

const ORTHOPAEDIC = [
  'Cranial cruciate ligament repair',
  'Medial patella luxation correction',
  'Fracture fixation with plates, pins and external coaptation',
  'Femoral head and neck excision',
  'Joint taps and arthroscopy-assisted assessment',
];

const ANAESTHESIA = [
  { icon: Users, title: 'A dedicated surgical nurse', body: 'One nurse stays with your pet from premedication to discharge — they never monitor two patients at once.' },
  { icon: Activity, title: 'Multimodal pain control', body: 'Local blocks, opioids and anti-inflammatories layered together so we use less anaesthetic gas overall.' },
  { icon: ClipboardList, title: 'Individualised anaesthetic plans', body: 'Drug choice and dose are written for the patient’s age, breed, weight and organ function — never a fixed recipe.' },
  { icon: FlaskConical, title: 'Pre-operative bloodwork', body: 'Run the morning of surgery to confirm kidney, liver and clotting function before induction.' },
  { icon: Gauge, title: 'Continuous monitoring', body: 'ECG, capnography, blood pressure, pulse oximetry and core temperature logged every five minutes.' },
  { icon: Thermometer, title: 'Warming and recovery care', body: 'Forced-air warming on the table and heated recovery kennels until your pet is fully awake and comfortable.' },
];

const SURGERY_DAY = [
  { step: '1', time: '7:30 – 8:30', title: 'Admission and pre-op check', body: 'A nurse walks you through the written estimate and consent, then the surgeon examines your pet and runs pre-op bloodwork.' },
  { step: '2', time: '9:00 – 13:00', title: 'Premedication and procedure', body: 'Pain relief and sedation first, then an IV catheter, induction and the procedure itself with a nurse monitoring throughout.' },
  { step: '3', time: 'Recovery', title: 'Warmed recovery and first call', body: 'Your pet wakes in a heated kennel under direct observation. We phone you as soon as they lift their head.' },
  { step: '4', time: '16:00 – 18:00', title: 'Discharge and follow-up', body: 'A nurse demonstrates wound care and medication, books the free 10-day recheck, and we call again the next morning.' },
];

const DENTISTRY_STEPS = [
  { icon: ScanLine, title: 'Full-mouth radiographs', body: 'Taken under anaesthesia on every dental patient — around 60% of dental disease sits below the gum line where it is invisible on a conscious exam.' },
  { icon: Sparkles, title: 'Ultrasonic scaling and polishing', body: 'Calculus removed above and below the gum line, then every tooth polished to slow plaque returning.' },
  { icon: ClipboardList, title: 'Periodontal charting', body: 'Pocket depths, mobility and furcation recorded tooth by tooth, so you receive a dental map you can compare next year.' },
  { icon: Scissors, title: 'Extractions', body: 'Surgical extraction with local blocks and closure of the socket when a tooth cannot be saved.' },
  { icon: Smile, title: 'Home-care coaching', body: 'A nurse shows you brushing technique on your own pet and sends you home with a size-matched brush and paste.' },
  { icon: BellRing, title: 'Recheck and reminders', body: 'A free nurse oral check at two weeks, then annual dental scoring at every wellness visit.' },
];

const GROOMING_SERVICES = [
  'Breed-specific clipping and hand-stripping to the correct standard for the coat',
  'Medicated baths for allergies, yeast and seborrhoea, prescribed by the vet',
  'De-shedding treatments for double-coated breeds such as Huskies and German Shepherds',
  'Nail trimming, pad shaving and sanitary trims',
  'Ear cleaning and plucking, with a vet check if anything looks inflamed',
];

const BOARDING_FEATURES = [
  { icon: Hotel, title: 'Individual runs', body: 'Every dog has their own insulated run with raised bedding — no shared pens and no stacked crates.' },
  { icon: Dog, title: 'Three walks a day', body: 'Morning, afternoon and evening garden walks, plus one-to-one play for pets who want it.' },
  { icon: Pill, title: 'Medication administration', body: 'Nurses give tablets, insulin and eye drops on schedule and log every dose for you to read at pick-up.' },
  { icon: Video, title: 'Webcam updates', body: 'A daily photo and short clip sent to your phone, so you can see how your pet is settling in.' },
  { icon: Cat, title: 'Separate feline wing', body: 'Cats board in a dog-free corridor with multi-level condos, hiding spaces and pheromone diffusers.' },
  { icon: ShieldCheck, title: 'Vaccination requirements', body: 'Dogs need DHPP, rabies and kennel cough; cats need FVRCP and rabies — all at least 14 days before arrival.' },
];

const PHARMACY_FEATURES = [
  { icon: Package, title: 'On-site dispensary', body: 'Most prescriptions are filled while you wait, including antibiotics, pain relief, cardiac and endocrine medication.' },
  { icon: BellRing, title: 'Refill reminders', body: 'We text and email before a chronic prescription runs out, so insulin or thyroid tablets never lapse.' },
  { icon: ShieldCheck, title: 'Drug-interaction checks', body: 'Every dispense is screened against your pet’s full medication list and known sensitivities before it leaves the counter.' },
  { icon: Droplets, title: 'Compounded flavoured medication', body: 'Chicken, tuna or beef-flavoured liquids and transdermal gels for pets who refuse tablets.' },
  { icon: Truck, title: 'Home delivery within 10 miles', body: 'Free next-day delivery across Vetnora and Riverside for repeat prescriptions ordered before 15:00.' },
  { icon: Weight, title: 'Prescription diets in stock', body: 'Renal, urinary, gastrointestinal, hypoallergenic and weight-management ranges held on the shelf, not back-ordered.' },
];

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function ServicesPage() {
  const { content } = useCms();

  return (
    <SitePage>
      {/* 1 — Hero */}
      <PageHero
        eyebrow="What we do"
        title="Complete veterinary care under one roof"
        subtitle="Wellness, diagnostics, surgery, dentistry, grooming, boarding and pharmacy — delivered by one team of 13 at our Vetnora and Riverside branches, with fear-free handling and written estimates every time."
        breadcrumb="Services"
      >
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={SITE_ROUTES.book} variant="white" icon={Calendar}>Book an appointment</CtaLink>
          <CtaLink href={SITE_ROUTES.pricing} variant="ghost">See pricing</CtaLink>
        </div>
      </PageHero>

      {/* 2 — All services overview */}
      <Section>
        <SectionHeading
          eyebrow="All services"
          title={content.services.sectionTitle}
          subtitle={content.services.sectionSubtitle}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {content.services.items.map((item) => {
            const Icon = SERVICE_ICONS[item.icon] ?? PawPrint;
            return (
              <a
                key={item.id}
                href={SERVICE_ANCHORS[item.id] ?? '#wellness'}
                className="hv-card group block rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
              >
                <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-plum">
                  Jump to details <ChevronRight className="hv-slide w-3.5 h-3.5" />
                </span>
              </a>
            );
          })}
        </div>
        <div className="mt-10">
          <StatStrip
            stats={[
              { value: '8', label: 'Service lines' },
              { value: '30 min', label: 'Lab turnaround' },
              { value: '24/7', label: 'Emergency cover' },
              { value: '4.9', label: 'From 487 reviews' },
            ]}
          />
        </div>
      </Section>

      {/* 3 — Preventive care & wellness */}
      <Section id="wellness" alt>
        <SectionHeading
          eyebrow="Preventive care"
          title="Preventive care & wellness"
          subtitle="The visit that stops most problems from ever becoming emergencies."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>
            <p className="text-[15px] text-ink/65 leading-relaxed">
              A wellness appointment is the most valuable 30 minutes you will spend on your pet’s
              health all year. We examine them nose to tail, update only the vaccines their
              lifestyle actually calls for, and compare this year’s findings against every previous
              visit so trends show up long before symptoms do.
            </p>
            <p className="mt-4 text-[15px] text-ink/65 leading-relaxed">
              You leave with a written plan — what we found, what we changed, what to watch for,
              and when to come back. Nothing is added to the bill without you agreeing to it first.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line bg-white p-5">
                <span className="hv-tile w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center mb-3">
                  <Clock className="w-5 h-5" />
                </span>
                <h3 className="text-[13px] font-semibold text-ink">Typical visit length</h3>
                <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">
                  30 minutes for a standard wellness exam, 45 for seniors or first puppy and kitten
                  visits. Nurse weigh-ins take 10 minutes and are free on a wellness plan.
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white p-5">
                <span className="hv-tile w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center mb-3">
                  <PawPrint className="w-5 h-5" />
                </span>
                <h3 className="text-[13px] font-semibold text-ink">Who it suits</h3>
                <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">
                  Every dog and cat once a year; twice a year from age seven, and every 3–4 weeks
                  for puppies and kittens until their vaccine course is complete.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <CtaLink href={SITE_ROUTES.book} icon={Calendar}>Book a wellness visit</CtaLink>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-7 shadow-soft">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="w-9 h-9 rounded-xl bg-plum text-white flex items-center justify-center">
                <ListChecks className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">What’s included</h3>
            </div>
            <ul className="space-y-4">
              {WELLNESS_CHECKLIST.map((c) => (
                <li key={c.title} className="flex gap-3">
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-lilac text-plum flex items-center justify-center">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{c.title}</span>
                    <span className="block text-[13px] text-ink/55 leading-relaxed mt-0.5">{c.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 4 — Diagnostics & laboratory */}
      <Section id="diagnostics">
        <SectionHeading
          eyebrow="Diagnostics"
          title="Diagnostics & laboratory"
          subtitle="Answers during the appointment, not next week — because a sick pet cannot wait for a courier."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DIAGNOSTIC_CAPABILITIES.map((d) => (
              <div key={d.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
                <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <d.icon className="w-5 h-5" />
                </span>
                <h3 className="text-[14px] font-semibold text-ink mb-2">{d.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-line bg-canvas p-7">
              <div className="flex items-center gap-2.5 mb-5">
                <span className="w-9 h-9 rounded-xl bg-plum text-white flex items-center justify-center">
                  <Timer className="w-5 h-5" />
                </span>
                <h3 className="text-[15px] font-bold text-ink">Typical turnaround</h3>
              </div>
              <ul className="divide-y divide-line">
                {TURNAROUND.map((t) => (
                  <li key={t.test} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-[13px] text-ink/70">{t.test}</span>
                    <span className="text-[12px] font-semibold text-plum whitespace-nowrap">{t.time}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[12px] text-ink/45 leading-relaxed">
                A veterinarian calls you personally with every abnormal result — you will never be
                left to interpret a number on a portal alone.
              </p>
            </div>
            <img
              src="https://images.pexels.com/photos/33394308/pexels-photo-33394308.jpeg"
              alt="Veterinary nurse preparing a blood sample in the in-house laboratory"
              className="rounded-3xl shadow-soft w-full h-56 object-cover"
            />
          </div>
        </div>
      </Section>

      {/* 5 — Surgery & anaesthesia */}
      <Section id="surgery" alt>
        <SectionHeading
          eyebrow="Surgery"
          title="Surgery & anaesthesia"
          subtitle="Modern monitoring, layered pain relief and a nurse whose only job that day is your pet."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-line bg-white p-7">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Stethoscope className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-bold text-ink">Soft-tissue surgery</h3>
            <ul className="mt-4 space-y-2.5">
              {SOFT_TISSUE.map((s) => (
                <li key={s} className="flex gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-plum" strokeWidth={3} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-white p-7">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-bold text-ink">Orthopaedic surgery</h3>
            <ul className="mt-4 space-y-2.5">
              {ORTHOPAEDIC.map((s) => (
                <li key={s} className="flex gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-plum" strokeWidth={3} />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12px] text-ink/45 leading-relaxed">
              Complex orthopaedic cases are performed with a visiting board-certified surgeon at the
              Vetnora branch on alternate Thursdays.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ANAESTHESIA.map((feat) => (
            <div key={feat.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <feat.icon className="w-5 h-5" />
              </span>
              <h3 className="text-[14px] font-semibold text-ink mb-2">{feat.title}</h3>
              <p className="text-[13px] text-ink/55 leading-relaxed">{feat.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 relative overflow-hidden rounded-3xl bg-grape p-7 md:p-10">
          <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-iris/30 blur-3xl" />
          <div className="relative">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-coral mb-2.5">Surgery day</span>
            <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">What happens, hour by hour</h3>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SURGERY_DAY.map((s) => (
                <div key={s.step} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-8 h-8 rounded-lg bg-white text-plum text-sm font-bold flex items-center justify-center">{s.step}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-coral">{s.time}</span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-white">{s.title}</h4>
                  <p className="mt-1.5 text-[13px] text-white/60 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 6 — Dentistry */}
      <Section id="dentistry">
        <SectionHeading
          eyebrow="Dentistry"
          title="Dentistry"
          subtitle="Dental disease is the most common condition we diagnose — and the most commonly missed at home."
          center={false}
        />

        <div className="rounded-3xl border border-plum/20 bg-lilac/60 p-7 md:p-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-start gap-4">
              <span className="w-12 h-12 shrink-0 rounded-2xl bg-plum text-white flex items-center justify-center">
                <Smile className="w-6 h-6" />
              </span>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-plum leading-none tracking-tight">80%</div>
                <p className="mt-2 text-[14px] font-semibold text-ink">of dogs show dental disease by age three</p>
              </div>
            </div>
            <p className="text-[13px] text-ink/60 leading-relaxed md:border-l md:border-plum/20 md:pl-6">
              Bad breath is the only sign most owners ever notice, yet by that point there is
              usually bone loss around the roots. We grade every mouth at the annual exam so you can
              act while a scale and polish is still all that is needed — rather than extractions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DENTISTRY_STEPS.map((d) => (
            <div key={d.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <d.icon className="w-5 h-5" />
              </span>
              <h3 className="text-[14px] font-semibold text-ink mb-2">{d.title}</h3>
              <p className="text-[13px] text-ink/55 leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-ink/50 leading-relaxed max-w-3xl">
          Every dental procedure is carried out under general anaesthesia with a cuffed airway,
          continuous monitoring and local nerve blocks. Anaesthesia-free dental cleaning cannot
          clean below the gum line, so we do not offer it.
        </p>
      </Section>

      {/* 7 — Grooming & boarding */}
      <Section id="grooming" alt>
        <SectionHeading
          eyebrow="Grooming & boarding"
          title="Grooming & boarding"
          subtitle="Same fear-free handling, same building, same team who know your pet’s medical history."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-line bg-white p-7">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <Bath className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-bold text-ink">Grooming</h3>
              <ul className="mt-4 space-y-2.5">
                {GROOMING_SERVICES.map((g) => (
                  <li key={g} className="flex gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-plum" strokeWidth={3} />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            <img
              src="https://images.pexels.com/photos/6816845/pexels-photo-6816845.jpeg"
              alt="Dog being gently groomed and brushed by a member of the Vetnora team"
              className="rounded-3xl shadow-soft w-full h-52 object-cover"
            />
          </div>

          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BOARDING_FEATURES.map((feat) => (
                <div key={feat.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
                  <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                    <feat.icon className="w-5 h-5" />
                  </span>
                  <h3 className="text-[14px] font-semibold text-ink mb-2">{feat.title}</h3>
                  <p className="text-[13px] text-ink/55 leading-relaxed">{feat.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-coral/30 bg-coral/5 p-5 flex gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 text-coral mt-0.5" />
              <p className="text-[13px] text-ink/65 leading-relaxed">
                <span className="font-semibold text-ink">Vaccination requirements:</span> boarding
                and grooming guests must be up to date on DHPP, rabies and kennel cough (dogs) or
                FVRCP and rabies (cats), given at least 14 days before arrival, plus current flea
                and worm treatment. We can check your records for you when you book.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 8 — Pharmacy & prescriptions */}
      <Section id="pharmacy">
        <SectionHeading
          eyebrow="Pharmacy"
          title="Pharmacy & prescriptions"
          subtitle="A real dispensary staffed by the same nurses who treat your pet — not a mail-order queue."
          center={false}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PHARMACY_FEATURES.map((feat) => (
            <div key={feat.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <feat.icon className="w-5 h-5" />
              </span>
              <h3 className="text-[14px] font-semibold text-ink mb-2">{feat.title}</h3>
              <p className="text-[13px] text-ink/55 leading-relaxed">{feat.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-line bg-canvas p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-plum text-white flex items-center justify-center">
              <Pill className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-ink">Order refills from the client portal</h3>
              <p className="mt-1.5 text-[13px] text-ink/60 leading-relaxed max-w-xl">
                Sign in to request a repeat prescription, see every medication your pet has been
                dispensed, download a written prescription for an external pharmacy, and choose
                collection or home delivery. Requests placed before 15:00 are ready the same day.
              </p>
            </div>
          </div>
          <CtaLink href={SITE_ROUTES.contact} variant="outline">Ask about a prescription</CtaLink>
        </div>
      </Section>

      {/* 9 — CTA band */}
      <CtaBand
        title="Not sure which service your pet needs?"
        subtitle="Call us on +1 415 555 0100 or book a consultation — we will work it out together and send you a written estimate before anything goes ahead."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="See pricing"
        secondaryHref={SITE_ROUTES.pricing}
      />
    </SitePage>
  );
}
