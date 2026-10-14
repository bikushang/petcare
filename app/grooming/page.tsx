'use client';

import { useMemo, useState } from 'react';
import {
  Scissors, Plus, Clock, Edit2, Trash2, CheckCircle2, Play,
  Sparkles, Bath, PawPrint, Eye, Ear, Smile, Palette, Package, Camera,
  Bell, History, DollarSign, Star, X, Calendar, AlertCircle,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Badge, Button, EmptyState, Modal, Field, Input, SearchInput, Select, DateInput, TimeInput,
  Textarea, NumberInput, StatCard, ImagePicker,
} from '../components/ui';
import {
  useDB, GroomingAppt, GroomingProduct, GroomingPhoto, GroomingServiceItem,
  newId,
} from '../lib/store';
import {
  localDateISO, num, numMin, round2, isZeroMoney, nextDocNumber, confirmDelete, isNonEmpty,
} from '../lib/helpers';
import { useSettings, formatMoney, formatDate, prefixFor } from '../lib/settings';

/**
 * The service menu and the packages are still hardcoded: there is no `services`
 * or `packages` collection on the server, so prices cannot be changed from the
 * UI. Package pricing is at least honoured correctly now (see
 * `packageServiceItems`).
 */
const allServices = [
  { name: 'Bath service', price: 35, icon: Bath },
  { name: 'Haircut', price: 45, icon: Scissors },
  { name: 'Nail trimming', price: 15, icon: PawPrint },
  { name: 'Ear cleaning', price: 15, icon: Ear },
  { name: 'Teeth cleaning', price: 25, icon: Smile },
  { name: 'Spa treatment', price: 75, icon: Sparkles },
  { name: 'Fur coloring', price: 55, icon: Palette },
  { name: 'De-shed treatment', price: 50, icon: Scissors },
  { name: 'Sanitary trim', price: 20, icon: Scissors },
  { name: 'Brush out', price: 25, icon: Scissors },
] as const;

type GroomingPackage = { id: string; name: string; services: readonly string[]; price: number; discount: number };

const packages: readonly GroomingPackage[] = [
  { id: 'pkg-basic', name: 'Basic Groom Package', services: ['Bath service', 'Nail trimming', 'Ear cleaning'], price: 60, discount: 5 },
  { id: 'pkg-full', name: 'Full Groom Package', services: ['Bath service', 'Haircut', 'Nail trimming', 'Ear cleaning'], price: 110, discount: 15 },
  { id: 'pkg-spa', name: 'Spa & Relax Package', services: ['Spa treatment', 'Teeth cleaning', 'Ear cleaning'], price: 95, discount: 20 },
  { id: 'pkg-deluxe', name: 'Deluxe Makeover Package', services: ['Bath service', 'Haircut', 'Nail trimming', 'Ear cleaning', 'Teeth cleaning', 'Spa treatment'], price: 180, discount: 30 },
];

const listPriceOf = (name: string) => num(allServices.find((s) => s.name === name)?.price, 0);

/**
 * Service lines for a package, scaled so they add up to exactly `pkg.price`.
 *
 * The old code summed the individual list prices and then subtracted the
 * package discount, which charged more than the advertised package price —
 * Basic Groom advertised at $55 was billed $60 (65 − 5), Spa & Relax
 * advertised at $75 was billed $95 (115 − 20) and Deluxe advertised at $150
 * was billed $180 (210 − 30).
 */
function packageServiceItems(pkg: GroomingPackage): GroomingServiceItem[] {
  const lines = pkg.services.map((name) => ({ name, list: listPriceOf(name) }));
  const listSum = round2(lines.reduce((s, l) => s + l.list, 0));
  const items: GroomingServiceItem[] = lines.map((l) => ({
    id: newId('gs'),
    name: l.name,
    price: listSum > 0
      ? round2((l.list / listSum) * pkg.price)
      : round2(pkg.price / Math.max(1, lines.length)),
  }));
  // Put any rounding remainder on the last line so Σ price === pkg.price exactly.
  const drift = round2(pkg.price - items.reduce((s, i) => s + i.price, 0));
  if (items.length > 0 && !isZeroMoney(drift)) {
    items[items.length - 1] = {
      ...items[items.length - 1],
      price: round2(items[items.length - 1].price + drift),
    };
  }
  return items;
}

const statusFlow: Record<GroomingAppt['status'], GroomingAppt['status'] | null> = {
  'Scheduled': 'Checked-in',
  'Checked-in': 'In progress',
  'In progress': 'Completed',
  'Completed': null,
  'Cancelled': null,
  'No-show': null,
};

/** Statuses that take an appointment off the active board for good. */
const CLOSED_STATUSES: GroomingAppt['status'][] = ['Completed', 'Cancelled', 'No-show'];
const isClosed = (g: GroomingAppt) => CLOSED_STATUSES.includes(g.status);

const UNITEMISED = 'Unitemised / package only';

type Tab = 'appointments' | 'history' | 'revenue';
type HistoryFilter = 'All' | 'Completed' | 'Cancelled' | 'No-show';

const blankProduct = (): GroomingProduct => ({ id: '', name: '', quantity: '' });
const blankPhoto = (type: 'before' | 'after'): GroomingPhoto => ({ id: '', type, url: '', caption: '' });

const blankForm = () => ({
  appointmentNumber: '', petName: '', owner: '', ownerId: '', petId: '',
  groomer: '', date: localDateISO(),
  time: '10:00', durationMin: 60, status: 'Scheduled' as GroomingAppt['status'],
  services: [] as GroomingServiceItem[], packageId: '', packageName: '',
  notes: '', groomingNotes: '', productsUsed: [] as GroomingProduct[],
  beforePhotos: [] as GroomingPhoto[], afterPhotos: [] as GroomingPhoto[],
  reminderMethod: 'SMS' as GroomingAppt['reminderMethod'], reminderDate: '',
  nextGroomingDate: '', rating: 0, customerFeedback: '',
  subtotal: 0, discount: 0, tax: 0, total: 0,
  paymentMethod: '' as GroomingAppt['paymentMethod'], paymentStatus: '' as GroomingAppt['paymentStatus'],
});

export default function GroomingPage() {
  const { db, create, update, remove } = useDB();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('appointments');
  const [open, setOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<GroomingAppt | null>(null);
  const [form, setForm] = useState(blankForm());
  const [formError, setFormError] = useState('');
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('All');
  const [detailId, setDetailId] = useState<string | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const todayStr = localDateISO();
  const grooming = db?.grooming ?? [];
  const todays = grooming.filter((g) => g.date === todayStr);
  // A Completed / Cancelled / No-show appointment is not "upcoming" even when
  // its date is in the future — it used to show in both Upcoming and History.
  const upcoming = grooming
    .filter((g) => g.date > todayStr && !isClosed(g))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = grooming
    .filter((g) => isClosed(g) || g.date < todayStr)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const completed = grooming.filter((g) => g.status === 'Completed');
  const totalRevenue = round2(completed.reduce((s, g) => s + num(g.total), 0));
  const rated = completed.filter((g) => num(g.rating) > 0);
  const avgRating = rated.length > 0
    ? (rated.reduce((s, g) => s + num(g.rating), 0) / rated.length).toFixed(1)
    : '0.0';

  // Filtered history
  const historyFiltered = useMemo(() => {
    const q = search.toLowerCase();
    return past.filter((g) => {
      if (historyFilter !== 'All' && g.status !== historyFilter) return false;
      if (!q) return true;
      return (
        g.petName.toLowerCase().includes(q) ||
        g.owner.toLowerCase().includes(q) ||
        g.groomer.toLowerCase().includes(q) ||
        (g.packageName || '').toLowerCase().includes(q) ||
        (g.services || []).some((s) => s.name.toLowerCase().includes(q))
      );
    });
  }, [past, search, historyFilter]);

  /**
   * Revenue by service, allocated pro-rata from the amount actually charged, so
   * the bars reconcile with "Revenue (Completed)". Summing raw list prices
   * ignored every discount and over-stated the total.
   */
  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach((g) => {
      const lines = g.services || [];
      const gross = round2(lines.reduce((s, l) => s + num(l.price), 0));
      const net = num(g.total);
      if (gross <= 0) {
        if (net > 0) map[UNITEMISED] = round2((map[UNITEMISED] || 0) + net);
        return;
      }
      const ratio = net / gross;
      lines.forEach((l) => {
        map[l.name] = round2((map[l.name] || 0) + num(l.price) * ratio);
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [completed]);

  // Revenue by groomer
  const revenueByGroomer = useMemo(() => {
    const result: Record<string, { revenue: number; count: number }> = {};
    completed.forEach((g) => {
      const key = g.groomer || 'Unassigned';
      if (!result[key]) result[key] = { revenue: 0, count: 0 };
      result[key].revenue = round2(result[key].revenue + num(g.total));
      result[key].count += 1;
    });
    return Object.entries(result).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [completed]);

  /** Groomers come from `db.staff`, not a hardcoded array. */
  const groomers = useMemo(() => {
    const staff = db?.staff ?? [];
    const list = staff.filter((s) => s.role === 'Groomer' && s.status !== 'Inactive').map((s) => s.name);
    if (list.length === 0) {
      // No one is flagged as a Groomer — fall back to active staff rather than
      // leaving the page unusable.
      list.push(...staff.filter((s) => s.status === 'Active').map((s) => s.name));
    }
    // Keep names already on existing records selectable so editing an old
    // appointment cannot silently reassign it.
    const seen = new Set(list);
    (db?.grooming ?? []).forEach((g) => {
      if (g.groomer && !seen.has(g.groomer)) { seen.add(g.groomer); list.push(g.groomer); }
    });
    return list;
  }, [db?.staff, db?.grooming]);

  if (!db) return <Shell module="grooming" title="Grooming"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  const detailAppt = detailId ? db.grooming.find((g) => g.id === detailId) ?? null : null;
  const fmtMoney = (n: number) => formatMoney(num(n), settings);
  const fmtDate = (iso: string) => (iso ? formatDate(iso, settings) : '—');

  // ── Pricing ──
  const recalcTotal = (services: GroomingServiceItem[], discount: number, tax: number) => {
    const subtotal = round2(services.reduce((s, i) => s + num(i.price), 0));
    return { subtotal, total: round2(Math.max(0, subtotal - num(discount) + num(tax))) };
  };

  const toggleService = (svcName: string, price: number) => {
    setForm((f) => {
      const exists = f.services.find((s) => s.name === svcName);
      let services = exists
        ? f.services.filter((s) => s.name !== svcName)
        : [...f.services, { id: newId('gs'), name: svcName, price: num(price) }];
      // Stepping outside a package drops the package, its discount and its
      // scaled prices — previously the package discount stayed applied to a
      // basket the package no longer covered.
      const leavingPackage = !!f.packageId;
      if (leavingPackage) {
        services = services.map((s) => ({ ...s, price: listPriceOf(s.name) || num(s.price) }));
      }
      const discount = leavingPackage ? 0 : f.discount;
      const { subtotal, total } = recalcTotal(services, discount, f.tax);
      return { ...f, services, subtotal, total, discount, packageId: '', packageName: '' };
    });
  };

  const selectPackage = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) {
      // "Custom" clears the services *and* the package discount.
      setForm((f) => {
        const { subtotal, total } = recalcTotal([], 0, f.tax);
        return { ...f, services: [], packageId: '', packageName: '', discount: 0, subtotal, total };
      });
      return;
    }
    const services = packageServiceItems(pkg);
    setForm((f) => {
      // Charged total is exactly pkg.price − pkg.discount.
      const { subtotal, total } = recalcTotal(services, pkg.discount, f.tax);
      return { ...f, services, packageId: pkg.id, packageName: pkg.name, subtotal, discount: pkg.discount, total };
    });
  };

  const setDiscount = (value: string) =>
    setForm((f) => {
      const discount = numMin(value, 0);
      const { subtotal, total } = recalcTotal(f.services, discount, f.tax);
      return { ...f, discount, subtotal, total };
    });

  const setTax = (value: string) =>
    setForm((f) => {
      const tax = numMin(value, 0);
      const { subtotal, total } = recalcTotal(f.services, f.discount, tax);
      return { ...f, tax, subtotal, total };
    });

  // ── Products ──
  const addProduct = () => setForm((f) => ({ ...f, productsUsed: [...f.productsUsed, { ...blankProduct(), id: newId('gp') }] }));
  const removeProduct = (id: string) => setForm((f) => ({ ...f, productsUsed: f.productsUsed.filter((p) => p.id !== id) }));
  const setProduct = (id: string, k: keyof GroomingProduct, v: string) =>
    setForm((f) => ({ ...f, productsUsed: f.productsUsed.map((p) => (p.id === id ? { ...p, [k]: v } : p)) }));

  // ── Before / after photos ──
  const addPhoto = (type: 'before' | 'after') =>
    setForm((f) => (type === 'before'
      ? { ...f, beforePhotos: [...f.beforePhotos, { ...blankPhoto('before'), id: newId('gph') }] }
      : { ...f, afterPhotos: [...f.afterPhotos, { ...blankPhoto('after'), id: newId('gph') }] }));

  const patchPhoto = (type: 'before' | 'after', id: string, patch: Partial<GroomingPhoto>) =>
    setForm((f) => (type === 'before'
      ? { ...f, beforePhotos: f.beforePhotos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
      : { ...f, afterPhotos: f.afterPhotos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const dropPhoto = (type: 'before' | 'after', id: string) =>
    setForm((f) => (type === 'before'
      ? { ...f, beforePhotos: f.beforePhotos.filter((p) => p.id !== id) }
      : { ...f, afterPhotos: f.afterPhotos.filter((p) => p.id !== id) }));

  // ── Owner / pet pickers (ids, not free text) ──
  const pickOwner = (ownerId: string) => {
    const owner = db.owners.find((o) => o.id === ownerId);
    setForm((f) => ({ ...f, ownerId, owner: owner?.name || '', petId: '', petName: '' }));
  };

  const pickPet = (petId: string) => {
    const pet = db.pets.find((p) => p.id === petId);
    setForm((f) => ({
      ...f,
      petId,
      petName: pet?.name || '',
      ownerId: pet?.ownerId || f.ownerId,
      owner: db.owners.find((o) => o.id === pet?.ownerId)?.name || f.owner,
    }));
  };

  const petOptions = form.ownerId ? db.pets.filter((p) => p.ownerId === form.ownerId) : db.pets;

  // ── Modal open/close ──
  const resetFormErrors = () => { setFormError(''); setFieldErr({}); };
  const closeForm = () => { setOpen(false); setEditAppt(null); resetFormErrors(); };

  const nextApptNumber = () => {
    const numbers = db.grooming.map((g) => g.appointmentNumber || '');
    // Start after the highest suffix already issued under *any* prefix, so
    // changing the prefix in Settings cannot reissue a number already in use.
    const highest = numbers.reduce((max, n) => {
      const m = /(\d+)\s*$/.exec(n);
      const v = m ? parseInt(m[1], 10) : NaN;
      return Number.isFinite(v) && v > max ? v : max;
    }, 0);
    return nextDocNumber(prefixFor('grooming', settings), numbers, highest + 1, 4);
  };

  const openNew = () => {
    setEditAppt(null);
    resetFormErrors();
    setForm({ ...blankForm(), appointmentNumber: nextApptNumber(), groomer: groomers[0] || '' });
    setOpen(true);
  };

  const openEdit = (g: GroomingAppt) => {
    setEditAppt(g);
    resetFormErrors();
    setForm({
      appointmentNumber: g.appointmentNumber, petName: g.petName, owner: g.owner,
      ownerId: g.ownerId || '', petId: g.petId || '', groomer: g.groomer,
      date: g.date, time: g.time, durationMin: num(g.durationMin, 60), status: g.status,
      services: (g.services || []).map((s) => ({ ...s })), packageId: g.packageId, packageName: g.packageName,
      notes: g.notes, groomingNotes: g.groomingNotes,
      productsUsed: (g.productsUsed || []).map((p) => ({ ...p })),
      beforePhotos: (g.beforePhotos || []).map((p) => ({ ...p })),
      afterPhotos: (g.afterPhotos || []).map((p) => ({ ...p })),
      reminderMethod: g.reminderMethod, reminderDate: g.reminderDate, nextGroomingDate: g.nextGroomingDate,
      rating: num(g.rating), customerFeedback: g.customerFeedback || '',
      subtotal: num(g.subtotal), discount: num(g.discount), tax: num(g.tax), total: num(g.total),
      paymentMethod: g.paymentMethod, paymentStatus: g.paymentStatus,
    });
    setOpen(true);
  };

  const saveGroom = async () => {
    const errs: Record<string, string> = {};
    if (!form.petId || !isNonEmpty(form.petName)) errs.petId = 'Choose which pet is being groomed.';
    if (!isNonEmpty(form.groomer)) errs.groomer = 'Assign a groomer.';
    if (!isNonEmpty(form.date)) errs.date = 'Pick a date.';
    if (!isNonEmpty(form.time)) errs.time = 'Pick a time.';
    setFieldErr(errs);
    if (Object.keys(errs).length > 0) {
      setFormError('Please fix the highlighted fields before saving.');
      return;
    }
    setFormError('');

    const { subtotal, total } = recalcTotal(form.services, form.discount, form.tax);
    const data = {
      ...form,
      subtotal,
      total,
      productsUsed: form.productsUsed.filter((p) => isNonEmpty(p.name)),
      beforePhotos: form.beforePhotos.filter((p) => isNonEmpty(p.url)),
      afterPhotos: form.afterPhotos.filter((p) => isNonEmpty(p.url)),
      // A new booking has not been reminded yet. Deriving this from the reminder
      // *method* (which defaults to SMS) flagged every booking as reminded and
      // hid the send button for good.
      reminderSent: editAppt?.reminderSent ?? false,
      createdAt: editAppt?.createdAt || localDateISO(),
    };
    try {
      if (editAppt) {
        await update('grooming', editAppt.id, data);
      } else {
        await create('grooming', { id: newId('grm'), ...data } as GroomingAppt);
      }
      closeForm();
    } catch (err) {
      setFormError((err as Error).message || 'Could not save this appointment.');
    }
  };

  const patchLive = async (id: string, build: (live: GroomingAppt) => Partial<GroomingAppt>) => {
    const live = db.grooming.find((g) => g.id === id);
    if (!live) { setActionError('That appointment no longer exists.'); return false; }
    try {
      setActionError('');
      await update('grooming', id, build(live));
      return true;
    } catch (err) {
      setActionError((err as Error).message || 'Could not save that change.');
      return false;
    }
  };

  const advanceStatus = (id: string) => {
    const live = db.grooming.find((g) => g.id === id);
    if (!live) { setActionError('That appointment no longer exists.'); return; }
    const next = statusFlow[live.status];
    if (!next) return;
    patchLive(id, () => ({ status: next }));
  };

  /** Records that a reminder is due to go out — nothing is actually sent here. */
  const logReminder = (g: GroomingAppt) =>
    patchLive(g.id, () => ({ reminderSent: true, reminderDate: localDateISO() }));

  const deleteGroom = async (g: GroomingAppt) => {
    if (!confirmDelete(`grooming appointment ${g.appointmentNumber || g.petName}`, `${g.petName} · ${fmtDate(g.date)}`)) return;
    try {
      setActionError('');
      await remove('grooming', g.id);
      if (detailId === g.id) setDetailId(null);
    } catch (err) {
      setActionError((err as Error).message || 'Could not delete that appointment.');
    }
  };

  // ── Render helpers ──
  const tabBtn = (t: Tab, label: string, Icon: typeof Scissors) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-plum text-white' : 'text-ink/60 hover:bg-lilac/50 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const renderServiceChips = (services: GroomingServiceItem[]) => (
    <div className="flex flex-wrap gap-1">
      {services.map((s) => (
        <span key={s.id || s.name} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-lilac text-plum">
          {s.name}
        </span>
      ))}
    </div>
  );

  const renderStars = (value: number, size = 'w-3 h-3') => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-ink/20'}`} />
      ))}
    </div>
  );

  const renderCard = (g: GroomingAppt) => (
    <Card key={g.id} className="p-4 group">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center w-14 shrink-0">
          <Clock className="w-3.5 h-3.5 text-ink/40" />
          <span className="text-sm font-semibold text-ink mt-0.5">{g.time}</span>
          {g.date !== todayStr && <span className="text-[10px] text-ink/40">{g.date.slice(5)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink">{g.petName} · {g.appointmentNumber || '—'}</div>
          <div className="text-[11px] text-ink/50">{g.owner} · {g.groomer}</div>
          {(g.services && g.services.length > 0) ? renderServiceChips(g.services) : (
            <div className="text-[11px] text-ink/40 mt-0.5">{g.notes}</div>
          )}
          {g.packageName && <div className="text-[10px] text-plum font-medium mt-0.5">{g.packageName}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge status={g.status} />
          {num(g.total) > 0 && <span className="text-[11px] font-semibold text-ink">{fmtMoney(g.total)}</span>}
          {g.reminderSent && <span className="text-[10px] text-ink/40 flex items-center gap-0.5"><Bell className="w-2.5 h-2.5" /> Reminder logged</span>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setDetailId(g.id)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Details">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {statusFlow[g.status] && (
            <button onClick={() => advanceStatus(g.id)} className="w-7 h-7 rounded-lg hover:bg-lilac text-ink/40 hover:text-plum flex items-center justify-center transition-colors" title={`Move to ${statusFlow[g.status]}`}>
              {g.status === 'Scheduled' ? <Play className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {!g.reminderSent && g.status === 'Scheduled' && (
            <button onClick={() => logReminder(g)} className="w-7 h-7 rounded-lg hover:bg-amber-50 text-ink/40 hover:text-amber-600 flex items-center justify-center transition-colors" title="Log a reminder (recorded on the appointment — no message is sent from here)">
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => openEdit(g)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteGroom(g)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );

  const photoEditor = (type: 'before' | 'after') => {
    const photos = type === 'before' ? form.beforePhotos : form.afterPhotos;
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">
            {type === 'before' ? 'Before photos' : 'After photos'}
          </span>
          <Button size="sm" variant="outline" onClick={() => addPhoto(type)}><Plus className="w-3.5 h-3.5" /> Add</Button>
        </div>
        {photos.length === 0 ? (
          <p className="text-xs text-ink/40 py-1">No {type} photos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="p-2.5 rounded-xl border border-line">
                <ImagePicker
                  label={type === 'before' ? 'Before' : 'After'}
                  value={p.url}
                  onChange={(e) => patchPhoto(type, p.id, { url: e.target.value })}
                  aspect="aspect-[4/3]"
                  maxPx={1200}
                />
                <div className="flex gap-2 items-center mt-2">
                  <Input className="flex-1" value={p.caption} onChange={(e) => patchPhoto(type, p.id, { caption: e.target.value })} placeholder="Caption" />
                  <button onClick={() => dropPhoto(type, p.id)} className="w-9 h-10 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors" title="Remove photo">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const photoGallery = (label: string, photos: GroomingPhoto[]) => (
    <div>
      <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
        <Camera className="w-3.5 h-3.5 text-plum" /> {label}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p) => (
          <figure key={p.id} className="rounded-xl overflow-hidden border border-line bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption || label} className="w-full h-28 object-cover" />
            {p.caption && <figcaption className="px-2 py-1.5 text-[11px] text-ink/60 truncate">{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );

  return (
    <Shell module="grooming" title="Grooming" subtitle="Grooming appointments, services, and revenue tracking">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Grooming Management</h1>
            <p className="text-sm text-ink/50 mt-0.5">Book appointments, track services, and monitor revenue</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4" /> Book Grooming</Button>
        </div>

        {actionError && (
          <div className="flex items-start gap-2 mb-4 text-xs font-medium text-coral bg-coral/10 border border-coral/25 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            <span className="flex-1">{actionError}</span>
            <button onClick={() => setActionError('')} className="text-coral/70 hover:text-coral"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Scissors} label="Total Appointments" value={db.grooming.length} sub="all time" tone="plum" />
          <StatCard icon={DollarSign} label="Revenue (Completed)" value={fmtMoney(totalRevenue)} sub={`${completed.length} sessions`} tone="sky" />
          <StatCard icon={Star} label="Avg Rating" value={avgRating} sub={`${rated.length} rated`} tone="amber" />
          <StatCard icon={Clock} label="Today" value={todays.length} sub="appointments" tone="coral" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 p-1 bg-canvas rounded-xl border border-line w-fit">
          {tabBtn('appointments', 'Appointments', Scissors)}
          {tabBtn('history', 'Service History', History)}
          {tabBtn('revenue', 'Revenue', DollarSign)}
        </div>

        {/* ── Appointments Tab ── */}
        {tab === 'appointments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <h2 className="text-sm font-semibold text-ink mb-3">Today</h2>
              {todays.length === 0 ? (
                <Card><EmptyState icon={Scissors} title="No grooming today" /></Card>
              ) : (
                <div className="space-y-2">{todays.map(renderCard)}</div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink mb-3">Upcoming</h2>
              {upcoming.length === 0 ? (
                <Card><EmptyState icon={Clock} title="Nothing scheduled" /></Card>
              ) : (
                <div className="space-y-2">{upcoming.map(renderCard)}</div>
              )}
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {tab === 'history' && (
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by pet, owner, groomer, service…"
                className="max-w-md flex-1 min-w-[220px]"
              />
              <div className="w-44">
                <Select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as HistoryFilter)}>
                  <option value="All">All past records</option>
                  <option value="Completed">Completed only</option>
                  <option value="Cancelled">Cancelled only</option>
                  <option value="No-show">No-shows only</option>
                </Select>
              </div>
            </div>
            {historyFiltered.length === 0 ? (
              <EmptyState icon={History} title="No history records" hint="Completed, cancelled and past appointments appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                      <th className="py-2.5 pr-4 font-semibold">Appt #</th>
                      <th className="py-2.5 pr-4 font-semibold">Date</th>
                      <th className="py-2.5 pr-4 font-semibold">Pet</th>
                      <th className="py-2.5 pr-4 font-semibold">Owner</th>
                      <th className="py-2.5 pr-4 font-semibold">Groomer</th>
                      <th className="py-2.5 pr-4 font-semibold">Services</th>
                      <th className="py-2.5 pr-4 font-semibold">Status</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Total</th>
                      <th className="py-2.5 pr-4 font-semibold">Rating</th>
                      <th className="py-2.5 pr-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyFiltered.map((g) => (
                      <tr key={g.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-ink/70">{g.appointmentNumber || '—'}</td>
                        <td className="py-3 pr-4 text-ink/60">{fmtDate(g.date)}</td>
                        <td className="py-3 pr-4 font-medium text-ink">{g.petName}</td>
                        <td className="py-3 pr-4 text-ink/60">{g.owner}</td>
                        <td className="py-3 pr-4 text-ink/60">{g.groomer}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(g.services || []).map((s) => (
                              <span key={s.id || s.name} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-lilac text-plum">{s.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4"><Badge status={g.status} /></td>
                        <td className="py-3 pr-4 text-right font-medium text-ink">{num(g.total) > 0 ? fmtMoney(g.total) : '—'}</td>
                        <td className="py-3 pr-4">
                          {num(g.rating) > 0 ? renderStars(num(g.rating)) : <span className="text-ink/30 text-xs">—</span>}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setDetailId(g.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-ink hover:bg-canvas transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(g)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-plum hover:bg-lilac transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteGroom(g)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Revenue Tab ── */}
        {tab === 'revenue' && (
          <div className="space-y-5">
            {/* Revenue by Service */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-ink mb-1">Revenue by Service</h3>
              <p className="text-[11px] text-ink/45 mb-3">Each session&apos;s charged total is split across its services, so these add up to Revenue (Completed).</p>
              {revenueByService.length === 0 ? (
                <EmptyState icon={DollarSign} title="No revenue data yet" />
              ) : (
                <div className="space-y-2">
                  {revenueByService.map(([name, rev]) => {
                    const maxRev = revenueByService[0][1];
                    const pct = maxRev > 0 ? (rev / maxRev) * 100 : 0;
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <div className="w-32 text-sm text-ink/70 shrink-0">{name}</div>
                        <div className="flex-1 h-7 bg-canvas rounded-lg overflow-hidden">
                          <div className="h-full bg-plum/80 rounded-lg flex items-center justify-end px-2 transition-all" style={{ width: `${pct}%` }}>
                            <span className="text-[10px] text-white font-semibold">{fmtMoney(rev)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-line text-xs">
                    <span className="text-ink/50">Total</span>
                    <span className="font-semibold text-ink">{fmtMoney(round2(revenueByService.reduce((s, [, v]) => s + v, 0)))}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Revenue by Groomer */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Revenue by Groomer</h3>
              {revenueByGroomer.length === 0 ? (
                <EmptyState icon={Scissors} title="No groomer revenue data" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {revenueByGroomer.map(([name, data]) => (
                    <div key={name} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                      <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
                        <Scissors className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-ink">{name}</div>
                        <div className="text-[11px] text-ink/50">{data.count} sessions</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-ink">{fmtMoney(data.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Packages overview */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-ink mb-3">Grooming Packages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {packages.map((pkg) => {
                  const pkgCount = db.grooming.filter((g) => g.packageId === pkg.id).length;
                  return (
                    <div key={pkg.id} className="p-3 rounded-xl border border-line hover:border-plum/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-plum" />
                        <span className="text-sm font-medium text-ink">{pkg.name}</span>
                      </div>
                      <div className="text-[11px] text-ink/50 mb-2">{pkg.services.length} services</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">{fmtMoney(pkg.price - pkg.discount)}</span>
                        {pkg.discount > 0 && <span className="text-[10px] text-plum">Save {fmtMoney(pkg.discount)}</span>}
                      </div>
                      <div className="text-[10px] text-ink/40 mt-1">{pkgCount} booked</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ── Booking Modal ── */}
        <Modal open={open} onClose={closeForm} title={editAppt ? 'Edit Grooming Appointment' : 'Book Grooming Appointment'} wide>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 text-xs font-medium text-coral bg-coral/10 border border-coral/25 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {formError}
              </div>
            )}

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Appointment #"><Input className="font-mono" value={form.appointmentNumber} onChange={(e) => set('appointmentNumber', e.target.value)} /></Field>
              <Field label="Groomer" required error={fieldErr.groomer}>
                <Select value={form.groomer} onChange={(e) => set('groomer', e.target.value)} placeholder="Select a groomer…" error={!!fieldErr.groomer}>
                  {groomers.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Owner" required>
                <Select value={form.ownerId} onChange={(e) => pickOwner(e.target.value)} placeholder="Select an owner…" searchable>
                  {db.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </Field>
              <Field label="Pet" required error={fieldErr.petId}>
                <Select value={form.petId} onChange={(e) => pickPet(e.target.value)} placeholder="Select a pet…" searchable error={!!fieldErr.petId}>
                  {petOptions.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                </Select>
              </Field>
              <Field label="Date" required error={fieldErr.date}>
                <DateInput value={form.date} onChange={(e) => set('date', e.target.value)} error={!!fieldErr.date} />
              </Field>
              <Field label="Time" required error={fieldErr.time}>
                <TimeInput value={form.time} onChange={(e) => set('time', e.target.value)} error={!!fieldErr.time} />
              </Field>
              <Field label="Duration (min)">
                <NumberInput min={0} step={15} value={String(form.durationMin)} onChange={(e) => set('durationMin', numMin(e.target.value, 0))} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Checked-in">Checked-in</option>
                  <option value="In progress">In progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="No-show">No-show</option>
                </Select>
              </Field>
            </div>

            {/* Package selector */}
            <div>
              <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Package (optional)</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1.5">
                <button
                  onClick={() => selectPackage('')}
                  className={`p-2 rounded-xl border text-xs font-medium transition-all ${!form.packageId ? 'border-plum bg-lilac text-plum' : 'border-line text-ink/60 hover:border-plum/30'}`}
                  title="Clear the package, its services and its discount"
                >
                  Custom
                </button>
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => selectPackage(pkg.id)}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-left ${form.packageId === pkg.id ? 'border-plum bg-lilac text-plum' : 'border-line text-ink/60 hover:border-plum/30'}`}
                  >
                    {pkg.name}
                    <div className="text-[10px] text-ink/45 mt-0.5">{fmtMoney(pkg.price - pkg.discount)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Service selector */}
            <div>
              <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Services</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {allServices.map((svc) => {
                  const selected = form.services.some((s) => s.name === svc.name);
                  const Icon = svc.icon;
                  return (
                    <button
                      key={svc.name}
                      onClick={() => toggleService(svc.name, svc.price)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${selected ? 'border-plum bg-lilac text-plum' : 'border-line text-ink/60 hover:border-plum/30'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {svc.name}
                      <span className="text-[10px] text-ink/40">{fmtMoney(svc.price)}</span>
                    </button>
                  );
                })}
              </div>
              {form.packageId && (
                <p className="text-[11px] text-ink/45 mt-1.5">
                  Package prices apply — changing the services drops the package and its discount.
                </p>
              )}
            </div>

            {/* Products used */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Products Used</span>
                <Button size="sm" variant="outline" onClick={addProduct}><Plus className="w-3.5 h-3.5" /> Add Product</Button>
              </div>
              {form.productsUsed.length === 0 ? (
                <p className="text-xs text-ink/40 py-2">No products recorded.</p>
              ) : (
                <div className="space-y-2">
                  {form.productsUsed.map((p) => (
                    <div key={p.id} className="flex gap-2 items-end">
                      <div className="flex-1"><Input value={p.name} onChange={(e) => setProduct(p.id, 'name', e.target.value)} placeholder="Product name" /></div>
                      <div className="w-28"><Input value={p.quantity} onChange={(e) => setProduct(p.id, 'quantity', e.target.value)} placeholder="Qty" /></div>
                      <button onClick={() => removeProduct(p.id)} className="w-9 h-10 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors" title="Remove product">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Before / after photos */}
            <div className="grid grid-cols-1 gap-4">
              {photoEditor('before')}
              {photoEditor('after')}
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 gap-3">
              <Field label="Customer Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Pet preferences, sensitivities…" /></Field>
              <Field label="Grooming Notes"><Textarea value={form.groomingNotes} onChange={(e) => set('groomingNotes', e.target.value)} placeholder="Condition of coat, observations during grooming…" /></Field>
            </div>

            {/* Reminders */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reminder Method" hint="Reminders are logged on the appointment, not sent from here.">
                <Select value={form.reminderMethod} onChange={(e) => set('reminderMethod', e.target.value)}>
                  <option value="None">None</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="Phone">Phone</option>
                </Select>
              </Field>
              <Field label="Next Grooming Date"><DateInput value={form.nextGroomingDate} onChange={(e) => set('nextGroomingDate', e.target.value)} /></Field>
            </div>

            {/* Feedback — only meaningful once the session is done */}
            {form.status === 'Completed' && (
              <div className="p-3 rounded-xl border border-line space-y-3">
                <Field label="Customer rating">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => set('rating', form.rating === n ? 0 : n)}
                          className="hv-icon w-8 h-8 rounded-lg flex items-center justify-center hover:bg-lilac transition-colors"
                          title={`${n} star${n === 1 ? '' : 's'}`}
                          aria-label={`${n} star${n === 1 ? '' : 's'}`}
                        >
                          <Star className={`w-5 h-5 ${n <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-ink/25'}`} />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-ink/50">{form.rating > 0 ? `${form.rating}/5` : 'Not rated'}</span>
                  </div>
                </Field>
                <Field label="Customer feedback">
                  <Textarea value={form.customerFeedback} onChange={(e) => set('customerFeedback', e.target.value)} placeholder="What the owner said about the groom…" />
                </Field>
              </div>
            )}

            {/* Payment */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Discount"><NumberInput min={0} prefix={settings.currencySymbol} value={String(form.discount)} onChange={(e) => setDiscount(e.target.value)} /></Field>
              <Field label="Tax"><NumberInput min={0} prefix={settings.currencySymbol} value={String(form.tax)} onChange={(e) => setTax(e.target.value)} /></Field>
              <Field label="Payment Method">
                <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Insurance">Insurance</option>
                </Select>
              </Field>
              <Field label="Payment Status">
                <Select value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Refunded">Refunded</option>
                </Select>
              </Field>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-line">
              <span className="text-sm text-ink/60">
                Subtotal: {fmtMoney(form.subtotal)} · Discount: {fmtMoney(form.discount)}{num(form.tax) > 0 ? ` · Tax: ${fmtMoney(form.tax)}` : ''}
              </span>
              <span className="text-lg font-bold text-ink">Total: {fmtMoney(form.total)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeForm}>Cancel</Button>
              <Button onClick={saveGroom}>{editAppt ? 'Save Changes' : 'Book Appointment'}</Button>
            </div>
          </div>
        </Modal>

        {/* ── Detail Modal ── */}
        <Modal open={!!detailAppt} onClose={() => setDetailId(null)} title="Grooming Details" wide>
          {detailAppt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">{detailAppt.petName} · {detailAppt.appointmentNumber || '—'}</div>
                  <div className="text-xs text-ink/50">{detailAppt.owner} · {detailAppt.groomer} · {fmtDate(detailAppt.date)} at {detailAppt.time}</div>
                </div>
                <Badge status={detailAppt.status} />
              </div>

              {detailAppt.packageName && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-lilac/50">
                  <Package className="w-4 h-4 text-plum" />
                  <span className="text-sm font-medium text-plum">{detailAppt.packageName}</span>
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1.5">Services</div>
                <div className="space-y-1">
                  {(detailAppt.services || []).map((s) => (
                    <div key={s.id || s.name} className="flex items-center justify-between text-sm">
                      <span className="text-ink/70">{s.name}</span>
                      <span className="text-ink font-medium">{fmtMoney(s.price)}</span>
                    </div>
                  ))}
                  {num(detailAppt.discount) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink/70">Discount</span>
                      <span className="text-plum font-medium">-{fmtMoney(detailAppt.discount)}</span>
                    </div>
                  )}
                  {num(detailAppt.tax) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink/70">Tax</span>
                      <span className="text-ink font-medium">{fmtMoney(detailAppt.tax)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-line text-sm font-semibold">
                    <span className="text-ink">Total</span>
                    <span className="text-ink">{fmtMoney(detailAppt.total)}</span>
                  </div>
                </div>
              </div>

              {(detailAppt.productsUsed && detailAppt.productsUsed.length > 0) && (
                <div>
                  <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1.5">Products Used</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailAppt.productsUsed.map((p) => (
                      <span key={p.id || p.name} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-canvas border border-line text-ink/70">
                        {p.name}{p.quantity ? ` (${p.quantity})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(detailAppt.beforePhotos && detailAppt.beforePhotos.length > 0) && photoGallery('Before', detailAppt.beforePhotos)}
              {(detailAppt.afterPhotos && detailAppt.afterPhotos.length > 0) && photoGallery('After', detailAppt.afterPhotos)}

              {detailAppt.groomingNotes && (
                <div>
                  <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1">Grooming Notes</div>
                  <p className="text-sm text-ink/70 leading-relaxed">{detailAppt.groomingNotes}</p>
                </div>
              )}

              {detailAppt.notes && (
                <div>
                  <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1">Customer Notes</div>
                  <p className="text-sm text-ink/70 leading-relaxed">{detailAppt.notes}</p>
                </div>
              )}

              {num(detailAppt.rating) > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1">Customer Rating</div>
                  <div className="flex items-center gap-2">
                    {renderStars(num(detailAppt.rating), 'w-4 h-4')}
                    {detailAppt.customerFeedback && <span className="text-sm text-ink/60">&ldquo;{detailAppt.customerFeedback}&rdquo;</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                {detailAppt.reminderSent && (
                  <div className="flex items-center gap-1.5 text-ink/60">
                    <Bell className="w-3.5 h-3.5 text-plum" /> Reminder logged for {detailAppt.reminderMethod} on {fmtDate(detailAppt.reminderDate)}
                  </div>
                )}
                {detailAppt.nextGroomingDate && (
                  <div className="flex items-center gap-1.5 text-ink/60">
                    <Calendar className="w-3.5 h-3.5 text-plum" /> Next: {fmtDate(detailAppt.nextGroomingDate)}
                  </div>
                )}
                {detailAppt.paymentStatus && (
                  <div className="flex items-center gap-1.5 text-ink/60">
                    <DollarSign className="w-3.5 h-3.5 text-plum" /> {detailAppt.paymentStatus} via {detailAppt.paymentMethod || '—'}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Shell>
  );
}
