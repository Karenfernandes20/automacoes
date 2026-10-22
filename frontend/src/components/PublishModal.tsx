import { useState, useEffect } from 'react';
import { 
  X, Sparkles, Copy, Check, ExternalLink, RefreshCw, Send, 
  Share2, Video, FileText, Image, Users, ArrowUpRight, MessageSquare, ThumbsUp
} from 'lucide-react';
import type { Offer } from '@central/shared';
import { api } from '../lib/api';
import { money } from '../lib/format';

interface PublishModalProps {
  offer: Offer;
  onClose: () => void;
  onPublished?: () => void;
}

interface NicheGroup {
  name: string;
  category: string;
  estimatedMembers: string;
  searchQuery: string;
  directUrl: string;
  description: string;
}

export function PublishModal({ offer, onClose, onPublished }: PublishModalProps) {
  const [activeTab, setActiveTab] = useState<'copy' | 'groups' | 'script'>('copy');
  
  // Copy state
  const [copy, setCopy] = useState('');
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [tone, setTone] = useState<'urgencia' | 'descontraido' | 'direto'>('urgencia');

  // Groups state
  const [niche, setNiche] = useState('');
  const [groups, setGroups] = useState<NicheGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [visitedGroupNames, setVisitedGroupNames] = useState<string[]>([]);

  // Video script state
  const [script, setScript] = useState('');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Status update
  const [markingPublished, setMarkingPublished] = useState(false);

  const affiliateLink = offer.affiliateUrl || offer.originalUrl;

  // Load Copy
  const generateCopy = async (selectedTone = tone) => {
    setLoadingCopy(true);
    try {
      const res = await api.generateCopy({
        productTitle: offer.title,
        category: offer.category,
        currentPrice: offer.currentPrice,
        previousPrice: offer.previousPrice ?? undefined,
        marketplace: offer.marketplace,
        affiliateUrl: affiliateLink,
        tone: selectedTone
      });
      if (res.copy) setCopy(res.copy);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCopy(false);
    }
  };

  // Load Groups
  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await api.getNicheGroups({
        productTitle: offer.title,
        category: offer.category
      });
      if (res && res.groups) {
        setNiche(res.niche || offer.category);
        setGroups(res.groups);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Load Script
  const generateScript = async () => {
    setLoadingScript(true);
    try {
      const res = await api.generateVideoScript({
        productTitle: offer.title,
        category: offer.category,
        currentPrice: offer.currentPrice,
        marketplace: offer.marketplace,
        affiliateUrl: affiliateLink,
        durationSeconds: 30
      });
      if (res.script) setScript(res.script);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingScript(false);
    }
  };

  useEffect(() => {
    generateCopy();
    loadGroups();
  }, [offer.id]);

  const handleCopyText = (textToCopy: string, isForScript = false) => {
    navigator.clipboard.writeText(textToCopy);
    if (isForScript) {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  const handleOpenGroup = (grp: NicheGroup) => {
    if (!visitedGroupNames.includes(grp.name)) {
      setVisitedGroupNames(prev => [...prev, grp.name]);
    }
    // Also copy the text immediately to clipboard for convenience
    if (copy) {
      navigator.clipboard.writeText(copy);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
    window.open(grp.directUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMarkPublished = async () => {
    setMarkingPublished(true);
    try {
      await api.setStatus(offer.id, 'PUBLISHED');
      if (onPublished) onPublished();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingPublished(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="offer-modal" style={{ width: 'min(860px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Head */}
        <div className="modal-head" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #18151f 0%, #2b1f47 100%)', color: '#fff', borderRadius: '14px 14px 0 0' }}>
          <div>
            <span style={{ fontSize: '10px', letterSpacing: '1px', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase' }}>
              ⚡ Divulgação Velix • IA & Multi-Grupos
            </span>
            <h2 style={{ fontSize: '18px', margin: '4px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Divulgar: {offer.title.length > 55 ? `${offer.title.slice(0, 55)}...` : offer.title}
            </h2>
            <p style={{ color: '#d8b4fe', fontSize: '11px', margin: 0 }}>
              Gere a copy, copie a imagem e publique nos grupos certos do Facebook com alta conversão.
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Product mini bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 20px', background: '#faf5ff', borderBottom: '1px solid #f3e8ff' }}>
          <img src={offer.imageUrl} alt="" style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '6px', background: '#fff', border: '1px solid #e9d5ff' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e1b4b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {offer.title}
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
              <span style={{ color: '#7c3aed', fontWeight: 700 }}>{money.format(offer.currentPrice)}</span>
              <span>•</span>
              <span>{offer.marketplace}</span>
              <span>•</span>
              <span style={{ color: '#059669', fontWeight: 600 }}>Nicho: {niche || offer.category}</span>
            </div>
          </div>
          <button 
            type="button"
            className="btn small"
            onClick={() => handleCopyText(affiliateLink)}
            style={{ fontSize: '11px', padding: '6px 12px', background: '#fff', border: '1px solid #d8b4fe', color: '#7c3aed' }}
          >
            <Copy size={12} /> Copiar Link de Afiliado
          </button>
        </div>

        {/* Sub Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 20px', background: '#fff', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('copy')}
            style={{
              padding: '12px 14px',
              border: 0,
              background: 'none',
              borderBottom: activeTab === 'copy' ? '2px solid #7c3aed' : '2px solid transparent',
              color: activeTab === 'copy' ? '#7c3aed' : '#6b7280',
              fontWeight: activeTab === 'copy' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FileText size={15} /> 1. Copy Promocional (Texto)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            style={{
              padding: '12px 14px',
              border: 0,
              background: 'none',
              borderBottom: activeTab === 'groups' ? '2px solid #7c3aed' : '2px solid transparent',
              color: activeTab === 'groups' ? '#7c3aed' : '#6b7280',
              fontWeight: activeTab === 'groups' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Users size={15} /> 2. Grupos do Facebook Recomendados
            {groups.length > 0 && (
              <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>
                {groups.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('script');
              if (!script) generateScript();
            }}
            style={{
              padding: '12px 14px',
              border: 0,
              background: 'none',
              borderBottom: activeTab === 'script' ? '2px solid #7c3aed' : '2px solid transparent',
              color: activeTab === 'script' ? '#7c3aed' : '#6b7280',
              fontWeight: activeTab === 'script' ? 700 : 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Video size={15} /> 3. Roteiro de Vídeo (Reels / TikTok)
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
          
          {/* TAB 1: COPY */}
          {activeTab === 'copy' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <b style={{ fontSize: '12px', color: '#374151' }}>Texto Pronto para Grupos e Postagens:</b>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={tone}
                      onChange={e => {
                        const val = e.target.value as any;
                        setTone(val);
                        generateCopy(val);
                      }}
                      style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                      <option value="urgencia">Gatilho de Urgência</option>
                      <option value="descontraido">Descontraído / Achadinho</option>
                      <option value="direto">Direto ao Ponto</option>
                    </select>
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => generateCopy()}
                      disabled={loadingCopy}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <RefreshCw size={12} className={loadingCopy ? 'spin' : ''} /> Recriar
                    </button>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea
                    value={copy}
                    onChange={e => setCopy(e.target.value)}
                    rows={12}
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fafafa',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Gerando texto com inteligência artificial..."
                  />
                  {loadingCopy && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'grid', placeItems: 'center', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>Escrevendo copy vendedora...</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => handleCopyText(copy)}
                    style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                  >
                    {copiedText ? <Check size={16} /> : <Copy size={16} />}
                    {copiedText ? 'Copiado para Área de Transferência!' : 'Copiar Texto Pronto'}
                  </button>

                  <button
                    type="button"
                    className="btn"
                    onClick={() => setActiveTab('groups')}
                    style={{ background: '#1877f2', color: '#fff', padding: '10px 16px', fontSize: '13px' }}
                  >
                    <Users size={16} /> Ver Grupos do Facebook →
                  </button>
                </div>
              </div>

              {/* Preview & Image */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px' }}>
                <b style={{ fontSize: '12px', display: 'block', marginBottom: '10px', color: '#374151' }}>
                  Imagem para Download ou Envio:
                </b>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <img
                    src={offer.imageUrl}
                    alt=""
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '6px' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <a
                      href={offer.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      download="produto-oferta.jpg"
                      className="outline-btn"
                      style={{ fontSize: '11px', padding: '5px 10px' }}
                    >
                      <ExternalLink size={12} /> Abrir Foto em Alta
                    </a>
                  </div>
                </div>

                <div style={{ marginTop: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', fontSize: '11px', color: '#1e40af' }}>
                  💡 <b>Como funciona:</b>
                  <ol style={{ margin: '6px 0 0', paddingLeft: '18px', lineHeight: 1.5 }}>
                    <li>Clique em <b>Copiar Texto Pronto</b>.</li>
                    <li>Vá na aba <b>Grupos do Facebook</b>.</li>
                    <li>Clique no grupo desejado. Ele abrirá direto no seu navegador.</li>
                    <li>Cole o texto (`Ctrl + V`) e adicione a imagem!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FACEBOOK GROUPS */}
          {activeTab === 'groups' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', margin: 0, color: '#111827' }}>
                    Grupos do Facebook para o nicho: <span style={{ color: '#7c3aed' }}>{niche || offer.category}</span>
                  </h3>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: '3px 0 0' }}>
                    Ao clicar em qualquer grupo, o texto da copy é <b>automaticamente copiado</b> e o Facebook abre em uma nova guia direto para postar.
                  </p>
                </div>
                <button
                  type="button"
                  className="outline-btn"
                  onClick={loadGroups}
                  disabled={loadingGroups}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  <RefreshCw size={12} className={loadingGroups ? 'spin' : ''} /> Recarregar Grupos
                </button>
              </div>

              {loadingGroups ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <Sparkles size={24} style={{ color: '#7c3aed', margin: '0 auto 10px', display: 'block' }} className="spin" />
                  Localizando os grupos com maior audiência e engajamento no Facebook...
                </div>
              ) : groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  Nenhum grupo específico encontrado. Tente recarregar.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {groups.map((grp, idx) => {
                    const isVisited = visitedGroupNames.includes(grp.name);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: isVisited ? '#f0fdf4' : '#fff',
                          border: '1px solid',
                          borderColor: isVisited ? '#86efac' : '#e5e7eb',
                          borderRadius: '10px',
                          gap: '14px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: isVisited ? '#dcfce7' : '#1877f2',
                            color: isVisited ? '#16a34a' : '#fff',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0
                          }}>
                            {isVisited ? <Check size={20} /> : <Users size={20} />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <b style={{ fontSize: '13px', color: '#111827' }}>{grp.name}</b>
                              <span style={{ fontSize: '10px', padding: '2px 6px', background: '#f3f4f6', color: '#4b5563', borderRadius: '4px', fontWeight: 600 }}>
                                {grp.estimatedMembers}
                              </span>
                              {isVisited && (
                                <span style={{ fontSize: '10px', padding: '2px 6px', background: '#dcfce7', color: '#15803d', borderRadius: '4px', fontWeight: 700 }}>
                                  ✓ Aberto
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#6b7280' }}>
                              {grp.description}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => handleOpenGroup(grp)}
                          style={{
                            background: '#1877f2',
                            fontSize: '12px',
                            padding: '8px 14px',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <ArrowUpRight size={14} /> Abrir Grupo no Facebook
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direct Facebook Search link */}
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  Quer explorar mais grupos relacionados a <b>"{niche || offer.category}"</b>?
                </span>
                <a
                  href={`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(niche || offer.category)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="outline-btn"
                  style={{ fontSize: '11px', padding: '6px 12px', color: '#1877f2', borderColor: '#bfdbfe' }}
                >
                  <Search size={12} /> Pesquisar Todos no Facebook
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: VIDEO SCRIPT */}
          {activeTab === 'script' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <b style={{ fontSize: '12px', color: '#374151' }}>Roteiro de 30 segundos para Reels / TikTok / Shorts:</b>
                <button
                  type="button"
                  className="outline-btn"
                  onClick={generateScript}
                  disabled={loadingScript}
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  <RefreshCw size={12} className={loadingScript ? 'spin' : ''} /> Gerar Novo Roteiro
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <textarea
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  rows={13}
                  style={{
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fafafa',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Gerando roteiro de vídeo curto..."
                />
                {loadingScript && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'grid', placeItems: 'center', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>Criando roteiro com gancho viral...</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => handleCopyText(script, true)}
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  {copiedScript ? <Check size={16} /> : <Copy size={16} />}
                  {copiedScript ? 'Roteiro Copiado!' : 'Copiar Roteiro de Vídeo'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '0 0 14px 14px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {visitedGroupNames.length > 0 ? (
              <span>✓ Você já abriu <b>{visitedGroupNames.length} grupo(s)</b> para divulgar este produto.</span>
            ) : (
              <span>Copie o texto e clique em um grupo para começar a divulgar.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="outline-btn" onClick={onClose} style={{ fontSize: '12px' }}>
              Fechar
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleMarkPublished}
              disabled={markingPublished}
              style={{ background: '#10b981', color: '#fff', fontSize: '12px', padding: '8px 16px' }}
            >
              <Check size={14} /> {markingPublished ? 'Atualizando...' : 'Marcar Oferta como Publicada'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function Search({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}
