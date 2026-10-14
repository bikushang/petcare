'use client';

import { useState, useMemo } from 'react';
import {
  X, PawPrint, Phone, Mail, Cake, Scale, Edit2, Trash2, Syringe, FlaskConical,
  Stethoscope, CalendarDays, Heart, Activity, FileText, QrCode, Cpu, Ruler,
  Droplet, Utensils, Shield, Image as ImageIcon, Folder, GitBranch, TrendingUp,
  Plus, Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { Card, Badge, Button, Modal, Field, Input, NumberInput, Select, DateInput, Checkbox, Textarea, ImagePicker } from './ui';
import { AreaChartCard } from './ui';
import type { Pet, Owner, MedRecord, Appointment, Invoice, WeightEntry, PetPhoto, PetDocument } from '../lib/api';
import { newId, today } from '../lib/store';

const age = (birth: string) => {
  if (!birth) return '—';
  const months = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return '<1mo';
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y ${months % 12}mo`;
};

const invTotal = (i: Invoice) => i.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

type ProfileProps = {
  pet: Pet;
  owner: Owner | undefined;
  records: MedRecord[];
  appointments: Appointment[];
  invoices: Invoice[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Pet>) => void;
};

type TabId = 'overview' | 'timeline' | 'records' | 'gallery' | 'documents' | 'pedigree';

export function PetProfileDrawer({ pet, owner, records, appointments, invoices, onClose, onEdit, onDelete, onUpdate }: ProfileProps) {
  const [tab, setTab] = useState<TabId>('overview');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Health Timeline' },
    { id: 'records', label: 'Records' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'documents', label: 'Documents' },
    { id: 'pedigree', label: 'Pedigree' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-soft overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-line px-5 h-14 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <PawPrint className="w-4 h-4 text-plum" />
            <h3 className="text-sm font-semibold text-ink">{pet.name} · Patient Profile</h3>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        {/* Pet identity banner */}
        <div className="px-5 py-4 border-b border-line bg-gradient-to-b from-lilac/30 to-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-lilac text-plum flex items-center justify-center text-xl font-semibold shrink-0">
              {pet.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold text-ink">{pet.name}</span>
                <span className="text-[11px] text-ink/40 font-mono">#{pet.id}</span>
              </div>
              <div className="text-xs text-ink/50 mt-0.5">
                {pet.species} · {pet.breed || 'Mixed'} · {pet.gender} · {pet.color || 'N/A'}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {pet.microchipNumber && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">
                    <Cpu className="w-3 h-3" /> Chip: {pet.microchipNumber}
                  </span>
                )}
                {pet.rfidNumber && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                    <QrCode className="w-3 h-3" /> RFID: {pet.rfidNumber}
                  </span>
                )}
                {pet.qrCodeId && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">
                    <QrCode className="w-3 h-3" /> QR: {pet.qrCodeId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="sticky top-14 bg-white border-b border-line px-5 py-2.5 z-10">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`hv-lift inline-flex items-center shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-plum text-white shadow-lift-sm'
                    : 'bg-white text-ink/60 border border-line hover:border-plum/40 hover:bg-lilac/40 hover:text-plum'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {tab === 'overview' && <OverviewTab pet={pet} owner={owner} />}
          {tab === 'timeline' && <TimelineTab pet={pet} records={records} onUpdate={onUpdate} />}
          {tab === 'records' && <RecordsTab records={records} appointments={appointments} invoices={invoices} />}
          {tab === 'gallery' && <GalleryTab pet={pet} onUpdate={onUpdate} />}
          {tab === 'documents' && <DocumentsTab pet={pet} onUpdate={onUpdate} />}
          {tab === 'pedigree' && <PedigreeTab pet={pet} onUpdate={onUpdate} />}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-line px-5 h-14 flex items-center gap-2">
          <Button variant="outline" onClick={onEdit} className="flex-1">
            <Edit2 className="w-4 h-4" /> Edit profile
          </Button>
          <Button variant="danger" onClick={onDelete} className="flex-1">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof PawPrint; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-ink/40 shrink-0" />
      <span className="text-[11px] text-ink/50 w-24 shrink-0">{label}</span>
      <span className="text-xs text-ink font-medium flex-1">{value || '—'}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold mb-2">{title}</div>
      {children}
    </Card>
  );
}

function OverviewTab({ pet, owner }: { pet: Pet; owner?: Owner }) {
  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl bg-canvas p-3 text-center">
          <Cake className="w-4 h-4 text-ink/40 mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">{age(pet.birthDate)}</div>
          <div className="text-[10px] text-ink/50">Age</div>
        </div>
        <div className="rounded-xl bg-canvas p-3 text-center">
          <Scale className="w-4 h-4 text-ink/40 mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">{pet.weightKg}kg</div>
          <div className="text-[10px] text-ink/50">Weight</div>
        </div>
        <div className="rounded-xl bg-canvas p-3 text-center">
          <Ruler className="w-4 h-4 text-ink/40 mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">{pet.heightCm || '—'}cm</div>
          <div className="text-[10px] text-ink/50">Height</div>
        </div>
        <div className="rounded-xl bg-canvas p-3 text-center">
          <Heart className="w-4 h-4 text-ink/40 mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">{pet.sterilized ? 'Neut.' : 'Intact'}</div>
          <div className="text-[10px] text-ink/50">Status</div>
        </div>
      </div>

      {/* QR Code placeholder & verification */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-xl bg-canvas border-2 border-dashed border-line flex flex-col items-center justify-center shrink-0">
            <QrCode className="w-8 h-8 text-ink/30" />
            <span className="text-[8px] text-ink/30 mt-1">QR PLACEHOLDER</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-ink">QR Code & Verification</div>
            <div className="text-[11px] text-ink/50 mt-0.5">
              ID: {pet.qrCodeId || 'Not assigned'}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-plum" />
              <span className="text-[11px] text-plum font-medium">
                {pet.microchipNumber ? 'Microchip verified' : 'No microchip registered'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-plum" />
              <span className="text-[11px] text-plum font-medium">
                {pet.rfidNumber ? 'RFID active' : 'No RFID tag'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Physical attributes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Physical Attributes">
          <InfoRow icon={PawPrint} label="Species" value={pet.species} />
          <InfoRow icon={PawPrint} label="Breed" value={pet.breed} />
          <InfoRow icon={PawPrint} label="Gender" value={pet.gender} />
          <InfoRow icon={PawPrint} label="Color" value={pet.color} />
          <InfoRow icon={Cake} label="Date of birth" value={pet.birthDate} />
          <InfoRow icon={Scale} label="Weight" value={`${pet.weightKg} kg`} />
          <InfoRow icon={Ruler} label="Height" value={pet.heightCm ? `${pet.heightCm} cm` : '—'} />
          <InfoRow icon={Droplet} label="Blood group" value={pet.bloodGroup || '—'} />
        </InfoCard>

        <InfoCard title="Medical Information">
          <InfoRow icon={Heart} label="Sterilized" value={pet.sterilized ? 'Yes' : 'No'} />
          <InfoRow icon={AlertTriangle} label="Allergies" value={pet.allergies || 'None known'} />
          <InfoRow icon={Stethoscope} label="Conditions" value={pet.conditions || 'None'} />
          <InfoRow icon={Utensils} label="Diet type" value={pet.dietType || '—'} />
        </InfoCard>
      </div>

      {/* Identification */}
      <InfoCard title="Identification">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-canvas p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-[10px] text-ink/50 uppercase font-medium">Microchip</span>
            </div>
            <div className="text-xs font-mono text-ink">{pet.microchipNumber || 'Not registered'}</div>
          </div>
          <div className="rounded-xl bg-canvas p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <QrCode className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] text-ink/50 uppercase font-medium">RFID</span>
            </div>
            <div className="text-xs font-mono text-ink">{pet.rfidNumber || 'Not assigned'}</div>
          </div>
          <div className="rounded-xl bg-canvas p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <QrCode className="w-3.5 h-3.5 text-plum" />
              <span className="text-[10px] text-ink/50 uppercase font-medium">QR Code ID</span>
            </div>
            <div className="text-xs font-mono text-ink">{pet.qrCodeId || 'Not assigned'}</div>
          </div>
        </div>
      </InfoCard>

      {/* Insurance */}
      <InfoCard title="Insurance Details">
        <InfoRow icon={Shield} label="Provider" value={pet.insuranceProvider || '—'} />
        <InfoRow icon={Shield} label="Policy number" value={pet.insurancePolicyNumber || '—'} />
        <InfoRow icon={Clock} label="Expiry date" value={pet.insuranceExpiry || '—'} />
      </InfoCard>

      {/* Registration */}
      <InfoCard title="Registration">
        <InfoRow icon={CalendarDays} label="Registered" value={pet.createdAt} />
        <InfoRow icon={PawPrint} label="Pet ID" value={pet.id} />
      </InfoCard>

      {/* Owner */}
      {owner && (
        <InfoCard title="Owner">
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-ink">{owner.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-ink/70"><Phone className="w-3 h-3" /> {owner.phone}</div>
            <div className="flex items-center gap-1.5 text-xs text-ink/70"><Mail className="w-3 h-3" /> {owner.email}</div>
            {owner.address && <div className="text-xs text-ink/50">{owner.address}</div>}
          </div>
        </InfoCard>
      )}

      {/* Notes */}
      {pet.notes && (
        <InfoCard title="Notes">
          <div className="text-xs text-ink/70">{pet.notes}</div>
        </InfoCard>
      )}
    </div>
  );
}

function TimelineTab({ pet, records, onUpdate }: { pet: Pet; records: MedRecord[]; onUpdate: (patch: Partial<Pet>) => void }) {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(today());

  const weightData = useMemo(() => {
    const entries = [...(pet.weightHistory || [])];
    if (entries.length === 0 && pet.weightKg > 0) {
      entries.push({ date: pet.createdAt || today(), weightKg: pet.weightKg });
    }
    return entries
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ date: e.date.slice(5), weight: e.weightKg }));
  }, [pet.weightHistory, pet.weightKg, pet.createdAt]);

  const timelineItems = useMemo(() => {
    const items: { date: string; type: string; title: string; vet: string; icon: typeof Syringe; color: string }[] = [];
    records.forEach((r) => {
      const iconMap: Record<string, typeof Syringe> = {
        Vaccination: Syringe, Surgery: Activity, Lab: FlaskConical,
        Prescription: FileText, Imaging: Stethoscope, Consultation: Stethoscope,
      };
      const colorMap: Record<string, string> = {
        Vaccination: 'plum', Surgery: 'coral', Lab: 'sky',
        Prescription: 'amber', Imaging: 'sky', Consultation: 'plum',
      };
      items.push({
        date: r.date, type: r.type, title: r.title, vet: r.vet,
        icon: iconMap[r.type] || Stethoscope, color: colorMap[r.type] || 'plum',
      });
    });
    return items.sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const addWeight = () => {
    const w = parseFloat(newWeight);
    if (!w) return;
    const entry: WeightEntry = { date: newWeightDate, weightKg: w };
    const history = [...(pet.weightHistory || []), entry];
    onUpdate({ weightHistory: history, weightKg: w });
    setShowWeightModal(false);
    setNewWeight('');
    setNewWeightDate(today());
  };

  const colorClasses: Record<string, string> = {
    plum: 'bg-lilac text-plum', coral: 'bg-coral/15 text-coral',
    amber: 'bg-amber-100 text-amber-600', sky: 'bg-sky-100 text-sky-600',
  };

  return (
    <div className="space-y-4">
      {/* Growth chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-plum" />
            <span className="text-sm font-semibold text-ink">Weight & Growth Chart</span>
          </div>
          <Button size="sm" onClick={() => setShowWeightModal(true)}>
            <Plus className="w-3.5 h-3.5" /> Log weight
          </Button>
        </div>
        {weightData.length > 1 ? (
          <AreaChartCard title="" data={weightData} dataKey="weight" xKey="date" color="#4C1D95" height={200} />
        ) : (
          <div className="text-center py-8 text-sm text-ink/50">
            <Scale className="w-6 h-6 text-ink/30 mx-auto mb-2" />
            Only one weight entry. Log more to see growth trends.
          </div>
        )}
      </Card>

      {/* Allergies & conditions summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pet.allergies && pet.allergies !== 'None known' && (
          <Card className="p-4 border-coral/20 bg-coral/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-coral" />
              <span className="text-sm font-semibold text-coral">Allergies</span>
            </div>
            <div className="text-xs text-ink/70">{pet.allergies}</div>
          </Card>
        )}
        {pet.conditions && (
          <Card className="p-4 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Medical Conditions</span>
            </div>
            <div className="text-xs text-ink/70">{pet.conditions}</div>
          </Card>
        )}
      </div>

      {/* Health timeline */}
      <Card className="p-4">
        <div className="text-sm font-semibold text-ink mb-3">Health Timeline</div>
        {timelineItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-ink/50">
            <Stethoscope className="w-6 h-6 text-ink/30 mx-auto mb-2" />
            No medical records yet.
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-line" />
            <div className="space-y-3">
              {timelineItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="relative flex items-start gap-3 pl-0">
                    <div className={`w-8 h-8 rounded-full ${colorClasses[item.color]} flex items-center justify-center shrink-0 z-10`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink truncate">{item.title}</span>
                        <span className="text-[10px] text-ink/40 shrink-0">{item.date}</span>
                      </div>
                      <div className="text-[10px] text-ink/50 mt-0.5">
                        {item.type} · {item.vet}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Weight log modal */}
      <Modal open={showWeightModal} onClose={() => setShowWeightModal(false)} title="Log weight entry">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Weight (kg)">
              <NumberInput step={0.1} min={0} value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="31.5" suffix="kg" />
            </Field>
            <Field label="Date">
              <DateInput value={newWeightDate} onChange={(e) => setNewWeightDate(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowWeightModal(false)}>Cancel</Button>
            <Button onClick={addWeight}>Save entry</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RecordsTab({ records, appointments, invoices }: { records: MedRecord[]; appointments: Appointment[]; invoices: Invoice[] }) {
  const [filter, setFilter] = useState<string>('all');
  const types = ['all', 'Consultation', 'Vaccination', 'Surgery', 'Lab', 'Prescription', 'Imaging'];

  const filtered = filter === 'all' ? records : records.filter((r) => r.type === filter);

  const typeIcon: Record<string, typeof Syringe> = {
    Vaccination: Syringe, Surgery: Activity, Lab: FlaskConical,
    Prescription: FileText, Imaging: Stethoscope, Consultation: Stethoscope,
  };

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-2.5 h-7 rounded-full text-[11px] font-medium transition-colors capitalize ${
              filter === t ? 'bg-plum text-white' : 'bg-canvas text-ink/60 hover:bg-lilac'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Medical records */}
      <Card className="p-4">
        <div className="text-sm font-semibold text-ink mb-3">Medical Records ({filtered.length})</div>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-ink/50">No records in this category.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const Icon = typeIcon[r.type] || Stethoscope;
              return (
                <div key={r.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-lilac text-plum flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-ink">{r.title}</span>
                        <span className="text-[10px] text-ink/40">{r.date}</span>
                      </div>
                      <div className="text-[10px] text-ink/50 mt-0.5">{r.type} · {r.vet}</div>
                      {r.findings && <div className="text-[11px] text-ink/60 mt-1">Findings: {r.findings}</div>}
                      {r.treatment && <div className="text-[11px] text-ink/60 mt-0.5">Treatment: {r.treatment}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Appointments */}
      <Card className="p-4">
        <div className="text-sm font-semibold text-ink mb-3">Appointment History ({appointments.length})</div>
        {appointments.length === 0 ? (
          <div className="text-center py-6 text-sm text-ink/50">No appointments yet.</div>
        ) : (
          <div className="space-y-2">
            {appointments.map((a) => (
              <div key={a.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink">{a.service}</span>
                  <Badge status={a.status} />
                </div>
                <div className="text-[10px] text-ink/50 mt-1">{a.date} at {a.time} · {a.vet}</div>
                {a.reason && <div className="text-[11px] text-ink/60 mt-0.5">{a.reason}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invoices */}
      <Card className="p-4">
        <div className="text-sm font-semibold text-ink mb-3">Invoice History ({invoices.length})</div>
        {invoices.length === 0 ? (
          <div className="text-center py-6 text-sm text-ink/50">No invoices yet.</div>
        ) : (
          <div className="space-y-2">
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                <div>
                  <div className="text-xs font-medium text-ink">{i.number}</div>
                  <div className="text-[10px] text-ink/50">{i.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-ink">${invTotal(i).toFixed(2)}</div>
                  <Badge status={i.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function GalleryTab({ pet, onUpdate }: { pet: Pet; onUpdate: (patch: Partial<Pet>) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');

  const addPhoto = () => {
    if (!url) return;
    const photo: PetPhoto = { id: newId('pho'), url, caption, date: today() };
    onUpdate({ photos: [...(pet.photos || []), photo] });
    setShowModal(false);
    setUrl('');
    setCaption('');
  };

  const removePhoto = (id: string) => {
    onUpdate({ photos: (pet.photos || []).filter((p) => p.id !== id) });
  };

  const photos = pet.photos || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">Photo Gallery ({photos.length})</div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-3.5 h-3.5" /> Add photo
        </Button>
      </div>
      {photos.length === 0 ? (
        <Card className="p-4">
          <div className="text-center py-8">
            <ImageIcon className="w-8 h-8 text-ink/30 mx-auto mb-2" />
            <div className="text-sm text-ink/50">No photos yet. Upload one from your device, or paste an image URL.</div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="group relative rounded-xl overflow-hidden border border-line">
              <img src={p.url} alt={p.caption} className="w-full h-32 object-cover" />
              {p.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-ink/60 text-white text-[10px] px-2 py-1 truncate">{p.caption}</div>
              )}
              <button
                onClick={() => removePhoto(p.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add photo">
        <div className="space-y-4">
          <ImagePicker
            label="Photo"
            hint="Upload from this device, or paste a link to an image."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aspect="aspect-[4/3]"
            maxPx={1200}
          />
          <Field label="Caption (optional)">
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="After grooming session" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={addPhoto}>Add photo</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DocumentsTab({ pet, onUpdate }: { pet: Pet; onUpdate: (patch: Partial<Pet>) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Medical Report');
  const [url, setUrl] = useState('');

  const addDoc = () => {
    if (!name) return;
    const doc: PetDocument = { id: newId('doc'), name, type, url, date: today() };
    onUpdate({ documents: [...(pet.documents || []), doc] });
    setShowModal(false);
    setName('');
    setType('Medical Report');
    setUrl('');
  };

  const removeDoc = (id: string) => {
    onUpdate({ documents: (pet.documents || []).filter((d) => d.id !== id) });
  };

  const docs = pet.documents || [];
  const docTypes = ['Medical Report', 'Lab Result', 'Vaccination Certificate', 'Insurance', 'Pedigree Certificate', 'Other'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">Uploaded Documents ({docs.length})</div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-3.5 h-3.5" /> Add document
        </Button>
      </div>
      {docs.length === 0 ? (
        <Card className="p-4">
          <div className="text-center py-8">
            <Folder className="w-8 h-8 text-ink/30 mx-auto mb-2" />
            <div className="text-sm text-ink/50">No documents uploaded yet.</div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="group flex items-center gap-3 rounded-xl border border-line p-3">
              <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-ink/40" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink truncate">{d.name}</div>
                <div className="text-[10px] text-ink/50">{d.type} · {d.date}</div>
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-plum font-medium hover:underline">View</a>
              )}
              <button
                onClick={() => removeDoc(d.id)}
                className="w-6 h-6 rounded-lg text-ink/40 hover:text-coral hover:bg-coral/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add document">
        <div className="space-y-4">
          <Field label="Document name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Blood panel results" />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {docTypes.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="URL (optional)">
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={addDoc}>Add document</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PedigreeTab({ pet, onUpdate }: { pet: Pet; onUpdate: (patch: Partial<Pet>) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(pet.pedigreeInfo || '');

  const save = () => {
    onUpdate({ pedigreeInfo: text });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-plum" />
          <span className="text-sm font-semibold text-ink">Pedigree Information</span>
        </div>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => { setText(pet.pedigreeInfo || ''); setEditing(true); }}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        )}
      </div>
      <Card className="p-4">
        {editing ? (
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter pedigree details: bloodline, parents, grandparents, registration numbers, awards, lineage notes…" className="min-h-[200px]" />
        ) : pet.pedigreeInfo ? (
          <div className="text-xs text-ink/70 whitespace-pre-wrap leading-relaxed">{pet.pedigreeInfo}</div>
        ) : (
          <div className="text-center py-8 text-sm text-ink/50">
            <GitBranch className="w-6 h-6 text-ink/30 mx-auto mb-2" />
            No pedigree information recorded.
          </div>
        )}
      </Card>
    </div>
  );
}
