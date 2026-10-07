'use client';

import { useMemo, useState } from 'react';
import {
  Hotel, Plus, LogIn, LogOut, Utensils, Edit2, Trash2, Eye, Search,
  Pill, Footprints, Stethoscope, Camera, ClipboardList, X, CheckCircle2,
  Clock, DollarSign, Bed, Cat, Dog, PawPrint, Activity, Calendar,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Badge, Button, EmptyState, Modal, Field, inputCls, Select, DateInput,
  Textarea, NumberInput, StatCard,
} from '../components/ui';
import {
  useDB, BoardingPet, FeedingScheduleItem, MedicationScheduleItem,
  WalkingScheduleItem, HealthCheck, CareNote,
  newId, today,
} from '../lib/store';

const allRooms: { name: string; type: string; capacity: number }[] = [
  { name: 'Suite 1', type: 'Dog', capacity: 1 },
  { name: 'Suite 2', type: 'Dog', capacity: 1 },
  { name: 'Suite 3', type: 'Dog', capacity: 1 },
  { name: 'Cattery A', type: 'Cat', capacity: 4 },
  { name: 'Cattery B', type: 'Cat', capacity: 4 },
  { name: 'Small Animal Ward', type: 'Small', capacity: 6 },
];

const speciesIcons: Record<string, typeof Dog> = { Dog: Dog, Cat: Cat };

type Tab = 'active' | 'rooms' | 'discharged';

const blankForm = () => ({
  boardingNumber: '', petName: '', owner: '', ownerId: '', petId: '', species: 'Dog', breed: '',
  room: allRooms[0].name, cage: '', checkIn: today(), checkOut: '',
  feedingNotes: '', specialNeeds: '', dietaryRestrictions: '',
  emergencyContact: '', vetOnCall: '', dailyRate: 45, additionalServices: 0,
  discount: 0, tax: 0, paymentMethod: '' as BoardingPet['paymentMethod'],
  paymentStatus: '' as BoardingPet['paymentStatus'],
});

export default function BoardingPage() {
  const { db, create, update, remove } = useDB();
  const [tab, setTab] = useState<Tab>('active');
  const [open, setOpen] = useState(false);
  const [editPet, setEditPet] = useState<BoardingPet | null>(null);
  const [form, setForm] = useState(blankForm());
  const [search, setSearch] = useState('');
  const [detailPet, setDetailPet] = useState<BoardingPet | null>(null);
  const [careNoteText, setCareNoteText] = useState('');

  const boarding = db?.boarding ?? [];
  const active = boarding.filter((b) => b.status === 'Checked-in');
  const discharged = boarding.filter((b) => b.status === 'Discharged').sort((a, b) => (b.actualCheckOut || b.checkOut).localeCompare(a.actualCheckOut || a.checkOut));
  const dischargedFiltered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return discharged;
    return discharged.filter((b) =>
      b.petName.toLowerCase().includes(q) ||
      b.owner.toLowerCase().includes(q) ||
      b.room.toLowerCase().includes(q) ||
      (b.boardingNumber || '').toLowerCase().includes(q),
    );
  }, [discharged, search]);

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  if (!db) return <Shell title="Boarding"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  // Occupancy
  const occupiedRooms = new Set(active.map((b) => b.room));
  const occupancyRate = allRooms.length > 0 ? Math.round((occupiedRooms.size / allRooms.length) * 100) : 0;

  // Revenue
  const completedBoarding = db.boarding.filter((b) => b.status === 'Discharged' && b.paymentStatus === 'Paid');
  const totalRevenue = completedBoarding.reduce((s, b) => s + (b.total || 0), 0);
  const pendingRevenue = active.reduce((s, b) => s + (b.total || 0), 0);

  // ── Form helpers ──
  const calcTotal = (checkIn: string, checkOut: string, dailyRate: number, additional: number, discount: number, tax: number) => {
    if (!checkIn || !checkOut) return Math.max(0, additional - discount + tax);
    const days = Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)));
    return Math.max(0, days * dailyRate + additional - discount + tax);
  };

  const openNew = () => {
    setEditPet(null);
    setForm({ ...blankForm(), boardingNumber: `BRD-${String((db.boarding.length || 0) + 1).padStart(4, '0')}` });
    setOpen(true);
  };

  const openEdit = (b: BoardingPet) => {
    setEditPet(b);
    setForm({
      boardingNumber: b.boardingNumber, petName: b.petName, owner: b.owner, ownerId: b.ownerId || '', petId: b.petId || '', species: b.species || 'Dog', breed: b.breed || '',
      room: b.room, cage: b.cage || '', checkIn: b.checkIn, checkOut: b.checkOut,
      feedingNotes: b.feedingNotes, specialNeeds: b.specialNeeds || '', dietaryRestrictions: b.dietaryRestrictions || '',
      emergencyContact: b.emergencyContact || '', vetOnCall: b.vetOnCall || '',
      dailyRate: b.dailyRate || 45, additionalServices: b.additionalServices || 0, discount: b.discount || 0, tax: b.tax || 0,
      paymentMethod: b.paymentMethod, paymentStatus: b.paymentStatus,
    });
    setOpen(true);
  };

  const saveBoard = () => {
    if (!form.petName) return;
    const total = calcTotal(form.checkIn, form.checkOut, form.dailyRate, form.additionalServices, form.discount, form.tax);
    const data = { ...form, total, createdAt: editPet?.createdAt || today() };
    if (editPet) {
      update('boarding', editPet.id, data);
    } else {
      create('boarding', {
        id: newId('brd'), ...data, status: 'Checked-in', actualCheckOut: '', dischargeNotes: '',
        feedingSchedule: [], medicationSchedule: [], walkingSchedule: [], healthChecks: [], dailyPhotos: [], careNotes: [],
      } as BoardingPet);
    }
    setOpen(false);
    setEditPet(null);
  };

  const discharge = (b: BoardingPet) => {
    update('boarding', b.id, { status: 'Discharged', actualCheckOut: today() });
  };

  const deleteBoard = (id: string) => remove('boarding', id);

  // ── Schedule toggle helpers ──
  const toggleScheduleItem = (b: BoardingPet, scheduleKey: 'feedingSchedule' | 'medicationSchedule' | 'walkingSchedule', itemId: string) => {
    const schedule = b[scheduleKey] || [];
    const updated = schedule.map((s) => s.id === itemId ? { ...s, done: !s.done } : s);
    update('boarding', b.id, { [scheduleKey]: updated } as Partial<BoardingPet>);
  };

  const addScheduleItem = (b: BoardingPet, scheduleKey: 'feedingSchedule' | 'medicationSchedule' | 'walkingSchedule', item: FeedingScheduleItem | MedicationScheduleItem | WalkingScheduleItem) => {
    const schedule = b[scheduleKey] || [];
    update('boarding', b.id, { [scheduleKey]: [...schedule, item] } as Partial<BoardingPet>);
  };

  const removeScheduleItem = (b: BoardingPet, scheduleKey: 'feedingSchedule' | 'medicationSchedule' | 'walkingSchedule', itemId: string) => {
    const schedule = b[scheduleKey] || [];
    update('boarding', b.id, { [scheduleKey]: schedule.filter((s) => s.id !== itemId) } as Partial<BoardingPet>);
  };

  const addHealthCheck = (b: BoardingPet, hc: HealthCheck) => {
    update('boarding', b.id, { healthChecks: [...(b.healthChecks || []), hc] } as Partial<BoardingPet>);
  };

  const addCareNote = (b: BoardingPet, note: string) => {
    if (!note.trim()) return;
    const cn: CareNote = { id: newId('cn'), date: today(), time: new Date().toTimeString().slice(0, 5), note: note.trim(), staff: 'Staff' };
    update('boarding', b.id, { careNotes: [...(b.careNotes || []), cn] } as Partial<BoardingPet>);
    setCareNoteText('');
  };

  const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Tab button ──
  const tabBtn = (t: Tab, label: string, Icon: typeof Hotel) => (
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

  // ── Schedule progress ──
  const scheduleProgress = (schedule: { done: boolean }[]) => {
    if (!schedule || schedule.length === 0) return 0;
    return Math.round((schedule.filter((s) => s.done).length / schedule.length) * 100);
  };

  // ── Active boarding card ──
  const renderActiveCard = (b: BoardingPet) => {
    const feedPct = scheduleProgress(b.feedingSchedule || []);
    const medPct = scheduleProgress(b.medicationSchedule || []);
    const walkPct = scheduleProgress(b.walkingSchedule || []);
    const SpeciesIcon = speciesIcons[b.species] || PawPrint;

    return (
      <Card key={b.id} className="p-4 group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-mint text-sage flex items-center justify-center">
              <SpeciesIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{b.petName}</div>
              <div className="text-[11px] text-ink/50">{b.owner} · {b.room}{b.cage ? ` · Cage ${b.cage}` : ''}</div>
              <div className="text-[10px] text-ink/40">{b.boardingNumber || '—'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge status={b.status} />
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setDetailPet(b)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Details">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteBoard(b.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-ink/60">
            <LogIn className="w-3.5 h-3.5 text-ink/40" /> In: {b.checkIn}
          </div>
          <div className="flex items-center gap-1.5 text-ink/60">
            <LogOut className="w-3.5 h-3.5 text-ink/40" /> Out: {b.checkOut || '—'}
          </div>
        </div>

        {/* Schedule progress bars */}
        <div className="space-y-1.5 mb-3">
          {(b.feedingSchedule && b.feedingSchedule.length > 0) && (
            <div className="flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-sage shrink-0" />
              <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${feedPct}%` }} />
              </div>
              <span className="text-[10px] text-ink/50 w-8 text-right">{feedPct}%</span>
            </div>
          )}
          {(b.medicationSchedule && b.medicationSchedule.length > 0) && (
            <div className="flex items-center gap-2">
              <Pill className="w-3.5 h-3.5 text-coral shrink-0" />
              <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-coral rounded-full transition-all" style={{ width: `${medPct}%` }} />
              </div>
              <span className="text-[10px] text-ink/50 w-8 text-right">{medPct}%</span>
            </div>
          )}
          {(b.walkingSchedule && b.walkingSchedule.length > 0) && (
            <div className="flex items-center gap-2">
              <Footprints className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${walkPct}%` }} />
              </div>
              <span className="text-[10px] text-ink/50 w-8 text-right">{walkPct}%</span>
            </div>
          )}
        </div>

        {b.specialNeeds && (
          <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {b.specialNeeds}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">{fmtMoney(b.total || 0)}</span>
          <Button variant="outline" size="sm" onClick={() => discharge(b)}>
            <LogOut className="w-3.5 h-3.5" /> Discharge
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <Shell title="Boarding" subtitle="In-house boarding, care schedules, and occupancy tracking">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Boarding Management</h1>
            <p className="text-sm text-ink/50 mt-0.5">Track stays, feeding, medication, walks, and health checks</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4" /> Check in Pet</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Hotel} label="Currently Boarding" value={active.length} sub="pets in-house" tone="sage" />
          <StatCard icon={Bed} label="Occupancy" value={`${occupancyRate}%`} sub={`${occupiedRooms.size}/${allRooms.length} rooms`} tone="sky" />
          <StatCard icon={DollarSign} label="Revenue (Paid)" value={fmtMoney(totalRevenue)} sub={`${completedBoarding.length} stays`} tone="amber" />
          <StatCard icon={Clock} label="Pending Revenue" value={fmtMoney(pendingRevenue)} sub={`${active.length} active stays`} tone="coral" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 p-1 bg-canvas rounded-xl border border-line w-fit">
          {tabBtn('active', 'Active Stays', Hotel)}
          {tabBtn('rooms', 'Rooms & Cages', Bed)}
          {tabBtn('discharged', 'Discharge History', ClipboardList)}
        </div>

        {/* ── Active Tab ── */}
        {tab === 'active' && (
          active.length === 0 ? (
            <Card><EmptyState icon={Hotel} title="No pets boarding" hint="Check in a pet to start tracking care." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map(renderActiveCard)}
            </div>
          )
        )}

        {/* ── Rooms Tab ── */}
        {tab === 'rooms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRooms.map((room) => {
              const occupants = active.filter((b) => b.room === room.name);
              const isOccupied = occupants.length > 0;
              return (
                <Card key={room.name} className={`p-4 ${isOccupied ? 'border-sage/30' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isOccupied ? 'bg-mint text-sage' : 'bg-canvas text-ink/40'}`}>
                        <Bed className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{room.name}</div>
                        <div className="text-[11px] text-ink/50">{room.type} · Cap {room.capacity}</div>
                      </div>
                    </div>
                    <Badge status={isOccupied ? 'Checked-in' : 'Available'} />
                  </div>
                  {isOccupied ? (
                    <div className="space-y-2">
                      {occupants.map((b) => {
                        const SpeciesIcon = speciesIcons[b.species] || PawPrint;
                        return (
                          <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-canvas">
                            <SpeciesIcon className="w-4 h-4 text-sage shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-ink truncate">{b.petName}</div>
                              <div className="text-[10px] text-ink/50">{b.owner} · {b.checkIn} → {b.checkOut || '—'}</div>
                            </div>
                            <button onClick={() => setDetailPet(b)} className="text-ink/40 hover:text-sage transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-ink/40">Available</div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Discharged Tab ── */}
        {tab === 'discharged' && (
          <Card className="p-4">
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by pet, owner, room, boarding #…"
                className={`${inputCls} pl-9 max-w-md`}
              />
            </div>
            {dischargedFiltered.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No discharge records" hint="Discharged pets will appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
                      <th className="py-2.5 pr-4 font-semibold">Boarding #</th>
                      <th className="py-2.5 pr-4 font-semibold">Pet</th>
                      <th className="py-2.5 pr-4 font-semibold">Owner</th>
                      <th className="py-2.5 pr-4 font-semibold">Room</th>
                      <th className="py-2.5 pr-4 font-semibold">Check-in</th>
                      <th className="py-2.5 pr-4 font-semibold">Check-out</th>
                      <th className="py-2.5 pr-4 font-semibold text-right">Total</th>
                      <th className="py-2.5 pr-4 font-semibold">Payment</th>
                      <th className="py-2.5 pr-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dischargedFiltered.map((b) => (
                      <tr key={b.id} className="border-b border-line/60 hover:bg-canvas/50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-ink/70">{b.boardingNumber || '—'}</td>
                        <td className="py-3 pr-4 font-medium text-ink">{b.petName}</td>
                        <td className="py-3 pr-4 text-ink/60">{b.owner}</td>
                        <td className="py-3 pr-4 text-ink/60">{b.room}</td>
                        <td className="py-3 pr-4 text-ink/60">{b.checkIn}</td>
                        <td className="py-3 pr-4 text-ink/60">{b.actualCheckOut || b.checkOut}</td>
                        <td className="py-3 pr-4 text-right font-medium text-ink">{fmtMoney(b.total || 0)}</td>
                        <td className="py-3 pr-4">
                          {b.paymentStatus ? <Badge status={b.paymentStatus} /> : <span className="text-ink/30 text-xs">—</span>}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setDetailPet(b)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-ink hover:bg-canvas transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteBoard(b.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
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

        {/* ── Check-in Modal ── */}
        <Modal open={open} onClose={() => { setOpen(false); setEditPet(null); }} title={editPet ? 'Edit boarding record' : 'Check in boarding pet'} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Boarding #"><input className={inputCls} value={form.boardingNumber} onChange={(e) => set('boardingNumber', e.target.value)} /></Field>
              <Field label="Species">
                <Select value={form.species} onChange={(e) => set('species', e.target.value)}>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Rabbit">Rabbit</option>
                  <option value="Bird">Bird</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Pet name"><input className={inputCls} value={form.petName} onChange={(e) => set('petName', e.target.value)} placeholder="Biscuit" /></Field>
              <Field label="Owner"><input className={inputCls} value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Eleanor Hayes" /></Field>
              <Field label="Breed"><input className={inputCls} value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Golden Retriever" /></Field>
              <Field label="Room">
                <Select value={form.room} onChange={(e) => set('room', e.target.value)}>
                  {allRooms.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.type})</option>)}
                </Select>
              </Field>
              <Field label="Cage (optional)"><input className={inputCls} value={form.cage} onChange={(e) => set('cage', e.target.value)} placeholder="A-1" /></Field>
              <Field label="Check-in date"><DateInput value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} /></Field>
              <Field label="Check-out date"><DateInput value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily rate ($)"><NumberInput value={String(form.dailyRate)} onChange={(e) => set('dailyRate', parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Additional services ($)"><NumberInput value={String(form.additionalServices)} onChange={(e) => set('additionalServices', parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Discount ($)"><NumberInput value={String(form.discount)} onChange={(e) => set('discount', parseFloat(e.target.value) || 0)} /></Field>
              <Field label="Tax ($)"><NumberInput value={String(form.tax)} onChange={(e) => set('tax', parseFloat(e.target.value) || 0)} /></Field>
            </div>

            <Field label="Feeding & care notes"><Textarea value={form.feedingNotes} onChange={(e) => set('feedingNotes', e.target.value)} placeholder="2x daily, joint supplement AM" /></Field>
            <Field label="Special needs"><Textarea value={form.specialNeeds} onChange={(e) => set('specialNeeds', e.target.value)} placeholder="Hip dysplasia - no jumping" /></Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Dietary restrictions"><input className={inputCls} value={form.dietaryRestrictions} onChange={(e) => set('dietaryRestrictions', e.target.value)} placeholder="No grain-free" /></Field>
              <Field label="Emergency contact"><input className={inputCls} value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Owner phone" /></Field>
              <Field label="Vet on call"><input className={inputCls} value={form.vetOnCall} onChange={(e) => set('vetOnCall', e.target.value)} placeholder="Dr. Rivera" /></Field>
              <Field label="Payment method">
                <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Insurance">Insurance</option>
                </Select>
              </Field>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-line">
              <span className="text-sm text-ink/60">Estimated total</span>
              <span className="text-lg font-bold text-ink">{fmtMoney(calcTotal(form.checkIn, form.checkOut, form.dailyRate, form.additionalServices, form.discount, form.tax))}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setOpen(false); setEditPet(null); }}>Cancel</Button>
              <Button onClick={saveBoard}>{editPet ? 'Save changes' : 'Check in'}</Button>
            </div>
          </div>
        </Modal>

        {/* ── Detail Modal ── */}
        <Modal open={!!detailPet} onClose={() => { setDetailPet(null); setCareNoteText(''); }} title="Boarding Details" wide>
          {detailPet && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink">{detailPet.petName} · {detailPet.boardingNumber || '—'}</div>
                  <div className="text-xs text-ink/50">{detailPet.owner} · {detailPet.species} {detailPet.breed ? `· ${detailPet.breed}` : ''}</div>
                  <div className="text-xs text-ink/50">{detailPet.room}{detailPet.cage ? ` · Cage ${detailPet.cage}` : ''}</div>
                </div>
                <Badge status={detailPet.status} />
              </div>

              {/* Stay info */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-ink/60"><LogIn className="w-3.5 h-3.5 text-ink/40" /> {detailPet.checkIn}</div>
                <div className="flex items-center gap-1.5 text-ink/60"><LogOut className="w-3.5 h-3.5 text-ink/40" /> {detailPet.actualCheckOut || detailPet.checkOut || '—'}</div>
                <div className="flex items-center gap-1.5 text-ink/60"><DollarSign className="w-3.5 h-3.5 text-ink/40" /> {fmtMoney(detailPet.total || 0)}</div>
              </div>

              {/* Special needs */}
              {detailPet.specialNeeds && (
                <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {detailPet.specialNeeds}
                </div>
              )}

              {/* Feeding Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="w-4 h-4 text-sage" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Feeding Schedule</span>
                </div>
                {(detailPet.feedingSchedule && detailPet.feedingSchedule.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.feedingSchedule.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-canvas">
                        <button
                          onClick={() => { toggleScheduleItem(detailPet, 'feedingSchedule', s.id); setDetailPet({ ...detailPet, feedingSchedule: detailPet.feedingSchedule.map((f) => f.id === s.id ? { ...f, done: !f.done } : f) }); }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${s.done ? 'bg-sage text-white' : 'border border-line text-ink/30'}`}
                        >
                          {s.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-mono text-ink/60 w-12">{s.time}</span>
                        <span className="text-sm text-ink flex-1">{s.food}</span>
                        <span className="text-xs text-ink/50">{s.amount}</span>
                        {detailPet.status === 'Checked-in' && (
                          <button onClick={() => { removeScheduleItem(detailPet, 'feedingSchedule', s.id); setDetailPet({ ...detailPet, feedingSchedule: detailPet.feedingSchedule.filter((f) => f.id !== s.id) }); }} className="text-ink/30 hover:text-coral transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 py-1">No feeding schedule set.</p>
                )}
                {detailPet.feedingNotes && <p className="text-xs text-ink/60 mt-1.5 italic">{detailPet.feedingNotes}</p>}
              </div>

              {/* Medication Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-coral" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Medication Schedule</span>
                </div>
                {(detailPet.medicationSchedule && detailPet.medicationSchedule.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.medicationSchedule.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-canvas">
                        <button
                          onClick={() => { toggleScheduleItem(detailPet, 'medicationSchedule', s.id); setDetailPet({ ...detailPet, medicationSchedule: detailPet.medicationSchedule.map((m) => m.id === s.id ? { ...m, done: !m.done } : m) }); }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${s.done ? 'bg-sage text-white' : 'border border-line text-ink/30'}`}
                        >
                          {s.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-mono text-ink/60 w-12">{s.time}</span>
                        <span className="text-sm text-ink flex-1">{s.medication}</span>
                        <span className="text-xs text-ink/50">{s.dose} · {s.route}</span>
                        {detailPet.status === 'Checked-in' && (
                          <button onClick={() => { removeScheduleItem(detailPet, 'medicationSchedule', s.id); setDetailPet({ ...detailPet, medicationSchedule: detailPet.medicationSchedule.filter((m) => m.id !== s.id) }); }} className="text-ink/30 hover:text-coral transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 py-1">No medication schedule.</p>
                )}
              </div>

              {/* Walking Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="w-4 h-4 text-sky-500" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Walking Schedule</span>
                </div>
                {(detailPet.walkingSchedule && detailPet.walkingSchedule.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.walkingSchedule.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-canvas">
                        <button
                          onClick={() => { toggleScheduleItem(detailPet, 'walkingSchedule', s.id); setDetailPet({ ...detailPet, walkingSchedule: detailPet.walkingSchedule.map((w) => w.id === s.id ? { ...w, done: !w.done } : w) }); }}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${s.done ? 'bg-sage text-white' : 'border border-line text-ink/30'}`}
                        >
                          {s.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-mono text-ink/60 w-12">{s.time}</span>
                        <span className="text-sm text-ink flex-1">{s.durationMin} min walk</span>
                        <span className="text-xs text-ink/50">{s.handler}</span>
                        {detailPet.status === 'Checked-in' && (
                          <button onClick={() => { removeScheduleItem(detailPet, 'walkingSchedule', s.id); setDetailPet({ ...detailPet, walkingSchedule: detailPet.walkingSchedule.filter((w) => w.id !== s.id) }); }} className="text-ink/30 hover:text-coral transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 py-1">No walking schedule.</p>
                )}
              </div>

              {/* Health Checks */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-amber-600" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Health Checks</span>
                </div>
                {(detailPet.healthChecks && detailPet.healthChecks.length > 0) ? (
                  <div className="space-y-2">
                    {detailPet.healthChecks.map((hc) => (
                      <div key={hc.id} className="p-2.5 rounded-lg border border-line">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-ink">{hc.date} at {hc.time}</span>
                          <span className="text-[10px] text-ink/50">by {hc.checkedBy}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-ink/60">
                          <div>Temp: {hc.temperatureC}°C</div>
                          <div>HR: {hc.heartRate} bpm</div>
                          <div>RR: {hc.respiratoryRate}</div>
                          <div>Appetite: {hc.appetite || '—'}</div>
                          <div>Demeanor: {hc.demeanor || '—'}</div>
                        </div>
                        {hc.notes && <p className="text-xs text-ink/60 mt-1">{hc.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 py-1">No health checks recorded.</p>
                )}
              </div>

              {/* Care Notes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="w-4 h-4 text-ink/50" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Daily Care Notes</span>
                </div>
                {(detailPet.careNotes && detailPet.careNotes.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.careNotes.map((cn) => (
                      <div key={cn.id} className="flex items-start gap-2 p-2 rounded-lg bg-canvas">
                        <span className="text-[10px] text-ink/40 font-mono shrink-0 mt-0.5">{cn.date} {cn.time}</span>
                        <span className="text-xs text-ink/70 flex-1">{cn.note}</span>
                        <span className="text-[10px] text-ink/40 shrink-0">{cn.staff}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 py-1">No care notes recorded.</p>
                )}
                {detailPet.status === 'Checked-in' && (
                  <div className="flex gap-2 mt-2">
                    <input className={`${inputCls} flex-1`} value={careNoteText} onChange={(e) => setCareNoteText(e.target.value)} placeholder="Add a care note…" onKeyDown={(e) => { if (e.key === 'Enter') addCareNote(detailPet, careNoteText); }} />
                    <Button size="sm" onClick={() => addCareNote(detailPet, careNoteText)}>Add Note</Button>
                  </div>
                )}
              </div>

              {/* Discharge info */}
              {detailPet.status === 'Discharged' && detailPet.dischargeNotes && (
                <div>
                  <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-1">Discharge Notes</div>
                  <p className="text-sm text-ink/70 leading-relaxed">{detailPet.dischargeNotes}</p>
                </div>
              )}

              {/* Billing */}
              <div className="p-3 rounded-xl bg-canvas border border-line">
                <div className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide mb-2">Billing</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/60">Daily rate: {fmtMoney(detailPet.dailyRate || 0)} · Additional: {fmtMoney(detailPet.additionalServices || 0)} · Discount: {fmtMoney(detailPet.discount || 0)}</span>
                  <span className="font-bold text-ink">{fmtMoney(detailPet.total || 0)}</span>
                </div>
                {detailPet.paymentStatus && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <Badge status={detailPet.paymentStatus} />
                    {detailPet.paymentMethod && <span className="text-ink/50">via {detailPet.paymentMethod}</span>}
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
