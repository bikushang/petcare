'use client';

import { useState, useMemo } from 'react';
import {
  Users, Plus, Mail, Phone, Edit2, Trash2, Shield, Lock, Ban, CheckCircle2,
  Calendar, Clock, DollarSign, FileText, Award, Activity, TrendingUp,
  ChevronRight, X, Download, Star,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Badge, Button, EmptyState, Modal, Field, Input, Select, Checkbox, SectionTitle, StatCard, DateInput, NumberInput, Textarea, BarChartCard, Tabs } from '../components/ui';
import { useDB, Staff, newId } from '../lib/store';
import { useAuth, updateStaffStatus } from '../lib/auth';
import { staffRoleOptions, branchNames, allRoles, roleInfo } from '../lib/platform';
import type { Role } from '../lib/platform';

const statuses: Staff['status'][] = ['Active', 'On leave', 'Inactive', 'Suspended'];
const managementRoles: Role[] = ['Super Admin', 'Clinic Owner', 'Branch Manager'];

type Tab = 'overview' | 'attendance' | 'leave' | 'payroll' | 'performance' | 'documents' | 'activity';

const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'overview', label: 'Overview', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'leave', label: 'Leave', icon: Calendar },
  { key: 'payroll', label: 'Payroll', icon: DollarSign },
  { key: 'performance', label: 'Performance', icon: Award },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function StaffPage() {
  const { user } = useAuth();
  const { db, create, update, remove } = useDB();
  const [tab, setTab] = useState<Tab>('overview');
  const [open, setOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    name: '',
    role: staffRoleOptions[0],
    branch: branchNames[0],
    phone: '',
    email: '',
    shift: 'Mon–Fri 09:00–17:00',
    status: 'Active' as Staff['status'],
    branchAccess: [] as string[],
  });

  if (!db) return <Shell module="staff" title="Staff"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  const canManage = user && managementRoles.includes(user.role);
  const isSuperAdmin = user?.role === 'Super Admin';
  const isClinicOwner = user?.role === 'Clinic Owner';

  const visibleStaff = canManage
    ? db.staff
    : db.staff.filter((s) => s.branch === user?.branch);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleBranchAccess = (branch: string) => {
    setForm((f) => ({
      ...f,
      branchAccess: f.branchAccess.includes(branch)
        ? f.branchAccess.filter((b) => b !== branch)
        : [...f.branchAccess, branch],
    }));
  };

  const openNew = () => {
    setEditStaff(null);
    setForm({
      name: '', role: staffRoleOptions[0], branch: branchNames[0],
      phone: '', email: '', shift: 'Mon–Fri 09:00–17:00',
      status: 'Active', branchAccess: [],
    });
    setOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditStaff(s);
    setForm({
      name: s.name, role: s.role as typeof staffRoleOptions[number],
      branch: s.branch, phone: s.phone, email: s.email,
      shift: s.shift, status: s.status, branchAccess: s.branchAccess || [],
    });
    setOpen(true);
  };

  const saveStaff = () => {
    if (!form.name) return;
    const payload = {
      ...form,
      branchAccess: form.branchAccess.length ? form.branchAccess : [form.branch],
      hireDate: editStaff?.hireDate || '',
      department: editStaff?.department || '',
      employmentType: editStaff?.employmentType || 'Full-time',
      baseSalary: editStaff?.baseSalary || 0,
      allowances: editStaff?.allowances || 0,
      bankAccount: editStaff?.bankAccount || '',
      emergencyContactName: editStaff?.emergencyContactName || '',
      emergencyContactPhone: editStaff?.emergencyContactPhone || '',
      address: editStaff?.address || '',
      dateOfBirth: editStaff?.dateOfBirth || '',
      gender: editStaff?.gender || '' as Staff['gender'],
      nationalId: editStaff?.nationalId || '',
      leaveBalance: editStaff?.leaveBalance || { annual: 0, sick: 0, personal: 0 },
      shiftSchedule: editStaff?.shiftSchedule || [],
      attendance: editStaff?.attendance || [],
      leaveRequests: editStaff?.leaveRequests || [],
      payroll: editStaff?.payroll || [],
      performanceReviews: editStaff?.performanceReviews || [],
      documents: editStaff?.documents || [],
      bonuses: editStaff?.bonuses || [],
      activityLog: editStaff?.activityLog || [],
    };
    if (editStaff) {
      update('staff', editStaff.id, payload);
    } else {
      create('staff', { id: newId('stf'), ...payload } as Staff);
    }
    setOpen(false);
    setEditStaff(null);
  };

  const changeStatus = async (s: Staff, newStatus: Staff['status']) => {
    try {
      await updateStaffStatus(s.id, newStatus);
      update('staff', s.id, { status: newStatus });
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const deleteStaff = (id: string) => remove('staff', id);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'Suspended': return <Ban className="w-3.5 h-3.5" />;
      case 'Inactive': return <Lock className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  // Stats
  const activeCount = visibleStaff.filter((s) => s.status === 'Active').length;
  const onLeaveCount = visibleStaff.filter((s) => s.status === 'On leave').length;
  const totalPayroll = visibleStaff.reduce((sum, s) => {
    const latest = s.payroll?.[s.payroll.length - 1];
    return sum + (latest?.netPay || 0);
  }, 0);
  const pendingLeaves = visibleStaff.reduce((sum, s) =>
    sum + (s.leaveRequests?.filter((l) => l.status === 'Pending').length || 0), 0);

  // Activity connection: count work items per staff member
  const getStaffWorkCount = (staffName: string) => {
    const appts = db.appointments.filter((a) => a.vet === staffName).length;
    const meds = db.medRecords.filter((m) => m.vet === staffName).length;
    const surgeries = db.surgeries.filter((s) =>
      s.staff.some((st) => st.staffName === staffName)).length;
    const labs = db.labTests.filter((l) => l.requestedBy === staffName).length;
    const grooming = db.grooming.filter((g) => g.groomer === staffName).length;
    const boarding = db.boarding.filter((b) => b.owner === staffName).length;
    return { appts, meds, surgeries, labs, grooming, boarding, total: appts + meds + surgeries + labs + grooming + boarding };
  };

  return (
    <Shell title="Staff & HR" subtitle="Team management, attendance, payroll, performance, and more">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard icon={Users} label="Total staff" value={String(visibleStaff.length)} tone="plum" />
        <StatCard icon={CheckCircle2} label="Active" value={String(activeCount)} tone="plum" />
        <StatCard icon={Calendar} label="On leave" value={String(onLeaveCount)} tone="amber" />
        <StatCard icon={DollarSign} label="Monthly payroll" value={fmtMoney(totalPayroll)} tone="coral" />
      </div>

      {pendingLeaves > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-800">
          <Calendar className="w-4 h-4" />
          {pendingLeaves} leave request{pendingLeaves > 1 ? 's' : ''} pending approval — check the Leave tab
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === 'overview' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-ink/60">{visibleStaff.length} staff members</p>
            {canManage && <Button onClick={openNew}><Plus className="w-4 h-4" /> Add staff</Button>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleStaff.map((s) => {
              const info = roleInfo[s.role as Role];
              const canEditThis = canManage && !(s.role === 'Super Admin' && !isSuperAdmin);
              const work = getStaffWorkCount(s.name);
              return (
                <Card key={s.id} className="p-4 group">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-coral/15 text-coral flex items-center justify-center text-sm font-semibold shrink-0">
                      {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-ink truncate">{s.name}</div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEditThis && (
                            <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isSuperAdmin && s.role !== 'Super Admin' && (
                            <button onClick={() => deleteStaff(s.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {info?.scope === 'platform' && <Shield className="w-3 h-3 text-coral" />}
                        <span className="text-[11px] text-ink/50">{s.role}</span>
                        <span className="text-[11px] text-ink/30">·</span>
                        <span className="text-[11px] text-ink/50">{s.branch}</span>
                      </div>
                      <div className="mt-1.5"><Badge status={s.status} /></div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-line text-[11px] text-ink/60 space-y-1">
                    <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.phone || '—'}</div>
                    <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {s.email || '—'}</div>
                    <div className="text-ink/40 pt-0.5">Shift: {s.shift || '—'}</div>
                    {s.hireDate && <div className="text-ink/40">Hired: {s.hireDate}</div>}
                    {s.department && <div className="text-ink/40">Dept: {s.department}</div>}
                  </div>
                  {work.total > 0 && (
                    <div className="mt-2 pt-2 border-t border-line">
                      <div className="text-[10px] text-ink/40 uppercase tracking-wide mb-1">Work activity</div>
                      <div className="flex flex-wrap gap-1">
                        {work.appts > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">{work.appts} appts</span>}
                        {work.meds > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-lilac text-plum">{work.meds} records</span>}
                        {work.surgeries > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-coral/15 text-coral">{work.surgeries} surgeries</span>}
                        {work.labs > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">{work.labs} labs</span>}
                        {work.grooming > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">{work.grooming} grooms</span>}
                        {work.boarding > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{work.boarding} boarding</span>}
                      </div>
                    </div>
                  )}
                  {canEditThis && s.role !== 'Super Admin' && (
                    <div className="mt-3 pt-3 border-t border-line flex gap-1.5">
                      {statuses.map((st) => (
                        <button
                          key={st}
                          onClick={() => changeStatus(s, st)}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                            s.status === st ? 'bg-lilac text-plum ring-1 ring-plum/20' : 'text-ink/50 hover:bg-canvas'
                          }`}
                        >
                          {statusIcon(st)}
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {visibleStaff.length === 0 && <Card><EmptyState icon={Users} title="No staff yet" /></Card>}
        </div>
      )}

      {/* Attendance tab */}
      {tab === 'attendance' && (
        <div>
          <SectionTitle title="Attendance & Shifts" action={canManage ? <Button onClick={openNew}><Plus className="w-4 h-4" /> Add staff</Button> : undefined} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {visibleStaff.filter((s) => s.role !== 'Pet Owner').map((s) => {
              const recent = (s.attendance || []).slice(-5).reverse();
              const presentCount = (s.attendance || []).filter((a) => a.status === 'Present').length;
              const lateCount = (s.attendance || []).filter((a) => a.status === 'Late').length;
              const absentCount = (s.attendance || []).filter((a) => a.status === 'Absent').length;
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold">
                        {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{s.name}</div>
                        <div className="text-[11px] text-ink/50">{s.shift}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-lilac text-plum font-medium">{presentCount} Present</span>
                      {lateCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">{lateCount} Late</span>}
                      {absentCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-coral/10 text-coral font-medium">{absentCount} Absent</span>}
                    </div>
                  </div>
                  {recent.length > 0 ? (
                    <div className="space-y-1.5">
                      {recent.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg bg-canvas/50">
                          <span className="text-ink/70 font-medium">{a.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-ink/50">{a.checkIn || '—'} → {a.checkOut || '—'}</span>
                            <span className={`px-1.5 py-0.5 rounded font-medium ${
                              a.status === 'Present' ? 'bg-lilac text-plum' :
                              a.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                              a.status === 'Absent' ? 'bg-coral/10 text-coral' :
                              a.status === 'On leave' ? 'bg-sky-100 text-sky-700' :
                              'bg-line text-ink/60'
                            }`}>{a.status}</span>
                            <span className="text-ink/40">{a.hoursWorked}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink/40 py-4 text-center">No attendance records</p>
                  )}
                  {s.shiftSchedule && s.shiftSchedule.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line">
                      <div className="text-[10px] text-ink/40 uppercase tracking-wide mb-1.5">Weekly shift schedule</div>
                      <div className="grid grid-cols-5 gap-1">
                        {s.shiftSchedule.map((sh) => (
                          <div key={sh.id} className="text-center py-1 px-1 rounded-lg bg-canvas/50">
                            <div className="text-[10px] font-medium text-ink/70">{sh.day.slice(0, 3)}</div>
                            <div className="text-[9px] text-ink/50">{sh.startTime}</div>
                            <div className="text-[9px] text-ink/50">{sh.endTime}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Leave tab */}
      {tab === 'leave' && (
        <div>
          <SectionTitle title="Leave Management" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            {/* Leave balances */}
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-ink mb-3">Leave Balances</h4>
              <div className="space-y-2">
                {visibleStaff.filter((s) => s.role !== 'Pet Owner').map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink/70 font-medium truncate">{s.name}</span>
                    <div className="flex gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-lilac text-plum font-medium" title="Annual">{s.leaveBalance?.annual ?? 0}A</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium" title="Sick">{s.leaveBalance?.sick ?? 0}S</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium" title="Personal">{s.leaveBalance?.personal ?? 0}P</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Leave requests */}
            <Card className="p-4 lg:col-span-2">
              <h4 className="text-sm font-semibold text-ink mb-3">Leave Requests</h4>
              <div className="space-y-2">
                {visibleStaff.flatMap((s) =>
                  (s.leaveRequests || []).map((lr) => ({ staff: s, leave: lr }))
                ).sort((a, b) => b.leave.appliedDate.localeCompare(a.leave.appliedDate)).map(({ staff, leave }) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 rounded-xl bg-canvas/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{staff.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">{leave.type}</span>
                      </div>
                      <div className="text-[11px] text-ink/50 mt-0.5">
                        {leave.startDate} → {leave.endDate} ({leave.days} day{leave.days > 1 ? 's' : ''})
                      </div>
                      <div className="text-[11px] text-ink/40 mt-0.5">{leave.reason}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        leave.status === 'Approved' ? 'bg-lilac text-plum' :
                        leave.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        leave.status === 'Rejected' ? 'bg-coral/10 text-coral' :
                        'bg-line text-ink/60'
                      }`}>{leave.status}</span>
                      {leave.reviewedBy && <span className="text-[10px] text-ink/40">by {leave.reviewedBy}</span>}
                    </div>
                  </div>
                ))}
                {visibleStaff.flatMap((s) => s.leaveRequests || []).length === 0 && (
                  <p className="text-xs text-ink/40 py-4 text-center">No leave requests</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Payroll tab */}
      {tab === 'payroll' && (
        <div>
          <SectionTitle title="Payroll & Salary" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {visibleStaff.filter((s) => s.role !== 'Pet Owner').map((s) => {
              const latestPayroll = s.payroll?.[s.payroll.length - 1];
              const annualSalary = (s.baseSalary || 0) + (s.allowances || 0);
              const totalBonuses = (s.bonuses || []).reduce((sum, b) => sum + b.amount, 0);
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold">
                        {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{s.name}</div>
                        <div className="text-[11px] text-ink/50">{s.employmentType} · {s.department}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-ink">{fmtMoney(annualSalary)}</div>
                      <div className="text-[10px] text-ink/40">annual</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center py-2 rounded-lg bg-canvas/50">
                      <div className="text-[10px] text-ink/40 uppercase">Base</div>
                      <div className="text-xs font-semibold text-ink">{fmtMoney(s.baseSalary || 0)}</div>
                    </div>
                    <div className="text-center py-2 rounded-lg bg-canvas/50">
                      <div className="text-[10px] text-ink/40 uppercase">Allowances</div>
                      <div className="text-xs font-semibold text-ink">{fmtMoney(s.allowances || 0)}</div>
                    </div>
                    <div className="text-center py-2 rounded-lg bg-canvas/50">
                      <div className="text-[10px] text-ink/40 uppercase">Bonuses</div>
                      <div className="text-xs font-semibold text-ink">{fmtMoney(totalBonuses)}</div>
                    </div>
                  </div>

                  {latestPayroll && (
                    <div className="pt-3 border-t border-line">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-ink/70">{latestPayroll.period}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          latestPayroll.status === 'Paid' ? 'bg-lilac text-plum' :
                          latestPayroll.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-line text-ink/60'
                        }`}>{latestPayroll.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink/60">
                        <div>Base: {fmtMoney(latestPayroll.baseSalary)}</div>
                        <div>Overtime: {fmtMoney(latestPayroll.overtime)}</div>
                        <div>Bonus: {fmtMoney(latestPayroll.bonuses)}</div>
                        <div>Tax: -{fmtMoney(latestPayroll.tax)}</div>
                        <div className="font-semibold text-ink col-span-2 pt-1 border-t border-line">
                          Net pay: {fmtMoney(latestPayroll.netPay)}
                        </div>
                      </div>
                    </div>
                  )}

                  {(s.bonuses || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-line">
                      <div className="text-[10px] text-ink/40 uppercase tracking-wide mb-1.5">Bonus history</div>
                      <div className="space-y-1">
                        {(s.bonuses || []).slice(-3).reverse().map((b) => (
                          <div key={b.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-ink/60">{b.date} · {b.type}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink">{fmtMoney(b.amount)}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                b.status === 'Paid' ? 'bg-lilac text-plum' :
                                b.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-line text-ink/60'
                              }`}>{b.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance tab */}
      {tab === 'performance' && (
        <div>
          <SectionTitle title="Performance Reviews" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {visibleStaff.filter((s) => s.role !== 'Pet Owner' && (s.performanceReviews || []).length > 0).map((s) => {
              const latest = s.performanceReviews?.[s.performanceReviews.length - 1];
              if (!latest) return null;
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold">
                        {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{s.name}</div>
                        <div className="text-[11px] text-ink/50">{latest.period} · {latest.reviewer}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((star) => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= Math.round(latest.rating) ? 'text-amber-400 fill-amber-400' : 'text-line'}`} />
                      ))}
                    </div>
                  </div>
                  <div className={`text-[10px] px-2 py-0.5 rounded font-medium inline-block mb-3 ${
                    latest.overallRating === 'Excellent' ? 'bg-lilac text-plum' :
                    latest.overallRating === 'Good' ? 'bg-sky-100 text-sky-700' :
                    latest.overallRating === 'Satisfactory' ? 'bg-amber-100 text-amber-700' :
                    'bg-coral/10 text-coral'
                  }`}>{latest.overallRating}</div>
                  {latest.categories && latest.categories.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {latest.categories.map((cat, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[11px] text-ink/60 w-28 truncate">{cat.name}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-canvas overflow-hidden">
                            <div className="h-full rounded-full bg-plum" style={{ width: `${(cat.score / 5) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-ink/50 font-medium w-6 text-right">{cat.score}/5</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {latest.strengths && (
                    <div className="pt-2 border-t border-line">
                      <div className="text-[10px] text-ink/40 uppercase tracking-wide">Strengths</div>
                      <p className="text-[11px] text-ink/60 mt-0.5">{latest.strengths}</p>
                    </div>
                  )}
                  {latest.goals && (
                    <div className="pt-2 mt-2 border-t border-line">
                      <div className="text-[10px] text-ink/40 uppercase tracking-wide">Goals</div>
                      <p className="text-[11px] text-ink/60 mt-0.5">{latest.goals}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          {visibleStaff.filter((s) => (s.performanceReviews || []).length > 0).length === 0 && (
            <Card><EmptyState icon={Award} title="No performance reviews yet" /></Card>
          )}
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div>
          <SectionTitle title="Staff Documents" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {visibleStaff.filter((s) => s.role !== 'Pet Owner' && (s.documents || []).length > 0).map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold">
                    {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="text-sm font-semibold text-ink">{s.name}</div>
                </div>
                <div className="space-y-1.5">
                  {(s.documents || []).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-xl bg-canvas/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-ink/40 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-ink truncate">{doc.name}</div>
                          <div className="text-[10px] text-ink/40">{doc.type} · Uploaded {doc.uploadedDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.expiryDate && (
                          <span className="text-[10px] text-ink/40">Exp: {doc.expiryDate}</span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          doc.status === 'Active' ? 'bg-lilac text-plum' :
                          doc.status === 'Expired' ? 'bg-coral/10 text-coral' :
                          'bg-amber-100 text-amber-700'
                        }`}>{doc.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          {visibleStaff.filter((s) => (s.documents || []).length > 0).length === 0 && (
            <Card><EmptyState icon={FileText} title="No documents uploaded" /></Card>
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div>
          <SectionTitle title="Staff Activity History" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {visibleStaff.filter((s) => s.role !== 'Pet Owner' && (s.activityLog || []).length > 0).map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center text-xs font-semibold">
                    {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{s.name}</div>
                    <div className="text-[11px] text-ink/50">{s.role}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {(s.activityLog || []).slice(-5).reverse().map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5 text-[11px] py-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-plum mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink/40">{log.date} {log.time}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-canvas text-ink/60 font-medium">{log.module}</span>
                        </div>
                        <div className="text-ink/70 mt-0.5">{log.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Work connections summary */}
                <div className="mt-3 pt-3 border-t border-line">
                  <div className="text-[10px] text-ink/40 uppercase tracking-wide mb-1.5">Connected work</div>
                  {(() => {
                    const work = getStaffWorkCount(s.name);
                    return work.total > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {work.appts > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">{work.appts} appointments</span>}
                        {work.meds > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-lilac text-plum">{work.meds} medical records</span>}
                        {work.surgeries > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-coral/15 text-coral">{work.surgeries} surgeries</span>}
                        {work.labs > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">{work.labs} lab tests</span>}
                        {work.grooming > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">{work.grooming} grooming</span>}
                        {work.boarding > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{work.boarding} boarding</span>}
                      </div>
                    ) : <p className="text-[11px] text-ink/40">No connected work items</p>;
                  })()}
                </div>
              </Card>
            ))}
          </div>
          {visibleStaff.filter((s) => (s.activityLog || []).length > 0).length === 0 && (
            <Card><EmptyState icon={Activity} title="No activity recorded" /></Card>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditStaff(null); }}
        title={editStaff ? 'Edit staff member' : 'Add staff member'}
      >
        <div className="space-y-3">
          <Field label="Full name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Dr. Maya Rivera" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
                {(isSuperAdmin ? allRoles : staffRoleOptions).map((r) => <option key={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label="Primary branch">
              <Select value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                {branchNames.map((b) => <option key={b}>{b}</option>)}
              </Select>
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 415 555 0200" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@vetnoravet.com" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Shift">
              <Input value={form.shift} onChange={(e) => set('shift', e.target.value)} placeholder="Mon–Fri 09:00–17:00" />
            </Field>
          </div>
          {(isSuperAdmin || isClinicOwner) && (
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-2">Branch access</div>
              <div className="flex flex-wrap gap-3">
                {branchNames.map((b) => (
                  <Checkbox key={b} checked={form.branchAccess.includes(b)} onChange={() => toggleBranchAccess(b)} label={b} />
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditStaff(null); }}>Cancel</Button>
            <Button onClick={saveStaff}>{editStaff ? 'Save changes' : 'Add'}</Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
