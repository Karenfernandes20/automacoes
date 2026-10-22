import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Filter, PackageSearch, Plus, RefreshCw, Search, Truck } from 'lucide-react';
import { api } from '../lib/api';
import { money } from '../lib/format';

interface Category { id: string; name: string }
interface CatalogItem {
  id: string;
  title: string;
  categoryId: string;
  price: number;
  oldPrice: number;
  discount: number;
  imageUrl: string;
  url: string;
  freeShipping: boolean;
  condition: string;
  availableQuantity: number;
  officialStoreName: string | null;
  installments: { quantity: number; amount: number; rate: number } | null;
}

const PAGE_SIZE = 48;

export function MercadoLivreOffersPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [accessibleTotal, setAccessibleTotal] = useState(0);
  const [sorts, setSorts] = useState<Array<{id:string;name:string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    api.getMercadoLivreCategories().then(setCategories).catch(err => setError(err instanceof Error ? err.message : 'Falha ao carregar categorias.'));
    api.listOffers().then(offers => {
      const savedUrls = new Set<string>();
      offers.forEach(o => {
        if (o.originalUrl) savedUrls.add(o.originalUrl);
        if (o.title) savedUrls.add(o.title.toLowerCase().trim());
      });
      setSavedIds(savedUrls);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      api.searchMercadoLivreCatalog({
        q: query,
        category,
        page,
        limit: PAGE_SIZE,
        sort,
        onlyOffers,
        freeShipping,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined
      }).then(data => {
        if (!active) return;
        setItems(data.items);
        setPages(data.paging.pages);
        setTotal(data.paging.total);
        setAccessibleTotal(data.paging.accessibleTotal);
        setSorts(data.availableSorts || []);
      }).catch(err => {
        if (!active) return;
        setItems([]);
        setError(err instanceof Error ? err.message : 'Falha ao carregar produtos do Mercado Livre.');
      }).finally(() => active && setLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [category, query, sort, onlyOffers, freeShipping, minPrice, maxPrice, page]);

  const selectedCategory = useMemo(() => categories.find(c => c.id === category)?.name || 'Todas as ofertas', [categories, category]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function changeCategory(id: string) {
    setCategory(id);
    setPage(1);
  }

  async function saveOffer(item: CatalogItem) {
    const isAlreadySaved = savedIds.has(item.url) || savedIds.has(item.title.toLowerCase().trim());
    if (isAlreadySaved) return;

    try {
      setSavingId(item.id);
      let affiliateUrl = item.url;
      try {
        const linkRes = await api.generateMercadoLivreLink(item.url, 'central-ofertas');
        if (linkRes.affiliateUrl) affiliateUrl = linkRes.affiliateUrl;
      } catch {
        const urlObj = new URL(item.url);
        urlObj.searchParams.set('matt_tool', 'central-ofertas');
        urlObj.searchParams.set('tracking_id', 'central-ofertas');
        affiliateUrl = urlObj.toString();
      }

      await api.createOffer({
        title: item.title,
        marketplace: 'Mercado Livre',
        category: selectedCategory,
        imageUrl: item.imageUrl,
        currentPrice: item.price,
        previousPrice: item.oldPrice > item.price ? item.oldPrice : null,
        coupon: null,
        originalUrl: item.url,
        affiliateUrl,
        verifiedAt: new Date().toISOString(),
        availability: 'AVAILABLE',
        status: 'DRAFT',
        publishAt: null
      });

      setSavedIds(prev => {
        const next = new Set(prev);
        next.add(item.url);
        next.add(item.title.toLowerCase().trim());
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível salvar a oferta.');
    } finally {
      setSavingId(null);
    }
  }

  function getCommission(itemPrice: number, catName: string) {
    const c = catName.toLowerCase();
    const percent = c.includes('casa') || c.includes('móveis') || c.includes('cozinha') ? 11 :
                    c.includes('bebê') || c.includes('bebes') ? 12 :
                    c.includes('beleza') || c.includes('cuidado') ? 13 :
                    c.includes('esporte') || c.includes('saúde') ? 12 :
                    c.includes('calçado') || c.includes('roupa') || c.includes('moda') ? 14 :
                    c.includes('celular') || c.includes('telefone') ? 7 :
                    c.includes('informát') || c.includes('computador') ? 8 :
                    c.includes('eletr') || c.includes('áudio') ? 8 :
                    c.includes('game') || c.includes('videogame') ? 8 :
                    c.includes('ferramenta') || c.includes('constru') ? 10 :
                    c.includes('brinquedo') ? 11 :
                    c.includes('automot') || c.includes('veículo') ? 10 : 9;
    const value = itemPrice * (percent / 100);
    return { percent, value };
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      <section className="panel" style={{padding:'1rem 1.25rem',borderRadius:'12px',background:'linear-gradient(135deg,#ffe600,#fff176)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
          <div>
            <span style={{fontSize:'11px',fontWeight:800,color:'#594f00',letterSpacing:'0.5px'}}>CATÁLOGO REAL • MERCADO LIVRE</span>
            <h1 style={{margin:'2px 0',fontSize:'20px',fontWeight:800}}>Ofertas e produtos por categoria</h1>
            <p style={{margin:0,color:'#554f25',fontSize:'12px'}}>Pesquise o catálogo oficial e salve produtos com comissão estimada calculada.</p>
          </div>
          <div style={{background:'rgba(255,255,255,.85)',padding:'8px 12px',borderRadius:'8px',minWidth:'140px',textAlign:'right'}}>
            <b style={{display:'block',fontSize:'16px',lineHeight:1.1}}>{total.toLocaleString('pt-BR')}</b>
            <small style={{fontSize:'11px',color:'#555'}}>resultados encontrados</small>
          </div>
        </div>
        <form onSubmit={submitSearch} style={{display:'flex',marginTop:'12px',maxWidth:'720px'}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={16} style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#777'}}/>
            <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Buscar produtos, marcas e modelos..." style={{width:'100%',padding:'9px 12px 9px 36px',border:'none',borderRadius:'7px 0 0 7px',fontSize:'13px'}}/>
          </div>
          <button className="btn primary" style={{borderRadius:'0 7px 7px 0',background:'#3483fa',padding:'0 18px',fontSize:'13px'}}>Buscar</button>
        </form>
      </section>

      {error && (
        <div className="notice" style={{borderColor:'#fca5a5',background:'#fef2f2',color:'#991b1b',padding:'10px 14px',fontSize:'12px'}}>
          <PackageSearch size={18}/><div><b>Catálogo indisponível</b><p style={{margin:'2px 0'}}>{error}</p><a href="/admin/integracoes" style={{fontWeight:600}}>Reconectar Mercado Livre</a></div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'190px minmax(0,1fr)',gap:'1rem',alignItems:'start'}}>
        <aside className="panel" style={{padding:'0.75rem',borderRadius:'10px',position:'sticky',top:'12px',maxHeight:'calc(100vh - 24px)',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px',fontSize:'12px'}}><Filter size={14}/><b>Filtros</b></div>
          <button onClick={()=>changeCategory('')} style={categoryButton(!category)}>Todas as categorias</button>
          {categories.map(c=><button key={c.id} onClick={()=>changeCategory(c.id)} style={categoryButton(category===c.id)}>{c.name}</button>)}
          <hr style={{border:0,borderTop:'1px solid #eee',margin:'10px 0'}}/>
          <label style={checkStyle}><input type="checkbox" checked={onlyOffers} onChange={e=>{setOnlyOffers(e.target.checked);setPage(1);}}/> Com desconto</label>
          <label style={checkStyle}><input type="checkbox" checked={freeShipping} onChange={e=>{setFreeShipping(e.target.checked);setPage(1);}}/> Frete grátis</label>
          <b style={{fontSize:'11px',display:'block',margin:'10px 0 4px'}}>Faixa de preço</b>
          <div style={{display:'flex',gap:'4px'}}>
            <input type="number" min="0" placeholder="Mín." value={minPrice} onChange={e=>setMinPrice(e.target.value)} style={priceInput}/>
            <input type="number" min="0" placeholder="Máx." value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} style={priceInput}/>
          </div>
        </aside>

        <main style={{minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',marginBottom:'10px',flexWrap:'wrap'}}>
            <div>
              <h2 style={{margin:0,fontSize:'16px',fontWeight:700}}>{selectedCategory}</h2>
              <small style={{color:'#6b7280',fontSize:'11px'}}>Mostrando até {accessibleTotal.toLocaleString('pt-BR')} resultados navegáveis nesta busca</small>
            </div>
            <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} style={{padding:'6px 10px',border:'1px solid #d1d5db',borderRadius:'7px',fontSize:'12px'}}>
              <option value="">Mais relevantes</option>
              {sorts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              {!sorts.some(s=>s.id==='price_asc')&&<option value="price_asc">Menor preço</option>}
              {!sorts.some(s=>s.id==='price_desc')&&<option value="price_desc">Maior preço</option>}
            </select>
          </div>

          {loading ? (
            <div className="panel" style={{padding:'40px',textAlign:'center'}}><RefreshCw size={24} style={{animation:'spin 1s linear infinite'}}/><p style={{fontSize:'12px',marginTop:'8px'}}>Carregando produtos reais...</p></div>
          ) : !error && items.length===0 ? (
            <div className="panel" style={{padding:'40px',textAlign:'center'}}><PackageSearch size={30}/><h3 style={{fontSize:'14px',margin:'6px 0'}}>Nenhum produto encontrado</h3><p style={{fontSize:'12px',color:'#777'}}>Remova algum filtro ou tente outra pesquisa.</p></div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:'10px'}}>
              {items.map(item => {
                const comm = getCommission(item.price, selectedCategory);
                return (
                  <article key={item.id} className="panel" style={{borderRadius:'10px',overflow:'hidden',display:'flex',flexDirection:'column',transition:'box-shadow 0.15s ease',background:'#fff'}}>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{height:'160px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'8px',position:'relative'}}>
                      <img src={item.imageUrl} alt={item.title} loading="lazy" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
                      {item.discount > 0 && (
                        <span style={{position:'absolute',top:8,right:8,background:'#00a650',color:'#fff',fontWeight:800,padding:'2px 6px',borderRadius:'4px',fontSize:'10px'}}>
                          {item.discount}% OFF
                        </span>
                      )}
                    </a>

                    <div style={{padding:'10px',display:'flex',flexDirection:'column',flex:1}}>
                      <small style={{color:'#6b7280',fontSize:'10px'}}>
                        {item.officialStoreName || (item.condition==='new' ? 'Novo' : 'Produto')}
                      </small>

                      <h3 style={{fontSize:'12px',lineHeight:1.35,fontWeight:500,minHeight:'48px',margin:'4px 0 6px',color:'#1f2937',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                        {item.title}
                      </h3>

                      {/* Bloco de Preços */}
                      <div style={{marginBottom:'6px'}}>
                        {item.oldPrice > item.price && (
                          <span style={{fontSize:'10px',textDecoration:'line-through',color:'#9ca3af',display:'block',lineHeight:1}}>
                            {money.format(item.oldPrice)}
                          </span>
                        )}
                        <strong style={{fontSize:'17px',color:'#111827',fontWeight:800}}>
                          {money.format(item.price)}
                        </strong>
                        {item.freeShipping && (
                          <span style={{display:'flex',alignItems:'center',gap:'3px',color:'#00a650',fontSize:'10px',fontWeight:700,marginTop:'2px'}}>
                            <Truck size={11}/> Frete grátis
                          </span>
                        )}
                      </div>

                      {/* Tag de Comissão Destacada */}
                      <div style={{
                        marginTop:'auto',
                        padding:'6px 8px',
                        background:'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
                        border:'1px solid #a7f3d0',
                        borderRadius:'6px',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'space-between',
                        gap:'4px',
                        marginBottom:'8px'
                      }}>
                        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                          <span style={{background:'#059669',color:'#fff',fontSize:'9px',fontWeight:800,padding:'1px 5px',borderRadius:'3px'}}>
                            {comm.percent}%
                          </span>
                          <span style={{fontSize:'10px',color:'#047857',fontWeight:600}}>Comissão</span>
                        </div>
                        <b style={{fontSize:'12px',color:'#065f46',fontWeight:800}}>
                          +{money.format(comm.value)}
                        </b>
                      </div>

                      {/* Ações */}
                      <div style={{display:'flex',gap:'5px',paddingTop:'2px'}}>
                        {(() => {
                          const isSaved = savedIds.has(item.url) || savedIds.has(item.title.toLowerCase().trim());
                          const isSaving = savingId === item.id;
                          return (
                            <button
                              className="btn primary"
                              disabled={isSaved || isSaving}
                              onClick={()=>saveOffer(item)}
                              style={{
                                flex:1,
                                justifyContent:'center',
                                fontSize:'11px',
                                padding:'6px 8px',
                                background: isSaved ? '#10b981' : '#3483fa',
                                borderColor: isSaved ? '#10b981' : '#3483fa',
                                opacity: isSaved ? 0.9 : 1,
                                cursor: isSaved ? 'default' : 'pointer'
                              }}
                            >
                              {isSaving ? (
                                <RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/>
                              ) : isSaved ? (
                                <Check size={13}/>
                              ) : (
                                <Plus size={13}/>
                              )}
                              {isSaving ? 'Salvando...' : isSaved ? 'Salva' : 'Salvar oferta'}
                            </button>
                          );
                        })()}
                        <a
                          className="outline-btn"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          title="Abrir no Mercado Livre"
                          style={{padding:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}
                        >
                          <ExternalLink size={13}/>
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && !error && pages > 1 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginTop:'18px'}}>
              <button className="outline-btn" disabled={page<=1} onClick={()=>{setPage(p=>p-1);window.scrollTo({top:0,behavior:'smooth'});}} style={{padding:'6px 10px',fontSize:'12px'}}><ChevronLeft size={14}/> Anterior</button>
              <span style={{fontSize:'12px'}}>Página <b>{page}</b> de <b>{pages}</b></span>
              <button className="outline-btn" disabled={page>=pages} onClick={()=>{setPage(p=>p+1);window.scrollTo({top:0,behavior:'smooth'});}} style={{padding:'6px 10px',fontSize:'12px'}}>Próxima <ChevronRight size={14}/></button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const checkStyle = {display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',margin:'6px 0',cursor:'pointer'} as const;
const priceInput = {width:'50%',minWidth:0,padding:'5px 6px',border:'1px solid #d1d5db',borderRadius:'5px',fontSize:'11px'} as const;
function categoryButton(active:boolean) {
  return {width:'100%',textAlign:'left' as const,border:0,background:active?'#eaf2ff':'transparent',color:active?'#1d4ed8':'#374151',padding:'6px 8px',borderRadius:'6px',cursor:'pointer',fontSize:'11px',fontWeight:active?700:400};
}
