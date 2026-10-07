'use client';

import { useMemo, useState } from 'react';
import {
  Syringe, Plus, Edit2, Trash2, ShieldCheck, ShieldAlert, Clock,
  CalendarClock, FileCheck, BadgeCheck, AlertTriangle, Filter, X,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, inputCls, Select, DateInput, Textarea, NumberInput } from '../components/ui';
import { useDB, Vaccination, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateVaccinationRecommendation } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const scheduleTypes = ['Puppy', 'Kitten', 'Adult', 'Livestock', 'Custom'] as const;
const statuses = ['Completed', 'Pending', 'Overdue', 'Scheduled'] as const;
const vets = ['Dr. Rivera', 'Dr. Okafor', 'Dr. Patel'];
const manufacturers = ['BioPharm', 'Zoetis', 'Merck', 'MedGene', 'Boehringer Ingelheim', 'Elanco', 'Ceva'];

const statusStyle: Record<Vaccination['status'], { bg: string; text: string; icon: typeof ShieldCheck }> = {
  Completed: { bg: 'bg-mint', text: 'text-sage', icon: BadgeCheck },
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  Overdue: { bg: 'bg-coral/15', text: 'text-coral', icon: ShieldAlert },
  Scheduled: { bg: 'bg-sky-100', text: 'text-sky-700', icon: CalendarClock },
};

const scheduleStyle: Record<Vaccination['scheduleType'], string> = {
  Puppy: 'bg-amber-50 text-amber-700',
  Kitten: 'bg-sky-50 text-sky-700',
  Adult: 'bg-mint text-sage',
  Livestock: 'bg-teal-50 text-teal-700',
  Custom: 'bg-violet-50 text-violet-700',
};

const vaccineScheduleTemplates: Record<string, { name: string; doses: number }[]> = {
  Puppy: [
    { name: 'DHPP (Distemper/Hepatitis/Parvo/Parainfluenza)', doses: 3 },
    { name: 'Rabies', doses: 1 },
    { name: 'Bordetella', doses: 1 },
    { name: 'Leptospirosis', doses: 2 },
  ],
  Kitten: [
    { name: 'FVRCP (Feline Viral Rhinotracheitis/Calicivirus/Panleukopenia)', doses: 3 },
    { name: 'Rabies', doses: 1 },
    { name: 'FeLV (Feline Leukemia)', doses: 2 },
  ],
  Adult: [
    { name: 'Rabies', doses: 1 },
    { name: 'DHPP', doses: 1 },
    { name: 'Bordetella', doses: 1 },
    { name: 'Leptospirosis', doses: 1 },
    { name: 'FVRCP', doses: 1 },
    { name: 'FeLV (Feline Leukemia)', doses: 1 },
  ],
  Livestock: [
    { name: 'RHDV2 (Rabbit Hemorrhagic Disease Virus 2)', doses: 2 },
    { name: 'Myxomatosis', doses: 1 },
    { name: 'Clostridial Vaccines', doses: 2 },
    { name: 'Bluetongue', doses: 1 },
  ],
  Custom: [],
};

export default function VaccinationsPage() {
  const { db, create, update, remove } = useDB();
  const [petFilter, setPetFilter] = useState('all');
  const [scheduleFilter, setScheduleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Vaccination | null>(null);
  const [certRecord, setCertRecord] = useState<Vaccination | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [form, setForm] = useState({
    petId: '', vaccineName: '', scheduleType: 'Adult' as Vaccination['scheduleType'],
    doseNumber: 1, totalDoses: 1, dateGiven: '', nextDueDate: '', status: 'Pending' as Vaccination['status'],
    vet: vets[0], batchNumber: '', manufacturer: manufacturers[0], expiryDate: '', verified: false,
    certificateId: '', notes: '', reminderSent: false,
  });

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const petName = (id: string) => db?.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const petOf = (id: string) => db?.pets.find((p) => p.id === id);
  const ownerOf = (petId: string) => {
    const pet = db?.pets.find((p) => p.id === petId);
    if (!pet) return '';
    return db?.owners.find((o) => o.id === pet.ownerId)?.name ?? '';
  };

  const records = useMemo(() => {
    if (!db) return [];
    const todayStr = today();
    return [...db.vaccinations]
      .filter((v) => petFilter === 'all' || v.petId === petFilter)
      .filter((v) => scheduleFilter === 'all' || v.scheduleType === scheduleFilter)
      .filter((v) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'Overdue') return v.status === 'Overdue' || (v.status === 'Pending' && v.nextDueDate && v.nextDueDate < todayStr);
        return v.status === statusFilter;
      })
      .sort((a, b) => (b.dateGiven || '9999').localeCompare(a.dateGiven || '9999'));
  }, [db, petFilter, scheduleFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!db) return { total: 0, completed: 0, overdue: 0, upcoming: 0 };
    const todayStr = today();
    const all = db.vaccinations;
    return {
      total: all.length,
      completed: all.filter((v) => v.status === 'Completed').length,
      overdue: all.filter((v) => v.status === 'Overdue' || (v.status === 'Pending' && v.nextDueDate && v.nextDueDate < todayStr)).length,
      upcoming: all.filter((v) => v.status === 'Scheduled' || (v.status === 'Pending' && v.nextDueDate && v.nextDueDate >= todayStr)).length,
    };
  }, [db]);

  const openNew = () => {
    setEditRecord(null);
    setForm({
      petId: '', vaccineName: '', scheduleType: 'Adult', doseNumber: 1, totalDoses: 1,
      dateGiven: '', nextDueDate: '', status: 'Pending', vet: vets[0],
      batchNumber: '', manufacturer: manufacturers[0], expiryDate: '',
      verified: false, certificateId: '', notes: '', reminderSent: false,
    });
    setOpen(true);
  };

  const openEdit = (r: Vaccination) => {
    setEditRecord(r);
    setForm({
      petId: r.petId, vaccineName: r.vaccineName, scheduleType: r.scheduleType,
      doseNumber: r.doseNumber, totalDoses: r.totalDoses, dateGiven: r.dateGiven,
      nextDueDate: r.nextDueDate, status: r.status, vet: r.vet,
      batchNumber: r.batchNumber, manufacturer: r.manufacturer, expiryDate: r.expiryDate,
      verified: r.verified, certificateId: r.certificateId, notes: r.notes, reminderSent: r.reminderSent,
    });
    setOpen(true);
  };

  const saveRecord = () => {
    if (!form.petId || !form.vaccineName) return;
    const pet = petOf(form.petId);
    const ownerId = pet?.ownerId ?? '';
    const certId = form.certificateId || (form.status === 'Completed' ? `CERT-VAC-${String(Date.now()).slice(-6)}` : '');
    const data = {
      petId: form.petId, ownerId, vaccineName: form.vaccineName, scheduleType: form.scheduleType,
      doseNumber: form.doseNumber, totalDoses: form.totalDoses, dateGiven: form.dateGiven,
      nextDueDate: form.nextDueDate, status: form.status, vet: form.vet,
      batchNumber: form.batchNumber, manufacturer: form.manufacturer, expiryDate: form.expiryDate,
      verified: form.verified, certificateId: certId, notes: form.notes, reminderSent: form.reminderSent,
    };
    if (editRecord) {
      update('vaccinations', editRecord.id, data);
    } else {
      create('vaccinations', { id: newId('vac'), ...data });
    }
    setOpen(false);
    setEditRecord(null);
  };

  const deleteRecord = (id: string) => remove('vaccinations', id);

  const applyScheduleTemplate = (schedule: Vaccination['scheduleType']) => {
    set('scheduleType', schedule);
    const templates = vaccineScheduleTemplates[schedule];
    if (templates.length > 0 && !form.vaccineName) {
      set('vaccineName', templates[0].name);
      set('totalDoses', templates[0].doses);
    }
  };

  if (!db) return <Shell title="Vaccinations"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const hasFilters = petFilter !== 'all' || scheduleFilter !== 'all' || statusFilter !== 'all';

  return (
    <Shell title="Vaccinations" subtitle="Vaccination schedules, booster tracking, reminders, and certificates">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center"><Syringe className="w-5 h-5 text-sage" /></div>
            <div><div className="text-2xl font-bold text-ink">{stats.total}</div><div className="text-[11px] text-ink/50">Total records</div></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center"><BadgeCheck className="w-5 h-5 text-sage" /></div>
            <div><div className="text-2xl font-bold text-ink">{stats.completed}</div><div className="text-[11px] text-ink/50">Completed</div></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-coral" /></div>
            <div><div className="text-2xl font-bold text-coral">{stats.overdue}</div><div className="text-[11px] text-ink/50">Overdue</div></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><CalendarClock className="w-5 h-5 text-sky-600" /></div>
            <div><div className="text-2xl font-bold text-sky-600">{stats.upcoming}</div><div className="text-[11px] text-ink/50">Upcoming</div></div>
          </div>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="w-auto">
          <option value="all">All patients</option>
          {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value)} className="w-auto">
          <option value="all">All schedules</option>
          {scheduleTypes.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {hasFilters && (
          <button onClick={() => { setPetFilter('all'); setScheduleFilter('all'); setStatusFilter('all'); }} className="inline-flex items-center gap-1 text-xs text-ink/50 hover:text-ink px-2">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
        <div className="flex-1" />
        <AISuggestionButton onClick={() => { const p = db.pets[0]; if (p) setAiSuggestion(generateVaccinationRecommendation(p, db.vaccinations.filter((v) => v.petId === p.id))); }} label="AI Recommend" />
        <Button onClick={openNew}><Plus className="w-4 h-4" /> New vaccination</Button>
      </div>

      {/* Records list */}
      {records.length === 0 ? (
        <Card><EmptyState icon={Syringe} title="No vaccination records" hint="Add a vaccination record to start tracking a pet's immunization schedule." /></Card>
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const SIcon = statusStyle[r.status]?.icon ?? Clock;
            const isOverdue = r.status === 'Overdue' || (r.status === 'Pending' && r.nextDueDate && r.nextDueDate < today());
            return (
              <Card key={r.id} className="p-4 group hover:ring-2 hover:ring-sage/20 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${statusStyle[r.status]?.bg || 'bg-canvas'}`}>
                      <SIcon className={`w-5 h-5 ${statusStyle[r.status]?.text || 'text-ink/50'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink truncate">{r.vaccineName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${scheduleStyle[r.scheduleType]}`}>{r.scheduleType}</span>
                        {r.verified && <ShieldCheck className="w-3.5 h-3.5 text-sage" />}
                      </div>
                      <div className="text-[11px] text-ink/50 mt-0.5">
                        {petName(r.petId)} · {ownerOf(r.petId)} · {r.vet}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[10px] text-ink/60">
                        <span>Dose {r.doseNumber}/{r.totalDoses}</span>
                        {r.dateGiven && <span>Given: {r.dateGiven}</span>}
                        {r.nextDueDate && (
                          <span className={isOverdue ? 'text-coral font-medium' : ''}>
                            {isOverdue ? <AlertTriangle className="w-3 h-3 inline mr-0.5" /> : <Clock className="w-3 h-3 inline mr-0.5" />}
                            {isOverdue ? 'Overdue since' : 'Next due'}: {r.nextDueDate}
                          </span>
                        )}
                        {r.batchNumber && <span>Batch: {r.batchNumber}</span>}
                        {r.manufacturer && <span>{r.manufacturer}</span>}
                        {r.certificateId && <span className="text-sage font-medium flex items-center gap-0.5"><FileCheck className="w-3 h-3" /> {r.certificateId}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusStyle[r.status]?.bg} ${statusStyle[r.status]?.text}`}>{r.status}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === 'Completed' && r.certificateId && (
                        <button onClick={() => setCertRecord(r)} className="w-7 h-7 rounded-lg hover:bg-mint text-ink/40 hover:text-sage flex items-center justify-center transition-colors" title="View certificate">
                          <FileCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteRecord(r.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {r.notes && <div className="mt-2 text-xs text-ink/50 pl-13 border-l-2 border-line ml-12 pl-3">{r.notes}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {aiSuggestion && (
        <div className="mb-5">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={open} onClose={() => { setOpen(false); setEditRecord(null); }} title={editRecord ? 'Edit vaccination record' : 'New vaccination record'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient">
              <Select value={form.petId} onChange={(e) => set('petId', e.target.value)}>
                <option value="">Select a pet…</option>
                {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
              </Select>
            </Field>
            <Field label="Schedule type">
              <Select value={form.scheduleType} onChange={(e) => applyScheduleTemplate(e.target.value as Vaccination['scheduleType'])}>
                {scheduleTypes.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>

          {form.scheduleType !== 'Custom' && vaccineScheduleTemplates[form.scheduleType].length > 0 && (
            <div className="rounded-lg bg-canvas/60 p-3 border border-line">
              <div className="text-[10px] text-ink/50 uppercase tracking-wide font-medium mb-2 flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> {form.scheduleType} vaccine templates
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vaccineScheduleTemplates[form.scheduleType].map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => { set('vaccineName', tpl.name); set('totalDoses', tpl.doses); }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${form.vaccineName === tpl.name ? 'bg-sage text-white border-sage' : 'bg-white text-ink/60 border-line hover:border-sage/40'}`}
                  >
                    {tpl.name} ({tpl.doses} dose{tpl.doses > 1 ? 's' : ''})
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Vaccine name">
            <input className={inputCls} value={form.vaccineName} onChange={(e) => set('vaccineName', e.target.value)} placeholder="e.g. Rabies, DHPP, FVRCP" />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Dose number"><NumberInput value={String(form.doseNumber)} onChange={(e) => set('doseNumber', parseInt(e.target.value) || 1)} /></Field>
            <Field label="Total doses"><NumberInput value={String(form.totalDoses)} onChange={(e) => set('totalDoses', parseInt(e.target.value) || 1)} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Veterinarian">
              <Select value={form.vet} onChange={(e) => set('vet', e.target.value)}>
                {vets.map((v) => <option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Date given"><DateInput value={form.dateGiven} onChange={(e) => set('dateGiven', e.target.value)} /></Field>
            <Field label="Next due date"><DateInput value={form.nextDueDate} onChange={(e) => set('nextDueDate', e.target.value)} /></Field>
          </div>

          <div className="border-t border-line pt-3">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-3">Vaccine Verification</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Batch number"><input className={inputCls} value={form.batchNumber} onChange={(e) => set('batchNumber', e.target.value)} placeholder="RB-2402" /></Field>
              <Field label="Manufacturer">
                <Select value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)}>
                  {manufacturers.map((m) => <option key={m}>{m}</option>)}
                  <option>Other</option>
                </Select>
              </Field>
              <Field label="Expiry date"><DateInput value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
            </div>
          </div>

          <div className="border-t border-line pt-3 space-y-3">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Certificate & Reminders</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Certificate ID"><input className={inputCls} value={form.certificateId} onChange={(e) => set('certificateId', e.target.value)} placeholder="Auto-generated if completed" /></Field>
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.verified} onChange={(e) => set('verified', e.target.checked)} className="w-4 h-4 rounded accent-sage" />
                  <span className="text-xs text-ink/70">Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.reminderSent} onChange={(e) => set('reminderSent', e.target.checked)} className="w-4 h-4 rounded accent-sage" />
                  <span className="text-xs text-ink/70">Reminder sent</span>
                </label>
              </div>
            </div>
          </div>

          <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Administration route, site, reactions, special instructions…" className="min-h-[60px]" /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditRecord(null); }}>Cancel</Button>
            <Button onClick={saveRecord}>{editRecord ? 'Save changes' : 'Save record'}</Button>
          </div>
        </div>
      </Modal>

      {/* Certificate modal */}
      <Modal open={!!certRecord} onClose={() => setCertRecord(null)} title="Vaccination Certificate" wide>
        {certRecord && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-sage/30 bg-gradient-to-br from-mint/30 to-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center"><Syringe className="w-5 h-5 text-white" /></div>
                  <div>
                    <div className="text-sm font-bold text-ink">PetCare Pro</div>
                    <div className="text-[10px] text-ink/50">Vaccination Certificate</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-ink/40">Certificate ID</div>
                  <div className="text-sm font-mono font-semibold text-sage">{certRecord.certificateId}</div>
                </div>
              </div>

              <div className="border-t border-sage/20 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Patient</div>
                    <div className="text-sm font-semibold text-ink">{petName(certRecord.petId)}</div>
                    {petOf(certRecord.petId) && (
                      <div className="text-[11px] text-ink/50">{petOf(certRecord.petId)!.species} · {petOf(certRecord.petId)!.breed}</div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Owner</div>
                    <div className="text-sm font-semibold text-ink">{ownerOf(certRecord.petId)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Vaccine</div>
                    <div className="text-sm font-semibold text-ink">{certRecord.vaccineName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Schedule</div>
                    <div className="text-sm text-ink">{certRecord.scheduleType}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Dose</div>
                    <div className="text-sm text-ink">{certRecord.doseNumber} of {certRecord.totalDoses}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Date administered</div>
                    <div className="text-sm text-ink">{certRecord.dateGiven}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Next due</div>
                    <div className="text-sm text-ink">{certRecord.nextDueDate || 'N/A'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Batch number</div>
                    <div className="text-sm font-mono text-ink">{certRecord.batchNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Manufacturer</div>
                    <div className="text-sm text-ink">{certRecord.manufacturer}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Expiry date</div>
                    <div className="text-sm text-ink">{certRecord.expiryDate}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-ink/40 uppercase tracking-wide">Administered by</div>
                  <div className="text-sm text-ink">{certRecord.vet}</div>
                </div>

                {certRecord.notes && (
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide">Notes</div>
                    <div className="text-xs text-ink/70">{certRecord.notes}</div>
                  </div>
                )}
              </div>

              <div className="border-t border-sage/20 mt-4 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {certRecord.verified ? (
                    <><ShieldCheck className="w-5 h-5 text-sage" /><span className="text-xs font-medium text-sage">Verified by {certRecord.vet}</span></>
                  ) : (
                    <><ShieldAlert className="w-5 h-5 text-ink/40" /><span className="text-xs text-ink/50">Pending verification</span></>
                  )}
                </div>
                <div className="text-[10px] text-ink/40">Issued: {certRecord.dateGiven}</div>
              </div>
            </div>

            {certRecord.notes && (
              <div className="rounded-lg border border-line p-3">
                <div className="text-[10px] text-ink/40 uppercase tracking-wide font-medium mb-1">Clinical Notes</div>
                <div className="text-xs text-ink/70">{certRecord.notes}</div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { openEdit(certRecord); setCertRecord(null); }}>
                <Edit2 className="w-4 h-4" /> Edit record
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
