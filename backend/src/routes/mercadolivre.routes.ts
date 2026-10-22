import { Router } from 'express';
import { mercadoLivreService } from '../services/mercadolivre.service.js';
import { env } from '../config/env.js';

export const mercadoLivreRouter = Router();

// Retorna a URL para redirecionar o usuário ao login do Mercado Livre
mercadoLivreRouter.get('/auth-url', (_req, res) => {
  try {
    const authUrl = mercadoLivreService.getAuthUrl();
    res.json({ success: true, data: { authUrl } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar URL de autorização';
    res.status(500).json({ success: false, error: message });
  }
});

// Endpoint de retorno (callback) configurado no DevCenter
mercadoLivreRouter.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('Erro retornado pelo Mercado Livre:', error, error_description);
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?ml_error=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?ml_error=Codigo_de_autorizacao_ausente`);
  }

  try {
    await mercadoLivreService.handleCallback(code);
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?ml_status=success`);
  } catch (err: unknown) {
    console.error('Falha no callback do Mercado Livre:', err);
    const msg = err instanceof Error ? err.message : 'Erro desconhecido ao autenticar';
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?ml_error=${encodeURIComponent(msg)}`);
  }
});

// Consulta status da conexão
mercadoLivreRouter.get('/status', async (_req, res) => {
  try {
    const status = await mercadoLivreService.getStatus();
    res.json({ success: true, data: status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao obter status da conexão';
    res.status(500).json({ success: false, error: message });
  }
});

// Desconectar Mercado Livre
mercadoLivreRouter.post('/disconnect', async (_req, res) => {
  try {
    await mercadoLivreService.disconnect();
    res.json({ success: true, data: { message: 'Conta do Mercado Livre desconectada com sucesso.' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao desconectar';
    res.status(500).json({ success: false, error: message });
  }
});

// Melhores ofertas e mais vendidos do Mercado Livre
mercadoLivreRouter.get('/top-offers', async (req, res) => {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const data = await mercadoLivreService.getTopOffers(category);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar ofertas';
    res.status(500).json({ success: false, error: message });
  }
});

// Tendências de busca do Mercado Livre
mercadoLivreRouter.get('/trends', async (_req, res) => {
  try {
    const data = await mercadoLivreService.getTrends();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar tendências';
    res.status(500).json({ success: false, error: message });
  }
});

mercadoLivreRouter.get('/catalog/categories', async (_req, res) => {
  try {
    const data = await mercadoLivreService.getCatalogCategories();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar categorias';
    res.status(502).json({ success: false, error: message });
  }
});

mercadoLivreRouter.get('/catalog', async (req, res) => {
  try {
    const numberParam = (value: unknown) => typeof value === 'string' && value !== '' ? Number(value) : undefined;
    const data = await mercadoLivreService.searchCatalog({
      query: typeof req.query.q === 'string' ? req.query.q : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      page: numberParam(req.query.page),
      limit: numberParam(req.query.limit),
      sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      onlyOffers: req.query.onlyOffers === 'true',
      freeShipping: req.query.freeShipping === 'true',
      minPrice: numberParam(req.query.minPrice),
      maxPrice: numberParam(req.query.maxPrice)
    });
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar produtos';
    res.status(502).json({ success: false, error: message });
  }
});

// Importação e parsing automático por link ou código MLB
mercadoLivreRouter.post('/parse-item', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL ou código MLB do anúncio é obrigatório' });
    }
    const data = await mercadoLivreService.parseItem(url);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao processar anúncio do Mercado Livre';
    res.status(500).json({ success: false, error: message });
  }
});

// Valida links que já foram gerados pela Central de Afiliados.
mercadoLivreRouter.post('/generate-link', (req, res) => {
  try {
    const { url, tag } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL do produto é obrigatória' });
    }
    const affiliateUrl = mercadoLivreService.generateAffiliateLink(url, tag || 'central-ofertas');
    res.json({ success: true, data: { originalUrl: url, affiliateUrl, tag: tag || 'central-ofertas' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar link de afiliado';
    res.status(400).json({ success: false, error: message });
  }
});

// Consulta de pedidos reais e métricas da conta
mercadoLivreRouter.get('/orders', async (_req, res) => {
  try {
    const data = await mercadoLivreService.getAccountOrders();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar pedidos do Mercado Livre';
    res.status(500).json({ success: false, error: message });
  }
});
