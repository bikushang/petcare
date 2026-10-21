'use client';

import {
  PhoneCall, Phone, Siren, MapPin, Clock, AlertTriangle, Info, Wind, HeartPulse,
  Droplets, Thermometer, Car, Baby, Pill, Brain, Microscope, FileText, CreditCard,
  Banknote, Building2, Ban, ShieldAlert, Stethoscope, Hospital, Timer, Hourglass,
  Bandage, Check, HeartHandshake, Activity, Calendar, ArrowRight, Scissors,
  type LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, StatStrip, SITE_ROUTES,
} from '../_components/site-chrome';

/* ---------------------------------------------------------------- */
/* Page data                                                         */
/* ---------------------------------------------------------------- */

const PHONE_DISPLAY = '+1 415 555 0100';
const PHONE_HREF = 'tel:+14155550100';

const CALL_SCRIPT: { label: string; detail: string }[] = [
  { label: 'Your name', detail: 'And whether you are already registered with us.' },
  { label: "Your pet's name", detail: 'We pull the record up while you are still talking.' },
  { label: 'Species, breed and approximate weight', detail: 'Weight drives every emergency drug dose we draw up.' },
  { label: 'What happened, and when', detail: 'Time of onset matters more than almost anything else.' },
  { label: 'Any medications or known conditions', detail: 'Including anything given in the last 24 hours.' },
  { label: 'Your ETA', detail: 'So the team is at the door instead of in the back.' },
];

const CALL_IMMEDIATELY: { text: string }[] = [
  { text: 'Difficulty breathing, or any open-mouth breathing in a cat' },
  { text: 'Collapse, or unresponsiveness you cannot rouse your pet from' },
  { text: 'A seizure lasting longer than 2 minutes, or repeated seizures' },
  { text: 'Straining to urinate and producing nothing — especially male cats' },
  { text: 'A bloated, hard abdomen, or retching without bringing anything up' },
  { text: 'Bleeding you cannot control with five minutes of firm pressure' },
  { text: 'Suspected poisoning — medication, rodenticide, antifreeze, xylitol, grapes, lilies' },
  { text: 'Hit by a car, even if your pet gets up and seems fine afterwards' },
  { text: 'Any eye injury, squinting shut, or a cloudy or bulging eye' },
  { text: 'Whelping or queening for more than 30 minutes with no progress' },
  { text: 'Heatstroke — panting hard after heat or exercise, wobbly, bright red gums' },
  { text: 'Pale, white or blue-tinged gums' },
];

const CALL_TODAY: { text: string }[] = [
  { text: 'Vomited once but is bright, alert and still drinking' },
  { text: 'A mild limp where your pet is still bearing weight on the leg' },
  { text: 'Itching, scratching or licking a paw without an open wound' },
  { text: 'One soft stool with no blood and a normal appetite' },
  { text: 'A small, clean cut with the edges together and no active bleeding' },
  { text: 'Mild ear discharge or head shaking that started today' },
  { text: 'Eating a little less than usual but otherwise behaving normally' },
];

const TREATED: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Car,
    title: 'Trauma & fractures',
    body: 'Rapid shock assessment, pain relief within minutes, then radiographs and splinting or surgical fixation.',
  },
  {
    icon: Wind,
    title: 'Respiratory distress',
    body: 'Flow-by or chamber oxygen first, then chest imaging and thoracocentesis if there is fluid or air to drain.',
  },
  {
    icon: Activity,
    title: 'GDV / bloat',
    body: 'Immediate decompression and IV fluid resuscitation, then emergency surgery with gastropexy to prevent a repeat.',
  },
  {
    icon: Droplets,
    title: 'Urinary blockage',
    body: 'Sedation, catheterisation and bladder decompression, plus electrolyte correction for a dangerously high potassium.',
  },
  {
    icon: Pill,
    title: 'Toxin ingestion',
    body: 'Risk calculated by dose and weight, then decontamination, activated charcoal, antidotes and organ monitoring.',
  },
  {
    icon: Brain,
    title: 'Seizures',
    body: 'Benzodiazepines to break the cluster, glucose and electrolyte checks, then a plan to find the underlying cause.',
  },
  {
    icon: Baby,
    title: 'Dystocia',
    body: 'Ultrasound to count and check fetal heart rates, oxytocin where appropriate, and a theatre ready for caesarean.',
  },
  {
    icon: Thermometer,
    title: 'Heatstroke',
    body: 'Active cooling to a safe endpoint, IV fluids and plasma support, plus 48 hours of clotting and kidney monitoring.',
  },
];

const FIRST_AID: { title: string; body: string; icon: LucideIcon }[] = [
  {
    icon: ShieldAlert,
    title: 'Keep yourself safe first',
    body: 'A frightened animal in pain will bite the person it loves most. Use a towel, a slip lead or a soft muzzle — but never muzzle a pet that is struggling to breathe, vomiting or overheating.',
  },
  {
    icon: Bandage,
    title: 'Control bleeding with pressure',
    body: 'Press a clean cloth or gauze firmly over the wound and hold it for a full five minutes without peeking. Add more layers on top rather than lifting the first one off; do not apply a tourniquet.',
  },
  {
    icon: Pill,
    title: 'For a suspected toxin, bring the packaging',
    body: 'The box, bottle or plant tells us the active ingredient and concentration, which is what decides treatment. Do NOT induce vomiting unless a vet or poison control has told you to.',
  },
  {
    icon: HeartHandshake,
    title: 'Keep your pet warm, quiet and horizontal',
    body: 'Wrap them loosely in a blanket, dim the lights and keep voices low. Do not offer food or water if they are collapsed, seizuring or may need anaesthesia.',
  },
  {
    icon: Car,
    title: 'Transport in a carrier or on a rigid board',
    body: 'Cats and small dogs travel safest in a closed carrier. For a suspected spinal injury, slide your pet onto a board, baking tray or stiff piece of cardboard and support the whole body as one unit.',
  },
  {
    icon: PhoneCall,
    title: 'Call ahead so we can prepare',
    body: `One call to ${PHONE_DISPLAY} means oxygen, IV fluids and a drug tray are drawn up before you park. It is the single biggest thing you can do to save time at the door.`,
  },
];

const TRIAGE: { title: string; body: string; icon: LucideIcon; when: string }[] = [
  {
    when: 'On arrival',
    icon: Timer,
    title: 'Immediate triage within 2 minutes',
    body: 'A nurse meets you at the door, takes your pet straight through and checks airway, breathing, circulation, temperature and mentation. Paperwork happens afterwards — never before.',
  },
  {
    when: 'Minutes 2–20',
    icon: HeartPulse,
    title: 'Stabilisation',
    body: 'Oxygen support, IV access, warmed fluids and pain relief as needed. We treat shock and pain before we chase a diagnosis, because a stable patient tolerates everything else better.',
  },
  {
    when: 'First hour',
    icon: Microscope,
    title: 'Diagnostics on site',
    body: 'In-house bloodwork, blood gas and electrolytes come back in about 20 minutes, with digital radiography and ultrasound in the same building. Nothing is couriered out overnight.',
  },
  {
    when: 'As soon as we know',
    icon: FileText,
    title: 'A written estimate and plan, discussed with you',
    body: 'We sit down with you, explain what we have found, give a written estimate with a realistic range and agree what happens next. Nothing major begins without your consent.',
  },
  {
    when: 'Ongoing',
    icon: Hospital,
    title: 'Hospitalisation or discharge with follow-up',
    body: 'Inpatients get overnight monitoring and a morning update call. Patients who go home leave with written instructions, medication and a booked recheck.',
  },
];

const HOURS: { day: string; routine: string; emergency: string }[] = [
  { day: 'Monday – Friday', routine: '8:00 – 18:00', emergency: '24 hours' },
  { day: 'Saturday', routine: '9:00 – 14:00', emergency: '24 hours' },
  { day: 'Sunday', routine: 'Closed for routine appointments', emergency: '24 hours' },
  { day: 'Public holidays', routine: 'Closed for routine appointments', emergency: '24 hours' },
];

const REFERRAL: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Brain,
    title: 'Advanced neurosurgery',
    body: 'Bay Area Veterinary Neurology, 25 minutes away, for MRI and spinal surgery. We send imaging ahead and call the on-call surgeon ourselves.',
  },
  {
    icon: Scissors,
    title: 'Oncology',
    body: 'Peninsula Veterinary Oncology run chemotherapy, radiation planning and clinical trials. We stay on the case and handle bloodwork between cycles.',
  },
  {
    icon: Hospital,
    title: '24-hour ICU & ventilation',
    body: 'For patients needing mechanical ventilation or round-the-clock specialist intensive care, we stabilise, then transfer with a nurse in the vehicle.',
  },
];

const COSTS: { label: string; value: string; note: string }[] = [
  { label: 'Emergency exam', value: '$180', note: 'Includes triage, full physical exam and the initial treatment plan.' },
  { label: 'Typical stabilisation & diagnostics', value: '$400 – 900', note: 'Oxygen, IV fluids, pain relief, bloodwork and imaging as required.' },
  { label: 'Overnight hospitalisation', value: '$600 – 1,400', note: 'Per night, depending on monitoring level, medications and nursing care.' },
  { label: 'Deposit at admission', value: '50%', note: 'Of the agreed estimate, with the balance settled at discharge.' },
];

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function EmergencyPage() {
  return (
    <SitePage>
      {/* ───────────── 1. Hero ───────────── */}
      <PageHero
        eyebrow="Emergency care"
        title="If something is wrong right now, call us"
        subtitle="Do not wait to see how it looks in an hour. A vet or emergency nurse answers this line around the clock, triage advice over the phone is always free, and we would far rather tell you it can wait than hear about it tomorrow."
        breadcrumb="Emergency"
      >
        <div className="flex flex-col gap-5">
          <CtaLink
            href={PHONE_HREF}
            variant="white"
            icon={PhoneCall}
            className="!h-16 !px-8 !rounded-2xl !text-xl md:!text-2xl !font-bold !bg-coral !text-white hover:!bg-coral/90 !gap-3"
          >
            {PHONE_DISPLAY}
          </CtaLink>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/70">
            <span className="flex items-center gap-2 font-semibold text-white">
              <Siren className="w-4 h-4 text-coral" /> Open 24/7 for emergencies · Vetnora branch
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-coral" /> 128 Maple Avenue, Vetnora, CA 94110
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CtaLink href="#is-it-an-emergency" variant="ghost">Is this an emergency?</CtaLink>
            <CtaLink href={SITE_ROUTES.book} variant="ghost">Non-urgent? Book online</CtaLink>
          </div>
        </div>
      </PageHero>

      {/* ───────────── 2. Call now band ───────────── */}
      <Section tight>
        <div className="rounded-3xl border-2 border-coral bg-coral/5 overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_1.25fr]">
            {/* Phone side */}
            <div className="p-7 md:p-10 border-b-2 lg:border-b-0 lg:border-r-2 border-coral/35">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral text-white text-[11px] font-bold uppercase tracking-wider">
                <Siren className="w-3.5 h-3.5" /> Call now
              </span>
              <a
                href={PHONE_HREF}
                className="hv-lift hv-slide-parent mt-5 flex items-center gap-3 text-3xl md:text-4xl font-bold tracking-tight text-coral hover:text-ink transition-colors"
              >
                <Phone className="w-7 h-7 md:w-8 md:h-8 shrink-0" />
                {PHONE_DISPLAY}
              </a>
              <p className="mt-4 text-[14px] text-ink/65 leading-relaxed">
                A real person answers, day or night. Tell us you have an emergency and you will be put
                straight through to the clinical team — you do not need to be an existing client.
              </p>

              <div className="mt-6 space-y-3 text-[13px]">
                <span className="flex items-start gap-2.5 text-ink/70">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-coral" />
                  <span>
                    <span className="block font-semibold text-ink">128 Maple Avenue, Vetnora, CA 94110</span>
                    Emergency parking is the three bays directly outside the blue door — leave the car there.
                  </span>
                </span>
                <span className="flex items-start gap-2.5 text-ink/70">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0 text-coral" />
                  <span>
                    <span className="block font-semibold text-ink">Emergency line staffed 24/7</span>
                    Routine reception hours are Mon–Fri 8:00–18:00 and Sat 9:00–14:00.
                  </span>
                </span>
              </div>

              <p className="mt-6 rounded-xl bg-white border border-coral/30 px-4 py-3 text-[13px] font-semibold text-ink">
                Call before you drive and we will have a team ready when you arrive — oxygen running,
                IV catheter prepared and drugs drawn up to your pet&apos;s weight.
              </p>
            </div>

            {/* Script side */}
            <div className="p-7 md:p-10 bg-white">
              <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
                What to tell us when you call
              </h2>
              <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">
                Six things, in this order. Read them off your phone if you need to — nobody expects you
                to be composed, and our nurse will prompt you through it.
              </p>

              <ol className="mt-6 space-y-3.5">
                {CALL_SCRIPT.map((s, i) => (
                  <li key={s.label} className="flex items-start gap-3.5">
                    <span className="w-7 h-7 rounded-lg bg-coral/15 text-coral text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink leading-snug">{s.label}</span>
                      <span className="block text-[12px] text-ink/55 mt-0.5 leading-relaxed">{s.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── 3. Is this an emergency? ───────────── */}
      <Section id="is-it-an-emergency" alt>
        <SectionHeading
          eyebrow="Triage"
          title="Is this an emergency?"
          subtitle="Use this as a guide, not a diagnosis. The left column means phone us before you finish reading the line; the right column means call during opening hours and book the next sensible slot."
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Call immediately */}
          <div className="rounded-2xl border-2 border-coral bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 bg-coral/10 border-b-2 border-coral/30">
              <span className="w-10 h-10 rounded-xl bg-coral text-white flex items-center justify-center shrink-0">
                <Siren className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">Call immediately</span>
                <span className="block text-[12px] text-ink/55">Phone first, then drive. Do not wait for a callback.</span>
              </span>
            </div>
            <ul className="divide-y divide-line">
              {CALL_IMMEDIATELY.map((item) => (
                <li key={item.text} className="flex items-start gap-3 px-6 py-3.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-coral" />
                  <span className="text-[13px] text-ink/75 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="px-6 py-5 border-t border-line">
              <a
                href={PHONE_HREF}
                className="hv-lift hv-slide-parent inline-flex items-center gap-2 px-5 h-12 rounded-xl bg-coral text-white text-base font-bold"
              >
                <PhoneCall className="w-5 h-5" /> {PHONE_DISPLAY}
              </a>
            </div>
          </div>

          {/* Call today */}
          <div className="rounded-2xl border border-line bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 bg-canvas border-b border-line">
              <span className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                <Hourglass className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-ink">Call today, but it can wait for an appointment</span>
                <span className="block text-[12px] text-ink/55">Worth a vet&apos;s eyes on it — not worth a 2am drive.</span>
              </span>
            </div>
            <ul className="divide-y divide-line">
              {CALL_TODAY.map((item) => (
                <li key={item.text} className="flex items-start gap-3 px-6 py-3.5">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-ink/30" />
                  <span className="text-[13px] text-ink/70 leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="px-6 py-5 border-t border-line">
              <CtaLink href={SITE_ROUTES.book} variant="outline" icon={Calendar}>Book an appointment</CtaLink>
            </div>
          </div>
        </div>

        <p className="mt-7 flex items-start gap-3 rounded-2xl bg-grape text-white px-6 py-5 text-[14px] leading-relaxed">
          <HeartHandshake className="w-5 h-5 mt-0.5 shrink-0 text-coral" />
          <span>
            <span className="font-bold">When in doubt, call — triage advice is always free.</span>{' '}
            You will never be charged for asking, and you will never be made to feel silly for checking.
            Ring <a href={PHONE_HREF} className="font-bold text-coral hv-underline">{PHONE_DISPLAY}</a> and
            let us decide together.
          </span>
        </p>
      </Section>

      {/* ───────────── 4. Emergencies we treat ───────────── */}
      <Section>
        <SectionHeading
          eyebrow="Capability"
          title="Emergencies we treat"
          subtitle="Our Vetnora branch runs oxygen, in-house laboratory, digital radiography, ultrasound and a theatre that can be opened in under fifteen minutes, overnight included."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TREATED.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-coral/40"
              >
                <span className="hv-tile w-12 h-12 rounded-xl bg-coral/12 text-coral flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2">{t.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{t.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <StatStrip
            stats={[
              { value: '24/7', label: 'Emergency line' },
              { value: '2 min', label: 'Triage on arrival' },
              { value: '20 min', label: 'In-house bloodwork' },
              { value: '15 min', label: 'Theatre ready' },
            ]}
          />
        </div>
      </Section>

      {/* ───────────── 5. Before you leave the house ───────────── */}
      <Section alt>
        <SectionHeading
          eyebrow="First aid"
          title="Before you leave the house"
          subtitle="Six things that take under two minutes each and genuinely change outcomes. Do them in this order, then drive — carefully."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FIRST_AID.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="hv-card group relative rounded-2xl border border-line bg-white p-6 pt-7 hover:border-coral/40"
              >
                <span className="absolute top-5 right-5 text-[40px] font-bold leading-none text-coral/15 tabular-nums">
                  {i + 1}
                </span>
                <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2 pr-10 leading-snug">{step.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex items-start gap-4 rounded-2xl border-2 border-coral bg-white px-6 py-5">
          <span className="w-11 h-11 rounded-xl bg-coral text-white flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-ink">
              Do not induce vomiting without instruction.
            </span>
            <span className="mt-1.5 block text-[13px] text-ink/65 leading-relaxed">
              Corrosives, petroleum products and anything already absorbed cause far more damage on the
              way back up, and hydrogen peroxide can ulcerate the stomach on its own. It is also unsafe
              in cats and in any pet that is drowsy or seizuring. Call{' '}
              <a href={PHONE_HREF} className="font-bold text-coral hv-underline">{PHONE_DISPLAY}</a> and
              we will tell you whether to make your pet sick — and if so, with what.
            </span>
          </span>
        </div>
      </Section>

      {/* ───────────── 6. What happens when you arrive ───────────── */}
      <Section>
        <SectionHeading
          eyebrow="Your visit"
          title="What happens when you arrive"
          subtitle="So there are no surprises at the worst possible moment. This is the sequence every emergency patient goes through at Vetnora."
        />

        <div className="relative max-w-3xl mx-auto">
          <span className="absolute left-5 top-3 bottom-3 w-px bg-line hidden sm:block" aria-hidden="true" />

          <ol className="space-y-5">
            {TRIAGE.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative flex items-start gap-5">
                  <span className="relative z-10 w-10 h-10 rounded-full bg-plum text-white flex items-center justify-center shrink-0 shadow-lift-sm">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="hv-card flex-1 rounded-2xl border border-line bg-white p-5 hover:border-plum/25">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-lilac text-[10px] font-bold uppercase tracking-wider text-plum">
                        Step {i + 1}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">{step.when}</span>
                    </div>
                    <h3 className="mt-2.5 text-[15px] font-semibold text-ink leading-snug">{step.title}</h3>
                    <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-9 max-w-3xl mx-auto flex items-start gap-3 rounded-2xl border border-line bg-canvas px-6 py-5 text-[13px] text-ink/65 leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-plum" />
          <span>
            The most critical patient in the building is always seen first. That means a stable case can
            wait — sometimes for an hour or more — while a collapsed patient is resuscitated behind the
            doors. If your pet deteriorates while you are waiting, say so immediately; we would rather
            re-triage ten times than miss one change.
          </span>
        </p>
      </Section>

      {/* ───────────── 7. After-hours, overnight & referral ───────────── */}
      <Section alt>
        <SectionHeading
          eyebrow="Hours & referral"
          title="After-hours, overnight & referral"
          subtitle="Routine appointments keep normal hours. The emergency line does not stop."
        />

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6">
          {/* Hours table */}
          <div className="rounded-2xl border border-line bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-line">
              <Clock className="w-4 h-4 text-plum" />
              <h3 className="text-sm font-bold text-ink">Opening hours</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-canvas">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/45">Day</th>
                  <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-ink/45">Routine</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wide text-coral">Emergency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {HOURS.map((h) => (
                  <tr key={h.day}>
                    <td className="px-6 py-3.5 text-[13px] font-semibold text-ink">{h.day}</td>
                    <td className="px-4 py-3.5 text-[13px] text-ink/60 tabular-nums">{h.routine}</td>
                    <td className="px-6 py-3.5 text-[13px] font-semibold text-coral tabular-nums">{h.emergency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-5 border-t border-line space-y-3">
              <p className="flex items-start gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                <Building2 className="w-4 h-4 mt-0.5 shrink-0 text-plum" />
                <span>
                  Overnight and Sunday emergencies are all handled at the{' '}
                  <span className="font-semibold text-ink">Vetnora branch, 128 Maple Avenue</span> — our
                  Riverside branch is routine appointments only.
                </span>
              </p>
              <p className="flex items-start gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                <Stethoscope className="w-4 h-4 mt-0.5 shrink-0 text-plum" />
                <span>
                  An overnight nurse is physically with hospitalised patients, with a veterinarian on site
                  or within ten minutes at all times.
                </span>
              </p>
            </div>
          </div>

          {/* Referral + poison helpline */}
          <div className="space-y-5">
            {REFERRAL.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
                  <div className="flex items-start gap-4">
                    <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span>
                      <h3 className="text-[15px] font-semibold text-ink">{r.title}</h3>
                      <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">{r.body}</p>
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border-2 border-coral bg-coral/5 p-6">
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-coral text-white flex items-center justify-center shrink-0">
                  <Pill className="w-5 h-5" />
                </span>
                <span>
                  <h3 className="text-[15px] font-bold text-ink">Pet poison helpline</h3>
                  <p className="mt-1.5 text-[13px] text-ink/70 leading-relaxed">
                    For 24-hour toxicology advice call the ASPCA Animal Poison Control Center on{' '}
                    <a href="tel:+18884264435" className="font-bold text-coral hv-underline">(888) 426-4435</a>{' '}
                    or the Pet Poison Helpline on{' '}
                    <a href="tel:+18557647661" className="font-bold text-coral hv-underline">(855) 764-7661</a>.
                    A consultation fee applies, so write down the case number they give you — we use it to
                    pull their treatment protocol straight into your pet&apos;s plan. Call us too.
                  </p>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── 8. Costs & deposits ───────────── */}
      <Section>
        <SectionHeading
          eyebrow="Transparent pricing"
          title="Costs & deposits"
          subtitle="Nobody wants to talk about money at 3am, so here it is in advance. These are real 2026 figures from our own invoices, not a teaser rate."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {COSTS.map((c) => (
            <div key={c.label} className="hv-card rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
              <div className="text-[28px] md:text-[32px] font-bold text-plum leading-none tracking-tight tabular-nums">
                {c.value}
              </div>
              <div className="mt-2.5 text-[13px] font-semibold text-ink">{c.label}</div>
              <p className="mt-2 text-[12px] text-ink/55 leading-relaxed">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid lg:grid-cols-3 gap-5">
          <div className="hv-card rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <CreditCard className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-2">Payment plans accepted</h3>
            <p className="text-[13px] text-ink/55 leading-relaxed">
              We accept <span className="font-semibold text-ink/75">Scratchpay</span> and{' '}
              <span className="font-semibold text-ink/75">CareCredit</span>, and both can be applied for on
              your phone in the consulting room — a Scratchpay decision takes about two minutes and does
              not affect your credit score to check.
            </p>
          </div>

          <div className="hv-card rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-2">A written estimate first</h3>
            <p className="text-[13px] text-ink/55 leading-relaxed">
              You get a written estimate with a low and high range before treatment begins, and we phone
              you the moment the plan needs to change. We will never start a major procedure or an
              overnight stay without your explicit consent.
            </p>
          </div>

          <div className="hv-card rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Banknote className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-2">Senior-pet subsidy fund</h3>
            <p className="text-[13px] text-ink/55 leading-relaxed">
              Client donations and our annual fundraiser support emergency care for pets over ten whose
              families are stretched. Ask reception to apply — it is assessed by our clinical director,
              not by a form, and it has covered 41 patients since 2019.
            </p>
          </div>
        </div>

        <div className="mt-7 flex items-start gap-4 rounded-2xl bg-grape text-white px-6 py-6">
          <span className="w-11 h-11 rounded-xl bg-white/10 text-coral flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </span>
          <span>
            <span className="block text-[15px] font-bold">Cost should never be the reason you do not call.</span>
            <span className="mt-1.5 block text-[13px] text-white/70 leading-relaxed">
              We will always talk you through the options — including the honest, lower-cost ones, and
              including palliative care when that is genuinely the kindest choice. Advice on the phone is
              free, triage is never withheld, and no major procedure begins without your consent.
            </span>
            <span className="mt-4 flex flex-wrap items-center gap-4 text-[12px] text-white/60">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-coral" /> No charge for phone triage</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-coral" /> Itemised invoice at discharge</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-coral" /> Insurance pre-authorisation help</span>
            </span>
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={PHONE_HREF}
            className="hv-lift hv-slide-parent inline-flex items-center gap-2 px-6 h-12 rounded-xl bg-coral text-white text-base font-bold"
          >
            <PhoneCall className="w-5 h-5" /> Call {PHONE_DISPLAY}
            <ArrowRight className="hv-slide w-4 h-4" />
          </a>
          <CtaLink href={SITE_ROUTES.pricing} variant="outline">See full price list</CtaLink>
        </div>
      </Section>

      {/* ───────────── 9. CTA band ───────────── */}
      <CtaBand
        title="If you are reading this and worried, call now"
        subtitle="A vet or emergency nurse answers 24 hours a day at the Vetnora branch. Triage advice is free, and we would rather hear from you twice than too late."
        primaryLabel={`Call ${PHONE_DISPLAY}`}
        primaryHref={PHONE_HREF}
        secondaryLabel="Non-urgent? Book online"
        secondaryHref={SITE_ROUTES.book}
      />
    </SitePage>
  );
}
