import { env } from './env';

const TOKEN_KEY = 'sim_access_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Remplace error.code === '23503' (PostgREST) : le filtre global côté serveur
// (server/common/filters/query-failed.filter.ts) traduit désormais les
// violations de contrainte SQL en { statusCode: 409, code: '23503', message }.
export function estViolationCleEtrangere(error: unknown): boolean {
  return error instanceof ApiError && error.code === '23503';
}

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(env.apiUrl.replace(/\/$/, '') + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; query?: Query; isFormData?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(buildUrl(path, options.query), { method, headers, body });

  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('sim:unauthorized'));
  }

  if (!response.ok) {
    let payload: { message?: string | string[]; code?: string } | null = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? response.statusText;
    throw new ApiError(response.status, message, payload?.code);
  }

  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return (await response.json()) as T;
  return undefined as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body, query }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path, {}),
  upload: <T>(path: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST') =>
    request<T>(method, path, { body: formData, isFormData: true }),
};

// Téléchargement authentifié (remplace les URLs signées Supabase Storage,
// impossibles à reproduire avec un stockage disque local — voir MIGRATION.md
// Phase 3) : on récupère le fichier en blob (avec le bearer token), puis on le
// livre au navigateur soit en nouvel onglet (aperçu), soit en téléchargement forcé.
async function fetchBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), { headers });
  if (response.status === 401) {
    clearToken();
    window.dispatchEvent(new Event('sim:unauthorized'));
  }
  if (!response.ok) {
    throw new ApiError(response.status, response.statusText);
  }
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : null;
  const blob = await response.blob();
  return { blob, filename };
}

// URL objet locale pour un aperçu inline (<iframe>/<img src>) — contrairement
// à ouvrirFichier/telechargerFichier, l'appelant est responsable de révoquer
// l'URL (URL.revokeObjectURL) une fois l'aperçu démonté.
export async function obtenirUrlObjet(path: string): Promise<string> {
  const { blob } = await fetchBlob(path);
  return URL.createObjectURL(blob);
}

export async function ouvrirFichier(path: string): Promise<void> {
  const { blob } = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function telechargerFichier(path: string, filenameFallback = 'fichier'): Promise<void> {
  const { blob, filename } = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? filenameFallback;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
