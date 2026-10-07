'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from './platform';

export type { Role } from './platform';

export type User = {
  id: string;
  name: string;
  role: Role;
  email: string;
  branch: string;
  branchAccess: string[];
  status: string;
  shift: string;
};

const TOKEN_KEY = 'petcare-pro-token';
const USER_KEY = 'petcare-pro-user';

const API_BASE =
  typeof window !== 'undefined'
    ? (window as unknown as { __API_BASE__?: string }).__API_BASE__ || process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
    : process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

async function authFetch(path: string, options?: RequestInit): Promise<any> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<User> {
  const data = await authFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, data.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data.user as User;
}

export function logout() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
}

export function getUser(): User | null {
  return getStoredUser();
}

export async function refreshUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const user = await authFetch('/auth/me');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user as User;
  } catch {
    logout();
    return null;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await authFetch('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function requestPasswordReset(email: string): Promise<string> {
  const data = await authFetch('/auth/request-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return data.resetToken || '';
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await authFetch('/auth/confirm-reset', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function updateStaffStatus(staffId: string, status: string): Promise<void> {
  await authFetch(`/auth/${staffId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function useAuth(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      refreshUser()
        .then((fresh) => {
          if (fresh) setUser(fresh);
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return { user, loading };
}

export function useRequireAuth(): User | null {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  return user;
}

export function useRequireRole(...roles: Role[]): User | null {
  const user = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !roles.includes(user.role)) {
      router.replace('/');
    }
  }, [user, roles, router]);

  return user;
}
