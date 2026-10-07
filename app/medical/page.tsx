'use client';

import { useMemo, useState } from 'react';
import {
  Stethoscope, Plus, Syringe, FlaskConical, Scan, Pill, ClipboardList,
  Edit2, Trash2, FileText, Image as ImageIcon, Headphones, Video,
  Activity, Thermometer, Heart, Wind, Droplet, Gauge, Weight,
  ChevronDown, ChevronUp, X, Paperclip, ClipboardCheck,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Badge, Button, EmptyState, Modal, Field, inputCls, Select, DateInput, Textarea, NumberInput } from '../components/ui';
import { useDB, MedRecord, VitalSigns, EMRAttachment, SOAPNotes, newId, today } from '../lib/store';
import { useAuth } from '../lib/auth';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateSOAPNote, generateMedicalReport, generateFollowUpRecommendation, generatePrescriptionSuggestion } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const types = ['Consultation', 'Vaccination', 'Surgery', 'Lab', 'Prescription', 'Imaging'] as const;
const typeIcon: Record<string, typeof Stethoscope> = {
  Consultation: ClipboardList, Vaccination: Syringe, Surgery: Stethoscope, Lab: FlaskConical, Prescription: Pill, Imaging: Scan,
};
const typeColor: Record<string, string> = {
  Consultation: 'bg-sky-100 text-sky-700', Vaccination: 'bg-mint text-sage', Surgery: 'bg-coral/15 text-coral',
  Lab: 'bg-amber-100 text-amber-700', Prescription: 'bg-violet-100 text-violet-700', Imaging: 'bg-indigo-100 text-indigo-700',
};
const vets = ['Dr. Rivera', 'Dr. Okafor', 'Dr. Patel'];
const attachmentTypes: EMRAttachment['type'][] = ['Image', 'PDF', 'Audio', 'Video'];
const attachmentIcon: Record<string, typeof ImageIcon> = {
  Image: ImageIcon, PDF: FileText, Audio: Headphones, Video: Video,
};

const emptyVitals: VitalSigns = {
  weightKg: 0, temperatureC: 0, heartRate: 0, respiratoryRate: 0,
  bloodPressureSys: 0, bloodPressureDia: 0, oxygenLevel: 0,
};

const emptySOAP: SOAPNotes = { subjective: '', objective: '', assessment: '', plan: '' };

const defaultForm = {
  petId: '', type: 'Consultation' as MedRecord['type'], title: '', vet: vets[0], date: today(),
  findings: '', treatment: '',
  chiefComplaint: '', medicalHistory: '', physicalExamination: '',
  diagnosis: '', treatmentPlan: '',
  vitals: { ...emptyVitals },
  soap: { ...emptySOAP },
  attachments: [] as EMRAttachment[],
};

export default function MedicalPage() {
  const { db, create, update, remove } = useDB();
  const { user } = useAuth();
  const [petFilter, setPetFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MedRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<MedRecord | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [showVitals, setShowVitals] = useState(false);
  const [showSOAP, setShowSOAP] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attForm, setAttForm] = useState({ name: '', type: 'Image' as EMRAttachment['type'], url: '' });
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setVital = (k: keyof VitalSigns, v: string) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [k]: parseFloat(v) || 0 } }));
  const setSOAP = (k: keyof SOAPNotes, v: string) => setForm((f) => ({ ...f, soap: { ...f.soap, [k]: v } }));

  const records = useMemo(() => {
    if (!db) return [];
    return [...db.medRecords]
      .filter((r) => petFilter === 'all' || r.petId === petFilter)
      .filter((r) => typeFilter === 'all' || r.type === typeFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db, petFilter, typeFilter]);

  const petName = (id: string) => db?.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const petOf = (id: string) => db?.pets.find((p) => p.id === id);

  const openNew = () => {
    setEditRecord(null);
    setForm({ ...defaultForm, date: today() });
    setShowVitals(false); setShowSOAP(false); setShowAttachments(false);
    setOpen(true);
  };

  const openEdit = (r: MedRecord) => {
    setEditRecord(r);
    setForm({
      petId: r.petId, type: r.type, title: r.title, vet: r.vet, date: r.date,
      findings: r.findings, treatment: r.treatment,
      chiefComplaint: r.chiefComplaint ?? '', medicalHistory: r.medicalHistory ?? '',
      physicalExamination: r.physicalExamination ?? '',
      diagnosis: r.diagnosis ?? '', treatmentPlan: r.treatmentPlan ?? '',
      vitals: r.vitalSigns ?? { ...emptyVitals },
      soap: r.soapNotes ?? { ...emptySOAP },
      attachments: r.attachments ?? [],
    });
    setShowVitals(false); setShowSOAP(false); setShowAttachments(false);
    setOpen(true);
  };

  const addAttachment = () => {
    if (!attForm.name) return;
    const att: EMRAttachment = { id: newId('att'), name: attForm.name, type: attForm.type, url: attForm.url, date: today() };
    setForm((f) => ({ ...f, attachments: [...f.attachments, att] }));
    setAttForm({ name: '', type: 'Image', url: '' });
  };

  const removeAttachment = (id: string) => {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== id) }));
  };

  const saveRecord = () => {
    if (!form.petId || !form.title) return;
    const data = {
      petId: form.petId, type: form.type, title: form.title, vet: form.vet, date: form.date,
      findings: form.findings, treatment: form.treatment,
      chiefComplaint: form.chiefComplaint, medicalHistory: form.medicalHistory,
      physicalExamination: form.physicalExamination, diagnosis: form.diagnosis,
      treatmentPlan: form.treatmentPlan, vitalSigns: form.vitals,
      soapNotes: form.soap, attachments: form.attachments,
    };
    if (editRecord) {
      update('medRecords', editRecord.id, data);
    } else {
      create('medRecords', { id: newId('med'), ...data });
    }
    setOpen(false);
    setEditRecord(null);
  };

  const deleteRecord = (id: string) => remove('medRecords', id);

  if (!db) return <Shell title="Medical Records"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  return (
    <Shell title="Medical Records" subtitle="Electronic medical records, consultations, and clinical timeline">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="w-auto">
          <option value="all">All patients</option>
          {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
          <option value="all">All types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <AISuggestionButton onClick={() => {
            const pet = db.pets[0];
            if (pet) setAiSuggestion(generateSOAPNote(pet));
          }} label="AI SOAP Note" />
          <Button onClick={openNew}><Plus className="w-4 h-4" /> New record</Button>
        </div>
      </div>

      {aiSuggestion && (
        <div className="mb-4">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      {records.length === 0 ? (
        <Card><EmptyState icon={Stethoscope} title="No medical records" hint="Add a clinical record to start a pet's health timeline." /></Card>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-line" />
          <div className="space-y-3">
            {records.map((r) => {
              const Icon = typeIcon[r.type] ?? ClipboardList;
              return (
                <div key={r.id} className="relative pl-12 group">
                  <div className={`absolute left-0 top-1 w-8 h-8 rounded-xl flex items-center justify-center ${typeColor[r.type] || 'bg-mint text-sage'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <Card className="p-4 cursor-pointer hover:ring-2 hover:ring-sage/20 transition-all" >
                    <div className="flex items-center justify-between" onClick={() => setDetailRecord(r)}>
                      <div>
                        <div className="text-sm font-semibold text-ink">{r.title}</div>
                        <div className="text-[11px] text-ink/50">{petName(r.petId)} · {r.vet} · {r.date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeColor[r.type] || 'bg-canvas text-ink/60'}`}>{r.type}</span>
                        {r.attachments && r.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-ink/50">
                            <Paperclip className="w-3 h-3" /> {r.attachments.length}
                          </span>
                        )}
                        {r.vitalSigns && r.vitalSigns.heartRate > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-sage">
                            <Activity className="w-3 h-3" />
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteRecord(r.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {(r.chiefComplaint || r.findings) && (
                      <div className="mt-2 text-xs text-ink/60" onClick={() => setDetailRecord(r)}>
                        {r.chiefComplaint && <span className="text-ink/70 font-medium">CC: </span>}
                        {r.chiefComplaint || r.findings}
                      </div>
                    )}
                    {r.diagnosis && (
                      <div className="mt-1 text-xs text-coral font-medium" onClick={() => setDetailRecord(r)}>
                        Dx: {r.diagnosis}
                      </div>
                    )}
                    {r.vitalSigns && r.vitalSigns.heartRate > 0 && (
                      <div className="mt-2 flex items-center gap-3 flex-wrap" onClick={() => setDetailRecord(r)}>
                        <VitalPill icon={Weight} label="Wt" value={`${r.vitalSigns.weightKg}kg`} />
                        <VitalPill icon={Thermometer} label="T" value={`${r.vitalSigns.temperatureC}°C`} />
                        <VitalPill icon={Heart} label="HR" value={`${r.vitalSigns.heartRate}`} />
                        <VitalPill icon={Wind} label="RR" value={`${r.vitalSigns.respiratoryRate}`} />
                        <VitalPill icon={Droplet} label="SpO2" value={`${r.vitalSigns.oxygenLevel}%`} />
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={open} onClose={() => { setOpen(false); setEditRecord(null); }} title={editRecord ? 'Edit medical record' : 'New medical record'} wide>
        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Patient">
              <Select value={form.petId} onChange={(e) => set('petId', e.target.value)}>
                <option value="">Select a pet…</option>
                {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
                {types.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Veterinarian">
              <Select value={form.vet} onChange={(e) => set('vet', e.target.value)}>
                {vets.map((v) => <option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Date"><DateInput value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
          </div>
          <Field label="Title"><input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Annual wellness exam" /></Field>

          {/* Chief complaint & history */}
          <div className="border-t border-line pt-3 space-y-3">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Clinical Information</div>
            <Field label="Chief Complaint"><input className={inputCls} value={form.chiefComplaint} onChange={(e) => set('chiefComplaint', e.target.value)} placeholder="Limping on left hind for 3 days" /></Field>
            <Field label="Medical History"><Textarea value={form.medicalHistory} onChange={(e) => set('medicalHistory', e.target.value)} placeholder="Previous conditions, medications, surgeries…" className="min-h-[60px]" /></Field>
            <Field label="Physical Examination"><Textarea value={form.physicalExamination} onChange={(e) => set('physicalExamination', e.target.value)} placeholder="BAR, MM pink, CRT <2s, hydration normal…" className="min-h-[60px]" /></Field>
          </div>

          {/* Vital signs (collapsible) */}
          <div className="border-t border-line pt-3">
            <button onClick={() => setShowVitals(!showVitals)} className="flex items-center justify-between w-full text-[11px] font-semibold text-ink/50 uppercase tracking-wide">
              <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Vital Signs</span>
              {showVitals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showVitals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <Field label="Weight (kg)"><NumberInput value={String(form.vitals.weightKg || '')} onChange={(e) => setVital('weightKg', e.target.value)} placeholder="31.5" /></Field>
                <Field label="Temp (°C)"><NumberInput value={String(form.vitals.temperatureC || '')} onChange={(e) => setVital('temperatureC', e.target.value)} placeholder="38.4" /></Field>
                <Field label="Heart rate (bpm)"><NumberInput value={String(form.vitals.heartRate || '')} onChange={(e) => setVital('heartRate', e.target.value)} placeholder="88" /></Field>
                <Field label="Resp rate (rpm)"><NumberInput value={String(form.vitals.respiratoryRate || '')} onChange={(e) => setVital('respiratoryRate', e.target.value)} placeholder="20" /></Field>
                <Field label="BP Systolic"><NumberInput value={String(form.vitals.bloodPressureSys || '')} onChange={(e) => setVital('bloodPressureSys', e.target.value)} placeholder="130" /></Field>
                <Field label="BP Diastolic"><NumberInput value={String(form.vitals.bloodPressureDia || '')} onChange={(e) => setVital('bloodPressureDia', e.target.value)} placeholder="80" /></Field>
                <Field label="Oxygen (%)"><NumberInput value={String(form.vitals.oxygenLevel || '')} onChange={(e) => setVital('oxygenLevel', e.target.value)} placeholder="98" /></Field>
              </div>
            )}
          </div>

          {/* Diagnosis & treatment plan */}
          <div className="border-t border-line pt-3 space-y-3">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Diagnosis & Plan</div>
            <Field label="Diagnosis"><input className={inputCls} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} placeholder="Mild hip dysplasia with inflammation" /></Field>
            <Field label="Treatment Plan"><Textarea value={form.treatmentPlan} onChange={(e) => set('treatmentPlan', e.target.value)} placeholder="Meloxicam 0.1mg/kg PO 7d, rest 2 weeks…" className="min-h-[60px]" /></Field>
          </div>

          {/* SOAP notes (collapsible) */}
          <div className="border-t border-line pt-3">
            <button onClick={() => setShowSOAP(!showSOAP)} className="flex items-center justify-between w-full text-[11px] font-semibold text-ink/50 uppercase tracking-wide">
              <span className="flex items-center gap-2"><ClipboardCheck className="w-3.5 h-3.5" /> SOAP Notes</span>
              {showSOAP ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showSOAP && (
              <div className="space-y-3 mt-3">
                <Field label="S — Subjective"><Textarea value={form.soap.subjective} onChange={(e) => setSOAP('subjective', e.target.value)} placeholder="Owner-reported symptoms and history…" className="min-h-[60px]" /></Field>
                <Field label="O — Objective"><Textarea value={form.soap.objective} onChange={(e) => setSOAP('objective', e.target.value)} placeholder="Measured findings, vitals, exam observations…" className="min-h-[60px]" /></Field>
                <Field label="A — Assessment"><Textarea value={form.soap.assessment} onChange={(e) => setSOAP('assessment', e.target.value)} placeholder="Diagnosis and clinical reasoning…" className="min-h-[60px]" /></Field>
                <Field label="P — Plan"><Textarea value={form.soap.plan} onChange={(e) => setSOAP('plan', e.target.value)} placeholder="Treatment plan, medications, follow-up…" className="min-h-[60px]" /></Field>
              </div>
            )}
          </div>

          {/* Attachments (collapsible) */}
          <div className="border-t border-line pt-3">
            <button onClick={() => setShowAttachments(!showAttachments)} className="flex items-center justify-between w-full text-[11px] font-semibold text-ink/50 uppercase tracking-wide">
              <span className="flex items-center gap-2"><Paperclip className="w-3.5 h-3.5" /> Attachments ({form.attachments.length})</span>
              {showAttachments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAttachments && (
              <div className="space-y-3 mt-3">
                {form.attachments.length > 0 && (
                  <div className="space-y-2">
                    {form.attachments.map((att) => {
                      const AIcon = attachmentIcon[att.type] || FileText;
                      return (
                        <div key={att.id} className="group flex items-center gap-3 rounded-lg border border-line p-2.5">
                          <div className="w-8 h-8 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                            <AIcon className="w-4 h-4 text-ink/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-ink truncate">{att.name}</div>
                            <div className="text-[10px] text-ink/40">{att.type} · {att.date}</div>
                          </div>
                          <button onClick={() => removeAttachment(att.id)} className="w-6 h-6 rounded-lg text-ink/40 hover:text-coral hover:bg-coral/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Name"><input className={inputCls} value={attForm.name} onChange={(e) => setAttForm({ ...attForm, name: e.target.value })} placeholder="X-ray left hip" /></Field>
                  <Field label="Type">
                    <Select value={attForm.type} onChange={(e) => setAttForm({ ...attForm, type: e.target.value as EMRAttachment['type'] })}>
                      {attachmentTypes.map((t) => <option key={t}>{t}</option>)}
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button size="sm" variant="outline" onClick={addAttachment} className="w-full"><Plus className="w-3.5 h-3.5" /> Add</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Legacy findings/treatment fields */}
          <div className="border-t border-line pt-3 space-y-3">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide">Summary</div>
            <Field label="Findings (summary)"><Textarea value={form.findings} onChange={(e) => set('findings', e.target.value)} placeholder="Healthy, temp 38.4°C, mild tartar" className="min-h-[50px]" /></Field>
            <Field label="Treatment (summary)"><Textarea value={form.treatment} onChange={(e) => set('treatment', e.target.value)} placeholder="Meloxicam 0.1mg/kg 7d, dental recommended" className="min-h-[50px]" /></Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditRecord(null); }}>Cancel</Button>
            <Button onClick={saveRecord}>{editRecord ? 'Save changes' : 'Save record'}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail viewer */}
      <Modal open={!!detailRecord} onClose={() => setDetailRecord(null)} title="Medical Record" wide>
        {detailRecord && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-semibold text-ink">{detailRecord.title}</div>
                <div className="text-xs text-ink/50 mt-0.5">{petName(detailRecord.petId)} · {detailRecord.vet} · {detailRecord.date}</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${typeColor[detailRecord.type] || 'bg-canvas text-ink/60'}`}>{detailRecord.type}</span>
            </div>

            {/* Pet info */}
            {petOf(detailRecord.petId) && (
              <div className="rounded-lg border border-line p-3 bg-canvas/50">
                <div className="text-[10px] text-ink/40 uppercase tracking-wide mb-1">Patient</div>
                <div className="text-xs text-ink/70">
                  {petOf(detailRecord.petId)!.name} · {petOf(detailRecord.petId)!.species} · {petOf(detailRecord.petId)!.breed} · {petOf(detailRecord.petId)!.gender} · {petOf(detailRecord.petId)!.weightKg}kg
                  {petOf(detailRecord.petId)!.allergies && petOf(detailRecord.petId)!.allergies !== 'None known' && (
                    <span className="text-coral font-medium"> · Allergies: {petOf(detailRecord.petId)!.allergies}</span>
                  )}
                </div>
              </div>
            )}

            {/* Chief complaint */}
            {detailRecord.chiefComplaint && (
              <div className="rounded-lg bg-sky-50 border border-sky-100 p-3">
                <div className="text-[10px] text-sky-600 uppercase tracking-wide font-medium mb-1">Chief Complaint</div>
                <div className="text-xs text-ink/80">{detailRecord.chiefComplaint}</div>
              </div>
            )}

            {/* Vital signs grid */}
            {detailRecord.vitalSigns && detailRecord.vitalSigns.heartRate > 0 && (
              <div>
                <div className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold mb-2">Vital Signs</div>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  <VitalCard icon={Weight} label="Weight" value={`${detailRecord.vitalSigns.weightKg}`} unit="kg" />
                  <VitalCard icon={Thermometer} label="Temp" value={`${detailRecord.vitalSigns.temperatureC}`} unit="°C" />
                  <VitalCard icon={Heart} label="Heart" value={`${detailRecord.vitalSigns.heartRate}`} unit="bpm" />
                  <VitalCard icon={Wind} label="Resp" value={`${detailRecord.vitalSigns.respiratoryRate}`} unit="rpm" />
                  <VitalCard icon={Gauge} label="BP" value={`${detailRecord.vitalSigns.bloodPressureSys}/${detailRecord.vitalSigns.bloodPressureDia}`} unit="mmHg" />
                  <VitalCard icon={Droplet} label="SpO2" value={`${detailRecord.vitalSigns.oxygenLevel}`} unit="%" />
                </div>
              </div>
            )}

            {/* Medical history & exam */}
            {(detailRecord.medicalHistory || detailRecord.physicalExamination) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detailRecord.medicalHistory && (
                  <div className="rounded-lg border border-line p-3">
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide font-medium mb-1">Medical History</div>
                    <div className="text-xs text-ink/70 whitespace-pre-wrap">{detailRecord.medicalHistory}</div>
                  </div>
                )}
                {detailRecord.physicalExamination && (
                  <div className="rounded-lg border border-line p-3">
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide font-medium mb-1">Physical Examination</div>
                    <div className="text-xs text-ink/70 whitespace-pre-wrap">{detailRecord.physicalExamination}</div>
                  </div>
                )}
              </div>
            )}

            {/* Diagnosis */}
            {detailRecord.diagnosis && (
              <div className="rounded-lg bg-coral/5 border border-coral/15 p-3">
                <div className="text-[10px] text-coral uppercase tracking-wide font-medium mb-1">Diagnosis</div>
                <div className="text-xs text-ink/80 font-medium">{detailRecord.diagnosis}</div>
              </div>
            )}

            {/* Treatment plan */}
            {detailRecord.treatmentPlan && (
              <div className="rounded-lg bg-mint/20 border border-sage/20 p-3">
                <div className="text-[10px] text-sage uppercase tracking-wide font-medium mb-1">Treatment Plan</div>
                <div className="text-xs text-ink/80 whitespace-pre-wrap">{detailRecord.treatmentPlan}</div>
              </div>
            )}

            {/* SOAP notes */}
            {detailRecord.soapNotes && (detailRecord.soapNotes.subjective || detailRecord.soapNotes.objective || detailRecord.soapNotes.assessment || detailRecord.soapNotes.plan) && (
              <div>
                <div className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold mb-2">SOAP Notes</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {detailRecord.soapNotes.subjective && <SOAPBox letter="S" label="Subjective" text={detailRecord.soapNotes.subjective} color="text-sky-600 bg-sky-50 border-sky-100" />}
                  {detailRecord.soapNotes.objective && <SOAPBox letter="O" label="Objective" text={detailRecord.soapNotes.objective} color="text-amber-600 bg-amber-50 border-amber-100" />}
                  {detailRecord.soapNotes.assessment && <SOAPBox letter="A" label="Assessment" text={detailRecord.soapNotes.assessment} color="text-coral bg-coral/5 border-coral/15" />}
                  {detailRecord.soapNotes.plan && <SOAPBox letter="P" label="Plan" text={detailRecord.soapNotes.plan} color="text-sage bg-mint/20 border-sage/20" />}
                </div>
              </div>
            )}

            {/* Attachments */}
            {detailRecord.attachments && detailRecord.attachments.length > 0 && (
              <div>
                <div className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold mb-2">Attachments ({detailRecord.attachments.length})</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {detailRecord.attachments.map((att) => {
                    const AIcon = attachmentIcon[att.type] || FileText;
                    return (
                      <div key={att.id} className="rounded-xl border border-line p-3 text-center hover:bg-canvas/50 transition-colors cursor-pointer">
                        <AIcon className="w-6 h-6 text-ink/40 mx-auto mb-1" />
                        <div className="text-[11px] font-medium text-ink truncate">{att.name}</div>
                        <div className="text-[9px] text-ink/40 mt-0.5">{att.type} · {att.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary fields */}
            {(detailRecord.findings || detailRecord.treatment) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-line pt-3">
                {detailRecord.findings && (
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide font-medium mb-1">Findings</div>
                    <div className="text-xs text-ink/70">{detailRecord.findings}</div>
                  </div>
                )}
                {detailRecord.treatment && (
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wide font-medium mb-1">Treatment</div>
                    <div className="text-xs text-ink/70">{detailRecord.treatment}</div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { openEdit(detailRecord); setDetailRecord(null); }}>
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
              <Button variant="danger" onClick={() => { deleteRecord(detailRecord.id); setDetailRecord(null); }}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}

function VitalPill({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-ink/60 bg-canvas rounded-full px-2 py-0.5">
      <Icon className="w-3 h-3 text-ink/40" /> {label}: {value}
    </span>
  );
}

function VitalCard({ icon: Icon, label, value, unit }: { icon: typeof Heart; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-line p-2.5 text-center">
      <Icon className="w-3.5 h-3.5 text-ink/40 mx-auto" />
      <div className="text-sm font-semibold text-ink mt-1">{value}</div>
      <div className="text-[9px] text-ink/40">{unit}</div>
      <div className="text-[9px] text-ink/50 mt-0.5 font-medium">{label}</div>
    </div>
  );
}

function SOAPBox({ letter, label, text, color }: { letter: string; label: string; text: string; color: string }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold">{letter}</span>
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className="text-xs text-ink/80 whitespace-pre-wrap">{text}</div>
    </div>
  );
}
