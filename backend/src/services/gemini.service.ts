import { env } from '../config/env.js';

export interface GeneratePostContentParams {
  productTitle: string;
  category: string;
  currentPrice: number;
  previousPrice?: number;
  marketplace: string;
  affiliateUrl: string;
  tone?: 'urgencia' | 'descontraido' | 'direto' | 'storytelling';
}

export interface VideoScriptParams {
  productTitle: string;
  category: string;
  currentPrice: number;
  marketplace: string;
  affiliateUrl: string;
  durationSeconds?: number;
}

export class GeminiFlowService {
  private static getApiKey(): string {
    return env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
  }

  private static formatMoney(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  private static deterministicGroupProfile(productTitle: string, category: string) {
    const text = `${productTitle} ${category}`.toLocaleLowerCase('pt-BR');
    if (/(automot|carro|veículo|veiculo|bateria|12v|mecânic|mecanic|oficina|autopeça|autopeca|motor)/i.test(text)) {
      const terms = [
        ['Mecânica Automotiva Brasil', 'mecânica automotiva brasil'],
        ['Dicas de Manutenção Automotiva', 'manutenção automotiva dicas'],
        ['Autopeças e Acessórios Automotivos', 'autopeças acessórios automotivos'],
        ['Faça Você Mesmo — Carros e Garagem', 'faça você mesmo manutenção de carros'],
        ['Baterias, Elétrica e Som Automotivo', 'elétrica bateria som automotivo'],
      ];
      return {
        niche: 'Carros, Mecânica & Manutenção Automotiva',
        keywords: ['mecânica automotiva', 'manutenção de carros', 'autopeças', 'bateria automotiva', 'elétrica automotiva'],
        groups: terms.map(([name, searchQuery]) => ({
          name, category: 'Automóveis e Mecânica', estimatedMembers: 'Ver no Facebook', searchQuery,
          directUrl: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(searchQuery)}`,
          description: 'Público interessado em carros, peças, ferramentas, reparos e manutenção automotiva.'
        }))
      };
    }
    return null;
  }

  /**
   * Calls Google Gemini API directly via fetch to generate text, scripts or prompts
   */
  public static async generateGeminiText(prompt: string, model: string = 'gemini-2.5-flash'): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API Key do Google/Gemini não configurada no servidor.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: 0
          }
        }
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Erro na API do Google Gemini (${res.status}): ${errBody || res.statusText}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('A API do Gemini retornou uma resposta vazia.');
    }

    return text.trim();
  }

  /**
   * Generates high-converting WhatsApp promotional copy for an affiliate offer
   */
  public static async generateWhatsAppPost(params: GeneratePostContentParams): Promise<string> {
    const priceFormatted = this.formatMoney(params.currentPrice);
    const oldPriceFormatted = params.previousPrice ? this.formatMoney(params.previousPrice) : '';

    const prompt = `Você é um copywriter profissional especialista em grupos de ofertas no WhatsApp e Telegram.
Crie uma mensagem irresistível de promoção para o seguinte produto:

Produto: ${params.productTitle}
Categoria: ${params.category}
Marketplace: ${params.marketplace}
Preço Atual: ${priceFormatted}
${oldPriceFormatted ? `De: ${oldPriceFormatted}` : ''}
Link de Afiliado direto: ${params.affiliateUrl}
Tom: ${params.tone || 'urgência moderada com foco em custo-benefício'}

Regras:
1. Use emojis adequados e destacados (🔥, ⚡, 🛒, 💥, 📦).
2. Destaque o desconto ou a oportunidade.
3. Inclua chamada clara para ação (CTA) para clicar no link.
4. Mantenha no formato padrão de WhatsApp (use *negrito*, _itálico_ se apropriado).
5. Apenas retorne o texto final da mensagem pronto para ser copiado ou disparado no grupo.`;

    try {
      return await this.generateGeminiText(prompt);
    } catch (e) {
      console.warn('Gemini API call failed, generating template copy fallback:', e);
      return `🔥 *MEGA OFERTA IMPERDÍVEL!* 🔥\n\n📦 *${params.productTitle}*\n\n${oldPriceFormatted ? `❌ De: ~${oldPriceFormatted}~\n` : ''}✅ *Por apenas: ${priceFormatted}*\n🛒 Loja oficial: ${params.marketplace}\n\n⚡ *Aproveite antes que esgote o estoque!*\n👉 Compre com desconto exclusivo aqui:\n${params.affiliateUrl}`;
    }
  }

  /**
   * Generates a 30s-60s Reels / TikTok / Shorts video script for the product
   */
  public static async generateVideoScript(params: VideoScriptParams): Promise<string> {
    const priceFormatted = this.formatMoney(params.currentPrice);

    const prompt = `Você é um diretor de conteúdo para TikTok, Instagram Reels e YouTube Shorts.
Crie um roteiro dinâmico de vídeo curto (vídeo viral de achadinhos de ofertas) para promover este produto de afiliado:

Produto: ${params.productTitle}
Categoria: ${params.category}
Loja: ${params.marketplace}
Preço: ${priceFormatted}
Link: ${params.affiliateUrl}

O roteiro deve conter:
- [00:00 - 00:03] Gancho (Hook) ultra chamativo que prenda a atenção nos primeiros 3 segundos.
- [00:03 - 00:15] Apresentação do problema e como o produto resolve de forma prática.
- [00:15 - 00:25] Demonstração das principais qualidades e o preço promocional.
- [00:25 - 00:30] CTA (Chamada de Ação): Onde encontrar o link (bio/grupo de ofertas).
- Dicas visuais entre colchetes para gravação ou edição no CapCut/Google Flow.

Retorne o roteiro formatado de forma limpa e profissional.`;

    return await this.generateGeminiText(prompt);
  }

  /**
   * Generates Google Flow / Image Diffusion visual prompts (prompts em inglês para IA de imagem/vídeo)
   */
  public static async generateVisualPrompt(productTitle: string, category: string): Promise<{ imagePrompt: string; videoPrompt: string }> {
    const prompt = `For the following e-commerce product:
Product: "${productTitle}"
Category: "${category}"

Generate two ultra-detailed prompts in English optimized for AI image & video generation (such as Google Imagen, Google Flow, Midjourney, Runway Gen-3):
1. IMAGE_PROMPT: A commercial studio advertising photo prompt showing the product in premium lifestyle setting, 8k resolution, cinematic lighting, sharp focus, clean composition.
2. VIDEO_PROMPT: A 10-second dynamic b-roll video camera shot prompt (e.g. slow motion turntable, camera panning, soft depth of field).

Format the output strictly as JSON with keys: "imagePrompt" and "videoPrompt".`;

    const raw = await this.generateGeminiText(prompt);
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        imagePrompt: parsed.imagePrompt || raw,
        videoPrompt: parsed.videoPrompt || raw
      };
    } catch {
      return {
        imagePrompt: raw,
        videoPrompt: raw
      };
    }
  }

  /**
   * Identifies the niche and recommends top public Facebook groups for the product
   */
  public static async findFacebookNicheGroups(productTitle: string, category: string): Promise<{
    niche: string;
    keywords: string[];
    groups: Array<{
      name: string;
      category: string;
      estimatedMembers: string;
      searchQuery: string;
      directUrl: string;
      description: string;
    }>;
  }> {
    const deterministicProfile = this.deterministicGroupProfile(productTitle, category);
    if (deterministicProfile) return deterministicProfile;

    const prompt = `Analise este produto e identifique as MELHORES COMUNIDADES ORGÂNICAS E GRUPOS DE INTERESSE no Facebook no Brasil onde as pessoas compram por indicação e necessidade real:
Produto: "${productTitle}"
Categoria informada: "${category}"

ATENÇÃO À REGRA CRUCIAL:
NÃO sugira grupos genéricos de "Achadinhos", "Promoções", "Cupons" ou "Ofertas".
Sugira GRUPOS TEMÁTICOS E COMUNIDADES REAIS de pessoas apaixonadas pelo assunto do produto, por exemplo:
- Se for utensílio de cozinha/panela/pote: Grupos de "Dona de Casa", "Receitas Fáceis e Deliciosas", "Dicas para o Lar e Cozinha", "Mesa Posta & Cozinha Fofa", "Airfryer Receitas & Dicas", "Apartamento Novo / Enxoval".
- Se for produto de bebê/criança: Grupos de "Mães de Primeira Viagem", "Maternidade Real", "Dicas de Enxoval e Bebês", "Desmame e Introdução Alimentar".
- Se for maquiagem/beleza: "Dicas de Skincare e Maquiagem", "Cabelos Cacheados / Cronograma Capilar".
- Se for fitness: "Vida Saudável e Emagrecimento", "Treino em Casa e Dicas Fit".
- Se for bateria, carregador 12V, ferramenta ou acessório de carro: "Mecânica Automotiva", "Manutenção de Carros", "Autopeças", "Elétrica Automotiva", "Faça Você Mesmo na Garagem". NUNCA classifique esses produtos como casa, cozinha ou culinária.

Retorne SOMENTE um JSON válido com o formato:
{
  "niche": "Nome da Comunidade / Tema (ex: Donas de Casa & Culinária)",
  "keywords": ["dona de casa", "receitas da vovo", "dicas para o lar", "cozinha pratica"],
  "groups": [
    {
      "name": "Nome real ou típico de grupo ativo (ex: Donas de Casa Organizadas e Prendadas)",
      "category": "Casa e Cozinha",
      "estimatedMembers": "280 mil membros",
      "searchQuery": "termo exato para pesquisar no facebook (ex: donas de casa organizadas)",
      "description": "Mulheres que compartilham a rotina da casa e adoram dicas de utensílios que facilitam o dia a dia."
    }
  ]
}`;

    try {
      const raw = await this.generateGeminiText(prompt);
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const groups = (parsed.groups || []).map((g: any) => {
        const query = g.searchQuery || g.name || productTitle;
        return {
          name: g.name,
          category: g.category || parsed.niche,
          estimatedMembers: g.estimatedMembers || '100 mil+ membros',
          searchQuery: query,
          directUrl: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(query)}`,
          description: g.description || 'Comunidade ativa com alto engajamento em recomendações.'
        };
      });

      return {
        niche: parsed.niche || 'Donas de Casa & Dicas do Lar',
        keywords: parsed.keywords || ['donas de casa', 'receitas', 'dicas para o lar'],
        groups
      };
    } catch (e) {
      console.warn('Gemini group generation fallback:', e);
      const terms = [
        `Donas de Casa e Receitas`,
        `Dicas Para o Lar e Cozinha`,
        `Amigas Donas de Casa`,
        `Receitas Práticas da Vovó`,
        `Cozinha Prática e Organizada`
      ];
      return {
        niche: 'Donas de Casa & Culinária',
        keywords: ['donas de casa', 'receitas', 'cozinha prática'],
        groups: terms.map(t => ({
          name: `${t} Brasil`,
          category: 'Culinária e Lar',
          estimatedMembers: '150 mil membros',
          searchQuery: t,
          directUrl: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(t)}`,
          description: 'Público engajado que adora dicas, receitas e produtos funcionais para o lar.'
        }))
      };
    }
  }
}
