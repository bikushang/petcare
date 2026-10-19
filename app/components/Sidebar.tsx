'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Activity, Shield, X } from 'lucide-react';
import { navForRole, roleInfo } from '../lib/platform';
import type { Role } from '../lib/auth';

export default function Sidebar({
  role,
  branch,
  mobileOpen = false,
  onClose,
}: {
  role: Role;
  branch: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const items = navForRole(role);
  const info = roleInfo[role];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar — hidden on desktop via the className, rendered as drawer on mobile */}
    <aside className={`
      fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 lg:z-auto
      h-screen
      flex flex-col w-64 shrink-0 border-r border-line bg-white
      transform transition-transform duration-300 ease-out-soft
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      <Link href="/" className="hv-slide-parent group flex items-center gap-2.5 px-5 h-16 border-b border-line">
        <div className="hv-tile flex items-center justify-center w-9 h-9 rounded-xl bg-plum text-white shadow-lift-sm">
          <PawPrint className="w-5 h-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink group-hover:text-plum transition-colors duration-200">PetCare Pro</div>
          <div className="text-[11px] text-plum/80">{branch}</div>
        </div>
      </Link>
      <nav className="min-h-0 flex-1 overflow-y-auto py-3 px-3">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out-soft hover:translate-x-0.5 ${
                active ? 'bg-lilac text-plum' : 'text-ink/70 hover:bg-lilac/50 hover:text-plum'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-plum" />}
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 ease-out-soft group-hover:scale-110 ${
                  active ? 'text-plum' : 'text-ink/45 group-hover:text-plum'
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-lilac/70 p-3.5">
        <div className="flex items-center gap-2 text-plum">
          {info?.scope === 'platform' ? <Shield className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          <span className="text-xs font-semibold">System status</span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink/60 leading-relaxed">
          Signed in as {role}. {info?.scope === 'platform' ? 'Full platform access.' : info?.scope === 'clinic' ? 'All branches access.' : `${branch} branch.`}
        </p>
      </div>

      {/* Close button — only visible in mobile drawer */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-lilac text-ink/60 flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </aside>
    </>
  );
}
