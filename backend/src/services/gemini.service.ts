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
    const text = `${productTitle} ${category}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    type Profile = { pattern:RegExp; niche:string; category:string; description:string; terms:string[] };
    const profiles:Profile[] = [
      {pattern:/(brinqued|bonec|carrinho|pelucia|lego|bloco de montar|fidget|alivio estresse|infantil|kids)/,niche:'Brinquedos, Crianças & Desenvolvimento Infantil',category:'Brinquedos e Infância',description:'Pais, responsáveis e pessoas interessadas em brinquedos, presentes e desenvolvimento infantil.',terms:['Brinquedos Educativos e Criativos','Dicas de Brinquedos para Crianças','Mães e Pais — Brincadeiras Infantis','Presentes Criativos para Crianças','Atividades e Desenvolvimento Infantil']},
      {pattern:/(automot|carro|veiculo|bateria|12v|mecanic|oficina|autopeca|motor|pneu)/,niche:'Carros, Mecânica & Manutenção Automotiva',category:'Automóveis e Mecânica',description:'Público interessado em carros, peças, ferramentas, reparos e manutenção automotiva.',terms:['Mecânica Automotiva Brasil','Dicas de Manutenção Automotiva','Autopeças e Acessórios Automotivos','Faça Você Mesmo — Carros e Garagem','Baterias e Elétrica Automotiva']},
      {pattern:/(bebe|fralda|matern|amament|mamadeira|chupeta|gestante|enxoval)/,niche:'Maternidade, Bebês & Enxoval',category:'Bebês e Maternidade',description:'Famílias interessadas em maternidade, cuidados com bebês e produtos de enxoval.',terms:['Mães de Primeira Viagem Brasil','Maternidade Real e Dicas','Enxoval de Bebê sem Mistério','Cuidados com Bebês','Gestantes e Mamães do Brasil']},
      {pattern:/(maquiagem|skincare|cosmetic|perfume|creme facial|batom|rimel|base facial|unha)/,niche:'Beleza, Maquiagem & Skincare',category:'Beleza e Cuidados',description:'Público interessado em maquiagem, cosméticos, autocuidado e rotina de beleza.',terms:['Dicas de Maquiagem Brasil','Skincare e Cuidados com a Pele','Amantes de Cosméticos e Perfumes','Beleza e Autocuidado Feminino','Unhas e Maquiagem — Dicas']},
      {pattern:/(cabelo|capilar|shampoo|condicionador|secador|chapinha|babyliss|barbear|barba)/,niche:'Cabelos, Barba & Cuidados Pessoais',category:'Cuidados Pessoais',description:'Pessoas interessadas em cuidados capilares, barba, estética e beleza.',terms:['Cronograma Capilar Brasil','Cabelos Cacheados e Crespos','Dicas para Cabelos Saudáveis','Barba e Cuidados Masculinos','Produtos Profissionais para Cabelo']},
      {pattern:/(celular|smartphone|iphone|android|capinha|carregador usb|fone|bluetooth|smartwatch)/,niche:'Celulares, Gadgets & Tecnologia',category:'Tecnologia',description:'Entusiastas de celulares, acessórios, gadgets e novidades tecnológicas.',terms:['Celulares e Smartphones Brasil','Acessórios para Celular','Tecnologia e Gadgets Brasil','Android — Dicas e Acessórios','iPhone Brasil — Dicas e Acessórios']},
      {pattern:/(notebook|computador|pc gamer|teclado|mouse|monitor|ssd|placa de video|impressora|informatica)/,niche:'Informática, Computadores & PC Gamer',category:'Informática',description:'Público interessado em computadores, hardware, periféricos e informática.',terms:['Hardware Brasil','PC Gamer Brasil','Informática e Computadores','Notebooks — Dicas e Ofertas','Periféricos Gamer Brasil']},
      {pattern:/(game|gamer|console|playstation|xbox|nintendo|controle joystick)/,niche:'Games, Consoles & Jogadores',category:'Games',description:'Jogadores interessados em consoles, jogos, controles e acessórios gamer.',terms:['Gamers Brasil','PlayStation Brasil','Xbox Brasil','Nintendo Brasil','Jogos e Consoles Brasil']},
      {pattern:/(ferrament|furadeira|parafusadeira|serra|chave de|alicate|solda|marcenaria)/,niche:'Ferramentas, Oficina & Faça Você Mesmo',category:'Ferramentas',description:'Profissionais e hobbistas interessados em ferramentas, oficina, reparos e projetos.',terms:['Ferramentas e Máquinas Brasil','Faça Você Mesmo Brasil','Marcenaria e Ferramentas','Reformas e Reparos Residenciais','Profissionais da Construção e Manutenção']},
      {pattern:/(panela|cozinha|airfryer|liquidificador|cafeteira|pote|talher|receita|forno|fogao)/,niche:'Cozinha, Receitas & Utensílios',category:'Casa e Cozinha',description:'Pessoas interessadas em culinária, receitas e utensílios que facilitam a cozinha.',terms:['Receitas e Dicas de Cozinha','Airfryer — Receitas e Dicas','Utensílios de Cozinha','Cozinha Prática e Organizada','Donas de Casa e Culinária']},
      {pattern:/(casa|decoracao|moveis|sofa|tapete|cortina|organizad|limpeza|quarto|banheiro)/,niche:'Casa, Organização & Decoração',category:'Casa e Decoração',description:'Pessoas interessadas em organização, decoração, limpeza e melhorias para o lar.',terms:['Casa Organizada Brasil','Decoração e Inspiração para o Lar','Dicas de Limpeza e Organização','Apartamento e Casa Nova','Faça Você Mesmo — Decoração']},
      {pattern:/(roupa|camisa|camiseta|vestido|calca|short|jaqueta|moda feminina|moda masculina|lingerie)/,niche:'Moda, Estilo & Vestuário',category:'Moda',description:'Público interessado em roupas, tendências, combinações e estilo.',terms:['Moda Feminina Brasil','Moda Masculina Brasil','Looks e Inspirações','Moda Plus Size Brasil','Dicas de Estilo e Vestuário']},
      {pattern:/(tenis|sapato|sandalia|chinelo|bota|calcado)/,niche:'Calçados, Tênis & Estilo',category:'Moda e Calçados',description:'Pessoas interessadas em tênis, calçados, conforto e estilo.',terms:['Apaixonados por Tênis','Calçados Femininos Brasil','Tênis e Sneakers Brasil','Sapatos e Sandálias','Moda e Calçados Brasil']},
      {pattern:/(academia|fitness|musculacao|treino|corrida|ciclismo|esporte|bola|suplemento|whey)/,niche:'Fitness, Esportes & Vida Ativa',category:'Esportes e Fitness',description:'Pessoas interessadas em exercícios, esportes, suplementação e vida saudável.',terms:['Academia e Musculação Brasil','Treino em Casa','Corrida de Rua Brasil','Vida Fitness e Saudável','Esportes e Atividade Física']},
      {pattern:/(pet|cachorro|gato|cao|racao|aquario|passaro|animal)/,niche:'Pets, Cães & Gatos',category:'Animais de Estimação',description:'Tutores interessados em cuidados, acessórios, alimentação e bem-estar animal.',terms:['Apaixonados por Cachorros','Amantes de Gatos Brasil','Mundo Pet Brasil','Cuidados com Cães e Gatos','Dicas para Tutores de Pets']},
      {pattern:/(saude|pressao|ortoped|massageador|vitamina|medic|terapeut|postura)/,niche:'Saúde, Bem-estar & Qualidade de Vida',category:'Saúde e Bem-estar',description:'Pessoas interessadas em bem-estar, cuidados pessoais e qualidade de vida.',terms:['Saúde e Bem-estar Brasil','Qualidade de Vida e Autocuidado','Dicas de Saúde e Bem-estar','Produtos Ortopédicos e Postura','Vida Saudável Brasil']},
      {pattern:/(joia|semijoia|colar|pulseira|brinco|anel|relogio)/,niche:'Joias, Acessórios & Relógios',category:'Acessórios',description:'Público interessado em joias, semijoias, relógios e acessórios de estilo.',terms:['Semijoias e Acessórios Brasil','Apaixonadas por Joias','Relógios e Acessórios','Bijuterias e Semijoias','Moda e Acessórios Femininos']},
      {pattern:/(livro|papelaria|caneta|caderno|material escolar|escritorio)/,niche:'Livros, Papelaria & Estudos',category:'Livros e Papelaria',description:'Leitores, estudantes e pessoas interessadas em papelaria e organização de estudos.',terms:['Leitores do Brasil','Papelaria Criativa Brasil','Material Escolar e Estudos','Amantes de Livros','Organização de Estudos']},
      {pattern:/(jardim|jardinagem|planta|horta|vaso|grama)/,niche:'Jardinagem, Plantas & Horta',category:'Jardim',description:'Pessoas interessadas em plantas, jardinagem, hortas e áreas externas.',terms:['Jardinagem Brasil','Amantes de Plantas','Horta em Casa','Suculentas e Plantas Brasil','Jardins e Paisagismo']},
      {pattern:/(agro|fazenda|rural|gado|trator|agricultura|pecuaria)/,niche:'Agro, Campo & Vida Rural',category:'Agro',description:'Produtores e pessoas interessadas em agricultura, pecuária e vida no campo.',terms:['Agronegócio Brasil','Produtores Rurais Brasil','Agricultura e Pecuária','Máquinas e Equipamentos Agrícolas','Vida no Campo Brasil']},
      {pattern:/(violao|guitarra|teclado musical|instrumento|microfone|audio profissional)/,niche:'Música, Instrumentos & Áudio',category:'Instrumentos Musicais',description:'Músicos e pessoas interessadas em instrumentos, equipamentos e produção musical.',terms:['Músicos do Brasil','Violão e Guitarra Brasil','Instrumentos Musicais','Home Studio Brasil','Áudio Profissional e Música']},
      {pattern:/(tv|televis|projetor|caixa de som|eletronico|camera|drone|home theater)/,niche:'Eletrônicos, Áudio & Vídeo',category:'Eletrônicos',description:'Entusiastas de eletrônicos, áudio, vídeo e tecnologia para entretenimento.',terms:['Eletrônicos Brasil','Áudio e Vídeo Brasil','TVs e Home Theater','Tecnologia para Casa','Câmeras e Eletrônicos']},
      {pattern:/(geladeira|lavadora|maquina de lavar|micro-ondas|eletrodomest|aspirador|ventilador|ar condicionado)/,niche:'Eletrodomésticos & Casa Prática',category:'Eletrodomésticos',description:'Pessoas interessadas em eletrodomésticos e soluções práticas para o lar.',terms:['Eletrodomésticos Brasil','Casa Prática e Funcional','Dicas de Eletrodomésticos','Organização e Facilidades para o Lar','Eletros para Casa']},
      {pattern:/(alimento|bebida|cafe |chocolate|doce|snack|cerveja|vinho|gourmet)/,niche:'Alimentos, Bebidas & Gastronomia',category:'Alimentos e Bebidas',description:'Pessoas interessadas em gastronomia, alimentos, bebidas e experiências culinárias.',terms:['Gastronomia Brasil','Amantes de Café','Alimentos e Bebidas Brasil','Dicas e Produtos Gourmet','Culinária e Sabores']},
      {pattern:/(festa|aniversario|casamento|decoracao de festa|balao|lembrancinha)/,niche:'Festas, Eventos & Decoração',category:'Festas',description:'Pessoas interessadas em festas, eventos, decoração e lembranças.',terms:['Festas e Decoração Brasil','Dicas para Aniversários','Faça Você Mesmo — Festas','Casamentos e Eventos','Lembrancinhas e Personalizados']},
      {pattern:/(viagem|mala|mochila|camping|barraca|turismo|trilha)/,niche:'Viagens, Camping & Aventura',category:'Viagem e Lazer',description:'Viajantes e pessoas interessadas em turismo, camping, trilhas e aventura.',terms:['Viajantes do Brasil','Camping Brasil','Trilhas e Aventuras','Dicas de Viagem Brasil','Mochileiros e Turismo']},
      {pattern:/(arte|artesanato|pintura|costura|croche|tricot|armarinho|scrapbook)/,niche:'Artesanato, Arte & Trabalhos Manuais',category:'Arte e Artesanato',description:'Artesãos e pessoas interessadas em trabalhos manuais, arte e materiais criativos.',terms:['Artesanato Brasil','Crochê e Trabalhos Manuais','Costura Criativa Brasil','Arte e Pintura','Materiais para Artesanato']},
      {pattern:/(industria|industrial|comercio|balanca comercial|maquina profissional|equipamento comercial)/,niche:'Indústria, Comércio & Equipamentos Profissionais',category:'Equipamentos Profissionais',description:'Empreendedores e profissionais interessados em máquinas e equipamentos para negócios.',terms:['Empreendedores do Brasil','Máquinas e Equipamentos Industriais','Comércio e Varejo Brasil','Equipamentos Profissionais','Pequenos Negócios Brasil']},
      {pattern:/(antiguidade|colecion|moeda antiga|selo|miniatura)/,niche:'Antiguidades, Coleções & Hobby',category:'Colecionismo',description:'Colecionadores e pessoas interessadas em antiguidades, peças raras e hobbies.',terms:['Colecionadores do Brasil','Antiguidades Brasil','Compra e Venda de Coleções','Moedas e Cédulas Antigas','Hobbies e Colecionismo']},
    ];
    const profile = profiles.find(item=>item.pattern.test(text));
    if (!profile) return null;
    return {
      niche: profile.niche,
      keywords: profile.terms.map(term=>term.toLocaleLowerCase('pt-BR')),
      groups: profile.terms.map(name => ({
        name, category:profile.category, estimatedMembers:'Ver no Facebook', searchQuery:name,
        directUrl:`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(name)}`,
        description:profile.description
      }))
    };
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
        niche: parsed.niche || category || 'Interesses relacionados ao produto',
        keywords: parsed.keywords || [category, productTitle].filter(Boolean),
        groups
      };
    } catch (e) {
      console.warn('Gemini group generation fallback:', e);
      const topic = category && category !== 'Geral' ? category : productTitle.split(/\s+/).slice(0,4).join(' ');
      const terms = [`${topic} Brasil`, `Dicas de ${topic}`, `Comunidade ${topic}`, `Apaixonados por ${topic}`, `${topic} — Dúvidas e Recomendações`];
      return {
        niche: topic,
        keywords: [topic, productTitle],
        groups: terms.map(t => ({
          name: t,
          category: topic,
          estimatedMembers: 'Ver no Facebook',
          searchQuery: t,
          directUrl: `https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(t)}`,
          description: `Público interessado em ${topic.toLocaleLowerCase('pt-BR')} e produtos relacionados.`
        }))
      };
    }
  }
}
