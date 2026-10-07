'use client';

import { useMemo, useState } from 'react';
import {
  Megaphone, Users, Cake, Syringe, Star, Gift, Share2, Crown,
  MessageSquare, TrendingUp, Phone, Mail, Plus, Edit2, Trash2,
  Send, CalendarClock, Award, Heart, ArrowRight, Filter, X,
  CheckCircle2, AlertCircle, Clock, Target, Zap, ThumbsUp,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, inputCls, Select, Textarea, Badge, StatCard } from '../components/ui';
import { useDB, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateBusinessInsight } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

type Tab = 'overview' | 'campaigns' | 'segments' | 'birthdays' | 'vaccines' | 'loyalty' | 'referrals' | 'membership' | 'feedback' | 'retention' | 'communication';

type Campaign = {
  id: string;
  name: string;
  type: 'Email' | 'SMS' | 'Social' | 'Direct mail' | 'Event';
  status: 'Draft' | 'Scheduled' | 'Active' | 'Completed' | 'Paused';
  startDate: string;
  endDate: string;
  targetSegment: string;
  budget: number;
  spent: number;
  reach: number;
  opens: number;
  clicks: number;
  conversions: number;
  notes: string;
};

type Segment = {
  id: string;
  name: string;
  criteria: string;
  count: number;
  description: string;
  color: string;
};

const blankCampaign = (): Campaign => ({
  id: '', name: '', type: 'Email', status: 'Draft', startDate: today(),
  endDate: '', targetSegment: 'All clients', budget: 0, spent: 0,
  reach: 0, opens: 0, clicks: 0, conversions: 0, notes: '',
});

const seedCampaigns: Campaign[] = [
  {
    id: 'camp_1', name: 'Spring Vaccination Drive', type: 'Email', status: 'Active',
    startDate: '2026-03-01', endDate: '2026-04-15', targetSegment: 'Due for vaccines',
    budget: 500, spent: 180, reach: 340, opens: 218, clicks: 72, conversions: 45,
    notes: 'Email reminder sequence for overdue vaccinations with 15% discount on core vaccines.',
  },
  {
    id: 'camp_2', name: 'Senior Pet Wellness Month', type: 'SMS', status: 'Scheduled',
    startDate: '2026-11-01', endDate: '2026-11-30', targetSegment: 'Senior pet owners',
    budget: 300, spent: 0, reach: 0, opens: 0, clicks: 0, conversions: 0,
    notes: 'Free bloodwork screening for pets 7+ years old during November.',
  },
  {
    id: 'camp_3', name: 'New Client Welcome Series', type: 'Email', status: 'Active',
    startDate: '2026-01-01', endDate: '2026-12-31', targetSegment: 'New clients (90 days)',
    budget: 200, spent: 95, reach: 88, opens: 74, clicks: 31, conversions: 22,
    notes: '3-part onboarding sequence introducing clinic services, loyalty program, and first discount.',
  },
  {
    id: 'camp_4', name: 'Holiday Boarding Promo', type: 'Social', status: 'Completed',
    startDate: '2025-12-01', endDate: '2025-12-23', targetSegment: 'Previous boarders',
    budget: 400, spent: 400, reach: 520, opens: 390, clicks: 156, conversions: 89,
    notes: 'Facebook + Instagram ads promoting holiday boarding packages. Strong ROI.',
  },
];

const seedSegments: Segment[] = [
  { id: 'seg_1', name: 'VIP Members', criteria: 'membershipPlan = VIP', count: 0, description: 'Clients on the VIP membership tier', color: 'amber' },
  { id: 'seg_2', name: 'Due for vaccines', criteria: 'vaccination.status = Overdue or Pending', count: 0, description: 'Pets with overdue or pending vaccinations', color: 'coral' },
  { id: 'seg_3', name: 'Senior pet owners', criteria: 'pet.age > 7 years', count: 0, description: 'Owners with pets aged 7 years or older', color: 'sky' },
  { id: 'seg_4', name: 'New clients (90 days)', criteria: 'owner.createdAt < 90 days', count: 0, description: 'Clients who joined in the last 90 days', color: 'sage' },
  { id: 'seg_5', name: 'Inactive clients (6mo+)', criteria: 'lastVisit > 180 days', count: 0, description: 'Clients with no visits in 6+ months', color: 'ink' },
  { id: 'seg_6', name: 'High loyalty points', criteria: 'loyaltyPoints > 500', count: 0, description: 'Clients with 500+ loyalty points', color: 'amber' },
];

const membershipPlans = [
  { name: 'None', price: 0, perks: ['Standard appointment booking'], color: 'bg-ink/10 text-ink/60' },
  { name: 'Basic', price: 15, perks: ['10% off consultations', 'Free vaccination reminders', 'Birthday pet treat'], color: 'bg-sky-100 text-sky-700' },
  { name: 'Premium', price: 35, perks: ['15% off all services', '2 free grooming sessions/yr', 'Priority booking', 'Quarterly health check'], color: 'bg-mint text-sage' },
  { name: 'VIP', price: 75, perks: ['20% off all services', 'Unlimited grooming', '24/7 emergency hotline', 'Free annual bloodwork', 'Concierge vet'], color: 'bg-amber-100 text-amber-700' },
];

export default function CRMPage() {
  const { db } = useDB();
  const [tab, setTab] = useState<Tab>('overview');
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns);
  const [segments, setSegments] = useState<Segment[]>(seedSegments);
  const [campOpen, setCampOpen] = useState(false);
  const [editCamp, setEditCamp] = useState<Campaign | null>(null);
  const [campForm, setCampForm] = useState(blankCampaign());
  const [segOpen, setSegOpen] = useState(false);
  const [segForm, setSegForm] = useState({ name: '', criteria: '', description: '', color: 'sage' });
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  if (!db) return <Shell title="CRM & Marketing"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  // ── Derived CRM data ──
  const todayStr = today();

  // Birthday reminders (pet birthDates in next 30 days)
  const petBirthdays = db.pets
    .map((p) => {
      if (!p.birthDate) return null;
      const birth = new Date(p.birthDate);
      const now = new Date();
      const thisYearBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      const diffDays = Math.ceil((thisYearBirthday.getTime() - now.getTime()) / 86400000);
      const owner = db.owners.find((o) => o.id === p.ownerId);
      return { pet: p, owner, diffDays, birthday: thisYearBirthday };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.diffDays >= -1 && x.diffDays <= 30)
    .sort((a, b) => a.diffDays - b.diffDays);

  // Vaccination reminders
  const vaccineReminders = db.vaccinations
    .map((v) => {
      const pet = db.pets.find((p) => p.id === v.petId);
      const owner = db.owners.find((o) => o.id === v.ownerId || (pet && o.id === pet.ownerId));
      const isOverdue = v.status === 'Overdue' || (v.status === 'Pending' && v.nextDueDate && v.nextDueDate < todayStr);
      const daysUntilDue = v.nextDueDate ? Math.ceil((new Date(v.nextDueDate).getTime() - Date.now()) / 86400000) : null;
      return { v, pet, owner, isOverdue, daysUntilDue };
    })
    .filter((x) => x.pet && (x.isOverdue || (x.daysUntilDue !== null && x.daysUntilDue <= 30)))
    .sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999));

  // Loyalty program data
  const loyaltyData = db.owners
    .map((o) => {
      const ownerAppts = db.appointments.filter((a) => a.ownerId === o.id);
      const totalSpent = db.invoices
        .filter((i) => i.ownerId === o.id && i.status === 'Paid')
        .reduce((s, i) => s + i.items.reduce((ss, it) => ss + it.qty * it.unitPrice, 0), 0);
      return { owner: o, visits: ownerAppts.length, points: o.loyaltyPoints, totalSpent };
    })
    .sort((a, b) => b.points - a.points);

  // Referral data (derived from how clients found the clinic - using notes/createdAt)
  const referrals = db.owners
    .filter((o) => o.loyaltyPoints > 100)
    .slice(0, 10)
    .map((o) => {
      const referredClients = db.owners
        .filter((other) => other.id !== o.id && other.notes?.includes(o.name))
        .length;
      return { owner: o, referredCount: Math.max(referredClients, Math.floor(o.loyaltyPoints / 200)) };
    });

  // Membership distribution
  const membershipStats = membershipPlans.map((plan) => ({
    ...plan,
    count: db.owners.filter((o) => o.membershipPlan === plan.name).length,
  }));

  // Feedback
  const allFeedback = db.owners
    .flatMap((o) => (o.feedback || []).map((f) => ({ ...f, ownerName: o.name })))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Retention tracking
  const totalOwners = db.owners.length;
  const returningOwners = db.owners.filter((o) => {
    const ownerAppts = db.appointments.filter((a) => a.ownerId === o.id);
    return ownerAppts.length > 1;
  }).length;
  const retentionRate = totalOwners > 0 ? Math.round((returningOwners / totalOwners) * 100) : 0;
  const inactiveOwners = db.owners.filter((o) => {
    const ownerAppts = db.appointments.filter((a) => a.ownerId === o.id);
    if (ownerAppts.length === 0) return false;
    const lastAppt = ownerAppts.sort((a, b) => b.date.localeCompare(a.date))[0];
    const daysSince = Math.ceil((Date.now() - new Date(lastAppt.date).getTime()) / 86400000);
    return daysSince > 180;
  });

  // Communication history
  const allComms = db.owners
    .flatMap((o) => (o.communicationLog || []).map((c) => ({ ...c, ownerName: o.name, ownerId: o.id })))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Update segment counts
  const segmentsWithCounts = segments.map((s) => {
    let count = 0;
    if (s.name.includes('VIP')) count = db.owners.filter((o) => o.membershipPlan === 'VIP').length;
    else if (s.name.includes('vaccine')) count = vaccineReminders.length;
    else if (s.name.includes('Senior')) count = db.pets.filter((p) => {
      if (!p.birthDate) return false;
      const months = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
      return months >= 84;
    }).length;
    else if (s.name.includes('New clients')) count = db.owners.filter((o) => {
      const days = Math.ceil((Date.now() - new Date(o.createdAt).getTime()) / 86400000);
      return days < 90;
    }).length;
    else if (s.name.includes('Inactive')) count = inactiveOwners.length;
    else if (s.name.includes('loyalty')) count = db.owners.filter((o) => o.loyaltyPoints > 500).length;
    return { ...s, count };
  });

  // Campaign stats
  const activeCampaigns = campaigns.filter((c) => c.status === 'Active');
  const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const avgConversionRate = totalReach > 0 ? ((totalConversions / totalReach) * 100).toFixed(1) : '0';

  // ── Campaign handlers ──
  const setCamp = (k: string, v: string | number) => setCampForm((f) => ({ ...f, [k]: v }));
  const openNewCamp = () => { setEditCamp(null); setCampForm(blankCampaign()); setCampOpen(true); };
  const openEditCamp = (c: Campaign) => {
    setEditCamp(c);
    setCampForm({ ...c });
    setCampOpen(true);
  };
  const saveCamp = () => {
    if (!campForm.name) return;
    if (editCamp) {
      setCampaigns((prev) => prev.map((c) => c.id === editCamp.id ? campForm : c));
    } else {
      setCampaigns((prev) => [...prev, { ...campForm, id: newId('camp') }]);
    }
    setCampOpen(false);
    setEditCamp(null);
  };
  const deleteCamp = (id: string) => setCampaigns((prev) => prev.filter((c) => c.id !== id));

  // ── Segment handlers ──
  const openNewSeg = () => { setSegForm({ name: '', criteria: '', description: '', color: 'sage' }); setSegOpen(true); };
  const saveSeg = () => {
    if (!segForm.name) return;
    setSegments((prev) => [...prev, { ...segForm, id: newId('seg'), count: 0 }]);
    setSegOpen(false);
  };
  const deleteSeg = (id: string) => setSegments((prev) => prev.filter((s) => s.id !== id));

  const tabs: { key: Tab; label: string; icon: typeof Megaphone }[] = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { key: 'segments', label: 'Segments', icon: Users },
    { key: 'birthdays', label: 'Birthdays', icon: Cake },
    { key: 'vaccines', label: 'Vax Reminders', icon: Syringe },
    { key: 'loyalty', label: 'Loyalty', icon: Star },
    { key: 'referrals', label: 'Referrals', icon: Share2 },
    { key: 'membership', label: 'Membership', icon: Crown },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare },
    { key: 'retention', label: 'Retention', icon: Heart },
    { key: 'communication', label: 'Communication', icon: Phone },
  ];

  const segColors: Record<string, string> = {
    sage: 'bg-mint text-sage',
    coral: 'bg-coral/15 text-coral',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    ink: 'bg-ink/10 text-ink/60',
  };

  return (
    <Shell title="CRM & Marketing" subtitle="Customer engagement, campaigns, loyalty, and retention">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-sage text-sage' : 'border-transparent text-ink/50 hover:text-ink'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {aiSuggestion && (
        <div className="mb-5">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      {/* ════════════════════════════════════════════
          OVERVIEW TAB
         ════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
            <StatCard icon={Users} label="Total clients" value={db.owners.length} sub="Registered" tone="sage" />
            <StatCard icon={Megaphone} label="Active campaigns" value={activeCampaigns.length} sub={`${campaigns.length} total`} tone="coral" />
            <StatCard icon={Cake} label="Upcoming birthdays" value={petBirthdays.length} sub="Next 30 days" tone="amber" />
            <StatCard icon={Syringe} label="Vax reminders" value={vaccineReminders.length} sub="Due/overdue" tone="coral" />
            <StatCard icon={Heart} label="Retention rate" value={`${retentionRate}%`} sub={`${returningOwners} returning`} tone="sage" />
            <StatCard icon={Target} label="Conversion rate" value={`${avgConversionRate}%`} sub={`${totalConversions} conversions`} tone="sky" />
          </div>

          <div className="flex justify-end mb-4">
            <AISuggestionButton onClick={() => {
              const rev = db.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.items.reduce((ss, it) => ss + it.qty * it.unitPrice, 0), 0);
              const out = db.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.items.reduce((ss, it) => ss + it.qty * it.unitPrice, 0), 0);
              const comp = db.appointments.filter(a => a.status === 'Completed').length;
              setAiSuggestion(generateBusinessInsight(rev, out, db.appointments.length, comp, db.staff.length, db.pets.length));
            }} label="AI Marketing Insight" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Active campaigns</h3>
                <button onClick={() => setTab('campaigns')} className="text-xs text-sage font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-3">
                {activeCampaigns.length === 0 ? (
                  <div className="text-center py-6 text-sm text-ink/50">No active campaigns.</div>
                ) : activeCampaigns.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-canvas">
                    <div className="w-9 h-9 rounded-lg bg-coral/15 text-coral flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{c.name}</div>
                      <div className="text-[11px] text-ink/50">{c.type} · {c.reach} reached · {c.conversions} conversions</div>
                    </div>
                    <Badge status={c.status} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Customer segments</h3>
                <button onClick={() => setTab('segments')} className="text-xs text-sage font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {segmentsWithCounts.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
                    <div className={`w-3 h-3 rounded-full ${segColors[s.color] || segColors.sage}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{s.name}</div>
                      <div className="text-[11px] text-ink/50 truncate">{s.criteria}</div>
                    </div>
                    <span className="text-sm font-semibold text-ink">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Upcoming birthdays</h3>
                <button onClick={() => setTab('birthdays')} className="text-xs text-sage font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {petBirthdays.slice(0, 4).map(({ pet, owner, diffDays }) => (
                  <div key={pet.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
                    <Cake className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{pet.name}</div>
                      <div className="text-[11px] text-ink/50">{owner?.name}</div>
                    </div>
                    <span className={`text-[11px] font-medium ${diffDays === 0 ? 'text-coral' : diffDays <= 7 ? 'text-amber-600' : 'text-ink/50'}`}>
                      {diffDays === 0 ? 'Today!' : diffDays < 0 ? 'Yesterday' : `In ${diffDays}d`}
                    </span>
                  </div>
                ))}
                {petBirthdays.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No upcoming birthdays.</div>}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Membership distribution</h3>
                <button onClick={() => setTab('membership')} className="text-xs text-sage font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2.5">
                {membershipStats.map((m) => {
                  const pct = totalOwners > 0 ? (m.count / totalOwners) * 100 : 0;
                  return (
                    <div key={m.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-ink">{m.name}</span>
                        <span className="text-xs text-ink/50">{m.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-line overflow-hidden">
                        <div className="h-full rounded-full bg-sage" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          CAMPAIGNS TAB
         ════════════════════════════════════════════ */}
      {tab === 'campaigns' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewCamp}><Plus className="w-4 h-4" /> New campaign</Button>
          </div>
          {campaigns.length === 0 ? (
            <Card><EmptyState icon={Megaphone} title="No campaigns" hint="Create your first marketing campaign to engage clients." /></Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const convRate = c.reach > 0 ? ((c.conversions / c.reach) * 100).toFixed(1) : '0';
                const openRate = c.reach > 0 ? ((c.opens / c.reach) * 100).toFixed(0) : '0';
                const budgetUsed = c.budget > 0 ? ((c.spent / c.budget) * 100).toFixed(0) : '0';
                return (
                  <Card key={c.id} className="p-4 group hover:ring-2 hover:ring-sage/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center shrink-0">
                          <Megaphone className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-ink">{c.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/60">{c.type}</span>
                          </div>
                          <div className="text-[11px] text-ink/50 mt-0.5">
                            {c.startDate} → {c.endDate || 'Ongoing'} · Target: {c.targetSegment}
                          </div>
                          {c.notes && <div className="text-[11px] text-ink/60 mt-1.5 leading-relaxed">{c.notes}</div>}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Reach</div>
                              <div className="text-sm font-semibold text-ink">{c.reach}</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Open rate</div>
                              <div className="text-sm font-semibold text-ink">{openRate}%</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Clicks</div>
                              <div className="text-sm font-semibold text-ink">{c.clicks}</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Conversions</div>
                              <div className="text-sm font-semibold text-sage">{c.conversions} ({convRate}%)</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Budget</div>
                              <div className="text-sm font-semibold text-ink">${c.spent}/${c.budget} ({budgetUsed}%)</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge status={c.status} />
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditCamp(c)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCamp(c.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Modal open={campOpen} onClose={() => { setCampOpen(false); setEditCamp(null); }} title={editCamp ? 'Edit campaign' : 'New campaign'} wide>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Campaign name"><input className={inputCls} value={campForm.name} onChange={(e) => setCamp('name', e.target.value)} placeholder="Spring Vaccination Drive" /></Field>
                <Field label="Type">
                  <Select value={campForm.type} onChange={(e) => setCamp('type', e.target.value)}>
                    {['Email', 'SMS', 'Social', 'Direct mail', 'Event'].map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={campForm.status} onChange={(e) => setCamp('status', e.target.value)}>
                    {['Draft', 'Scheduled', 'Active', 'Completed', 'Paused'].map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Target segment"><input className={inputCls} value={campForm.targetSegment} onChange={(e) => setCamp('targetSegment', e.target.value)} placeholder="Due for vaccines" /></Field>
                <Field label="Start date"><input type="date" className={inputCls} value={campForm.startDate} onChange={(e) => setCamp('startDate', e.target.value)} /></Field>
                <Field label="End date"><input type="date" className={inputCls} value={campForm.endDate} onChange={(e) => setCamp('endDate', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Budget ($)"><input type="number" className={inputCls} value={String(campForm.budget)} onChange={(e) => setCamp('budget', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Spent ($)"><input type="number" className={inputCls} value={String(campForm.spent)} onChange={(e) => setCamp('spent', parseFloat(e.target.value) || 0)} /></Field>
                <Field label="Reach"><input type="number" className={inputCls} value={String(campForm.reach)} onChange={(e) => setCamp('reach', parseInt(e.target.value) || 0)} /></Field>
                <Field label="Opens"><input type="number" className={inputCls} value={String(campForm.opens)} onChange={(e) => setCamp('opens', parseInt(e.target.value) || 0)} /></Field>
                <Field label="Clicks"><input type="number" className={inputCls} value={String(campForm.clicks)} onChange={(e) => setCamp('clicks', parseInt(e.target.value) || 0)} /></Field>
                <Field label="Conversions"><input type="number" className={inputCls} value={String(campForm.conversions)} onChange={(e) => setCamp('conversions', parseInt(e.target.value) || 0)} /></Field>
              </div>
              <Field label="Notes"><Textarea value={campForm.notes} onChange={(e) => setCamp('notes', e.target.value)} placeholder="Campaign strategy, goals, and notes…" className="min-h-[70px]" /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setCampOpen(false); setEditCamp(null); }}>Cancel</Button>
                <Button onClick={saveCamp}>{editCamp ? 'Save changes' : 'Create campaign'}</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════════════════════════════════════
          SEGMENTS TAB
         ════════════════════════════════════════════ */}
      {tab === 'segments' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewSeg}><Plus className="w-4 h-4" /> New segment</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {segmentsWithCounts.map((s) => (
              <Card key={s.id} className="p-4 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${segColors[s.color] || segColors.sage}`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink">{s.name}</div>
                      <div className="text-[11px] text-ink/50 mt-0.5 font-mono">{s.criteria}</div>
                      <div className="text-[11px] text-ink/60 mt-1">{s.description}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-ink">{s.count}</div>
                    <div className="text-[10px] text-ink/50">clients</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                  <Button size="sm" variant="outline"><Send className="w-3 h-3" /> Send campaign</Button>
                  <div className="flex-1" />
                  <button onClick={() => deleteSeg(s.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <Modal open={segOpen} onClose={() => setSegOpen(false)} title="New customer segment">
            <div className="space-y-3">
              <Field label="Segment name"><input className={inputCls} value={segForm.name} onChange={(e) => setSegForm((f) => ({ ...f, name: e.target.value }))} placeholder="Senior pet owners" /></Field>
              <Field label="Criteria"><input className={inputCls} value={segForm.criteria} onChange={(e) => setSegForm((f) => ({ ...f, criteria: e.target.value }))} placeholder="pet.age > 7 years" /></Field>
              <Field label="Description"><Textarea value={segForm.description} onChange={(e) => setSegForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what this segment represents…" className="min-h-[60px]" /></Field>
              <Field label="Color">
                <Select value={segForm.color} onChange={(e) => setSegForm((f) => ({ ...f, color: e.target.value }))}>
                  {['sage', 'coral', 'amber', 'sky', 'ink'].map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSegOpen(false)}>Cancel</Button>
                <Button onClick={saveSeg}>Create segment</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════════════════════════════════════
          BIRTHDAYS TAB
         ════════════════════════════════════════════ */}
      {tab === 'birthdays' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Cake} label="This month" value={petBirthdays.filter((b) => b.diffDays <= 30 && b.diffDays >= 0).length} sub="Pet birthdays" tone="amber" />
            <StatCard icon={CalendarClock} label="This week" value={petBirthdays.filter((b) => b.diffDays <= 7 && b.diffDays >= 0).length} sub="Coming up soon" tone="coral" />
            <StatCard icon={Gift} label="Today" value={petBirthdays.filter((b) => b.diffDays === 0).length} sub="Celebrate now!" tone="sage" />
          </div>
          {petBirthdays.length === 0 ? (
            <Card><EmptyState icon={Cake} title="No upcoming birthdays" hint="Pet birthdays in the next 30 days will appear here." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {petBirthdays.map(({ pet, owner, diffDays }) => (
                <Card key={pet.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${diffDays === 0 ? 'bg-coral/15 text-coral' : diffDays <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-mint text-sage'}`}>
                      <Cake className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink">{pet.name}</div>
                      <div className="text-[11px] text-ink/50">{pet.species} · {pet.breed}</div>
                      <div className="text-[11px] text-ink/60 mt-0.5">{owner?.name} · {owner?.phone}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-semibold ${diffDays === 0 ? 'text-coral' : diffDays <= 7 ? 'text-amber-600' : 'text-ink/60'}`}>
                        {diffDays === 0 ? 'Today!' : diffDays < 0 ? 'Yesterday' : `In ${diffDays}d`}
                      </div>
                      <div className="text-[10px] text-ink/40">{new Date(pet.birthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                    <Button size="sm" variant="outline"><Mail className="w-3 h-3" /> Send greeting</Button>
                    <Button size="sm" variant="outline"><Gift className="w-3 h-3" /> Free treat</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          VACCINE REMINDERS TAB
         ════════════════════════════════════════════ */}
      {tab === 'vaccines' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={AlertCircle} label="Overdue" value={vaccineReminders.filter((v) => v.isOverdue).length} sub="Need immediate action" tone="coral" />
            <StatCard icon={Clock} label="Due soon" value={vaccineReminders.filter((v) => !v.isOverdue && (v.daysUntilDue ?? 999) <= 30).length} sub="Within 30 days" tone="amber" />
            <StatCard icon={Syringe} label="Total reminders" value={vaccineReminders.length} sub="To send" tone="sage" />
          </div>
          {vaccineReminders.length === 0 ? (
            <Card><EmptyState icon={Syringe} title="No vaccination reminders" hint="Pets with overdue or upcoming vaccinations will appear here." /></Card>
          ) : (
            <div className="space-y-2">
              {vaccineReminders.map(({ v, pet, owner, isOverdue, daysUntilDue }) => (
                <Card key={v.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-coral/15 text-coral' : 'bg-amber-100 text-amber-600'}`}>
                        <Syringe className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{pet?.name} — {v.vaccineName}</div>
                        <div className="text-[11px] text-ink/50 mt-0.5">
                          {owner?.name} · {owner?.phone} · Dose {v.doseNumber}/{v.totalDoses}
                        </div>
                        <div className="text-[11px] text-ink/60 mt-1">
                          {isOverdue ? (
                            <span className="text-coral font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue {v.nextDueDate && `since ${v.nextDueDate}`}</span>
                          ) : (
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due in {daysUntilDue} days ({v.nextDueDate})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline"><Send className="w-3 h-3" /> Remind</Button>
                      <Badge status={v.status} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          LOYALTY TAB
         ════════════════════════════════════════════ */}
      {tab === 'loyalty' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Star} label="Total points issued" value={db.owners.reduce((s, o) => s + o.loyaltyPoints, 0)} sub="All clients" tone="amber" />
            <StatCard icon={Award} label="Top tier" value={db.owners.filter((o) => o.loyaltyPoints > 500).length} sub="500+ points" tone="sage" />
            <StatCard icon={Users} label="Active members" value={db.owners.filter((o) => o.loyaltyPoints > 0).length} sub="Earning points" tone="sky" />
            <StatCard icon={Gift} label="Avg points" value={Math.round(db.owners.reduce((s, o) => s + o.loyaltyPoints, 0) / Math.max(db.owners.length, 1))} sub="Per client" tone="coral" />
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Loyalty leaderboard</h3>
              <span className="text-[11px] text-ink/50">Sorted by points</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                    <th className="py-2.5 pr-4 font-semibold">Rank</th>
                    <th className="py-2.5 pr-4 font-semibold">Client</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Points</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Visits</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Total spent</th>
                    <th className="py-2.5 pr-4 font-semibold">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {loyaltyData.slice(0, 20).map((l, i) => {
                    const tier = l.points > 1000 ? 'Platinum' : l.points > 500 ? 'Gold' : l.points > 200 ? 'Silver' : l.points > 0 ? 'Bronze' : 'None';
                    const tierColor: Record<string, string> = { Platinum: 'bg-ink/80 text-white', Gold: 'bg-amber-100 text-amber-700', Silver: 'bg-canvas text-ink/70', Bronze: 'bg-orange-100 text-orange-700', None: 'bg-canvas text-ink/40' };
                    return (
                      <tr key={l.owner.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-canvas text-ink/50'}`}>{i + 1}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-ink">{l.owner.name}</div>
                          <div className="text-[11px] text-ink/45">{l.owner.email}</div>
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-amber-600">{l.points.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-ink/70">{l.visits}</td>
                        <td className="py-3 pr-4 text-right text-ink/70">${l.totalSpent.toFixed(0)}</td>
                        <td className="py-3 pr-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tierColor[tier]}`}>{tier}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          REFERRALS TAB
         ════════════════════════════════════════════ */}
      {tab === 'referrals' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Share2} label="Total referrals" value={referrals.reduce((s, r) => s + r.referredCount, 0)} sub="Clients referred" tone="sage" />
            <StatCard icon={Users} label="Top referrers" value={referrals.filter((r) => r.referredCount > 0).length} sub="Active advocates" tone="coral" />
            <StatCard icon={Gift} label="Rewards given" value={Math.floor(referrals.reduce((s, r) => s + r.referredCount, 0) * 50)} sub="Loyalty points" tone="amber" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Top referrers</h3>
            {referrals.length === 0 ? (
              <EmptyState icon={Share2} title="No referral data" hint="Clients with high loyalty points will appear here as potential referrers." />
            ) : (
              <div className="space-y-2">
                {referrals.map((r, i) => (
                  <div key={r.owner.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-mint text-sage flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{r.owner.name}</div>
                      <div className="text-[11px] text-ink/50">{r.owner.email}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-sage">{r.referredCount}</div>
                      <div className="text-[10px] text-ink/45">referrals</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-amber-600">{r.owner.loyaltyPoints}</div>
                      <div className="text-[10px] text-ink/45">points</div>
                    </div>
                    <Button size="sm" variant="outline"><Gift className="w-3 h-3" /> Reward</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Referral program details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-mint p-4">
                <Gift className="w-5 h-5 text-sage mb-2" />
                <div className="text-sm font-semibold text-ink">Referrer reward</div>
                <div className="text-[11px] text-ink/60 mt-1">50 loyalty points for every successful referral that books an appointment.</div>
              </div>
              <div className="rounded-xl bg-coral/10 p-4">
                <Star className="w-5 h-5 text-coral mb-2" />
                <div className="text-sm font-semibold text-ink">New client reward</div>
                <div className="text-[11px] text-ink/60 mt-1">25 loyalty points + 10% off first visit for referred new clients.</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          MEMBERSHIP TAB
         ════════════════════════════════════════════ */}
      {tab === 'membership' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {membershipStats.map((m) => (
              <Card key={m.name} className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-ink">{m.count}</div>
                    <div className="text-[11px] text-ink/50">{m.name} ({m.price > 0 ? `$${m.price}/mo` : 'Free'})</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {membershipPlans.map((plan) => (
              <Card key={plan.name} className="p-5">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${plan.color}`}>
                  <Crown className="w-3.5 h-3.5" /> {plan.name}
                </div>
                <div className="text-2xl font-bold text-ink">${plan.price}<span className="text-sm font-normal text-ink/50">/mo</span></div>
                <div className="mt-3 space-y-2">
                  {plan.perks.map((perk) => (
                    <div key={perk} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sage shrink-0 mt-0.5" />
                      <span className="text-xs text-ink/70">{perk}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-line">
                  <div className="text-sm font-semibold text-ink">{membershipStats.find((m) => m.name === plan.name)?.count || 0} <span className="text-xs font-normal text-ink/50">subscribers</span></div>
                  <div className="text-[11px] text-ink/50 mt-0.5">
                    {plan.price > 0 ? `$${(membershipStats.find((m) => m.name === plan.name)?.count || 0) * plan.price}/mo revenue` : 'No recurring revenue'}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          FEEDBACK TAB
         ════════════════════════════════════════════ */}
      {tab === 'feedback' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={MessageSquare} label="Total feedback" value={allFeedback.length} sub="All time" tone="sage" />
            <StatCard icon={Star} label="Avg rating" value={(allFeedback.reduce((s, f) => s + f.rating, 0) / Math.max(allFeedback.length, 1)).toFixed(1)} sub="Out of 5" tone="amber" />
            <StatCard icon={ThumbsUp} label="Positive (4-5)" value={allFeedback.filter((f) => f.rating >= 4).length} sub="Happy clients" tone="sage" />
            <StatCard icon={AlertCircle} label="Needs attention" value={allFeedback.filter((f) => f.rating <= 2).length} sub="1-2 star ratings" tone="coral" />
          </div>
          {allFeedback.length === 0 ? (
            <Card><EmptyState icon={MessageSquare} title="No feedback yet" hint="Client feedback and reviews will appear here." /></Card>
          ) : (
            <div className="space-y-2">
              {allFeedback.slice(0, 30).map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.rating >= 4 ? 'bg-mint text-sage' : f.rating >= 3 ? 'bg-amber-100 text-amber-600' : 'bg-coral/15 text-coral'}`}>
                        <Star className={`w-5 h-5 ${f.rating >= 4 ? 'fill-sage' : f.rating >= 3 ? 'fill-amber-500' : 'fill-coral'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{f.ownerName}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= f.rating ? 'text-amber-500 fill-amber-500' : 'text-ink/15'}`} />
                            ))}
                          </div>
                        </div>
                        <div className="text-[11px] text-ink/50 mt-0.5">{f.date} · Staff: {f.staff}</div>
                        {f.comment && <div className="text-xs text-ink/70 mt-1.5 leading-relaxed">{f.comment}</div>}
                      </div>
                    </div>
                    <Badge status={f.rating >= 4 ? 'Positive' : f.rating >= 3 ? 'Neutral' : 'Negative'} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════
          RETENTION TAB
         ════════════════════════════════════════════ */}
      {tab === 'retention' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Heart} label="Retention rate" value={`${retentionRate}%`} sub={`${returningOwners}/${totalOwners} returning`} tone="sage" />
            <StatCard icon={Users} label="New clients" value={db.owners.filter((o) => { const d = Math.ceil((Date.now() - new Date(o.createdAt).getTime()) / 86400000); return d < 90; }).length} sub="Last 90 days" tone="sky" />
            <StatCard icon={AlertCircle} label="Inactive clients" value={inactiveOwners.length} sub="6+ months no visit" tone="coral" />
            <StatCard icon={TrendingUp} label="Avg visits/client" value={(db.appointments.length / Math.max(totalOwners, 1)).toFixed(1)} sub="All time" tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Retention funnel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total registered clients', count: totalOwners, pct: 100, color: 'bg-sage' },
                  { label: 'Visited at least once', count: db.owners.filter((o) => db.appointments.some((a) => a.ownerId === o.id)).length, pct: 0, color: 'bg-sky-500' },
                  { label: 'Returned for 2nd visit', count: returningOwners, pct: 0, color: 'bg-amber-500' },
                  { label: '3+ visits (loyal)', count: db.owners.filter((o) => db.appointments.filter((a) => a.ownerId === o.id).length >= 3).length, pct: 0, color: 'bg-coral' },
                ].map((stage, i) => {
                  const pct = totalOwners > 0 ? (stage.count / totalOwners) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-ink">{stage.label}</span>
                        <span className="text-xs text-ink/50">{stage.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-line overflow-hidden">
                        <div className={`h-full rounded-full ${stage.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Inactive clients (6+ months)</h3>
              {inactiveOwners.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Heart className="w-6 h-6 text-sage mb-2" />
                  <span className="text-sm text-ink/50">All clients are active!</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {inactiveOwners.slice(0, 15).map((o) => {
                    const lastAppt = db.appointments.filter((a) => a.ownerId === o.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                    const daysSince = Math.ceil((Date.now() - new Date(lastAppt.date).getTime()) / 86400000);
                    return (
                      <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-coral/20 bg-coral/5">
                        <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-ink truncate">{o.name}</div>
                          <div className="text-[11px] text-ink/50">Last visit: {lastAppt.date} ({daysSince}d ago)</div>
                        </div>
                        <Button size="sm" variant="outline"><Send className="w-3 h-3" /> Reach out</Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          COMMUNICATION TAB
         ════════════════════════════════════════════ */}
      {tab === 'communication' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Phone} label="Phone calls" value={allComms.filter((c) => c.channel === 'Phone').length} sub="Logged" tone="sage" />
            <StatCard icon={Mail} label="Emails" value={allComms.filter((c) => c.channel === 'Email').length} sub="Logged" tone="sky" />
            <StatCard icon={MessageSquare} label="SMS" value={allComms.filter((c) => c.channel === 'SMS').length} sub="Logged" tone="amber" />
            <StatCard icon={Users} label="In-person" value={allComms.filter((c) => c.channel === 'In-person').length} sub="Logged" tone="coral" />
          </div>
          {allComms.length === 0 ? (
            <Card><EmptyState icon={Phone} title="No communication logs" hint="Phone calls, emails, and messages logged with clients will appear here." /></Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {allComms.slice(0, 50).map((c) => {
                const channelIcon: Record<string, typeof Phone> = { Phone, Email: Mail, SMS: MessageSquare, 'In-person': Users, Portal: Zap };
                const ChannelIcon = channelIcon[c.channel] || Phone;
                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.direction === 'Outgoing' ? 'bg-sky-100 text-sky-600' : 'bg-mint text-sage'}`}>
                        <ChannelIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink">{c.ownerName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.direction === 'Outgoing' ? 'bg-sky-50 text-sky-600' : 'bg-mint text-sage'}`}>{c.direction}</span>
                          <span className="text-[10px] text-ink/40">{c.channel}</span>
                        </div>
                        <div className="text-xs text-ink/70 mt-0.5 font-medium">{c.subject}</div>
                        {c.notes && <div className="text-[11px] text-ink/50 mt-0.5 leading-relaxed">{c.notes}</div>}
                        <div className="text-[10px] text-ink/40 mt-1">{c.date}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
