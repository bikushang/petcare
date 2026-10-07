'use client';

import { Bell, Search, ChevronDown, LogOut, KeyRound, User as UserIcon, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../lib/auth';
import { logout } from '../lib/auth';
import { branches, branchNames } from '../lib/platform';
import { getActiveBranchView, setActiveBranchView } from '../lib/store';

const roleInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

const PLATFORM_ROLES = ['Super Admin', 'Clinic Owner'];

export default function Topbar({ title, subtitle, user, onPasswordChange }: {
  title: string;
  subtitle?: string;
  user: User;
  onPasswordChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const router = useRouter();
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
    <header className="sticky top-0 z-20 flex items-center gap-3 px-6 h-16 bg-white/90 backdrop-blur border-b border-line">
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold text-ink truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-ink/50 truncate">{subtitle}</p>}
      </div>
      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-canvas border border-line w-64">
        <Search className="w-4 h-4 text-ink/40" />
        <input
          placeholder="Search patients, owners, invoices..."
          className="bg-transparent border-0 outline-none text-sm w-full placeholder:text-ink/40"
        />
      </div>

      {/* Branch switcher for platform roles */}
      {isPlatform ? (
        <div className="relative">
          <button
            onClick={() => setBranchOpen((v) => !v)}
            className="hidden md:flex items-center gap-1.5 px-3 h-8 rounded-lg bg-mint text-sage text-[11px] font-medium hover:bg-sage hover:text-white transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            {activeBranch}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {branchOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setBranchOpen(false)} />
              <div className="absolute right-0 top-10 mt-1 w-48 rounded-xl bg-white border border-line shadow-soft py-1.5 z-40">
                <div className="px-3 py-1 text-[10px] text-ink/40 uppercase tracking-wide font-medium">Switch branch view</div>
                <button
                  onClick={() => switchBranch('All branches')}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-canvas transition-colors flex items-center gap-2 ${activeBranch === 'All branches' ? 'text-sage font-medium' : 'text-ink/70'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> All branches
                </button>
                {branchNames.map((b) => (
                  <button
                    key={b}
                    onClick={() => switchBranch(b)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-canvas transition-colors flex items-center gap-2 ${activeBranch === b ? 'text-sage font-medium' : 'text-ink/70'}`}
                  >
                    <div className="w-2 h-2 rounded-full bg-sage/30" /> {b}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-mint text-sage text-[11px] font-medium">
          <UserIcon className="w-3.5 h-3.5" />
          {user.branch}
        </div>
      )}

      <button className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-canvas transition-colors">
        <Bell className="w-5 h-5 text-ink/70" />
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-coral" />
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-lg hover:bg-canvas transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-coral/20 text-coral flex items-center justify-center text-xs font-semibold">
          {roleInitials(user.name)}
        </div>
        <div className="hidden md:block text-left leading-tight">
          <div className="text-sm font-medium text-ink">{user.name}</div>
          <div className="text-[10px] text-ink/50">{user.role}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-ink/50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-6 top-14 mt-1 w-64 rounded-xl bg-white border border-line shadow-soft py-2 text-sm z-40">
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
                className="w-full text-left px-3 py-2 hover:bg-canvas text-ink/80 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" /> Change password
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 hover:bg-coral/10 text-coral font-medium flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </header>
  );
}
