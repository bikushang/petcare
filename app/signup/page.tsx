'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PawPrint, Lock, Mail, Eye, EyeOff, ArrowRight, User as UserIcon,
  Building2, Phone, MapPin, ArrowLeft, CheckCircle2,
} from 'lucide-react';
import { signup, getUser } from '../lib/auth';
import { Field, Input } from '../components/ui';

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (getUser()) {
      router.replace('/');
    }
  }, [router]);

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter your full name';
    if (!email.trim()) return 'Please enter your email';
    if (!clinicName.trim()) return 'Please enter your clinic name';
    if (!branchName.trim()) return 'Please enter your first branch name';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPass) return 'Passwords do not match';
    if (!agreed) return 'Please accept the terms to continue';
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signup({
        name, email, password, phone, clinicName, branchName, address,
      });
      setSuccess(true);
      setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      setError((err as Error).message || 'Could not create your account. Please try again.');
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
              <div className="text-lg font-semibold">Vetnora</div>
              <div className="text-xs text-white/70">Veterinary Practice Platform</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
            Set up your clinic in minutes.
          </h1>
          <p className="mt-4 text-white/75 leading-relaxed max-w-md">
            Create your clinic owner account, add your first branch, and start managing patients, appointments, billing, and staff — all from one workspace.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Full Clinic Owner role with all management tools',
              'Add branches, staff, and services as you grow',
              'No credit card required to get started',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/85">
                <CheckCircle2 className="w-4 h-4 text-white/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-white/50">
          (c) 2026 Vetnora. Secure authentication with JWT sessions.
        </div>
      </div>

      {/* Right signup panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 overflow-y-auto bg-canvas">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-plum text-white flex items-center justify-center">
              <PawPrint className="w-5 h-5" />
            </div>
            <div className="text-lg font-semibold text-ink">Vetnora</div>
          </div>

          {success ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-ink">Account created!</h2>
              <p className="text-sm text-ink/50 mt-1.5">
                Taking you to your dashboard…
              </p>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hv-slide-parent flex items-center gap-1 text-xs text-ink/50 hover:text-plum transition-colors duration-200 mb-4"
              >
                <ArrowLeft className="w-3.5 h-3.5 hv-slide-back" /> Back to sign in
              </Link>

              <h2 className="text-xl font-bold text-ink">Create your clinic account</h2>
              <p className="text-sm text-ink/50 mt-1">
                You&apos;ll be set up as the Clinic Owner with full access.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="Full name" required>
                  <Input
                    icon={UserIcon}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                  />
                </Field>

                <Field label="Email" required>
                  <Input
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>

                <Field label="Phone">
                  <Input
                    type="tel"
                    icon={Phone}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 202 555 0100"
                  />
                </Field>

                <Field label="Clinic name" required>
                  <Input
                    icon={Building2}
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Paws Animal Hospital"
                  />
                </Field>

                <Field label="First branch name" required hint="You can add more branches later.">
                  <Input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Main Branch"
                  />
                </Field>

                <Field label="Clinic address">
                  <Input
                    icon={MapPin}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="100 Example Avenue, City, ZZ 00000"
                  />
                </Field>

                <Field label="Password" required hint="Minimum 6 characters">
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

                <Field label="Confirm password" required>
                  <Input
                    type={showPass ? 'text' : 'password'}
                    icon={Lock}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder=".........."
                  />
                </Field>

                <label className="flex items-start gap-2.5 text-xs text-ink/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-line text-plum focus:ring-plum/20"
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/site/terms" className="text-plum hover:underline">Terms</Link> and{' '}
                    <Link href="/site/privacy" className="text-plum hover:underline">Privacy Policy</Link>.
                  </span>
                </label>

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
                  {loading ? 'Creating account...' : <>Create account <ArrowRight className="w-4 h-4 hv-slide" /></>}
                </button>
              </form>

              <p className="mt-6 text-xs text-ink/50 text-center">
                Already have an account?{' '}
                <Link href="/login" className="text-plum hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
