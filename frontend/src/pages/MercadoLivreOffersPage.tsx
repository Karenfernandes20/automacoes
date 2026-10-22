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
  const [onlyOffers, setOnlyOffers] = useState(true);
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
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    api.getMercadoLivreCategories().then(setCategories).catch(err => setError(err instanceof Error ? err.message : 'Falha ao carregar categorias.'));
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
    const affiliateUrl = window.prompt(
      'Cole o link deste produto gerado na Central de Afiliados do Mercado Livre.\n\nO link comum não gera comissão:',
      ''
    );
    if (!affiliateUrl) return;
    try {
      const parsed = new URL(affiliateUrl);
      if (!parsed.hostname.includes('mercadolivre.com') && parsed.hostname !== 'meli.la') {
        throw new Error('O link informado não pertence ao Mercado Livre.');
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
      setSavedId(item.id);
      setTimeout(() => setSavedId(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Não foi possível salvar a oferta.');
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
      <section className="panel" style={{padding:'1.4rem',borderRadius:'14px',background:'linear-gradient(135deg,#ffe600,#fff176)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'20px',flexWrap:'wrap'}}>
          <div>
            <span style={{fontSize:'12px',fontWeight:800,color:'#594f00'}}>CATÁLOGO REAL • MERCADO LIVRE</span>
            <h1 style={{margin:'5px 0',fontSize:'26px'}}>Ofertas e produtos por categoria</h1>
            <p style={{margin:0,color:'#554f25'}}>Pesquise o catálogo oficial e salve produtos usando seu link de afiliada.</p>
          </div>
          <div style={{background:'rgba(255,255,255,.75)',padding:'10px 14px',borderRadius:'10px',minWidth:'160px'}}>
            <b style={{display:'block',fontSize:'19px'}}>{total.toLocaleString('pt-BR')}</b>
            <small>resultados encontrados</small>
          </div>
        </div>
        <form onSubmit={submitSearch} style={{display:'flex',marginTop:'18px',maxWidth:'850px'}}>
          <div style={{position:'relative',flex:1}}>
            <Search size={19} style={{position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)',color:'#777'}}/>
            <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder="Buscar produtos, marcas e modelos..." style={{width:'100%',padding:'13px 15px 13px 44px',border:'none',borderRadius:'9px 0 0 9px',fontSize:'15px'}}/>
          </div>
          <button className="btn primary" style={{borderRadius:'0 9px 9px 0',background:'#3483fa',padding:'0 22px'}}>Buscar</button>
        </form>
      </section>

      {error && (
        <div className="notice" style={{borderColor:'#fca5a5',background:'#fef2f2',color:'#991b1b'}}>
          <PackageSearch/><div><b>Catálogo indisponível</b><p>{error}</p><a href="/admin/integracoes">Reconectar Mercado Livre</a></div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'minmax(210px,250px) minmax(0,1fr)',gap:'1.25rem',alignItems:'start'}}>
        <aside className="panel" style={{padding:'1rem',borderRadius:'12px',position:'sticky',top:'16px',maxHeight:'calc(100vh - 32px)',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'12px'}}><Filter size={16}/><b>Filtros</b></div>
          <button onClick={()=>changeCategory('')} style={categoryButton(!category)}>Todas as categorias</button>
          {categories.map(c=><button key={c.id} onClick={()=>changeCategory(c.id)} style={categoryButton(category===c.id)}>{c.name}</button>)}
          <hr style={{border:0,borderTop:'1px solid #eee',margin:'15px 0'}}/>
          <label style={checkStyle}><input type="checkbox" checked={onlyOffers} onChange={e=>{setOnlyOffers(e.target.checked);setPage(1);}}/> Somente com desconto</label>
          <label style={checkStyle}><input type="checkbox" checked={freeShipping} onChange={e=>{setFreeShipping(e.target.checked);setPage(1);}}/> Frete grátis</label>
          <b style={{fontSize:'13px',display:'block',margin:'16px 0 7px'}}>Faixa de preço</b>
          <div style={{display:'flex',gap:'6px'}}>
            <input type="number" min="0" placeholder="Mín." value={minPrice} onChange={e=>setMinPrice(e.target.value)} style={priceInput}/>
            <input type="number" min="0" placeholder="Máx." value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} style={priceInput}/>
          </div>
        </aside>

        <main>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',marginBottom:'14px',flexWrap:'wrap'}}>
            <div><h2 style={{margin:0,fontSize:'20px'}}>{selectedCategory}</h2><small style={{color:'#6b7280'}}>Mostrando até {accessibleTotal.toLocaleString('pt-BR')} resultados navegáveis nesta busca</small></div>
            <select value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}} style={{padding:'9px 12px',border:'1px solid #d1d5db',borderRadius:'8px'}}>
              <option value="">Mais relevantes</option>
              {sorts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              {!sorts.some(s=>s.id==='price_asc')&&<option value="price_asc">Menor preço</option>}
              {!sorts.some(s=>s.id==='price_desc')&&<option value="price_desc">Maior preço</option>}
            </select>
          </div>

          {loading ? <div className="panel" style={{padding:'60px',textAlign:'center'}}><RefreshCw size={30} style={{animation:'spin 1s linear infinite'}}/><p>Carregando produtos reais...</p></div> :
          !error && items.length===0 ? <div className="panel" style={{padding:'60px',textAlign:'center'}}><PackageSearch size={38}/><h3>Nenhum produto encontrado</h3><p>Remova algum filtro ou tente outra pesquisa.</p></div> :
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'14px'}}>
            {items.map(item=><article key={item.id} className="panel" style={{borderRadius:'12px',overflow:'hidden',display:'flex',flexDirection:'column'}}>
              <a href={item.url} target="_blank" rel="noreferrer" style={{height:'210px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',padding:'12px',position:'relative'}}>
                <img src={item.imageUrl} alt={item.title} loading="lazy" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
                {item.discount>0&&<span style={{position:'absolute',top:10,right:10,background:'#00a650',color:'#fff',fontWeight:800,padding:'4px 7px',borderRadius:'5px',fontSize:'12px'}}>{item.discount}% OFF</span>}
              </a>
              <div style={{padding:'14px',display:'flex',flexDirection:'column',flex:1}}>
                <small style={{color:'#6b7280'}}>{item.officialStoreName || (item.condition==='new'?'Novo':'Produto')}</small>
                <h3 style={{fontSize:'14px',lineHeight:1.4,fontWeight:500,minHeight:'58px',margin:'6px 0 10px'}}>{item.title}</h3>
                {item.oldPrice>item.price&&<span style={{fontSize:'12px',textDecoration:'line-through',color:'#999'}}>{money.format(item.oldPrice)}</span>}
                <strong style={{fontSize:'21px'}}>{money.format(item.price)}</strong>
                {item.installments&&<small style={{color:'#00a650'}}>em {item.installments.quantity}x de {money.format(item.installments.amount)}</small>}
                {item.freeShipping&&<span style={{display:'flex',alignItems:'center',gap:'4px',color:'#00a650',fontSize:'12px',fontWeight:700,marginTop:'7px'}}><Truck size={14}/> Frete grátis</span>}
                <div style={{display:'flex',gap:'7px',marginTop:'auto',paddingTop:'14px'}}>
                  <button className="btn primary" onClick={()=>saveOffer(item)} style={{flex:1,justifyContent:'center',fontSize:'12px',background:savedId===item.id?'#00a650':'#3483fa'}}>{savedId===item.id?<Check size={15}/>:<Plus size={15}/>} {savedId===item.id?'Salvo':'Salvar oferta'}</button>
                  <a className="outline-btn" href={item.url} target="_blank" rel="noreferrer" title="Abrir produto exato" style={{padding:'8px',display:'flex'}}><ExternalLink size={16}/></a>
                </div>
              </div>
            </article>)}
          </div>}

          {!loading&&!error&&pages>1&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginTop:'24px'}}>
            <button className="outline-btn" disabled={page<=1} onClick={()=>{setPage(p=>p-1);window.scrollTo({top:0,behavior:'smooth'});}}><ChevronLeft size={16}/> Anterior</button>
            <span style={{fontSize:'14px'}}>Página <b>{page}</b> de <b>{pages}</b></span>
            <button className="outline-btn" disabled={page>=pages} onClick={()=>{setPage(p=>p+1);window.scrollTo({top:0,behavior:'smooth'});}}>Próxima <ChevronRight size={16}/></button>
          </div>}
        </main>
      </div>
    </div>
  );
}

const checkStyle = {display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',margin:'10px 0',cursor:'pointer'} as const;
const priceInput = {width:'50%',minWidth:0,padding:'7px',border:'1px solid #d1d5db',borderRadius:'6px'} as const;
function categoryButton(active:boolean) {
  return {width:'100%',textAlign:'left' as const,border:0,background:active?'#eaf2ff':'transparent',color:active?'#1d4ed8':'#374151',padding:'8px 9px',borderRadius:'7px',cursor:'pointer',fontSize:'13px',fontWeight:active?700:400};
}
