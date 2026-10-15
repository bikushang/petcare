'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays, Plus, Clock, Stethoscope, CheckCircle2, XCircle,
  UserCheck, Edit2, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, Footprints, Globe, Repeat, Bell, ListOrdered,
  DoorOpen, CalendarCheck, X, Activity, ArrowRight, Users,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Badge, Button, EmptyState, Modal, Field, Input, Checkbox, Select, DateInput, NumberInput, Textarea } from '../components/ui';
import { useDB, Appointment, newId, today } from '../lib/store';
import { useAuth } from '../lib/auth';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateAppointmentSummary } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const services = ['Consultation', 'Vaccination', 'Surgery', 'Dental', 'Grooming', 'Lab', 'Boarding', 'Emergency', 'Walk-in', 'Follow-up', 'Other'];
const VET_ROLES = ['Veterinarian', 'Veterinary Nurse'];
const rooms = ['Room 1', 'Room 2', 'Room 3', 'Dental', 'Surgery', 'Isolation'];
const times = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
const recurrencePatterns = ['None', 'Weekly', 'Bi-weekly', 'Monthly'];

const statusFlow: Record<Appointment['status'], Appointment['status'] | null> = {
  'Scheduled': 'Checked-in',
  'Checked-in': 'In consultation',
  'In consultation': 'Completed',
  'Completed': null,
  'Cancelled': null,
  'Rescheduled': 'Checked-in',
  'No-show': null,
};

const statusActionLabel: Record<Appointment['status'], string | null> = {
  'Scheduled': 'Check in',
  'Checked-in': 'Start consult',
  'In consultation': 'Complete',
  'Completed': null,
  'Cancelled': null,
  'Rescheduled': 'Check in',
  'No-show': null,
};

const bookingTypeIcon: Record<string, typeof Globe> = {
  Online: Globe, 'Walk-in': Footprints, Emergency: AlertTriangle,
};

const bookingTypeColor: Record<string, string> = {
  Online: 'bg-sky-100 text-sky-700', 'Walk-in': 'bg-amber-100 text-amber-700', Emergency: 'bg-coral/15 text-coral',
};

type ViewMode = 'day' | 'week' | 'month' | 'queue';
type TabId = 'calendar' | 'queue' | 'waitlist';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }

export default function AppointmentsPage() {
  const { db, create, update, remove } = useDB();
  const { user } = useAuth();
  const vets = useMemo(() => {
    if (!db) return [] as string[];
    return db.staff.filter((s) => VET_ROLES.includes(s.role) && s.status === 'Active').map((s) => s.name);
  }, [db]);
  const [tab, setTab] = useState<TabId>('calendar');
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [form, setForm] = useState({
    petId: '', vet: '', service: services[0], date: today(), time: '09:00', reason: '',
    durationMin: '30', bookingType: 'Online' as Appointment['bookingType'],
    room: '', isRecurring: false, recurrencePattern: 'None' as Appointment['recurrencePattern'],
    followUpDate: '', followUpReminder: false, notes: '',
  });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const sorted = useMemo(() => {
    if (!db) return [];
    return [...db.appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [db]);

  const petName = (id: string) => db?.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const ownerName = (id: string) => db?.owners.find((o) => o.id === id)?.name ?? 'Unknown';
  const petOf = (id: string) => db?.pets.find((p) => p.id === id);

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    sorted.forEach((a) => { (map[a.date] ??= []).push(a); });
    return map;
  }, [sorted]);

  // Queue: today's checked-in + in-consultation appointments
  const todayQueue = useMemo(() => {
    const t = today();
    return sorted.filter((a) => a.date === t && (a.status === 'Checked-in' || a.status === 'In consultation'));
  }, [sorted]);

  // Waitlist: today's scheduled walk-ins or unassigned room
  const waitlist = useMemo(() => {
    const t = today();
    return sorted.filter((a) => a.date === t && a.status === 'Scheduled' && (!a.room || a.bookingType === 'Walk-in'));
  }, [sorted]);

  // Follow-up reminders
  const followUps = useMemo(() => {
    if (!db) return [];
    return db.appointments.filter((a) => a.followUpReminder && a.followUpDate && a.followUpDate >= today() && a.status === 'Completed');
  }, [db]);

  // Vet availability: count appointments per vet per date
  const vetLoad = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    sorted.forEach((a) => {
      if (a.status === 'Cancelled' || a.status === 'No-show') return;
      (map[a.date] ??= {})[a.vet] = (map[a.date]?.[a.vet] ?? 0) + 1;
    });
    return map;
  }, [sorted]);

  // Room allocation
  const roomAssignments = useMemo(() => {
    const t = today();
    return sorted.filter((a) => a.date === t && a.room).map((a) => ({ room: a.room!, appt: a }));
  }, [sorted]);

  const nextToken = useMemo(() => {
    const t = today();
    const todayAppts = sorted.filter((a) => a.date === t);
    return todayAppts.length > 0 ? Math.max(...todayAppts.map((a) => a.tokenNumber || 0)) + 1 : 1;
  }, [sorted]);

  const advanceStatus = (id: string) => {
    const a = db?.appointments.find((x) => x.id === id);
    if (!a) return;
    const next = statusFlow[a.status];
    if (next) update('appointments', id, { status: next });
  };

  const cancelAppt = (id: string) => update('appointments', id, { status: 'Cancelled' as const });
  const noShowAppt = (id: string) => update('appointments', id, { status: 'No-show' as const });

  const rescheduleAppt = (id: string, date: string, time: string) => {
    update('appointments', id, { status: 'Rescheduled' as const, date, time });
  };

  const deleteAppt = (id: string) => remove('appointments', id);

  const assignRoom = (id: string, room: string) => update('appointments', id, { room });

  const openEdit = (a: Appointment) => {
    setEditAppt(a);
    setForm({
      petId: a.petId, vet: a.vet, service: a.service, date: a.date, time: a.time, reason: a.reason,
      durationMin: String(a.durationMin), bookingType: a.bookingType ?? 'Online', room: a.room ?? '',
      isRecurring: a.isRecurring ?? false, recurrencePattern: a.recurrencePattern ?? 'None',
      followUpDate: a.followUpDate ?? '', followUpReminder: a.followUpReminder ?? false, notes: a.notes ?? '',
    });
    setOpen(true);
  };

  const openNew = (presetDate?: string, presetType?: Appointment['bookingType']) => {
    setEditAppt(null);
    setForm({
      petId: '', vet: vets[0] ?? '', service: presetType === 'Emergency' ? 'Emergency' : presetType === 'Walk-in' ? 'Walk-in' : services[0],
      date: presetDate ?? today(), time: '09:00', reason: '', durationMin: '30',
      bookingType: presetType ?? 'Online', room: '', isRecurring: false, recurrencePattern: 'None',
      followUpDate: '', followUpReminder: false, notes: '',
    });
    setOpen(true);
  };

  const saveAppt = () => {
    const pet = db?.pets.find((p) => p.id === form.petId);
    if (!pet) return;
    const t = form.date === today() ? nextToken : 1;
    if (editAppt) {
      update('appointments', editAppt.id, {
        petId: pet.id, ownerId: pet.ownerId, vet: form.vet, service: form.service, date: form.date,
        time: form.time, reason: form.reason, durationMin: parseInt(form.durationMin) || 30,
        bookingType: form.bookingType, room: form.room, isRecurring: form.isRecurring,
        recurrencePattern: form.recurrencePattern, followUpDate: form.followUpDate,
        followUpReminder: form.followUpReminder, notes: form.notes,
      });
    } else {
      create('appointments', {
        id: newId('apt'), petId: pet.id, ownerId: pet.ownerId, vet: form.vet, service: form.service,
        date: form.date, time: form.time, durationMin: parseInt(form.durationMin) || 30,
        status: form.bookingType === 'Emergency' ? 'Checked-in' : 'Scheduled',
        reason: form.reason, bookingType: form.bookingType, tokenNumber: t,
        queuePosition: 0, isRecurring: form.isRecurring, recurrencePattern: form.recurrencePattern,
        followUpDate: form.followUpDate, followUpReminder: form.followUpReminder, notes: form.notes,
      });
    }
    setOpen(false);
    setEditAppt(null);
  };

  if (!db) return <Shell module="appointments" title="Appointments"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  return (
    <Shell title="Appointments" subtitle="Scheduling, queue management, and calendar">
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-line w-fit mb-5">
        {([
          { id: 'calendar' as TabId, label: 'Calendar', icon: CalendarDays },
          { id: 'queue' as TabId, label: 'Queue & Tokens', icon: ListOrdered },
          { id: 'waitlist' as TabId, label: 'Waitlist & Follow-ups', icon: Users },
        ]).map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors ${
              tab === tb.id ? 'bg-lilac text-plum' : 'text-ink/60 hover:bg-canvas'
            }`}
          >
            <tb.icon className="w-3.5 h-3.5" /> {tb.label}
            {tb.id === 'queue' && todayQueue.length > 0 && (
              <span className="ml-0.5 text-[10px] bg-plum text-white rounded-full px-1.5 py-0.5 font-semibold">{todayQueue.length}</span>
            )}
            {tb.id === 'waitlist' && (waitlist.length + followUps.length) > 0 && (
              <span className="ml-0.5 text-[10px] bg-coral text-white rounded-full px-1.5 py-0.5 font-semibold">{waitlist.length + followUps.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <>
          {/* View controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-line">
              {(['day', 'week', 'month'] as ViewMode[]).map((vm) => (
                <button
                  key={vm}
                  onClick={() => setViewMode(vm)}
                  className={`px-3 h-8 rounded-md text-xs font-medium capitalize transition-colors ${
                    viewMode === vm ? 'bg-lilac text-plum' : 'text-ink/60 hover:bg-canvas'
                  }`}
                >
                  {vm}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-white border border-line">
              <button onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30))} className="text-ink/50 hover:text-ink">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-ink min-w-[140px] text-center">
                {viewMode === 'day' && new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {viewMode === 'week' && `${fmtDate(startOfWeek(currentDate))} — ${fmtDate(addDays(startOfWeek(currentDate), 6))}`}
                {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              </span>
              <button onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30))} className="text-ink/50 hover:text-ink">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="ml-1 text-[11px] text-plum font-medium hover:underline">Today</button>
            </div>
            <div className="flex-1" />
            <AISuggestionButton onClick={() => { const a = db?.appointments[0]; const p = a ? db?.pets.find(pt => pt.id === a.petId) : undefined; const o = a ? db?.owners.find(ow => ow.id === a.ownerId) : undefined; if (a && p && o) setAiSuggestion(generateAppointmentSummary(a, p, o)); }} label="AI Summary" />
            <Button onClick={() => openNew()}><Plus className="w-4 h-4" /> Book</Button>
            <Button variant="outline" onClick={() => openNew(today(), 'Walk-in')}><Footprints className="w-4 h-4" /> Walk-in</Button>
            <Button variant="danger" onClick={() => openNew(today(), 'Emergency')}><AlertTriangle className="w-4 h-4" /> Emergency</Button>
          </div>

          {/* Vet availability bar */}
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            <span className="text-[11px] text-ink/50 font-medium">Vet availability today:</span>
            {vets.map((v) => {
              const load = vetLoad[today()]?.[v] ?? 0;
              return (
                <div key={v} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-ink/70 font-medium">{v}</span>
                  <div className="w-20 h-2 rounded-full bg-canvas overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${load >= 8 ? 'bg-coral' : load >= 5 ? 'bg-amber-500' : 'bg-plum'}`} style={{ width: `${Math.min(load * 12.5, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-ink/50">{load} appts</span>
                </div>
              );
            })}
          </div>

          {/* Day view */}
          {viewMode === 'day' && <DayView date={fmtDate(currentDate)} appts={byDate[fmtDate(currentDate)] ?? []} petName={petName} ownerName={ownerName} onDetail={setDetailAppt} onAdvance={advanceStatus} onCancel={cancelAppt} onEdit={openEdit} onDelete={deleteAppt} />}

          {/* Week view */}
          {viewMode === 'week' && <WeekView weekStart={startOfWeek(currentDate)} byDate={byDate} petName={petName} onDetail={setDetailAppt} onBook={(d: string) => openNew(d)} />}

          {/* Month view */}
          {viewMode === 'month' && <MonthView current={currentDate} byDate={byDate} onDayClick={(d: string) => { setCurrentDate(new Date(d + 'T00:00:00')); setViewMode('day'); }} />}
        </>
      )}

      {/* Queue tab */}
      {tab === 'queue' && (
        <div className="space-y-5">
          {/* Active queue */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-plum" />
                <span className="text-sm font-semibold text-ink">Active Queue — Today</span>
              </div>
              <span className="text-[11px] text-ink/50">{todayQueue.length} in queue</span>
            </div>
            {todayQueue.length === 0 ? (
              <EmptyState icon={ListOrdered} title="Queue is empty" hint="Checked-in patients will appear here." />
            ) : (
              <div className="space-y-2">
                {todayQueue.map((a, i) => {
                  const BTIcon = bookingTypeIcon[a.bookingType] || Globe;
                  return (
                    <div key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 ${a.status === 'In consultation' ? 'border-coral/30 bg-coral/5' : 'border-line bg-white'}`}>
                      <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center text-sm font-bold shrink-0">
                        {a.tokenNumber || i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{petName(a.petId)}</span>
                          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${bookingTypeColor[a.bookingType] || 'bg-ink/10 text-ink/60'}`}>
                            <BTIcon className="w-2.5 h-2.5" /> {a.bookingType}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink/50">{a.service} · {a.vet} · {a.reason}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge status={a.status} />
                        {a.room && <div className="text-[10px] text-ink/40 mt-1">{a.room}</div>}
                      </div>
                      {a.status === 'Checked-in' && (
                        <Button size="sm" variant="outline" onClick={() => advanceStatus(a.id)}>
                          <Stethoscope className="w-3.5 h-3.5" /> Start
                        </Button>
                      )}
                      {a.status === 'In consultation' && (
                        <Button size="sm" onClick={() => advanceStatus(a.id)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Room allocation */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen className="w-4 h-4 text-plum" />
              <span className="text-sm font-semibold text-ink">Room Allocation — Today</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const assigned = roomAssignments.filter((r) => r.room === room);
                const active = assigned.find((r) => r.appt.status === 'In consultation');
                return (
                  <div key={room} className={`rounded-xl border p-3 ${active ? 'border-coral/30 bg-coral/5' : assigned.length > 0 ? 'border-plum/20 bg-lilac/20' : 'border-line bg-canvas'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-ink">{room}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${active ? 'bg-coral/15 text-coral' : assigned.length > 0 ? 'bg-lilac text-plum' : 'bg-ink/10 text-ink/40'}`}>
                        {active ? 'In use' : assigned.length > 0 ? 'Booked' : 'Free'}
                      </span>
                    </div>
                    {assigned.length > 0 ? (
                      <div className="text-[10px] text-ink/60">
                        {assigned.map((r) => petName(r.appt.petId)).join(', ')}
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink/40">Available</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Token system summary */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <ListOrdered className="w-4 h-4 text-plum" />
              <span className="text-sm font-semibold text-ink">Token System — Today</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl bg-canvas p-3 text-center">
                <div className="text-lg font-semibold text-ink">{nextToken}</div>
                <div className="text-[10px] text-ink/50">Next token</div>
              </div>
              <div className="rounded-xl bg-canvas p-3 text-center">
                <div className="text-lg font-semibold text-ink">{sorted.filter((a) => a.date === today()).length}</div>
                <div className="text-[10px] text-ink/50">Total today</div>
              </div>
              <div className="rounded-xl bg-canvas p-3 text-center">
                <div className="text-lg font-semibold text-plum">{sorted.filter((a) => a.date === today() && a.status === 'Completed').length}</div>
                <div className="text-[10px] text-ink/50">Completed</div>
              </div>
              <div className="rounded-xl bg-canvas p-3 text-center">
                <div className="text-lg font-semibold text-coral">{sorted.filter((a) => a.date === today() && a.status === 'Cancelled').length}</div>
                <div className="text-[10px] text-ink/50">Cancelled</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Waitlist tab */}
      {tab === 'waitlist' && (
        <div className="space-y-5">
          {/* Waitlist */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-ink">Waitlist — Today</span>
              </div>
              <span className="text-[11px] text-ink/50">{waitlist.length} waiting</span>
            </div>
            {waitlist.length === 0 ? (
              <EmptyState icon={Users} title="No one on the waitlist" hint="Scheduled appointments without a room or walk-ins will appear here." />
            ) : (
              <div className="space-y-2">
                {waitlist.map((a, i) => {
                  const BTIcon = bookingTypeIcon[a.bookingType] || Globe;
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ink">{petName(a.petId)}</span>
                          <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${bookingTypeColor[a.bookingType] || 'bg-ink/10 text-ink/60'}`}>
                            <BTIcon className="w-2.5 h-2.5" /> {a.bookingType}
                          </span>
                        </div>
                        <div className="text-[11px] text-ink/50">{a.time} · {a.service} · {a.vet} · {a.reason}</div>
                      </div>
                      {!a.room && (
                        <Select value="" onChange={(e) => e.target.value && assignRoom(a.id, e.target.value)} className="w-32 h-8 text-xs">
                          <option value="">Assign room…</option>
                          {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                        </Select>
                      )}
                      <Button size="sm" variant="outline" onClick={() => advanceStatus(a.id)}>
                        <UserCheck className="w-3.5 h-3.5" /> Check in
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Follow-up reminders */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-plum" />
              <span className="text-sm font-semibold text-ink">Follow-up Reminders</span>
            </div>
            {followUps.length === 0 ? (
              <EmptyState icon={Bell} title="No follow-up reminders" hint="Completed appointments with follow-up dates will appear here." />
            ) : (
              <div className="space-y-2">
                {followUps.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-plum/20 bg-lilac/20 p-3">
                    <Bell className="w-4 h-4 text-plum shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{petName(a.petId)} — Follow-up due {a.followUpDate}</div>
                      <div className="text-[11px] text-ink/50">{a.service} · {a.vet} · {a.notes}</div>
                    </div>
                    <Button size="sm" onClick={() => openNew(a.followUpDate)}>
                      <Plus className="w-3.5 h-3.5" /> Book follow-up
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {aiSuggestion && (
        <div className="mb-4">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      {/* Book / Edit modal */}
      <Modal open={open} onClose={() => { setOpen(false); setEditAppt(null); }} title={editAppt ? 'Edit appointment' : 'Book an appointment'}>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['Online', 'Walk-in', 'Emergency'] as const).map((bt) => {
              const BTIcon = bookingTypeIcon[bt] || Globe;
              return (
                <button
                  key={bt}
                  onClick={() => set('bookingType', bt)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                    form.bookingType === bt ? `border-2 ${bt === 'Emergency' ? 'border-coral bg-coral/5' : bt === 'Walk-in' ? 'border-amber-500 bg-amber-50' : 'border-sky-500 bg-sky-50'}` : 'border-line bg-white hover:bg-canvas'
                  }`}
                >
                  <BTIcon className={`w-4 h-4 ${bt === 'Emergency' ? 'text-coral' : bt === 'Walk-in' ? 'text-amber-600' : 'text-sky-600'}`} />
                  <span className="text-[11px] font-medium text-ink">{bt}</span>
                </button>
              );
            })}
          </div>
          <Field label="Patient">
            <Select value={form.petId} onChange={(e) => set('petId', e.target.value)}>
              <option value="">Select a pet…</option>
              {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({ownerName(p.ownerId)})</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service">
              <Select value={form.service} onChange={(e) => set('service', e.target.value)}>
                {services.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Veterinarian">
              <Select value={form.vet} onChange={(e) => set('vet', e.target.value)}>
                {vets.map((v) => <option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Date"><DateInput value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Time">
              <Select value={form.time} onChange={(e) => set('time', e.target.value)}>
                {times.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Duration (min)"><NumberInput value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)} placeholder="30" /></Field>
            <Field label="Room">
              <Select value={form.room} onChange={(e) => set('room', e.target.value)}>
                <option value="">Not assigned</option>
                {rooms.map((r) => <option key={r}>{r}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Reason"><Input value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Annual wellness + vaccine" /></Field>
          <div className="border-t border-line pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Recurrence">
                <Select value={form.recurrencePattern} onChange={(e) => set('recurrencePattern', e.target.value)} disabled={!form.isRecurring}>
                  {recurrencePatterns.map((r) => <option key={r}>{r}</option>)}
                </Select>
              </Field>
              <Field label="Follow-up date"><DateInput value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} /></Field>
            </div>
            <div className="flex items-center gap-4">
              <Checkbox checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} label="Recurring appointment" />
              <Checkbox checked={form.followUpReminder} onChange={(e) => set('followUpReminder', e.target.checked)} label="Follow-up reminder" />
            </div>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Additional notes…" className="min-h-[60px]" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditAppt(null); }}>Cancel</Button>
            <Button onClick={saveAppt}><Stethoscope className="w-4 h-4" /> {editAppt ? 'Save changes' : 'Book'}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailAppt} onClose={() => setDetailAppt(null)} title="Appointment details">
        {detailAppt && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-ink">{petName(detailAppt.petId)} · {detailAppt.service}</div>
                <div className="text-xs text-ink/50 mt-0.5">{detailAppt.date} at {detailAppt.time} · {detailAppt.durationMin}min</div>
              </div>
              <Badge status={detailAppt.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Owner</div>
                <div className="text-ink font-medium">{ownerName(detailAppt.ownerId)}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Veterinarian</div>
                <div className="text-ink font-medium">{detailAppt.vet}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Room</div>
                <div className="text-ink font-medium">{detailAppt.room || 'Not assigned'}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Booking type</div>
                <div className="text-ink font-medium">{detailAppt.bookingType}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Token #</div>
                <div className="text-ink font-medium">{detailAppt.tokenNumber || '—'}</div>
              </div>
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Recurring</div>
                <div className="text-ink font-medium">{detailAppt.isRecurring ? detailAppt.recurrencePattern : 'No'}</div>
              </div>
            </div>
            {detailAppt.reason && (
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Reason</div>
                <div className="text-xs text-ink/70">{detailAppt.reason}</div>
              </div>
            )}
            {detailAppt.notes && (
              <div className="rounded-lg bg-canvas p-3">
                <div className="text-ink/40 uppercase tracking-wide text-[10px] mb-1">Notes</div>
                <div className="text-xs text-ink/70">{detailAppt.notes}</div>
              </div>
            )}
            {detailAppt.followUpDate && (
              <div className="rounded-lg bg-lilac/20 border border-plum/20 p-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-plum" />
                <span className="text-xs text-ink/70">Follow-up scheduled for {detailAppt.followUpDate}</span>
              </div>
            )}
            {petOf(detailAppt.petId) && (
              <div className="rounded-lg border border-line p-3">
                <div className="text-[10px] text-ink/40 uppercase tracking-wide mb-2">Patient info</div>
                <div className="text-xs text-ink/70 space-y-0.5">
                  <div><span className="text-ink/50">Species:</span> {petOf(detailAppt.petId)!.species} · {petOf(detailAppt.petId)!.breed}</div>
                  <div><span className="text-ink/50">Gender:</span> {petOf(detailAppt.petId)!.gender} · {petOf(detailAppt.petId)!.weightKg}kg</div>
                  {petOf(detailAppt.petId)!.allergies && petOf(detailAppt.petId)!.allergies !== 'None known' && (
                    <div className="text-coral font-medium">Allergies: {petOf(detailAppt.petId)!.allergies}</div>
                  )}
                  {petOf(detailAppt.petId)!.conditions && (
                    <div className="text-amber-600">{petOf(detailAppt.petId)!.conditions}</div>
                  )}
                </div>
              </div>
            )}
            {/* Workflow actions */}
            <div className="border-t border-line pt-3 space-y-2">
              <div className="flex items-center gap-1 text-[10px] text-ink/40 uppercase tracking-wide font-medium">
                <Activity className="w-3 h-3" /> Workflow
              </div>
              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                {['Scheduled', 'Checked-in', 'In consultation', 'Completed'].map((s, i) => {
                  const currentIdx = ['Scheduled', 'Checked-in', 'In consultation', 'Completed'].indexOf(detailAppt.status);
                  const isActive = i <= currentIdx && detailAppt.status !== 'Cancelled' && detailAppt.status !== 'No-show';
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/40'}`}>{s}</span>
                      {i < 3 && <ArrowRight className="w-3 h-3 text-ink/20" />}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Action buttons */}
            <div className="flex gap-2">
              {statusFlow[detailAppt.status] && (
                <Button onClick={() => { advanceStatus(detailAppt.id); setDetailAppt(null); }} className="flex-1">
                  {detailAppt.status === 'Scheduled' ? <UserCheck className="w-4 h-4" /> : detailAppt.status === 'Checked-in' ? <Stethoscope className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {statusActionLabel[detailAppt.status]}
                </Button>
              )}
              {detailAppt.status !== 'Completed' && detailAppt.status !== 'Cancelled' && (
                <>
                  <Button variant="outline" onClick={() => { openEdit(detailAppt); setDetailAppt(null); }}>
                    <Edit2 className="w-4 h-4" /> Reschedule
                  </Button>
                  <Button variant="danger" onClick={() => { cancelAppt(detailAppt.id); setDetailAppt(null); }}>
                    <XCircle className="w-4 h-4" /> Cancel
                  </Button>
                </>
              )}
              {detailAppt.status === 'Scheduled' && (
                <Button variant="ghost" onClick={() => { noShowAppt(detailAppt.id); setDetailAppt(null); }}>
                  <XCircle className="w-4 h-4" /> No-show
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}

/* ---------- Day View ---------- */
function DayView({ date, appts, petName, ownerName, onDetail, onAdvance, onCancel, onEdit, onDelete }: {
  date: string; appts: Appointment[];
  petName: (id: string) => string; ownerName: (id: string) => string;
  onDetail: (a: Appointment) => void; onAdvance: (id: string) => void; onCancel: (id: string) => void;
  onEdit: (a: Appointment) => void; onDelete: (id: string) => void;
}) {
  if (appts.length === 0) {
    return <Card><EmptyState icon={CalendarDays} title="No appointments" hint="Book an appointment for this day." /></Card>;
  }
  return (
    <Card className="divide-y divide-line">
      {appts.map((a) => {
        const next = statusFlow[a.status];
        const actionLabel = statusActionLabel[a.status];
        const BTIcon = bookingTypeIcon[a.bookingType] || Globe;
        return (
          <div key={a.id} className="flex items-center gap-4 px-4 py-3 group">
            <button onClick={() => onDetail(a)} className="flex flex-col items-center w-14 shrink-0 text-left">
              <Clock className="w-3.5 h-3.5 text-ink/40" />
              <span className="text-sm font-semibold text-ink mt-0.5">{a.time}</span>
              <span className="text-[10px] text-ink/40">{a.durationMin}min</span>
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onDetail(a)}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{petName(a.petId)} · {a.service}</span>
                <span className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${bookingTypeColor[a.bookingType] || 'bg-ink/10 text-ink/60'}`}>
                  <BTIcon className="w-2.5 h-2.5" /> {a.bookingType}
                </span>
                {a.isRecurring && <Repeat className="w-3 h-3 text-plum" />}
                {a.followUpReminder && <Bell className="w-3 h-3 text-amber-500" />}
              </div>
              <div className="text-[11px] text-ink/50">{ownerName(a.ownerId)} · {a.vet} · {a.reason}</div>
            </div>
            {a.room && <span className="hidden md:inline text-[11px] text-ink/40">{a.room}</span>}
            {a.tokenNumber > 0 && <span className="hidden md:inline text-[10px] text-ink/40 font-mono">#{a.tokenNumber}</span>}
            <Badge status={a.status} />
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {next && actionLabel && (
                <Button size="sm" variant="outline" onClick={() => onAdvance(a.id)}>
                  {a.status === 'Scheduled' ? <UserCheck className="w-3.5 h-3.5" /> : a.status === 'Checked-in' ? <Stethoscope className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {actionLabel}
                </Button>
              )}
              {a.status !== 'Completed' && a.status !== 'Cancelled' && (
                <button onClick={() => onCancel(a.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Cancel">
                  <XCircle className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => onEdit(a)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(a.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/* ---------- Week View ---------- */
function WeekView({ weekStart, byDate, petName, onDetail, onBook }: {
  weekStart: Date; byDate: Record<string, Appointment[]>;
  petName: (id: string) => string; onDetail: (a: Appointment) => void; onBook: (date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
      {days.map((d) => {
        const dateStr = fmtDate(d);
        const appts = byDate[dateStr] ?? [];
        const isToday = dateStr === today();
        return (
          <div key={dateStr} className={`rounded-xl border ${isToday ? 'border-plum/30 bg-lilac/10' : 'border-line bg-white'} min-h-[180px] overflow-hidden`}>
            <div className={`px-3 py-2 border-b ${isToday ? 'border-plum/20' : 'border-line'} flex items-center justify-between`}>
              <div>
                <div className="text-[10px] text-ink/50 uppercase font-medium">{dayNames[d.getDay()]}</div>
                <div className={`text-sm font-semibold ${isToday ? 'text-plum' : 'text-ink'}`}>{d.getDate()}</div>
              </div>
              {appts.length === 0 && (
                <button onClick={() => onBook(dateStr)} className="w-6 h-6 rounded-lg hover:bg-lilac text-ink/30 hover:text-plum flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="p-1.5 space-y-1 max-h-[200px] overflow-y-auto">
              {appts.map((a) => {
                const BTIcon = bookingTypeIcon[a.bookingType] || Globe;
                return (
                  <button
                    key={a.id}
                    onClick={() => onDetail(a)}
                    className={`w-full text-left rounded-lg p-1.5 text-[10px] transition-all hover:ring-2 hover:ring-plum/20 ${
                      a.status === 'Cancelled' ? 'bg-ink/5 opacity-50' :
                      a.status === 'Completed' ? 'bg-lilac/30' :
                      a.status === 'In consultation' ? 'bg-coral/10' :
                      a.bookingType === 'Emergency' ? 'bg-coral/10' :
                      a.bookingType === 'Walk-in' ? 'bg-amber-50' : 'bg-sky-50'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-ink">{a.time}</span>
                      <BTIcon className="w-2.5 h-2.5 text-ink/40" />
                    </div>
                    <div className="text-ink/70 truncate">{petName(a.petId)} · {a.service}</div>
                    <div className="text-ink/40 truncate">{a.vet}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Month View ---------- */
function MonthView({ current, byDate, onDayClick }: {
  current: Date; byDate: Record<string, Appointment[]>;
  onDayClick: (date: string) => void;
}) {
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = firstDay.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-line bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {dayNames.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[10px] font-semibold text-ink/50 uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="min-h-[80px] border-r border-b border-line bg-canvas/50" />;
          const dateStr = fmtDate(d);
          const appts = byDate[dateStr] ?? [];
          const isToday = dateStr === today();
          return (
            <button
              key={i}
              onClick={() => onDayClick(dateStr)}
              className={`min-h-[80px] border-r border-b border-line p-1.5 text-left transition-colors hover:bg-lilac/10 ${isToday ? 'bg-lilac/20' : 'bg-white'}`}
            >
              <div className={`text-xs font-medium ${isToday ? 'text-plum' : 'text-ink/70'}`}>{d.getDate()}</div>
              <div className="mt-1 space-y-0.5">
                {appts.slice(0, 3).map((a) => (
                  <div key={a.id} className={`text-[9px] rounded px-1 py-0.5 truncate ${
                    a.status === 'Completed' ? 'bg-lilac/30 text-plum' :
                    a.status === 'Cancelled' ? 'bg-ink/5 text-ink/40' :
                    a.bookingType === 'Emergency' ? 'bg-coral/10 text-coral' :
                    'bg-sky-50 text-sky-700'
                  }`}>
                    {a.time} {a.service}
                  </div>
                ))}
                {appts.length > 3 && <div className="text-[9px] text-ink/40 px-1">+{appts.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
