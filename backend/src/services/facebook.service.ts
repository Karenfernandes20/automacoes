import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

interface FacebookConnection {
  userAccessToken: string;
  pages: FacebookPage[];
  selectedPageId?: string;
  connectedAt: string;
}

const storagePath = path.resolve(env.DATA_DIR || process.cwd(), 'facebook-connection.json');
const validStates = new Map<string, number>();
let memory: FacebookConnection | null | undefined;

async function load(): Promise<FacebookConnection | null> {
  if (memory !== undefined) return memory;
  try { memory = JSON.parse(await fs.readFile(storagePath, 'utf8')); }
  catch { memory = null; }
  return memory ?? null;
}

async function save(data: FacebookConnection | null) {
  memory = data;
  if (!data) {
    try { await fs.unlink(storagePath); } catch { /* arquivo inexistente */ }
    return;
  }
  await fs.writeFile(storagePath, JSON.stringify(data, null, 2), 'utf8');
}

export const facebookService = {
  getAuthUrl() {
    if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
      throw new Error('Configure FACEBOOK_APP_ID e FACEBOOK_APP_SECRET no Render antes de conectar.');
    }
    if (!env.FACEBOOK_REDIRECT_URI.startsWith('https://')) {
      throw new Error('Configure uma URL HTTPS de retorno para o Facebook.');
    }
    const state = randomBytes(24).toString('hex');
    validStates.set(state, Date.now() + 10 * 60 * 1000);
    return `https://www.facebook.com/${env.FACEBOOK_GRAPH_VERSION}/dialog/oauth?${new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: env.FACEBOOK_REDIRECT_URI,
      state,
      response_type: 'code',
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts'
    })}`;
  },

  async handleCallback(code: string, state: string) {
    const expiresAt = validStates.get(state);
    validStates.delete(state);
    if (!expiresAt || expiresAt < Date.now()) throw new Error('A tentativa de conexão expirou. Inicie novamente.');

    const tokenUrl = `https://graph.facebook.com/${env.FACEBOOK_GRAPH_VERSION}/oauth/access_token?${new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      redirect_uri: env.FACEBOOK_REDIRECT_URI,
      code
    })}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenBody = await tokenRes.json();
    if (!tokenRes.ok || !tokenBody.access_token) throw new Error(tokenBody.error?.message || 'Falha ao obter acesso ao Facebook.');

    const pagesRes = await fetch(`https://graph.facebook.com/${env.FACEBOOK_GRAPH_VERSION}/me/accounts?fields=id,name,category,access_token&limit=100`, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` }
    });
    const pagesBody = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesBody.error?.message || 'Falha ao carregar suas Páginas do Facebook.');
    const pages = (pagesBody.data || []) as FacebookPage[];
    const connection: FacebookConnection = {
      userAccessToken: tokenBody.access_token,
      pages,
      selectedPageId: pages[0]?.id,
      connectedAt: new Date().toISOString()
    };
    await save(connection);
    return connection;
  },

  async getStatus() {
    const connection = await load();
    const selected = connection?.pages.find(page => page.id === connection.selectedPageId) || connection?.pages[0];
    return {
      configured: Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
      connected: Boolean(connection && connection.pages.length > 0),
      page: selected ? { id: selected.id, name: selected.name, category: selected.category } : null,
      pages: connection?.pages.map(page => ({ id: page.id, name: page.name, category: page.category })) || []
    };
  },

  async selectPage(pageId: string) {
    const connection = await load();
    if (!connection?.pages.some(page => page.id === pageId)) throw new Error('Página não encontrada nesta conexão.');
    connection.selectedPageId = pageId;
    await save(connection);
    return this.getStatus();
  },

  async disconnect() { await save(null); }
};
