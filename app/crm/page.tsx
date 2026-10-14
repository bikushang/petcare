'use client';

import { useMemo, useState } from 'react';
import {
  Megaphone, Users, Cake, Syringe, Star, Gift, Share2, Crown,
  MessageSquare, TrendingUp, Phone, Mail, Plus, Edit2, Trash2,
  Send, CalendarClock, Award, Heart, ArrowRight, X, Info,
  CheckCircle2, AlertCircle, Clock, Target, Zap, ThumbsUp,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Button, IconButton, EmptyState, Modal, Field, Input, DatePicker,
  NumberInput, Select, Textarea, SegmentedControl, Badge, StatCard, Tabs,
} from '../components/ui';
import { useDB, newId } from '../lib/store';
import type {
  Campaign, Segment, SegmentRule, SegmentRuleField,
  CommunicationLog, Owner, Pet, Vaccination,
} from '../lib/store';
import { useAuth } from '../lib/auth';
import {
  localDateISO, parseISODate, daysBetween, num, numMin, round2,
  confirmDelete, confirmAction, isNonEmpty,
  invoiceTotals, countsAsRevenue,
  ownerMatchesSegment, SEGMENT_FIELD_LABELS, SEGMENT_OP_LABELS,
  type SegmentContext,
} from '../lib/helpers';
import { useSettings, formatMoney } from '../lib/settings';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateBusinessInsight } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

type Tab = 'overview' | 'campaigns' | 'segments' | 'birthdays' | 'vaccines' | 'loyalty' | 'referrals' | 'membership' | 'feedback' | 'retention' | 'communication';

/* ── Windows and reward sizes, named rather than buried in expressions ── */
const DUE_SOON_DAYS = 30;
/** How far back a missed vaccination is still worth chasing. Without a lower
 *  bound the filter matched every dose from years ago and the card rendered
 *  "Due in -730 days". */
const OVERDUE_WINDOW_DAYS = 180;
const BIRTHDAY_WINDOW_DAYS = 30;
const INACTIVE_AFTER_DAYS = 180;
const NEW_CLIENT_DAYS = 90;
const BIRTHDAY_TREAT_POINTS = 25;
const REFERRAL_REWARD_POINTS = 50;
/** Subject used for referral rewards, so "rewards issued" can be counted from
 *  real communication-log rows instead of being invented. */
const REFERRAL_REWARD_SUBJECT = 'Referral reward issued';

/* Membership tiers are still defined here rather than in the database, so the
 * prices below (and the "/mo revenue" figures derived from them) can only be
 * changed in code. Subscriber counts come from each client's stored plan. */
const membershipPlans = [
  { name: 'None', price: 0, perks: ['Standard appointment booking'], color: 'bg-ink/10 text-ink/60' },
  { name: 'Basic', price: 15, perks: ['10% off consultations', 'Free vaccination reminders', 'Birthday pet treat'], color: 'bg-sky-100 text-sky-700' },
  { name: 'Premium', price: 35, perks: ['15% off all services', '2 free grooming sessions/yr', 'Priority booking', 'Quarterly health check'], color: 'bg-lilac text-plum' },
  { name: 'VIP', price: 75, perks: ['20% off all services', 'Unlimited grooming', '24/7 emergency hotline', 'Free annual bloodwork', 'Concierge vet'], color: 'bg-amber-100 text-amber-700' },
];

/* ── Campaign form: numeric fields are held as strings while typing and
      parsed with numMin() on save. ── */
type CampForm = {
  name: string;
  channel: Campaign['channel'];
  status: Campaign['status'];
  segmentId: string;
  startDate: string;
  endDate: string;
  budget: string;
  spent: string;
  reach: string;
  opens: string;
  clicks: string;
  conversions: string;
  notes: string;
};

const blankCampForm = (): CampForm => ({
  name: '', channel: 'Email', status: 'Draft', segmentId: '',
  startDate: localDateISO(), endDate: '',
  budget: '0', spent: '0', reach: '0', opens: '0', clicks: '0', conversions: '0',
  notes: '',
});

const campFormFrom = (c: Campaign): CampForm => ({
  name: c.name,
  channel: c.channel,
  status: c.status,
  segmentId: c.segmentId || '',
  startDate: c.startDate || localDateISO(),
  endDate: c.endDate || '',
  budget: String(num(c.budget)),
  spent: String(num(c.spent)),
  reach: String(num(c.reach)),
  opens: String(num(c.opens)),
  clicks: String(num(c.clicks)),
  conversions: String(num(c.conversions)),
  notes: c.notes || '',
});

/* ── Segment rule builder. Rules carry a local `key` purely so removable rows
      have a stable React key; it is stripped before saving. ── */
type RuleRow = SegmentRule & { key: string };
type SegForm = { name: string; description: string; match: 'all' | 'any'; rules: RuleRow[] };

const blankRule = (): RuleRow => ({ key: newId('rule'), field: 'loyaltyPoints', op: 'gte', value: '' });
const blankSegForm = (): SegForm => ({ name: '', description: '', match: 'all', rules: [blankRule()] });
const segFormFrom = (s: Segment): SegForm => ({
  name: s.name,
  description: s.description || '',
  match: s.match === 'any' ? 'any' : 'all',
  rules: (s.rules ?? []).length
    ? (s.rules ?? []).map((r) => ({ ...r, key: newId('rule') }))
    : [blankRule()],
});

/** Fields compared as text — `compare()` in helpers only supports eq/neq there. */
const TEXT_FIELDS: SegmentRuleField[] = ['petSpecies'];
const FIELD_OPTIONS = (Object.keys(SEGMENT_FIELD_LABELS) as SegmentRuleField[])
  .map((f) => ({ value: f, label: SEGMENT_FIELD_LABELS[f] }));
const OP_OPTIONS = (Object.keys(SEGMENT_OP_LABELS) as SegmentRule['op'][])
  .map((o) => ({ value: o, label: SEGMENT_OP_LABELS[o] }));
const TEXT_OP_OPTIONS = OP_OPTIONS.filter((o) => o.value === 'eq' || o.value === 'neq');

const SEG_PALETTE = ['plum', 'coral', 'amber', 'sky', 'ink'];
const segColors: Record<string, string> = {
  plum: 'bg-lilac text-plum',
  coral: 'bg-coral/15 text-coral',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
  ink: 'bg-ink/10 text-ink/60',
};
/** Stable colour per segment id — `Segment` has no colour field to store. */
function segColorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return SEG_PALETTE[h % SEG_PALETTE.length];
}

function describeRules(s: Pick<Segment, 'rules' | 'match'>): string {
  const rules = s.rules ?? [];
  if (rules.length === 0) return 'No rules — matches nobody';
  return rules
    .map((r) => `${SEGMENT_FIELD_LABELS[r.field]} ${SEGMENT_OP_LABELS[r.op]} ${r.value || '—'}`)
    .join(s.match === 'any' ? ' OR ' : ' AND ');
}

type DBApi = ReturnType<typeof useDB>;

export default function CRMPage() {
  const api = useDB();
  if (!api.db) {
    return (
      <Shell module="crm" title="CRM & Marketing" subtitle="Customer engagement, campaigns, loyalty, and retention">
        <div className="text-sm text-ink/50">Loading…</div>
      </Shell>
    );
  }
  return <CRMWorkspace {...api} db={api.db} />;
}

function CRMWorkspace({
  db, error, create, update, remove,
}: Omit<DBApi, 'db'> & { db: NonNullable<DBApi['db']> }) {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [tab, setTab] = useState<Tab>('overview');
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [flash, setFlash] = useState('');
  const [pageError, setPageError] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const [campOpen, setCampOpen] = useState(false);
  const [editCampId, setEditCampId] = useState<string | null>(null);
  const [campForm, setCampForm] = useState<CampForm>(blankCampForm);
  const [campError, setCampError] = useState('');

  const [segOpen, setSegOpen] = useState(false);
  const [editSegId, setEditSegId] = useState<string | null>(null);
  const [segForm, setSegForm] = useState<SegForm>(blankSegForm);
  const [segError, setSegError] = useState('');

  const todayStr = localDateISO();
  const notify = (msg: string) => { setPageError(''); setFlash(msg); };
  const fail = (msg: string) => { setFlash(''); setPageError(msg); };

  /* ──────────────────────────────────────────────────────────────
     Derived CRM data — all of it from `db`, nothing seeded in state
     ────────────────────────────────────────────────────────────── */

  /** A visit is a completed appointment. Cancelled and No-show are not visits. */
  const completedVisitsOf = (ownerId: string) =>
    db.appointments.filter((a) => a.ownerId === ownerId && a.status === 'Completed');

  /** Money actually collected from a client — never recomputed by hand. */
  const collectedFrom = (ownerId: string) =>
    round2(db.invoices
      .filter((i) => i.ownerId === ownerId && countsAsRevenue(i))
      .reduce((s, i) => s + invoiceTotals(i).amountPaid, 0));

  // Birthday reminders. The candidate date rolls into next year once this
  // year's has passed, so January birthdays no longer vanish every December.
  const petBirthdays = db.pets
    .map((p) => {
      const birth = parseISODate(p.birthDate);
      if (!birth) return null;
      const mmdd = `${String(birth.getMonth() + 1).padStart(2, '0')}-${String(birth.getDate()).padStart(2, '0')}`;
      const year = Number(todayStr.slice(0, 4));
      let nextISO = `${year}-${mmdd}`;
      let diffDays = daysBetween(todayStr, nextISO);
      if (diffDays === null) return null;
      if (diffDays < -1) {
        nextISO = `${year + 1}-${mmdd}`;
        diffDays = daysBetween(todayStr, nextISO) ?? 0;
      }
      const owner = db.owners.find((o) => o.id === p.ownerId);
      return { pet: p, owner, diffDays, birth };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.diffDays >= -1 && x.diffDays <= BIRTHDAY_WINDOW_DAYS)
    .sort((a, b) => a.diffDays - b.diffDays);

  // Vaccination reminders: not already Completed, and inside an actionable
  // window on both sides of today.
  const vaccineReminders = db.vaccinations
    .map((v) => {
      const pet = db.pets.find((p) => p.id === v.petId);
      const owner = db.owners.find((o) => o.id === v.ownerId)
        ?? (pet ? db.owners.find((o) => o.id === pet.ownerId) : undefined);
      const daysUntilDue = v.nextDueDate ? daysBetween(todayStr, v.nextDueDate) : null;
      const isOverdue = daysUntilDue === null ? v.status === 'Overdue' : daysUntilDue < 0;
      return { v, pet, owner, isOverdue, daysUntilDue };
    })
    .filter((x) => {
      if (!x.pet) return false;
      if (x.v.status === 'Completed') return false;
      if (x.daysUntilDue === null) return x.v.status === 'Overdue';
      return x.daysUntilDue >= -OVERDUE_WINDOW_DAYS && x.daysUntilDue <= DUE_SOON_DAYS;
    })
    .sort((a, b) => (a.daysUntilDue ?? -9999) - (b.daysUntilDue ?? -9999));

  // Loyalty leaderboard
  const loyaltyData = db.owners
    .map((o) => ({
      owner: o,
      visits: completedVisitsOf(o.id).length,
      points: num(o.loyaltyPoints),
      totalSpent: collectedFrom(o.id),
    }))
    .sort((a, b) => b.points - a.points);

  // Referrals. There is no referral field on a client record, so the only real
  // signal is a client note naming another client. Nothing is inferred from
  // loyalty points any more.
  const referrals = db.owners
    .map((o) => ({
      owner: o,
      referred: o.name.trim().length < 3 ? [] : db.owners.filter((other) =>
        other.id !== o.id
        && isNonEmpty(other.notes ?? '')
        && (other.notes ?? '').toLowerCase().includes(o.name.trim().toLowerCase())),
    }))
    .filter((r) => r.referred.length > 0)
    .sort((a, b) => b.referred.length - a.referred.length);
  const totalReferrals = referrals.reduce((s, r) => s + r.referred.length, 0);
  const rewardsLogged = db.owners.reduce(
    (s, o) => s + (o.communicationLog || []).filter((c) => c.subject === REFERRAL_REWARD_SUBJECT).length,
    0,
  );

  // Membership distribution
  const membershipStats = membershipPlans.map((plan) => ({
    ...plan,
    count: db.owners.filter((o) => o.membershipPlan === plan.name).length,
  }));

  // Feedback
  const allFeedback = db.owners
    .flatMap((o) => (o.feedback || []).map((f) => ({ ...f, ownerName: o.name })))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Retention
  const totalOwners = db.owners.length;
  const visitedOwners = db.owners.filter((o) => completedVisitsOf(o.id).length > 0).length;
  const returningOwners = db.owners.filter((o) => completedVisitsOf(o.id).length > 1).length;
  const loyalOwners = db.owners.filter((o) => completedVisitsOf(o.id).length >= 3).length;
  const retentionRate = totalOwners > 0 ? Math.round((returningOwners / totalOwners) * 100) : 0;
  const completedApptCount = db.appointments.filter((a) => a.status === 'Completed').length;

  // Inactive clients: a registered client who has never visited counts, and a
  // future booking can no longer mask a long absence (only completed visits
  // are considered).
  const inactiveClients = db.owners
    .map((o) => {
      const dates = completedVisitsOf(o.id).map((a) => a.date).sort();
      const lastVisit = dates.length ? dates[dates.length - 1] : null;
      const daysSince = lastVisit ? daysBetween(lastVisit, todayStr) : null;
      return { owner: o, lastVisit, daysSince };
    })
    .filter((x) => x.lastVisit === null || (x.daysSince !== null && x.daysSince > INACTIVE_AFTER_DAYS))
    .sort((a, b) => (b.daysSince ?? Number.MAX_SAFE_INTEGER) - (a.daysSince ?? Number.MAX_SAFE_INTEGER));

  const newClients = db.owners.filter((o) => {
    const d = daysBetween((o.createdAt || '').slice(0, 10), todayStr);
    return d !== null && d >= 0 && d < NEW_CLIENT_DAYS;
  });

  // Communication history
  const allComms = db.owners
    .flatMap((o) => (o.communicationLog || []).map((c) => ({ ...c, ownerName: o.name, ownerId: o.id })))
    .sort((a, b) => b.date.localeCompare(a.date));

  /* Segment evaluation — rules are evaluated against real client data instead
     of being guessed from substrings of the segment name. */
  const ownerContexts = useMemo<SegmentContext[]>(
    () => db.owners.map((o) => ({
      owner: o,
      pets: db.pets.filter((p) => p.ownerId === o.id),
      invoices: db.invoices.filter((i) => i.ownerId === o.id),
      appointments: db.appointments.filter((a) => a.ownerId === o.id),
      today: todayStr,
    })),
    [db.owners, db.pets, db.invoices, db.appointments, todayStr],
  );
  const ownersMatching = (seg: Segment) =>
    ownerContexts.filter((c) => ownerMatchesSegment(seg, c)).map((c) => c.owner);

  const segmentCards = db.segments.map((s) => ({ seg: s, owners: ownersMatching(s) }));

  const previewRules: SegmentRule[] = segForm.rules
    .filter((r) => isNonEmpty(r.value))
    .map(({ field, op, value }) => ({ field, op, value }));
  const previewCount = segOpen && previewRules.length
    ? ownersMatching({
      id: 'preview', name: segForm.name, description: segForm.description,
      rules: previewRules, match: segForm.match, createdBy: '', createdAt: todayStr,
    }).length
    : 0;

  // Campaign stats, straight off the persisted collection
  const campaignList = [...db.campaigns].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  const activeCampaigns = campaignList.filter((c) => c.status === 'Active');
  const totalReach = campaignList.reduce((s, c) => s + num(c.reach), 0);
  const totalConversions = campaignList.reduce((s, c) => s + num(c.conversions), 0);
  const avgConversionRate = totalReach > 0 ? ((totalConversions / totalReach) * 100).toFixed(1) : '0';

  /* ──────────────────────────────────────────────────────────────
     Actions — everything below reaches create/update/remove
     ────────────────────────────────────────────────────────────── */

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    try { await fn(); } finally { setBusyKey(''); }
  };

  /**
   * Append a communication-log entry to a client, optionally patching other
   * fields derived from the live row (loyalty points). The owner is re-read
   * from `db` so two actions in a row cannot overwrite each other's log.
   */
  const logFor = async (
    ownerId: string,
    entry: {
      channel: CommunicationLog['channel'];
      subject: string;
      notes: string;
      direction?: CommunicationLog['direction'];
    },
    extra?: (live: Owner) => Partial<Owner>,
  ): Promise<boolean> => {
    const live = db.owners.find((o) => o.id === ownerId);
    if (!live) {
      fail('That client is no longer in the database — nothing was logged.');
      return false;
    }
    const logEntry: CommunicationLog = {
      id: newId('comm'),
      date: todayStr,
      channel: entry.channel,
      direction: entry.direction ?? 'Outgoing',
      subject: entry.subject,
      notes: entry.notes,
    };
    try {
      await update('owners', ownerId, {
        communicationLog: [...(live.communicationLog || []), logEntry],
        ...(extra ? extra(live) : {}),
      });
      return true;
    } catch {
      fail('Could not reach the server — nothing was logged.');
      return false;
    }
  };

  // ── Campaigns ──
  const setCamp = <K extends keyof CampForm>(k: K, v: CampForm[K]) =>
    setCampForm((f) => ({ ...f, [k]: v }));

  const openNewCamp = () => { setEditCampId(null); setCampForm(blankCampForm()); setCampError(''); setCampOpen(true); };
  const openEditCamp = (c: Campaign) => { setEditCampId(c.id); setCampForm(campFormFrom(c)); setCampError(''); setCampOpen(true); };
  const closeCamp = () => { setCampOpen(false); setEditCampId(null); setCampError(''); };

  const saveCamp = () => run('save-camp', async () => {
    if (!isNonEmpty(campForm.name)) { setCampError('Give the campaign a name.'); return; }
    if (!parseISODate(campForm.startDate)) { setCampError('Pick a valid start date.'); return; }
    if (campForm.endDate && !parseISODate(campForm.endDate)) { setCampError('That end date is not a valid date.'); return; }
    if (campForm.endDate && (daysBetween(campForm.startDate, campForm.endDate) ?? 0) < 0) {
      setCampError('The end date cannot be before the start date.');
      return;
    }
    const reach = numMin(campForm.reach);
    const opens = numMin(campForm.opens);
    const clicks = numMin(campForm.clicks);
    const conversions = numMin(campForm.conversions);
    if (opens > reach || clicks > reach || conversions > reach) {
      setCampError('Opens, clicks and conversions cannot be higher than the reach.');
      return;
    }
    setCampError('');

    const seg = db.segments.find((s) => s.id === campForm.segmentId);
    const payload = {
      name: campForm.name.trim(),
      channel: campForm.channel,
      status: campForm.status,
      segmentId: seg ? seg.id : '',
      targetSegment: seg ? seg.name : 'All clients',
      startDate: campForm.startDate,
      endDate: campForm.endDate,
      budget: numMin(campForm.budget),
      spent: numMin(campForm.spent),
      reach,
      opens,
      clicks,
      conversions,
      notes: campForm.notes,
    };
    try {
      if (editCampId) {
        await update('campaigns', editCampId, payload);
        notify(`Campaign "${payload.name}" saved.`);
      } else {
        await create('campaigns', {
          ...payload,
          id: newId('camp'),
          createdBy: user?.name ?? '',
          createdAt: todayStr,
        });
        notify(`Campaign "${payload.name}" created.`);
      }
      closeCamp();
    } catch {
      setCampError('Could not save the campaign — the server rejected the change.');
    }
  });

  const deleteCamp = (c: Campaign) => run(`del-camp-${c.id}`, async () => {
    if (!confirmDelete(`campaign "${c.name}"`, 'Its reach and conversion figures will disappear from the overview.')) return;
    try {
      await remove('campaigns', c.id);
      notify(`Campaign "${c.name}" deleted.`);
    } catch {
      fail('Could not delete that campaign.');
    }
  });

  // ── Segments ──
  const openNewSeg = () => { setEditSegId(null); setSegForm(blankSegForm()); setSegError(''); setSegOpen(true); };
  const openEditSeg = (s: Segment) => { setEditSegId(s.id); setSegForm(segFormFrom(s)); setSegError(''); setSegOpen(true); };
  const closeSeg = () => { setSegOpen(false); setEditSegId(null); setSegError(''); };

  const setRule = (key: string, patch: Partial<SegmentRule>) =>
    setSegForm((f) => ({
      ...f,
      rules: f.rules.map((r) => {
        if (r.key !== key) return r;
        const next: RuleRow = { ...r, ...patch };
        // Text comparisons only support equals / does not equal.
        if (TEXT_FIELDS.includes(next.field) && next.op !== 'eq' && next.op !== 'neq') next.op = 'eq';
        return next;
      }),
    }));
  const addRule = () => setSegForm((f) => ({ ...f, rules: [...f.rules, blankRule()] }));
  const removeRule = (key: string) =>
    setSegForm((f) => ({ ...f, rules: f.rules.filter((r) => r.key !== key) }));

  const saveSeg = () => run('save-seg', async () => {
    if (!isNonEmpty(segForm.name)) { setSegError('Give the segment a name.'); return; }
    if (segForm.rules.length === 0) {
      setSegError('Add at least one rule — a segment with no rules matches nobody.');
      return;
    }
    const bad = segForm.rules.find((r) => !isNonEmpty(r.value)
      || (!TEXT_FIELDS.includes(r.field) && !Number.isFinite(num(r.value, NaN))));
    if (bad) {
      setSegError(`"${SEGMENT_FIELD_LABELS[bad.field]}" needs a value to compare against.`);
      return;
    }
    setSegError('');

    const payload = {
      name: segForm.name.trim(),
      description: segForm.description,
      match: segForm.match,
      rules: segForm.rules.map(({ field, op, value }) => ({ field, op, value: value.trim() })),
    };
    try {
      if (editSegId) {
        await update('segments', editSegId, payload);
        notify(`Segment "${payload.name}" saved.`);
      } else {
        await create('segments', {
          ...payload,
          id: newId('seg'),
          createdBy: user?.name ?? '',
          createdAt: todayStr,
        });
        notify(`Segment "${payload.name}" created.`);
      }
      closeSeg();
    } catch {
      setSegError('Could not save the segment — the server rejected the change.');
    }
  });

  const deleteSeg = (s: Segment) => run(`del-seg-${s.id}`, async () => {
    if (!confirmDelete(`segment "${s.name}"`, 'Campaigns already targeting it keep the target name they recorded.')) return;
    try {
      await remove('segments', s.id);
      notify(`Segment "${s.name}" deleted.`);
    } catch {
      fail('Could not delete that segment.');
    }
  });

  // ── Outreach actions (previously six inert buttons) ──
  const sendToSegment = (seg: Segment, owners: Owner[]) => run(`seg-send-${seg.id}`, async () => {
    if (owners.length === 0) {
      fail(`No clients match "${seg.name}" yet, so there is nobody to send to.`);
      return;
    }
    if (!confirmAction(`Log a campaign send to ${owners.length} client${owners.length === 1 ? '' : 's'} matching "${seg.name}"?`)) return;
    let sent = 0;
    for (const o of owners) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await logFor(o.id, {
        channel: 'Email',
        subject: `Campaign: ${seg.name}`,
        notes: `Segment campaign sent to the "${seg.name}" audience.`,
      });
      if (ok) sent += 1;
    }
    if (sent > 0) notify(`Logged a campaign send to ${sent} client${sent === 1 ? '' : 's'} in "${seg.name}".`);
  });

  const sendGreeting = (pet: Pet, owner: Owner) => run(`greet-${pet.id}`, async () => {
    const ok = await logFor(owner.id, {
      channel: owner.email ? 'Email' : 'SMS',
      subject: `Birthday greeting — ${pet.name}`,
      notes: `Birthday greeting sent to ${owner.name} for ${pet.name}.`,
    });
    if (ok) notify(`Birthday greeting logged for ${pet.name}.`);
  });

  const giveTreat = (pet: Pet, owner: Owner) => run(`treat-${pet.id}`, async () => {
    const ok = await logFor(
      owner.id,
      {
        channel: 'In-person',
        subject: `Birthday treat — ${pet.name}`,
        notes: `Free birthday treat issued for ${pet.name}, plus ${BIRTHDAY_TREAT_POINTS} loyalty points.`,
      },
      (live) => ({ loyaltyPoints: num(live.loyaltyPoints) + BIRTHDAY_TREAT_POINTS }),
    );
    if (ok) notify(`Free treat logged for ${pet.name} — ${BIRTHDAY_TREAT_POINTS} loyalty points added to ${owner.name}.`);
  });

  const sendVaccineReminder = (v: Vaccination, pet: Pet | undefined, owner: Owner | undefined) =>
    run(`vax-${v.id}`, async () => {
      if (!owner) {
        fail('That vaccination has no client attached, so no reminder could be sent.');
        return;
      }
      const ok = await logFor(owner.id, {
        channel: owner.phone ? 'SMS' : 'Email',
        subject: `Vaccination reminder — ${v.vaccineName}`,
        notes: `${pet?.name ?? 'Pet'} is due for ${v.vaccineName} (dose ${v.doseNumber}/${v.totalDoses})${v.nextDueDate ? ` on ${v.nextDueDate}` : ''}.`,
      });
      if (!ok) return;
      try {
        await update('vaccinations', v.id, { reminderSent: true });
        notify(`Reminder logged for ${pet?.name ?? 'the pet'} — ${v.vaccineName}.`);
      } catch {
        fail('The reminder was logged against the client, but the vaccination record could not be flagged.');
      }
    });

  const rewardReferrer = (owner: Owner, count: number) => run(`reward-${owner.id}`, async () => {
    const ok = await logFor(
      owner.id,
      {
        channel: owner.email ? 'Email' : 'Phone',
        subject: REFERRAL_REWARD_SUBJECT,
        notes: `${REFERRAL_REWARD_POINTS} loyalty points awarded for ${count} referral${count === 1 ? '' : 's'}.`,
      },
      (live) => ({ loyaltyPoints: num(live.loyaltyPoints) + REFERRAL_REWARD_POINTS }),
    );
    if (ok) notify(`${REFERRAL_REWARD_POINTS} loyalty points added to ${owner.name}.`);
  });

  const reachOut = (owner: Owner, lastVisit: string | null) => run(`reach-${owner.id}`, async () => {
    const ok = await logFor(owner.id, {
      channel: owner.phone ? 'Phone' : 'Email',
      subject: 'Win-back outreach',
      notes: lastVisit
        ? `Contacted after no completed visit since ${lastVisit}.`
        : 'Contacted — registered but has never completed a visit.',
    });
    if (ok) notify(`Outreach logged for ${owner.name}.`);
  });

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

  return (
    <Shell module="crm" title="CRM & Marketing" subtitle="Customer engagement, campaigns, loyalty, and retention">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {(flash || pageError || error) && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium
            ${pageError || error ? 'border-coral/25 bg-coral/10 text-coral' : 'border-plum/20 bg-lilac text-plum'}`}
        >
          {pageError || error ? <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-px" />}
          <span className="flex-1 leading-relaxed">
            {pageError || flash || `Could not load CRM data: ${error}`}
          </span>
          <IconButton icon={X} label="Dismiss" size="sm" variant="ghost" onClick={() => { setFlash(''); setPageError(''); }} />
        </div>
      )}

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
            <StatCard icon={Users} label="Total clients" value={db.owners.length} sub="Registered" tone="plum" />
            <StatCard icon={Megaphone} label="Active campaigns" value={activeCampaigns.length} sub={`${campaignList.length} total`} tone="coral" />
            <StatCard icon={Cake} label="Upcoming birthdays" value={petBirthdays.length} sub="Next 30 days" tone="amber" />
            <StatCard icon={Syringe} label="Vax reminders" value={vaccineReminders.length} sub="Due/overdue" tone="coral" />
            <StatCard icon={Heart} label="Retention rate" value={`${retentionRate}%`} sub={`${returningOwners} returning`} tone="plum" />
            <StatCard icon={Target} label="Conversion rate" value={`${avgConversionRate}%`} sub={`${totalConversions} conversions`} tone="sky" />
          </div>

          <div className="flex justify-end mb-4">
            <AISuggestionButton onClick={() => {
              // Collected vs outstanding now come from the one correct
              // implementation, so the same money is never reported as both.
              const revenueDocs = db.invoices.filter((i) => countsAsRevenue(i));
              const collected = round2(revenueDocs.reduce((s, i) => s + invoiceTotals(i).amountPaid, 0));
              const outstanding = round2(revenueDocs.reduce((s, i) => s + invoiceTotals(i).balance, 0));
              setAiSuggestion(generateBusinessInsight(
                collected, outstanding, db.appointments.length, completedApptCount, db.staff.length, db.pets.length,
              ));
            }} label="AI Marketing Insight" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Active campaigns</h3>
                <button onClick={() => setTab('campaigns')} className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
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
                      <div className="text-[11px] text-ink/50">{c.channel} · {num(c.reach)} reached · {num(c.conversions)} conversions</div>
                    </div>
                    <Badge status={c.status} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Customer segments</h3>
                <button onClick={() => setTab('segments')} className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {segmentCards.length === 0 ? (
                  <div className="text-center py-6 text-sm text-ink/50">No segments defined yet.</div>
                ) : segmentCards.slice(0, 5).map(({ seg, owners }) => (
                  <div key={seg.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
                    <div className={`w-3 h-3 rounded-full ${segColors[segColorFor(seg.id)]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{seg.name}</div>
                      <div className="text-[11px] text-ink/50 truncate">{describeRules(seg)}</div>
                    </div>
                    <span className="text-sm font-semibold text-ink">{owners.length}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Upcoming birthdays</h3>
                <button onClick={() => setTab('birthdays')} className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
              </div>
              <div className="space-y-2">
                {petBirthdays.slice(0, 4).map(({ pet, owner, diffDays }) => (
                  <div key={pet.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
                    <Cake className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{pet.name}</div>
                      <div className="text-[11px] text-ink/50">{owner?.name ?? 'No client linked'}</div>
                    </div>
                    <span className={`text-[11px] font-medium ${diffDays === 0 ? 'text-coral' : diffDays <= 7 ? 'text-amber-600' : 'text-ink/50'}`}>
                      {diffDays === 0 ? 'Today' : diffDays < 0 ? 'Yesterday' : `In ${diffDays}d`}
                    </span>
                  </div>
                ))}
                {petBirthdays.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No upcoming birthdays.</div>}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Membership distribution</h3>
                <button onClick={() => setTab('membership')} className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></button>
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
                        <div className="h-full rounded-full bg-plum" style={{ width: `${pct}%` }} />
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
          {campaignList.length === 0 ? (
            <Card><EmptyState icon={Megaphone} title="No campaigns" hint="Create your first marketing campaign to engage clients." /></Card>
          ) : (
            <div className="space-y-3">
              {campaignList.map((c) => {
                const reach = num(c.reach);
                const convRate = reach > 0 ? ((num(c.conversions) / reach) * 100).toFixed(1) : '0';
                const openRate = reach > 0 ? ((num(c.opens) / reach) * 100).toFixed(0) : '0';
                const budgetUsed = num(c.budget) > 0 ? ((num(c.spent) / num(c.budget)) * 100).toFixed(0) : '0';
                return (
                  <Card key={c.id} className="p-4 group hover:ring-2 hover:ring-plum/20 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center shrink-0">
                          <Megaphone className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-ink">{c.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/60">{c.channel}</span>
                          </div>
                          <div className="text-[11px] text-ink/50 mt-0.5">
                            {c.startDate} → {c.endDate || 'Ongoing'} · Target: {c.targetSegment || 'All clients'}
                          </div>
                          {c.notes && <div className="text-[11px] text-ink/60 mt-1.5 leading-relaxed">{c.notes}</div>}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Reach</div>
                              <div className="text-sm font-semibold text-ink">{reach}</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Open rate</div>
                              <div className="text-sm font-semibold text-ink">{openRate}%</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Clicks</div>
                              <div className="text-sm font-semibold text-ink">{num(c.clicks)}</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Conversions</div>
                              <div className="text-sm font-semibold text-plum">{num(c.conversions)} ({convRate}%)</div>
                            </div>
                            <div className="rounded-lg bg-canvas px-2.5 py-1.5">
                              <div className="text-[10px] text-ink/50">Budget used</div>
                              <div className="text-sm font-semibold text-ink">{budgetUsed}%</div>
                              <div className="text-[10px] text-ink/45 truncate">{formatMoney(num(c.spent), settings)} of {formatMoney(num(c.budget), settings)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge status={c.status} />
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <IconButton icon={Edit2} label="Edit campaign" size="sm" onClick={() => openEditCamp(c)} />
                          <IconButton
                            icon={Trash2}
                            label="Delete campaign"
                            size="sm"
                            variant="danger"
                            disabled={busyKey === `del-camp-${c.id}`}
                            onClick={() => deleteCamp(c)}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Modal open={campOpen} onClose={closeCamp} title={editCampId ? 'Edit campaign' : 'New campaign'} wide>
            <div className="space-y-4">
              {campError && (
                <div className="flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/10 px-3.5 py-2.5 text-xs font-medium text-coral">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> <span className="leading-relaxed">{campError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Campaign name" required error={campError && !isNonEmpty(campForm.name) ? 'Required' : undefined}>
                  <Input value={campForm.name} error={!!campError && !isNonEmpty(campForm.name)} onChange={(e) => setCamp('name', e.target.value)} placeholder="Spring Vaccination Drive" />
                </Field>
                <Field label="Channel">
                  <Select
                    value={campForm.channel}
                    onChange={(e) => setCamp('channel', e.target.value as Campaign['channel'])}
                    options={['Email', 'SMS', 'WhatsApp', 'Push', 'Mixed'].map((v) => ({ value: v, label: v }))}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={campForm.status}
                    onChange={(e) => setCamp('status', e.target.value as Campaign['status'])}
                    options={['Draft', 'Scheduled', 'Active', 'Paused', 'Completed'].map((v) => ({ value: v, label: v }))}
                  />
                </Field>
                <Field label="Target segment" hint="Segments come from the Segments tab">
                  <Select
                    value={campForm.segmentId}
                    onChange={(e) => setCamp('segmentId', e.target.value)}
                    options={[
                      { value: '', label: 'All clients' },
                      ...db.segments.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </Field>
                <Field label="Start date"><DatePicker value={campForm.startDate} onChange={(e) => setCamp('startDate', e.target.value)} /></Field>
                <Field label="End date" hint="Leave empty for an ongoing campaign"><DatePicker value={campForm.endDate} onChange={(e) => setCamp('endDate', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label={`Budget (${settings.currencySymbol})`}><NumberInput min={0} value={campForm.budget} onChange={(e) => setCamp('budget', e.target.value)} /></Field>
                <Field label={`Spent (${settings.currencySymbol})`}><NumberInput min={0} value={campForm.spent} onChange={(e) => setCamp('spent', e.target.value)} /></Field>
                <Field label="Reach"><NumberInput min={0} value={campForm.reach} onChange={(e) => setCamp('reach', e.target.value)} /></Field>
                <Field label="Opens"><NumberInput min={0} value={campForm.opens} onChange={(e) => setCamp('opens', e.target.value)} /></Field>
                <Field label="Clicks"><NumberInput min={0} value={campForm.clicks} onChange={(e) => setCamp('clicks', e.target.value)} /></Field>
                <Field label="Conversions"><NumberInput min={0} value={campForm.conversions} onChange={(e) => setCamp('conversions', e.target.value)} /></Field>
              </div>
              <Field label="Notes"><Textarea value={campForm.notes} onChange={(e) => setCamp('notes', e.target.value)} placeholder="Campaign strategy, goals, and notes…" className="min-h-[70px]" /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeCamp}>Cancel</Button>
                <Button onClick={saveCamp} disabled={busyKey === 'save-camp'}>
                  {editCampId ? 'Save changes' : 'Create campaign'}
                </Button>
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
          {segmentCards.length === 0 ? (
            <Card><EmptyState icon={Users} title="No segments yet" hint="Build a segment from rules — loyalty points, spend, visits, pet age — and the matching client count is calculated live." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {segmentCards.map(({ seg, owners }) => (
                <Card key={seg.id} className="p-4 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${segColors[segColorFor(seg.id)]}`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{seg.name}</div>
                        <div className="text-[11px] text-ink/50 mt-0.5">
                          Match {seg.match === 'any' ? 'any' : 'all'} · {describeRules(seg)}
                        </div>
                        {seg.description && <div className="text-[11px] text-ink/60 mt-1">{seg.description}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-ink">{owners.length}</div>
                      <div className="text-[10px] text-ink/50">clients</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyKey === `seg-send-${seg.id}`}
                      onClick={() => sendToSegment(seg, owners)}
                    >
                      <Send className="w-3 h-3" /> Send campaign
                    </Button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <IconButton icon={Edit2} label="Edit segment" size="sm" onClick={() => openEditSeg(seg)} />
                      <IconButton
                        icon={Trash2}
                        label="Delete segment"
                        size="sm"
                        variant="danger"
                        disabled={busyKey === `del-seg-${seg.id}`}
                        onClick={() => deleteSeg(seg)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Modal open={segOpen} onClose={closeSeg} title={editSegId ? 'Edit segment' : 'New customer segment'} wide>
            <div className="space-y-4">
              {segError && (
                <div className="flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/10 px-3.5 py-2.5 text-xs font-medium text-coral">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> <span className="leading-relaxed">{segError}</span>
                </div>
              )}
              <Field label="Segment name" required error={segError && !isNonEmpty(segForm.name) ? 'Required' : undefined}>
                <Input
                  value={segForm.name}
                  error={!!segError && !isNonEmpty(segForm.name)}
                  onChange={(e) => setSegForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Senior pet owners"
                />
              </Field>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Rules</span>
                  <SegmentedControl
                    value={segForm.match}
                    onChange={(v) => setSegForm((f) => ({ ...f, match: v === 'any' ? 'any' : 'all' }))}
                    options={[{ value: 'all', label: 'Match all' }, { value: 'any', label: 'Match any' }]}
                  />
                </div>
                <div className="space-y-2">
                  {segForm.rules.map((r) => {
                    const isText = TEXT_FIELDS.includes(r.field);
                    return (
                      <div key={r.key} className="flex items-center gap-2">
                        <Select
                          className="flex-1 min-w-0"
                          value={r.field}
                          onChange={(e) => setRule(r.key, { field: e.target.value as SegmentRuleField })}
                          options={FIELD_OPTIONS}
                        />
                        <Select
                          className="w-40 shrink-0"
                          value={r.op}
                          onChange={(e) => setRule(r.key, { op: e.target.value as SegmentRule['op'] })}
                          options={isText ? TEXT_OP_OPTIONS : OP_OPTIONS}
                        />
                        {isText ? (
                          <Input
                            className="w-32 shrink-0"
                            value={r.value}
                            onChange={(e) => setRule(r.key, { value: e.target.value })}
                            placeholder="Dog"
                          />
                        ) : (
                          <NumberInput
                            className="w-32 shrink-0"
                            min={0}
                            value={r.value}
                            onChange={(e) => setRule(r.key, { value: e.target.value })}
                          />
                        )}
                        <IconButton
                          icon={X}
                          label="Remove rule"
                          size="sm"
                          variant="danger"
                          disabled={segForm.rules.length <= 1}
                          onClick={() => removeRule(r.key)}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-3 mt-2.5">
                  <Button size="sm" variant="ghost" onClick={addRule}><Plus className="w-3 h-3" /> Add rule</Button>
                  <span className="text-[11px] text-ink/55">
                    {previewRules.length === 0
                      ? 'Give each rule a value to preview the audience'
                      : `Matches ${previewCount} client${previewCount === 1 ? '' : 's'} right now`}
                  </span>
                </div>
                {segForm.rules.some((r) => r.field === 'vaccinationDue') && (
                  <div className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2 mt-2.5">
                    <Info className="w-4 h-4 text-ink/40 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-ink/55 leading-relaxed">
                      The shared rule engine does not evaluate &ldquo;Vaccination due&rdquo; yet — it always reads
                      as 0, so a rule on it will not select the clients you expect. Use the Vax Reminders tab instead.
                    </span>
                  </div>
                )}
              </div>

              <Field label="Description" hint="Shown on the segment card">
                <Textarea
                  value={segForm.description}
                  onChange={(e) => setSegForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what this segment represents…"
                  className="min-h-[60px]"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={closeSeg}>Cancel</Button>
                <Button onClick={saveSeg} disabled={busyKey === 'save-seg'}>
                  {editSegId ? 'Save changes' : 'Create segment'}
                </Button>
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
            <StatCard icon={Cake} label="Next 30 days" value={petBirthdays.filter((b) => b.diffDays >= 0 && b.diffDays <= BIRTHDAY_WINDOW_DAYS).length} sub="Pet birthdays" tone="amber" />
            <StatCard icon={CalendarClock} label="Next 7 days" value={petBirthdays.filter((b) => b.diffDays >= 0 && b.diffDays <= 7).length} sub="Coming up soon" tone="coral" />
            <StatCard icon={Gift} label="Today" value={petBirthdays.filter((b) => b.diffDays === 0).length} sub="Celebrate now" tone="plum" />
          </div>
          {petBirthdays.length === 0 ? (
            <Card><EmptyState icon={Cake} title="No upcoming birthdays" hint="Pet birthdays in the next 30 days will appear here." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {petBirthdays.map(({ pet, owner, diffDays, birth }) => (
                <Card key={pet.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${diffDays === 0 ? 'bg-coral/15 text-coral' : diffDays <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-lilac text-plum'}`}>
                      <Cake className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink">{pet.name}</div>
                      <div className="text-[11px] text-ink/50">{pet.species} · {pet.breed}</div>
                      <div className="text-[11px] text-ink/60 mt-0.5">{owner ? `${owner.name} · ${owner.phone}` : 'No client linked'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-sm font-semibold ${diffDays === 0 ? 'text-coral' : diffDays <= 7 ? 'text-amber-600' : 'text-ink/60'}`}>
                        {diffDays === 0 ? 'Today' : diffDays < 0 ? 'Yesterday' : `In ${diffDays}d`}
                      </div>
                      <div className="text-[10px] text-ink/40">{birth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
                    {owner ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busyKey === `greet-${pet.id}`} onClick={() => sendGreeting(pet, owner)}>
                          <Mail className="w-3 h-3" /> Send greeting
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyKey === `treat-${pet.id}`} onClick={() => giveTreat(pet, owner)}>
                          <Gift className="w-3 h-3" /> Free treat
                        </Button>
                      </>
                    ) : (
                      <span className="text-[11px] text-ink/45">Link this pet to a client to send a greeting.</span>
                    )}
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
            <StatCard icon={AlertCircle} label="Overdue" value={vaccineReminders.filter((v) => v.isOverdue).length} sub={`Within the last ${OVERDUE_WINDOW_DAYS} days`} tone="coral" />
            <StatCard icon={Clock} label="Due soon" value={vaccineReminders.filter((v) => !v.isOverdue).length} sub="Within 30 days" tone="amber" />
            <StatCard icon={Syringe} label="Reminders to send" value={vaccineReminders.filter((v) => !v.v.reminderSent).length} sub={`${vaccineReminders.length} in the window`} tone="plum" />
          </div>
          {vaccineReminders.length === 0 ? (
            <Card><EmptyState icon={Syringe} title="No vaccination reminders" hint="Pets with an upcoming or recently missed vaccination will appear here." /></Card>
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
                          {owner ? `${owner.name} · ${owner.phone} · ` : ''}Dose {v.doseNumber}/{v.totalDoses}
                        </div>
                        <div className="text-[11px] text-ink/60 mt-1">
                          {isOverdue ? (
                            <span className="text-coral font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Overdue
                              {v.nextDueDate ? ` since ${v.nextDueDate}${daysUntilDue !== null ? ` (${Math.abs(daysUntilDue)}d)` : ''}` : ''}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`}
                              {v.nextDueDate ? ` (${v.nextDueDate})` : ''}
                            </span>
                          )}
                        </div>
                        {v.reminderSent && (
                          <div className="text-[11px] text-plum mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Reminder already sent
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyKey === `vax-${v.id}`}
                        onClick={() => sendVaccineReminder(v, pet, owner)}
                      >
                        <Send className="w-3 h-3" /> {v.reminderSent ? 'Remind again' : 'Remind'}
                      </Button>
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
            <StatCard icon={Star} label="Total points issued" value={db.owners.reduce((s, o) => s + num(o.loyaltyPoints), 0)} sub="All clients" tone="amber" />
            <StatCard icon={Award} label="Top tier" value={db.owners.filter((o) => num(o.loyaltyPoints) > 500).length} sub="500+ points" tone="plum" />
            <StatCard icon={Users} label="Active members" value={db.owners.filter((o) => num(o.loyaltyPoints) > 0).length} sub="Earning points" tone="sky" />
            <StatCard icon={Gift} label="Avg points" value={Math.round(db.owners.reduce((s, o) => s + num(o.loyaltyPoints), 0) / Math.max(db.owners.length, 1))} sub="Per client" tone="coral" />
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Loyalty leaderboard</h3>
              <span className="text-[11px] text-ink/50">Spend is money collected, visits are completed appointments</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                    <th className="py-2.5 pr-4 font-semibold">Rank</th>
                    <th className="py-2.5 pr-4 font-semibold">Client</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Points</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Visits</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Total paid</th>
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
                        <td className="py-3 pr-4 text-right text-ink/70">{formatMoney(l.totalSpent, settings)}</td>
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
            <StatCard icon={Share2} label="Referrals identified" value={totalReferrals} sub="From client notes" tone="plum" />
            <StatCard icon={Users} label="Referrers" value={referrals.length} sub="Named by another client" tone="coral" />
            <StatCard icon={Gift} label="Rewards issued" value={rewardsLogged} sub={`${rewardsLogged * REFERRAL_REWARD_POINTS} loyalty points`} tone="amber" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Referrers</h3>
            <div className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 mb-4">
              <Info className="w-4 h-4 text-ink/40 shrink-0 mt-0.5" />
              <p className="text-[11px] text-ink/55 leading-relaxed">
                A client record has no referral field yet, so the only honest signal is a client note that
                names another client. Nothing on this tab is inferred from loyalty points, and
                &ldquo;Rewards issued&rdquo; counts the reward entries actually written to a client&rsquo;s
                communication log.
              </p>
            </div>
            {referrals.length === 0 ? (
              <EmptyState
                icon={Share2}
                title="No referrals recorded"
                hint="When a client's notes name the person who referred them, that referrer appears here with a real count."
              />
            ) : (
              <div className="space-y-2">
                {referrals.map((r, i) => (
                  <div key={r.owner.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-lilac text-plum flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{r.owner.name}</div>
                      <div className="text-[11px] text-ink/50 truncate">Named by {r.referred.map((o) => o.name).join(', ')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-plum">{r.referred.length}</div>
                      <div className="text-[10px] text-ink/45">referrals</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-amber-600">{num(r.owner.loyaltyPoints)}</div>
                      <div className="text-[10px] text-ink/45">points</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyKey === `reward-${r.owner.id}`}
                      onClick={() => rewardReferrer(r.owner, r.referred.length)}
                    >
                      <Gift className="w-3 h-3" /> Reward
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Referral program details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-lilac p-4">
                <Gift className="w-5 h-5 text-plum mb-2" />
                <div className="text-sm font-semibold text-ink">Referrer reward</div>
                <div className="text-[11px] text-ink/60 mt-1">{REFERRAL_REWARD_POINTS} loyalty points for every successful referral that books an appointment. The Reward button applies exactly this.</div>
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
                    <div className="text-[11px] text-ink/50">{m.name} ({m.price > 0 ? `${settings.currencySymbol}${m.price}/mo` : 'Free'})</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {membershipPlans.map((plan) => {
              const count = membershipStats.find((m) => m.name === plan.name)?.count || 0;
              return (
                <Card key={plan.name} className="p-5">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${plan.color}`}>
                    <Crown className="w-3.5 h-3.5" /> {plan.name}
                  </div>
                  <div className="text-2xl font-bold text-ink">{settings.currencySymbol}{plan.price}<span className="text-sm font-normal text-ink/50">/mo</span></div>
                  <div className="mt-3 space-y-2">
                    {plan.perks.map((perk) => (
                      <div key={perk} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-plum shrink-0 mt-0.5" />
                        <span className="text-xs text-ink/70">{perk}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-line">
                    <div className="text-sm font-semibold text-ink">{count} <span className="text-xs font-normal text-ink/50">subscribers</span></div>
                    <div className="text-[11px] text-ink/50 mt-0.5">
                      {plan.price > 0 ? `${formatMoney(count * plan.price, settings)}/mo revenue` : 'No recurring revenue'}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 mt-4">
            <Info className="w-4 h-4 text-ink/40 shrink-0 mt-0.5" />
            <p className="text-[11px] text-ink/55 leading-relaxed">
              Plan names, prices and perks are defined in this page&rsquo;s source rather than in the
              database. Subscriber counts come from each client&rsquo;s stored membership plan, but the
              monthly revenue figures follow the hardcoded prices — changing a price needs a code change.
            </p>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          FEEDBACK TAB
         ════════════════════════════════════════════ */}
      {tab === 'feedback' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={MessageSquare} label="Total feedback" value={allFeedback.length} sub="All time" tone="plum" />
            <StatCard icon={Star} label="Avg rating" value={(allFeedback.reduce((s, f) => s + num(f.rating), 0) / Math.max(allFeedback.length, 1)).toFixed(1)} sub="Out of 5" tone="amber" />
            <StatCard icon={ThumbsUp} label="Positive (4-5)" value={allFeedback.filter((f) => f.rating >= 4).length} sub="Happy clients" tone="plum" />
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
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.rating >= 4 ? 'bg-lilac text-plum' : f.rating >= 3 ? 'bg-amber-100 text-amber-600' : 'bg-coral/15 text-coral'}`}>
                        <Star className={`w-5 h-5 ${f.rating >= 4 ? 'fill-plum' : f.rating >= 3 ? 'fill-amber-500' : 'fill-coral'}`} />
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
            <StatCard icon={Heart} label="Retention rate" value={`${retentionRate}%`} sub={`${returningOwners}/${totalOwners} with 2+ visits`} tone="plum" />
            <StatCard icon={Users} label="New clients" value={newClients.length} sub="Last 90 days" tone="sky" />
            <StatCard icon={AlertCircle} label="Needs win-back" value={inactiveClients.length} sub="6+ months or never visited" tone="coral" />
            <StatCard icon={TrendingUp} label="Avg visits/client" value={(completedApptCount / Math.max(totalOwners, 1)).toFixed(1)} sub="Completed, all time" tone="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Retention funnel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total registered clients', count: totalOwners, color: 'bg-plum' },
                  { label: 'Completed at least one visit', count: visitedOwners, color: 'bg-sky-500' },
                  { label: 'Returned for a 2nd visit', count: returningOwners, color: 'bg-amber-500' },
                  { label: '3+ visits (loyal)', count: loyalOwners, color: 'bg-coral' },
                ].map((stage) => {
                  const pct = totalOwners > 0 ? (stage.count / totalOwners) * 100 : 0;
                  return (
                    <div key={stage.label}>
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
              <p className="text-[11px] text-ink/45 mt-3 leading-relaxed">
                A visit means a completed appointment. Cancelled and no-show bookings are not counted.
              </p>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Clients to win back</h3>
              {inactiveClients.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Heart className="w-6 h-6 text-plum mb-2" />
                  <span className="text-sm text-ink/50">Every registered client has visited recently.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {inactiveClients.slice(0, 15).map(({ owner, lastVisit, daysSince }) => (
                    <div key={owner.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-coral/20 bg-coral/5">
                      <AlertCircle className="w-4 h-4 text-coral shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{owner.name}</div>
                        <div className="text-[11px] text-ink/50">
                          {lastVisit ? `Last visit: ${lastVisit} (${daysSince}d ago)` : 'Registered, never completed a visit'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyKey === `reach-${owner.id}`}
                        onClick={() => reachOut(owner, lastVisit)}
                      >
                        <Send className="w-3 h-3" /> Reach out
                      </Button>
                    </div>
                  ))}
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
            <StatCard icon={Phone} label="Phone calls" value={allComms.filter((c) => c.channel === 'Phone').length} sub="Logged" tone="plum" />
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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.direction === 'Outgoing' ? 'bg-sky-100 text-sky-600' : 'bg-lilac text-plum'}`}>
                        <ChannelIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-ink">{c.ownerName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.direction === 'Outgoing' ? 'bg-sky-50 text-sky-600' : 'bg-lilac text-plum'}`}>{c.direction}</span>
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
