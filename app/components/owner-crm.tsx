'use client';

import { useState } from 'react';
import {
  X, Phone, Mail, MapPin, User, Users, AlertTriangle, Crown, Star,
  CreditCard, MessageSquare, Bell, Heart, CalendarDays, FileText,
  Syringe, FlaskConical, Scissors, Home, Plus, Trash2, Edit2,
  CheckCircle2, Circle, ArrowUpRight, ArrowDownRight, PawPrint,
  Receipt, Gift, Award, Cake, Briefcase,
} from 'lucide-react';
import { Card, Badge, Button, Modal, Field, inputCls, Select, DateInput, Textarea } from './ui';
import type { Owner, Pet, MedRecord, Appointment, Invoice, BoardingPet, GroomingAppt,
  FamilyMember, EmergencyContact, CommunicationLog, NotificationItem, FeedbackRecord } from '../lib/api';
import { newId, today } from '../lib/store';

const invTotal = (i: Invoice) => i.items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

const membershipBadge: Record<string, string> = {
  None: 'bg-ink/10 text-ink/50',
  Basic: 'bg-sky-100 text-sky-700',
  Premium: 'bg-mint text-sage',
  VIP: 'bg-amber-100 text-amber-700',
};

type TabId = 'profile' | 'pets' | 'portal' | 'payments' | 'communication' | 'notifications';

type DrawerProps = {
  owner: Owner;
  pets: Pet[];
  records: MedRecord[];
  appointments: Appointment[];
  invoices: Invoice[];
  boarding: BoardingPet[];
  grooming: GroomingAppt[];
  onClose: () => void;
  onEdit: () => void;
  onUpdate: (patch: Partial<Owner>) => void;
};

export function OwnerCRMDrawer({ owner, pets, records, appointments, invoices, boarding, grooming, onClose, onEdit, onUpdate }: DrawerProps) {
  const [tab, setTab] = useState<TabId>('profile');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'pets', label: `Pets (${pets.length})` },
    { id: 'portal', label: 'Customer Portal' },
    { id: 'payments', label: 'Payments' },
    { id: 'communication', label: 'Communication' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-white shadow-soft overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-line px-5 h-14 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-sage" />
            <h3 className="text-sm font-semibold text-ink">{owner.name} · Owner CRM</h3>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>

        {/* Owner identity banner */}
        <div className="px-5 py-4 border-b border-line bg-gradient-to-b from-mint/30 to-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-mint text-sage flex items-center justify-center text-xl font-semibold shrink-0">
              {owner.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold text-ink">{owner.name}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${membershipBadge[owner.membershipPlan]}`}>
                  {owner.membershipPlan === 'VIP' && <Crown className="w-3 h-3" />}
                  {owner.membershipPlan === 'Premium' && <Star className="w-3 h-3" />}
                  {owner.membershipPlan}
                </span>
              </div>
              <div className="text-xs text-ink/50 mt-0.5">
                {owner.customerId || owner.id} · {pets.length} pet{pets.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] text-sage font-medium">
                  <Award className="w-3 h-3" /> {owner.loyaltyPoints} pts
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-ink/60 font-medium">
                  <CreditCard className="w-3 h-3" /> ${owner.creditBalance.toFixed(2)} credit
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="sticky top-14 bg-white border-b border-line px-5 z-10">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 h-10 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? 'border-sage text-sage' : 'border-transparent text-ink/50 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">
          {tab === 'profile' && <ProfileTab owner={owner} onUpdate={onUpdate} />}
          {tab === 'pets' && <PetsTab pets={pets} />}
          {tab === 'portal' && <PortalTab owner={owner} pets={pets} records={records} appointments={appointments} invoices={invoices} boarding={boarding} grooming={grooming} />}
          {tab === 'payments' && <PaymentsTab owner={owner} invoices={invoices} />}
          {tab === 'communication' && <CommunicationTab owner={owner} onUpdate={onUpdate} />}
          {tab === 'notifications' && <NotificationsTab owner={owner} onUpdate={onUpdate} />}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-line px-5 h-14 flex items-center gap-2">
          <Button variant="outline" onClick={onEdit} className="flex-1">
            <Edit2 className="w-4 h-4" /> Edit owner
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-ink/40 shrink-0" />
      <span className="text-[11px] text-ink/50 w-24 shrink-0">{label}</span>
      <span className="text-xs text-ink font-medium flex-1">{value || '—'}</span>
    </div>
  );
}

function InfoCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-ink/40 uppercase tracking-wide font-semibold">{title}</div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function ProfileTab({ owner, onUpdate }: { owner: Owner; onUpdate: (patch: Partial<Owner>) => void }) {
  const [showFamModal, setShowFamModal] = useState(false);
  const [showEmModal, setShowEmModal] = useState(false);
  const [famForm, setFamForm] = useState({ name: '', relationship: '', phone: '' });
  const [emForm, setEmForm] = useState({ name: '', relationship: '', phone: '' });

  const addFamily = () => {
    if (!famForm.name) return;
    const member: FamilyMember = { id: newId('fm'), ...famForm };
    onUpdate({ familyMembers: [...(owner.familyMembers || []), member] });
    setShowFamModal(false);
    setFamForm({ name: '', relationship: '', phone: '' });
  };

  const removeFamily = (id: string) => {
    onUpdate({ familyMembers: (owner.familyMembers || []).filter((f) => f.id !== id) });
  };

  const addEmergency = () => {
    if (!emForm.name) return;
    const contact: EmergencyContact = { id: newId('ec'), ...emForm };
    onUpdate({ emergencyContacts: [...(owner.emergencyContacts || []), contact] });
    setShowEmModal(false);
    setEmForm({ name: '', relationship: '', phone: '' });
  };

  const removeEmergency = (id: string) => {
    onUpdate({ emergencyContacts: (owner.emergencyContacts || []).filter((e) => e.id !== id) });
  };

  return (
    <div className="space-y-4">
      {/* Contact details */}
      <InfoCard title="Contact Details">
        <InfoRow icon={Phone} label="Phone" value={owner.phone} />
        <InfoRow icon={Mail} label="Email" value={owner.email} />
        <InfoRow icon={MapPin} label="Address" value={owner.address} />
        <InfoRow icon={Cake} label="Date of birth" value={owner.dateOfBirth} />
        <InfoRow icon={Briefcase} label="Occupation" value={owner.occupation} />
      </InfoCard>

      {/* Membership & loyalty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard title="Membership">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${membershipBadge[owner.membershipPlan]}`}>
              {owner.membershipPlan === 'VIP' && <Crown className="w-3.5 h-3.5" />}
              {owner.membershipPlan === 'Premium' && <Star className="w-3.5 h-3.5" />}
              {owner.membershipPlan}
            </span>
          </div>
          <InfoRow icon={CalendarDays} label="Member since" value={owner.membershipSince} />
          <InfoRow icon={PawPrint} label="Customer ID" value={owner.customerId} />
        </InfoCard>

        <InfoCard title="Loyalty & Credit">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-canvas p-3 text-center">
              <Award className="w-4 h-4 text-sage mx-auto" />
              <div className="text-sm font-semibold text-ink mt-1">{owner.loyaltyPoints}</div>
              <div className="text-[10px] text-ink/50">Loyalty points</div>
            </div>
            <div className="rounded-xl bg-canvas p-3 text-center">
              <CreditCard className="w-4 h-4 text-sky-600 mx-auto" />
              <div className="text-sm font-semibold text-ink mt-1">${owner.creditBalance.toFixed(2)}</div>
              <div className="text-[10px] text-ink/50">Credit balance</div>
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Family members */}
      <InfoCard title="Family Members" action={
        <button onClick={() => setShowFamModal(true)} className="text-[11px] text-sage font-medium hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      }>
        {(owner.familyMembers || []).length === 0 ? (
          <div className="text-xs text-ink/50 py-2">No family members recorded.</div>
        ) : (
          <div className="space-y-2">
            {(owner.familyMembers || []).map((f) => (
              <div key={f.id} className="group flex items-center gap-3 rounded-lg bg-canvas p-2.5">
                <div className="w-8 h-8 rounded-lg bg-mint text-sage flex items-center justify-center text-xs font-semibold shrink-0">
                  {f.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-ink">{f.name}</div>
                  <div className="text-[10px] text-ink/50">{f.relationship}{f.phone && ` · ${f.phone}`}</div>
                </div>
                <button onClick={() => removeFamily(f.id)} className="w-6 h-6 rounded-lg text-ink/40 hover:text-coral hover:bg-coral/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Emergency contacts */}
      <InfoCard title="Emergency Contacts" action={
        <button onClick={() => setShowEmModal(true)} className="text-[11px] text-sage font-medium hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add
        </button>
      }>
        {(owner.emergencyContacts || []).length === 0 ? (
          <div className="text-xs text-ink/50 py-2">No emergency contacts recorded.</div>
        ) : (
          <div className="space-y-2">
            {(owner.emergencyContacts || []).map((e) => (
              <div key={e.id} className="group flex items-center gap-3 rounded-lg bg-coral/5 border border-coral/15 p-2.5">
                <div className="w-8 h-8 rounded-lg bg-coral/15 text-coral flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-ink">{e.name}</div>
                  <div className="text-[10px] text-ink/50">{e.relationship} · {e.phone}</div>
                </div>
                <button onClick={() => removeEmergency(e.id)} className="w-6 h-6 rounded-lg text-ink/40 hover:text-coral hover:bg-coral/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Feedback */}
      <InfoCard title="Feedback Records">
        {(owner.feedback || []).length === 0 ? (
          <div className="text-xs text-ink/50 py-2">No feedback recorded.</div>
        ) : (
          <div className="space-y-2">
            {(owner.feedback || []).map((f) => (
              <div key={f.id} className="rounded-lg border border-line p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${s <= f.rating ? 'text-amber-500 fill-amber-500' : 'text-ink/20'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-ink/40">{f.date} · {f.staff}</span>
                </div>
                <div className="text-[11px] text-ink/70">{f.comment}</div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {/* Notes */}
      {owner.notes && (
        <InfoCard title="Notes">
          <div className="text-xs text-ink/70">{owner.notes}</div>
        </InfoCard>
      )}

      {/* Family member modal */}
      <Modal open={showFamModal} onClose={() => setShowFamModal(false)} title="Add family member">
        <div className="space-y-4">
          <Field label="Full name"><input className={inputCls} value={famForm.name} onChange={(e) => setFamForm({ ...famForm, name: e.target.value })} placeholder="Theo Hayes" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relationship"><input className={inputCls} value={famForm.relationship} onChange={(e) => setFamForm({ ...famForm, relationship: e.target.value })} placeholder="Spouse" /></Field>
            <Field label="Phone"><input className={inputCls} value={famForm.phone} onChange={(e) => setFamForm({ ...famForm, phone: e.target.value })} placeholder="+1 415 555 0190" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowFamModal(false)}>Cancel</Button>
            <Button onClick={addFamily}>Add member</Button>
          </div>
        </div>
      </Modal>

      {/* Emergency contact modal */}
      <Modal open={showEmModal} onClose={() => setShowEmModal(false)} title="Add emergency contact">
        <div className="space-y-4">
          <Field label="Full name"><input className={inputCls} value={emForm.name} onChange={(e) => setEmForm({ ...emForm, name: e.target.value })} placeholder="Theo Hayes" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relationship"><input className={inputCls} value={emForm.relationship} onChange={(e) => setEmForm({ ...emForm, relationship: e.target.value })} placeholder="Spouse" /></Field>
            <Field label="Phone"><input className={inputCls} value={emForm.phone} onChange={(e) => setEmForm({ ...emForm, phone: e.target.value })} placeholder="+1 415 555 0190" /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowEmModal(false)}>Cancel</Button>
            <Button onClick={addEmergency}>Add contact</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PetsTab({ pets }: { pets: Pet[] }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-ink">Registered Pets ({pets.length})</div>
      {pets.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-mint text-sage flex items-center justify-center text-sm font-semibold shrink-0">
              {p.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{p.name}</span>
                <span className="text-[10px] text-ink/40">#{p.id.slice(-4)}</span>
              </div>
              <div className="text-[11px] text-ink/50">{p.species} · {p.breed || 'Mixed'} · {p.gender}</div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {p.microchipNumber && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-medium">Chip: {p.microchipNumber}</span>}
                {p.qrCodeId && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mint text-sage font-medium">QR: {p.qrCodeId}</span>}
                {p.sterilized && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ink/10 text-ink/60 font-medium">Neutered</span>}
              </div>
              {p.allergies && p.allergies !== 'None known' && (
                <div className="mt-1.5 text-[11px] text-coral font-medium">Allergies: {p.allergies}</div>
              )}
              {p.conditions && (
                <div className="mt-0.5 text-[11px] text-amber-600 font-medium">Conditions: {p.conditions}</div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PortalTab({ owner, pets, records, appointments, invoices, boarding, grooming }: {
  owner: Owner; pets: Pet[]; records: MedRecord[]; appointments: Appointment[]; invoices: Invoice[];
  boarding: BoardingPet[]; grooming: GroomingAppt[];
}) {
  const petNames = new Set(pets.map((p) => p.name));
  const vaccinations = records.filter((r) => r.type === 'Vaccination');
  const prescriptions = records.filter((r) => r.type === 'Prescription');
  const labs = records.filter((r) => r.type === 'Lab' || r.type === 'Imaging');
  const ownerBoarding = boarding.filter((b) => petNames.has(b.petName));
  const ownerGrooming = grooming.filter((g) => petNames.has(g.petName));

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-mint/20 border-sage/20">
        <div className="flex items-center gap-2 mb-1">
          <Home className="w-4 h-4 text-sage" />
          <span className="text-sm font-semibold text-ink">Customer Portal Preview</span>
        </div>
        <div className="text-[11px] text-ink/60">
          This is the structure of what the owner would see if they logged into the customer portal.
          Online communication and payment integrations are planned for a future phase.
        </div>
      </Card>

      {/* Appointment overview */}
      <PortalSection icon={CalendarDays} title="Appointment Overview" items={appointments.map((a) => ({
        id: a.id, left: a.service, right: `${a.date} ${a.time}`, sub: `${a.vet} · ${a.reason}`, badge: a.status,
      }))} empty="No appointments" />

      {/* Invoice overview */}
      <PortalSection icon={Receipt} title="Invoice Overview" items={invoices.map((i) => ({
        id: i.id, left: i.number, right: `$${invTotal(i).toFixed(2)}`, sub: i.date, badge: i.status,
      }))} empty="No invoices" />

      {/* Medical history */}
      <PortalSection icon={FileText} title="Medical History" items={records.map((r) => ({
        id: r.id, left: r.title, right: r.date, sub: `${r.type} · ${r.vet}`,
      }))} empty="No medical records" />

      {/* Vaccination history */}
      <PortalSection icon={Syringe} title="Vaccination History" items={vaccinations.map((r) => ({
        id: r.id, left: r.title, right: r.date, sub: r.treatment,
      }))} empty="No vaccination records" />

      {/* Prescription history */}
      <PortalSection icon={FileText} title="Prescription History" items={prescriptions.map((r) => ({
        id: r.id, left: r.title, right: r.date, sub: r.treatment,
      }))} empty="No prescriptions" />

      {/* Lab & imaging */}
      <PortalSection icon={FlaskConical} title="Lab & Imaging Reports" items={labs.map((r) => ({
        id: r.id, left: r.title, right: r.date, sub: `${r.type} · ${r.findings}`,
      }))} empty="No lab or imaging records" />

      {/* Grooming records */}
      <PortalSection icon={Scissors} title="Grooming Records" items={ownerGrooming.map((g) => ({
        id: g.id, left: (g.services || []).map((s) => s.name).join(', ') || g.packageName || 'Grooming', right: `${g.date} ${g.time}`, sub: `${g.groomer}`, badge: g.status,
      }))} empty="No grooming records" />

      {/* Boarding status */}
      <PortalSection icon={Home} title="Boarding Status" items={ownerBoarding.map((b) => ({
        id: b.id, left: b.petName, right: `${b.checkIn} → ${b.checkOut}`, sub: `Room ${b.room}`, badge: b.status,
      }))} empty="No boarding records" />

      {/* Feedback */}
      <PortalSection icon={Heart} title="Feedback Records" items={(owner.feedback || []).map((f) => ({
        id: f.id, left: `${'★'.repeat(f.rating)}${'☆'.repeat(5 - f.rating)}`, right: f.date, sub: f.comment,
      }))} empty="No feedback submitted" />
    </div>
  );
}

function PortalSection({ icon: Icon, title, items, empty }: {
  icon: typeof CalendarDays; title: string;
  items: { id: string; left: string; right: string; sub?: string; badge?: string }[];
  empty: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-sage" />
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-[10px] text-ink/40 ml-auto">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-ink/50 py-2">{empty}.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-2 rounded-lg bg-canvas p-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink truncate">{it.left}</div>
                {it.sub && <div className="text-[10px] text-ink/50 mt-0.5 truncate">{it.sub}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-ink/50">{it.right}</div>
                {it.badge && <div className="mt-1"><Badge status={it.badge} /></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PaymentsTab({ owner, invoices }: { owner: Owner; invoices: Invoice[] }) {
  const totalPaid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + invTotal(i), 0);
  const totalPending = invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue').reduce((s, i) => s + invTotal(i), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-mint p-3 text-center">
          <CheckCircle2 className="w-4 h-4 text-sage mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">${totalPaid.toFixed(2)}</div>
          <div className="text-[10px] text-ink/50">Total paid</div>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center">
          <AlertTriangle className="w-4 h-4 text-amber-600 mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">${totalPending.toFixed(2)}</div>
          <div className="text-[10px] text-ink/50">Outstanding</div>
        </div>
        <div className="rounded-xl bg-sky-50 p-3 text-center">
          <CreditCard className="w-4 h-4 text-sky-600 mx-auto" />
          <div className="text-sm font-semibold text-ink mt-1">${owner.creditBalance.toFixed(2)}</div>
          <div className="text-[10px] text-ink/50">Credit balance</div>
        </div>
      </div>

      {/* Payment history */}
      <Card className="p-4">
        <div className="text-sm font-semibold text-ink mb-3">Payment History ({invoices.length})</div>
        {invoices.length === 0 ? (
          <div className="text-xs text-ink/50 py-4 text-center">No payment history.</div>
        ) : (
          <div className="space-y-2">
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl border border-line p-3">
                <div>
                  <div className="text-xs font-medium text-ink">{i.number}</div>
                  <div className="text-[10px] text-ink/50">{i.date}{i.method && ` · ${i.method}`}</div>
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

      {/* Loyalty */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-sage" />
          <span className="text-sm font-semibold text-ink">Loyalty Program</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-canvas p-3 text-center">
            <Award className="w-5 h-5 text-sage mx-auto" />
            <div className="text-lg font-semibold text-ink mt-1">{owner.loyaltyPoints}</div>
            <div className="text-[10px] text-ink/50">Points earned</div>
          </div>
          <div className="rounded-xl bg-canvas p-3 text-center">
            <Crown className="w-5 h-5 text-amber-600 mx-auto" />
            <div className="text-lg font-semibold text-ink mt-1">{owner.membershipPlan}</div>
            <div className="text-[10px] text-ink/50">Current tier</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CommunicationTab({ owner, onUpdate }: { owner: Owner; onUpdate: (patch: Partial<Owner>) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ channel: 'Phone' as CommunicationLog['channel'], direction: 'Outgoing' as CommunicationLog['direction'], subject: '', notes: '' });

  const addLog = () => {
    if (!form.subject) return;
    const entry: CommunicationLog = { id: newId('cl'), date: today(), ...form };
    onUpdate({ communicationLog: [...(owner.communicationLog || []), entry] });
    setShowModal(false);
    setForm({ channel: 'Phone', direction: 'Outgoing', subject: '', notes: '' });
  };

  const removeLog = (id: string) => {
    onUpdate({ communicationLog: (owner.communicationLog || []).filter((c) => c.id !== id) });
  };

  const channelIcon: Record<string, typeof Phone> = {
    Phone, Email: Mail, SMS: MessageSquare, 'In-person': User, Portal: Home,
  };

  const logs = [...(owner.communicationLog || [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">Communication History ({logs.length})</div>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-3.5 h-3.5" /> Log contact
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card className="p-4">
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-ink/30 mx-auto mb-2" />
            <div className="text-sm text-ink/50">No communication logged yet.</div>
          </div>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-line" />
          <div className="space-y-3">
            {logs.map((log) => {
              const Icon = channelIcon[log.channel] || MessageSquare;
              return (
                <div key={log.id} className="group relative flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-mint text-sage flex items-center justify-center shrink-0 z-10">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ink truncate">{log.subject}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${log.direction === 'Outgoing' ? 'text-sky-600' : 'text-sage'}`}>
                          {log.direction === 'Outgoing' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {log.direction}
                        </span>
                        <span className="text-[10px] text-ink/40">{log.date}</span>
                        <button onClick={() => removeLog(log.id)} className="w-5 h-5 rounded text-ink/40 hover:text-coral opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-ink/50 mt-0.5">{log.channel}</div>
                    {log.notes && <div className="text-[11px] text-ink/60 mt-1">{log.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Log communication">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel">
              <Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as CommunicationLog['channel'] })}>
                <option>Phone</option><option>Email</option><option>SMS</option><option>In-person</option><option>Portal</option>
              </Select>
            </Field>
            <Field label="Direction">
              <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as CommunicationLog['direction'] })}>
                <option>Outgoing</option><option>Incoming</option>
              </Select>
            </Field>
          </div>
          <Field label="Subject"><input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Appointment reminder" /></Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Discussion details…" className="min-h-[80px]" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={addLog}>Save log</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function NotificationsTab({ owner, onUpdate }: { owner: Owner; onUpdate: (patch: Partial<Owner>) => void }) {
  const notifications = [...(owner.notifications || [])].sort((a, b) => b.date.localeCompare(a.date));

  const markRead = (id: string) => {
    onUpdate({ notifications: (owner.notifications || []).map((n) => n.id === id ? { ...n, read: true } : n) });
  };

  const markAllRead = () => {
    onUpdate({ notifications: (owner.notifications || []).map((n) => ({ ...n, read: true })) });
  };

  const typeIcon: Record<string, typeof Bell> = {
    Appointment: CalendarDays, Invoice: Receipt, Vaccine: Syringe, System: Bell, Promotion: Gift,
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">Notification History ({notifications.length})</div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-[11px] text-sage font-medium hover:underline">
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-4">
          <div className="text-center py-8">
            <Bell className="w-8 h-8 text-ink/30 mx-auto mb-2" />
            <div className="text-sm text-ink/50">No notifications.</div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcon[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${n.read ? 'border-line bg-white' : 'border-sage/20 bg-mint/20'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.read ? 'bg-canvas text-ink/40' : 'bg-mint text-sage'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs ${n.read ? 'text-ink/70' : 'text-ink font-medium'}`}>{n.title}</span>
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-[10px] text-sage font-medium hover:underline shrink-0">Mark read</button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-ink/40">{n.date}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-ink/10 text-ink/50 font-medium">{n.type}</span>
                  </div>
                </div>
                {!n.read && <Circle className="w-2 h-2 text-sage fill-sage shrink-0 mt-2" />}
                {n.read && <CheckCircle2 className="w-3.5 h-3.5 text-ink/20 shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
