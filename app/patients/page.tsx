'use client';

import { useMemo, useState } from 'react';
import { PawPrint, Plus, Phone, Mail, Cake, Scale, Edit2, Trash2, X, QrCode, Cpu, Ruler, Heart, User, Crown, Award, CreditCard } from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Badge, Button, EmptyState, Modal, Field, Input, SearchInput, NumberInput, Textarea, Select, DateInput, Checkbox } from '../components/ui';
import { PetProfileDrawer } from '../components/pet-profile';
import { OwnerCRMDrawer } from '../components/owner-crm';
import { useDB, Owner, Pet, newId, today } from '../lib/store';
import { AISuggestionButton, AISuggestionPanel } from '../components/ai-suggestion';
import { generateSymptomAnalysis, generateVaccinationRecommendation } from '../lib/ai-engine';
import type { AISuggestion } from '../lib/ai-engine';

const speciesOptions = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Reptile', 'Other'];
const bloodGroups = ['DEA 1.1+', 'DEA 1.1-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'Unknown'];
const dietTypes = ['Standard', 'Grain-free', 'Prescription', 'Raw', 'Vegetarian', 'Weight management', 'Senior'];

const defaultForm = {
  ownerName: '', phone: '', email: '',
  petName: '', species: 'Dog', breed: '', gender: 'Male', color: '',
  birthDate: '', weight: '', height: '', bloodGroup: 'Unknown',
  sterilized: false, allergies: '', conditions: '', dietType: 'Standard',
  microchipNumber: '', rfidNumber: '', qrCodeId: '',
  insuranceProvider: '', insurancePolicyNumber: '', insuranceExpiry: '',
  notes: '',
};

export default function PatientsPage() {
  const { db, create, update, remove } = useDB();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'pets' | 'owners'>('pets');
  const [detailPet, setDetailPet] = useState<Pet | null>(null);
  const [detailOwner, setDetailOwner] = useState<Owner | null>(null);
  const [editPet, setEditPet] = useState<Pet | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [form, setForm] = useState(defaultForm);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const filteredPets = useMemo(() => {
    if (!db) return [];
    const q = query.toLowerCase();
    return db.pets.filter((p) => {
      const o = db.owners.find((x) => x.id === p.ownerId);
      return (
        p.name.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q) ||
        (o?.name.toLowerCase().includes(q) ?? false) ||
        (p.microchipNumber?.toLowerCase().includes(q) ?? false) ||
        (p.qrCodeId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [db, query]);

  const filteredOwners = useMemo(() => {
    if (!db) return [];
    const q = query.toLowerCase();
    return db.owners.filter((o) => o.name.toLowerCase().includes(q) || o.phone.includes(q) || o.email.toLowerCase().includes(q));
  }, [db, query]);

  const ownerOf = (id: string) => db?.owners.find((o) => o.id === id);
  const petsOf = (oid: string) => db?.pets.filter((p) => p.ownerId === oid) ?? [];
  const recordsOf = (pid: string) => db?.medRecords.filter((r) => r.petId === pid) ?? [];
  const apptsOf = (pid: string) => db?.appointments.filter((a) => a.petId === pid) ?? [];
  const invoicesOf = (pid: string) => db?.invoices.filter((i) => i.petId === pid) ?? [];

  const age = (birth: string) => {
    if (!birth) return '—';
    const months = Math.floor((Date.now() - new Date(birth).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return '<1mo';
    if (months < 12) return `${months}mo`;
    return `${Math.floor(months / 12)}y ${months % 12}mo`;
  };

  const openNew = () => {
    setEditPet(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (p: Pet) => {
    const o = ownerOf(p.ownerId);
    setEditPet(p);
    setForm({
      ownerName: o?.name ?? '', phone: o?.phone ?? '', email: o?.email ?? '',
      petName: p.name, species: p.species, breed: p.breed, gender: p.gender,
      color: p.color ?? '', birthDate: p.birthDate, weight: String(p.weightKg),
      height: p.heightCm ? String(p.heightCm) : '', bloodGroup: p.bloodGroup ?? 'Unknown',
      sterilized: p.sterilized, allergies: p.allergies, conditions: p.conditions,
      dietType: p.dietType ?? 'Standard', microchipNumber: p.microchipNumber ?? '',
      rfidNumber: p.rfidNumber ?? '', qrCodeId: p.qrCodeId ?? '',
      insuranceProvider: p.insuranceProvider ?? '', insurancePolicyNumber: p.insurancePolicyNumber ?? '',
      insuranceExpiry: p.insuranceExpiry ?? '', notes: p.notes ?? '',
    });
    setOpen(true);
  };

  const savePatient = () => {
    if (!form.petName) return;
    const petData: Partial<Pet> = {
      name: form.petName, species: form.species, breed: form.breed,
      gender: form.gender as Pet['gender'], color: form.color,
      birthDate: form.birthDate, weightKg: parseFloat(form.weight) || 0,
      heightCm: parseFloat(form.height) || 0, bloodGroup: form.bloodGroup,
      sterilized: form.sterilized, allergies: form.allergies, conditions: form.conditions,
      dietType: form.dietType, microchipNumber: form.microchipNumber,
      rfidNumber: form.rfidNumber, qrCodeId: form.qrCodeId,
      insuranceProvider: form.insuranceProvider, insurancePolicyNumber: form.insurancePolicyNumber,
      insuranceExpiry: form.insuranceExpiry, notes: form.notes,
    };
    if (editPet) {
      update('pets', editPet.id, petData);
    } else {
      if (!form.ownerName) return;
      let owner = db?.owners.find((o) => o.name.toLowerCase() === form.ownerName.toLowerCase());
      if (!owner) {
        owner = { id: newId('own'), customerId: `CUST-${String((db?.owners.length ?? 0) + 1).padStart(4, '0')}`, name: form.ownerName, phone: form.phone, email: form.email, address: '', dateOfBirth: '', occupation: '', emergencyContacts: [], familyMembers: [], membershipPlan: 'None', membershipSince: today(), loyaltyPoints: 0, creditBalance: 0, communicationLog: [], notifications: [], feedback: [], createdAt: today() };
        create('owners', owner);
      }
      const pet: Pet = {
        id: newId('pet'), ownerId: owner.id,
        ...petData as any,
        weightHistory: [],
        photos: [], documents: [],
        createdAt: today(),
      };
      create('pets', pet);
    }
    setOpen(false);
    setEditPet(null);
  };

  const deletePet = (id: string) => remove('pets', id);

  const updatePet = (patch: Partial<Pet>) => {
    if (!detailPet) return;
    update('pets', detailPet.id, patch);
    setDetailPet((prev) => prev ? { ...prev, ...patch } : prev);
  };

  const updateOwner = (patch: Partial<Owner>) => {
    if (!detailOwner) return;
    update('owners', detailOwner.id, patch);
    setDetailOwner((prev) => prev ? { ...prev, ...patch } : prev);
  };

  const recordsOfOwner = (oid: string) => {
    const petIds = new Set(petsOf(oid).map((p) => p.id));
    return db?.medRecords.filter((r) => petIds.has(r.petId)) ?? [];
  };
  const apptsOfOwner = (oid: string) => db?.appointments.filter((a) => a.ownerId === oid) ?? [];
  const invoicesOfOwner = (oid: string) => db?.invoices.filter((i) => i.ownerId === oid) ?? [];

  if (!db) return <Shell module="patients" title="Patients"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  return (
    <Shell title="Patients" subtitle="Digital pet profiles and their owners">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by pet name, breed, owner, microchip, QR…"
          className="flex-1"
        />
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-line">
          {(['pets', 'owners'] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`px-3 h-8 rounded-md text-xs font-medium capitalize transition-colors ${
                tab === tb ? 'bg-lilac text-plum' : 'text-ink/60 hover:bg-canvas'
              }`}
            >
              {tb}
            </button>
          ))}
        </div>
        <AISuggestionButton onClick={() => { const p = db.pets[0]; if (p) setAiSuggestion(generateVaccinationRecommendation(p, db.vaccinations.filter((v) => v.petId === p.id))); }} label="AI Vax Plan" />
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" /> Add patient
        </Button>
      </div>

      {aiSuggestion && (
        <div className="mb-5">
          <AISuggestionPanel suggestion={aiSuggestion} onDismiss={() => setAiSuggestion(null)} />
        </div>
      )}

      {tab === 'pets' ? (
        filteredPets.length === 0 ? (
          <Card><EmptyState icon={PawPrint} title="No pets found" hint="Try a different search or add a new patient." /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPets.map((p) => {
              const o = ownerOf(p.ownerId);
              return (
                <Card key={p.id} className="p-4 group">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setDetailPet(p)}
                      className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center text-sm font-semibold shrink-0 hover:ring-2 hover:ring-plum/30 transition-all"
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </button>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailPet(p)}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink truncate">{p.name}</span>
                        <span className="text-[10px] text-ink/40">#{p.id.slice(-4)}</span>
                      </div>
                      <div className="text-[11px] text-ink/50">{p.species} · {p.breed || 'Mixed'} · {p.gender}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)} className="w-7 h-7 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deletePet(p.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                    <div className="rounded-lg bg-canvas py-1.5">
                      <Cake className="w-3 h-3 text-ink/40 mx-auto" />
                      <div className="text-[11px] font-medium text-ink mt-0.5">{age(p.birthDate)}</div>
                    </div>
                    <div className="rounded-lg bg-canvas py-1.5">
                      <Scale className="w-3 h-3 text-ink/40 mx-auto" />
                      <div className="text-[11px] font-medium text-ink mt-0.5">{p.weightKg}kg</div>
                    </div>
                    <div className="rounded-lg bg-canvas py-1.5">
                      <PawPrint className="w-3 h-3 text-ink/40 mx-auto" />
                      <div className="text-[11px] font-medium text-ink mt-0.5">{p.sterilized ? 'Neut.' : 'Intact'}</div>
                    </div>
                    <div className="rounded-lg bg-canvas py-1.5">
                      <Cpu className="w-3 h-3 text-ink/40 mx-auto" />
                      <div className="text-[11px] font-medium text-ink mt-0.5">{p.microchipNumber ? 'Chip' : '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {p.microchipNumber && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">Chip: {p.microchipNumber}</span>
                    )}
                    {p.qrCodeId && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-lilac text-plum font-medium">QR: {p.qrCodeId}</span>
                    )}
                    {p.rfidNumber && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">RFID: {p.rfidNumber}</span>
                    )}
                  </div>
                  {o && (
                    <div className="mt-3 pt-3 border-t border-line text-[11px] text-ink/60 space-y-1">
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {o.phone}</div>
                      <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {o.email}</div>
                    </div>
                  )}
                  {p.allergies && p.allergies !== 'None known' && (
                    <div className="mt-2 text-[11px] text-coral font-medium">Allergies: {p.allergies}</div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      ) : (
        filteredOwners.length === 0 ? (
          <Card><EmptyState icon={PawPrint} title="No owners found" /></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOwners.map((o) => {
              const oPets = petsOf(o.id);
              const oInvoices = invoicesOfOwner(o.id);
              const totalPaid = oInvoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.items.reduce((ss, it) => ss + it.qty * it.unitPrice, 0), 0);
              return (
                <Card key={o.id} className="p-4 group cursor-pointer" >
                  <div onClick={() => setDetailOwner(o)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-lilac text-plum flex items-center justify-center text-sm font-semibold shrink-0">
                          {o.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                            {o.name}
                            {o.membershipPlan === 'VIP' && <Crown className="w-3 h-3 text-amber-600" />}
                            {o.membershipPlan === 'Premium' && <Award className="w-3 h-3 text-plum" />}
                          </div>
                          <div className="text-[11px] text-ink/50 mt-0.5">{o.customerId || o.id.slice(-6)} · {oPets.length} pet{oPets.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${o.membershipPlan === 'VIP' ? 'bg-amber-100 text-amber-700' : o.membershipPlan === 'Premium' ? 'bg-lilac text-plum' : o.membershipPlan === 'Basic' ? 'bg-sky-100 text-sky-700' : 'bg-ink/10 text-ink/50'}`}>{o.membershipPlan}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div className="rounded-lg bg-canvas py-1.5">
                        <PawPrint className="w-3 h-3 text-ink/40 mx-auto" />
                        <div className="text-[11px] font-medium text-ink mt-0.5">{oPets.length}</div>
                      </div>
                      <div className="rounded-lg bg-canvas py-1.5">
                        <Award className="w-3 h-3 text-ink/40 mx-auto" />
                        <div className="text-[11px] font-medium text-ink mt-0.5">{o.loyaltyPoints}pts</div>
                      </div>
                      <div className="rounded-lg bg-canvas py-1.5">
                        <CreditCard className="w-3 h-3 text-ink/40 mx-auto" />
                        <div className="text-[11px] font-medium text-ink mt-0.5">${o.creditBalance.toFixed(0)}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-line text-[11px] text-ink/60 space-y-1">
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {o.phone}</div>
                      <div className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3" /> {o.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {oPets.map((p) => (
                      <button
                        key={p.id}
                        onClick={(e) => { e.stopPropagation(); setDetailPet(p); }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lilac text-plum text-[11px] font-medium hover:ring-2 hover:ring-plum/30 transition-all"
                      >
                        <PawPrint className="w-3 h-3" /> {p.name}
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Add / Edit modal */}
      <Modal open={open} onClose={() => { setOpen(false); setEditPet(null); }} title={editPet ? 'Edit patient' : 'Register a new patient'}>
        <div className="space-y-4">
          {!editPet && (
            <div>
              <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Owner</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name"><Input value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} placeholder="Jane Doe" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 415 555 0100" /></Field>
                <Field label="Email"><Input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@email.com" /></Field>
              </div>
            </div>
          )}
          <div className="border-t border-line pt-4">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Pet — Basic Info</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pet name"><Input value={form.petName} onChange={(e) => set('petName', e.target.value)} placeholder="Biscuit" /></Field>
              <Field label="Species">
                <Select value={form.species} onChange={(e) => set('species', e.target.value)}>
                  {speciesOptions.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Breed"><Input value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Golden Retriever" /></Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option>Male</option><option>Female</option><option>Unknown</option>
                </Select>
              </Field>
              <Field label="Color"><Input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Golden" /></Field>
              <Field label="Birth date"><DateInput value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} /></Field>
              <Field label="Weight (kg)"><NumberInput step={0.1} min={0} value={form.weight} onChange={(e) => set('weight', e.target.value)} placeholder="31.5" /></Field>
              <Field label="Height (cm)"><NumberInput step={0.1} min={0} value={form.height} onChange={(e) => set('height', e.target.value)} placeholder="58" /></Field>
              <Field label="Blood group">
                <Select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
                  {bloodGroups.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </Field>
              <Field label="Diet type">
                <Select value={form.dietType} onChange={(e) => set('dietType', e.target.value)}>
                  {dietTypes.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-3">
              <Checkbox checked={form.sterilized} onChange={(e) => set('sterilized', e.target.checked)} label="Sterilized / Neutered" />
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Medical</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Allergies"><Input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Chicken" /></Field>
              <Field label="Conditions"><Input value={form.conditions} onChange={(e) => set('conditions', e.target.value)} placeholder="Hip dysplasia" /></Field>
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Identification</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Microchip number"><Input value={form.microchipNumber} onChange={(e) => set('microchipNumber', e.target.value)} placeholder="985112003456789" /></Field>
              <Field label="RFID number"><Input value={form.rfidNumber} onChange={(e) => set('rfidNumber', e.target.value)} placeholder="RFID-001234" /></Field>
              <Field label="QR Code ID"><Input value={form.qrCodeId} onChange={(e) => set('qrCodeId', e.target.value)} placeholder="QR-PET-00001" /></Field>
            </div>
          </div>
          <div className="border-t border-line pt-4">
            <div className="text-[11px] font-semibold text-ink/50 uppercase tracking-wide mb-2">Insurance</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Provider"><Input value={form.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} placeholder="PetPlan" /></Field>
              <Field label="Policy number"><Input value={form.insurancePolicyNumber} onChange={(e) => set('insurancePolicyNumber', e.target.value)} placeholder="PP-2024-001234" /></Field>
              <Field label="Expiry date"><DateInput value={form.insuranceExpiry} onChange={(e) => set('insuranceExpiry', e.target.value)} /></Field>
            </div>
          </div>
          <Field label="Notes">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Additional notes about the pet…"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setOpen(false); setEditPet(null); }}>Cancel</Button>
            <Button onClick={savePatient}>{editPet ? 'Save changes' : 'Save patient'}</Button>
          </div>
        </div>
      </Modal>

      {/* Owner CRM drawer */}
      {detailOwner && db && (
        <OwnerCRMDrawer
          owner={detailOwner}
          pets={petsOf(detailOwner.id)}
          records={recordsOfOwner(detailOwner.id)}
          appointments={apptsOfOwner(detailOwner.id)}
          invoices={invoicesOfOwner(detailOwner.id)}
          boarding={db.boarding.filter((b) => petsOf(detailOwner.id).some((p) => p.name === b.petName))}
          grooming={db.grooming.filter((g) => petsOf(detailOwner.id).some((p) => p.name === g.petName))}
          onClose={() => setDetailOwner(null)}
          onEdit={() => { openEdit(petsOf(detailOwner.id)[0]); setDetailOwner(null); }}
          onUpdate={updateOwner}
        />
      )}

      {/* Pet profile drawer */}
      {detailPet && db && (
        <PetProfileDrawer
          pet={detailPet}
          owner={ownerOf(detailPet.ownerId)}
          records={recordsOf(detailPet.id)}
          appointments={apptsOf(detailPet.id)}
          invoices={invoicesOf(detailPet.id)}
          onClose={() => setDetailPet(null)}
          onEdit={() => { openEdit(detailPet); setDetailPet(null); }}
          onDelete={() => { deletePet(detailPet.id); setDetailPet(null); }}
          onUpdate={updatePet}
        />
      )}
    </Shell>
  );
}
