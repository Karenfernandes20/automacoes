import { useState, useEffect } from 'react';
import { Bot, Sparkles, Copy, Check, Video, Image as ImageIcon, Send, RefreshCw, MessageSquare, Flame, Zap, Play } from 'lucide-react';
import { useOffers } from '../hooks/useOffers';
import { api } from '../lib/api';

export function AutomacoesPage() {
  const { offers } = useOffers();
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [status, setStatus] = useState<{ configured: boolean; model: string; capabilities: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'copy' | 'video' | 'visual'>('copy');
  
  // Custom prompt / inputs
  const [tone, setTone] = useState<'urgencia' | 'descontraido' | 'direto' | 'storytelling'>('urgencia');
  const [customProduct, setCustomProduct] = useState({
    title: '',
    category: 'Eletrônicos',
    currentPrice: '',
    previousPrice: '',
    marketplace: 'Mercado Livre',
    affiliateUrl: ''
  });

  // Generated outputs
  const [generatedCopy, setGeneratedCopy] = useState<string>('');
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [visualPrompts, setVisualPrompts] = useState<{ imagePrompt: string; videoPrompt: string } | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAutomationStatus()
      .then(res => setStatus(res))
      .catch(() => setStatus({ configured: true, model: 'gemini-1.5-flash', capabilities: [] }));
  }, []);

  // When offer selection changes, populate customProduct
  const handleSelectOffer = (id: string) => {
    setSelectedOfferId(id);
    const found = offers.find(o => o.id === id);
    if (found) {
      setCustomProduct({
        title: found.title,
        category: found.category || 'Geral',
        currentPrice: String(found.currentPrice),
        previousPrice: found.previousPrice ? String(found.previousPrice) : '',
        marketplace: found.marketplace || 'Mercado Livre',
        affiliateUrl: found.affiliateUrl || found.originalUrl
      });
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleGenerate = async () => {
    if (!customProduct.title.trim()) {
      setError('Informe ou selecione um produto para gerar o conteúdo.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = {
        productTitle: customProduct.title,
        category: customProduct.category,
        currentPrice: Number(customProduct.currentPrice) || 0,
        previousPrice: customProduct.previousPrice ? Number(customProduct.previousPrice) : undefined,
        marketplace: customProduct.marketplace,
        affiliateUrl: customProduct.affiliateUrl,
        tone
      };

      if (activeTab === 'copy') {
        const res = await api.generateCopy(payload);
        if (res.error) throw new Error(res.error);
        setGeneratedCopy(res.copy);
      } else if (activeTab === 'video') {
        const res = await api.generateVideoScript(payload);
        if (res.error) throw new Error(res.error);
        setGeneratedScript(res.script);
      } else if (activeTab === 'visual') {
        const res = await api.generateVisualPrompts({
          productTitle: customProduct.title,
          category: customProduct.category
        });
        if (res.error) throw new Error(res.error);
        setVisualPrompts({ imagePrompt: res.imagePrompt, videoPrompt: res.videoPrompt });
      }
    } catch (err) {
      setError((err as Error).message || 'Erro ao comunicar com Google Gemini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      <div className="admin-title">
        <div>
          <span>INTELIGÊNCIA ARTIFICIAL & CREATIVE STUDIO</span>
          <h1>Automações <em>Gemini & Flow</em></h1>
          <p>Gere copies de alta conversão para WhatsApp, roteiros de Reels/TikTok e prompts visuais para Google Flow e Imagen com 1 clique.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            <Sparkles size={14} color="#0284c7" />
            {status?.configured ? `Gemini 2.5 Flash Conectado` : 'Google Gemini Pendente'}
          </div>
        </div>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Grid: Configurator / Target Offer + Output Sandbox */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 420px) minmax(0, 1fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* Left Column: Product Selection & Configuration */}
        <div className="panel" style={{ padding: '20px' }}>
          <h2 style={{ font: '700 14px Manrope', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="#6c3ce9" />
            1. Selecionar Produto & Dados
          </h2>

          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4b5563', marginBottom: '6px' }}>
            Preencher a partir de uma oferta existente:
          </label>
          <select
            value={selectedOfferId}
            onChange={(e) => handleSelectOffer(e.target.value)}
            style={{
              width: '100%',
              padding: '9px',
              border: '1px solid #d1d5db',
              borderRadius: '7px',
              fontSize: '11px',
              marginBottom: '16px'
            }}
          >
            <option value="">-- Selecione uma oferta ou digite abaixo --</option>
            {offers.map(o => (
              <option key={o.id} value={o.id}>
                {o.title.substring(0, 45)}... (R$ {o.currentPrice})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                Nome do Produto:
              </label>
              <input
                type="text"
                placeholder="Ex: Apple iPhone 15 128GB Preto Oficial"
                value={customProduct.title}
                onChange={(e) => setCustomProduct({ ...customProduct, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  Preço Atual (R$):
                </label>
                <input
                  type="number"
                  placeholder="319.90"
                  value={customProduct.currentPrice}
                  onChange={(e) => setCustomProduct({ ...customProduct, currentPrice: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  Preço Anterior (opcional):
                </label>
                <input
                  type="number"
                  placeholder="499.90"
                  value={customProduct.previousPrice}
                  onChange={(e) => setCustomProduct({ ...customProduct, previousPrice: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  Categoria:
                </label>
                <input
                  type="text"
                  placeholder="Casa, Celulares, etc"
                  value={customProduct.category}
                  onChange={(e) => setCustomProduct({ ...customProduct, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  Marketplace:
                </label>
                <input
                  type="text"
                  value={customProduct.marketplace}
                  onChange={(e) => setCustomProduct({ ...customProduct, marketplace: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                Link de Afiliado (inserido automaticamente no CTA):
              </label>
              <input
                type="text"
                placeholder="https://mercadolivre.com/sec/..."
                value={customProduct.affiliateUrl}
                onChange={(e) => setCustomProduct({ ...customProduct, affiliateUrl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '11px'
                }}
              />
            </div>

            {activeTab === 'copy' && (
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#6b7280', marginBottom: '4px' }}>
                  Tom da Mensagem:
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                >
                  <option value="urgencia">🔥 Urgência & Oportunidade Relâmpago</option>
                  <option value="descontraido">😎 Descontraído & Achadinho Imperdível</option>
                  <option value="direto">⚡ Direto ao ponto (Preço + Link)</option>
                  <option value="storytelling">📖 Storytelling (Problema vs Solução)</option>
                </select>
              </div>
            )}

            <button
              className="btn primary"
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '11px',
                gap: '8px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Gerando com IA Google...
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Gerar com Gemini & Flow
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Automation Workspace */}
        <div className="panel" style={{ padding: '20px' }}>
          {/* Automation Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '12px',
            marginBottom: '16px'
          }}>
            <button
              onClick={() => setActiveTab('copy')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: activeTab === 'copy' ? '#6c3ce9' : '#f3f4f6',
                color: activeTab === 'copy' ? '#fff' : '#4b5563',
                border: 0,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={14} />
              Copy WhatsApp / Telegram
            </button>

            <button
              onClick={() => setActiveTab('video')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: activeTab === 'video' ? '#6c3ce9' : '#f3f4f6',
                color: activeTab === 'video' ? '#fff' : '#4b5563',
                border: 0,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Video size={14} />
              Roteiro Vídeo (Reels / TikTok)
            </button>

            <button
              onClick={() => setActiveTab('visual')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: activeTab === 'visual' ? '#6c3ce9' : '#f3f4f6',
                color: activeTab === 'visual' ? '#fff' : '#4b5563',
                border: 0,
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <ImageIcon size={14} />
              Prompts Visuais (Google Flow & Imagen)
            </button>
          </div>

          {/* TAB 1: WHATSAPP COPY */}
          {activeTab === 'copy' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                  Texto Pronto para Publicação nos Grupos
                </span>
                {generatedCopy && (
                  <button
                    className="btn"
                    onClick={() => handleCopy(generatedCopy, 'copy')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      background: copiedKey === 'copy' ? '#10b981' : '#f3f4f6',
                      color: copiedKey === 'copy' ? '#fff' : '#374151',
                      borderRadius: '6px'
                    }}
                  >
                    {copiedKey === 'copy' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey === 'copy' ? 'Copiado!' : 'Copiar Texto'}
                  </button>
                )}
              </div>

              {generatedCopy ? (
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  color: '#1f2937'
                }}>
                  {generatedCopy}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '10px',
                  color: '#9ca3af'
                }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <b style={{ display: 'block', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
                    Nenhuma copy gerada ainda
                  </b>
                  <p style={{ margin: 0, fontSize: '11px' }}>
                    Selecione um produto ao lado e clique no botão roxo para criar a mensagem com gatilhos de vendas.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIDEO SCRIPT */}
          {activeTab === 'video' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                  Roteiro com Ganchos de 30s para Criadores / TikTok / Reels
                </span>
                {generatedScript && (
                  <button
                    className="btn"
                    onClick={() => handleCopy(generatedScript, 'script')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      background: copiedKey === 'script' ? '#10b981' : '#f3f4f6',
                      color: copiedKey === 'script' ? '#fff' : '#374151',
                      borderRadius: '6px'
                    }}
                  >
                    {copiedKey === 'script' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey === 'script' ? 'Copiado!' : 'Copiar Roteiro'}
                  </button>
                )}
              </div>

              {generatedScript ? (
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  color: '#1f2937'
                }}>
                  {generatedScript}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '10px',
                  color: '#9ca3af'
                }}>
                  <Video size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <b style={{ display: 'block', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
                    Roteiro pronto para gravação e narração de vídeo
                  </b>
                  <p style={{ margin: 0, fontSize: '11px' }}>
                    Clique em Gerar para criar o gancho inicial de 3 segundos, apresentação e chamada de ação.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISUAL PROMPTS (GOOGLE FLOW / IMAGEN) */}
          {activeTab === 'visual' && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                  Prompts de Imagem e Vídeo B-roll para Google Flow & IA Generativa
                </span>
                <p style={{ fontSize: '10px', color: '#6b7280', margin: '4px 0 0' }}>
                  Copie os prompts abaixo e utilize diretamente no Google Flow, Imagen, Midjourney ou geradores de vídeo.
                </p>
              </div>

              {visualPrompts ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <b style={{ fontSize: '11px', color: '#4338ca', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ImageIcon size={13} />
                        Prompt de Imagem Publicitária (Google Imagen / Midjourney)
                      </b>
                      <button
                        className="btn"
                        onClick={() => handleCopy(visualPrompts.imagePrompt, 'imgPrompt')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          background: copiedKey === 'imgPrompt' ? '#10b981' : '#fff',
                          color: copiedKey === 'imgPrompt' ? '#fff' : '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '5px'
                        }}
                      >
                        {copiedKey === 'imgPrompt' ? <Check size={11} /> : <Copy size={11} />}
                        {copiedKey === 'imgPrompt' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', fontFamily: 'monospace' }}>
                      {visualPrompts.imagePrompt}
                    </div>
                  </div>

                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <b style={{ fontSize: '11px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Play size={13} />
                        Prompt de Vídeo B-Roll (Google Flow / Runway / Luma)
                      </b>
                      <button
                        className="btn"
                        onClick={() => handleCopy(visualPrompts.videoPrompt, 'vidPrompt')}
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          background: copiedKey === 'vidPrompt' ? '#10b981' : '#fff',
                          color: copiedKey === 'vidPrompt' ? '#fff' : '#374151',
                          border: '1px solid #d1d5db',
                          borderRadius: '5px'
                        }}
                      >
                        {copiedKey === 'vidPrompt' ? <Check size={11} /> : <Copy size={11} />}
                        {copiedKey === 'vidPrompt' ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#374151', lineHeight: '1.5', fontFamily: 'monospace' }}>
                      {visualPrompts.videoPrompt}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '10px',
                  color: '#9ca3af'
                }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <b style={{ display: 'block', fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
                    Gere fotos de estúdio e b-rolls em vídeo com IA
                  </b>
                  <p style={{ margin: 0, fontSize: '11px' }}>
                    Clique no botão para o Gemini sintetizar os parâmetros e diretrizes ideais de câmera, iluminação e enquadramento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
