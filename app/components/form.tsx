'use client';

/* ════════════════════════════════════════════════════════════════════
   Custom form controls — PetCare Pro
   ────────────────────────────────────────────────────────────────────
   Every control here is hand-built: no native <select> dropdown, no
   native date picker, no native radio/checkbox rendering. Inputs that
   must stay native (text / number / textarea) are fully restyled and
   wrapped so the look is consistent everywhere.

   Backward compatibility: change handlers keep the familiar
   `onChange(e) => e.target.value` shape. Custom controls synthesise a
   minimal event-like object, so existing call sites work untouched.
   ════════════════════════════════════════════════════════════════════ */

import {
  ReactNode, useState, useRef, useEffect, useMemo, useCallback, useId, Children, isValidElement,
} from 'react';
import {
  ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, X,
  Minus, Plus, Search, Clock, Upload, AlertCircle, LucideIcon,
} from 'lucide-react';

/* ---------------------------------------------------------------- */
/* Shared helpers                                                    */
/* ---------------------------------------------------------------- */

/** Synthesise the `{ target: { value } }` shape call sites expect. */
function fakeEvent<T>(value: string): T {
  return { target: { value }, currentTarget: { value } } as unknown as T;
}
function fakeCheckedEvent<T>(checked: boolean): T {
  return { target: { checked, value: String(checked) } } as unknown as T;
}

/**
 * Lets every control work controlled (`value` + `onChange`) or uncontrolled
 * (`defaultValue` only), exactly like the native elements they replace.
 * Returns the current value plus an `emit` that updates internal state when
 * uncontrolled and always forwards a native-shaped event to `onChange`.
 */
function useStringValue<E>(
  value: string | undefined,
  defaultValue: string | undefined,
  onChange: ((e: E) => void) | undefined,
): [string, (next: string) => void] {
  const [inner, setInner] = useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const emit = useCallback(
    (next: string) => {
      if (!controlled) setInner(next);
      onChange?.(fakeEvent<E>(next));
    },
    [controlled, onChange],
  );
  return [controlled ? value : inner, emit];
}

/** Boolean twin of `useStringValue`, for checkbox / switch style controls. */
function useBoolValue<E>(
  checked: boolean | undefined,
  defaultChecked: boolean | undefined,
  onChange: ((e: E) => void) | undefined,
  raw?: boolean,
): [boolean, (next: boolean) => void] {
  const [inner, setInner] = useState(defaultChecked ?? false);
  const controlled = checked !== undefined;
  const emit = useCallback(
    (next: boolean) => {
      if (!controlled) setInner(next);
      onChange?.((raw ? next : fakeCheckedEvent<E>(next)) as E);
    },
    [controlled, onChange, raw],
  );
  return [controlled ? checked : inner, emit];
}

/** Close on outside click + Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close]);
  return ref;
}

/** Flip a popover above the trigger when there isn't room below. */
function useDropDirection(open: boolean, triggerRef: React.RefObject<HTMLElement>, estHeight = 280) {
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setUp(r.bottom + estHeight > window.innerHeight && r.top > estHeight);
  }, [open, triggerRef, estHeight]);
  return up;
}

/* Base control chrome, shared by every text-ish control. */
const CONTROL_BASE =
  'w-full rounded-xl border bg-white text-sm text-ink transition-all duration-200 outline-none';
const CONTROL_IDLE = 'border-line hover:border-plum/35';
const CONTROL_FOCUS = 'focus:border-plum focus:ring-4 focus:ring-lilac';
const CONTROL_ERROR = 'border-coral hover:border-coral focus:border-coral focus:ring-coral/20';

/** Legacy export — still used by a few plain inputs. */
export const inputCls = `${CONTROL_BASE} ${CONTROL_IDLE} ${CONTROL_FOCUS} h-10 px-3.5 placeholder:text-ink/30`;

/* ---------------------------------------------------------------- */
/* Field — label / hint / error wrapper                              */
/* ---------------------------------------------------------------- */

export function Field({
  label, children, hint, error, required, className = '',
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">
        {label}
        {required && <span className="text-coral ml-0.5">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-coral">
          <AlertCircle className="w-3 h-3 shrink-0" /> {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>
      ) : null}
    </label>
  );
}

/* ---------------------------------------------------------------- */
/* Input — restyled text input with optional icons                   */
/* ---------------------------------------------------------------- */

export function Input({
  value, onChange, defaultValue, placeholder, type = 'text', icon: Icon, suffix, disabled,
  error, clearable, onEnter, className = '', autoFocus, maxLength, name, readOnly,
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'search';
  icon?: LucideIcon;
  suffix?: ReactNode;
  disabled?: boolean;
  error?: boolean;
  clearable?: boolean;
  onEnter?: () => void;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
  name?: string;
  readOnly?: boolean;
}) {
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLInputElement>>(value, defaultValue, onChange);
  const showClear = clearable && val.length > 0 && !disabled && !readOnly;
  return (
    <div className={`relative ${disabled ? 'opacity-60' : ''} ${className}`}>
      {Icon && (
        <Icon className="w-4 h-4 text-ink/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      )}
      <input
        type={type}
        name={name}
        value={val}
        onChange={(e) => emit(e.target.value)}
        onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } } : undefined}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        maxLength={maxLength}
        className={`${CONTROL_BASE} ${error ? CONTROL_ERROR : `${CONTROL_IDLE} ${CONTROL_FOCUS}`} h-10 placeholder:text-ink/30 disabled:cursor-not-allowed
          ${Icon ? 'pl-10' : 'pl-3.5'} ${showClear || suffix ? 'pr-9' : 'pr-3.5'}`}
      />
      {showClear ? (
        <button
          type="button"
          onClick={() => emit('')}
          className="hv-icon absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-ink/8 text-ink/45 hover:bg-coral/15 hover:text-coral flex items-center justify-center"
          aria-label="Clear"
        >
          <X className="w-3 h-3" />
        </button>
      ) : suffix ? (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink/40 pointer-events-none">{suffix}</span>
      ) : null}
    </div>
  );
}

/** Search input preset. */
export function SearchInput({
  value, onChange, placeholder = 'Search…', className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return <Input value={value} onChange={onChange} placeholder={placeholder} icon={Search} clearable type="search" className={className} />;
}

/* ---------------------------------------------------------------- */
/* Textarea — restyled, optional auto-grow + counter                 */
/* ---------------------------------------------------------------- */

export function Textarea({
  value, onChange, defaultValue, placeholder, rows = 3, maxLength, autoGrow = true, error, disabled, className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  autoGrow?: boolean;
  error?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLTextAreaElement>>(value, defaultValue, onChange);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!autoGrow || !ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, rows * 22 + 20)}px`;
  }, [val, autoGrow, rows]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={val}
        onChange={(e) => emit(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={`${CONTROL_BASE} ${error ? CONTROL_ERROR : `${CONTROL_IDLE} ${CONTROL_FOCUS}`} px-3.5 py-2.5 leading-relaxed placeholder:text-ink/30 resize-none ${maxLength ? 'pb-6' : ''} ${className}`}
      />
      {maxLength && (
        <span className="absolute bottom-2 right-3 text-[10px] font-medium text-ink/35 tabular-nums pointer-events-none">
          {val.length}/{maxLength}
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Select — fully custom listbox (no native dropdown)                */
/* ---------------------------------------------------------------- */

type Opt = { value: string; label: string; disabled?: boolean };

/** Pull `{value,label}` out of `<option>` children (incl. mapped arrays). */
function optionsFromChildren(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const p = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
      const label = typeof p.children === 'string' || typeof p.children === 'number'
        ? String(p.children)
        : Array.isArray(p.children) ? p.children.filter((c) => typeof c === 'string' || typeof c === 'number').join('') : '';
      out.push({ value: String(p.value ?? label), label: label || String(p.value ?? ''), disabled: p.disabled });
    } else if (child.type === 'optgroup') {
      out.push(...optionsFromChildren((child.props as { children?: ReactNode }).children));
    }
  });
  return out;
}

export function Select({
  value, onChange, defaultValue, children, options, disabled, placeholder = 'Select…',
  searchable, error, className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue?: string;
  children?: ReactNode;
  options?: Opt[];
  disabled?: boolean;
  placeholder?: string;
  searchable?: boolean;
  error?: boolean;
  className?: string;
}) {
  const opts = useMemo(() => options ?? optionsFromChildren(children), [options, children]);
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLSelectElement>>(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  const wrapRef = useDismiss(open, close);
  const dropUp = useDropDirection(open, triggerRef);
  const listboxId = useId();

  // Auto-enable search for long lists.
  const withSearch = searchable ?? opts.length > 9;

  const shown = useMemo(() => {
    if (!withSearch || !query.trim()) return opts;
    const q = query.toLowerCase();
    return opts.filter((o) => o.label.toLowerCase().includes(q));
  }, [opts, query, withSearch]);

  const selected = opts.find((o) => o.value === val);

  useEffect(() => {
    if (!open) return;
    const i = shown.findIndex((o) => o.value === val);
    setActive(i >= 0 ? i : 0);
  }, [open, shown, val]);

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const pick = (o: Opt) => {
    if (o.disabled) return;
    emit(o.value);
    close();
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault(); setOpen(true); return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); }
    else if (e.key === 'Enter' || (e.key === ' ' && !withSearch)) {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === 'Tab') close();
  };

  return (
    <div ref={wrapRef} className={`relative ${disabled ? 'opacity-60' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        className={`${CONTROL_BASE} ${error ? CONTROL_ERROR : CONTROL_IDLE} h-10 pl-3.5 pr-9 flex items-center text-left disabled:cursor-not-allowed
          ${open ? 'border-plum ring-4 ring-lilac' : ''}`}
      >
        <span className={`truncate ${selected ? 'text-ink' : 'text-ink/35'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink/40 absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200 ${open ? 'rotate-180 text-plum' : ''}`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute z-[70] left-0 right-0 min-w-full bg-white rounded-xl border border-line shadow-[0_16px_40px_-8px_rgba(26,13,46,0.22)] overflow-hidden animate-popIn
            ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {withSearch && (
            <div className="p-2 border-b border-line">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-ink/35 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search options…"
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-line bg-canvas text-xs text-ink placeholder:text-ink/35 outline-none focus:border-plum focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}
          <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {shown.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-ink/40">No matches</div>
            )}
            {shown.map((o, i) => {
              const isSel = o.value === val;
              return (
                <div
                  key={`${o.value}-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={`mx-1 px-2.5 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-colors duration-150
                    ${o.disabled ? 'opacity-40 cursor-not-allowed'
                      : `cursor-pointer ${i === active ? 'bg-lilac text-plum' : 'text-ink/80'}`}
                    ${isSel ? 'font-semibold text-plum' : ''}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <Check className="w-3.5 h-3.5 shrink-0 text-plum animate-checkPop" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* DatePicker — custom calendar, no native date input                */
/* ---------------------------------------------------------------- */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Timezone-safe parse/format of `YYYY-MM-DD`. */
function parseISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDate(s: string): string {
  const d = parseISO(s);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
/** Monday-first 6x7 grid for the month containing `view`. */
function monthGrid(view: Date): (Date | null)[] {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Mon = 0
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let i = 1; i <= days; i++) cells.push(new Date(view.getFullYear(), view.getMonth(), i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({
  value, onChange, defaultValue, min, max, placeholder = 'Pick a date', disabled, error, clearable = true, className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  clearable?: boolean;
  className?: string;
}) {
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLInputElement>>(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'days' | 'months' | 'years'>('days');
  const selected = parseISO(val);
  const [view, setView] = useState<Date>(selected ?? new Date());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); setMode('days'); }, []);
  const wrapRef = useDismiss(open, close);
  const dropUp = useDropDirection(open, triggerRef, 340);

  useEffect(() => {
    if (open) { setView(parseISO(val) ?? new Date()); setMode('days'); }
  }, [open, val]);

  const today = new Date();
  const minD = parseISO(min || '');
  const maxD = parseISO(max || '');
  const blocked = (d: Date) =>
    (minD && d < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate())) ||
    (maxD && d > new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate()));

  const commit = (d: Date) => {
    if (blocked(d)) return;
    emit(toISO(d));
    close();
    triggerRef.current?.focus();
  };

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const cells = monthGrid(view);
  const yearPage = Math.floor(view.getFullYear() / 12) * 12;
  const stepView = (dir: 1 | -1) => {
    if (mode === 'days') setView(new Date(view.getFullYear(), view.getMonth() + dir, 1));
    else if (mode === 'months') setView(new Date(view.getFullYear() + dir, view.getMonth(), 1));
    else setView(new Date(view.getFullYear() + dir * 12, view.getMonth(), 1));
  };

  return (
    <div ref={wrapRef} className={`relative ${disabled ? 'opacity-60' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); setOpen(true); }
        }}
        className={`${CONTROL_BASE} ${error ? CONTROL_ERROR : CONTROL_IDLE} h-10 pl-3.5 pr-9 flex items-center text-left disabled:cursor-not-allowed
          ${open ? 'border-plum ring-4 ring-lilac' : ''}`}
      >
        <span className={val ? 'text-ink' : 'text-ink/35'}>{val ? prettyDate(val) : placeholder}</span>
        <CalendarIcon className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${open ? 'text-plum' : 'text-ink/40'}`} />
      </button>

      {open && (
        <div
          className={`absolute z-[70] left-0 w-[290px] bg-white rounded-2xl border border-line shadow-[0_16px_40px_-8px_rgba(26,13,46,0.22)] p-3 animate-popIn
            ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {/* Header: prev — label (switches mode) — next */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <button
              type="button"
              onClick={() => stepView(-1)}
              className="hv-icon w-7 h-7 rounded-lg flex items-center justify-center text-ink/50 hover:bg-lilac hover:text-plum shrink-0"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'days' ? 'months' : mode === 'months' ? 'years' : 'days')}
              className="flex-1 h-7 rounded-lg text-xs font-bold text-ink hover:bg-lilac hover:text-plum transition-colors duration-150 tabular-nums"
            >
              {mode === 'days' && `${MONTHS[view.getMonth()]} ${view.getFullYear()}`}
              {mode === 'months' && view.getFullYear()}
              {mode === 'years' && `${yearPage} – ${yearPage + 11}`}
            </button>

            <button
              type="button"
              onClick={() => stepView(1)}
              className="hv-icon w-7 h-7 rounded-lg flex items-center justify-center text-ink/50 hover:bg-lilac hover:text-plum shrink-0"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {mode === 'days' && (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DOW.map((d) => (
                  <div key={d} className="h-6 flex items-center justify-center text-[10px] font-bold text-ink/35 uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                  if (!d) return <div key={`e${i}`} className="h-8" />;
                  const isSel = selected && sameDay(d, selected);
                  const isToday = sameDay(d, today);
                  const off = blocked(d);
                  return (
                    <button
                      key={toISO(d)}
                      type="button"
                      disabled={!!off}
                      onClick={() => commit(d)}
                      className={`h-8 rounded-lg text-xs font-medium tabular-nums transition-all duration-150
                        ${isSel ? 'bg-plum text-white shadow-lift-sm font-semibold'
                          : off ? 'text-ink/20 cursor-not-allowed'
                          : isToday ? 'text-plum font-bold bg-lilac/60 hover:bg-lilac'
                          : 'text-ink/75 hover:bg-lilac hover:text-plum'}`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {mode === 'months' && (
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => {
                const sel = selected && selected.getFullYear() === view.getFullYear() && selected.getMonth() === i;
                const isCur = today.getFullYear() === view.getFullYear() && today.getMonth() === i;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setView(new Date(view.getFullYear(), i, 1)); setMode('days'); }}
                    className={`h-9 rounded-lg text-xs font-medium transition-all duration-150
                      ${sel ? 'bg-plum text-white font-semibold'
                        : isCur ? 'text-plum font-bold bg-lilac/60 hover:bg-lilac'
                        : 'text-ink/75 hover:bg-lilac hover:text-plum'}`}
                  >
                    {m.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'years' && (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }, (_, i) => yearPage + i).map((y) => {
                const sel = selected && selected.getFullYear() === y;
                const isCur = today.getFullYear() === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setView(new Date(y, view.getMonth(), 1)); setMode('months'); }}
                    className={`h-9 rounded-lg text-xs font-medium tabular-nums transition-all duration-150
                      ${sel ? 'bg-plum text-white font-semibold'
                        : isCur ? 'text-plum font-bold bg-lilac/60 hover:bg-lilac'
                        : 'text-ink/75 hover:bg-lilac hover:text-plum'}`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-line">
            <button
              type="button"
              onClick={() => commit(today)}
              className="text-[11px] font-semibold text-plum hover:text-grape transition-colors px-2 py-1 rounded-md hover:bg-lilac"
            >
              Today
            </button>
            {clearable && (
              <button
                type="button"
                onClick={() => { emit(''); close(); }}
                className="text-[11px] font-medium text-ink/45 hover:text-coral transition-colors px-2 py-1 rounded-md hover:bg-coral/10"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Legacy alias — drop-in for the old native date field. */
export const DateInput = DatePicker;

/* ---------------------------------------------------------------- */
/* TimeInput — custom time popover                                   */
/* ---------------------------------------------------------------- */

function pretty12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return '';
  const h = Number(m[1]);
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

export function TimeInput({
  value, onChange, defaultValue, step = 15, min = '00:00', max = '23:59', disabled, error, className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  step?: number;
  min?: string;
  max?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}) {
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLInputElement>>(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useDismiss(open, close);
  const dropUp = useDropDirection(open, triggerRef, 260);

  const slots = useMemo(() => {
    const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const lo = toMin(min), hi = toMin(max);
    const out: string[] = [];
    for (let m = lo; m <= hi; m += step) {
      out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    return out;
  }, [step, min, max]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector<HTMLElement>('[data-sel="true"]')?.scrollIntoView({ block: 'center' });
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${disabled ? 'opacity-60' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${CONTROL_BASE} ${error ? CONTROL_ERROR : CONTROL_IDLE} h-10 pl-3.5 pr-9 flex items-center text-left disabled:cursor-not-allowed
          ${open ? 'border-plum ring-4 ring-lilac' : ''}`}
      >
        <span className={val ? 'text-ink tabular-nums' : 'text-ink/35'}>{val ? pretty12h(val) : 'Pick a time'}</span>
        <Clock className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${open ? 'text-plum' : 'text-ink/40'}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          className={`absolute z-[70] left-0 right-0 min-w-full max-h-56 overflow-y-auto bg-white rounded-xl border border-line shadow-[0_16px_40px_-8px_rgba(26,13,46,0.22)] py-1 animate-popIn
            ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          {slots.map((s) => {
            const isSel = s === val;
            return (
              <div
                key={s}
                data-sel={isSel}
                onClick={() => { emit(s); close(); }}
                className={`mx-1 px-2.5 py-1.5 rounded-lg text-sm tabular-nums cursor-pointer transition-colors duration-150 flex items-center justify-between
                  ${isSel ? 'bg-plum text-white font-semibold' : 'text-ink/80 hover:bg-lilac hover:text-plum'}`}
              >
                {pretty12h(s)}
                {isSel && <Check className="w-3.5 h-3.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* NumberInput — custom steppers                                     */
/* ---------------------------------------------------------------- */

export function NumberInput({
  value, onChange, defaultValue, placeholder, min, max, step = 1, prefix, suffix, disabled, error, className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}) {
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLInputElement>>(value, defaultValue, onChange);
  const nudge = (dir: 1 | -1) => {
    const cur = parseFloat(val);
    const base = Number.isNaN(cur) ? 0 : cur;
    let next = Math.round((base + dir * step) * 1e6) / 1e6;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    emit(String(next));
  };
  const atMin = min !== undefined && parseFloat(val) <= min;
  const atMax = max !== undefined && parseFloat(val) >= max;

  return (
    <div
      className={`${CONTROL_BASE} ${error ? CONTROL_ERROR : `${CONTROL_IDLE} focus-within:border-plum focus-within:ring-4 focus-within:ring-lilac`}
        h-10 flex items-stretch overflow-hidden ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || atMin}
        onClick={() => nudge(-1)}
        className="w-9 shrink-0 flex items-center justify-center text-ink/45 hover:bg-lilac hover:text-plum active:bg-plum active:text-white transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed border-r border-line"
        aria-label="Decrease"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {prefix && <span className="flex items-center pl-2.5 text-sm text-ink/40 select-none">{prefix}</span>}
      <input
        type="number"
        value={val}
        onChange={(e) => emit(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="flex-1 min-w-0 px-2.5 text-sm text-ink text-center bg-transparent outline-none placeholder:text-ink/30 tabular-nums disabled:cursor-not-allowed"
      />
      {suffix && <span className="flex items-center pr-2.5 text-sm text-ink/40 select-none">{suffix}</span>}

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled || atMax}
        onClick={() => nudge(1)}
        className="w-9 shrink-0 flex items-center justify-center text-ink/45 hover:bg-lilac hover:text-plum active:bg-plum active:text-white transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed border-l border-line"
        aria-label="Increase"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* ---------------------------------------------------------------- */
/* ImagePicker — upload a file OR paste a URL                        */
/* ---------------------------------------------------------------- */

/**
 * Reads a file and downscales it to `maxPx` on its longest edge before
 * returning a data URL. Keeps stored images small enough for localStorage
 * and strips EXIF as a side effect.
 */
function fileToScaledDataUrl(file: File, maxPx: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const src = String(reader.result);
      // SVGs and tiny files are kept verbatim — canvas would rasterise them.
      if (file.type === 'image/svg+xml' || file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon') {
        resolve(src);
        return;
      }
      const img = new window.Image();
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        if (scale === 1 && src.length < 400_000) { resolve(src); return; }
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(src); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
        resolve(canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({
  value,
  onChange,
  label = 'Image',
  hint,
  aspect = 'aspect-[16/9]',
  maxPx = 1600,
  quality = 0.82,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
  className = '',
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  hint?: string;
  aspect?: string;
  maxPx?: number;
  quality?: number;
  accept?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [broken, setBroken] = useState(false);
  const emit = (next: string) => onChange(fakeEvent<React.ChangeEvent<HTMLInputElement>>(next));

  const take = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setErr('');
    if (!file.type.startsWith('image/')) { setErr('Please choose an image file.'); return; }
    if (file.size > 12 * 1024 * 1024) { setErr('That image is larger than 12 MB. Please pick a smaller one.'); return; }
    setBusy(true);
    try {
      const url = await fileToScaledDataUrl(file, maxPx, quality);
      setBroken(false);
      emit(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [maxPx, quality]); // eslint-disable-line react-hooks/exhaustive-deps

  const isUpload = value.startsWith('data:');

  return (
    <div className={className}>
      <span className="text-[11px] font-semibold text-ink/55 uppercase tracking-wide">{label}</span>

      {/* Preview / drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
        className={`relative mt-1.5 ${aspect} w-full rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200
          ${drag ? 'border-plum bg-lilac/60' : err ? 'border-coral bg-coral/5' : 'border-line bg-canvas hover:border-plum/40'}`}
      >
        {value && !broken ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={`${label} preview`} className="absolute inset-0 w-full h-full object-cover" onError={() => setBroken(true)} />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-ink/70 to-transparent">
              <span className="text-[10px] font-medium text-white/90 truncate">
                {isUpload ? 'Uploaded image' : 'Linked from URL'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="hv-lift inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 text-plum text-[10px] font-semibold"
                >
                  <Upload className="w-3 h-3" /> Replace
                </button>
                <button
                  type="button"
                  onClick={() => { setBroken(false); setErr(''); emit(''); }}
                  aria-label="Remove image"
                  className="hv-icon inline-flex items-center justify-center w-6 h-6 rounded-lg bg-white/90 text-ink/60 hover:text-coral"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-1.5 text-center px-4"
          >
            <span className="hv-tile w-11 h-11 rounded-2xl bg-lilac text-plum flex items-center justify-center">
              {busy ? <Clock className="w-5 h-5 animate-pulse" /> : <Upload className="w-5 h-5" />}
            </span>
            <span className="text-xs font-semibold text-ink">
              {busy ? 'Processing image…' : broken ? 'That URL did not load — upload instead' : 'Click to upload, or drag an image here'}
            </span>
            <span className="text-[11px] text-ink/45">
              PNG, JPG, WEBP or SVG · resized to {maxPx}px · up to 12 MB
            </span>
          </button>
        )}
      </div>

      {/* Hidden native file picker, driven by the buttons above */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }}
      />

      {/* URL alternative */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 shrink-0">or URL</span>
        <Input
          value={isUpload ? '' : value}
          onChange={(e) => { setBroken(false); setErr(''); emit(e.target.value); }}
          placeholder={isUpload ? 'Using an uploaded image' : 'https://example.com/photo.jpg'}
          type="url"
          clearable
          className="flex-1"
        />
      </div>

      {err ? (
        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-coral">
          <AlertCircle className="w-3 h-3 shrink-0" /> {err}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* ColorInput — swatch + hex field + preset palette (no native      */
/* colour picker)                                                    */
/* ---------------------------------------------------------------- */

const COLOR_PRESETS = [
  '#4C1D95', '#3B0764', '#7C3AED', '#A78BFA', '#EDE9FE',
  '#1A0D2E', '#6E6484', '#f17f65', '#f59e0b', '#0ea5e9',
  '#ec4899', '#64748b',
];

export function ColorInput({
  value, onChange, defaultValue, presets = COLOR_PRESETS, disabled, className = '',
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultValue?: string;
  presets?: string[];
  disabled?: boolean;
  className?: string;
}) {
  const [val, emit] = useStringValue<React.ChangeEvent<HTMLInputElement>>(value, defaultValue, onChange);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const wrapRef = useDismiss(open, close);
  const dropUp = useDropDirection(open, triggerRef, 200);
  const valid = /^#[0-9a-fA-F]{6}$/.test(val);

  return (
    <div ref={wrapRef} className={`relative flex items-center gap-2 ${disabled ? 'opacity-60' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose a colour"
        className={`hv-icon w-10 h-10 shrink-0 rounded-xl border-2 transition-all duration-200 disabled:cursor-not-allowed
          ${open ? 'border-plum ring-4 ring-lilac' : 'border-line hover:border-plum/50'}`}
        style={{ backgroundColor: valid ? val : '#ffffff' }}
      />
      <input
        value={val}
        onChange={(e) => emit(e.target.value)}
        placeholder="#4C1D95"
        disabled={disabled}
        spellCheck={false}
        className={`${CONTROL_BASE} ${valid || !val ? `${CONTROL_IDLE} ${CONTROL_FOCUS}` : CONTROL_ERROR} h-10 px-3.5 font-mono uppercase tracking-wide placeholder:text-ink/30 placeholder:font-sans`}
      />

      {open && (
        <div
          className={`absolute z-[70] left-0 w-[216px] bg-white rounded-2xl border border-line shadow-[0_16px_40px_-8px_rgba(26,13,46,0.22)] p-3 animate-popIn
            ${dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/45 mb-2">Palette</p>
          <div className="grid grid-cols-6 gap-1.5">
            {presets.map((c) => {
              const sel = c.toLowerCase() === val.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => { emit(c); close(); }}
                  className={`relative w-7 h-7 rounded-lg border transition-all duration-150 hover:scale-110 active:scale-95
                    ${sel ? 'border-plum ring-2 ring-lilac' : 'border-line/80'}`}
                  style={{ backgroundColor: c }}
                >
                  {sel && (
                    <Check
                      className={`w-3.5 h-3.5 absolute inset-0 m-auto ${c === '#EDE9FE' || c === '#A78BFA' ? 'text-ink' : 'text-white'}`}
                      strokeWidth={3.5}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Checkbox — custom box, animated tick                              */
/* ---------------------------------------------------------------- */

export function Checkbox({
  checked, onChange, defaultChecked, label, hint, indeterminate, disabled, className = '',
}: {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  defaultChecked?: boolean;
  label?: string;
  hint?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [on_, emit] = useBoolValue<React.ChangeEvent<HTMLInputElement>>(checked, defaultChecked, onChange);
  const on = on_ || indeterminate;
  return (
    <label className={`flex items-start gap-2.5 group ${disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <span
        className={`relative mt-px flex items-center justify-center w-[18px] h-[18px] shrink-0 rounded-[6px] border-2 transition-all duration-200
          ${on ? 'bg-plum border-plum shadow-lift-sm' : 'bg-white border-line'}
          ${!disabled && !on ? 'group-hover:border-plum/60 group-hover:bg-lilac/40' : ''}
          ${!disabled ? 'group-hover:scale-105 group-active:scale-95' : ''}`}
      >
        {indeterminate && !on_ ? (
          <span className="w-2 h-[2px] rounded-full bg-white animate-checkPop" />
        ) : on_ ? (
          <Check className="w-3 h-3 text-white animate-checkPop" strokeWidth={3.5} />
        ) : null}
        <input
          type="checkbox"
          checked={on_}
          onChange={(e) => emit(e.target.checked)}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 [cursor:inherit] peer"
        />
        <span className="absolute -inset-1.5 rounded-lg peer-focus-visible:ring-4 peer-focus-visible:ring-lilac transition-shadow" />
      </span>
      {(label || hint) && (
        <span className="min-w-0 select-none">
          {label && <span className="block text-xs text-ink/75 leading-snug group-hover:text-ink transition-colors">{label}</span>}
          {hint && <span className="block text-[11px] text-ink/45 mt-0.5">{hint}</span>}
        </span>
      )}
    </label>
  );
}

/* ---------------------------------------------------------------- */
/* Radio / RadioGroup — custom dot                                   */
/* ---------------------------------------------------------------- */

export function Radio({
  checked, onChange, label, hint, name, disabled, className = '',
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-2.5 group ${disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <span
        className={`relative mt-px flex items-center justify-center w-[18px] h-[18px] shrink-0 rounded-full border-2 transition-all duration-200
          ${checked ? 'border-plum bg-white shadow-lift-sm' : 'bg-white border-line'}
          ${!disabled && !checked ? 'group-hover:border-plum/60 group-hover:bg-lilac/40' : ''}
          ${!disabled ? 'group-hover:scale-105 group-active:scale-95' : ''}`}
      >
        <span
          className={`rounded-full bg-plum transition-all duration-200 ${checked ? 'w-2.5 h-2.5' : 'w-0 h-0'}`}
        />
        <input
          type="radio"
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 [cursor:inherit] peer"
        />
        <span className="absolute -inset-1.5 rounded-full peer-focus-visible:ring-4 peer-focus-visible:ring-lilac transition-shadow" />
      </span>
      <span className="min-w-0 select-none">
        <span className="block text-xs text-ink/75 leading-snug group-hover:text-ink transition-colors">{label}</span>
        {hint && <span className="block text-[11px] text-ink/45 mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

/** Radio list. `card` renders each option as a selectable tile. */
export function RadioGroup({
  value, onChange, options, name, direction = 'vertical', card, className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string; icon?: LucideIcon; disabled?: boolean }[];
  name?: string;
  direction?: 'vertical' | 'horizontal';
  card?: boolean;
  className?: string;
}) {
  const autoName = useId();
  const groupName = name ?? autoName;
  if (card) {
    return (
      <div className={`grid gap-2 ${direction === 'horizontal' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'} ${className}`} role="radiogroup">
        {options.map((o) => {
          const sel = o.value === value;
          const Icon = o.icon;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={sel}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={`hv-lift text-left rounded-xl border-2 p-3 flex items-start gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-lilac
                ${sel ? 'border-plum bg-lilac/50 shadow-lift-sm' : 'border-line bg-white hover:border-plum/40'}
                ${o.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              {Icon && (
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${sel ? 'bg-plum text-white' : 'bg-lilac text-plum'}`}>
                  <Icon className="w-4 h-4" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block text-xs font-semibold leading-snug ${sel ? 'text-plum' : 'text-ink'}`}>{o.label}</span>
                {o.hint && <span className="block text-[11px] text-ink/50 mt-0.5 leading-snug">{o.hint}</span>}
              </span>
              <span
                className={`mt-px flex items-center justify-center w-[18px] h-[18px] shrink-0 rounded-full border-2 transition-all duration-200
                  ${sel ? 'border-plum' : 'border-line'}`}
              >
                <span className={`rounded-full bg-plum transition-all duration-200 ${sel ? 'w-2.5 h-2.5' : 'w-0 h-0'}`} />
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className={`flex ${direction === 'horizontal' ? 'flex-row flex-wrap gap-x-5 gap-y-2' : 'flex-col gap-2.5'} ${className}`} role="radiogroup">
      {options.map((o) => (
        <Radio
          key={o.value}
          name={groupName}
          checked={o.value === value}
          onChange={() => onChange(o.value)}
          label={o.label}
          hint={o.hint}
          disabled={o.disabled}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Switch — toggle                                                   */
/* ---------------------------------------------------------------- */

export function Switch({
  checked, onChange, defaultChecked, label, hint, disabled, className = '',
}: {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  defaultChecked?: boolean;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [on, emit] = useBoolValue<boolean>(checked, defaultChecked, onChange, true);
  return (
    <label className={`flex items-center gap-3 group ${disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => emit(!on)}
        className={`relative w-10 h-[22px] shrink-0 rounded-full transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-lilac
          ${on ? 'bg-plum' : 'bg-ink/15 group-hover:bg-ink/25'}`}
      >
        <span
          className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-out-soft
            ${on ? 'left-[21px]' : 'left-[3px]'} ${!disabled ? 'group-active:scale-90' : ''}`}
        />
      </button>
      {(label || hint) && (
        <span className="min-w-0 select-none">
          {label && <span className="block text-xs font-medium text-ink/80 leading-snug">{label}</span>}
          {hint && <span className="block text-[11px] text-ink/45 mt-0.5">{hint}</span>}
        </span>
      )}
    </label>
  );
}

/* ---------------------------------------------------------------- */
/* SegmentedControl — pill tab switcher                              */
/* ---------------------------------------------------------------- */

export function SegmentedControl({
  value, onChange, options, className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; icon?: LucideIcon }[];
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-xl bg-canvas border border-line ${className}`} role="tablist">
      {options.map((o) => {
        const sel = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={sel}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-plum/40
              ${sel ? 'bg-white text-plum shadow-sm' : 'text-ink/55 hover:text-ink hover:bg-white/60'}`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />} {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* FileInput — custom drop zone                                      */
/* ---------------------------------------------------------------- */

export function FileInput({
  onFiles, accept, multiple, hint = 'PNG, JPG or PDF up to 10 MB', label = 'Click to upload or drag and drop', className = '',
}: {
  onFiles?: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  label?: string;
  className?: string;
}) {
  const [over, setOver] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  const take = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setNames(Array.from(files).map((f) => f.name));
    onFiles?.(files);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files); }}
        className={`w-full rounded-xl border-2 border-dashed px-4 py-6 flex flex-col items-center gap-2 transition-all duration-200 outline-none focus-visible:ring-4 focus-visible:ring-lilac
          ${over ? 'border-plum bg-lilac/60 scale-[1.01]' : 'border-line bg-canvas hover:border-plum/50 hover:bg-lilac/30'}`}
      >
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${over ? 'bg-plum text-white scale-110' : 'bg-lilac text-plum'}`}>
          <Upload className="w-5 h-5" />
        </span>
        <span className="text-xs font-semibold text-ink">{label}</span>
        <span className="text-[11px] text-ink/45">{hint}</span>
      </button>
      <input ref={ref} type="file" accept={accept} multiple={multiple} onChange={(e) => take(e.target.files)} className="hidden" />
      {names.length > 0 && (
        <ul className="mt-2 space-y-1">
          {names.map((n) => (
            <li key={n} className="flex items-center gap-1.5 text-[11px] text-plum font-medium">
              <Check className="w-3 h-3" /> {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
