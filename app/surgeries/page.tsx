'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Edit2, Trash2, Stethoscope, Clock, User, Heart, Activity,
  ShieldCheck, ClipboardList, FileText, Syringe, Home, Repeat,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, X, Printer,
  Calendar, Users, FlaskRound, Pill, ClipboardCheck, BedDouble,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, Input, Select, Textarea, NumberInput, DatePicker, TimeInput, Checkbox, Badge, Tabs } from '../components/ui';
import { useDB, Surgery, StaffAssignment, EquipmentItem, AnesthesiaVital, RecoveryVital, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateSurgerySummary } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const statuses = ['Scheduled', 'Pre-op', 'In surgery', 'Recovery', 'Completed', 'Cancelled'] as const;
const procedureTypes = ['Planned', 'Emergency'] as const;
const categories = ['Soft tissue', 'Orthopedic', 'Dental', 'Ophthalmic', 'Neurologic', 'Abdominal', 'Other'] as const;
const theaters = ['Theater A', 'Theater B', 'Dental Suite'];
const VET_ROLES = ['Veterinarian', 'Veterinary Nurse'];
const staffRoles = ['Surgeon', 'Anesthetist', 'Surgical Nurse', 'Assistant', 'Recovery Nurse'] as const;
const equipCategories = ['Surgical instrument', 'Anesthesia equipment', 'Monitoring device', 'Consumable', 'Imaging'] as const;
const outcomes = ['Successful', 'Successful with complications', 'Unsuccessful', 'Pending'] as const;
const consciousnessLevels = ['Awake', 'Drowsy', 'Stuporous', 'Unconscious'] as const;

const statusStyle: Record<Surgery['status'], { bg: string; text: string; dot: string }> = {
  Scheduled: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  'Pre-op': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'In surgery': { bg: 'bg-coral/15', text: 'text-coral', dot: 'bg-coral' },
  Recovery: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  Completed: { bg: 'bg-lilac', text: 'text-plum', dot: 'bg-plum' },
  Cancelled: { bg: 'bg-canvas', text: 'text-ink/40', dot: 'bg-ink/30' },
};

const outcomeStyle: Record<Surgery['outcome'], string> = {
  Successful: 'text-plum bg-lilac',
  'Successful with complications': 'text-amber-700 bg-amber-100',
  Unsuccessful: 'text-coral bg-coral/15',
  Pending: 'text-ink/40 bg-canvas',
};

type Tab = 'overview' | 'preop' | 'surgery' | 'anesthesia' | 'recovery' | 'discharge';

const blankStaff = (): StaffAssignment => ({ role: 'Assistant', staffId: '', staffName: '' });
const blankEquip = (): EquipmentItem => ({ id: '', name: '', category: 'Surgical instrument', required: true, checked: false, notes: '' });
const blankAnesthesiaVital = (): AnesthesiaVital => ({ time: '', heartRate: 0, respiratoryRate: 0, temperatureC: 0, bloodPressureSys: 0, bloodPressureDia: 0, oxygenLevel: 0, etCO2: 0, notes: '' });
const blankRecoveryVital = (): RecoveryVital => ({ time: '', temperatureC: 0, heartRate: 0, respiratoryRate: 0, painScore: 0, consciousness: 'Unconscious', notes: '' });

const blankForm = () => ({
  petId: '',
  procedureName: '',
  procedureType: 'Planned' as Surgery['procedureType'],
  category: 'Soft tissue' as Surgery['category'],
  date: today(),
  time: '09:00',
  estimatedDurationMin: 60,
  actualDurationMin: 0,
  status: 'Scheduled' as Surgery['status'],
  theater: theaters[0],
  staff: [{ role: 'Surgeon' as StaffAssignment['role'], staffId: '', staffName: '' }] as StaffAssignment[],
  equipmentChecklist: [] as EquipmentItem[],
  consentSigned: false,
  consentSignedBy: '',
  consentDate: '',
  consentNotes: '',
  preOpNotes: '',
  preOpDiagnosis: '',
  preOpBloodwork: '',
  fastingHours: 8,
  surgeryNotes: '',
  findings: '',
  complications: '',
  outcome: 'Pending' as Surgery['outcome'],
  anestheticProtocol: '',
  premedication: '',
  inductionAgent: '',
  inductionDose: '',
  maintenanceAgent: '',
  maintenanceDose: '',
  analgesia: '',
  fluidTherapy: '',
  anesthesiaVitals: [] as AnesthesiaVital[],
  recoveryVitals: [] as RecoveryVital[],
  recoveryNotes: '',
  painManagement: '',
  dischargeDate: '',
  dischargeSummary: '',
  homeCareInstructions: '',
  followUpDate: '',
  followUpNotes: '',
});

export default function SurgeriesPage() {
  const { db, create, update, remove } = useDB();
  const vetNames = useMemo(() => {
    if (!db) return [] as string[];
    return db.staff.filter((s) => VET_ROLES.includes(s.role) && s.status === 'Active').map((s) => s.name);
  }, [db]);
  const [open, setOpen] = useState(false);
  const [editS, setEditS] = useState<Surgery | null>(null);
  const [form, setForm] = useState(blankForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [petFilter, setPetFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [printS, setPrintS] = useState<Surgery | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const petName = (id: string) => db?.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const petOf = (id: string) => db?.pets.find((p) => p.id === id);
  const ownerOf = (petId: string) => {
    const pet = db?.pets.find((p) => p.id === petId);
    return pet ? db?.owners.find((o) => o.id === pet.ownerId)?.name ?? '' : '';
  };

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const setStaff = (idx: number, k: keyof StaffAssignment, v: string) =>
    setForm((f) => ({ ...f, staff: f.staff.map((s, i) => (i === idx ? { ...s, [k]: v } : s)) }));
  const addStaff = () => setForm((f) => ({ ...f, staff: [...f.staff, blankStaff()] }));
  const removeStaff = (idx: number) => setForm((f) => ({ ...f, staff: f.staff.filter((_, i) => i !== idx) }));

  const setEquip = (idx: number, k: keyof EquipmentItem, v: string | boolean) =>
    setForm((f) => ({ ...f, equipmentChecklist: f.equipmentChecklist.map((e, i) => (i === idx ? { ...e, [k]: v } : e)) }));
  const addEquip = () => setForm((f) => ({ ...f, equipmentChecklist: [...f.equipmentChecklist, { ...blankEquip(), id: newId('eq') }] }));
  const removeEquip = (idx: number) => setForm((f) => ({ ...f, equipmentChecklist: f.equipmentChecklist.filter((_, i) => i !== idx) }));

  const setAnesVital = (idx: number, k: keyof AnesthesiaVital, v: string | number) =>
    setForm((f) => ({ ...f, anesthesiaVitals: f.anesthesiaVitals.map((v2, i) => (i === idx ? { ...v2, [k]: v } : v2)) }));
  const addAnesVital = () => setForm((f) => ({ ...f, anesthesiaVitals: [...f.anesthesiaVitals, blankAnesthesiaVital()] }));
  const removeAnesVital = (idx: number) => setForm((f) => ({ ...f, anesthesiaVitals: f.anesthesiaVitals.filter((_, i) => i !== idx) }));

  const setRecVital = (idx: number, k: keyof RecoveryVital, v: string | number) =>
    setForm((f) => ({ ...f, recoveryVitals: f.recoveryVitals.map((v2, i) => (i === idx ? { ...v2, [k]: v } : v2)) }));
  const addRecVital = () => setForm((f) => ({ ...f, recoveryVitals: [...f.recoveryVitals, blankRecoveryVital()] }));
  const removeRecVital = (idx: number) => setForm((f) => ({ ...f, recoveryVitals: f.recoveryVitals.filter((_, i) => i !== idx) }));

  const filtered = useMemo(() => {
    if (!db) return [];
    return [...db.surgeries]
      .filter((s) => petFilter === 'all' || s.petId === petFilter)
      .filter((s) => statusFilter === 'all' || s.status === statusFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db, petFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!db) return { total: 0, scheduled: 0, inSurgery: 0, completed: 0, emergency: 0 };
    const all = db.surgeries;
    return {
      total: all.length,
      scheduled: all.filter((s) => s.status === 'Scheduled').length,
      inSurgery: all.filter((s) => s.status === 'In surgery' || s.status === 'Pre-op').length,
      completed: all.filter((s) => s.status === 'Completed').length,
      emergency: all.filter((s) => s.procedureType === 'Emergency').length,
    };
  }, [db]);

  const openNew = () => {
    setEditS(null);
    setForm({ ...blankForm(), staff: [{ role: 'Surgeon' as StaffAssignment['role'], staffId: '', staffName: vetNames[0] ?? '' }] });
    setActiveTab('overview');
    setOpen(true);
  };

  const openEdit = (s: Surgery) => {
    setEditS(s);
    setForm({
      petId: s.petId, procedureName: s.procedureName, procedureType: s.procedureType, category: s.category,
      date: s.date, time: s.time, estimatedDurationMin: s.estimatedDurationMin, actualDurationMin: s.actualDurationMin,
      status: s.status, theater: s.theater,
      staff: s.staff.length ? s.staff.map((st) => ({ ...st })) : [blankStaff()],
      equipmentChecklist: s.equipmentChecklist.map((e) => ({ ...e })),
      consentSigned: s.consentSigned, consentSignedBy: s.consentSignedBy, consentDate: s.consentDate, consentNotes: s.consentNotes,
      preOpNotes: s.preOpNotes, preOpDiagnosis: s.preOpDiagnosis, preOpBloodwork: s.preOpBloodwork, fastingHours: s.fastingHours,
      surgeryNotes: s.surgeryNotes, findings: s.findings, complications: s.complications, outcome: s.outcome,
      anestheticProtocol: s.anestheticProtocol, premedication: s.premedication, inductionAgent: s.inductionAgent, inductionDose: s.inductionDose,
      maintenanceAgent: s.maintenanceAgent, maintenanceDose: s.maintenanceDose, analgesia: s.analgesia, fluidTherapy: s.fluidTherapy,
      anesthesiaVitals: s.anesthesiaVitals.map((v) => ({ ...v })),
      recoveryVitals: s.recoveryVitals.map((v) => ({ ...v })),
      recoveryNotes: s.recoveryNotes, painManagement: s.painManagement,
      dischargeDate: s.dischargeDate, dischargeSummary: s.dischargeSummary, homeCareInstructions: s.homeCareInstructions,
      followUpDate: s.followUpDate, followUpNotes: s.followUpNotes,
    });
    setActiveTab('overview');
    setOpen(true);
  };

  const saveSurgery = () => {
    if (!form.petId || !form.procedureName) return;
    const pet = petOf(form.petId);
    const ownerId = pet?.ownerId ?? '';
    const surgNum = editS?.surgeryNumber || `SUR-${String(Date.now()).slice(-4)}`;
    const data = {
      surgeryNumber: surgNum, petId: form.petId, ownerId,
      appointmentId: editS?.appointmentId ?? '', medRecordId: editS?.medRecordId ?? '',
      prescriptionIds: editS?.prescriptionIds ?? [], invoiceId: editS?.invoiceId ?? '',
      procedureName: form.procedureName, procedureType: form.procedureType, category: form.category,
      date: form.date, time: form.time, estimatedDurationMin: form.estimatedDurationMin, actualDurationMin: form.actualDurationMin,
      status: form.status, theater: form.theater,
      staff: form.staff, equipmentChecklist: form.equipmentChecklist,
      consentSigned: form.consentSigned, consentSignedBy: form.consentSignedBy, consentDate: form.consentDate, consentNotes: form.consentNotes,
      preOpNotes: form.preOpNotes, preOpVitals: editS?.preOpVitals ?? { weightKg: 0, temperatureC: 0, heartRate: 0, respiratoryRate: 0, bloodPressureSys: 0, bloodPressureDia: 0, oxygenLevel: 0 },
      preOpDiagnosis: form.preOpDiagnosis, preOpBloodwork: form.preOpBloodwork, fastingHours: form.fastingHours,
      surgeryNotes: form.surgeryNotes, findings: form.findings, complications: form.complications, outcome: form.outcome,
      anestheticProtocol: form.anestheticProtocol, premedication: form.premedication, inductionAgent: form.inductionAgent, inductionDose: form.inductionDose,
      maintenanceAgent: form.maintenanceAgent, maintenanceDose: form.maintenanceDose, analgesia: form.analgesia, fluidTherapy: form.fluidTherapy,
      anesthesiaVitals: form.anesthesiaVitals, recoveryVitals: form.recoveryVitals,
      recoveryNotes: form.recoveryNotes, painManagement: form.painManagement,
      dischargeDate: form.dischargeDate, dischargeSummary: form.dischargeSummary, homeCareInstructions: form.homeCareInstructions,
      followUpDate: form.followUpDate, followUpNotes: form.followUpNotes,
      createdAt: editS?.createdAt ?? today(),
    };
    if (editS) {
      update('surgeries', editS.id, data);
    } else {
      create('surgeries', { id: newId('srg'), ...data } as Surgery);
    }
    setOpen(false);
    setEditS(null);
  };

  const deleteSurgery = (id: string) => remove('surgeries', id);

  const tabs: { key: Tab; label: string; icon: typeof Stethoscope }[] = [
    { key: 'overview', label: 'Overview', icon: ClipboardList },
    { key: 'preop', label: 'Pre-op', icon: ClipboardCheck },
    { key: 'surgery', label: 'Surgery', icon: Stethoscope },
    { key: 'anesthesia', label: 'Anesthesia', icon: Syringe },
    { key: 'recovery', label: 'Recovery', icon: Heart },
    { key: 'discharge', label: 'Discharge', icon: Home },
  ];

  const checklistComplete = (s: Surgery) => {
    if (!s.equipmentChecklist.length) return false;
    return s.equipmentChecklist.filter((e) => e.required).every((e) => e.checked);
  };

  const handlePrint = () => {
    if (!printS) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const pet = petOf(printS.petId);
    win.document.write(`<!DOCTYPE html><html><head><title>Surgery Report ${printS.surgeryNumber}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;font-family:Georgia,serif;color:#1a1a1a}
      body{padding:40px;max-width:750px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4C1D95;padding-bottom:16px;margin-bottom:20px}
      .clinic-name{font-size:22px;font-weight:bold;color:#4C1D95}
      .clinic-sub{font-size:12px;color:#666;margin-top:2px}
      .surg-num{font-size:12px;color:#666;text-align:right}
      .surg-num b{font-size:14px;color:#4C1D95;font-family:monospace}
      .section{margin-bottom:20px}
      .section-title{font-size:14px;font-weight:bold;color:#4C1D95;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
      .patient-box{background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .patient-box .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999}
      .patient-box .value{font-size:14px;font-weight:bold}
      .row{font-size:12px;margin-bottom:4px}
      .row b{color:#333}
      .notes{font-size:12px;color:#444;font-style:italic;padding:10px;background:#f8f9fa;border-radius:4px;margin-top:6px}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}
      th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;padding:6px 4px;border-bottom:2px solid #e0e0e0}
      td{padding:8px 4px;border-bottom:1px solid #eee;font-size:12px;vertical-align:top}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .footer{margin-top:30px;padding-top:14px;border-top:1px solid #e0e0e0;text-align:right}
      .sig-line{border-top:1px solid #333;width:220px;margin:0 0 4px auto}
      .sig-name{font-size:13px;font-weight:bold}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      <div><div class="clinic-name">PetCare Pro</div><div class="clinic-sub">Northgate Animal Hospital &middot; 128 Maple Ave, Northgate, CA</div></div>
      <div class="surg-num">Surgery Report No<br><b>${printS.surgeryNumber}</b><br>${printS.date} at ${printS.time}</div>
    </div>
    <div class="patient-box">
      <div><div class="label">Patient</div><div class="value">${pet?.name ?? ''} (${pet?.species ?? ''}, ${pet?.breed ?? ''})</div></div>
      <div><div class="label">Owner</div><div class="value">${ownerOf(printS.petId)}</div></div>
      <div><div class="label">Procedure</div><div class="value">${printS.procedureName}</div></div>
      <div><div class="label">Category / Type</div><div class="value">${printS.category} - ${printS.procedureType}</div></div>
      <div><div class="label">Theater</div><div class="value">${printS.theater}</div></div>
      <div><div class="label">Duration</div><div class="value">${printS.actualDurationMin || printS.estimatedDurationMin} min (est: ${printS.estimatedDurationMin})</div></div>
    </div>
    <div class="section"><div class="section-title">Surgical Team</div>
      ${printS.staff.map((s) => `<div class="row"><b>${s.role}:</b> ${s.staffName}</div>`).join('')}
    </div>
    ${printS.preOpDiagnosis ? `<div class="section"><div class="section-title">Pre-operative Diagnosis</div><div class="notes">${printS.preOpDiagnosis}</div></div>` : ''}
    ${printS.preOpBloodwork ? `<div class="section"><div class="section-title">Pre-op Bloodwork</div><div class="notes">${printS.preOpBloodwork}</div></div>` : ''}
    ${printS.surgeryNotes ? `<div class="section"><div class="section-title">Surgery Notes</div><div class="notes">${printS.surgeryNotes}</div></div>` : ''}
    ${printS.findings ? `<div class="section"><div class="section-title">Findings</div><div class="notes">${printS.findings}</div></div>` : ''}
    ${printS.complications ? `<div class="section"><div class="section-title">Complications</div><div class="notes">${printS.complications}</div></div>` : ''}
    <div class="section"><div class="section-title">Anesthesia</div>
      <div class="grid2">
        ${printS.premedication ? `<div class="row"><b>Premedication:</b> ${printS.premedication}</div>` : ''}
        ${printS.inductionAgent ? `<div class="row"><b>Induction:</b> ${printS.inductionAgent} ${printS.inductionDose}</div>` : ''}
        ${printS.maintenanceAgent ? `<div class="row"><b>Maintenance:</b> ${printS.maintenanceAgent} ${printS.maintenanceDose}</div>` : ''}
        ${printS.analgesia ? `<div class="row"><b>Analgesia:</b> ${printS.analgesia}</div>` : ''}
        ${printS.fluidTherapy ? `<div class="row"><b>Fluids:</b> ${printS.fluidTherapy}</div>` : ''}
      </div>
    </div>
    ${printS.anesthesiaVitals.length ? `<div class="section"><div class="section-title">Anesthesia Vitals</div>
      <table><thead><tr><th>Time</th><th>HR</th><th>RR</th><th>Temp</th><th>BP</th><th>SpO2</th><th>etCO2</th></tr></thead>
      <tbody>${printS.anesthesiaVitals.map((v) => `<tr><td>${v.time}</td><td>${v.heartRate}</td><td>${v.respiratoryRate}</td><td>${v.temperatureC}</td><td>${v.bloodPressureSys}/${v.bloodPressureDia}</td><td>${v.oxygenLevel}%</td><td>${v.etCO2}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${printS.recoveryNotes ? `<div class="section"><div class="section-title">Recovery</div><div class="notes">${printS.recoveryNotes}</div></div>` : ''}
    ${printS.dischargeSummary ? `<div class="section"><div class="section-title">Discharge Summary</div><div class="notes">${printS.dischargeSummary}</div></div>` : ''}
    ${printS.homeCareInstructions ? `<div class="section"><div class="section-title">Home Care Instructions</div><div class="notes">${printS.homeCareInstructions}</div></div>` : ''}
    <div class="section"><div class="row"><b>Outcome:</b> ${printS.outcome}</div>
    ${printS.followUpDate ? `<div class="row"><b>Follow-up:</b> ${printS.followUpDate} - ${printS.followUpNotes}</div>` : ''}
    </div>
    <div class="footer">
      <div class="sig-line"></div>
      <div class="sig-name">${printS.staff.find((s) => s.role === 'Surgeon')?.staffName ?? ''}</div>
      <div style="font-size:11px;color:#666">Surgeon, PetCare Pro</div>
    </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  if (!db) return <Shell module="surgeries" title="Surgery"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const hasFilters = petFilter !== 'all' || statusFilter !== 'all';

  return (
    <Shell title="Surgery" subtitle="Surgical workflow management — booking, theater allocation, staff, equipment, consent, anesthesia, recovery, and discharge">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><Stethoscope className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-ink">{stats.total}</div><div className="text-[11px] text-ink/50">Total surgeries</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><Calendar className="w-5 h-5 text-sky-600" /></div><div><div className="text-2xl font-bold text-sky-700">{stats.scheduled}</div><div className="text-[11px] text-ink/50">Scheduled</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center"><Activity className="w-5 h-5 text-coral" /></div><div><div className="text-2xl font-bold text-coral">{stats.inSurgery}</div><div className="text-[11px] text-ink/50">Pre-op / In surgery</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-plum">{stats.completed}</div><div className="text-[11px] text-ink/50">Completed</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div><div><div className="text-2xl font-bold text-amber-600">{stats.emergency}</div><div className="text-[11px] text-ink/50">Emergency</div></div></div></Card>
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
          <AISuggestionButton onClick={() => { const s = db?.surgeries[0]; const p = s ? db?.pets.find(pt => pt.id === s.petId) : undefined; const o = s ? db?.owners.find(ow => ow.id === s.ownerId) : undefined; if (s && p && o) setAiSuggestion(generateSurgerySummary(s, p, o)); }} label="AI Summary" />
          <Button onClick={openNew}><Plus className="w-4 h-4" /> New surgery</Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><EmptyState icon={Stethoscope} title="No surgeries" hint="Schedule a surgery to start managing the full surgical workflow." /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const expanded = expandedId === s.id;
            const S = statusStyle[s.status];
            const equipAllChecked = checklistComplete(s);
            const pet = petOf(s.petId);
            return (
              <Card key={s.id} className="group hover:ring-2 hover:ring-plum/20 transition-all">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expanded ? null : s.id)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${S.bg}`}>
                      <Stethoscope className={`w-5 h-5 ${S.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{s.procedureName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${S.bg} ${S.text}`}>{s.status}</span>
                        {s.procedureType === 'Emergency' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Emergency</span>}
                        {s.outcome !== 'Pending' && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${outcomeStyle[s.outcome]}`}>{s.outcome}</span>}
                      </div>
                      <div className="text-[11px] text-ink/50 mt-0.5">
                        {s.surgeryNumber} · {petName(s.petId)} · {ownerOf(s.petId)} · {s.date} {s.time} · {s.theater}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {s.staff.slice(0, 3).map((st, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-canvas/60 text-ink/60 flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{st.role}: {st.staffName}</span>
                        ))}
                        {s.staff.length > 3 && <span className="text-[10px] text-ink/40">+{s.staff.length - 3} more</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {s.consentSigned ? (
                          <span className="text-[10px] text-plum flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Consent signed</span>
                        ) : (
                          <span className="text-[10px] text-ink/40 flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Consent pending</span>
                        )}
                        {s.equipmentChecklist.length > 0 && (
                          <span className={`text-[10px] flex items-center gap-0.5 ${equipAllChecked ? 'text-plum' : 'text-amber-600'}`}>
                            <ClipboardCheck className="w-3 h-3" /> Checklist {equipAllChecked ? 'complete' : 'incomplete'}
                          </span>
                        )}
                        {s.anesthesiaVitals.length > 0 && <span className="text-[10px] text-sky-600 flex items-center gap-0.5"><Syringe className="w-3 h-3" /> {s.anesthesiaVitals.length} anesthesia records</span>}
                        {s.recoveryVitals.length > 0 && <span className="text-[10px] text-violet-600 flex items-center gap-0.5"><Heart className="w-3 h-3" /> {s.recoveryVitals.length} recovery records</span>}
                        {s.dischargeSummary && <span className="text-[10px] text-plum flex items-center gap-0.5"><Home className="w-3 h-3" /> Discharged</span>}
                      </div>
                    </div>
                    <button className="text-ink/30 hover:text-ink mt-1">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setPrintS(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Print report">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteSurgery(s.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-line px-4 pb-4 pt-3 bg-canvas/30 space-y-3">
                    {/* Quick summary grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="rounded-lg border border-line bg-white p-2.5"><div className="text-[10px] text-ink/40 uppercase tracking-wide">Pre-op Dx</div><div className="text-ink/70 mt-0.5">{s.preOpDiagnosis || '—'}</div></div>
                      <div className="rounded-lg border border-line bg-white p-2.5"><div className="text-[10px] text-ink/40 uppercase tracking-wide">Duration</div><div className="text-ink/70 mt-0.5">{s.actualDurationMin || s.estimatedDurationMin} min</div></div>
                      <div className="rounded-lg border border-line bg-white p-2.5"><div className="text-[10px] text-ink/40 uppercase tracking-wide">Fasting</div><div className="text-ink/70 mt-0.5">{s.fastingHours} hours</div></div>
                      <div className="rounded-lg border border-line bg-white p-2.5"><div className="text-[10px] text-ink/40 uppercase tracking-wide">Follow-up</div><div className="text-ink/70 mt-0.5">{s.followUpDate || '—'}</div></div>
                    </div>

                    {/* Staff */}
                    <div className="rounded-lg border border-line bg-white p-3">
                      <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Surgical Team</div>
                      <div className="space-y-1">
                        {s.staff.map((st, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-lilac text-plum font-medium">{st.role}</span>
                            <span className="text-ink/70">{st.staffName}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equipment checklist */}
                    {s.equipmentChecklist.length > 0 && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Equipment Checklist</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {s.equipmentChecklist.map((e, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${e.checked ? 'bg-plum text-white' : 'border border-line'}`}>
                                {e.checked && <CheckCircle2 className="w-3 h-3" />}
                              </span>
                              <span className={e.checked ? 'text-ink/70' : 'text-ink/50'}>{e.name}</span>
                              {!e.required && <span className="text-[9px] text-ink/30">(optional)</span>}
                              <span className="text-[9px] text-ink/30 ml-auto">{e.category}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consent */}
                    <div className="rounded-lg border border-line bg-white p-3">
                      <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Consent</div>
                      <div className="text-xs text-ink/60">
                        {s.consentSigned ? `Signed by ${s.consentSignedBy} on ${s.consentDate}` : 'Not yet signed'}
                      </div>
                      {s.consentNotes && <div className="text-[11px] text-ink/50 italic mt-1">{s.consentNotes}</div>}
                    </div>

                    {/* Surgery notes */}
                    {s.surgeryNotes && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Surgery Notes</div>
                        <div className="text-xs text-ink/60 whitespace-pre-wrap">{s.surgeryNotes}</div>
                      </div>
                    )}

                    {/* Anesthesia vitals */}
                    {s.anesthesiaVitals.length > 0 && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Syringe className="w-3.5 h-3.5" /> Anesthesia Vitals</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead><tr className="text-ink/40 text-[10px]"><th className="text-left py-1">Time</th><th>HR</th><th>RR</th><th>Temp</th><th>BP</th><th>SpO2</th><th>etCO2</th><th className="text-left pl-2">Notes</th></tr></thead>
                            <tbody>
                              {s.anesthesiaVitals.map((v, i) => (
                                <tr key={i} className="border-t border-line/50">
                                  <td className="py-1 text-ink/70 font-medium">{v.time}</td>
                                  <td className="text-center text-ink/60">{v.heartRate}</td>
                                  <td className="text-center text-ink/60">{v.respiratoryRate}</td>
                                  <td className="text-center text-ink/60">{v.temperatureC}</td>
                                  <td className="text-center text-ink/60">{v.bloodPressureSys}/{v.bloodPressureDia}</td>
                                  <td className="text-center text-ink/60">{v.oxygenLevel}%</td>
                                  <td className="text-center text-ink/60">{v.etCO2}</td>
                                  <td className="text-left pl-2 text-ink/50 italic">{v.notes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recovery vitals */}
                    {s.recoveryVitals.length > 0 && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Recovery Monitoring</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead><tr className="text-ink/40 text-[10px]"><th className="text-left py-1">Time</th><th>Temp</th><th>HR</th><th>RR</th><th>Pain</th><th>Consciousness</th><th className="text-left pl-2">Notes</th></tr></thead>
                            <tbody>
                              {s.recoveryVitals.map((v, i) => (
                                <tr key={i} className="border-t border-line/50">
                                  <td className="py-1 text-ink/70 font-medium">{v.time}</td>
                                  <td className="text-center text-ink/60">{v.temperatureC}</td>
                                  <td className="text-center text-ink/60">{v.heartRate}</td>
                                  <td className="text-center text-ink/60">{v.respiratoryRate}</td>
                                  <td className="text-center text-ink/60">{v.painScore}/4</td>
                                  <td className="text-center text-ink/60">{v.consciousness}</td>
                                  <td className="text-left pl-2 text-ink/50 italic">{v.notes}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {s.recoveryNotes && <div className="text-[11px] text-ink/50 italic mt-2 border-l-2 border-line pl-2">{s.recoveryNotes}</div>}
                      </div>
                    )}

                    {/* Discharge */}
                    {s.dischargeSummary && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Discharge Summary</div>
                        <div className="text-xs text-ink/60 whitespace-pre-wrap">{s.dischargeSummary}</div>
                        {s.homeCareInstructions && <div className="text-[11px] text-ink/50 italic mt-2 border-l-2 border-line pl-2">{s.homeCareInstructions}</div>}
                      </div>
                    )}
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

      <Modal open={open} onClose={() => { setOpen(false); setEditS(null); }} title={editS ? `Edit ${editS.surgeryNumber}` : 'New surgery'} wide>
        <div className="space-y-4">
          {/* Tabs */}
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} size="sm" className="mb-1" />

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Patient">
                  <Select value={form.petId} onChange={(e) => set('petId', e.target.value)}>
                    <option value="">Select pet…</option>
                    {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                  </Select>
                </Field>
                <Field label="Procedure type">
                  <Select value={form.procedureType} onChange={(e) => set('procedureType', e.target.value)}>
                    {procedureTypes.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Category">
                  <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {statuses.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label="Procedure name"><Input value={form.procedureName} onChange={(e) => set('procedureName', e.target.value)} placeholder="e.g. Ovariohysterectomy (spay)" /></Field>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Date"><DatePicker value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="Time"><TimeInput value={form.time} onChange={(e) => set('time', e.target.value)} /></Field>
                <Field label="Est. duration (min)"><NumberInput value={String(form.estimatedDurationMin)} onChange={(e) => set('estimatedDurationMin', parseInt(e.target.value) || 0)} /></Field>
                <Field label="Theater">
                  <Select value={form.theater} onChange={(e) => set('theater', e.target.value)}>
                    {theaters.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
              </div>

              {/* Staff assignments */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Staff Assignment</div>
                  <Button size="sm" variant="outline" onClick={addStaff}><Plus className="w-3.5 h-3.5" /> Add</Button>
                </div>
                <div className="space-y-2">
                  {form.staff.map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Select value={st.role} onChange={(e) => setStaff(idx, 'role', e.target.value)} className="w-40">
                        {staffRoles.map((r) => <option key={r}>{r}</option>)}
                      </Select>
                      <Select value={st.staffName} onChange={(e) => setStaff(idx, 'staffName', e.target.value)} className="flex-1">
                        <option value="">Select staff…</option>
                        {vetNames.map((n) => <option key={n}>{n}</option>)}
                      </Select>
                      {form.staff.length > 1 && (
                        <button onClick={() => removeStaff(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment checklist */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Equipment Checklist</div>
                  <Button size="sm" variant="outline" onClick={addEquip}><Plus className="w-3.5 h-3.5" /> Add item</Button>
                </div>
                <div className="space-y-2">
                  {form.equipmentChecklist.map((e, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap">
                      <Input className="flex-1 min-w-[140px]" value={e.name} onChange={(ev) => setEquip(idx, 'name', ev.target.value)} placeholder="Equipment name" />
                      <Select value={e.category} onChange={(ev) => setEquip(idx, 'category', ev.target.value)} className="w-40">
                        {equipCategories.map((c) => <option key={c}>{c}</option>)}
                      </Select>
                      <Checkbox checked={e.required} onChange={(ev) => setEquip(idx, 'required', ev.target.checked)} label="Required" className="shrink-0" />
                      <Checkbox checked={e.checked} onChange={(ev) => setEquip(idx, 'checked', ev.target.checked)} label="Checked" className="shrink-0" />
                      {form.equipmentChecklist.length > 0 && (
                        <button onClick={() => removeEquip(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Consent */}
              <div className="border-t border-line pt-3">
                <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Consent Form</div>
                <div className="space-y-2">
                  <Checkbox checked={form.consentSigned} onChange={(e) => set('consentSigned', e.target.checked)} label="Consent form signed" />
                  {form.consentSigned && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Signed by"><Input value={form.consentSignedBy} onChange={(e) => set('consentSignedBy', e.target.value)} placeholder="Owner name" /></Field>
                      <Field label="Consent date"><DatePicker value={form.consentDate} onChange={(e) => set('consentDate', e.target.value)} /></Field>
                    </div>
                  )}
                  <Field label="Consent notes"><Textarea value={form.consentNotes} onChange={(e) => set('consentNotes', e.target.value)} placeholder="Risks discussed, special instructions…" className="min-h-[50px]" /></Field>
                </div>
              </div>
            </div>
          )}

          {/* Pre-op tab */}
          {activeTab === 'preop' && (
            <div className="space-y-3">
              <Field label="Pre-operative diagnosis"><Input value={form.preOpDiagnosis} onChange={(e) => set('preOpDiagnosis', e.target.value)} placeholder="e.g. Cranial cruciate ligament rupture" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pre-op bloodwork"><Textarea value={form.preOpBloodwork} onChange={(e) => set('preOpBloodwork', e.target.value)} placeholder="PCV, TS, ALT, BUN results…" className="min-h-[60px]" /></Field>
                <Field label="Fasting hours"><NumberInput value={String(form.fastingHours)} onChange={(e) => set('fastingHours', parseInt(e.target.value) || 0)} /></Field>
              </div>
              <Field label="Pre-operative notes"><Textarea value={form.preOpNotes} onChange={(e) => set('preOpNotes', e.target.value)} placeholder="Patient condition, preparation, IV access, pre-medication timing…" className="min-h-[80px]" /></Field>
            </div>
          )}

          {/* Surgery tab */}
          {activeTab === 'surgery' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Actual duration (min)"><NumberInput value={String(form.actualDurationMin)} onChange={(e) => set('actualDurationMin', parseInt(e.target.value) || 0)} /></Field>
                <Field label="Outcome">
                  <Select value={form.outcome} onChange={(e) => set('outcome', e.target.value)}>
                    {outcomes.map((o) => <option key={o}>{o}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Surgery notes"><Textarea value={form.surgeryNotes} onChange={(e) => set('surgeryNotes', e.target.value)} placeholder="Step-by-step procedure description, technique, suture material, closure…" className="min-h-[100px]" /></Field>
              <Field label="Findings"><Textarea value={form.findings} onChange={(e) => set('findings', e.target.value)} placeholder="Intraoperative findings, abnormalities, tissue condition…" className="min-h-[60px]" /></Field>
              <Field label="Complications"><Textarea value={form.complications} onChange={(e) => set('complications', e.target.value)} placeholder="Any intraoperative or postoperative complications…" className="min-h-[50px]" /></Field>
            </div>
          )}

          {/* Anesthesia tab */}
          {activeTab === 'anesthesia' && (
            <div className="space-y-3">
              <Field label="Anesthetic protocol"><Input value={form.anestheticProtocol} onChange={(e) => set('anestheticProtocol', e.target.value)} placeholder="e.g. Propofol induction, isoflurane maintenance" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Premedication"><Input value={form.premedication} onChange={(e) => set('premedication', e.target.value)} placeholder="e.g. Midazolam 0.2mg/kg + Butorphanol 0.3mg/kg IM" /></Field>
                <Field label="Induction agent"><Input value={form.inductionAgent} onChange={(e) => set('inductionAgent', e.target.value)} placeholder="Propofol" /></Field>
                <Field label="Induction dose"><Input value={form.inductionDose} onChange={(e) => set('inductionDose', e.target.value)} placeholder="4 mg/kg IV" /></Field>
                <Field label="Maintenance agent"><Input value={form.maintenanceAgent} onChange={(e) => set('maintenanceAgent', e.target.value)} placeholder="Isoflurane" /></Field>
                <Field label="Maintenance dose"><Input value={form.maintenanceDose} onChange={(e) => set('maintenanceDose', e.target.value)} placeholder="1.5-2% in O2" /></Field>
                <Field label="Analgesia"><Input value={form.analgesia} onChange={(e) => set('analgesia', e.target.value)} placeholder="Methadone 0.2mg/kg, Fentanyl CRI…" /></Field>
                <Field label="Fluid therapy"><Input value={form.fluidTherapy} onChange={(e) => set('fluidTherapy', e.target.value)} placeholder="Lactated Ringers 5ml/kg/hr" /></Field>
              </div>

              {/* Anesthesia vitals */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Anesthesia Vitals Log</div>
                  <Button size="sm" variant="outline" onClick={addAnesVital}><Plus className="w-3.5 h-3.5" /> Add reading</Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {form.anesthesiaVitals.map((v, idx) => (
                    <div key={idx} className="rounded-lg border border-line p-2.5 bg-canvas/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-ink/50">Reading {idx + 1}</span>
                        <button onClick={() => removeAnesVital(idx)} className="w-6 h-6 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <TimeInput value={v.time} onChange={(e) => setAnesVital(idx, 'time', e.target.value)} />
                        <NumberInput value={v.heartRate ? String(v.heartRate) : ''} onChange={(e) => setAnesVital(idx, 'heartRate', parseInt(e.target.value) || 0)} placeholder="HR" />
                        <NumberInput value={v.respiratoryRate ? String(v.respiratoryRate) : ''} onChange={(e) => setAnesVital(idx, 'respiratoryRate', parseInt(e.target.value) || 0)} placeholder="RR" />
                        <NumberInput value={v.temperatureC ? String(v.temperatureC) : ''} onChange={(e) => setAnesVital(idx, 'temperatureC', parseFloat(e.target.value) || 0)} placeholder="Temp" />
                        <NumberInput value={v.bloodPressureSys ? String(v.bloodPressureSys) : ''} onChange={(e) => setAnesVital(idx, 'bloodPressureSys', parseInt(e.target.value) || 0)} placeholder="BP Sys" />
                        <NumberInput value={v.bloodPressureDia ? String(v.bloodPressureDia) : ''} onChange={(e) => setAnesVital(idx, 'bloodPressureDia', parseInt(e.target.value) || 0)} placeholder="BP Dia" />
                        <NumberInput value={v.oxygenLevel ? String(v.oxygenLevel) : ''} onChange={(e) => setAnesVital(idx, 'oxygenLevel', parseInt(e.target.value) || 0)} placeholder="SpO2" />
                        <NumberInput value={v.etCO2 ? String(v.etCO2) : ''} onChange={(e) => setAnesVital(idx, 'etCO2', parseInt(e.target.value) || 0)} placeholder="etCO2" />
                      </div>
                      <Input className="mt-1.5" value={v.notes} onChange={(e) => setAnesVital(idx, 'notes', e.target.value)} placeholder="Notes (induction, surgical plane, gas off, etc.)" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recovery tab */}
          {activeTab === 'recovery' && (
            <div className="space-y-3">
              <Field label="Recovery notes"><Textarea value={form.recoveryNotes} onChange={(e) => set('recoveryNotes', e.target.value)} placeholder="Overall recovery summary, extubation time, complications…" className="min-h-[60px]" /></Field>
              <Field label="Pain management plan"><Textarea value={form.painManagement} onChange={(e) => set('painManagement', e.target.value)} placeholder="Medications, CRI details, home pain management…" className="min-h-[50px]" /></Field>

              {/* Recovery vitals */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> Recovery Vitals Log</div>
                  <Button size="sm" variant="outline" onClick={addRecVital}><Plus className="w-3.5 h-3.5" /> Add reading</Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {form.recoveryVitals.map((v, idx) => (
                    <div key={idx} className="rounded-lg border border-line p-2.5 bg-canvas/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-ink/50">Reading {idx + 1}</span>
                        <button onClick={() => removeRecVital(idx)} className="w-6 h-6 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                        <TimeInput value={v.time} onChange={(e) => setRecVital(idx, 'time', e.target.value)} />
                        <NumberInput value={v.temperatureC ? String(v.temperatureC) : ''} onChange={(e) => setRecVital(idx, 'temperatureC', parseFloat(e.target.value) || 0)} placeholder="Temp" />
                        <NumberInput value={v.heartRate ? String(v.heartRate) : ''} onChange={(e) => setRecVital(idx, 'heartRate', parseInt(e.target.value) || 0)} placeholder="HR" />
                        <NumberInput value={v.respiratoryRate ? String(v.respiratoryRate) : ''} onChange={(e) => setRecVital(idx, 'respiratoryRate', parseInt(e.target.value) || 0)} placeholder="RR" />
                        <NumberInput value={v.painScore ? String(v.painScore) : ''} onChange={(e) => setRecVital(idx, 'painScore', parseInt(e.target.value) || 0)} placeholder="Pain 0-4" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <Select value={v.consciousness} onChange={(e) => setRecVital(idx, 'consciousness', e.target.value)}>
                          {consciousnessLevels.map((c) => <option key={c}>{c}</option>)}
                        </Select>
                        <Input value={v.notes} onChange={(e) => setRecVital(idx, 'notes', e.target.value)} placeholder="Notes" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Discharge tab */}
          {activeTab === 'discharge' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Discharge date"><DatePicker value={form.dischargeDate} onChange={(e) => set('dischargeDate', e.target.value)} /></Field>
                <Field label="Follow-up date"><DatePicker value={form.followUpDate} onChange={(e) => set('followUpDate', e.target.value)} /></Field>
              </div>
              <Field label="Discharge summary"><Textarea value={form.dischargeSummary} onChange={(e) => set('dischargeSummary', e.target.value)} placeholder="Summary of procedure, outcome, and patient status at discharge…" className="min-h-[80px]" /></Field>
              <Field label="Home care instructions"><Textarea value={form.homeCareInstructions} onChange={(e) => set('homeCareInstructions', e.target.value)} placeholder="Activity restrictions, feeding, medication schedule, wound care, warning signs…" className="min-h-[80px]" /></Field>
              <Field label="Follow-up notes"><Textarea value={form.followUpNotes} onChange={(e) => set('followUpNotes', e.target.value)} placeholder="Recheck plan, suture removal, long-term monitoring…" className="min-h-[50px]" /></Field>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditS(null); }}>Cancel</Button>
            <Button onClick={saveSurgery}>{editS ? 'Save changes' : 'Create surgery'}</Button>
          </div>
        </div>
      </Modal>

      {/* Print modal */}
      <Modal open={!!printS} onClose={() => setPrintS(null)} title={`Surgery Report ${printS?.surgeryNumber ?? ''}`} wide>
        {printS && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-plum/30 bg-gradient-to-br from-lilac/20 to-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-plum flex items-center justify-center"><Stethoscope className="w-5 h-5 text-white" /></div>
                  <div><div className="text-sm font-bold text-ink">PetCare Pro</div><div className="text-[10px] text-ink/50">Surgery Report</div></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-ink/40">Report No</div>
                  <div className="text-sm font-mono font-semibold text-plum">{printS.surgeryNumber}</div>
                </div>
              </div>
              <div className="border-t border-plum/20 pt-3 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Patient:</span> <span className="font-medium text-ink">{petName(printS.petId)}</span></div>
                  <div><span className="text-ink/40">Owner:</span> <span className="font-medium text-ink">{ownerOf(printS.petId)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Procedure:</span> <span className="font-medium text-ink">{printS.procedureName}</span></div>
                  <div><span className="text-ink/40">Date:</span> <span className="font-medium text-ink">{printS.date} at {printS.time}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Theater:</span> <span className="font-medium text-ink">{printS.theater}</span></div>
                  <div><span className="text-ink/40">Duration:</span> <span className="font-medium text-ink">{printS.actualDurationMin || printS.estimatedDurationMin} min</span></div>
                </div>
                <div><span className="text-ink/40">Outcome:</span> <span className="font-medium text-ink">{printS.outcome}</span></div>
              </div>
              {printS.staff.length > 0 && (
                <div className="border-t border-plum/20 mt-3 pt-3">
                  <div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-1">Surgical Team</div>
                  <div className="text-xs text-ink/70">{printS.staff.map((s) => `${s.role}: ${s.staffName}`).join(' · ')}</div>
                </div>
              )}
              {printS.surgeryNotes && (
                <div className="border-t border-plum/20 mt-3 pt-3">
                  <div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-1">Surgery Notes</div>
                  <div className="text-[11px] text-ink/60 whitespace-pre-wrap">{printS.surgeryNotes}</div>
                </div>
              )}
              {printS.dischargeSummary && (
                <div className="border-t border-plum/20 mt-3 pt-3">
                  <div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-1">Discharge Summary</div>
                  <div className="text-[11px] text-ink/60">{printS.dischargeSummary}</div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={handlePrint}><Printer className="w-4 h-4" /> Print surgery report</Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
