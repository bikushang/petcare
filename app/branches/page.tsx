'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Building2, TrendingUp, Users, PawPrint, Phone, Mail, MapPin,
  DollarSign, CalendarDays, FlaskConical, Scissors, Hotel, Stethoscope,
  Package, ArrowRightLeft, BarChart2, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, SectionTitle, StatCard, Badge, BarChartCard,
} from '../components/ui';
import { useDB } from '../lib/store';
import { branches, branchNames } from '../lib/platform';
import { getActiveBranchView } from '../lib/store';

type Tab = 'overview' | 'revenue' | 'patients' | 'appointments' | 'staff' | 'inventory' | 'analytics' | 'comparison';

const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'revenue', label: 'Revenue & Billing', icon: DollarSign },
  { id: 'patients', label: 'Patients', icon: PawPrint },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'comparison', label: 'Comparison', icon: ArrowRightLeft },
];

export default function BranchesPage() {
  const { db } = useDB();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return getActiveBranchView() || branchNames[0];
  });

  // Listen for global branch switches from the Topbar
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail && detail !== 'All branches' && branchNames.includes(detail)) {
        setSelectedBranch(detail);
      }
    };
    window.addEventListener('branch-switch', handler);
    return () => window.removeEventListener('branch-switch', handler);
  }, []);

  const branchDataMap = useMemo(() => {
    if (!db) return {};
    const map: Record<string, ReturnType<typeof getBranchData>> = {};
    branchNames.forEach((b) => { map[b] = getBranchData(b); });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  // --- Per-branch computed data ---
  function getBranchData(bName: string) {
    if (!db) throw new Error('Branch data requested before database is loaded');
    const branch = branches.find((b) => b.name === bName)!;
    const staff = db.staff.filter((s) => s.branch === bName && s.role !== 'Pet Owner');
    const vetNames = staff.filter((s) => s.role === 'Veterinarian').map((s) => s.name);

    const appointments = db.appointments.filter((a) => vetNames.includes(a.vet) || staff.some((s) => s.name === a.vet));
    const medRecords = db.medRecords.filter((m) => vetNames.includes(m.vet));
    const invoices = db.invoices.filter((i) =>
      db.pets.some((p) => p.id === i.petId && db.owners.some((o) => o.id === p.ownerId)));
    const branchInvoices = db.invoices.filter((i) => {
      const vet = vetNames.find((v) => db.appointments.some((a) => a.ownerId === i.ownerId && a.vet === v));
      return vet !== undefined || invoices.some((inv) => inv.id === i.id);
    });

    // Simpler: use staff names to attribute invoices
    const paidInvoices = db.invoices.filter((i) => {
      const appt = db.appointments.find((a) => a.ownerId === i.ownerId);
      return appt && vetNames.includes(appt.vet);
    });

    const revenue = paidInvoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.total, 0);
    const outstanding = paidInvoices.filter((i) => i.status !== 'Paid').reduce((s, i) => s + i.balance, 0);
    const overdue = paidInvoices.filter((i) => i.status === 'Overdue').length;

    const grooming = db.grooming.filter((g) => staff.some((s) => s.name.startsWith(g.groomer.split(' ')[0])));
    const boarding = db.boarding.filter((b) => staff.some((s) => s.name.startsWith(b.owner.split(' ')[0]) || b.vetOnCall === s.name));
    const labs = db.labTests.filter((l) => vetNames.includes(l.requestedBy));
    const surgeries = db.surgeries.filter((s) => s.staff.some((st) => vetNames.includes(st.staffName)));
    const vaccinations = db.vaccinations.filter((v) => vetNames.includes(v.vet));
    const prescriptions = db.prescriptions.filter((p) => vetNames.includes(p.vet));

    const activeStaff = staff.filter((s) => s.status === 'Active').length;
    const onLeaveStaff = staff.filter((s) => s.status === 'On leave').length;
    const monthlyPayroll = staff.reduce((sum, s) => {
      const latest = s.payroll?.[s.payroll.length - 1];
      return sum + (latest?.netPay || 0);
    }, 0);

    const apptCompleted = appointments.filter((a) => a.status === 'Completed').length;
    const apptPending = appointments.filter((a) => a.status === 'Scheduled' || a.status === 'Checked-in').length;

    return {
      branch,
      staff, vetNames,
      appointments, medRecords, labs, surgeries, vaccinations, prescriptions, grooming, boarding,
      revenue, outstanding, overdue,
      activeStaff, onLeaveStaff, monthlyPayroll,
      apptCompleted, apptPending,
      paidInvoices,
    };
  }

  
  if (!db) return <Shell module="branches" title="Branches"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  const d = branchDataMap[selectedBranch];
  if (!d) return null;

  // Comparison chart data
  const comparisonData = branchNames.map((b) => {
    const bd = branchDataMap[b];
    return {
      branch: b,
      revenue: bd.revenue,
      staff: bd.staff.length,
      appointments: bd.appointments.length,
      labs: bd.labs.length,
      surgeries: bd.surgeries.length,
      payroll: bd.monthlyPayroll,
    };
  });

  // Monthly revenue trend (simulated from invoices by spread across months)
  const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const revenueByMonth = monthLabels.map((m, i) => ({
    month: m,
    revenue: Math.round(d.revenue * (0.7 + (i * 0.06))),
    appointments: Math.max(1, d.appointments.length + (i - 3)),
  }));

  return (
    <Shell title="Branch Management" subtitle="Multi-branch dashboard and analytics">
      {/* Branch selector */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {branchNames.map((b) => {
          const bd = branchDataMap[b];
          return (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap ${
                selectedBranch === b
                  ? 'bg-plum text-white border-plum shadow-sm'
                  : 'bg-white text-ink/70 border-line hover:border-plum/40 hover:bg-canvas'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="text-sm font-medium">{b}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                selectedBranch === b ? 'bg-white/20 text-white' : 'bg-lilac text-plum'
              }`}>{bd.branch.status}</span>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`hv-lift flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              tab === t.id
                ? 'bg-plum text-white shadow-lift-sm'
                : 'bg-white text-ink/60 border border-line hover:border-plum/40 hover:bg-lilac/40 hover:text-plum'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Staff members" value={String(d.staff.length)} tone="plum" sub={`${d.activeStaff} active`} />
            <StatCard icon={DollarSign} label="Revenue collected" value={fmtMoney(d.revenue)} tone="plum" />
            <StatCard icon={CalendarDays} label="Appointments" value={String(d.appointments.length)} tone="sky" sub={`${d.apptPending} pending`} />
            <StatCard icon={FlaskConical} label="Lab tests" value={String(d.labs.length)} tone="amber" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Branch info */}
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-lilac text-plum flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink">{d.branch.name} Branch</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.branch.status === 'Active' ? 'bg-lilac text-plum' : 'bg-ink/10 text-ink/50'}`}>
                    {d.branch.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-ink/70">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-ink/40" />{d.branch.phone}</div>
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-ink/40" />{d.branch.email}</div>
                <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-ink/40 mt-0.5" />{d.branch.address}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-line grid grid-cols-3 gap-3">
                {[
                  { label: 'Surgeries', value: d.surgeries.length, icon: Stethoscope },
                  { label: 'Grooming', value: d.grooming.length, icon: Scissors },
                  { label: 'Boarding', value: d.boarding.length, icon: Hotel },
                ].map((item) => (
                  <div key={item.label} className="group text-center py-2 rounded-xl bg-canvas/60">
                    <div className="hv-tile mx-auto mb-1 w-8 h-8 rounded-lg bg-lilac text-plum flex items-center justify-center"><item.icon className="w-4 h-4" /></div>
                    <div className="text-sm font-semibold text-ink">{item.value}</div>
                    <div className="text-[10px] text-ink/50">{item.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick stats */}
            <Card className="p-5">
              <SectionTitle title="Financial snapshot" />
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between py-2 border-b border-line">
                  <span className="text-sm text-ink/70">Revenue collected</span>
                  <span className="text-sm font-semibold text-plum">{fmtMoney(d.revenue)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-line">
                  <span className="text-sm text-ink/70">Outstanding balance</span>
                  <span className="text-sm font-semibold text-amber-600">{fmtMoney(d.outstanding)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-line">
                  <span className="text-sm text-ink/70">Overdue invoices</span>
                  <span className={`text-sm font-semibold ${d.overdue > 0 ? 'text-coral' : 'text-ink/50'}`}>{d.overdue}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-line">
                  <span className="text-sm text-ink/70">Monthly payroll</span>
                  <span className="text-sm font-semibold text-ink">{fmtMoney(d.monthlyPayroll)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-ink/70">Prescriptions issued</span>
                  <span className="text-sm font-semibold text-ink">{d.prescriptions.length}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Staff overview */}
          <Card className="p-5">
            <SectionTitle title="Branch team" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
              {d.staff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas/50">
                  <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold shrink-0">
                    {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-ink truncate">{s.name}</div>
                    <div className="text-[10px] text-ink/50 truncate">{s.role}</div>
                  </div>
                  <Badge status={s.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── REVENUE & BILLING ── */}
      {tab === 'revenue' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Total collected" value={fmtMoney(d.revenue)} tone="plum" />
            <StatCard icon={AlertTriangle} label="Outstanding" value={fmtMoney(d.outstanding)} tone="amber" />
            <StatCard icon={TrendingUp} label="Monthly payroll" value={fmtMoney(d.monthlyPayroll)} tone="coral" />
            <StatCard icon={CheckCircle2} label="Paid invoices" value={String(d.paidInvoices.filter((i) => i.status === 'Paid').length)} tone="sky" />
          </div>

          <BarChartCard
            title="Monthly revenue trend"
            data={revenueByMonth}
            dataKey="revenue"
            xKey="month"
            color="#4C1D95"
            height={220}
          />

          <Card className="p-5">
            <SectionTitle title="Recent invoices" />
            <div className="mt-3 space-y-1.5">
              {d.paidInvoices.slice(0, 10).map((inv) => {
                const owner = db.owners.find((o) => o.id === inv.ownerId);
                const pet = db.pets.find((p) => p.id === inv.petId);
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-canvas/50 text-sm">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium text-ink">{inv.number}</div>
                        <div className="text-[11px] text-ink/50">{owner?.name || '—'} · {pet?.name || '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-ink font-medium">{fmtMoney(inv.total)}</span>
                      <Badge status={inv.status} />
                    </div>
                  </div>
                );
              })}
              {d.paidInvoices.length === 0 && (
                <p className="text-sm text-ink/40 py-4 text-center">No invoices attributed to this branch yet</p>
              )}
            </div>
          </Card>

          {/* Category breakdown */}
          <Card className="p-5">
            <SectionTitle title="Revenue by service category" />
            <div className="mt-3 space-y-2">
              {[
                { label: 'Consultations', key: 'Consultation' },
                { label: 'Lab tests', key: 'Lab' },
                { label: 'Medications', key: 'Medication' },
                { label: 'Surgeries', key: 'Surgery' },
                { label: 'Vaccinations', key: 'Vaccination' },
              ].map(({ label, key }) => {
                const total = d.paidInvoices
                  .filter((i) => i.status === 'Paid')
                  .flatMap((i) => i.items)
                  .filter((it) => it.category === key)
                  .reduce((s, it) => s + it.qty * it.unitPrice, 0);
                const pct = d.revenue > 0 ? (total / d.revenue) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-ink/70 w-32">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
                      <div className="h-full rounded-full bg-plum transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium text-ink w-16 text-right">{fmtMoney(total)}</span>
                    <span className="text-[11px] text-ink/40 w-10 text-right">{fmtPct(pct)}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── PATIENTS ── */}
      {tab === 'patients' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={PawPrint} label="Patients seen" value={String(new Set(d.medRecords.map((m) => m.petId)).size)} tone="plum" />
            <StatCard icon={Users} label="Pet owners" value={String(new Set(d.appointments.map((a) => a.ownerId)).size)} tone="sky" />
            <StatCard icon={FlaskConical} label="Lab tests" value={String(d.labs.length)} tone="amber" />
            <StatCard icon={CheckCircle2} label="Vaccinations" value={String(d.vaccinations.length)} tone="coral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionTitle title="Recent medical records" />
              <div className="mt-3 space-y-1.5">
                {d.medRecords.slice(0, 8).map((m) => {
                  const pet = db.pets.find((p) => p.id === m.petId);
                  const owner = pet ? db.owners.find((o) => o.id === pet.ownerId) : null;
                  return (
                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50 text-sm">
                      <div>
                        <div className="font-medium text-ink">{pet?.name || '—'}</div>
                        <div className="text-[11px] text-ink/50">{owner?.name || '—'} · {m.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-ink/70">{m.type}</div>
                        <div className="text-[11px] text-ink/50">{m.vet}</div>
                      </div>
                    </div>
                  );
                })}
                {d.medRecords.length === 0 && <p className="text-sm text-ink/40 py-4 text-center">No records for this branch</p>}
              </div>
            </Card>
            <Card className="p-5">
              <SectionTitle title="Recent lab tests" />
              <div className="mt-3 space-y-1.5">
                {d.labs.slice(0, 8).map((l) => {
                  const pet = db.pets.find((p) => p.id === l.petId);
                  return (
                    <div key={l.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50 text-sm">
                      <div>
                        <div className="font-medium text-ink">{l.testName}</div>
                        <div className="text-[11px] text-ink/50">{pet?.name || '—'} · {l.dateOrdered}</div>
                      </div>
                      <Badge status={l.status} />
                    </div>
                  );
                })}
                {d.labs.length === 0 && <p className="text-sm text-ink/40 py-4 text-center">No lab tests for this branch</p>}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <SectionTitle title="Surgeries" />
            <div className="mt-3 space-y-1.5">
              {d.surgeries.slice(0, 8).map((s) => {
                const pet = db.pets.find((p) => p.id === s.petId);
                const owner = pet ? db.owners.find((o) => o.id === pet.ownerId) : null;
                return (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50 text-sm">
                    <div>
                      <div className="font-medium text-ink">{s.procedureName}</div>
                      <div className="text-[11px] text-ink/50">{pet?.name || '—'} · {owner?.name || '—'} · {s.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink/50">{s.theater}</span>
                      <Badge status={s.status} />
                    </div>
                  </div>
                );
              })}
              {d.surgeries.length === 0 && <p className="text-sm text-ink/40 py-4 text-center">No surgeries for this branch</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {tab === 'appointments' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CalendarDays} label="Total" value={String(d.appointments.length)} tone="plum" />
            <StatCard icon={CheckCircle2} label="Completed" value={String(d.apptCompleted)} tone="sky" />
            <StatCard icon={Clock} label="Pending" value={String(d.apptPending)} tone="amber" />
            <StatCard icon={Scissors} label="Grooming" value={String(d.grooming.length)} tone="coral" />
          </div>

          <BarChartCard
            title="Appointments this period"
            data={revenueByMonth}
            dataKey="appointments"
            xKey="month"
            color="#0ea5e9"
            height={200}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionTitle title="Today's appointments" />
              <div className="mt-3 space-y-1.5">
                {d.appointments.slice(0, 8).map((a) => {
                  const pet = db.pets.find((p) => p.id === a.petId);
                  const owner = db.owners.find((o) => o.id === a.ownerId);
                  return (
                    <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-ink/40 w-10">{a.time}</span>
                        <div>
                          <div className="text-xs font-medium text-ink">{pet?.name || '—'} · {a.service}</div>
                          <div className="text-[10px] text-ink/50">{owner?.name || '—'} · {a.vet}</div>
                        </div>
                      </div>
                      <Badge status={a.status} />
                    </div>
                  );
                })}
                {d.appointments.length === 0 && <p className="text-sm text-ink/40 py-4 text-center">No appointments</p>}
              </div>
            </Card>
            <Card className="p-5">
              <SectionTitle title="Grooming sessions" />
              <div className="mt-3 space-y-1.5">
                {d.grooming.slice(0, 8).map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50">
                    <div>
                      <div className="text-xs font-medium text-ink">{g.petName} · {g.time}</div>
                      <div className="text-[10px] text-ink/50">{g.owner} · {g.groomer}</div>
                    </div>
                    <Badge status={g.status} />
                  </div>
                ))}
                {d.grooming.length === 0 && <p className="text-sm text-ink/40 py-4 text-center">No grooming sessions</p>}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <SectionTitle title="Boarding stays" />
            <div className="mt-3 space-y-1.5">
              {d.boarding.slice(0, 8).map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-canvas/50">
                  <div>
                    <div className="text-sm font-medium text-ink">{b.petName} ({b.species})</div>
                    <div className="text-[11px] text-ink/50">{b.owner} · {b.checkIn} → {b.checkOut}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{fmtMoney(b.total)}</span>
                    <Badge status={b.status} />
                  </div>
                </div>
              ))}
              {d.boarding.length === 0 && <p className="text-sm text-ink/40 py-4 text-center">No boarding stays</p>}
            </div>
          </Card>
        </div>
      )}

      {/* ── STAFF ── */}
      {tab === 'staff' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total staff" value={String(d.staff.length)} tone="plum" />
            <StatCard icon={CheckCircle2} label="Active" value={String(d.activeStaff)} tone="sky" />
            <StatCard icon={Clock} label="On leave" value={String(d.onLeaveStaff)} tone="amber" />
            <StatCard icon={DollarSign} label="Monthly payroll" value={fmtMoney(d.monthlyPayroll)} tone="coral" />
          </div>

          <Card className="p-5">
            <SectionTitle title="Staff roster" />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {d.staff.map((s) => {
                const latestPayroll = s.payroll?.[s.payroll.length - 1];
                const pendingLeave = s.leaveRequests?.filter((l) => l.status === 'Pending').length || 0;
                return (
                  <div key={s.id} className="p-3 rounded-xl border border-line hover:border-plum/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-coral/15 text-coral flex items-center justify-center text-sm font-semibold">
                        {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink">{s.name}</div>
                        <div className="text-[11px] text-ink/50">{s.role} · {s.shift}</div>
                      </div>
                      <Badge status={s.status} />
                    </div>
                    <div className="mt-2 pt-2 border-t border-line grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-[10px] text-ink/40">Net pay</div>
                        <div className="text-xs font-medium text-ink">{latestPayroll ? fmtMoney(latestPayroll.netPay) : '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink/40">Leave balance</div>
                        <div className="text-xs font-medium text-ink">{s.leaveBalance?.annual ?? 0} days</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-ink/40">Leave requests</div>
                        <div className={`text-xs font-medium ${pendingLeave > 0 ? 'text-amber-600' : 'text-ink'}`}>
                          {pendingLeave > 0 ? `${pendingLeave} pending` : s.leaveRequests?.length ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── INVENTORY ── */}
      {tab === 'inventory' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Stock items" value={String(db.medStock.length)} tone="plum" />
            <StatCard icon={AlertTriangle} label="Low stock" value={String(db.medStock.filter((s) => s.stock <= s.reorderLevel).length)} tone="amber" />
            <StatCard icon={CheckCircle2} label="Transfers" value={String(db.stockTransfers.filter((t) => {
              const fromWh = db.warehouses.find((w) => w.id === t.fromWarehouseId);
              const toWh = db.warehouses.find((w) => w.id === t.toWarehouseId);
              return fromWh?.branch === selectedBranch || toWh?.branch === selectedBranch;
            }).length)} tone="sky" />
            <StatCard icon={Package} label="Warehouses" value={String(db.warehouses.filter((w) => w.branch === selectedBranch).length)} tone="coral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <SectionTitle title="Shared inventory — critical stock" />
              <div className="mt-3 space-y-1.5">
                {db.medStock
                  .filter((s) => s.stock <= s.reorderLevel)
                  .slice(0, 10)
                  .map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-coral/5 border border-coral/20">
                      <div>
                        <div className="text-xs font-medium text-ink">{item.name}</div>
                        <div className="text-[10px] text-ink/50">{item.category} · {item.supplier}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-coral">{item.stock} {item.unit}</div>
                        <div className="text-[10px] text-ink/40">Min: {item.reorderLevel}</div>
                      </div>
                    </div>
                  ))}
                {db.medStock.filter((s) => s.stock <= s.reorderLevel).length === 0 && (
                  <p className="text-sm text-plum py-4 text-center">All stock levels are healthy</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Branch stock transfers" />
              <div className="mt-3 space-y-1.5">
                {db.stockTransfers
                  .filter((t) => {
                    const fromWh = db.warehouses.find((w) => w.id === t.fromWarehouseId);
                    const toWh = db.warehouses.find((w) => w.id === t.toWarehouseId);
                    return fromWh?.branch === selectedBranch || toWh?.branch === selectedBranch;
                  })
                  .slice(0, 8)
                  .map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50">
                      <div>
                        <div className="text-xs font-medium text-ink">{t.fromWarehouseName} → {t.toWarehouseName}</div>
                        <div className="text-[10px] text-ink/50">{t.date} · {t.transferNumber}</div>
                      </div>
                      <Badge status={t.status} />
                    </div>
                  ))}
                {db.stockTransfers.filter((t) => {
                  const fromWh = db.warehouses.find((w) => w.id === t.fromWarehouseId);
                  const toWh = db.warehouses.find((w) => w.id === t.toWarehouseId);
                  return fromWh?.branch === selectedBranch || toWh?.branch === selectedBranch;
                }).length === 0 && (
                  <p className="text-sm text-ink/40 py-4 text-center">No transfers for this branch</p>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <SectionTitle title="Full inventory" />
            <div className="mt-3 space-y-1.5">
              {db.medStock.slice(0, 15).map((item) => {
                const pct = Math.min(100, (item.stock / Math.max(item.reorderLevel * 2, 1)) * 100);
                const low = item.stock <= item.reorderLevel;
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas/50">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink">{item.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
                          <div className={`h-full rounded-full ${low ? 'bg-coral' : 'bg-plum'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium ${low ? 'text-coral' : 'text-ink/50'}`}>
                          {item.stock}/{item.reorderLevel * 2} {item.unit}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${low ? 'bg-coral/10 text-coral' : 'bg-lilac text-plum'}`}>
                      {low ? 'Low' : 'OK'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab === 'analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BarChartCard
              title="Revenue trend (6 months)"
              data={revenueByMonth}
              dataKey="revenue"
              xKey="month"
              color="#4C1D95"
            />
            <BarChartCard
              title="Appointment volume"
              data={revenueByMonth}
              dataKey="appointments"
              xKey="month"
              color="#0ea5e9"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="p-5">
              <SectionTitle title="Service mix" />
              <div className="mt-3 space-y-2">
                {[
                  { label: 'Consultations', count: d.medRecords.filter((m) => m.type === 'Consultation').length, color: 'bg-plum' },
                  { label: 'Vaccinations', count: d.vaccinations.length, color: 'bg-sky-400' },
                  { label: 'Surgeries', count: d.surgeries.length, color: 'bg-coral' },
                  { label: 'Lab tests', count: d.labs.length, color: 'bg-amber-400' },
                  { label: 'Grooming', count: d.grooming.length, color: 'bg-pink-400' },
                  { label: 'Boarding', count: d.boarding.length, color: 'bg-orange-400' },
                ].map(({ label, count, color }) => {
                  const total = d.medRecords.length + d.vaccinations.length + d.surgeries.length + d.labs.length + d.grooming.length + d.boarding.length || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-xs text-ink/70 flex-1">{label}</span>
                      <div className="w-20 h-1.5 rounded-full bg-canvas overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-ink w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Staff utilization" />
              <div className="mt-3 space-y-2">
                {d.staff.filter((s) => s.role === 'Veterinarian').map((s) => {
                  const myAppts = d.appointments.filter((a) => a.vet === s.name).length;
                  const myMeds = d.medRecords.filter((m) => m.vet === s.name).length;
                  return (
                    <div key={s.id} className="p-2 rounded-xl bg-canvas/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-ink">{s.name}</span>
                        <span className="text-[10px] text-ink/50">{myAppts} appts</span>
                      </div>
                      <div className="flex gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">{myAppts} appointments</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-lilac text-plum">{myMeds} records</span>
                      </div>
                    </div>
                  );
                })}
                {d.staff.filter((s) => s.role === 'Veterinarian').length === 0 && (
                  <p className="text-xs text-ink/40 py-2">No vets at this branch</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Key metrics" />
              <div className="mt-3 space-y-3">
                {[
                  { label: 'Avg revenue/appt', value: d.appointments.length > 0 ? fmtMoney(d.revenue / d.appointments.length) : '—' },
                  { label: 'Staff:patient ratio', value: d.staff.length > 0 ? `1:${Math.round(d.medRecords.length / d.staff.length)}` : '—' },
                  { label: 'Appointment completion', value: d.appointments.length > 0 ? fmtPct((d.apptCompleted / d.appointments.length) * 100) : '—' },
                  { label: 'Prescription rate', value: d.medRecords.length > 0 ? fmtPct((d.prescriptions.length / d.medRecords.length) * 100) : '—' },
                  { label: 'Surgery rate', value: d.medRecords.length > 0 ? fmtPct((d.surgeries.length / d.medRecords.length) * 100) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
                    <span className="text-sm text-ink/60">{label}</span>
                    <span className="text-sm font-semibold text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── COMPARISON ── */}
      {tab === 'comparison' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BarChartCard
              title="Revenue by branch"
              data={comparisonData}
              dataKey="revenue"
              xKey="branch"
              color="#4C1D95"
            />
            <BarChartCard
              title="Staff count by branch"
              data={comparisonData}
              dataKey="staff"
              xKey="branch"
              color="#f17f65"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BarChartCard
              title="Appointments by branch"
              data={comparisonData}
              dataKey="appointments"
              xKey="branch"
              color="#0ea5e9"
            />
            <BarChartCard
              title="Lab tests by branch"
              data={comparisonData}
              dataKey="labs"
              xKey="branch"
              color="#f59e0b"
            />
          </div>

          {/* Side-by-side comparison table */}
          <Card className="p-5">
            <SectionTitle title="Full branch comparison" />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="text-left py-2 text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Metric</th>
                    {branchNames.map((b) => (
                      <th key={b} className="text-right py-2 text-[11px] font-semibold text-ink/50 uppercase tracking-wide px-4">{b}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Total staff', fn: (bd: ReturnType<typeof getBranchData>) => bd.staff.length },
                    { label: 'Active staff', fn: (bd: ReturnType<typeof getBranchData>) => bd.activeStaff },
                    { label: 'On leave', fn: (bd: ReturnType<typeof getBranchData>) => bd.onLeaveStaff },
                    { label: 'Revenue', fn: (bd: ReturnType<typeof getBranchData>) => fmtMoney(bd.revenue) },
                    { label: 'Outstanding', fn: (bd: ReturnType<typeof getBranchData>) => fmtMoney(bd.outstanding) },
                    { label: 'Monthly payroll', fn: (bd: ReturnType<typeof getBranchData>) => fmtMoney(bd.monthlyPayroll) },
                    { label: 'Appointments', fn: (bd: ReturnType<typeof getBranchData>) => bd.appointments.length },
                    { label: 'Completed appts', fn: (bd: ReturnType<typeof getBranchData>) => bd.apptCompleted },
                    { label: 'Medical records', fn: (bd: ReturnType<typeof getBranchData>) => bd.medRecords.length },
                    { label: 'Lab tests', fn: (bd: ReturnType<typeof getBranchData>) => bd.labs.length },
                    { label: 'Surgeries', fn: (bd: ReturnType<typeof getBranchData>) => bd.surgeries.length },
                    { label: 'Vaccinations', fn: (bd: ReturnType<typeof getBranchData>) => bd.vaccinations.length },
                    { label: 'Grooming', fn: (bd: ReturnType<typeof getBranchData>) => bd.grooming.length },
                    { label: 'Boarding', fn: (bd: ReturnType<typeof getBranchData>) => bd.boarding.length },
                  ].map(({ label, fn }) => (
                    <tr key={label} className="border-b border-line/50 hover:bg-canvas/50">
                      <td className="py-2.5 text-ink/70">{label}</td>
                      {branchNames.map((b) => (
                        <td key={b} className="py-2.5 text-right font-medium text-ink px-4">{fn(branchDataMap[b])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
}
