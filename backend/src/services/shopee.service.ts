import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface ShopeeProductItem {
  itemId: string | number;
  title: string;
  price: number;
  imageUrl: string;
  offerLink: string;
  commissionRate: number;
  commission: number;
}

export const shopeeService = {
  isConfigured(): boolean {
    return Boolean(env.SHOPEE_APP_ID && env.SHOPEE_SECRET);
  },

  async queryGraphQL<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Credenciais da Shopee (AppID e Senha/Secret) não configuradas no sistema.');
    }

    const appId = env.SHOPEE_APP_ID;
    const secret = env.SHOPEE_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);

    const payload = JSON.stringify({ query, variables });
    const factor = `${appId}${timestamp}${payload}${secret}`;
    const signature = crypto.createHash('sha256').update(factor).digest('hex');

    const authHeader = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: payload
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Erro na API da Shopee (HTTP ${res.status}): ${text || res.statusText}`);
    }

    const result = await res.json() as { data?: T; errors?: Array<{ message: string }> };

    if (result.errors && result.errors.length > 0) {
      throw new Error(`Erro Shopee: ${result.errors[0].message}`);
    }

    return result.data as T;
  },

  async getStatus() {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false,
        status: 'Não configurada',
        appId: null
      };
    }

    try {
      // Teste rápido para validar credenciais
      await this.getTopOffers(1, 1);
      return {
        configured: true,
        connected: true,
        status: 'Conectada (API Ativa)',
        appId: env.SHOPEE_APP_ID
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar com a Shopee';
      return {
        configured: true,
        connected: false,
        status: `Erro: ${msg}`,
        appId: env.SHOPEE_APP_ID
      };
    }
  },

  async getTopOffers(page = 1, limit = 24, keyword?: string): Promise<{ items: ShopeeProductItem[]; total: number }> {
    const gql = `
      query GetProductOffers($page: Int, $limit: Int, $keyword: String) {
        productOfferV2(page: $page, limit: $limit, keyword: $keyword) {
          nodes {
            itemId
            productName
            price
            imageUrl
            offerLink
            commissionRate
            commission
          }
        }
      }
    `;

    const data = await this.queryGraphQL<{
      productOfferV2?: {
        nodes?: Array<{
          itemId: number | string;
          productName: string;
          price: string;
          imageUrl: string;
          offerLink: string;
          commissionRate: string;
          commission: string;
        }>;
      };
    }>(gql, { page, limit, keyword: keyword || undefined });

    const nodes = data?.productOfferV2?.nodes || [];
    const items: ShopeeProductItem[] = nodes.map(n => {
      const price = parseFloat(n.price) || 0;
      const rate = parseFloat(n.commissionRate) || 0;
      const commission = parseFloat(n.commission) || (price * rate);
      return {
        itemId: n.itemId,
        title: n.productName,
        price,
        imageUrl: n.imageUrl,
        offerLink: n.offerLink,
        commissionRate: Math.round(rate * 100),
        commission: Math.round(commission * 100) / 100
      };
    });

    return {
      items,
      total: items.length
    };
  },

  async generateLink(url: string, subIds: string[] = ['central-ofertas']): Promise<{ shortLink: string }> {
    const gql = `
      mutation GenerateLink($originUrl: String!, $subIds: [String]) {
        generateShortLink(input: { originUrl: $originUrl, subIds: $subIds }) {
          shortLink
        }
      }
    `;

    try {
      const data = await this.queryGraphQL<{
        generateShortLink?: { shortLink: string };
      }>(gql, { originUrl: url, subIds });

      if (data?.generateShortLink?.shortLink) {
        return { shortLink: data.generateShortLink.shortLink };
      }
      return { shortLink: url };
    } catch {
      return { shortLink: url };
    }
  }
};
