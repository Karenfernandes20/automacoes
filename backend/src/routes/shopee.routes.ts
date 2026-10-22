import { Router } from 'express';
import { shopeeService } from '../services/shopee.service.js';

export const shopeeRouter = Router();

// Status da conexão
shopeeRouter.get('/status', async (_req, res) => {
  try {
    const data = await shopeeService.getStatus();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao obter status da Shopee';
    res.status(500).json({ success: false, error: message });
  }
});

// Melhores ofertas com comissão da Shopee
shopeeRouter.get('/top-offers', async (req, res) => {
  try {
    const page = typeof req.query.page === 'string' ? Number(req.query.page) : 1;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 24;
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : undefined;

    const data = await shopeeService.getTopOffers(page, limit, keyword);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar ofertas da Shopee';
    res.status(500).json({ success: false, error: message });
  }
});

// Gerar link curto de afiliada Shopee
shopeeRouter.post('/generate-link', async (req, res) => {
  try {
    const { url, subIds } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'URL do produto é obrigatória' });
    }
    const data = await shopeeService.generateLink(url, Array.isArray(subIds) ? subIds : ['central-ofertas']);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar link de afiliada Shopee';
    res.status(500).json({ success: false, error: message });
  }
});
