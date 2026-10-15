'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Code2, Key, Webhook, BookOpen, Package, Upload, Download, FileJson,
  FileSpreadsheet, FileText, Plus, Trash2, Copy, Eye, EyeOff, RefreshCw,
  Check, Terminal, Layers, GitBranch, Zap, FileCode, Archive, AlertCircle,
  Clock, Shield,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, SectionTitle, Button, Input, Select, Field, Badge, Modal, EmptyState, Tabs } from '../components/ui';
import { fetchConfig, saveConfig } from '../lib/api';

type DeveloperConfig = {
  tokens: ApiToken[];
  webhooks: Webhook[];
  importJobs: ImportJob[];
};

const DEV_KEY = 'developer-config';

const defaultDevConfig: DeveloperConfig = {
  tokens: [
    { id: 'tok1', name: 'Production API', token: 'pcp_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', masked: true, scopes: ['read', 'write'], status: 'Active', created: '2026-08-01', lastUsed: '2026-10-07T14:20:00', requests: 18432 },
    { id: 'tok2', name: 'Analytics Read-Only', token: 'pcp_live_q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2', masked: true, scopes: ['read'], status: 'Active', created: '2026-09-15', lastUsed: '2026-10-07T12:00:00', requests: 4521 },
    { id: 'tok3', name: 'Webhook Service', token: 'pcp_live_g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8', masked: true, scopes: ['read', 'write', 'webhooks'], status: 'Active', created: '2026-07-20', lastUsed: '2026-10-07T14:25:00', requests: 9876 },
    { id: 'tok4', name: 'Legacy Integration', token: 'pcp_live_w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4', masked: true, scopes: ['read', 'write'], status: 'Revoked', created: '2026-03-10', lastUsed: '2026-09-28T10:00:00', requests: 2341 },
  ],
  webhooks: [
    { id: 'wh1', url: 'https://hooks.example.com/petcare/appointments', events: ['appointment.created', 'appointment.updated', 'appointment.cancelled'], status: 'Active', secret: 'whsec_••••••••', createdAt: '2026-08-15', lastDelivery: '2026-10-07T14:20:00', deliveries: 3421, failures: 2 },
    { id: 'wh2', url: 'https://api.billing-svc.net/petcare/invoices', events: ['invoice.created', 'invoice.paid', 'invoice.overdue'], status: 'Active', secret: 'whsec_••••••••', createdAt: '2026-07-01', lastDelivery: '2026-10-07T11:30:00', deliveries: 1876, failures: 0 },
    { id: 'wh3', url: 'https://notify.slack.com/services/petcare-alerts', events: ['staff.hired', 'inventory.low_stock', 'security.alert'], status: 'Active', secret: 'whsec_••••••••', createdAt: '2026-09-01', lastDelivery: '2026-10-06T16:00:00', deliveries: 234, failures: 1 },
    { id: 'wh4', url: 'https://staging.crm-sync.io/petcare/patients', events: ['patient.created', 'patient.updated'], status: 'Pending', secret: 'whsec_••••••••', createdAt: '2026-10-05', lastDelivery: '', deliveries: 0, failures: 0 },
  ],
  importJobs: [
    { id: 'imp1', filename: 'patients_october.csv', format: 'CSV', module: 'Patients', records: 245, status: 'Completed', date: '2026-10-05T10:30:00', errors: 0 },
    { id: 'imp2', filename: 'inventory_stock.xlsx', format: 'Excel', module: 'Inventory', records: 1890, status: 'Completed', date: '2026-10-03T14:00:00', errors: 3 },
    { id: 'imp3', filename: 'owners_export.json', format: 'JSON', module: 'Owners (CRM)', records: 412, status: 'Completed', date: '2026-09-28T09:15:00', errors: 0 },
    { id: 'imp4', filename: 'staff_contacts.csv', format: 'CSV', module: 'Staff', records: 38, status: 'Failed', date: '2026-10-06T16:20:00', errors: 12 },
  ],
};

type Tab = 'overview' | 'tokens' | 'webhooks' | 'docs' | 'sdk' | 'import' | 'export';

type ApiToken = {
  id: string;
  name: string;
  token: string;
  masked: boolean;
  scopes: string[];
  status: 'Active' | 'Revoked';
  created: string;
  lastUsed: string;
  requests: number;
};

type Webhook = {
  id: string;
  url: string;
  events: string[];
  status: 'Active' | 'Paused' | 'Pending';
  secret: string;
  createdAt: string;
  lastDelivery: string;
  deliveries: number;
  failures: number;
};

type ImportJob = {
  id: string;
  filename: string;
  format: 'CSV' | 'Excel' | 'JSON';
  module: string;
  records: number;
  status: 'Completed' | 'Processing' | 'Failed' | 'Pending';
  date: string;
  errors: number;
};

export default function DeveloperPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['read']);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['appointment.created']);
  const [importFormat, setImportFormat] = useState<'CSV' | 'Excel' | 'JSON'>('CSV');
  const [importModule, setImportModule] = useState('patients');
  const [importFileName, setImportFileName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [devConfig, setDevConfig] = useState<DeveloperConfig>(defaultDevConfig);

  useEffect(() => {
    let mounted = true;
    fetchConfig<DeveloperConfig>(DEV_KEY)
      .then((data) => { if (mounted && data) setDevConfig({ ...defaultDevConfig, ...data }); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const persistDev = useCallback((next: DeveloperConfig) => {
    setDevConfig(next);
    saveConfig(DEV_KEY, next).catch(() => {});
  }, []);

  const tokens = devConfig.tokens;
  const webhooks = devConfig.webhooks;
  const importJobs = devConfig.importJobs;

  const apiEndpoints = [
    { method: 'GET', path: '/api/v1/patients', desc: 'List all pets with pagination', auth: 'read' },
    { method: 'POST', path: '/api/v1/patients', desc: 'Register a new pet', auth: 'write' },
    { method: 'GET', path: '/api/v1/patients/{id}', desc: 'Get a single pet record', auth: 'read' },
    { method: 'PUT', path: '/api/v1/patients/{id}', desc: 'Update pet information', auth: 'write' },
    { method: 'DELETE', path: '/api/v1/patients/{id}', desc: 'Remove a pet record', auth: 'write' },
    { method: 'GET', path: '/api/v1/appointments', desc: 'List appointments with filters', auth: 'read' },
    { method: 'POST', path: '/api/v1/appointments', desc: 'Book a new appointment', auth: 'write' },
    { method: 'PATCH', path: '/api/v1/appointments/{id}/status', desc: 'Update appointment status', auth: 'write' },
    { method: 'GET', path: '/api/v1/medical-records', desc: 'List medical records', auth: 'read' },
    { method: 'POST', path: '/api/v1/medical-records', desc: 'Create a medical record', auth: 'write' },
    { method: 'GET', path: '/api/v1/invoices', desc: 'List invoices', auth: 'read' },
    { method: 'POST', path: '/api/v1/invoices', desc: 'Create an invoice', auth: 'write' },
    { method: 'GET', path: '/api/v1/inventory/items', desc: 'List inventory items', auth: 'read' },
    { method: 'POST', path: '/api/v1/inventory/adjustments', desc: 'Record stock adjustment', auth: 'write' },
    { method: 'GET', path: '/api/v1/prescriptions', desc: 'List prescriptions', auth: 'read' },
    { method: 'POST', path: '/api/v1/prescriptions', desc: 'Create a prescription', auth: 'write' },
    { method: 'GET', path: '/api/v1/vaccinations', desc: 'List vaccination records', auth: 'read' },
    { method: 'GET', path: '/api/v1/staff', desc: 'List staff members', auth: 'read' },
    { method: 'GET', path: '/api/v1/analytics/revenue', desc: 'Revenue analytics report', auth: 'read' },
    { method: 'GET', path: '/api/v1/webhooks', desc: 'List configured webhooks', auth: 'webhooks' },
  ];

  const eventCatalog = [
    { event: 'patient.created', desc: 'Fired when a new pet is registered', module: 'Patients' },
    { event: 'patient.updated', desc: 'Fired when pet details change', module: 'Patients' },
    { event: 'appointment.created', desc: 'Fired when an appointment is booked', module: 'Appointments' },
    { event: 'appointment.updated', desc: 'Fired when appointment details change', module: 'Appointments' },
    { event: 'appointment.cancelled', desc: 'Fired when an appointment is cancelled', module: 'Appointments' },
    { event: 'appointment.completed', desc: 'Fired when an appointment is marked complete', module: 'Appointments' },
    { event: 'invoice.created', desc: 'Fired when a new invoice is generated', module: 'Billing' },
    { event: 'invoice.paid', desc: 'Fired when an invoice is fully paid', module: 'Billing' },
    { event: 'invoice.overdue', desc: 'Fired when an invoice becomes overdue', module: 'Billing' },
    { event: 'prescription.created', desc: 'Fired when a prescription is issued', module: 'Prescriptions' },
    { event: 'medical-record.created', desc: 'Fired when a medical record is added', module: 'Medical' },
    { event: 'inventory.low_stock', desc: 'Fired when an item drops below threshold', module: 'Inventory' },
    { event: 'staff.hired', desc: 'Fired when a new staff member is added', module: 'Staff' },
    { event: 'vaccination.due', desc: 'Fired when a vaccination is due in 7 days', module: 'Vaccinations' },
    { event: 'security.alert', desc: 'Fired on security events (failed logins, IP blocks)', module: 'Security' },
  ];

  const sdkRoadmap = [
    { name: 'JavaScript / TypeScript SDK', status: 'In development', desc: 'Official Node.js and browser client with typed responses', progress: 70 },
    { name: 'Python SDK', status: 'Planned', desc: 'Python package for server-side integrations and data scripts', progress: 20 },
    { name: 'PHP SDK', status: 'Planned', desc: 'PHP client for legacy clinic management system integrations', progress: 10 },
    { name: 'REST API Postman Collection', status: 'Available', desc: 'Pre-configured Postman collection with all endpoints and auth', progress: 100 },
    { name: 'OpenAPI 3.1 Specification', status: 'Available', desc: 'Machine-readable spec for auto-generating clients in any language', progress: 100 },
  ];

  const tabs: { key: Tab; label: string; icon: typeof Code2 }[] = [
    { key: 'overview', label: 'Overview', icon: Code2 },
    { key: 'tokens', label: 'API Tokens', icon: Key },
    { key: 'webhooks', label: 'Webhooks', icon: Webhook },
    { key: 'docs', label: 'API Documentation', icon: BookOpen },
    { key: 'sdk', label: 'SDK Planning', icon: Package },
    { key: 'import', label: 'Import Tools', icon: Upload },
    { key: 'export', label: 'Export Tools', icon: Download },
  ];

  const methodColor: Record<string, string> = {
    GET: 'bg-sky-100 text-sky-700',
    POST: 'bg-lilac text-plum',
    PUT: 'bg-amber-100 text-amber-700',
    PATCH: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-coral/15 text-coral',
  };

  const scopeOptions = ['read', 'write', 'webhooks', 'admin'];
  const eventOptions = eventCatalog.map((e) => e.event);

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleTokenMask = (id: string) => persistDev({ ...devConfig, tokens: tokens.map((t) => t.id === id ? { ...t, masked: !t.masked } : t) });
  const revokeToken = (id: string) => persistDev({ ...devConfig, tokens: tokens.map((t) => t.id === id ? { ...t, status: 'Revoked' } : t) });
  const addToken = () => {
    if (!newTokenName) return;
    const generated = `pcp_live_${Math.random().toString(36).slice(2, 18)}${Math.random().toString(36).slice(2, 18)}`;
    persistDev({ ...devConfig, tokens: [...tokens, {
      id: `tok${Date.now()}`, name: newTokenName, token: generated, masked: false,
      scopes: newTokenScopes, status: 'Active', created: new Date().toISOString().slice(0, 10),
      lastUsed: '', requests: 0,
    }] });
    setNewTokenName('');
    setNewTokenScopes(['read']);
    setTokenModalOpen(false);
  };
  const deleteToken = (id: string) => persistDev({ ...devConfig, tokens: tokens.filter((t) => t.id !== id) });

  const toggleScope = (scope: string) => {
    setNewTokenScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  };

  const addWebhook = () => {
    if (!newWebhookUrl) return;
    persistDev({ ...devConfig, webhooks: [...webhooks, {
      id: `wh${Date.now()}`, url: newWebhookUrl, events: newWebhookEvents, status: 'Pending',
      secret: `whsec_${Math.random().toString(36).slice(2, 16)}`, createdAt: new Date().toISOString().slice(0, 10),
      lastDelivery: '', deliveries: 0, failures: 0,
    }] });
    setNewWebhookUrl('');
    setNewWebhookEvents(['appointment.created']);
    setWebhookModalOpen(false);
  };
  const deleteWebhook = (id: string) => persistDev({ ...devConfig, webhooks: webhooks.filter((w) => w.id !== id) });
  const toggleWebhookStatus = (id: string) => persistDev({ ...devConfig, webhooks: webhooks.map((w) => w.id === id ? { ...w, status: w.status === 'Active' ? 'Paused' : 'Active' } : w) });
  const toggleWebhookEvent = (event: string) => {
    setNewWebhookEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  const startImport = () => {
    if (!importFileName) return;
    const newJob: ImportJob = {
      id: `imp${Date.now()}`, filename: importFileName, format: importFormat,
      module: importModule, records: 0, status: 'Processing',
      date: new Date().toISOString(), errors: 0,
    };
    persistDev({ ...devConfig, importJobs: [newJob, ...importJobs] });
    setImportFileName('');
    setImportModalOpen(false);
    setTimeout(() => {
      setDevConfig((prev) => {
        const updated = { ...prev, importJobs: prev.importJobs.map((j) => j.status === 'Processing' ? {
          ...j, status: 'Completed' as const, records: Math.floor(Math.random() * 500) + 50, errors: Math.floor(Math.random() * 3),
        } : j) };
        saveConfig(DEV_KEY, updated).catch(() => {});
        return updated;
      });
    }, 2500);
  };

  return (
    <Shell module="developer" title="API & Developer Tools" subtitle="REST API management, webhooks, documentation, SDK planning, and data import/export">
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ════════════ OVERVIEW ════════════ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><Key className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{tokens.filter((t) => t.status === 'Active').length}</div><div className="text-[11px] text-ink/50">Active API tokens</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Webhook className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{webhooks.filter((w) => w.status === 'Active').length}</div><div className="text-[11px] text-ink/50">Active webhooks</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Terminal className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{apiEndpoints.length}</div><div className="text-[11px] text-ink/50">API endpoints</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><Zap className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{tokens.reduce((s, t) => s + t.requests, 0).toLocaleString()}</div><div className="text-[11px] text-ink/50">Total API requests</div></div></div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <SectionTitle title="REST API planning" />
              <p className="text-[11px] text-ink/50 mb-4">The platform exposes a versioned REST API (v1) for all core modules. All endpoints require Bearer token authentication and support pagination, filtering, and sorting.</p>
              <div className="space-y-2">
                {[
                  { label: 'Base URL', value: 'https://api.petcare.pro/v1', icon: Terminal },
                  { label: 'Auth scheme', value: 'Bearer token (API tokens)', icon: Shield },
                  { label: 'Response format', value: 'JSON (UTF-8)', icon: FileJson },
                  { label: 'Rate limit', value: '1000 req / 15 min per token', icon: Zap },
                  { label: 'Pagination', value: 'Cursor-based, max 100 per page', icon: Layers },
                  { label: 'Versioning', value: 'URL path (/v1, /v2)', icon: GitBranch },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                    <item.icon className="w-4 h-4 text-ink/40 shrink-0" />
                    <span className="text-[11px] font-medium text-ink/60 w-32 shrink-0">{item.label}</span>
                    <code className="text-xs text-ink font-mono flex-1 truncate">{item.value}</code>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Developer resources" />
              <div className="space-y-2">
                {[
                  { name: 'API Quickstart Guide', desc: 'Authentication, first request, and pagination', icon: BookOpen, status: 'Available' },
                  { name: 'OpenAPI 3.1 Specification', desc: 'Machine-readable spec for code generation', icon: FileCode, status: 'Available' },
                  { name: 'Postman Collection', desc: 'Pre-configured requests with auth variables', icon: Package, status: 'Available' },
                  { name: 'Webhook Delivery Guide', desc: 'Event payloads, retries, and signature verification', icon: Webhook, status: 'Available' },
                  { name: 'Error Code Reference', desc: 'Complete list of error codes and meanings', icon: AlertCircle, status: 'Available' },
                  { name: 'Changelog', desc: 'API version history and breaking changes', icon: GitBranch, status: 'Available' },
                ].map((res) => (
                  <div key={res.name} className="flex items-center gap-3 p-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <res.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{res.name}</div>
                      <div className="text-[11px] text-ink/50">{res.desc}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum">{res.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 mt-4">
            <SectionTitle title="Recent API activity" />
            <div className="space-y-2">
              {tokens.filter((t) => t.lastUsed).slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                  <div className="w-7 h-7 rounded-lg bg-plum/10 text-plum flex items-center justify-center shrink-0"><Code2 className="w-3.5 h-3.5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-ink">{t.name}</div>
                    <div className="text-[10px] text-ink/50">{t.requests.toLocaleString()} requests · Last used {t.lastUsed.slice(0, 10)}</div>
                  </div>
                  <Badge status={t.status} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ════════════ API TOKENS ════════════ */}
      {tab === 'tokens' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setTokenModalOpen(true)}><Plus className="w-4 h-4" /> Generate API token</Button>
          </div>
          <Card className="p-5">
            <SectionTitle title="API token management" />
            <p className="text-[11px] text-ink/50 mb-4">Tokens grant programmatic access to the REST API. Store tokens securely — they are shown in full only once at creation time.</p>
            <div className="space-y-2">
              {tokens.length === 0 ? (
                <EmptyState icon={Key} title="No API tokens" hint="Generate a token to enable programmatic access" />
              ) : tokens.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-line group">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{t.name}</span>
                      <Badge status={t.status} />
                    </div>
                    <div className="text-[11px] text-ink/50 font-mono mt-0.5">{t.masked ? t.token.slice(0, 8) + '••••••••••••••••' + t.token.slice(-4) : t.token}</div>
                    <div className="text-[10px] text-ink/40 mt-0.5">
                      Scopes: {t.scopes.join(', ')} · Created: {t.created} · {t.requests.toLocaleString()} requests
                    </div>
                  </div>
                  <button onClick={() => toggleTokenMask(t.id)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                    {t.masked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => copyToClipboard(t.token, t.id)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                    {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-plum" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  {t.status === 'Active' && (
                    <button onClick={() => revokeToken(t.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Revoke">
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => deleteToken(t.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Token scopes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { scope: 'read', desc: 'GET requests — list and retrieve records' },
                { scope: 'write', desc: 'POST, PUT, PATCH, DELETE — create and modify records' },
                { scope: 'webhooks', desc: 'Manage webhook endpoints and view delivery logs' },
                { scope: 'admin', desc: 'Full access including token management and system config' },
              ].map((s) => (
                <div key={s.scope} className="p-3 rounded-xl border border-line">
                  <code className="text-xs font-mono text-plum font-semibold">{s.scope}</code>
                  <p className="text-[11px] text-ink/50 mt-1">{s.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Modal open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} title="Generate API token">
            <div className="space-y-4">
              <Field label="Token name"><Input value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} placeholder="e.g. Production API" /></Field>
              <div>
                <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Scopes</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {scopeOptions.map((scope) => (
                    <button key={scope} onClick={() => toggleScope(scope)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${newTokenScopes.includes(scope) ? 'bg-plum text-white' : 'bg-canvas text-ink/60 hover:bg-lilac'}`}>
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setTokenModalOpen(false)}>Cancel</Button>
                <Button onClick={addToken}><Key className="w-4 h-4" /> Generate token</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════ WEBHOOKS ════════════ */}
      {tab === 'webhooks' && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setWebhookModalOpen(true)}><Plus className="w-4 h-4" /> Add webhook endpoint</Button>
          </div>
          <Card className="p-5">
            <SectionTitle title="Webhook configuration" />
            <p className="text-[11px] text-ink/50 mb-4">Webhooks deliver real-time event notifications to external services. Each delivery is signed with HMAC-SHA256 for verification.</p>
            <div className="space-y-2">
              {webhooks.length === 0 ? (
                <EmptyState icon={Webhook} title="No webhook endpoints" hint="Add a webhook to receive event notifications" />
              ) : webhooks.map((w) => (
                <div key={w.id} className="p-4 rounded-xl border border-line">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <Webhook className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-ink truncate block">{w.url}</code>
                      <div className="text-[10px] text-ink/40 mt-0.5">Created: {w.createdAt} · Secret: {w.secret}</div>
                    </div>
                    <Badge status={w.status} />
                    <button onClick={() => toggleWebhookStatus(w.id)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors" title={w.status === 'Active' ? 'Pause' : 'Activate'}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteWebhook(w.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {w.events.map((ev) => (
                      <span key={ev} className="text-[10px] px-2 py-0.5 rounded-lg bg-canvas text-ink/60 font-mono">{ev}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-ink/50">
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-plum" /> {w.deliveries.toLocaleString()} deliveries</span>
                    {w.failures > 0 && <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-coral" /> {w.failures} failures</span>}
                    {w.lastDelivery && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last: {w.lastDelivery.slice(0, 10)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Event catalog</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {eventCatalog.map((e) => (
                <div key={e.event} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                  <code className="text-xs font-mono text-plum font-semibold flex-1">{e.event}</code>
                  <span className="text-[11px] text-ink/50 flex-1">{e.desc}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-line text-ink/50">{e.module}</span>
                </div>
              ))}
            </div>
          </Card>

          <Modal open={webhookModalOpen} onClose={() => setWebhookModalOpen(false)} title="Add webhook endpoint" wide>
            <div className="space-y-4">
              <Field label="Endpoint URL"><Input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} placeholder="https://your-service.com/petcare/webhook" /></Field>
              <div>
                <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">Events to subscribe</span>
                <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto">
                  {eventOptions.map((ev) => (
                    <button key={ev} onClick={() => toggleWebhookEvent(ev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${newWebhookEvents.includes(ev) ? 'bg-plum text-white' : 'bg-canvas text-ink/60 hover:bg-lilac'}`}>
                      {ev}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setWebhookModalOpen(false)}>Cancel</Button>
                <Button onClick={addWebhook}><Webhook className="w-4 h-4" /> Add webhook</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════ API DOCUMENTATION ════════════ */}
      {tab === 'docs' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="REST API v1 — Endpoint reference" />
            <p className="text-[11px] text-ink/50 mb-4">All endpoints are prefixed with <code className="text-xs font-mono text-plum bg-canvas px-1.5 py-0.5 rounded">/api/v1</code>. Authentication via <code className="text-xs font-mono text-plum bg-canvas px-1.5 py-0.5 rounded">Authorization: Bearer {`{token}`}</code> header.</p>
            <div className="space-y-1.5">
              {apiEndpoints.map((ep) => (
                <div key={ep.path} className="flex items-center gap-3 p-2.5 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                  <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg w-16 text-center shrink-0 ${methodColor[ep.method]}`}>{ep.method}</span>
                  <code className="text-xs font-mono text-ink flex-1 truncate">{ep.path}</code>
                  <span className="text-[11px] text-ink/50 hidden md:block flex-1">{ep.desc}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-canvas text-ink/50 font-mono shrink-0">{ep.auth}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Authentication</h3>
              <div className="rounded-xl bg-ink text-white p-4 font-mono text-xs overflow-x-auto">
                <div className="text-ink/40"># Example request with Bearer token</div>
                <div className="mt-2"><span className="text-sky-300">curl</span> <span className="text-lilac">https://api.petcare.pro/v1/patients</span></div>
                <div className="mt-1">  -H <span className="text-amber-300">"Authorization: Bearer pcp_live_..."</span></div>
                <div className="mt-1">  -H <span className="text-amber-300">"Content-Type: application/json"</span></div>
              </div>
              <p className="text-[11px] text-ink/50 mt-3">All tokens must be sent in the Authorization header as a Bearer token. Never include tokens in URL parameters.</p>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Error responses</h3>
              <div className="space-y-2">
                {[
                  { code: '200', desc: 'Success — request completed', tone: 'plum' },
                  { code: '201', desc: 'Created — resource successfully created', tone: 'plum' },
                  { code: '400', desc: 'Bad request — invalid parameters', tone: 'amber' },
                  { code: '401', desc: 'Unauthorized — missing or invalid token', tone: 'coral' },
                  { code: '403', desc: 'Forbidden — insufficient scope', tone: 'coral' },
                  { code: '404', desc: 'Not found — resource does not exist', tone: 'amber' },
                  { code: '429', desc: 'Rate limited — too many requests', tone: 'amber' },
                  { code: '500', desc: 'Server error — internal failure', tone: 'coral' },
                ].map((e) => (
                  <div key={e.code} className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas">
                    <code className={`text-xs font-mono font-bold px-2 py-1 rounded-lg ${e.tone === 'plum' ? 'bg-lilac text-plum' : e.tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-coral/15 text-coral'}`}>{e.code}</code>
                    <span className="text-[11px] text-ink/60">{e.desc}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Sample response — GET /api/v1/patients</h3>
            <div className="rounded-xl bg-ink text-white p-4 font-mono text-xs overflow-x-auto">
              <div className="text-ink/40">// 200 OK</div>
              <div className="mt-2"><span className="text-sky-300">{'{'}</span></div>
              <div className="pl-4"><span className="text-amber-300">"data"</span>: [</div>
              <div className="pl-8"><span className="text-sky-300">{'{'}</span></div>
              <div className="pl-12"><span className="text-amber-300">"id"</span>: <span className="text-lilac">"pet_001"</span>,</div>
              <div className="pl-12"><span className="text-amber-300">"name"</span>: <span className="text-lilac">"Buddy"</span>,</div>
              <div className="pl-12"><span className="text-amber-300">"species"</span>: <span className="text-lilac">"Dog"</span>,</div>
              <div className="pl-12"><span className="text-amber-300">"breed"</span>: <span className="text-lilac">"Golden Retriever"</span>,</div>
              <div className="pl-12"><span className="text-amber-300">"owner_id"</span>: <span className="text-lilac">"own_001"</span></div>
              <div className="pl-8"><span className="text-sky-300">{'}'}</span></div>
              <div className="pl-4">],</div>
              <div className="pl-4"><span className="text-amber-300">"pagination"</span>: <span className="text-sky-300">{'{'}</span> <span className="text-amber-300">"cursor"</span>: <span className="text-lilac">"eyJ..."</span>, <span className="text-amber-300">"has_more"</span>: <span className="text-sky-300">true</span> <span className="text-sky-300">{'}'}</span></div>
              <div><span className="text-sky-300">{'}'}</span></div>
            </div>
          </Card>
        </>
      )}

      {/* ════════════ SDK PLANNING ════════════ */}
      {tab === 'sdk' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="SDK planning & roadmap" />
            <p className="text-[11px] text-ink/50 mb-4">Official SDKs wrap the REST API with language-native types, automatic retry, and pagination helpers. The OpenAPI spec enables community-generated SDKs for any language.</p>
            <div className="space-y-3">
              {sdkRoadmap.map((sdk) => (
                <div key={sdk.name} className="p-4 rounded-xl border border-line">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Package className="w-5 h-5" /></div>
                      <div>
                        <div className="text-sm font-medium text-ink">{sdk.name}</div>
                        <div className="text-[11px] text-ink/50">{sdk.desc}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sdk.status === 'Available' ? 'bg-lilac text-plum' : sdk.status === 'In development' ? 'bg-amber-100 text-amber-700' : 'bg-ink/5 text-ink/40'}`}>{sdk.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-canvas overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${sdk.progress === 100 ? 'bg-plum' : 'bg-amber-400'}`} style={{ width: `${sdk.progress}%` }} />
                    </div>
                    <span className="text-[10px] text-ink/50 w-8 text-right">{sdk.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">JavaScript SDK — example usage</h3>
              <div className="rounded-xl bg-ink text-white p-4 font-mono text-xs overflow-x-auto">
                <div className="text-ink/40">// Install: npm install @petcare/sdk</div>
                <div className="mt-2"><span className="text-sky-300">import</span> {'{ PetCare }'} <span className="text-sky-300">from</span> <span className="text-lilac">'@petcare/sdk'</span>;</div>
                <div className="mt-2"><span className="text-sky-300">const</span> client = <span className="text-sky-300">new</span> <span className="text-amber-300">PetCare</span>({'{'}</div>
                <div className="pl-4">apiKey: <span className="text-lilac">'pcp_live_...'</span>,</div>
                <div className="pl-4">branch: <span className="text-lilac">'northgate'</span></div>
                <div>{'}'});</div>
                <div className="mt-2"><span className="text-ink/40">// List patients</span></div>
                <div><span className="text-sky-300">const</span> pets = <span className="text-sky-300">await</span> client.patients.list({'{'}</div>
                <div className="pl-4">limit: <span className="text-sky-300">50</span>,</div>
                <div className="pl-4">species: <span className="text-lilac">'Dog'</span></div>
                <div>{'}'});</div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Python SDK — example usage</h3>
              <div className="rounded-xl bg-ink text-white p-4 font-mono text-xs overflow-x-auto">
                <div className="text-ink/40"># pip install petcare-sdk</div>
                <div className="mt-2"><span className="text-sky-300">from</span> petcare <span className="text-sky-300">import</span> PetCareClient</div>
                <div className="mt-2">client = <span className="text-amber-300">PetCareClient</span>(</div>
                <div className="pl-4">api_key=<span className="text-lilac">"pcp_live_..."</span>,</div>
                <div className="pl-4">branch=<span className="text-lilac">"northgate"</span></div>
                <div>)</div>
                <div className="mt-2"><span className="text-ink/40"># List appointments</span></div>
                <div>appts = client.appointments.list(</div>
                <div className="pl-4">status=<span className="text-lilac">"Scheduled"</span></div>
                <div>)</div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ════════════ IMPORT TOOLS ════════════ */}
      {tab === 'import' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><FileText className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">CSV</div><div className="text-[11px] text-ink/50">Comma-separated</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><FileSpreadsheet className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">Excel</div><div className="text-[11px] text-ink/50">.xlsx / .xls</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><FileJson className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">JSON</div><div className="text-[11px] text-ink/50">Structured data</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Upload className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{importJobs.length}</div><div className="text-[11px] text-ink/50">Import jobs</div></div></div></Card>
          </div>

          <div className="flex justify-end mb-4">
            <Button onClick={() => setImportModalOpen(true)}><Upload className="w-4 h-4" /> Start new import</Button>
          </div>

          <Card className="p-5">
            <SectionTitle title="Import job history" />
            <p className="text-[11px] text-ink/50 mb-4">Import data from external systems. Files are validated before records are created — errors are reported per-row.</p>
            {importJobs.length === 0 ? (
              <EmptyState icon={Upload} title="No import jobs yet" hint="Start an import to bring data in from CSV, Excel, or JSON files" />
            ) : (
              <div className="space-y-2">
                {importJobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      job.format === 'CSV' ? 'bg-plum/10 text-plum' :
                      job.format === 'Excel' ? 'bg-sky-100 text-sky-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {job.format === 'CSV' ? <FileText className="w-4 h-4" /> : job.format === 'Excel' ? <FileSpreadsheet className="w-4 h-4" /> : <FileJson className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{job.filename}</div>
                      <div className="text-[11px] text-ink/50">{job.module} · {job.records.toLocaleString()} records · {job.date.slice(0, 10)}</div>
                    </div>
                    {job.errors > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral">{job.errors} errors</span>}
                    <Badge status={job.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Import guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { format: 'CSV', desc: 'UTF-8 encoded, comma-delimited, header row required. Max 10MB / 10,000 rows.', icon: FileText },
                { format: 'Excel', desc: 'XLSX format only. First sheet is imported. Merged cells not supported. Max 10MB.', icon: FileSpreadsheet },
                { format: 'JSON', desc: 'Array of objects or NDJSON. Field names must match API schema. Max 10MB.', icon: FileJson },
              ].map((g) => (
                <div key={g.format} className="p-3 rounded-xl border border-line">
                  <div className="flex items-center gap-2 mb-1">
                    <g.icon className="w-4 h-4 text-plum" />
                    <span className="text-sm font-medium text-ink">{g.format} requirements</span>
                  </div>
                  <p className="text-[11px] text-ink/50">{g.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Start new import">
            <div className="space-y-4">
              <Field label="File name">
                <Input value={importFileName} onChange={(e) => setImportFileName(e.target.value)} placeholder="e.g. patients_october.csv" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Format">
                  <Select value={importFormat} onChange={(e) => setImportFormat(e.target.value as 'CSV' | 'Excel' | 'JSON')}>
                    <option value="CSV">CSV</option>
                    <option value="Excel">Excel (.xlsx)</option>
                    <option value="JSON">JSON</option>
                  </Select>
                </Field>
                <Field label="Target module">
                  <Select value={importModule} onChange={(e) => setImportModule(e.target.value)}>
                    <option value="patients">Patients</option>
                    <option value="owners">Owners (CRM)</option>
                    <option value="appointments">Appointments</option>
                    <option value="inventory">Inventory</option>
                    <option value="staff">Staff</option>
                    <option value="invoices">Invoices</option>
                    <option value="vaccinations">Vaccinations</option>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setImportModalOpen(false)}>Cancel</Button>
                <Button onClick={startImport}><Upload className="w-4 h-4" /> Start import</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════ EXPORT TOOLS ════════════ */}
      {tab === 'export' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Data export tools" />
            <p className="text-[11px] text-ink/50 mb-4">Export platform data in JSON format for backups, migrations, or external analysis. Exports respect branch-level permissions and include all related records.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { module: 'Patients', desc: 'All pet records with owner references', records: '~250', icon: FileJson },
                { module: 'Owners (CRM)', desc: 'All owner profiles and contact info', records: '~180', icon: FileJson },
                { module: 'Appointments', desc: 'All appointment history and status', records: '~3,200', icon: FileJson },
                { module: 'Medical Records', desc: 'Complete medical timelines for all pets', records: '~1,400', icon: FileJson },
                { module: 'Invoices', desc: 'All invoices with line items and payments', records: '~890', icon: FileJson },
                { module: 'Prescriptions', desc: 'All prescriptions with medication details', records: '~520', icon: FileJson },
                { module: 'Vaccinations', desc: 'Vaccination records and due dates', records: '~680', icon: FileJson },
                { module: 'Inventory', desc: 'Stock levels, adjustments, and transfers', records: '~1,900', icon: FileJson },
                { module: 'Staff', desc: 'Staff profiles, roles, and activity logs', records: '~38', icon: FileJson },
              ].map((exp) => (
                <div key={exp.module} className="p-4 rounded-xl border border-line hover:border-plum/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <exp.icon className="w-4 h-4 text-plum" />
                    <span className="text-sm font-medium text-ink flex-1">{exp.module}</span>
                  </div>
                  <p className="text-[11px] text-ink/50 mb-2">{exp.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ink/40">{exp.records} records</span>
                    <Button size="sm" variant="outline"><Download className="w-3 h-3" /> Export JSON</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Full system export</h3>
            <p className="text-[11px] text-ink/50 mb-4">Export all platform data as a single JSON archive. Useful for full backups, system migrations, or compliance audits.</p>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-line bg-canvas">
              <div className="w-12 h-12 rounded-xl bg-plum/10 text-plum flex items-center justify-center">
                <Archive className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink">Complete system export</div>
                <div className="text-[11px] text-ink/50">All modules · All branches · JSON archive format · ~45 MB estimated</div>
              </div>
              <Button><Download className="w-4 h-4" /> Export everything</Button>
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}
