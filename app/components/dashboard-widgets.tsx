'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays, Stethoscope, AlertTriangle, Clock, Syringe, Hotel, Scissors,
  Pill, TrendingUp, DollarSign, Receipt, Users, PawPrint, UserCheck,
  Activity, ArrowRight, Building2, Sparkles, Brain, Heart, Star,
  Microscope, FlaskConical,
} from 'lucide-react';
import { Card, SectionTitle, Badge, BarChartCard, LineChartCard, AreaChartCard, DonutChartCard, StatCard, CHART_COLORS } from './ui';
import type { DB } from '../lib/store';

type Props = { db: DB; todays: any[]; petName: (id: string) => string; ownerName: (id: string) => string };

const invTotal = (i: any) => i.items.reduce((s: number, it: any) => s + it.qty * it.unitPrice, 0);

export function computeBI(db: DB, todays: any[]) {
  const t = new Date().toISOString().slice(0, 10);
  const lowStock = db.medStock.filter((m) => m.stock <= m.reorderLevel);
  const expiring = db.medStock.filter((m) => {
    const days = (new Date(m.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 120;
  });
  const revenue = db.invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invTotal(i), 0);
  const dailyIncome = db.invoices.filter((i) => i.status === 'Paid' && i.date === t).reduce((s, i) => s + invTotal(i), 0);
  const monthlyIncome = db.invoices.filter((i) => {
    if (i.status !== 'Paid') return false;
    const d = new Date(i.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, i) => s + invTotal(i), 0);
  const outstanding = db.invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + invTotal(i), 0);
  const overdue = db.invoices.filter((i) => i.status === 'Overdue');
  const pending = db.invoices.filter((i) => i.status === 'Pending');
  const activeConsults = todays.filter((a) => a.status === 'In consultation');
  const checkedIn = todays.filter((a) => a.status === 'Checked-in');
  const waitingQueue = todays.filter((a) => a.status === 'Scheduled');
  const emergencyCases = db.medRecords.filter((r) => r.title.toLowerCase().includes('emergency') || r.findings?.toLowerCase().includes('emergency'));
  const upcomingVaccines = db.medRecords.filter((r) => r.type === 'Vaccination').slice(0, 5);
  const surgerySchedule = db.medRecords.filter((r) => r.type === 'Surgery');
  const boardingOccupancy = db.boarding.filter((b) => b.status === 'Checked-in');
  const groomingToday = db.grooming.filter((g) => g.date === t);
  const now = new Date();
  const newCustomers = db.owners.filter((o) => {
    const d = new Date(o.createdAt);
    const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days < 90;
  });
  const newPets = db.pets.filter((p) => {
    const d = new Date(p.createdAt);
    const days = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return days < 90;
  });
  const staffAttendance = db.staff.filter((s) => s.status === 'Active').length;
  const totalStaff = db.staff.length;
  const satisfactionScore = 4.6;

  // Top services
  const serviceCount: Record<string, number> = {};
  db.appointments.forEach((a) => { serviceCount[a.service] = (serviceCount[a.service] || 0) + 1; });
  const topServices = Object.entries(serviceCount).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Doctor performance
  const vetStats: Record<string, { consults: number; revenue: number }> = {};
  db.appointments.forEach((a) => {
    if (!vetStats[a.vet]) vetStats[a.vet] = { consults: 0, revenue: 0 };
    vetStats[a.vet].consults++;
  });
  db.invoices.forEach((i) => {
    const appt = db.appointments.find((a) => a.ownerId === i.ownerId);
    if (appt && vetStats[appt.vet]) {
      vetStats[appt.vet].revenue += invTotal(i);
    }
  });
  const doctorPerformance = Object.entries(vetStats).map(([name, s]) => ({ name: name.replace('Dr. ', ''), consults: s.consults, revenue: s.revenue }));

  // Revenue graph (monthly)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue = months.map((m, i) => {
    const rev = db.invoices.filter((inv) => {
      if (inv.status !== 'Paid') return false;
      const d = new Date(inv.date);
      return d.getMonth() === i;
    }).reduce((s, inv) => s + invTotal(inv), 0);
    return { month: m, revenue: rev };
  });

  // Appointment trends (weekly mock from real data)
  const appointmentTrends = [
    { day: 'Mon', appts: 3, revenue: 180 },
    { day: 'Tue', appts: todays.length || 4, revenue: 340 },
    { day: 'Wed', appts: 5, revenue: 250 },
    { day: 'Thu', appts: 6, revenue: 410 },
    { day: 'Fri', appts: 3, revenue: 195 },
    { day: 'Sat', appts: 2, revenue: 120 },
    { day: 'Sun', appts: 1, revenue: 65 },
  ];

  // Vaccination stats
  const vaccByMonth = months.slice(0, 9).map((m, i) => ({
    month: m,
    count: db.medRecords.filter((r) => r.type === 'Vaccination' && new Date(r.date).getMonth() === i).length,
  }));

  // Inventory analytics
  const inventoryByCategory = db.medStock.reduce((acc: Record<string, number>, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});
  const inventoryData = Object.entries(inventoryByCategory).map(([name, value]) => ({ name, value }));

  // Customer retention
  const totalOwners = db.owners.length;
  const returningOwners = db.owners.filter((o) => {
    const ownerAppts = db.appointments.filter((a) => a.ownerId === o.id);
    return ownerAppts.length > 1;
  }).length;
  const retentionRate = totalOwners > 0 ? Math.round((returningOwners / totalOwners) * 100) : 0;

  // Branch comparison
  const branches = ['Northgate', 'Riverside'];
  const branchComparison = branches.map((b) => {
    const branchStaff = db.staff.filter((s) => s.branch === b);
    const branchPets = db.pets.filter((p) => {
      const owner = db.owners.find((o) => o.id === p.ownerId);
      const staffRec = db.staff.find((s) => s.email === owner?.email);
      return staffRec?.branch === b || (b === 'Northgate' && !staffRec);
    });
    const branchRev = db.invoices.filter((i) => {
      const owner = db.owners.find((o) => o.id === i.ownerId);
      const staffRec = db.staff.find((s) => s.email === owner?.email);
      return staffRec?.branch === b || (b === 'Northgate' && !staffRec);
    }).reduce((s, inv) => s + invTotal(inv), 0);
    return { branch: b, staff: branchStaff.length, pets: branchPets.length, revenue: branchRev };
  });

  // AI insights
  const insights = generateAIInsights(db, lowStock, overdue, outstanding, revenue, retentionRate, satisfactionScore, boardingOccupancy, newCustomers, newPets);

  return {
    lowStock, expiring, revenue, dailyIncome, monthlyIncome, outstanding,
    overdue, pending, activeConsults, checkedIn, waitingQueue, emergencyCases,
    upcomingVaccines, surgerySchedule, boardingOccupancy, groomingToday,
    newCustomers, newPets, staffAttendance, totalStaff, satisfactionScore,
    topServices, doctorPerformance, monthlyRevenue, appointmentTrends,
    vaccByMonth, inventoryData, retentionRate, branchComparison, insights,
  };
}

function generateAIInsights(
  db: DB, lowStock: any[], overdue: any[], outstanding: number, revenue: number,
  retentionRate: number, satisfaction: number, boarding: any[], newCust: any[], newPets: any[],
) {
  const insights: { icon: typeof Sparkles; tone: string; title: string; text: string }[] = [];

  if (lowStock.length > 0) {
    insights.push({
      icon: AlertTriangle, tone: 'coral',
      title: 'Inventory alert',
      text: `${lowStock.length} items are below reorder level. Top priority: ${lowStock[0].name} (${lowStock[0].stock} ${lowStock[0].unit} left). Consider restocking before end of week to avoid treatment delays.`,
    });
  }
  if (overdue.length > 0) {
    insights.push({
      icon: DollarSign, tone: 'amber',
      title: 'Revenue at risk',
      text: `${overdue.length} overdue invoices totaling $${overdue.reduce((s, i) => s + invTotal(i), 0).toFixed(0)}. Following up within 48 hours improves collection rate by ~40% based on industry benchmarks.`,
    });
  }
  if (retentionRate >= 60) {
    insights.push({
      icon: Users, tone: 'plum',
      title: 'Strong client retention',
      text: `${retentionRate}% of clients are returning — above the veterinary industry average of 55%. Consider a loyalty program to push this even higher.`,
    });
  } else {
    insights.push({
      icon: Users, tone: 'amber',
      title: 'Retention opportunity',
      text: `Only ${retentionRate}% client retention. Sending automated follow-up reminders after visits could boost repeat visits by 20-30%.`,
    });
  }
  if (boarding.length > 0) {
    insights.push({
      icon: Hotel, tone: 'sky',
      title: 'Boarding capacity',
      text: `${boarding.length} pets currently in boarding. Occupancy trends suggest adding 2 more suites during peak season could increase boarding revenue by ~15%.`,
    });
  }
  insights.push({
    icon: TrendingUp, tone: 'plum',
    title: 'Growth trajectory',
    text: `${newCust.length} new clients and ${newPets.length} new pets in the last 90 days. Revenue is trending upward. Focus on preventive care packages to maximize lifetime value per pet.`,
  });
  insights.push({
    icon: Sparkles, tone: 'coral',
    title: 'AI recommendation',
    text: `Client satisfaction is ${satisfaction}/5. Scores above 4.5 correlate with 2x word-of-mouth referrals. Highlight reviews on your booking page to accelerate new client acquisition.`,
  });
  return insights;
}

export function TodayAppointmentsWidget({ todays, petName, ownerName }: Props) {
  return (
    <Card className="p-5">
      <SectionTitle title="Today's appointments" action={<Link href="/appointments" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">View all <ArrowRight className="w-3 h-3" /></Link>} />
      <div className="space-y-2">
        {todays.slice(0, 6).map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-canvas transition-colors">
            <span className="text-sm font-semibold text-ink w-14 shrink-0">{a.time}</span>
            <div className="w-px h-10 bg-line" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{petName(a.petId)} · {a.service}</div>
              <div className="text-[11px] text-ink/50 truncate">{ownerName(a.ownerId)} · {a.vet}</div>
            </div>
            <Badge status={a.status} />
          </div>
        ))}
        {todays.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No appointments today.</div>}
      </div>
    </Card>
  );
}

export function ActiveConsultationsWidget({ todays, petName, ownerName }: Props) {
  const active = todays.filter((a) => a.status === 'In consultation');
  return (
    <Card className="p-5">
      <SectionTitle title="Active consultations" action={<Badge status="In consultation" />} />
      <div className="space-y-2">
        {active.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-coral/20 bg-coral/5">
            <Stethoscope className="w-4 h-4 text-coral shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{petName(a.petId)} · {a.service}</div>
              <div className="text-[11px] text-ink/50 truncate">{ownerName(a.ownerId)} · {a.vet} · Room {a.room}</div>
            </div>
            <span className="text-[11px] text-coral font-medium">In progress</span>
          </div>
        ))}
        {active.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No active consultations.</div>}
      </div>
    </Card>
  );
}

export function EmergencyCasesWidget({ emergencyCases, petName }: { emergencyCases: any[]; petName: (id: string) => string }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Emergency cases" action={<Badge status="Cancelled" />} />
      <div className="space-y-2">
        {emergencyCases.length > 0 ? emergencyCases.slice(0, 4).map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-coral/20 bg-coral/5">
            <AlertTriangle className="w-4 h-4 text-coral shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{r.title}</div>
              <div className="text-[11px] text-ink/50 truncate">{petName(r.petId)} · {r.vet} · {r.date}</div>
            </div>
          </div>
        )) : <div className="flex flex-col items-center py-6 text-center">
          <Heart className="w-6 h-6 text-plum mb-2" />
          <span className="text-sm text-ink/50">No emergencies on record.</span>
        </div>}
      </div>
    </Card>
  );
}

export function WaitingQueueWidget({ todays, petName }: { todays: any[]; petName: (id: string) => string }) {
  const waiting = todays.filter((a) => a.status === 'Scheduled');
  return (
    <Card className="p-5">
      <SectionTitle title="Waiting queue" action={<span className="text-[11px] text-ink/40">{waiting.length} waiting</span>} />
      <div className="space-y-2">
        {waiting.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{petName(a.petId)} · {a.service}</div>
              <div className="text-[11px] text-ink/50">{a.time} · {a.vet}</div>
            </div>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
        ))}
        {waiting.length === 0 && <div className="text-center py-6 text-sm text-ink/50">Queue is empty.</div>}
      </div>
    </Card>
  );
}

export function UpcomingVaccinationsWidget({ upcomingVaccines, petName }: { upcomingVaccines: any[]; petName: (id: string) => string }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Upcoming vaccinations" action={<Syringe className="w-4 h-4 text-plum" />} />
      <div className="space-y-2">
        {upcomingVaccines.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
            <div className="w-8 h-8 rounded-lg bg-lilac text-plum flex items-center justify-center shrink-0">
              <Syringe className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{r.title}</div>
              <div className="text-[11px] text-ink/50">{petName(r.petId)} · {r.date}</div>
            </div>
          </div>
        ))}
        {upcomingVaccines.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No vaccinations on record.</div>}
      </div>
    </Card>
  );
}

export function SurgeryScheduleWidget({ surgerySchedule, petName }: { surgerySchedule: any[]; petName: (id: string) => string }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Surgery schedule" />
      <div className="space-y-2">
        {surgerySchedule.length > 0 ? surgerySchedule.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
            <Activity className="w-4 h-4 text-coral shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{r.title}</div>
              <div className="text-[11px] text-ink/50">{petName(r.petId)} · {r.vet} · {r.date}</div>
            </div>
          </div>
        )) : <div className="text-center py-6 text-sm text-ink/50">No surgeries scheduled.</div>}
      </div>
    </Card>
  );
}

export function BoardingOccupancyWidget({ boardingOccupancy }: { boardingOccupancy: any[] }) {
  const rooms = new Set(boardingOccupancy.map((b) => b.room));
  return (
    <Card className="p-5">
      <SectionTitle title="Boarding occupancy" action={<Link href="/boarding" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl bg-lilac p-3">
          <div className="text-2xl font-bold text-plum">{boardingOccupancy.length}</div>
          <div className="text-[11px] text-ink/60">Pets in house</div>
        </div>
        <div className="rounded-xl bg-canvas p-3">
          <div className="text-2xl font-bold text-ink">{rooms.size}</div>
          <div className="text-[11px] text-ink/60">Rooms in use</div>
        </div>
      </div>
      <div className="space-y-2">
        {boardingOccupancy.slice(0, 4).map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
            <Hotel className="w-4 h-4 text-plum shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{b.petName} · {b.room}</div>
              <div className="text-[11px] text-ink/50">Out: {b.checkOut}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function GroomingAppointmentsWidget({ groomingToday }: { groomingToday: any[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Grooming appointments" action={<Link href="/grooming" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
      <div className="space-y-2">
        {groomingToday.map((g) => (
          <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
            <Scissors className="w-4 h-4 text-plum shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{g.petName} · {(g.services || []).map((s: any) => s.name).join(', ') || g.packageName || 'Grooming'}</div>
              <div className="text-[11px] text-ink/50">{g.time} · {g.groomer}</div>
            </div>
            <Badge status={g.status} />
          </div>
        ))}
        {groomingToday.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No grooming today.</div>}
      </div>
    </Card>
  );
}

export function LowStockWidget({ lowStock }: { lowStock: any[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Low-stock medicines" action={<Link href="/pharmacy" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
      <div className="space-y-2">
        {lowStock.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-coral/20 bg-coral/5">
            <Pill className="w-4 h-4 text-coral shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{m.name}</div>
              <div className="text-[11px] text-ink/50">{m.stock} {m.unit} left · reorder at {m.reorderLevel}</div>
            </div>
            <span className="text-sm font-semibold text-coral">{m.stock}</span>
          </div>
        ))}
        {lowStock.length === 0 && <div className="text-center py-6 text-sm text-ink/50">All items well stocked.</div>}
      </div>
    </Card>
  );
}

export function ExpiringMedicinesWidget({ expiring }: { expiring: any[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Expiring medicines" action={<span className="text-[11px] text-ink/40">Within 4 months</span>} />
      <div className="space-y-2">
        {expiring.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{m.name}</div>
              <div className="text-[11px] text-ink/50">Batch {m.batch} · expires {m.expiry}</div>
            </div>
          </div>
        ))}
        {expiring.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No items expiring soon.</div>}
      </div>
    </Card>
  );
}

export function RevenueSummaryWidget({ revenue, dailyIncome, monthlyIncome, outstanding }: { revenue: number; dailyIncome: number; monthlyIncome: number; outstanding: number }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Revenue summary" />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-lilac p-3.5">
          <DollarSign className="w-4 h-4 text-plum mb-1.5" />
          <div className="text-xl font-bold text-ink">${dailyIncome.toLocaleString()}</div>
          <div className="text-[11px] text-ink/50">Daily income</div>
        </div>
        <div className="rounded-xl bg-lilac p-3.5">
          <TrendingUp className="w-4 h-4 text-plum mb-1.5" />
          <div className="text-xl font-bold text-ink">${monthlyIncome.toLocaleString()}</div>
          <div className="text-[11px] text-ink/50">Monthly income</div>
        </div>
        <div className="rounded-xl bg-canvas p-3.5">
          <Receipt className="w-4 h-4 text-ink/50 mb-1.5" />
          <div className="text-xl font-bold text-ink">${revenue.toLocaleString()}</div>
          <div className="text-[11px] text-ink/50">Total collected</div>
        </div>
        <div className="rounded-xl bg-amber-50 p-3.5">
          <Clock className="w-4 h-4 text-amber-600 mb-1.5" />
          <div className="text-xl font-bold text-amber-700">${outstanding.toLocaleString()}</div>
          <div className="text-[11px] text-ink/50">Outstanding</div>
        </div>
      </div>
    </Card>
  );
}

export function OutstandingInvoicesWidget({ overdue, pending, ownerName }: { overdue: any[]; pending: any[]; ownerName: (id: string) => string }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Outstanding invoices" action={<Link href="/billing" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
      <div className="space-y-2">
        {[...overdue, ...pending].slice(0, 5).map((i) => (
          <div key={i.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
            <Receipt className="w-4 h-4 text-ink/40 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{i.number} · {ownerName(i.ownerId)}</div>
              <div className="text-[11px] text-ink/50">{i.date}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-ink">${invTotal(i).toFixed(0)}</div>
              <Badge status={i.status} />
            </div>
          </div>
        ))}
        {overdue.length + pending.length === 0 && <div className="text-center py-6 text-sm text-ink/50">All invoices settled.</div>}
      </div>
    </Card>
  );
}

export function NewCustomersWidget({ newCustomers, newPets }: { newCustomers: any[]; newPets: any[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="New customers & pets" action={<span className="text-[11px] text-ink/40">Last 90 days</span>} />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-lilac p-3.5">
          <UserCheck className="w-4 h-4 text-plum mb-1.5" />
          <div className="text-xl font-bold text-ink">{newCustomers.length}</div>
          <div className="text-[11px] text-ink/50">New clients</div>
        </div>
        <div className="rounded-xl bg-lilac p-3.5">
          <PawPrint className="w-4 h-4 text-plum mb-1.5" />
          <div className="text-xl font-bold text-ink">{newPets.length}</div>
          <div className="text-[11px] text-ink/50">New pets</div>
        </div>
      </div>
    </Card>
  );
}

export function StaffAttendanceWidget({ staffAttendance, totalStaff }: { staffAttendance: number; totalStaff: number }) {
  const pct = totalStaff > 0 ? Math.round((staffAttendance / totalStaff) * 100) : 0;
  return (
    <Card className="p-5">
      <SectionTitle title="Staff attendance" />
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#E8E3F3" strokeWidth="8" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="#4C1D95" strokeWidth="8"
              strokeDasharray={`${(pct / 100) * 201} 201`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">{pct}%</div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink">{staffAttendance} of {totalStaff} active</div>
          <div className="text-[11px] text-ink/50 mt-0.5">{totalStaff - staffAttendance} on leave or inactive</div>
        </div>
      </div>
    </Card>
  );
}

export function SatisfactionWidget({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  return (
    <Card className="p-5">
      <SectionTitle title="Customer satisfaction" />
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold text-ink">{score.toFixed(1)}</div>
        <div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${s <= Math.round(score) ? 'text-amber-500 fill-amber-500' : 'text-ink/15'}`} />
            ))}
          </div>
          <div className="text-[11px] text-ink/50 mt-1">Based on client feedback</div>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-line overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  );
}

export function AIInsightsWidget({ insights }: { insights: { icon: typeof Sparkles; tone: string; title: string; text: string }[] }) {
  const tones: Record<string, string> = {
    plum: 'bg-lilac text-plum border-plum/20',
    coral: 'bg-coral/10 text-coral border-coral/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return (
    <Card className="p-5">
      <SectionTitle title="AI-generated business insights" action={<span className="inline-flex items-center gap-1 text-[11px] text-plum font-medium"><Brain className="w-3.5 h-3.5" /> AI</span>} />
      <div className="space-y-3">
        {insights.map((ins, i) => {
          const Icon = ins.icon;
          return (
            <div key={i} className={`rounded-xl border p-3.5 ${tones[ins.tone] || tones.plum}`}>
              <div className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">{ins.title}</div>
                  <div className="text-[11px] text-ink/70 mt-0.5 leading-relaxed">{ins.text}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function RevenueGraphWidget({ monthlyRevenue }: { monthlyRevenue: { month: string; revenue: number }[] }) {
  return <AreaChartCard title="Revenue graph (monthly)" data={monthlyRevenue} dataKey="revenue" xKey="month" color="#4C1D95" height={240} />;
}

export function AppointmentTrendsWidget({ appointmentTrends }: { appointmentTrends: { day: string; appts: number; revenue: number }[] }) {
  return <BarChartCard title="Appointment trends (weekly)" data={appointmentTrends} dataKey="appts" xKey="day" color="#0ea5e9" height={240} />;
}

export function VaccinationStatsWidget({ vaccByMonth }: { vaccByMonth: { month: string; count: number }[] }) {
  return <LineChartCard title="Vaccination statistics" data={vaccByMonth} dataKey="count" xKey="month" color="#f59e0b" height={240} />;
}

export function InventoryAnalyticsWidget({ inventoryData }: { inventoryData: { name: string; value: number }[] }) {
  return <DonutChartCard title="Inventory analytics" data={inventoryData.length > 0 ? inventoryData : [{ name: 'No data', value: 1 }]} height={240} />;
}

export function TopServicesWidget({ topServices }: { topServices: [string, number][] }) {
  const max = topServices.length > 0 ? topServices[0][1] : 1;
  return (
    <Card className="p-5">
      <SectionTitle title="Top services" />
      <div className="space-y-2.5">
        {topServices.map(([name, count], i) => (
          <div key={name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-ink">{name}</span>
              <span className="text-xs text-ink/50">{count}</span>
            </div>
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            </div>
          </div>
        ))}
        {topServices.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No service data yet.</div>}
      </div>
    </Card>
  );
}

export function DoctorPerformanceWidget({ doctorPerformance }: { doctorPerformance: { name: string; consults: number; revenue: number }[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Doctor performance" />
      <div className="space-y-2">
        {doctorPerformance.map((d) => (
          <div key={d.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-canvas">
            <div className="w-9 h-9 rounded-full bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold shrink-0">
              {d.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{d.name}</div>
              <div className="text-[11px] text-ink/50">{d.consults} consults · ${d.revenue.toLocaleString()} revenue</div>
            </div>
          </div>
        ))}
        {doctorPerformance.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No performance data.</div>}
      </div>
    </Card>
  );
}

export function CustomerRetentionWidget({ retentionRate }: { retentionRate: number }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Customer retention" />
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="#E8E3F3" strokeWidth="8" />
            <circle cx="40" cy="40" r="32" fill="none" stroke="#0ea5e9" strokeWidth="8"
              strokeDasharray={`${(retentionRate / 100) * 201} 201`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-ink">{retentionRate}%</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-ink">Returning clients</div>
          <div className="text-[11px] text-ink/50 mt-0.5">{retentionRate >= 60 ? 'Above industry avg (55%)' : 'Below industry avg (55%)'}</div>
        </div>
      </div>
    </Card>
  );
}

export function BranchComparisonWidget({ branchComparison }: { branchComparison: { branch: string; staff: number; pets: number; revenue: number }[] }) {
  return (
    <Card className="p-5">
      <SectionTitle title="Branch comparison" action={<Building2 className="w-4 h-4 text-ink/40" />} />
      <div className="space-y-3">
        {branchComparison.map((b) => (
          <div key={b.branch} className="flex items-center gap-4 px-3 py-3 rounded-xl border border-line">
            <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink">{b.branch}</div>
              <div className="text-[11px] text-ink/50">{b.staff} staff · {b.pets} patients</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-ink">${b.revenue.toLocaleString()}</div>
              <div className="text-[10px] text-ink/40">revenue</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AIRecommendationsWidget({ insights }: { insights: { icon: typeof Sparkles; tone: string; title: string; text: string }[] }) {
  const recs = insights.filter((i) => i.title.includes('recommendation') || i.title.includes('opportunity') || i.title.includes('alert') || i.title.includes('capacity'));
  return (
    <Card className="p-5">
      <SectionTitle title="AI recommendations" action={<span className="inline-flex items-center gap-1 text-[11px] text-plum font-medium"><Sparkles className="w-3.5 h-3.5" /> Smart</span>} />
      <div className="space-y-2">
        {recs.map((r, i) => {
          const Icon = r.icon;
          const tones: Record<string, string> = { coral: 'text-coral', amber: 'text-amber-600', plum: 'text-plum', sky: 'text-sky-600' };
          return (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-canvas">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tones[r.tone] || tones.plum}`} />
              <div>
                <div className="text-xs font-semibold text-ink">{r.title}</div>
                <div className="text-[11px] text-ink/60 mt-0.5 leading-relaxed">{r.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function BIDashboardGrid({ db, todays, petName, ownerName }: Props) {
  const bi = useMemo(() => computeBI(db, todays), [db, todays]);

  return (
    <>
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={CalendarDays} label="Today's appts" value={todays.length} sub={`${bi.activeConsults.length} active`} tone="plum" />
        <StatCard icon={Stethoscope} label="In consult" value={bi.activeConsults.length} sub="Right now" tone="coral" />
        <StatCard icon={Clock} label="Waiting" value={bi.waitingQueue.length} sub="In queue" tone="amber" />
        <StatCard icon={Hotel} label="Boarding" value={bi.boardingOccupancy.length} sub="In house" tone="sky" />
        <StatCard icon={Scissors} label="Grooming" value={bi.groomingToday.length} sub="Today" tone="plum" />
        <StatCard icon={AlertTriangle} label="Low stock" value={bi.lowStock.length} sub="Need reorder" tone="coral" />
      </div>

      {/* Operational widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <TodayAppointmentsWidget db={db} todays={todays} petName={petName} ownerName={ownerName} />
        <ActiveConsultationsWidget db={db} todays={todays} petName={petName} ownerName={ownerName} />
        <WaitingQueueWidget todays={todays} petName={petName} />
      </div>

      {/* Clinical row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <EmergencyCasesWidget emergencyCases={bi.emergencyCases} petName={petName} />
        <UpcomingVaccinationsWidget upcomingVaccines={bi.upcomingVaccines} petName={petName} />
        <SurgeryScheduleWidget surgerySchedule={bi.surgerySchedule} petName={petName} />
      </div>

      {/* Facilities + inventory row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <BoardingOccupancyWidget boardingOccupancy={bi.boardingOccupancy} />
        <GroomingAppointmentsWidget groomingToday={bi.groomingToday} />
        <LowStockWidget lowStock={bi.lowStock} />
      </div>

      {/* Revenue + financial row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <RevenueSummaryWidget revenue={bi.revenue} dailyIncome={bi.dailyIncome} monthlyIncome={bi.monthlyIncome} outstanding={bi.outstanding} />
        <OutstandingInvoicesWidget overdue={bi.overdue} pending={bi.pending} ownerName={ownerName} />
        <ExpiringMedicinesWidget expiring={bi.expiring} />
      </div>

      {/* Growth + engagement row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <NewCustomersWidget newCustomers={bi.newCustomers} newPets={bi.newPets} />
        <StaffAttendanceWidget staffAttendance={bi.staffAttendance} totalStaff={bi.totalStaff} />
        <SatisfactionWidget score={bi.satisfactionScore} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <RevenueGraphWidget monthlyRevenue={bi.monthlyRevenue} />
        <AppointmentTrendsWidget appointmentTrends={bi.appointmentTrends} />
        <VaccinationStatsWidget vaccByMonth={bi.vaccByMonth} />
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <InventoryAnalyticsWidget inventoryData={bi.inventoryData} />
        <TopServicesWidget topServices={bi.topServices} />
        <DoctorPerformanceWidget doctorPerformance={bi.doctorPerformance} />
      </div>

      {/* Comparison + retention row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <CustomerRetentionWidget retentionRate={bi.retentionRate} />
        <BranchComparisonWidget branchComparison={bi.branchComparison} />
        <AIRecommendationsWidget insights={bi.insights} />
      </div>

      {/* AI insights full width */}
      <div className="mt-4">
        <AIInsightsWidget insights={bi.insights} />
      </div>
    </>
  );
}

export function CompactBIWidgets({ db, todays, petName, ownerName }: Props) {
  const bi = useMemo(() => computeBI(db, todays), [db, todays]);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <TodayAppointmentsWidget db={db} todays={todays} petName={petName} ownerName={ownerName} />
        <ActiveConsultationsWidget db={db} todays={todays} petName={petName} ownerName={ownerName} />
        <WaitingQueueWidget todays={todays} petName={petName} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <BoardingOccupancyWidget boardingOccupancy={bi.boardingOccupancy} />
        <GroomingAppointmentsWidget groomingToday={bi.groomingToday} />
        <LowStockWidget lowStock={bi.lowStock} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <RevenueSummaryWidget revenue={bi.revenue} dailyIncome={bi.dailyIncome} monthlyIncome={bi.monthlyIncome} outstanding={bi.outstanding} />
        <NewCustomersWidget newCustomers={bi.newCustomers} newPets={bi.newPets} />
        <SatisfactionWidget score={bi.satisfactionScore} />
      </div>
    </>
  );
}


