import { getToken } from './auth';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const API_BASE = RAW_API_URL.endsWith('/api/v1')
  ? RAW_API_URL
  : RAW_API_URL.replace(/\/+$/, '') + '/api/v1';

export async function api<T = any>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token: explicitToken, ...fetchOptions } = options || {};
  const token = explicitToken || getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message);
  }
  return res.json();
}

export { API_BASE };
