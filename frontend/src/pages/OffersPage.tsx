import { FormEvent, useMemo, useState } from 'react'; import { Check, ChevronDown, Copy, Edit3, ExternalLink, Eye, Filter, Link2, MoreHorizontal, Plus, Search, Share2, Sparkles, Trash2, X } from 'lucide-react'; import type { Offer, OfferInput } from '@central/shared'; import { MARKETPLACES } from '@central/shared'; import { useOffers } from '../hooks/useOffers'; import { api } from '../lib/api'; import { money, date } from '../lib/format'; import { StatusBadge } from '../components/StatusBadge';
import { PublishModal } from '../components/PublishModal';
export function OffersPage(){
  const {offers,loading,error,refresh}=useOffers();
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('Todos');
  const [editing,setEditing]=useState<Offer|null>(null);
  const [publishing,setPublishing]=useState<Offer|null>(null);
  const [creating,setCreating]=useState(false);
  const [toast,setToast]=useState('');
  const [copiedId, setCopiedId] = useState<string|null>(null);

  const rows=useMemo(()=>offers.filter(o=>(status==='Todos'||o.status===status)&&o.title.toLowerCase().includes(query.toLowerCase())),[offers,status,query]);

  const notify=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2600)};

  const handleCopyAffiliateLink = (o: Offer) => {
    const link = o.affiliateUrl || o.originalUrl;
    navigator.clipboard.writeText(link);
    setCopiedId(o.id);
    notify('Link de afiliado copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  async function changeStatus(o:Offer,s:Offer['status']){await api.setStatus(o.id,s);await refresh();notify('Status atualizado com sucesso.')}
  async function remove(o:Offer){if(!confirm(`Remover a oferta “${o.title}”?`))return;await api.deleteOffer(o.id);await refresh();notify('Oferta removida.')}

  return (
    <>
      <div className="admin-title compact-title">
        <div>
          <span>GESTÃO DE CONTEÚDO</span>
          <h1>Ofertas</h1>
          <p>Cadastre, revise e copie os links de afiliado das promoções da sua central.</p>
        </div>
        <button className="btn primary" onClick={()=>setCreating(true)}><Plus/>Nova oferta</button>
      </div>

      <div className="tabs">
        <button className={status==='Todos'?'active':''} onClick={()=>setStatus('Todos')}>Todas <small>{offers.length}</small></button>
        <button className={status==='PENDING'?'active':''} onClick={()=>setStatus('PENDING')}>Em aprovação <small>{offers.filter(o=>o.status==='PENDING').length}</small></button>
        <button className={status==='APPROVED'?'active':''} onClick={()=>setStatus('APPROVED')}>Aprovadas</button>
        <button className={status==='PUBLISHED'?'active':''} onClick={()=>setStatus('PUBLISHED')}>Publicadas</button>
        <button className={status==='DRAFT'?'active':''} onClick={()=>setStatus('DRAFT')}>Rascunhos</button>
      </div>

      <section className="panel offers-panel">
        <div className="offer-toolbar">
          <div className="table-search">
            <Search/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por título..."/>
          </div>
          <button className="outline-btn"><Filter/>Filtros <ChevronDown/></button>
        </div>

        {error&&<div className="form-error">{error}</div>}

        <div className="table-wrap">
          <table className="offers-table">
            <thead>
              <tr>
                <th style={{width:'32px'}}><input type="checkbox"/></th>
                <th>OFERTA</th>
                <th>MARKETPLACE</th>
                <th>PREÇO</th>
                <th>STATUS</th>
                <th>LINK AFILIADO</th>
                <th className="hide-on-compact">VERIFICAÇÃO</th>
                <th style={{textAlign:'right'}}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>Carregando ofertas...</td></tr>
              ) : rows.map(o => (
                <tr key={o.id}>
                  <td><input type="checkbox"/></td>
                  <td>
                    <div className="product-cell">
                      <img src={o.imageUrl} alt={o.title}/>
                      <span style={{minWidth:0,overflow:'hidden'}}>
                        <b title={o.title}>{o.title}</b>
                        <small>{o.category}</small>
                      </span>
                    </div>
                  </td>
                  <td><span className="market-text">{o.marketplace}</span></td>
                  <td>
                    <div className="price-cell">
                      <div className="price-cell-main">
                        <b>{money.format(o.currentPrice)}</b>
                        {o.previousPrice && <del>{money.format(o.previousPrice)}</del>}
                      </div>
                      {(() => {
                        const commPercent = o.category.toLowerCase().includes('casa') ? 11 :
                                            o.category.toLowerCase().includes('celular') ? 7 :
                                            o.category.toLowerCase().includes('eletr') ? 8 :
                                            o.category.toLowerCase().includes('inform') ? 8 :
                                            o.category.toLowerCase().includes('esport') ? 12 :
                                            o.category.toLowerCase().includes('game') ? 8 : 9;
                        const commissionEarned = o.currentPrice * (commPercent / 100);
                        return (
                          <div className="comm-badge">
                            <span className="comm-pill">{commPercent}%</span>
                            <span className="comm-val">ganha {money.format(commissionEarned)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td><StatusBadge status={o.status}/></td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'nowrap'}}>
                      <button 
                        className="btn"
                        style={{
                          background: copiedId === o.id ? '#10b981' : '#eff6ff',
                          color: copiedId === o.id ? '#fff' : '#2563eb',
                          border: '1px solid',
                          borderColor: copiedId === o.id ? '#10b981' : '#bfdbfe',
                          padding: '5px 9px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={() => handleCopyAffiliateLink(o)}
                        title={o.affiliateUrl}
                      >
                        {copiedId === o.id ? <Check size={13}/> : <Copy size={13}/>}
                        {copiedId === o.id ? 'Copiado!' : 'Copiar link'}
                      </button>
                      <a 
                        href={o.affiliateUrl || o.originalUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        title="Abrir página com link de afiliado"
                        style={{display:'inline-flex',alignItems:'center',color:'#6b7280',padding:'3px'}}
                      >
                        <ExternalLink size={14}/>
                      </a>
                    </div>
                  </td>
                  <td className="hide-on-compact"><small>{date(o.verifiedAt)}</small></td>
                  <td style={{whiteSpace:'nowrap',textAlign:'right'}}>
                    <div style={{display:'inline-flex',alignItems:'center',gap:'6px',justifyContent:'flex-end'}}>
                      <button 
                        type="button"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                          color: '#fff',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                          border: 0,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          width: 'auto',
                          height: 'auto',
                          flexShrink: 0
                        }}
                        title="Abrir divulgação com IA e grupos recomendados no Facebook"
                        onClick={() => setPublishing(o)}
                      >
                        <Sparkles size={13} style={{flexShrink:0}} /> Divulgar
                      </button>

                      <div className="row-actions" style={{display:'inline-flex',gap:'3px'}}>
                        {o.status==='PENDING'&&<button title="Aprovar" onClick={()=>changeStatus(o,'APPROVED')}><Check/></button>}
                        {o.status==='APPROVED'&&<button title="Publicar" onClick={()=>changeStatus(o,'PUBLISHED')}><Eye/></button>}
                        <button title="Editar oferta" onClick={()=>setEditing(o)}><Edit3/></button>
                        <button title="Remover" onClick={()=>remove(o)}><Trash2/></button>
                        <button><MoreHorizontal/></button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading&&rows.length===0&&<div className="empty">Nenhuma oferta encontrada.</div>}
        </div>
      </section>

      <div className="table-footer">
        Exibindo {rows.length} de {offers.length} ofertas 
        <div><button>‹</button><button className="active">1</button><button>2</button><button>›</button></div>
      </div>

      {publishing && (
        <PublishModal
          offer={publishing}
          onClose={() => setPublishing(null)}
          onPublished={async () => {
            await refresh();
            notify('Oferta divulgada e marcada como Publicada!');
          }}
        />
      )}

      {(creating||editing)&&<OfferModal offer={editing} onClose={()=>{setCreating(false);setEditing(null)}} onSaved={async()=>{setCreating(false);setEditing(null);await refresh();notify('Oferta salva com sucesso.')}}/>}
      {toast&&<div className="toast"><Check/>{toast}</div>}
    </>
  );
}
function OfferModal({offer,onClose,onSaved}:{offer:Offer|null;onClose:()=>void;onSaved:()=>void}){
  const [busy,setBusy]=useState(false);
  const [importing,setImporting]=useState(false);
  const [importInput,setImportInput]=useState('');
  const [err,setErr]=useState('');
  const [form,setForm]=useState({
    title:offer?.title||'',
    marketplace:offer?.marketplace||'Mercado Livre',
    category:offer?.category||'Eletrônicos',
    imageUrl:offer?.imageUrl||'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    currentPrice:String(offer?.currentPrice||''),
    previousPrice:String(offer?.previousPrice||''),
    coupon:offer?.coupon||'',
    originalUrl:offer?.originalUrl||'',
    affiliateUrl:offer?.affiliateUrl||'',
    availability:offer?.availability||'AVAILABLE',
    status:offer?.status||'DRAFT',
    publishAt:offer?.publishAt?.slice(0,16)||''
  });

  const set=(key:string,value:string)=>setForm(f=>({...f,[key]:value}));

  const handleImportML = async () => {
    if (!importInput.trim()) return;
    setImporting(true);
    setErr('');
    try {
      const data = await api.parseMercadoLivreItem(importInput.trim());
      setForm(prev => ({
        ...prev,
        title: data.title,
        marketplace: 'Mercado Livre',
        category: data.category,
        currentPrice: String(data.currentPrice),
        previousPrice: String(data.previousPrice || ''),
        imageUrl: data.imageUrl,
        originalUrl: data.originalUrl,
        affiliateUrl: data.affiliateUrl
      }));
      setImportInput('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Falha ao buscar anúncio no Mercado Livre');
    } finally {
      setImporting(false);
    }
  };

  async function submit(e:FormEvent){
    e.preventDefault();
    setBusy(true);
    setErr('');
    const input:OfferInput={
      title:form.title,
      marketplace:form.marketplace as Offer['marketplace'],
      category:form.category,
      imageUrl:form.imageUrl,
      currentPrice:Number(form.currentPrice),
      previousPrice:form.previousPrice?Number(form.previousPrice):null,
      coupon:form.coupon||null,
      originalUrl:form.originalUrl,
      affiliateUrl:form.affiliateUrl,
      verifiedAt:new Date().toISOString(),
      availability:form.availability as Offer['availability'],
      status:form.status as Offer['status'],
      publishAt:form.publishAt?new Date(form.publishAt).toISOString():null
    };
    try {
      offer?await api.updateOffer(offer.id,input):await api.createOffer(input);
      onSaved();
    } catch(e) {
      setErr(e instanceof Error?e.message:'Não foi possível salvar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
      <form className="offer-modal" onSubmit={submit}>
        <div className="modal-head">
          <div>
            <span className="section-kicker">{offer?'EDITAR OFERTA':'NOVA OFERTA'}</span>
            <h2>{offer?'Atualize os detalhes':'Cadastre uma promoção'}</h2>
            <p>Preencha os dados manualmente ou importe direto do Mercado Livre.</p>
          </div>
          <button type="button" onClick={onClose}><X/></button>
        </div>

        {err && <div className="form-error">{err}</div>}

        {!offer && (
          <div style={{background:'rgba(255,230,0,0.12)',border:'1px solid #ffe600',borderRadius:'8px',padding:'0.85rem 1rem',marginBottom:'1.25rem'}}>
            <b style={{fontSize:'12px',textTransform:'uppercase',color:'#854d0e',display:'block',marginBottom:'6px'}}>⚡ Importar automático do Mercado Livre:</b>
            <div style={{display:'flex',gap:'8px'}}>
              <input 
                type="text" 
                value={importInput}
                onChange={e => setImportInput(e.target.value)}
                placeholder="Cole o link do produto ou código MLB... (ex: MLB-5283692714)"
                style={{flex:1,fontSize:'13px',padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:'6px'}}
              />
              <button 
                type="button" 
                className="btn primary" 
                disabled={importing || !importInput.trim()} 
                onClick={handleImportML}
                style={{padding:'8px 14px',fontSize:'13px'}}
              >
                {importing ? 'Importando...' : 'Preencher Campos'}
              </button>
            </div>
          </div>
        )}

        <div className="form-grid">
          <label className="wide">Título<input required minLength={3} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Nome completo do produto"/></label>
          <label>Marketplace<select value={form.marketplace} onChange={e=>set('marketplace',e.target.value)}>{MARKETPLACES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Categoria<input required value={form.category} onChange={e=>set('category',e.target.value)}/></label>
          <label>Preço atual<input required min="0.01" step="0.01" type="number" value={form.currentPrice} onChange={e=>set('currentPrice',e.target.value)}/></label>
          <label>Preço anterior<input min="0.01" step="0.01" type="number" value={form.previousPrice} onChange={e=>set('previousPrice',e.target.value)}/></label>
          <label>Cupom<input value={form.coupon} onChange={e=>set('coupon',e.target.value)} placeholder="Opcional"/></label>
          <label>Disponibilidade<select value={form.availability} onChange={e=>set('availability',e.target.value)}><option value="AVAILABLE">Disponível</option><option value="LOW_STOCK">Estoque baixo</option><option value="UNAVAILABLE">Indisponível</option></select></label>
          <label className="wide">URL da imagem<input required type="url" value={form.imageUrl} onChange={e=>set('imageUrl',e.target.value)}/></label>
          <label className="wide">Link original<input required type="url" value={form.originalUrl} onChange={e=>set('originalUrl',e.target.value)}/></label>
          <label className="wide">Link de afiliado
            <input required type="url" value={form.affiliateUrl} onChange={e=>set('affiliateUrl',e.target.value)} placeholder="Cole o link gerado na Central de Afiliados do Mercado Livre"/>
            <small>Use o link criado em Afiliados → Gerador de links. O sistema não altera mais esse endereço.</small>
          </label>
          <label>Status<select value={form.status} onChange={e=>set('status',e.target.value)}><option value="DRAFT">Rascunho</option><option value="PENDING">Enviar para aprovação</option><option value="APPROVED">Aprovada</option><option value="PUBLISHED">Publicada</option></select></label>
          <label>Publicar em<input type="datetime-local" value={form.publishAt} onChange={e=>set('publishAt',e.target.value)}/></label>
        </div>

        <div className="modal-actions">
          <button type="button" className="outline-btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy}>{busy?'Salvando...':offer?'Salvar alterações':'Criar oferta'}</button>
        </div>
      </form>
    </div>
  );
}
