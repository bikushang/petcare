import { ReactNode } from 'react';
import { LucideIcon, X } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

/* ---------- Card ---------- */
export function Card({
  children, className = '', hover,
}: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border border-line shadow-soft ${hover ? 'hv-card hover:border-plum/25' : ''} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- SectionTitle ---------- */
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

/* ---------- StatCard ---------- */
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'plum',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'plum' | 'coral' | 'amber' | 'sky';
}) {
  const tones: Record<string, string> = {
    plum: 'bg-lilac text-plum',
    coral: 'bg-coral/15 text-coral',
    amber: 'bg-amber-100 text-amber-600',
    sky: 'bg-sky-100 text-sky-600',
  };
  const accent: Record<string, string> = {
    plum: 'before:bg-plum',
    coral: 'before:bg-coral',
    amber: 'before:bg-amber-500',
    sky: 'before:bg-sky-500',
  };
  return (
    <div className={`hv-card group relative bg-white rounded-2xl border border-line shadow-soft p-4 mb-5 overflow-hidden hover:border-plum/25 before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] ${accent[tone]}`}>
      <div className="flex items-center gap-3">
        <div className={`hv-tile w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-ink/50 font-medium">{label}</div>
          <div className="text-xl font-semibold text-ink leading-tight">{value}</div>
          {sub && <div className="text-[11px] text-ink/50 truncate">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Badge ---------- */
const badgeTones: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-700',
  'Checked-in': 'bg-amber-100 text-amber-700',
  'In consultation': 'bg-coral/15 text-coral',
  Completed: 'bg-lilac text-plum',
  Cancelled: 'bg-ink/10 text-ink/50',
  Paid: 'bg-lilac text-plum',
  Pending: 'bg-amber-100 text-amber-700',
  Overdue: 'bg-coral/15 text-coral',
  Refunded: 'bg-ink/10 text-ink/50',
  Active: 'bg-lilac text-plum',
  'On leave': 'bg-amber-100 text-amber-700',
  Inactive: 'bg-ink/10 text-ink/50',
  'In progress': 'bg-coral/15 text-coral',
  'Checked-in boarding': 'bg-lilac text-plum',
};

export function Badge({ status }: { status: string }) {
  const cls = badgeTones[status] ?? 'bg-ink/10 text-ink/60';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>
      {status}
    </span>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="group flex flex-col items-center justify-center py-12 text-center">
      <div className="hv-tile w-12 h-12 rounded-2xl bg-lilac text-plum flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-xs text-ink/50 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- Button ----------
   Hover: lifts 2px, shadow grows; any child marked `.hv-slide`
   (e.g. a trailing arrow) slides 3px right. See globals.css. */
export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  full,
  className = '',
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'soft';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit';
  disabled?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  full?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-plum text-white hover:bg-grape shadow-sm hover:shadow-lift',
    soft: 'bg-lilac text-plum hover:bg-plum hover:text-white',
    ghost: 'text-ink/70 hover:bg-lilac hover:text-plum',
    outline: 'border border-line text-ink bg-white hover:border-plum hover:text-plum hover:shadow-lift-sm',
    danger: 'bg-coral/15 text-coral hover:bg-coral hover:text-white hover:shadow-lift-sm',
  };
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-6 text-sm' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`hv-lift inline-flex items-center justify-center gap-1.5 rounded-lg font-medium outline-none focus-visible:ring-4 focus-visible:ring-lilac
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
      {IconRight && <IconRight className="w-4 h-4 shrink-0 hv-slide" />}
    </button>
  );
}

/* ---------- IconButton ---------- */
export function IconButton({
  icon: Icon,
  onClick,
  label,
  variant = 'ghost',
  size = 'md',
  disabled,
  className = '',
}: {
  icon: LucideIcon;
  onClick?: () => void;
  label: string;
  variant?: 'ghost' | 'soft' | 'outline' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    ghost: 'text-ink/50 hover:bg-lilac hover:text-plum',
    soft: 'bg-lilac text-plum hover:bg-plum hover:text-white',
    outline: 'border border-line text-ink/60 bg-white hover:border-plum hover:text-plum',
    danger: 'text-ink/50 hover:bg-coral/15 hover:text-coral',
  };
  const sizes = { sm: 'w-7 h-7', md: 'w-9 h-9' };
  const icons = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`hv-icon inline-flex items-center justify-center rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-lilac
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      <Icon className={icons[size]} />
    </button>
  );
}


/* ---------- Tabs ----------
   Pill-style tab bar used across every admin section. Active pill is
   solid plum; inactive pills are outlined and lift on hover. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  size = 'md',
  className = 'mb-5',
}: {
  tabs: { key: T; label: string; icon?: LucideIcon; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs gap-1' : 'px-4 py-2 text-sm gap-1.5';
  const ico = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div
      role="tablist"
      className={`flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1 [scrollbar-width:thin] ${className}`}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`hv-lift inline-flex items-center shrink-0 rounded-xl font-medium whitespace-nowrap outline-none focus-visible:ring-4 focus-visible:ring-lilac ${pad}
              ${active
                ? 'bg-plum text-white shadow-lift-sm'
                : 'bg-white text-ink/60 border border-line hover:border-plum/40 hover:bg-lilac/40 hover:text-plum'}`}
          >
            {t.icon && <t.icon className={`${ico} shrink-0`} />}
            {t.label}
            {t.count !== undefined && (
              <span
                className={`ml-0.5 min-w-[18px] px-1 rounded-full text-[10px] font-semibold tabular-nums leading-[18px]
                  ${active ? 'bg-white/20 text-white' : 'bg-lilac text-plum'}`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} mt-10 mb-10 bg-white rounded-2xl shadow-soft border border-line animate-popIn`}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="hv-icon w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-coral hover:bg-coral/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Form controls ----------
   All inputs live in ./form.tsx (fully custom: no native dropdowns,
   no native date picker, custom radio/checkbox/switch). Re-exported
   here so existing `from '../components/ui'` imports keep working. */
export {
  Field, Input, SearchInput, Textarea, Select, DatePicker, DateInput, TimeInput,
  NumberInput, ColorInput, ImagePicker, Checkbox, Radio, RadioGroup, Switch,
  SegmentedControl, FileInput, inputCls,
} from './form';

/* ---------- Chart Components ---------- */
const CHART_COLORS = ['#4C1D95', '#7C3AED', '#A78BFA', '#f17f65', '#f59e0b', '#0ea5e9', '#ec4899'];

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #E8E3F3',
  boxShadow: '0 8px 24px rgba(26,13,46,0.10)',
  fontSize: '12px',
  padding: '8px 12px',
} as const;

export function BarChartCard({
  title,
  data,
  dataKey,
  xKey,
  color = '#4C1D95',
  height = 240,
  action,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
  action?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <SectionTitle title={title} action={action} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(237,233,254,0.55)' }} />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LineChartCard({
  title,
  data,
  dataKey,
  xKey,
  color = '#4C1D95',
  height = 240,
  action,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
  action?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <SectionTitle title={title} action={action} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function AreaChartCard({
  title,
  data,
  dataKey,
  xKey,
  color = '#4C1D95',
  height = 240,
  action,
}: {
  title: string;
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
  action?: ReactNode;
}) {
  const gradId = `grad-${dataKey}-${color.replace('#', '')}`;
  return (
    <Card className="p-5">
      <SectionTitle title={title} action={action} />
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E3F3" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6E6484' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function DonutChartCard({
  title,
  data,
  height = 240,
  action,
}: {
  title: string;
  data: { name: string; value: number }[];
  height?: number;
  action?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <SectionTitle title={title} action={action} />
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export { CHART_COLORS };
