'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone, Mail, MapPin, Clock, Siren, Send, User, PawPrint, Car, Bus,
  Accessibility, Timer, TriangleAlert, Building2, Navigation, MessageSquare,
  CircleHelp, CircleCheckBig, Pill, CreditCard, FileText, Scissors,
  Headphones, ShieldCheck, Hash, ChevronRight, Stethoscope, Paperclip,
} from 'lucide-react';
import { useCms } from '../../lib/cms';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, SITE_ROUTES, telHref,
} from '../_components/site-chrome';
import { Button } from '../../components/ui';
import { Field, Input, Select, Textarea, Checkbox, FileInput } from '../../components/form';
import { useDB, newId, type MessageAttachment, type SiteMessage } from '../../lib/store';
import {
  isEmail, isPhone, nextDocNumber, localDateISO, localTimeHHMM,
} from '../../lib/helpers';

/* ---------------------------------------------------------------- */
/* Static reference data                                             */
/* ---------------------------------------------------------------- */

const BRANCHES = [
  {
    name: 'Northgate',
    tag: 'Main hospital',
    address: '128 Maple Avenue, Northgate, CA 94110',
    ext: 'ext. 1',
    hours: ['Mon–Fri 8:00–18:00', 'Sat 9:00–14:00', 'Sun closed (emergency line open)'],
    services: [
      'Full-service consultations and follow-up care',
      '24/7 emergency and critical care',
      'In-house laboratory with same-visit results',
      'Soft-tissue and orthopaedic surgery suite',
      'Overnight boarding with medication schedules',
    ],
    directions: 'https://maps.google.com/?q=128+Maple+Avenue+Northgate+CA+94110',
  },
  {
    name: 'Riverside',
    tag: 'Second branch',
    address: '42 Willow Court, Riverside Park, CA 94112',
    ext: 'ext. 6',
    hours: ['Mon–Fri 8:30–17:30', 'Sat 9:00–13:00', 'Sun closed'],
    services: [
      'Routine consultations and wellness exams',
      'Core and lifestyle vaccinations',
      'Dentistry, scale and polish, extractions',
      'Breed-specific grooming by appointment',
      'Open Monday to Saturday',
    ],
    directions: 'https://maps.google.com/?q=42+Willow+Court+Riverside+Park+CA+94112',
  },
];

const DIRECTORY = [
  { icon: Headphones, team: 'Reception & appointments', ext: 'ext. 1', email: 'reception@northgatevet.com', note: 'Booking, rescheduling, general questions' },
  { icon: Pill, team: 'Prescription refills', ext: 'ext. 2', email: 'refills@northgatevet.com', note: 'Repeat medication and food scripts' },
  { icon: CreditCard, team: 'Billing & insurance', ext: 'ext. 3', email: 'billing@northgatevet.com', note: 'Invoices, payment plans, claim forms' },
  { icon: FileText, team: 'Medical records', ext: 'ext. 4', email: 'records@northgatevet.com', note: 'Transfers, history requests, lab copies' },
  { icon: Scissors, team: 'Boarding & grooming', ext: 'ext. 5', email: 'boarding@northgatevet.com', note: 'Stay dates, grooming styles, drop-off times' },
  { icon: Siren, team: 'Emergency (24/7)', ext: 'press 9', email: 'emergency@northgatevet.com', note: 'Always answered by a nurse, day or night' },
];

const RESPONSE_TIMES = [
  { icon: Phone, label: 'Phone calls', window: 'Under 2 minutes', detail: 'Answered by a real person during opening hours — no phone trees.' },
  { icon: Mail, label: 'Email & this form', window: 'One business day', detail: 'Sent to the right team automatically based on your chosen topic.' },
  { icon: Pill, label: 'Refill requests', window: '4 working hours', detail: 'We check the file, confirm the dose, then text you when it is ready.' },
  { icon: FileText, label: 'Records requests', window: '2 business days', detail: 'Released to you or your new practice once consent is on file.' },
];

const TOPICS = [
  { value: 'new-patient', label: 'New patient registration' },
  { value: 'appointment', label: 'Book or change an appointment' },
  { value: 'refill', label: 'Prescription refill' },
  { value: 'billing', label: 'Billing question' },
  { value: 'records', label: 'Medical records request' },
  { value: 'boarding', label: 'Boarding or grooming' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Something else' },
];

type ContactErrors = {
  name?: string;
  email?: string;
  phone?: string;
  topic?: string;
  message?: string;
  consent?: string;
};

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function ContactPage() {
  const { content } = useCms();
  const { db, create } = useDB();
  const contact = content.contact;
  const hourLines = contact.hours.split('\n').filter((l) => l.trim().length > 0);
  const phoneHref = telHref(contact.phone);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('');
  const [branch, setBranch] = useState('no-preference');
  const [petName, setPetName] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState('');

  const topicLabel = TOPICS.find((t) => t.value === topic)?.label ?? '';
  const branchLabel =
    branch === 'northgate' ? 'Northgate' : branch === 'riverside' ? 'Riverside' : 'No preference';

  const resetForm = () => {
    setReference('');
    setName(''); setEmail(''); setPhone(''); setTopic('');
    setBranch('no-preference'); setPetName(''); setMessage(''); setConsent(false);
    /* The reset used to leave the attachment chips on screen, so the next
       message looked like it still carried the previous person's files. */
    setAttachments([]);
    setErrors({});
    setFormError('');
  };

  /**
   * Previously this only set a `Math.random()` reference — nothing was saved,
   * so the enquiry never reached the practice. Now it writes a SiteMessage.
   */
  const submit = async () => {
    if (saving) return;

    const next: ContactErrors = {};
    if (!name.trim()) next.name = 'Please tell us who you are.';
    if (!email.trim()) next.email = 'We need an email address to reply to.';
    else if (!isEmail(email)) next.email = 'That email address does not look right.';
    /* Optional, but a phone number full of letters is not a phone number. */
    if (phone.trim() && !isPhone(phone)) next.phone = 'That does not look like a phone number — digits only, at least seven.';
    if (!topic) next.topic = 'Choose the closest topic so we can route your message.';
    if (!message.trim()) next.message = 'Add a few words about how we can help.';
    else if (message.trim().length < 15) next.message = 'A little more detail helps us answer properly.';
    if (!consent) next.consent = 'We need your permission to reply before we can send this.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('');
      return;
    }

    const record: SiteMessage = {
      id: newId('msg'),
      reference: nextDocNumber(`NG-${new Date().getFullYear()}-`, db?.messages.map((message) => message.reference) ?? [], 1001, 4),
      source: 'Contact form',
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      petName: petName.trim(),
      topic: topicLabel || 'Something else',
      branch: branchLabel,
      message: message.trim(),
      attachments,
      consent,
      status: 'New',
      assignedTo: '',
      response: '',
      receivedAt: `${localDateISO()} ${localTimeHHMM()}`,
      respondedAt: '',
    };

    setSaving(true);
    try {
      await create('messages', record);
      setReference(record.reference);
      setFormError('');
    } catch {
      setFormError(
        `We could not send that just now — please try again, or call ${contact.phone} and reception will take the details.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SitePage>
      {/* 1 ── Hero ───────────────────────────────────────────────── */}
      <PageHero
        eyebrow="Get in touch"
        title="We are here, and we answer the phone"
        subtitle="Two Bay Area branches, one phone number, and a reception team that picks up in under two minutes during opening hours. Call, email, or send the form below and a real person will come back to you."
        breadcrumb="Contact"
      >
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={SITE_ROUTES.book} variant="white">Book an appointment</CtaLink>
          <CtaLink href={SITE_ROUTES.emergency} variant="ghost" icon={Siren}>Emergency care</CtaLink>
        </div>
      </PageHero>

      {/* 2 ── Contact methods ────────────────────────────────────── */}
      <Section id="contact-methods">
        <SectionHeading
          eyebrow="Ways to reach us"
          title={contact.sectionTitle}
          subtitle="Every route below lands with the same team at 128 Maple Avenue — nothing goes to an off-site call centre."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <a
            href={phoneHref}
            className="hv-card group block rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
          >
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Phone className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Call the clinic</h3>
            <p className="text-lg font-bold text-plum tabular-nums">{contact.phone}</p>
            <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">
              One number for both branches. Choose an extension or stay on the line for reception.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-plum">
              Tap to call <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </span>
          </a>

          <a
            href={`mailto:${contact.email}`}
            className="hv-card group block rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
          >
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Email reception</h3>
            <p className="text-[15px] font-bold text-plum break-all">{contact.email}</p>
            <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">
              Best for non-urgent questions, records and insurance paperwork. Replies within one business day.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-plum">
              Open your mail app <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </span>
          </a>

          <div className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Visit the hospital</h3>
            <p className="text-[14px] font-semibold text-ink/80 leading-snug">{contact.address}</p>
            <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">
              Free on-site parking, step-free entrance, and a separate feline waiting area.
            </p>
            <a
              href={BRANCHES[0].directions}
              className="hv-slide-parent mt-4 inline-flex items-center gap-1 text-xs font-semibold text-plum hover:text-grape transition-colors"
            >
              Get directions <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </a>
          </div>

          <div className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-3">Opening hours</h3>
            <ul className="space-y-1.5">
              {hourLines.map((line) => (
                <li key={line} className="text-[13px] text-ink/70 leading-snug flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-ink/45 leading-relaxed">
              Emergency cover continues outside these hours, every day of the year.
            </p>
          </div>

          <div className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Send a message</h3>
            <p className="text-[13px] text-ink/55 leading-relaxed">
              Use the form below if you would rather write it all down. It reaches the team that handles your topic directly.
            </p>
            <Link
              href="#contact-form"
              className="hv-slide-parent mt-4 inline-flex items-center gap-1 text-xs font-semibold text-plum hover:text-grape transition-colors"
            >
              Jump to the form <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </Link>
          </div>

          <Link
            href={SITE_ROUTES.emergency}
            className="hv-card group block rounded-2xl border-2 border-coral/35 bg-coral/5 p-6 hover:border-coral"
          >
            <span className="hv-tile w-12 h-12 rounded-xl bg-coral/15 text-coral flex items-center justify-center mb-4">
              <Siren className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-1">Emergency, right now</h3>
            <p className="text-lg font-bold text-coral tabular-nums">{contact.phone}</p>
            <p className="mt-2 text-[13px] text-ink/60 leading-relaxed">
              Collapse, breathing trouble, suspected poisoning, bloat, trauma, or a seizure that will not stop — phone us
              first and drive straight to Northgate.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-coral">
              What counts as an emergency <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      </Section>

      {/* 3 ── Contact form ───────────────────────────────────────── */}
      <Section id="contact-form" alt>
        <SectionHeading
          eyebrow="Message us"
          title="Tell us what you need"
          subtitle="Four quick details and a sentence or two about your pet is usually enough for us to help on the first reply."
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Form card */}
          <div className="lg:col-span-3 rounded-2xl border border-line bg-white shadow-soft p-6 md:p-8">
            {reference ? (
              <div className="text-center py-6 animate-fadeIn">
                <span className="inline-flex w-14 h-14 rounded-2xl bg-lilac text-plum items-center justify-center mb-5">
                  <CircleCheckBig className="w-7 h-7" />
                </span>
                <h3 className="text-xl font-bold text-ink tracking-tight">Message received, thank you</h3>
                <p className="mt-3 text-[14px] text-ink/60 leading-relaxed max-w-md mx-auto">
                  {name.split(' ')[0] || 'Thanks'} — your enquiry about{' '}
                  <span className="font-semibold text-ink/80">{topicLabel.toLowerCase()}</span> is with the right team
                  and we will <span className="font-semibold text-ink/80">reply within one business day</span>.
                </p>
                <div className="mt-6 inline-flex items-center gap-2.5 rounded-xl border border-line bg-canvas px-5 py-3">
                  <Hash className="w-4 h-4 text-plum" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Reference</span>
                  <span className="text-sm font-bold text-plum tabular-nums">{reference}</span>
                </div>
                <p className="mt-5 text-[13px] text-ink/50 leading-relaxed max-w-md mx-auto">
                  Quote that reference if you call us in the meantime. If it turns out to be urgent, do not wait for the
                  reply — phone {contact.phone}.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" onClick={resetForm}>
                    Send another message
                  </Button>
                  <CtaLink href={SITE_ROUTES.book} variant="primary">Book an appointment</CtaLink>
                </div>
              </div>
            ) : (
              <form
                noValidate
                className="space-y-5"
                onSubmit={(e) => { e.preventDefault(); void submit(); }}
              >
                {formError && (
                  <div className="rounded-xl border-2 border-coral/40 bg-coral/5 p-4 flex items-start gap-2.5 animate-fadeIn">
                    <TriangleAlert className="w-4 h-4 text-coral mt-0.5 shrink-0" />
                    <p className="text-[12px] text-ink/70 leading-relaxed">{formError}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Full name" hint="So we know who we are writing back to" error={errors.name} required>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Eleanor Hayes"
                      icon={User}
                      error={!!errors.name}
                      clearable
                    />
                  </Field>
                  <Field label="Email address" hint="We reply here first" error={errors.email} required>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      icon={Mail}
                      error={!!errors.email}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="Phone number"
                    hint="Optional — handy if the answer is quicker by phone"
                    error={errors.phone}
                  >
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 415 555 0132"
                      icon={Phone}
                      error={!!errors.phone}
                    />
                  </Field>
                  <Field label="Pet's name" hint="Optional — helps us find your file faster">
                    <Input
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Buddy"
                      icon={PawPrint}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field
                    label="What is this about?"
                    hint="This decides which team sees your message"
                    error={errors.topic}
                    required
                  >
                    <Select value={topic} onChange={(e) => setTopic(e.target.value)} error={!!errors.topic}>
                      <option value="">— Select a topic —</option>
                      {TOPICS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Preferred branch" hint="Northgate is the main hospital">
                    <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                      <option value="northgate">Northgate — 128 Maple Avenue</option>
                      <option value="riverside">Riverside — 42 Willow Court</option>
                      <option value="no-preference">No preference</option>
                    </Select>
                  </Field>
                </div>

                <Field
                  label="Your message"
                  hint="Species, age, how long it has been going on, and anything you have already tried"
                  error={errors.message}
                  required
                >
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={800}
                    placeholder="Buddy is a 6-year-old Golden Retriever. He has been limping on his back left leg since Saturday after a long walk — still eating normally and happy, but reluctant on stairs. Could we get him looked at this week?"
                    error={!!errors.message}
                  />
                </Field>

                <Field
                  label="Attach a photo or records"
                  hint="Optional. A photo of the problem, or a PDF from a previous vet. PNG, JPG or PDF up to 10 MB."
                >
                  <FileInput
                    accept="image/png,image/jpeg,image/webp,.pdf"
                    multiple
                    label="Upload files"
                    hint="Drag files here, or click to browse"
                    onFiles={(files) =>
                      setAttachments(Array.from(files).map((f) => ({ name: f.name, size: f.size })))
                    }
                  />
                  {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {attachments.map((a) => (
                        <span
                          key={a.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lilac text-plum text-[11px] font-medium"
                        >
                          <Paperclip className="w-3 h-3" /> {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                <div className={`rounded-xl border p-4 transition-colors ${errors.consent ? 'border-coral bg-coral/5' : 'border-line bg-canvas'}`}>
                  <Checkbox
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    label="Yes, you may contact me about this enquiry by email or phone."
                    hint="We only use your details to answer this message. No marketing, no sharing with third parties."
                  />
                  {errors.consent && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-coral">
                      <TriangleAlert className="w-3 h-3 shrink-0" /> {errors.consent}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                  <Button type="submit" variant="primary" size="lg" icon={Send} disabled={saving}>
                    {saving ? 'Sending…' : 'Send message'}
                  </Button>
                  <p className="text-[12px] text-ink/45 leading-relaxed">
                    Fields marked <span className="text-coral font-semibold">*</span> are required. We never put your
                    details on a mailing list.
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* Reassurance panel */}
          <aside className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <Timer className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-3">When you will hear back</h3>
              <ul className="space-y-2.5">
                {RESPONSE_TIMES.map((r) => (
                  <li key={r.label} className="flex items-start justify-between gap-3">
                    <span className="text-[13px] text-ink/70">{r.label}</span>
                    <span className="text-[12px] font-semibold text-plum shrink-0">{r.window}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-3">What to include</h3>
              <ul className="space-y-2">
                {[
                  'Your pet’s name, species and rough age',
                  'What you have noticed and when it started',
                  'Any medication they are already on',
                  'Days and times that suit you for a visit',
                  'Your previous practice, if you are transferring',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                    <CircleCheckBig className="w-3.5 h-3.5 text-plum mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={SITE_ROUTES.faq}
              className="hv-card group block rounded-2xl bg-grape text-white p-6 relative overflow-hidden"
            >
              <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-iris/30 blur-3xl" />
              <div className="relative">
                <span className="hv-tile w-11 h-11 rounded-xl bg-white/12 text-white flex items-center justify-center mb-4">
                  <CircleHelp className="w-5 h-5" />
                </span>
                <h3 className="text-[15px] font-semibold mb-2">Might already be answered</h3>
                <p className="text-[13px] text-white/65 leading-relaxed">
                  Vaccination schedules, fasting before surgery, insurance claims, microchipping, and what a first visit
                  costs — our FAQ covers the questions reception hears most.
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white">
                  Read the FAQ <ChevronRight className="hv-slide w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </aside>
        </div>
      </Section>

      {/* 4 ── Our two branches ───────────────────────────────────── */}
      <Section id="branches">
        <SectionHeading
          eyebrow="Our two branches"
          title="Northgate for everything, Riverside for routine care"
          subtitle="Both share one clinical record system, so whichever you visit the team already knows your pet's history."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {BRANCHES.map((b) => (
            <div key={b.name} className="hv-card group rounded-2xl border border-line bg-white p-6 md:p-8 hover:border-plum/25">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3.5">
                  <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-ink tracking-tight">{b.name}</h3>
                    <p className="text-[13px] text-ink/55 mt-0.5">{b.address}</p>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-lilac text-plum text-[11px] font-semibold">
                  {b.tag}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2">
                    <Phone className="w-3 h-3" /> Phone
                  </span>
                  <p className="text-[13px] font-semibold text-ink tabular-nums">{contact.phone}</p>
                  <p className="text-[12px] text-plum font-semibold mt-0.5">{b.ext}</p>
                </div>
                <div className="rounded-xl border border-line bg-canvas p-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2">
                    <Clock className="w-3 h-3" /> Hours
                  </span>
                  <ul className="space-y-0.5">
                    {b.hours.map((h) => (
                      <li key={h} className="text-[12px] text-ink/70 leading-snug">{h}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {b.services.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                    <Stethoscope className="w-3.5 h-3.5 text-plum mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>

              <CtaLink href={b.directions} variant="outline" icon={Navigation}>Get directions</CtaLink>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 ── Find us ────────────────────────────────────────────── */}
      <Section id="find-us" alt>
        <SectionHeading
          eyebrow="Find us"
          title="Look for the violet awning on Maple Avenue"
          subtitle="We are a five-minute walk from Northgate Library and share the block with two cafés, so there is somewhere to wait if you arrive early."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-line shadow-soft bg-white">
            <img
              src={contact.mapImage}
              alt="Map view of the streets around Northgate Animal Hospital on Maple Avenue"
              className="w-full h-[280px] md:h-[420px] object-cover"
            />
            {/* Violet pin marker overlay */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none">
              <div className="relative">
                <span className="absolute inset-0 rounded-full bg-iris/40 blur-xl scale-150" />
                <span className="relative flex items-center justify-center w-12 h-12 rounded-full bg-plum text-white shadow-lift ring-4 ring-white">
                  <MapPin className="w-6 h-6" />
                </span>
              </div>
              <span className="w-1 h-5 bg-plum rounded-b-full" />
              <span className="mt-1.5 rounded-lg bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-lift-sm border border-line">
                <span className="block text-[11px] font-bold text-ink leading-tight">Northgate Animal Hospital</span>
                <span className="block text-[10px] text-ink/55 leading-tight">128 Maple Avenue</span>
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-2">The landmark</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">
                We are between the library and the Maple Avenue bakery — if you can smell sourdough, you have gone one
                door too far. The entrance is the violet one, set back slightly from the pavement.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                <Navigation className="w-5 h-5" />
              </span>
              <h3 className="text-[15px] font-semibold text-ink mb-2">Arriving by car</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed mb-4">
                Turn off 3rd onto Maple and the car park entrance is immediately on your right, just past the bike racks.
              </p>
              <CtaLink href={BRANCHES[0].directions} variant="outline">Open in Maps</CtaLink>
            </div>
          </div>
        </div>
      </Section>

      {/* 6 ── Getting here ───────────────────────────────────────── */}
      <Section id="getting-here">
        <SectionHeading
          eyebrow="Getting here"
          title="Parking, buses, and getting through the door"
          subtitle="Worth a quick read before a first visit — especially if you are carrying a nervous cat or a very large dog."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Car className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-3">Parking</h3>
            <ul className="space-y-2">
              {[
                '12 free spaces on site, including two wide bays by the entrance',
                'Free street parking on Juniper Street, usually quieter after 10:00',
                'Loading bay out front for dropping off a heavy carrier — then move the car',
                'Bike racks under cover to the right of the main door',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Bus className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-3">Public transport</h3>
            <ul className="space-y-2">
              {[
                'The 14 and 49 bus lines stop at Maple & 3rd — two minutes’ walk',
                'Northbound stop is directly outside the library, southbound is across the road',
                'Buses run every 10–12 minutes on weekdays, every 20 on Saturdays',
                'Small pets travel free in a secure carrier on both lines',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <Accessibility className="w-6 h-6" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-3">Accessibility</h3>
            <ul className="space-y-2">
              {[
                'Step-free entrance from the car park and the pavement',
                'Wide automatic doors that take large carriers and crates',
                'A separate quiet feline waiting area away from the dog benches',
                'Ask at reception and we will help you bring your pet in from the car',
                'Accessible toilet and a low consultation table on request',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 7 ── Who to contact ─────────────────────────────────────── */}
      <Section id="directory" alt>
        <SectionHeading
          eyebrow="Who to contact"
          title="Straight through to the right desk"
          subtitle="Dial the main number and enter an extension, or email the alias directly — both reach the same team."
        />
        <div className="rounded-2xl border border-line bg-white shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="bg-canvas border-b border-line">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Team</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Extension</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Email alias</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Best for</th>
                </tr>
              </thead>
              <tbody>
                {DIRECTORY.map((row) => {
                  const Icon = row.icon;
                  const urgent = row.ext === 'press 9';
                  return (
                    <tr key={row.team} className="border-b border-line last:border-0 hover:bg-lilac/30 transition-colors duration-150">
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgent ? 'bg-coral/15 text-coral' : 'bg-lilac text-plum'}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-[13px] font-semibold text-ink">{row.team}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums ${urgent ? 'bg-coral/15 text-coral' : 'bg-lilac text-plum'}`}>
                          {row.ext}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <a href={`mailto:${row.email}`} className="hv-underline text-[13px] text-plum font-medium">
                          {row.email}
                        </a>
                      </td>
                      <td className="px-5 py-4 text-[13px] text-ink/60">{row.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-ink/45 leading-relaxed">
          Out of hours, every extension rolls to the emergency nurse on duty. Extension 6 reaches the Riverside branch
          reception during its own opening hours.
        </p>
      </Section>

      {/* 8 ── Response times & urgent note ──────────────────────── */}
      <Section id="response-times">
        <SectionHeading
          eyebrow="Response times"
          title="What “we’ll get back to you” actually means here"
          subtitle="We publish our targets so you know when to chase us. If we miss one, tell reception and we will find out why."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {RESPONSE_TIMES.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-[12px] font-bold text-plum bg-lilac px-2.5 py-1 rounded-full">{r.window}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-ink mb-1.5">{r.label}</h3>
                  <p className="text-[13px] text-ink/55 leading-relaxed">{r.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border-2 border-coral/40 bg-coral/5 p-6 md:p-7">
            <span className="w-12 h-12 rounded-xl bg-coral/15 text-coral flex items-center justify-center mb-4">
              <TriangleAlert className="w-6 h-6" />
            </span>
            <h3 className="text-lg font-bold text-ink tracking-tight mb-2">
              Do not use this form for emergencies
            </h3>
            <p className="text-[13px] text-ink/65 leading-relaxed">
              Nobody monitors this inbox overnight or at weekends. If your pet has collapsed, is struggling to breathe,
              is bleeding heavily, has eaten something toxic, cannot urinate, or is having a seizure that will not stop —
              stop reading and call us.
            </p>
            <a
              href={phoneHref}
              className="hv-lift mt-5 flex items-center justify-center gap-2 h-12 rounded-xl bg-coral text-white text-sm font-bold shadow-sm hover:shadow-lift"
            >
              <Phone className="w-4 h-4" /> {contact.phone}
            </a>
            <Link
              href={SITE_ROUTES.emergency}
              className="hv-slide-parent mt-3.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-coral hover:text-ink transition-colors"
            >
              <Siren className="w-3.5 h-3.5" /> See our emergency guidance
              <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </Link>
            <p className="mt-4 text-[12px] text-ink/45 leading-relaxed">
              The emergency line is answered 24 hours a day, 365 days a year, by a nurse who can talk you through the
              first few minutes while you travel.
            </p>
          </div>
        </div>
      </Section>

      {/* 9 ── CTA band ───────────────────────────────────────────── */}
      <CtaBand
        title="Still easier to just talk it through?"
        subtitle={`Call ${contact.phone} and reception will book you in, check a prescription, or put you through to a nurse.`}
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Read the FAQ"
        secondaryHref={SITE_ROUTES.faq}
      />
    </SitePage>
  );
}
