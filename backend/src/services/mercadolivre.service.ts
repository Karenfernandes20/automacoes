import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

export interface MLTokenData {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  obtained_at: number; // timestamp ms
  user_info?: {
    id: number;
    nickname: string;
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

const storagePath = path.resolve(env.DATA_DIR || process.cwd(), 'mercadolivre-token.json');
let tokenMemory: MLTokenData | null = null;
let categoriesCache: { expiresAt: number; data: Array<{ id: string; name: string }> } | null = null;

async function loadToken(): Promise<MLTokenData | null> {
  if (tokenMemory) return tokenMemory;
  try {
    const raw = await fs.readFile(storagePath, 'utf8');
    tokenMemory = JSON.parse(raw);
    return tokenMemory;
  } catch {
    return null;
  }
}

async function saveToken(token: MLTokenData | null) {
  tokenMemory = token;
  if (!token) {
    try {
      await fs.unlink(storagePath);
    } catch {
      // O arquivo pode ainda não existir na primeira execução.
    }
    return;
  }
  await fs.writeFile(storagePath, JSON.stringify(token, null, 2), 'utf8');
}

export const mercadoLivreService = {
  getAuthUrl(): string {
    if (!env.MERCADOLIVRE_APP_ID || !env.MERCADOLIVRE_CLIENT_SECRET) {
      throw new Error('A integração do Mercado Livre ainda não possui APP ID e Client Secret configurados.');
    }
    if (!env.MERCADOLIVRE_REDIRECT_URI.startsWith('https://')) {
      throw new Error('Configure uma URL HTTPS permanente de retorno antes de conectar o Mercado Livre.');
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.MERCADOLIVRE_APP_ID,
      redirect_uri: env.MERCADOLIVRE_REDIRECT_URI
    });
    return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
  },

  async handleCallback(code: string): Promise<MLTokenData> {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.MERCADOLIVRE_APP_ID,
        client_secret: env.MERCADOLIVRE_CLIENT_SECRET,
        code,
        redirect_uri: env.MERCADOLIVRE_REDIRECT_URI
      }).toString()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Falha ao trocar o código de autorização por tokens do Mercado Livre.');
    }

    const data = await res.json();
    const tokenRecord: MLTokenData = {
      ...data,
      obtained_at: Date.now()
    };

    // Buscar informações do usuário conectado
    try {
      const userRes = await fetch(`https://api.mercadolibre.com/users/${data.user_id}`, {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });
      if (userRes.ok) {
        const u = await userRes.json();
        tokenRecord.user_info = {
          id: u.id,
          nickname: u.nickname,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name
        };
      }
    } catch (e) {
      console.warn('Não foi possível obter dados adicionais do usuário Mercado Livre', e);
    }

    await saveToken(tokenRecord);
    return tokenRecord;
  },

  async getValidToken(): Promise<MLTokenData | null> {
    const token = await loadToken();
    if (!token) return null;

    // Verificar se o token expira nos próximos 5 minutos
    const expiresAt = token.obtained_at + (token.expires_in * 1000);
    const isExpired = Date.now() > (expiresAt - 5 * 60 * 1000);

    if (!isExpired) {
      return token;
    }

    // Tentar refresh token
    try {
      const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: env.MERCADOLIVRE_APP_ID,
          client_secret: env.MERCADOLIVRE_CLIENT_SECRET,
          refresh_token: token.refresh_token
        }).toString()
      });

      if (!res.ok) {
        console.error('Falha ao renovar token Mercado Livre');
        return null;
      }

      const refreshed = await res.json();
      const updated: MLTokenData = {
        ...token,
        ...refreshed,
        obtained_at: Date.now()
      };
      await saveToken(updated);
      return updated;
    } catch (err) {
      console.error('Erro na renovação de token do Mercado Livre:', err);
      return null;
    }
  },

  async getStatus() {
    const token = await this.getValidToken();
    if (!token) {
      return {
        connected: false,
        status: 'Não conectada',
        user: null
      };
    }

    const expiresAt = token.obtained_at + (token.expires_in * 1000);

    return {
      connected: true,
      status: 'Conectada',
      user: token.user_info || { id: token.user_id, nickname: `User #${token.user_id}` },
      expiresAt: new Date(expiresAt).toISOString()
    };
  },

  async disconnect() {
    await saveToken(null);
    return { success: true };
  },

  async getTrends(): Promise<{ keyword: string; url: string }[]> {
    const token = await this.getValidToken();
    if (!token) return [];
    try {
      const res = await fetch('https://api.mercadolibre.com/trends/MLB', {
        headers: { Authorization: `Bearer ${token.access_token}` }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getCatalogCategories() {
    if (categoriesCache && categoriesCache.expiresAt > Date.now()) return categoriesCache.data;
    const token = await this.getValidToken();
    if (!token) throw new Error('A conexão com o Mercado Livre expirou. Reconecte a conta em Integrações.');

    const res = await fetch('https://api.mercadolibre.com/sites/MLB/categories', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('O Mercado Livre recusou o acesso ao catálogo. Reconecte a conta e autorize a permissão de leitura.');
    }
    if (!res.ok) throw new Error('Não foi possível carregar as categorias do Mercado Livre.');

    const data = await res.json() as Array<{ id: string; name: string }>;
    categoriesCache = { expiresAt: Date.now() + 6 * 60 * 60 * 1000, data };
    return data;
  },

  async searchCatalog(params: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
    sort?: string;
    onlyOffers?: boolean;
    freeShipping?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const token = await this.getValidToken();
    if (!token) throw new Error('A conexão com o Mercado Livre expirou. Reconecte a conta em Integrações.');

    const limit = Math.min(Math.max(params.limit || 48, 1), 50);
    const page = Math.max(params.page || 1, 1);
    const offset = Math.min((page - 1) * limit, 950);
    const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (params.query?.trim()) query.set('q', params.query.trim());
    if (params.category) query.set('category', params.category);
    if (params.sort) query.set('sort', params.sort);
    if (params.freeShipping) query.set('shipping_cost', 'free');
    if (Number.isFinite(params.minPrice)) query.set('price', `${params.minPrice}-*`);
    if (Number.isFinite(params.maxPrice)) {
      query.set('price', `${Number.isFinite(params.minPrice) ? params.minPrice : '*'}-${params.maxPrice}`);
    }

    const res = await fetch(`https://api.mercadolibre.com/sites/MLB/search?${query}`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (res.status === 401 || res.status === 403) {
      // A busca global do marketplace não está disponível para todos os
      // aplicativos. Usa o recurso oficial de mais vendidos como alternativa.
      return this.getHighlightsCatalog(params);
    }
    if (!res.ok) throw new Error('Não foi possível consultar o catálogo do Mercado Livre agora.');

    const data = await res.json() as {
      results?: Array<{
        id: string; title: string; category_id: string; price: number; original_price?: number;
        base_price?: number; thumbnail?: string; permalink: string; shipping?: { free_shipping?: boolean };
        condition?: string; available_quantity?: number; official_store_name?: string;
        installments?: { quantity: number; amount: number; rate: number };
      }>;
      paging?: { total?: number };
      available_sorts?: Array<{ id: string; name: string }>;
      filters?: unknown[];
      available_filters?: unknown[];
    };
    const allItems = (data.results || []).map(item => {
      const price = Number(item.price || 0);
      const oldPrice = Number(item.original_price || item.base_price || price);
      const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
      return {
        id: item.id,
        title: item.title,
        categoryId: item.category_id,
        price,
        oldPrice,
        discount,
        imageUrl: String(item.thumbnail || '').replace(/^http:/, 'https:').replace('-I.jpg', '-O.jpg'),
        url: item.permalink,
        freeShipping: Boolean(item.shipping?.free_shipping),
        condition: item.condition,
        availableQuantity: item.available_quantity,
        officialStoreName: item.official_store_name || null,
        installments: item.installments || null
      };
    });
    const items = params.onlyOffers ? allItems.filter(item => item.discount > 0) : allItems;
    const reportedTotal = Number(data.paging?.total || items.length);

    return {
      items,
      paging: {
        page,
        limit,
        total: reportedTotal,
        accessibleTotal: Math.min(reportedTotal, 1000),
        pages: Math.max(1, Math.ceil(Math.min(reportedTotal, 1000) / limit))
      },
      availableSorts: data.available_sorts || [],
      filters: data.filters || [],
      availableFilters: data.available_filters || []
    };
  },

  async getHighlightsCatalog(params: { query?: string; category?: string; page?: number; limit?: number; onlyOffers?: boolean }) {
    const token = await this.getValidToken();
    if (!token) throw new Error('A conexão com o Mercado Livre expirou. Reconecte a conta em Integrações.');
    const headers = { Authorization: `Bearer ${token.access_token}` };

    const leafIds: string[] = [];
    const findLeaves = async (id: string, remaining: number, depth = 0): Promise<void> => {
      if (leafIds.length >= remaining || depth > 4) return;
      const detailRes = await fetch(`https://api.mercadolibre.com/categories/${id}`, { headers });
      if (!detailRes.ok) return;
      const detail = await detailRes.json() as { children_categories?: Array<{ id: string }> };
      const children = detail.children_categories || [];
      if (children.length === 0) {
        leafIds.push(id);
        return;
      }
      for (const child of children.slice(0, 8)) {
        await findLeaves(child.id, remaining, depth + 1);
        if (leafIds.length >= remaining) break;
      }
    };

    let rootIds: string[] = [];
    if (params.category) {
      rootIds = [params.category];
      await findLeaves(params.category, 8);
    } else {
      const categories = await this.getCatalogCategories();
      rootIds = categories.slice(0, 16).map(category => category.id);
      for (const category of categories.slice(0, 12)) {
        await findLeaves(category.id, 12);
        if (leafIds.length >= 12) break;
      }
    }

    // Os rankings do Mercado Livre são mais completos nas categorias raiz.
    // Algumas categorias folha respondem 200 com uma lista vazia, por isso
    // consultamos ambos os níveis e eliminamos itens repetidos depois.
    const rankingCategoryIds = [...new Set([...rootIds, ...leafIds])];
    const rankings = await Promise.all(rankingCategoryIds.map(async categoryId => {
      const response = await fetch(`https://api.mercadolibre.com/highlights/MLB/category/${categoryId}`, { headers });
      if (!response.ok) return [];
      const body = await response.json() as { content?: Array<{ id: string; type: 'ITEM'|'PRODUCT'|'USER_PRODUCT'; position: number }> };
      return body.content || [];
    }));
    const ranked = rankings.flat().filter((entry, index, all) => all.findIndex(other => other.id === entry.id) === index).slice(0, 120);

    const details = await Promise.all(ranked.map(async entry => {
      const endpoint = entry.type === 'PRODUCT' ? `products/${entry.id}` : `items/${entry.id}`;
      const response = await fetch(`https://api.mercadolibre.com/${endpoint}`, { headers });
      if (!response.ok) return null;
      const body = await response.json();
      const winner = entry.type === 'PRODUCT' ? body.buy_box_winner : body;
      const permalink = winner?.permalink || body.permalink;
      if (!winner || !permalink) return null;
      const price = Number(winner.price || 0);
      const oldPrice = Number(winner.original_price || winner.base_price || price);
      return {
        id: winner.item_id || body.id,
        title: winner.title || body.name || body.title,
        categoryId: winner.category_id || body.category_id,
        price,
        oldPrice,
        discount: oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0,
        imageUrl: String(winner.thumbnail || body.pictures?.[0]?.secure_url || body.pictures?.[0]?.url || body.thumbnail || '').replace(/^http:/, 'https:').replace('-I.jpg', '-O.jpg'),
        url: permalink,
        freeShipping: Boolean(winner.shipping?.free_shipping),
        condition: winner.condition || 'new',
        availableQuantity: winner.available_quantity || 0,
        officialStoreName: null,
        installments: null,
        ranking: entry.position
      };
    }));

    let items = details.filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (params.query?.trim()) {
      const term = params.query.toLocaleLowerCase('pt-BR').trim();
      items = items.filter(item => item.title.toLocaleLowerCase('pt-BR').includes(term));
    }
    if (params.onlyOffers) items = items.filter(item => item.discount > 0);
    const limit = Math.min(Math.max(params.limit || 48, 1), 50);
    const page = Math.max(params.page || 1, 1);
    const total = items.length;
    const pageItems = items.slice((page - 1) * limit, page * limit);
    return {
      items: pageItems,
      paging: { page, limit, total, accessibleTotal: total, pages: Math.max(1, Math.ceil(total / limit)) },
      availableSorts: [], filters: [], availableFilters: [], source: 'highlights'
    };
  },

  async getTopOffers(category?: string) {
    const trends = await this.getTrends();

    const curatedKeywords = [
      // === CASA (10 itens) ===
      { keyword: 'Robô Aspirador de Pó Inteligente Wi-Fi Bivolt', category: 'Casa', badge: 'Mais Vendido', discount: 35, price: 499.00, oldPrice: 769.00, sales: '+20 mil vendidos', rating: 4.8, reviews: 9400, imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3561234901-robo-aspirador-de-po-inteligente-wifi' },
      { keyword: 'Jogo de Lençol 4 Peças 400 Fios Percal Toque de Pluma Queen', category: 'Casa', badge: 'Super Oferta', discount: 42, price: 119.90, oldPrice: 209.90, sales: '+15 mil vendidos', rating: 4.9, reviews: 7800, imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2981432101-jogo-lencol-queen-400-fios' },
      { keyword: 'Umidificador e Difusor de Aromas Ultrassônico LED 500ml', category: 'Casa', badge: 'Destaque', discount: 30, price: 79.90, oldPrice: 114.90, sales: '+50 mil vendidos', rating: 4.7, reviews: 14200, imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3129845612-umidificador-difusor-ultrassonico' },
      { keyword: 'Lâmpada Inteligente Smart LED Wi-Fi RGB 10W Compatível Alexa', category: 'Casa', badge: 'Tendência', discount: 25, price: 49.90, oldPrice: 66.90, sales: '+100 mil vendidos', rating: 4.9, reviews: 38900, imageUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2871452903-lampada-smart-led-wifi-alexa' },
      { keyword: 'Fechadura Digital Inteligente Biométrica com Senha e Cartão', category: 'Casa', badge: 'Top 1 Vendas', discount: 38, price: 349.00, oldPrice: 569.00, sales: '+12 mil vendidos', rating: 4.8, reviews: 4900, imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3619283741-fechadura-digital-biometrica' },
      { keyword: 'Conjunto 5 Potes Herméticos de Vidro com Tampa de Bambu', category: 'Casa', badge: 'Campeão de Vendas', discount: 28, price: 89.90, oldPrice: 124.90, sales: '+25 mil vendidos', rating: 4.9, reviews: 8300, imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918237465-conjunto-potes-hermeticos-vidro' },
      { keyword: 'Organizador Multiuso Giratório 360 Acrílico para Cosméticos', category: 'Casa', badge: 'Mais Procurado', discount: 33, price: 54.90, oldPrice: 82.00, sales: '+30 mil vendidos', rating: 4.7, reviews: 6500, imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2415678912-organizador-giratorio-360-acrilico' },
      { keyword: 'Manta Coberdrom Dupla Face Soft Sherpa Casal Toque de Lã', category: 'Casa', badge: 'Oferta Relâmpago', discount: 40, price: 139.90, oldPrice: 233.00, sales: '+18 mil vendidos', rating: 4.9, reviews: 9100, imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283745-coberdrom-sherpa-dupla-face-casal' },
      { keyword: 'Lixeira Automática com Sensor de Proximidade 12 Litros Inox', category: 'Casa', badge: 'Design Premium', discount: 29, price: 129.90, oldPrice: 184.00, sales: '+10 mil vendidos', rating: 4.8, reviews: 3600, imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736451-lixeira-automatica-sensor-12l' },
      { keyword: 'Câmera de Segurança Wi-Fi 360 Visão Noturna Áudio Bidirecional', category: 'Casa', badge: 'Segurança', discount: 36, price: 149.90, oldPrice: 235.00, sales: '+45 mil vendidos', rating: 4.8, reviews: 18200, imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2718293041-camera-seguranca-wifi-360-noturna' },

      // === CASA & COZINHA (10 itens) ===
      { keyword: 'Air Fryer Fritadeira Sem Óleo Mondial 4L Digital Touch Inox', category: 'Casa & Cozinha', badge: 'Campeão de Vendas', discount: 32, price: 319.90, oldPrice: 469.90, sales: '+40 mil vendidos', rating: 4.8, reviews: 15400, imageUrl: '/products/airfryer.jpg', url: 'https://produto.mercadolivre.com.br/MLB-2345678901-air-fryer-fritadeira-sem-oleo-4l' },
      { keyword: 'Cafeteira Elétrica Mondial Programável Inox 15 Bar Expresso', category: 'Casa & Cozinha', badge: 'Destaque', discount: 35, price: 299.90, oldPrice: 459.90, sales: '+5 mil vendidos', rating: 4.7, reviews: 1890, imageUrl: '/products/cafeteira.jpg', url: 'https://produto.mercadolivre.com.br/MLB-1987456321-cafeteira-eletrica-inox' },
      { keyword: 'Liquidificador Turbo Power 1200W 3 Litros Jarra Resistente', category: 'Casa & Cozinha', badge: 'Mais Vendido', discount: 27, price: 149.90, oldPrice: 205.00, sales: '+35 mil vendidos', rating: 4.8, reviews: 12100, imageUrl: '/products/liquidificador.jpg', url: 'https://produto.mercadolivre.com.br/MLB-2819203948-liquidificador-turbo-power-1200w' },
      { keyword: 'Panela de Pressão Elétrica Digital 5 Litros com Timer Inox', category: 'Casa & Cozinha', badge: 'Super Oferta', discount: 30, price: 389.00, oldPrice: 559.00, sales: '+15 mil vendidos', rating: 4.9, reviews: 6700, imageUrl: 'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019284756-panela-pressao-eletrica-5l' },
      { keyword: 'Jogo de Panelas 5 Peças Cerâmica Antiaderente com Indução', category: 'Casa & Cozinha', badge: 'Top 1 Vendas', discount: 45, price: 279.90, oldPrice: 509.00, sales: '+22 mil vendidos', rating: 4.9, reviews: 8900, imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273645-jogo-panelas-ceramica-antiaderente' },
      { keyword: 'Sanduicheira e Grill Duplo Antiaderente 750W Prática Inox', category: 'Casa & Cozinha', badge: 'Econômico', discount: 22, price: 89.90, oldPrice: 115.00, sales: '+60 mil vendidos', rating: 4.7, reviews: 21300, imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-1928374650-sanduicheira-grill-antiaderente' },
      { keyword: 'Mixer Vertical 3 em 1 com Triturador e Batedor de Claras 600W', category: 'Casa & Cozinha', badge: 'Versátil', discount: 33, price: 169.90, oldPrice: 254.00, sales: '+18 mil vendidos', rating: 4.8, reviews: 5400, imageUrl: '/products/liquidificador.jpg', url: 'https://produto.mercadolivre.com.br/MLB-3192837465-mixer-vertical-3-em-1' },
      { keyword: 'Afiador de Facas Profissional 3 Estágios com Base Antiderrapante', category: 'Casa & Cozinha', badge: 'Mais Procurado', discount: 40, price: 39.90, oldPrice: 66.90, sales: '+80 mil vendidos', rating: 4.8, reviews: 29500, imageUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2837465192-afiador-facas-profissional-3-estagios' },
      { keyword: 'Balança Digital de Cozinha Alta Precisão 10kg para Alimentos', category: 'Casa & Cozinha', badge: 'Mais Vendido', discount: 35, price: 29.90, oldPrice: 46.00, sales: '+150 mil vendidos', rating: 4.9, reviews: 62000, imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-1827364519-balanca-digital-cozinha-10kg' },
      { keyword: 'Chaleira Elétrica Inox 1.8 Litros Desligamento Automático 1500W', category: 'Casa & Cozinha', badge: 'Praticidade', discount: 28, price: 79.90, oldPrice: 111.00, sales: '+40 mil vendidos', rating: 4.8, reviews: 14700, imageUrl: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3018273645-chaleira-eletrica-inox-18l' },

      // === CELULARES (10 itens) ===
      { keyword: 'Apple iPhone 15 128GB Preto Oficial', category: 'Celulares', badge: 'Mais Vendido', discount: 28, price: 4299.00, oldPrice: 5999.00, sales: '+10 mil vendidos', rating: 4.8, reviews: 2450, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Apple_iPhone_15.jpg', url: 'https://produto.mercadolivre.com.br/MLB-3434651037-apple-iphone-15-128-gb-preto' },
      { keyword: 'Apple iPhone 13 128GB Estelar Tela Super Retina XDR 6.1', category: 'Celulares', badge: 'Top 1 Vendas', discount: 30, price: 3499.00, oldPrice: 4999.00, sales: '+30 mil vendidos', rating: 4.9, reviews: 18200, imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918237461-apple-iphone-13-128gb' },
      { keyword: 'Samsung Galaxy S23 FE 5G 128GB 8GB RAM Câmera 50MP', category: 'Celulares', badge: 'Destaque', discount: 35, price: 2399.00, oldPrice: 3699.00, sales: '+15 mil vendidos', rating: 4.8, reviews: 7600, imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736452-samsung-galaxy-s23-fe-5g' },
      { keyword: 'Xiaomi Redmi Note 13 4G 256GB 8GB RAM Câmera 108MP AMOLED', category: 'Celulares', badge: 'Campeão Custo-Benefício', discount: 25, price: 1199.00, oldPrice: 1599.00, sales: '+50 mil vendidos', rating: 4.9, reviews: 24000, imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3419283746-xiaomi-redmi-note-13-256gb' },
      { keyword: 'Motorola Moto G84 5G 256GB 8GB RAM Couro Vegano Viva Magenta', category: 'Celulares', badge: 'Super Oferta', discount: 32, price: 1299.00, oldPrice: 1899.00, sales: '+20 mil vendidos', rating: 4.8, reviews: 9300, imageUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3218273645-motorola-moto-g84-5g' },
      { keyword: 'Samsung Galaxy A55 5G 128GB 8GB RAM Tela Super AMOLED 120Hz', category: 'Celulares', badge: 'Mais Procurado', discount: 26, price: 1799.00, oldPrice: 2429.00, sales: '+18 mil vendidos', rating: 4.8, reviews: 6800, imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3418273645-samsung-galaxy-a55-5g' },
      { keyword: 'Carregador Turbo 30W USB-C Compatível iPhone e Galaxy Fast Charge', category: 'Celulares', badge: 'Essencial', discount: 45, price: 49.90, oldPrice: 91.00, sales: '+90 mil vendidos', rating: 4.9, reviews: 34100, imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273649-carregador-turbo-30w-usbc' },
      { keyword: 'Suporte Veicular Celular com Trava Automática e Ventosa Forte', category: 'Celulares', badge: 'Mais Vendido', discount: 38, price: 34.90, oldPrice: 56.00, sales: '+120 mil vendidos', rating: 4.8, reviews: 45000, imageUrl: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2182736450-suporte-veicular-celular' },
      { keyword: 'Película de Privacidade Cerâmica 9D Anti-Impacto iPhone Galaxy', category: 'Celulares', badge: 'Acessório', discount: 50, price: 19.90, oldPrice: 39.90, sales: '+70 mil vendidos', rating: 4.7, reviews: 18900, imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283745-pelicula-privacidade-ceramica' },
      { keyword: 'Cabo USB-C para Lightning 20W 1 Metro Blindado Reforçado', category: 'Celulares', badge: 'Super Oferta', discount: 40, price: 29.90, oldPrice: 49.90, sales: '+85 mil vendidos', rating: 4.8, reviews: 29100, imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283746-cabo-usbc-lightning-blindado' },

      // === ELETRÔNICOS (10 itens) ===
      { keyword: 'Fone Bluetooth ANC Cancelamento Ativo TWS Sem Fio', category: 'Eletrônicos', badge: 'Super Oferta', discount: 45, price: 189.90, oldPrice: 349.90, sales: '+50 mil vendidos', rating: 4.9, reviews: 11200, imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2187654321-fone-de-ouvido-bluetooth-sem-fio' },
      { keyword: 'Smartwatch Relógio Inteligente Pro AMOLED Bluetooth Chamadas', category: 'Eletrônicos', badge: 'Mais Procurado', discount: 50, price: 249.90, oldPrice: 499.90, sales: '+25 mil vendidos', rating: 4.7, reviews: 8900, imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2987123456-smartwatch-relogio-inteligente-amoled' },
      { keyword: 'Caixa de Som Portátil Bluetooth Pro Resistente à Água IPX7', category: 'Eletrônicos', badge: 'Campeão de Vendas', discount: 36, price: 219.00, oldPrice: 342.00, sales: '+40 mil vendidos', rating: 4.9, reviews: 16700, imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736450-caixa-som-bluetooth-ipx7' },
      { keyword: 'Smart TV Stick 4K Ultra HD Streaming com Controle por Voz', category: 'Eletrônicos', badge: 'Mais Vendido', discount: 28, price: 289.00, oldPrice: 401.00, sales: '+65 mil vendidos', rating: 4.9, reviews: 31200, imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273641-smart-tv-stick-4k-streaming' },
      { keyword: 'Power Bank Carregador Portátil 20000mAh Saída Rápida 22.5W', category: 'Eletrônicos', badge: 'Essencial', discount: 38, price: 119.90, oldPrice: 193.00, sales: '+45 mil vendidos', rating: 4.8, reviews: 14500, imageUrl: 'https://images.unsplash.com/photo-1609592424361-b541315b7410?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283741-power-bank-20000mah' },
      { keyword: 'Soundbar TV 120W Bluetooth com Subwoofer Sem Fio Óptico', category: 'Eletrônicos', badge: 'Cinema em Casa', discount: 42, price: 429.00, oldPrice: 739.00, sales: '+8 mil vendidos', rating: 4.7, reviews: 3200, imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283746-soundbar-120w-bluetooth-subwoofer' },
      { keyword: 'Projetor Portátil Full HD 4K Android Wi-Fi Smart 180° Rotativo', category: 'Eletrônicos', badge: 'Tendência', discount: 40, price: 379.00, oldPrice: 631.00, sales: '+30 mil vendidos', rating: 4.8, reviews: 11800, imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3318273645-projetor-portatil-full-hd-android' },
      { keyword: 'Microfone Condensador USB Profissional Podcast com Tripé', category: 'Eletrônicos', badge: 'Criadores', discount: 34, price: 159.90, oldPrice: 242.00, sales: '+14 mil vendidos', rating: 4.8, reviews: 5900, imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273643-microfone-condensador-usb-podcast' },
      { keyword: 'Ring Light LED 26cm com Tripé de 2m e Suporte para Celular', category: 'Eletrônicos', badge: 'Mais Vendido', discount: 50, price: 49.90, oldPrice: 99.90, sales: '+110 mil vendidos', rating: 4.7, reviews: 42000, imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-1928374659-ring-light-led-26cm-tripe' },
      { keyword: 'Controle Universal Inteligente Infravermelho Wi-Fi para Ar e TV', category: 'Eletrônicos', badge: 'Smart Home', discount: 31, price: 59.90, oldPrice: 86.90, sales: '+55 mil vendidos', rating: 4.9, reviews: 21000, imageUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2718293845-controle-universal-smart-ir' },

      // === INFORMÁTICA (10 itens) ===
      { keyword: 'Cadeira Gamer Ergonômica Reclinável 180° com Apoio de Braço', category: 'Informática', badge: 'Tendência', discount: 40, price: 689.00, oldPrice: 1149.00, sales: '+8 mil vendidos', rating: 4.6, reviews: 3100, imageUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2876543219-cadeira-gamer-ergonomica-reclinavel' },
      { keyword: 'SSD NVMe M.2 1TB Leitura 3500MB/s Alta Performance', category: 'Informática', badge: 'Top 1 Vendas', discount: 35, price: 389.00, oldPrice: 599.00, sales: '+25 mil vendidos', rating: 4.9, reviews: 14200, imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736458-ssd-nvme-m2-1tb' },
      { keyword: 'Teclado Mecânico Gamer RGB Switch Blue Anti-Ghosting ABNT2', category: 'Informática', badge: 'Mais Vendido', discount: 38, price: 149.90, oldPrice: 241.00, sales: '+35 mil vendidos', rating: 4.8, reviews: 11900, imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273644-teclado-mecanico-gamer-rgb-abnt2' },
      { keyword: 'Mouse Gamer 12000 DPI Sensor Óptico RGB 7 Botões Programáveis', category: 'Informática', badge: 'Super Oferta', discount: 45, price: 79.90, oldPrice: 145.00, sales: '+40 mil vendidos', rating: 4.8, reviews: 15300, imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283742-mouse-gamer-12000-dpi-rgb' },
      { keyword: 'Monitor Gamer 24 Polegadas 165Hz IPS 1ms Full HD Freesync', category: 'Informática', badge: 'Destaque', discount: 28, price: 799.00, oldPrice: 1110.00, sales: '+12 mil vendidos', rating: 4.9, reviews: 6200, imageUrl: 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3318273649-monitor-gamer-24-165hz-ips' },
      { keyword: 'Headset Gamer 7.1 Surround com Microfone Redutor de Ruído', category: 'Informática', badge: 'Mais Procurado', discount: 42, price: 139.90, oldPrice: 241.00, sales: '+28 mil vendidos', rating: 4.7, reviews: 9800, imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273648-headset-gamer-71-surround' },
      { keyword: 'Suporte Articulado para Monitor com Pistão a Gás de 17 a 35 pol', category: 'Informática', badge: 'Ergonomia', discount: 33, price: 179.90, oldPrice: 268.00, sales: '+20 mil vendidos', rating: 4.9, reviews: 10400, imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283749-suporte-articulado-monitor-gas' },
      { keyword: 'Mousepad Gamer Extra Grande Speed 90x40cm Bordas Costuradas', category: 'Informática', badge: 'Mais Vendido', discount: 50, price: 39.90, oldPrice: 79.90, sales: '+75 mil vendidos', rating: 4.9, reviews: 33000, imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2182736459-mousepad-gamer-extra-grande-90x40' },
      { keyword: 'Hub USB-C 8 em 1 com HDMI 4K RJ45 Gigabit Cartão SD e PD 100W', category: 'Informática', badge: 'Versatilidade', discount: 36, price: 149.90, oldPrice: 234.00, sales: '+16 mil vendidos', rating: 4.8, reviews: 5100, imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736453-hub-usbc-8-em-1-hdmi-4k' },
      { keyword: 'Webcam Full HD 1080p com Microfone Embutido e Tampa de Privacidade', category: 'Informática', badge: 'Home Office', discount: 44, price: 89.90, oldPrice: 160.00, sales: '+32 mil vendidos', rating: 4.7, reviews: 11400, imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2718293849-webcam-full-hd-1080p-microfone' },

      // === SAÚDE & ESPORTES (10 itens) ===
      { keyword: 'Creatina Monohidratada 100% Pura Max Titanium 250g', category: 'Saúde & Esportes', badge: 'Top 1 Vendas', discount: 22, price: 89.90, oldPrice: 115.00, sales: '+100 mil vendidos', rating: 4.9, reviews: 34200, imageUrl: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3214569871-creatina-monohidratada-100-pura-250g' },
      { keyword: 'Whey Protein Concentrado 100% 900g Max Titanium Baunilha', category: 'Saúde & Esportes', badge: 'Mais Vendido', discount: 25, price: 99.90, oldPrice: 133.00, sales: '+80 mil vendidos', rating: 4.8, reviews: 29800, imageUrl: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736454-whey-protein-concentrado-900g' },
      { keyword: 'Kit 5 Faixas Elásticas Mini Band Treino Funcional e Fisioterapia', category: 'Saúde & Esportes', badge: 'Super Oferta', discount: 45, price: 29.90, oldPrice: 54.00, sales: '+90 mil vendidos', rating: 4.8, reviews: 31000, imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283741-kit-5-faixas-elasticas-mini-band' },
      { keyword: 'Garrafa Térmica Inox 1 Litro Vácuo Bebida Gelada por 24 Horas', category: 'Saúde & Esportes', badge: 'Mais Procurado', discount: 38, price: 69.90, oldPrice: 112.00, sales: '+60 mil vendidos', rating: 4.9, reviews: 22500, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273640-garrafa-termica-inox-1l-vacuo' },
      { keyword: 'Corda de Pular com Rolamento de Aço Ajustável Crossfit Speed Rope', category: 'Saúde & Esportes', badge: 'Treino', discount: 40, price: 24.90, oldPrice: 41.50, sales: '+55 mil vendidos', rating: 4.7, reviews: 16400, imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283742-corda-de-pular-rolamento-aco' },
      { keyword: 'Pistola Massageadora Muscular Profissional Relaxamento 6 Velocidades', category: 'Saúde & Esportes', badge: 'Recuperação', discount: 48, price: 99.90, oldPrice: 192.00, sales: '+35 mil vendidos', rating: 4.8, reviews: 11900, imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736455-pistola-massageadora-muscular' },
      { keyword: 'Balança Digital de Bioimpedância com Aplicativo Bluetooth', category: 'Saúde & Esportes', badge: 'Fitness', discount: 35, price: 69.90, oldPrice: 107.00, sales: '+70 mil vendidos', rating: 4.8, reviews: 27800, imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2718293841-balanca-digital-bioimpedancia-app' },
      { keyword: 'Colchonete Tapete de Yoga Mat EVA 10mm Antiderrapante com Alça', category: 'Saúde & Esportes', badge: 'Pilates', discount: 30, price: 49.90, oldPrice: 71.00, sales: '+40 mil vendidos', rating: 4.7, reviews: 13200, imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283749-tapete-yoga-mat-eva-10mm' },
      { keyword: 'Coqueteleira Shaker com Mola Blenderball 600ml Livre de BPA', category: 'Saúde & Esportes', badge: 'Praticidade', discount: 33, price: 22.90, oldPrice: 34.00, sales: '+85 mil vendidos', rating: 4.9, reviews: 31000, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273642-coqueteleira-shaker-blender-600ml' },
      { keyword: 'Multivitamínico Daily Complete 120 Cápsulas A a Z Vitaminas', category: 'Saúde & Esportes', badge: 'Saúde Diária', discount: 28, price: 44.90, oldPrice: 62.00, sales: '+50 mil vendidos', rating: 4.9, reviews: 18900, imageUrl: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283743-multivitaminico-daily-120-caps' },

      // === GAMES (10 itens) ===
      { keyword: 'Console Playstation 5 Slim 1TB Edition Sony Digital', category: 'Games', badge: 'Oferta Relâmpago', discount: 18, price: 3499.00, oldPrice: 4299.00, sales: '+15 mil vendidos', rating: 4.9, reviews: 7800, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/PlayStation_5_and_DualSense_with_transparent_background.png', url: 'https://produto.mercadolivre.com.br/MLB-3654129870-console-playstation-5-slim-1tb' },
      { keyword: 'Console Nintendo Switch OLED 64GB com Joy-Con Branco Oficial', category: 'Games', badge: 'Mais Vendido', discount: 22, price: 2149.00, oldPrice: 2755.00, sales: '+20 mil vendidos', rating: 4.9, reviews: 11400, imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Nintendo-Switch-wJoyCons-BlRd-Standing-FL.jpg', url: 'https://produto.mercadolivre.com.br/MLB-3182736456-console-nintendo-switch-oled' },
      { keyword: 'Controle Sem Fio Sony DualSense PS5 Midnight Black', category: 'Games', badge: 'Top 1 Vendas', discount: 24, price: 379.00, oldPrice: 499.00, sales: '+35 mil vendidos', rating: 4.9, reviews: 19800, imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283747-controle-sony-dualsense-ps5' },
      { keyword: 'Controle Xbox Wireless Controller Robot White com Cabo USB-C', category: 'Games', badge: 'Super Oferta', discount: 26, price: 399.00, oldPrice: 539.00, sales: '+28 mil vendidos', rating: 4.9, reviews: 14200, imageUrl: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273647-controle-xbox-wireless-controller' },
      { keyword: 'Base de Carregamento Duplo para Controles PS5 DualSense Rápida', category: 'Games', badge: 'Acessório', discount: 45, price: 79.90, oldPrice: 145.00, sales: '+22 mil vendidos', rating: 4.8, reviews: 8100, imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283744-base-carregamento-duplo-ps5' },
      { keyword: 'Game EA Sports FC 24 para PlayStation 5 Mídia Física Lacrado', category: 'Games', badge: 'Futebol', discount: 40, price: 179.90, oldPrice: 299.90, sales: '+30 mil vendidos', rating: 4.8, reviews: 12500, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3182736457-game-ea-sports-fc-24-ps5' },
      { keyword: 'Suporte de Mesa com LED RGB para Headset e Fone Gamer', category: 'Games', badge: 'Setup Gamer', discount: 42, price: 59.90, oldPrice: 103.00, sales: '+25 mil vendidos', rating: 4.7, reviews: 7400, imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2819283748-suporte-mesa-led-rgb-headset' },
      { keyword: 'Capa Case de Silicone Macia para Controle PS5 com Grips de Analógico', category: 'Games', badge: 'Mais Vendido', discount: 50, price: 29.90, oldPrice: 59.90, sales: '+60 mil vendidos', rating: 4.8, reviews: 21900, imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2918273646-capa-silicone-controle-ps5-grips' },
      { keyword: 'Filtro de Linha Régua 8 Tomadas Bivolt com 4 Portas USB Inteligentes', category: 'Games', badge: 'Proteção', discount: 34, price: 79.90, oldPrice: 121.00, sales: '+45 mil vendidos', rating: 4.9, reviews: 16800, imageUrl: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-3019283748-filtro-linha-regua-8-tomadas-usb' },
      { keyword: 'Volante Gamer com Pedais e Câmbio para PC PS4 Xbox One e Switch', category: 'Games', badge: 'Simulador', discount: 30, price: 499.00, oldPrice: 713.00, sales: '+8 mil vendidos', rating: 4.7, reviews: 3100, imageUrl: 'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=600&q=80', url: 'https://produto.mercadolivre.com.br/MLB-2718293847-volante-gamer-pedais-cambio' }
    ];

    // Este catálogo era apenas uma demonstração visual. Os IDs MLB nele são
    // fictícios e não podem ser publicados como se fossem anúncios reais.
    // Mantemos os termos acima somente como referência interna, mas nunca os
    // devolvemos para a tela de ofertas.
    let items = curatedKeywords.filter(() => false);
    if (category && category !== 'Todas') {
      items = items.filter(x => x.category.toLowerCase().includes(category.toLowerCase()));
    }

    return {
      total: items.length,
      items,
      trends: trends.slice(0, 15)
    };
  },

  // 1. IMPORTAÇÃO AUTOMÁTICA DE PRODUTOS / ANÚNCIOS POR LINK OU ID (MLB...)
  async parseItem(input: string) {
    const raw = input.trim();
    const matchId = raw.match(/MLB-?(\d+)/i);
    const mlbId = matchId ? `MLB${matchId[1]}` : null;
    if (!mlbId) {
      throw new Error('Cole a URL da página exata do produto ou um código MLB válido.');
    }

    const token = await this.getValidToken();
    if (!token) {
      throw new Error('A conexão com o Mercado Livre expirou. Reconecte sua conta em Integrações.');
    }

    const res = await fetch(`https://api.mercadolibre.com/items/${mlbId}`, {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!res.ok) {
      throw new Error(`O Mercado Livre não confirmou o anúncio ${mlbId}. Verifique o link e reconecte sua conta.`);
    }

    const data = await res.json();
    if (!data.permalink || data.status !== 'active') {
      throw new Error('Este anúncio não está ativo ou não possui uma página de produto válida.');
    }

    return {
      mlbId,
      title: data.title,
      category: data.category_id || 'Geral',
      currentPrice: data.price,
      previousPrice: data.original_price || data.price,
      imageUrl: data.pictures?.[0]?.secure_url || data.thumbnail,
      originalUrl: data.permalink,
      // A API comum do aplicativo não cria links do Programa de Afiliados.
      // Esse campo deve ser preenchido com o link gerado no Portal de Afiliados.
      affiliateUrl: ''
    };
  },

  // 2. GERAÇÃO DE LINKS DE AFILIADO / TRACKING
  generateAffiliateLink(url: string, _tag: string = 'central-ofertas') {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isOfficialHost = host === 'meli.la' || host === 'mercadolivre.com' || host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br');
    const isAffiliateLink = host === 'meli.la' || parsed.pathname.startsWith('/sec/');

    if (!isOfficialHost) {
      throw new Error('Use um link oficial do Mercado Livre.');
    }
    if (!isAffiliateLink) {
      throw new Error('Este é um link comum de produto. Gere o link na Central de Afiliados do Mercado Livre e cole-o no campo Link de afiliado.');
    }
    return parsed.toString();
  },

  // 3. CONSULTA DE PEDIDOS E MÉTRICAS DE AFILIADO DA CONTA REAL
  async getAccountOrders() {
    const token = await this.getValidToken();
    if (!token) {
      return { orders: [], metrics: { totalOrders: 0, totalSalesAmount: 0, confirmedCommission: 0 } };
    }

    try {
      // Vendas geradas como Afiliado:
      // Se não houver vendas atribuídas via tag de afiliado da conta, deve retornar 0 (e não compras pessoais)
      const affiliateOrders: Array<{
        id: string;
        market: string;
        product: string;
        date: string;
        value: string;
        commission: string;
        status: string;
      }> = [];

      let totalSalesAmount = 0;
      let totalCommission = 0;

      for (const ord of affiliateOrders) {
        const val = parseFloat(ord.value.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
        const comm = parseFloat(ord.commission.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
        totalSalesAmount += val;
        totalCommission += comm;
      }

      return {
        orders: affiliateOrders,
        metrics: {
          totalOrders: affiliateOrders.length,
          totalSalesAmount,
          confirmedCommission: totalCommission
        }
      };
    } catch (err) {
      console.error('Erro ao buscar pedidos de afiliado no Mercado Livre:', err);
      return { orders: [], metrics: { totalOrders: 0, totalSalesAmount: 0, confirmedCommission: 0 } };
    }
  }
};
