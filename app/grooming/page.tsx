'use client';

import { useMemo, useState } from 'react';
import {
  Scissors, Plus, Clock, Edit2, Trash2, CheckCircle2, Play, Search,
  Sparkles, Bath, PawPrint, Eye, Ear, Smile, Palette, Package, Camera,
  Bell, History, DollarSign, Star, X, ChevronRight, Calendar,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Badge, Button, EmptyState, Modal, Field, inputCls, Select, DateInput,
  Textarea, NumberInput, StatCard,
} from '../components/ui';
import {
  useDB, GroomingAppt, GroomingServiceItem, GroomingProduct, GroomingPhoto,
  newId, today,
} from '../lib/store';

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

const packages = [
  { id: 'pkg-basic', name: 'Basic Groom Package', services: ['Bath service', 'Nail trimming', 'Ear cleaning'], price: 60, discount: 5 },
  { id: 'pkg-full', name: 'Full Groom Package', services: ['Bath service', 'Haircut', 'Nail trimming', 'Ear cleaning'], price: 110, discount: 15 },
  { id: 'pkg-spa', name: 'Spa & Relax Package', services: ['Spa treatment', 'Teeth cleaning', 'Ear cleaning'], price: 95, discount: 20 },
  { id: 'pkg-deluxe', name: 'Deluxe Makeover Package', services: ['Bath service', 'Haircut', 'Nail trimming', 'Ear cleaning', 'Teeth cleaning', 'Spa treatment'], price: 180, discount: 30 },
] as const;

const groomers = ['Hannah K.', 'Marco D.'];
const statusFlow: Record<GroomingAppt['status'], GroomingAppt['status'] | null> = {
  'Scheduled': 'Checked-in',
  'Checked-in': 'In progress',
  'In progress': 'Completed',
  'Completed': null,
  'Cancelled': null,
  'No-show': null,
};

type Tab = 'appointments' | 'history' | 'revenue';

const blankServiceItem = (): GroomingServiceItem => ({ id: '', name: '', price: 0 });
const blankProduct = (): GroomingProduct => ({ id: '', name: '', quantity: '' });
const blankPhoto = (type: 'before' | 'after'): GroomingPhoto => ({ id: '', type, url: '', caption: '' });

const blankForm = () => ({
  appointmentNumber: '', petName: '', owner: '', groomer: groomers[0], date: today(),
  time: '10:00', durationMin: 60, status: 'Scheduled' as GroomingAppt['status'],
  services: [] as GroomingServiceItem[], packageId: '', packageName: '',
  notes: '', groomingNotes: '', productsUsed: [] as GroomingProduct[],
  reminderMethod: 'SMS' as GroomingAppt['reminderMethod'], reminderDate: today(),
  nextGroomingDate: '', rating: 0, customerFeedback: '',
  subtotal: 0, discount: 0, tax: 0, total: 0,
  paymentMethod: '' as GroomingAppt['paymentMethod'], paymentStatus: '' as GroomingAppt['paymentStatus'],
});

export default function GroomingPage() {
  const { db, create, update, remove } = useDB();
  const [tab, setTab] = useState<Tab>('appointments');
  const [open, setOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<GroomingAppt | null>(null);
  const [form, setForm] = useState(blankForm());
  const [search, setSearch] = useState('');
  const [detailAppt, setDetailAppt] = useState<GroomingAppt | null>(null);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const grooming = db?.grooming ?? [];
  const todays = grooming.filter((g) => g.date === today());
  const upcoming = grooming.filter((g) => g.date > today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = grooming.filter((g) => g.date < today() || g.status === 'Completed').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const completed = grooming.filter((g) => g.status === 'Completed');
  const totalRevenue = completed.reduce((s, g) => s + (g.total || 0), 0);
  const avgRating = completed.length > 0 ? (completed.reduce((s, g) => s + (g.rating || 0), 0) / completed.length).toFixed(1) : '0.0';

  // Filtered history
  const historyFiltered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return past;
    return past.filter((g) =>
      g.petName.toLowerCase().includes(q) ||
      g.owner.toLowerCase().includes(q) ||
      g.groomer.toLowerCase().includes(q) ||
      (g.packageName || '').toLowerCase().includes(q) ||
      g.services.some((s) => s.name.toLowerCase().includes(q)),
    );
  }, [past, search]);

  // Revenue by service
  const revenueByService = useMemo(() => {
    const map: Record<string, number> = {};
    completed.forEach((g) => {
      g.services.forEach((s) => {
        map[s.name] = (map[s.name] || 0) + s.price;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [completed]);

  // Revenue by groomer
  const revenueByGroomer = useMemo(() => {
    const result: Record<string, { revenue: number; count: number }> = {};
    completed.forEach((g) => {
      if (!result[g.groomer]) result[g.groomer] = { revenue: 0, count: 0 };
      result[g.groomer].revenue += g.total || 0;
      result[g.groomer].count += 1;
    });
    return Object.entries(result).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [completed]);

  // ── Form helpers ──
  if (!db) return <Shell title="Grooming"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  const recalcTotal = (services: GroomingServiceItem[], discount: number, tax: number) => {
    const subtotal = services.reduce((s, i) => s + i.price, 0);
    return { subtotal, total: Math.max(0, subtotal - discount + tax) };
  };

  const toggleService = (svcName: string, price: number) => {
    setForm((f) => {
      const exists = f.services.find((s) => s.name === svcName);
      let services: GroomingServiceItem[];
      if (exists) {
        services = f.services.filter((s) => s.name !== svcName);
      } else {
        services = [...f.services, { id: newId('gs'), name: svcName, price }];
      }
      const { subtotal, total } = recalcTotal(services, f.discount, f.tax);
      return { ...f, services, subtotal, total, packageId: '', packageName: '' };
    });
  };

  const selectPackage = (pkgId: string) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) {
      setForm((f) => ({ ...f, packageId: '', packageName: '' }));
      return;
    }
    const services: GroomingServiceItem[] = pkg.services.map((sn) => {
      const svc = allServices.find((s) => s.name === sn);
      return { id: newId('gs'), name: sn, price: svc?.price || 0 };
    });
    const { subtotal, total } = recalcTotal(services, pkg.discount, 0);
    setForm((f) => ({ ...f, services, packageId: pkgId, packageName: pkg.name, subtotal, discount: pkg.discount, tax: 0, total }));
  };

  const addProduct = () => setForm((f) => ({ ...f, productsUsed: [...f.productsUsed, { ...blankProduct(), id: newId('gp') }] }));
  const removeProduct = (idx: number) => setForm((f) => ({ ...f, productsUsed: f.productsUsed.filter((_, i) => i !== idx) }));
  const setProduct = (idx: number, k: keyof GroomingProduct, v: string) =>
    setForm((f) => ({ ...f, productsUsed: f.productsUsed.map((p, i) => (i === idx ? { ...p, [k]: v } : p)) }));

  const openNew = () => {
    setEditAppt(null);
    setForm({ ...blankForm(), appointmentNumber: `GROOM-${String((db.grooming.length || 0) + 1).padStart(4, '0')}` });
    setOpen(true);
  };

  const openEdit = (g: GroomingAppt) => {
    setEditAppt(g);
    setForm({
      appointmentNumber: g.appointmentNumber, petName: g.petName, owner: g.owner, groomer: g.groomer,
      date: g.date, time: g.time, durationMin: g.durationMin, status: g.status,
      services: (g.services || []).map((s) => ({ ...s })), packageId: g.packageId, packageName: g.packageName,
      notes: g.notes, groomingNotes: g.groomingNotes, productsUsed: (g.productsUsed || []).map((p) => ({ ...p })),
      reminderMethod: g.reminderMethod, reminderDate: g.reminderDate, nextGroomingDate: g.nextGroomingDate,
      rating: g.rating, customerFeedback: g.customerFeedback,
      subtotal: g.subtotal, discount: g.discount, tax: g.tax, total: g.total,
      paymentMethod: g.paymentMethod, paymentStatus: g.paymentStatus,
    });
    setOpen(true);
  };

  const saveGroom = () => {
    if (!form.petName) return;
    const data = {
      ...form,
      reminderSent: form.reminderMethod !== 'None',
      createdAt: editAppt?.createdAt || today(),
    };
    if (editAppt) {
      update('grooming', editAppt.id, data);
    } else {
      create('grooming', { id: newId('grm'), ...data } as GroomingAppt);
    }
    setOpen(false);
    setEditAppt(null);
  };

  const advanceStatus = (id: string) => {
    const g = db?.grooming.find((x) => x.id === id);
    if (!g) return;
    const next = statusFlow[g.status];
    if (next) update('grooming', id, { status: next });
  };

  const sendReminder = (g: GroomingAppt) => {
    update('grooming', g.id, { reminderSent: true, reminderDate: today() });
  };

  const deleteGroom = (id: string) => remove('grooming', id);

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Render helpers ──
  const tabBtn = (t: Tab, label: string, Icon: typeof Scissors) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-sage text-white' : 'text-ink/60 hover:bg-mint/50 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const renderServiceChips = (services: GroomingServiceItem[]) => (
    <div className="flex flex-wrap gap-1">
      {services.map((s, i) => (
        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-mint text-sage">
          {s.name}
        </span>
      ))}
    </div>
  );

  const renderCard = (g: GroomingAppt) => (
    <Card key={g.id} className="p-4 group">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center w-14 shrink-0">
          <Clock className="w-3.5 h-3.5 text-ink/40" />
          <span className="text-sm font-semibold text-ink mt-0.5">{g.time}</span>
          {g.date !== today() && <span className="text-[10px] text-ink/40">{g.date.slice(5)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink">{g.petName} · {g.appointmentNumber || '—'}</div>
          <div className="text-[11px] text-ink/50">{g.owner} · {g.groomer}</div>
          {(g.services && g.services.length > 0) ? renderServiceChips(g.services) : (
            <div className="text-[11px] text-ink/40 mt-0.5">{g.notes}</div>
          )}
          {g.packageName && <div className="text-[10px] text-sage font-medium mt-0.5">{g.packageName}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge status={g.status} />
          {g.total > 0 && <span className="text-[11px] font-semibold text-ink">{fmtMoney(g.total)}</span>}
          {g.reminderSent && <span className="text-[10px] text-ink/40 flex items-center gap-0.5"><Bell className="w-2.5 h-2.5" /> Reminder sent</span>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setDetailAppt(g)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Details">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {statusFlow[g.status] && (
            <button onClick={() => advanceStatus(g.id)} className="w-7 h-7 rounded-lg hover:bg-mint text-ink/40 hover:text-sage flex items-center justify-center transition-colors" title="Advance status">
              {g.status === 'Scheduled' ? <Play className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {!g.reminderSent && g.status === 'Scheduled' && (
            <button onClick={() => sendReminder(g)} className="w-7 h-7 rounded-lg hover:bg-amber-50 text-ink/40 hover:text-amber-600 flex items-center justify-center transition-colors" title="Send reminder">
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => openEdit(g)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteGroom(g.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <Shell title="Grooming" subtitle="Grooming appointments, services, and revenue tracking">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Grooming Management</h1>
            <p className="text-sm text-ink/50 mt-0.5">Book appointments, track services, and monitor revenue</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4" /> Book Grooming</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Scissors} label="Total Appointments" value={db.grooming.length} sub="all time" tone="sage" />
          <StatCard icon={DollarSign} label="Revenue (Completed)" value={fmtMoney(totalRevenue)} sub={`${completed.length} sessions`} tone="sky" />
          <StatCard icon={Star} label="Avg Rating" value={avgRating} sub="from completed" tone="amber" />
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
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by pet, owner, groomer, service…"
                className={`${inputCls} pl-9 max-w-md`}
              />
            </div>
            {historyFiltered.length === 0 ? (
              <EmptyState icon={History} title="No history records" hint="Completed appointments will appear here." />
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
                        <td className="py-3 pr-4 text-ink/60">{g.date}</td>
                        <td className="py-3 pr-4 font-medium text-ink">{g.petName}</td>
                        <td className="py-3 pr-4 text-ink/60">{g.owner}</td>
                        <td className="py-3 pr-4 text-ink/60">{g.groomer}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(g.services || []).map((s, i) => (
                              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-mint text-sage">{s.name}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-4"><Badge status={g.status} /></td>
                        <td className="py-3 pr-4 text-right font-medium text-ink">{g.total > 0 ? fmtMoney(g.total) : '—'}</td>
                        <td className="py-3 pr-4">
                          {g.rating > 0 ? (
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < g.rating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'}`} />
                              ))}
                            </div>
                          ) : <span className="text-ink/30 text-xs">—</span>}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setDetailAppt(g)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-ink hover:bg-canvas transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(g)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-sage hover:bg-mint transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteGroom(g.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
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
              <h3 className="text-sm font-semibold text-ink mb-3">Revenue by Service</h3>
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
                          <div className="h-full bg-sage/80 rounded-lg flex items-center justify-end px-2 transition-all" style={{ width: `${pct}%` }}>
                            <span className="text-[10px] text-white font-semibold">{fmtMoney(rev)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                      <div className="w-10 h-10 rounded-xl bg-mint text-sage flex items-center justify-center">
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
                    <div key={pkg.id} className="p-3 rounded-xl border border-line hover:border-sage/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-sage" />
                        <span className="text-sm font-medium text-ink">{pkg.name}</span>
                      </div>
                      <div className="text-[11px] text-ink/50 mb-2">{pkg.services.length} services</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">{fmtMoney(pkg.price - pkg.discount)}</span>
                        {pkg.discount > 0 && <span className="text-[10px] text-sage">Save {fmtMoney(pkg.discount)}</span>}
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
        <Modal open={open} onClose={() => { setOpen(false); setEditAppt(null); }} title={editAppt ? 'Edit Grooming Appointment' : 'Book Grooming Appointment'} wide>
          <div className="space-y-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Appointment #"><input className={inputCls} value={form.appointmentNumber} onChange={(e) => set('appointmentNumber', e.target.value)} /></Field>
              <Field label="Groomer">
                <Select value={form.groomer} onChange={(e) => set('groomer', e.target.value)}>
                  {groomers.map((g) => <option key={g} value={g}>{g}</option>)}
                </Select>
              </Field>
              <Field label="Pet Name"><input className={inputCls} value={form.petName} onChange={(e) => set('petName', e.target.value)} placeholder="Biscuit" /></Field>
              <Field label="Owner"><input className={inputCls} value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Eleanor Hayes" /></Field>
              <Field label="Date"><DateInput value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Time"><input className={inputCls} type="time" value={form.time} onChange={(e) => set('time', e.target.value)} /></Field>
              <Field label="Duration (min)"><NumberInput value={String(form.durationMin)} onChange={(e) => set('durationMin', parseInt(e.target.value) || 30)} /></Field>
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
                  className={`p-2 rounded-xl border text-xs font-medium transition-all ${!form.packageId ? 'border-sage bg-mint text-sage' : 'border-line text-ink/60 hover:border-sage/30'}`}
                >
                  Custom
                </button>
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => selectPackage(pkg.id)}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all text-left ${form.packageId === pkg.id ? 'border-sage bg-mint text-sage' : 'border-line text-ink/60 hover:border-sage/30'}`}
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
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${selected ? 'border-sage bg-mint text-sage' : 'border-line text-ink/60 hover:border-sage/30'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {svc.name}
                      <span className="text-[10px] text-ink/40">{fmtMoney(svc.price)}</span>
                    </button>
                  );
                })}
              </div>
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
                  {form.productsUsed.map((p, idx) => (
                    <div key={p.id} className="flex gap-2 items-end">
                      <div className="flex-1"><input className={inputCls} value={p.name} onChange={(e) => setProduct(idx, 'name', e.target.value)} placeholder="Product name" /></div>
                      <div className="w-28"><input className={inputCls} value={p.quantity} onChange={(e) => setProduct(idx, 'quantity', e.target.value)} placeholder="Qty" /></div>
                      <button onClick={() => removeProduct(idx)} className="w-9 h-10 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 gap-3">
              <Field label="Customer Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Pet preferences, sensitivities…" /></Field>
              <Field label="Grooming Notes"><Textarea value={form.groomingNotes} onChange={(e) => set('groomingNotes', e.target.value)} placeholder="Condition of coat, observations during grooming…" /></Field>
            </div>

            {/* Reminders */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reminder Method">
                <Select value={form.reminderMethod} onChange={(e) => set('reminderMethod', e.target.value)}>
                  <option value="None">None</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="Phone">Phone</option>
                </Select>
              </Field>
              <Field label="Next Grooming Date"><DateInput value={form.nextGroomingDate} onChange={(e) => set('nextGroomingDate', e.target.value)} /></Field>
            </div>

            {/* Payment (for completed) */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Discount"><NumberInput value={String(form.discount)} onChange={(e) => {
                const d = parseFloat(e.target.value) || 0;
                setForm((f) => ({ ...f, discount: d, total: Math.max(0, f.subtotal - d + f.tax) }));
              }} /></Field>
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
              <span className="text-sm text-ink/60">Subtotal: {fmtMoney(form.subtotal)} · Discount: {fmtMoney(form.discount)}</span>
              <span className="text-lg font-bold text-ink">Total: {fmtMoney(form.total)}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setOpen(false); setEditAppt(null); }}>Cancel</Button>
              <Button onClick={saveGroom}>{editAppt ? 'Save Changes' : 'Book Appointment'}</Button>
            </div>
          </div>
        </Modal>

        {/* ── Detail Modal ── */}
        <Modal open={!!detailAppt} onClose={() => setDetailAppt(null)} title="Grooming Details" wide>
          {detailAppt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">{detailAppt.petName} · {detailAppt.appointmentNumber}</div>
                  <div className="text-xs text-ink/50">{detailAppt.owner} · {detailAppt.groomer} · {detailAppt.date} at {detailAppt.time}</div>
                </div>
                <Badge status={detailAppt.status} />
              </div>

              {detailAppt.packageName && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-mint/50">
                  <Package className="w-4 h-4 text-sage" />
                  <span className="text-sm font-medium text-sage">{detailAppt.packageName}</span>
                </div>
              )}

              <div>
                <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1.5">Services</div>
                <div className="space-y-1">
                  {(detailAppt.services || []).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-ink/70">{s.name}</span>
                      <span className="text-ink font-medium">{fmtMoney(s.price)}</span>
                    </div>
                  ))}
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
                    {detailAppt.productsUsed.map((p, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-canvas border border-line text-ink/70">
                        {p.name} ({p.quantity})
                      </span>
                    ))}
                  </div>
                </div>
              )}

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

              {detailAppt.rating > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1">Customer Rating</div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < detailAppt.rating ? 'text-amber-400 fill-amber-400' : 'text-ink/20'}`} />
                      ))}
                    </div>
                    {detailAppt.customerFeedback && <span className="text-sm text-ink/60">"{detailAppt.customerFeedback}"</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                {detailAppt.reminderSent && (
                  <div className="flex items-center gap-1.5 text-ink/60">
                    <Bell className="w-3.5 h-3.5 text-sage" /> Reminder sent via {detailAppt.reminderMethod} on {detailAppt.reminderDate}
                  </div>
                )}
                {detailAppt.nextGroomingDate && (
                  <div className="flex items-center gap-1.5 text-ink/60">
                    <Calendar className="w-3.5 h-3.5 text-sage" /> Next: {detailAppt.nextGroomingDate}
                  </div>
                )}
                {detailAppt.paymentStatus && (
                  <div className="flex items-center gap-1.5 text-ink/60">
                    <DollarSign className="w-3.5 h-3.5 text-sage" /> {detailAppt.paymentStatus} via {detailAppt.paymentMethod || '—'}
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
