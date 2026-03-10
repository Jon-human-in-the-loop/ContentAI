const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export async function api<T = any>(path: string, options?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...fetchOptions } = options || {};
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...fetchOptions,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...fetchOptions?.headers },
  });
  if (!res.ok) { const err = await res.json().catch(() => ({ message: res.statusText })); throw new Error(err.message); }
  return res.json();
}
