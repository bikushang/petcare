'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PawPrint, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, User as UserIcon, KeyRound, ArrowLeft } from 'lucide-react';
import { login, getUser, requestPasswordReset, confirmPasswordReset } from '../lib/auth';
import { Field, Input } from '../components/ui';
import { demoAccounts, roleInfo } from '../lib/platform';
import type { Role } from '../lib/platform';

type Mode = 'login' | 'reset-request' | 'reset-confirm';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    if (getUser()) {
      router.replace('/');
    }
  }, [router]);

  const pickRole = (accountEmail: string, accountPass: string) => {
    setEmail(accountEmail);
    setPassword(accountPass);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError((err as Error).message || 'Invalid email or password. Try a role card below for quick access.');
    } finally {
      setLoading(false);
    }
  };

  const submitResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = await requestPasswordReset(resetEmail);
      setResetToken(token);
      setMode('reset-confirm');
      setResetMsg('A reset token has been generated. Enter your new password below.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const submitResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(resetToken, newPassword);
      setMode('login');
      setEmail(resetEmail);
      setResetMsg('Password reset successfully. You can now sign in.');
      setNewPassword('');
      setResetToken('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[42%] xl:w-[38%] bg-gradient-to-br from-plum to-[#2E1065] p-10 xl:p-14 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
        <div className="absolute bottom-10 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-16" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
              <PawPrint className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-semibold">PetCare Pro</div>
              <div className="text-xs text-white/70">Veterinary Practice Platform</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
            Everything your clinic needs, in one calm workspace.
          </h1>
          <p className="mt-4 text-white/75 leading-relaxed max-w-md">
            Secure sign-in with role-based access. Manage patients, appointments, medical records, pharmacy, billing, and staff — all tailored to what your role does best.
          </p>
          <div className="mt-8 flex gap-6">
            <div>
              <div className="text-2xl font-bold">13</div>
              <div className="text-xs text-white/60">Role-based views</div>
            </div>
            <div>
              <div className="text-2xl font-bold">10+</div>
              <div className="text-xs text-white/60">Clinical modules</div>
            </div>
            <div>
              <div className="text-2xl font-bold">2</div>
              <div className="text-xs text-white/60">Branches</div>
            </div>
          </div>
        </div>
        <div className="relative text-xs text-white/50">
          (c) 2026 PetCare Pro. Secure authentication with JWT sessions.
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto bg-canvas">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-plum text-white flex items-center justify-center">
              <PawPrint className="w-5 h-5" />
            </div>
            <div className="text-lg font-semibold text-ink">PetCare Pro</div>
          </div>

          {mode === 'login' && (
            <>
              <h2 className="text-xl font-bold text-ink">Welcome back</h2>
              <p className="text-sm text-ink/50 mt-1">Sign in to access your role-based dashboard.</p>

              {resetMsg && (
                <div className="mt-3 text-xs text-plum bg-lilac border border-plum/20 rounded-lg px-3 py-2">
                  {resetMsg}
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="Email">
                  <Input
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@petcare.pro"
                  />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <Input
                      type={showPass ? 'text' : 'password'}
                      icon={Lock}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=".........."
                      className="[&_input]:pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      className="hv-icon absolute right-3 top-1/2 -translate-y-1/2 z-10 text-ink/40 hover:text-plum"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                {error && (
                  <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setMode('reset-request'); setError(''); setResetEmail(email); }}
                    className="text-[11px] text-plum hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="hv-lift w-full h-11 rounded-xl bg-plum text-white text-sm font-semibold hover:bg-grape shadow-sm hover:shadow-lift flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : <>Sign in <ArrowRight className="w-4 h-4 hv-slide" /></>}
                </button>
              </form>

              <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-[11px] text-ink/40 font-medium uppercase tracking-wide">Quick role access</span>
                  <div className="flex-1 h-px bg-line" />
                </div>
                <p className="text-[11px] text-ink/50 mb-3 text-center">
                  Click any role card to auto-fill credentials, then sign in.
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {demoAccounts.map((a) => {
                    const isSelected = selectedRole === a.email || email === a.email;
                    const colorCls = roleInfo[a.role as Role]?.badgeColor ?? 'bg-ink/5 text-ink/60 border-line';
                    return (
                      <button
                        key={a.email}
                        onClick={() => {
                          pickRole(a.email, a.password);
                          setSelectedRole(a.email);
                        }}
                        className={`hv-lift flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left ${
                          isSelected
                            ? 'border-plum bg-lilac ring-2 ring-lilac'
                            : 'border-line bg-white hover:border-plum/40 hover:bg-canvas'
                        }`}
                      >
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${colorCls}`}>
                          {a.role === 'Super Admin' || a.role === 'Clinic Owner' ? (
                            <Shield className="w-2.5 h-2.5" />
                          ) : a.role === 'Pet Owner' ? (
                            <UserIcon className="w-2.5 h-2.5" />
                          ) : null}
                          {a.role}
                        </div>
                        <div className="text-xs font-medium text-ink truncate w-full">{a.name}</div>
                        <div className="text-[10px] text-ink/40 truncate w-full">{a.email}</div>
                        <div className="text-[10px] text-ink/40">Pass: {a.password}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {mode === 'reset-request' && (
            <>
              <button onClick={() => { setMode('login'); setError(''); }} className="hv-slide-parent flex items-center gap-1 text-xs text-ink/50 hover:text-plum transition-colors duration-200 mb-4">
                <ArrowLeft className="w-3.5 h-3.5 hv-slide-back" /> Back to sign in
              </button>
              <h2 className="text-xl font-bold text-ink">Reset your password</h2>
              <p className="text-sm text-ink/50 mt-1">Enter your email and we&apos;ll generate a reset token.</p>
              <form onSubmit={submitResetRequest} className="mt-6 space-y-4">
                <Field label="Email">
                  <Input
                    type="email"
                    icon={Mail}
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="you@petcare.pro"
                  />
                </Field>
                {error && (
                  <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="hv-lift w-full h-11 rounded-xl bg-plum text-white text-sm font-semibold hover:bg-grape shadow-sm hover:shadow-lift flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? 'Sending...' : <><KeyRound className="w-4 h-4" /> Request reset</>}
                </button>
              </form>
            </>
          )}

          {mode === 'reset-confirm' && (
            <>
              <button onClick={() => { setMode('login'); setError(''); }} className="hv-slide-parent flex items-center gap-1 text-xs text-ink/50 hover:text-plum transition-colors duration-200 mb-4">
                <ArrowLeft className="w-3.5 h-3.5 hv-slide-back" /> Back to sign in
              </button>
              <h2 className="text-xl font-bold text-ink">Set new password</h2>
              <p className="text-sm text-ink/50 mt-1">{resetMsg}</p>
              <form onSubmit={submitResetConfirm} className="mt-6 space-y-4">
                <Field label="New password" hint="Minimum 6 characters">
                  <Input
                    type="password"
                    icon={Lock}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                  />
                </Field>
                {error && (
                  <div className="text-xs text-coral bg-coral/10 border border-coral/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="hv-lift w-full h-11 rounded-xl bg-plum text-white text-sm font-semibold hover:bg-grape shadow-sm hover:shadow-lift flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? 'Resetting...' : <><KeyRound className="w-4 h-4" /> Reset password</>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
