'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarDays, PawPrint, Receipt, Pill, Stethoscope, AlertTriangle, TrendingUp,
  Clock, Plus, ArrowRight, Users, Hotel, Scissors, FlaskConical, Package,
  DollarSign, FileText, Shield, Activity, Dog, Cat, Syringe, Microscope,
  Building2, UserCheck, ClipboardList, Heart, Bell, Utensils,
} from 'lucide-react';
import Shell from './components/Shell';
import { Card, StatCard, SectionTitle, Badge, BarChartCard, DonutChartCard, AreaChartCard } from './components/ui';
import {
  BIDashboardGrid, CompactBIWidgets, computeBI,
  TodayAppointmentsWidget, ActiveConsultationsWidget, WaitingQueueWidget,
  EmergencyCasesWidget, UpcomingVaccinationsWidget, SurgeryScheduleWidget,
  BoardingOccupancyWidget, GroomingAppointmentsWidget, LowStockWidget,
  ExpiringMedicinesWidget, RevenueSummaryWidget, OutstandingInvoicesWidget,
  NewCustomersWidget, StaffAttendanceWidget, SatisfactionWidget,
  AIInsightsWidget, RevenueGraphWidget, AppointmentTrendsWidget,
  VaccinationStatsWidget, InventoryAnalyticsWidget, TopServicesWidget,
  DoctorPerformanceWidget, CustomerRetentionWidget, BranchComparisonWidget,
  AIRecommendationsWidget,
} from './components/dashboard-widgets';
import { useDB, today } from './lib/store';
import { useAuth } from './lib/auth';
import type { Role } from './lib/auth';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { db } = useDB();
  const t = today();

  const stats = useMemo(() => {
    if (!db) return null;
    const todays = db.appointments.filter((a) => a.date === t);
    const revenue = db.invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.items.reduce((a, it) => a + it.qty * it.unitPrice, 0), 0);
    const pendingRev = db.invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + i.items.reduce((a, it) => a + it.qty * it.unitPrice, 0), 0);
    const lowStock = db.medStock.filter((m) => m.stock <= m.reorderLevel);
    const pending = db.invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue');
    const overdue = db.invoices.filter((i) => i.status === 'Overdue');
    const expiring = db.medStock.filter((m) => {
      const days = (new Date(m.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days < 120;
    });
    return {
      todays, revenue, pendingRev, lowStock, pending, overdue, expiring,
      appointments: todays.length,
      activeConsults: todays.filter((a) => a.status === 'In consultation' || a.status === 'Checked-in').length,
      pets: db.pets.length,
      owners: db.owners.length,
      pendingInvoices: pending.length,
      overdueInvoices: overdue.length,
      boarding: db.boarding.filter((b) => b.status === 'Checked-in').length,
      grooming: db.grooming.filter((g) => g.date === t).length,
      staff: db.staff.length,
      activeStaff: db.staff.filter((s) => s.status === 'Active').length,
      medRecords: db.medRecords.length,
      vaccinesDue: db.medRecords.filter((r) => r.type === 'Vaccination').length,
      labsPending: db.medRecords.filter((r) => r.type === 'Lab').length,
    };
  }, [db, t]);

  if (loading || !db || !stats) {
    return (
      <Shell title="Dashboard">
        <div className="text-sm text-ink/50">Loading clinic data…</div>
      </Shell>
    );
  }

  if (!user) return null;

  const petName = (id: string) => db.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const ownerName = (id: string) => db.owners.find((o) => o.id === id)?.name ?? 'Unknown';
  const todays = stats.todays.sort((a, b) => a.time.localeCompare(b.time));

  const roleConfig: Record<Role, { title: string; subtitle: string; content: React.ReactNode }> = {
    'Super Admin': {
      title: 'System Overview',
      subtitle: 'All branches · Full platform control',
      content: <SuperAdminDashboard stats={stats} db={db} petName={petName} ownerName={ownerName} todays={todays} />,
    },
    'Clinic Owner': {
      title: 'Clinic Performance',
      subtitle: 'Revenue, operations, and team at a glance',
      content: <ClinicOwnerDashboard stats={stats} db={db} petName={petName} ownerName={ownerName} todays={todays} />,
    },
    'Branch Manager': {
      title: 'Branch Operations',
      subtitle: 'Daily activity and team management',
      content: <BranchManagerDashboard stats={stats} db={db} petName={petName} ownerName={ownerName} todays={todays} />,
    },
    'Veterinarian': {
      title: 'My Clinical Day',
      subtitle: 'Consultations, patients, and medical tasks',
      content: <VetDashboard stats={stats} db={db} petName={petName} ownerName={ownerName} todays={todays} user={user} />,
    },
    'Receptionist': {
      title: 'Front Desk',
      subtitle: 'Appointments, check-ins, and client flow',
      content: <ReceptionistDashboard stats={stats} db={db} petName={petName} ownerName={ownerName} todays={todays} />,
    },
    'Veterinary Nurse': {
      title: 'Nursing Station',
      subtitle: 'Patient care, treatments, and monitoring',
      content: <NurseDashboard stats={stats} db={db} petName={petName} ownerName={ownerName} todays={todays} />,
    },
    'Laboratory Technician': {
      title: 'Laboratory',
      subtitle: 'Test requests, results, and diagnostics',
      content: <LabDashboard stats={stats} db={db} petName={petName} />,
    },
    'Pharmacist': {
      title: 'Pharmacy',
      subtitle: 'Dispensing, stock, and prescriptions',
      content: <PharmacistDashboard stats={stats} db={db} />,
    },
    'Groomer': {
      title: 'Grooming Studio',
      subtitle: "Today's grooming schedule and client notes",
      content: <GroomerDashboard stats={stats} db={db} />,
    },
    'Boarding Staff': {
      title: 'Boarding & Lodging',
      subtitle: 'Pets in care, feeding, and check-out schedule',
      content: <BoardingDashboard stats={stats} db={db} />,
    },
    'Accountant': {
      title: 'Financial Dashboard',
      subtitle: 'Revenue, outstanding balances, and expenses',
      content: <AccountantDashboard stats={stats} db={db} ownerName={ownerName} />,
    },
    'Inventory Manager': {
      title: 'Inventory Control',
      subtitle: 'Stock levels, reorders, and expiry tracking',
      content: <InventoryDashboard stats={stats} db={db} />,
    },
    'Pet Owner': {
      title: 'My Pets',
      subtitle: 'Health records, appointments, and invoices',
      content: <PetOwnerDashboard stats={stats} db={db} user={user} />,
    },
  };

  const config = roleConfig[user.role];

  return (
    <Shell title={config.title} subtitle={config.subtitle}>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">{greeting()}, {user.name.split(' ')[0]}</h2>
        <p className="text-sm text-ink/50">{formatDate()} · {user.branch}</p>
      </div>
      {config.content}
    </Shell>
  );
}

type DashProps = {
  stats: any;
  db: any;
  petName?: (id: string) => string;
  ownerName?: (id: string) => string;
  todays?: any[];
};

type DashPropsFull = DashProps & { user?: any };

// --- Super Admin ---
function SuperAdminDashboard({ stats, db, petName = () => 'Unknown', ownerName = () => 'Unknown', todays = [] }: DashProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={Building2} label="Branches" value={2} sub="Northgate · Riverside" tone="plum" />
        <StatCard icon={Users} label="Staff" value={stats.staff} sub={`${stats.activeStaff} active`} tone="sky" />
        <StatCard icon={PawPrint} label="Patients" value={stats.pets} sub={`${stats.owners} owners`} tone="amber" />
        <StatCard icon={TrendingUp} label="Revenue (paid)" value={`${stats.revenue.toLocaleString()}`} sub={`${stats.pendingRev.toLocaleString()} pending`} tone="coral" />
        <StatCard icon={AlertTriangle} label="Low stock" value={stats.lowStock.length} sub="Items" tone="coral" />
        <StatCard icon={Hotel} label="Boarding" value={stats.boarding} sub="In house" tone="plum" />
      </div>
      <BIDashboardGrid db={db} todays={todays} petName={petName} ownerName={ownerName} />
    </>
  );
}

// --- Clinic Owner ---
function ClinicOwnerDashboard({ stats, db, petName = () => 'Unknown', ownerName = () => 'Unknown', todays = [] }: DashProps) {
  const bi = computeBI(db, todays);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={TrendingUp} label="Revenue (paid)" value={`${stats.revenue.toLocaleString()}`} sub={`${stats.pendingInvoices} pending`} tone="plum" />
        <StatCard icon={PawPrint} label="Patients" value={stats.pets} sub={`${stats.owners} owners`} tone="sky" />
        <StatCard icon={CalendarDays} label="Today's appts" value={stats.appointments} sub={`${stats.activeConsults} active`} tone="amber" />
        <StatCard icon={Users} label="Team" value={stats.staff} sub={`${stats.activeStaff} active`} tone="coral" />
        <StatCard icon={DollarSign} label="Monthly income" value={`${bi.monthlyIncome.toLocaleString()}`} sub="This month" tone="plum" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueInvoices} sub="Invoices" tone="coral" />
      </div>
      <CompactBIWidgets db={db} todays={todays} petName={petName} ownerName={ownerName} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <RevenueGraphWidget monthlyRevenue={bi.monthlyRevenue} />
        <AppointmentTrendsWidget appointmentTrends={bi.appointmentTrends} />
        <TopServicesWidget topServices={bi.topServices} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <DoctorPerformanceWidget doctorPerformance={bi.doctorPerformance} />
        <CustomerRetentionWidget retentionRate={bi.retentionRate} />
        <BranchComparisonWidget branchComparison={bi.branchComparison} />
      </div>
      <div className="mt-4">
        <AIInsightsWidget insights={bi.insights} />
      </div>
    </>
  );
}

// --- Branch Manager ---
function BranchManagerDashboard({ stats, db, petName = () => 'Unknown', ownerName = () => 'Unknown', todays = [] }: DashProps) {
  const bi = computeBI(db, todays);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={CalendarDays} label="Today's appts" value={stats.appointments} sub={`${stats.activeConsults} active`} tone="plum" />
        <StatCard icon={Users} label="Branch staff" value={stats.staff} sub={`${stats.activeStaff} active`} tone="sky" />
        <StatCard icon={PawPrint} label="Patients" value={stats.pets} sub={`${stats.boarding} boarding`} tone="amber" />
        <StatCard icon={AlertTriangle} label="Alerts" value={stats.lowStock.length + stats.overdueInvoices} sub="Stock + billing" tone="coral" />
        <StatCard icon={DollarSign} label="Daily income" value={`${bi.dailyIncome.toLocaleString()}`} sub="Today" tone="plum" />
        <StatCard icon={Scissors} label="Grooming" value={bi.groomingToday.length} sub="Today" tone="sky" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <TodayAppointmentsWidget db={db} todays={todays} petName={petName} ownerName={ownerName} />
        <WaitingQueueWidget todays={todays} petName={petName} />
        <StaffAttendanceWidget staffAttendance={bi.staffAttendance} totalStaff={bi.totalStaff} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <BoardingOccupancyWidget boardingOccupancy={bi.boardingOccupancy} />
        <GroomingAppointmentsWidget groomingToday={bi.groomingToday} />
        <LowStockWidget lowStock={bi.lowStock} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <AppointmentTrendsWidget appointmentTrends={bi.appointmentTrends} />
        <TopServicesWidget topServices={bi.topServices} />
        <SatisfactionWidget score={bi.satisfactionScore} />
      </div>
      <div className="mt-4">
        <AIRecommendationsWidget insights={bi.insights} />
      </div>
    </>
  );
}

// --- Veterinarian ---
function VetDashboard({ stats, db, petName = () => 'Unknown', ownerName = () => 'Unknown', todays = [], user }: DashPropsFull) {
  const myAppts = todays.filter((a) => a.vet === user?.name);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="My appts today" value={myAppts.length} sub={`${myAppts.filter((a) => a.status === 'In consultation').length} in consult`} tone="plum" />
        <StatCard icon={Stethoscope} label="My patients" value={stats.pets} sub={`${stats.owners} owners`} tone="sky" />
        <StatCard icon={Syringe} label="Vaccines given" value={stats.vaccinesDue} sub="On record" tone="amber" />
        <StatCard icon={FlaskConical} label="Lab results" value={stats.labsPending} sub="Recent" tone="coral" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <Card className="lg:col-span-2 p-5">
          <SectionTitle title="My schedule today" action={<Link href="/appointments" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">All appts <ArrowRight className="w-3 h-3" /></Link>} />
          <div className="space-y-2">
            {myAppts.length === 0 ? (
              <div className="text-center py-8 text-sm text-ink/50">No appointments assigned to you today.</div>
            ) : (
              myAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:border-plum/30 transition-colors">
                  <div className="flex flex-col items-center w-14 shrink-0">
                    <span className="text-sm font-semibold text-ink">{a.time}</span>
                    <span className="text-[10px] text-ink/40">{a.durationMin}min</span>
                  </div>
                  <div className="w-px h-10 bg-line" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{petName(a.petId)} · {a.service}</div>
                    <div className="text-[11px] text-ink/50 truncate">{ownerName(a.ownerId)} · {a.reason}</div>
                  </div>
                  <Badge status={a.status} />
                </div>
              ))
            )}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Quick actions" />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/medical" icon={Stethoscope} label="New record" />
              <QuickAction href="/medical" icon={Syringe} label="Log vaccine" />
              <QuickAction href="/medical" icon={FileText} label="Prescribe" />
              <QuickAction href="/patients" icon={PawPrint} label="Find patient" />
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Recent medical records" />
            <div className="space-y-2">
              {db.medRecords.slice(0, 4).map((r: any) => (
                <div key={r.id} className="text-xs">
                  <div className="font-medium text-ink">{r.title}</div>
                  <div className="text-ink/50">{petName(r.petId)} · {r.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// --- Receptionist ---
function ReceptionistDashboard({ stats, db, petName = () => 'Unknown', ownerName = () => 'Unknown', todays = [] }: DashProps) {
  const checkedIn = todays.filter((a) => a.status === 'Checked-in' || a.status === 'In consultation');
  const waiting = todays.filter((a) => a.status === 'Scheduled');
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Today's appts" value={stats.appointments} tone="plum" />
        <StatCard icon={UserCheck} label="Checked in" value={checkedIn.length} sub="In clinic now" tone="sky" />
        <StatCard icon={Clock} label="Waiting" value={waiting.length} sub="Not yet arrived" tone="amber" />
        <StatCard icon={PawPrint} label="New patients" value={stats.owners} sub="Total owners" tone="coral" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <Card className="lg:col-span-2 p-5">
          <SectionTitle title="Front desk queue" action={<Link href="/appointments" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
          <div className="space-y-2">
            {todays.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line hover:bg-canvas transition-colors">
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-sm font-semibold text-ink">{a.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{petName(a.petId)} · {a.service}</div>
                  <div className="text-[11px] text-ink/50 truncate">{ownerName(a.ownerId)} · {a.vet}</div>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Quick actions" />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/patients" icon={PawPrint} label="Register pet" />
              <QuickAction href="/appointments" icon={CalendarDays} label="Book appt" />
              <QuickAction href="/billing" icon={Receipt} label="New invoice" />
              <QuickAction href="/grooming" icon={Scissors} label="Book groom" />
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Boarding & grooming today" />
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink/60">Boarding pets</span>
                <span className="font-semibold text-ink">{stats.boarding}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/60">Grooming appts</span>
                <span className="font-semibold text-ink">{stats.grooming}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

// --- Veterinary Nurse ---
function NurseDashboard({ stats, db, petName = () => 'Unknown', ownerName = () => 'Unknown', todays = [] }: DashProps) {
  const inCare = todays.filter((a) => a.status === 'Checked-in' || a.status === 'In consultation');
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Heart} label="In care now" value={inCare.length} sub="Active patients" tone="plum" />
        <StatCard icon={Syringe} label="Treatments due" value={3} sub="Today" tone="sky" />
        <StatCard icon={Hotel} label="Boarding" value={stats.boarding} sub="Under care" tone="amber" />
        <StatCard icon={Stethoscope} label="Medical records" value={stats.medRecords} sub="Total" tone="coral" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        <Card className="p-5">
          <SectionTitle title="Patients in care" />
          <div className="space-y-2">
            {inCare.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
                <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center text-xs font-semibold">
                  {petName(a.petId).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{petName(a.petId)}</div>
                  <div className="text-[11px] text-ink/50 truncate">{ownerName(a.ownerId)} · {a.service}</div>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
            {inCare.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No patients in care right now.</div>}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Boarding care schedule" />
          <div className="space-y-2">
            {db.boarding.filter((b: any) => b.status === 'Checked-in').map((b: any) => (
              <div key={b.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-canvas">
                <Package className="w-4 h-4 text-plum mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="font-medium text-ink">{b.petName} · {b.room}</div>
                  <div className="text-ink/50 mt-0.5">{b.feedingNotes}</div>
                  <div className="text-ink/40 mt-0.5">Out: {b.checkOut}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// --- Lab Technician ---
function LabDashboard({ stats, db, petName = () => 'Unknown' }: DashProps) {
  const labs = db.medRecords.filter((r: any) => r.type === 'Lab');
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={FlaskConical} label="Lab tests" value={labs.length} sub="On record" tone="plum" />
        <StatCard icon={Microscope} label="Pending results" value={2} sub="Awaiting analysis" tone="amber" />
        <StatCard icon={ClipboardList} label="Completed" value={labs.length - 2} sub="This month" tone="sky" />
        <StatCard icon={Package} label="Lab supplies" value={db.medStock.filter((m: any) => m.category === 'Equipment').length} sub="Items tracked" tone="coral" />
      </div>
      <Card className="mt-5 p-5">
        <SectionTitle title="Recent lab tests" action={<Link href="/medical" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">All records <ArrowRight className="w-3 h-3" /></Link>} />
        <div className="space-y-2">
          {labs.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-line hover:bg-canvas transition-colors">
              <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <FlaskConical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink">{r.title}</div>
                <div className="text-[11px] text-ink/50">{petName(r.petId)} · {r.vet} · {r.date}</div>
              </div>
              <Badge status="Completed" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// --- Pharmacist ---
function PharmacistDashboard({ stats, db }: DashProps) {
  const bi = computeBI(db, []);
  const prescriptions = db.medRecords.filter((r: any) => r.type === 'Prescription' || r.treatment?.includes('mg'));
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={Pill} label="Total items" value={db.medStock.length} sub="In catalog" tone="plum" />
        <StatCard icon={AlertTriangle} label="Low stock" value={bi.lowStock.length} sub="Needs reorder" tone="coral" />
        <StatCard icon={Clock} label="Expiring soon" value={bi.expiring.length} sub="Within 4 months" tone="amber" />
        <StatCard icon={FileText} label="Prescriptions" value={prescriptions.length} sub="On record" tone="sky" />
        <StatCard icon={Syringe} label="Vaccines" value={db.medStock.filter((m: any) => m.category === 'Vaccine').length} sub="In stock" tone="plum" />
        <StatCard icon={Package} label="Categories" value={new Set(db.medStock.map((m: any) => m.category)).size} sub="Active" tone="coral" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        <LowStockWidget lowStock={bi.lowStock} />
        <ExpiringMedicinesWidget expiring={bi.expiring} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <InventoryAnalyticsWidget inventoryData={bi.inventoryData} />
        <VaccinationStatsWidget vaccByMonth={bi.vaccByMonth} />
        <AIRecommendationsWidget insights={bi.insights} />
      </div>
    </>
  );
}

// --- Groomer ---
function GroomerDashboard({ stats, db }: DashProps) {
  const todayGrooms = db.grooming.filter((g: any) => g.date === today());
  const otherGrooms = db.grooming.filter((g: any) => g.date !== today());
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Scissors} label="Today's grooms" value={todayGrooms.length} tone="plum" />
        <StatCard icon={Clock} label="Scheduled" value={todayGrooms.filter((g: any) => g.status === 'Scheduled').length} tone="amber" />
        <StatCard icon={UserCheck} label="Completed" value={todayGrooms.filter((g: any) => g.status === 'Completed').length} tone="sky" />
        <StatCard icon={PawPrint} label="Total clients" value={db.grooming.length} sub="All time" tone="coral" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        <Card className="p-5">
          <SectionTitle title="Today's grooming schedule" action={<Link href="/grooming" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
          <div className="space-y-2">
            {todayGrooms.map((g: any) => (
              <div key={g.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas transition-colors">
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-sm font-semibold text-ink">{g.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{g.petName} · {(g.services || []).map((s: any) => s.name).join(', ') || g.packageName || 'Grooming'}</div>
                  <div className="text-[11px] text-ink/50 truncate">{g.owner}{g.notes && ` · ${g.notes}`}</div>
                </div>
                <Badge status={g.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Upcoming & history" />
          <div className="space-y-2">
            {otherGrooms.map((g: any) => (
              <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-canvas">
                <span className="text-[11px] text-ink/40 w-12 shrink-0">{g.date.slice(5)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{g.petName} · {(g.services || []).map((s: any) => s.name).join(', ') || g.packageName || 'Grooming'}</div>
                  <div className="text-[11px] text-ink/50">{g.groomer}</div>
                </div>
                <Badge status={g.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

// --- Boarding Staff ---
function BoardingDashboard({ stats, db }: DashProps) {
  const active = db.boarding.filter((b: any) => b.status === 'Checked-in');
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Hotel} label="Pets boarding" value={active.length} sub="In-house" tone="plum" />
        <StatCard icon={Clock} label="Check-outs today" value={active.filter((b: any) => b.checkOut === today()).length} tone="amber" />
        <StatCard icon={Utensils} label="Feeding due" value={active.length * 2} sub="Sessions" tone="sky" />
        <StatCard icon={Package} label="Rooms in use" value={new Set(active.map((b: any) => b.room)).size} tone="coral" />
      </div>
      <Card className="mt-5 p-5">
        <SectionTitle title="Pets in boarding" action={<Link href="/boarding" className="text-xs text-plum font-medium flex items-center gap-1 hover:underline">Manage <ArrowRight className="w-3 h-3" /></Link>} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {active.map((b: any) => (
            <div key={b.id} className="flex items-start gap-3 p-4 rounded-xl border border-line">
              <div className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center">
                <Hotel className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink">{b.petName}</div>
                <div className="text-[11px] text-ink/50">{b.owner} · {b.room}</div>
                <div className="mt-1.5 text-[11px] text-ink/60">
                  <div>In: {b.checkIn} · Out: {b.checkOut}</div>
                  <div className="mt-0.5">{b.feedingNotes}</div>
                </div>
              </div>
              <Badge status="Checked-in" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// --- Accountant ---
function AccountantDashboard({ stats, db, ownerName = () => 'Unknown' }: DashProps) {
  const bi = computeBI(db, []);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={DollarSign} label="Collected" value={`${stats.revenue.toLocaleString()}`} sub="Total paid" tone="plum" />
        <StatCard icon={TrendingUp} label="Monthly" value={`${bi.monthlyIncome.toLocaleString()}`} sub="This month" tone="sky" />
        <StatCard icon={Clock} label="Outstanding" value={`${stats.pendingRev.toLocaleString()}`} sub={`${stats.pendingInvoices} pending`} tone="amber" />
        <StatCard icon={AlertTriangle} label="Overdue" value={`${bi.overdue.reduce((s: number, i: any) => s + i.items.reduce((a: number, it: any) => a + it.qty * it.unitPrice, 0), 0).toLocaleString()}`} sub={`${bi.overdue.length} invoices`} tone="coral" />
        <StatCard icon={Receipt} label="Daily income" value={`${bi.dailyIncome.toLocaleString()}`} sub="Today" tone="plum" />
        <StatCard icon={TrendingUp} label="Total billed" value={`${db.invoices.reduce((s: number, i: any) => s + i.items.reduce((a: number, it: any) => a + it.qty * it.unitPrice, 0), 0).toLocaleString()}`} sub="All time" tone="sky" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <RevenueGraphWidget monthlyRevenue={bi.monthlyRevenue} />
        <RevenueSummaryWidget revenue={bi.revenue} dailyIncome={bi.dailyIncome} monthlyIncome={bi.monthlyIncome} outstanding={bi.outstanding} />
        <OutstandingInvoicesWidget overdue={bi.overdue} pending={bi.pending} ownerName={ownerName} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <TopServicesWidget topServices={bi.topServices} />
        <BranchComparisonWidget branchComparison={bi.branchComparison} />
      </div>
      <div className="mt-4">
        <AIInsightsWidget insights={bi.insights} />
      </div>
    </>
  );
}

// --- Inventory Manager ---
function InventoryDashboard({ stats, db }: DashProps) {
  const bi = computeBI(db, []);
  const totalValue = db.medStock.reduce((s: number, m: any) => s + m.stock * m.price, 0);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard icon={Package} label="Total items" value={db.medStock.length} sub="SKUs tracked" tone="plum" />
        <StatCard icon={DollarSign} label="Stock value" value={`${totalValue.toLocaleString()}`} sub="At cost" tone="sky" />
        <StatCard icon={AlertTriangle} label="Low stock" value={bi.lowStock.length} sub="Needs reorder" tone="coral" />
        <StatCard icon={Clock} label="Expiring soon" value={bi.expiring.length} sub="< 4 months" tone="amber" />
        <StatCard icon={Pill} label="Medicines" value={db.medStock.filter((m: any) => m.category === 'Medicine').length} sub="In catalog" tone="plum" />
        <StatCard icon={Syringe} label="Vaccines" value={db.medStock.filter((m: any) => m.category === 'Vaccine').length} sub="In catalog" tone="sky" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        <LowStockWidget lowStock={bi.lowStock} />
        <ExpiringMedicinesWidget expiring={bi.expiring} />
        <InventoryAnalyticsWidget inventoryData={bi.inventoryData} />
      </div>
    </>
  );
}

// --- Pet Owner ---
function PetOwnerDashboard({ stats, db, user }: DashPropsFull) {
  const myOwner = db.owners[0];
  const myPets = db.pets.slice(0, 2);
  const myAppts = db.appointments.filter((a: any) => myPets.some((p: any) => p.id === a.petId));
  const myInvoices = db.invoices.filter((i: any) => myPets.some((p: any) => p.id === i.petId));
  const myRecords = db.medRecords.filter((r: any) => myPets.some((p: any) => p.id === r.petId));
  const invTotal = (i: any) => i.items.reduce((s: number, it: any) => s + it.qty * it.unitPrice, 0);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={PawPrint} label="My pets" value={myPets.length} tone="plum" />
        <StatCard icon={CalendarDays} label="Appointments" value={myAppts.length} tone="sky" />
        <StatCard icon={Stethoscope} label="Health records" value={myRecords.length} tone="amber" />
        <StatCard icon={Receipt} label="Outstanding" value={`$${myInvoices.filter((i: any) => i.status !== 'Paid').reduce((s: number, i: any) => s + invTotal(i), 0).toFixed(2)}`} tone="coral" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <Card className="p-5">
          <SectionTitle title="My pets" />
          <div className="space-y-3">
            {myPets.map((p: any) => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl border border-line">
                <div className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center">
                  {p.species === 'Dog' ? <Dog className="w-5 h-5" /> : <Cat className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-ink">{p.name}</div>
                  <div className="text-[11px] text-ink/50">{p.breed} · {p.gender}</div>
                  {p.allergies && p.allergies !== 'None known' && (
                    <div className="text-[11px] text-coral mt-1">Allergies: {p.allergies}</div>
                  )}
                  {p.conditions && <div className="text-[11px] text-amber-600 mt-0.5">{p.conditions}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="Upcoming appointments" />
          <div className="space-y-2">
            {myAppts.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-[11px] text-ink/40">{a.date.slice(5)}</span>
                  <span className="text-sm font-semibold text-ink">{a.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink truncate">{a.service}</div>
                  <div className="text-[11px] text-ink/50">{a.vet} · {a.reason}</div>
                </div>
                <Badge status={a.status} />
              </div>
            ))}
            {myAppts.length === 0 && <div className="text-center py-6 text-sm text-ink/50">No appointments booked.</div>}
          </div>
        </Card>
        <Card className="p-5">
          <SectionTitle title="My invoices" />
          <div className="space-y-2">
            {myInvoices.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-line">
                <div>
                  <div className="text-sm font-medium text-ink">{i.number}</div>
                  <div className="text-[11px] text-ink/50">{i.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-ink">${invTotal(i).toFixed(2)}</div>
                  <Badge status={i.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-5 p-5">
        <SectionTitle title="Health timeline" />
        <div className="space-y-2">
          {myRecords.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-canvas">
              <div className="w-8 h-8 rounded-lg bg-lilac text-plum flex items-center justify-center shrink-0">
                {r.type === 'Vaccination' ? <Syringe className="w-4 h-4" /> : r.type === 'Lab' ? <FlaskConical className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink">{r.title}</div>
                <div className="text-[11px] text-ink/50">{db.pets.find((p: any) => p.id === r.petId)?.name} · {r.date}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-ink/60 font-medium">{r.type}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// --- Shared components ---
function SystemRow({ icon: Icon, label, value, tone }: { icon: typeof Shield; label: string; value: string | number; tone: string }) {
  const tones: Record<string, string> = { plum: 'text-plum', sky: 'text-sky-600', amber: 'text-amber-600', coral: 'text-coral' };
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={`w-4 h-4 ${tones[tone]}`} />
      <span className="text-xs text-ink/60 flex-1">{label}</span>
      <span className="text-xs font-semibold text-ink">{value}</span>
    </div>
  );
}

function AlertRow({ icon: Icon, text, tone }: { icon: typeof AlertTriangle; text: string; tone: string }) {
  const tones: Record<string, string> = { plum: 'text-plum', sky: 'text-sky-600', amber: 'text-amber-600', coral: 'text-coral' };
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`w-4 h-4 ${tones[tone]} mt-0.5 shrink-0`} />
      <span className="text-xs text-ink/70">{text}</span>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-start gap-2 p-3 rounded-xl border border-line hover:border-plum hover:bg-lilac/40 transition-colors">
      <Icon className="w-4 h-4 text-plum" />
      <span className="text-xs font-medium text-ink">{label}</span>
    </Link>
  );
}

function DashboardChart({ todaysCount, db }: { todaysCount: number; db?: any }) {
  const weekData = [
    { day: 'Mon', appts: 3, revenue: 180 },
    { day: 'Tue', appts: todaysCount, revenue: 340 },
    { day: 'Wed', appts: 4, revenue: 220 },
    { day: 'Thu', appts: 6, revenue: 410 },
    { day: 'Fri', appts: 3, revenue: 195 },
    { day: 'Sat', appts: 2, revenue: 120 },
    { day: 'Sun', appts: 1, revenue: 65 },
  ];

  const statusData = db?.appointments
    ? [
        { name: 'Scheduled', value: db.appointments.filter((a: any) => a.status === 'Scheduled').length },
        { name: 'Checked-in', value: db.appointments.filter((a: any) => a.status === 'Checked-in').length },
        { name: 'In consultation', value: db.appointments.filter((a: any) => a.status === 'In consultation').length },
        { name: 'Completed', value: db.appointments.filter((a: any) => a.status === 'Completed').length },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
      <BarChartCard title="Weekly appointments" data={weekData} dataKey="appts" xKey="day" color="#4C1D95" height={220} />
      <AreaChartCard title="Revenue trend" data={weekData} dataKey="revenue" xKey="day" color="#f17f65" height={220} />
      {statusData.length > 0 && <DonutChartCard title="Appointment status" data={statusData} height={220} />}
    </div>
  );
}
