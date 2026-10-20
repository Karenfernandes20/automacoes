import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Flame, TrendingUp, Sparkles, Plus, Star, ShoppingCart, RefreshCw, Check, ArrowUpRight, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import { money } from '../lib/format';

interface MLOfferItem {
  keyword: string;
  category: string;
  badge: string;
  discount: number;
  price: number;
  oldPrice: number;
  sales: string;
  rating: number;
  reviews: number;
  imageUrl: string;
  url: string;
}

interface MLTrend {
  keyword: string;
  url: string;
}

const CATEGORIES = ['Todas', 'Casa', 'Casa & Cozinha', 'Celulares', 'Eletrônicos', 'Informática', 'Saúde & Esportes', 'Games'];

export function MercadoLivreOffersPage() {
  const [items, setItems] = useState<MLOfferItem[]>([]);
  const [trends, setTrends] = useState<MLTrend[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [importedUrls, setImportedUrls] = useState<Set<string>>(new Set());
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  const loadOffers = async (cat?: string) => {
    setLoading(true);
    try {
      const res = await api.getMercadoLivreTopOffers(cat);
      setItems(res.items);
      setTrends(res.trends);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers(selectedCategory);
  }, [selectedCategory]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const term = searchQuery.toLowerCase().trim();
    return items.filter(it => 
      it.keyword.toLowerCase().includes(term) || 
      it.category.toLowerCase().includes(term) ||
      it.badge.toLowerCase().includes(term)
    );
  }, [items, searchQuery]);

  const handleCopyLink = async (url: string, index: number) => {
    try {
      const res = await api.generateMercadoLivreLink(url, 'top-ml');
      const link = res.affiliateUrl || url;
      await navigator.clipboard.writeText(link);
      setCopiedIndex(index);
      setAddedMessage('Link de afiliado copiado para a área de transferência!');
      setTimeout(() => setCopiedIndex(null), 2500);
      setTimeout(() => setAddedMessage(null), 4000);
    } catch {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    }
  };

  const handleImportToCentral = async (item: MLOfferItem, index: number) => {
    setCreatingIndex(index);
    try {
      let affiliateUrl = item.url;
      try {
        const linkRes = await api.generateMercadoLivreLink(item.url, 'ofertas-central');
        if (linkRes.affiliateUrl) affiliateUrl = linkRes.affiliateUrl;
      } catch {}

      await api.createOffer({
        title: item.keyword,
        marketplace: 'Mercado Livre',
        category: item.category,
        imageUrl: item.imageUrl,
        currentPrice: item.price,
        previousPrice: item.oldPrice,
        coupon: item.discount > 30 ? 'TOP-ML' : null,
        originalUrl: item.url,
        affiliateUrl,
        status: 'APPROVED',
        availability: 'AVAILABLE',
        verifiedAt: new Date().toISOString()
      });
      setImportedUrls(prev => new Set(prev).add(item.url));
      setAddedMessage(`"${item.keyword}" foi adicionado com seu link de afiliado gerado!`);
      setTimeout(() => setAddedMessage(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao importar oferta');
    } finally {
      setCreatingIndex(null);
    }
  };

  return (
    <div className="ml-offers-container">
      {addedMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#10b981',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <Check size={18}/>
          <span>{addedMessage}</span>
        </div>
      )}

      <div className="admin-title">
        <div>
          <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <Flame size={15} style={{color:'#f59e0b'}}/>
            MERCADO LIVRE • MAIS VENDIDOS E TENDÊNCIAS
          </span>
          <h1>Maiores Ofertas do Mercado Livre <em>⚡</em></h1>
          <p>Produtos com recorde de vendas, maiores descontos e tendências em tempo real da sua conta conectada.</p>
        </div>
        <button className="btn primary" onClick={() => loadOffers(selectedCategory)} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
          Atualizar catálogo
        </button>
      </div>

      {addedMessage && (
        <div className="notice" style={{borderColor:'#10b981',background:'rgba(16,185,129,0.08)',marginBottom:'1.5rem'}}>
          <Check style={{color:'#10b981'}}/>
          <div>
            <b style={{color:'#10b981'}}>Sucesso!</b>
            <p>{addedMessage}</p>
          </div>
        </div>
      )}

      {/* Tendências ao vivo do ML */}
      {trends.length > 0 && (
        <div className="panel" style={{marginBottom:'1.5rem',padding:'1rem 1.25rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'0.75rem'}}>
            <TrendingUp size={16} style={{color:'#3483fa'}}/>
            <b style={{fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Termos em Alta no Mercado Livre Agora:</b>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
            {trends.slice(0, 12).map((t, i) => (
              <a 
                key={i} 
                href={t.url} 
                target="_blank" 
                rel="noreferrer" 
                className="ml-trend-chip"
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:'5px',
                  background:'rgba(52, 131, 250, 0.08)',
                  color:'#1d4ed8',
                  padding:'4px 10px',
                  borderRadius:'999px',
                  fontSize:'12px',
                  fontWeight:500,
                  textDecoration:'none'
                }}
              >
                #{t.keyword}
                <ArrowUpRight size={12}/>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Busca e Filtro por Categoria */}
      <div style={{display:'flex',flexDirection:'column',gap:'1rem',marginBottom:'1.5rem'}}>
        <div style={{position:'relative',width:'100%',maxWidth:'600px'}}>
          <Search size={18} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#9ca3af'}}/>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar produto, marca ou modelo (ex: iPhone, Robô, PS5, Creatina...)"
            style={{
              width:'100%',
              padding:'11px 40px 11px 42px',
              borderRadius:'10px',
              border:'1px solid #d1d5db',
              fontSize:'14px',
              background:'#fff',
              boxShadow:'0 1px 3px rgba(0,0,0,0.05)',
              outline:'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position:'absolute',
                right:'12px',
                top:'50%',
                transform:'translateY(-50%)',
                background:'none',
                border:'none',
                cursor:'pointer',
                color:'#9ca3af',
                display:'flex',
                alignItems:'center'
              }}
              title="Limpar busca"
            >
              <X size={16}/>
            </button>
          )}
        </div>

        {/* Filtro por categoria */}
        <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px'}}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`btn ${selectedCategory === cat ? 'primary' : 'outline-btn'}`}
              style={{padding:'6px 14px',fontSize:'13px',whiteSpace:'nowrap'}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Ofertas */}
      {loading ? (
        <div style={{textAlign:'center',padding:'4rem 0',color:'#6b7280'}}>
          <RefreshCw size={32} style={{animation:'spin 1s linear infinite',margin:'0 auto 1rem'}}/>
          <p>Carregando as maiores ofertas e mais vendidos...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="panel" style={{textAlign:'center',padding:'3.5rem 1rem',color:'#6b7280',borderRadius:'12px'}}>
          <Search size={36} style={{margin:'0 auto 0.75rem',color:'#9ca3af'}}/>
          <b style={{fontSize:'16px',color:'#374151',display:'block'}}>Nenhum produto encontrado para "{searchQuery}"</b>
          <p style={{fontSize:'13px',marginTop:'6px'}}>Tente buscar por outro termo ou selecione a categoria "Todas".</p>
          <button className="outline-btn" style={{marginTop:'1rem'}} onClick={() => { setSearchQuery(''); setSelectedCategory('Todas'); }}>
            Limpar filtros
          </button>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:'1.25rem'}}>
          {filteredItems.map((item, idx) => (
            <article key={idx} className="panel ml-product-card" style={{display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:'12px',transition:'transform 0.2s, box-shadow 0.2s'}}>
              <div style={{position:'relative',height:'200px',background:'#ffffff',display:'flex',alignItems:'center',justifyContent:'center',padding:'10px',borderBottom:'1px solid #f3f4f6',overflow:'hidden'}}>
                <img 
                  src={item.imageUrl} 
                  alt={item.keyword}
                  style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',transition:'transform 0.25s ease'}}
                  loading="lazy"
                  onError={(e)=>{
                    // Fallback se a imagem quebrar
                    const target = e.currentTarget;
                    if (!target.src.includes('airfryer')) {
                      target.src = '/products/airfryer.jpg';
                    }
                  }}
                />
                <span 
                  style={{
                    position:'absolute',
                    top:'10px',
                    left:'10px',
                    background:'#ffe600',
                    color:'#111',
                    fontWeight:700,
                    fontSize:'11px',
                    padding:'3px 8px',
                    borderRadius:'6px',
                    boxShadow:'0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {item.badge}
                </span>

                <span 
                  style={{
                    position:'absolute',
                    top:'10px',
                    right:'10px',
                    background:'#ef4444',
                    color:'#fff',
                    fontWeight:700,
                    fontSize:'11px',
                    padding:'3px 8px',
                    borderRadius:'6px'
                  }}
                >
                  -{item.discount}%
                </span>
              </div>

              <div style={{padding:'1.1rem',flex:1,display:'flex',flexDirection:'column'}}>
                <div style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',color:'#6b7280',marginBottom:'4px'}}>
                  <span>{item.category}</span>
                  <span>•</span>
                  <span style={{color:'#10b981',fontWeight:600}}>{item.sales}</span>
                </div>

                <h3 style={{fontSize:'15px',fontWeight:600,lineHeight:'1.35',marginBottom:'0.75rem',minHeight:'40px'}}>
                  {item.keyword}
                </h3>

                <div style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px',color:'#f59e0b',marginBottom:'0.75rem'}}>
                  <Star size={13} fill="currentColor"/>
                  <b>{item.rating}</b>
                  <small style={{color:'#9ca3af'}}>({item.reviews.toLocaleString('pt-BR')} avaliações)</small>
                </div>

                <div style={{marginTop:'auto',paddingTop:'0.5rem',borderTop:'1px solid #f3f4f6'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:'0.75rem'}}>
                    <div>
                      <span style={{fontSize:'11px',color:'#6b7280',display:'block',marginBottom:'2px'}}>Valor do produto:</span>
                      <div style={{display:'flex',alignItems:'baseline',gap:'6px'}}>
                        <span style={{fontSize:'20px',fontWeight:700,color:'#111827'}}>
                          {money.format(item.price)}
                        </span>
                        {item.oldPrice && (
                          <span style={{fontSize:'12px',color:'#9ca3af',textDecoration:'line-through'}}>
                            {money.format(item.oldPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Comissão e Ganho Estimado */}
                    {(() => {
                      const commPercent = item.category.toLowerCase().includes('casa') ? 11 :
                                          item.category.toLowerCase().includes('celular') ? 7 :
                                          item.category.toLowerCase().includes('eletr') ? 8 :
                                          item.category.toLowerCase().includes('inform') ? 8 :
                                          item.category.toLowerCase().includes('esport') ? 12 :
                                          item.category.toLowerCase().includes('game') ? 8 : 9;
                      const commissionEarned = item.price * (commPercent / 100);
                      return (
                        <div style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          textAlign: 'right'
                        }}>
                          <div style={{fontSize:'10px',color:'#065f46',fontWeight:700,display:'flex',alignItems:'center',gap:'3px',justifyContent:'flex-end'}}>
                            <span>Comissão {commPercent}%</span>
                          </div>
                          <div style={{fontSize:'13px',fontWeight:800,color:'#047857'}}>
                            + {money.format(commissionEarned)}
                          </div>
                          <small style={{fontSize:'9px',color:'#059669',display:'block'}}>por venda</small>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    <button
                      className="btn primary"
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '9px 12px',
                        justifyContent: 'center',
                        background: copiedIndex === idx ? '#10b981' : '#3483fa',
                        borderColor: copiedIndex === idx ? '#10b981' : '#3483fa',
                        boxShadow: '0 2px 4px rgba(52, 131, 250, 0.2)'
                      }}
                      onClick={() => handleCopyLink(item.url, idx)}
                      title="Gera e copia automaticamente o seu link de afiliado oficial deste produto"
                    >
                      {copiedIndex === idx ? <Check size={16}/> : <Sparkles size={16}/>}
                      {copiedIndex === idx ? 'Link de Afiliado Copiado!' : 'Copiar Link de Afiliado'}
                    </button>

                    <div style={{display:'flex',gap:'8px'}}>
                      <button
                        className="outline-btn"
                        style={{
                          flex: 1,
                          fontSize: '12px',
                          padding: '7px 10px',
                          justifyContent: 'center',
                          color: importedUrls.has(item.url) ? '#10b981' : undefined,
                          borderColor: importedUrls.has(item.url) ? '#10b981' : undefined
                        }}
                        disabled={creatingIndex === idx}
                        onClick={() => handleImportToCentral(item, idx)}
                        title="Salva na sua lista de ofertas para automações e disparos"
                      >
                        {creatingIndex === idx ? (
                          <RefreshCw size={14} className="animate-spin"/>
                        ) : importedUrls.has(item.url) ? (
                          <Check size={14}/>
                        ) : (
                          <Plus size={14}/>
                        )}
                        {creatingIndex === idx
                          ? 'Salvando...'
                          : importedUrls.has(item.url)
                          ? 'Adicionada!'
                          : 'Salvar nas Ofertas'}
                      </button>

                      <a
                        href={item.url.includes('matt_tool') ? item.url : `${item.url}?matt_tool=28711832&matt_word=top-ml&tracking_id=top-ml`}
                        target="_blank"
                        rel="noreferrer"
                        className="outline-btn"
                        style={{padding:'7px 12px',display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',color:'#6b7280'}}
                        title="Abrir página oficial do produto no Mercado Livre com seu link de afiliado"
                      >
                        <ExternalLink size={15}/>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
