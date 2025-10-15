/**
 * httpClient.ts - Unified API request wrapper
 * Supports both relative paths (for SSR/Tunnel) and absolute URLs (for external APIs)
 */

export interface ApiFetchOptions extends RequestInit {
  headers?: HeadersInit
}

/**
 * Unified fetch wrapper
 * - If path starts with 'http', use it as-is (absolute URL)
 * - Otherwise, use relative path (works with SSR, Tunnel, etc.)
 * - Automatically adds JSON headers
 */
export async function apiFetch(
  path: string,
  init?: ApiFetchOptions
): Promise<Response> {
  // Use path as-is (absolute or relative)
  const url = path.startsWith('http') ? path : path

  // Default JSON headers
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  }

  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init?.headers || {}),
    },
  }

  return fetch(url, mergedInit)
}

/**
 * Convenience methods
 */
export const api = {
  get: (path: string, init?: ApiFetchOptions) =>
    apiFetch(path, { ...init, method: 'GET' }),

  post: (path: string, body?: any, init?: ApiFetchOptions) =>
    apiFetch(path, {
      ...init,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (path: string, body?: any, init?: ApiFetchOptions) =>
    apiFetch(path, {
      ...init,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (path: string, init?: ApiFetchOptions) =>
    apiFetch(path, { ...init, method: 'DELETE' }),
}
