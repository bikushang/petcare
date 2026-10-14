'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Calendar, Users, Syringe, Scissors,
  Hotel, Pill, Stethoscope, Activity, Filter, Download, BarChart3,
  PieChart as PieIcon, LineChart as LineIcon, Grid3x3, Target, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Percent, Wallet, FileText, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';
import Shell from '../components/Shell';
import { Card, Select, DatePicker, StatCard, Button, EmptyState, Tabs } from '../components/ui';
import { useDB } from '../lib/store';
import {
  invoiceTotals, countsAsRevenue, localDateISO, addDaysISO, daysBetween, weekdayOf,
  num, round2, downloadCSV,
} from '../lib/helpers';
import { useSettings, formatDate } from '../lib/settings';
import { branches as branchList } from '../lib/platform';
import type { Invoice } from '../lib/api';

type Tab = 'overview' | 'revenue' | 'expenses' | 'profit' | 'tax' | 'appointments' | 'doctors' | 'grooming' | 'boarding' | 'pharmacy' | 'vaccinations' | 'growth' | 'retention' | 'churn' | 'forecast';

const COLORS = ['#4C1D95', '#f17f65', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#7C3AED', '#f43f5e'];
const tooltipStyle = { borderRadius: 12, border: '1px solid #E8E3F3', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' };

/** A client is considered churned once this many days pass with no visit. */
const CHURN_DAYS = 90;

const PRESETS: { label: string; days: number }[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
  { label: 'All time', days: 9999 },
];

function inDateRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

/** `YYYY-MM` straight off the ISO string — `new Date(iso)` parses as UTC and
    shifted first-of-month rows into the previous month west of UTC. */
function monthKey(dateStr: string): string {
  const d = (dateStr || '').slice(0, 10);
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : '';
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1] ?? m} ${y.slice(2)}`;
}

/** First and last day of a `YYYY-MM` month, in local time. */
function monthBounds(key: string): { start: string; end: string } {
  const [y, m] = key.split('-').map((v) => parseInt(v, 10));
  return { start: `${key}-01`, end: localDateISO(new Date(y, m, 0)) };
}

export default function AnalyticsPage() {
  const { db } = useDB();
  const { settings } = useSettings();
  const money = (n: number) => `${settings.currencySymbol}${Math.round(num(n)).toLocaleString('en-US')}`;
  const [tab, setTab] = useState<Tab>('overview');

  // Filters
  const [presetIdx, setPresetIdx] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [branch, setBranch] = useState('all');
  const [doctor, setDoctor] = useState('all');
  const [service, setService] = useState('all');
  const [department, setDepartment] = useState('all');
  const [payStatus, setPayStatus] = useState('all');

  const todayStr = localDateISO();
  const owners = db?.owners ?? [];
  const staff = db?.staff ?? [];

  // Compute effective date range. A half-filled range used to be dropped
  // entirely; now each bound falls back independently, and a reversed range
  // is swapped instead of silently matching nothing.
  const { from, to } = useMemo(() => {
    const preset = PRESETS[presetIdx] ?? PRESETS[1];
    const presetFrom = preset.days >= 9999 ? '1900-01-01' : addDaysISO(todayStr, -preset.days);
    const f = fromDate || presetFrom;
    const t = toDate || todayStr;
    return f <= t ? { from: f, to: t } : { from: t, to: f };
  }, [fromDate, toDate, presetIdx, todayStr]);

  /* ── Branch + department scope ──────────────────────────────────
     Neither is stored on the records themselves: both are properties of
     staff, so a record belongs to a branch/department when the person who
     handled it does. Previously `filterByBranch` was defined and never
     called, and `department` was set and never read. */
  const scopeActive = branch !== 'all' || department !== 'all';
  const scopedStaffNames = useMemo(
    () =>
      new Set(
        staff
          .filter((s) => (branch === 'all' || s.branch === branch) && (department === 'all' || s.department === department))
          .map((s) => s.name)
          .filter(Boolean),
      ),
    [staff, branch, department],
  );

  const inScope = useCallback(
    (names: (string | undefined)[]) =>
      !scopeActive || names.some((n) => !!n && scopedStaffNames.has(n)),
    [scopeActive, scopedStaffNames],
  );

  // Dropdown options — doctors follow the branch/department scope so the
  // filters stay coherent with each other.
  const vets = useMemo(
    () => Array.from(new Set((db?.appointments ?? []).filter((a) => inScope([a.vet])).map((a) => a.vet).filter(Boolean))).sort(),
    [db?.appointments, inScope],
  );
  const services = useMemo(
    () => Array.from(new Set((db?.appointments ?? []).map((a) => a.service).filter(Boolean))).sort(),
    [db?.appointments],
  );
  const departments = useMemo(
    () => Array.from(new Set(staff.map((s) => s.department).filter(Boolean))).sort(),
    [staff],
  );
  const branchNames = branchList.map((b) => b.name);

  // ── Filtered datasets ──
  const filteredInvoices = useMemo(
    () =>
      (db?.invoices ?? []).filter((inv) => {
        if (!inDateRange(inv.date, from, to)) return false;
        if (payStatus !== 'all' && inv.status !== payStatus) return false;
        if (!inScope((inv.items ?? []).map((it) => it.practitionerName))) return false;
        if (doctor !== 'all' && !(inv.items ?? []).some((it) => it.practitionerName === doctor)) return false;
        if (service !== 'all' && !(inv.items ?? []).some((it) => it.category === service || it.description.includes(service))) return false;
        return true;
      }),
    [db?.invoices, from, to, payStatus, doctor, service, inScope],
  );

  /** Documents that represent recognised revenue — no drafts, cancellations,
      estimates, credit notes or refunds. */
  const revenueInvoices = useMemo(() => filteredInvoices.filter(countsAsRevenue), [filteredInvoices]);
  const invoiceMoney = useMemo(() => revenueInvoices.map((inv) => ({ inv, t: invoiceTotals(inv) })), [revenueInvoices]);

  // Expenses carry no staff or branch field, so they stay clinic-wide.
  const filteredExpenses = useMemo(
    () => (db?.expenses ?? []).filter((e) => inDateRange(e.date, from, to)),
    [db?.expenses, from, to],
  );

  const allAppointments = db?.appointments ?? [];
  /** Branch/department-scoped appointments, ignoring the date range — the
      retention and churn measures are lifetime, not period, measures. */
  const scopedAppts = useMemo(
    () => allAppointments.filter((a) => inScope([a.vet])),
    [allAppointments, inScope],
  );

  const filteredAppts = useMemo(
    () =>
      scopedAppts.filter((a) => {
        if (!inDateRange(a.date, from, to)) return false;
        if (doctor !== 'all' && a.vet !== doctor) return false;
        if (service !== 'all' && a.service !== service) return false;
        return true;
      }),
    [scopedAppts, from, to, doctor, service],
  );

  const filteredGrooming = useMemo(
    () =>
      (db?.grooming ?? []).filter((g) => {
        if (!inDateRange(g.date, from, to)) return false;
        if (!inScope([g.groomer])) return false;
        if (doctor !== 'all' && g.groomer !== doctor) return false;
        return true;
      }),
    [db?.grooming, from, to, doctor, inScope],
  );
  const filteredBoarding = useMemo(
    () => (db?.boarding ?? []).filter((b) => inDateRange(b.checkIn, from, to) && inScope([b.vetOnCall])),
    [db?.boarding, from, to, inScope],
  );
  const filteredPharmacy = useMemo(
    () => (db?.pharmacySales ?? []).filter((p) => inDateRange(p.date, from, to) && inScope([p.dispensedBy])),
    [db?.pharmacySales, from, to, inScope],
  );
  const filteredVaccines = useMemo(
    () => (db?.vaccinations ?? []).filter((v) => inDateRange(v.dateGiven, from, to) && inScope([v.vet])),
    [db?.vaccinations, from, to, inScope],
  );

  // ── REVENUE ──
  // `invoiceTotals` is the single implementation shared with Billing: it covers
  // per-item discounts, the invoice discount, coupons, tax and payments, so
  // Analytics no longer disagrees with the invoice it is summing.
  const totalRevenue = round2(invoiceMoney.reduce((s, { t }) => s + t.total, 0));
  const paidRevenue = round2(invoiceMoney.reduce((s, { t }) => s + t.amountPaid, 0));
  const outstandingRevenue = round2(invoiceMoney.reduce((s, { t }) => s + t.balance, 0));

  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    invoiceMoney.forEach(({ inv, t }) => {
      const mk = monthKey(inv.date);
      if (!mk) return;
      map[mk] = (map[mk] || 0) + t.total;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [invoiceMoney]);

  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    invoiceMoney.forEach(({ inv, t }) => {
      // Spread discounts/tax across the lines so the slices add up to revenue.
      const gross = (inv.items ?? []).reduce((s, it) => s + num(it.qty) * num(it.unitPrice), 0);
      const ratio = gross > 0 ? t.total / gross : 0;
      (inv.items ?? []).forEach((it) => {
        map[it.category] = (map[it.category] || 0) + num(it.qty) * num(it.unitPrice) * ratio;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [invoiceMoney]);

  const revenueByPayment = useMemo(() => {
    const map: Record<string, number> = {};
    invoiceMoney.forEach(({ inv, t }) => {
      const m = inv.method || 'Unknown';
      map[m] = (map[m] || 0) + t.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [invoiceMoney]);

  // ── EXPENSES ──
  const totalExpenses = round2(filteredExpenses.reduce((s, e) => s + num(e.total), 0));
  const expensesByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const mk = monthKey(e.date);
      if (!mk) return;
      map[mk] = (map[mk] || 0) + num(e.total);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), expenses: Math.round(v) }));
  }, [filteredExpenses]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + num(e.total);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredExpenses]);

  // ── PROFIT ──
  const totalProfit = round2(totalRevenue - totalExpenses);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  /** Every `YYYY-MM` with revenue or expenses, ascending. Drives the profit,
      tax, retention and churn series so they share one month axis. */
  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    invoiceMoney.forEach(({ inv }) => { const k = monthKey(inv.date); if (k) keys.add(k); });
    filteredExpenses.forEach((e) => { const k = monthKey(e.date); if (k) keys.add(k); });
    return Array.from(keys).sort();
  }, [invoiceMoney, filteredExpenses]);

  const profitByMonth = useMemo(() => {
    const revMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    invoiceMoney.forEach(({ inv, t }) => { const mk = monthKey(inv.date); if (mk) revMap[mk] = (revMap[mk] || 0) + t.total; });
    filteredExpenses.forEach((e) => { const mk = monthKey(e.date); if (mk) expMap[mk] = (expMap[mk] || 0) + num(e.total); });
    return monthKeys.map((k) => ({
      month: monthLabel(k),
      revenue: Math.round(revMap[k] || 0),
      expenses: Math.round(expMap[k] || 0),
      profit: Math.round((revMap[k] || 0) - (expMap[k] || 0)),
    }));
  }, [invoiceMoney, filteredExpenses, monthKeys]);

  // ── TAX ──
  const totalTaxCollected = round2(invoiceMoney.reduce((s, { t }) => s + t.taxTotal, 0));
  const totalTaxPaid = round2(filteredExpenses.reduce((s, e) => s + num(e.tax), 0));
  const netTax = round2(totalTaxCollected - totalTaxPaid);
  const taxableRevenue = round2(invoiceMoney.reduce((s, { t }) => s + t.subtotal - t.itemDiscount - t.invoiceDiscount - t.couponTotal, 0));
  const taxByMonth = useMemo(() => {
    const collMap: Record<string, number> = {};
    const paidMap: Record<string, number> = {};
    invoiceMoney.forEach(({ inv, t }) => { const mk = monthKey(inv.date); if (mk) collMap[mk] = (collMap[mk] || 0) + t.taxTotal; });
    filteredExpenses.forEach((e) => { const mk = monthKey(e.date); if (mk) paidMap[mk] = (paidMap[mk] || 0) + num(e.tax); });
    return monthKeys.map((k) => ({
      month: monthLabel(k),
      collected: Math.round(collMap[k] || 0),
      paid: Math.round(paidMap[k] || 0),
    }));
  }, [invoiceMoney, filteredExpenses, monthKeys]);

  // ── APPOINTMENTS ──
  const apptByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAppts.forEach((a) => { map[a.status] = (map[a.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredAppts]);

  const apptByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAppts.forEach((a) => { const mk = monthKey(a.date); if (mk) map[mk] = (map[mk] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), count: v }));
  }, [filteredAppts]);

  const apptByDay = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const map = [0, 0, 0, 0, 0, 0, 0];
    filteredAppts.forEach((a) => { const d = weekdayOf(a.date); if (d !== null) map[d]++; });
    return days.map((name, i) => ({ day: name, count: map[i] }));
  }, [filteredAppts]);

  // ── DOCTOR PERFORMANCE ──
  const doctorPerf = useMemo(() => {
    const names = Array.from(new Set(filteredAppts.map((a) => a.vet).filter(Boolean)));
    return names
      .map((vetName) => {
        const appts = filteredAppts.filter((a) => a.vet === vetName);
        const completed = appts.filter((a) => a.status === 'Completed').length;
        const cancelled = appts.filter((a) => a.status === 'Cancelled').length;
        const noShow = appts.filter((a) => a.status === 'No-show').length;
        const revenue = invoiceMoney.reduce((s, { inv, t }) => {
          const gross = (inv.items ?? []).reduce((ss, it) => ss + num(it.qty) * num(it.unitPrice), 0);
          if (gross <= 0) return s;
          const mine = (inv.items ?? [])
            .filter((it) => it.practitionerName === vetName)
            .reduce((ss, it) => ss + num(it.qty) * num(it.unitPrice), 0);
          return s + (mine / gross) * t.total;
        }, 0);
        const completionRate = appts.length > 0 ? Math.round((completed / appts.length) * 100) : 0;
        return { name: vetName, total: appts.length, completed, cancelled, noShow, revenue: Math.round(revenue), completionRate };
      })
      .filter((v) => v.total > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppts, invoiceMoney]);

  // ── GROOMING ──
  const groomingRevenue = filteredGrooming.filter((g) => g.paymentStatus === 'Paid').reduce((s, g) => s + num(g.total), 0);
  const groomingByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrooming.forEach((g) => { const mk = monthKey(g.date); if (mk) map[mk] = (map[mk] || 0) + num(g.total); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [filteredGrooming]);

  // ── BOARDING ──
  const boardingRevenue = filteredBoarding.filter((b) => b.paymentStatus === 'Paid').reduce((s, b) => s + num(b.total), 0);
  const boardingByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBoarding.forEach((b) => { const mk = monthKey(b.checkIn); if (mk) map[mk] = (map[mk] || 0) + num(b.total); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [filteredBoarding]);

  // ── PHARMACY ──
  const pharmacyRevenue = filteredPharmacy.filter((p) => p.status === 'Completed').reduce((s, p) => s + num(p.total), 0);
  const pharmacyByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPharmacy.forEach((p) => { const mk = monthKey(p.date); if (mk) map[mk] = (map[mk] || 0) + num(p.total); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [filteredPharmacy]);

  // ── VACCINATIONS ──
  const vaccineByType = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVaccines.forEach((v) => { map[v.vaccineName] = (map[v.vaccineName] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredVaccines]);

  const vaccineByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVaccines.forEach((v) => { map[v.status] = (map[v.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredVaccines]);

  const vaccineByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVaccines.forEach((v) => { const mk = monthKey(v.dateGiven); if (mk) map[mk] = (map[mk] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), count: v }));
  }, [filteredVaccines]);

  // ── CLIENT BASE (scoped by branch/department via their appointments) ──
  const scopedOwners = useMemo(() => {
    if (!scopeActive) return owners;
    const ids = new Set(scopedAppts.map((a) => a.ownerId));
    return owners.filter((o) => ids.has(o.id));
  }, [owners, scopedAppts, scopeActive]);

  /** Last completed-or-booked visit per client, used by retention and churn. */
  const lastVisitByOwner = useMemo(() => {
    const map = new Map<string, string>();
    scopedAppts.forEach((a) => {
      const prev = map.get(a.ownerId);
      if (!prev || a.date > prev) map.set(a.ownerId, a.date);
    });
    return map;
  }, [scopedAppts]);

  // ── CUSTOMER GROWTH ──
  const growthByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    scopedOwners.forEach((o) => { const mk = monthKey(o.createdAt); if (mk && inDateRange(o.createdAt, from, to)) map[mk] = (map[mk] || 0) + 1; });
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return sorted.map(([k, v]) => { cumulative += v; return { month: monthLabel(k), new: v, total: cumulative }; });
  }, [scopedOwners, from, to]);

  // ── RETENTION ──
  const totalOwners = scopedOwners.length;
  const returningOwners = scopedOwners.filter((o) => scopedAppts.filter((a) => a.ownerId === o.id).length > 1).length;
  const retentionRate = totalOwners > 0 ? Math.round((returningOwners / totalOwners) * 100) : 0;
  const retentionByMonth = useMemo(
    () =>
      monthKeys.map((k) => {
        const { start, end } = monthBounds(k);
        const active = scopedOwners.filter((o) =>
          scopedAppts.some((a) => a.ownerId === o.id && a.date >= start && a.date <= end),
        ).length;
        const returning = scopedOwners.filter((o) => {
          const mine = scopedAppts.filter((a) => a.ownerId === o.id);
          return mine.some((a) => a.date < start) && mine.some((a) => a.date >= start && a.date <= end);
        }).length;
        return { month: monthLabel(k), active, returning, rate: active > 0 ? Math.round((returning / active) * 100) : 0 };
      }),
    [scopedOwners, scopedAppts, monthKeys],
  );

  // ── CHURN ──
  const inactiveOwners = useMemo(
    () =>
      scopedOwners.filter((o) => {
        const last = lastVisitByOwner.get(o.id);
        if (!last) return false;
        const gap = daysBetween(last, todayStr);
        return gap !== null && gap > CHURN_DAYS;
      }),
    [scopedOwners, lastVisitByOwner, todayStr],
  );
  const churnRate = totalOwners > 0 ? ((inactiveOwners.length / totalOwners) * 100).toFixed(1) : '0';

  const atRiskOwners = useMemo(
    () =>
      scopedOwners.filter((o) => {
        const last = lastVisitByOwner.get(o.id);
        if (!last) return false;
        const gap = daysBetween(last, todayStr);
        return gap !== null && gap > 60 && gap <= CHURN_DAYS;
      }),
    [scopedOwners, lastVisitByOwner, todayStr],
  );

  const churnByMonth = useMemo(
    () =>
      monthKeys.map((k) => {
        const { end } = monthBounds(k);
        const prevEnd = addDaysISO(`${k}-01`, -1);
        const base = scopedOwners.filter((o) => !o.createdAt || o.createdAt <= end).length;
        // A client churns in the month their inactivity gap first passes 90
        // days. The old test asked for a >90-day gap inside a window that can
        // never exceed ~31 days, so the chart was permanently zero.
        const lost = scopedOwners.filter((o) => {
          const last = lastVisitByOwner.get(o.id);
          if (!last) return false;
          const gapNow = daysBetween(last, end);
          const gapPrev = daysBetween(last, prevEnd);
          return gapNow !== null && gapPrev !== null && gapNow > CHURN_DAYS && gapPrev <= CHURN_DAYS;
        }).length;
        return { month: monthLabel(k), lost, rate: base > 0 ? parseFloat(((lost / base) * 100).toFixed(1)) : 0 };
      }),
    [scopedOwners, lastVisitByOwner, monthKeys],
  );

  // ── FORECAST ──
  const forecastData = useMemo(() => {
    if (revenueByMonth.length < 2) return [];
    const recent = revenueByMonth.slice(-6);
    const avg = recent.reduce((s, m) => s + m.revenue, 0) / recent.length;
    const trend = recent.length > 1 ? (recent[recent.length - 1].revenue - recent[0].revenue) / (recent.length - 1) : 0;
    const forecastMonths = ['Next M1', 'Next M2', 'Next M3', 'Next M4', 'Next M5', 'Next M6'];
    return [...recent.map((m) => ({ month: m.month, actual: m.revenue, forecast: null as number | null })),
      ...forecastMonths.map((label, i) => ({ month: label, actual: null as number | null, forecast: Math.round(avg + trend * (i + 1)) }))];
  }, [revenueByMonth]);

  /** The trend KPI used to read `forecastData[1].forecast`, which is null on an
      actual row — so it always displayed 0%. Compare last actual vs next forecast. */
  const forecastSummary = useMemo(() => {
    const actuals = forecastData.filter((d) => d.actual !== null);
    const projected = forecastData.filter((d) => d.forecast !== null);
    const lastActual = actuals.length > 0 ? actuals[actuals.length - 1].actual ?? 0 : 0;
    const nextForecast = projected.length > 0 ? projected[0].forecast ?? 0 : 0;
    const trendPct = lastActual > 0 ? ((nextForecast - lastActual) / lastActual) * 100 : 0;
    const window = revenueByMonth.slice(-6);
    const average = window.length > 0 ? window.reduce((s, m) => s + m.revenue, 0) / window.length : 0;
    return { lastActual, nextForecast, trendPct, average };
  }, [forecastData, revenueByMonth]);

  // ── HEATMAP: appointments by day×hour ──
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am-7pm
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid: number[][] = days.map(() => hours.map(() => 0));
    filteredAppts.forEach((a) => {
      const weekday = weekdayOf(a.date);
      if (weekday === null) return;
      const dayIdx = (weekday + 6) % 7; // Mon=0
      const hourIdx = hours.indexOf(parseInt(a.time?.split(':')[0] || '9', 10));
      if (hourIdx >= 0) grid[dayIdx][hourIdx]++;
    });
    const max = Math.max(...grid.flat(), 1);
    return { grid, hours, days, max };
  }, [filteredAppts]);

  // ── KPI Radial ──
  const kpiRadial = [
    { name: 'Revenue', value: Math.min((totalRevenue / 100000) * 100, 100), fill: '#4C1D95' },
    { name: 'Retention', value: retentionRate, fill: '#f59e0b' },
    { name: 'Profit margin', value: parseFloat(profitMargin) || 0, fill: '#0ea5e9' },
    { name: 'Completion', value: filteredAppts.length > 0 ? Math.round((filteredAppts.filter((a) => a.status === 'Completed').length / filteredAppts.length) * 100) : 0, fill: '#f17f65' },
  ];

  // ── Export ──
  /** CSV of exactly what the active tab is showing, after every filter. */
  const exportCurrentView = () => {
    const invoiceRow = ({ inv, t }: { inv: Invoice; t: ReturnType<typeof invoiceTotals> }) => ({
      number: inv.number,
      docType: inv.docType,
      date: inv.date,
      status: inv.status,
      method: inv.method,
      subtotal: t.subtotal,
      discount: round2(t.itemDiscount + t.invoiceDiscount + t.couponTotal),
      tax: t.taxTotal,
      total: t.total,
      paid: t.amountPaid,
      balance: t.balance,
    });

    let rows: Record<string, unknown>[];
    switch (tab) {
      case 'expenses':
        rows = filteredExpenses.map((e) => ({ number: e.number, date: e.date, category: e.category, description: e.description, vendor: e.vendor, status: e.status, amount: num(e.amount), tax: num(e.tax), total: num(e.total) }));
        break;
      case 'profit':
        rows = profitByMonth;
        break;
      case 'tax':
        rows = taxByMonth;
        break;
      case 'appointments':
        rows = filteredAppts.map((a) => ({ date: a.date, time: a.time, vet: a.vet, service: a.service, status: a.status, bookingType: a.bookingType, durationMin: a.durationMin }));
        break;
      case 'doctors':
        rows = doctorPerf;
        break;
      case 'grooming':
        rows = filteredGrooming.map((g) => ({ number: g.appointmentNumber, date: g.date, pet: g.petName, groomer: g.groomer, status: g.status, paymentStatus: g.paymentStatus, total: num(g.total) }));
        break;
      case 'boarding':
        rows = filteredBoarding.map((b) => ({ number: b.boardingNumber, checkIn: b.checkIn, checkOut: b.checkOut, pet: b.petName, room: b.room, status: b.status, paymentStatus: b.paymentStatus, total: num(b.total) }));
        break;
      case 'pharmacy':
        rows = filteredPharmacy.map((p) => ({ number: p.saleNumber, date: p.date, customer: p.customerName, dispensedBy: p.dispensedBy, status: p.status, total: num(p.total) }));
        break;
      case 'vaccinations':
        rows = filteredVaccines.map((v) => ({ date: v.dateGiven, vaccine: v.vaccineName, dose: v.doseNumber, vet: v.vet, status: v.status, nextDue: v.nextDueDate }));
        break;
      case 'growth':
        rows = growthByMonth;
        break;
      case 'retention':
        rows = retentionByMonth;
        break;
      case 'churn':
        rows = churnByMonth;
        break;
      case 'forecast':
        rows = forecastData.map((d) => ({ month: d.month, actual: d.actual ?? '', forecast: d.forecast ?? '' }));
        break;
      default:
        rows = invoiceMoney.map(invoiceRow);
    }
    downloadCSV(`petcare-${tab}-${from}-to-${to}.csv`, rows);
  };

  const resetFilters = () => {
    setPresetIdx(1);
    setFromDate('');
    setToDate('');
    setBranch('all');
    setDoctor('all');
    setService('all');
    setDepartment('all');
    setPayStatus('all');
  };

  // ── Tabs ──
  const tabs: { key: Tab; label: string; icon: typeof DollarSign }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'expenses', label: 'Expenses', icon: Wallet },
    { key: 'profit', label: 'Profit', icon: TrendingUp },
    { key: 'tax', label: 'Tax', icon: FileText },
    { key: 'appointments', label: 'Appointments', icon: Calendar },
    { key: 'doctors', label: 'Doctor Perf.', icon: Stethoscope },
    { key: 'grooming', label: 'Grooming', icon: Scissors },
    { key: 'boarding', label: 'Boarding', icon: Hotel },
    { key: 'pharmacy', label: 'Pharmacy', icon: Pill },
    { key: 'vaccinations', label: 'Vaccinations', icon: Syringe },
    { key: 'growth', label: 'Growth', icon: Users },
    { key: 'retention', label: 'Retention', icon: Activity },
    { key: 'churn', label: 'Churn', icon: AlertTriangle },
    { key: 'forecast', label: 'Forecast', icon: Target },
  ];

  const heatColor = (val: number, max: number) => {
    if (val === 0) return 'bg-lilac/30';
    const ratio = val / max;
    if (ratio > 0.75) return 'bg-plum text-white';
    if (ratio > 0.5) return 'bg-plum/70 text-white';
    if (ratio > 0.25) return 'bg-lilac text-plum';
    return 'bg-lilac/50 text-ink/50';
  };

  if (!db) return <Shell module="analytics" title="Analytics & Reports"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  return (
    <Shell module="analytics" title="Analytics & Reports" subtitle="Reporting center with financial, operational, and growth insights">
      {/* ── Filter bar ──
          Written inline rather than as a `FilterBar` component declared in the
          render body: that remounted on every keystroke, so the date picker
          lost focus after a single character. */}
      <Card className="p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-plum" />
          <span className="text-sm font-semibold text-ink">Filters</span>
          <span className="text-[11px] text-ink/45">
            {formatDate(from, settings)} → {formatDate(to, settings)}
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={resetFilters}>Reset</Button>
          <Button size="sm" variant="outline" onClick={exportCurrentView}><Download className="w-3.5 h-3.5" /> Export</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Date preset</label>
            <Select value={String(presetIdx)} onChange={(e) => { setPresetIdx(parseInt(e.target.value, 10)); setFromDate(''); setToDate(''); }}>
              {PRESETS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">From date</label>
            <DatePicker value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From" max={toDate || undefined} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">To date</label>
            <DatePicker value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To" min={fromDate || undefined} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Branch</label>
            <Select value={branch} onChange={(e) => { setBranch(e.target.value); setDoctor('all'); }}>
              <option value="all">All branches</option>
              {branchNames.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Doctor</label>
            <Select value={doctor} onChange={(e) => setDoctor(e.target.value)}>
              <option value="all">All doctors</option>
              {vets.map((v) => <option key={v}>{v}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Service</label>
            <Select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="all">All services</option>
              <option>Consultation</option>
              <option>Surgery</option>
              <option>Vaccination</option>
              <option>Medication</option>
              <option>Lab</option>
              <option>Grooming</option>
              <option>Boarding</option>
              <option>Product</option>
              <option>Other</option>
              {services.filter((s) => !['Consultation', 'Surgery', 'Vaccination', 'Medication', 'Lab', 'Grooming', 'Boarding', 'Product', 'Other'].includes(s)).map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Department</label>
            <Select value={department} onChange={(e) => { setDepartment(e.target.value); setDoctor('all'); }}>
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Payment status</label>
            <Select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option>Paid</option>
              <option>Partial</option>
              <option>Pending</option>
              <option>Overdue</option>
              <option>Draft</option>
              <option>Sent</option>
              <option>Refunded</option>
              <option>Cancelled</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
            <StatCard icon={DollarSign} label="Revenue" value={money(totalRevenue)} sub={`${revenueInvoices.length} invoices`} tone="plum" />
            <StatCard icon={Wallet} label="Expenses" value={money(totalExpenses)} sub={`${filteredExpenses.length} entries`} tone="coral" />
            <StatCard icon={TrendingUp} label="Profit" value={money(totalProfit)} sub={`${profitMargin}% margin`} tone={totalProfit >= 0 ? 'plum' : 'coral'} />
            <StatCard icon={Calendar} label="Appointments" value={filteredAppts.length} sub={`${filteredAppts.filter((a) => a.status === 'Completed').length} completed`} tone="sky" />
            <StatCard icon={Activity} label="Retention" value={`${retentionRate}%`} sub={`${returningOwners}/${totalOwners} clients`} tone="amber" />
            <StatCard icon={AlertTriangle} label="Churn" value={`${churnRate}%`} sub={`${inactiveOwners.length} inactive`} tone="coral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* KPI Radial dashboard */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">KPI Dashboard</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart innerRadius="25%" outerRadius="90%" data={kpiRadial} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#F1EDFA' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} layout="vertical" verticalAlign="middle" align="right" />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadialBarChart>
              </ResponsiveContainer>
            </Card>

            {/* Revenue vs Expenses bar */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue vs Expenses</h3>
              {profitByMonth.length === 0 ? (
                <EmptyState icon={BarChart3} title="No data" hint="Data will appear once invoices and expenses are recorded." />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={profitByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="#4C1D95" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="expenses" fill="#f17f65" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue by category pie */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue by category</h3>
              {revenueByCategory.length === 0 ? (
                <EmptyState icon={PieIcon} title="No data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={revenueByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Appointment heatmap */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Appointment heatmap (day × hour)</h3>
              <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-10" />
                    {heatmapData.hours.map((h) => (
                      <div key={h} className="flex-1 text-center text-[10px] text-ink/45 font-medium">{h}:00</div>
                    ))}
                  </div>
                  {heatmapData.days.map((day, di) => (
                    <div key={day} className="flex items-center gap-1 mb-1">
                      <div className="w-10 text-[10px] text-ink/60 font-medium">{day}</div>
                      {heatmapData.hours.map((_, hi) => (
                        <div key={hi} className={`flex-1 h-8 rounded-md flex items-center justify-center text-[10px] font-medium ${heatColor(heatmapData.grid[di][hi], heatmapData.max)}`}>
                          {heatmapData.grid[di][hi] > 0 && heatmapData.grid[di][hi]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ═══ REVENUE ═══ */}
      {tab === 'revenue' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={DollarSign} label="Total revenue" value={money(totalRevenue)} sub={`${revenueInvoices.length} invoices`} tone="plum" />
            <StatCard icon={ArrowUpRight} label="Paid" value={money(paidRevenue)} sub="Collected" tone="plum" />
            <StatCard icon={AlertTriangle} label="Outstanding" value={money(outstandingRevenue)} sub="Unpaid" tone="coral" />
            <StatCard icon={Percent} label="Avg per invoice" value={money(revenueInvoices.length > 0 ? totalRevenue / revenueInvoices.length : 0)} sub="Per bill" tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue trend (line)</h3>
              {revenueByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No revenue data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="revenue" stroke="#4C1D95" strokeWidth={2.5} dot={{ fill: '#4C1D95', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue by category (pie)</h3>
              {revenueByCategory.length === 0 ? <EmptyState icon={PieIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={revenueByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue by payment method</h3>
              {revenueByPayment.length === 0 ? <EmptyState icon={PieIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={revenueByPayment} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {revenueByPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue by month (bar)</h3>
              {revenueByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                    <Bar dataKey="revenue" fill="#4C1D95" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ═══ EXPENSES ═══ */}
      {tab === 'expenses' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Wallet} label="Total expenses" value={money(totalExpenses)} sub={`${filteredExpenses.length} entries`} tone="coral" />
            <StatCard icon={TrendingDown} label="Paid" value={money(filteredExpenses.filter((e) => e.status === 'Paid').reduce((s, e) => s + num(e.total), 0))} sub="Settled" tone="plum" />
            <StatCard icon={Clock} label="Pending" value={money(filteredExpenses.filter((e) => e.status === 'Pending').reduce((s, e) => s + num(e.total), 0))} sub="Awaiting payment" tone="amber" />
            <StatCard icon={Percent} label="Avg per entry" value={money(filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0)} sub="Per expense" tone="sky" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Expense trend (area)</h3>
              {expensesByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No expense data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={expensesByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f17f65" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#f17f65" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="expenses" stroke="#f17f65" strokeWidth={2.5} fill="url(#expGrad)" dot={{ fill: '#f17f65', r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Expenses by category (pie)</h3>
              {expensesByCategory.length === 0 ? <EmptyState icon={PieIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={expensesByCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ═══ PROFIT ═══ */}
      {tab === 'profit' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={DollarSign} label="Revenue" value={money(totalRevenue)} tone="plum" />
            <StatCard icon={Wallet} label="Expenses" value={money(totalExpenses)} tone="coral" />
            <StatCard icon={TrendingUp} label="Net profit" value={money(totalProfit)} tone={totalProfit >= 0 ? 'plum' : 'coral'} />
            <StatCard icon={Percent} label="Profit margin" value={`${profitMargin}%`} tone="amber" />
          </div>
          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Revenue, Expenses & Profit (bar + line)</h3>
            {profitByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No profit data" /> : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={profitByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#4C1D95" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" fill="#f17f65" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Line type="monotone" dataKey="profit" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: '#0ea5e9', r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Profit trend (area)</h3>
            {profitByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No data" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={profitByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="profit" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ fill: '#0ea5e9', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ TAX ═══ */}
      {tab === 'tax' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={FileText} label="Tax collected" value={money(totalTaxCollected)} sub="From invoices" tone="plum" />
            <StatCard icon={Wallet} label="Tax paid" value={money(totalTaxPaid)} sub="On expenses" tone="coral" />
            <StatCard icon={Percent} label="Net tax" value={money(netTax)} sub="Collected - paid" tone={netTax >= 0 ? 'plum' : 'coral'} />
            <StatCard icon={DollarSign} label="Taxable revenue" value={money(taxableRevenue)} sub="Pre-tax total" tone="amber" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Tax collected vs paid (bar)</h3>
            {taxByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No tax data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taxByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="collected" fill="#4C1D95" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="paid" fill="#f17f65" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ APPOINTMENTS ═══ */}
      {tab === 'appointments' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Calendar} label="Total" value={filteredAppts.length} tone="plum" />
            <StatCard icon={ArrowUpRight} label="Completed" value={filteredAppts.filter((a) => a.status === 'Completed').length} tone="plum" />
            <StatCard icon={AlertTriangle} label="Cancelled" value={filteredAppts.filter((a) => a.status === 'Cancelled').length} tone="coral" />
            <StatCard icon={ArrowDownRight} label="No-show" value={filteredAppts.filter((a) => a.status === 'No-show').length} tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Appointments by status (pie)</h3>
              {apptByStatus.length === 0 ? <EmptyState icon={PieIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={apptByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {apptByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Appointments by month (line)</h3>
              {apptByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={apptByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2.5} dot={{ fill: '#0ea5e9', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Appointments by day of week (bar)</h3>
              {apptByDay.length === 0 ? <EmptyState icon={BarChart3} title="No data" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={apptByDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Heatmap (day × hour)</h3>
              <div className="overflow-x-auto">
                <div className="min-w-[400px]">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="w-10" />
                    {heatmapData.hours.map((h) => <div key={h} className="flex-1 text-center text-[10px] text-ink/45 font-medium">{h}:00</div>)}
                  </div>
                  {heatmapData.days.map((day, di) => (
                    <div key={day} className="flex items-center gap-1 mb-1">
                      <div className="w-10 text-[10px] text-ink/60 font-medium">{day}</div>
                      {heatmapData.hours.map((_, hi) => (
                        <div key={hi} className={`flex-1 h-8 rounded-md flex items-center justify-center text-[10px] font-medium ${heatColor(heatmapData.grid[di][hi], heatmapData.max)}`}>
                          {heatmapData.grid[di][hi] > 0 && heatmapData.grid[di][hi]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ═══ DOCTOR PERFORMANCE ═══ */}
      {tab === 'doctors' && (
        <>
          {doctorPerf.length === 0 ? (
            <Card><EmptyState icon={Stethoscope} title="No doctor data" hint="Doctor performance will appear once appointments and invoices are recorded." /></Card>
          ) : (
            <>
              <Card className="p-5 mb-4">
                <h3 className="text-sm font-semibold text-ink mb-4">Revenue by doctor (bar)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={doctorPerf} layout="vertical" margin={{ top: 8, right: 8, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                    <Bar dataKey="revenue" fill="#4C1D95" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-ink mb-4">Doctor performance table</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                        <th className="py-2.5 pr-4 font-semibold">Doctor</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">Total appts</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">Completed</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">Cancelled</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">No-show</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">Completion %</th>
                        <th className="py-2.5 pr-4 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorPerf.map((d) => (
                        <tr key={d.name} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-ink">{d.name}</td>
                          <td className="py-3 pr-4 text-right text-ink/70">{d.total}</td>
                          <td className="py-3 pr-4 text-right text-plum font-medium">{d.completed}</td>
                          <td className="py-3 pr-4 text-right text-coral">{d.cancelled}</td>
                          <td className="py-3 pr-4 text-right text-amber-600">{d.noShow}</td>
                          <td className="py-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-line overflow-hidden">
                                <div className="h-full rounded-full bg-plum" style={{ width: `${d.completionRate}%` }} />
                              </div>
                              <span className="text-xs font-medium text-ink/70">{d.completionRate}%</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-plum">${d.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* ═══ GROOMING ═══ */}
      {tab === 'grooming' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Scissors} label="Grooming revenue" value={money(groomingRevenue)} sub={`${filteredGrooming.filter((g) => g.paymentStatus === 'Paid').length} paid`} tone="plum" />
            <StatCard icon={Calendar} label="Total sessions" value={filteredGrooming.length} sub="In range" tone="amber" />
            <StatCard icon={Percent} label="Completion rate" value={`${filteredGrooming.length > 0 ? Math.round((filteredGrooming.filter((g) => g.status === 'Completed').length / filteredGrooming.length) * 100) : 0}%`} tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Grooming revenue trend (area)</h3>
            {groomingByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No grooming data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={groomingByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="groomGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2.5} fill="url(#groomGrad)" dot={{ fill: '#ec4899', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ BOARDING ═══ */}
      {tab === 'boarding' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Hotel} label="Boarding revenue" value={money(boardingRevenue)} sub={`${filteredBoarding.filter((b) => b.paymentStatus === 'Paid').length} paid`} tone="plum" />
            <StatCard icon={Calendar} label="Check-ins" value={filteredBoarding.length} sub="In range" tone="amber" />
            <StatCard icon={Activity} label="Currently in" value={filteredBoarding.filter((b) => b.status === 'Checked-in').length} sub="On-site" tone="coral" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Boarding revenue trend (bar)</h3>
            {boardingByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No boarding data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={boardingByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ PHARMACY ═══ */}
      {tab === 'pharmacy' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Pill} label="Pharmacy revenue" value={money(pharmacyRevenue)} sub={`${filteredPharmacy.filter((p) => p.status === 'Completed').length} sales`} tone="plum" />
            <StatCard icon={Calendar} label="Total sales" value={filteredPharmacy.length} sub="In range" tone="amber" />
            <StatCard icon={Percent} label="Avg sale" value={money(filteredPharmacy.length > 0 ? pharmacyRevenue / filteredPharmacy.length : 0)} tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Pharmacy sales trend (line)</h3>
            {pharmacyByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No pharmacy data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pharmacyByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2.5} dot={{ fill: '#7C3AED', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ VACCINATIONS ═══ */}
      {tab === 'vaccinations' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Syringe} label="Total" value={filteredVaccines.length} sub="In range" tone="plum" />
            <StatCard icon={ArrowUpRight} label="Completed" value={filteredVaccines.filter((v) => v.status === 'Completed').length} tone="plum" />
            <StatCard icon={AlertTriangle} label="Overdue" value={filteredVaccines.filter((v) => v.status === 'Overdue').length} tone="coral" />
            <StatCard icon={Clock} label="Pending" value={filteredVaccines.filter((v) => v.status === 'Pending').length} tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Vaccines by type (bar)</h3>
              {vaccineByType.length === 0 ? <EmptyState icon={BarChart3} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vaccineByType} layout="vertical" margin={{ top: 8, right: 8, left: 100, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6E6484' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
                    <Bar dataKey="value" fill="#4C1D95" radius={[0, 6, 6, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Vaccines by status (pie)</h3>
              {vaccineByStatus.length === 0 ? <EmptyState icon={PieIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={vaccineByStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {vaccineByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Vaccinations by month (line)</h3>
              {vaccineByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No data" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={vaccineByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#4C1D95" strokeWidth={2.5} dot={{ fill: '#4C1D95', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ═══ CUSTOMER GROWTH ═══ */}
      {tab === 'growth' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Users} label="Total clients" value={totalOwners} tone="plum" />
            <StatCard icon={ArrowUpRight} label="New (in range)" value={growthByMonth.reduce((s, m) => s + m.new, 0)} tone="amber" />
            <StatCard icon={Calendar} label="Avg per month" value={growthByMonth.length > 0 ? Math.round(growthByMonth.reduce((s, m) => s + m.new, 0) / growthByMonth.length) : 0} tone="sky" />
            <StatCard icon={Percent} label="Growth rate" value={`${totalOwners > 0 ? ((growthByMonth.reduce((s, m) => s + m.new, 0) / totalOwners) * 100).toFixed(1) : 0}%`} tone="coral" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Customer growth — new vs cumulative (area + line)</h3>
            {growthByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No growth data" /> : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={growthByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4C1D95" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4C1D95" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="total" stroke="#4C1D95" strokeWidth={2.5} fill="url(#totalGrad)" dot={{ fill: '#4C1D95', r: 4 }} />
                  <Line type="monotone" dataKey="new" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ RETENTION ═══ */}
      {tab === 'retention' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={Activity} label="Retention rate" value={`${retentionRate}%`} sub={`${returningOwners}/${totalOwners}`} tone="plum" />
            <StatCard icon={Users} label="Returning" value={returningOwners} sub="2+ visits" tone="amber" />
            <StatCard icon={ArrowDownRight} label="One-time" value={totalOwners - returningOwners} sub="Single visit" tone="coral" />
            <StatCard icon={Percent} label="Avg visits" value={(scopedAppts.length / Math.max(totalOwners, 1)).toFixed(1)} sub="Per client" tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Retention rate by month (line)</h3>
            {retentionByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No retention data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={retentionByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="rate" stroke="#4C1D95" strokeWidth={2.5} dot={{ fill: '#4C1D95', r: 4 }} name="Retention %" />
                  <Line type="monotone" dataKey="returning" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Returning" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}

      {/* ═══ CHURN ═══ */}
      {tab === 'churn' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard icon={AlertTriangle} label="Churn rate" value={`${churnRate}%`} sub={`${inactiveOwners.length} inactive`} tone="coral" />
            <StatCard icon={ArrowDownRight} label="Inactive (90d+)" value={inactiveOwners.length} sub="No recent visits" tone="coral" />
            <StatCard icon={Users} label="Active" value={totalOwners - inactiveOwners.length} sub="Engaged" tone="plum" />
            <StatCard icon={AlertTriangle} label="At risk" value={owners.filter((o) => {
              const appts = allAppointments.filter((a) => a.ownerId === o.id);
              if (appts.length === 0) return false;
              const last = [...appts].sort((a, b) => b.date.localeCompare(a.date))[0];
              const days = daysBetween(last.date, todayStr) ?? 0;
              return days > 60 && days <= 90;
            }).length} sub="60-90 days" tone="amber" />
          </div>
          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Churn rate by month (line)</h3>
            {churnByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No churn data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={churnByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="rate" stroke="#f17f65" strokeWidth={2.5} dot={{ fill: '#f17f65', r: 4 }} name="Churn %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Inactive clients (90+ days)</h3>
            {inactiveOwners.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Activity className="w-6 h-6 text-plum mb-2" />
                <span className="text-sm text-ink/50">All clients are active!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {inactiveOwners.slice(0, 20).map((o) => {
                  const lastAppt = [...allAppointments.filter((a) => a.ownerId === o.id)].sort((a, b) => b.date.localeCompare(a.date))[0];
                  const days = lastAppt ? daysBetween(lastAppt.date, todayStr) ?? 0 : 0;
                  return (
                    <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-coral/20 bg-coral/5">
                      <AlertTriangle className="w-4 h-4 text-coral shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{o.name}</div>
                        <div className="text-[11px] text-ink/50">Last visit: {lastAppt.date} ({days}d ago)</div>
                      </div>
                      <span className="text-xs font-semibold text-coral">{days}d</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ═══ FORECAST ═══ */}
      {tab === 'forecast' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard icon={Target} label="Projected next month" value={`$${forecastData.length > 0 && forecastData.find((f) => f.forecast !== null)?.forecast ? (forecastData.find((f) => f.forecast !== null)?.forecast ?? 0).toLocaleString() : 0}`} sub="Forecast" tone="plum" />
            <StatCard icon={TrendingUp} label="Trend" value={forecastData.length >= 2 ? (forecastData[1].forecast && forecastData[0].actual ? ((forecastData[1].forecast - forecastData[0].actual) / forecastData[0].actual * 100).toFixed(1) : '0') + '%' : '0%'} sub="Growth direction" tone="amber" />
            <StatCard icon={BarChart3} label="6-month avg" value={`$${revenueByMonth.length > 0 ? Math.round(revenueByMonth.slice(-6).reduce((s, m) => s + m.revenue, 0) / Math.min(revenueByMonth.length, 6)).toLocaleString() : 0}`} sub="Recent average" tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Revenue forecast — actual vs projected (line)</h3>
            {forecastData.length === 0 ? <EmptyState icon={Target} title="Insufficient data for forecast" hint="At least 2 months of revenue data is needed." /> : (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={forecastData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" stroke="#4C1D95" strokeWidth={2.5} dot={{ fill: '#4C1D95', r: 4 }} connectNulls={false} name="Actual revenue" />
                  <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="6 4" dot={{ fill: '#f59e0b', r: 4 }} connectNulls={false} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </>
      )}
    </Shell>
  );
}
