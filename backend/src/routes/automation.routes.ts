import { Router, Request, Response } from 'express';
import { GeminiFlowService } from '../services/gemini.service.js';

const router = Router();

// Test / status endpoint
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    res.json({
      configured: hasKey,
      model: 'gemini-1.5-flash',
      capabilities: ['whatsapp_copy', 'video_scripts', 'visual_prompts', 'google_flow']
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate WhatsApp copy for a product
router.post('/generate-copy', async (req: Request, res: Response) => {
  try {
    const { productTitle, category, currentPrice, previousPrice, marketplace, affiliateUrl, tone } = req.body;
    if (!productTitle) {
      return res.status(400).json({ error: 'Título do produto é obrigatório.' });
    }

    const copy = await GeminiFlowService.generateWhatsAppPost({
      productTitle,
      category: category || 'Geral',
      currentPrice: Number(currentPrice) || 0,
      previousPrice: previousPrice ? Number(previousPrice) : undefined,
      marketplace: marketplace || 'Mercado Livre',
      affiliateUrl: affiliateUrl || '',
      tone
    });

    res.json({ copy });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate TikTok / Reels / Shorts video script
router.post('/generate-video-script', async (req: Request, res: Response) => {
  try {
    const { productTitle, category, currentPrice, marketplace, affiliateUrl, durationSeconds } = req.body;
    if (!productTitle) {
      return res.status(400).json({ error: 'Título do produto é obrigatório.' });
    }

    const script = await GeminiFlowService.generateVideoScript({
      productTitle,
      category: category || 'Geral',
      currentPrice: Number(currentPrice) || 0,
      marketplace: marketplace || 'Mercado Livre',
      affiliateUrl: affiliateUrl || '',
      durationSeconds: durationSeconds || 30
    });

    res.json({ script });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Generate Google Flow / Image & Video prompts
router.post('/generate-visual-prompts', async (req: Request, res: Response) => {
  try {
    const { productTitle, category } = req.body;
    if (!productTitle) {
      return res.status(400).json({ error: 'Título do produto é obrigatório.' });
    }

    const prompts = await GeminiFlowService.generateVisualPrompt(productTitle, category || 'Geral');
    res.json(prompts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Identify niche and suggested Facebook groups for a product
router.post('/niche-groups', async (req: Request, res: Response) => {
  try {
    const { productTitle, category } = req.body;
    if (!productTitle) {
      return res.status(400).json({ error: 'Título do produto é obrigatório.' });
    }

    const data = await GeminiFlowService.findFacebookNicheGroups(productTitle, category || 'Geral');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

