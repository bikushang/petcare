'use client';

import { useMemo, useState } from 'react';
import {
  ChevronDown, CalendarCheck, Wallet, Syringe, Stethoscope, Hotel, Phone, Mail,
  Headphones, Send, MessageCircleQuestion, CircleHelp, Check, ArrowRight, Clock,
  ShieldCheck, TriangleAlert, LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, SITE_ROUTES, telHref,
} from '../_components/site-chrome';
import { Field, Input, Textarea, SearchInput } from '../../components/form';
import { Button } from '../../components/ui';
import { useCms } from '../../lib/cms';
import { useDB, newId, type SiteMessage } from '../../lib/store';
import { isEmail, nextDocNumber, localDateISO, localTimeHHMM } from '../../lib/helpers';

/* ---------------------------------------------------------------- */
/* Types + data                                                      */
/* ---------------------------------------------------------------- */

type CategoryId = 'appointments' | 'costs' | 'preventive' | 'surgery' | 'boarding';

type Question = { id: string; category: CategoryId; q: string; a: string };

const CATEGORIES: { id: CategoryId; label: string; short: string; icon: LucideIcon; blurb: string }[] = [
  {
    id: 'appointments',
    label: 'Appointments & visits',
    short: 'Appointments',
    icon: CalendarCheck,
    blurb: 'Booking, lead times, same-day sick visits and what to bring with you.',
  },
  {
    id: 'costs',
    label: 'Costs, payment & insurance',
    short: 'Costs & insurance',
    icon: Wallet,
    blurb: 'Written estimates, payment methods, instalments and how we handle claims.',
  },
  {
    id: 'preventive',
    label: 'Vaccinations & preventive care',
    short: 'Preventive care',
    icon: Syringe,
    blurb: 'Puppy and kitten courses, boosters, titres and year-round parasite cover.',
  },
  {
    id: 'surgery',
    label: 'Surgery & anaesthesia',
    short: 'Surgery',
    icon: Stethoscope,
    blurb: 'Anaesthetic safety, fasting, pre-op bloods, recovery and pain relief.',
  },
  {
    id: 'boarding',
    label: 'Boarding, grooming & emergencies',
    short: 'Boarding & emergencies',
    icon: Hotel,
    blurb: 'Stay requirements, medication, out-of-hours cover, exotics and referrals.',
  },
];

const CATEGORY_LABEL: Record<CategoryId, string> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c.short }),
  {} as Record<CategoryId, string>,
);

const QUESTIONS: Question[] = [
  /* ── Appointments & visits ──────────────────────────────────── */
  {
    id: 'ap-1',
    category: 'appointments',
    q: 'How do I book an appointment?',
    a: 'There are three ways: the online booking page, the client portal if you already have an account with us, or by calling +1 415 555 0100 between 8:00 and 18:00 on weekdays. Online booking shows live availability for both the Northgate and Riverside branches, so you see every open slot rather than being offered the first one we happen to find. You will get a confirmation email within a minute and a text reminder 24 hours before the visit.',
  },
  {
    id: 'ap-2',
    category: 'appointments',
    q: 'How far ahead should I book?',
    a: 'Routine wellness exams and vaccinations are usually available within three to five working days, and we release slots eight weeks in advance. Saturday mornings and grooming are the exception — those tend to fill about three weeks ahead, so book early if weekdays are difficult for you. Dental procedures and elective surgery are scheduled around theatre availability, normally two to three weeks out.',
  },
  {
    id: 'ap-3',
    category: 'appointments',
    q: 'Do you see same-day sick visits?',
    a: 'Yes. We hold back a block of urgent slots at both branches every morning and every afternoon specifically for pets who became unwell overnight or during the day. Call as early as you can — reception triages over the phone and will tell you whether to come in now, come in later today, or go straight to the emergency service. We have never turned away a genuinely sick animal for want of a slot.',
  },
  {
    id: 'ap-4',
    category: 'appointments',
    q: 'What should I bring to a first visit?',
    a: 'Bring any vaccination records, the name of your previous practice, and a list of current medications including flea and worm products with their brand names. If your pet has had recent bloodwork or imaging elsewhere we can request it, but bringing it with you saves repeating tests. A fresh stool sample is useful for puppies and kittens, and please bring cats in a hard-sided carrier rather than on a lead or in your arms.',
  },
  {
    id: 'ap-5',
    category: 'appointments',
    q: 'What happens if I am running late, and what is your cancellation window?',
    a: 'Call us. If you are under ten minutes behind we will almost always still see you, and if you are later than that reception will either slide you into a gap further down the list or rebook you the same week. We ask for 24 hours notice to cancel or move an appointment so the slot can go to someone on the waiting list. There is no charge for a late cancellation on a routine consult, although we do ask for a deposit to rebook a dental or surgical slot after two missed appointments.',
  },
  {
    id: 'ap-6',
    category: 'appointments',
    q: 'Can I bring more than one pet, and can I stay in the room during the exam?',
    a: 'You are very welcome to bring more than one pet, but please book a slot per animal so the vet has proper time for each — a double consult runs 40 minutes rather than 20. Owners can stay for the whole consultation and we would much rather you did: your pet settles faster and you hear everything first-hand instead of second-hand. The only times we ask you to step out are for radiographs, where there are radiation safety rules, and occasionally for a blood draw from a very wriggly patient.',
  },

  /* ── Costs, payment & insurance ─────────────────────────────── */
  {
    id: 'co-1',
    category: 'costs',
    q: 'Will I get an estimate before any treatment?',
    a: 'Always, and in writing. Anything beyond a standard consultation gets an itemised estimate with a low and a high figure, which you sign before we begin, so you can see the realistic range rather than a single optimistic number. If we find something mid-procedure that changes the plan, we stop, call you, and get your agreement before going further. Our current fee ranges for common procedures are published on the pricing page.',
  },
  {
    id: 'co-2',
    category: 'costs',
    q: 'What payment methods do you accept?',
    a: 'Cash, all major credit and debit cards, Apple Pay and Google Pay, and bank transfer for balances over $2,000 arranged in advance. Payment is due at the end of the visit, which is standard for veterinary practices in California. You can also store a card in the client portal and settle invoices from there if you would rather not pay at the front desk.',
  },
  {
    id: 'co-3',
    category: 'costs',
    q: 'Do you offer instalment plans?',
    a: 'For treatment plans over $800 we can split the balance across three or six monthly payments with no interest, arranged directly through the practice. We also accept CareCredit and Scratchpay, both of which give an instant decision and cover longer terms. Please ask our practice manager before the procedure rather than at the till — it is far easier to set up in advance than retrospectively.',
  },
  {
    id: 'co-4',
    category: 'costs',
    q: 'Do you bill my pet insurance directly?',
    a: 'For most major insurers we can submit a direct claim, so on the day you only pay your deductible and co-insurance, provided the policy is active and the claim has been pre-authorised. Pre-authorisation takes two to five working days, so tell us when you book if you want to go that route. Where direct billing is not available we give you a fully itemised invoice plus a claim form with the clinical history section completed, and we do not charge for filling it in.',
  },
  {
    id: 'co-5',
    category: 'costs',
    q: 'Are your wellness plans the same thing as insurance?',
    a: 'No, and the difference matters. Our wellness plans spread the cost of predictable, planned care — annual exams, vaccinations, parasite prevention, routine blood screening — across twelve monthly payments at a discount to paying item by item. Insurance covers the unpredictable: accidents, illness and surgery. Most of the clients who budget well have both, because neither one does the other job.',
  },
  {
    id: 'co-6',
    category: 'costs',
    q: 'What if I cannot afford the treatment my pet needs?',
    a: 'Please tell us, early. There is almost always more than one clinically acceptable plan, and we would far rather discuss a staged approach or a lower-cost option than have you leave without treatment at all. We can prioritise the tests that actually change decisions, spread work across several visits, set up instalments, and point you at the Bay Area charitable funds we work with. During 2025 our hardship fund subsidised or wrote off care for 41 pets.',
  },

  /* ── Vaccinations & preventive care ─────────────────────────── */
  {
    id: 'pr-1',
    category: 'preventive',
    q: 'What is the puppy and kitten vaccination schedule?',
    a: 'Puppies start at 6 to 8 weeks with distemper, adenovirus, parvovirus and parainfluenza, repeated every three to four weeks until they are at least 16 weeks old, with rabies given between 12 and 16 weeks. Kittens follow the same rhythm with panleukopenia, herpesvirus and calicivirus, plus feline leukaemia if they will have outdoor access. The final dose has to land after 16 weeks because maternal antibodies can block earlier ones. We book the whole course at the first visit, so you leave with every date in the diary.',
  },
  {
    id: 'pr-2',
    category: 'preventive',
    q: 'What is the difference between core and lifestyle vaccines?',
    a: 'Core vaccines protect against diseases that are severe, widespread or legally required: distemper, parvovirus, adenovirus and rabies in dogs, and panleukopenia, herpesvirus, calicivirus and rabies in cats. Lifestyle vaccines depend on what your pet actually does — leptospirosis for dogs who swim in Bay Area creeks, Bordetella and canine influenza for dogs who board or attend daycare, feline leukaemia for cats who go outside. We talk through your pet real routine at the annual exam rather than giving everything by default.',
  },
  {
    id: 'pr-3',
    category: 'preventive',
    q: 'Are boosters needed every year, and can we use titre testing instead?',
    a: 'Not all of them. Core distemper, parvovirus and adenovirus boosters are given every three years in adult dogs, in line with AAHA guidance, while rabies follows California state law and lifestyle vaccines such as Bordetella genuinely do need annual or six-monthly cover. We offer titre testing for distemper, parvovirus and adenovirus, which measures existing antibody levels and can show that a booster is not yet needed. Titres cost a little more than the vaccine itself and are not an accepted substitute for rabies, so they make most sense for pets who have reacted before.',
  },
  {
    id: 'pr-4',
    category: 'preventive',
    q: 'What side effects should I expect after a vaccine?',
    a: 'Mild tiredness, a slightly tender lump at the injection site and a smaller appetite for 24 to 48 hours are all normal and need nothing more than a quiet evening. A small firm swelling can linger for a couple of weeks; call us if it is still there after three. True allergic reactions — facial swelling, vomiting, hives or breathing difficulty — are rare but show up within an hour or two, which is why we ask you to stay local for the rest of the day rather than driving straight to the airport.',
  },
  {
    id: 'pr-5',
    category: 'preventive',
    q: 'Does my pet need parasite prevention all year round?',
    a: 'In the Bay Area, yes. Our winters are mild enough that fleas, ticks and mosquitoes stay active through all twelve months, and heartworm is endemic in California, so a seasonal gap is exactly where an infestation or infection gets in. We recommend year-round flea and tick cover, monthly heartworm prevention, and worming every three months for most adult pets — more often for dogs who scavenge or hunt. Dosing is weight-based, so pop in to use the scales rather than guessing from last year.',
  },
  {
    id: 'pr-6',
    category: 'preventive',
    q: 'My cat never goes outside — does she still need a rabies vaccine?',
    a: 'Yes, for two reasons. California law requires rabies vaccination for dogs and strongly recommends it for cats, and indoor cats escape far more often than owners expect — we see a handful every year who slipped out of a window or a delivery door. Bats also get into Bay Area homes, and a bat indoors is the classic indoor rabies exposure. An unvaccinated cat with a possible exposure faces a long and distressing quarantine, which is a much worse week than a vaccine appointment.',
  },

  /* ── Surgery & anaesthesia ──────────────────────────────────── */
  {
    id: 'su-1',
    category: 'surgery',
    q: 'Is anaesthesia safe for my senior pet?',
    a: 'Age on its own is not a disease, and we anaesthetise 12- and 14-year-olds routinely; what matters is organ function and blood pressure, which is why pre-operative bloodwork is mandatory for every patient over eight. Each one gets an individually calculated drug protocol, a dedicated anaesthesia nurse watching ECG, blood pressure, capnography and temperature, intravenous fluids and active warming. The honest numbers: anaesthetic mortality in healthy dogs and cats sits around 0.05 to 0.1%, rising with pre-existing disease, and we will tell you where your pet sits on that scale before you decide anything.',
  },
  {
    id: 'su-2',
    category: 'surgery',
    q: 'What are the fasting instructions before surgery?',
    a: 'No food after 22:00 the night before, but leave water down until you leave the house in the morning — dehydration is worse for an anaesthetic than a slightly full stomach. Do not fast puppies, kittens, rabbits or guinea pigs on your own initiative; small patients and small herbivores have completely different rules and we will give you written instructions for them. Give morning medications as normal unless we have said otherwise, and tell us if your pet stole breakfast, because we would far rather move the slot than risk aspiration.',
  },
  {
    id: 'su-3',
    category: 'surgery',
    q: 'Why do you require pre-op bloodwork?',
    a: 'It checks the things that change the anaesthetic plan and cannot be found by examination: kidney and liver function, red cell count, platelets and clotting, and blood glucose. Roughly one in twenty apparently healthy patients comes back with a result that makes us adjust drugs, add fluids, or postpone and investigate — which is precisely what we want to know the day before rather than mid-procedure. We run it in-house, so bloods taken first thing are back within the hour and your pet does not wait around.',
  },
  {
    id: 'su-4',
    category: 'surgery',
    q: 'How long is recovery, and when do stitches come out?',
    a: 'For a routine neuter or lump removal, expect lead-only walks and no jumping, stairs or baths for 10 to 14 days. Soft-tissue abdominal surgery is closer to three weeks, and orthopaedic work runs six to twelve with a staged rehabilitation plan we will write out for you. Skin sutures come out at 10 to 14 days at a free post-operative check with one of our nurses, and we use buried absorbable sutures wherever we can so that there is often nothing to remove. The hard part is almost always restraining an animal who feels better long before the tissue has healed.',
  },
  {
    id: 'su-5',
    category: 'surgery',
    q: 'Do you send pain medication home?',
    a: 'Always. Every surgical patient goes home with multi-modal pain relief — usually an anti-inflammatory, often alongside gabapentin or a short course of an opioid for the first few days — dosed by weight with a written schedule and a syringe you can actually read. Never give human painkillers: paracetamol is lethal to cats, and ibuprofen causes gastric ulceration and kidney injury in dogs. If your pet still seems sore on what we sent home, call us rather than doubling the dose.',
  },
  {
    id: 'su-6',
    category: 'surgery',
    q: 'Can I call to check in during the day?',
    a: 'Yes, and we expect you to. We ring every owner once the patient is awake and stable, usually early afternoon, and again before discharge, and you are welcome to call reception at any point for an update in between. If you would rather have a text with a photo, say so at drop-off and the nursing team will send one. Sitting at home with no news is miserable and we have no interest in making you do it.',
  },

  /* ── Boarding, grooming & emergencies ──────────────────────── */
  {
    id: 'bo-1',
    category: 'boarding',
    q: 'What vaccinations do you require for boarding?',
    a: 'Dogs need to be current on core vaccines (distemper, adenovirus, parvovirus) plus rabies and Bordetella; cats need core vaccines plus rabies. Bordetella must have been given at least 14 days before arrival so there is time for immunity to develop, which is what catches people out when they book at short notice. Flea, tick and worm treatment must also be up to date, and we check your records when you book rather than turning anyone away at the door.',
  },
  {
    id: 'bo-2',
    category: 'boarding',
    q: 'Can I bring their own food and bed?',
    a: 'Please do. An abrupt diet change is the single most common cause of an upset stomach during a stay, so bring enough of their normal food for the whole visit plus a spare day, pre-portioned if that is easy. Beds, blankets and a couple of familiar toys make a real difference to how quickly they settle, and anything washable comes home washed. We do ask you to leave anything irreplaceable at home.',
  },
  {
    id: 'bo-3',
    category: 'boarding',
    q: 'Can you give medication during a stay?',
    a: 'Yes, and there is no extra charge for oral medication, insulin injections or eye drops. Bring everything in its original labelled packaging with the dosing schedule, and tell us the tricks that work — hidden in cheese, in a pill pocket, wrapped in a towel on your lap. Because we are a veterinary hospital rather than a kennel, a vet is on site throughout clinic hours, so boarding guests with chronic conditions can be assessed immediately if anything changes.',
  },
  {
    id: 'bo-4',
    category: 'boarding',
    q: 'How do I know if it is a real emergency?',
    a: 'Come in or call straight away for difficulty breathing, collapse, a seizure lasting more than two minutes, a male cat straining in the litter tray, a hard bloated abdomen with unproductive retching, uncontrolled bleeding, suspected poisoning, any eye injury, or pain you cannot settle. If you are not sure, that uncertainty is itself a good reason to call — our triage line is staffed by a nurse or vet and nobody will make you feel foolish. The two we urge people never to wait and see on are a blocked male cat and a retching deep-chested dog, because both are measured in hours, not days.',
  },
  {
    id: 'bo-5',
    category: 'boarding',
    q: 'Are you open overnight?',
    a: 'The Northgate clinic runs Mon–Fri 8:00–18:00 and Sat 9:00–14:00, and is closed on Sundays for routine appointments. Our emergency service, however, is 24/7 on the same number, +1 415 555 0100, with a vet or nurse answering out of hours rather than a machine. Overnight and Sunday emergencies are seen at our Riverside branch where a vet and nurse are on site, your records travel with you between the two, and hospitalised patients are never left unattended overnight.',
  },
  {
    id: 'bo-6',
    category: 'boarding',
    q: 'Do you see exotics, and what happens if my pet needs a referral?',
    a: 'We see rabbits, guinea pigs, rats, ferrets and most small birds and reptiles, and Dr. Patel runs dedicated rabbit and rodent clinics on Tuesdays and Thursdays. For species we do not cover, or for cases that need a specialist — neurology, oncology, advanced orthopaedics, complex cardiology — we refer to the Bay Area referral centres we work with regularly. We send the full history and imaging ahead so the specialist is not starting from scratch, we carry on managing the day-to-day care alongside them, and we do not charge a fee for making the referral.',
  },
];

/** Built from the CMS contact block so /cms edits reach these cards. */
function contactRoutes(phone: string, email: string, hours: string) {
  const openingLine =
    hours
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/closed/i.test(l))
      .join(' and ') || 'our published opening hours';
  return [
    {
      icon: Phone,
      title: 'Call the clinic',
      value: phone,
      body: `Reception answers ${openingLine}. Out of hours the same number reaches our 24/7 emergency vet.`,
      action: 'Call now',
      href: telHref(phone),
    },
    {
      icon: Mail,
      title: 'Email us',
      value: email,
      body: 'Best for records requests, insurance paperwork and non-urgent questions. We reply to everything within one working day.',
      action: 'Send an email',
      href: `mailto:${email}`,
    },
    {
      icon: Headphones,
      title: 'Book a nurse call',
      value: '15-minute phone slot',
      body: 'Free nurse consultations for diet, weight, parasite cover, post-op worries and medication technique. No exam needed.',
      action: 'Book a slot',
      href: SITE_ROUTES.book,
    },
  ];
}

/* ---------------------------------------------------------------- */
/* Local accordion — one open panel at a time                        */
/* ---------------------------------------------------------------- */

function Accordion({
  items, showCategory = false,
}: { items: Question[]; showCategory?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-white divide-y divide-line overflow-hidden shadow-soft">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className={open ? 'bg-lilac/25' : ''}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
              className="w-full flex items-start gap-4 text-left px-5 md:px-7 py-5 transition-colors duration-200 hover:bg-lilac/40 outline-none focus-visible:ring-4 focus-visible:ring-lilac"
            >
              <span className="min-w-0 flex-1">
                {showCategory && (
                  <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-plum">
                    {CATEGORY_LABEL[item.category]}
                  </span>
                )}
                <span className={`block text-[14px] md:text-[15px] font-semibold leading-snug ${open ? 'text-plum' : 'text-ink'}`}>
                  {item.q}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className={`w-5 h-5 shrink-0 mt-0.5 transition-transform duration-300 ${open ? 'rotate-180 text-plum' : 'text-ink/35'}`}
              />
            </button>

            {open && (
              <div className="px-5 md:px-7 pb-6 -mt-1 animate-fadeIn">
                <p className="text-[13.5px] text-ink/65 leading-relaxed max-w-3xl">{item.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function byCategory(id: CategoryId) {
  return QUESTIONS.filter((q) => q.category === id);
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function FaqPage() {
  const { content } = useCms();
  const { db, create } = useDB();
  const contact = content.contact;
  const routes = useMemo(
    () => contactRoutes(contact.phone, contact.email, contact.hours),
    [contact.phone, contact.email, contact.hours],
  );

  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return QUESTIONS.filter(
      (item) =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        CATEGORY_LABEL[item.category].toLowerCase().includes(q),
    );
  }, [query]);

  /* Section 8 — ask us anything */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; question?: string }>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [reference, setReference] = useState('');

  const resetAsk = () => {
    setSent(false);
    setName('');
    setEmail('');
    setQuestion('');
    setErrors({});
    setFormError('');
    setReference('');
  };

  /**
   * Was `setSent(true)` with nothing saved, so the question never reached the
   * nursing team. Now it writes a SiteMessage tagged as an FAQ question.
   */
  const askUs = async () => {
    if (saving) return;

    const next: { name?: string; email?: string; question?: string } = {};
    if (!name.trim()) next.name = 'Please tell us your name.';
    /* The answer goes out by email, so the address has to be usable. */
    if (!email.trim()) next.email = 'We need an email address to send the answer to.';
    else if (!isEmail(email)) next.email = 'That email address does not look right.';
    if (!question.trim()) next.question = 'Please type your question so we know what to answer.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('');
      return;
    }

    const record: SiteMessage = {
      id: newId('msg'),
      reference: nextDocNumber(`NG-FAQ-${new Date().getFullYear()}-`, db?.messages ?? [], 1, 4),
      source: 'FAQ question',
      name: name.trim(),
      email: email.trim(),
      phone: '',
      petName: '',
      topic: 'FAQ question',
      branch: 'No preference',
      message: question.trim(),
      attachments: [],
      consent: true,
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
      setSent(true);
      setFormError('');
    } catch {
      setFormError(
        `We could not send that just now — please try again, or call ${contact.phone} and ask for the nursing team.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SitePage>
      {/* 1 ── Hero + global search -------------------------------- */}
      <PageHero
        eyebrow="Help centre"
        title="Questions pet owners ask us most"
        subtitle="Thirty answers written by the vets and nurses who actually do the work at Northgate — booking, money, vaccines, anaesthesia, boarding and what counts as an emergency at 2am."
        breadcrumb="FAQ"
      >
        <div className="max-w-xl">
          <div className="rounded-2xl bg-white/10 border border-white/15 p-2 backdrop-blur-sm">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search every question — fasting, titres, instalments…"
            />
          </div>
          <p className="mt-3.5 flex items-center gap-2 text-[12px] text-white/55">
            <CircleHelp className="w-3.5 h-3.5 shrink-0 text-coral" />
            {searching
              ? `${results.length} of ${QUESTIONS.length} questions match “${query.trim()}”`
              : `Searching all ${QUESTIONS.length} questions across ${CATEGORIES.length} topics`}
          </p>
        </div>
      </PageHero>

      {/* 2 ── Jump to a topic / flat search results ---------------- */}
      <Section id="topics">
        {searching ? (
          <>
            <SectionHeading
              eyebrow="Search results"
              title={`${results.length} ${results.length === 1 ? 'answer' : 'answers'} for “${query.trim()}”`}
              subtitle="Results come from every topic at once. Clear the search box to go back to browsing by category."
            />

            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-canvas py-16 px-6 flex flex-col items-center text-center">
                <span className="w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <MessageCircleQuestion className="w-7 h-7" />
                </span>
                <h3 className="text-base font-semibold text-ink">Nothing matches that yet</h3>
                <p className="mt-2 text-[13px] text-ink/55 max-w-sm leading-relaxed">
                  We have no published answer containing “{query.trim()}”. Ask us directly and we will reply
                  within one working day — and add it to this page if other owners are wondering too.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="soft" onClick={() => setQuery('')}>
                    Clear search
                  </Button>
                  <CtaLink href="#ask-us" variant="outline" icon={Send}>
                    Ask us anything
                  </CtaLink>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl">
                <Accordion items={results} showCategory />
              </div>
            )}
          </>
        ) : (
          <>
            <SectionHeading
              eyebrow="Jump to a topic"
              title="Five topics, thirty answers"
              subtitle="Pick the area you need. Every answer was written or reviewed by one of our veterinarians, and we update them whenever our protocols or California regulations change."
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {CATEGORIES.map((c) => {
                const count = byCategory(c.id).length;
                return (
                  <a
                    key={c.id}
                    href={`#${c.id}`}
                    className="hv-card group block rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
                  >
                    <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                      <c.icon className="w-6 h-6" />
                    </span>
                    <h3 className="text-[15px] font-semibold text-ink mb-2">{c.label}</h3>
                    <p className="text-[13px] text-ink/55 leading-relaxed">{c.blurb}</p>
                    <span className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-lilac text-plum text-[11px] font-bold tabular-nums">
                        {count} questions
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-plum">
                        Read <ArrowRight className="hv-slide w-3.5 h-3.5" />
                      </span>
                    </span>
                  </a>
                );
              })}

              <div className="rounded-2xl border border-line bg-grape text-white p-6 flex flex-col">
                <span className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-4">
                  <MessageCircleQuestion className="w-6 h-6" />
                </span>
                <h3 className="text-[15px] font-semibold mb-2">Not covered here?</h3>
                <p className="text-[13px] text-white/65 leading-relaxed flex-1">
                  Send the question to our nursing team. We answer within one working day and add the common
                  ones to this page.
                </p>
                <div className="mt-5">
                  <CtaLink href="#ask-us" variant="white" icon={Send} className="h-10 px-4 text-[13px]">
                    Ask us anything
                  </CtaLink>
                </div>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* 3 ── Appointments & visits ------------------------------- */}
      {!searching && (
        <Section id="appointments" alt>
          <SectionHeading
            eyebrow="Topic 1 of 5"
            title="Appointments & visits"
            subtitle="How booking works at both branches, how much notice we need, and what to have with you on the day."
          />
          <div className="max-w-4xl mx-auto">
            <Accordion items={byCategory('appointments')} />
          </div>
        </Section>
      )}

      {/* 4 ── Costs, payment & insurance -------------------------- */}
      {!searching && (
        <Section id="costs">
          <SectionHeading
            eyebrow="Topic 2 of 5"
            title="Costs, payment & insurance"
            subtitle="Transparent pricing is one of the three things we built this practice on, so none of this is vague on purpose."
          />
          <div className="max-w-4xl mx-auto">
            <Accordion items={byCategory('costs')} />
          </div>
          <div className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center gap-3">
            <CtaLink href={SITE_ROUTES.pricing} variant="outline" icon={Wallet}>
              See our published fee ranges
            </CtaLink>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink/50">
              <ShieldCheck className="w-3.5 h-3.5 text-plum" /> Every estimate is itemised and signed before we start
            </span>
          </div>
        </Section>
      )}

      {/* 5 ── Vaccinations & preventive care ---------------------- */}
      {!searching && (
        <Section id="preventive" alt>
          <SectionHeading
            eyebrow="Topic 3 of 5"
            title="Vaccinations & preventive care"
            subtitle="Schedules, boosters, titre testing and why Bay Area parasite cover does not get a winter break."
          />
          <div className="max-w-4xl mx-auto">
            <Accordion items={byCategory('preventive')} />
          </div>
        </Section>
      )}

      {/* 6 ── Surgery & anaesthesia ------------------------------- */}
      {!searching && (
        <Section id="surgery">
          <SectionHeading
            eyebrow="Topic 4 of 5"
            title="Surgery & anaesthesia"
            subtitle="The questions owners lie awake worrying about the night before a procedure, answered with real numbers."
          />
          <div className="max-w-4xl mx-auto">
            <Accordion items={byCategory('surgery')} />
          </div>
          <div className="max-w-4xl mx-auto mt-6 rounded-2xl border border-line bg-canvas p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </span>
            <p className="text-[13px] text-ink/60 leading-relaxed flex-1">
              Surgical admissions are between 8:00 and 8:30, discharge is usually between 16:00 and 17:30, and
              we call you as soon as your pet is awake. Pre-op bloods can be run the day before so you are not
              waiting on results on the morning itself.
            </p>
          </div>
        </Section>
      )}

      {/* 7 ── Boarding, grooming & emergencies ------------------- */}
      {!searching && (
        <Section id="boarding" alt>
          <SectionHeading
            eyebrow="Topic 5 of 5"
            title="Boarding, grooming & emergencies"
            subtitle="Stay requirements, medication during a stay, out-of-hours cover, exotic species and how referrals work."
          />
          <div className="max-w-4xl mx-auto">
            <Accordion items={byCategory('boarding')} />
          </div>
          <div className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center gap-3">
            <CtaLink href={SITE_ROUTES.emergency} variant="primary">
              Emergency care, 24/7
            </CtaLink>
            <CtaLink href={SITE_ROUTES.services} variant="outline">
              Boarding and grooming details
            </CtaLink>
          </div>
        </Section>
      )}

      {/* 8 ── Still need help ------------------------------------ */}
      <Section id="ask-us">
        <SectionHeading
          eyebrow="Still need help"
          title="Three ways to reach a real person"
          subtitle="Nothing on this page replaces a conversation. Reception, the nursing team and the duty vet are all reachable, and nobody is going to rush you off the phone."
        />

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-2 space-y-4">
            {routes.map((r) => (
              <a
                key={r.title}
                href={r.href}
                className="hv-card group block rounded-2xl border border-line bg-white p-5 hover:border-plum/25"
              >
                <div className="flex items-start gap-3.5">
                  <span className="hv-tile w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                    <r.icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-ink">{r.title}</h3>
                    <p className="text-[13px] font-medium text-plum mt-0.5 truncate">{r.value}</p>
                    <p className="mt-2 text-[12px] text-ink/55 leading-relaxed">{r.body}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-plum">
                      {r.action} <ArrowRight className="hv-slide w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="lg:col-span-3">
            {sent ? (
              <div className="rounded-2xl border border-line bg-white p-8 md:p-10 shadow-soft text-center animate-popIn">
                <span className="w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink tracking-tight">
                  Question received{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''}
                </h3>
                <p className="mt-3 text-[14px] text-ink/60 leading-relaxed max-w-md mx-auto">
                  It is in the nursing team inbox now. We reply to every question within one working day, and
                  if yours turns out to be clinical rather than general we will have the duty vet call you
                  instead of writing back{email.trim() ? ` to ${email.trim()}` : ''}.
                </p>

                <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canvas border border-line text-[12px] text-ink/60">
                  <Check className="w-3.5 h-3.5 text-plum" /> Reference {reference}
                </div>

                <p className="mt-4 text-[12px] text-ink/45 max-w-md mx-auto leading-relaxed">
                  If your pet is unwell right now, please do not wait for our reply — call{' '}
                  <a href={telHref(contact.phone)} className="font-semibold text-ink/70 hv-underline">{contact.phone}</a>{' '}
                  and ask for triage.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" onClick={resetAsk}>
                    Ask another question
                  </Button>
                  <CtaLink href={SITE_ROUTES.book} variant="primary">
                    Book an appointment
                  </CtaLink>
                </div>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(e) => { e.preventDefault(); void askUs(); }}
                className="rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft"
              >
                <h3 className="text-base font-semibold text-ink">Ask us anything</h3>
                <p className="mt-1.5 text-[13px] text-ink/55 leading-relaxed">
                  General questions only, please — we cannot diagnose over email. For anything urgent, call the
                  clinic and ask for triage.
                </p>

                {formError && (
                  <div className="mt-5 rounded-xl border-2 border-coral/40 bg-coral/5 p-4 flex items-start gap-2.5 animate-fadeIn">
                    <TriangleAlert className="w-4 h-4 text-coral mt-0.5 shrink-0" />
                    <p className="text-[12px] text-ink/70 leading-relaxed">{formError}</p>
                  </div>
                )}

                <div className="mt-6 grid sm:grid-cols-2 gap-5">
                  <Field label="Your name" required error={errors.name}>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Marcus Chen"
                      error={!!errors.name}
                    />
                  </Field>

                  <Field label="Email address" required hint="Where we send the answer." error={errors.email}>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@example.com"
                      error={!!errors.email}
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field
                    label="Your question"
                    required
                    error={errors.question}
                    hint="Include your pet’s species, age and anything relevant you have already tried."
                  >
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      rows={5}
                      maxLength={700}
                      placeholder="My 4-year-old cat is due her boosters but reacted last year — what are our options?"
                      error={!!errors.question}
                    />
                  </Field>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Button type="submit" variant="primary" size="lg" icon={Send} disabled={saving}>
                    {saving ? 'Sending…' : 'Send question'}
                  </Button>
                  <span className="text-[11px] text-ink/45 max-w-xs leading-relaxed">
                    Answered within one working day by a registered veterinary nurse.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>

      {/* 9 ── CTA band ------------------------------------------- */}
      <CtaBand
        title="Got the answer you needed? Let us meet your pet"
        subtitle="Same-day sick appointments, written estimates before every procedure, and a free nurse check-in after surgery — at both the Northgate and Riverside branches."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Read client reviews"
        secondaryHref={SITE_ROUTES.reviews}
      />
    </SitePage>
  );
}
