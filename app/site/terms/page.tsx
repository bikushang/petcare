'use client';

import {
  Scale, Clock, Wallet, CalendarX, Stethoscope, Siren, FileSignature,
  TriangleAlert, Pill, Hotel, MessageSquare, Gavel,
} from 'lucide-react';
import { useCms } from '../../lib/cms';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, SITE_ROUTES, telHref,
} from '../_components/site-chrome';

const LAST_UPDATED = '1 September 2026';

const CORE_TERMS = [
  {
    icon: Stethoscope,
    title: 'The veterinary relationship',
    body: 'A veterinarian–client–patient relationship begins when we examine your pet. We cannot diagnose, prescribe or advise on treatment for an animal we have not seen, which is why the contact and FAQ forms on this site answer general questions only. Nothing on this website is a substitute for a consultation.',
  },
  {
    icon: FileSignature,
    title: 'Consent and estimates',
    body: 'Anything beyond a standard consultation is quoted as an itemised written estimate with a low and a high figure, which you sign before we begin. If we find something mid-procedure that materially changes the plan or the cost, we stop and call you. We will not proceed on an assumption.',
  },
  {
    icon: Wallet,
    title: 'Payment',
    body: 'Payment is due at the end of the visit, which is standard practice in California. We accept cash, major cards, Apple Pay and Google Pay, and bank transfer for balances over $2,000 arranged in advance. Accounts unpaid after 30 days may be referred for collection, but talk to us first — we would far rather agree a payment plan.',
  },
  {
    icon: CalendarX,
    title: 'Appointments and cancellations',
    body: 'Cancel or move a routine appointment free of charge up to 12 hours before. Inside 12 hours a $25 late-cancellation fee applies, and a missed appointment is $40. Dentals and surgery may require a deposit to rebook after two missed slots. Fees are waived for genuine emergencies and are never charged to hospitalised, recovering or end-of-life patients.',
  },
  {
    icon: Pill,
    title: 'Prescriptions',
    body: 'We prescribe only for animals under our care and only where a clinical examination supports it. Repeat prescriptions for chronic medication require a review at the interval your veterinarian sets, usually every three to six months. We will write a prescription for you to fill elsewhere on request, for a dispensing fee.',
  },
  {
    icon: Hotel,
    title: 'Boarding and grooming',
    body: 'Boarding pets must be vaccinated at least 14 days before arrival — DHPP, rabies and kennel cough for dogs, FVRCP and rabies for cats — and on current parasite prevention. We reserve the right to decline a stay or a groom where we judge it unsafe for the animal or our staff, and we will tell you why.',
  },
];

const YOUR_RESPONSIBILITIES = [
  'Give us accurate information about your pet’s history, current medication and anything they have eaten or been exposed to.',
  'Keep dogs on a lead and cats and small pets in a secure carrier inside the building.',
  'Tell us before the appointment if your pet has ever bitten, or is frightened of handling, so we can plan the visit properly.',
  'Follow discharge instructions, including medication doses, exercise restrictions and the recheck date.',
  'Keep your contact details current so we can reach you during a procedure.',
  'Treat our staff civilly. We will end an appointment and ask you to leave if a member of our team is abused.',
];

const LIMITS = [
  {
    head: 'Outcomes cannot be guaranteed',
    body: 'Medicine and surgery carry inherent risk, and biology does not always cooperate. We guarantee the standard of care, the honesty of our advice and the transparency of our pricing — not a particular result.',
  },
  {
    head: 'Website content is general',
    body: 'Articles, FAQ answers and price ranges on this site are general information, accurate at the date shown, and may not apply to your pet. Published fee ranges are estimates, not quotations.',
  },
  {
    head: 'Referral is sometimes the right answer',
    body: 'Where a case needs equipment or expertise we do not have, we will say so and refer you. We are not liable for the care given by a referral practice, though we will send the imaging and history ahead so they are not starting from scratch.',
  },
  {
    head: 'Insurance is between you and your insurer',
    body: 'We will complete claim forms and send records, usually within two business days. The contract is yours, and a declined claim does not change what is owed to the practice.',
  },
];

export default function TermsPage() {
  const { content } = useCms();
  const contact = content.contact;

  return (
    <SitePage>
      <PageHero
        eyebrow="Legal"
        title="Terms of service"
        subtitle="The agreement between you and Vetnora Animal Hospital when you book an appointment, use this website or bring your pet in. Short, specific, and written to be read."
        breadcrumb="Terms of service"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { icon: Clock, text: `Last updated ${LAST_UPDATED}` },
            { icon: Scale, text: 'Governed by California law' },
            { icon: MessageSquare, text: 'Questions? Just ask reception' },
          ].map((chip) => {
            const Icon = chip.icon;
            return (
              <span
                key={chip.text}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 h-9 text-[12px] font-semibold text-white/90"
              >
                <Icon className="w-3.5 h-3.5 text-coral" /> {chip.text}
              </span>
            );
          })}
        </div>
      </PageHero>

      {/* 1 — Emergency notice first */}
      <Section id="emergencies" alt tight>
        <div className="max-w-4xl mx-auto rounded-2xl border-2 border-coral/40 bg-coral/5 p-6 md:p-8 flex flex-col sm:flex-row items-start gap-5">
          <span className="w-12 h-12 rounded-xl bg-coral/15 text-coral flex items-center justify-center shrink-0">
            <Siren className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">
              This page is not where you should be during an emergency
            </h2>
            <p className="text-[13px] text-ink/65 leading-relaxed">
              If your pet has collapsed, is struggling to breathe, is bleeding heavily, has eaten
              something toxic, cannot urinate or is having a seizure that will not stop, phone{' '}
              <a href={telHref(contact.phone)} className="font-semibold text-coral hv-underline">{contact.phone}</a>{' '}
              and start driving to Vetnora. The emergency line is answered by a nurse 24 hours a day.
            </p>
          </div>
        </div>
      </Section>

      {/* 2 — Core terms */}
      <Section id="core-terms">
        <SectionHeading
          eyebrow="The agreement"
          title="Six terms that cover almost everything"
          subtitle="By booking an appointment, registering a pet or using this website you accept the terms below. If something here does not work for you, tell reception before treatment starts rather than after."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {CORE_TERMS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="hv-card rounded-2xl border border-line bg-white p-6 md:p-7 hover:border-plum/25">
                <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2">{t.title}</h3>
                <p className="text-[13px] text-ink/60 leading-relaxed">{t.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 3 — Your responsibilities */}
      <Section id="your-part" alt>
        <SectionHeading
          eyebrow="Your part"
          title="What we need from you"
          subtitle="None of this is unusual, but all of it changes whether we can do our job safely."
        />
        <div className="max-w-3xl mx-auto rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft">
          <ul className="space-y-3">
            {YOUR_RESPONSIBILITIES.map((line) => (
              <li key={line} className="flex items-start gap-3 text-[14px] text-ink/70 leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 4 — Limits */}
      <Section id="limits">
        <SectionHeading
          eyebrow="Limits"
          title="What we do and do not guarantee"
          subtitle="We would rather be clear about this upfront than discover a misunderstanding at the worst possible moment."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {LIMITS.map((l) => (
            <div key={l.head} className="rounded-2xl border border-line bg-white p-6">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <TriangleAlert className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-2">{l.head}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{l.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 — Reviews and submissions */}
      <Section id="submissions" alt>
        <SectionHeading
          eyebrow="Reviews and submissions"
          title="What happens to what you send us"
          subtitle="Reviews, photographs and questions you submit through this site are covered by these terms and by our privacy policy."
        />
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            'Reviews are checked against an appointment on file before publication, and we publish them unedited. We decline only reviews that name another client, disclose a staff member’s private details, or are not from a client at all.',
            'Submitting a review with the publication box ticked gives us permission to display it, and the photographs attached to it, on this website. Leave it unticked and we publish under initials only. Ask us at any time and we will take a published review down.',
            'Questions sent through the contact or FAQ forms are answered by a registered nurse or a veterinarian within one working day. They are general answers; they are not a diagnosis and they do not create a veterinary relationship.',
            'Newsletter subscription is opt-in, twelve emails a year, with an unsubscribe link in every one. We do not sell or share the list.',
          ].map((line) => (
            <div key={line} className="rounded-2xl border border-line bg-white p-5 flex items-start gap-4">
              <span className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </span>
              <p className="text-[13px] text-ink/65 leading-relaxed">{line}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Governing law and changes */}
      <Section id="law">
        <SectionHeading
          eyebrow="Governing law"
          title="Jurisdiction, complaints and changes"
          subtitle="The dull but necessary paragraph at the end."
        />
        <div className="max-w-3xl mx-auto rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft">
          <div className="flex items-start gap-4">
            <span className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5" />
            </span>
            <div className="space-y-4 text-[13px] text-ink/65 leading-relaxed">
              <p>
                These terms are governed by the laws of the State of California, and any dispute falls
                to the courts of the county in which the treating branch is located. Our veterinarians
                are licensed by the California Veterinary Medical Board, and the practice is subject to
                its standards of professional conduct.
              </p>
              <p>
                Complaints go to our practice manager in the first instance — write to{' '}
                <a href={`mailto:${contact.email}`} className="font-semibold text-plum hv-underline">{contact.email}</a>{' '}
                or call <a href={telHref(contact.phone)} className="font-semibold text-plum hv-underline">{contact.phone}</a>.
                We acknowledge every complaint within one working day and aim to resolve it within ten.
                You retain the right to complain to the Veterinary Medical Board at any point.
              </p>
              <p>
                We may update these terms; the version in force is the one published here on the date of
                your appointment, and the date at the top of this page tells you when it last changed.
                If a clause is found unenforceable, the rest continues to apply.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CtaLink href={SITE_ROUTES.privacy} variant="outline">Read the privacy policy</CtaLink>
          <CtaLink href={SITE_ROUTES.contact} variant="primary">Ask us a question</CtaLink>
        </div>
      </Section>
    </SitePage>
  );
}
