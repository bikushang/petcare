'use client';

/* ════════════════════════════════════════════════════════════════════
   Clinic settings — single source of truth
   ────────────────────────────────────────────────────────────────────
   Settings used to be private to app/settings/page.tsx, which meant
   nothing a user changed there had any effect: the clinic name, currency,
   tax rate, date format, theme and primary colour were written to
   localStorage and never read again.

   This module owns the shape, the storage and the side effects, so every
   page can read settings and the appearance controls genuinely restyle
   the app (via the CSS custom properties declared in globals.css).
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { fetchConfig, saveConfig } from './api';

export const SETTINGS_KEY = 'petcare-pro-settings';
export const SETTINGS_CONFIG_KEY = 'clinic-settings';

export type ClinicSettings = {
  clinicName: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  taxId: string;
  registrationNumber: string;
  currency: string;
  currencySymbol: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  taxRate: string;
  taxInclusive: boolean;
  invoicePrefix: string;
  estimatePrefix: string;
  receiptPrefix: string;
  prescriptionPrefix: string;
  labTestPrefix: string;
  surgeryPrefix: string;
  boardingPrefix: string;
  groomingPrefix: string;
  theme: string;
  primaryColor: string;
  fontSize: string;
  emailFrom: string;
  emailReplyTo: string;
  smsProvider: string;
  lowStockThreshold: string;
  appointmentSlotMin: string;
  enableOnlineBooking: boolean;
  enableSelfCheckIn: boolean;
  autoGenerateInvoices: boolean;
};

// Sample/demo clinic defaults. Replace these values before using the app for a real clinic.
export const defaultSettings: ClinicSettings = {
  clinicName: 'Vetnora Demo Clinic (Fictional)',
  legalName: 'Vetnora Demo Clinic - Not a Legal Entity',
  phone: '+1 202 555 0100',
  email: 'demo@example.invalid',
  address: '100 Example Avenue, Example City, ZZ 00000',
  website: 'https://example.invalid/vetnora-demo',
  taxId: 'DEMO-NOT-REAL',
  registrationNumber: 'DEMO-NOT-REAL',
  currency: 'USD',
  currencySymbol: '$',
  language: 'English',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  timezone: 'UTC',
  taxRate: '0',
  taxInclusive: false,
  invoicePrefix: 'INV-',
  estimatePrefix: 'EST-',
  receiptPrefix: 'RCP-',
  prescriptionPrefix: 'RX-',
  labTestPrefix: 'LAB-',
  surgeryPrefix: 'SRG-',
  boardingPrefix: 'BRD-',
  groomingPrefix: 'GRM-',
  theme: 'light',
  primaryColor: '#4C1D95',
  fontSize: 'medium',
  emailFrom: 'demo@example.invalid',
  emailReplyTo: 'demo@example.invalid',
  smsProvider: 'Demo only - not configured',
  lowStockThreshold: '10',
  appointmentSlotMin: '30',
  enableOnlineBooking: false,
  enableSelfCheckIn: false,
  autoGenerateInvoices: true,
};

export function readSettings(): ClinicSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function writeSettings(s: ClinicSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  // Let every mounted consumer re-read immediately, in this tab and others.
  window.dispatchEvent(new CustomEvent('petcare-settings-change', { detail: s }));
}

/* ──────────────────────────────────────────────────────────────
   Colour maths — derive a full violet-style ramp from one hex so
   the whole palette stays coherent when the user picks a colour.
   ────────────────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix toward black (`amount` < 0) or white (`amount` > 0), -1..1. */
function shift([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return [
    Math.round(r + (target - r) * t),
    Math.round(g + (target - g) * t),
    Math.round(b + (target - b) * t),
  ];
}

const rgbVar = (c: [number, number, number]) => `${c[0]} ${c[1]} ${c[2]}`;

export type ThemeVars = Record<string, string>;

type ThemeDef = {
  neutrals: { ink: [number, number, number]; canvas: [number, number, number]; line: [number, number, number]; surface: [number, number, number] };
  /** When true, derive brand colours from the user's primary; otherwise use fixed palette. */
  usePrimary: boolean;
  /** Fixed brand palette for named themes that ignore primaryColor. */
  brand?: { plum: [number, number, number]; grape: [number, number, number]; iris: [number, number, number]; lilac: [number, number, number] };
};

const THEME_DEFS: Record<string, ThemeDef> = {
  light: {
    usePrimary: true,
    neutrals: { ink: [26, 13, 46], canvas: [250, 249, 253], line: [232, 227, 243], surface: [255, 255, 255] },
  },
  dark: {
    usePrimary: true,
    neutrals: { ink: [237, 233, 254], canvas: [20, 12, 33], line: [54, 38, 82], surface: [30, 20, 48] },
  },
  plum: {
    usePrimary: false,
    brand: { plum: [76, 29, 149], grape: [59, 7, 100], iris: [124, 58, 237], lilac: [237, 233, 254] },
    neutrals: { ink: [26, 13, 46], canvas: [250, 249, 253], line: [232, 227, 243], surface: [255, 255, 255] },
  },
  coral: {
    usePrimary: false,
    brand: { plum: [241, 127, 101], grape: [180, 83, 62], iris: [251, 146, 121], lilac: [255, 237, 230] },
    neutrals: { ink: [42, 24, 20], canvas: [253, 250, 248], line: [245, 229, 222], surface: [255, 255, 255] },
  },
};

/**
 * Build the CSS custom properties for a given primary colour and theme.
 * Mirrors the token names in tailwind.config.ts.
 */
export function themeVarsFor(primary: string, theme: string): ThemeVars {
  const def = THEME_DEFS[theme] ?? THEME_DEFS.light;
  const vars: ThemeVars = {};

  if (def.usePrimary) {
    const base = hexToRgb(primary) ?? hexToRgb(defaultSettings.primaryColor)!;
    const dark = theme === 'dark';
    vars['--c-plum'] = rgbVar(base);
    vars['--c-grape'] = rgbVar(shift(base, -0.38));
    vars['--c-iris'] = rgbVar(shift(base, 0.26));
    vars['--c-lilac'] = rgbVar(shift(base, dark ? -0.62 : 0.88));
  } else if (def.brand) {
    vars['--c-plum'] = rgbVar(def.brand.plum);
    vars['--c-grape'] = rgbVar(def.brand.grape);
    vars['--c-iris'] = rgbVar(def.brand.iris);
    vars['--c-lilac'] = rgbVar(def.brand.lilac);
  }

  vars['--c-ink'] = rgbVar(def.neutrals.ink);
  vars['--c-canvas'] = rgbVar(def.neutrals.canvas);
  vars['--c-line'] = rgbVar(def.neutrals.line);
  vars['--c-surface'] = rgbVar(def.neutrals.surface);
  return vars;
}

const FONT_SCALE: Record<string, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

/**
 * Push the settings that have a visual effect onto the document. Called on
 * mount and on every settings change, so "Appearance" is no longer inert.
 */
export function applySettingsToDocument(s: ClinicSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const resolvedTheme =
    s.theme === 'auto'
      ? window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : s.theme;

  const vars = themeVarsFor(s.primaryColor, resolvedTheme);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

  root.style.setProperty('--app-font-size', FONT_SCALE[s.fontSize] ?? FONT_SCALE.medium);
  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', s.primaryColor);
}

/* ──────────────────────────────────────────────────────────────
   Hook
   ────────────────────────────────────────────────────────────── */

export function useSettings() {
  const [settings, setSettings] = useState<ClinicSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const localSettings = readSettings();
    setSettings(localSettings);
    applySettingsToDocument(localSettings);

    fetchConfig<ClinicSettings>(SETTINGS_CONFIG_KEY)
      .then((serverSettings) => {
        if (!mounted || !serverSettings) return;
        const merged = { ...defaultSettings, ...serverSettings };
        setSettings(merged);
        applySettingsToDocument(merged);
        writeSettings(merged);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    const onChange = (e: Event) => {
      const next = (e as CustomEvent<ClinicSettings>).detail ?? readSettings();
      setSettings(next);
      applySettingsToDocument(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY) onChange(new CustomEvent('x', { detail: readSettings() }));
    };
    window.addEventListener('petcare-settings-change', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      mounted = false;
      window.removeEventListener('petcare-settings-change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<ClinicSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      applySettingsToDocument(next);
      saveConfig(SETTINGS_CONFIG_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(defaultSettings);
    writeSettings(defaultSettings);
    applySettingsToDocument(defaultSettings);
    saveConfig(SETTINGS_CONFIG_KEY, defaultSettings).catch(() => {});
  }, []);

  return { settings, update, reset, loaded };
}

/* ──────────────────────────────────────────────────────────────
   Formatters driven by settings
   ────────────────────────────────────────────────────────────── */

/** Format an amount using the configured currency symbol. */
export function formatMoney(amount: number, s: ClinicSettings): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}${s.currencySymbol}${body}`;
}

/** Render an ISO `YYYY-MM-DD` string in the configured date format. */
export function formatDate(iso: string, s: ClinicSettings): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '—';
  const [, y, mo, d] = m;
  switch (s.dateFormat) {
    case 'DD/MM/YYYY':
      return `${d}/${mo}/${y}`;
    case 'MM/DD/YYYY':
      return `${mo}/${d}/${y}`;
    case 'DD-MMM-YYYY': {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d} ${months[Number(mo) - 1]} ${y}`;
    }
    default:
      return `${y}-${mo}-${d}`;
  }
}

/** Render an `HH:MM` string in the configured 12h/24h format. */
export function formatTime(hhmm: string, s: ClinicSettings): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return hhmm || '—';
  const h = Number(m[1]);
  if (s.timeFormat === '12h') {
    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m[2]} ${suffix}`;
  }
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** The configured tax rate as a number, guarded against bad input. */
export function taxRateOf(s: ClinicSettings): number {
  const n = parseFloat(s.taxRate);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** The configured low-stock threshold as a number. */
export function lowStockThresholdOf(s: ClinicSettings): number {
  const n = parseInt(s.lowStockThreshold, 10);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

/** Document-number prefix for a given document kind. */
export function prefixFor(
  kind: 'invoice' | 'estimate' | 'receipt' | 'prescription' | 'labTest' | 'surgery' | 'boarding' | 'grooming',
  s: ClinicSettings,
): string {
  const map: Record<typeof kind, string> = {
    invoice: s.invoicePrefix,
    estimate: s.estimatePrefix,
    receipt: s.receiptPrefix,
    prescription: s.prescriptionPrefix,
    labTest: s.labTestPrefix,
    surgery: s.surgeryPrefix,
    boarding: s.boardingPrefix,
    grooming: s.groomingPrefix,
  };
  return map[kind] || '';
}
