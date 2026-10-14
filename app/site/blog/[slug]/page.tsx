'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Clock, CalendarDays, Tag, Check, Siren, BookOpen,
  Share2, Search,
} from 'lucide-react';
import {
  SitePage, Section, SectionHeading, CtaLink, CtaBand, SITE_ROUTES,
} from '../../_components/site-chrome';
import { Button } from '../../../components/ui';
import { articles, findArticle, relatedArticles, authorInitials } from '../articles';

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const article = findArticle(slug);

  if (!article) {
    return (
      <SitePage>
        <Section>
          <div className="max-w-xl mx-auto rounded-3xl border border-dashed border-line bg-canvas py-16 px-6 text-center">
            <span className="w-14 h-14 rounded-2xl bg-lilac text-plum flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7" />
            </span>
            <h1 className="text-xl font-bold text-ink tracking-tight">We cannot find that article</h1>
            <p className="mt-3 text-[13px] text-ink/55 leading-relaxed">
              The link may be out of date. All {articles.length} articles are listed on the journal
              index, and our reception team can point you at the right one if you tell them what you
              are looking for.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <CtaLink href={SITE_ROUTES.blog} variant="primary" icon={BookOpen}>Back to the journal</CtaLink>
              <CtaLink href={SITE_ROUTES.contact} variant="outline">Ask our team</CtaLink>
            </div>
          </div>
        </Section>
      </SitePage>
    );
  }

  const Icon = article.icon;
  const related = relatedArticles(article.id);

  const share = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: article.title, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  return (
    <SitePage>
      {/* 1 ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-grape text-white">
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-plum/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-iris/20 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <nav className="flex flex-wrap items-center gap-1.5 text-[12px] text-white/50 mb-6">
            <Link href={SITE_ROUTES.home} className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href={SITE_ROUTES.blog} className="hover:text-white transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-white/80">{article.category}</span>
          </nav>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-coral mb-5">
            <Icon className="w-3.5 h-3.5" /> {article.category}
          </span>

          <h1 className="text-3xl md:text-[44px] font-bold leading-[1.1] tracking-tight">
            {article.title}
          </h1>

          <p className="mt-5 text-base md:text-lg text-white/70 leading-relaxed">
            {article.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-white/55">
            <span className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-full bg-white/15 text-white font-bold text-xs flex items-center justify-center">
                {authorInitials(article.author)}
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-white">{article.author}</span>
                <span className="block text-[11px] text-white/50">{article.authorRole}</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {article.date}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {article.readMins} min read</span>
          </div>
        </div>
      </section>

      {/* 2 ── Body ───────────────────────────────────────────────── */}
      <Section id="article-body">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
          <article className="lg:col-span-2">
            <p className="text-[17px] text-ink/75 leading-relaxed font-medium">
              {article.standfirst}
            </p>

            {article.sections.map((section) => (
              <div key={section.heading} className="mt-9">
                <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight leading-snug">
                  {section.heading}
                </h2>
                {section.body.map((para) => (
                  <p key={para.slice(0, 48)} className="mt-4 text-[15px] text-ink/65 leading-relaxed">
                    {para}
                  </p>
                ))}
              </div>
            ))}

            <div className="mt-10 pt-7 border-t border-line flex flex-wrap items-center gap-3">
              <Link
                href={SITE_ROUTES.blog}
                className="hv-lift inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-line bg-white text-[13px] font-semibold text-ink hover:border-plum hover:text-plum"
              >
                <ArrowLeft className="w-4 h-4" /> All articles
              </Link>
              <Button variant="soft" icon={Share2} onClick={share}>Share this article</Button>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-[120px]">
            <div className="rounded-2xl border border-line bg-canvas p-6">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-3.5">
                <Check className="w-3 h-3" /> The short version
              </span>
              <ul className="space-y-2.5">
                {article.keyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-[13px] text-ink/70 leading-relaxed">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-plum" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Author block */}
            <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
              <div className="flex items-center gap-3.5">
                <span className="w-12 h-12 rounded-full bg-lilac text-plum font-bold text-sm flex items-center justify-center shrink-0">
                  {authorInitials(article.author)}
                </span>
                <div className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink leading-snug">{article.author}</span>
                  <span className="block text-[11px] text-ink/50">{article.authorRole}</span>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-ink/60 leading-relaxed">
                Written by a member of the clinical team at Northgate Animal Hospital. Everything on this
                page reflects what we actually do in the consult room — if a protocol changes, the
                article changes with it.
              </p>
              <div className="mt-5 pt-4 border-t border-line">
                <Link
                  href={SITE_ROUTES.team}
                  className="hv-slide-parent inline-flex items-center gap-1.5 text-xs font-semibold text-plum hover:text-grape transition-colors"
                >
                  Meet the team <ArrowRight className="hv-slide w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-coral/35 bg-coral/5 p-6">
              <span className="w-11 h-11 rounded-xl bg-coral/15 text-coral flex items-center justify-center mb-4">
                <Siren className="w-5 h-5" />
              </span>
              <h3 className="text-[14px] font-semibold text-ink mb-2">This is general advice</h3>
              <p className="text-[13px] text-ink/60 leading-relaxed">
                It cannot replace an examination. If something here sounds like your pet, book a
                consultation — and if they are unwell right now, phone us instead of reading on.
              </p>
              <div className="mt-4">
                <CtaLink href={SITE_ROUTES.emergency} variant="outline" className="!h-10 !px-4 !text-[13px]">
                  Emergency guidance
                </CtaLink>
              </div>
            </div>
          </aside>
        </div>
      </Section>

      {/* 3 ── Related ────────────────────────────────────────────── */}
      <Section id="related" alt>
        <SectionHeading
          eyebrow="Keep reading"
          title="Related articles"
          subtitle="Written by the same team, usually about something that comes up in the same consultation."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {related.map((a, i) => {
            const RelIcon = a.icon;
            return (
              <Link
                key={a.id}
                href={`${SITE_ROUTES.blog}/${a.id}`}
                className="hv-card hv-slide-parent group flex flex-col overflow-hidden rounded-2xl border border-line bg-white hover:border-plum/25"
              >
                <div className={`relative h-36 overflow-hidden flex flex-col items-center justify-center ${i % 2 === 0 ? 'bg-grape' : 'bg-plum'}`}>
                  <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-iris/30 blur-3xl" />
                  <RelIcon className="relative w-10 h-10 text-white/85" />
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <span className="inline-flex items-center gap-1 self-start px-2.5 py-0.5 rounded-full bg-lilac text-[10px] font-bold uppercase tracking-wider text-plum">
                    <Tag className="w-2.5 h-2.5" /> {a.category}
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-ink leading-snug group-hover:text-plum transition-colors">
                    {a.title}
                  </h3>
                  <p className="mt-2.5 text-[13px] text-ink/55 leading-relaxed flex-1">
                    {a.excerpt.split('. ')[0]}.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-plum">
                    Read <ArrowRight className="hv-slide w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* 4 ── CTA band ───────────────────────────────────────────── */}
      <CtaBand
        title="Reading about it only goes so far"
        subtitle="If something in this article sounded like your pet, book a consultation and let one of our vets take a proper look."
        primaryLabel="Book an appointment"
        primaryHref={SITE_ROUTES.book}
        secondaryLabel="Ask us a question"
        secondaryHref={SITE_ROUTES.contact}
      />
    </SitePage>
  );
}
