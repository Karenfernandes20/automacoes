import { Router } from 'express';
import { wuzapiService } from '../services/wuzapi.service.js';

export const wuzapiRouter = Router();

// 1. Status da conexão WhatsApp
wuzapiRouter.get('/status', async (_req, res) => {
  try {
    const data = await wuzapiService.getStatus();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao obter status da WuzAPI';
    res.status(500).json({ success: false, error: message });
  }
});

// 2. Gerar QR Code para pareamento
wuzapiRouter.post('/connect', async (_req, res) => {
  try {
    const result = await wuzapiService.startSessionAndGetQr();
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao iniciar conexão WhatsApp';
    res.status(500).json({ success: false, error: message });
  }
});

// 3. Desconectar sessão
wuzapiRouter.post('/disconnect', async (_req, res) => {
  try {
    const result = await wuzapiService.disconnectSession();
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao desconectar WhatsApp';
    res.status(500).json({ success: false, error: message });
  }
});

// 4. Listar Grupos reais do WhatsApp
wuzapiRouter.get('/groups', async (_req, res) => {
  try {
    const groups = await wuzapiService.getGroups();
    res.json({ success: true, data: { groups } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao listar grupos';
    res.status(500).json({ success: false, error: message });
  }
});

wuzapiRouter.get('/groups/:groupId/messages', async (req, res) => {
  try {
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
    const messages = await wuzapiService.getGroupMessages(String(req.params.groupId), limit);
    res.json({ success: true, data: { messages } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao carregar mensagens';
    res.status(502).json({ success: false, error: message });
  }
});
