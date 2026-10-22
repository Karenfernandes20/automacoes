import { env } from '../config/env.js';

const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
const baseUrl = `${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/integration_secrets`;

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function ensureOk(response: Response, operation: string) {
  if (response.ok) return;
  const detail = await response.text();
  throw new Error(`Falha no Supabase ao ${operation}: ${detail || response.statusText}`);
}

export const integrationStore = {
  get enabled() { return configured; },

  async get<T>(key: string): Promise<T | null> {
    if (!configured) return null;
    const query = new URLSearchParams({ key: `eq.${key}`, select: 'payload', limit: '1' });
    const response = await fetch(`${baseUrl}?${query}`, { headers: headers() });
    await ensureOk(response, `carregar ${key}`);
    const rows = await response.json() as Array<{ payload: T }>;
    return rows[0]?.payload ?? null;
  },

  async set<T>(key: string, payload: T): Promise<void> {
    if (!configured) return;
    const response = await fetch(`${baseUrl}?on_conflict=key`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({ key, payload, updated_at: new Date().toISOString() })
    });
    await ensureOk(response, `salvar ${key}`);
  },

  async delete(key: string): Promise<void> {
    if (!configured) return;
    const query = new URLSearchParams({ key: `eq.${key}` });
    const response = await fetch(`${baseUrl}?${query}`, { method: 'DELETE', headers: headers() });
    await ensureOk(response, `excluir ${key}`);
  }
};
