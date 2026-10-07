'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PawPrint, Activity, Shield } from 'lucide-react';
import { navForRole, roleInfo } from '../lib/platform';
import type { Role } from '../lib/auth';

export default function Sidebar({ role, branch }: { role: Role; branch: string }) {
  const pathname = usePathname();
  const items = navForRole(role);
  const info = roleInfo[role];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-line bg-white">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-line">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sage text-white">
          <PawPrint className="w-5 h-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">PetCare Pro</div>
          <div className="text-[11px] text-sage/80">{branch}</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-mint text-sage' : 'text-ink/70 hover:bg-mint/50 hover:text-ink'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-sage' : 'text-ink/45'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-mint/70 p-3.5">
        <div className="flex items-center gap-2 text-sage">
          {info?.scope === 'platform' ? <Shield className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          <span className="text-xs font-semibold">System status</span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink/60 leading-relaxed">
          Signed in as {role}. {info?.scope === 'platform' ? 'Full platform access.' : info?.scope === 'clinic' ? 'All branches access.' : `${branch} branch.`}
        </p>
      </div>
    </aside>
  );
}
