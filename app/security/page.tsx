'use client';

import { useMemo, useState } from 'react';
import {
  ShieldCheck, KeyRound, ScrollText, Activity, Lock, Globe, Smartphone,
  HardDrive, Database, FileLock2, HeartPulse, Wifi, AlertTriangle,
  CheckCircle2, XCircle, Clock, UserCog, FileText, Syringe, Scissors,
  Hotel, Pill, Stethoscope, Users, PawPrint, Receipt, Package,
  TrendingUp, Eye, Ban, RefreshCw, Download, Trash2, Edit2, Plus,
  Shield, Server, Fingerprint, Mail, MapPin, Monitor,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, Button, Badge, EmptyState, Select, Input, Modal, Field, Tabs } from '../components/ui';
import { useDB, today } from '../lib/store';
import { rolePermissions, allRoles, roleInfo, type Role, type Module, type Action } from '../lib/platform';

type Tab = 'overview' | 'rbac' | '2fa' | 'audit' | 'activity' | 'ip' | 'sessions' | 'devices' | 'encryption' | 'backup' | 'privacy' | 'compliance' | 'sensitive';

function daysAgo(dateStr: string): number {
  if (!dateStr) return 9999;
  return Math.ceil((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function relTime(dateStr: string): string {
  const d = daysAgo(dateStr);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export default function SecurityPage() {
  const { db } = useDB();
  const [tab, setTab] = useState<Tab>('overview');
  const [auditFilter, setAuditFilter] = useState('all');
  const [sensitiveFilter, setSensitiveFilter] = useState('all');
  const [ipModalOpen, setIpModalOpen] = useState(false);
  const [ipForm, setIpForm] = useState({ ip: '', label: '', type: 'Allow' });

  // Simulated security state (in-memory)
  const [twoFAEnabled, setTwoFAEnabled] = useState<Record<string, boolean>>({});
  const [ipRules, setIpRules] = useState([
    { id: 'ip1', ip: '192.168.1.0/24', label: 'Office network — Northgate', type: 'Allow' as const },
    { id: 'ip2', ip: '10.0.0.0/8', label: 'Office network — Riverside', type: 'Allow' as const },
    { id: 'ip3', ip: '203.0.113.0/24', label: 'Known threat range', type: 'Block' as const },
  ]);
  const [sessions, setSessions] = useState([
    { id: 's1', user: 'Alex Chen', role: 'Super Admin', device: 'Chrome on macOS', ip: '192.168.1.10', location: 'Northgate, CA', started: '2026-10-07T08:30:00', lastActive: '2026-10-07T14:22:00', status: 'Active' },
    { id: 's2', user: 'Dr. Maya Rivera', role: 'Veterinarian', device: 'Safari on iPad', ip: '192.168.1.45', location: 'Northgate, CA', started: '2026-10-07T09:00:00', lastActive: '2026-10-07T13:45:00', status: 'Active' },
    { id: 's3', user: 'Sofia Reyes', role: 'Branch Manager', device: 'Edge on Windows', ip: '10.0.0.22', location: 'Riverside, CA', started: '2026-10-07T08:45:00', lastActive: '2026-10-07T12:10:00', status: 'Active' },
    { id: 's4', user: 'Lena Ortiz', role: 'Receptionist', device: 'Chrome on Windows', ip: '192.168.1.50', location: 'Northgate, CA', started: '2026-10-06T17:30:00', lastActive: '2026-10-06T18:00:00', status: 'Expired' },
    { id: 's5', user: 'Yuki Tanaka', role: 'Accountant', device: 'Firefox on macOS', ip: '192.168.1.60', location: 'Northgate, CA', started: '2026-10-06T14:00:00', lastActive: '2026-10-06T17:15:00', status: 'Expired' },
  ]);
  const [devices, setDevices] = useState([
    { id: 'd1', user: 'Alex Chen', device: 'MacBook Pro 16"', os: 'macOS 14.5', browser: 'Chrome 129', lastSeen: '2026-10-07T14:22:00', trusted: true, fingerprint: 'a1b2c3d4' },
    { id: 'd2', user: 'Dr. Maya Rivera', device: 'iPad Air', os: 'iPadOS 17.5', browser: 'Safari 17', lastSeen: '2026-10-07T13:45:00', trusted: true, fingerprint: 'e5f6g7h8' },
    { id: 'd3', user: 'Sofia Reyes', device: 'Dell Latitude', os: 'Windows 11', browser: 'Edge 129', lastSeen: '2026-10-07T12:10:00', trusted: true, fingerprint: 'i9j0k1l2' },
    { id: 'd4', user: 'Lena Ortiz', device: 'HP EliteBook', os: 'Windows 11', browser: 'Chrome 129', lastSeen: '2026-10-06T18:00:00', trusted: false, fingerprint: 'm3n4o5p6' },
    { id: 'd5', user: 'Hannah Kim', device: 'iPhone 15', os: 'iOS 17.6', browser: 'Safari 17', lastSeen: '2026-10-05T16:30:00', trusted: false, fingerprint: 'q7r8s9t0' },
  ]);

  if (!db) return <Shell module="security" title="Security & Audit"><div className="text-sm text-ink/50">Loading…</div></Shell>;

  // ── Derive audit logs from staff activity logs ──
  const allActivityLogs = db.staff.flatMap((s) =>
    s.activityLog.map((log) => ({ ...log, staffName: s.name, staffRole: s.role, staffBranch: s.branch }))
  ).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  // ── Derive sensitive action tracking ──
  // Medical record changes
  const medRecordChanges = db.medRecords.map((r) => ({
    id: r.id, type: 'Medical Record', action: 'Created/Modified', target: r.title,
    user: r.vet, date: r.date, module: 'medical', severity: 'high' as const,
    details: `Record for pet ${db.pets.find((p) => p.id === r.petId)?.name || r.petId}`,
  }));

  // Prescription changes
  const prescriptionChanges = db.prescriptions.map((p) => ({
    id: p.id, type: 'Prescription', action: p.status === 'Active' ? 'Created' : `Status: ${p.status}`,
    target: `Rx ${p.prescriptionNumber}`, user: p.vet, date: p.date, module: 'prescriptions',
    severity: 'high' as const, details: `${p.items.length} items prescribed`,
  }));

  // Invoice changes
  const invoiceChanges = db.invoices.map((inv) => ({
    id: inv.id, type: 'Invoice', action: `Status: ${inv.status}`, target: inv.number,
    user: inv.createdBy, date: inv.date, module: 'billing', severity: 'medium' as const,
    details: `$${inv.total.toFixed(2)} — Owner: ${db.owners.find((o) => o.id === inv.ownerId)?.name || inv.ownerId}`,
  }));

  // Permission changes (simulated from staff role assignments)
  const permissionChanges = db.staff.map((s) => ({
    id: s.id, type: 'Permission', action: 'Role assigned', target: `${s.name} → ${s.role}`,
    user: 'System Admin', date: s.hireDate, module: 'staff', severity: 'critical' as const,
    details: `Department: ${s.department}, Branch: ${s.branch}`,
  }));

  // Inventory adjustments
  const inventoryAdjustments = db.stockAdjustments.map((a) => ({
    id: a.id, type: 'Inventory Adjustment', action: a.type, target: a.itemName,
    user: a.performedBy, date: a.date, module: 'inventory', severity: 'medium' as const,
    details: `Qty: ${a.quantity} (${a.previousStock} → ${a.newStock}) — ${a.reason}`,
  }));

  // Staff changes
  const staffChanges = db.staff.flatMap((s) => {
    const changes: Array<{ id: string; type: string; action: string; target: string; user: string; date: string; module: string; severity: 'medium' | 'high'; details: string }> = [];
    changes.push({
      id: `${s.id}-hire`, type: 'Staff Change', action: 'Hired', target: s.name,
      user: 'HR Admin', date: s.hireDate, module: 'staff', severity: 'medium',
      details: `Role: ${s.role}, Branch: ${s.branch}`,
    });
    s.leaveRequests.filter((lr) => lr.status === 'Approved').forEach((lr) => {
      changes.push({
        id: `${s.id}-leave-${lr.id}`, type: 'Staff Change', action: 'Leave approved', target: s.name,
        user: lr.reviewedBy || 'Manager', date: lr.appliedDate, module: 'staff', severity: 'medium',
        details: `${lr.type} leave: ${lr.startDate} to ${lr.endDate} (${lr.days} days)`,
      });
    });
    return changes;
  });

  // Patient deletion requests (simulated)
  const deletionRequests = [
    { id: 'del1', type: 'Deletion Request', action: 'Pending approval', target: 'Buddy (Dog)', user: 'Eleanor Hayes', date: '2026-09-28', module: 'patients', severity: 'critical' as const, details: 'Owner requested account and pet data deletion under privacy rights' },
    { id: 'del2', type: 'Deletion Request', action: 'Approved & completed', target: 'Max (Cat)', user: 'Alex Chen', date: '2026-09-15', module: 'patients', severity: 'critical' as const, details: 'Deletion approved by Super Admin after 30-day grace period' },
    { id: 'del3', type: 'Deletion Request', action: 'Pending approval', target: 'Luna (Rabbit)', user: 'Maria Santos', date: '2026-10-02', module: 'patients', severity: 'critical' as const, details: 'Owner moved to another country, requested full data removal' },
  ];

  const allSensitiveActions = [
    ...medRecordChanges, ...prescriptionChanges, ...invoiceChanges,
    ...permissionChanges, ...inventoryAdjustments, ...staffChanges, ...deletionRequests,
  ].sort((a, b) => b.date.localeCompare(a.date));

  // ── Security posture summary ──
  const securityChecks = [
    { label: 'Role-based access control', status: 'active', icon: KeyRound },
    { label: 'Two-factor authentication', status: 'partial', icon: Smartphone },
    { label: 'Audit logging', status: 'active', icon: ScrollText },
    { label: 'Activity logging', status: 'active', icon: Activity },
    { label: 'IP restrictions', status: 'active', icon: Globe },
    { label: 'Session management', status: 'active', icon: Monitor },
    { label: 'Device management', status: 'active', icon: HardDrive },
    { label: 'Data encryption at rest', status: 'active', icon: Lock },
    { label: 'Backup & recovery', status: 'active', icon: Database },
    { label: 'GDPR privacy controls', status: 'active', icon: FileLock2 },
    { label: 'HIPAA privacy practices', status: 'active', icon: HeartPulse },
    { label: 'Secure connection (HTTPS/TLS)', status: 'active', icon: Wifi },
  ];

  const activeSessions = sessions.filter((s) => s.status === 'Active');
  const trustedDevices = devices.filter((d) => d.trusted);
  const totalStaff = db.staff.length;
  const staffWith2FA = Object.values(twoFAEnabled).filter(Boolean).length;

  // ── RBAC matrix data ──
  const modules: Module[] = ['dashboard', 'patients', 'appointments', 'medical', 'vaccinations', 'prescriptions', 'surgeries', 'labTests', 'pharmacy', 'inventory', 'grooming', 'boarding', 'billing', 'staff', 'branches', 'settings', 'ai', 'crm', 'analytics', 'security'];
  const actions: Action[] = ['view', 'create', 'edit', 'delete', 'approve'];

  // ── Filter helpers ──
  const filteredAudit = auditFilter === 'all' ? allActivityLogs : allActivityLogs.filter((l) => l.module === auditFilter);
  const filteredSensitive = sensitiveFilter === 'all' ? allSensitiveActions : allSensitiveActions.filter((a) => a.module === sensitiveFilter);

  const tabs: { key: Tab; label: string; icon: typeof ShieldCheck }[] = [
    { key: 'overview', label: 'Overview', icon: ShieldCheck },
    { key: 'rbac', label: 'Access Control', icon: KeyRound },
    { key: '2fa', label: '2FA', icon: Smartphone },
    { key: 'audit', label: 'Audit Logs', icon: ScrollText },
    { key: 'activity', label: 'Activity Logs', icon: Activity },
    { key: 'sensitive', label: 'Sensitive Actions', icon: AlertTriangle },
    { key: 'ip', label: 'IP Restrictions', icon: Globe },
    { key: 'sessions', label: 'Sessions', icon: Monitor },
    { key: 'devices', label: 'Devices', icon: HardDrive },
    { key: 'encryption', label: 'Encryption', icon: Lock },
    { key: 'backup', label: 'Backup', icon: Database },
    { key: 'privacy', label: 'Privacy (GDPR)', icon: FileLock2 },
    { key: 'compliance', label: 'Compliance (HIPAA)', icon: HeartPulse },
  ];

  const sevColor: Record<string, string> = {
    critical: 'bg-coral/15 text-coral',
    high: 'bg-amber-100 text-amber-700',
    medium: 'bg-sky-100 text-sky-700',
    low: 'bg-lilac text-plum',
  };

  const statusIcon = (status: string) => {
    if (status === 'active') return <CheckCircle2 className="w-4 h-4 text-plum" />;
    if (status === 'partial') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-coral" />;
  };

  // ── IP rule handlers ──
  const addIpRule = () => {
    if (!ipForm.ip) return;
    setIpRules((prev) => [...prev, { id: `ip${Date.now()}`, ip: ipForm.ip, label: ipForm.label, type: ipForm.type as 'Allow' | 'Block' }]);
    setIpForm({ ip: '', label: '', type: 'Allow' });
    setIpModalOpen(false);
  };
  const removeIpRule = (id: string) => setIpRules((prev) => prev.filter((r) => r.id !== id));
  const revokeSession = (id: string) => setSessions((prev) => prev.map((s) => s.id === id ? { ...s, status: 'Revoked' } : s));
  const toggleDeviceTrust = (id: string) => setDevices((prev) => prev.map((d) => d.id === id ? { ...d, trusted: !d.trusted } : d));
  const toggle2FA = (staffId: string) => setTwoFAEnabled((prev) => ({ ...prev, [staffId]: !prev[staffId] }));

  return (
    <Shell title="Security & Audit" subtitle="Access control, audit trails, privacy compliance, and threat monitoring">
      {/* Tabs */}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ════════════════════════════════════════════
          OVERVIEW
         ════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></div>
                <div><div className="text-2xl font-bold text-ink">{securityChecks.filter((s) => s.status === 'active').length}</div><div className="text-[11px] text-ink/50">Active controls</div></div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                <div><div className="text-2xl font-bold text-ink">{securityChecks.filter((s) => s.status === 'partial').length}</div><div className="text-[11px] text-ink/50">Partial / needs attention</div></div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Monitor className="w-5 h-5" /></div>
                <div><div className="text-2xl font-bold text-ink">{activeSessions.length}</div><div className="text-[11px] text-ink/50">Active sessions</div></div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
                <div><div className="text-2xl font-bold text-ink">{allSensitiveActions.filter((a) => a.severity === 'critical').length}</div><div className="text-[11px] text-ink/50">Critical actions tracked</div></div>
              </div>
            </Card>
          </div>

          <Card className="p-5 mb-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Security posture checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {securityChecks.map((check) => (
                <div key={check.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
                  {statusIcon(check.status)}
                  <check.icon className="w-4 h-4 text-ink/40" />
                  <span className="text-sm text-ink flex-1">{check.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${check.status === 'active' ? 'bg-lilac text-plum' : check.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-coral/15 text-coral'}`}>
                    {check.status === 'active' ? 'Active' : check.status === 'partial' ? 'Partial' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Recent sensitive actions</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {allSensitiveActions.slice(0, 8).map((a) => (
                  <div key={`${a.id}-${a.type}`} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${sevColor[a.severity]}`}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">{a.action} — {a.target}</div>
                      <div className="text-[10px] text-ink/50">{a.user} · {relTime(a.date)}</div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${sevColor[a.severity]}`}>{a.severity}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-3">Recent activity logs</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {allActivityLogs.slice(0, 8).map((log, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-canvas">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-ink truncate">{log.action}</div>
                      <div className="text-[10px] text-ink/50">{log.staffName} · {log.date} {log.time}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-canvas text-ink/50">{log.module}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          RBAC
         ════════════════════════════════════════════ */}
      {tab === 'rbac' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><KeyRound className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allRoles.length}</div><div className="text-[11px] text-ink/50">Roles defined</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Shield className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{modules.length}</div><div className="text-[11px] text-ink/50">Secured modules</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Eye className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{actions.length}</div><div className="text-[11px] text-ink/50">Action types</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><Users className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{totalStaff}</div><div className="text-[11px] text-ink/50">Users with access</div></div></div></Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-1">Role-permission matrix</h3>
            <p className="text-[11px] text-ink/50 mb-4">Each role's access to every module and action. View = read, Create/Edit/Delete = write, Approve = authorize.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 text-left text-[10px] uppercase tracking-wide text-ink/50 font-semibold sticky left-0 bg-white">Module</th>
                    {allRoles.map((role) => (
                      <th key={role} className="py-2 px-1 text-center text-[10px] text-ink/60 font-medium min-w-[70px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="truncate max-w-[65px]">{roleInfo[role].label.split(' ')[0]}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod) => (
                    <tr key={mod} className="border-b border-line/40 hover:bg-canvas/30">
                      <td className="py-2 pr-3 font-medium text-ink capitalize sticky left-0 bg-white">{mod.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</td>
                      {allRoles.map((role) => {
                        const perms = rolePermissions[role]?.[mod];
                        if (!perms) return <td key={role} className="py-2 px-1 text-center"><span className="text-ink/15">—</span></td>;
                        return (
                          <td key={role} className="py-2 px-1 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              {actions.map((act) => (
                                <span key={act} className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${perms.includes(act) ? act === 'approve' ? 'bg-coral/15 text-coral' : act === 'delete' ? 'bg-coral/10 text-coral/70' : act === 'edit' ? 'bg-amber-100 text-amber-600' : act === 'create' ? 'bg-sky-100 text-sky-600' : 'bg-lilac text-plum' : 'bg-line/50 text-ink/15'}`}>
                                  {perms.includes(act) ? act[0].toUpperCase() : '·'}
                                </span>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-line">
              {[
                { label: 'V', cls: 'bg-lilac text-plum', desc: 'View' },
                { label: 'C', cls: 'bg-sky-100 text-sky-600', desc: 'Create' },
                { label: 'E', cls: 'bg-amber-100 text-amber-600', desc: 'Edit' },
                { label: 'D', cls: 'bg-coral/10 text-coral/70', desc: 'Delete' },
                { label: 'A', cls: 'bg-coral/15 text-coral', desc: 'Approve' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${l.cls}`}>{l.label}</span>
                  <span className="text-[10px] text-ink/50">{l.desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          2FA
         ════════════════════════════════════════════ */}
      {tab === '2fa' && (
        <>
          <Card className="p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-ink">Two-factor authentication (2FA) preparation</h3>
                <p className="text-xs text-ink/60 mt-1 leading-relaxed">
                  2FA infrastructure is ready for deployment. Staff members can be enrolled individually. When enabled, users will need a verification code from their authenticator app (Google Authenticator, Authy) in addition to their password at login.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Preparation phase</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">TOTP ready</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Backup codes supported</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="text-2xl font-bold text-ink">{staffWith2FA}</div><div className="text-[11px] text-ink/50">Enrolled in 2FA</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold text-ink">{totalStaff - staffWith2FA}</div><div className="text-[11px] text-ink/50">Not yet enrolled</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold text-ink">{Math.round((staffWith2FA / Math.max(totalStaff, 1)) * 100)}%</div><div className="text-[11px] text-ink/50">Coverage rate</div></Card>
            <Card className="p-4"><div className="text-2xl font-bold text-ink">TOTP</div><div className="text-[11px] text-ink/50">Protocol</div></Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Staff 2FA enrollment</h3>
            <div className="space-y-2">
              {db.staff.map((s) => {
                const enrolled = twoFAEnabled[s.id] || false;
                return (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${enrolled ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/30'}`}>
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{s.name}</div>
                      <div className="text-[11px] text-ink/50">{s.role} · {s.email}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${enrolled ? 'bg-lilac text-plum' : 'bg-ink/5 text-ink/40'}`}>
                      {enrolled ? 'Enrolled' : 'Not enrolled'}
                    </span>
                    <Button size="sm" variant={enrolled ? 'outline' : 'primary'} onClick={() => toggle2FA(s.id)}>
                      {enrolled ? 'Disable' : 'Enable 2FA'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          AUDIT LOGS
         ════════════════════════════════════════════ */}
      {tab === 'audit' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><ScrollText className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allActivityLogs.length}</div><div className="text-[11px] text-ink/50">Total audit entries</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Activity className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{new Set(allActivityLogs.map((l) => l.staffName)).size}</div><div className="text-[11px] text-ink/50">Users tracked</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{new Set(allActivityLogs.map((l) => l.module)).size}</div><div className="text-[11px] text-ink/50">Modules covered</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><Shield className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">7yr</div><div className="text-[11px] text-ink/50">Retention period</div></div></div></Card>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-ink/50">Filter by module:</span>
            <Select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} className="!w-auto">
              <option value="all">All modules</option>
              {Array.from(new Set(allActivityLogs.map((l) => l.module))).sort().map((m) => <option key={m}>{m}</option>)}
            </Select>
            <div className="flex-1" />
            <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> Export logs</Button>
          </div>

          <Card className="p-5">
            {filteredAudit.length === 0 ? (
              <EmptyState icon={ScrollText} title="No audit logs" hint="System actions will be recorded here for compliance." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-ink/50 border-b border-line">
                      <th className="py-2.5 pr-4 font-semibold">Date / Time</th>
                      <th className="py-2.5 pr-4 font-semibold">User</th>
                      <th className="py-2.5 pr-4 font-semibold">Role</th>
                      <th className="py-2.5 pr-4 font-semibold">Action</th>
                      <th className="py-2.5 pr-4 font-semibold">Module</th>
                      <th className="py-2.5 pr-4 font-semibold">Reference</th>
                      <th className="py-2.5 pr-4 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.slice(0, 50).map((log, i) => (
                      <tr key={i} className="border-b border-line/40 hover:bg-canvas/30 transition-colors">
                        <td className="py-2.5 pr-4 text-xs text-ink/60 whitespace-nowrap">{log.date} {log.time}</td>
                        <td className="py-2.5 pr-4 font-medium text-ink">{log.staffName}</td>
                        <td className="py-2.5 pr-4"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas text-ink/60">{log.staffRole}</span></td>
                        <td className="py-2.5 pr-4 text-ink/70">{log.action}</td>
                        <td className="py-2.5 pr-4"><span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600">{log.module}</span></td>
                        <td className="py-2.5 pr-4 text-xs text-ink/50">{log.reference || '—'}</td>
                        <td className="py-2.5 pr-4 text-xs text-ink/50 max-w-xs truncate">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          ACTIVITY LOGS
         ════════════════════════════════════════════ */}
      {tab === 'activity' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allActivityLogs.filter((l) => l.date === today()).length}</div><div className="text-[11px] text-ink/50">Today's activities</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Activity className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allActivityLogs.filter((l) => daysAgo(l.date) <= 7).length}</div><div className="text-[11px] text-ink/50">This week</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Users className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{new Set(allActivityLogs.map((l) => l.staffName)).size}</div><div className="text-[11px] text-ink/50">Active users</div></div></div></Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">User activity timeline</h3>
            {allActivityLogs.length === 0 ? (
              <EmptyState icon={Activity} title="No activity recorded" />
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {allActivityLogs.slice(0, 60).map((log, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{log.staffName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas text-ink/50">{log.staffRole}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600">{log.module}</span>
                      </div>
                      <div className="text-xs text-ink/70 mt-0.5">{log.action}: {log.description}</div>
                      <div className="text-[10px] text-ink/40 mt-0.5">{log.date} at {log.time} · Ref: {log.reference || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          SENSITIVE ACTIONS
         ════════════════════════════════════════════ */}
      {tab === 'sensitive' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allSensitiveActions.filter((a) => a.severity === 'critical').length}</div><div className="text-[11px] text-ink/50">Critical</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allSensitiveActions.filter((a) => a.severity === 'high').length}</div><div className="text-[11px] text-ink/50">High</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Eye className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allSensitiveActions.filter((a) => a.severity === 'medium').length}</div><div className="text-[11px] text-ink/50">Medium</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{allSensitiveActions.length}</div><div className="text-[11px] text-ink/50">Total tracked</div></div></div></Card>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-medium text-ink/50">Filter by category:</span>
            <Select value={sensitiveFilter} onChange={(e) => setSensitiveFilter(e.target.value)} className="!w-auto">
              <option value="all">All categories</option>
              <option value="medical">Medical records</option>
              <option value="prescriptions">Prescriptions</option>
              <option value="billing">Invoices</option>
              <option value="staff">Permissions & staff</option>
              <option value="inventory">Inventory adjustments</option>
              <option value="patients">Deletion requests</option>
            </Select>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Sensitive action audit trail</h3>
            {filteredSensitive.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No sensitive actions" />
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredSensitive.slice(0, 80).map((a) => (
                  <div key={`${a.id}-${a.type}`} className="flex items-start gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${sevColor[a.severity]}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{a.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sevColor[a.severity]}`}>{a.severity}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas text-ink/50">{a.module}</span>
                      </div>
                      <div className="text-sm text-ink/80 mt-0.5">{a.action} — <span className="font-medium">{a.target}</span></div>
                      <div className="text-[11px] text-ink/50 mt-0.5">{a.details}</div>
                      <div className="text-[10px] text-ink/40 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><UserCog className="w-3 h-3" /> {a.user}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          IP RESTRICTIONS
         ════════════════════════════════════════════ */}
      {tab === 'ip' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{ipRules.filter((r) => r.type === 'Allow').length}</div><div className="text-[11px] text-ink/50">Allowed ranges</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><Ban className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{ipRules.filter((r) => r.type === 'Block').length}</div><div className="text-[11px] text-ink/50">Blocked ranges</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Globe className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">Deny</div><div className="text-[11px] text-ink/50">Default policy</div></div></div></Card>
          </div>

          <div className="flex justify-end mb-4">
            <Button onClick={() => setIpModalOpen(true)}><Plus className="w-4 h-4" /> Add IP rule</Button>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">IP restriction rules</h3>
            <div className="space-y-2">
              {ipRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${rule.type === 'Allow' ? 'bg-lilac text-plum' : 'bg-coral/15 text-coral'}`}>
                    {rule.type === 'Allow' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-ink">{rule.ip}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${rule.type === 'Allow' ? 'bg-lilac text-plum' : 'bg-coral/15 text-coral'}`}>{rule.type}</span>
                    </div>
                    <div className="text-[11px] text-ink/50 mt-0.5">{rule.label}</div>
                  </div>
                  <button onClick={() => removeIpRule(rule.id)} className="w-7 h-7 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-2">Policy details</h3>
            <div className="space-y-2 text-xs text-ink/60 leading-relaxed">
              <div className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-plum shrink-0 mt-0.5" /><span><strong className="text-ink">Default deny:</strong> All IP addresses are blocked by default unless explicitly allowed.</span></div>
              <div className="flex items-start gap-2"><Globe className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" /><span><strong className="text-ink">CIDR support:</strong> Rules support both individual IPs (192.168.1.10) and ranges (192.168.1.0/24).</span></div>
              <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" /><span><strong className="text-ink">Geo-blocking:</strong> Can restrict access by country/region for international threat prevention.</span></div>
              <div className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-coral shrink-0 mt-0.5" /><span><strong className="text-ink">Block overrides:</strong> Blocked IPs receive an HTTP 403 and are logged for security review.</span></div>
            </div>
          </Card>

          <Modal open={ipModalOpen} onClose={() => setIpModalOpen(false)} title="Add IP restriction rule">
            <div className="space-y-3">
              <Field label="IP address / CIDR range"><Input value={ipForm.ip} onChange={(e) => setIpForm((f) => ({ ...f, ip: e.target.value }))} placeholder="192.168.1.0/24" /></Field>
              <Field label="Label"><Input value={ipForm.label} onChange={(e) => setIpForm((f) => ({ ...f, label: e.target.value }))} placeholder="Office network — Northgate" /></Field>
              <Field label="Rule type">
                <Select value={ipForm.type} onChange={(e) => setIpForm((f) => ({ ...f, type: e.target.value }))}>
                  <option>Allow</option><option>Block</option>
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIpModalOpen(false)}>Cancel</Button>
                <Button onClick={addIpRule}>Add rule</Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* ════════════════════════════════════════════
          SESSIONS
         ════════════════════════════════════════════ */}
      {tab === 'sessions' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><Monitor className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{activeSessions.length}</div><div className="text-[11px] text-ink/50">Active sessions</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-ink/5 text-ink/40 flex items-center justify-center"><Clock className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{sessions.filter((s) => s.status === 'Expired').length}</div><div className="text-[11px] text-ink/50">Expired</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><Ban className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{sessions.filter((s) => s.status === 'Revoked').length}</div><div className="text-[11px] text-ink/50">Revoked</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">8h</div><div className="text-[11px] text-ink/50">Session timeout</div></div></div></Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Active user sessions</h3>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.status === 'Active' ? 'bg-lilac text-plum' : s.status === 'Revoked' ? 'bg-coral/15 text-coral' : 'bg-ink/5 text-ink/30'}`}>
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink">{s.user}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-canvas text-ink/50">{s.role}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === 'Active' ? 'bg-lilac text-plum' : s.status === 'Revoked' ? 'bg-coral/15 text-coral' : 'bg-ink/5 text-ink/40'}`}>{s.status}</span>
                    </div>
                    <div className="text-[11px] text-ink/50 mt-0.5 flex items-center gap-3 flex-wrap">
                      <span>{s.device}</span>
                      <span className="font-mono">{s.ip}</span>
                      <span>{s.location}</span>
                    </div>
                    <div className="text-[10px] text-ink/40 mt-0.5">Started: {new Date(s.started).toLocaleString()} · Last active: {new Date(s.lastActive).toLocaleString()}</div>
                  </div>
                  {s.status === 'Active' && (
                    <Button size="sm" variant="outline" onClick={() => revokeSession(s.id)}><Ban className="w-3 h-3" /> Revoke</Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-2">Session policies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-canvas p-4"><div className="text-sm font-medium text-ink">Automatic timeout</div><div className="text-[11px] text-ink/50 mt-1">Sessions expire after 8 hours of inactivity. Users must re-authenticate.</div></div>
              <div className="rounded-xl bg-canvas p-4"><div className="text-sm font-medium text-ink">Concurrent session limit</div><div className="text-[11px] text-ink/50 mt-1">Maximum 3 concurrent sessions per user. Older sessions are auto-expired.</div></div>
              <div className="rounded-xl bg-canvas p-4"><div className="text-sm font-medium text-ink">Re-authentication</div><div className="text-[11px] text-ink/50 mt-1">Password re-entry required for sensitive actions (deletions, permission changes).</div></div>
              <div className="rounded-xl bg-canvas p-4"><div className="text-sm font-medium text-ink">Session logging</div><div className="text-[11px] text-ink/50 mt-1">All session start/end events are logged with IP, device, and location data.</div></div>
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          DEVICES
         ════════════════════════════════════════════ */}
      {tab === 'devices' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><HardDrive className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{devices.length}</div><div className="text-[11px] text-ink/50">Registered devices</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center"><Shield className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{trustedDevices.length}</div><div className="text-[11px] text-ink/50">Trusted</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{devices.filter((d) => !d.trusted).length}</div><div className="text-[11px] text-ink/50">Unverified</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Fingerprint className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{new Set(devices.map((d) => d.fingerprint)).size}</div><div className="text-[11px] text-ink/50">Unique fingerprints</div></div></div></Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-4">Registered devices</h3>
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${d.trusted ? 'bg-lilac text-plum' : 'bg-amber-100 text-amber-600'}`}>
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink">{d.device}</span>
                      {d.trusted && <span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Trusted</span>}
                    </div>
                    <div className="text-[11px] text-ink/50 mt-0.5">{d.os} · {d.browser}</div>
                    <div className="text-[10px] text-ink/40 mt-0.5">Last seen: {new Date(d.lastSeen).toLocaleString()} · Fingerprint: <span className="font-mono">{d.fingerprint}</span></div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => toggleDeviceTrust(d.id)}>
                    {d.trusted ? 'Revoke trust' : 'Mark trusted'}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          ENCRYPTION
         ════════════════════════════════════════════ */}
      {tab === 'encryption' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><Lock className="w-5 h-5" /></div>
                <div><h3 className="text-sm font-semibold text-ink">Data encryption at rest</h3><p className="text-[11px] text-ink/50">Database & file storage encryption</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Database encryption</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">AES-256</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">File storage encryption</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">AES-256</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Backup encryption</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">AES-256</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Key management</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">KMS</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Key rotation</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">90 days</span></div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Wifi className="w-5 h-5" /></div>
                <div><h3 className="text-sm font-semibold text-ink">Encryption in transit</h3><p className="text-[11px] text-ink/50">Data transmission security</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">TLS version</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">TLS 1.3</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Certificate authority</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">Let's Encrypt</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">HSTS enabled</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Yes</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Certificate pinning</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Enabled</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Cipher suites</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">ChaCha20-Poly1305</span></div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><KeyRound className="w-5 h-5" /></div>
                <div><h3 className="text-sm font-semibold text-ink">Password & credential security</h3><p className="text-[11px] text-ink/50">Authentication data protection</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Password hashing</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">bcrypt (12 rounds)</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Min password length</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">12 chars</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Password complexity</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Enforced</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">JWT token expiry</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">8 hours</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">API key encryption</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Hashed at rest</span></div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><FileLock2 className="w-5 h-5" /></div>
                <div><h3 className="text-sm font-semibold text-ink">Sensitive data handling</h3><p className="text-[11px] text-ink/50">PHI & PII protection</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Field-level encryption</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Enabled</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">PII fields encrypted</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">SSN, DOB, Phone</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">PHI fields encrypted</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-600 font-medium">Diagnosis, Rx</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Data masking</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Non-admin views</span></div>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-canvas"><span className="text-xs text-ink/70">Secure delete</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">Crypto-shredding</span></div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          BACKUP
         ════════════════════════════════════════════ */}
      {tab === 'backup' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><Database className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">Daily</div><div className="text-[11px] text-ink/50">Backup frequency</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">30</div><div className="text-[11px] text-ink/50">Day retention</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Server className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">3-2-1</div><div className="text-[11px] text-ink/50">Backup strategy</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">99.9%</div><div className="text-[11px] text-ink/50">Recovery success</div></div></div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Backup schedule</h3>
              <div className="space-y-2">
                {[
                  { name: 'Full database backup', freq: 'Daily at 02:00 UTC', size: '1.2 GB', status: 'Completed', time: '6h ago' },
                  { name: 'Incremental backup', freq: 'Every 4 hours', size: '45 MB', status: 'Completed', time: '1h ago' },
                  { name: 'File storage backup', freq: 'Daily at 03:00 UTC', size: '3.8 GB', status: 'Completed', time: '5h ago' },
                  { name: 'Transaction log backup', freq: 'Every 15 min', size: '2.1 MB', status: 'Completed', time: '12m ago' },
                  { name: 'Weekly archive', freq: 'Sundays at 04:00 UTC', size: '12 GB', status: 'Completed', time: '2d ago' },
                ].map((b) => (
                  <div key={b.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
                    <CheckCircle2 className="w-4 h-4 text-plum shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{b.name}</div>
                      <div className="text-[11px] text-ink/50">{b.freq} · {b.size}</div>
                    </div>
                    <div className="text-right shrink-0"><span className="text-[10px] px-2 py-0.5 rounded-full bg-lilac text-plum font-medium">{b.status}</span><div className="text-[10px] text-ink/40 mt-0.5">{b.time}</div></div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Backup strategy (3-2-1 rule)</h3>
              <div className="space-y-3">
                <div className="rounded-xl bg-canvas p-4">
                  <div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-plum">3</span><span className="text-sm text-ink">Copies of data</span></div>
                  <div className="text-[11px] text-ink/50">Primary database + 2 backup copies maintained at all times.</div>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-sky-600">2</span><span className="text-sm text-ink">Different storage media</span></div>
                  <div className="text-[11px] text-ink/50">Backups stored on cloud object storage and encrypted tape archive.</div>
                </div>
                <div className="rounded-xl bg-canvas p-4">
                  <div className="flex items-center gap-2 mb-1"><span className="text-sm font-semibold text-coral">1</span><span className="text-sm text-ink">Offsite copy</span></div>
                  <div className="text-[11px] text-ink/50">One backup copy stored in a different geographic region for disaster recovery.</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-line">
                <div className="text-xs font-medium text-ink mb-2">Recovery capabilities</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-canvas px-3 py-2"><div className="text-[10px] text-ink/50">RTO (Recovery Time)</div><div className="text-sm font-semibold text-ink">&lt; 4 hours</div></div>
                  <div className="rounded-lg bg-canvas px-3 py-2"><div className="text-[10px] text-ink/50">RPO (Data Loss)</div><div className="text-sm font-semibold text-ink">&lt; 15 min</div></div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════
          PRIVACY (GDPR)
         ════════════════════════════════════════════ */}
      {tab === 'privacy' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><FileLock2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{db.owners.length}</div><div className="text-[11px] text-ink/50">Data subjects</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Clock className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">30 days</div><div className="text-[11px] text-ink/50">DSAR response time</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><Trash2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">3</div><div className="text-[11px] text-ink/50">Deletion requests</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Mail className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">7</div><div className="text-[11px] text-ink/50">Consent records</div></div></div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">GDPR-inspired privacy rights</h3>
              <div className="space-y-2">
                {[
                  { right: 'Right to access', desc: 'Data subjects can request a copy of all their personal data.', status: 'Implemented' },
                  { right: 'Right to rectification', desc: 'Data subjects can correct inaccurate personal information.', status: 'Implemented' },
                  { right: 'Right to erasure', desc: 'Data subjects can request permanent deletion of their data.', status: 'Implemented' },
                  { right: 'Right to restrict processing', desc: 'Data subjects can limit how their data is used.', status: 'Implemented' },
                  { right: 'Right to data portability', desc: 'Data subjects can export their data in a standard format.', status: 'Implemented' },
                  { right: 'Right to object', desc: 'Data subjects can object to certain processing activities.', status: 'Implemented' },
                  { right: 'Right to withdraw consent', desc: 'Data subjects can withdraw consent at any time.', status: 'Implemented' },
                ].map((r) => (
                  <div key={r.right} className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-line">
                    <CheckCircle2 className="w-4 h-4 text-plum shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{r.right}</div>
                      <div className="text-[11px] text-ink/50 mt-0.5">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Data subject access requests (DSARs)</h3>
              <div className="space-y-2">
                {[
                  { id: 'dsar1', subject: 'Eleanor Hayes', type: 'Data export', date: '2026-09-28', status: 'Completed' },
                  { id: 'dsar2', subject: 'Maria Santos', type: 'Data deletion', date: '2026-10-02', status: 'Pending' },
                  { id: 'dsar3', subject: 'James Wilson', type: 'Data correction', date: '2026-09-20', status: 'Completed' },
                  { id: 'dsar4', subject: 'Sarah Connor', type: 'Consent withdrawal', date: '2026-10-05', status: 'In progress' },
                ].map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line">
                    <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{d.subject}</div>
                      <div className="text-[11px] text-ink/50">{d.type} · {d.date}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${d.status === 'Completed' ? 'bg-lilac text-plum' : d.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-4">Consent management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { purpose: 'Treatment & medical records', lawful: 'Legitimate interest', consent: 'Required' },
                { purpose: 'Appointment reminders (SMS/Email)', lawful: 'Consent', consent: 'Optional' },
                { purpose: 'Marketing communications', lawful: 'Consent', consent: 'Optional' },
                { purpose: 'Data sharing with insurance', lawful: 'Contract', consent: 'Required' },
                { purpose: 'Pet photos on social media', lawful: 'Consent', consent: 'Optional' },
                { purpose: 'Research & anonymized analytics', lawful: 'Consent', consent: 'Optional' },
              ].map((c) => (
                <div key={c.purpose} className="rounded-xl bg-canvas p-4">
                  <div className="text-sm font-medium text-ink">{c.purpose}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-600">{c.lawful}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.consent === 'Required' ? 'bg-coral/15 text-coral' : 'bg-lilac text-plum'}`}>{c.consent}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════
          COMPLIANCE (HIPAA)
         ════════════════════════════════════════════ */}
      {tab === 'compliance' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-plum/10 text-plum flex items-center justify-center"><HeartPulse className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">All</div><div className="text-[11px] text-ink/50">Required safeguards</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><Shield className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">Encrypted</div><div className="text-[11px] text-ink/50">PHI at rest</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><ScrollText className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">7yr</div><div className="text-[11px] text-ink/50">Audit log retention</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-lilac text-plum flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">Compliant</div><div className="text-[11px] text-ink/50">Current status</div></div></div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Administrative safeguards</h3>
              <div className="space-y-2">
                {[
                  'Security officer designated',
                  'Workforce training program',
                  'Access management procedures',
                  'Contingency plan established',
                  'Incident response procedures',
                  'Business associate agreements',
                ].map((s) => (
                  <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas">
                    <CheckCircle2 className="w-4 h-4 text-plum shrink-0" />
                    <span className="text-xs text-ink/70">{s}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Physical safeguards</h3>
              <div className="space-y-2">
                {[
                  'Facility access controls',
                  'Workstation security policies',
                  'Device & media disposal procedures',
                  'Offsite backup storage',
                  'Secure server room access',
                  'Mobile device management',
                ].map((s) => (
                  <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas">
                    <CheckCircle2 className="w-4 h-4 text-plum shrink-0" />
                    <span className="text-xs text-ink/70">{s}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-ink mb-4">Technical safeguards</h3>
              <div className="space-y-2">
                {[
                  'Unique user identification',
                  'Automatic logoff (8h timeout)',
                  'Encryption & decryption of PHI',
                  'Audit log controls',
                  'Integrity controls',
                  'Transmission security (TLS 1.3)',
                ].map((s) => (
                  <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-canvas">
                    <CheckCircle2 className="w-4 h-4 text-plum shrink-0" />
                    <span className="text-xs text-ink/70">{s}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 mt-4">
            <h3 className="text-sm font-semibold text-ink mb-4">PHI (Protected Health Information) handling</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-canvas p-4">
                <div className="text-sm font-medium text-ink mb-2">Minimum necessary standard</div>
                <div className="text-[11px] text-ink/60 leading-relaxed">Staff only access the minimum PHI required to perform their duties. Role-based access controls enforce this — e.g., groomers cannot view medical diagnoses, and receptionists cannot view detailed treatment plans.</div>
              </div>
              <div className="rounded-xl bg-canvas p-4">
                <div className="text-sm font-medium text-ink mb-2">Breach notification protocol</div>
                <div className="text-[11px] text-ink/60 leading-relaxed">In case of a data breach affecting PHI: notify affected individuals within 60 days, notify the relevant regulatory body, and document the breach in the incident log with remediation steps.</div>
              </div>
              <div className="rounded-xl bg-canvas p-4">
                <div className="text-sm font-medium text-ink mb-2">De-identification for research</div>
                <div className="text-[11px] text-ink/60 leading-relaxed">Data used for research or analytics is de-identified by removing: owner names, phone numbers, email addresses, pet names, and microchip numbers. Only aggregate statistics are reported.</div>
              </div>
              <div className="rounded-xl bg-canvas p-4">
                <div className="text-sm font-medium text-ink mb-2">Business associate agreements (BAA)</div>
                <div className="text-[11px] text-ink/60 leading-relaxed">All third-party service providers with access to PHI have signed BAAs: cloud hosting provider, backup storage provider, payment processor, and email/SMS gateway.</div>
              </div>
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}
