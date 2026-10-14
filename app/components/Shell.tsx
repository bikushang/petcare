'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Modal, Field, Input, Button } from './ui';
import { useRequireAuth, changePassword } from '../lib/auth';
import { canAccessModule, type Module } from '../lib/platform';

export default function Shell({
  title,
  subtitle,
  module,
  children,
}: {
  title: string;
  subtitle?: string;
  /**
   * Which permission module this page belongs to. The sidebar already hides
   * links a role cannot use, but without this the page itself was reachable
   * by typing the URL — so a Groomer could open /staff or /security directly.
   */
  module?: Module;
  children: ReactNode;
}) {
  const user = useRequireAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-sm text-ink/50">Redirecting to sign in...</div>
      </div>
    );
  }

  const permitted = !module || canAccessModule(user.role, module);

  const handleChangePassword = async () => {
    setPwError('');
    setPwSuccess(false);
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => { setPwOpen(false); setPwSuccess(false); }, 2000);
    } catch (err) {
      setPwError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex bg-canvas">
      <Sidebar role={user.role} branch={user.branch} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} user={user} onPasswordChange={() => setPwOpen(true)} />
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          {permitted ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-coral/15 text-coral flex items-center justify-center mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-ink">You do not have access to this section</h2>
              <p className="text-sm text-ink/55 mt-1.5 max-w-sm leading-relaxed">
                Your role ({user.role}) does not include the <span className="font-medium text-ink/75">{module}</span> module.
                If you need it, ask a Clinic Owner or Super Admin to update your permissions.
              </p>
              <Link
                href="/"
                className="hv-lift mt-6 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-plum text-white text-sm font-medium"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </main>
      </div>

      <Modal open={pwOpen} onClose={() => { setPwOpen(false); setPwError(''); setPwSuccess(false); }} title="Change password">
        <div className="space-y-3">
          <Field label="Current password">
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
            />
          </Field>
          <Field label="New password" hint="Minimum 6 characters" error={pwError && newPw.length < 6 ? pwError : undefined}>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min 6 characters"
              error={!!pwError && newPw.length < 6}
              onEnter={handleChangePassword}
            />
          </Field>
          {pwError && (
            <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="text-xs text-plum bg-lilac border border-plum/20 rounded-lg px-3 py-2">Password changed successfully.</div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => { setPwOpen(false); setPwError(''); setPwSuccess(false); }}>Cancel</Button>
            <Button onClick={handleChangePassword}>Change password</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
