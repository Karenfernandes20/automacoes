import { env } from '../config/env.js';

export interface WuzApiGroup {
  id: string;
  name: string;
  members: number;
  capacity: number;
  status: string;
  messages: number;
  topic?: string;
}

export interface WuzApiMessage {
  id: string | number;
  sender: string;
  timestamp: string;
  type: string;
  text: string;
  mediaUrl?: string;
}

export const wuzapiService = {
  getBaseUrl() {
    return env.WUZAPI_BASE_URL.replace(/\/+$/, '');
  },

  getAdminToken() {
    return env.WUZAPI_ADMIN_TOKEN;
  },

  getUserToken() {
    return env.WUZAPI_USER_TOKEN;
  },

  // 1. Obter Status da Sessão karenpessoal
  async getStatus() {
    const baseUrl = this.getBaseUrl();
    const token = this.getUserToken();

    try {
      const res = await fetch(`${baseUrl}/session/status`, {
        headers: {
          token,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return {
          connected: false,
          loggedIn: false,
          status: 'Desconectada',
          instance: token,
          jid: null
        };
      }

      const body = await res.json();
      const data = body.data || {};
      const isConnected = !!(data.connected || data.loggedIn);

      return {
        connected: isConnected,
        loggedIn: !!data.loggedIn,
        status: isConnected ? 'Conectada' : 'Aguardando pareamento',
        instance: data.name || token,
        jid: data.jid || null,
        phone: data.jid ? data.jid.replace('@s.whatsapp.net', '') : null
      };
    } catch (err) {
      console.error('Erro ao consultar status da WuzAPI:', err);
      return {
        connected: false,
        loggedIn: false,
        status: 'Offline / Erro de conexão',
        instance: token,
        jid: null
      };
    }
  },

  // 2. Iniciar conexão e solicitar QR Code
  async startSessionAndGetQr() {
    const baseUrl = this.getBaseUrl();
    const token = this.getUserToken();

    try {
      // Primeiro chama /session/connect para abrir o websocket da sessão
      await fetch(`${baseUrl}/session/connect`, {
        method: 'POST',
        headers: {
          token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Subscribe: ['All'], Immediate: true })
      });

      // Aguarda 1 segundo para o socket do WhatsApp preparar o QR
      await new Promise(r => setTimeout(r, 1200));

      // Busca o QR code em base64
      const qrRes = await fetch(`${baseUrl}/session/qr`, {
        headers: {
          token,
          'Content-Type': 'application/json'
        }
      });

      if (!qrRes.ok) {
        const errJson = await qrRes.json().catch(() => ({}));
        return { success: false, error: errJson.error || 'Não foi possível gerar o QR Code no momento' };
      }

      const qrData = await qrRes.json();
      const qrCode = qrData.data?.QRCode || qrData.data?.qrcode || qrData.QRCode || null;

      return {
        success: true,
        qrCode,
        instance: token
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao iniciar sessão';
      return { success: false, error: message };
    }
  },

  // 3. Desconectar Sessão
  async disconnectSession() {
    const baseUrl = this.getBaseUrl();
    const token = this.getUserToken();

    try {
      const res = await fetch(`${baseUrl}/session/disconnect`, {
        method: 'POST',
        headers: {
          token,
          'Content-Type': 'application/json'
        }
      });
      return { success: res.ok };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao desconectar';
      return { success: false, error: message };
    }
  },

  // 4. Buscar Grupos Reais do WhatsApp
  async getGroups(): Promise<WuzApiGroup[]> {
    const baseUrl = this.getBaseUrl();
    const token = this.getUserToken();

    try {
      const res = await fetch(`${baseUrl}/group/list`, {
        headers: {
          token,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) return [];

      const body = await res.json();
      const rawGroups = body.data?.Groups || [];

      return rawGroups.map((g: any) => {
        const participantCount = Array.isArray(g.Participants)
          ? g.Participants.length
          : (g.ParticipantCount || 0);

        return {
          id: g.JID || g.jid || '',
          name: g.Name || g.name || 'Grupo sem nome',
          members: participantCount,
          capacity: 1024,
          status: 'Ativo',
          messages: 0,
          topic: g.Topic || ''
        };
      });
    } catch (err) {
      console.error('Erro ao listar grupos na WuzAPI:', err);
      return [];
    }
  }
  ,

  async getGroupMessages(groupJid: string, limit = 100): Promise<WuzApiMessage[]> {
    const baseUrl = this.getBaseUrl();
    const token = this.getUserToken();
    const safeLimit = Math.min(Math.max(limit, 1), 500);
    const res = await fetch(`${baseUrl}/chat/history?chat_jid=${encodeURIComponent(groupJid)}&limit=${safeLimit}`, {
      headers: { token, 'Content-Type': 'application/json' }
    });
    if (res.status === 501) {
      throw new Error('O histórico foi habilitado agora. As mensagens aparecerão conforme forem recebidas ou sincronizadas pelo WhatsApp.');
    }
    if (!res.ok) throw new Error('Não foi possível carregar as mensagens deste grupo.');
    const body = await res.json();
    const rows = Array.isArray(body.data) ? body.data : [];
    return rows.map((message: Record<string, unknown>) => ({
      id: String(message.message_id || message.id || ''),
      sender: String(message.sender_jid || ''),
      timestamp: String(message.timestamp || ''),
      type: String(message.message_type || 'text'),
      text: String(message.text_content || ''),
      mediaUrl: message.media_link ? String(message.media_link) : undefined
    }));
  }
};
