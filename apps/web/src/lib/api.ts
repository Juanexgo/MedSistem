export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  timestamp?: string;
}

function unwrapResponse<T>(json: ApiResponse<T> | T): T {
  const obj = json as any;
  if (obj && typeof obj === 'object' && obj.success === true && 'data' in obj) {
    return obj.data as T;
  }
  return json as T;
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(access: string) {
    this.accessToken = access;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', access);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.csrfToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  hasAccessToken() {
    this.loadTokens();
    return Boolean(this.accessToken);
  }

  private async ensureCsrfToken(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (!this.csrfPromise) {
      this.csrfPromise = fetch(`${this.baseUrl}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      })
        .then(async (res) => {
          if (!res.ok) throw new Error('Failed to obtain CSRF token');
          const json = await res.json();
          const token = unwrapResponse<{ token: string }>(json).token;
          this.csrfToken = token;
          return token;
        })
        .finally(() => {
          this.csrfPromise = null;
        });
    }
    return this.csrfPromise;
  }

  private async refreshAccessToken(): Promise<void> {
    const csrf = await this.ensureCsrfToken();
    const res = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
      },
    });

    if (!res.ok) {
      this.clearTokens();
      throw new Error('Session expired');
    }

    const json = await res.json();
    const unwrapped = unwrapResponse<{ accessToken?: string }>(json);
    const accessToken = unwrapped?.accessToken;

    if (!accessToken) {
      this.clearTokens();
      throw new Error('Invalid refresh response');
    }

    this.setAccessToken(accessToken);
    this.csrfToken = null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    this.loadTokens();

    const method = (options.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (MUTATION_METHODS.has(method)) {
      const csrf = await this.ensureCsrfToken();
      headers['X-CSRF-Token'] = csrf;
    }

    let res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      method,
      credentials: 'include',
      headers,
    });

    if (res.status === 401 && this.accessToken) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshAccessToken().finally(() => {
          this.refreshPromise = null;
        });
      }
      try {
        await this.refreshPromise;
      } catch (err) {
        const json = await res.clone().json().catch(() => ({}));
        const message = (json as any)?.message || (err as Error).message || 'Unauthorized';
        throw new Error(Array.isArray(message) ? message.join(', ') : message);
      }
      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }
      if (MUTATION_METHODS.has(method)) {
        const csrf = await this.ensureCsrfToken();
        headers['X-CSRF-Token'] = csrf;
      }
      res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        method,
        credentials: 'include',
        headers,
      });
    }

    if (res.status === 403 && MUTATION_METHODS.has(method)) {
      const cloned = res.clone();
      const errJson = await cloned.json().catch(() => ({}));
      const codeText = `${(errJson as any)?.code || ''} ${(errJson as any)?.message || ''}`;
      if (/csrf|invalid_csrf_token/i.test(codeText)) {
        this.csrfToken = null;
        const csrf = await this.ensureCsrfToken();
        headers['X-CSRF-Token'] = csrf;
        res = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          method,
          credentials: 'include',
          headers,
        });
      }
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = (json as any)?.message || (json as any)?.error || 'Request failed';
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }

    return unwrapResponse<T>(json);
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: any) { return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); }
  put<T>(path: string, body?: any) { return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }); }
  patch<T>(path: string, body?: any) { return this.request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new ApiClient(API_BASE_URL);
