/**
 * Konfigurasi URL backend terpusat.
 * Di dev: pakai /api/backend (Next.js proxy → localhost:8000)
 */
export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api/backend';

export type UserRole = 'admin' | 'operator';

export interface UserInfo {
  id: number;
  username: string;
  nama: string;
  email?: string;
  role: UserRole;
  sekolah_id?: number;
}

/** Ambil info user dari localStorage */
export function getUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try { return JSON.parse(raw) as UserInfo; } catch { return null; }
}

/** Ambil role dari localStorage */
export function getRole(): UserRole | null {
  return getUser()?.role ?? null;
}

export function isAdmin(): boolean {
  return getRole() === 'admin';
}

export function isOperator(): boolean {
  return getRole() === 'operator';
}

/** Redirect URL sesuai role setelah login */
export function getDashboardUrl(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/sekolah/dashboard';
}

/**
 * Wrapper fetch dengan:
 * - URL backend otomatis dari env
 * - credentials: 'include' (session PHP)
 * - Content-Type: application/json (untuk POST/PUT/DELETE)
 * - Auto redirect ke /login jika session expired (401)
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
  router?: { push: (url: string) => void }
): Promise<Response> {
  const url = `${API_BASE}${path}`;

  const defaultHeaders: HeadersInit = {};
  if (options.method && options.method !== 'GET') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  // Auto-redirect ke login jika session expired
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      // legacy key cleanup
      localStorage.removeItem('admin');
    }
    if (router) {
      router.push('/login');
    } else if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return response;
}
