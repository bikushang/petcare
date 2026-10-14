'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Edit2, Trash2, FlaskConical, Barcode, Clock, User, FileText,
  ShieldCheck, ChevronDown, ChevronUp, X, Printer, Download,
  CheckCircle2, AlertTriangle, Activity, Microscope, Image as ImageIcon,
  TestTube, ClipboardList, Stethoscope,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, EmptyState, Modal, Field, Input, Select, Textarea, NumberInput, DatePicker, Checkbox, Badge, Tabs } from '../components/ui';
import { useDB, LabTest, LabResultParameter, SampleTrackingEntry, LabImage, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateLabExplanation } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const testTypes = ['Blood test', 'Urine test', 'Stool test', 'Imaging'] as const;
const testCategories: LabTest['testCategory'][] = ['CBC', 'Biochemistry', 'Urinalysis', 'Fecal', 'Culture', 'X-ray', 'Ultrasound', 'MRI', 'CT scan', 'Cytology', 'Histopathology', 'Other'];
const priorities = ['Routine', 'Urgent', 'STAT'] as const;
const statuses = ['Ordered', 'Sample collected', 'In analysis', 'Completed', 'Cancelled'] as const;
const trackStages = ['Collected', 'Received', 'In analysis', 'Completed', 'Rejected'] as const;
const flags = ['Normal', 'Low', 'High', 'Critical', 'N/A'] as const;
const vetNames = ['Dr. Rivera', 'Dr. Okafor', 'Dr. Patel', 'Grace Tan', 'Oscar Mbeki'];

const categoryForType: Record<LabTest['testType'], LabTest['testCategory'][]> = {
  'Blood test': ['CBC', 'Biochemistry', 'Cytology', 'Culture', 'Other'],
  'Urine test': ['Urinalysis', 'Culture', 'Other'],
  'Stool test': ['Fecal', 'Culture', 'Other'],
  'Imaging': ['X-ray', 'Ultrasound', 'MRI', 'CT scan', 'Other'],
};

const testTemplates: { id: string; name: string; type: LabTest['testType']; category: LabTest['testCategory']; params: { name: string; unit: string; refRange: string }[] }[] = [
  { id: 'tpl-cbc', name: 'Complete Blood Count (CBC)', type: 'Blood test', category: 'CBC', params: [
    { name: 'WBC', unit: '10^3/µL', refRange: '5.0-14.1' }, { name: 'RBC', unit: '10^6/µL', refRange: '5.5-8.5' },
    { name: 'Hemoglobin', unit: 'g/dL', refRange: '12.1-20.3' }, { name: 'Hematocrit', unit: '%', refRange: '36-55' },
    { name: 'Platelets', unit: '10^3/µL', refRange: '170-400' }, { name: 'Neutrophils', unit: '10^3/µL', refRange: '3.0-10.5' },
    { name: 'Lymphocytes', unit: '10^3/µL', refRange: '1.0-4.8' }, { name: 'Monocytes', unit: '10^3/µL', refRange: '0.2-1.3' },
  ]},
  { id: 'tpl-biochem', name: 'Comprehensive Metabolic Panel', type: 'Blood test', category: 'Biochemistry', params: [
    { name: 'ALT', unit: 'U/L', refRange: '10-125' }, { name: 'AST', unit: 'U/L', refRange: '10-60' },
    { name: 'ALP', unit: 'U/L', refRange: '20-150' }, { name: 'BUN', unit: 'mg/dL', refRange: '7-27' },
    { name: 'Creatinine', unit: 'mg/dL', refRange: '0.4-1.8' }, { name: 'Glucose', unit: 'mg/dL', refRange: '70-118' },
    { name: 'Total Protein', unit: 'g/dL', refRange: '5.2-7.8' }, { name: 'Albumin', unit: 'g/dL', refRange: '2.3-4.0' },
  ]},
  { id: 'tpl-urine', name: 'Complete Urinalysis', type: 'Urine test', category: 'Urinalysis', params: [
    { name: 'Color', unit: '', refRange: 'Yellow' }, { name: 'Clarity', unit: '', refRange: 'Clear' },
    { name: 'USG', unit: '', refRange: '1.015-1.045' }, { name: 'pH', unit: '', refRange: '5.5-7.5' },
    { name: 'Protein', unit: '', refRange: 'Negative' }, { name: 'Glucose', unit: '', refRange: 'Negative' },
    { name: 'Blood', unit: '', refRange: 'Negative' }, { name: 'Leukocytes', unit: '', refRange: 'Negative' },
  ]},
  { id: 'tpl-fecal', name: 'Fecal Examination', type: 'Stool test', category: 'Fecal', params: [
    { name: 'Consistency', unit: '', refRange: 'Formed' }, { name: 'Color', unit: '', refRange: 'Brown' },
    { name: 'Parasite eggs', unit: '', refRange: 'None seen' }, { name: 'Giardia', unit: '', refRange: 'Negative' },
    { name: 'Coccidia', unit: '', refRange: 'Negative' }, { name: 'Occult blood', unit: '', refRange: 'Negative' },
  ]},
  { id: 'tpl-xray', name: 'Radiograph (X-ray)', type: 'Imaging', category: 'X-ray', params: [] },
  { id: 'tpl-us', name: 'Ultrasound', type: 'Imaging', category: 'Ultrasound', params: [] },
  { id: 'tpl-ct', name: 'CT Scan', type: 'Imaging', category: 'CT scan', params: [] },
  { id: 'tpl-mri', name: 'MRI', type: 'Imaging', category: 'MRI', params: [] },
];

const statusStyle: Record<LabTest['status'], { bg: string; text: string; dot: string }> = {
  Ordered: { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  'Sample collected': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'In analysis': { bg: 'bg-coral/15', text: 'text-coral', dot: 'bg-coral' },
  Completed: { bg: 'bg-lilac', text: 'text-plum', dot: 'bg-plum' },
  Cancelled: { bg: 'bg-canvas', text: 'text-ink/40', dot: 'bg-ink/30' },
};

const flagStyle: Record<LabResultParameter['flag'], string> = {
  Normal: 'text-plum',
  Low: 'text-sky-600',
  High: 'text-amber-600',
  Critical: 'text-coral font-semibold',
  'N/A': 'text-ink/40',
};

const priorityStyle: Record<LabTest['priority'], string> = {
  Routine: 'text-ink/50',
  Urgent: 'text-amber-600',
  STAT: 'text-coral font-semibold',
};

type Tab = 'details' | 'sample' | 'results' | 'report';

const blankResult = (): LabResultParameter => ({ id: '', name: '', value: '', unit: '', refRange: '', flag: 'Normal' });
const blankTrack = (): SampleTrackingEntry => ({ id: '', stage: 'Collected', timestamp: '', technician: '', notes: '' });

const blankForm = () => ({
  petId: '',
  testType: 'Blood test' as LabTest['testType'],
  testCategory: 'CBC' as LabTest['testCategory'],
  testName: '',
  templateId: '',
  requestedBy: vetNames[0],
  dateOrdered: today(),
  priority: 'Routine' as LabTest['priority'],
  status: 'Ordered' as LabTest['status'],
  barcode: '',
  sampleType: '',
  sampleVolume: '',
  collectionMethod: '',
  collectedBy: '',
  collectionDate: '',
  storageCondition: '',
  sampleTracking: [] as SampleTrackingEntry[],
  results: [] as LabResultParameter[],
  impression: '',
  findings: '',
  interpretation: '',
  notes: '',
  imagingRegion: '',
  imagingModality: '',
  contrastUsed: false,
  imageCount: 0,
  images: [] as LabImage[],
  digitallySigned: false,
  signedBy: '',
  signedDate: '',
  signedRole: '',
  cost: 0,
});

export default function LabPage() {
  const { db, create, update, remove } = useDB();
  const [open, setOpen] = useState(false);
  const [editT, setEditT] = useState<LabTest | null>(null);
  const [form, setForm] = useState(blankForm());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [petFilter, setPetFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [printT, setPrintT] = useState<LabTest | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const petName = (id: string) => db?.pets.find((p) => p.id === id)?.name ?? 'Unknown';
  const petOf = (id: string) => db?.pets.find((p) => p.id === id);
  const ownerOf = (petId: string) => {
    const pet = db?.pets.find((p) => p.id === petId);
    return pet ? db?.owners.find((o) => o.id === pet.ownerId)?.name ?? '' : '';
  };

  const set = (k: string, v: string | number | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const setResult = (idx: number, k: keyof LabResultParameter, v: string) =>
    setForm((f) => ({ ...f, results: f.results.map((r, i) => (i === idx ? { ...r, [k]: v } : r)) }));
  const addResult = () => setForm((f) => ({ ...f, results: [...f.results, { ...blankResult(), id: newId('r') }] }));
  const removeResult = (idx: number) => setForm((f) => ({ ...f, results: f.results.filter((_, i) => i !== idx) }));

  const setTrack = (idx: number, k: keyof SampleTrackingEntry, v: string) =>
    setForm((f) => ({ ...f, sampleTracking: f.sampleTracking.map((t, i) => (i === idx ? { ...t, [k]: v } : t)) }));
  const addTrack = () => setForm((f) => ({ ...f, sampleTracking: [...f.sampleTracking, { ...blankTrack(), id: newId('st') }] }));
  const removeTrack = (idx: number) => setForm((f) => ({ ...f, sampleTracking: f.sampleTracking.filter((_, i) => i !== idx) }));

  const applyTemplate = (tplId: string) => {
    const tpl = testTemplates.find((t) => t.id === tplId);
    if (!tpl) { set('templateId', ''); return; }
    setForm((f) => ({
      ...f,
      templateId: tplId,
      testName: tpl.name,
      testType: tpl.type,
      testCategory: tpl.category,
      results: tpl.params.map((p) => ({ id: newId('r'), name: p.name, value: '', unit: p.unit, refRange: p.refRange, flag: 'Normal' })),
      imagingRegion: tpl.type === 'Imaging' ? f.imagingRegion : '',
      imagingModality: tpl.type === 'Imaging' ? tpl.category : '',
    }));
  };

  const onTypeChange = (t: LabTest['testType']) => {
    const cats = categoryForType[t];
    setForm((f) => ({ ...f, testType: t, testCategory: cats[0] }));
  };

  const filtered = useMemo(() => {
    if (!db) return [];
    return [...db.labTests]
      .filter((l) => petFilter === 'all' || l.petId === petFilter)
      .filter((l) => statusFilter === 'all' || l.status === statusFilter)
      .filter((l) => typeFilter === 'all' || l.testType === typeFilter)
      .sort((a, b) => b.dateOrdered.localeCompare(a.dateOrdered));
  }, [db, petFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    if (!db) return { total: 0, pending: 0, completed: 0, stat: 0, imaging: 0 };
    const all = db.labTests;
    return {
      total: all.length,
      pending: all.filter((l) => l.status !== 'Completed' && l.status !== 'Cancelled').length,
      completed: all.filter((l) => l.status === 'Completed').length,
      stat: all.filter((l) => l.priority === 'STAT').length,
      imaging: all.filter((l) => l.testType === 'Imaging').length,
    };
  }, [db]);

  const openNew = () => {
    setEditT(null);
    setForm({ ...blankForm(), barcode: `BC${Date.now().toString().slice(-6)}` });
    setActiveTab('details');
    setOpen(true);
  };

  const openEdit = (t: LabTest) => {
    setEditT(t);
    setForm({
      petId: t.petId, testType: t.testType, testCategory: t.testCategory, testName: t.testName, templateId: t.templateId,
      requestedBy: t.requestedBy, dateOrdered: t.dateOrdered, priority: t.priority, status: t.status,
      barcode: t.barcode, sampleType: t.sampleType, sampleVolume: t.sampleVolume, collectionMethod: t.collectionMethod,
      collectedBy: t.collectedBy, collectionDate: t.collectionDate, storageCondition: t.storageCondition,
      sampleTracking: t.sampleTracking.map((s) => ({ ...s })),
      results: t.results.map((r) => ({ ...r })),
      impression: t.impression, findings: t.findings, interpretation: t.interpretation, notes: t.notes,
      imagingRegion: t.imagingRegion, imagingModality: t.imagingModality, contrastUsed: t.contrastUsed,
      imageCount: t.imageCount, images: t.images.map((i) => ({ ...i })),
      digitallySigned: t.digitallySigned, signedBy: t.signedBy, signedDate: t.signedDate, signedRole: t.signedRole,
      cost: t.cost,
    });
    setActiveTab('details');
    setOpen(true);
  };

  const saveTest = () => {
    if (!form.petId || !form.testName) return;
    const pet = petOf(form.petId);
    const ownerId = pet?.ownerId ?? '';
    const testNum = editT?.testNumber || `LAB-${String(Date.now()).slice(-4)}`;
    const reportGenerated = form.status === 'Completed' && form.results.length > 0;
    const data = {
      testNumber: testNum, petId: form.petId, ownerId,
      medRecordId: editT?.medRecordId ?? '', appointmentId: editT?.appointmentId ?? '', invoiceId: editT?.invoiceId ?? '',
      testType: form.testType, testCategory: form.testCategory, testName: form.testName, templateId: form.templateId,
      requestedBy: form.requestedBy, dateOrdered: form.dateOrdered,
      dateCompleted: form.status === 'Completed' ? (editT?.dateCompleted || today()) : '',
      priority: form.priority, status: form.status,
      barcode: form.barcode, sampleType: form.sampleType, sampleVolume: form.sampleVolume,
      collectionMethod: form.collectionMethod, collectedBy: form.collectedBy, collectionDate: form.collectionDate,
      storageCondition: form.storageCondition,
      sampleTracking: form.sampleTracking,
      results: form.results,
      impression: form.impression, findings: form.findings, interpretation: form.interpretation, notes: form.notes,
      imagingRegion: form.imagingRegion, imagingModality: form.imagingModality, contrastUsed: form.contrastUsed,
      imageCount: form.imageCount, images: form.images,
      reportGenerated, reportGeneratedDate: reportGenerated ? (editT?.reportGeneratedDate || today()) : '',
      digitallySigned: form.digitallySigned, signedBy: form.signedBy, signedDate: form.signedDate, signedRole: form.signedRole,
      cost: form.cost,
      createdAt: editT?.createdAt ?? today(),
    };
    if (editT) {
      update('labTests', editT.id, data);
    } else {
      create('labTests', { id: newId('lab'), ...data } as LabTest);
    }
    setOpen(false);
    setEditT(null);
  };

  const deleteTest = (id: string) => remove('labTests', id);

  const tabs: { key: Tab; label: string; icon: typeof FlaskConical }[] = [
    { key: 'details', label: 'Test Details', icon: ClipboardList },
    { key: 'sample', label: 'Sample & Tracking', icon: TestTube },
    { key: 'results', label: 'Results', icon: Microscope },
    { key: 'report', label: 'Report & Sign', icon: FileText },
  ];

  const handlePrint = () => {
    if (!printT) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const pet = petOf(printT.petId);
    const isImaging = printT.testType === 'Imaging';
    win.document.write(`<!DOCTYPE html><html><head><title>Lab Report ${printT.testNumber}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;font-family:Georgia,serif;color:#1a1a1a}
      body{padding:40px;max-width:750px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4C1D95;padding-bottom:16px;margin-bottom:20px}
      .clinic-name{font-size:22px;font-weight:bold;color:#4C1D95}
      .clinic-sub{font-size:12px;color:#666;margin-top:2px}
      .report-num{font-size:12px;color:#666;text-align:right}
      .report-num b{font-size:14px;color:#4C1D95;font-family:monospace}
      .barcode{font-family:monospace;font-size:16px;letter-spacing:3px;color:#333;margin-top:4px}
      .patient-box{background:#f8f9fa;border:1px solid #e0e0e0;border-radius:8px;padding:14px;margin-bottom:18px;display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .patient-box .label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999}
      .patient-box .value{font-size:14px;font-weight:bold}
      .section{margin-bottom:20px}
      .section-title{font-size:14px;font-weight:bold;color:#4C1D95;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
      .row{font-size:12px;margin-bottom:4px}
      .row b{color:#333}
      .notes{font-size:12px;color:#444;font-style:italic;padding:10px;background:#f8f9fa;border-radius:4px;margin-top:6px}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}
      th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;padding:6px 4px;border-bottom:2px solid #e0e0e0}
      td{padding:8px 4px;border-bottom:1px solid #eee;font-size:12px;vertical-align:top}
      .flag-normal{color:#4C1D95}.flag-low{color:#0ea5e9}.flag-high{color:#f59e0b}.flag-critical{color:#ef4444;font-weight:bold}
      .footer{margin-top:30px;padding-top:14px;border-top:1px solid #e0e0e0;text-align:right}
      .sig-line{border-top:1px solid #333;width:220px;margin:0 0 4px auto}
      .sig-name{font-size:13px;font-weight:bold}
      .sig-role{font-size:11px;color:#666}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      @media print{body{padding:20px}}
    </style></head><body>
    <div class="header">
      <div><div class="clinic-name">PetCare Pro</div><div class="clinic-sub">Northgate Animal Hospital &middot; 128 Maple Ave, Northgate, CA</div></div>
      <div class="report-num">Laboratory Report<br><b>${printT.testNumber}</b><div class="barcode">|||${printT.barcode}|||</div>${printT.dateOrdered}</div>
    </div>
    <div class="patient-box">
      <div><div class="label">Patient</div><div class="value">${pet?.name ?? ''} (${pet?.species ?? ''}, ${pet?.breed ?? ''})</div></div>
      <div><div class="label">Owner</div><div class="value">${ownerOf(printT.petId)}</div></div>
      <div><div class="label">Test</div><div class="value">${printT.testName}</div></div>
      <div><div class="label">Type / Category</div><div class="value">${printT.testType} - ${printT.testCategory}</div></div>
      <div><div class="label">Requested by</div><div class="value">${printT.requestedBy}</div></div>
      <div><div class="label">Priority / Status</div><div class="value">${printT.priority} - ${printT.status}</div></div>
    </div>
    ${isImaging ? `
    <div class="section"><div class="section-title">Imaging Details</div>
      <div class="row"><b>Region:</b> ${printT.imagingRegion || 'N/A'}</div>
      <div class="row"><b>Modality:</b> ${printT.imagingModality || 'N/A'}</div>
      <div class="row"><b>Contrast:</b> ${printT.contrastUsed ? 'Yes' : 'No'}</div>
      <div class="row"><b>Images:</b> ${printT.imageCount}</div>
    </div>` : ''}
    ${printT.sampleType ? `<div class="section"><div class="section-title">Sample Information</div>
      <div class="grid2">
        <div class="row"><b>Type:</b> ${printT.sampleType}</div>
        <div class="row"><b>Volume:</b> ${printT.sampleVolume}</div>
        <div class="row"><b>Collection:</b> ${printT.collectionMethod}</div>
        <div class="row"><b>Collected by:</b> ${printT.collectedBy}</div>
        <div class="row"><b>Collection date:</b> ${printT.collectionDate}</div>
        <div class="row"><b>Storage:</b> ${printT.storageCondition}</div>
      </div>
    </div>` : ''}
    ${printT.sampleTracking.length ? `<div class="section"><div class="section-title">Sample Tracking</div>
      <table><thead><tr><th>Stage</th><th>Timestamp</th><th>Technician</th><th>Notes</th></tr></thead>
      <tbody>${printT.sampleTracking.map((s) => `<tr><td>${s.stage}</td><td>${s.timestamp}</td><td>${s.technician}</td><td>${s.notes}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${printT.results.length ? `<div class="section"><div class="section-title">Results</div>
      <table><thead><tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Flag</th></tr></thead>
      <tbody>${printT.results.map((r) => `<tr><td>${r.name}</td><td><b>${r.value}</b></td><td>${r.unit}</td><td>${r.refRange}</td><td class="flag-${r.flag.toLowerCase()}">${r.flag}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${printT.impression ? `<div class="section"><div class="section-title">Impression</div><div class="notes">${printT.impression}</div></div>` : ''}
    ${printT.findings ? `<div class="section"><div class="section-title">Findings</div><div class="notes">${printT.findings}</div></div>` : ''}
    ${printT.interpretation ? `<div class="section"><div class="section-title">Interpretation</div><div class="notes">${printT.interpretation}</div></div>` : ''}
    ${printT.notes ? `<div class="section"><div class="section-title">Notes</div><div class="notes">${printT.notes}</div></div>` : ''}
    <div class="footer">
      ${printT.digitallySigned ? `<div style="font-size:11px;color:#4C1D95;margin-bottom:8px">Digitally signed by ${printT.signedBy} (${printT.signedRole}) on ${printT.signedDate}</div>` : ''}
      <div class="sig-line"></div>
      <div class="sig-name">${printT.digitallySigned ? printT.signedBy : '________________'}</div>
      <div class="sig-role">${printT.digitallySigned ? printT.signedRole : 'Laboratory Technician'}</div>
    </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  if (!db) return <Shell module="labTests" title="Laboratory"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  const hasFilters = petFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all';

  return (
    <Shell title="Laboratory" subtitle="Diagnostic workflow — blood, urine, stool, imaging, sample tracking, reports, and digital signatures">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><FlaskConical className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-ink">{stats.total}</div><div className="text-[11px] text-ink/50">Total tests</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div><div><div className="text-2xl font-bold text-amber-600">{stats.pending}</div><div className="text-[11px] text-ink/50">In progress</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-plum" /></div><div><div className="text-2xl font-bold text-plum">{stats.completed}</div><div className="text-[11px] text-ink/50">Completed</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-coral" /></div><div><div className="text-2xl font-bold text-coral">{stats.stat}</div><div className="text-[11px] text-ink/50">STAT priority</div></div></div></Card>
        <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-sky-600" /></div><div><div className="text-2xl font-bold text-sky-700">{stats.imaging}</div><div className="text-[11px] text-ink/50">Imaging studies</div></div></div></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="w-auto">
          <option value="all">All patients</option>
          {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">
          <option value="all">All test types</option>
          {testTypes.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </Select>
        {hasFilters && (
          <button onClick={() => { setPetFilter('all'); setStatusFilter('all'); setTypeFilter('all'); }} className="inline-flex items-center gap-1 text-xs text-ink/50 hover:text-ink px-2">
            <X className="w-3.5 h-3.5" /> Clear filters
          </button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <AISuggestionButton onClick={() => { const p = db?.pets[0]; const t = db?.labTests[0]; if (p && t) setAiSuggestion(generateLabExplanation(t, p)); }} label="AI Explain" />
          <Button onClick={openNew}><Plus className="w-4 h-4" /> New lab test</Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><EmptyState icon={FlaskConical} title="No lab tests" hint="Order a new lab test to start tracking samples, results, and reports." /></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const expanded = expandedId === t.id;
            const S = statusStyle[t.status];
            const pet = petOf(t.petId);
            const hasAbnormal = t.results.some((r) => r.flag !== 'Normal' && r.flag !== 'N/A');
            return (
              <Card key={t.id} className="group hover:ring-2 hover:ring-plum/20 transition-all">
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expanded ? null : t.id)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${S.bg}`}>
                      {t.testType === 'Imaging' ? <ImageIcon className={`w-5 h-5 ${S.text}`} /> : <FlaskConical className={`w-5 h-5 ${S.text}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{t.testName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${S.bg} ${S.text}`}>{t.status}</span>
                        {t.priority !== 'Routine' && <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.priority === 'STAT' ? 'bg-coral/15 text-coral' : 'bg-amber-100 text-amber-700'}`}>{t.priority}</span>}
                        {t.digitallySigned && <span className="text-[10px] text-plum flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Signed</span>}
                        {hasAbnormal && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Abnormal</span>}
                      </div>
                      <div className="text-[11px] text-ink/50 mt-0.5">
                        {t.testNumber} · {petName(t.petId)} · {ownerOf(t.petId)} · {t.testType} / {t.testCategory} · {t.dateOrdered}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {t.barcode && <span className="text-[10px] px-2 py-0.5 rounded bg-canvas/60 text-ink/60 flex items-center gap-0.5 font-mono"><Barcode className="w-2.5 h-2.5" /> {t.barcode}</span>}
                        {t.sampleTracking.length > 0 && <span className="text-[10px] text-sky-600 flex items-center gap-0.5"><TestTube className="w-3 h-3" /> {t.sampleTracking.length} tracking steps</span>}
                        {t.results.length > 0 && <span className="text-[10px] text-plum flex items-center gap-0.5"><Microscope className="w-3 h-3" /> {t.results.length} parameters</span>}
                        {t.testType === 'Imaging' && t.imagingRegion && <span className="text-[10px] text-sky-600 flex items-center gap-0.5"><ImageIcon className="w-3 h-3" /> {t.imagingRegion}</span>}
                        {t.reportGenerated && <span className="text-[10px] text-plum flex items-center gap-0.5"><FileText className="w-3 h-3" /> Report ready</span>}
                      </div>
                    </div>
                    <button className="text-ink/30 hover:text-ink mt-1">
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setPrintT(t)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Print report">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteTest(t.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-line px-4 pb-4 pt-3 bg-canvas/30 space-y-3">
                    {/* Sample tracking timeline */}
                    {t.sampleTracking.length > 0 && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><TestTube className="w-3.5 h-3.5" /> Sample Tracking</div>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {t.sampleTracking.map((s, i) => (
                            <div key={i} className="flex items-center gap-1 shrink-0">
                              <div className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${s.stage === 'Completed' ? 'bg-lilac text-plum' : s.stage === 'Rejected' ? 'bg-coral/15 text-coral' : 'bg-canvas text-ink/60'}`}>
                                <div>{s.stage}</div>
                                <div className="text-[9px] font-normal opacity-70">{s.timestamp}</div>
                                <div className="text-[9px] font-normal opacity-60">{s.technician}</div>
                              </div>
                              {i < t.sampleTracking.length - 1 && <div className="w-4 h-px bg-line" />}
                            </div>
                          ))}
                        </div>
                        {t.sampleType && <div className="text-[11px] text-ink/50 mt-2 border-t border-line/50 pt-2">{t.sampleType} · {t.sampleVolume} · {t.collectionMethod}</div>}
                      </div>
                    )}

                    {/* Results table */}
                    {t.results.length > 0 && (
                      <div className="rounded-lg border border-line bg-white p-3">
                        <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Microscope className="w-3.5 h-3.5" /> Results</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px]">
                            <thead><tr className="text-ink/40 text-[10px]"><th className="text-left py-1">Parameter</th><th className="text-right">Value</th><th className="text-left pl-2">Unit</th><th className="text-left pl-2">Ref Range</th><th className="text-center">Flag</th></tr></thead>
                            <tbody>
                              {t.results.map((r, i) => (
                                <tr key={i} className="border-t border-line/50">
                                  <td className="py-1 text-ink/70 font-medium">{r.name}</td>
                                  <td className="text-right text-ink/70 font-semibold">{r.value}</td>
                                  <td className="text-left pl-2 text-ink/50">{r.unit}</td>
                                  <td className="text-left pl-2 text-ink/40">{r.refRange}</td>
                                  <td className="text-center"><span className={flagStyle[r.flag]}>{r.flag}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Impression / interpretation */}
                    {(t.impression || t.findings || t.interpretation) && (
                      <div className="rounded-lg border border-line bg-white p-3 space-y-2">
                        {t.impression && <div><div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-0.5">Impression</div><div className="text-xs text-ink/60">{t.impression}</div></div>}
                        {t.findings && <div><div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-0.5">Findings</div><div className="text-xs text-ink/60 whitespace-pre-wrap">{t.findings}</div></div>}
                        {t.interpretation && <div><div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-0.5">Interpretation</div><div className="text-xs text-ink/60">{t.interpretation}</div></div>}
                      </div>
                    )}

                    {/* Digital signature */}
                    {t.digitallySigned && (
                      <div className="rounded-lg border border-plum/30 bg-lilac/20 p-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-plum" />
                        <div className="text-xs"><span className="font-semibold text-plum">Digitally signed</span> <span className="text-ink/60">by {t.signedBy} ({t.signedRole}) on {t.signedDate}</span></div>
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

      <Modal open={open} onClose={() => { setOpen(false); setEditT(null); }} title={editT ? `Edit ${editT.testNumber}` : 'New lab test'} wide>
        <div className="space-y-4">
          {/* Tabs */}
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} size="sm" className="mb-1" />

          {/* Details tab */}
          {activeTab === 'details' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Patient">
                  <Select value={form.petId} onChange={(e) => set('petId', e.target.value)}>
                    <option value="">Select pet…</option>
                    {db.pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                  </Select>
                </Field>
                <Field label="Test type">
                  <Select value={form.testType} onChange={(e) => onTypeChange(e.target.value as LabTest['testType'])}>
                    {testTypes.map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </Field>
                <Field label="Category">
                  <Select value={form.testCategory} onChange={(e) => set('testCategory', e.target.value as LabTest['testCategory'])}>
                    {categoryForType[form.testType].map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={form.priority} onChange={(e) => set('priority', e.target.value as LabTest['priority'])}>
                    {priorities.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
              </div>

              <Field label="Test template (pre-fills parameters)">
                <Select value={form.templateId} onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">No template / custom</option>
                  {testTemplates.filter((tpl) => tpl.type === form.testType).map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
                </Select>
              </Field>

              <Field label="Test name"><Input value={form.testName} onChange={(e) => set('testName', e.target.value)} placeholder="e.g. Complete Blood Count" /></Field>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Requested by">
                  <Select value={form.requestedBy} onChange={(e) => set('requestedBy', e.target.value)}>
                    {vetNames.map((n) => <option key={n}>{n}</option>)}
                  </Select>
                </Field>
                <Field label="Date ordered"><DatePicker value={form.dateOrdered} onChange={(e) => set('dateOrdered', e.target.value)} /></Field>
                <Field label="Status">
                  <Select value={form.status} onChange={(e) => set('status', e.target.value as LabTest['status'])}>
                    {statuses.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </Field>
                <Field label="Cost"><NumberInput value={String(form.cost)} onChange={(e) => set('cost', parseFloat(e.target.value) || 0)} /></Field>
              </div>

              <Field label="Barcode"><Input className="font-mono" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="Auto-generated" /></Field>

              {/* Imaging-specific fields */}
              {form.testType === 'Imaging' && (
                <div className="border-t border-line pt-3 space-y-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Imaging Details</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Region"><Input value={form.imagingRegion} onChange={(e) => set('imagingRegion', e.target.value)} placeholder="e.g. Abdomen, Pelvis" /></Field>
                    <Field label="Modality"><Input value={form.imagingModality} onChange={(e) => set('imagingModality', e.target.value)} placeholder="e.g. Digital radiography" /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Image count"><NumberInput value={String(form.imageCount)} onChange={(e) => set('imageCount', parseInt(e.target.value) || 0)} /></Field>
                    <div className="flex items-end pb-1">
                      <Checkbox checked={form.contrastUsed} onChange={(e) => set('contrastUsed', e.target.checked)} label="Contrast used" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sample tab */}
          {activeTab === 'sample' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sample type"><Input value={form.sampleType} onChange={(e) => set('sampleType', e.target.value)} placeholder="e.g. Whole blood (EDTA)" /></Field>
                <Field label="Sample volume"><Input value={form.sampleVolume} onChange={(e) => set('sampleVolume', e.target.value)} placeholder="e.g. 1.5 ml" /></Field>
                <Field label="Collection method"><Input value={form.collectionMethod} onChange={(e) => set('collectionMethod', e.target.value)} placeholder="e.g. Jugular venipuncture" /></Field>
                <Field label="Collected by"><Input value={form.collectedBy} onChange={(e) => set('collectedBy', e.target.value)} placeholder="Technician name" /></Field>
                <Field label="Collection date"><DatePicker value={form.collectionDate} onChange={(e) => set('collectionDate', e.target.value)} /></Field>
                <Field label="Storage condition"><Input value={form.storageCondition} onChange={(e) => set('storageCondition', e.target.value)} placeholder="e.g. Refrigerated 4°C" /></Field>
              </div>

              {/* Sample tracking */}
              <div className="border-t border-line pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><TestTube className="w-3.5 h-3.5" /> Sample Tracking</div>
                  <Button size="sm" variant="outline" onClick={addTrack}><Plus className="w-3.5 h-3.5" /> Add step</Button>
                </div>
                <div className="space-y-2">
                  {form.sampleTracking.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                      <Select value={s.stage} onChange={(e) => setTrack(idx, 'stage', e.target.value)} className="w-36">
                        {trackStages.map((st) => <option key={st}>{st}</option>)}
                      </Select>
                      <Input className="w-32" value={s.timestamp} onChange={(e) => setTrack(idx, 'timestamp', e.target.value)} placeholder="Timestamp" />
                      <Input className="w-36" value={s.technician} onChange={(e) => setTrack(idx, 'technician', e.target.value)} placeholder="Technician" />
                      <Input className="flex-1 min-w-[100px]" value={s.notes} onChange={(e) => setTrack(idx, 'notes', e.target.value)} placeholder="Notes" />
                      <button onClick={() => removeTrack(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results tab */}
          {activeTab === 'results' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide flex items-center gap-1.5"><Microscope className="w-3.5 h-3.5" /> Result Parameters</div>
                <Button size="sm" variant="outline" onClick={addResult}><Plus className="w-3.5 h-3.5" /> Add parameter</Button>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {form.results.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-wrap rounded-lg border border-line p-2 bg-canvas/30">
                    <Input className="w-32" value={r.name} onChange={(e) => setResult(idx, 'name', e.target.value)} placeholder="Parameter" />
                    <Input className="w-24" value={r.value} onChange={(e) => setResult(idx, 'value', e.target.value)} placeholder="Value" />
                    <Input className="w-20" value={r.unit} onChange={(e) => setResult(idx, 'unit', e.target.value)} placeholder="Unit" />
                    <Input className="w-28" value={r.refRange} onChange={(e) => setResult(idx, 'refRange', e.target.value)} placeholder="Ref range" />
                    <Select value={r.flag} onChange={(e) => setResult(idx, 'flag', e.target.value)} className="w-24">
                      {flags.map((f) => <option key={f}>{f}</option>)}
                    </Select>
                    <button onClick={() => removeResult(idx)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <Field label="Impression"><Textarea value={form.impression} onChange={(e) => set('impression', e.target.value)} placeholder="Overall impression / summary…" className="min-h-[50px]" /></Field>
              <Field label="Findings"><Textarea value={form.findings} onChange={(e) => set('findings', e.target.value)} placeholder="Detailed findings…" className="min-h-[60px]" /></Field>
              <Field label="Interpretation"><Textarea value={form.interpretation} onChange={(e) => set('interpretation', e.target.value)} placeholder="Clinical interpretation and recommendations…" className="min-h-[60px]" /></Field>
              <Field label="Notes"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Lab notes, methodology, equipment used…" className="min-h-[40px]" /></Field>
            </div>
          )}

          {/* Report tab */}
          {activeTab === 'report' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-line bg-canvas/30 p-3">
                <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Report Status</div>
                <div className="text-xs text-ink/60">
                  {form.status === 'Completed' && form.results.length > 0
                    ? 'Report will be generated automatically when saved.'
                    : 'Complete the test and add results to generate a report.'}
                </div>
              </div>

              <div className="border-t border-line pt-3">
                <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Digital Signature</div>
                <div className="space-y-2">
                  <Checkbox checked={form.digitallySigned} onChange={(e) => set('digitallySigned', e.target.checked)} label="Digitally sign this report" />
                  {form.digitallySigned && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Signed by"><Input value={form.signedBy} onChange={(e) => set('signedBy', e.target.value)} placeholder="Name" /></Field>
                      <Field label="Role"><Input value={form.signedRole} onChange={(e) => set('signedRole', e.target.value)} placeholder="e.g. Laboratory Technician" /></Field>
                      <Field label="Signed date"><DatePicker value={form.signedDate} onChange={(e) => set('signedDate', e.target.value)} /></Field>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditT(null); }}>Cancel</Button>
            <Button onClick={saveTest}>{editT ? 'Save changes' : 'Create test'}</Button>
          </div>
        </div>
      </Modal>

      {/* Print modal */}
      <Modal open={!!printT} onClose={() => setPrintT(null)} title={`Lab Report ${printT?.testNumber ?? ''}`} wide>
        {printT && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-plum/30 bg-gradient-to-br from-lilac/20 to-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-plum flex items-center justify-center"><FlaskConical className="w-5 h-5 text-white" /></div>
                  <div><div className="text-sm font-bold text-ink">PetCare Pro Laboratory</div><div className="text-[10px] text-ink/50">Diagnostic Report</div></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-ink/40">Report No</div>
                  <div className="text-sm font-mono font-semibold text-plum">{printT.testNumber}</div>
                  <div className="text-[10px] text-ink/40 font-mono mt-1">|||{printT.barcode}|||</div>
                </div>
              </div>
              <div className="border-t border-plum/20 pt-3 space-y-1.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Patient:</span> <span className="font-medium text-ink">{petName(printT.petId)}</span></div>
                  <div><span className="text-ink/40">Owner:</span> <span className="font-medium text-ink">{ownerOf(printT.petId)}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Test:</span> <span className="font-medium text-ink">{printT.testName}</span></div>
                  <div><span className="text-ink/40">Type:</span> <span className="font-medium text-ink">{printT.testType} / {printT.testCategory}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-ink/40">Ordered:</span> <span className="font-medium text-ink">{printT.dateOrdered}</span></div>
                  <div><span className="text-ink/40">By:</span> <span className="font-medium text-ink">{printT.requestedBy}</span></div>
                </div>
              </div>
              {printT.results.length > 0 && (
                <div className="border-t border-plum/20 mt-3 pt-3">
                  <div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-1.5">Results</div>
                  <div className="space-y-0.5">
                    {printT.results.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="text-ink/60 w-24">{r.name}</span>
                        <span className="font-medium text-ink">{r.value}</span>
                        <span className="text-ink/40">{r.unit}</span>
                        <span className="text-ink/30 text-[10px] ml-auto">Ref: {r.refRange}</span>
                        <span className={flagStyle[r.flag]}>{r.flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {printT.impression && (
                <div className="border-t border-plum/20 mt-3 pt-3">
                  <div className="text-[10px] font-semibold text-plum uppercase tracking-wide mb-1">Impression</div>
                  <div className="text-[11px] text-ink/60">{printT.impression}</div>
                </div>
              )}
              {printT.digitallySigned && (
                <div className="border-t border-plum/20 mt-3 pt-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-plum" />
                  <span className="text-[10px] text-plum font-medium">Digitally signed by {printT.signedBy} ({printT.signedRole}) on {printT.signedDate}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={handlePrint}><Printer className="w-4 h-4" /> Print / download report</Button>
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}
