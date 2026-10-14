'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Dog, Cat, Sparkles, Bone, Mail, ArrowRight, Clock, Eye,
  BookOpen, Baby, Salad, Siren, Quote, Search, Check, AlertCircle, User,
  type LucideIcon,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, SITE_ROUTES,
} from '../_components/site-chrome';
import { SegmentedControl, SearchInput, Input, Checkbox } from '../../components/form';
import { Button } from '../../components/ui';
import { useDB, newId, type Subscriber } from '../../lib/store';
import { isEmail, localDateISO, localTimeHHMM } from '../../lib/helpers';
import {
  CATEGORIES, articles, matchesArticle as matches, authorInitials as initials,
  type Category,
} from './articles';

/* ---------------------------------------------------------------- */
/* Page data                                                         */
/* ---------------------------------------------------------------- */

const POPULAR: { id: string; views: string }[] = [
  { id: 'toxins-ten-minutes', views: '8,410 reads' },
  { id: 'how-much-food', views: '6,275 reads' },
  { id: 'feline-kidney', views: '5,803 reads' },
  { id: 'brushing-cat-teeth', views: '4,962 reads' },
  { id: 'arthritis-signs', views: '4,118 reads' },
];

const TOPICS: { label: string; icon: LucideIcon; category: Category | 'All'; query: string; blurb: string }[] = [
  { label: 'Dogs', icon: Dog, category: 'All', query: 'dog', blurb: 'Training, joints, nutrition and vaccines for canine patients.' },
  { label: 'Cats', icon: Cat, category: 'All', query: 'cat', blurb: 'Feline-specific advice, from litter boxes to kidney values.' },
  { label: 'Puppies & kittens', icon: Baby, category: 'Preventive care', query: '', blurb: 'The first year: vaccines, parasites, socialisation and ID.' },
  { label: 'Senior pets', icon: Bone, category: 'Senior pets', query: '', blurb: 'Mobility, organ screening and quality-of-life planning.' },
  { label: 'Nutrition', icon: Salad, category: 'Nutrition', query: '', blurb: 'Portion control, label reading and prescription diets.' },
  { label: 'Emergencies', icon: Siren, category: 'Emergency', query: '', blurb: 'What counts as urgent and what to do before you drive in.' },
];

const VET_QA = [
  {
    vet: 'Dr. Amara Rivera',
    role: 'Clinical Director, DVM',
    question: 'Is one dog year really seven human years?',
    answer:
      'No — the ageing curve is steep early and flattens out later, and body size changes it again. A one-year-old Labrador is already a teenager, while a giant breed is barely skeletally mature at eighteen months. We age your pet from breed, size and what the exam shows, never from a multiplier.',
  },
  {
    vet: 'Dr. Jonah Pike',
    role: 'Senior Veterinarian, DVM',
    question: 'My cat eats well and seems fine. Does she still need an annual exam?',
    answer:
      'Cats are built to hide illness, so "seems fine" is the normal presentation for early disease. A full exam picks up heart murmurs, thyroid nodules, painful teeth and weight trends long before behaviour changes — about one in five of our routine feline check-ups finds something worth acting on.',
  },
  {
    vet: 'Dr. Hana Feldman',
    role: 'Veterinarian, DVM',
    question: 'Can I give my dog human painkillers for a limp?',
    answer:
      'Please do not. Ibuprofen and paracetamol cause stomach ulceration and kidney injury in dogs, and in cats a single paracetamol tablet can be fatal. Call us instead — a weight-dosed veterinary anti-inflammatory is both far safer and considerably more effective.',
  },
];

const HERO_PHOTO =
  'https://images.pexels.com/photos/6235260/pexels-photo-6235260.jpeg?auto=compress&cs=tinysrgb&w=1200';

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function BlogPage() {
  const { db, create } = useDB();

  /* Section 3 filter state — also driven by the topic cards in section 5. */
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');

  /* Section 7 newsletter state. */
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const visible = useMemo(
    () => articles.filter((a) => matches(a, category, query)),
    [category, query],
  );

  const clearFilters = () => { setCategory('All'); setQuery(''); };

  const applyTopic = (topicCategory: Category | 'All', topicQuery: string) => {
    setCategory(topicCategory);
    setQuery(topicQuery);
    document.getElementById('articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Was `email.includes('@')` and a `setSubscribed(true)` that saved nothing,
   * so the address was gone on refresh. Now it writes a real Subscriber.
   */
  const subscribe = async () => {
    if (saving) return;
    const address = email.trim().toLowerCase();
    if (!isEmail(address)) {
      setFormError('That does not look like a complete email address — check for a typo.');
      return;
    }
    if (!consent) {
      setFormError('Please confirm consent so we are allowed to email you.');
      return;
    }

    const already = (db?.subscribers ?? []).find(
      (s) => s.email.trim().toLowerCase() === address && s.status === 'Subscribed',
    );
    if (already) {
      setFormError('That address is already on the list — check your spam folder for the last digest.');
      return;
    }

    const record: Subscriber = {
      id: newId('sub'),
      email: address,
      source: 'Blog newsletter',
      consent: true,
      status: 'Subscribed',
      subscribedAt: `${localDateISO()} ${localTimeHHMM()}`,
      unsubscribedAt: '',
    };

    setFormError('');
    setSaving(true);
    try {
      await create('subscribers', record);
      setSubscribed(true);
    } catch {
      setFormError('We could not save that just now. Please try again, or email us and we will add you by hand.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SitePage>
      {/* ───────────── 1. Hero ───────────── */}
      <PageHero
        eyebrow="Pet care journal"
        title="Practical advice from our veterinary team"
        subtitle="Everything here is written by the vets and nurses who see your pets at Northgate — no sponsored content, no scraped listicles. If an article changes what we do in the consult room, we update it."
        breadcrumb="Blog"
      >
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={SITE_ROUTES.book} variant="white">Book an appointment</CtaLink>
          <CtaLink href="#newsletter" variant="ghost">Get one email a month</CtaLink>
        </div>
      </PageHero>

      {/* ───────────── 2. Featured article ───────────── */}
      <Section>
        <div className="hv-card hv-slide-parent overflow-hidden rounded-3xl border border-line bg-white shadow-soft hover:border-plum/25">
          <div className="grid lg:grid-cols-2">
            <div className="relative min-h-[260px] lg:min-h-[400px] bg-grape">
              <img
                src={HERO_PHOTO}
                alt="A veterinarian examining a calm cat on a consulting room table"
                className="absolute inset-0 w-full h-full object-cover opacity-90"
              />
              <span className="absolute top-5 left-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-[11px] font-bold uppercase tracking-wider text-plum">
                <Sparkles className="w-3 h-3" /> Featured
              </span>
            </div>

            <div className="p-7 md:p-10 flex flex-col justify-center">
              <span className="inline-flex items-center self-start px-2.5 py-1 rounded-full bg-lilac text-[11px] font-bold uppercase tracking-wider text-plum">
                Behaviour
              </span>
              <h2 className="mt-4 text-2xl md:text-[34px] font-bold text-ink leading-[1.15] tracking-tight">
                Why your cat hides at the vet — and what we do differently
              </h2>
              <p className="mt-4 text-[15px] text-ink/65 leading-relaxed">
                A carrier, a car journey and a stranger&apos;s hands are three separate stressors stacked
                on top of each other, so most cats walk through our door already at their limit.
                We rebuilt the whole feline appointment around that fact — pheromone-prepped rooms,
                a separate cat entrance, and examinations done inside an open carrier wherever possible.
                Here is exactly what happens in a Northgate feline consultation, and the three things
                you can do at home in the week beforehand to make it easier.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] text-ink/50">
                <span className="flex items-center gap-2">
                  <span className="w-10 h-10 rounded-full bg-lilac text-plum font-bold text-xs flex items-center justify-center">
                    MS
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">Dr. Mei-Lin Soto</span>
                    <span className="block text-[11px] text-ink/45">Feline medicine, Fear Free certified</span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 6 min read</span>
                <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> 9,640 reads</span>
              </div>

              <Link
                href={SITE_ROUTES.contact}
                className="hv-lift mt-7 inline-flex items-center self-start gap-2 px-5 h-11 rounded-xl bg-plum text-white text-sm font-semibold hover:bg-grape"
              >
                Ask us about fear-free visits <ArrowRight className="hv-slide w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── 3. Filter bar + article grid ───────────── */}
      <Section id="articles" alt>
        <SectionHeading
          eyebrow="All articles"
          title="Browse the journal"
          subtitle="Twelve articles and counting, filtered by the thing you are worried about right now."
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-9">
          <div className="-mx-1 px-1 overflow-x-auto">
            <SegmentedControl
              value={category}
              onChange={(val) => setCategory(val)}
              options={[
                { value: 'All', label: 'All', icon: BookOpen },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, topics, authors…"
            />
          </div>
        </div>

        <p className="text-[12px] text-ink/45 mb-5">
          Showing <span className="font-semibold text-plum">{visible.length}</span> of {articles.length} articles
          {category !== 'All' && <> in <span className="font-semibold text-ink/70">{category}</span></>}
          {query.trim() && <> matching &ldquo;<span className="font-semibold text-ink/70">{query.trim()}</span>&rdquo;</>}
        </p>

        {visible.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-white py-16 px-6 text-center">
            <span className="hv-tile w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7" />
            </span>
            <h3 className="text-base font-semibold text-ink">No articles match that search</h3>
            <p className="mt-2 text-[13px] text-ink/55 max-w-sm mx-auto leading-relaxed">
              Try a broader term, or clear the filters to see all twelve. If you need an answer about
              your own pet rather than a general one, our reception team will route you to a vet.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={clearFilters} variant="primary">Clear filters</Button>
              <Link
                href={SITE_ROUTES.contact}
                className="hv-lift hv-slide-parent inline-flex items-center gap-1.5 px-4 h-9 rounded-lg border border-line bg-white text-sm font-medium text-ink hover:border-plum hover:text-plum"
              >
                Ask our team <ArrowRight className="hv-slide w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.id}
                  href={`${SITE_ROUTES.blog}/${a.id}`}
                  className="hv-card hv-slide-parent group flex flex-col overflow-hidden rounded-2xl border border-line bg-white hover:border-plum/25"
                >
                  {/* Gradient thumbnail panel */}
                  <div className={`relative h-40 overflow-hidden flex flex-col items-center justify-center ${i % 2 === 0 ? 'bg-grape' : 'bg-plum'}`}>
                    <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-iris/30 blur-3xl" />
                    <div className="absolute -bottom-24 -left-16 w-52 h-52 rounded-full bg-plum/50 blur-3xl" />
                    <Icon className="relative w-12 h-12 text-white/85" />
                    <span className="relative mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
                      {a.category}
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 p-5">
                    <span className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full bg-lilac text-[10px] font-bold uppercase tracking-wider text-plum">
                      {a.category}
                    </span>
                    <h3 className="mt-3 text-[15px] font-semibold text-ink leading-snug group-hover:text-plum transition-colors">
                      {a.title}
                    </h3>
                    <p className="mt-2.5 text-[13px] text-ink/55 leading-relaxed">{a.excerpt}</p>

                    <div className="mt-5 pt-4 border-t border-line flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-full bg-lilac text-plum font-bold text-[11px] flex items-center justify-center shrink-0">
                        {initials(a.author)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-ink truncate">{a.author}</span>
                        <span className="block text-[11px] text-ink/45">{a.date} · {a.readMins} min read</span>
                      </span>
                    </div>

                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-plum">
                      Read <ArrowRight className="hv-slide w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* ───────────── 4. Popular this month ───────────── */}
      <Section>
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-start">
          <SectionHeading
            center={false}
            eyebrow="Most read"
            title="Popular this month"
            subtitle="What pet families actually clicked on in September 2026. Reads are counted once per visitor."
            className="mb-0"
          />

          <ol className="divide-y divide-line rounded-2xl border border-line bg-white overflow-hidden">
            {POPULAR.map((p, i) => {
              const a = articles.find((x) => x.id === p.id);
              if (!a) return null;
              return (
                <li key={p.id}>
                  <Link
                    href={`${SITE_ROUTES.blog}/${a.id}`}
                    className="hv-slide-parent group flex items-start gap-5 p-5 hover:bg-canvas transition-colors"
                  >
                    <span className="text-[34px] md:text-[40px] font-bold leading-none text-iris/30 tabular-nums shrink-0 w-10 text-right">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink leading-snug group-hover:text-plum transition-colors">
                        {a.title}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink/45">
                        <span className="font-semibold text-plum">{a.category}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.views}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.readMins} min</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {a.author}</span>
                      </span>
                    </span>
                    <ArrowRight className="hv-slide w-4 h-4 text-plum/40 mt-1.5 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </Section>

      {/* ───────────── 5. Browse by topic ───────────── */}
      <Section alt>
        <SectionHeading
          eyebrow="By topic"
          title="Browse by topic"
          subtitle="Pick a topic and we will filter the article grid above for you."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            const count = articles.filter((a) => matches(a, t.category, t.query)).length;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTopic(t.category, t.query)}
                className="hv-card group text-left rounded-2xl border border-line bg-white p-6 hover:border-plum/25 outline-none focus-visible:ring-4 focus-visible:ring-lilac"
              >
                <span className="hv-tile w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </span>
                <h3 className="text-[15px] font-semibold text-ink group-hover:text-plum transition-colors">{t.label}</h3>
                <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">{t.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-plum">
                  {count} {count === 1 ? 'article' : 'articles'}
                  <ArrowRight className="hv-slide w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ───────────── 6. From our vets ───────────── */}
      <Section>
        <SectionHeading
          eyebrow="Ask the vet"
          title="From our vets"
          subtitle="Three questions we are asked almost every week, answered by the clinician who hears them most."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {VET_QA.map((q) => (
            <div
              key={q.vet}
              className="hv-card group relative overflow-hidden rounded-2xl border border-line bg-white p-6 hover:border-plum/25"
            >
              <Quote className="absolute top-5 right-5 w-10 h-10 text-lilac" />
              <span className="hv-tile relative w-12 h-12 rounded-full bg-lilac text-plum font-bold text-sm flex items-center justify-center">
                {initials(q.vet)}
              </span>
              <h3 className="relative mt-5 text-[15px] font-semibold text-ink leading-snug">{q.question}</h3>
              <p className="relative mt-3 text-[13px] text-ink/60 leading-relaxed">{q.answer}</p>
              <div className="relative mt-5 pt-4 border-t border-line">
                <span className="block text-[12px] font-semibold text-ink">{q.vet}</span>
                <span className="block text-[11px] text-ink/45">{q.role}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <CtaLink href={SITE_ROUTES.faq} variant="outline">Read the full FAQ</CtaLink>
        </div>
      </Section>

      {/* ───────────── 7. Newsletter ───────────── */}
      <Section id="newsletter" alt>
        <div className="relative overflow-hidden rounded-3xl bg-grape px-6 py-10 md:px-12 md:py-14">
          <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-iris/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-plum/50 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-9 lg:gap-14 items-center">
            <div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-coral mb-3">
                Monthly digest
              </span>
              <h2 className="text-2xl md:text-[34px] font-bold text-white leading-[1.15] tracking-tight">
                One email a month, no sales pitches
              </h2>
              <p className="mt-4 text-[15px] text-white/65 leading-relaxed">
                A short round-up of what our vets wrote, seasonal reminders that actually matter in the
                Bay Area, and the odd heads-up about a recall. Written by the clinical team, not a
                marketing agency — and 2,100+ subscribers have stayed for it.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  'Twelve emails a year. That is the whole commitment.',
                  'No third-party advertising and we never sell your address.',
                  'Unsubscribe link in every single email.',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[13px] text-white/70">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-coral" /> {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-white p-6 md:p-7 shadow-lift">
              {subscribed ? (
                <div className="py-6 text-center">
                  <span className="w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mx-auto mb-4 animate-popIn">
                    <Check className="w-7 h-7" strokeWidth={3} />
                  </span>
                  <h3 className="text-base font-semibold text-ink">You are on the list</h3>
                  <p className="mt-2 text-[13px] text-ink/55 leading-relaxed">
                    We have added <span className="font-semibold text-ink/75">{email}</span>. The next
                    digest goes out on the first Tuesday of the month — look for Northgate Animal
                    Hospital in your inbox, and check spam just in case.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-5"
                    onClick={() => { setSubscribed(false); setEmail(''); setConsent(false); }}
                  >
                    Add another address
                  </Button>
                </div>
              ) : (
                <form
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); void subscribe(); }}
                >
                  <h3 className="text-base font-semibold text-ink">Subscribe to the journal</h3>
                  <p className="mt-1.5 text-[12px] text-ink/50">
                    Join 2,100+ pet families. One email a month, nothing else.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <span className="block text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1.5">
                        Email address
                      </span>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (formError) setFormError(''); }}
                        onEnter={() => void subscribe()}
                        placeholder="you@example.com"
                        icon={Mail}
                        error={Boolean(formError)}
                      />
                    </div>

                    <Checkbox
                      checked={consent}
                      onChange={(e) => { setConsent(e.target.checked); if (formError) setFormError(''); }}
                      label="I agree to receive monthly pet-care emails and can unsubscribe at any time"
                      hint="We store only your email address, and only for the newsletter."
                    />

                    {formError && (
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-coral">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {formError}
                      </p>
                    )}

                    <Button type="submit" variant="primary" size="lg" full iconRight={ArrowRight} disabled={saving}>
                      {saving ? 'Adding you…' : 'Subscribe'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ───────────── 8. CTA band ───────────── */}
      <CtaBand
        title="Reading about it only goes so far"
        subtitle="If something in an article sounded like your pet, book a consultation and let one of our vets take a proper look."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Ask us a question"
        secondaryHref={SITE_ROUTES.contact}
      />
    </SitePage>
  );
}
