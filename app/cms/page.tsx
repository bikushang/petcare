'use client';

import { useState } from 'react';
import {
  Globe, Save, RotateCcw, Plus, Trash2, Eye, Star, ArrowRight,
  Stethoscope, Syringe, FlaskConical, Pill, Scissors, Hotel, PawPrint,
  Image as ImageIcon, Type, Navigation as NavIcon, MessageSquare,
  Phone, Check, AlertCircle,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, SectionTitle, Button, Input, Select, Field, Textarea, Badge, Modal, EmptyState, Tabs, ImagePicker } from '../components/ui';
import { useCms, type CmsContent } from '../lib/cms';
import Link from 'next/link';

type Tab = 'hero' | 'services' | 'about' | 'testimonials' | 'contact' | 'nav' | 'footer';

const serviceIcons = ['Stethoscope', 'Syringe', 'FlaskConical', 'Pill', 'Scissors', 'Hotel', 'PawPrint'];

export default function CmsPage() {
  const { content, update, loaded, reset } = useCms();
  const [tab, setTab] = useState<Tab>('hero');
  const [saved, setSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (!loaded) return <Shell module="cms" title="Website & CMS"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const set = <K extends keyof CmsContent>(key: K, value: CmsContent[K]) => { update((prev) => ({ ...prev, [key]: value })); flashSaved(); };

  const tabs: { key: Tab; label: string; icon: typeof Globe }[] = [
    { key: 'hero', label: 'Hero Section', icon: Type },
    { key: 'services', label: 'Services', icon: Stethoscope },
    { key: 'about', label: 'About', icon: PawPrint },
    { key: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { key: 'contact', label: 'Contact', icon: Phone },
    { key: 'nav', label: 'Navigation', icon: NavIcon },
    { key: 'footer', label: 'Footer', icon: Globe },
  ];

  return (
    <Shell title="Website & CMS" subtitle="Manage all content, images, and labels of your public-facing website">
      {/* Preview bar */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/site" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sm font-medium text-ink hover:bg-canvas transition-all">
          <Eye className="w-4 h-4" /> View live website
        </Link>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-plum font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
          <Button variant="outline" onClick={() => setResetOpen(true)}><RotateCcw className="w-4 h-4" /> Reset to defaults</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* HERO */}
      {tab === 'hero' && (
        <Card className="p-5">
          <SectionTitle title="Hero section" />
          <div className="space-y-4">
            <Field label="Badge text (small label above title)"><Input value={content.hero.badge} onChange={(e) => set('hero', { ...content.hero, badge: e.target.value })} /></Field>
            <Field label="Main headline"><Textarea value={content.hero.title} onChange={(e) => set('hero', { ...content.hero, title: e.target.value })} className="min-h-[60px]" /></Field>
            <Field label="Subtitle paragraph"><Textarea value={content.hero.subtitle} onChange={(e) => set('hero', { ...content.hero, subtitle: e.target.value })} className="min-h-[80px]" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary button label"><Input value={content.hero.ctaPrimary} onChange={(e) => set('hero', { ...content.hero, ctaPrimary: e.target.value })} /></Field>
              <Field label="Secondary button label"><Input value={content.hero.ctaSecondary} onChange={(e) => set('hero', { ...content.hero, ctaSecondary: e.target.value })} /></Field>
            </div>
            <ImagePicker
              label="Hero image"
              hint="Shown beside the headline on the home page. Landscape works best."
              value={content.hero.heroImage}
              onChange={(e) => set('hero', { ...content.hero, heroImage: e.target.value })}
            />
          </div>
        </Card>
      )}

      {/* SERVICES */}
      {tab === 'services' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Services section header" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Section title"><Input value={content.services.sectionTitle} onChange={(e) => set('services', { ...content.services, sectionTitle: e.target.value })} /></Field>
              <Field label="Section subtitle"><Input value={content.services.sectionSubtitle} onChange={(e) => set('services', { ...content.services, sectionSubtitle: e.target.value })} /></Field>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Service items ({content.services.items.length})</h3>
              <Button size="sm" onClick={() => set('services', { ...content.services, items: [...content.services.items, { id: `svc-${Date.now()}`, icon: 'PawPrint', title: 'New service', description: 'Service description' }] })}>
                <Plus className="w-3.5 h-3.5" /> Add service
              </Button>
            </div>
            <div className="space-y-3">
              {content.services.items.map((svc, i) => (
                <div key={svc.id} className="p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/50">#{i + 1}</span>
                    <button onClick={() => set('services', { ...content.services, items: content.services.items.filter((s) => s.id !== svc.id) })} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Icon">
                      <Select value={svc.icon} onChange={(e) => set('services', { ...content.services, items: content.services.items.map((s) => s.id === svc.id ? { ...s, icon: e.target.value } : s) })}>
                        {serviceIcons.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                      </Select>
                    </Field>
                    <Field label="Title"><Input value={svc.title} onChange={(e) => set('services', { ...content.services, items: content.services.items.map((s) => s.id === svc.id ? { ...s, title: e.target.value } : s) })} /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Description"><Textarea value={svc.description} onChange={(e) => set('services', { ...content.services, items: content.services.items.map((s) => s.id === svc.id ? { ...s, description: e.target.value } : s) })} className="min-h-[50px]" /></Field>
                  </div>
                </div>
              ))}
              {content.services.items.length === 0 && <EmptyState icon={Stethoscope} title="No services" hint="Add services to showcase on your website" />}
            </div>
          </Card>
        </>
      )}

      {/* ABOUT */}
      {tab === 'about' && (
        <Card className="p-5">
          <SectionTitle title="About section" />
          <div className="space-y-4">
            <Field label="Section title"><Input value={content.about.sectionTitle} onChange={(e) => set('about', { ...content.about, sectionTitle: e.target.value })} /></Field>
            <Field label="Paragraph 1"><Textarea value={content.about.paragraph1} onChange={(e) => set('about', { ...content.about, paragraph1: e.target.value })} className="min-h-[80px]" /></Field>
            <Field label="Paragraph 2"><Textarea value={content.about.paragraph2} onChange={(e) => set('about', { ...content.about, paragraph2: e.target.value })} className="min-h-[80px]" /></Field>
            <ImagePicker
              label="About image"
              hint="Used in the clinic story section on the home and About pages."
              value={content.about.aboutImage}
              onChange={(e) => set('about', { ...content.about, aboutImage: e.target.value })}
            />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Stats</span>
                <Button size="sm" onClick={() => set('about', { ...content.about, stats: [...content.about.stats, { id: `stat-${Date.now()}`, label: 'New stat', value: '0' }] })}>
                  <Plus className="w-3.5 h-3.5" /> Add stat
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {content.about.stats.map((stat) => (
                  <div key={stat.id} className="p-3 rounded-xl border border-line">
                    <Input className="text-center text-lg font-bold" value={stat.value} onChange={(e) => set('about', { ...content.about, stats: content.about.stats.map((s) => s.id === stat.id ? { ...s, value: e.target.value } : s) })} />
                    <Input className="mt-2 text-center text-xs" value={stat.label} onChange={(e) => set('about', { ...content.about, stats: content.about.stats.map((s) => s.id === stat.id ? { ...s, label: e.target.value } : s) })} />
                    <button onClick={() => set('about', { ...content.about, stats: content.about.stats.filter((s) => s.id !== stat.id) })} className="mt-2 w-full text-[10px] text-coral hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TESTIMONIALS */}
      {tab === 'testimonials' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Testimonials section header" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Section title"><Input value={content.testimonials.sectionTitle} onChange={(e) => set('testimonials', { ...content.testimonials, sectionTitle: e.target.value })} /></Field>
              <Field label="Section subtitle"><Input value={content.testimonials.sectionSubtitle} onChange={(e) => set('testimonials', { ...content.testimonials, sectionSubtitle: e.target.value })} /></Field>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Testimonials ({content.testimonials.items.length})</h3>
              <Button size="sm" onClick={() => set('testimonials', { ...content.testimonials, items: [...content.testimonials.items, { id: `tst-${Date.now()}`, name: 'New client', pet: 'Pet name', text: 'Review text', rating: 5 }] })}>
                <Plus className="w-3.5 h-3.5" /> Add testimonial
              </Button>
            </div>
            <div className="space-y-3">
              {content.testimonials.items.map((tst) => (
                <div key={tst.id} className="p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button key={i} onClick={() => set('testimonials', { ...content.testimonials, items: content.testimonials.items.map((t) => t.id === tst.id ? { ...t, rating: i + 1 } : t) })}>
                          <Star className={`w-4 h-4 ${i < tst.rating ? 'fill-amber-400 text-amber-400' : 'text-ink/20'}`} />
                        </button>
                      ))}
                    </div>
                    <button onClick={() => set('testimonials', { ...content.testimonials, items: content.testimonials.items.filter((t) => t.id !== tst.id) })} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Client name"><Input value={tst.name} onChange={(e) => set('testimonials', { ...content.testimonials, items: content.testimonials.items.map((t) => t.id === tst.id ? { ...t, name: e.target.value } : t) })} /></Field>
                    <Field label="Pet info"><Input value={tst.pet} onChange={(e) => set('testimonials', { ...content.testimonials, items: content.testimonials.items.map((t) => t.id === tst.id ? { ...t, pet: e.target.value } : t) })} /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Review text"><Textarea value={tst.text} onChange={(e) => set('testimonials', { ...content.testimonials, items: content.testimonials.items.map((t) => t.id === tst.id ? { ...t, text: e.target.value } : t) })} className="min-h-[60px]" /></Field>
                  </div>
                </div>
              ))}
              {content.testimonials.items.length === 0 && <EmptyState icon={MessageSquare} title="No testimonials" hint="Add client reviews to build trust" />}
            </div>
          </Card>
        </>
      )}

      {/* CONTACT */}
      {tab === 'contact' && (
        <Card className="p-5">
          <SectionTitle title="Contact section" />
          <div className="space-y-4">
            <Field label="Section title"><Input value={content.contact.sectionTitle} onChange={(e) => set('contact', { ...content.contact, sectionTitle: e.target.value })} /></Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Phone"><Input value={content.contact.phone} onChange={(e) => set('contact', { ...content.contact, phone: e.target.value })} /></Field>
              <Field label="Email"><Input value={content.contact.email} onChange={(e) => set('contact', { ...content.contact, email: e.target.value })} /></Field>
            </div>
            <Field label="Address"><Input value={content.contact.address} onChange={(e) => set('contact', { ...content.contact, address: e.target.value })} /></Field>
            <Field label="Opening hours (one per line)"><Textarea value={content.contact.hours} onChange={(e) => set('contact', { ...content.contact, hours: e.target.value })} className="min-h-[80px]" /></Field>
            <ImagePicker
              label="Map / location image"
              hint="Appears in the Find us section on the Contact page."
              value={content.contact.mapImage}
              onChange={(e) => set('contact', { ...content.contact, mapImage: e.target.value })}
            />
          </div>
        </Card>
      )}

      {/* NAV */}
      {tab === 'nav' && (
        <Card className="p-5">
          <SectionTitle title="Navigation links" />
          <div className="space-y-3">
            {content.nav.links.map((link, i) => (
              <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/50">#{i + 1}</span>
                <Input className="flex-1" value={link.label} onChange={(e) => set('nav', { ...content.nav, links: content.nav.links.map((l) => l.id === link.id ? { ...l, label: e.target.value } : l) })} placeholder="Label" />
                <Input className="flex-1" value={link.url} onChange={(e) => set('nav', { ...content.nav, links: content.nav.links.map((l) => l.id === link.id ? { ...l, url: e.target.value } : l) })} placeholder="URL (#home, #services...)" />
                <button onClick={() => set('nav', { ...content.nav, links: content.nav.links.filter((l) => l.id !== link.id) })} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button size="sm" onClick={() => set('nav', { ...content.nav, links: [...content.nav.links, { id: `nav-${Date.now()}`, label: 'New link', url: '#' }] })}>
              <Plus className="w-3.5 h-3.5" /> Add navigation link
            </Button>
          </div>
        </Card>
      )}

      {/* FOOTER */}
      {tab === 'footer' && (
        <Card className="p-5">
          <SectionTitle title="Footer content" />
          <div className="space-y-4">
            <Field label="Tagline"><Input value={content.footer.tagline} onChange={(e) => set('footer', { ...content.footer, tagline: e.target.value })} /></Field>
            <Field label="Copyright text"><Input value={content.footer.copyright} onChange={(e) => set('footer', { ...content.footer, copyright: e.target.value })} /></Field>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Social media links</span>
                <Button size="sm" onClick={() => set('footer', { ...content.footer, socialLinks: [...content.footer.socialLinks, { id: `soc-${Date.now()}`, platform: 'Facebook', url: '' }] })}>
                  <Plus className="w-3.5 h-3.5" /> Add link
                </Button>
              </div>
              <div className="space-y-2">
                {content.footer.socialLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                    <Select value={link.platform} onChange={(e) => set('footer', { ...content.footer, socialLinks: content.footer.socialLinks.map((s) => s.id === link.id ? { ...s, platform: e.target.value } : s) })} className="w-36">
                      <option value="Facebook">Facebook</option><option value="Instagram">Instagram</option><option value="X">X</option><option value="YouTube">YouTube</option><option value="LinkedIn">LinkedIn</option>
                    </Select>
                    <Input className="flex-1" value={link.url} onChange={(e) => set('footer', { ...content.footer, socialLinks: content.footer.socialLinks.map((s) => s.id === link.id ? { ...s, url: e.target.value } : s) })} placeholder="https://..." />
                    <button onClick={() => set('footer', { ...content.footer, socialLinks: content.footer.socialLinks.filter((s) => s.id !== link.id) })} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all website content?">
        <div className="space-y-4">
          <p className="text-sm text-ink/60">This will restore all content, images, and labels to their default values. Your custom changes will be lost.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { reset(); setResetOpen(false); flashSaved(); }}>Reset everything</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
