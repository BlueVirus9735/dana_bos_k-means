/**
 * Konfigurasi URL backend terpusat.
 * Di dev: pakai /api/backend (Next.js proxy → localhost:8000)
 * Semua request lewat port 3000 → session PHP bekerja normal (same-origin).
 */
export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? '/api/backend';

/**
 * Wrapper fetch dengan:
 * - URL backend otomatis dari env
 * - credentials: 'include' (session PHP)
 * - Content-Type: application/json (untuk POST)
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
