'use client';

import {
  ShieldCheck, FileText, Lock, Clock, Mail, Database, UserCheck, Share2,
  Cookie, Baby, Globe, AlertCircle,
} from 'lucide-react';
import { useCms } from '../../lib/cms';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, SITE_ROUTES, telHref,
} from '../_components/site-chrome';

const LAST_UPDATED = '1 September 2026';

const WHAT_WE_COLLECT = [
  {
    icon: UserCheck,
    title: 'Details you give us',
    body: 'Your name, address, phone number and email, plus your pet’s name, species, breed, age and clinical history. We collect this when you register, book an appointment, send the contact form, ask a question on the FAQ page, leave a review or subscribe to the newsletter.',
  },
  {
    icon: Database,
    title: 'Clinical records',
    body: 'Examination findings, diagnoses, treatments, prescriptions, laboratory and imaging results, consent forms and the notes a veterinarian writes during a consultation. These belong to your pet’s medical file and we are professionally required to keep them.',
  },
  {
    icon: FileText,
    title: 'Payment information',
    body: 'Invoice totals, what was paid and by which method. Full card numbers are handled by our payment processor and never reach our systems or our staff.',
  },
  {
    icon: Globe,
    title: 'Website usage',
    body: 'Which pages you visited, roughly where you visited from, and which browser you used. This is aggregate traffic data — we do not build advertising profiles and we do not sell it.',
  },
];

const WHY_WE_USE_IT = [
  'To provide veterinary care, including making a diagnosis, planning treatment and dispensing medication.',
  'To contact you about an appointment, a result, a reminder or a prescription that is due.',
  'To answer a message, a question or a review you sent us.',
  'To take payment, issue invoices and handle insurance claims you ask us to process.',
  'To meet our legal and professional obligations, including controlled-drug records and rabies reporting.',
  'To send the monthly newsletter, but only if you asked for it, and only until you unsubscribe.',
];

const SHARING = [
  { who: 'Referral practices and specialists', when: 'When your pet needs care we cannot provide in-house, and only with your agreement to the referral.' },
  { who: 'External laboratories', when: 'When a sample has to be analysed off-site. They receive the sample and the clinical context, not your financial details.' },
  { who: 'Pet insurers', when: 'When you ask us to complete a claim form, or when an insurer requests history with your written authorisation.' },
  { who: 'Microchip registries', when: 'When we implant a chip, so the registration is in your name and reachable.' },
  { who: 'Payment processors', when: 'To take card payments. They hold the card data; we hold only the amount and the outcome.' },
  { who: 'Authorities', when: 'Where the law requires it — for example rabies reporting, controlled-drug inspection or a court order.' },
];

const RIGHTS = [
  { title: 'Ask for a copy', body: 'We will give you your pet’s records, and the personal information we hold about you, within 30 days. There is no charge for the first request.' },
  { title: 'Correct something wrong', body: 'Tell reception and we will fix it. Clinical notes cannot be deleted, but an inaccuracy can be formally corrected with an added note.' },
  { title: 'Ask us to delete', body: 'We will delete what we are not legally or professionally required to keep. Clinical records have a mandatory retention period and are the main exception.' },
  { title: 'Opt out of marketing', body: 'Unsubscribe from any newsletter, or reply STOP to a text. Appointment reminders and clinical messages are not marketing and continue unless you ask us to stop them.' },
  { title: 'Take it elsewhere', body: 'We will transfer records to another practice on your instruction, usually within two business days.' },
  { title: 'Complain', body: 'Write to our practice manager first — most things are resolved in a phone call. You can also complain to the California Attorney General’s office.' },
];

export default function PrivacyPage() {
  const { content } = useCms();
  const contact = content.contact;

  return (
    <SitePage>
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        subtitle="What we collect, why we collect it, who sees it and how long we keep it — written in plain language rather than legal boilerplate."
        breadcrumb="Privacy policy"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { icon: Clock, text: `Last updated ${LAST_UPDATED}` },
            { icon: Lock, text: 'We never sell your data' },
            { icon: ShieldCheck, text: 'One controller: this practice' },
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

      {/* 1 — Who we are */}
      <Section id="who-we-are" alt>
        <SectionHeading
          eyebrow="Who we are"
          title="The practice is the data controller"
          subtitle="Vetnora Animal Hospital is responsible for the personal information described on this page. There is no parent company and no marketing group behind us."
        />
        <div className="max-w-3xl mx-auto rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/45">Registered address</dt>
              <dd className="mt-1.5 text-[14px] text-ink/75 leading-relaxed">{contact.address}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink/45">Privacy enquiries</dt>
              <dd className="mt-1.5 text-[14px] text-ink/75 leading-relaxed">
                <a href={`mailto:${contact.email}`} className="hv-underline text-plum font-semibold">{contact.email}</a>
                <br />
                <a href={telHref(contact.phone)} className="hv-underline text-plum font-semibold">{contact.phone}</a>
              </dd>
            </div>
          </dl>
          <p className="mt-6 pt-5 border-t border-line text-[13px] text-ink/60 leading-relaxed">
            This policy covers this website and everything we do at both the Vetnora and Riverside
            branches. If you ask us a question about your own data, a named member of staff answers it
            — we do not route privacy requests to an automated inbox.
          </p>
        </div>
      </Section>

      {/* 2 — What we collect */}
      <Section id="what-we-collect">
        <SectionHeading
          eyebrow="What we collect"
          title="Four kinds of information, and nothing else"
          subtitle="If a field on one of our forms is optional, leaving it blank has no effect on the care your pet receives."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {WHAT_WE_COLLECT.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="hv-card rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
                <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink mb-2">{item.title}</h3>
                <p className="text-[13px] text-ink/60 leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 3 — Why we use it */}
      <Section id="why" alt>
        <SectionHeading
          eyebrow="Why we use it"
          title="Six purposes, all of them operational"
          subtitle="Every use below is either necessary to treat your pet, necessary to run the practice, required by law, or something you explicitly opted into."
        />
        <div className="max-w-3xl mx-auto rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft">
          <ul className="space-y-3">
            {WHY_WE_USE_IT.map((line) => (
              <li key={line} className="flex items-start gap-3 text-[14px] text-ink/70 leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-6 pt-5 border-t border-line text-[13px] text-ink/55 leading-relaxed">
            We do not use your information for automated decision-making, we do not profile you for
            advertising, and we do not pass your details to data brokers. There is no commercial
            version of this policy — this is the only one.
          </p>
        </div>
      </Section>

      {/* 4 — Who sees it */}
      <Section id="sharing">
        <SectionHeading
          eyebrow="Who sees it"
          title="Who we share information with, and when"
          subtitle="Every recipient below is either providing part of your pet’s care or legally entitled to the information."
        />
        <div className="rounded-2xl border border-line bg-white shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="bg-canvas border-b border-line">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Recipient</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">When, and how much</th>
                </tr>
              </thead>
              <tbody>
                {SHARING.map((row) => (
                  <tr key={row.who} className="border-b border-line last:border-0 hover:bg-lilac/30 transition-colors duration-150">
                    <td className="px-5 py-4 text-[13px] font-semibold text-ink align-top">
                      <span className="flex items-start gap-2.5">
                        <Share2 className="w-3.5 h-3.5 mt-0.5 text-plum shrink-0" /> {row.who}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-ink/60 leading-relaxed">{row.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 5 — How long we keep it */}
      <Section id="retention" alt>
        <SectionHeading
          eyebrow="Retention"
          title="How long we keep things"
          subtitle="Clinical records have a professional minimum. Everything else we delete as soon as it has served its purpose."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { head: 'Clinical records', body: 'Kept for a minimum of seven years after the last consultation, and longer where a case may be subject to review. This is a professional requirement and we cannot delete them on request.' },
            { head: 'Messages, reviews and enquiries', body: 'Kept for two years so we can see the history of a conversation, then deleted. Reviews you asked us to publish stay published until you ask us to remove them.' },
            { head: 'Newsletter subscriptions', body: 'Kept until you unsubscribe. We keep a record of the unsubscribe itself so we do not accidentally add you back.' },
          ].map((c) => (
            <div key={c.head} className="rounded-2xl border border-line bg-white p-6">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-2">{c.head}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Your rights */}
      <Section id="your-rights">
        <SectionHeading
          eyebrow="Your rights"
          title="Six things you can ask us to do"
          subtitle="Email or phone reception for any of these. You do not need to use particular wording and you will not be asked why."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {RIGHTS.map((r) => (
            <div key={r.title} className="hv-card rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
              <h3 className="text-[15px] font-semibold text-ink mb-2">{r.title}</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 7 — Security, cookies and children */}
      <Section id="security" alt>
        <SectionHeading
          eyebrow="Security, cookies and children"
          title="The practical details"
          subtitle="Three things people reasonably ask about that do not fit anywhere else."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-line bg-white p-6">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-2">Security</h3>
            <p className="text-[13px] text-ink/60 leading-relaxed">
              Records are held in an access-controlled clinical system; staff see only what their role
              requires. Traffic to this site is encrypted, paper notes are locked away overnight, and
              we review access logs. If a breach ever affected you, we would tell you directly rather
              than publish a notice and hope you read it.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Cookie className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-2">Cookies</h3>
            <p className="text-[13px] text-ink/60 leading-relaxed">
              We use cookies that keep you signed in to the client portal and remember your display
              preferences, plus basic analytics to see which pages are useful. We do not run
              third-party advertising cookies. Blocking cookies will log you out of the portal but will
              not stop you browsing this site.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Baby className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-2">Children</h3>
            <p className="text-[13px] text-ink/60 leading-relaxed">
              Our services are intended for adults. We do not knowingly collect information from
              anyone under 16, and if you believe a child has sent us personal details, tell us and we
              will delete them.
            </p>
          </div>
        </div>

        <div className="mt-6 max-w-3xl mx-auto rounded-2xl border border-line bg-white p-6 flex items-start gap-4">
          <span className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </span>
          <p className="text-[13px] text-ink/60 leading-relaxed">
            <span className="font-semibold text-ink">If we change this policy</span> we will update the
            date at the top of the page, and for anything material we will tell you by email before it
            takes effect. We do not make changes retroactively.
          </p>
        </div>
      </Section>

      {/* 8 — Ask us */}
      <Section id="ask">
        <div className="max-w-3xl mx-auto rounded-2xl bg-grape text-white p-8 md:p-10 relative overflow-hidden text-center">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-iris/30 blur-3xl" />
          <div className="relative">
            <span className="inline-flex w-14 h-14 rounded-2xl bg-white/12 items-center justify-center mb-5">
              <Mail className="w-7 h-7" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight">Questions about your data?</h2>
            <p className="mt-3.5 text-[15px] text-white/70 leading-relaxed max-w-xl mx-auto">
              Ask our practice manager. Privacy requests are answered by a named person within 30 days,
              and usually much sooner than that.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <CtaLink href={SITE_ROUTES.contact} variant="white">Contact the practice</CtaLink>
              <CtaLink href={SITE_ROUTES.terms} variant="ghost">Read our terms of service</CtaLink>
            </div>
          </div>
        </div>
      </Section>
    </SitePage>
  );
}
