'use client';

import { useState, useEffect } from 'react';
import {
  Settings, Building2, Globe, Percent, FileText, Palette, Bell, Check,
  Mail, Database, Zap, Key, CreditCard, Building, Hash, Copy, Download,
  Sun, Moon, Type, ChevronRight, Plus, Trash2, Edit2, Save, X,
  RefreshCw, HardDrive, Cloud, Server, AlertCircle, Shield, Plug,
  Languages, DollarSign, Receipt, BellRing, Eye, EyeOff,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, SectionTitle, Button, Input, Select, Switch, ColorInput, Field, Textarea, Badge, Modal, EmptyState, Tabs } from '../components/ui';
import { useSettings, type ClinicSettings } from '../lib/settings';
import { confirmAction } from '../lib/helpers';
import { branches as branchList, clinics } from '../lib/platform';

type Tab = 'general' | 'branding' | 'themes' | 'languages' | 'currencies' | 'taxes' | 'email' | 'notifications' | 'backup' | 'cache' | 'apikeys' | 'payments' | 'clinic' | 'branches' | 'numbering' | 'documents' | 'integrations';

export default function SettingsPage() {
  const { settings, update: applySettings, reset: resetSettings } = useSettings();
  const [draft, setDraft] = useState<ClinicSettings | null>(null);
  const current = draft ?? settings;
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>('general');

  // Notification rules
  const [notifRules, setNotifRules] = useState<Record<string, boolean>>({
    'Appointment reminders (SMS)': true,
    'Appointment reminders (Email)': true,
    'Low stock alerts': true,
    'Overdue invoice alerts': true,
    'Boarding check-out reminders': true,
    'Vaccination due reminders': true,
    'Prescription expiry alerts': false,
    'Staff shift reminders': false,
    'Daily revenue summary': true,
    'New registration welcome': true,
  });

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState([
    { id: 'tpl1', name: 'Appointment Confirmation', subject: 'Your appointment at {clinic_name} is confirmed', trigger: 'Appointment booked', lastEdited: '2026-09-15' },
    { id: 'tpl2', name: 'Appointment Reminder (24h)', subject: 'Reminder: Tomorrow\'s appointment for {pet_name}', trigger: '24h before appointment', lastEdited: '2026-09-20' },
    { id: 'tpl3', name: 'Vaccination Due Notice', subject: '{pet_name} is due for vaccination', trigger: 'Vaccine due in 7 days', lastEdited: '2026-08-30' },
    { id: 'tpl4', name: 'Invoice Sent', subject: 'Invoice {invoice_number} from {clinic_name}', trigger: 'Invoice created', lastEdited: '2026-09-10' },
    { id: 'tpl5', name: 'Payment Receipt', subject: 'Payment received — Thank you', trigger: 'Payment recorded', lastEdited: '2026-09-12' },
    { id: 'tpl6', name: 'Boarding Check-in Confirmation', subject: 'Boarding confirmed for {pet_name}', trigger: 'Boarding check-in', lastEdited: '2026-07-22' },
    { id: 'tpl7', name: 'Welcome Email (New Client)', subject: 'Welcome to {clinic_name}!', trigger: 'New owner registration', lastEdited: '2026-09-01' },
    { id: 'tpl8', name: 'Birthday Greeting', subject: 'Happy Birthday {pet_name}!', trigger: 'Pet birthday', lastEdited: '2026-08-15' },
  ]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [editTpl, setEditTpl] = useState<typeof emailTemplates[0] | null>(null);
  const [tplBody, setTplBody] = useState('');

  // API keys (placeholders — masked)
  const [apiKeys, setApiKeys] = useState([
    { id: 'ak1', name: 'Stripe Secret Key', value: 'sk_live_••••••••••••4242', masked: true, status: 'Active', created: '2026-01-15' },
    { id: 'ak2', name: 'Twilio API Token', value: 'AC••••••••••••a8f3', masked: true, status: 'Active', created: '2026-01-20' },
    { id: 'ak3', name: 'SendGrid API Key', value: 'SG.••••••••••••.7c2d', masked: true, status: 'Active', created: '2026-02-01' },
    { id: 'ak4', name: 'Google Maps API', value: 'AIza••••••••••••Kp9x', masked: true, status: 'Active', created: '2026-03-10' },
  ]);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');

  // Payment config (placeholders)
  const [paymentConfigs, setPaymentConfigs] = useState([
    { id: 'pc1', provider: 'Stripe', mode: 'Live', status: 'Connected', currencies: 'USD, EUR, GBP', lastSync: '2026-10-07T08:00:00' },
    { id: 'pc2', provider: 'PayPal', mode: 'Sandbox', status: 'Not connected', currencies: 'USD', lastSync: '' },
    { id: 'pc3', provider: 'Square', mode: 'Live', status: 'Not connected', currencies: 'USD, CAD', lastSync: '' },
  ]);

  // Integrations (placeholders)
  const [integrations, setIntegrations] = useState([
    { id: 'int1', name: 'Stripe Payments', category: 'Payments', status: 'Connected', desc: 'Accept credit card payments online' },
    { id: 'int2', name: 'Twilio SMS', category: 'Communications', status: 'Connected', desc: 'Send SMS reminders and alerts' },
    { id: 'int3', name: 'SendGrid Email', category: 'Communications', status: 'Connected', desc: 'Transactional email delivery' },
    { id: 'int4', name: 'Google Maps', category: 'Maps & Location', status: 'Connected', desc: 'Clinic locator and directions' },
    { id: 'int5', name: 'QuickBooks', category: 'Accounting', status: 'Not connected', desc: 'Sync invoices and expenses' },
    { id: 'int6', name: 'Xero', category: 'Accounting', status: 'Not connected', desc: 'Accounting software integration' },
    { id: 'int7', name: 'Mailchimp', category: 'Marketing', status: 'Not connected', desc: 'Email marketing campaigns' },
    { id: 'int8', name: 'Slack', category: 'Team Communication', status: 'Not connected', desc: 'Internal team notifications' },
    { id: 'int9', name: 'Zapier', category: 'Automation', status: 'Not connected', desc: 'Connect to 5,000+ apps' },
    { id: 'int10', name: 'WhatsApp Business', category: 'Communications', status: 'Not connected', desc: 'WhatsApp messaging for clients' },
  ]);

  // Backup state
  const [backupRunning, setBackupRunning] = useState(false);
  const [cacheStats] = useState({ size: '247 MB', entries: 14523, hitRate: '94.2%', lastCleared: '2026-10-06T03:00:00' });

  const set = (k: keyof ClinicSettings, v: string | boolean) => {
    setDraft((d) => ({ ...(d ?? settings), [k]: v }));
    setSaved(false);
    // Appearance is applied live so the effect is visible while choosing.
    if (k === 'theme' || k === 'primaryColor' || k === 'fontSize') {
      applySettings({ [k]: v } as Partial<ClinicSettings>);
    }
  };

  const save = () => {
    if (draft) applySettings(draft);
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const restoreDefaults = () => {
    if (!confirmAction('Restore all settings to their defaults? Your customisations will be lost.')) return;
    resetSettings();
    setDraft(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const dirty = draft !== null;

  // Email template handlers
  const openEditTpl = (tpl: typeof emailTemplates[0]) => {
    setEditTpl(tpl);
    setTplBody(`Dear {owner_name},\n\nThis is a reminder that {pet_name} has an appointment scheduled at {clinic_name}.\n\nDate: {appointment_date}\nTime: {appointment_time}\nVet: {vet_name}\n\nPlease reply to confirm or call us at {clinic_phone} to reschedule.\n\nBest regards,\nThe {clinic_name} team`);
    setEmailModalOpen(true);
  };
  const saveTpl = () => {
    if (!editTpl) return;
    setEmailTemplates((prev) => prev.map((t) => t.id === editTpl.id ? { ...editTpl, lastEdited: new Date().toISOString().slice(0, 10) } : t));
    setEmailModalOpen(false);
    setEditTpl(null);
  };

  // API key handlers
  const toggleKeyMask = (id: string) => setApiKeys((prev) => prev.map((k) => k.id === id ? { ...k, masked: !k.masked } : k));
  const addApiKey = () => {
    if (!newKeyName) return;
    setApiKeys((prev) => [...prev, { id: `ak${Date.now()}`, name: newKeyName, value: '••••••••••••••••', masked: true, status: 'Active', created: new Date().toISOString().slice(0, 10) }]);
    setNewKeyName('');
    setKeyModalOpen(false);
  };
  const deleteApiKey = (id: string) => setApiKeys((prev) => prev.filter((k) => k.id !== id));

  // Payment toggle
  const togglePayment = (id: string) => setPaymentConfigs((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === 'Connected' ? 'Not connected' : 'Connected', lastSync: p.status === 'Connected' ? '' : new Date().toISOString() } : p));
  const toggleIntegration = (id: string) => setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: i.status === 'Connected' ? 'Not connected' : 'Connected' } : i));

  const runBackup = () => {
    setBackupRunning(true);
    setTimeout(() => setBackupRunning(false), 2000);
  };

  const tabs: { key: Tab; label: string; icon: typeof Settings }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'themes', label: 'Themes', icon: Sun },
    { key: 'languages', label: 'Languages', icon: Languages },
    { key: 'currencies', label: 'Currencies', icon: DollarSign },
    { key: 'taxes', label: 'Taxes', icon: Percent },
    { key: 'email', label: 'Email Templates', icon: Mail },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'backup', label: 'Backup Manager', icon: Database },
    { key: 'cache', label: 'Cache Manager', icon: Zap },
    { key: 'apikeys', label: 'API Keys', icon: Key },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'clinic', label: 'Clinic Profile', icon: Building },
    { key: 'branches', label: 'Branches', icon: Building2 },
    { key: 'numbering', label: 'Numbering Rules', icon: Hash },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'integrations', label: 'Integrations', icon: Plug },
  ];

  const labelCls = 'text-[11px] font-medium text-ink/60 uppercase tracking-wide';

  return (
    <Shell module="settings" title="Administration" subtitle="Complete administration center for clinic configuration">
      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ════════════════════════════════════════════
          GENERAL SETTINGS
         ════════════════════════════════════════════ */}
      {tab === 'general' && (
        <Card className="p-5">
          <SectionTitle title="General settings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Clinic name</span>
              <Input className="mt-1" value={current.clinicName} onChange={(e) => set('clinicName', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Website</span>
              <Input className="mt-1" value={current.website} onChange={(e) => set('website', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Timezone</span>
              <Select className="mt-1" value={current.timezone} onChange={(e) => set('timezone', e.target.value)}>
                {['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney'].map((tz) => <option key={tz}>{tz}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className={labelCls}>Date format</span>
              <Select className="mt-1" value={current.dateFormat} onChange={(e) => set('dateFormat', e.target.value)}>
                {['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY'].map((d) => <option key={d}>{d}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className={labelCls}>Time format</span>
              <Select className="mt-1" value={current.timeFormat} onChange={(e) => set('timeFormat', e.target.value)}>
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </Select>
            </label>
            <label className="block">
              <span className={labelCls}>SMS provider</span>
              <Select className="mt-1" value={current.smsProvider} onChange={(e) => set('smsProvider', e.target.value)}>
                {['Twilio', 'Nexmo', 'AWS SNS', 'MessageBird'].map((p) => <option key={p}>{p}</option>)}
              </Select>
            </label>
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Operational preferences</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-line cursor-pointer hover:bg-canvas transition-colors">
                <div><div className="text-sm font-medium text-ink">Enable online booking</div><div className="text-[11px] text-ink/50">Allow clients to book appointments online</div></div>
                <Switch checked={current.enableOnlineBooking} onChange={(v) => set('enableOnlineBooking', v)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-line cursor-pointer hover:bg-canvas transition-colors">
                <div><div className="text-sm font-medium text-ink">Enable self check-in kiosk</div><div className="text-[11px] text-ink/50">Allow clients to self check-in at the front desk</div></div>
                <Switch checked={current.enableSelfCheckIn} onChange={(v) => set('enableSelfCheckIn', v)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-line cursor-pointer hover:bg-canvas transition-colors">
                <div><div className="text-sm font-medium text-ink">Auto-generate invoices</div><div className="text-[11px] text-ink/50">Automatically create invoices for completed appointments</div></div>
                <Switch checked={current.autoGenerateInvoices} onChange={(v) => set('autoGenerateInvoices', v)} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Appointment configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>Appointment slot duration (minutes)</span>
                <Select className="mt-1" value={current.appointmentSlotMin} onChange={(e) => set('appointmentSlotMin', e.target.value)}>
                  {['15', '20', '30', '45', '60'].map((m) => <option key={m}>{m} min</option>)}
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Low stock alert threshold</span>
                <Input className="mt-1" value={current.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} />
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          BRANDING
         ════════════════════════════════════════════ */}
      {tab === 'branding' && (
        <Card className="p-5">
          <SectionTitle title="Branding" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className={labelCls}>Clinic logo</span>
              <div className="mt-2 rounded-xl border-2 border-dashed border-line p-8 text-center hover:border-plum/40 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-2xl bg-plum text-white flex items-center justify-center mx-auto text-2xl font-bold">N</div>
                <p className="text-xs text-ink/50 mt-3">Click to upload logo (PNG, SVG, max 2MB)</p>
                <Button size="sm" variant="outline" className="mt-3">Upload logo</Button>
              </div>
            </div>
            <div>
              <span className={labelCls}>Letterhead & watermark</span>
              <div className="mt-2 rounded-xl border border-line p-4">
                <div className="bg-white rounded-lg p-4 border border-line">
                  <div className="flex items-center gap-3 pb-3 border-b border-line">
                    <div className="w-10 h-10 rounded-xl bg-plum text-white flex items-center justify-center text-sm font-bold">N</div>
                    <div>
                      <div className="text-sm font-bold text-ink">{current.clinicName}</div>
                      <div className="text-[10px] text-ink/50">{current.address}</div>
                    </div>
                  </div>
                  <div className="pt-3 text-[10px] text-ink/40">Document letterhead preview</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Report styling</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="block">
                <span className={labelCls}>Primary color</span>
                <ColorInput className="mt-1" value={current.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
              </div>
              <label className="block">
                <span className={labelCls}>Font size</span>
                <Select className="mt-1" value={current.fontSize} onChange={(e) => set('fontSize', e.target.value)}>
                  <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Font family</span>
                <Select className="mt-1" defaultValue="Inter">
                  <option>Inter</option><option>Roboto</option><option>Open Sans</option><option>Lato</option><option>Poppins</option>
                </Select>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          THEMES
         ════════════════════════════════════════════ */}
      {tab === 'themes' && (
        <Card className="p-5">
          <SectionTitle title="Theme & appearance" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Light', value: 'light', icon: Sun, bg: 'bg-white', text: 'text-ink', border: 'border-line' },
              { name: 'Dark', value: 'dark', icon: Moon, bg: 'bg-ink', text: 'text-white', border: 'border-line' },
              { name: 'Violet (Default)', value: 'plum', icon: Building, bg: 'bg-lilac', text: 'text-plum', border: 'border-lilac' },
              { name: 'Coral', value: 'coral', icon: Building, bg: 'bg-coral/15', text: 'text-coral', border: 'border-coral/30' },
            ].map((theme) => (
              <button key={theme.value} onClick={() => set('theme', theme.value)}
                className={`rounded-2xl p-5 border-2 transition-all text-center ${current.theme === theme.value ? 'border-plum ring-2 ring-lilac' : 'border-line hover:border-plum/30'}`}>
                <div className={`w-full h-20 rounded-xl border ${theme.bg} ${theme.text} ${theme.border} flex items-center justify-center mb-3`}>
                  <theme.icon className="w-8 h-8" />
                </div>
                <div className="text-sm font-medium text-ink">{theme.name}</div>
                {current.theme === theme.value && <div className="text-[10px] text-plum mt-1">Currently active</div>}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-ink">Color palette preview</h4>
              <span className="text-[11px] text-ink/50">Changes apply live across the entire app</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { name: 'Primary', var: '--c-plum' },
                { name: 'Deep', var: '--c-grape' },
                { name: 'Accent', var: '--c-iris' },
                { name: 'Tint', var: '--c-lilac' },
                { name: 'Coral', color: '#f17f65' },
                { name: 'Info', color: '#0ea5e9' },
              ].map((c) => (
                <div key={c.name} className="rounded-xl overflow-hidden border border-line">
                  <div className="h-12" style={c.var ? { backgroundColor: `rgb(var(${c.var}))` } : { backgroundColor: c.color }} />
                  <div className="p-2"><div className="text-[10px] font-medium text-ink">{c.name}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Custom primary color</h4>
            <p className="text-[11px] text-ink/50 mb-4">Pick a custom primary color for the Light and Dark themes. The Violet and Coral themes use their own fixed palettes.</p>
            <div className="flex items-center gap-4">
              <ColorInput value={current.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
              <div className="flex items-center gap-2 text-xs text-ink/60">
                <span>Current:</span>
                <code className="font-mono text-ink">{current.primaryColor}</code>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          LANGUAGES
         ════════════════════════════════════════════ */}
      {tab === 'languages' && (
        <Card className="p-5">
          <SectionTitle title="Language settings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <span className={labelCls}>Default system language</span>
              <Select className="mt-1" value={current.language} onChange={(e) => set('language', e.target.value)}>
                {['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Chinese', 'Arabic', 'Hindi'].map((l) => <option key={l}>{l}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className={labelCls}>Fallback language</span>
              <Select className="mt-1" defaultValue="English">
                {['English', 'Spanish', 'French'].map((l) => <option key={l}>{l}</option>)}
              </Select>
            </label>
          </div>

          <h4 className="text-sm font-semibold text-ink mb-3 mt-6 pt-6 border-t border-line">Available languages</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { lang: 'English', code: 'en', native: 'English', enabled: true, completion: 100 },
              { lang: 'Spanish', code: 'es', native: 'Español', enabled: true, completion: 85 },
              { lang: 'French', code: 'fr', native: 'Français', enabled: true, completion: 70 },
              { lang: 'German', code: 'de', native: 'Deutsch', enabled: false, completion: 45 },
              { lang: 'Portuguese', code: 'pt', native: 'Português', enabled: false, completion: 30 },
              { lang: 'Japanese', code: 'ja', native: '日本語', enabled: false, completion: 20 },
            ].map((l) => (
              <div key={l.code} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${l.enabled ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/30'}`}>
                  {l.code.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{l.native}</div>
                  <div className="text-[11px] text-ink/50">{l.lang} · {l.completion}% translated</div>
                </div>
                <Switch checked={l.enabled} onChange={() => {}} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          CURRENCIES
         ════════════════════════════════════════════ */}
      {tab === 'currencies' && (
        <Card className="p-5">
          <SectionTitle title="Currency settings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <span className={labelCls}>Primary currency</span>
              <Select className="mt-1" value={current.currency} onChange={(e) => set('currency', e.target.value)}>
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'BRL'].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </label>
            <label className="block">
              <span className={labelCls}>Currency symbol</span>
              <Input className="mt-1" value={current.currencySymbol} onChange={(e) => set('currencySymbol', e.target.value)} />
            </label>
          </div>

          <h4 className="text-sm font-semibold text-ink mb-3 mt-6 pt-6 border-t border-line">Supported currencies</h4>
          <div className="space-y-2">
            {[
              { code: 'USD', name: 'US Dollar', symbol: '$', rate: '1.0000', enabled: true },
              { code: 'EUR', name: 'Euro', symbol: '€', rate: '0.9234', enabled: true },
              { code: 'GBP', name: 'British Pound', symbol: '£', rate: '0.7891', enabled: true },
              { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rate: '1.3642', enabled: false },
              { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: '1.5213', enabled: false },
              { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: '149.52', enabled: false },
            ].map((c) => (
              <div key={c.code} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                <div className="w-12 h-9 rounded-lg bg-canvas flex items-center justify-center text-sm font-bold text-ink/60">{c.symbol}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{c.code} — {c.name}</div>
                  <div className="text-[11px] text-ink/50">Exchange rate: {c.rate} (per USD)</div>
                </div>
                <Switch checked={c.enabled} onChange={() => {}} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          TAXES
         ════════════════════════════════════════════ */}
      {tab === 'taxes' && (
        <Card className="p-5">
          <SectionTitle title="Tax configuration" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <span className={labelCls}>Default tax rate (%)</span>
              <Input className="mt-1" value={current.taxRate} onChange={(e) => set('taxRate', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Tax ID / VAT number</span>
              <Input className="mt-1" value={current.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-line cursor-pointer hover:bg-canvas transition-colors mb-6">
            <div><div className="text-sm font-medium text-ink">Tax-inclusive pricing</div><div className="text-[11px] text-ink/50">Show prices with tax already included</div></div>
            <Switch checked={current.taxInclusive} onChange={(v) => set('taxInclusive', v)} />
          </div>

          <h4 className="text-sm font-semibold text-ink mb-3 mt-6 pt-6 border-t border-line">Tax brackets by service</h4>
          <div className="space-y-2">
            {[
              { service: 'Consultation', rate: '8.5%', exempt: false },
              { service: 'Surgery', rate: '8.5%', exempt: false },
              { service: 'Vaccination', rate: '0%', exempt: true },
              { service: 'Pharmacy / Medication', rate: '8.5%', exempt: false },
              { service: 'Grooming', rate: '8.5%', exempt: false },
              { service: 'Boarding', rate: '12%', exempt: false },
              { service: 'Laboratory tests', rate: '8.5%', exempt: false },
              { service: 'Product sales', rate: '8.5%', exempt: false },
            ].map((t) => (
              <div key={t.service} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                <div className="flex-1">
                  <div className="text-sm font-medium text-ink">{t.service}</div>
                </div>
                {t.exempt && <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum">Tax exempt</span>}
                <div className="w-20 text-right">
                  <Input className="text-right" defaultValue={t.rate} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          EMAIL TEMPLATES
         ════════════════════════════════════════════ */}
      {tab === 'email' && (
        <>
          <Card className="p-5">
            <SectionTitle title="Email template management" action={<span className="text-[11px] text-ink/50">{emailTemplates.length} templates</span>} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className="block">
                <span className={labelCls}>From email address</span>
                <Input className="mt-1" value={current.emailFrom} onChange={(e) => set('emailFrom', e.target.value)} />
              </label>
              <label className="block">
                <span className={labelCls}>Reply-to address</span>
                <Input className="mt-1" value={current.emailReplyTo} onChange={(e) => set('emailReplyTo', e.target.value)} />
              </label>
            </div>

            <div className="space-y-2">
              {emailTemplates.map((tpl) => (
                <div key={tpl.id} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{tpl.name}</div>
                    <div className="text-[11px] text-ink/50 truncate">{tpl.subject}</div>
                    <div className="text-[10px] text-ink/40 mt-0.5">Trigger: {tpl.trigger} · Last edited: {tpl.lastEdited}</div>
                  </div>
                  <button onClick={() => openEditTpl(tpl)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Modal open={emailModalOpen} onClose={() => { setEmailModalOpen(false); setEditTpl(null); }} title={editTpl ? `Edit: ${editTpl.name}` : 'Email template'} wide>
            {editTpl && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Template name"><Input value={editTpl.name} onChange={(e) => setEditTpl({ ...editTpl, name: e.target.value })} /></Field>
                  <Field label="Trigger"><Input value={editTpl.trigger} onChange={(e) => setEditTpl({ ...editTpl, trigger: e.target.value })} /></Field>
                </div>
                <Field label="Subject line"><Input value={editTpl.subject} onChange={(e) => setEditTpl({ ...editTpl, subject: e.target.value })} /></Field>
                <Field label="Email body">
                  <Textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} className="min-h-[200px] font-mono text-xs" />
                </Field>
                <div className="rounded-xl bg-canvas p-3">
                  <div className="text-[10px] font-medium text-ink/50 uppercase mb-2">Available variables</div>
                  <div className="flex flex-wrap gap-1.5">
                    {['{clinic_name}', '{owner_name}', '{pet_name}', '{appointment_date}', '{appointment_time}', '{vet_name}', '{clinic_phone}', '{invoice_number}', '{amount}'].map((v) => (
                      <span key={v} className="text-[10px] px-2 py-1 rounded-lg bg-white border border-line text-ink/60 font-mono">{v}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setEmailModalOpen(false); setEditTpl(null); }}>Cancel</Button>
                  <Button onClick={saveTpl}><Save className="w-4 h-4" /> Save template</Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {/* ════════════════════════════════════════════
          NOTIFICATIONS
         ════════════════════════════════════════════ */}
      {tab === 'notifications' && (
        <Card className="p-5">
          <SectionTitle title="Notification rules" />
          <div className="space-y-3">
            {Object.entries(notifRules).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-line cursor-pointer hover:bg-canvas transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${enabled ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/30'}`}>
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink">{key}</div>
                    <div className="text-[11px] text-ink/50">{enabled ? 'Active' : 'Disabled'}</div>
                  </div>
                </div>
                <Switch checked={enabled} onChange={(v) => setNotifRules((prev) => ({ ...prev, [key]: v }))} />
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Notification channels</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { channel: 'In-app', icon: Bell, enabled: true, desc: 'Alerts within the platform' },
                { channel: 'Email', icon: Mail, enabled: true, desc: 'Email notifications' },
                { channel: 'SMS', icon: BellRing, enabled: true, desc: 'Text message alerts' },
              ].map((c) => (
                <div key={c.channel} className="p-4 rounded-xl border border-line">
                  <div className="flex items-center gap-2 mb-2">
                    <c.icon className="w-4 h-4 text-plum" />
                    <span className="text-sm font-medium text-ink">{c.channel}</span>
                  </div>
                  <div className="text-[11px] text-ink/50 mb-3">{c.desc}</div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.enabled ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/40'}`}>{c.enabled ? 'Enabled' : 'Disabled'}</span>
                    <Switch checked={c.enabled} onChange={() => {}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          BACKUP MANAGER
         ════════════════════════════════════════════ */}
      {tab === 'backup' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><Cloud className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">Daily</div><div className="text-[11px] text-ink/50">Backup frequency</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><HardDrive className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">1.2 GB</div><div className="text-[11px] text-ink/50">Last backup size</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Server className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">30</div><div className="text-[11px] text-ink/50">Days retained</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center"><Check className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">6h ago</div><div className="text-[11px] text-ink/50">Last backup</div></div></div></Card>
          </div>

          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Backup manager</h3>
              <Button onClick={runBackup} disabled={backupRunning}>
                {backupRunning ? <><RefreshCw className="w-4 h-4 animate-spin" /> Backing up…</> : <><Database className="w-4 h-4" /> Run backup now</>}
              </Button>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Full database backup', date: '2026-10-07 02:00', size: '1.2 GB', type: 'Full', status: 'Completed' },
                { name: 'Incremental backup', date: '2026-10-07 06:00', size: '45 MB', type: 'Incremental', status: 'Completed' },
                { name: 'File storage backup', date: '2026-10-07 03:00', size: '3.8 GB', type: 'Files', status: 'Completed' },
                { name: 'Weekly archive', date: '2026-10-05 04:00', size: '12 GB', type: 'Archive', status: 'Completed' },
                { name: 'Full database backup', date: '2026-10-06 02:00', size: '1.1 GB', type: 'Full', status: 'Completed' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                  <Check className="w-4 h-4 text-plum shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{b.name}</div>
                    <div className="text-[11px] text-ink/50">{b.date} · {b.size} · {b.type}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum">{b.status}</span>
                  <Button size="sm" variant="outline"><Download className="w-3 h-3" /> Restore</Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Backup schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>Backup frequency</span>
                <Select className="mt-1" defaultValue="Daily">
                  <option>Every 4 hours</option><option>Daily</option><option>Weekly</option><option>Custom</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Retention period (days)</span>
                <Input className="mt-1" defaultValue="30" />
              </label>
              <label className="block">
                <span className={labelCls}>Storage location</span>
                <Select className="mt-1" defaultValue="Cloud (AWS S3)">
                  <option>Cloud (AWS S3)</option><option>Local server</option><option>Offsite (S3 + Tape)</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Encryption</span>
                <Select className="mt-1" defaultValue="AES-256">
                  <option>AES-256</option><option>AES-128</option><option>None</option>
                </Select>
              </label>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          CACHE MANAGER
         ════════════════════════════════════════════ */}
      {tab === 'cache' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Zap className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">{cacheStats.size}</div><div className="text-[11px] text-ink/50">Cache size</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><Database className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">{cacheStats.entries.toLocaleString()}</div><div className="text-[11px] text-ink/50">Cached entries</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center"><Check className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">{cacheStats.hitRate}</div><div className="text-[11px] text-ink/50">Hit rate</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><RefreshCw className="w-5 h-5" /></div><div><div className="text-lg font-bold text-ink">1d ago</div><div className="text-[11px] text-ink/50">Last cleared</div></div></div></Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Cache management</h3>
            <div className="space-y-3">
              {[
                { name: 'Application cache', desc: 'Cached page renders and component data', size: '127 MB', entries: 8421 },
                { name: 'Database query cache', desc: 'Frequently executed query results', size: '89 MB', entries: 4123 },
                { name: 'Image / file cache', desc: 'Resized and optimized images', size: '31 MB', entries: 1979 },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-3 p-4 rounded-xl border border-line">
                  <div className="w-10 h-10 rounded-xl bg-canvas flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-ink/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{c.name}</div>
                    <div className="text-[11px] text-ink/50">{c.desc} · {c.size} · {c.entries.toLocaleString()} entries</div>
                  </div>
                  <Button size="sm" variant="outline"><RefreshCw className="w-3 h-3" /> Clear</Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
              <div className="text-xs text-ink/50">Clearing cache may temporarily slow down the system while entries are rebuilt.</div>
              <Button variant="danger"><Trash2 className="w-4 h-4" /> Clear all cache</Button>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          API KEYS (PLACEHOLDERS)
         ════════════════════════════════════════════ */}
      {tab === 'apikeys' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setKeyModalOpen(true)}><Plus className="w-4 h-4" /> Add API key</Button>
          </div>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-1">API key management</h3>
            <p className="text-[11px] text-ink/50 mb-4">External service credentials are stored encrypted and masked. Keys are used for integrations and webhooks.</p>
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center gap-3 p-3 rounded-xl border border-line group">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{key.name}</div>
                    <div className="text-[11px] text-ink/50 font-mono">{key.masked ? key.value : key.value.replace(/•/g, 'x')}</div>
                    <div className="text-[10px] text-ink/40 mt-0.5">Created: {key.created} · {key.status}</div>
                  </div>
                  <button onClick={() => toggleKeyMask(key.id)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                    {key.masked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteApiKey(key.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Webhook endpoints</h3>
            <div className="space-y-2">
              {[
                { endpoint: '/api/webhooks/stripe', event: 'Payment events', status: 'Active' },
                { endpoint: '/api/webhooks/twilio', event: 'SMS delivery status', status: 'Active' },
                { endpoint: '/api/webhooks/appointments', event: 'Booking confirmations', status: 'Active' },
              ].map((w) => (
                <div key={w.endpoint} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                  <code className="text-xs font-mono text-sky-600 flex-1">{w.endpoint}</code>
                  <span className="text-[11px] text-ink/50">{w.event}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum">{w.status}</span>
                </div>
              ))}
            </div>
          </Card>

          <Modal open={keyModalOpen} onClose={() => setKeyModalOpen(false)} title="Add API key">
            <div className="space-y-3">
              <Field label="Key name"><Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g. Stripe Secret Key" /></Field>
              <Field label="API key value"><Input type="password" placeholder="••••••••••••••••" /></Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setKeyModalOpen(false)}>Cancel</Button>
                <Button onClick={addApiKey}>Add key</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════════════════════════════════════
          PAYMENTS (PLACEHOLDERS)
         ════════════════════════════════════════════ */}
      {tab === 'payments' && (
        <Card className="p-5">
          <SectionTitle title="Payment configuration" />
          <p className="text-[11px] text-ink/50 mb-4">Connect payment gateways to accept online payments from clients. These are placeholders — full integration requires connecting your merchant accounts.</p>
          <div className="space-y-3">
            {paymentConfigs.map((p) => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-line">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'Connected' ? 'bg-lilac text-plum' : 'bg-canvas text-ink/40'}`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{p.provider}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.mode === 'Live' ? 'bg-plum/10 text-plum' : 'bg-amber-100 text-amber-600'}`}>{p.mode}</span>
                  </div>
                  <div className="text-[11px] text-ink/50 mt-0.5">Currencies: {p.currencies}</div>
                  {p.lastSync && <div className="text-[10px] text-ink/40 mt-0.5">Last sync: {new Date(p.lastSync).toLocaleString()}</div>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === 'Connected' ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/40'}`}>{p.status}</span>
                <Button size="sm" variant={p.status === 'Connected' ? 'outline' : 'primary'} onClick={() => togglePayment(p.id)}>
                  {p.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Payment settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl border border-line">
                <div><div className="text-sm font-medium text-ink">Accept partial payments</div><div className="text-[11px] text-ink/50">Allow clients to pay invoices in multiple installments</div></div>
                <Switch checked onChange={() => {}} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-line">
                <div><div className="text-sm font-medium text-ink">Require deposit for surgery</div><div className="text-[11px] text-ink/50">Collect 30% deposit when booking surgical procedures</div></div>
                <Switch checked onChange={() => {}} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-line">
                <div><div className="text-sm font-medium text-ink">Auto-send receipt on payment</div><div className="text-[11px] text-ink/50">Email payment receipt immediately after transaction</div></div>
                <Switch checked onChange={() => {}} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          CLINIC PROFILE
         ════════════════════════════════════════════ */}
      {tab === 'clinic' && (
        <Card className="p-5">
          <SectionTitle title="Clinic profile settings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className={labelCls}>Legal name</span>
              <Input className="mt-1" value={current.legalName} onChange={(e) => set('legalName', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Registration number</span>
              <Input className="mt-1" value={current.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Phone</span>
              <Input className="mt-1" value={current.phone} onChange={(e) => set('phone', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Email</span>
              <Input className="mt-1" value={current.email} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label className="block md:col-span-2">
              <span className={labelCls}>Address</span>
              <Input className="mt-1" value={current.address} onChange={(e) => set('address', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Website</span>
              <Input className="mt-1" value={current.website} onChange={(e) => set('website', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Tax ID</span>
              <Input className="mt-1" value={current.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </label>
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Business hours</h4>
            <div className="space-y-2">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                  <span className="text-sm font-medium text-ink w-24">{day}</span>
                  <Input className="flex-1" defaultValue={day === 'Sunday' ? 'Closed' : '08:00 - 18:00'} />
                  <Switch checked={day !== 'Sunday'} onChange={() => {}} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          BRANCH SETTINGS
         ════════════════════════════════════════════ */}
      {tab === 'branches' && (
        <Card className="p-5">
          <SectionTitle title="Branch settings" />
          <div className="space-y-3">
            {branchList.map((b) => (
              <div key={b.id} className="p-4 rounded-xl border border-line">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-ink">{b.name}</div>
                    <div className="text-[11px] text-ink/50">{b.address}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${b.status === 'Active' ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/40'}`}>{b.status}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelCls}>Phone</span>
                    <Input className="mt-1" defaultValue={b.phone} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Email</span>
                    <Input className="mt-1" defaultValue={b.email} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          NUMBERING RULES
         ════════════════════════════════════════════ */}
      {tab === 'numbering' && (
        <Card className="p-5">
          <SectionTitle title="Document numbering rules" />
          <p className="text-[11px] text-ink/50 mb-4">Configure prefixes and numbering sequences for all generated documents. Changes apply to new documents only.</p>
          <div className="space-y-3">
            {[
              { label: 'Invoice prefix', key: 'invoicePrefix' as const, example: 'INV-2026-0001', icon: Receipt },
              { label: 'Estimate prefix', key: 'estimatePrefix' as const, example: 'EST-2026-0001', icon: FileText },
              { label: 'Receipt prefix', key: 'receiptPrefix' as const, example: 'RCP-2026-0001', icon: Receipt },
              { label: 'Prescription prefix', key: 'prescriptionPrefix' as const, example: 'RX-2026-0001', icon: FileText },
              { label: 'Lab test prefix', key: 'labTestPrefix' as const, example: 'LAB-2026-0001', icon: FileText },
              { label: 'Surgery prefix', key: 'surgeryPrefix' as const, example: 'SRG-2026-0001', icon: FileText },
              { label: 'Boarding prefix', key: 'boardingPrefix' as const, example: 'BRD-2026-0001', icon: FileText },
              { label: 'Grooming prefix', key: 'groomingPrefix' as const, example: 'GRM-2026-0001', icon: FileText },
            ].map((rule) => (
              <div key={rule.key} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                <div className="w-9 h-9 rounded-lg bg-canvas flex items-center justify-center shrink-0">
                  <rule.icon className="w-4 h-4 text-ink/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{rule.label}</div>
                  <div className="text-[11px] text-ink/50">Example: {rule.example}</div>
                </div>
                <div className="w-28">
                  <Input value={settings[rule.key]} onChange={(e) => set(rule.key, e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Numbering format</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className={labelCls}>Format pattern</span>
                <Select className="mt-1" defaultValue="PREFIX-YYYY-####">
                  <option>PREFIX-YYYY-####</option><option>PREFIX-YYYYMM-####</option><option>PREFIX-####</option><option>PREFIX-YYYY-XXXXXXXX</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Starting number</span>
                <Input className="mt-1" defaultValue="0001" />
              </label>
              <label className="block">
                <span className={labelCls}>Reset period</span>
                <Select className="mt-1" defaultValue="Yearly">
                  <option>Never</option><option>Yearly</option><option>Monthly</option><option>Daily</option>
                </Select>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          DOCUMENT PREFERENCES
         ════════════════════════════════════════════ */}
      {tab === 'documents' && (
        <Card className="p-5">
          <SectionTitle title="Document preferences" />
          <div className="space-y-3 mb-6">
            {[
              { name: 'Prescription template', desc: 'Layout and fields for printed prescriptions' },
              { name: 'Vaccination certificate', desc: 'Certificate issued after vaccination' },
              { name: 'Surgery consent form', desc: 'Pre-surgical consent and authorization' },
              { name: 'Boarding agreement', desc: 'Terms and conditions for pet boarding' },
              { name: 'Invoice template', desc: 'Invoice layout, columns, and footer' },
              { name: 'Estimate template', desc: 'Cost estimate format for client approval' },
              { name: 'Lab report template', desc: 'Laboratory test result report layout' },
              { name: 'Discharge summary', desc: 'Post-treatment discharge instructions' },
            ].map((doc) => (
              <div key={doc.name} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink">{doc.name}</div>
                  <div className="text-[11px] text-ink/50">{doc.desc}</div>
                </div>
                <Button size="sm" variant="outline"><Edit2 className="w-3 h-3" /> Edit</Button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-line">
            <h4 className="text-sm font-semibold text-ink mb-3">Document defaults</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>Default paper size</span>
                <Select className="mt-1" defaultValue="A4">
                  <option>A4</option><option>Letter</option><option>Legal</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>PDF quality</span>
                <Select className="mt-1" defaultValue="High">
                  <option>High (300 DPI)</option><option>Standard (150 DPI)</option><option>Draft (72 DPI)</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Digital signature</span>
                <Select className="mt-1" defaultValue="Required">
                  <option>Required</option><option>Optional</option><option>Disabled</option>
                </Select>
              </label>
              <label className="block">
                <span className={labelCls}>Auto-print on creation</span>
                <Select className="mt-1" defaultValue="No">
                  <option>No</option><option>Yes</option>
                </Select>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          INTEGRATIONS (PLACEHOLDERS)
         ════════════════════════════════════════════ */}
      {tab === 'integrations' && (
        <Card className="p-5">
          <SectionTitle title="External integrations" />
          <p className="text-[11px] text-ink/50 mb-4">Connect third-party services. Payment and accounting integrations are placeholders and will be fully wired in a future phase.</p>
          <div className="space-y-2">
            {integrations.map((int) => (
              <div key={int.id} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${int.status === 'Connected' ? 'bg-lilac text-plum' : 'bg-canvas text-ink/40'}`}>
                  <Plug className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink">{int.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas text-ink/50">{int.category}</span>
                  </div>
                  <div className="text-[11px] text-ink/50">{int.desc}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${int.status === 'Connected' ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/40'}`}>{int.status}</span>
                <Button size="sm" variant={int.status === 'Connected' ? 'outline' : 'primary'} onClick={() => toggleIntegration(int.id)}>
                  {int.status === 'Connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Save bar (always visible) */}
      <div className="flex flex-wrap items-center justify-end gap-3 mt-5">
        {dirty && (
          <span className="text-xs text-coral font-medium flex items-center gap-1 mr-auto">
            <AlertCircle className="w-4 h-4" /> You have unsaved changes
          </span>
        )}
        {saved && (
          <span className="text-xs text-plum font-medium flex items-center gap-1">
            <Check className="w-4 h-4" /> Saved — applied across the app
          </span>
        )}
        <Button variant="outline" onClick={restoreDefaults}>Restore defaults</Button>
        <Button onClick={save} disabled={!dirty}><Save className="w-4 h-4" /> Save changes</Button>
      </div>
    </Shell>
  );
}
