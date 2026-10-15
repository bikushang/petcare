'use client';

import {
  Bell, ChevronDown, LogOut, KeyRound, User as UserIcon, Building2,
  PawPrint, Users, Receipt, CalendarDays, Package, CircleAlert, Clock, Search, Menu,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '../lib/auth';
import { logout } from '../lib/auth';
import { SearchInput } from './ui';
import { branches, branchNames } from '../lib/platform';
import { getActiveBranchView, setActiveBranchView, useDB } from '../lib/store';
import { invoiceTotals, daysBetween, localDateISO, num } from '../lib/helpers';
import { useSettings, formatMoney, lowStockThresholdOf } from '../lib/settings';

const roleInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

const PLATFORM_ROLES = ['Super Admin', 'Clinic Owner'];

export default function Topbar({ title, subtitle, user, onPasswordChange, onOpenMobileNav }: {
  title: string;
  subtitle?: string;
  user: User;
  onPasswordChange?: () => void;
  onOpenMobileNav?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const router = useRouter();
  const { db } = useDB();
  const { settings } = useSettings();
  const isPlatform = PLATFORM_ROLES.includes(user.role);

  const [activeBranch, setActiveBranch] = useState<string>(() => {
    if (!isPlatform) return user.branch;
    return getActiveBranchView() || 'All branches';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      setActiveBranch(detail);
    };
    window.addEventListener('branch-switch', handler);
    return () => window.removeEventListener('branch-switch', handler);
  }, []);

  /* ── Global search ───────────────────────────────────────────
     The box used to be a dead input: `query` was set and read by
     nothing. It now searches pets, clients, invoices and appointments
     and links straight to the owning module. */
  type Hit = { id: string; label: string; sub: string; href: string; icon: typeof PawPrint };
  const results = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!db || q.length < 2) return [];
    const hits: Hit[] = [];
    const push = (h: Hit) => { if (hits.length < 12) hits.push(h); };

    for (const p of db.pets) {
      if (p.name.toLowerCase().includes(q) || (p.breed || '').toLowerCase().includes(q)) {
        const owner = db.owners.find((o) => o.id === p.ownerId);
        push({ id: p.id, label: p.name, sub: `${p.species}${p.breed ? ` · ${p.breed}` : ''}${owner ? ` · ${owner.name}` : ''}`, href: '/patients', icon: PawPrint });
      }
    }
    for (const o of db.owners) {
      if (o.name.toLowerCase().includes(q) || (o.phone || '').includes(q) || (o.email || '').toLowerCase().includes(q)) {
        push({ id: o.id, label: o.name, sub: [o.phone, o.email].filter(Boolean).join(' · ') || 'Client', href: '/patients', icon: Users });
      }
    }
    const ownerName = (id: string) => db.owners.find((o) => o.id === id)?.name ?? '';
    const petName = (id: string) => db.pets.find((pt) => pt.id === id)?.name ?? '';

    for (const i of db.invoices) {
      const who = ownerName(i.ownerId);
      if ((i.number || '').toLowerCase().includes(q) || who.toLowerCase().includes(q)) {
        const t = invoiceTotals(i);
        push({ id: i.id, label: i.number || 'Invoice', sub: `${who || 'Client'} · ${formatMoney(t.total, settings)}${t.balance > 0 ? ` · ${formatMoney(t.balance, settings)} due` : ' · settled'}`, href: '/billing', icon: Receipt });
      }
    }
    for (const a of db.appointments) {
      const pn = petName(a.petId);
      const on = ownerName(a.ownerId);
      if (pn.toLowerCase().includes(q) || on.toLowerCase().includes(q) || (a.vet || '').toLowerCase().includes(q)) {
        push({ id: a.id, label: `${pn || 'Appointment'} — ${a.date}`, sub: `${a.time || ''}${a.vet ? ` · ${a.vet}` : ''} · ${a.status}`.trim(), href: '/appointments', icon: CalendarDays });
      }
    }
    return hits;
  }, [db, query, settings]);

  /* ── Notifications ──────────────────────────────────────────
     The bell had no onClick and an unconditional unread dot. It now
     opens a panel of alerts derived from real data. */
  type Alert = { id: string; label: string; sub: string; href: string; icon: typeof Bell; tone: 'coral' | 'amber' | 'plum' };
  const alerts = useMemo<Alert[]>(() => {
    if (!db) return [];
    const out: Alert[] = [];
    const today = localDateISO();
    const threshold = lowStockThresholdOf(settings);

    const low = db.medStock.filter((m) => num(m.stock) <= (num(m.reorderLevel) || threshold));
    if (low.length) {
      out.push({ id: 'low-stock', label: `${low.length} item${low.length > 1 ? 's' : ''} low on stock`, sub: low.slice(0, 3).map((m) => m.name).join(', '), href: '/pharmacy', icon: Package, tone: 'amber' });
    }

    const overdue = db.invoices.filter((i) => {
      const t = invoiceTotals(i);
      if (t.balance <= 0 || i.status === 'Draft' || i.status === 'Cancelled') return false;
      const due = i.dueDate || i.date;
      const gap = daysBetween(due, today);
      return gap !== null && gap > 0;
    });
    if (overdue.length) {
      const sum = overdue.reduce((s, i) => s + invoiceTotals(i).balance, 0);
      out.push({ id: 'overdue', label: `${overdue.length} invoice${overdue.length > 1 ? 's' : ''} overdue`, sub: `${formatMoney(sum, settings)} outstanding`, href: '/billing', icon: Receipt, tone: 'coral' });
    }

    const pendingLeave = db.staff.reduce((n, st) => n + (st.leaveRequests || []).filter((l) => l.status === 'Pending').length, 0);
    if (pendingLeave) {
      out.push({ id: 'leave', label: `${pendingLeave} leave request${pendingLeave > 1 ? 's' : ''} pending`, sub: 'Awaiting your approval', href: '/staff', icon: Clock, tone: 'plum' });
    }

    const todays = db.appointments.filter((a) => a.date === today && a.status === 'Scheduled');
    if (todays.length) {
      out.push({ id: 'today', label: `${todays.length} appointment${todays.length > 1 ? 's' : ''} today`, sub: 'Still marked as scheduled', href: '/appointments', icon: CalendarDays, tone: 'plum' });
    }

    const expiring = db.medStock.filter((m) => {
      const gap = m.expiry ? daysBetween(today, m.expiry) : null;
      return gap !== null && gap >= 0 && gap <= 30;
    });
    if (expiring.length) {
      out.push({ id: 'expiring', label: `${expiring.length} batch${expiring.length > 1 ? 'es' : ''} expiring soon`, sub: 'Within 30 days', href: '/pharmacy', icon: CircleAlert, tone: 'amber' });
    }

    return out;
  }, [db, settings]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const switchBranch = (branch: string) => {
    setActiveBranch(branch);
    setActiveBranchView(branch === 'All branches' ? null : branch);
    window.dispatchEvent(new CustomEvent('branch-switch', { detail: branch }));
    setBranchOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 md:px-6 h-16 bg-white/90 backdrop-blur border-b border-line">
      {onOpenMobileNav && (
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-ink/70 hover:bg-lilac hover:text-plum shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold text-ink truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-ink/50 truncate">{subtitle}</p>}
      </div>
      <div className="flex-1" />

      <div className="hidden md:block relative w-64">
        <SearchInput
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
          placeholder="Search patients, owners, invoices..."
        />
        {searchOpen && query.trim().length >= 2 && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setSearchOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-80 overflow-y-auto rounded-xl bg-white border border-line shadow-soft py-1.5 animate-popIn">
              {results.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <Search className="w-4 h-4 text-ink/30 mx-auto mb-1.5" />
                  <p className="text-xs text-ink/50">No matches for “{query.trim()}”</p>
                </div>
              ) : (
                results.map((r) => (
                  <Link
                    key={`${r.href}-${r.id}`}
                    href={r.href}
                    onClick={() => { setSearchOpen(false); setQuery(''); }}
                    className="flex items-start gap-2.5 px-3 py-2 hover:bg-lilac transition-colors duration-150"
                  >
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-lilac text-plum flex items-center justify-center mt-0.5">
                      <r.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink truncate">{r.label}</span>
                      <span className="block text-[11px] text-ink/50 truncate">{r.sub}</span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Branch switcher for platform roles */}
      {isPlatform ? (
        <div className="relative">
          <button
            onClick={() => setBranchOpen((v) => !v)}
            className="hv-lift hidden md:flex items-center gap-1.5 px-3 h-8 rounded-lg bg-lilac text-plum text-[11px] font-medium hover:bg-plum hover:text-white"
          >
            <Building2 className="w-3.5 h-3.5" />
            {activeBranch}
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${branchOpen ? 'rotate-180' : ''}`} />
          </button>
          {branchOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBranchOpen(false)} />
              <div className="absolute right-0 top-10 mt-1 w-48 rounded-xl bg-white border border-line shadow-soft py-1.5 z-40 animate-popIn">
                <div className="px-3 py-1 text-[10px] text-ink/40 uppercase tracking-wide font-medium">Switch branch view</div>
                <button
                  onClick={() => switchBranch('All branches')}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-lilac hover:text-plum transition-colors duration-150 flex items-center gap-2 ${activeBranch === 'All branches' ? 'text-plum font-medium' : 'text-ink/70'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> All branches
                </button>
                {branchNames.map((b) => (
                  <button
                    key={b}
                    onClick={() => switchBranch(b)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-lilac hover:text-plum transition-colors duration-150 flex items-center gap-2 ${activeBranch === b ? 'text-plum font-medium' : 'text-ink/70'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-plum/30" /> {b}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-lilac text-plum text-[11px] font-medium">
          <UserIcon className="w-3.5 h-3.5" />
          {user.branch}
        </div>
      )}

      <div className="relative">
        <button
          aria-label={`Notifications${alerts.length ? ` (${alerts.length})` : ''}`}
          onClick={() => setNotifOpen((v) => !v)}
          className="hv-icon relative flex items-center justify-center w-9 h-9 rounded-lg text-ink/70 hover:bg-lilac hover:text-plum"
        >
          <Bell className="w-5 h-5" />
          {alerts.length > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-1 rounded-full bg-coral text-white text-[9px] font-bold leading-[15px] text-center">
              {alerts.length}
            </span>
          )}
        </button>
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-11 w-80 rounded-xl bg-white border border-line shadow-soft py-1.5 z-40 animate-popIn">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/45">Needs attention</span>
                {alerts.length > 0 && <span className="text-[10px] text-ink/40">{alerts.length}</span>}
              </div>
              {alerts.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <span className="w-9 h-9 rounded-xl bg-lilac text-plum flex items-center justify-center mx-auto mb-2">
                    <Bell className="w-4 h-4" />
                  </span>
                  <p className="text-xs font-medium text-ink">Nothing needs attention</p>
                  <p className="text-[11px] text-ink/45 mt-0.5">Stock, invoices and leave are all clear.</p>
                </div>
              ) : (
                alerts.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    onClick={() => setNotifOpen(false)}
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-lilac transition-colors duration-150"
                  >
                    <span
                      className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center mt-px ${
                        a.tone === 'coral' ? 'bg-coral/15 text-coral'
                        : a.tone === 'amber' ? 'bg-amber-100 text-amber-600'
                        : 'bg-lilac text-plum'
                      }`}
                    >
                      <a.icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-ink leading-snug">{a.label}</span>
                      <span className="block text-[11px] text-ink/50 truncate">{a.sub}</span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="hv-lift flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-lilac"
      >
        <div className="w-7 h-7 rounded-full bg-coral/20 text-coral flex items-center justify-center text-xs font-semibold">
          {roleInitials(user.name)}
        </div>
        <div className="hidden md:block text-left leading-tight">
          <div className="text-sm font-medium text-ink">{user.name}</div>
          <div className="text-[10px] text-ink/50">{user.role}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-ink/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-6 top-14 mt-1 w-64 rounded-xl bg-white border border-line shadow-soft py-2 text-sm z-40 animate-popIn">
            <div className="px-3 py-2 border-b border-line">
              <div className="font-medium text-ink">{user.name}</div>
              <div className="text-[11px] text-ink/50">{user.role}</div>
              <div className="text-[11px] text-ink/40 mt-0.5">{user.email}</div>
            </div>
            <div className="px-3 py-1.5 border-b border-line">
              <div className="text-[10px] text-ink/40 uppercase tracking-wide">Branch</div>
              <div className="text-xs text-ink/70">{isPlatform ? activeBranch : user.branch}</div>
              {user.branchAccess && user.branchAccess.length > 0 && (
                <div className="text-[10px] text-ink/40 mt-0.5">
                  Access: {user.branchAccess.join(', ')}
                </div>
              )}
            </div>
            {onPasswordChange && (
              <button
                onClick={() => { setOpen(false); onPasswordChange(); }}
                className="hv-slide-parent w-full text-left px-3 py-2 hover:bg-lilac hover:text-plum text-ink/80 transition-colors duration-150 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 hv-slide" /> Change password
              </button>
            )}
            <button
              onClick={handleLogout}
              className="hv-slide-parent w-full text-left px-3 py-2 hover:bg-coral/10 text-coral font-medium transition-colors duration-150 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4 hv-slide" /> Sign out
            </button>
          </div>
        </>
      )}
    </header>
  );
}
