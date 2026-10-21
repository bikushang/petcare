'use client';

import { useMemo, useState, useRef } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Pill, Clock, Repeat, CheckCircle2,
  Printer, Download, X, AlertTriangle, ChevronDown, ChevronUp,
  FlaskRound, Utensils, RefreshCw, ShieldCheck, Package,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, Input, Select, Textarea, NumberInput, DatePicker, Checkbox } from '../components/ui';
import { useDB, Prescription, PrescriptionItem, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generatePrescriptionSuggestion } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const statuses = ['Active', 'Pending', 'Completed', 'Expired', 'Cancelled'] as const;
const VET_ROLES = ['Veterinarian', 'Veterinary Nurse'];
const routes = ['Oral', 'Topical', 'Injectable (SC)', 'Injectable (IM)', 'Injectable (IV)', 'Sublingual', 'Intranasal', 'Ophthalmic', 'Otic', 'Rectal', 'Inhalation'] as const;
const frequencies = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every other day', 'Weekly', 'As needed', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours'] as const;
const dosageUnits = ['mg', 'ml', 'tablet', 'capsule', 'drop', 'mg/kg', 'ml/kg', 'IU', 'spray', 'patch'] as const;
const durationUnits = ['days', 'weeks', 'months', 'ongoing'] as const;
const foodRestrictions = ['None', 'With food', 'Before food', 'After food', 'Empty stomach', 'With water'] as const;

const statusStyle: Record<Prescription['status'], { bg: string; text: string; dot: string }> = {
  Active: { bg: 'bg-lilac', text: 'text-plum', dot: 'bg-plum' },
  Pending: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Completed: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  Expired: { bg: 'bg-canvas', text: 'text-ink/40', dot: 'bg-ink/30' },
  Cancelled: { bg: 'bg-coral/15', text: 'text-coral', dot: 'bg-coral' },
};

const blankItem = (): PrescriptionItem => ({
  medicineName: '', medicineId: '', dosage: '', dosageValue: 0, dosageUnit: 'mg',
  frequency: 'Once daily', duration: '', durationValue: 0, durationUnit: 'days',
  route: 'Oral', instructions: '', foodRestriction: 'None', foodRestrictionNotes: '',
  alternatives: [], quantity: 0, refillsRemaining: 0, stockItemId: '',
});

const blankForm = () => ({
  petId: '', vet: '', date: today(), status: 'Pending' as Prescription['status'],
  diagnosis: '', notes: '', isRepeat: false, maxRepeats: 0, expiresAt: '',
  items: [blankItem()],
});

export default function PrescriptionsPage() {
  const { db, create, update, remove } = useDB();
  const vets = useMemo(() => {
    if (!db) return [] as string[];
    return db.staff.filter((s) => VET_ROLES.includes(s.role) && s.status === 'Active').map((s) => s.name);
  }, [db]);
  const [open, setOpen] = useState(false);
  const [editRx, setEditRx] = useState<Prescription | null>(null);
  const [form, setForm] = useState(blankForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printRx, setPrintRx] = useState<Prescription | null>(null);
  const [petFilter, setPetFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const printRef = useRef<HTMLDivElement>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const petName = (id: string) => db?.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const petOf = (id: string) => db?.pets.find((p) => p.id === id);
  const ownerOf = (petId: string) => {
    const pet = db?.pets.find((p) => p.id === petId);
    return pet ? db?.owners.find((o) => o.id === pet.ownerId)?.name ?? '' : '';
  };

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (idx: number, k: string, v: string | number | string[]) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)),
    }));

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const filtered = useMemo(() => {
    if (!db) return [];
    return [...db.prescriptions]
      .filter((r) => petFilter === 'all' || r.petId === petFilter)
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db, petFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!db) return { total: 0, active: 0, pending: 0, repeats: 0 };
    const all = db.prescriptions;
    return {
      total: all.length,
      active: all.filter((r) => r.status === 'Active').length,
      pending: all.filter((r) => r.status === 'Pending').length,
      repeats: all.filter((r) => r.isRepeat).length,
    };
  }, [db]);

  const openNew = () => {
    setEditRx(null);
    setForm({ ...blankForm(), vet: vets[0] ?? '' });
    setOpen(true);
  };

  const openEdit = (r: Prescription) => {
    setEditRx(r);
    setForm({
      petId: r.petId, vet: r.vet, date: r.date, status: r.status, diagnosis: r.diagnosis,
      notes: r.notes, isRepeat: r.isRepeat, maxRepeats: r.maxRepeats, expiresAt: r.expiresAt,
      items: r.items.length ? r.items.map((it) => ({ ...it })) : [blankItem()],
    });
    setOpen(true);
  };

  const saveRx = () => {
    if (!form.petId || form.items.length === 0) return;
    const pet = petOf(form.petId);
    const ownerId = pet?.ownerId ?? '';
    const rxNum = editRx?.prescriptionNumber || `RX-${String(Date.now()).slice(-4)}`;
    const items = form.items.filter((it) => it.medicineName);
    if (items.length === 0) return;
    const data = {
      prescriptionNumber: rxNum, petId: form.petId, ownerId, medRecordId: editRx?.medRecordId ?? '',
      vet: form.vet, date: form.date, status: form.status, items, diagnosis: form.diagnosis,
      notes: form.notes, isRepeat: form.isRepeat, repeatCount: editRx?.repeatCount ?? 0,
      maxRepeats: form.maxRepeats, parentPrescriptionId: editRx?.parentPrescriptionId ?? '',
      expiresAt: form.expiresAt, verified: editRx?.verified ?? false,
      dispensed: editRx?.dispensed ?? false, dispensedDate: editRx?.dispensedDate ?? '',
      dispensedBy: editRx?.dispensedBy ?? '',
    };
    if (editRx) {
      update('prescriptions', editRx.id, data);
    } else {
      create('prescriptions', { id: newId('rx'), ...data } as Prescription);
    }
    setOpen(false);
    setEditRx(null);
  };

  const deleteRx = (id: string) => remove('prescriptions', id);

  const repeatRx = (r: Prescription) => {
    if (r.repeatCount >= r.maxRepeats) return;
    const newRxNum = `RX-${String(Date.now()).slice(-4)}`;
    create('prescriptions', {
      id: newId('rx'),
      prescriptionNumber: newRxNum,
      petId: r.petId, ownerId: r.ownerId, medRecordId: r.medRecordId,
      vet: r.vet, date: today(), status: 'Pending',
      items: r.items.map((it) => ({ ...it, refillsRemaining: Math.max(0, it.refillsRemaining - 1) })),
      diagnosis: r.diagnosis, notes: `Repeat of ${r.prescriptionNumber}. ${r.notes}`,
      isRepeat: true, repeatCount: r.repeatCount + 1, maxRepeats: r.maxRepeats,
      parentPrescriptionId: r.id, expiresAt: '', verified: false,
      dispensed: false, dispensedDate: '', dispensedBy: '',
    } as Prescription);
    update('prescriptions', r.id, { repeatCount: r.repeatCount + 1 });
  };

  const handlePrint = () => {
    if (!printRx) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const pet = petOf(printRx.petId);
    const ownerName = ownerOf(printRx.petId);
    win.document.write(`<!DOCTYPE html><html><head><title>Prescription ${printRx.prescriptionNumber}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;font-family:Georgia,serif;color:#1a1a1a}
      body{padding:40px;max-width:700px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4C1D95;padding-bottom:16px;margin-bottom:24px}
      .clinic-name{font-size:22px;font-weight:bold;color:#4C1D95}
      .clinic-sub{font-size:12px;color:#666;margin-top:2px}
      .rx-num{font-size:12px;color:#666;text-align:right}
      .rx-num b{font-size:14px;color:#4C1D95;font-family:monospace}
      .patient-box{background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .patient-box .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999}
      .patient-box .value{font-size:14px;font-weight:bold}
      .rx-symbol{font-size:36px;color:#4C1D95;font-style:italic;margin-bottom:12px}
      .diagnosis{font-size:13px;margin-bottom:16px;padding:12px;background:#fff8e6;border-left:3px solid #d4a017;border-radius:4px}
      .diagnosis b{color:#8a6d00}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}
      th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;padding:8px 6px;border-bottom:2px solid #e0e0e0}
      td{padding:10px 6px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top}
      .med-name{font-weight:bold}
      .med-detail{font-size:11px;color:#666;margin-top:2px}
      .instructions{font-size:11px;color:#555;font-style:italic;margin-top:4px}
      .food-restr{font-size:10px;color:#c95a1f;margin-top:2px}
      .alt{font-size:10px;color:#888;margin-top:2px}
      .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between}
      .signature{text-align:right}
      .sig-line{border-top:1px solid #333;width:200px;margin-bottom:4px}
      .sig-name{font-size:13px;font-weight:bold}
      .sig-title{font-size:11px;color:#666}
      .notes{font-size:11px;color:#666;margin-top:16px;padding:10px;background:#f8f9fa;border-radius:4px}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      <div><div class="clinic-name">PetCare Pro</div><div class="clinic-sub">Vetnora Animal Hospital &middot; 128 Maple Ave, Vetnora, CA</div></div>
      <div class="rx-num">Prescription ID<br><b>${printRx.prescriptionNumber}</b><br>${printRx.date}</div>
    </div>
    <div class="patient-box">
      <div><div class="label">Patient</div><div class="value">${pet?.name ?? ''} (${pet?.species ?? ''}, ${pet?.breed ?? ''})</div></div>
      <div><div class="label">Owner</div><div class="value">${ownerName}</div></div>
      <div><div class="label">Weight</div><div class="value">${pet?.weightKg ?? ''} kg</div></div>
      <div><div class="label">Prescribing Vet</div><div class="value">${printRx.vet}</div></div>
    </div>
    <div class="rx-symbol">Rx</div>
    ${printRx.diagnosis ? `<div class="diagnosis"><b>Diagnosis:</b> ${printRx.diagnosis}</div>` : ''}
    <table>
      <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th><th>Route</th></tr></thead>
      <tbody>
      ${printRx.items.map((it, i) => `<tr>
        <td>${i + 1}</td>
        <td><div class="med-name">${it.medicineName}</div>${it.alternatives.length ? `<div class="alt">Alternatives: ${it.alternatives.join(', ')}</div>` : ''}</td>
        <td>${it.dosage || `${it.dosageValue} ${it.dosageUnit}`}<div class="med-detail">Qty: ${it.quantity}</div></td>
        <td>${it.frequency}</td>
        <td>${it.duration || `${it.durationValue} ${it.durationUnit}`}</td>
        <td>${it.route}</td>
      </tr>
      ${it.instructions ? `<tr><td colspan="6"><div class="instructions">${it.instructions}</div></td></tr>` : ''}
      ${it.foodRestriction !== 'None' ? `<tr><td colspan="6"><div class="food-restr">Food: ${it.foodRestriction}${it.foodRestrictionNotes ? ' — ' + it.foodRestrictionNotes : ''}</div></td></tr>` : ''}
      `).join('')}
      </tbody>
    </table>
    ${printRx.notes ? `<div class="notes"><b>Notes:</b> ${printRx.notes}</div>` : ''}
    ${printRx.isRepeat ? `<div class="notes"><b>Repeat prescription:</b> ${printRx.repeatCount} of ${printRx.maxRepeats} repeats used. Parent: ${printRx.parentPrescriptionId}</div>` : ''}
    <div class="footer">
      <div>Status: ${printRx.status}${printRx.dispensed ? ' — Dispensed' : ''}</div>
      <div class="signature">
        <div class="sig-line"></div>
        <div class="sig-name">${printRx.vet}</div>
        <div class="sig-title">Veterinarian, PetCare Pro</div>
      </div>
    </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleDownload = () => {
    if (!printRx) return;
    const pet = petOf(printRx.petId);
    const ownerName = ownerOf(printRx.petId);
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      '                    PETCARE PRO',
      '         Vetnora Animal Hospital',
      '      128 Maple Ave, Vetnora, CA 94110',
      '═══════════════════════════════════════════════════════════',
      '',
      `  Prescription No: ${printRx.prescriptionNumber}`,
      `  Date:           ${printRx.date}`,
      `  Status:         ${printRx.status}`,
      '',
      '─── PATIENT ──────────────────────────────────────────────',
      `  Patient:  ${pet?.name ?? ''} (${pet?.species ?? ''}, ${pet?.breed ?? ''})`,
      `  Owner:    ${ownerName}`,
      `  Weight:   ${pet?.weightKg ?? ''} kg`,
      `  Vet:      ${printRx.vet}`,
      '',
    ];
    if (printRx.diagnosis) lines.push(`  Diagnosis: ${printRx.diagnosis}`, '');
    lines.push('─── PRESCRIBED MEDICATIONS ───────────────────────────────');
    printRx.items.forEach((it, i) => {
      lines.push(
        `  ${i + 1}. ${it.medicineName}`,
        `     Dosage:    ${it.dosage || `${it.dosageValue} ${it.dosageUnit}`}`,
        `     Frequency: ${it.frequency}`,
        `     Duration:  ${it.duration || `${it.durationValue} ${it.durationUnit}`}`,
        `     Route:     ${it.route}`,
        `     Quantity:  ${it.quantity}`,
      );
      if (it.foodRestriction !== 'None') lines.push(`     Food:      ${it.foodRestriction}${it.foodRestrictionNotes ? ' — ' + it.foodRestrictionNotes : ''}`);
      if (it.instructions) lines.push(`     Notes:     ${it.instructions}`);
      if (it.alternatives.length) lines.push(`     Alt:       ${it.alternatives.join(', ')}`);
      if (it.refillsRemaining > 0) lines.push(`     Refills:   ${it.refillsRemaining} remaining`);
      lines.push('');
    });
    if (printRx.notes) lines.push(`  Notes: ${printRx.notes}`, '');
    if (printRx.isRepeat) lines.push(`  Repeat Prescription: ${printRx.repeatCount}/${printRx.maxRepeats} used. Parent: ${printRx.parentPrescriptionId}`, '');
    lines.push('─── SIGNATURE ───────────────────────────────────────────', '');
    lines.push(`  ${printRx.vet}`, '  Veterinarian, PetCare Pro', '');
    lines.push('═══════════════════════════════════════════════════════════');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${printRx.prescriptionNumber}_${pet?.name ?? 'pet'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!db) return <Shell module="prescriptions" title="Prescriptions"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const hasFilters = petFilter !== 'all' || statusFilter !== 'all';

  return (
    <Shell title="Prescriptions" subtitle="Prescription management with medicine selection, dosage, frequency, food restrictions, repeats, and printable documents">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><FileText className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-ink">{stats.total}</div><div className="text-[11px] text-ink/50">Total prescriptions</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-plum">{stats.active}</div><div className="text-[11px] text-ink/50">Active</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><div className="text-2xl font-bold text-amber-600">{stats.pending}</div><div className="text-[11px] text-ink/50">Pending</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><Repeat className="w-5 h-5 text-sky-600" /></div><div><div className="text-2xl font-bold text-sky-600">{stats.repeats}</div><div className="text-[11px] text-ink/50">Repeat prescriptions</div></div></div></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="w-auto">
          <option value="all">All patients</option>
          {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {hasFilters && (
          <button onClick={() => { setPetFilter('all'); setStatusFilter('all'); }} className="inline-flex items-center gap-1 text-xs text-ink/50 hover:text-ink px-2">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <AISuggestionButton onClick={() => { const p = db?.pets[0]; if (p) setAiSuggestion(generatePrescriptionSuggestion(p)); }} label="AI Suggest" />
          <Button onClick={openNew}><Plus className="w-4 h-4" /> New prescription</Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No prescriptions" hint="Create a prescription to start managing medications for your patients." /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            const S = statusStyle[r.status];
            const canRepeat = r.isRepeat && r.repeatCount < r.maxRepeats;
            return (
              <Card key={r.id} className="group hover:ring-2 hover:ring-plum/20 transition-all">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expanded ? null : r.id)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${S.bg}`}>
                      <FileText className={`w-5 h-5 ${S.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{r.prescriptionNumber}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${S.bg} ${S.text}`}>{r.status}</span>
                        {r.isRepeat && <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 font-medium flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" /> Repeat {r.repeatCount}/{r.maxRepeats}</span>}
                        {r.dispensed && <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium flex items-center gap-0.5"><Package className="w-2.5 h-2.5" /> Dispensed</span>}
                        {r.verified && <ShieldCheck className="w-3.5 h-3.5 text-plum" />}
                      </div>
                      <div className="text-[11px] text-ink/50 mt-0.5">
                        {petName(r.petId)} · {ownerOf(r.petId)} · {r.vet} · {r.date}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {r.items.slice(0, 3).map((it, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-canvas/60 text-ink/60">{it.medicineName}</span>
                        ))}
                        {r.items.length > 3 && <span className="text-[10px] text-ink/40">+{r.items.length - 3} more</span>}
                      </div>
                      {r.diagnosis && <div className="text-[11px] text-ink/50 mt-1 italic">Dx: {r.diagnosis}</div>}
                    </div>
                    <button className="text-ink/30 hover:text-ink mt-1">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setPrintRx(r)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Print / Download">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {canRepeat && (
                      <button onClick={() => repeatRx(r)} className="w-7 h-7 rounded-lg hover:bg-sky-50 text-ink/40 hover:text-sky-600 flex items-center justify-center transition-colors" title="Repeat prescription">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteRx(r.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-line px-4 pb-4 pt-3 space-y-3 bg-canvas/30">
                    {r.items.map((it, i) => (
                      <div key={i} className="rounded-lg border border-line bg-white p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <FlaskRound className="w-4 h-4 text-plum shrink-0" />
                              <span className="text-sm font-semibold text-ink">{it.medicineName}</span>
                              {it.refillsRemaining > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 font-medium">{it.refillsRemaining} refills</span>}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-[11px] text-ink/60">
                              <div><span className="text-ink/40">Dosage:</span> <span className="font-medium text-ink/70">{it.dosage || `${it.dosageValue} ${it.dosageUnit}`}</span></div>
                              <div><span className="text-ink/40">Frequency:</span> <span className="font-medium text-ink/70">{it.frequency}</span></div>
                              <div><span className="text-ink/40">Duration:</span> <span className="font-medium text-ink/70">{it.duration || `${it.durationValue} ${it.durationUnit}`}</span></div>
                              <div><span className="text-ink/40">Route:</span> <span className="font-medium text-ink/70">{it.route}</span></div>
                              <div><span className="text-ink/40">Quantity:</span> <span className="font-medium text-ink/70">{it.quantity}</span></div>
                              {it.foodRestriction !== 'None' && (
                                <div className="flex items-center gap-1"><Utensils className="w-3 h-3 text-amber-600" /><span className="text-ink/40">Food:</span> <span className="font-medium text-amber-700">{it.foodRestriction}{it.foodRestrictionNotes ? ` — ${it.foodRestrictionNotes}` : ''}</span></div>
                              )}
                            </div>
                            {it.instructions && <div className="mt-2 text-xs text-ink/60 italic border-l-2 border-line pl-2">{it.instructions}</div>}
                            {it.alternatives.length > 0 && (
                              <div className="mt-1.5 text-[11px] text-ink/40">
                                <span className="font-medium">Alternatives:</span> {it.alternatives.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {r.notes && <div className="text-xs text-ink/50 border-l-2 border-line pl-3">{r.notes}</div>}
                    {r.expiresAt && <div className="text-[11px] text-ink/40 flex items-center gap-1"><Clock className="w-3 h-3" /> Expires: {r.expiresAt}</div>}
                    {r.dispensed && r.dispensedBy && <div className="text-[11px] text-plum flex items-center gap-1"><Package className="w-3 h-3" /> Dispensed by {r.dispensedBy} on {r.dispensedDate}</div>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {aiSuggestion && (
        <div className="mb-4">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditRx(null); }} title={editRx ? `Edit ${editRx.prescriptionNumber}` : 'New prescription'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Patient">
              <Select value={form.petId} onChange={(e) => set('petId', e.target.value)}>
                <option value="">Select pet…</option>
                {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
              </Select>
            </Field>
            <Field label="Veterinarian">
              <Select value={form.vet} onChange={(e) => set('vet', e.target.value)}>
                {vets.map((v) => <option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Date"><DatePicker value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Diagnosis"><Input value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="e.g. Acute otitis externa, bacterial" /></Field>

          {/* Items */}
          <div className="border-t border-line pt-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Medications</div>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3.5 h-3.5" /> Add medicine</Button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {form.items.map((it, idx) => (
                <div key={idx} className="rounded-lg border border-line p-3 bg-canvas/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-ink/50">Medicine {idx + 1}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="w-6 h-6 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Medicine selection from stock */}
                  <Field label="Medicine name">
                    <div className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={it.medicineName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const stockItem = db.medStock.find((s) => s.name === val);
                          setItem(idx, 'medicineName', val);
                          if (stockItem) {
                            setItem(idx, 'stockItemId', stockItem.id);
                            setItem(idx, 'quantity', Math.max(it.quantity, 1));
                          }
                        }}
                        placeholder="Type or select from pharmacy inventory"
                      />
                      <Select
                        className="w-56 shrink-0"
                        placeholder="From inventory…"
                        value={it.stockItemId}
                        onChange={(e) => {
                          const stockItem = db.medStock.find((s) => s.id === e.target.value);
                          if (!stockItem) return;
                          setItem(idx, 'stockItemId', stockItem.id);
                          setItem(idx, 'medicineName', stockItem.name);
                          setItem(idx, 'quantity', Math.max(it.quantity, 1));
                        }}
                      >
                        {db.medStock.filter((s) => s.category === 'Medicine' || s.category === 'Supplement').map((s) => (
                          <option key={s.id} value={s.id}>{s.name} — Stock: {s.stock} {s.unit} — ${s.price}</option>
                        ))}
                      </Select>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    <Field label="Dosage">
                      <Input value={it.dosage} onChange={(e) => setItem(idx, 'dosage', e.target.value)} placeholder="0.1 mg/kg" />
                    </Field>
                    <Field label="Dosage unit">
                      <Select value={it.dosageUnit} onChange={(e) => setItem(idx, 'dosageUnit', e.target.value)}>
                        {dosageUnits.map((u) => <option key={u}>{u}</option>)}
                      </Select>
                    </Field>
                    <Field label="Frequency">
                      <Select value={it.frequency} onChange={(e) => setItem(idx, 'frequency', e.target.value)}>
                        {frequencies.map((f) => <option key={f}>{f}</option>)}
                      </Select>
                    </Field>
                    <Field label="Route">
                      <Select value={it.route} onChange={(e) => setItem(idx, 'route', e.target.value)}>
                        {routes.map((r) => <option key={r}>{r}</option>)}
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    <Field label="Duration value"><NumberInput value={String(it.durationValue)} onChange={(e) => setItem(idx, 'durationValue', parseInt(e.target.value) || 0)} /></Field>
                    <Field label="Duration unit">
                      <Select value={it.durationUnit} onChange={(e) => setItem(idx, 'durationUnit', e.target.value)}>
                        {durationUnits.map((u) => <option key={u}>{u}</option>)}
                      </Select>
                    </Field>
                    <Field label="Quantity"><NumberInput value={String(it.quantity)} onChange={(e) => setItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></Field>
                    <Field label="Refills remaining"><NumberInput value={String(it.refillsRemaining)} onChange={(e) => setItem(idx, 'refillsRemaining', parseInt(e.target.value) || 0)} /></Field>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Field label="Food restriction">
                      <Select value={it.foodRestriction} onChange={(e) => setItem(idx, 'foodRestriction', e.target.value)}>
                        {foodRestrictions.map((f) => <option key={f}>{f}</option>)}
                      </Select>
                    </Field>
                    <Field label="Food restriction notes"><Input value={it.foodRestrictionNotes} onChange={(e) => setItem(idx, 'foodRestrictionNotes', e.target.value)} placeholder="Give with morning meal" /></Field>
                  </div>

                  <div className="mt-2"><Field label="Instructions"><Textarea value={it.instructions} onChange={(e) => setItem(idx, 'instructions', e.target.value)} placeholder="Complete full course. Shake well before use…" className="min-h-[50px]" /></Field></div>

                  <div className="mt-2"><Field label="Alternative medicines (comma-separated)">
                    <Input
                      value={it.alternatives.join(', ')}
                      onChange={(e) => setItem(idx, 'alternatives', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                      placeholder="Carprofen, Firocoxib, Robenacoxib"
                    />
                  </Field>
                </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repeat settings */}
          <div className="border-t border-line pt-3">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-3">Repeat prescription settings</div>
            <div className="flex items-center gap-4">
              <Checkbox checked={form.isRepeat} onChange={(e) => set('isRepeat', e.target.checked)} label="Allow repeats" className="shrink-0" />
              {form.isRepeat && (
                <Field label="Max repeats" className="w-40 shrink-0"><NumberInput value={String(form.maxRepeats)} onChange={(e) => set('maxRepeats', parseInt(e.target.value) || 0)} /></Field>
              )}
              <Field label="Expires at" className="w-48 shrink-0"><DatePicker value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></Field>
            </div>
          </div>

          <Field label="Prescription notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Follow-up instructions, warnings, monitoring notes…" className="min-h-[50px]" /></Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditRx(null); }}>Cancel</Button>
            <Button onClick={saveRx}>{editRx ? 'Save changes' : 'Create prescription'}</Button>
          </div>
        </div>
      </Modal>

      {/* Print / Download modal */}
      <Modal open={!!printRx} onClose={() => setPrintRx(null)} title={`Prescription ${printRx?.prescriptionNumber ?? ''}`} wide>
        {printRx && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-plum/30 bg-gradient-to-br from-lilac/20 to-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-plum flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
                  <div><div className="text-sm font-bold text-ink">PetCare Pro</div><div className="text-[10px] text-ink/50">Prescription Document</div></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-ink/40">Prescription No</div>
                  <div className="text-sm font-mono font-semibold text-plum">{printRx.prescriptionNumber}</div>
                </div>
              </div>
              <div className="border-t border-plum/20 pt-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Patient:</span> <span className="font-medium text-ink">{petName(printRx.petId)}</span></div>
                  <div><span className="text-ink/40">Owner:</span> <span className="font-medium text-ink">{ownerOf(printRx.petId)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Vet:</span> <span className="font-medium text-ink">{printRx.vet}</span></div>
                  <div><span className="text-ink/40">Date:</span> <span className="font-medium text-ink">{printRx.date}</span></div>
                </div>
                {printRx.diagnosis && <div><span className="text-ink/40">Diagnosis:</span> <span className="font-medium text-ink">{printRx.diagnosis}</span></div>}
              </div>
              <div className="border-t border-plum/20 mt-3 pt-3 space-y-2">
                <div className="text-[10px] font-semibold text-plum uppercase tracking-wide">Prescribed Medications</div>
                {printRx.items.map((it, i) => (
                  <div key={i} className="text-xs text-ink/70">
                    <span className="font-semibold text-ink">{i + 1}. {it.medicineName}</span> — {it.dosage || `${it.dosageValue} ${it.dosageUnit}`}, {it.frequency}, {it.duration || `${it.durationValue} ${it.durationUnit}`}, {it.route}
                    {it.foodRestriction !== 'None' && <span className="text-amber-600"> · {it.foodRestriction}</span>}
                    {it.instructions && <div className="text-[11px] text-ink/50 italic pl-3">{it.instructions}</div>}
                    {it.alternatives.length > 0 && <div className="text-[11px] text-ink/40 pl-3">Alt: {it.alternatives.join(', ')}</div>}
                  </div>
                ))}
              </div>
              {printRx.notes && <div className="border-t border-plum/20 mt-3 pt-2 text-[11px] text-ink/50">{printRx.notes}</div>}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDownload}><Download className="w-4 h-4" /> Download as text</Button>
              <Button onClick={handlePrint}><Printer className="w-4 h-4" /> Print prescription</Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
