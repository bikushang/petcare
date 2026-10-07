'use client';

import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Modal, Field, inputCls, Button } from './ui';
import { useRequireAuth, changePassword } from '../lib/auth';

export default function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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
        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      <Modal open={pwOpen} onClose={() => { setPwOpen(false); setPwError(''); setPwSuccess(false); }} title="Change password">
        <div className="space-y-3">
          <Field label="Current password">
            <input
              type="password"
              className={inputCls}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              className={inputCls}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min 6 characters"
            />
          </Field>
          {pwError && (
            <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="text-xs text-sage bg-mint border border-sage/20 rounded-lg px-3 py-2">Password changed successfully.</div>
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
