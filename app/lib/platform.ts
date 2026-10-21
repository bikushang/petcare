import {
  LayoutDashboard,
  PawPrint,
  CalendarDays,
  Stethoscope,
  Syringe,
  Pill,
  Scissors,
  Hotel,
  Receipt,
  Users,
  Building2,
  Settings,
  Activity,
  FileText,
  Stethoscope as SurgeryIcon,
  FlaskConical as LabIcon,
  Warehouse as WarehouseIcon,
  Sparkles,
  Megaphone as CrmIcon,
  BarChart3 as AnalyticsIcon,
  ShieldCheck as SecurityIcon,
  Code2 as DeveloperIcon,
  ClipboardCheck as QaIcon,
  Globe as WebsiteIcon,
  Search as SeoIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Clinics & Branches
   ───────────────────────────────────────────────────────── */

export type Clinic = {
  id: string;
  name: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
};

export type Branch = {
  id: string;
  clinicId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: 'Active' | 'Inactive';
};

export const clinics: Clinic[] = [
  {
    id: 'clinic-vetnora',
    name: 'Vetnora Animal Hospital',
    legalName: 'Vetnora Veterinary Care LLC',
    phone: '+1 415 555 0100',
    email: 'reception@vetnoragp.com',
    address: '128 Maple Avenue, Vetnora, CA 94110',
  },
];

export const branches: Branch[] = [
  {
    id: 'branch-vetnora',
    clinicId: 'clinic-vetnora',
    name: 'Vetnora',
    phone: '+1 415 555 0101',
    email: 'vetnora@petcare.pro',
    address: '128 Maple Avenue, Vetnora, CA 94110',
    status: 'Active',
  },
  {
    id: 'branch-riverside',
    clinicId: 'clinic-vetnora',
    name: 'Riverside',
    phone: '+1 415 555 0102',
    email: 'riverside@petcare.pro',
    address: '42 Riverside Drive, Bayview, CA 94112',
    status: 'Active',
  },
];

export const branchNames = branches.map((b) => b.name);

export function branchById(id: string): Branch | undefined {
  return branches.find((b) => b.id === id);
}

/* ─────────────────────────────────────────────────────────
   Roles
   ───────────────────────────────────────────────────────── */

export type Role =
  | 'Super Admin'
  | 'Clinic Owner'
  | 'Branch Manager'
  | 'Veterinarian'
  | 'Receptionist'
  | 'Veterinary Nurse'
  | 'Laboratory Technician'
  | 'Pharmacist'
  | 'Groomer'
  | 'Boarding Staff'
  | 'Accountant'
  | 'Inventory Manager'
  | 'Pet Owner';

export const allRoles: Role[] = [
  'Super Admin',
  'Clinic Owner',
  'Branch Manager',
  'Veterinarian',
  'Receptionist',
  'Veterinary Nurse',
  'Laboratory Technician',
  'Pharmacist',
  'Groomer',
  'Boarding Staff',
  'Accountant',
  'Inventory Manager',
  'Pet Owner',
];

export type RoleInfo = {
  label: Role;
  description: string;
  scope: 'platform' | 'clinic' | 'branch' | 'individual';
  badgeColor: string;
};

export const roleInfo: Record<Role, RoleInfo> = {
  'Super Admin': {
    label: 'Super Admin',
    description: 'Full platform control across all clinics and branches',
    scope: 'platform',
    badgeColor: 'bg-coral/15 text-coral border-coral/20',
  },
  'Clinic Owner': {
    label: 'Clinic Owner',
    description: 'Owns and manages the clinic and all its branches',
    scope: 'clinic',
    badgeColor: 'bg-plum/10 text-plum border-plum/20',
  },
  'Branch Manager': {
    label: 'Branch Manager',
    description: 'Manages daily operations of a single branch',
    scope: 'branch',
    badgeColor: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  Veterinarian: {
    label: 'Veterinarian',
    description: 'Performs consultations, diagnoses, and treatments',
    scope: 'branch',
    badgeColor: 'bg-lilac text-plum border-lilac',
  },
  Receptionist: {
    label: 'Receptionist',
    description: 'Manages front desk, appointments, and check-ins',
    scope: 'branch',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  'Veterinary Nurse': {
    label: 'Veterinary Nurse',
    description: 'Assists with treatments, monitoring, and patient care',
    scope: 'branch',
    badgeColor: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  'Laboratory Technician': {
    label: 'Laboratory Technician',
    description: 'Handles lab tests, samples, and diagnostic reports',
    scope: 'branch',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  Pharmacist: {
    label: 'Pharmacist',
    description: 'Dispenses medicines and manages pharmacy stock',
    scope: 'branch',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  Groomer: {
    label: 'Groomer',
    description: 'Provides grooming services and maintains grooming records',
    scope: 'branch',
    badgeColor: 'bg-pink-100 text-pink-700 border-pink-200',
  },
  'Boarding Staff': {
    label: 'Boarding Staff',
    description: 'Cares for boarded pets and manages feeding schedules',
    scope: 'branch',
    badgeColor: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  Accountant: {
    label: 'Accountant',
    description: 'Manages invoices, payments, and financial reports',
    scope: 'clinic',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  'Inventory Manager': {
    label: 'Inventory Manager',
    description: 'Tracks stock levels, reorders, and warehouse operations',
    scope: 'branch',
    badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  'Pet Owner': {
    label: 'Pet Owner',
    description: 'Views pet records, appointments, and invoices',
    scope: 'individual',
    badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
};

/* ─────────────────────────────────────────────────────────
   Permissions
   ───────────────────────────────────────────────────────── */

export type Module =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'medical'
  | 'vaccinations'
  | 'prescriptions'
  | 'surgeries'
  | 'labTests'
  | 'pharmacy'
  | 'inventory'
  | 'grooming'
  | 'boarding'
  | 'billing'
  | 'staff'
  | 'branches'
  | 'settings'
  | 'ai'
  | 'crm'
  | 'analytics'
  | 'security'
  | 'developer'
  | 'qa'
  | 'cms'
  | 'seo';

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve';

type PermissionMap = Partial<Record<Module, Action[]>>;

const fullAccess: Action[] = ['view', 'create', 'edit', 'delete', 'approve'];
const manageAccess: Action[] = ['view', 'create', 'edit', 'delete'];
const editAccess: Action[] = ['view', 'create', 'edit'];
const viewAccess: Action[] = ['view'];

export const rolePermissions: Record<Role, PermissionMap> = {
  'Super Admin': {
    dashboard: fullAccess,
    patients: fullAccess,
    appointments: fullAccess,
    medical: fullAccess,
    vaccinations: fullAccess,
    prescriptions: fullAccess,
    surgeries: fullAccess,
    labTests: fullAccess,
    pharmacy: fullAccess,
    inventory: fullAccess,
    grooming: fullAccess,
    boarding: fullAccess,
    billing: fullAccess,
    staff: fullAccess,
    branches: fullAccess,
    settings: fullAccess,
    ai: fullAccess,
    crm: fullAccess,
    analytics: fullAccess,
    security: fullAccess,
    developer: fullAccess,
    qa: fullAccess,
    cms: fullAccess,
    seo: fullAccess,
  },
  'Clinic Owner': {
    dashboard: manageAccess,
    patients: manageAccess,
    appointments: manageAccess,
    medical: manageAccess,
    vaccinations: manageAccess,
    prescriptions: manageAccess,
    surgeries: manageAccess,
    labTests: manageAccess,
    pharmacy: manageAccess,
    inventory: manageAccess,
    grooming: manageAccess,
    boarding: manageAccess,
    billing: manageAccess,
    staff: manageAccess,
    branches: manageAccess,
    settings: manageAccess,
    ai: manageAccess,
    crm: manageAccess,
    analytics: manageAccess,
    security: manageAccess,
    developer: manageAccess,
    qa: manageAccess,
    cms: manageAccess,
    seo: manageAccess,
  },
  'Branch Manager': {
    dashboard: manageAccess,
    patients: manageAccess,
    appointments: manageAccess,
    medical: manageAccess,
    vaccinations: manageAccess,
    prescriptions: manageAccess,
    surgeries: manageAccess,
    labTests: manageAccess,
    pharmacy: manageAccess,
    inventory: manageAccess,
    grooming: manageAccess,
    boarding: manageAccess,
    billing: manageAccess,
    staff: editAccess,
    branches: viewAccess,
    settings: editAccess,
    ai: viewAccess,
    crm: manageAccess,
    analytics: viewAccess,
    security: viewAccess,
    developer: viewAccess,
    qa: viewAccess,
    cms: viewAccess,
    seo: viewAccess,
  },
  Veterinarian: {
    dashboard: viewAccess,
    patients: editAccess,
    appointments: editAccess,
    medical: manageAccess,
    vaccinations: editAccess,
    surgeries: manageAccess,
    labTests: editAccess,
    pharmacy: viewAccess,
    ai: editAccess,
    grooming: editAccess,
    boarding: editAccess,
    billing: editAccess,
  },
  Receptionist: {
    dashboard: viewAccess,
    patients: editAccess,
    appointments: manageAccess,
    medical: viewAccess,
    vaccinations: viewAccess,
    prescriptions: viewAccess,
    surgeries: viewAccess,
    labTests: viewAccess,
    grooming: editAccess,
    boarding: editAccess,
    billing: editAccess,
    ai: viewAccess,
    crm: viewAccess,
    analytics: viewAccess,
    security: viewAccess,
    developer: viewAccess,
    qa: viewAccess,
  },
  'Veterinary Nurse': {
    dashboard: viewAccess,
    patients: viewAccess,
    appointments: viewAccess,
    medical: editAccess,
    vaccinations: editAccess,
    prescriptions: editAccess,
    surgeries: editAccess,
    labTests: editAccess,
    boarding: editAccess,
    ai: viewAccess,
    crm: viewAccess,
    analytics: viewAccess,
  },
  'Laboratory Technician': {
    dashboard: viewAccess,
    patients: viewAccess,
    medical: editAccess,
    vaccinations: editAccess,
    prescriptions: viewAccess,
    surgeries: viewAccess,
    labTests: fullAccess,
    pharmacy: viewAccess,
    ai: viewAccess,
  },
  Pharmacist: {
    dashboard: viewAccess,
    patients: viewAccess,
    medical: viewAccess,
    vaccinations: viewAccess,
    prescriptions: viewAccess,
    surgeries: viewAccess,
    labTests: viewAccess,
    pharmacy: manageAccess,
    ai: viewAccess,
  },
  Groomer: {
    dashboard: viewAccess,
    patients: viewAccess,
    grooming: manageAccess,
  },
  'Boarding Staff': {
    dashboard: viewAccess,
    patients: viewAccess,
    boarding: manageAccess,
  },
  Accountant: {
    dashboard: viewAccess,
    billing: manageAccess,
    staff: viewAccess,
    security: manageAccess,
    branches: viewAccess,
    inventory: viewAccess,
    ai: viewAccess,
  },
  'Inventory Manager': {
    dashboard: viewAccess,
    pharmacy: viewAccess,
    inventory: fullAccess,
    branches: viewAccess,
    ai: viewAccess,
  },
  'Pet Owner': {
    dashboard: viewAccess,
    patients: viewAccess,
    appointments: viewAccess,
    medical: viewAccess,
    vaccinations: viewAccess,
    prescriptions: viewAccess,
    surgeries: viewAccess,
    labTests: viewAccess,
    billing: viewAccess,
    ai: viewAccess,
    crm: viewAccess,
    analytics: viewAccess,
    security: viewAccess,
  },
};

export function can(role: Role, module: Module, action: Action = 'view'): boolean {
  const perms = rolePermissions[role]?.[module];
  if (!perms) return false;
  return perms.includes(action);
}

export function canAccessModule(role: Role, module: Module): boolean {
  return can(role, module, 'view');
}

/* ─────────────────────────────────────────────────────────
   Navigation
   ───────────────────────────────────────────────────────── */

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module: Module;
};

export const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { href: '/patients', label: 'Patients', icon: PawPrint, module: 'patients' },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays, module: 'appointments' },
  { href: '/medical', label: 'Medical Records', icon: Stethoscope, module: 'medical' },
  { href: '/vaccinations', label: 'Vaccinations', icon: Syringe, module: 'vaccinations' },
  { href: '/prescriptions', label: 'Prescriptions', icon: FileText, module: 'prescriptions' },
  { href: '/surgeries', label: 'Surgery', icon: SurgeryIcon, module: 'surgeries' },
  { href: '/lab', label: 'Laboratory', icon: LabIcon, module: 'labTests' },
  { href: '/pharmacy', label: 'Pharmacy', icon: Pill, module: 'pharmacy' },
  { href: '/inventory', label: 'Inventory & Warehouse', icon: WarehouseIcon, module: 'inventory' },
  { href: '/grooming', label: 'Grooming', icon: Scissors, module: 'grooming' },
  { href: '/boarding', label: 'Boarding', icon: Hotel, module: 'boarding' },
  { href: '/billing', label: 'Billing', icon: Receipt, module: 'billing' },
  { href: '/staff', label: 'Staff', icon: Users, module: 'staff' },
  { href: '/branches', label: 'Branches', icon: Building2, module: 'branches' },
  { href: '/settings', label: 'Settings', icon: Settings, module: 'settings' },
  { href: '/ai', label: 'AI Assistant', icon: Sparkles, module: 'ai' },
  { href: '/crm', label: 'CRM & Marketing', icon: CrmIcon, module: 'crm' },
  { href: '/analytics', label: 'Analytics & Reports', icon: AnalyticsIcon, module: 'analytics' },
  { href: '/security', label: 'Security & Audit', icon: SecurityIcon, module: 'security' },
  { href: '/developer', label: 'API & Developer', icon: DeveloperIcon, module: 'developer' },
  { href: '/qa', label: 'QA & Release', icon: QaIcon, module: 'qa' },
  { href: '/cms', label: 'Website & CMS', icon: WebsiteIcon, module: 'cms' },
  { href: '/seo', label: 'SEO & Favicon', icon: SeoIcon, module: 'seo' },
];

export function navForRole(role: Role): NavItem[] {
  return navItems.filter((item) => canAccessModule(role, item.module));
}

/* ─────────────────────────────────────────────────────────
   Demo Accounts
   ───────────────────────────────────────────────────────── */

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: Role;
  branch: string;
};

export const demoAccounts: DemoAccount[] = [
  { email: 'admin@petcare.pro', password: 'admin123', name: 'Alex Chen', role: 'Super Admin', branch: 'All branches' },
  { email: 'owner@petcare.pro', password: 'owner123', name: 'Dr. James Whitfield', role: 'Clinic Owner', branch: 'Vetnora' },
  { email: 'manager@petcare.pro', password: 'manager123', name: 'Sofia Reyes', role: 'Branch Manager', branch: 'Riverside' },
  { email: 'vet@petcare.pro', password: 'vet123', name: 'Dr. Maya Rivera', role: 'Veterinarian', branch: 'Vetnora' },
  { email: 'reception@petcare.pro', password: 'reception123', name: 'Lena Ortiz', role: 'Receptionist', branch: 'Vetnora' },
  { email: 'nurse@petcare.pro', password: 'nurse123', name: 'Grace Tan', role: 'Veterinary Nurse', branch: 'Riverside' },
  { email: 'lab@petcare.pro', password: 'lab123', name: 'Oscar Mbeki', role: 'Laboratory Technician', branch: 'Vetnora' },
  { email: 'pharmacy@petcare.pro', password: 'pharmacy123', name: 'Nadia Hassan', role: 'Pharmacist', branch: 'Vetnora' },
  { email: 'groomer@petcare.pro', password: 'groomer123', name: 'Hannah Kim', role: 'Groomer', branch: 'Vetnora' },
  { email: 'boarding@petcare.pro', password: 'boarding123', name: 'Tom Bradley', role: 'Boarding Staff', branch: 'Riverside' },
  { email: 'accounts@petcare.pro', password: 'accounts123', name: 'Yuki Tanaka', role: 'Accountant', branch: 'Vetnora' },
  { email: 'inventory@petcare.pro', password: 'inventory123', name: 'Sam Whitfield', role: 'Inventory Manager', branch: 'Vetnora' },
  { email: 'petowner@petcare.pro', password: 'owner123', name: 'Eleanor Hayes', role: 'Pet Owner', branch: 'Vetnora' },
];

/* ─────────────────────────────────────────────────────────
   Staff role options (for staff management forms)
   ───────────────────────────────────────────────────────── */

export const staffRoleOptions: Role[] = [
  'Veterinarian',
  'Receptionist',
  'Veterinary Nurse',
  'Inventory Manager',
  'Groomer',
  'Accountant',
  'Laboratory Technician',
  'Branch Manager',
  'Pharmacist',
  'Boarding Staff',
];

/* Re-exported icon for system-status block */
export { Activity };
