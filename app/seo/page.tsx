'use client';

import { useState } from 'react';
import {
  Search, Save, RotateCcw, Check, Image as ImageIcon, Globe, Code2,
  Twitter, Facebook, BarChart3, FileText, Eye, Download, Upload,
  Link as LinkIcon, Bot, AlertCircle,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, SectionTitle, Button, Input, Select, ColorInput, Switch, Field, Textarea, Badge, Tabs, ImagePicker } from '../components/ui';
import { useSeo, type SeoSettings } from '../lib/cms';

type Tab = 'meta' | 'opengraph' | 'twitter' | 'structured' | 'robots' | 'analytics' | 'favicon';

export default function SeoPage() {
  const { seo, update, loaded, reset } = useSeo();
  const [tab, setTab] = useState<Tab>('meta');
  const [saved, setSaved] = useState(false);

  if (!loaded) return <Shell module="seo" title="SEO & Favicon"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const set = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) => { update((prev) => ({ ...prev, [key]: value })); flashSaved(); };

  const tabs: { key: Tab; label: string; icon: typeof Search }[] = [
    { key: 'meta', label: 'Meta Tags', icon: FileText },
    { key: 'opengraph', label: 'Open Graph', icon: Globe },
    { key: 'twitter', label: 'Twitter Cards', icon: Twitter },
    { key: 'structured', label: 'Structured Data', icon: Code2 },
    { key: 'robots', label: 'Robots & Sitemap', icon: Bot },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'favicon', label: 'Favicon Manager', icon: ImageIcon },
  ];

  const pageTitleLen = seo.metaTitle.length;
  const descLen = seo.metaDescription.length;

  return (
    <Shell title="SEO & Favicon" subtitle="Search engine optimization, social sharing, structured data, and favicon management">
      <div className="flex items-center justify-end mb-5">
        {saved && <span className="text-xs text-plum font-medium flex items-center gap-1 mr-3"><Check className="w-4 h-4" /> Saved</span>}
        <Button variant="outline" onClick={() => { reset(); flashSaved(); }}><RotateCcw className="w-4 h-4" /> Reset to defaults</Button>
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* META TAGS */}
      {tab === 'meta' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Search engine meta tags" />
            <div className="space-y-4">
              <Field label={`Page title (${pageTitleLen}/60 characters)`}>
                <Textarea value={seo.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} className="min-h-[50px]" />
                {pageTitleLen > 60 && <p className="text-[11px] text-coral mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Title exceeds recommended 60 characters — may be truncated in search results</p>}
              </Field>
              <Field label={`Meta description (${descLen}/160 characters)`}>
                <Textarea value={seo.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} className="min-h-[80px]" />
                {descLen > 160 && <p className="text-[11px] text-coral mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Description exceeds recommended 160 characters</p>}
              </Field>
              <Field label="Keywords (comma-separated)">
                <Textarea value={seo.keywords} onChange={(e) => set('keywords', e.target.value)} className="min-h-[50px]" />
              </Field>
              <Field label="Canonical URL">
                <Input value={seo.canonicalUrl} onChange={(e) => set('canonicalUrl', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Search result preview</h3>
            <div className="rounded-xl border border-line p-4 max-w-2xl">
              <div className="flex items-center gap-2 text-[11px] text-ink/40 mb-1">
                <div className="w-6 h-6 rounded-full bg-plum/10 flex items-center justify-center"><Globe className="w-3 h-3 text-plum" /></div>
                <span className="truncate">{seo.canonicalUrl.replace('https://', '').replace('http://', '')}</span>
              </div>
              <div className="text-lg text-sky-700 font-medium leading-snug truncate">{seo.metaTitle}</div>
              <div className="text-sm text-ink/60 mt-1 leading-snug line-clamp-2">{seo.metaDescription}</div>
            </div>
          </Card>
        </>
      )}

      {/* OPEN GRAPH */}
      {tab === 'opengraph' && (
        <Card className="p-5">
          <SectionTitle title="Open Graph (Facebook, LinkedIn, WhatsApp)" />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="OG site name"><Input value={seo.ogSiteName} onChange={(e) => set('ogSiteName', e.target.value)} /></Field>
              <Field label="OG type"><Select value={seo.ogType} onChange={(e) => set('ogType', e.target.value)}><option value="website">website</option><option value="article">article</option><option value="product">product</option></Select></Field>
            </div>
            <Field label="OG title"><Input value={seo.ogTitle} onChange={(e) => set('ogTitle', e.target.value)} /></Field>
            <Field label="OG description"><Textarea value={seo.ogDescription} onChange={(e) => set('ogDescription', e.target.value)} className="min-h-[60px]" /></Field>
            <ImagePicker
              label="OG image"
              hint="Shown when a page is shared on Facebook, LinkedIn or WhatsApp. 1200x630 is ideal."
              value={seo.ogImage}
              onChange={(e) => set('ogImage', e.target.value)}
            />
            <Field label="OG locale"><Input value={seo.ogLocale} onChange={(e) => set('ogLocale', e.target.value)} /></Field>
          </div>
          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Social card preview</h4>
            <div className="max-w-md rounded-xl border border-line overflow-hidden">
              <img src={seo.ogImage} alt="Social card" className="w-full max-h-56 object-cover" />
              <div className="p-3">
                <div className="text-[10px] text-ink/40 uppercase">{seo.canonicalUrl.replace('https://', '').replace('http://', '')}</div>
                <div className="text-sm font-semibold text-ink mt-1">{seo.ogTitle}</div>
                <div className="text-xs text-ink/55 mt-1 line-clamp-2">{seo.ogDescription}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TWITTER */}
      {tab === 'twitter' && (
        <Card className="p-5">
          <SectionTitle title="Twitter Card meta tags" />
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Card type">
                <Select value={seo.twitterCard} onChange={(e) => set('twitterCard', e.target.value as SeoSettings['twitterCard'])}>
                  <option value="summary">summary</option>
                  <option value="summary_large_image">summary_large_image</option>
                  <option value="app">app</option>
                  <option value="player">player</option>
                </Select>
              </Field>
              <Field label="Twitter @site handle"><Input value={seo.twitterSite} onChange={(e) => set('twitterSite', e.target.value)} /></Field>
            </div>
            <Field label="Twitter @creator handle"><Input value={seo.twitterCreator} onChange={(e) => set('twitterCreator', e.target.value)} /></Field>
            <div className="p-3 rounded-xl bg-canvas text-xs text-ink/50">
              <span className="font-medium text-ink/70">Note:</span> Twitter cards reuse the Open Graph title, description, and image when twitter-specific tags are not set. The card type controls how the preview looks in tweets.
            </div>
          </div>
        </Card>
      )}

      {/* STRUCTURED DATA */}
      {tab === 'structured' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Schema.org structured data" />
            <div className="space-y-4">
              <Field label="Structured data type">
                <Select value={seo.structuredDataType} onChange={(e) => set('structuredDataType', e.target.value as SeoSettings['structuredDataType'])}>
                  <option value="VeterinaryCare">VeterinaryCare</option>
                  <option value="LocalBusiness">LocalBusiness</option>
                  <option value="Organization">Organization</option>
                </Select>
              </Field>
              <Field label="JSON-LD structured data (Schema.org)">
                <Textarea rows={16} value={seo.structuredData} onChange={(e) => set('structuredData', e.target.value)} className="min-h-[280px] font-mono text-xs" />
              </Field>
              <div className="p-3 rounded-xl bg-canvas text-xs text-ink/50">
                <span className="font-medium text-ink/70">Tip:</span> Structured data helps Google understand your business type, hours, address, and ratings. This enables rich snippets in search results (star ratings, hours, phone number).
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Rich result eligibility</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { check: 'Business name and address', status: true },
                { check: 'Phone number', status: true },
                { check: 'Opening hours', status: true },
                { check: 'Aggregate rating (stars)', status: true },
                { check: 'Price range', status: true },
                { check: 'Website URL', status: true },
              ].map((c) => (
                <div key={c.check} className="flex items-center gap-2 p-3 rounded-xl border border-line">
                  <Check className="w-4 h-4 text-plum" />
                  <span className="text-sm text-ink flex-1">{c.check}</span>
                  <Badge status="Active" />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ROBOTS & SITEMAP */}
      {tab === 'robots' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Robots directives" />
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-line">
                <div><div className="text-sm font-medium text-ink">Allow search engines to index</div><div className="text-[11px] text-ink/50">When enabled, search engines can add your pages to their index</div></div>
                <Switch checked={seo.robotsIndex} onChange={(v) => set('robotsIndex', v)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-line">
                <div><div className="text-sm font-medium text-ink">Allow search engines to follow links</div><div className="text-[11px] text-ink/50">When enabled, crawlers will follow links on your pages</div></div>
                <Switch checked={seo.robotsFollow} onChange={(v) => set('robotsFollow', v)} />
              </div>
            </div>
          </Card>
          <Card className="p-5 mb-4">
            <SectionTitle title="Sitemap configuration" />
            <div className="flex items-center justify-between p-3 rounded-xl border border-line mb-4">
              <div><div className="text-sm font-medium text-ink">Enable XML sitemap</div><div className="text-[11px] text-ink/50">Automatically generate and update sitemap.xml for search engines</div></div>
              <Switch checked={seo.sitemapEnabled} onChange={(v) => set('sitemapEnabled', v)} />
            </div>
            {seo.sitemapEnabled && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-2">Sitemap URLs</div>
                {[
                  { url: `${seo.canonicalUrl}/`, priority: '1.0', freq: 'daily' },
                  { url: `${seo.canonicalUrl}/site`, priority: '0.9', freq: 'weekly' },
                  { url: `${seo.canonicalUrl}/login`, priority: '0.6', freq: 'monthly' },
                ].map((u) => (
                  <div key={u.url} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                    <LinkIcon className="w-4 h-4 text-plum shrink-0" />
                    <code className="text-xs font-mono text-ink flex-1 truncate">{u.url}</code>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-line text-ink/50">Priority: {u.priority}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-line text-ink/50">{u.freq}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">robots.txt preview</h3>
            <div className="rounded-xl bg-ink text-white p-4 font-mono text-xs overflow-x-auto">
              <div>User-agent: *</div>
              <div>{seo.robotsIndex ? 'Allow: /' : 'Disallow: /'}</div>
              <div>{seo.robotsFollow ? '' : 'nofollow'}</div>
              {seo.sitemapEnabled && <div className="mt-2">Sitemap: {seo.canonicalUrl}/sitemap.xml</div>}
            </div>
          </Card>
        </>
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && (
        <Card className="p-5">
          <SectionTitle title="Analytics & verification" />
          <div className="space-y-4">
            <Field label="Google Analytics 4 Measurement ID">
              <Input value={seo.googleAnalyticsId} onChange={(e) => set('googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" />
            </Field>
            <Field label="Google Search Console verification code">
              <Input value={seo.googleSearchConsole} onChange={(e) => set('googleSearchConsole', e.target.value)} placeholder="google-site-verification=..." />
            </Field>
            <div className="p-3 rounded-xl bg-canvas text-xs text-ink/50">
              <span className="font-medium text-ink/70">How to verify:</span> Add your domain in Google Search Console, copy the verification token, and paste it here. This proves ownership and unlocks search performance data.
            </div>
          </div>
        </Card>
      )}

      {/* FAVICON */}
      {tab === 'favicon' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Favicon & app icons" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ImagePicker
                label="Favicon (.ico or PNG, 32x32+)"
                hint="Upload a square icon, or point at one already hosted on your domain."
                value={seo.faviconUrl}
                onChange={(e) => set('faviconUrl', e.target.value)}
                aspect="aspect-square"
                maxPx={64}
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
              />
              <ImagePicker
                label="Apple Touch Icon (180x180 PNG)"
                hint="Used when someone adds the site to an iOS home screen."
                value={seo.appleTouchIconUrl}
                onChange={(e) => set('appleTouchIconUrl', e.target.value)}
                aspect="aspect-square"
                maxPx={180}
              />
              <ImagePicker
                label="Favicon 32x32 (PNG)"
                value={seo.favicon32Url}
                onChange={(e) => set('favicon32Url', e.target.value)}
                aspect="aspect-square"
                maxPx={32}
              />
              <ImagePicker
                label="Favicon 16x16 (PNG)"
                value={seo.favicon16Url}
                onChange={(e) => set('favicon16Url', e.target.value)}
                aspect="aspect-square"
                maxPx={16}
              />
            </div>
          </Card>
          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Icon preview</h3>
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { label: 'Browser tab (16px)', url: seo.favicon16Url, size: 'w-4 h-4' },
                { label: 'Desktop (32px)', url: seo.favicon32Url, size: 'w-8 h-8' },
                { label: 'Apple Touch (180px)', url: seo.appleTouchIconUrl, size: 'w-12 h-12' },
              ].map((ic) => (
                <div key={ic.label} className="text-center">
                  <div className="w-20 h-20 rounded-xl border border-line bg-canvas flex items-center justify-center mb-2">
                    <img src={ic.url} alt={ic.label} className={ic.size} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                  <div className="text-[10px] text-ink/50">{ic.label}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 mb-4">
            <SectionTitle title="Web App Manifest" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="App name"><Input value={seo.webManifestName} onChange={(e) => set('webManifestName', e.target.value)} /></Field>
              <Field label="Short name"><Input value={seo.webManifestShortName} onChange={(e) => set('webManifestShortName', e.target.value)} /></Field>
              <Field label="Theme color">
                <ColorInput value={seo.themeColor} onChange={(e) => set('themeColor', e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Generated head tags preview</h3>
            <div className="rounded-xl bg-ink text-white p-4 font-mono text-xs overflow-x-auto leading-relaxed">
              <div>&lt;link rel="icon" href="{seo.faviconUrl}" /&gt;</div>
              <div>&lt;link rel="icon" type="image/png" sizes="32x32" href="{seo.favicon32Url}" /&gt;</div>
              <div>&lt;link rel="icon" type="image/png" sizes="16x16" href="{seo.favicon16Url}" /&gt;</div>
              <div>&lt;link rel="apple-touch-icon" sizes="180x180" href="{seo.appleTouchIconUrl}" /&gt;</div>
              <div>&lt;link rel="manifest" href="/manifest.json" /&gt;</div>
              <div>&lt;meta name="theme-color" content="{seo.themeColor}" /&gt;</div>
              <div className="mt-2">&lt;meta property="og:title" content="{seo.ogTitle}" /&gt;</div>
              <div>&lt;meta property="og:description" content="{seo.ogDescription}" /&gt;</div>
              <div>&lt;meta property="og:image" content="{seo.ogImage}" /&gt;</div>
              <div>&lt;meta name="twitter:card" content="{seo.twitterCard}" /&gt;</div>
              <div>&lt;script type="application/ld+json"&gt;{seo.structuredDataType} schema&lt;/script&gt;</div>
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}
