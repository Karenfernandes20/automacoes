import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ExternalLink, Filter, PackageSearch, Plus, RefreshCw, Search, Truck, Flame } from 'lucide-react';
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
  marketplace?: 'Mercado Livre' | 'Shopee';
  commissionRate?: number;
  commissionValue?: number;
  imageUrls?: string[];
}

const PAGE_SIZE = 48;

export function TopProductsPage() {
  const [platformTab, setPlatformTab] = useState<'ALL' | 'MERCADOLIVRE' | 'SHOPEE'>('ALL');

  // ML state
  const [categories, setCategories] = useState<Category[]>([]);
  const [mlItems, setMlItems] = useState<CatalogItem[]>([]);
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
  const [loadingMl, setLoadingMl] = useState(true);
  const [mlError, setMlError] = useState('');

  // Shopee state
  const [shopeeItems, setShopeeItems] = useState<CatalogItem[]>([]);
  const [loadingShopee, setLoadingShopee] = useState(false);
  const [shopeeError, setShopeeError] = useState('');
  const [shopeeTotal, setShopeeTotal] = useState(0);

  // Common saved offers state
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load existing saved offers & categories
  useEffect(() => {
    api.getMercadoLivreCategories().then(setCategories).catch(err => setMlError(err instanceof Error ? err.message : 'Falha ao carregar categorias.'));
    api.listOffers().then(offers => {
      const savedUrls = new Set<string>();
      offers.forEach(o => {
        if (o.originalUrl) savedUrls.add(o.originalUrl);
        if (o.title) savedUrls.add(o.title.toLowerCase().trim());
      });
      setSavedIds(savedUrls);
    }).catch(() => {});
  }, []);

  // Fetch Mercado Livre catalog
  useEffect(() => {
    let active = true;
    setLoadingMl(true);
    setMlError('');
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
      const formatted: CatalogItem[] = data.items.map(item => ({
        ...item,
        marketplace: 'Mercado Livre'
      }));
      setMlItems(formatted);
      setPages(data.paging.pages);
      setTotal(data.paging.total);
      setAccessibleTotal(data.paging.accessibleTotal);
      setSorts(data.availableSorts || []);
    }).catch(err => {
      if (!active) return;
      setMlItems([]);
      setMlError(err instanceof Error ? err.message : 'Falha ao carregar produtos do Mercado Livre.');
    }).finally(() => active && setLoadingMl(false));

    return () => { active = false; };
  }, [category, query, sort, onlyOffers, freeShipping, minPrice, maxPrice, page]);

  // Fetch Shopee top offers
  const fetchShopee = (kw?: string) => {
    setLoadingShopee(true);
    setShopeeError('');
    api.getShopeeTopOffers(1, 48, kw || query || undefined).then(data => {
      const items: CatalogItem[] = (data.items || []).map(p => ({
        id: `shopee-${p.itemId}`,
        title: p.title,
        categoryId: 'shopee',
        price: p.price,
        oldPrice: p.price * 1.25,
        discount: 20,
        imageUrl: p.imageUrl,
        url: p.offerLink,
        freeShipping: true,
        condition: 'new',
        availableQuantity: 999,
        officialStoreName: 'Shopee Oficial',
        installments: null,
        marketplace: 'Shopee',
        commissionRate: p.commissionRate,
        commissionValue: p.commission
      }));
      setShopeeItems(items);
      setShopeeTotal(data.total || items.length);
    }).catch(err => {
      setShopeeError(err instanceof Error ? err.message : 'Shopee não configurada ou erro na API.');
      setShopeeItems([]);
    }).finally(() => setLoadingShopee(false));
  };

  useEffect(() => {
    fetchShopee();
  }, [query]);

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
      const mkt = item.marketplace || 'Mercado Livre';

      if (mkt === 'Mercado Livre') {
        try {
          const linkRes = await api.generateMercadoLivreLink(item.url, 'central-ofertas');
          if (linkRes.affiliateUrl) affiliateUrl = linkRes.affiliateUrl;
        } catch {
          const urlObj = new URL(item.url);
          urlObj.searchParams.set('matt_tool', 'central-ofertas');
          urlObj.searchParams.set('tracking_id', 'central-ofertas');
          affiliateUrl = urlObj.toString();
        }
      } else if (mkt === 'Shopee') {
        // Shopee offerLink is already the tracked affiliate link
        affiliateUrl = item.url;
      }

      await api.createOffer({
        title: item.title,
        marketplace: mkt,
        category: selectedCategory,
        imageUrl: item.imageUrl,
        imageUrls: item.imageUrls,
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

  function getCommission(item: CatalogItem, catName: string) {
    if (item.marketplace === 'Shopee') {
      const percent = item.commissionRate || 10;
      const value = item.commissionValue || (item.price * (percent / 100));
      return { percent, value };
    }

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
    const value = item.price * (percent / 100);
    return { percent, value };
  }

  // Combined and filtered items according to tab
  const displayedItems = useMemo(() => {
    if (platformTab === 'MERCADOLIVRE') return mlItems;
    if (platformTab === 'SHOPEE') return shopeeItems;

    // Mixed/Interleaved view (ALL)
    const combined: CatalogItem[] = [];
    const maxLen = Math.max(mlItems.length, shopeeItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < mlItems.length) combined.push(mlItems[i]);
      if (i < shopeeItems.length) combined.push(shopeeItems[i]);
    }
    return combined;
  }, [platformTab, mlItems, shopeeItems]);

  const isLoading = platformTab === 'MERCADOLIVRE' ? loadingMl : platformTab === 'SHOPEE' ? loadingShopee : (loadingMl && loadingShopee);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
      
      {/* Banner Superior Top Produtos */}
      <section className="panel" style={{padding:'1.1rem 1.3rem',borderRadius:'12px',background:'linear-gradient(135deg, #18151f 0%, #2f1d4f 50%, #3b1836 100%)',color:'#fff'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'10px',fontWeight:800,color:'#facc15',letterSpacing:'0.8px',textTransform:'uppercase',background:'rgba(250,204,21,0.15)',padding:'3px 8px',borderRadius:'4px'}}>
                🔥 MULTI-PLATAFORMA • CATÁLOGOS OFICIAIS
              </span>
            </div>
            <h1 style={{margin:'6px 0 2px',fontSize:'22px',fontWeight:800,color:'#fff',display:'flex',alignItems:'center',gap:'8px'}}>
              Top Produtos <span style={{fontSize:'14px',fontWeight:500,color:'#cbd5e1'}}>(Mercado Livre & Shopee)</span>
            </h1>
            <p style={{margin:0,color:'#e2e8f0',fontSize:'12px'}}>
              Explore os produtos com maior taxa de conversão e comissões calculadas prontas para salvar e divulgar.
            </p>
          </div>

          {/* Seletor de Plataforma em Destaque */}
          <div style={{display:'flex',background:'rgba(255,255,255,0.12)',padding:'4px',borderRadius:'8px',gap:'4px'}}>
            <button
              type="button"
              onClick={() => setPlatformTab('ALL')}
              style={{
                border: 0,
                background: platformTab === 'ALL' ? '#fff' : 'transparent',
                color: platformTab === 'ALL' ? '#18151f' : '#fff',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Todos ({mlItems.length + shopeeItems.length})
            </button>

            <button
              type="button"
              onClick={() => setPlatformTab('MERCADOLIVRE')}
              style={{
                border: 0,
                background: platformTab === 'MERCADOLIVRE' ? '#ffe600' : 'transparent',
                color: platformTab === 'MERCADOLIVRE' ? '#222' : '#fff',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ffe600',border:'1px solid #333'}}/>
              Mercado Livre ({mlItems.length})
            </button>

            <button
              type="button"
              onClick={() => setPlatformTab('SHOPEE')}
              style={{
                border: 0,
                background: platformTab === 'SHOPEE' ? '#ee4d2d' : 'transparent',
                color: platformTab === 'SHOPEE' ? '#fff' : '#fff',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#ee4d2d'}}/>
              Shopee ({shopeeItems.length})
            </button>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <form onSubmit={submitSearch} style={{display:'flex',marginTop:'14px',maxWidth:'720px'}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={16} style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'#777'}}/>
            <input 
              value={searchInput} 
              onChange={e=>setSearchInput(e.target.value)} 
              placeholder="Buscar em Mercado Livre e Shopee (ex: fralda pampers, fone bluetooth, smartwatch)..." 
              style={{width:'100%',padding:'9px 12px 9px 36px',border:'none',borderRadius:'7px 0 0 7px',fontSize:'13px'}}
            />
          </div>
          <button className="btn primary" style={{borderRadius:'0 7px 7px 0',background:'#7c3aed',padding:'0 18px',fontSize:'13px'}}>
            Buscar
          </button>
        </form>
      </section>

      {/* Grid Principal */}
      <div style={{display:'grid',gridTemplateColumns:'190px minmax(0,1fr)',gap:'1rem',alignItems:'start'}}>
        
        {/* Sidebar com filtros */}
        <aside className="panel" style={{padding:'0.75rem',borderRadius:'10px',position:'sticky',top:'12px',maxHeight:'calc(100vh - 24px)',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px',fontSize:'12px'}}>
            <Filter size={14}/><b>Plataforma & Filtros</b>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'4px',marginBottom:'10px'}}>
            <button onClick={() => setPlatformTab('ALL')} style={categoryButton(platformTab === 'ALL')}>
              🔥 Todas as Plataformas
            </button>
            <button onClick={() => setPlatformTab('MERCADOLIVRE')} style={categoryButton(platformTab === 'MERCADOLIVRE')}>
              🟡 Mercado Livre
            </button>
            <button onClick={() => setPlatformTab('SHOPEE')} style={categoryButton(platformTab === 'SHOPEE')}>
              🟠 Shopee Oficial
            </button>
          </div>

          <hr style={{border:0,borderTop:'1px solid #eee',margin:'8px 0'}}/>

          <div style={{fontSize:'11px',fontWeight:700,color:'#6b7280',marginBottom:'6px',textTransform:'uppercase'}}>
            Categorias Mercado Livre
          </div>
          <button onClick={()=>changeCategory('')} style={categoryButton(!category)}>Todas as categorias</button>
          {categories.slice(0, 15).map(c=><button key={c.id} onClick={()=>changeCategory(c.id)} style={categoryButton(category===c.id)}>{c.name}</button>)}

          <hr style={{border:0,borderTop:'1px solid #eee',margin:'10px 0'}}/>
          <label style={checkStyle}><input type="checkbox" checked={onlyOffers} onChange={e=>{setOnlyOffers(e.target.checked);setPage(1);}}/> Com desconto</label>
          <label style={checkStyle}><input type="checkbox" checked={freeShipping} onChange={e=>{setFreeShipping(e.target.checked);setPage(1);}}/> Frete grátis</label>
          
          <b style={{fontSize:'11px',display:'block',margin:'10px 0 4px'}}>Faixa de preço</b>
          <div style={{display:'flex',gap:'4px'}}>
            <input type="number" min="0" placeholder="Mín." value={minPrice} onChange={e=>setMinPrice(e.target.value)} style={priceInput}/>
            <input type="number" min="0" placeholder="Máx." value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} style={priceInput}/>
          </div>
        </aside>

        {/* Área de Produtos */}
        <main style={{minWidth:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',marginBottom:'10px',flexWrap:'wrap'}}>
            <div>
              <h2 style={{margin:0,fontSize:'16px',fontWeight:700}}>
                {platformTab === 'ALL' ? 'Todos os Produtos em Alta' : platformTab === 'MERCADOLIVRE' ? 'Catálogo Mercado Livre' : 'Melhores Ofertas Shopee'}
              </h2>
              <small style={{color:'#6b7280',fontSize:'11px'}}>
                Exibindo {displayedItems.length} ofertas prontas com comissão calculada
              </small>
            </div>

            {platformTab === 'MERCADOLIVRE' && (
              <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} style={{padding:'6px 10px',border:'1px solid #d1d5db',borderRadius:'7px',fontSize:'12px'}}>
                <option value="">Mais relevantes</option>
                {sorts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="panel" style={{padding:'40px',textAlign:'center'}}>
              <RefreshCw size={24} style={{animation:'spin 1s linear infinite'}}/>
              <p style={{fontSize:'12px',marginTop:'8px'}}>Carregando ofertas de Mercado Livre e Shopee...</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="panel" style={{padding:'40px',textAlign:'center'}}>
              <PackageSearch size={30}/>
              <h3 style={{fontSize:'14px',margin:'6px 0'}}>Nenhum produto encontrado</h3>
              <p style={{fontSize:'12px',color:'#777'}}>Tente buscar com outro termo ou alterar os filtros.</p>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:'10px'}}>
              {displayedItems.map(item => {
                const comm = getCommission(item, selectedCategory);
                const isShopee = item.marketplace === 'Shopee';

                return (
                  <article key={item.id} className="panel" style={{borderRadius:'10px',overflow:'hidden',display:'flex',flexDirection:'column',transition:'box-shadow 0.15s ease',background:'#fff'}}>
                    
                    {/* Imagem + Selo da Plataforma */}
                    <a href={item.url} target="_blank" rel="noreferrer" style={{height:'160px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'8px',position:'relative'}}>
                      <img src={item.imageUrl} alt={item.title} loading="lazy" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
                      
                      {/* Badge da Loja / Plataforma */}
                      <span style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: isShopee ? '#ee4d2d' : '#ffe600',
                        color: isShopee ? '#fff' : '#222',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                      }}>
                        {isShopee ? '🟠 Shopee' : '🟡 Mercado Livre'}
                      </span>

                      {item.discount > 0 && (
                        <span style={{position:'absolute',top:8,right:8,background:'#00a650',color:'#fff',fontWeight:800,padding:'2px 6px',borderRadius:'4px',fontSize:'10px'}}>
                          {item.discount}% OFF
                        </span>
                      )}
                    </a>

                    <div style={{padding:'10px',display:'flex',flexDirection:'column',flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <small style={{color: isShopee ? '#ee4d2d' : '#3483fa', fontSize:'10px', fontWeight: 700}}>
                          {item.marketplace}
                        </small>
                        <small style={{color:'#6b7280',fontSize:'10px'}}>
                          {item.officialStoreName || 'Oficial'}
                        </small>
                      </div>

                      <h3 style={{fontSize:'12px',lineHeight:1.35,fontWeight:500,minHeight:'48px',margin:'4px 0 6px',color:'#1f2937',display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}} title={item.title}>
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
                              onClick={() => saveOffer(item)}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                fontSize: '11px',
                                gap: '4px',
                                borderRadius: '6px',
                                background: isSaved ? '#10b981' : isShopee ? '#ee4d2d' : '#3483fa',
                                borderColor: isSaved ? '#10b981' : isShopee ? '#ee4d2d' : '#3483fa',
                                opacity: isSaving ? 0.7 : 1,
                                cursor: isSaved ? 'default' : 'pointer'
                              }}
                            >
                              {isSaved ? <Check size={13}/> : <Plus size={13}/>}
                              {isSaved ? 'Salvo' : isSaving ? 'Salvando...' : 'Salvar oferta'}
                            </button>
                          );
                        })()}

                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="outline-btn" 
                          title="Abrir página oficial do produto" 
                          style={{padding:'6px 8px',borderRadius:'6px',display:'grid',placeItems:'center',border:'1px solid #d1d5db'}}
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

          {/* Paginação Mercado Livre */}
          {platformTab === 'MERCADOLIVRE' && pages > 1 && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 4px',fontSize:'12px',color:'#6b7280',marginTop:'8px'}}>
              <span>Página {page} de {pages}</span>
              <div style={{display:'flex',gap:'6px'}}>
                <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="outline-btn" style={{padding:'5px 10px',fontSize:'11px'}}><ChevronLeft size={14}/> Anterior</button>
                <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="outline-btn" style={{padding:'5px 10px',fontSize:'11px'}}>Próxima <ChevronRight size={14}/></button>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

const checkStyle = {display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',margin:'6px 0',cursor:'pointer'};
const priceInput = {width:'100%',padding:'5px 7px',border:'1px solid #d1d5db',borderRadius:'6px',fontSize:'11px'};
function categoryButton(active: boolean) {
  return {
    display:'block',width:'100%',textAlign:'left' as const,border:'none',background:active?'#f3f4f6':'transparent',
    color:active?'#111':'#555',fontWeight:active?700:400,padding:'5px 7px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',
    whiteSpace:'nowrap' as const,overflow:'hidden' as const,textOverflow:'ellipsis' as const
  };
}
