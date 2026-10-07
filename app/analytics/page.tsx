'use client';

import { useMemo, useState } from 'react';
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
import { Card, Select, inputCls, StatCard, Button, EmptyState } from '../components/ui';
import { useDB, today } from '../lib/store';
import { branches as branchList } from '../lib/platform';
import type { DB } from '../lib/api';

type Tab = 'overview' | 'revenue' | 'expenses' | 'profit' | 'tax' | 'appointments' | 'doctors' | 'grooming' | 'boarding' | 'pharmacy' | 'vaccinations' | 'growth' | 'retention' | 'churn' | 'forecast';

const COLORS = ['#2d7766', '#f17f65', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
const tooltipStyle = { borderRadius: 12, border: '1px solid #e4ece8', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' };

const PRESETS: { label: string; days: number }[] = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last 12 months', days: 365 },
  { label: 'All time', days: 9999 },
];

function invoiceTotal(inv: { items: { qty: number; unitPrice: number }[] }) {
  return inv.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
}

function inDateRange(dateStr: string, from: string, to: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

function monthKey(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
}

export default function AnalyticsPage() {
  const { db } = useDB();
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

  const todayStr = today();
  const owners = db?.owners ?? [];
  const appointments = db?.appointments ?? [];

  // Compute effective date range
  const { from, to } = useMemo(() => {
    if (fromDate && toDate) return { from: fromDate, to: toDate };
    const preset = PRESETS[presetIdx];
    const t = new Date();
    const f = new Date();
    f.setDate(t.getDate() - preset.days);
    return {
      from: f.toISOString().slice(0, 10),
      to: todayStr,
    };
  }, [fromDate, toDate, presetIdx, todayStr]);

  // Get unique vets and services for filter dropdowns
  const vets = Array.from(new Set((db?.appointments ?? []).map((a) => a.vet).filter(Boolean))).sort();
  const services = Array.from(new Set((db?.appointments ?? []).map((a) => a.service).filter(Boolean))).sort();
  const departments = Array.from(new Set((db?.staff ?? []).map((s) => s.department).filter(Boolean))).sort();
  const branchNames = branchList.map((b) => b.name);

  // ── Filtering helper ──
  const filterByBranch = <T extends { vet?: string; groomer?: string; dispensedBy?: string }>(items: T[], vetField: keyof T): T[] => {
    if (branch === 'all') return items;
    const branchVets = (db?.staff ?? []).filter((s) => s.branch === branch).map((s) => s.name);
    return items.filter((item) => {
      const val = String(item[vetField] || '');
      return branchVets.includes(val);
    });
  };

  // ── Filtered datasets ──
  const filteredInvoices = (db?.invoices ?? []).filter((inv) => {
    if (!inDateRange(inv.date, from, to)) return false;
    if (payStatus !== 'all' && inv.status !== payStatus) return false;
    if (doctor !== 'all') {
      const matches = inv.items.some((it) => it.practitionerName === doctor);
      if (!matches) return false;
    }
    if (service !== 'all') {
      const matches = inv.items.some((it) => it.category === service || it.description.includes(service));
      if (!matches) return false;
    }
    return true;
  });

  const filteredExpenses = (db?.expenses ?? []).filter((e) => inDateRange(e.date, from, to));
  const filteredAppts = (db?.appointments ?? []).filter((a) => {
    if (!inDateRange(a.date, from, to)) return false;
    if (doctor !== 'all' && a.vet !== doctor) return false;
    if (service !== 'all' && a.service !== service) return false;
    return true;
  });
  const filteredGrooming = (db?.grooming ?? []).filter((g) => {
    if (!inDateRange(g.date, from, to)) return false;
    if (doctor !== 'all' && g.groomer !== doctor) return false;
    return true;
  });
  const filteredBoarding = (db?.boarding ?? []).filter((b) => inDateRange(b.checkIn, from, to));
  const filteredPharmacy = (db?.pharmacySales ?? []).filter((p) => inDateRange(p.date, from, to));
  const filteredVaccines = (db?.vaccinations ?? []).filter((v) => inDateRange(v.dateGiven, from, to));

  // ── REVENUE ──
  const totalRevenue = filteredInvoices.reduce((s, inv) => s + invoiceTotal(inv), 0);
  const paidRevenue = filteredInvoices.filter((i) => i.status === 'Paid').reduce((s, inv) => s + invoiceTotal(inv), 0);
  const outstandingRevenue = filteredInvoices.filter((i) => i.status !== 'Paid').reduce((s, inv) => s + invoiceTotal(inv), 0);

  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach((inv) => {
      const mk = monthKey(inv.date);
      if (!mk) return;
      map[mk] = (map[mk] || 0) + invoiceTotal(inv);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [filteredInvoices]);

  const revenueByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((it) => {
        map[it.category] = (map[it.category] || 0) + it.qty * it.unitPrice;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredInvoices]);

  const revenueByPayment = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach((inv) => {
      const m = inv.method || 'Unknown';
      map[m] = (map[m] || 0) + invoiceTotal(inv);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredInvoices]);

  // ── EXPENSES ──
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.total, 0);
  const expensesByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const mk = monthKey(e.date);
      if (!mk) return;
      map[mk] = (map[mk] || 0) + e.total;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), expenses: Math.round(v) }));
  }, [filteredExpenses]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.total;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [filteredExpenses]);

  // ── PROFIT ──
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';
  const profitByMonth = useMemo(() => {
    const revMap: Record<string, number> = {};
    const expMap: Record<string, number> = {};
    filteredInvoices.forEach((inv) => { const mk = monthKey(inv.date); if (mk) revMap[mk] = (revMap[mk] || 0) + invoiceTotal(inv); });
    filteredExpenses.forEach((e) => { const mk = monthKey(e.date); if (mk) expMap[mk] = (expMap[mk] || 0) + e.total; });
    const allKeys = Array.from(new Set([...Object.keys(revMap), ...Object.keys(expMap)])).sort();
    return allKeys.map((k) => ({
      month: monthLabel(k),
      revenue: Math.round(revMap[k] || 0),
      expenses: Math.round(expMap[k] || 0),
      profit: Math.round((revMap[k] || 0) - (expMap[k] || 0)),
    }));
  }, [filteredInvoices, filteredExpenses]);

  // ── TAX ──
  const totalTaxCollected = filteredInvoices.reduce((s, inv) => s + (inv.taxTotal || 0), 0);
  const totalTaxPaid = filteredExpenses.reduce((s, e) => s + (e.tax || 0), 0);
  const netTax = totalTaxCollected - totalTaxPaid;
  const taxByMonth = useMemo(() => {
    const collMap: Record<string, number> = {};
    const paidMap: Record<string, number> = {};
    filteredInvoices.forEach((inv) => { const mk = monthKey(inv.date); if (mk) collMap[mk] = (collMap[mk] || 0) + (inv.taxTotal || 0); });
    filteredExpenses.forEach((e) => { const mk = monthKey(e.date); if (mk) paidMap[mk] = (paidMap[mk] || 0) + (e.tax || 0); });
    const allKeys = Array.from(new Set([...Object.keys(collMap), ...Object.keys(paidMap)])).sort();
    return allKeys.map((k) => ({
      month: monthLabel(k),
      collected: Math.round(collMap[k] || 0),
      paid: Math.round(paidMap[k] || 0),
    }));
  }, [filteredInvoices, filteredExpenses]);

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
    filteredAppts.forEach((a) => { const d = new Date(a.date).getDay(); map[d]++; });
    return days.map((name, i) => ({ day: name, count: map[i] }));
  }, [filteredAppts]);

  // ── DOCTOR PERFORMANCE ──
  const doctorPerf = useMemo(() => {
    const vetsWithData = vets.map((vetName) => {
      const appts = filteredAppts.filter((a) => a.vet === vetName);
      const completed = appts.filter((a) => a.status === 'Completed').length;
      const cancelled = appts.filter((a) => a.status === 'Cancelled').length;
      const noShow = appts.filter((a) => a.status === 'No-show').length;
      const docInvoices = filteredInvoices.filter((inv) => inv.items.some((it) => it.practitionerName === vetName));
      const revenue = docInvoices.reduce((s, inv) => s + inv.items.filter((it) => it.practitionerName === vetName).reduce((ss, it) => ss + it.qty * it.unitPrice, 0), 0);
      const completionRate = appts.length > 0 ? Math.round((completed / appts.length) * 100) : 0;
      return { name: vetName, total: appts.length, completed, cancelled, noShow, revenue: Math.round(revenue), completionRate };
    }).filter((v) => v.total > 0);
    return vetsWithData.sort((a, b) => b.revenue - a.revenue);
  }, [vets, filteredAppts, filteredInvoices]);

  // ── GROOMING ──
  const groomingRevenue = filteredGrooming.filter((g) => g.paymentStatus === 'Paid').reduce((s, g) => s + g.total, 0);
  const groomingByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrooming.forEach((g) => { const mk = monthKey(g.date); if (mk) map[mk] = (map[mk] || 0) + g.total; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [filteredGrooming]);

  // ── BOARDING ──
  const boardingRevenue = filteredBoarding.filter((b) => b.paymentStatus === 'Paid').reduce((s, b) => s + b.total, 0);
  const boardingByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBoarding.forEach((b) => { const mk = monthKey(b.checkIn); if (mk) map[mk] = (map[mk] || 0) + b.total; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({ month: monthLabel(k), revenue: Math.round(v) }));
  }, [filteredBoarding]);

  // ── PHARMACY ──
  const pharmacyRevenue = filteredPharmacy.filter((p) => p.status === 'Completed').reduce((s, p) => s + p.total, 0);
  const pharmacyByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPharmacy.forEach((p) => { const mk = monthKey(p.date); if (mk) map[mk] = (map[mk] || 0) + p.total; });
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

  // ── CUSTOMER GROWTH ──
  const growthByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    owners.forEach((o) => { const mk = monthKey(o.createdAt); if (mk && inDateRange(o.createdAt, from, to)) map[mk] = (map[mk] || 0) + 1; });
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return sorted.map(([k, v]) => { cumulative += v; return { month: monthLabel(k), new: v, total: cumulative }; });
  }, [owners, from, to]);

  // ── RETENTION ──
  const totalOwners = owners.length;
  const returningOwners = owners.filter((o) => {
    const ownerAppts = appointments.filter((a) => a.ownerId === o.id);
    return ownerAppts.length > 1;
  }).length;
  const retentionRate = totalOwners > 0 ? Math.round((returningOwners / totalOwners) * 100) : 0;
  const retentionByMonth = useMemo(() => {
    const months = profitByMonth.map((m) => m.month);
    return months.map((m) => {
      const [monthStr, yearStr] = m.split(' ');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = months.indexOf(monthStr);
      const year = 2000 + parseInt(yearStr);
      const monthStart = new Date(year, monthIdx, 1);
      const monthEnd = new Date(year, monthIdx + 1, 0);
      const active = owners.filter((o) => {
        const appts = appointments.filter((a) => a.ownerId === o.id && a.date >= monthStart.toISOString().slice(0, 10) && a.date <= monthEnd.toISOString().slice(0, 10));
        return appts.length > 0;
      }).length;
      const returning = owners.filter((o) => {
        const beforeAppts = appointments.filter((a) => a.ownerId === o.id && a.date < monthStart.toISOString().slice(0, 10));
        const monthAppts = appointments.filter((a) => a.ownerId === o.id && a.date >= monthStart.toISOString().slice(0, 10) && a.date <= monthEnd.toISOString().slice(0, 10));
        return beforeAppts.length > 0 && monthAppts.length > 0;
      }).length;
      return { month: m, active, returning, rate: active > 0 ? Math.round((returning / active) * 100) : 0 };
    });
  }, [owners, appointments, profitByMonth]);

  // ── CHURN ──
  const inactiveOwners = owners.filter((o) => {
    const appts = appointments.filter((a) => a.ownerId === o.id);
    if (appts.length === 0) return false;
    const lastAppt = appts.sort((a, b) => b.date.localeCompare(a.date))[0];
    const daysSince = Math.ceil((Date.now() - new Date(lastAppt.date).getTime()) / 86400000);
    return daysSince > 90;
  });
  const churnRate = totalOwners > 0 ? ((inactiveOwners.length / totalOwners) * 100).toFixed(1) : '0';

  const churnByMonth = useMemo(() => {
    const months = profitByMonth.map((m) => m.month);
    return months.map((m) => {
      const [monthStr, yearStr] = m.split(' ');
      const monthsArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIdx = monthsArr.indexOf(monthStr);
      const year = 2000 + parseInt(yearStr);
      const monthEnd = new Date(year, monthIdx + 1, 0);
      const totalBefore = owners.filter((o) => o.createdAt <= monthEnd.toISOString().slice(0, 10)).length;
      const lost = owners.filter((o) => {
        const appts = appointments.filter((a) => a.ownerId === o.id);
        if (appts.length === 0) return false;
        const lastAppt = appts.sort((a, b) => b.date.localeCompare(a.date))[0];
        const nextMonth = new Date(year, monthIdx + 2, 0);
        return lastAppt.date >= monthEnd.toISOString().slice(0, 10) && lastAppt.date <= nextMonth.toISOString().slice(0, 10) && (Math.ceil((nextMonth.getTime() - new Date(lastAppt.date).getTime()) / 86400000) > 90);
      }).length;
      return { month: m, lost, rate: totalBefore > 0 ? parseFloat(((lost / totalBefore) * 100).toFixed(1)) : 0 };
    });
  }, [owners, appointments, profitByMonth]);

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

  // ── HEATMAP: appointments by day×hour ──
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am-7pm
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid: number[][] = days.map(() => hours.map(() => 0));
    filteredAppts.forEach((a) => {
      const d = new Date(a.date);
      const dayIdx = (d.getDay() + 6) % 7; // Mon=0
      const hour = parseInt(a.time?.split(':')[0] || '9');
      const hourIdx = hours.indexOf(hour);
      if (hourIdx >= 0) grid[dayIdx][hourIdx]++;
    });
    const max = Math.max(...grid.flat(), 1);
    return { grid, hours, days, max };
  }, [filteredAppts]);

  // ── KPI Radial ──
  const kpiRadial = [
    { name: 'Revenue', value: Math.min((totalRevenue / 100000) * 100, 100), fill: '#2d7766' },
    { name: 'Retention', value: retentionRate, fill: '#f59e0b' },
    { name: 'Profit margin', value: parseFloat(profitMargin) || 0, fill: '#0ea5e9' },
    { name: 'Completion', value: filteredAppts.length > 0 ? Math.round((filteredAppts.filter((a) => a.status === 'Completed').length / filteredAppts.length) * 100) : 0, fill: '#f17f65' },
  ];

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

  // ── Filter bar ──
  const FilterBar = () => (
    <Card className="p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-sage" />
        <span className="text-sm font-semibold text-ink">Filters</span>
        <div className="flex-1" />
        <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> Export</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Date preset</label>
          <Select value={String(presetIdx)} onChange={(e) => { setPresetIdx(parseInt(e.target.value)); setFromDate(''); setToDate(''); }}>
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">From date</label>
          <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">To date</label>
          <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Branch</label>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
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
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-ink/50 font-semibold">Department</label>
          <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
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
  );

  const heatColor = (val: number, max: number) => {
    if (val === 0) return 'bg-mint/30';
    const ratio = val / max;
    if (ratio > 0.75) return 'bg-sage text-white';
    if (ratio > 0.5) return 'bg-sage/70 text-white';
    if (ratio > 0.25) return 'bg-mint text-sage';
    return 'bg-mint/50 text-ink/50';
  };

  if (!db) return <Shell title="Analytics & Reports"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  return (
    <Shell title="Analytics & Reports" subtitle="Reporting center with financial, operational, and growth insights">
      <FilterBar />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-line mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-sage text-sage' : 'border-transparent text-ink/50 hover:text-ink'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
            <StatCard icon={DollarSign} label="Revenue" value={`$${Math.round(totalRevenue).toLocaleString()}`} sub={`${filteredInvoices.length} invoices`} tone="sage" />
            <StatCard icon={Wallet} label="Expenses" value={`$${Math.round(totalExpenses).toLocaleString()}`} sub={`${filteredExpenses.length} entries`} tone="coral" />
            <StatCard icon={TrendingUp} label="Profit" value={`$${Math.round(totalProfit).toLocaleString()}`} sub={`${profitMargin}% margin`} tone={totalProfit >= 0 ? 'sage' : 'coral'} />
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
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f0f5f3' }} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="revenue" fill="#2d7766" radius={[6, 6, 0, 0]} maxBarSize={32} />
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
            <StatCard icon={DollarSign} label="Total revenue" value={`$${Math.round(totalRevenue).toLocaleString()}`} sub={`${filteredInvoices.length} invoices`} tone="sage" />
            <StatCard icon={ArrowUpRight} label="Paid" value={`$${Math.round(paidRevenue).toLocaleString()}`} sub="Collected" tone="sage" />
            <StatCard icon={AlertTriangle} label="Outstanding" value={`$${Math.round(outstandingRevenue).toLocaleString()}`} sub="Unpaid" tone="coral" />
            <StatCard icon={Percent} label="Avg per invoice" value={`$${filteredInvoices.length > 0 ? Math.round(totalRevenue / filteredInvoices.length).toLocaleString() : 0}`} sub="Per bill" tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Revenue trend (line)</h3>
              {revenueByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No revenue data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="revenue" stroke="#2d7766" strokeWidth={2.5} dot={{ fill: '#2d7766', r: 4 }} activeDot={{ r: 6 }} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
                    <Bar dataKey="revenue" fill="#2d7766" radius={[6, 6, 0, 0]} maxBarSize={48} />
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
            <StatCard icon={Wallet} label="Total expenses" value={`$${Math.round(totalExpenses).toLocaleString()}`} sub={`${filteredExpenses.length} entries`} tone="coral" />
            <StatCard icon={TrendingDown} label="Paid" value={`$${Math.round(filteredExpenses.filter((e) => e.status === 'Paid').reduce((s, e) => s + e.total, 0)).toLocaleString()}`} sub="Settled" tone="sage" />
            <StatCard icon={Clock} label="Pending" value={`$${Math.round(filteredExpenses.filter((e) => e.status === 'Pending').reduce((s, e) => s + e.total, 0)).toLocaleString()}`} sub="Awaiting payment" tone="amber" />
            <StatCard icon={Percent} label="Avg per entry" value={`$${filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString() : 0}`} sub="Per expense" tone="sky" />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
            <StatCard icon={DollarSign} label="Revenue" value={`$${Math.round(totalRevenue).toLocaleString()}`} tone="sage" />
            <StatCard icon={Wallet} label="Expenses" value={`$${Math.round(totalExpenses).toLocaleString()}`} tone="coral" />
            <StatCard icon={TrendingUp} label="Net profit" value={`$${Math.round(totalProfit).toLocaleString()}`} tone={totalProfit >= 0 ? 'sage' : 'coral'} />
            <StatCard icon={Percent} label="Profit margin" value={`${profitMargin}%`} tone="amber" />
          </div>
          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Revenue, Expenses & Profit (bar + line)</h3>
            {profitByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No profit data" /> : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={profitByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#2d7766" radius={[4, 4, 0, 0]} maxBarSize={28} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
            <StatCard icon={FileText} label="Tax collected" value={`$${Math.round(totalTaxCollected).toLocaleString()}`} sub="From invoices" tone="sage" />
            <StatCard icon={Wallet} label="Tax paid" value={`$${Math.round(totalTaxPaid).toLocaleString()}`} sub="On expenses" tone="coral" />
            <StatCard icon={Percent} label="Net tax" value={`$${Math.round(netTax).toLocaleString()}`} sub="Collected - paid" tone={netTax >= 0 ? 'sage' : 'coral'} />
            <StatCard icon={DollarSign} label="Taxable revenue" value={`$${Math.round(filteredInvoices.reduce((s, inv) => s + inv.subtotal, 0)).toLocaleString()}`} sub="Pre-tax total" tone="amber" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Tax collected vs paid (bar)</h3>
            {taxByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No tax data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taxByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="collected" fill="#2d7766" radius={[6, 6, 0, 0]} maxBarSize={36} />
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
            <StatCard icon={Calendar} label="Total" value={filteredAppts.length} tone="sage" />
            <StatCard icon={ArrowUpRight} label="Completed" value={filteredAppts.filter((a) => a.status === 'Completed').length} tone="sage" />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
                    <Bar dataKey="revenue" fill="#2d7766" radius={[0, 6, 6, 0]} maxBarSize={28} />
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
                          <td className="py-3 pr-4 text-right text-sage font-medium">{d.completed}</td>
                          <td className="py-3 pr-4 text-right text-coral">{d.cancelled}</td>
                          <td className="py-3 pr-4 text-right text-amber-600">{d.noShow}</td>
                          <td className="py-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-line overflow-hidden">
                                <div className="h-full rounded-full bg-sage" style={{ width: `${d.completionRate}%` }} />
                              </div>
                              <span className="text-xs font-medium text-ink/70">{d.completionRate}%</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-sage">${d.revenue.toLocaleString()}</td>
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
            <StatCard icon={Scissors} label="Grooming revenue" value={`$${Math.round(groomingRevenue).toLocaleString()}`} sub={`${filteredGrooming.filter((g) => g.paymentStatus === 'Paid').length} paid`} tone="sage" />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
            <StatCard icon={Hotel} label="Boarding revenue" value={`$${Math.round(boardingRevenue).toLocaleString()}`} sub={`${filteredBoarding.filter((b) => b.paymentStatus === 'Paid').length} paid`} tone="sage" />
            <StatCard icon={Calendar} label="Check-ins" value={filteredBoarding.length} sub="In range" tone="amber" />
            <StatCard icon={Activity} label="Currently in" value={filteredBoarding.filter((b) => b.status === 'Checked-in').length} sub="On-site" tone="coral" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Boarding revenue trend (bar)</h3>
            {boardingByMonth.length === 0 ? <EmptyState icon={BarChart3} title="No boarding data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={boardingByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
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
            <StatCard icon={Pill} label="Pharmacy revenue" value={`$${Math.round(pharmacyRevenue).toLocaleString()}`} sub={`${filteredPharmacy.filter((p) => p.status === 'Completed').length} sales`} tone="sage" />
            <StatCard icon={Calendar} label="Total sales" value={filteredPharmacy.length} sub="In range" tone="amber" />
            <StatCard icon={Percent} label="Avg sale" value={`$${filteredPharmacy.length > 0 ? Math.round(pharmacyRevenue / filteredPharmacy.length).toLocaleString() : 0}`} tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Pharmacy sales trend (line)</h3>
            {pharmacyByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No pharmacy data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pharmacyByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2.5} dot={{ fill: '#14b8a6', r: 4 }} />
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
            <StatCard icon={Syringe} label="Total" value={filteredVaccines.length} sub="In range" tone="sage" />
            <StatCard icon={ArrowUpRight} label="Completed" value={filteredVaccines.filter((v) => v.status === 'Completed').length} tone="sage" />
            <StatCard icon={AlertTriangle} label="Overdue" value={filteredVaccines.filter((v) => v.status === 'Overdue').length} tone="coral" />
            <StatCard icon={Clock} label="Pending" value={filteredVaccines.filter((v) => v.status === 'Pending').length} tone="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Vaccines by type (bar)</h3>
              {vaccineByType.length === 0 ? <EmptyState icon={BarChart3} title="No data" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vaccineByType} layout="vertical" margin={{ top: 8, right: 8, left: 100, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b8079' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
                    <Bar dataKey="value" fill="#2d7766" radius={[0, 6, 6, 0]} maxBarSize={24} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="#2d7766" strokeWidth={2.5} dot={{ fill: '#2d7766', r: 4 }} />
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
            <StatCard icon={Users} label="Total clients" value={totalOwners} tone="sage" />
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
                      <stop offset="0%" stopColor="#2d7766" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2d7766" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="total" stroke="#2d7766" strokeWidth={2.5} fill="url(#totalGrad)" dot={{ fill: '#2d7766', r: 4 }} />
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
            <StatCard icon={Activity} label="Retention rate" value={`${retentionRate}%`} sub={`${returningOwners}/${totalOwners}`} tone="sage" />
            <StatCard icon={Users} label="Returning" value={returningOwners} sub="2+ visits" tone="amber" />
            <StatCard icon={ArrowDownRight} label="One-time" value={totalOwners - returningOwners} sub="Single visit" tone="coral" />
            <StatCard icon={Percent} label="Avg visits" value={(appointments.length / Math.max(totalOwners, 1)).toFixed(1)} sub="Per client" tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Retention rate by month (line)</h3>
            {retentionByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No retention data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={retentionByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="rate" stroke="#2d7766" strokeWidth={2.5} dot={{ fill: '#2d7766', r: 4 }} name="Retention %" />
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
            <StatCard icon={Users} label="Active" value={totalOwners - inactiveOwners.length} sub="Engaged" tone="sage" />
            <StatCard icon={Activity} label="At risk" value={owners.filter((o) => {
              const appts = appointments.filter((a) => a.ownerId === o.id);
              if (appts.length === 0) return false;
              const last = appts.sort((a, b) => b.date.localeCompare(a.date))[0];
              const days = Math.ceil((Date.now() - new Date(last.date).getTime()) / 86400000);
              return days > 60 && days <= 90;
            }).length} sub="60-90 days" tone="amber" />
          </div>
          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Churn rate by month (line)</h3>
            {churnByMonth.length === 0 ? <EmptyState icon={LineIcon} title="No churn data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={churnByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
                <Activity className="w-6 h-6 text-sage mb-2" />
                <span className="text-sm text-ink/50">All clients are active!</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {inactiveOwners.slice(0, 20).map((o) => {
                  const lastAppt = appointments.filter((a) => a.ownerId === o.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                  const days = Math.ceil((Date.now() - new Date(lastAppt.date).getTime()) / 86400000);
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
            <StatCard icon={Target} label="Projected next month" value={`$${forecastData.length > 0 && forecastData.find((f) => f.forecast !== null)?.forecast ? (forecastData.find((f) => f.forecast !== null)?.forecast ?? 0).toLocaleString() : 0}`} sub="Forecast" tone="sage" />
            <StatCard icon={TrendingUp} label="Trend" value={forecastData.length >= 2 ? (forecastData[1].forecast && forecastData[0].actual ? ((forecastData[1].forecast - forecastData[0].actual) / forecastData[0].actual * 100).toFixed(1) : '0') + '%' : '0%'} sub="Growth direction" tone="amber" />
            <StatCard icon={BarChart3} label="6-month avg" value={`$${revenueByMonth.length > 0 ? Math.round(revenueByMonth.slice(-6).reduce((s, m) => s + m.revenue, 0) / Math.min(revenueByMonth.length, 6)).toLocaleString() : 0}`} sub="Recent average" tone="sky" />
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Revenue forecast — actual vs projected (line)</h3>
            {forecastData.length === 0 ? <EmptyState icon={Target} title="Insufficient data for forecast" hint="At least 2 months of revenue data is needed." /> : (
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={forecastData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="actual" stroke="#2d7766" strokeWidth={2.5} dot={{ fill: '#2d7766', r: 4 }} connectNulls={false} name="Actual revenue" />
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
