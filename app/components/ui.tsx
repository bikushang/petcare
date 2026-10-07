import { ReactNode } from 'react';
import { LucideIcon, ChevronDown, Calendar, X } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

/* ---------- Card ---------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-line shadow-soft ${className}`}>{children}</div>;
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
  tone = 'sage',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'sage' | 'coral' | 'amber' | 'sky';
}) {
  const tones: Record<string, string> = {
    sage: 'bg-mint text-sage',
    coral: 'bg-coral/15 text-coral',
    amber: 'bg-amber-100 text-amber-600',
    sky: 'bg-sky-100 text-sky-600',
  };
  const accent: Record<string, string> = {
    sage: 'before:bg-sage',
    coral: 'before:bg-coral',
    amber: 'before:bg-amber-500',
    sky: 'before:bg-sky-500',
  };
  return (
    <div className={`relative bg-white rounded-2xl border border-line shadow-soft p-4 overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-[3px] ${accent[tone]}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
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
  Completed: 'bg-mint text-sage',
  Cancelled: 'bg-ink/10 text-ink/50',
  Paid: 'bg-mint text-sage',
  Pending: 'bg-amber-100 text-amber-700',
  Overdue: 'bg-coral/15 text-coral',
  Refunded: 'bg-ink/10 text-ink/50',
  Active: 'bg-mint text-sage',
  'On leave': 'bg-amber-100 text-amber-700',
  Inactive: 'bg-ink/10 text-ink/50',
  'In progress': 'bg-coral/15 text-coral',
  'Checked-in boarding': 'bg-mint text-sage',
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
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-mint text-sage flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-xs text-ink/50 mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}

/* ---------- Button ---------- */
export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const variants = {
    primary: 'bg-sage text-white hover:bg-sage/90 active:scale-[0.98] shadow-sm shadow-sage/20',
    ghost: 'text-ink/70 hover:bg-canvas active:scale-[0.98]',
    outline: 'border border-line text-ink hover:bg-canvas hover:border-sage/40 active:scale-[0.98]',
    danger: 'bg-coral/15 text-coral hover:bg-coral/25 active:scale-[0.98]',
  };
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
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
      <div className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} mt-10 mb-10 bg-white rounded-2xl shadow-soft border border-line animate-[fadeIn_0.15s_ease]`}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:text-ink hover:bg-canvas transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Field ---------- */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/* ---------- Custom Input ---------- */
export const inputCls =
  'w-full h-10 px-3.5 rounded-xl border border-line bg-white text-sm text-ink placeholder:text-ink/30 outline-none transition-all focus:border-sage focus:ring-4 focus:ring-mint/60 hover:border-sage/30';

/* ---------- Custom Select ---------- */
export function Select({
  value,
  onChange,
  children,
  disabled,
  className = '',
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${disabled ? 'opacity-60' : ''}`}>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`appearance-none w-full h-10 pl-3.5 pr-9 rounded-xl border border-line bg-white text-sm text-ink outline-none transition-all cursor-pointer focus:border-sage focus:ring-4 focus:ring-mint/60 hover:border-sage/30 ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-ink/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/* ---------- Custom Textarea ---------- */
export function Textarea({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm text-ink placeholder:text-ink/30 outline-none transition-all focus:border-sage focus:ring-4 focus:ring-mint/60 hover:border-sage/30 resize-none ${className}`}
    />
  );
}

/* ---------- Custom Date Input ---------- */
export function DateInput({
  value,
  onChange,
  className = '',
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="appearance-none w-full h-10 pl-3.5 pr-9 rounded-xl border border-line bg-white text-sm text-ink outline-none transition-all focus:border-sage focus:ring-4 focus:ring-mint/60 hover:border-sage/30"
      />
      <Calendar className="w-4 h-4 text-ink/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/* ---------- Custom Number Input ---------- */
export function NumberInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full h-10 px-3.5 rounded-xl border border-line bg-white text-sm text-ink placeholder:text-ink/30 outline-none transition-all focus:border-sage focus:ring-4 focus:ring-mint/60 hover:border-sage/30 ${className}`}
    />
  );
}

/* ---------- Custom Checkbox ---------- */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <span className="relative flex items-center justify-center w-5 h-5 rounded-md border-2 transition-all group-hover:border-sage" style={checked ? { borderColor: '#2d7766', backgroundColor: '#2d7766' } : { borderColor: '#e4ece8' }}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        <input type="checkbox" checked={checked} onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer" />
      </span>
      <span className="text-xs text-ink/70 select-none">{label}</span>
    </label>
  );
}

/* ---------- Chart Components ---------- */
const CHART_COLORS = ['#2d7766', '#f17f65', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899'];

const tooltipStyle = {
  borderRadius: '12px',
  border: '1px solid #e4ece8',
  boxShadow: '0 8px 24px rgba(20,34,33,0.08)',
  fontSize: '12px',
  padding: '8px 12px',
} as const;

export function BarChartCard({
  title,
  data,
  dataKey,
  xKey,
  color = '#2d7766',
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,239,232,0.4)' }} />
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
  color = '#2d7766',
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
  color = '#2d7766',
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e4ece8" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#6b8079' }} axisLine={false} tickLine={false} />
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
