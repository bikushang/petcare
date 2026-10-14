'use client';

import { useState, type ReactNode } from 'react';
import {
  Calendar, Check, Star, Stethoscope, Syringe, Scissors, FlaskConical, Hotel,
  CreditCard, ShieldCheck, Receipt, FileText, Percent, HeartHandshake, Info,
  CalendarClock, Repeat2, Sparkles, PawPrint, type LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, SITE_ROUTES,
} from '../_components/site-chrome';
import { SegmentedControl } from '../../components/form';

/* ---------------------------------------------------------------- */
/* Types + shared table                                              */
/* ---------------------------------------------------------------- */

type PriceRow = { item: string; note?: string; price: string };

function PriceTable({
  rows, itemHeader = 'Service', priceHeader = 'Estimate (USD)',
}: { rows: PriceRow[]; itemHeader?: string; priceHeader?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-canvas">
            <th scope="col" className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/45 border-b border-line">
              {itemHeader}
            </th>
            <th scope="col" className="text-right px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-ink/45 border-b border-line whitespace-nowrap">
              {priceHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.item} className="border-b border-line last:border-0 hover:bg-lilac/30 transition-colors">
              <td className="px-5 py-3.5 align-top">
                <span className="block text-[13px] font-semibold text-ink">{r.item}</span>
                {r.note && <span className="block text-[12px] text-ink/50 leading-relaxed mt-0.5">{r.note}</span>}
              </td>
              <td className="px-5 py-3.5 text-right align-top text-[13px] font-bold text-plum whitespace-nowrap">
                {r.price}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EstimateNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 flex gap-2 text-[12px] text-ink/50 leading-relaxed">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-plum/60" />
      <span>{children}</span>
    </p>
  );
}

/* ---------------------------------------------------------------- */
/* Data                                                              */
/* ---------------------------------------------------------------- */

type Plan = {
  name: string;
  monthly: number;
  blurb: string;
  features: string[];
  popular?: boolean;
  icon: LucideIcon;
};

const PLANS: Plan[] = [
  {
    name: 'Essential',
    monthly: 32,
    blurb: 'Preventive basics for a healthy adult dog or cat.',
    icon: PawPrint,
    features: [
      'One annual nose-to-tail examination',
      'All core vaccines included',
      'Annual parasite screen and faecal test',
      'Unlimited nurse visits (weigh-ins, nail trims, dressing checks)',
      'Vaccine and reminder scheduling in the client portal',
    ],
  },
  {
    name: 'Complete',
    monthly: 58,
    blurb: 'Our most-chosen plan — twice-yearly care plus bloodwork.',
    icon: Star,
    popular: true,
    features: [
      'Two examinations a year',
      'All core and lifestyle vaccines',
      'Annual bloodwork panel (CBC and biochemistry)',
      'Dental scoring and oral chart at every visit',
      '10% off procedures, surgery and dentistry',
      'Unlimited nurse visits',
    ],
  },
  {
    name: 'Premier',
    monthly: 94,
    blurb: 'Everything in Complete, plus the annual dental and open access.',
    icon: Sparkles,
    features: [
      'Everything included in Complete',
      'Annual dental scale and polish under anaesthesia',
      'Unlimited veterinary consultations',
      '20% off procedures, surgery and dentistry',
      'Priority same-day booking',
    ],
  },
];

const CONSULTATIONS: PriceRow[] = [
  { item: 'Standard consultation', note: 'Up to 20 minutes with a veterinarian, one presenting problem.', price: '$75' },
  { item: 'Extended / complex consultation', note: '40 minutes for multiple problems, chronic disease reviews or new senior patients.', price: '$120' },
  { item: 'Nurse clinic', note: 'Nail trim, weight check and anal gland expression. Free on every wellness plan.', price: '$35' },
  { item: 'Second opinion', note: 'Includes review of outside records and imaging before your visit.', price: '$95' },
  { item: 'Telemedicine follow-up', note: 'Video review for existing patients — rechecks, medication changes, skin and wound checks.', price: '$45' },
  { item: 'Out-of-hours emergency exam', note: 'Evenings, weekends and public holidays. Treatment quoted separately once we have examined your pet.', price: '$180' },
];

const DOG_VACCINES: PriceRow[] = [
  { item: 'DHPP (distemper, hepatitis, parvovirus, parainfluenza)', price: '$38' },
  { item: 'Rabies', note: 'One-year or three-year certificate.', price: '$32' },
  { item: 'Leptospirosis', note: 'Recommended for dogs with water, wildlife or farmland exposure.', price: '$34' },
  { item: 'Kennel cough (Bordetella)', note: 'Required for boarding, daycare and grooming guests.', price: '$36' },
];

const CAT_VACCINES: PriceRow[] = [
  { item: 'FVRCP (rhinotracheitis, calicivirus, panleukopenia)', price: '$38' },
  { item: 'Rabies', note: 'One-year or three-year certificate.', price: '$32' },
  { item: 'FeLV (feline leukaemia)', note: 'Recommended for cats with outdoor access.', price: '$42' },
];

const VACCINE_BUNDLES: PriceRow[] = [
  { item: 'Puppy course bundle', note: 'Three visits: DHPP series, rabies, first parasite treatment and a free nurse weigh-in between visits.', price: '$120' },
  { item: 'Kitten course bundle', note: 'Two visits: FVRCP series, rabies, FeLV and a free nurse weigh-in between visits.', price: '$110' },
];

const SURGERY_ESTIMATES: PriceRow[] = [
  { item: 'Cat spay', price: '$320 – $420' },
  { item: 'Dog spay', note: 'Range reflects body weight and whether the patient is in season.', price: '$450 – $680' },
  { item: 'Neuter (cat or dog)', note: 'Range reflects species and body weight.', price: '$280 – $520' },
  { item: 'Mass / lump removal', note: 'Depends on size, site and whether histopathology is added.', price: '$380 – $900' },
  { item: 'Cranial cruciate ligament repair', note: 'Includes implants, radiographs and the post-operative rehabilitation plan.', price: '$2,400 – $3,400' },
  { item: 'Dental scale & polish', note: 'Includes full-mouth radiographs and periodontal charting.', price: '$420 – $560' },
  { item: 'Extractions', note: 'Added to the dental estimate, per tooth, depending on root complexity.', price: '+$60 – $180' },
];

const DIAGNOSTIC_PRICES: PriceRow[] = [
  { item: 'Complete blood count', note: 'Run in-house, results in under 30 minutes.', price: '$68' },
  { item: 'Biochemistry panel', note: 'Kidney, liver, protein, glucose and electrolytes.', price: '$94' },
  { item: 'Combined wellness panel', note: 'Blood count and biochemistry together — better value than booking separately.', price: '$140' },
  { item: 'Urinalysis', note: 'Dipstick, specific gravity and sediment review.', price: '$52' },
  { item: 'Digital radiographs', note: 'First view $120, each additional view $45. Sedation quoted separately if needed.', price: '$120 + $45' },
  { item: 'Abdominal ultrasound', note: 'Includes a written report and images shared to your portal.', price: '$280' },
  { item: 'Cytology', note: 'Ear swabs, skin scrapes, fine-needle aspirates and fluid analysis.', price: '$85' },
  { item: 'Histopathology', note: 'Sent to our reference laboratory; final price depends on the number of samples.', price: 'From $180' },
];

const BOARDING_PRICES: PriceRow[] = [
  { item: 'Dog boarding', note: 'Individual run, three walks a day, webcam update.', price: '$52 / night' },
  { item: 'Cat boarding', note: 'Separate feline wing, multi-level condo.', price: '$38 / night' },
  { item: 'Extra pet sharing the same run', price: '$30 / night' },
  { item: 'Medicated boarding', note: 'For pets needing tablets, insulin or eye drops on schedule.', price: '+$12 / day' },
];

const GROOMING_PRICES: PriceRow[] = [
  { item: 'Grooming — small (under 25 lb)', price: '$55' },
  { item: 'Grooming — medium (25–60 lb)', price: '$75' },
  { item: 'Grooming — large (over 60 lb)', price: '$95' },
  { item: 'De-shedding treatment', note: 'Add-on for double-coated breeds.', price: '+$25' },
  { item: 'Daycare', note: 'Supervised play and rest, 8:00–18:00.', price: '$38 / day' },
  { item: 'Daycare 5-day pack', note: 'Valid for three months, transferable between pets in the same household.', price: '$160' },
];

const PAYMENT_BLOCKS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: CreditCard,
    title: 'Cards and bank transfer',
    body: 'Visa, Mastercard, American Express and Discover, plus Apple Pay, Google Pay and ACH bank transfer. Payment is taken at discharge, never before we have talked you through the invoice.',
  },
  {
    icon: CalendarClock,
    title: 'Instalment plans',
    body: 'Scratchpay and CareCredit both offer instalments with an application that takes two minutes at reception and does not affect your credit score to check.',
  },
  {
    icon: ShieldCheck,
    title: 'Direct insurance claims',
    body: 'We submit claims directly to Trupanion, Nationwide, Healthy Paws and Lemonade, so for most policies you only pay your excess and co-pay on the day.',
  },
  {
    icon: FileText,
    title: 'Written estimates, always',
    body: 'Before any procedure you receive an itemised written estimate with a high and low range. If anything changes mid-procedure, we stop and call you first.',
  },
  {
    icon: HeartHandshake,
    title: 'Senior-pet subsidy fund',
    body: 'Funded by our clients and staff, the fund covers part of the cost of diagnostics and pain management for pets over twelve whose families are in financial hardship. Ask reception in confidence.',
  },
  {
    icon: Percent,
    title: '20% multi-pet discount',
    body: 'Enrol a second or subsequent pet on any wellness plan and every additional pet is 20% off for as long as the plans run together.',
  },
];

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function PricingPage() {
  const [billing, setBilling] = useState('monthly');
  const annual = billing === 'annual';

  return (
    <SitePage>
      {/* 1 — Hero */}
      <PageHero
        eyebrow="Transparent pricing"
        title="Know the cost before you walk in"
        subtitle="Every price below is an estimate in US dollars for our Northgate and Riverside branches. Estimates vary with your pet's weight, age and how a procedure actually goes — so we quote a range rather than a number we would have to walk back."
        breadcrumb="Pricing"
      >
        <div className="flex flex-col gap-5">
          <p className="inline-flex items-start gap-2.5 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-[13px] text-white/85 max-w-2xl">
            <Receipt className="w-4 h-4 shrink-0 mt-0.5 text-coral" />
            Your final cost is confirmed in writing before any procedure goes ahead — and we call you before we change it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <CtaLink href={SITE_ROUTES.book} variant="white" icon={Calendar}>Book an appointment</CtaLink>
            <CtaLink href={SITE_ROUTES.contact} variant="ghost">Request a written estimate</CtaLink>
          </div>
        </div>
      </PageHero>

      {/* 2 — Wellness plan tiers */}
      <Section>
        <SectionHeading
          eyebrow="Wellness plans"
          title="Spread preventive care across the year"
          subtitle="Wellness plans bundle the routine care every pet needs into one predictable payment. Cancel any time — there is no lock-in and no joining fee."
        />

        <div className="flex flex-col items-center gap-3 mb-10">
          <SegmentedControl
            value={billing}
            onChange={setBilling}
            options={[
              { value: 'monthly', label: 'Monthly', icon: Repeat2 },
              { value: 'annual', label: 'Annual — 2 months free', icon: CalendarClock },
            ]}
          />
          <p className="text-[12px] text-ink/45">
            {annual
              ? 'Paying annually covers twelve months of care for the price of ten.'
              : 'Switch to annual billing and two of the twelve months are on us.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {PLANS.map((plan) => {
            const annualTotal = plan.monthly * 10;
            const effective = (annualTotal / 12).toFixed(0);
            return (
              <div
                key={plan.name}
                className={`hv-card group relative rounded-3xl bg-white p-7 ${
                  plan.popular
                    ? 'border border-plum/30 ring-2 ring-iris shadow-lift lg:-mt-3'
                    : 'border border-line hover:border-plum/25'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-7 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-plum text-white text-[10px] font-bold uppercase tracking-wider shadow-lift-sm">
                    <Star className="w-3 h-3" /> Most popular
                  </span>
                )}
                <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <plan.icon className="w-6 h-6" />
                </span>
                <h3 className="text-[17px] font-bold text-ink">{plan.name}</h3>
                <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed min-h-[40px]">{plan.blurb}</p>

                <div className="mt-5 pb-5 border-b border-line">
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-bold text-plum leading-none tracking-tight">
                      ${annual ? annualTotal : plan.monthly}
                    </span>
                    <span className="text-[13px] font-medium text-ink/45 mb-0.5">
                      {annual ? '/year' : '/month'}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] text-ink/45">
                    {annual
                      ? `Equivalent to about $${effective} a month — two months free`
                      : `Or $${annualTotal} a year, which is two months free`}
                  </p>
                </div>

                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                      <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-lilac text-plum flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" strokeWidth={4} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <CtaLink
                    href={SITE_ROUTES.book}
                    variant={plan.popular ? 'primary' : 'outline'}
                    icon={Calendar}
                    className="w-full justify-center"
                  >
                    Join {plan.name}
                  </CtaLink>
                </div>
              </div>
            );
          })}
        </div>

        <EstimateNote>
          Plan prices are per pet and cover the items listed only. Anything outside the plan is
          quoted as an estimate first, with your plan discount already applied.
        </EstimateNote>
      </Section>

      {/* 3 — Consultations & exams */}
      <Section alt>
        <SectionHeading
          eyebrow="Consultations"
          title="Consultations & exams"
          subtitle="What you pay to be seen. Any tests, medication or treatment are quoted separately and always before we start."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <PriceTable rows={CONSULTATIONS} itemHeader="Appointment type" />
            <EstimateNote>
              All figures are estimates. Consultation fees cover the veterinarian&apos;s time and
              examination; they do not include diagnostics or medication.
            </EstimateNote>
          </div>
          <div className="rounded-3xl border border-line bg-white p-7">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Stethoscope className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-bold text-ink">Which should I book?</h3>
            <p className="mt-2.5 text-[13px] text-ink/60 leading-relaxed">
              Book an extended consultation if your pet has more than one problem, is new to us with
              a long history, or is over twelve. A nurse clinic is right for anything that does not
              need a diagnosis — nails, weight, dressings and post-operative checks.
            </p>
            <p className="mt-4 text-[13px] text-ink/60 leading-relaxed">
              Not sure? Call reception on +1 415 555 0100 and we will book the right slot so you are
              not charged for time you do not need.
            </p>
          </div>
        </div>
      </Section>

      {/* 4 — Vaccinations */}
      <Section>
        <SectionHeading
          eyebrow="Vaccinations"
          title="Vaccinations"
          subtitle="Prices shown are estimates per vaccine when given during a consultation or wellness visit."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink mb-3">
              <Syringe className="w-4 h-4 text-plum" /> Dogs
            </h3>
            <PriceTable rows={DOG_VACCINES} itemHeader="Dog vaccine" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink mb-3">
              <Syringe className="w-4 h-4 text-plum" /> Cats
            </h3>
            <PriceTable rows={CAT_VACCINES} itemHeader="Cat vaccine" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink mb-3">
              <Sparkles className="w-4 h-4 text-plum" /> Puppy and kitten course bundles
            </h3>
            <PriceTable rows={VACCINE_BUNDLES} itemHeader="Bundle" />
          </div>
          <div className="rounded-3xl border border-line bg-canvas p-7">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <FlaskConical className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-bold text-ink">A note on titre testing</h3>
            <p className="mt-2.5 text-[13px] text-ink/60 leading-relaxed">
              If you would rather not revaccinate automatically, we can run an antibody titre test
              for distemper, parvovirus and hepatitis and only vaccinate where cover has dropped.
              Rabies is set by state law and cannot be replaced by a titre. Ask us for a written
              quote at your next visit.
            </p>
          </div>
        </div>
        <EstimateNote>
          Estimates assume the vaccine is given at an exam already booked. A standalone vaccine
          appointment is charged with a nurse clinic fee.
        </EstimateNote>
      </Section>

      {/* 5 — Surgery & dentistry estimates */}
      <Section alt>
        <SectionHeading
          eyebrow="Surgery & dentistry"
          title="Surgery & dentistry estimates"
          subtitle="Ranges, not fixed prices — the final figure depends on your pet's weight, bloodwork and what we find once we are in theatre."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <PriceTable rows={SURGERY_ESTIMATES} itemHeader="Procedure" priceHeader="Estimated range (USD)" />
          </div>
          <div className="rounded-3xl border border-line bg-white p-7">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Scissors className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-bold text-ink">What every estimate includes</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                'Individualised anaesthetic plan and pre-operative bloodwork',
                'Continuous monitoring by a dedicated surgical nurse',
                'Multimodal pain relief, in theatre and to take home',
                'One free post-operative recheck at ten days',
              ].map((f) => (
                <li key={f} className="flex gap-2.5 text-[13px] text-ink/65 leading-relaxed">
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-plum" strokeWidth={3} />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[12px] text-ink/45 leading-relaxed">
              Wellness plan members take 10% (Complete) or 20% (Premier) off these estimates.
            </p>
          </div>
        </div>
        <EstimateNote>
          These are estimates only. You will receive an itemised written estimate for your own pet
          before the procedure is booked, and we call you before any figure changes.
        </EstimateNote>
      </Section>

      {/* 6 — Diagnostics & laboratory */}
      <Section>
        <SectionHeading
          eyebrow="Diagnostics"
          title="Diagnostics & laboratory"
          subtitle="Run in our own lab wherever possible, so you get answers and a price in the same visit."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <PriceTable rows={DIAGNOSTIC_PRICES} itemHeader="Test" />
          </div>
          <div className="rounded-3xl border border-line bg-canvas p-7">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <FlaskConical className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-bold text-ink">Bundled is cheaper</h3>
            <p className="mt-2.5 text-[13px] text-ink/60 leading-relaxed">
              Booking a blood count and biochemistry panel together as the combined wellness panel
              saves $22 against ordering them separately, and only needs one blood draw.
            </p>
            <p className="mt-4 text-[13px] text-ink/60 leading-relaxed">
              A veterinarian calls you with every abnormal result and explains what it means for the
              plan — that call is never charged as a consultation.
            </p>
          </div>
        </div>
        <EstimateNote>
          All diagnostic figures are estimates. Sedation, if your pet needs it for imaging, is
          quoted on top and agreed with you first.
        </EstimateNote>
      </Section>

      {/* 7 — Boarding, grooming & daycare */}
      <Section alt>
        <SectionHeading
          eyebrow="Boarding & grooming"
          title="Boarding, grooming & daycare"
          subtitle="Estimates for non-medical stays and services. Vaccination requirements apply to every guest."
          center={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink mb-3">
              <Hotel className="w-4 h-4 text-plum" /> Boarding
            </h3>
            <PriceTable rows={BOARDING_PRICES} itemHeader="Boarding option" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-[14px] font-bold text-ink mb-3">
              <Scissors className="w-4 h-4 text-plum" /> Grooming and daycare
            </h3>
            <PriceTable rows={GROOMING_PRICES} itemHeader="Grooming / daycare" />
          </div>
        </div>
        <EstimateNote>
          Estimates are per pet and per night or session. Grooming prices assume a coat in
          reasonable condition; heavily matted coats are quoted after we have seen your pet.
        </EstimateNote>
      </Section>

      {/* 8 — Payment, insurance & assistance */}
      <Section>
        <SectionHeading
          eyebrow="Paying for care"
          title="Payment, insurance & assistance"
          subtitle="Cost should never be the reason a pet goes untreated. Here is every route we can offer you."
          center={false}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAYMENT_BLOCKS.map((block) => (
            <div key={block.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <block.icon className="w-5 h-5" />
              </span>
              <h3 className="text-[14px] font-semibold text-ink mb-2">{block.title}</h3>
              <p className="text-[13px] text-ink/55 leading-relaxed">{block.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-plum/20 bg-lilac/60 p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-plum text-white flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-ink">Every figure on this page is an estimate</h3>
              <p className="mt-1.5 text-[13px] text-ink/60 leading-relaxed max-w-xl">
                Your pet&apos;s final cost is confirmed in writing before any procedure, and nothing
                is added without your agreement. Ask us for a written estimate at any point — by
                phone, in the client portal, or at reception.
              </p>
            </div>
          </div>
          <CtaLink href={SITE_ROUTES.contact} variant="primary">Request an estimate</CtaLink>
        </div>
      </Section>

      {/* 9 — CTA band */}
      <CtaBand
        title="Clear prices, no surprises on the invoice"
        subtitle="Book an appointment and we will confirm the cost in writing before anything goes ahead. Call +1 415 555 0100 if you would like to talk it through first."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="See all services"
        secondaryHref={SITE_ROUTES.services}
      />
    </SitePage>
  );
}
