'use client';

import { useMemo, useState } from 'react';
import {
  Hotel, Plus, LogIn, LogOut, Utensils, Edit2, Trash2, Eye,
  Pill, Footprints, Stethoscope, Camera, ClipboardList, X, CheckCircle2,
  Clock, DollarSign, Bed, Cat, Dog, PawPrint, Activity, Calendar, AlertCircle,
} from 'lucide-react';
import Shell from '../components/Shell';
import {
  Card, Badge, Button, EmptyState, Modal, Field, Input, SearchInput, Select, DateInput, TimeInput,
  Textarea, NumberInput, StatCard, ImagePicker,
} from '../components/ui';
import {
  useDB, BoardingPet, FeedingScheduleItem, MedicationScheduleItem,
  WalkingScheduleItem, HealthCheck, CareNote, DailyPhoto,
  newId,
} from '../lib/store';
import { useAuth } from '../lib/auth';
import {
  localDateISO, localTimeHHMM, daysBetween, nightsBetween, addDaysISO,
  num, numMin, round2, nextDocNumber, confirmDelete, isNonEmpty,
} from '../lib/helpers';
import { useSettings, formatMoney, formatDate, prefixFor } from '../lib/settings';

/**
 * Rooms are still a hardcoded list: there is no `rooms` collection on the
 * server, so the "Rooms & Cages" tab cannot gain, lose or rename a room.
 * Capacity is at least enforced on check-in now (see `saveBoard`).
 */
const allRooms: { name: string; type: string; capacity: number }[] = [
  { name: 'Suite 1', type: 'Dog', capacity: 1 },
  { name: 'Suite 2', type: 'Dog', capacity: 1 },
  { name: 'Suite 3', type: 'Dog', capacity: 1 },
  { name: 'Cattery A', type: 'Cat', capacity: 4 },
  { name: 'Cattery B', type: 'Cat', capacity: 4 },
  { name: 'Small Animal Ward', type: 'Small', capacity: 6 },
];

const speciesIcons: Record<string, typeof Dog> = { Dog: Dog, Cat: Cat };

type Tab = 'active' | 'reserved' | 'rooms' | 'discharged';
type CareKind = 'feeding' | 'medication' | 'walking' | 'health' | 'photo';

const ROUTES = ['Oral', 'Topical', 'Injection', 'Ear', 'Eye', 'Rectal'];

const blankForm = () => ({
  boardingNumber: '', petName: '', owner: '', ownerId: '', petId: '', species: 'Dog', breed: '',
  room: allRooms[0].name, cage: '', checkIn: localDateISO(), checkOut: '',
  status: 'Checked-in' as BoardingPet['status'],
  feedingNotes: '', specialNeeds: '', dietaryRestrictions: '',
  emergencyContact: '', vetOnCall: '', dailyRate: 45, additionalServices: 0,
  discount: 0, tax: 0, paymentMethod: '' as BoardingPet['paymentMethod'],
  paymentStatus: '' as BoardingPet['paymentStatus'],
});

const blankCare = () => ({
  time: localTimeHHMM(),
  date: localDateISO(),
  // feeding
  food: '', amount: '',
  // medication
  medication: '', dose: '', route: 'Oral',
  // walking
  durationMin: 20, handler: '',
  // health check
  temperatureC: 38.5, heartRate: 90, respiratoryRate: 24,
  appetite: 'Normal' as HealthCheck['appetite'],
  demeanor: 'Normal' as HealthCheck['demeanor'],
  notes: '',
  // photo
  url: '', caption: '',
});

const blankDischarge = () => ({
  actualCheckOut: localDateISO(),
  dischargeNotes: '',
  paymentStatus: 'Paid' as BoardingPet['paymentStatus'],
  paymentMethod: '' as BoardingPet['paymentMethod'],
});

/** End of a stay for overlap maths — a stay with no check-out counts as one night. */
const stayEnd = (b: { checkIn: string; checkOut: string; actualCheckOut?: string }) =>
  b.actualCheckOut || b.checkOut || addDaysISO(b.checkIn, 1);

export default function BoardingPage() {
  const { db, create, update, remove } = useDB();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('active');
  const [open, setOpen] = useState(false);
  const [editPet, setEditPet] = useState<BoardingPet | null>(null);
  const [form, setForm] = useState(blankForm());
  const [formError, setFormError] = useState('');
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  // The detail modal keeps only an id and re-derives the record from `db`, so a
  // second care note / schedule tick can never overwrite the first.
  const [detailId, setDetailId] = useState<string | null>(null);
  const [careNoteText, setCareNoteText] = useState('');
  const [careKind, setCareKind] = useState<CareKind | null>(null);
  const [careForm, setCareForm] = useState(blankCare());
  const [careError, setCareError] = useState('');
  const [dischargeFor, setDischargeFor] = useState<string | null>(null);
  const [dischargeForm, setDischargeForm] = useState(blankDischarge());
  const [dischargeError, setDischargeError] = useState('');

  const boarding = db?.boarding ?? [];
  const active = boarding.filter((b) => b.status === 'Checked-in');
  const upcoming = boarding
    .filter((b) => b.status === 'Reserved' || b.status === 'Cancelled')
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
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

  // Staff-derived name lists (house rule: never hardcode people).
  const vets = useMemo(
    () => (db?.staff ?? []).filter((s) => s.role === 'Veterinarian' && s.status !== 'Inactive').map((s) => s.name),
    [db?.staff],
  );
  const handlers = useMemo(
    () => (db?.staff ?? []).filter((s) => s.status !== 'Inactive').map((s) => s.name),
    [db?.staff],
  );

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const setCare = (k: string, v: string | number) => setCareForm((f) => ({ ...f, [k]: v }));

  if (!db) return <Shell module="boarding" title="Boarding"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const detailPet = detailId ? db.boarding.find((b) => b.id === detailId) ?? null : null;
  const fmtMoney = (n: number) => formatMoney(num(n), settings);
  const fmtDate = (iso: string) => (iso ? formatDate(iso, settings) : '—');

  // Occupancy
  const occupiedRooms = new Set(active.map((b) => b.room));
  const occupancyRate = allRooms.length > 0 ? Math.round((occupiedRooms.size / allRooms.length) * 100) : 0;

  // Revenue — `paymentStatus` is now actually written (check-in modal + discharge).
  const completedBoarding = db.boarding.filter((b) => b.status === 'Discharged' && b.paymentStatus === 'Paid');
  const totalRevenue = completedBoarding.reduce((s, b) => s + num(b.total), 0);
  const pendingRevenue = active.reduce((s, b) => s + num(b.total), 0);

  // ── Billing ──
  const totalForNights = (nights: number, dailyRate: number, additional: number, discount: number, tax: number) =>
    round2(Math.max(0, nights * num(dailyRate) + num(additional) - num(discount) + num(tax)));

  const calcTotal = (checkIn: string, checkOut: string, dailyRate: number, additional: number, discount: number, tax: number) => {
    const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
    return totalForNights(nights, dailyRate, additional, discount, tax);
  };

  const formNights = form.checkIn && form.checkOut ? nightsBetween(form.checkIn, form.checkOut) : 0;

  // ── Modal open/close ──
  const resetFormErrors = () => { setFormError(''); setFieldErr({}); };
  const closeForm = () => { setOpen(false); setEditPet(null); resetFormErrors(); };

  const openNew = () => {
    setEditPet(null);
    resetFormErrors();
    setForm({
      ...blankForm(),
      boardingNumber: nextDocNumber(prefixFor('boarding', settings), db.boarding.map((b) => b.boardingNumber || ''), 1, 4),
      vetOnCall: vets[0] || '',
    });
    setOpen(true);
  };

  const openEdit = (b: BoardingPet) => {
    setEditPet(b);
    resetFormErrors();
    setForm({
      boardingNumber: b.boardingNumber, petName: b.petName, owner: b.owner, ownerId: b.ownerId || '', petId: b.petId || '', species: b.species || 'Dog', breed: b.breed || '',
      room: b.room, cage: b.cage || '', checkIn: b.checkIn, checkOut: b.checkOut,
      status: b.status || 'Checked-in',
      feedingNotes: b.feedingNotes, specialNeeds: b.specialNeeds || '', dietaryRestrictions: b.dietaryRestrictions || '',
      emergencyContact: b.emergencyContact || '', vetOnCall: b.vetOnCall || '',
      dailyRate: num(b.dailyRate, 45), additionalServices: num(b.additionalServices), discount: num(b.discount), tax: num(b.tax),
      paymentMethod: b.paymentMethod, paymentStatus: b.paymentStatus,
    });
    setOpen(true);
  };

  /** Owner / pet pickers keep the ids *and* the denormalised names in sync. */
  const pickOwner = (ownerId: string) => {
    const owner = db.owners.find((o) => o.id === ownerId);
    setForm((f) => ({
      ...f,
      ownerId,
      owner: owner?.name || '',
      // the previously chosen pet may belong to another owner
      petId: '', petName: '',
    }));
  };

  const pickPet = (petId: string) => {
    const pet = db.pets.find((p) => p.id === petId);
    setForm((f) => ({
      ...f,
      petId,
      petName: pet?.name || '',
      species: pet?.species || f.species,
      breed: pet?.breed || f.breed,
      ownerId: pet?.ownerId || f.ownerId,
      owner: db.owners.find((o) => o.id === pet?.ownerId)?.name || f.owner,
    }));
  };

  const petOptions = form.ownerId ? db.pets.filter((p) => p.ownerId === form.ownerId) : db.pets;

  const saveBoard = async () => {
    const errs: Record<string, string> = {};
    if (!isNonEmpty(form.petName) || !form.petId) errs.petId = 'Choose which pet is boarding.';
    if (!isNonEmpty(form.checkIn)) errs.checkIn = 'A check-in date is required.';

    if (isNonEmpty(form.checkIn) && isNonEmpty(form.checkOut)) {
      const span = daysBetween(form.checkIn, form.checkOut);
      if (span === null) errs.checkOut = 'That date could not be read.';
      else if (span < 1) errs.checkOut = 'Check-out must be at least one night after check-in.';
    }

    const room = allRooms.find((r) => r.name === form.room);
    if (!room) {
      errs.room = 'Choose a room.';
    } else if (form.status === 'Checked-in' || form.status === 'Reserved') {
      const candidate = { checkIn: form.checkIn, checkOut: form.checkOut };
      const clashes = boarding.filter((b) =>
        b.room === room.name &&
        b.id !== editPet?.id &&
        (b.status === 'Checked-in' || b.status === 'Reserved') &&
        candidate.checkIn < stayEnd(b) && b.checkIn < stayEnd(candidate),
      );
      if (clashes.length >= room.capacity) {
        errs.room = `${room.name} holds ${room.capacity} — ${clashes.length} already booked for those dates.`;
      }
    }

    setFieldErr(errs);
    if (Object.keys(errs).length > 0) {
      setFormError('Please fix the highlighted fields before saving.');
      return;
    }
    setFormError('');

    const total = calcTotal(form.checkIn, form.checkOut, form.dailyRate, form.additionalServices, form.discount, form.tax);
    const data = { ...form, total, createdAt: editPet?.createdAt || localDateISO() };
    try {
      if (editPet) {
        await update('boarding', editPet.id, data);
      } else {
        await create('boarding', {
          id: newId('brd'), ...data, actualCheckOut: '', dischargeNotes: '',
          feedingSchedule: [], medicationSchedule: [], walkingSchedule: [], healthChecks: [], dailyPhotos: [], careNotes: [],
        } as BoardingPet);
      }
      closeForm();
    } catch (err) {
      setFormError((err as Error).message || 'Could not save this boarding record.');
    }
  };

  /**
   * Patch a boarding record from the **live** row in `db`, never from a captured
   * snapshot — otherwise a second care note overwrites the first.
   */
  const patchLive = async (id: string, build: (live: BoardingPet) => Partial<BoardingPet>) => {
    const live = db.boarding.find((b) => b.id === id);
    if (!live) { setActionError('That boarding record no longer exists.'); return false; }
    try {
      setActionError('');
      await update('boarding', id, build(live));
      return true;
    } catch (err) {
      setActionError((err as Error).message || 'Could not save that change.');
      return false;
    }
  };

  // ── Reservation → check-in ──
  const checkInReservation = (b: BoardingPet) =>
    patchLive(b.id, () => ({ status: 'Checked-in', checkIn: localDateISO() }));

  const cancelBooking = (b: BoardingPet) =>
    patchLive(b.id, () => ({ status: 'Cancelled' }));

  // ── Discharge ──
  const openDischarge = (b: BoardingPet) => {
    setDischargeError('');
    setDischargeFor(b.id);
    setDischargeForm({
      actualCheckOut: localDateISO(),
      dischargeNotes: b.dischargeNotes || '',
      paymentStatus: b.paymentStatus || 'Paid',
      paymentMethod: b.paymentMethod || '',
    });
  };

  const dischargeTarget = dischargeFor ? db.boarding.find((b) => b.id === dischargeFor) ?? null : null;
  const dischargeNights = dischargeTarget && dischargeForm.actualCheckOut
    ? nightsBetween(dischargeTarget.checkIn, dischargeForm.actualCheckOut)
    : 0;
  const dischargeTotal = dischargeTarget
    ? totalForNights(dischargeNights, dischargeTarget.dailyRate, dischargeTarget.additionalServices, dischargeTarget.discount, dischargeTarget.tax)
    : 0;

  const confirmDischarge = async () => {
    if (!dischargeTarget) { setDischargeError('That boarding record no longer exists.'); return; }
    const span = daysBetween(dischargeTarget.checkIn, dischargeForm.actualCheckOut);
    if (span === null) { setDischargeError('Pick a valid check-out date.'); return; }
    if (span < 0) { setDischargeError('Check-out cannot be before the check-in date.'); return; }
    setDischargeError('');
    const ok = await patchLive(dischargeTarget.id, (live) => ({
      status: 'Discharged',
      actualCheckOut: dischargeForm.actualCheckOut,
      dischargeNotes: dischargeForm.dischargeNotes,
      paymentStatus: dischargeForm.paymentStatus,
      paymentMethod: dischargeForm.paymentMethod,
      // Bill the nights actually stayed, not the nights originally booked.
      total: totalForNights(
        nightsBetween(live.checkIn, dischargeForm.actualCheckOut),
        live.dailyRate, live.additionalServices, live.discount, live.tax,
      ),
    }));
    if (ok) setDischargeFor(null);
  };

  const deleteBoard = async (b: BoardingPet) => {
    if (!confirmDelete(`boarding record ${b.boardingNumber || b.petName}`, `${b.petName} · ${b.room}`)) return;
    try {
      setActionError('');
      await remove('boarding', b.id);
      if (detailId === b.id) setDetailId(null);
    } catch (err) {
      setActionError((err as Error).message || 'Could not delete that record.');
    }
  };

  // ── Schedule helpers ──
  const toggleScheduleItem = (b: BoardingPet, scheduleKey: 'feedingSchedule' | 'medicationSchedule' | 'walkingSchedule', itemId: string) =>
    patchLive(b.id, (live) => ({
      [scheduleKey]: (live[scheduleKey] || []).map((s) => (s.id === itemId ? { ...s, done: !s.done } : s)),
    } as Partial<BoardingPet>));

  const removeScheduleItem = (b: BoardingPet, scheduleKey: 'feedingSchedule' | 'medicationSchedule' | 'walkingSchedule', itemId: string) =>
    patchLive(b.id, (live) => ({
      [scheduleKey]: (live[scheduleKey] || []).filter((s) => s.id !== itemId),
    } as Partial<BoardingPet>));

  const removeHealthCheck = (b: BoardingPet, hcId: string) => {
    if (!confirmDelete('this health check')) return;
    patchLive(b.id, (live) => ({ healthChecks: (live.healthChecks || []).filter((h) => h.id !== hcId) }));
  };

  const removePhoto = (b: BoardingPet, photoId: string) => {
    if (!confirmDelete('this photo')) return;
    patchLive(b.id, (live) => ({ dailyPhotos: (live.dailyPhotos || []).filter((p) => p.id !== photoId) }));
  };

  const addCareNote = async (b: BoardingPet, note: string) => {
    if (!isNonEmpty(note)) { setActionError('Type a note before adding it.'); return; }
    const cn: CareNote = {
      id: newId('cn'), date: localDateISO(), time: localTimeHHMM(),
      note: note.trim(), staff: user?.name || 'Staff',
    };
    const ok = await patchLive(b.id, (live) => ({ careNotes: [...(live.careNotes || []), cn] }));
    if (ok) setCareNoteText('');
  };

  // ── "+ Add" care entries ──
  const openCare = (kind: CareKind) => {
    setCareError('');
    setCareForm({ ...blankCare(), handler: handlers[0] || (user?.name ?? '') });
    setCareKind(kind);
  };

  const submitCare = async () => {
    if (!detailPet) return;
    const id = detailPet.id;

    if (careKind === 'feeding') {
      if (!isNonEmpty(careForm.time)) { setCareError('Pick a feeding time.'); return; }
      if (!isNonEmpty(careForm.food)) { setCareError('Say what is being fed.'); return; }
      const item: FeedingScheduleItem = {
        id: newId('fs'), time: careForm.time, food: careForm.food.trim(),
        amount: careForm.amount.trim(), done: false,
      };
      if (await patchLive(id, (live) => ({ feedingSchedule: [...(live.feedingSchedule || []), item] }))) setCareKind(null);
      return;
    }

    if (careKind === 'medication') {
      if (!isNonEmpty(careForm.time)) { setCareError('Pick a time for the dose.'); return; }
      if (!isNonEmpty(careForm.medication)) { setCareError('Name the medication.'); return; }
      const item: MedicationScheduleItem = {
        id: newId('ms'), time: careForm.time, medication: careForm.medication.trim(),
        dose: careForm.dose.trim(), route: careForm.route, done: false,
      };
      if (await patchLive(id, (live) => ({ medicationSchedule: [...(live.medicationSchedule || []), item] }))) setCareKind(null);
      return;
    }

    if (careKind === 'walking') {
      if (!isNonEmpty(careForm.time)) { setCareError('Pick a walk time.'); return; }
      if (num(careForm.durationMin) <= 0) { setCareError('A walk needs a duration of at least 1 minute.'); return; }
      if (!isNonEmpty(careForm.handler)) { setCareError('Choose who is walking the pet.'); return; }
      const item: WalkingScheduleItem = {
        id: newId('ws'), time: careForm.time, durationMin: numMin(careForm.durationMin, 1, 20),
        handler: careForm.handler, done: false,
      };
      if (await patchLive(id, (live) => ({ walkingSchedule: [...(live.walkingSchedule || []), item] }))) setCareKind(null);
      return;
    }

    if (careKind === 'health') {
      if (!isNonEmpty(careForm.date)) { setCareError('Pick the date of the check.'); return; }
      const hc: HealthCheck = {
        id: newId('hc'), date: careForm.date, time: careForm.time,
        temperatureC: round2(num(careForm.temperatureC)),
        heartRate: Math.round(numMin(careForm.heartRate, 0)),
        respiratoryRate: Math.round(numMin(careForm.respiratoryRate, 0)),
        appetite: careForm.appetite, demeanor: careForm.demeanor,
        notes: careForm.notes.trim(), checkedBy: user?.name || 'Staff',
      };
      if (await patchLive(id, (live) => ({ healthChecks: [...(live.healthChecks || []), hc] }))) setCareKind(null);
      return;
    }

    if (careKind === 'photo') {
      if (!isNonEmpty(careForm.url)) { setCareError('Upload a photo or paste an image URL.'); return; }
      const photo: DailyPhoto = {
        id: newId('dp'), date: careForm.date || localDateISO(),
        url: careForm.url.trim(), caption: careForm.caption.trim(),
      };
      if (await patchLive(id, (live) => ({ dailyPhotos: [...(live.dailyPhotos || []), photo] }))) setCareKind(null);
    }
  };

  // ── Tab button ──
  const tabBtn = (t: Tab, label: string, Icon: typeof Hotel, count?: number) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
        tab === t ? 'bg-plum text-white' : 'text-ink/60 hover:bg-lilac/50 hover:text-ink'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`min-w-[18px] px-1 rounded-full text-[10px] font-semibold leading-[18px] ${tab === t ? 'bg-white/20 text-white' : 'bg-lilac text-plum'}`}>
          {count}
        </span>
      )}
    </button>
  );

  // ── Schedule progress ──
  const scheduleProgress = (schedule: { done: boolean }[]) => {
    if (!schedule || schedule.length === 0) return 0;
    return Math.round((schedule.filter((s) => s.done).length / schedule.length) * 100);
  };

  const addSectionBtn = (kind: CareKind, label: string) => (
    <button
      onClick={() => openCare(kind)}
      className="hv-icon ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-plum hover:bg-lilac transition-colors"
    >
      <Plus className="w-3 h-3" /> {label}
    </button>
  );

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
            <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
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
              <button onClick={() => setDetailId(b.id)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Details">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteBoard(b)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="flex items-center gap-1.5 text-ink/60">
            <LogIn className="w-3.5 h-3.5 text-ink/40" /> In: {fmtDate(b.checkIn)}
          </div>
          <div className="flex items-center gap-1.5 text-ink/60">
            <LogOut className="w-3.5 h-3.5 text-ink/40" /> Out: {fmtDate(b.checkOut)}
          </div>
        </div>

        {/* Schedule progress bars */}
        <div className="space-y-1.5 mb-3">
          {(b.feedingSchedule && b.feedingSchedule.length > 0) && (
            <div className="flex items-center gap-2">
              <Utensils className="w-3.5 h-3.5 text-plum shrink-0" />
              <div className="flex-1 h-1.5 bg-canvas rounded-full overflow-hidden">
                <div className="h-full bg-plum rounded-full transition-all" style={{ width: `${feedPct}%` }} />
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
          {!(b.feedingSchedule || []).length && !(b.medicationSchedule || []).length && !(b.walkingSchedule || []).length && (
            <button onClick={() => setDetailId(b.id)} className="text-[11px] text-plum font-medium hover:underline">
              No care schedule yet — set one up
            </button>
          )}
        </div>

        {b.specialNeeds && (
          <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {b.specialNeeds}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">{fmtMoney(b.total || 0)}</span>
          <Button variant="outline" size="sm" onClick={() => openDischarge(b)}>
            <LogOut className="w-3.5 h-3.5" /> Discharge
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <Shell module="boarding" title="Boarding" subtitle="In-house boarding, care schedules, and occupancy tracking">
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-ink">Boarding Management</h1>
            <p className="text-sm text-ink/50 mt-0.5">Track stays, feeding, medication, walks, and health checks</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4" /> Check in Pet</Button>
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
          <StatCard icon={Hotel} label="Currently Boarding" value={active.length} sub="pets in-house" tone="plum" />
          <StatCard icon={Bed} label="Occupancy" value={`${occupancyRate}%`} sub={`${occupiedRooms.size}/${allRooms.length} rooms`} tone="sky" />
          <StatCard icon={DollarSign} label="Revenue (Paid)" value={fmtMoney(totalRevenue)} sub={`${completedBoarding.length} stays`} tone="amber" />
          <StatCard icon={Clock} label="Pending Revenue" value={fmtMoney(pendingRevenue)} sub={`${active.length} active stays`} tone="coral" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4 p-1 bg-canvas rounded-xl border border-line w-fit">
          {tabBtn('active', 'Active Stays', Hotel, active.length)}
          {tabBtn('reserved', 'Reservations', Calendar, upcoming.filter((b) => b.status === 'Reserved').length)}
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

        {/* ── Reservations Tab ── */}
        {tab === 'reserved' && (
          upcoming.length === 0 ? (
            <Card><EmptyState icon={Calendar} title="No reservations" hint="Future bookings and cancelled bookings appear here." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((b) => {
                const SpeciesIcon = speciesIcons[b.species] || PawPrint;
                return (
                  <Card key={b.id} className="p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center">
                          <SpeciesIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink">{b.petName}</div>
                          <div className="text-[11px] text-ink/50">{b.owner} · {b.room}</div>
                          <div className="text-[10px] text-ink/40">{b.boardingNumber || '—'}</div>
                        </div>
                      </div>
                      <Badge status={b.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="flex items-center gap-1.5 text-ink/60"><LogIn className="w-3.5 h-3.5 text-ink/40" /> {fmtDate(b.checkIn)}</div>
                      <div className="flex items-center gap-1.5 text-ink/60"><LogOut className="w-3.5 h-3.5 text-ink/40" /> {fmtDate(b.checkOut)}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink">{fmtMoney(b.total || 0)}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetailId(b.id)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Details">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteBoard(b)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {b.status === 'Reserved' && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => cancelBooking(b)}>Cancel</Button>
                            <Button size="sm" onClick={() => checkInReservation(b)}><LogIn className="w-3.5 h-3.5" /> Check in</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
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
                <Card key={room.name} className={`p-4 ${isOccupied ? 'border-plum/30' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isOccupied ? 'bg-lilac text-plum' : 'bg-canvas text-ink/40'}`}>
                        <Bed className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{room.name}</div>
                        <div className="text-[11px] text-ink/50">{room.type} · {occupants.length}/{room.capacity} occupied</div>
                      </div>
                    </div>
                    <Badge status={occupants.length >= room.capacity ? 'Full' : 'Available'} />
                  </div>
                  {isOccupied ? (
                    <div className="space-y-2">
                      {occupants.map((b) => {
                        const SpeciesIcon = speciesIcons[b.species] || PawPrint;
                        return (
                          <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg bg-canvas">
                            <SpeciesIcon className="w-4 h-4 text-plum shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-ink truncate">{b.petName}</div>
                              <div className="text-[10px] text-ink/50">{b.owner} · {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</div>
                            </div>
                            <button onClick={() => setDetailId(b.id)} className="text-ink/40 hover:text-plum transition-colors">
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
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pet, owner, room, boarding #…"
              className="mb-4 max-w-md"
            />
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
                      <th className="py-2.5 pr-4 font-semibold text-right">Nights</th>
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
                        <td className="py-3 pr-4 text-ink/60">{fmtDate(b.checkIn)}</td>
                        <td className="py-3 pr-4 text-ink/60">{fmtDate(b.actualCheckOut || b.checkOut)}</td>
                        <td className="py-3 pr-4 text-right text-ink/60">{nightsBetween(b.checkIn, b.actualCheckOut || b.checkOut)}</td>
                        <td className="py-3 pr-4 text-right font-medium text-ink">{fmtMoney(b.total || 0)}</td>
                        <td className="py-3 pr-4">
                          {b.paymentStatus ? <Badge status={b.paymentStatus} /> : <span className="text-ink/30 text-xs">—</span>}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setDetailId(b.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-ink hover:bg-canvas transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteBoard(b)} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10 transition-colors">
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
        <Modal open={open} onClose={closeForm} title={editPet ? 'Edit boarding record' : 'Check in boarding pet'} wide>
          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 text-xs font-medium text-coral bg-coral/10 border border-coral/25 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Boarding #"><Input className="font-mono" value={form.boardingNumber} onChange={(e) => set('boardingNumber', e.target.value)} /></Field>
              <Field label="Status" hint="Reserved keeps the room held without checking the pet in.">
                <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="Reserved">Reserved</option>
                  <option value="Checked-in">Checked-in</option>
                  <option value="Discharged">Discharged</option>
                  <option value="Cancelled">Cancelled</option>
                </Select>
              </Field>
              <Field label="Owner" required>
                <Select value={form.ownerId} onChange={(e) => pickOwner(e.target.value)} placeholder="Select an owner…" searchable>
                  {db.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </Field>
              <Field label="Pet" required error={fieldErr.petId}>
                <Select value={form.petId} onChange={(e) => pickPet(e.target.value)} placeholder="Select a pet…" searchable error={!!fieldErr.petId}>
                  {petOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </Select>
              </Field>
              <Field label="Species">
                <Select value={form.species} onChange={(e) => set('species', e.target.value)}>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Rabbit">Rabbit</option>
                  <option value="Bird">Bird</option>
                  <option value="Other">Other</option>
                </Select>
              </Field>
              <Field label="Breed"><Input value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Golden Retriever" /></Field>
              <Field label="Room" error={fieldErr.room}>
                <Select value={form.room} onChange={(e) => set('room', e.target.value)} error={!!fieldErr.room}>
                  {allRooms.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.type} · cap {r.capacity})</option>)}
                </Select>
              </Field>
              <Field label="Cage (optional)"><Input value={form.cage} onChange={(e) => set('cage', e.target.value)} placeholder="A-1" /></Field>
              <Field label="Check-in date" required error={fieldErr.checkIn}>
                <DateInput value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} error={!!fieldErr.checkIn} />
              </Field>
              <Field label="Check-out date" error={fieldErr.checkOut} hint={formNights > 0 ? `${formNights} night${formNights === 1 ? '' : 's'}` : undefined}>
                <DateInput value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} min={form.checkIn} error={!!fieldErr.checkOut} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily rate"><NumberInput min={0} prefix={settings.currencySymbol} value={String(form.dailyRate)} onChange={(e) => set('dailyRate', numMin(e.target.value, 0))} /></Field>
              <Field label="Additional services"><NumberInput min={0} prefix={settings.currencySymbol} value={String(form.additionalServices)} onChange={(e) => set('additionalServices', numMin(e.target.value, 0))} /></Field>
              <Field label="Discount"><NumberInput min={0} prefix={settings.currencySymbol} value={String(form.discount)} onChange={(e) => set('discount', numMin(e.target.value, 0))} /></Field>
              <Field label="Tax"><NumberInput min={0} prefix={settings.currencySymbol} value={String(form.tax)} onChange={(e) => set('tax', numMin(e.target.value, 0))} /></Field>
            </div>

            <Field label="Feeding & care notes"><Textarea value={form.feedingNotes} onChange={(e) => set('feedingNotes', e.target.value)} placeholder="2x daily, joint supplement AM" /></Field>
            <Field label="Special needs"><Textarea value={form.specialNeeds} onChange={(e) => set('specialNeeds', e.target.value)} placeholder="Hip dysplasia - no jumping" /></Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Dietary restrictions"><Input value={form.dietaryRestrictions} onChange={(e) => set('dietaryRestrictions', e.target.value)} placeholder="No grain-free" /></Field>
              <Field label="Emergency contact"><Input value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} placeholder="Owner phone" /></Field>
              <Field label="Vet on call">
                <Select value={form.vetOnCall} onChange={(e) => set('vetOnCall', e.target.value)} placeholder="— None —">
                  <option value="">— None —</option>
                  {vets.map((v) => <option key={v} value={v}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Payment method">
                <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Insurance">Insurance</option>
                </Select>
              </Field>
              <Field label="Payment status">
                <Select value={form.paymentStatus} onChange={(e) => set('paymentStatus', e.target.value)}>
                  <option value="">— Unpaid —</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Refunded">Refunded</option>
                </Select>
              </Field>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-line">
              <span className="text-sm text-ink/60">
                Estimated total{formNights > 0 ? ` · ${formNights} night${formNights === 1 ? '' : 's'} × ${fmtMoney(form.dailyRate)}` : ''}
              </span>
              <span className="text-lg font-bold text-ink">{fmtMoney(calcTotal(form.checkIn, form.checkOut, form.dailyRate, form.additionalServices, form.discount, form.tax))}</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeForm}>Cancel</Button>
              <Button onClick={saveBoard}>{editPet ? 'Save changes' : 'Check in'}</Button>
            </div>
          </div>
        </Modal>

        {/* ── Discharge Modal ── */}
        <Modal open={!!dischargeTarget} onClose={() => { setDischargeFor(null); setDischargeError(''); }} title="Discharge boarding pet">
          {dischargeTarget && (
            <div className="space-y-4">
              {dischargeError && (
                <div className="flex items-start gap-2 text-xs font-medium text-coral bg-coral/10 border border-coral/25 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {dischargeError}
                </div>
              )}
              <div className="text-sm text-ink">
                <span className="font-semibold">{dischargeTarget.petName}</span>
                <span className="text-ink/50"> · {dischargeTarget.room} · checked in {fmtDate(dischargeTarget.checkIn)}</span>
              </div>

              <Field label="Actual check-out date" required>
                <DateInput value={dischargeForm.actualCheckOut} min={dischargeTarget.checkIn} onChange={(e) => setDischargeForm((f) => ({ ...f, actualCheckOut: e.target.value }))} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment status">
                  <Select value={dischargeForm.paymentStatus} onChange={(e) => setDischargeForm((f) => ({ ...f, paymentStatus: e.target.value as BoardingPet['paymentStatus'] }))}>
                    <option value="">— Unpaid —</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Refunded">Refunded</option>
                  </Select>
                </Field>
                <Field label="Payment method">
                  <Select value={dischargeForm.paymentMethod} onChange={(e) => setDischargeForm((f) => ({ ...f, paymentMethod: e.target.value as BoardingPet['paymentMethod'] }))}>
                    <option value="">— None —</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Insurance">Insurance</option>
                  </Select>
                </Field>
              </div>

              <Field label="Discharge notes">
                <Textarea value={dischargeForm.dischargeNotes} onChange={(e) => setDischargeForm((f) => ({ ...f, dischargeNotes: e.target.value }))} placeholder="Ate well, no issues. Owner briefed on limp." />
              </Field>

              <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                <div className="flex items-center justify-between text-xs text-ink/60">
                  <span>Booked total</span>
                  <span>{fmtMoney(dischargeTarget.total || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-ink/60">
                  <span>{dischargeNights} night{dischargeNights === 1 ? '' : 's'} stayed × {fmtMoney(dischargeTarget.dailyRate || 0)}</span>
                  <span>{fmtMoney(dischargeNights * num(dischargeTarget.dailyRate))}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-ink pt-1 border-t border-line">
                  <span>Final total</span>
                  <span>{fmtMoney(dischargeTotal)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setDischargeFor(null); setDischargeError(''); }}>Cancel</Button>
                <Button onClick={confirmDischarge}><LogOut className="w-4 h-4" /> Discharge &amp; bill</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ── Detail Modal ── */}
        <Modal open={!!detailPet} onClose={() => { setDetailId(null); setCareNoteText(''); }} title="Boarding Details" wide>
          {detailPet && (() => {
            const editable = detailPet.status === 'Checked-in' || detailPet.status === 'Reserved';
            return (
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
                <div className="flex items-center gap-1.5 text-ink/60"><LogIn className="w-3.5 h-3.5 text-ink/40" /> {fmtDate(detailPet.checkIn)}</div>
                <div className="flex items-center gap-1.5 text-ink/60"><LogOut className="w-3.5 h-3.5 text-ink/40" /> {fmtDate(detailPet.actualCheckOut || detailPet.checkOut)}</div>
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
                  <Utensils className="w-4 h-4 text-plum" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Feeding Schedule</span>
                  {editable && addSectionBtn('feeding', 'Add feeding')}
                </div>
                {(detailPet.feedingSchedule && detailPet.feedingSchedule.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.feedingSchedule.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-canvas">
                        <button
                          onClick={() => toggleScheduleItem(detailPet, 'feedingSchedule', s.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${s.done ? 'bg-plum text-white' : 'border border-line text-ink/30'}`}
                          title={s.done ? 'Mark as not done' : 'Mark as done'}
                        >
                          {s.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-mono text-ink/60 w-12">{s.time}</span>
                        <span className="text-sm text-ink flex-1">{s.food}</span>
                        <span className="text-xs text-ink/50">{s.amount}</span>
                        {editable && (
                          <button onClick={() => removeScheduleItem(detailPet, 'feedingSchedule', s.id)} className="text-ink/30 hover:text-coral transition-colors" title="Remove">
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
                  {editable && addSectionBtn('medication', 'Add medication')}
                </div>
                {(detailPet.medicationSchedule && detailPet.medicationSchedule.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.medicationSchedule.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-canvas">
                        <button
                          onClick={() => toggleScheduleItem(detailPet, 'medicationSchedule', s.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${s.done ? 'bg-plum text-white' : 'border border-line text-ink/30'}`}
                          title={s.done ? 'Mark as not done' : 'Mark as done'}
                        >
                          {s.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-mono text-ink/60 w-12">{s.time}</span>
                        <span className="text-sm text-ink flex-1">{s.medication}</span>
                        <span className="text-xs text-ink/50">{s.dose} · {s.route}</span>
                        {editable && (
                          <button onClick={() => removeScheduleItem(detailPet, 'medicationSchedule', s.id)} className="text-ink/30 hover:text-coral transition-colors" title="Remove">
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
                  {editable && addSectionBtn('walking', 'Add walk')}
                </div>
                {(detailPet.walkingSchedule && detailPet.walkingSchedule.length > 0) ? (
                  <div className="space-y-1.5">
                    {detailPet.walkingSchedule.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-canvas">
                        <button
                          onClick={() => toggleScheduleItem(detailPet, 'walkingSchedule', s.id)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${s.done ? 'bg-plum text-white' : 'border border-line text-ink/30'}`}
                          title={s.done ? 'Mark as not done' : 'Mark as done'}
                        >
                          {s.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <span className="text-xs font-mono text-ink/60 w-12">{s.time}</span>
                        <span className="text-sm text-ink flex-1">{s.durationMin} min walk</span>
                        <span className="text-xs text-ink/50">{s.handler}</span>
                        {editable && (
                          <button onClick={() => removeScheduleItem(detailPet, 'walkingSchedule', s.id)} className="text-ink/30 hover:text-coral transition-colors" title="Remove">
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
                  {editable && addSectionBtn('health', 'Add check')}
                </div>
                {(detailPet.healthChecks && detailPet.healthChecks.length > 0) ? (
                  <div className="space-y-2">
                    {detailPet.healthChecks.map((hc) => (
                      <div key={hc.id} className="p-2.5 rounded-lg border border-line">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-ink">{fmtDate(hc.date)} at {hc.time}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-ink/50">by {hc.checkedBy}</span>
                            {editable && (
                              <button onClick={() => removeHealthCheck(detailPet, hc.id)} className="text-ink/30 hover:text-coral transition-colors" title="Remove">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

              {/* Daily Photos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Camera className="w-4 h-4 text-plum" />
                  <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Daily Photos</span>
                  {editable && addSectionBtn('photo', 'Add photo')}
                </div>
                {(detailPet.dailyPhotos && detailPet.dailyPhotos.length > 0) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {detailPet.dailyPhotos.map((p) => (
                      <div key={p.id} className="relative rounded-xl overflow-hidden border border-line bg-canvas">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={p.caption || `${detailPet.petName} on ${p.date}`} className="w-full h-28 object-cover" />
                        <div className="px-2 py-1.5">
                          <div className="text-[10px] text-ink/40">{fmtDate(p.date)}</div>
                          {p.caption && <div className="text-[11px] text-ink/70 truncate">{p.caption}</div>}
                        </div>
                        {editable && (
                          <button
                            onClick={() => removePhoto(detailPet, p.id)}
                            className="hv-icon absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white/90 text-ink/60 hover:text-coral flex items-center justify-center"
                            title="Remove photo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/40 py-1">No photos yet.</p>
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
                {editable && (
                  <div className="flex gap-2 mt-2">
                    <Input className="flex-1" value={careNoteText} onChange={(e) => setCareNoteText(e.target.value)} placeholder="Add a care note…" onEnter={() => addCareNote(detailPet, careNoteText)} />
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
                  <span className="text-ink/60">
                    {nightsBetween(detailPet.checkIn, detailPet.actualCheckOut || detailPet.checkOut)} night(s) ×
                    {' '}{fmtMoney(detailPet.dailyRate || 0)} · Additional: {fmtMoney(detailPet.additionalServices || 0)} · Discount: {fmtMoney(detailPet.discount || 0)}
                  </span>
                  <span className="font-bold text-ink">{fmtMoney(detailPet.total || 0)}</span>
                </div>
                {detailPet.paymentStatus ? (
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <Badge status={detailPet.paymentStatus} />
                    {detailPet.paymentMethod && <span className="text-ink/50">via {detailPet.paymentMethod}</span>}
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs text-ink/45">No payment recorded yet.</div>
                )}
              </div>
            </div>
            );
          })()}
        </Modal>

        {/* ── Add care entry modal ── */}
        <Modal
          open={!!careKind && !!detailPet}
          onClose={() => { setCareKind(null); setCareError(''); }}
          title={
            careKind === 'feeding' ? 'Add feeding' :
            careKind === 'medication' ? 'Add medication' :
            careKind === 'walking' ? 'Add walk' :
            careKind === 'health' ? 'Add health check' : 'Add daily photo'
          }
        >
          <div className="space-y-3">
            {careError && (
              <div className="flex items-start gap-2 text-xs font-medium text-coral bg-coral/10 border border-coral/25 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {careError}
              </div>
            )}

            {careKind === 'feeding' && (
              <>
                <Field label="Time" required><TimeInput value={careForm.time} onChange={(e) => setCare('time', e.target.value)} /></Field>
                <Field label="Food" required><Input value={careForm.food} onChange={(e) => setCare('food', e.target.value)} placeholder="Senior kibble" /></Field>
                <Field label="Amount"><Input value={careForm.amount} onChange={(e) => setCare('amount', e.target.value)} placeholder="200 g" /></Field>
              </>
            )}

            {careKind === 'medication' && (
              <>
                <Field label="Time" required><TimeInput value={careForm.time} onChange={(e) => setCare('time', e.target.value)} /></Field>
                <Field label="Medication" required><Input value={careForm.medication} onChange={(e) => setCare('medication', e.target.value)} placeholder="Meloxicam" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dose"><Input value={careForm.dose} onChange={(e) => setCare('dose', e.target.value)} placeholder="1.5 mg" /></Field>
                  <Field label="Route">
                    <Select value={careForm.route} onChange={(e) => setCare('route', e.target.value)}>
                      {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                  </Field>
                </div>
              </>
            )}

            {careKind === 'walking' && (
              <>
                <Field label="Time" required><TimeInput value={careForm.time} onChange={(e) => setCare('time', e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Duration (min)" required>
                    <NumberInput min={5} step={5} value={String(careForm.durationMin)} onChange={(e) => setCare('durationMin', numMin(e.target.value, 0))} />
                  </Field>
                  <Field label="Handler" required>
                    <Select value={careForm.handler} onChange={(e) => setCare('handler', e.target.value)} placeholder="Select staff…">
                      {handlers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </Select>
                  </Field>
                </div>
              </>
            )}

            {careKind === 'health' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date" required><DateInput value={careForm.date} onChange={(e) => setCare('date', e.target.value)} /></Field>
                  <Field label="Time"><TimeInput value={careForm.time} onChange={(e) => setCare('time', e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Temp (°C)"><NumberInput min={0} step={0.1} value={String(careForm.temperatureC)} onChange={(e) => setCare('temperatureC', numMin(e.target.value, 0))} /></Field>
                  <Field label="Heart rate"><NumberInput min={0} value={String(careForm.heartRate)} onChange={(e) => setCare('heartRate', numMin(e.target.value, 0))} /></Field>
                  <Field label="Resp. rate"><NumberInput min={0} value={String(careForm.respiratoryRate)} onChange={(e) => setCare('respiratoryRate', numMin(e.target.value, 0))} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Appetite">
                    <Select value={careForm.appetite} onChange={(e) => setCare('appetite', e.target.value)}>
                      <option value="">— Not noted —</option>
                      <option value="Normal">Normal</option>
                      <option value="Reduced">Reduced</option>
                      <option value="None">None</option>
                    </Select>
                  </Field>
                  <Field label="Demeanor">
                    <Select value={careForm.demeanor} onChange={(e) => setCare('demeanor', e.target.value)}>
                      <option value="">— Not noted —</option>
                      <option value="Normal">Normal</option>
                      <option value="Quiet">Quiet</option>
                      <option value="Lethargic">Lethargic</option>
                      <option value="Anxious">Anxious</option>
                      <option value="Aggressive">Aggressive</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Notes"><Textarea value={careForm.notes} onChange={(e) => setCare('notes', e.target.value)} placeholder="Bright, eating well, slight limp on left hind." /></Field>
              </>
            )}

            {careKind === 'photo' && (
              <>
                <Field label="Date"><DateInput value={careForm.date} onChange={(e) => setCare('date', e.target.value)} /></Field>
                <ImagePicker label="Photo" value={careForm.url} onChange={(e) => setCare('url', e.target.value)} aspect="aspect-[4/3]" hint="Upload from the kennel tablet, or paste a link." />
                <Field label="Caption"><Input value={careForm.caption} onChange={(e) => setCare('caption', e.target.value)} placeholder="Morning play session" /></Field>
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { setCareKind(null); setCareError(''); }}>Cancel</Button>
              <Button onClick={submitCare}>Add</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
