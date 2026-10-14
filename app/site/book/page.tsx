'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Dog, Cat, Rabbit, Bird, Turtle, PawPrint, User, Mail, Phone, Clock,
  Siren, Stethoscope, Syringe, Pill, Scale, Bell,
  ClipboardList, ListChecks, TriangleAlert, CircleCheckBig, CircleHelp, Hash,
  ChevronRight, Sparkles, Baby, Utensils, FileText, Building2, CalendarCheck,
  Headphones, ShieldCheck, Timer, Check, Send, Wallet, Ruler, LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, SITE_ROUTES, telHref,
} from '../_components/site-chrome';
import { VET_OPTIONS, isVetSlug, vetLabel } from '../_components/vets';
import { Button } from '../../components/ui';
import {
  Field, Input, Select, Textarea, Checkbox, RadioGroup, NumberInput,
  DatePicker, TimeInput, Switch, FileInput,
} from '../../components/form';
import { useCms } from '../../lib/cms';
import {
  useDB, newId, type Appointment, type MessageAttachment, type SiteMessage,
} from '../../lib/store';
import {
  localDateISO, localTimeHHMM, isEmail, isPhone, weekdayOf, num, nextDocNumber,
} from '../../lib/helpers';

/* ---------------------------------------------------------------- */
/* Reference data                                                    */
/* ---------------------------------------------------------------- */

const PET_TYPES = [
  { value: 'dog', label: 'Dog', hint: 'Any breed or size', icon: Dog },
  { value: 'cat', label: 'Cat', hint: 'Quiet feline waiting area', icon: Cat },
  { value: 'rabbit', label: 'Rabbit', hint: 'Rabbit-savvy clinicians', icon: Rabbit },
  { value: 'bird', label: 'Bird', hint: 'Avian exams and beak care', icon: Bird },
  { value: 'reptile', label: 'Reptile', hint: 'Husbandry and health checks', icon: Turtle },
  { value: 'other', label: 'Other', hint: 'Ferrets, rodents, small mammals', icon: PawPrint },
];

const CLIENT_TYPES = [
  { value: 'existing', label: 'I am an existing client', hint: 'We already have your pet on file' },
  { value: 'new', label: 'I am new to Northgate', hint: 'We will send a short registration form' },
];

const SIZE_BANDS = [
  { value: 'toy', label: 'Toy — under 5 kg' },
  { value: 'small', label: 'Small — 5 to 10 kg' },
  { value: 'medium', label: 'Medium — 10 to 25 kg' },
  { value: 'large', label: 'Large — 25 to 40 kg' },
  { value: 'giant', label: 'Giant — over 40 kg' },
  { value: 'na', label: 'Not applicable' },
];

const SERVICES = [
  { value: 'wellness', label: 'Wellness exam' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'sick', label: 'Sick visit' },
  { value: 'dental', label: 'Dental assessment' },
  { value: 'surgery', label: 'Surgery consultation' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'boarding', label: 'Boarding enquiry' },
  { value: 'prescription', label: 'Prescription review' },
];

const BRANCH_OPTIONS = [
  { value: 'northgate', label: 'Northgate — 128 Maple Avenue' },
  { value: 'riverside', label: 'Riverside — 42 Willow Court' },
];

const VETS = VET_OPTIONS;

/* Clinic opening hours, in minutes from midnight. Sunday is closed.
   The form used to accept a Sunday slot or an 03:00 Saturday and still show a
   confirmation panel, which meant reception had to phone and undo it. */
const OPENING_HOURS: Record<number, { open: string; close: string } | null> = {
  0: null,                              // Sunday — closed
  1: { open: '08:00', close: '18:00' },
  2: { open: '08:00', close: '18:00' },
  3: { open: '08:00', close: '18:00' },
  4: { open: '08:00', close: '18:00' },
  5: { open: '08:00', close: '18:00' },
  6: { open: '09:00', close: '14:00' },  // Saturday
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The last slot we will start an appointment in, before closing. */
const LAST_SLOT_OFFSET_MIN = 15;

const WELLNESS_PLANS: Record<string, string> = {
  essential: 'Essential wellness plan',
  complete: 'Complete wellness plan',
  senior: 'Senior wellness plan',
};

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function fromMinutes(mins: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(mins / 60))}:${p(mins % 60)}`;
}

const ADD_ONS = [
  { value: 'nails', label: 'Nail trim', price: 15, hint: 'Done in the consult room while we chat' },
  { value: 'glands', label: 'Anal glands', price: 20, hint: 'Expressed by a nurse, takes two minutes' },
  { value: 'microchip', label: 'Microchip check', price: 0, hint: 'Free — we scan and confirm your details are current' },
  { value: 'nutrition', label: 'Weight & nutrition consult', price: 25, hint: '15 minutes with a nurse and a feeding plan' },
  { value: 'fleatick', label: 'Flea/tick treatment', price: 18, hint: 'Applied before you leave, weight-matched dose' },
];

const QUICK_TIMES = [
  { value: '09:00', label: '9:00' },
  { value: '11:30', label: '11:30' },
  { value: '14:00', label: '14:00' },
  { value: '16:30', label: '16:30' },
];

const STEPS = [
  { n: '1', title: 'About your pet', hint: 'Species, name, size' },
  { n: '2', title: 'What you need', hint: 'Service, branch, vet' },
  { n: '3', title: 'When', hint: 'Date and time' },
  { n: '4', title: 'Your details', hint: 'Contact and consent' },
];

const HOW_IT_WORKS = [
  {
    n: '1',
    icon: Send,
    title: 'Send the request',
    body: 'Fill in the form above — it takes about a minute. Nothing is charged and no deposit is held, so there is no risk in asking for a slot you are not sure about yet.',
  },
  {
    n: '2',
    icon: CalendarCheck,
    title: 'We confirm by SMS within 2 working hours',
    body: 'Reception checks the clinical diary against your preferred vet and time. If that exact slot has gone, we text you the two nearest alternatives instead of silently moving you.',
  },
  {
    n: '3',
    icon: Clock,
    title: 'Arrive 10 minutes early for check-in',
    body: 'That gives us time to weigh your pet, confirm your details, and settle nervous animals before the consult starts — which is usually the difference between a calm visit and a stressful one.',
  },
];

const WHAT_TO_BRING = [
  { icon: FileText, title: 'Previous records or your vaccination card', body: 'Anything from your last practice — booster dates, lab results, discharge notes. A photo on your phone is fine.' },
  { icon: Pill, title: 'A list of current medications and doses', body: 'Include flea and worm products, supplements, and joint powders. Doses matter more than brand names.' },
  { icon: ClipboardList, title: 'A fresh stool or urine sample, if we asked', body: 'Collected the same morning and kept cool. Reception will have given you a pot at booking.' },
  { icon: Utensils, title: 'Your pet’s regular food brand', body: 'A photo of the label is enough. It makes diet advice specific rather than generic.' },
  { icon: PawPrint, title: 'A secure carrier for cats and small pets', body: 'Top-opening if you have one. A towel over it keeps the waiting room much less frightening.' },
  { icon: CircleHelp, title: 'A short list of your own questions', body: 'Write them down beforehand — people forget half of them once the consult starts. We would rather answer all of them.' },
];

const APPOINTMENT_TYPES = [
  { type: 'Wellness exam', duration: '30 min', fasting: 'No', note: 'Full nose-to-tail check, weight and lifestyle review' },
  { type: 'Vaccination', duration: '15 min', fasting: 'No', note: 'Health check first, then the booster due' },
  { type: 'Sick visit', duration: '30 min', fasting: 'Sometimes', note: 'Hold food if we may need bloods — reception will say' },
  { type: 'Dental assessment', duration: '20 min', fasting: 'No', note: 'Awake oral exam and a written treatment estimate' },
  { type: 'Surgery consultation', duration: '45 min', fasting: 'Yes', note: 'No food from 22:00 the night before, water is fine' },
  { type: 'Puppy/kitten first visit', duration: '40 min', fasting: 'No', note: 'Exam, first vaccines, microchip, feeding and training advice' },
  { type: 'Grooming', duration: '90–150 min', fasting: 'No', note: 'Drop-off appointment, length depends on coat and breed' },
  { type: 'Nurse clinic', duration: '15 min', fasting: 'No', note: 'Weigh-ins, nail trims, post-op checks, dressing changes' },
];

type BookingErrors = {
  petType?: string;
  petName?: string;
  service?: string;
  date?: string;
  time?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  policy?: string;
};

function pretty12h(hhmm: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return '';
  const h = Number(m[1]);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${suffix}`;
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function BookPage() {
  /* `new Date().toISOString().slice(0,10)` is tomorrow's date for anyone west
     of UTC in the evening, which made today unselectable in Pacific time. */
  const today = localDateISO();

  const { content } = useCms();
  const { db, create } = useDB();
  const contact = content.contact;

  /* Step 1 — pet */
  const [petType, setPetType] = useState('');
  const [clientType, setClientType] = useState('existing');
  const [petName, setPetName] = useState('');
  const [sizeBand, setSizeBand] = useState('');
  const [petAge, setPetAge] = useState('');
  const [weight, setWeight] = useState('');

  /* Step 2 — service */
  const [service, setService] = useState('');
  const [branch, setBranch] = useState('northgate');
  const [vet, setVet] = useState('any');
  const [addOns, setAddOns] = useState<string[]>([]);

  /* Step 3 — when */
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  /* Step 4 — you */
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<MessageAttachment[]>([]);
  const [reminders, setReminders] = useState(true);
  const [policy, setPolicy] = useState(false);

  const [errors, setErrors] = useState<BookingErrors>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  /* Deep links from the team page (`?vet=grant`) and the pricing page
     (`?plan=complete&billing=annual`). Read from the URL rather than
     useSearchParams so the page stays statically renderable. */
  const [plan, setPlan] = useState('');
  const [billing, setBilling] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const wantedVet = params.get('vet');
    if (isVetSlug(wantedVet)) setVet(wantedVet as string);

    const wantedService = params.get('service');
    if (wantedService && SERVICES.some((s) => s.value === wantedService)) setService(wantedService);

    const wantedBranch = params.get('branch');
    if (wantedBranch && BRANCH_OPTIONS.some((b) => b.value === wantedBranch)) setBranch(wantedBranch);

    const wantedPlan = (params.get('plan') ?? '').toLowerCase();
    if (WELLNESS_PLANS[wantedPlan]) {
      setPlan(wantedPlan);
      /* A plan sign-up starts with a wellness exam unless they said otherwise. */
      if (!wantedService) setService('wellness');
    }

    const wantedBilling = (params.get('billing') ?? '').toLowerCase();
    if (wantedBilling === 'monthly' || wantedBilling === 'annual') setBilling(wantedBilling);
  }, []);

  const planLabel = plan ? WELLNESS_PLANS[plan] : '';
  const billingLabel = billing === 'annual' ? 'Annual billing' : billing === 'monthly' ? 'Monthly billing' : '';

  const toggleAddOn = (value: string, on: boolean) =>
    setAddOns((prev) => (on ? [...prev, value] : prev.filter((v) => v !== value)));

  const addOnTotal = ADD_ONS.filter((a) => addOns.includes(a.value)).reduce((sum, a) => sum + a.price, 0);

  const label = (list: { value: string; label: string }[], value: string) =>
    list.find((o) => o.value === value)?.label ?? '—';

  /* Opening hours for the chosen date, and the slot window the picker offers. */
  const weekday = date ? weekdayOf(date) : null;
  const dayHours = weekday === null ? undefined : OPENING_HOURS[weekday];
  const closedThatDay = weekday !== null && !dayHours;
  const openMin = dayHours ? toMinutes(dayHours.open) ?? 0 : 8 * 60;
  const closeMin = dayHours ? toMinutes(dayHours.close) ?? 18 * 60 : 18 * 60;
  const lastSlotMin = closeMin - LAST_SLOT_OFFSET_MIN;

  const slotIsOpen = (hhmm: string) => {
    if (!dayHours) return false;
    const mins = toMinutes(hhmm);
    return mins !== null && mins >= openMin && mins <= lastSlotMin;
  };

  const hoursHint = closedThatDay
    ? 'We are closed on Sundays — pick another day, or call the emergency line if this cannot wait.'
    : dayHours
      ? `${DAY_NAMES[weekday as number]} hours are ${dayHours.open}–${dayHours.close}, so the latest start is ${fromMinutes(lastSlotMin)}.`
      : 'In 15-minute steps — we will text the nearest available slot';

  const submit = async () => {
    if (saving) return;

    const next: BookingErrors = {};
    if (!petType) next.petType = 'Pick the species so we book the right clinician.';
    if (!petName.trim()) next.petName = 'We need your pet’s name for the diary.';
    if (!service) next.service = 'Choose the type of appointment you need.';

    if (!date) {
      next.date = 'Pick a preferred date.';
    } else if (closedThatDay) {
      next.date = 'We are closed on Sundays. Please choose Monday to Saturday — or call us if it is urgent.';
    }

    if (!time) {
      next.time = 'Pick a preferred time, or use a quick-pick below.';
    } else if (date && !closedThatDay && !slotIsOpen(time)) {
      next.time = `${pretty12h(time)} is outside our ${DAY_NAMES[weekday as number]} hours of ${dayHours?.open}–${dayHours?.close}. Please choose a time up to ${fromMinutes(lastSlotMin)}.`;
    }

    if (!ownerName.trim()) next.ownerName = 'Please add your full name.';
    if (!ownerEmail.trim()) next.ownerEmail = 'We send written confirmation by email.';
    else if (!isEmail(ownerEmail)) next.ownerEmail = 'That email address does not look right.';
    if (!ownerPhone.trim()) next.ownerPhone = 'We confirm by SMS, so a mobile number is required.';
    else if (!isPhone(ownerPhone)) next.ownerPhone = 'That does not look like a phone number — at least seven digits.';
    if (!policy) next.policy = 'Please accept the cancellation policy to continue.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('');
      return;
    }

    const serviceLabel = label(SERVICES, service);
    const vetName = vet === 'any' ? 'First available' : vetLabel(vet);
    const branchName = label(BRANCH_OPTIONS, branch);
    const selectedAddOns = ADD_ONS.filter((a) => addOns.includes(a.value));

    /* Reference comes from the record we are about to write, derived from the
       highest existing suffix — not Math.random(), which could collide. */
    const reference = nextDocNumber('NG-BK-', db?.messages.map((message) => message.reference) ?? [], 1001, 4);

    /* Token numbers are per-day, so derive from the appointments already on
       that date rather than from the length of the whole collection. */
    const sameDay = (db?.appointments ?? []).filter((a) => a.date === date);
    const tokenNumber = sameDay.reduce((max, a) => Math.max(max, num(a.tokenNumber)), 0) + 1;

    const petDetails = [
      `Species: ${label(PET_TYPES, petType)}`,
      sizeBand ? `Size band: ${label(SIZE_BANDS, sizeBand)}` : null,
      petAge.trim() ? `Age: ${num(petAge)} year${num(petAge) === 1 ? '' : 's'}` : null,
      weight.trim() ? `Approximate weight: ${num(weight)} kg` : null,
    ].filter(Boolean).join(' · ');

    const messageBody = [
      `${clientType === 'new' ? 'New client' : 'Existing client'} requesting ${serviceLabel} at ${branchName} on ${date} at ${pretty12h(time)}.`,
      `Pet: ${petName.trim()} — ${petDetails}`,
      `Preferred veterinarian: ${vetName}`,
      planLabel ? `Wellness plan enquiry: ${planLabel}${billingLabel ? ` (${billingLabel})` : ''}` : null,
      selectedAddOns.length
        ? `Add-ons requested: ${selectedAddOns.map((a) => `${a.label}${a.price === 0 ? ' (free)' : ` (+$${a.price})`}`).join(', ')} — estimated $${addOnTotal}`
        : 'No add-ons requested',
      `Reminders: ${reminders ? 'yes, SMS and email' : 'opted out'}`,
      files.length ? `Attachments: ${files.map((f) => f.name).join(', ')}` : 'No attachments',
      notes.trim() ? `Owner notes: ${notes.trim()}` : 'No notes supplied',
    ].filter(Boolean).join('\n');

    const appointment: Appointment = {
      id: newId('apt'),
      petId: '',
      ownerId: '',
      vet: vetName,
      service: serviceLabel,
      date,
      time,
      durationMin: 30,
      status: 'Scheduled',
      room: '',
      reason: notes.trim() || serviceLabel,
      bookingType: 'Online',
      tokenNumber,
      queuePosition: sameDay.length + 1,
      isRecurring: false,
      recurrencePattern: 'None',
      followUpDate: '',
      followUpReminder: reminders,
      notes: `Online request ${reference} · ${branchName} · ${petName.trim()} (${petDetails}) · ${ownerName.trim()} · ${ownerEmail.trim()} · ${ownerPhone.trim()}`,
    };

    const message: SiteMessage = {
      id: newId('msg'),
      reference,
      source: 'Booking request',
      name: ownerName.trim(),
      email: ownerEmail.trim(),
      phone: ownerPhone.trim(),
      petName: petName.trim(),
      topic: serviceLabel,
      branch: branchName,
      message: messageBody,
      attachments: files,
      consent: policy,
      status: 'New',
      assignedTo: '',
      response: '',
      receivedAt: `${localDateISO()} ${localTimeHHMM()}`,
      respondedAt: '',
    };

    setSaving(true);
    try {
      await create('appointments', appointment);
      await create('messages', message);
      setBookingRef(reference);
      setFormError('');
    } catch {
      setFormError(
        `We could not send that request just now — nothing was booked. Please try again, or call ${contact.phone} and reception will take the details.`,
      );
    } finally {
      setSaving(false);
    }
  };

  const errorList = Object.values(errors).filter(Boolean) as string[];

  const summary = [
    { icon: PawPrint, label: 'Pet', value: `${petName} · ${label(PET_TYPES, petType)}` },
    { icon: Stethoscope, label: 'Service', value: label(SERVICES, service) },
    { icon: User, label: 'Veterinarian', value: label(VETS, vet) },
    { icon: Building2, label: 'Branch', value: label(BRANCH_OPTIONS, branch) },
    { icon: CalendarCheck, label: 'Date', value: date },
    { icon: Clock, label: 'Time', value: pretty12h(time) },
    /* Size band, age and weight were collected and then thrown away — they
       decide the room, the table and the weight-matched doses. */
    { icon: Ruler, label: 'Size band', value: sizeBand ? label(SIZE_BANDS, sizeBand) : 'Not given' },
    { icon: Baby, label: 'Age', value: petAge.trim() ? `${num(petAge)} year${num(petAge) === 1 ? '' : 's'}` : 'Not given' },
    { icon: Scale, label: 'Approx. weight', value: weight.trim() ? `${num(weight)} kg` : 'Not given' },
    ...(planLabel
      ? [{ icon: Wallet, label: 'Wellness plan', value: billingLabel ? `${planLabel} · ${billingLabel}` : planLabel }]
      : []),
  ];

  const resetForm = () => {
    setBookingRef('');
    setPetType(''); setClientType('existing'); setPetName(''); setSizeBand('');
    setPetAge(''); setWeight(''); setService(''); setBranch('northgate'); setVet('any');
    setAddOns([]); setDate(''); setTime(''); setOwnerName(''); setOwnerEmail('');
    setOwnerPhone(''); setNotes(''); setFiles([]); setReminders(true); setPolicy(false);
    setErrors({});
    setFormError('');
  };

  return (
    <SitePage>
      {/* 1 ── Hero ───────────────────────────────────────────────── */}
      <PageHero
        eyebrow="Book online"
        title="Reserve a time in under a minute"
        subtitle="Tell us about your pet and when suits you. Reception checks the clinical diary and texts you a confirmed slot — usually within two working hours."
        breadcrumb="Book an appointment"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { icon: ShieldCheck, text: 'No deposit required' },
            { icon: Timer, text: 'Free cancellation up to 12 hours' },
            { icon: Bell, text: 'Confirmation by SMS and email' },
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

      {/* 2 ── Booking form ──────────────────────────────────────── */}
      <Section id="booking-form" alt>
        <SectionHeading
          eyebrow="Appointment request"
          title="Four short steps, one minute"
          subtitle="Everything except your pet’s name, the service and your contact details is optional — but the more you tell us, the better we can prepare the room before you arrive."
        />

        <div className="max-w-5xl mx-auto rounded-2xl border border-line bg-white shadow-soft overflow-hidden">
          {bookingRef ? (
            /* ── Confirmation panel ─────────────────────────────── */
            <div className="p-6 md:p-10 animate-fadeIn">
              <div className="text-center">
                <span className="inline-flex w-16 h-16 rounded-2xl bg-lilac text-plum items-center justify-center mb-5">
                  <CircleCheckBig className="w-8 h-8" />
                </span>
                <h3 className="text-2xl md:text-[30px] font-bold text-ink tracking-tight">
                  Request received — we are on it
                </h3>
                <p className="mt-3.5 text-[15px] text-ink/60 leading-relaxed max-w-xl mx-auto">
                  Thanks {ownerName.split(' ')[0]}. Nothing is confirmed until you get our text, but your slot is held
                  provisionally while reception checks the diary.
                </p>
                <div className="mt-6 inline-flex items-center gap-2.5 rounded-xl border border-line bg-canvas px-5 py-3">
                  <Hash className="w-4 h-4 text-plum" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">Booking reference</span>
                  <span className="text-sm font-bold text-plum tabular-nums">{bookingRef}</span>
                </div>
              </div>

              <div className="mt-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {summary.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className="rounded-xl border border-line bg-canvas p-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2">
                        <Icon className="w-3 h-3" /> {row.label}
                      </span>
                      <p className="text-[13px] font-semibold text-ink leading-snug">{row.value}</p>
                    </div>
                  );
                })}
              </div>

              {addOns.length > 0 && (
                <div className="mt-4 rounded-xl border border-line bg-white p-4">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2.5">
                    <Sparkles className="w-3 h-3" /> Add-ons requested
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {ADD_ONS.filter((a) => addOns.includes(a.value)).map((a) => (
                      <span key={a.value} className="inline-flex items-center gap-1.5 rounded-full bg-lilac text-plum px-3 py-1 text-[11px] font-semibold">
                        <Check className="w-3 h-3" /> {a.label} {a.price === 0 ? '(free)' : `(+$${a.price})`}
                      </span>
                    ))}
                    <span className="text-[12px] font-bold text-ink/60 ml-1 tabular-nums">
                      Estimated add-on total ${addOnTotal}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-8 rounded-2xl bg-grape text-white p-6 md:p-7 relative overflow-hidden">
                <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-iris/30 blur-3xl" />
                <div className="relative">
                  <h4 className="text-[15px] font-bold mb-4">What happens next</h4>
                  <ol className="space-y-3">
                    {[
                      'Reception checks the diary and texts you a confirmed date and time within 2 working hours.',
                      reminders
                        ? 'You will get an SMS and email reminder 24 hours before the appointment.'
                        : 'You opted out of reminders — add the slot to your calendar when the confirmation text arrives.',
                      clientType === 'new'
                        ? 'A short registration form lands in your inbox — fill it in before you arrive to save ten minutes at the desk.'
                        : 'Your file is already with us, so there is nothing to fill in beforehand.',
                      files.length > 0
                        ? `We have your ${files.length} attached file${files.length > 1 ? 's' : ''} and the vet will read them before the consult.`
                        : `If you find old records before the visit, email them to records@northgatevet.com quoting your reference.`,
                      'Arrive 10 minutes early so we can weigh your pet and settle them in.',
                    ].map((stepText, i) => (
                      <li key={i} className="flex items-start gap-3 text-[13px] text-white/75 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-white/15 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {stepText}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={resetForm}>Book another appointment</Button>
                <CtaLink href={SITE_ROUTES.contact} variant="primary">Something to add? Contact us</CtaLink>
              </div>
            </div>
          ) : (
            /* ── The form ───────────────────────────────────────── */
            <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              {/* Step header row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-line bg-canvas">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex items-center gap-3 px-5 py-4 border-r border-line last:border-r-0">
                    <span className="w-8 h-8 rounded-lg bg-plum text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink leading-tight truncate">{s.title}</span>
                      <span className="block text-[11px] text-ink/45 leading-tight truncate">{s.hint}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-6 md:p-8">
                {planLabel && (
                  <div className="mb-7 rounded-xl border border-plum/30 bg-lilac/50 p-5 flex flex-col sm:flex-row sm:items-center gap-3.5 animate-fadeIn">
                    <span className="w-11 h-11 rounded-xl bg-plum text-white flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5" />
                    </span>
                    <div className="flex-1">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-plum">
                        Joining a wellness plan
                      </span>
                      <p className="mt-1 text-[13px] text-ink/70 leading-relaxed">
                        <span className="font-semibold text-ink">{planLabel}</span>
                        {billingLabel && <> · {billingLabel.toLowerCase()}</>} — we will set this up at your first
                        visit and your plan discount applies from that appointment onwards.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPlan(''); setBilling(''); }}
                    >
                      Not this plan
                    </Button>
                  </div>
                )}

                {formError && (
                  <div className="mb-7 rounded-xl border-2 border-coral/40 bg-coral/5 p-5 flex items-start gap-2.5 animate-fadeIn">
                    <TriangleAlert className="w-4 h-4 text-coral mt-0.5 shrink-0" />
                    <p className="text-[13px] text-ink/70 leading-relaxed">{formError}</p>
                  </div>
                )}

                {errorList.length > 0 && (
                  <div className="mb-7 rounded-xl border-2 border-coral/40 bg-coral/5 p-5 animate-fadeIn">
                    <span className="flex items-center gap-2 text-[13px] font-bold text-ink mb-2.5">
                      <TriangleAlert className="w-4 h-4 text-coral" />
                      {errorList.length} thing{errorList.length > 1 ? 's' : ''} still need
                      {errorList.length > 1 ? '' : 's'} your attention
                    </span>
                    <ul className="space-y-1.5">
                      {errorList.map((msg) => (
                        <li key={msg} className="flex items-start gap-2 text-[12px] text-ink/70 leading-relaxed">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── Step 1 ─────────────────────────────────────── */}
                <StepBlock n="1" title="About your pet" icon={PawPrint}>
                  <Field
                    label="Which kind of patient are we seeing?"
                    hint="This decides who we book you with and which waiting area you use"
                    error={errors.petType}
                    required
                  >
                    <RadioGroup
                      card
                      direction="horizontal"
                      value={petType}
                      onChange={(val) => setPetType(val)}
                      options={PET_TYPES}
                    />
                  </Field>

                  <Field
                    label="Have we met before?"
                    hint="New clients get a registration form by email — it takes two minutes"
                  >
                    <RadioGroup value={clientType} onChange={(val) => setClientType(val)} options={CLIENT_TYPES} />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Pet's name" hint="Exactly as it appears on their file, if you are registered" error={errors.petName} required>
                      <Input
                        value={petName}
                        onChange={(e) => setPetName(e.target.value)}
                        placeholder="Buddy"
                        icon={PawPrint}
                        error={!!errors.petName}
                        clearable
                      />
                    </Field>
                    <Field label="Breed-size band" hint="Helps us allocate the right room and table">
                      <Select value={sizeBand} onChange={(e) => setSizeBand(e.target.value)}>
                        <option value="">— Select a size band —</option>
                        {SIZE_BANDS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Age in years" hint="Round to the nearest year — under one, just leave it at 0">
                      <NumberInput
                        value={petAge}
                        onChange={(e) => setPetAge(e.target.value)}
                        min={0}
                        max={30}
                        step={1}
                        placeholder="6"
                      />
                    </Field>
                    <Field label="Approximate weight" hint="A rough figure is fine — we will weigh them at check-in">
                      <NumberInput
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        min={0}
                        max={120}
                        step={0.5}
                        suffix="kg"
                        placeholder="28"
                      />
                    </Field>
                  </div>
                </StepBlock>

                {/* ── Step 2 ─────────────────────────────────────── */}
                <StepBlock n="2" title="What you need" icon={Stethoscope}>
                  <Field
                    label="Service needed"
                    hint="Not sure? Choose a wellness exam and we will redirect you if something else fits better"
                    error={errors.service}
                    required
                  >
                    <Select value={service} onChange={(e) => setService(e.target.value)} error={!!errors.service}>
                      <option value="">— Select a service —</option>
                      {SERVICES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Preferred branch" hint="Surgery, emergencies and in-house labs are Northgate only">
                      <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                        {BRANCH_OPTIONS.map((b) => (
                          <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Preferred veterinarian" hint="Asking for a specific vet may add a few days to the wait">
                      <Select value={vet} onChange={(e) => setVet(e.target.value)}>
                        {VETS.map((v) => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <Field
                    label="Add-ons while you are here"
                    hint="Tick anything you would like done in the same visit — it saves a second trip"
                  >
                    <div className="rounded-xl border border-line bg-canvas p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {ADD_ONS.map((a) => (
                          <Checkbox
                            key={a.value}
                            checked={addOns.includes(a.value)}
                            onChange={(e) => toggleAddOn(a.value, e.target.checked)}
                            label={`${a.label} ${a.price === 0 ? '(free)' : `(+$${a.price})`}`}
                            hint={a.hint}
                          />
                        ))}
                      </div>
                      <div className="mt-4 pt-3.5 border-t border-line flex items-center justify-between gap-3">
                        <span className="text-[12px] text-ink/55">
                          {addOns.length === 0
                            ? 'No add-ons selected'
                            : `${addOns.length} add-on${addOns.length > 1 ? 's' : ''} selected`}
                        </span>
                        <span className="text-[13px] font-bold text-plum tabular-nums">
                          Estimated add-on total ${addOnTotal}
                        </span>
                      </div>
                    </div>
                  </Field>
                </StepBlock>

                {/* ── Step 3 ─────────────────────────────────────── */}
                <StepBlock n="3" title="When suits you" icon={CalendarCheck}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field
                      label="Preferred date"
                      hint="Monday to Saturday, today onwards — we hold a few same-day slots back for sick visits"
                      error={errors.date}
                      required
                    >
                      <DatePicker
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        min={today}
                        error={!!errors.date || closedThatDay}
                        placeholder="Pick a date"
                      />
                    </Field>
                    <Field label="Preferred time" hint={hoursHint} error={errors.time} required>
                      <TimeInput
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        step={15}
                        min={fromMinutes(openMin)}
                        max={fromMinutes(lastSlotMin)}
                        disabled={closedThatDay}
                        error={!!errors.time}
                      />
                    </Field>
                  </div>

                  {closedThatDay && (
                    <div className="rounded-xl border-2 border-coral/40 bg-coral/5 p-4 flex items-start gap-2.5">
                      <TriangleAlert className="w-4 h-4 text-coral mt-0.5 shrink-0" />
                      <p className="text-[12px] text-ink/70 leading-relaxed">
                        {date} is a Sunday and both branches are closed. Pick Monday to Saturday — or if your pet
                        cannot wait, call{' '}
                        <a href={telHref(contact.phone)} className="font-semibold text-coral hv-underline">{contact.phone}</a>{' '}
                        and the emergency team will see you today.
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="block text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-2">
                      Or grab a popular slot
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {QUICK_TIMES.map((q) => {
                        /* A quick-pick that is outside the chosen day's hours is
                           disabled rather than silently setting an invalid time. */
                        const available = !date || slotIsOpen(q.value);
                        return (
                          <Button
                            key={q.value}
                            size="sm"
                            variant={time === q.value ? 'primary' : 'outline'}
                            icon={Clock}
                            disabled={!available}
                            onClick={() => setTime(q.value)}
                          >
                            {q.label}
                          </Button>
                        );
                      })}
                      <span className="text-[11px] text-ink/45 ml-1">
                        {date && !closedThatDay
                          ? `Greyed-out slots are outside our ${DAY_NAMES[weekday as number]} hours.`
                          : 'These four are our quietest slots — shortest wait in the waiting room.'}
                      </span>
                    </div>
                  </div>
                </StepBlock>

                {/* ── Step 4 ─────────────────────────────────────── */}
                <StepBlock n="4" title="Your details" icon={User} last>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <Field label="Your full name" hint="The registered owner, or whoever is bringing them in" error={errors.ownerName} required>
                      <Input
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Eleanor Hayes"
                        icon={User}
                        error={!!errors.ownerName}
                      />
                    </Field>
                    <Field label="Email address" hint="Written confirmation and records go here" error={errors.ownerEmail} required>
                      <Input
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="you@example.com"
                        icon={Mail}
                        error={!!errors.ownerEmail}
                      />
                    </Field>
                    <Field label="Mobile number" hint="We confirm the slot by SMS, so this one matters" error={errors.ownerPhone} required>
                      <Input
                        type="tel"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+1 415 555 0132"
                        icon={Phone}
                        error={!!errors.ownerPhone}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Symptoms or anything we should know"
                    hint="When it started, what changed, appetite and toilet habits, and how your pet behaves at the vet"
                  >
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      maxLength={600}
                      placeholder="Limping on the back left leg since Saturday, worse after exercise. Still eating and bright. Hates having his paws touched, so a muzzle-trained approach may help."
                    />
                  </Field>

                  <Field
                    label="Upload previous records or a photo of the problem"
                    hint="Images or PDFs, up to 10 MB each — a clear photo of a lump or limp is genuinely useful"
                  >
                    <FileInput
                      accept="image/*,.pdf"
                      multiple
                      label="Click to upload or drag and drop"
                      hint="PNG, JPG or PDF up to 10 MB"
                      onFiles={(fileList) =>
                        setFiles(Array.from(fileList).map((f) => ({ name: f.name, size: f.size })))
                      }
                    />
                  </Field>

                  {files.length > 0 && (
                    <div className="rounded-xl border border-line bg-canvas p-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2.5">
                        <FileText className="w-3 h-3" /> Attached to this request
                      </span>
                      <ul className="flex flex-wrap items-center gap-2">
                        {files.map((f) => (
                          <li key={f.name} className="inline-flex items-center gap-1.5 rounded-full bg-lilac text-plum px-3 py-1 text-[11px] font-semibold">
                            <Check className="w-3 h-3" /> {f.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Field label="Reminders" hint="Two messages: one when we confirm, one the day before">
                    <div className="rounded-xl border border-line bg-canvas p-4">
                      <Switch
                        checked={reminders}
                        onChange={(next) => setReminders(next)}
                        label="Send me SMS and email reminders"
                        hint="You can reply STOP to any message to turn these off later"
                      />
                    </div>
                  </Field>

                  <Field label="Cancellation policy" error={errors.policy} required>
                    <div className={`rounded-xl border p-4 transition-colors ${errors.policy ? 'border-coral bg-coral/5' : 'border-line bg-canvas'}`}>
                      <Checkbox
                        checked={policy}
                        onChange={(e) => setPolicy(e.target.checked)}
                        label="I agree to the cancellation policy."
                        hint="Free to cancel or move up to 12 hours before. Inside 12 hours there is a $25 fee, and $40 for a missed appointment."
                      />
                    </div>
                  </Field>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                    <Button variant="primary" size="lg" icon={CalendarCheck} onClick={submit}>
                      Request this appointment
                    </Button>
                    <p className="text-[12px] text-ink/45 leading-relaxed">
                      Nothing is charged now. Reception confirms by SMS within 2 working hours, or calls you if we need
                      to ask something first.
                    </p>
                  </div>
                </StepBlock>
              </div>
              </form>
          )}
        </div>
      </Section>

      {/* 3 ── How booking works ─────────────────────────────────── */}
      <Section id="how-it-works">
        <SectionHeading
          eyebrow="How booking works"
          title="Three steps, no phone tag"
          subtitle="An online request is not an instant booking — a human checks it against the clinical diary, which is why the slot you get actually works."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="hv-card group relative rounded-2xl border border-line bg-white p-6 md:p-7 hover:border-plum/25">
                <span className="absolute top-5 right-6 text-[52px] font-bold text-lilac leading-none select-none">{s.n}</span>
                <span className="hv-tile relative w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="relative text-[15px] font-semibold text-ink mb-2">{s.title}</h3>
                <p className="relative text-[13px] text-ink/55 leading-relaxed">{s.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 4 ── What to bring ─────────────────────────────────────── */}
      <Section id="what-to-bring" alt>
        <SectionHeading
          eyebrow="What to bring"
          title="Six things that make the visit twice as useful"
          subtitle="None of it is compulsory. All of it saves time and means the vet spends the consult examining your pet rather than reconstructing their history."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {WHAT_TO_BRING.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="hv-card group rounded-2xl border border-line bg-white p-6 hover:border-plum/25">
                <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-[14px] font-semibold text-ink mb-2 leading-snug">{item.title}</h3>
                <p className="text-[13px] text-ink/55 leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 5 ── Appointment types & durations ─────────────────────── */}
      <Section id="appointment-types">
        <SectionHeading
          eyebrow="Appointment types"
          title="How long to set aside"
          subtitle="Durations are the time with the clinician — add ten minutes for check-in and a few more at the desk afterwards."
        />
        <div className="rounded-2xl border border-line bg-white shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="bg-canvas border-b border-line">
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Appointment</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Duration</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Fasting</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wide text-ink/45">Notes</th>
                </tr>
              </thead>
              <tbody>
                {APPOINTMENT_TYPES.map((row) => (
                  <tr key={row.type} className="border-b border-line last:border-0 hover:bg-lilac/30 transition-colors duration-150">
                    <td className="px-5 py-4 text-[13px] font-semibold text-ink">{row.type}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-plum tabular-nums">
                        <Clock className="w-3.5 h-3.5" /> {row.duration}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold
                          ${row.fasting === 'Yes' ? 'bg-coral/15 text-coral'
                            : row.fasting === 'Sometimes' ? 'bg-amber-100 text-amber-700'
                            : 'bg-lilac text-plum'}`}
                      >
                        {row.fasting}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-ink/60">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-line bg-white p-5 flex items-start gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center shrink-0">
              <Utensils className="w-5 h-5" />
            </span>
            <p className="text-[13px] text-ink/60 leading-relaxed">
              <span className="font-semibold text-ink">Fasting means no food from 22:00</span> the night before —
              water stays available. It applies to surgery consultations and any sick visit where we may need bloods.
              Puppies, kittens, rabbits and birds should <span className="font-semibold text-ink">never</span> be
              fasted without us telling you to.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 flex items-start gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
              <Baby className="w-5 h-5" />
            </span>
            <p className="text-[13px] text-ink/60 leading-relaxed">
              <span className="font-semibold text-ink">First puppy and kitten visits run 40 minutes</span> on purpose.
              We cover vaccines, microchipping, worming, neutering timelines, food, insurance and socialisation — and we
              would rather do it once, properly.
            </p>
          </div>
        </div>
      </Section>

      {/* 6 ── Cancellation & no-show policy ─────────────────────── */}
      <Section id="cancellation" alt>
        <SectionHeading
          eyebrow="Cancellation policy"
          title="Life happens — just tell us early if you can"
          subtitle="Our fees exist because an empty 30-minute slot is a sick pet who could not be seen that day. They are not there to catch anyone out."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { icon: ShieldCheck, head: 'More than 12 hours before', body: 'Cancel or move it for free, as many times as you need. Reply to the confirmation text, use the client portal, or call reception.', tone: 'plum' },
              { icon: Timer, head: 'Inside 12 hours', body: 'A $25 late-cancellation fee applies, because the slot rarely gets filled at that notice. It is waived for genuine emergencies — just say so.', tone: 'plum' },
              { icon: TriangleAlert, head: 'Missed appointment', body: 'A $40 no-show fee is added to your account. We always text first to check everything is alright before charging anything.', tone: 'coral' },
              { icon: Clock, head: 'Running late', body: 'You have a 10-minute grace period. After that we may need to release the slot to keep the rest of the day on time — but call us and we will try to squeeze you in later.', tone: 'plum' },
            ].map((c) => {
              const Icon = c.icon;
              const coral = c.tone === 'coral';
              return (
                <div
                  key={c.head}
                  className={`hv-card group rounded-2xl border bg-white p-6 ${coral ? 'border-coral/35 hover:border-coral' : 'border-line hover:border-plum/25'}`}
                >
                  <span className={`hv-tile w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${coral ? 'bg-coral/15 text-coral' : 'bg-lilac text-plum'}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="text-[15px] font-semibold text-ink mb-2">{c.head}</h3>
                  <p className="text-[13px] text-ink/55 leading-relaxed">{c.body}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 md:p-7 shadow-soft">
            <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
              <ListChecks className="w-5 h-5" />
            </span>
            <h3 className="text-[15px] font-semibold text-ink mb-3">How to reschedule</h3>
            <ol className="space-y-3">
              {[
                'Reply MOVE to your confirmation text and reception will call you back with options.',
                'Or log in to the client portal and pick a new slot yourself, any time of day.',
                'Or call +1 415 555 0100 and press 1 — quickest if you need something this week.',
              ].map((t, i) => (
                <li key={t} className="flex items-start gap-3 text-[13px] text-ink/65 leading-relaxed">
                  <span className="w-5 h-5 rounded-full bg-lilac text-plum text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-5 pt-4 border-t border-line text-[12px] text-ink/45 leading-relaxed">
              Hospitalised, recovering or end-of-life patients are never charged a cancellation fee. If money is the
              reason you are thinking about not coming, talk to us — we would rather find a payment plan than lose track
              of a pet who needs us.
            </p>
            <Link
              href={SITE_ROUTES.contact}
              className="hv-slide-parent mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-plum hover:text-grape transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" /> Talk to reception
              <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </Section>

      {/* 7 ── New to Northgate? ─────────────────────────────────── */}
      <Section id="new-clients">
        <SectionHeading
          eyebrow="New to Northgate?"
          title="Your first visit, start to finish"
          subtitle="Around a quarter of our bookings each month are from families transferring in. Here is exactly how it goes."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
          <div className="rounded-2xl overflow-hidden border border-line shadow-soft">
            <img
              src="https://images.pexels.com/photos/6235285/pexels-photo-6235285.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="A veterinarian examining a dog during a first consultation at Northgate Animal Hospital"
              className="w-full h-[300px] md:h-[420px] object-cover"
            />
          </div>

          <div className="space-y-5">
            {[
              {
                icon: Stethoscope,
                title: 'What a first visit includes',
                body: 'A full 30-minute nose-to-tail exam: weight, body condition score, heart and chest, eyes, ears, teeth, joints, skin and abdomen. You leave with a written summary and a plan — not a vague “he seems fine”.',
              },
              {
                icon: FileText,
                title: 'Transferring records from your previous practice',
                body: 'We request them for you with your written consent — you do not have to chase anyone. Give us the practice name at booking and we usually have the history within two business days.',
              },
              {
                icon: ClipboardList,
                title: 'The registration form',
                body: 'Arrives by email as soon as reception confirms your slot. Name, address, your pet’s details, insurance if you have it, and your consent for the records request. Two minutes on a phone.',
              },
              {
                icon: Syringe,
                title: 'Vaccines and microchips',
                body: 'Bring whatever vaccination record you have. If anything has lapsed we will tell you honestly whether it needs restarting or just a booster, and we scan every new patient’s microchip free of charge.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4">
                  <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink mb-1.5">{item.title}</h3>
                    <p className="text-[13px] text-ink/55 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl bg-grape text-white p-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-iris/30 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-coral/20 text-coral flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold mb-1.5">
                    Your first exam includes a free 15-minute nutrition review
                  </h3>
                  <p className="text-[13px] text-white/65 leading-relaxed">
                    A nurse goes through what your pet actually eats — brand, portions, treats, table scraps — and gives
                    you a feeding plan matched to their weight and life stage. No product pitch, and nothing to pay.
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80">
                    <Sparkles className="w-3.5 h-3.5 text-coral" /> Offered to every new patient, automatically
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 8 ── Not a routine visit? ──────────────────────────────── */}
      <Section id="other-routes" alt>
        <SectionHeading
          eyebrow="Not a routine visit?"
          title="Two things you should not book online"
          subtitle="Online requests are checked by a human within two working hours — which is far too slow for an emergency, and more than you need for a quick question."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border-2 border-coral/40 bg-coral/5 p-6 md:p-8">
            <span className="w-12 h-12 rounded-xl bg-coral/15 text-coral flex items-center justify-center mb-5">
              <Siren className="w-6 h-6" />
            </span>
            <h3 className="text-xl font-bold text-ink tracking-tight mb-2.5">This is an emergency</h3>
            <p className="text-[13px] text-ink/65 leading-relaxed mb-4">
              Do not book online and do not wait for a reply. Phone us, tell the nurse what has happened, and start
              driving to Northgate — we will have a team waiting at the door.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                'Collapse, unresponsiveness or pale gums',
                'Struggling to breathe, choking, or constant coughing',
                'Suspected poisoning — chocolate, grapes, xylitol, rodenticide, antifreeze',
                'A seizure lasting more than two minutes, or repeated seizures',
                'Straining to urinate, especially in male cats',
                'A swollen, hard abdomen with retching — possible bloat',
                'Road traffic accident, major bleeding, or a deep bite wound',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="tel:+14155550100"
              className="hv-lift flex items-center justify-center gap-2 h-12 rounded-xl bg-coral text-white text-sm font-bold shadow-sm hover:shadow-lift"
            >
              <Phone className="w-4 h-4" /> +1 415 555 0100
            </a>
            <Link
              href={SITE_ROUTES.emergency}
              className="hv-slide-parent mt-3.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-coral hover:text-ink transition-colors"
            >
              <Siren className="w-3.5 h-3.5" /> Read our emergency guidance
              <ChevronRight className="hv-slide w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft">
            <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-5">
              <CircleHelp className="w-6 h-6" />
            </span>
            <h3 className="text-xl font-bold text-ink tracking-tight mb-2.5">I just need some advice</h3>
            <p className="text-[13px] text-ink/65 leading-relaxed mb-4">
              You do not need an appointment — or a credit card — to ask a question. Our nurses offer a free call-back
              and will tell you honestly whether this needs a vet, a nurse clinic, or just watching for a day.
            </p>
            <ul className="space-y-2 mb-6">
              {[
                '“Is this lump worth worrying about?”',
                '“He has been off his food since yesterday — wait or come in?”',
                '“Which flea product is right for a 4 kg cat?”',
                '“Is my puppy’s weight on track for her breed?”',
                '“Can I split this tablet, and does it go with food?”',
                '“What does this post-op wound normally look like on day three?”',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-ink/65 leading-relaxed">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-iris shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-line bg-canvas p-4 mb-6">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-1.5">
                <Headphones className="w-3 h-3" /> Free nurse call-back
              </span>
              <p className="text-[13px] text-ink/60 leading-relaxed">
                Ask reception for a nurse call-back and you will hear from someone the same working day, usually between
                14:00 and 16:00 when the consult rooms are quieter.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <CtaLink href={SITE_ROUTES.contact} variant="primary">Request a call-back</CtaLink>
              <CtaLink href={SITE_ROUTES.faq} variant="outline">Browse the FAQ</CtaLink>
            </div>
          </div>
        </div>
      </Section>

      {/* 9 ── CTA band ──────────────────────────────────────────── */}
      <CtaBand
        title="Your pet’s next appointment is one minute away"
        subtitle="No deposit, free cancellation up to 12 hours before, and a confirmation text within two working hours."
        primaryLabel="Request an appointment"
        primaryHref="#booking-form"
        secondaryLabel="Call +1 415 555 0100"
        secondaryHref={SITE_ROUTES.contact}
      />
    </SitePage>
  );
}

/* ---------------------------------------------------------------- */
/* Local helper — a labelled step group inside the booking card      */
/* ---------------------------------------------------------------- */

function StepBlock({
  n, title, icon: Icon, children, last,
}: {
  n: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`${last ? '' : 'mb-8 pb-8 border-b border-line'}`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-9 h-9 rounded-xl bg-plum text-white flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-plum leading-tight">
            Step {n}
          </span>
          <h3 className="text-[17px] font-bold text-ink tracking-tight leading-tight">{title}</h3>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
