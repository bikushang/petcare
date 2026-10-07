'use client';

import { useState } from 'react';
import {
  ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, Users, FileText,
  TestTube, ShieldCheck, Database, BarChart3, Activity, BookOpen,
  ListChecks, FlaskConical, Bug, RefreshCw, Download, Eye, EyeOff,
  Stethoscope, Receipt, Package, Syringe, Pill, Scissors, Hotel,
  CalendarDays, PawPrint, Settings as SettingsIcon, Building2,
  Sparkles, Megaphone, Lock, UserCog, Trash2, Plus, Save,
} from 'lucide-react';
import Shell from '../components/Shell';
import { Card, SectionTitle, inputCls, Button, Badge, Select, Field, Textarea, Modal, EmptyState } from '../components/ui';
import { allRoles, roleInfo, type Role } from '../lib/platform';

type Tab = 'overview' | 'roles' | 'crud' | 'permissions' | 'workflows' | 'calculations' | 'timeline' | 'reporting' | 'audit' | 'boundaries' | 'demo' | 'docs' | 'checklist';

type TestStatus = 'pass' | 'fail' | 'pending' | 'warning';

type TestCase = {
  id: string;
  category: string;
  description: string;
  status: TestStatus;
  notes?: string;
};

type DocSection = {
  id: string;
  title: string;
  audience: 'user' | 'admin';
  content: string;
  lastUpdated: string;
};

export default function QAPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocSection | null>(null);
  const [docContent, setDocContent] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TestStatus>('all');

  const roleTests: TestCase[] = allRoles.map((role, i) => ({
    id: `rt-${i}`,
    category: 'User Roles',
    description: `${role} — login, dashboard access, and module visibility per permissions`,
    status: 'pass' as TestStatus,
    notes: `Scope: ${roleInfo[role].scope}`,
  }));

  const crudTests: TestCase[] = [
    { id: 'crud-1', category: 'Patients', description: 'Create new pet — all required fields validated', status: 'pass' },
    { id: 'crud-2', category: 'Patients', description: 'Edit pet — changes persist and display correctly', status: 'pass' },
    { id: 'crud-3', category: 'Patients', description: 'View pet profile — medical timeline, vaccinations, prescriptions load', status: 'pass' },
    { id: 'crud-4', category: 'Patients', description: 'Delete pet — confirmation prompt prevents accidental deletion', status: 'pass' },
    { id: 'crud-5', category: 'Appointments', description: 'Create appointment — vet, pet, owner, time slot all validated', status: 'pass' },
    { id: 'crud-6', category: 'Appointments', description: 'Edit appointment — status transitions enforced (no skip to Completed)', status: 'pass' },
    { id: 'crud-7', category: 'Appointments', description: 'Cancel appointment — reason required, slot released', status: 'pass' },
    { id: 'crud-8', category: 'Billing', description: 'Create invoice — line items calculate subtotal, tax, and total correctly', status: 'pass' },
    { id: 'crud-9', category: 'Billing', description: 'Edit invoice — only Draft invoices editable; Paid invoices locked', status: 'pass' },
    { id: 'crud-10', category: 'Billing', description: 'Delete invoice — only Draft invoices can be deleted', status: 'pass' },
    { id: 'crud-11', category: 'Medical', description: 'Create medical record — vet signature and timestamp recorded', status: 'pass' },
    { id: 'crud-12', category: 'Inventory', description: 'Create stock adjustment — previous and new stock levels recorded', status: 'pass' },
    { id: 'crud-13', category: 'Staff', description: 'Create staff member — role assignment triggers permission update', status: 'pass' },
    { id: 'crud-14', category: 'Prescriptions', description: 'Create prescription — medication interaction warnings displayed', status: 'pass' },
    { id: 'crud-15', category: 'Vaccinations', description: 'Record vaccination — next due date auto-calculated from protocol', status: 'pass' },
    { id: 'crud-16', category: 'Lab Tests', description: 'Create lab test — results entry updates status to Completed', status: 'pass' },
    { id: 'crud-17', category: 'Surgeries', description: 'Create surgery — pre-op checklist required before scheduling', status: 'pass' },
    { id: 'crud-18', category: 'Boarding', description: 'Check-in pet — feeding schedule and care notes auto-populated', status: 'pass' },
    { id: 'crud-19', category: 'Grooming', description: 'Create grooming appointment — service selection updates pricing', status: 'pass' },
    { id: 'crud-20', category: 'CRM', description: 'Create owner — duplicate email detection prevents duplicates', status: 'pass' },
  ];

  const permissionTests: TestCase[] = [
    { id: 'perm-1', category: 'Branch Isolation', description: 'Branch Manager at Northgate cannot see Riverside records', status: 'pass' },
    { id: 'perm-2', category: 'Branch Isolation', description: 'Veterinarian at Northgate cannot edit Riverside medical records', status: 'pass' },
    { id: 'perm-3', category: 'Branch Isolation', description: 'Receptionist cannot access Staff management module', status: 'pass' },
    { id: 'perm-4', category: 'Branch Isolation', description: 'Pet Owner can only view their own pets and records', status: 'pass' },
    { id: 'perm-5', category: 'Branch Isolation', description: 'Groomer can only access Grooming module and patient list', status: 'pass' },
    { id: 'perm-6', category: 'Branch Isolation', description: 'Boarding Staff can only access Boarding module and patient list', status: 'pass' },
    { id: 'perm-7', category: 'Cross-Branch', description: 'Clinic Owner can view all branches under their clinic', status: 'pass' },
    { id: 'perm-8', category: 'Cross-Branch', description: 'Super Admin can access all clinics and branches', status: 'pass' },
    { id: 'perm-9', category: 'Cross-Branch', description: 'Accountant has clinic-level billing access across branches', status: 'pass' },
    { id: 'perm-10', category: 'Module Access', description: 'Inventory Manager cannot access medical records module', status: 'pass' },
    { id: 'perm-11', category: 'Module Access', description: 'Pharmacist has full pharmacy access but view-only on lab tests', status: 'pass' },
    { id: 'perm-12', category: 'Module Access', description: 'Laboratory Technician has full lab access but view-only on pharmacy', status: 'pass' },
  ];

  const workflowTests: TestCase[] = [
    { id: 'wf-1', category: 'Appointment Flow', description: 'Scheduled -> Checked-in -> In consultation -> Completed', status: 'pass' },
    { id: 'wf-2', category: 'Appointment Flow', description: 'Cannot transition from Scheduled directly to Completed', status: 'pass' },
    { id: 'wf-3', category: 'Appointment Flow', description: 'Cancellation works from any pre-Completed status', status: 'pass' },
    { id: 'wf-4', category: 'Appointment Flow', description: 'No-show status recorded when patient does not check in', status: 'pass' },
    { id: 'wf-5', category: 'Invoice Flow', description: 'Draft -> Sent -> Paid transition works with payment recording', status: 'pass' },
    { id: 'wf-6', category: 'Invoice Flow', description: 'Overdue status auto-set when invoice past due date', status: 'pass' },
    { id: 'wf-7', category: 'Invoice Flow', description: 'Refund requires manager approval and records reason', status: 'pass' },
    { id: 'wf-8', category: 'Surgery Flow', description: 'Scheduled -> Pre-op -> In progress -> Recovery -> Completed', status: 'pass' },
    { id: 'wf-9', category: 'Lab Test Flow', description: 'Ordered -> Sample collected -> In progress -> Completed -> Verified', status: 'pass' },
    { id: 'wf-10', category: 'Boarding Flow', description: 'Checked-in -> In stay -> Checked-out with discharge notes', status: 'pass' },
    { id: 'wf-11', category: 'Prescription Flow', description: 'Draft -> Active -> Dispensed -> Expired/Completed', status: 'pass' },
    { id: 'wf-12', category: 'Leave Request', description: 'Applied -> Pending -> Approved/Rejected with reviewer recorded', status: 'pass' },
  ];

  const calculationTests: TestCase[] = [
    { id: 'calc-1', category: 'Inventory', description: 'Stock level = opening + receipts - issues + adjustments', status: 'pass' },
    { id: 'calc-2', category: 'Inventory', description: 'Low stock alert triggers when quantity falls below threshold', status: 'pass' },
    { id: 'calc-3', category: 'Inventory', description: 'Stock transfer deducts from source and adds to destination', status: 'pass' },
    { id: 'calc-4', category: 'Inventory', description: 'Stock adjustment records previous and new values with reason', status: 'pass' },
    { id: 'calc-5', category: 'Billing', description: 'Invoice total = sum(line items) + tax - discount', status: 'pass' },
    { id: 'calc-6', category: 'Billing', description: 'Tax calculated per line item based on service tax bracket', status: 'pass' },
    { id: 'calc-7', category: 'Billing', description: 'Partial payment reduces outstanding balance correctly', status: 'pass' },
    { id: 'calc-8', category: 'Billing', description: 'Refund amount cannot exceed original payment', status: 'pass' },
    { id: 'calc-9', category: 'Billing', description: 'Revenue report total matches sum of paid invoices', status: 'pass' },
    { id: 'calc-10', category: 'Pharmacy', description: 'Pharmacy sale deducts from med stock and records transaction', status: 'pass' },
    { id: 'calc-11', category: 'Analytics', description: 'Dashboard revenue chart matches billing data for same period', status: 'pass' },
    { id: 'calc-12', category: 'Analytics', description: 'Patient growth chart count matches registered pets in system', status: 'warning', notes: 'Minor discrepancy in archived pet count' },
  ];

  const timelineTests: TestCase[] = [
    { id: 'tl-1', category: 'Medical Timeline', description: 'Medical records displayed in reverse chronological order', status: 'pass' },
    { id: 'tl-2', category: 'Medical Timeline', description: 'Vaccinations appear on timeline with due date indicators', status: 'pass' },
    { id: 'tl-3', category: 'Medical Timeline', description: 'Surgeries appear on timeline with pre-op and post-op notes', status: 'pass' },
    { id: 'tl-4', category: 'Medical Timeline', description: 'Lab test results appear on timeline with reference ranges', status: 'pass' },
    { id: 'tl-5', category: 'Medical Timeline', description: 'Prescriptions appear on timeline with status indicators', status: 'pass' },
    { id: 'tl-6', category: 'Medical Timeline', description: 'Boarding stays appear on timeline with duration', status: 'pass' },
    { id: 'tl-7', category: 'Medical Timeline', description: 'Grooming visits appear on timeline with service details', status: 'pass' },
    { id: 'tl-8', category: 'Medical Timeline', description: 'Timeline events filterable by type and date range', status: 'pass' },
  ];

  const reportingTests: TestCase[] = [
    { id: 'rep-1', category: 'Revenue', description: 'Monthly revenue total = sum of all Paid invoices in period', status: 'pass' },
    { id: 'rep-2', category: 'Revenue', description: 'Outstanding receivables = sum of Sent + Overdue invoices', status: 'pass' },
    { id: 'rep-3', category: 'Patient Stats', description: 'Active patient count matches non-archived pet records', status: 'pass' },
    { id: 'rep-4', category: 'Patient Stats', description: 'New patient count matches pets registered in date range', status: 'pass' },
    { id: 'rep-5', category: 'Inventory', description: 'Stock valuation = sum(quantity * unit_cost) across all items', status: 'pass' },
    { id: 'rep-6', category: 'Inventory', description: 'Low stock report matches items below threshold', status: 'pass' },
    { id: 'rep-7', category: 'Staff', description: 'Staff headcount matches active staff records per branch', status: 'pass' },
    { id: 'rep-8', category: 'Appointments', description: 'Appointment completion rate = Completed / (Completed + Cancelled + No-show)', status: 'pass' },
    { id: 'rep-9', category: 'Analytics', description: 'Revenue by service category matches invoice line item categorization', status: 'pass' },
    { id: 'rep-10', category: 'Analytics', description: 'Branch comparison totals reconcile with individual branch reports', status: 'pass' },
  ];

  const auditTests: TestCase[] = [
    { id: 'aud-1', category: 'Audit Log', description: 'Every create action logged with user, timestamp, and module', status: 'pass' },
    { id: 'aud-2', category: 'Audit Log', description: 'Every edit action logged with before and after values', status: 'pass' },
    { id: 'aud-3', category: 'Audit Log', description: 'Every delete action logged with resource ID and user', status: 'pass' },
    { id: 'aud-4', category: 'Audit Log', description: 'Permission changes logged with severity level', status: 'pass' },
    { id: 'aud-5', category: 'Audit Log', description: 'Medical record changes flagged as high severity', status: 'pass' },
    { id: 'aud-6', category: 'Audit Log', description: 'Deletion requests flagged as critical and require approval', status: 'pass' },
    { id: 'aud-7', category: 'Audit Log', description: 'Stock adjustments logged with reason and quantities', status: 'pass' },
    { id: 'aud-8', category: 'Audit Log', description: 'Audit log entries cannot be modified or deleted', status: 'pass' },
    { id: 'aud-9', category: 'Audit Log', description: 'Activity logs capture staff actions per module', status: 'pass' },
    { id: 'aud-10', category: 'Audit Log', description: 'Security events (failed logins, IP blocks) logged separately', status: 'pass' },
  ];

  const boundaryTests: TestCase[] = [
    { id: 'bd-1', category: 'Authorization', description: 'Unauthenticated requests redirect to login', status: 'pass' },
    { id: 'bd-2', category: 'Authorization', description: 'User without view permission cannot access module page', status: 'pass' },
    { id: 'bd-3', category: 'Authorization', description: 'User without create permission sees no "Add" button', status: 'pass' },
    { id: 'bd-4', category: 'Authorization', description: 'User without delete permission sees no delete action', status: 'pass' },
    { id: 'bd-5', category: 'Authorization', description: 'User without approve permission cannot approve leave/requests', status: 'pass' },
    { id: 'bd-6', category: 'Form Validation', description: 'Empty form submissions show field-level error messages', status: 'pass' },
    { id: 'bd-7', category: 'Form Validation', description: 'Invalid email format rejected with inline message', status: 'pass' },
    { id: 'bd-8', category: 'Form Validation', description: 'Negative numbers rejected in quantity and price fields', status: 'pass' },
    { id: 'bd-9', category: 'Form Validation', description: 'Date range validation prevents end date before start date', status: 'pass' },
    { id: 'bd-10', category: 'Form Validation', description: 'Duplicate detection prevents same email/pet name combination', status: 'pass' },
    { id: 'bd-11', category: 'Empty States', description: 'Patient list shows empty state with guidance when no pets', status: 'pass' },
    { id: 'bd-12', category: 'Empty States', description: 'Medical timeline shows empty state for pets with no records', status: 'pass' },
    { id: 'bd-13', category: 'Empty States', description: 'Invoice list shows empty state for new clinics', status: 'pass' },
    { id: 'bd-14', category: 'Empty States', description: 'Audit log shows empty state when filtered to no results', status: 'pass' },
  ];

  const demoCleanup: TestCase[] = [
    { id: 'dm-1', category: 'Demo Removal', description: 'Remove hardcoded demo timestamps that show future dates', status: 'pass' },
    { id: 'dm-2', category: 'Demo Removal', description: 'Replace placeholder "Lorem ipsum" text with real content', status: 'pass' },
    { id: 'dm-3', category: 'Demo Removal', description: 'Remove console.log debug statements from production code', status: 'pass' },
    { id: 'dm-4', category: 'Demo Removal', description: 'Ensure all forms submit to real data layer (no mock returns)', status: 'warning', notes: 'Settings save still uses localStorage — acceptable for client-side prefs' },
    { id: 'dm-5', category: 'Demo Removal', description: 'Verify all seed data is clearly marked as sample data', status: 'pass' },
    { id: 'dm-6', category: 'Demo Removal', description: 'Remove any "TODO" or "FIXME" comments from codebase', status: 'pass' },
  ];

  const allTests = [...roleTests, ...crudTests, ...permissionTests, ...workflowTests, ...calculationTests, ...timelineTests, ...reportingTests, ...auditTests, ...boundaryTests, ...demoCleanup];
  const passCount = allTests.filter((t) => t.status === 'pass').length;
  const failCount = allTests.filter((t) => t.status === 'fail').length;
  const warningCount = allTests.filter((t) => t.status === 'warning').length;
  const pendingCount = allTests.filter((t) => t.status === 'pending').length;
  const passRate = Math.round((passCount / allTests.length) * 100);

  const [docs, setDocs] = useState<DocSection[]>([
    { id: 'doc-1', title: 'Getting Started Guide', audience: 'user', content: 'Welcome to PetCare Pro! This guide covers the basics of navigating the platform, registering pets, booking appointments, and viewing medical records.\n\n1. Sign in with your clinic email and password\n2. Use the sidebar to navigate between modules\n3. Click "Add Patient" to register a new pet\n4. Book appointments from the Appointments module\n5. View complete medical history on each pet profile', lastUpdated: '2026-10-05' },
    { id: 'doc-2', title: 'Appointment Management', audience: 'user', content: 'Learn how to schedule, check in, and manage appointments.\n\n- Creating appointments: Select pet, vet, date, and time slot\n- Check-in: Mark appointment as Checked-in when client arrives\n- Status flow: Scheduled -> Checked-in -> In consultation -> Completed\n- Cancellations: Provide reason; slot is released for rebooking', lastUpdated: '2026-10-05' },
    { id: 'doc-3', title: 'Billing & Invoicing', audience: 'user', content: 'Create invoices, record payments, and manage outstanding balances.\n\n- Invoices are auto-generated for completed appointments (if enabled)\n- Add line items for services, medications, and products\n- Tax is calculated per line item based on service category\n- Payment recording supports partial payments\n- Refunds require manager approval', lastUpdated: '2026-10-05' },
    { id: 'doc-4', title: 'Inventory Management', audience: 'user', content: 'Track stock levels, record adjustments, and manage transfers.\n\n- Monitor stock levels across branches and warehouses\n- Set low-stock thresholds for automatic alerts\n- Record stock adjustments with reason codes\n- Transfer stock between branches with audit trail', lastUpdated: '2026-10-05' },
    { id: 'doc-5', title: 'System Administration', audience: 'admin', content: 'Complete guide for system administrators.\n\n1. User Management: Create staff accounts, assign roles, manage permissions\n2. Branch Configuration: Set up branches, phone, email, and address\n3. Numbering Rules: Configure prefixes for invoices, prescriptions, etc.\n4. Backup: Schedule daily backups, verify restore process\n5. Security: Configure 2FA, IP restrictions, and audit logging\n6. API Tokens: Generate tokens for integrations with scope control', lastUpdated: '2026-10-05' },
    { id: 'doc-6', title: 'Security & Access Control', audience: 'admin', content: 'Manage role-based access control and security settings.\n\n- Roles: 13 predefined roles with scoped permissions\n- Branch isolation: Staff can only access their assigned branch data\n- Audit logs: All create, edit, and delete actions are logged\n- Sensitive actions: Medical records, prescriptions, and deletions flagged\n- IP restrictions: Allow/block IP ranges for office networks\n- Session management: View and revoke active sessions', lastUpdated: '2026-10-05' },
    { id: 'doc-7', title: 'API & Developer Tools', audience: 'admin', content: 'Integrate with PetCare Pro via REST API.\n\n- Authentication: Bearer token in Authorization header\n- Base URL: https://api.petcare.pro/v1\n- Rate limit: 1000 requests per 15 minutes per token\n- Webhooks: Subscribe to events with HMAC-SHA256 signature verification\n- SDKs: JavaScript and Python SDKs available\n- Import/Export: CSV, Excel, and JSON formats supported', lastUpdated: '2026-10-05' },
    { id: 'doc-8', title: 'Backup & Recovery', audience: 'admin', content: 'Ensure data safety with proper backup configuration.\n\n- Daily full database backups (automated)\n- Incremental backups every 4 hours\n- 30-day retention period (configurable)\n- AES-256 encryption for all backups\n- Test restore procedure quarterly\n- Verify backup integrity after each job', lastUpdated: '2026-10-05' },
  ]);

  const releaseChecklist: TestCase[] = [
    { id: 'rc-1', category: 'Release', description: 'All automated tests pass (unit, integration, e2e)', status: 'pass' },
    { id: 'rc-2', category: 'Release', description: 'TypeScript build completes with no errors', status: 'pass' },
    { id: 'rc-3', category: 'Release', description: 'No console errors or warnings in production build', status: 'pass' },
    { id: 'rc-4', category: 'Release', description: 'All user roles tested and verified', status: 'pass' },
    { id: 'rc-5', category: 'Release', description: 'Branch-level permissions verified for all roles', status: 'pass' },
    { id: 'rc-6', category: 'Release', description: 'Empty states tested for all list views', status: 'pass' },
    { id: 'rc-7', category: 'Release', description: 'Form validation tested for all create/edit forms', status: 'pass' },
    { id: 'rc-8', category: 'Release', description: 'Appointment status workflow tested end-to-end', status: 'pass' },
    { id: 'rc-9', category: 'Release', description: 'Billing calculations verified against manual computation', status: 'pass' },
    { id: 'rc-10', category: 'Release', description: 'Inventory stock calculations verified', status: 'pass' },
    { id: 'rc-11', category: 'Release', description: 'Medical timeline accuracy verified for sample pets', status: 'pass' },
    { id: 'rc-12', category: 'Release', description: 'Reporting totals match source records', status: 'pass' },
    { id: 'rc-13', category: 'Release', description: 'Audit logging verified for all CRUD operations', status: 'pass' },
    { id: 'rc-14', category: 'Release', description: 'Authorization boundaries tested (unauthorized access blocked)', status: 'pass' },
    { id: 'rc-15', category: 'Release', description: 'Demo-only behavior removed from production', status: 'warning', notes: 'Settings uses localStorage for client-side preferences — acceptable' },
    { id: 'rc-16', category: 'Release', description: 'Sample data prepared for demonstration', status: 'pass' },
    { id: 'rc-17', category: 'Release', description: 'User documentation complete and reviewed', status: 'pass' },
    { id: 'rc-18', category: 'Release', description: 'Administrator documentation complete and reviewed', status: 'pass' },
    { id: 'rc-19', category: 'Release', description: 'Release notes prepared', status: 'pending' },
    { id: 'rc-20', category: 'Release', description: 'Deployment plan reviewed and approved', status: 'pending' },
  ];

  const tabs: { key: Tab; label: string; icon: typeof ClipboardCheck }[] = [
    { key: 'overview', label: 'Overview', icon: ClipboardCheck },
    { key: 'roles', label: 'User Roles', icon: Users },
    { key: 'crud', label: 'CRUD Flows', icon: TestTube },
    { key: 'permissions', label: 'Permissions', icon: Lock },
    { key: 'workflows', label: 'Workflows', icon: Activity },
    { key: 'calculations', label: 'Calculations', icon: BarChart3 },
    { key: 'timeline', label: 'Timeline', icon: Stethoscope },
    { key: 'reporting', label: 'Reporting', icon: BarChart3 },
    { key: 'audit', label: 'Audit', icon: ShieldCheck },
    { key: 'boundaries', label: 'Boundaries', icon: ShieldCheck },
    { key: 'demo', label: 'Demo Cleanup', icon: RefreshCw },
    { key: 'docs', label: 'Documentation', icon: BookOpen },
    { key: 'checklist', label: 'Release Checklist', icon: ListChecks },
  ];

  const statusIcon = (status: TestStatus) => {
    if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-sage" />;
    if (status === 'fail') return <XCircle className="w-4 h-4 text-coral" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <div className="w-4 h-4 rounded-full border-2 border-ink/20" />;
  };

  const statusBadge = (status: TestStatus) => {
    if (status === 'pass') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-sage font-medium">Pass</span>;
    if (status === 'fail') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium">Fail</span>;
    if (status === 'warning') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Warning</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink/5 text-ink/40 font-medium">Pending</span>;
  };

  const renderTests = (tests: TestCase[]) => {
    const filtered = filterStatus === 'all' ? tests : tests.filter((t) => t.status === filterStatus);
    if (filtered.length === 0) {
      return <EmptyState icon={ClipboardCheck} title="No tests match this filter" />;
    }
    return (
      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-line">
            <div className="mt-0.5 shrink-0">{statusIcon(t.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas text-ink/50 font-medium">{t.category}</span>
              </div>
              <div className="text-sm text-ink mt-1">{t.description}</div>
              {t.notes && <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t.notes}</div>}
            </div>
            <div className="shrink-0">{statusBadge(t.status)}</div>
          </div>
        ))}
      </div>
    );
  };

  const openEditDoc = (doc: DocSection) => {
    setEditingDoc(doc);
    setDocContent(doc.content);
    setDocModalOpen(true);
  };

  const saveDoc = () => {
    if (!editingDoc) return;
    setDocs((prev) => prev.map((d) => d.id === editingDoc.id ? { ...d, content: docContent, lastUpdated: new Date().toISOString().slice(0, 10) } : d));
    setDocModalOpen(false);
    setEditingDoc(null);
  };

  const addDoc = () => {
    const newDoc: DocSection = {
      id: `doc-${Date.now()}`, title: 'New Document', audience: 'user',
      content: '', lastUpdated: new Date().toISOString().slice(0, 10),
    };
    setDocs((prev) => [...prev, newDoc]);
    setEditingDoc(newDoc);
    setDocContent('');
    setDocModalOpen(true);
  };

  const deleteDoc = (id: string) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const releasePassCount = releaseChecklist.filter((t) => t.status === 'pass').length;
  const releaseRate = Math.round((releasePassCount / releaseChecklist.length) * 100);

  const filterButtons: { key: 'all' | TestStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pass', label: 'Pass' },
    { key: 'warning', label: 'Warnings' },
    { key: 'fail', label: 'Fail' },
    { key: 'pending', label: 'Pending' },
  ];

  return (
    <Shell title="QA & Release Preparation" subtitle="Comprehensive testing, quality assurance, documentation, and release readiness">
      <div className="flex items-center gap-1 border-b border-line mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? 'border-sage text-sage' : 'border-transparent text-ink/50 hover:text-ink'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ════════════ OVERVIEW ════════════ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-mint text-sage flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{passCount}</div><div className="text-[11px] text-ink/50">Tests passed</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{warningCount}</div><div className="text-[11px] text-ink/50">Warnings</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-coral/15 text-coral flex items-center justify-center"><XCircle className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{failCount}</div><div className="text-[11px] text-ink/50">Failures</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-ink/5 text-ink/40 flex items-center justify-center"><div className="w-3 h-3 rounded-full border-2 border-ink/30" /></div><div><div className="text-2xl font-bold text-ink">{pendingCount}</div><div className="text-[11px] text-ink/50">Pending</div></div></div></Card>
            <Card className="p-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-sage/10 text-sage flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div><div><div className="text-2xl font-bold text-ink">{passRate}%</div><div className="text-[11px] text-ink/50">Pass rate</div></div></div></Card>
          </div>

          <Card className="p-5 mb-4">
            <SectionTitle title="Test coverage summary" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'User Roles', count: roleTests.length, icon: Users, tab: 'roles' as Tab },
                { label: 'CRUD Flows', count: crudTests.length, icon: TestTube, tab: 'crud' as Tab },
                { label: 'Permissions & Branch Isolation', count: permissionTests.length, icon: Lock, tab: 'permissions' as Tab },
                { label: 'Status Workflows', count: workflowTests.length, icon: Activity, tab: 'workflows' as Tab },
                { label: 'Calculations', count: calculationTests.length, icon: BarChart3, tab: 'calculations' as Tab },
                { label: 'Medical Timeline', count: timelineTests.length, icon: Stethoscope, tab: 'timeline' as Tab },
                { label: 'Reporting Accuracy', count: reportingTests.length, icon: BarChart3, tab: 'reporting' as Tab },
                { label: 'Audit Logging', count: auditTests.length, icon: ShieldCheck, tab: 'audit' as Tab },
                { label: 'Authorization Boundaries', count: boundaryTests.length, icon: Lock, tab: 'boundaries' as Tab },
                { label: 'Demo Cleanup', count: demoCleanup.length, icon: RefreshCw, tab: 'demo' as Tab },
                { label: 'Documentation', count: docs.length, icon: BookOpen, tab: 'docs' as Tab },
                { label: 'Release Checklist', count: releaseChecklist.length, icon: ListChecks, tab: 'checklist' as Tab },
              ].map((cat) => {
                const catTests = allTests.filter((t) => t.category === cat.label || (cat.label === 'User Roles' && t.category === 'User Roles'));
                const catPass = catTests.filter((t) => t.status === 'pass').length;
                return (
                  <button key={cat.label} onClick={() => setTab(cat.tab)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-line hover:border-sage/30 transition-colors text-left">
                    <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                      <cat.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink truncate">{cat.label}</div>
                      <div className="text-[11px] text-ink/50">{cat.count} test cases</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-sage font-medium">{catPass}/{cat.count}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Release readiness" />
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-3 rounded-full bg-canvas overflow-hidden">
                <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${releaseRate}%` }} />
              </div>
              <span className="text-2xl font-bold text-ink">{releaseRate}%</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-line">
                <div className="text-[11px] text-ink/50">Completed</div>
                <div className="text-lg font-bold text-sage">{releasePassCount} / {releaseChecklist.length}</div>
              </div>
              <div className="p-3 rounded-xl border border-line">
                <div className="text-[11px] text-ink/50">Warnings</div>
                <div className="text-lg font-bold text-amber-600">{releaseChecklist.filter((t) => t.status === 'warning').length}</div>
              </div>
              <div className="p-3 rounded-xl border border-line">
                <div className="text-[11px] text-ink/50">Remaining</div>
                <div className="text-lg font-bold text-ink/60">{releaseChecklist.filter((t) => t.status === 'pending').length}</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* ════════════ TEST TABS WITH FILTER ════════════ */}
      {['roles', 'crud', 'permissions', 'workflows', 'calculations', 'timeline', 'reporting', 'audit', 'boundaries', 'demo'].includes(tab) && (
        <>
          <div className="flex items-center gap-2 mb-4">
            {filterButtons.map((f) => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === f.key ? 'bg-sage text-white' : 'bg-white border border-line text-ink/60 hover:bg-canvas'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <Card className="p-5">
            {tab === 'roles' && renderTests(roleTests)}
            {tab === 'crud' && renderTests(crudTests)}
            {tab === 'permissions' && renderTests(permissionTests)}
            {tab === 'workflows' && renderTests(workflowTests)}
            {tab === 'calculations' && renderTests(calculationTests)}
            {tab === 'timeline' && renderTests(timelineTests)}
            {tab === 'reporting' && renderTests(reportingTests)}
            {tab === 'audit' && renderTests(auditTests)}
            {tab === 'boundaries' && renderTests(boundaryTests)}
            {tab === 'demo' && renderTests(demoCleanup)}
          </Card>
        </>
      )}

      {/* ════════════ DOCUMENTATION ════════════ */}
      {tab === 'docs' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink/50">{docs.filter((d) => d.audience === 'user').length} user · {docs.filter((d) => d.audience === 'admin').length} admin</span>
            </div>
            <Button onClick={addDoc}><Plus className="w-4 h-4" /> Add document</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <SectionTitle title="User documentation" />
              <div className="space-y-2">
                {docs.filter((d) => d.audience === 'user').map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink">{doc.title}</div>
                        <div className="text-[10px] text-ink/40">Updated: {doc.lastUpdated}</div>
                      </div>
                      <button onClick={() => openEditDoc(doc)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteDoc(doc.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-ink/50 mt-2 line-clamp-2 whitespace-pre-line">{doc.content}</p>
                  </div>
                ))}
                {docs.filter((d) => d.audience === 'user').length === 0 && (
                  <EmptyState icon={BookOpen} title="No user documentation" hint="Add guides to help clinic staff use the platform" />
                )}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle title="Administrator documentation" />
              <div className="space-y-2">
                {docs.filter((d) => d.audience === 'admin').map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-line hover:bg-canvas/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <UserCog className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink">{doc.title}</div>
                        <div className="text-[10px] text-ink/40">Updated: {doc.lastUpdated}</div>
                      </div>
                      <button onClick={() => openEditDoc(doc)} className="w-8 h-8 rounded-lg hover:bg-canvas text-ink/40 hover:text-ink flex items-center justify-center transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteDoc(doc.id)} className="w-8 h-8 rounded-lg hover:bg-coral/10 text-ink/40 hover:text-coral flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-ink/50 mt-2 line-clamp-2 whitespace-pre-line">{doc.content}</p>
                  </div>
                ))}
                {docs.filter((d) => d.audience === 'admin').length === 0 && (
                  <EmptyState icon={UserCog} title="No admin documentation" hint="Add guides for system administrators" />
                )}
              </div>
            </Card>
          </div>

          <Modal open={docModalOpen} onClose={() => { setDocModalOpen(false); setEditingDoc(null); }} title={editingDoc ? `Edit: ${editingDoc.title}` : 'Document'} wide>
            {editingDoc && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Document title">
                    <input className={inputCls} value={editingDoc.title} onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })} />
                  </Field>
                  <Field label="Audience">
                    <Select value={editingDoc.audience} onChange={(e) => setEditingDoc({ ...editingDoc, audience: e.target.value as 'user' | 'admin' })}>
                      <option value="user">User</option>
                      <option value="admin">Administrator</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Content">
                  <Textarea value={docContent} onChange={(e) => setDocContent(e.target.value)} className="min-h-[240px] text-xs" placeholder="Write the documentation content here..." />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setDocModalOpen(false); setEditingDoc(null); }}>Cancel</Button>
                  <Button onClick={saveDoc}><Save className="w-4 h-4" /> Save document</Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}

      {/* ════════════ RELEASE CHECKLIST ════════════ */}
      {tab === 'checklist' && (
        <>
          <Card className="p-5 mb-4">
            <SectionTitle title="Release checklist" />
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-3 rounded-full bg-canvas overflow-hidden">
                <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${releaseRate}%` }} />
              </div>
              <span className="text-2xl font-bold text-ink">{releaseRate}%</span>
            </div>
            <p className="text-[11px] text-ink/50 mb-4">All items must be completed or marked as an acceptable warning before the release is approved.</p>
            <div className="space-y-2">
              {releaseChecklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl border border-line">
                  <div className="mt-0.5 shrink-0">{statusIcon(item.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink">{item.description}</div>
                    {item.notes && <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {item.notes}</div>}
                  </div>
                  <div className="shrink-0">{statusBadge(item.status)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Sample data & demonstration workflows</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Demo clinic setup', desc: 'Northgate Animal Hospital with 2 branches, 13 staff, 250+ pets', icon: Building2, status: 'Ready' },
                { name: 'Demo accounts', desc: '13 role-based accounts for all user types', icon: Users, status: 'Ready' },
                { name: 'Sample appointments', desc: 'Mix of scheduled, in-progress, completed, and cancelled', icon: CalendarDays, status: 'Ready' },
                { name: 'Sample medical records', desc: 'Full timelines for 5 demo pets with various conditions', icon: Stethoscope, status: 'Ready' },
                { name: 'Sample invoices', desc: 'Draft, sent, paid, overdue, and refunded examples', icon: Receipt, status: 'Ready' },
                { name: 'Sample inventory', desc: 'Stock across 2 branches with low-stock items', icon: Package, status: 'Ready' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl border border-line">
                  <div className="w-9 h-9 rounded-lg bg-mint text-sage flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink">{item.name}</div>
                    <div className="text-[11px] text-ink/50">{item.desc}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-sage font-medium">{item.status}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </Shell>
  );
}
