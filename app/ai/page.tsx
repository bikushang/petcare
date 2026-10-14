'use client';

import { useState, useMemo } from 'react';
import {
  Sparkles, Search, Stethoscope, Pill, FileText, Syringe, Calendar,
  Activity, FlaskConical, MessageCircle, Mail, BarChart2, TrendingUp,
  Package, Database, BookOpen, Send, ChevronRight, ArrowLeft, AlertCircle,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, SectionTitle, Button, Field, Input, SearchInput, Select, Textarea } from '../components/ui';
import { invoiceTotals, countsAsRevenue, round2 } from '../lib/helpers';
import { AISuggestionPanel, AIDisclaimer } from '../components/ai-suggestion';
import { useDB } from '../lib/store';
import type { AISuggestion, AISuggestionType } from '../lib/ai-engine';
import {
  generateSymptomAnalysis, generatePrescriptionSuggestion, generateSOAPNote,
  generateMedicalReport, generateVaccinationRecommendation, generateFollowUpRecommendation,
  generateAppointmentSummary, generateSurgerySummary, generateLabExplanation,
  generateWhatsAppDraft, generateEmailDraft, generateClientCommunication,
  generateBusinessInsight, generateRevenueForecast, generateInventoryForecast,
  generateDemandPrediction, generateSmartSearch, generateKnowledgeBaseAssistance,
} from '../lib/ai-engine';

type ToolId = AISuggestionType;

const tools: { id: ToolId; label: string; icon: typeof Sparkles; category: string; description: string }[] = [
  { id: 'symptom-analysis', label: 'Symptom Analysis', icon: Stethoscope, category: 'Clinical', description: 'Analyze reported symptoms and suggest differential diagnoses' },
  { id: 'prescription-suggestion', label: 'Prescription Suggestion', icon: Pill, category: 'Clinical', description: 'Suggest medications based on diagnosis and patient weight' },
  { id: 'soap-note', label: 'SOAP Note Generation', icon: FileText, category: 'Clinical', description: 'Generate structured SOAP note templates' },
  { id: 'medical-report', label: 'Medical Report Writing', icon: FileText, category: 'Clinical', description: 'Draft medical reports from existing records' },
  { id: 'vaccination-recommendation', label: 'Vaccination Recommendations', icon: Syringe, category: 'Clinical', description: 'Recommend vaccines based on patient history' },
  { id: 'follow-up-recommendation', label: 'Follow-up Recommendations', icon: Calendar, category: 'Clinical', description: 'Generate follow-up care plans' },
  { id: 'appointment-summary', label: 'Appointment Summary', icon: Calendar, category: 'Records', description: 'Summarize appointment details and outcomes' },
  { id: 'surgery-summary', label: 'Surgery Summary', icon: Activity, category: 'Records', description: 'Generate surgical procedure summaries' },
  { id: 'lab-explanation', label: 'Lab Report Explanation', icon: FlaskConical, category: 'Records', description: 'Explain lab results in plain language' },
  { id: 'client-communication', label: 'Client Communication', icon: Send, category: 'Communication', description: 'Draft reminders, results, and follow-up messages' },
  { id: 'whatsapp-draft', label: 'WhatsApp Reply Draft', icon: MessageCircle, category: 'Communication', description: 'Draft WhatsApp messages for clients' },
  { id: 'email-draft', label: 'Email Draft', icon: Mail, category: 'Communication', description: 'Draft professional emails to pet owners' },
  { id: 'business-insight', label: 'Business Insights', icon: BarChart2, category: 'Analytics', description: 'Analyze key business metrics and trends' },
  { id: 'revenue-forecast', label: 'Revenue Forecasting', icon: TrendingUp, category: 'Analytics', description: 'Forecast revenue for the next 3 months' },
  { id: 'inventory-forecast', label: 'Inventory Forecasting', icon: Package, category: 'Analytics', description: 'Predict stock needs and reorder alerts' },
  { id: 'demand-prediction', label: 'Demand Prediction', icon: BarChart2, category: 'Analytics', description: 'Predict service demand for the next 30 days' },
  { id: 'smart-search', label: 'Smart Search', icon: Search, category: 'Tools', description: 'Search across all records with AI assistance' },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, category: 'Tools', description: 'Look up veterinary guidelines and protocols' },
];

const categories = ['Clinical', 'Records', 'Communication', 'Analytics', 'Tools'];

export default function AIPage() {
  const { db } = useDB();
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [toolError, setToolError] = useState('');
  const [category, setCategory] = useState<string>('Clinical');

  // Form inputs
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [selectedApptId, setSelectedApptId] = useState('');
  const [selectedMedId, setSelectedMedId] = useState('');
  const [selectedLabId, setSelectedLabId] = useState('');
  const [selectedSurgeryId, setSelectedSurgeryId] = useState('');
  const [symptomText, setSymptomText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [kbQuery, setKbQuery] = useState('');
  const [commType, setCommType] = useState<'reminder' | 'results' | 'follow-up' | 'overdue'>('reminder');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContext, setEmailContext] = useState('');
  const [whatsappContext, setWhatsappContext] = useState('');

  if (!db) return <Shell module="ai" title="AI Assistant"><div className="text-sm text-ink/50">Loading...</div></Shell>;

  const pets = db.pets;
  const owners = db.owners;
  const appointments = db.appointments;
  const medRecords = db.medRecords;
  const labTests = db.labTests;
  const surgeries = db.surgeries;

  const runTool = (toolId: ToolId) => {
    // Revenue figures are needed by more than one tool, so they live outside
    // the switch. They also now use invoiceTotals(), which accounts for tax,
    // discounts, coupons and payments already recorded.
    const revenueDocs = db.invoices.filter(countsAsRevenue);
    const totalRev = round2(revenueDocs.reduce((s, i) => s + invoiceTotals(i).amountPaid, 0));
    const outstanding = round2(revenueDocs.reduce((s, i) => s + invoiceTotals(i).balance, 0));
    const completedAppts = db.appointments.filter((a) => a.status === 'Completed').length;

    // Real monthly revenue, bucketed from the invoices themselves. This used
    // to be `totalRev * (0.7 + i * 0.06)` over six hardcoded month labels —
    // a fabricated series presented as a forecast input.
    const buckets = new Map<string, number>();
    for (const inv of revenueDocs) {
      const key = (inv.date || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(key)) continue;
      buckets.set(key, round2((buckets.get(key) ?? 0) + invoiceTotals(inv).total));
    }
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, revenue]) => ({ month: MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key, revenue }));

    let result: AISuggestion | null = null;
    const pet = pets.find((p) => p.id === selectedPetId);
    const owner = owners.find((o) => o.id === selectedOwnerId) || (pet ? owners.find((o) => o.id === pet.ownerId) : undefined);
    const appt = appointments.find((a) => a.id === selectedApptId);
    const med = medRecords.find((m) => m.id === selectedMedId);
    const lab = labTests.find((l) => l.id === selectedLabId);
    const surgery = surgeries.find((s) => s.id === selectedSurgeryId);

    switch (toolId) {
      case 'symptom-analysis':
        if (pet) result = generateSymptomAnalysis(pet, symptomText || 'General malaise and decreased appetite');
        break;
      case 'prescription-suggestion':
        if (pet) result = generatePrescriptionSuggestion(pet, med);
        break;
      case 'soap-note':
        if (pet) result = generateSOAPNote(pet, appt, med);
        break;
      case 'medical-report':
        if (pet && med) result = generateMedicalReport(pet, med);
        break;
      case 'vaccination-recommendation':
        if (pet) {
          const petVacc = db.vaccinations.filter((v) => v.petId === pet.id);
          result = generateVaccinationRecommendation(pet, petVacc);
        }
        break;
      case 'follow-up-recommendation':
        if (pet) result = generateFollowUpRecommendation(pet, med, surgery);
        break;
      case 'appointment-summary':
        if (appt && pet && owner) result = generateAppointmentSummary(appt, pet, owner);
        break;
      case 'surgery-summary':
        if (surgery && pet && owner) result = generateSurgerySummary(surgery, pet, owner);
        break;
      case 'lab-explanation':
        if (lab && pet) result = generateLabExplanation(lab, pet);
        break;
      case 'client-communication':
        if (owner && pet) result = generateClientCommunication(owner, pet, commType);
        break;
      case 'whatsapp-draft':
        if (owner && pet) result = generateWhatsAppDraft(owner, pet, whatsappContext || 'Following up on your recent visit.');
        break;
      case 'email-draft':
        if (owner && pet) result = generateEmailDraft(owner, pet, emailSubject || 'Follow-up regarding your pet', emailContext || 'We wanted to check in after your recent visit.');
        break;
      case 'business-insight':
        result = generateBusinessInsight(totalRev, outstanding, db.appointments.length, completedAppts, db.staff.length, db.pets.length);
        break;
      case 'revenue-forecast':
        if (monthlyRevenue.length < 2) {
          setToolError('Not enough invoiced history yet to project a trend. At least two months of invoices are needed.');
          return;
        }
        result = generateRevenueForecast(monthlyRevenue);
        break;
      case 'inventory-forecast':
        result = generateInventoryForecast(db.medStock.map((s) => ({
          name: s.name, stock: s.stock, reorderLevel: s.reorderLevel, unit: s.unit, supplier: s.supplier,
        })));
        break;
      case 'demand-prediction':
        result = generateDemandPrediction(db.appointments, db.vaccinations, db.surgeries);
        break;
      case 'smart-search':
        result = generateSmartSearch(searchQuery || 'recent', { pets: db.pets, owners: db.owners, appointments: db.appointments, invoices: db.invoices, staff: db.staff });
        break;
      case 'knowledge-base':
        result = generateKnowledgeBaseAssistance(kbQuery || 'pain management');
        break;
    }
    if (result) {
      setToolError('');
      setSuggestion(result);
    } else {
      setToolError(
        needsPet && !pet ? 'Choose a patient first.'
        : needsOwner && !owner ? 'Choose a client first.'
        : needsAppt && !appt ? 'Choose an appointment first.'
        : 'There is not enough data for this tool yet.',
      );
    }
  };

  const needsPet = ['symptom-analysis', 'prescription-suggestion', 'soap-note', 'medical-report', 'vaccination-recommendation', 'follow-up-recommendation', 'client-communication', 'whatsapp-draft', 'email-draft'].includes(activeTool || '');
  const needsOwner = ['client-communication', 'whatsapp-draft', 'email-draft'].includes(activeTool || '');
  const needsAppt = ['appointment-summary'].includes(activeTool || '');
  const needsMed = ['medical-report', 'prescription-suggestion'].includes(activeTool || '');
  const needsLab = ['lab-explanation'].includes(activeTool || '');
  const needsSurgery = ['surgery-summary', 'follow-up-recommendation'].includes(activeTool || '');

  return (
    <Shell title="AI Assistant" subtitle="Intelligent suggestions for clinical, communication, and business tasks">
      {/* AI Disclaimer */}
      <div className="mb-5">
        <AIDisclaimer />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setActiveTool(null); setSuggestion(null); }}
            className={`px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat ? 'bg-plum text-white' : 'text-ink/60 hover:bg-canvas'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tool grid */}
      {!activeTool && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.filter((t) => t.category === category).map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setActiveTool(tool.id); setSuggestion(null); }}
              className="text-left p-4 rounded-2xl border border-line bg-white hover:border-plum/30 hover:shadow-soft transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center shrink-0 group-hover:bg-plum group-hover:text-white transition-colors">
                  <tool.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{tool.label}</div>
                  <div className="text-[11px] text-ink/50 mt-0.5 leading-relaxed">{tool.description}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink/30 group-hover:text-plum transition-colors shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tool form */}
      {activeTool && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => { setActiveTool(null); setSuggestion(null); setToolError(''); }}
              className="hv-slide-parent inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-plum transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 hv-slide-back" /> Back to tools
            </button>
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-lilac text-plum flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">{tools.find((t) => t.id === activeTool)?.label}</h3>
                <p className="text-[11px] text-ink/50">{tools.find((t) => t.id === activeTool)?.description}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Pet selector */}
              {needsPet && (
                <Field label="Select patient">
                  <Select value={selectedPetId} onChange={(e) => setSelectedPetId(e.target.value)}>
                    <option value="">— Choose a patient —</option>
                    {pets.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.species}, {p.breed || 'mixed'})</option>)}
                  </Select>
                </Field>
              )}

              {/* Owner selector */}
              {needsOwner && (
                <Field label="Select owner (optional — auto-fills from pet)">
                  <Select value={selectedOwnerId} onChange={(e) => setSelectedOwnerId(e.target.value)}>
                    <option value="">— Auto from pet —</option>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
                  </Select>
                </Field>
              )}

              {/* Appointment selector */}
              {needsAppt && (
                <Field label="Select appointment">
                  <Select value={selectedApptId} onChange={(e) => setSelectedApptId(e.target.value)}>
                    <option value="">— Choose an appointment —</option>
                    {appointments.slice(0, 20).map((a) => {
                      const p = pets.find((pt) => pt.id === a.petId);
                      return <option key={a.id} value={a.id}>{a.date} {a.time} — {p?.name || '?'} ({a.service})</option>;
                    })}
                  </Select>
                </Field>
              )}

              {/* Medical record selector */}
              {needsMed && (
                <Field label="Select medical record (optional)">
                  <Select value={selectedMedId} onChange={(e) => setSelectedMedId(e.target.value)}>
                    <option value="">— Choose a record —</option>
                    {medRecords.slice(0, 20).map((m) => {
                      const p = pets.find((pt) => pt.id === m.petId);
                      return <option key={m.id} value={m.id}>{m.date} — {p?.name || '?'} ({m.type})</option>;
                    })}
                  </Select>
                </Field>
              )}

              {/* Lab test selector */}
              {needsLab && (
                <Field label="Select lab test">
                  <Select value={selectedLabId} onChange={(e) => setSelectedLabId(e.target.value)}>
                    <option value="">— Choose a lab test —</option>
                    {labTests.slice(0, 20).map((l) => {
                      const p = pets.find((pt) => pt.id === l.petId);
                      return <option key={l.id} value={l.id}>{l.testName} — {p?.name || '?'} ({l.dateOrdered})</option>;
                    })}
                  </Select>
                </Field>
              )}

              {/* Surgery selector */}
              {needsSurgery && (
                <Field label="Select surgery (optional)">
                  <Select value={selectedSurgeryId} onChange={(e) => setSelectedSurgeryId(e.target.value)}>
                    <option value="">— Choose a surgery —</option>
                    {surgeries.slice(0, 20).map((s) => {
                      const p = pets.find((pt) => pt.id === s.petId);
                      return <option key={s.id} value={s.id}>{s.procedureName} — {p?.name || '?'} ({s.date})</option>;
                    })}
                  </Select>
                </Field>
              )}

              {/* Symptom text */}
              {activeTool === 'symptom-analysis' && (
                <Field label="Reported symptoms">
                  <Textarea
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                    placeholder="e.g., Patient has been vomiting for 2 days, lethargic, not eating..."
                  />
                </Field>
              )}

              {/* Communication type */}
              {activeTool === 'client-communication' && (
                <Field label="Communication type">
                  <Select value={commType} onChange={(e) => setCommType(e.target.value as typeof commType)}>
                    <option value="reminder">Appointment Reminder</option>
                    <option value="results">Lab Results Available</option>
                    <option value="follow-up">Follow-up Check</option>
                    <option value="overdue">Overdue Vaccination</option>
                  </Select>
                </Field>
              )}

              {/* WhatsApp context */}
              {activeTool === 'whatsapp-draft' && (
                <Field label="Message context">
                  <Textarea
                    value={whatsappContext}
                    onChange={(e) => setWhatsappContext(e.target.value)}
                    placeholder="e.g., We wanted to check in after Biscuit's surgery last week..."
                  />
                </Field>
              )}

              {/* Email fields */}
              {activeTool === 'email-draft' && (
                <>
                  <Field label="Email subject">
                    <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Follow-up regarding your pet" />
                  </Field>
                  <Field label="Email context">
                    <Textarea
                      value={emailContext}
                      onChange={(e) => setEmailContext(e.target.value)}
                      placeholder="e.g., We wanted to check in after the recent visit..."
                    />
                  </Field>
                </>
              )}

              {/* Search query */}
              {activeTool === 'smart-search' && (
                <Field label="Search query">
                  <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search pets, owners, staff, invoices..." />
                </Field>
              )}

              {/* Knowledge base query */}
              {activeTool === 'knowledge-base' && (
                <Field label="What would you like to know?">
                  <Textarea
                    value={kbQuery}
                    onChange={(e) => setKbQuery(e.target.value)}
                    placeholder="e.g., anesthesia protocol, vaccination schedule, pain management..."
                  />
                </Field>
              )}

              {/* Generate button */}
              <div className="pt-2">
                <Button onClick={() => runTool(activeTool)}>
                  <Sparkles className="w-4 h-4" />
                  Generate AI Suggestion
                </Button>
                {toolError && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
                    <span>{toolError}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Suggestion output */}
          {suggestion && (
            <div className="space-y-3">
              <AISuggestionPanel
                suggestion={suggestion}
                onDismiss={() => setSuggestion(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Recent suggestions (when no tool active) */}
      {!activeTool && suggestion && (
        <div className="mt-5">
          <AISuggestionPanel suggestion={suggestion} onDismiss={() => setSuggestion(null)} />
        </div>
      )}
    </Shell>
  );
}
