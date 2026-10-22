import { Router } from 'express';
import { env } from '../config/env.js';
import { facebookService } from '../services/facebook.service.js';

export const facebookRouter = Router();

facebookRouter.get('/auth-url', (_req, res) => {
  try { res.json({ success: true, data: { authUrl: facebookService.getAuthUrl() } }); }
  catch (err) { res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Falha ao conectar Facebook' }); }
});

facebookRouter.get('/callback', async (req, res) => {
  const error = typeof req.query.error_description === 'string' ? req.query.error_description : null;
  if (error) return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?fb_error=${encodeURIComponent(error)}`);
  if (typeof req.query.code !== 'string' || typeof req.query.state !== 'string') {
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?fb_error=Autorizacao_incompleta`);
  }
  try {
    await facebookService.handleCallback(req.query.code, req.query.state);
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?fb_status=success`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha na autorização';
    return res.redirect(`${env.FRONTEND_URL}/admin/integracoes?fb_error=${encodeURIComponent(message)}`);
  }
});

facebookRouter.get('/status', async (_req, res) => res.json({ success: true, data: await facebookService.getStatus() }));
facebookRouter.put('/page', async (req, res) => {
  try { res.json({ success: true, data: await facebookService.selectPage(String(req.body.pageId || '')) }); }
  catch (err) { res.status(400).json({ success: false, error: err instanceof Error ? err.message : 'Falha ao selecionar Página' }); }
});
facebookRouter.post('/disconnect', async (_req, res) => { await facebookService.disconnect(); res.json({ success: true, data: { disconnected: true } }); });
