'use client';

import { useMemo, useState } from 'react';
import {
  Star, Quote, ThumbsUp, Clock, Wallet, Smile, Scissors, Stethoscope, Siren,
  Sparkles, HeartPulse, ListFilter, Send, MessageSquare, BadgeCheck, ShieldCheck,
  PhoneCall, Check, PartyPopper, Microscope, Bandage, ClipboardList, Users,
  Image as ImageIcon, TriangleAlert,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, PageHero, CtaLink, CtaBand, StatStrip, SITE_ROUTES,
} from '../_components/site-chrome';
import {
  Field, Input, Textarea, Select, RadioGroup, Checkbox, SegmentedControl, SearchInput, FileInput,
} from '../../components/form';
import { Button } from '../../components/ui';
import { useCms } from '../../lib/cms';
import { useDB, newId, type SiteReview } from '../../lib/store';
import { isEmail, num, nextDocNumber, localDateISO, localTimeHHMM } from '../../lib/helpers';

/* ---------------------------------------------------------------- */
/* Local helpers                                                     */
/* ---------------------------------------------------------------- */

function Stars({
  rating, size = 'sm', tone = 'light', className = '',
}: { rating: number; size?: 'sm' | 'md' | 'lg' | 'xl'; tone?: 'light' | 'dark'; className?: string }) {
  const dim =
    size === 'xl' ? 'w-7 h-7' : size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-[17px] h-[17px]' : 'w-3.5 h-3.5';
  const empty = tone === 'dark' ? 'text-white/20' : 'text-ink/15';
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${dim} ${i <= Math.round(rating) ? 'fill-coral text-coral' : empty}`}
          strokeWidth={1.75}
        />
      ))}
    </span>
  );
}

function Monogram({ name, className = 'w-12 h-12 text-sm' }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full bg-lilac text-plum font-bold flex items-center justify-center ${className}`}
    >
      {initials}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Data                                                              */
/* ---------------------------------------------------------------- */

const RATING_ROWS = [
  { stars: 5, count: 441 },
  { stars: 4, count: 31 },
  { stars: 3, count: 9 },
  { stars: 2, count: 4 },
  { stars: 1, count: 2 },
];
const TOTAL_REVIEWS = RATING_ROWS.reduce((sum, r) => sum + r.count, 0);

const SUB_SCORES = [
  { label: 'Staff friendliness', value: '5.0', pct: 100, icon: Smile, note: 'Highest-scoring question on our survey' },
  { label: 'Wait time', value: '4.7', pct: 94, icon: Clock, note: 'Average check-in to consult: 6 minutes' },
  { label: 'Value for money', value: '4.8', pct: 96, icon: Wallet, note: 'Written estimate before every procedure' },
  { label: 'Would recommend', value: '98%', pct: 98, icon: ThumbsUp, note: '476 of 487 respondents said yes' },
];

const FILTERS = [
  { value: 'all', label: 'All', icon: ListFilter },
  { value: 'Surgery', label: 'Surgery', icon: Stethoscope },
  { value: 'Dentistry', label: 'Dentistry', icon: Sparkles },
  { value: 'Wellness', label: 'Wellness', icon: HeartPulse },
  { value: 'Emergency', label: 'Emergency', icon: Siren },
  { value: 'Grooming', label: 'Grooming', icon: Scissors },
];

type Review = {
  id: string;
  name: string;
  pet: string;
  service: string;
  rating: number;
  date: string;
  body: string;
};

const ALL_REVIEWS: Review[] = [
  {
    id: 'rv-1',
    name: 'Eleanor Hayes',
    pet: 'Buddy — Golden Retriever',
    service: 'Surgery',
    rating: 5,
    date: '14 January 2026',
    body: 'Buddy had a splenic mass removed and I was terrified going in. Dr. Rivera walked me through the ultrasound images on screen before I had to decide anything, and the written estimate matched the final invoice to the dollar. A nurse called me twice in the first week just to ask how he was eating.',
  },
  {
    id: 'rv-2',
    name: 'Marcus Chen',
    pet: 'Luna — Persian Cat',
    service: 'Wellness',
    rating: 5,
    date: '2 February 2026',
    body: 'Luna has clawed her way out of every other clinic in the Bay Area. Northgate put her in the cat-only waiting area, used a pheromone towel, and did the whole exam on the floor with her. First visit in nine years where nobody bled.',
  },
  {
    id: 'rv-3',
    name: 'Sofia Reyes',
    pet: 'Max — Beagle',
    service: 'Wellness',
    rating: 5,
    date: '27 February 2026',
    body: 'They picked up Max’s diabetes from a routine senior blood panel before he had any obvious symptoms. The nurse spent forty minutes teaching me to draw up insulin and let me practise on a cushion until my hands stopped shaking. The portal reminders keep his curve checks on schedule.',
  },
  {
    id: 'rv-4',
    name: 'Daniel Okafor',
    pet: 'Nala — Shiba Inu',
    service: 'Dentistry',
    rating: 5,
    date: '9 March 2026',
    body: 'Nala needed two extractions and a full scale and polish. They sent photos of her mouth before and after, with the dental chart marked up so I could actually see which teeth went. She was back on kibble by day three.',
  },
  {
    id: 'rv-5',
    name: 'Priya Raman',
    pet: 'Simba — Maine Coon',
    service: 'Emergency',
    rating: 5,
    date: '21 March 2026',
    body: 'Simba stopped being able to urinate at 11pm on a Saturday. I called the emergency line, a vet picked up in under a minute and told me exactly what to do while I drove over. He was unblocked and comfortable by 1am and I was never once made to feel like I was overreacting.',
  },
  {
    id: 'rv-6',
    name: 'Tom Whitfield',
    pet: 'Pepper — Border Collie',
    service: 'Grooming',
    rating: 4,
    date: '4 April 2026',
    body: 'Lovely groom and Pepper came home smelling fantastic with her feathering properly thinned out. Only reason it is four stars is that the Saturday slots book out about three weeks ahead, so plan early if you work weekdays.',
  },
  {
    id: 'rv-7',
    name: 'Amara Diallo',
    pet: 'Coco — French Bulldog',
    service: 'Surgery',
    rating: 5,
    date: '19 April 2026',
    body: 'Brachycephalic airway surgery on a French Bulldog is not a small thing and I had quotes from three practices. Northgate was the only one that insisted on pre-op bloodwork and a sedated airway exam first, and the only one that gave me the anaesthesia monitoring protocol in writing. Coco snores like a normal dog now.',
  },
  {
    id: 'rv-8',
    name: 'Grace Lindqvist',
    pet: 'Mochi — Netherland Dwarf Rabbit',
    service: 'Dentistry',
    rating: 5,
    date: '8 May 2026',
    body: 'Finding someone who is genuinely comfortable with rabbit molars is hard. Dr. Patel burred Mochi’s spurs under a short gas anaesthetic, kept him on heat and fluids the whole time, and had him eating critical care within the hour. He is back to destroying my skirting boards.',
  },
  {
    id: 'rv-9',
    name: 'Victor Alvarez',
    pet: 'Rocky — Boxer',
    service: 'Emergency',
    rating: 4,
    date: '23 June 2026',
    body: 'Rocky ate half a chocolate cake and we were seen straight away, which I appreciated enormously. Treatment was excellent and the follow-up call came the next morning. The waiting room was chaotic that evening, but honestly that is what an emergency service on a Friday looks like.',
  },
  {
    id: 'rv-10',
    name: 'Hannah Brooks',
    pet: 'Willow — Cockapoo',
    service: 'Grooming',
    rating: 5,
    date: '11 July 2026',
    body: 'Willow is a rescue who panics at the sound of clippers. The groomer booked her in for two short desensitisation visits with no cutting at all before the real appointment. By the third visit she walked in on her own and fell asleep on the table.',
  },
  {
    id: 'rv-11',
    name: 'Kenji Nakamura',
    pet: 'Hiro — Labrador Retriever',
    service: 'Wellness',
    rating: 5,
    date: '2 September 2026',
    body: 'We moved from Seattle and transferred Hiro’s records across. Reception chased the old practice for his vaccination history so I did not have to, and the vet went through eleven years of notes before deciding he only needed the lifestyle vaccines, not the full course again. That saved us money nobody had to save us.',
  },
  {
    id: 'rv-12',
    name: 'Rebecca Flynn',
    pet: 'Olive — Dachshund',
    service: 'Surgery',
    rating: 5,
    date: '28 September 2026',
    body: 'Olive slipped a disc and went off her back legs overnight. Northgate stabilised her, were completely straight with me that she needed a neurologist rather than trying to manage it in-house, and had the referral booked before lunch. They sent the imaging ahead so the specialist was not starting from scratch.',
  },
];

const THEMES = [
  { label: 'Explained everything clearly', count: 212, icon: ClipboardList },
  { label: 'Gentle with anxious pets', count: 189, icon: Smile },
  { label: 'Short wait times', count: 141, icon: Clock },
  { label: 'Fair pricing', count: 128, icon: Wallet },
  { label: 'Follow-up calls', count: 96, icon: PhoneCall },
];

const SPOTLIGHT_STEPS = [
  { icon: Microscope, text: 'Same-day abdominal ultrasound and clotting panel to stage the mass before committing to surgery.' },
  { icon: Stethoscope, text: 'Splenectomy by Dr. Rivera with a dedicated anaesthesia nurse monitoring blood pressure and ECG throughout.' },
  { icon: Bandage, text: 'Two nights of inpatient care on IV fluids and a multi-modal pain plan rather than a same-day discharge.' },
  { icon: PhoneCall, text: 'Nurse-led check-in calls on days 1, 3 and 7, plus a free suture check at the two-week mark.' },
];

const RATING_OPTIONS = [
  { value: '5', label: '5 — Excellent', hint: 'Exceeded expectations' },
  { value: '4', label: '4 — Very good', hint: 'Minor niggles only' },
  { value: '3', label: '3 — Okay', hint: 'Room to improve' },
  { value: '2', label: '2 — Poor', hint: 'Something went wrong' },
  { value: '1', label: '1 — Very poor', hint: 'We let you down' },
];

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function ReviewsPage() {
  const { content } = useCms();
  const { db, create } = useDB();
  const contact = content.contact;

  /* Section 4 — filtering */
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const visibleReviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_REVIEWS.filter((r) => {
      const matchesFilter = filter === 'all' || r.service === filter;
      const matchesQuery =
        q === '' ||
        r.name.toLowerCase().includes(q) ||
        r.pet.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  /* Section 7 — review form */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [petName, setPetName] = useState('');
  const [service, setService] = useState('');
  const [rating, setRating] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<{ name: string }[]>([]);
  const [errors, setErrors] = useState<{ name?: string; email?: string; rating?: string; reviewText?: string }>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState('');

  const resetReviewForm = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setPetName('');
    setService('');
    setRating('');
    setReviewText('');
    setConsent(false);
    /* The reset left the uploaded photo chips behind, so the next review
       appeared to be carrying someone else's pictures. */
    setPhotos([]);
    setErrors({});
    setFormError('');
    setReference('');
  };

  /**
   * Was `setSubmitted(true)` and a hardcoded reference that was identical for
   * every visitor. Now it writes a SiteReview for moderation and shows the
   * reference of the record it actually created.
   */
  const submitReview = async () => {
    if (saving) return;

    const next: { name?: string; email?: string; rating?: string; reviewText?: string } = {};
    if (!name.trim()) next.name = 'Please tell us your name so we can match this to your visit.';
    /* Optional field, but we verify every review against an appointment, and
       a malformed address makes that impossible. */
    if (email.trim() && !isEmail(email)) next.email = 'That email address does not look right.';
    if (!rating) next.rating = 'Please choose a star rating.';
    if (!reviewText.trim()) next.reviewText = 'Please write a few words about your visit.';

    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFormError('');
      return;
    }

    const record: SiteReview = {
      id: newId('rev'),
      reference: nextDocNumber(`NG-REV-${new Date().getFullYear()}-`, db?.siteReviews ?? [], 1, 4),
      name: name.trim(),
      email: email.trim(),
      petName: petName.trim(),
      service: service || 'Not specified',
      rating: num(rating, 5),
      text: reviewText.trim(),
      photos,
      consentToPublish: consent,
      status: 'Pending',
      moderatedBy: '',
      reply: '',
      submittedAt: `${localDateISO()} ${localTimeHHMM()}`,
    };

    setSaving(true);
    try {
      await create('siteReviews', record);
      setReference(record.reference);
      setSubmitted(true);
      setFormError('');
    } catch {
      setFormError(
        `We could not save your review just now — please try again, or call ${contact.phone} and we will take it over the phone.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SitePage>
      {/* 1 ── Hero ------------------------------------------------- */}
      <PageHero
        eyebrow="Client reviews"
        title="4.9 out of 5, from 487 pet families"
        subtitle="Every review below comes from a real Northgate client. We ask the same four questions after every visit, publish the answers unedited, and reply to the ones that tell us we got something wrong."
        breadcrumb="Reviews"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <Stars rating={5} size="xl" tone="dark" />
            <span className="text-3xl md:text-4xl font-bold text-white tabular-nums leading-none">4.9</span>
            <span className="text-sm text-white/55 leading-snug">
              average across {TOTAL_REVIEWS} reviews
              <br />
              since we opened in 2019
            </span>
          </div>

          <p className="inline-flex items-start gap-2 text-[13px] text-white/70 max-w-xl">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-coral" />
            <span>
              Collected through verified after-visit surveys — we only email the survey to clients with a
              completed appointment on file, so nobody can review a clinic they have never been to.
            </span>
          </p>

          <div className="flex flex-wrap gap-3">
            <CtaLink href="#leave-a-review" variant="white" icon={Send}>
              Leave a review
            </CtaLink>
            <CtaLink href={SITE_ROUTES.book} variant="ghost">
              Book an appointment
            </CtaLink>
          </div>
        </div>
      </PageHero>

      {/* 2 ── Rating breakdown ------------------------------------ */}
      <Section>
        <SectionHeading
          eyebrow="The numbers"
          title="Where the 4.9 actually comes from"
          subtitle="The full distribution, including the eleven reviews that scored us three stars or lower. We publish those too — three of them led to changes in how we run the waiting room."
        />

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Distribution */}
          <div className="lg:col-span-3 rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft">
            <div className="flex items-end gap-5 pb-6 mb-6 border-b border-line">
              <div>
                <div className="text-5xl font-bold text-plum leading-none tracking-tight tabular-nums">4.9</div>
                <Stars rating={5} size="md" className="mt-2.5" />
              </div>
              <div className="text-[13px] text-ink/55 leading-relaxed pb-1">
                <span className="block font-semibold text-ink">{TOTAL_REVIEWS} verified reviews</span>
                96.7% rated us four stars or better
              </div>
            </div>

            <ul className="space-y-3.5">
              {RATING_ROWS.map((row) => {
                const pct = (row.count / TOTAL_REVIEWS) * 100;
                return (
                  <li key={row.stars} className="group flex items-center gap-3">
                    <span className="flex items-center gap-1 w-12 shrink-0 text-xs font-semibold text-ink/70 tabular-nums">
                      {row.stars}
                      <Star className="w-3 h-3 fill-coral text-coral" />
                    </span>
                    <span className="flex-1 h-2.5 rounded-full bg-lilac/70 overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-plum transition-all duration-500 group-hover:bg-iris"
                        style={{ width: `${Math.max(pct, 1.2)}%` }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right text-xs font-semibold text-ink tabular-nums">
                      {row.count}
                    </span>
                    <span className="w-14 shrink-0 text-right text-[11px] text-ink/45 tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sub-scores */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {SUB_SCORES.map((s) => (
              <div
                key={s.label}
                className="hv-card group rounded-2xl border border-line bg-white p-5 hover:border-plum/25"
              >
                <div className="flex items-center gap-3">
                  <span className="hv-tile w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                    <s.icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink truncate">{s.label}</span>
                      <span className="text-lg font-bold text-plum tabular-nums leading-none">{s.value}</span>
                    </div>
                    <span className="mt-2 block h-1.5 rounded-full bg-lilac/70 overflow-hidden">
                      <span className="block h-full rounded-full bg-iris" style={{ width: `${s.pct}%` }} />
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-ink/50 leading-relaxed">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <StatStrip
            stats={[
              { value: '487', label: 'Verified reviews' },
              { value: '94%', label: 'Survey response rate' },
              { value: '6 min', label: 'Average wait time' },
              { value: '< 24h', label: 'Reply to any 1–3 star review' },
            ]}
          />
        </div>
      </Section>

      {/* 3 ── Featured stories ------------------------------------ */}
      <Section alt>
        <SectionHeading
          eyebrow="Featured stories"
          title={content.testimonials.sectionTitle}
          subtitle={content.testimonials.sectionSubtitle}
        />

        <div className="grid md:grid-cols-3 gap-5">
          {content.testimonials.items.map((t) => (
            <figure
              key={t.id}
              className="hv-card relative rounded-2xl border border-line bg-white p-7 pt-10 flex flex-col hover:border-plum/25"
            >
              <Quote className="absolute top-5 right-6 w-12 h-12 text-lilac" strokeWidth={1.25} aria-hidden />
              <Stars rating={t.rating} size="md" />
              <blockquote className="relative mt-4 flex-1 text-[15px] text-ink/75 leading-relaxed">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-line flex items-center gap-3">
                <Monogram name={t.name} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink truncate">{t.name}</span>
                  <span className="block text-[11px] text-ink/50 truncate">{t.pet}</span>
                </span>
                <BadgeCheck className="w-4 h-4 ml-auto shrink-0 text-plum" aria-label="Verified client" />
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* 4 ── Filter + all reviews -------------------------------- */}
      <Section id="all-reviews">
        <SectionHeading
          eyebrow="Every review"
          title="Read them by service, or search for your own"
          subtitle="A rolling selection of the most recent surveys from 2026. Filter by the service your pet needs, or search by breed, name or anything a client mentioned."
        />

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
          <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
            <SegmentedControl value={filter} onChange={(val) => setFilter(val)} options={FILTERS} />
          </div>
          <div className="lg:ml-auto lg:w-72">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reviews, pets, breeds…"
            />
          </div>
        </div>

        <p className="text-xs text-ink/45 mb-5 tabular-nums">
          Showing {visibleReviews.length} of {ALL_REVIEWS.length} published reviews
          {filter !== 'all' && <> in <span className="font-semibold text-plum">{filter}</span></>}
        </p>

        {visibleReviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-canvas py-16 px-6 flex flex-col items-center text-center">
            <span className="w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7" />
            </span>
            <h3 className="text-base font-semibold text-ink">No reviews match that search</h3>
            <p className="mt-2 text-[13px] text-ink/55 max-w-sm leading-relaxed">
              We have not published a review matching
              {query.trim() ? <> “<span className="font-medium text-ink/75">{query.trim()}</span>”</> : ' that filter'}
              {filter !== 'all' && <> under {filter}</>}. Try a broader filter, or clear the search box.
            </p>
            <div className="mt-5">
              <Button
                variant="soft"
                onClick={() => {
                  setFilter('all');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleReviews.map((r) => (
              <article
                key={r.id}
                className="hv-card rounded-2xl border border-line bg-white p-6 flex flex-col hover:border-plum/25"
              >
                <div className="flex items-start gap-3">
                  <Monogram name={r.name} className="w-11 h-11 text-xs" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-semibold text-ink truncate">{r.name}</h3>
                    <p className="text-[11px] text-ink/50 truncate">{r.pet}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full bg-lilac text-plum text-[10px] font-bold uppercase tracking-wide">
                    {r.service}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2.5">
                  <Stars rating={r.rating} />
                  <span className="text-[11px] text-ink/40">{r.date}</span>
                </div>

                <p className="mt-3 text-[13px] text-ink/65 leading-relaxed flex-1">{r.body}</p>

                <span className="mt-5 pt-4 border-t border-line inline-flex items-center gap-1.5 text-[11px] font-semibold text-plum">
                  <BadgeCheck className="w-3.5 h-3.5" /> Verified after-visit survey
                </span>
              </article>
            ))}
          </div>
        )}
      </Section>

      {/* 5 ── What clients mention most --------------------------- */}
      <Section tight>
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-3">
            <SectionHeading
              eyebrow="Common themes"
              title="What clients mention most"
              subtitle="We tag every free-text survey answer. These are the five phrases that come up again and again across 487 responses."
              center={false}
              className="mb-8"
            />

            <ul className="flex flex-wrap gap-2.5">
              {THEMES.map((t) => (
                <li key={t.label}>
                  <span className="hv-card group inline-flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-full border border-line bg-white hover:border-plum/30">
                    <span className="hv-tile w-7 h-7 rounded-full bg-lilac text-plum flex items-center justify-center shrink-0">
                      <t.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[13px] font-medium text-ink">{t.label}</span>
                    <span className="inline-flex items-center justify-center min-w-[34px] h-6 px-2 rounded-full bg-plum text-white text-[11px] font-bold tabular-nums">
                      {t.count}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[13px] text-ink/50 leading-relaxed max-w-xl">
              The themes line up with what we set out to be in 2019: a clinic where you leave understanding
              the plan, your pet is not frightened, and the bill holds no surprises.
            </p>
          </div>

          <figure className="lg:col-span-2 relative rounded-2xl border border-line bg-canvas p-7 pt-9">
            <Quote className="absolute top-4 left-5 w-10 h-10 text-lilac" strokeWidth={1.25} aria-hidden />
            <blockquote className="relative text-[15px] text-ink/75 leading-relaxed italic">
              “I have had dogs for thirty years and I have never had a vet draw me a diagram before. Dr. Patel
              sketched Daisy’s knee on the back of the estimate so I could show my husband what the surgery
              would actually do. That is the bit I keep telling people about.”
            </blockquote>
            <figcaption className="mt-6 pt-5 border-t border-line flex items-center gap-3">
              <Monogram name="Joan Pryce" className="w-11 h-11 text-xs" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink">Joan Pryce</span>
                <span className="block text-[11px] text-ink/50">Daisy — Staffordshire Bull Terrier</span>
              </span>
            </figcaption>
          </figure>
        </div>
      </Section>

      {/* 6 ── Spotlight story ------------------------------------- */}
      <Section alt>
        <SectionHeading
          eyebrow="Spotlight"
          title="One case, start to finish"
          subtitle="Buddy’s splenic mass is the story we get asked about most, so Eleanor agreed to let us publish the whole thing — timeline, costs and all."
        />

        <div className="relative overflow-hidden rounded-3xl bg-grape text-white">
          <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-iris/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-iris/20 blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14 p-8 md:p-12 lg:p-14">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-coral mb-6">
                <Stars rating={5} tone="dark" /> Surgery · 2025
              </span>

              <h3 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                Buddy, a 9-year-old golden retriever, and the mass nobody expected to find
              </h3>

              <figure className="mt-6">
              <blockquote className="text-[15px] md:text-base text-white/75 leading-relaxed">
                “Buddy was in for a limp. He is nine, he had slowed down, and I had decided that was just
                his age. The vet felt something in his abdomen during the routine part of the exam and
                asked, very gently, whether she could scan him before we talked about the leg at all.
                Forty minutes later I was looking at a mass on his spleen on a screen with Dr. Rivera
                drawing on it with her finger. She told me the honest version: it might be benign, it might
                not, and waiting was the one option that made it worse. Nobody rushed me and nobody
                frightened me into deciding. He came through surgery, the histopathology came back benign,
                and the bill came to within forty dollars of the estimate I signed. He is eleven now and he
                still thinks he is a puppy when the lead comes out.”
              </blockquote>

              <figcaption className="mt-7 flex items-center gap-3">
                <Monogram name="Eleanor Hayes" className="w-12 h-12 text-sm bg-white/15 text-white" />
                <span>
                  <span className="block text-sm font-semibold text-white">Eleanor Hayes</span>
                  <span className="block text-[12px] text-white/55">Buddy’s owner · Northgate client since 2021</span>
                </span>
              </figcaption>
              </figure>
            </div>

            <div>
              <img
                src="https://images.pexels.com/photos/2598683/pexels-photo-2598683.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="A golden retriever resting calmly on an examination table while a veterinary nurse checks him over"
                className="w-full h-52 md:h-64 object-cover rounded-2xl border border-white/15"
              />

              <h4 className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-coral">
                What we did
              </h4>
              <ul className="mt-4 space-y-4">
                {SPOTLIGHT_STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3.5">
                    <span className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                      <step.icon className="w-4 h-4" />
                    </span>
                    <span className="text-[13px] text-white/70 leading-relaxed pt-1.5">{step.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { value: '40 min', label: 'Exam to diagnosis' },
                  { value: '2 nights', label: 'Inpatient care' },
                  { value: '$40', label: 'Over estimate' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-white/10 px-3 py-3 text-center">
                    <div className="text-base font-bold text-white tabular-nums leading-none">{s.value}</div>
                    <div className="mt-1.5 text-[10px] uppercase tracking-wide text-white/50 leading-tight">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 7 ── Leave a review -------------------------------------- */}
      <Section id="leave-a-review">
        <div className="grid lg:grid-cols-5 gap-10 lg:gap-14 items-start">
          <div className="lg:col-span-2">
            <SectionHeading
              eyebrow="Your turn"
              title="Leave a review"
              subtitle="If we got it right, say so — it genuinely helps the next anxious owner decide. If we got it wrong, say that instead: a practice manager reads every review under four stars and replies within a working day."
              center={false}
              className="mb-8"
            />

            <ul className="space-y-4">
              {[
                { icon: ShieldCheck, title: 'We publish it unedited', body: 'We never change wording. The only reviews we decline are ones naming another client or a staff member’s private details.' },
                { icon: Users, title: 'A real person replies', body: 'Clinical concerns go to the vet who saw your pet; everything else goes to Priya, our practice manager.' },
                { icon: PhoneCall, title: 'Prefer to talk?', body: `Call ${contact.phone} or email ${contact.email} and we will take your feedback over the phone.` },
              ].map((item) => (
                <li key={item.title} className="group flex items-start gap-3.5">
                  <span className="hv-tile w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5" />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{item.title}</span>
                    <span className="block mt-1 text-[12px] text-ink/55 leading-relaxed">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            {submitted ? (
              <div className="rounded-2xl border border-line bg-white p-8 md:p-10 shadow-soft text-center animate-popIn">
                <span className="w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mx-auto">
                  <PartyPopper className="w-7 h-7" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink tracking-tight">
                  Thank you{name.trim() ? `, ${name.trim().split(' ')[0]}` : ''} — that is logged
                </h3>
                <p className="mt-3 text-[14px] text-ink/60 leading-relaxed max-w-md mx-auto">
                  Your {rating}-star review is with our practice manager now. We check it against your
                  appointment record, then publish it on this page{' '}
                  {consent ? 'under your name' : 'with your name shortened to initials'}, usually within two
                  working days. If you asked us about something clinical, the vet who saw{' '}
                  {petName.trim() || 'your pet'} will call you back first.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-canvas border border-line text-[12px] text-ink/60">
                  <Check className="w-3.5 h-3.5 text-plum" /> Reference {reference}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" onClick={resetReviewForm}>
                    Write another review
                  </Button>
                  <CtaLink href={SITE_ROUTES.book} variant="primary">
                    Book your next visit
                  </CtaLink>
                </div>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(e) => { e.preventDefault(); void submitReview(); }}
                className="rounded-2xl border border-line bg-white p-6 md:p-8 shadow-soft"
              >
                {formError && (
                  <div className="mb-5 rounded-xl border-2 border-coral/40 bg-coral/5 p-4 flex items-start gap-2.5 animate-fadeIn">
                    <TriangleAlert className="w-4 h-4 text-coral mt-0.5 shrink-0" />
                    <p className="text-[12px] text-ink/70 leading-relaxed">{formError}</p>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Your name" required error={errors.name}>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Eleanor Hayes"
                      error={!!errors.name}
                    />
                  </Field>

                  <Field
                    label="Email address"
                    hint="Only used to match your visit — never published."
                    error={errors.email}
                  >
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@example.com"
                      error={!!errors.email}
                    />
                  </Field>

                  <Field label="Pet’s name" hint="So we can find the right appointment.">
                    <Input value={petName} onChange={(e) => setPetName(e.target.value)} placeholder="Buddy" />
                  </Field>

                  <Field label="Which service?">
                    <Select value={service} onChange={(e) => setService(e.target.value)}>
                      <option value="">— Select a service —</option>
                      <option value="Wellness">Wellness exam or vaccination</option>
                      <option value="Surgery">Surgery</option>
                      <option value="Dentistry">Dentistry</option>
                      <option value="Emergency">Emergency or out-of-hours</option>
                      <option value="Grooming">Grooming</option>
                      <option value="Boarding">Boarding</option>
                      <option value="Diagnostics">Laboratory and diagnostics</option>
                    </Select>
                  </Field>
                </div>

                <div className="mt-5">
                  <Field label="Your rating" required error={errors.rating}>
                    <RadioGroup
                      value={rating}
                      onChange={(val) => setRating(val)}
                      options={RATING_OPTIONS}
                      card
                      direction="horizontal"
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field
                    label="Your review"
                    required
                    error={errors.reviewText}
                    hint="What went well, what did not, and anything the next owner should know."
                  >
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows={5}
                      maxLength={600}
                      placeholder="Tell us about your visit — the booking, the consult, the follow-up…"
                      error={!!errors.reviewText}
                    />
                  </Field>
                </div>

                <div className="mt-5">
                  <Field
                    label="Add a photo of your pet"
                    hint="Optional. JPG or PNG, up to 10 MB each — we love a good recovery photo."
                  >
                    <FileInput
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      label="Upload a photo"
                      hint="Drag an image here, or click to browse"
                      onFiles={(files) => setPhotos(Array.from(files).map((f) => ({ name: f.name })))}
                    />
                  </Field>
                  {photos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {photos.map((p) => (
                        <span
                          key={p.name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lilac text-plum text-[11px] font-medium"
                        >
                          <ImageIcon className="w-3 h-3" /> {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-xl bg-canvas border border-line p-4">
                  <Checkbox
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    label="I am happy for Northgate Animal Hospital to publish this review with my first name and my pet’s name."
                    hint="Leave this unticked and we will publish it under initials only."
                  />
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <Button type="submit" variant="primary" size="lg" icon={Send} disabled={saving}>
                    {saving ? 'Submitting…' : 'Submit review'}
                  </Button>
                  <span className="text-[11px] text-ink/45 max-w-xs leading-relaxed">
                    We verify every submission against an appointment on file before it appears on this page.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </Section>

      {/* 8 ── CTA band -------------------------------------------- */}
      <CtaBand
        title="Join 500+ Bay Area families who trust us with their pets"
        subtitle="Same-day sick appointments at both branches, transparent written estimates, and a nurse who calls to check in afterwards."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Read our FAQ"
        secondaryHref={SITE_ROUTES.faq}
      />
    </SitePage>
  );
}
