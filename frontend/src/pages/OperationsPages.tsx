import { AlertTriangle, ArrowDownToLine, ArrowUpRight, BadgeCheck, CircleDollarSign, Clock3, Copy, ExternalLink, Link2, MessageCircle, MoreHorizontal, Plug, Plus, RefreshCw, Search, ShieldCheck, ShoppingBag, TrendingUp, Users, X } from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useOffers } from '../hooks/useOffers';

const integrationsList=[
  {name:'Facebook',type:'Página',initial:'f',color:'#1877f2',status:'Não conectada',description:'Conecte uma Página oficial para publicar suas promoções.'},
  {name:'Amazon Associados',type:'Afiliados',initial:'a',color:'#151515',status:'Não conectada',description:'Importe pedidos, comissões e relatórios de conversão.'},
  {name:'Mercado Livre',type:'Afiliados',initial:'M',color:'#ffe600',status:'Não conectada',description:'Centralize links e resultados do programa de afiliados.'},
  {name:'Shopee',type:'Afiliados',initial:'S',color:'#ee4d2d',status:'Não conectada',description:'Acompanhe links, pedidos elegíveis e comissões.'},
  {name:'AliExpress',type:'Afiliados',initial:'A',color:'#e43225',status:'Não conectada',description:'Sincronize campanhas e resultados disponíveis.'},
  {name:'SHEIN',type:'Afiliados',initial:'SH',color:'#111',status:'Não conectada',description:'Organize credenciais e relatórios de afiliação.'},
  {name:'TikTok Shop',type:'Afiliados',initial:'T',color:'#111',status:'Não conectada',description:'Prepare o acompanhamento de produtos e pedidos.'},
  {name:'WhatsApp / WuzAPI',type:'Mensageria',initial:'W',color:'#1ebf68',status:'Não conectada',description:'Gerencie grupos e publicações após validar as regras de uso.'}
];

export function IntegrationsPage(){
  const [searchParams, setSearchParams] = useSearchParams();
  const [mlData, setMlData] = useState<{connected:boolean;status:string;user?:{id:number;nickname:string;first_name?:string;last_name?:string}} | null>(null);
  const [loadingMl, setLoadingMl] = useState(false);
  const [wuzData, setWuzData] = useState<{connected:boolean;loggedIn:boolean;status:string;instance:string;jid:string|null;phone:string|null} | null>(null);
  const [loadingWuz, setLoadingWuz] = useState(false);
  const [facebookData, setFacebookData] = useState<{configured:boolean;connected:boolean;page:{id:string;name:string;category?:string}|null;pages:Array<{id:string;name:string;category?:string}>} | null>(null);
  const [loadingFacebook, setLoadingFacebook] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{type:'success'|'error';message:string} | null>(null);

  const loadStatus = async () => {
    try {
      const res = await api.getMercadoLivreStatus();
      setMlData(res);
    } catch {
      setMlData({connected: false, status: 'Não conectada'});
    }

    try {
      const wuz = await api.getWuzapiStatus();
      setWuzData(wuz);
    } catch {
      setWuzData({connected: false, loggedIn: false, status: 'Não conectada', instance: 'karenpessoal', jid: null, phone: null});
    }
    try { setFacebookData(await api.getFacebookStatus()); }
    catch { setFacebookData({configured:false,connected:false,page:null,pages:[]}); }
  };

  useEffect(() => {
    loadStatus();

    const statusParam = searchParams.get('ml_status');
    const errorParam = searchParams.get('ml_error');
    const fbStatus = searchParams.get('fb_status');
    const fbError = searchParams.get('fb_error');

    if (statusParam === 'success') {
      setFeedback({type: 'success', message: 'Conta do Mercado Livre conectada com sucesso!'});
      searchParams.delete('ml_status');
      setSearchParams(searchParams, {replace: true});
      loadStatus();
    } else if (errorParam) {
      setFeedback({type: 'error', message: `Erro ao conectar: ${decodeURIComponent(errorParam)}`});
      searchParams.delete('ml_error');
      setSearchParams(searchParams, {replace: true});
    }
    if (fbStatus === 'success') {
      setFeedback({type:'success',message:'Página do Facebook conectada com sucesso!'});
      searchParams.delete('fb_status'); setSearchParams(searchParams,{replace:true}); void loadStatus();
    } else if (fbError) {
      setFeedback({type:'error',message:`Erro ao conectar Facebook: ${decodeURIComponent(fbError)}`});
      searchParams.delete('fb_error'); setSearchParams(searchParams,{replace:true});
    }
  }, []);

  useEffect(() => {
    const unlockConnection = () => {
      setLoadingMl(false);
      void loadStatus();
    };
    window.addEventListener('focus', unlockConnection);
    window.addEventListener('pageshow', unlockConnection);
    return () => {
      window.removeEventListener('focus', unlockConnection);
      window.removeEventListener('pageshow', unlockConnection);
    };
  }, []);

  const handleConnectML = async () => {
    setLoadingMl(true);
    setFeedback(null);
    try {
      const { authUrl } = await api.getMercadoLivreAuthUrl();
      const popup = window.open(authUrl, 'mercadolivre-oauth', 'popup=yes,width=720,height=760');
      if (!popup) {
        setFeedback({type: 'error', message: 'O navegador bloqueou a janela de conexão. Permita pop-ups para este site e tente novamente.'});
        setLoadingMl(false);
        return;
      }
      const monitor = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(monitor);
          setLoadingMl(false);
          void loadStatus();
        }
      }, 500);
      window.setTimeout(() => {
        window.clearInterval(monitor);
        setLoadingMl(false);
      }, 2 * 60 * 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar autenticação';
      setFeedback({type: 'error', message: msg});
      setLoadingMl(false);
    }
  };

  const handleDisconnectML = async () => {
    if (!confirm('Deseja realmente desconectar a conta do Mercado Livre?')) return;
    setLoadingMl(true);
    try {
      await api.disconnectMercadoLivre();
      setFeedback({type: 'success', message: 'Mercado Livre desconectado.'});
      await loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao desconectar';
      setFeedback({type: 'error', message: msg});
    } finally {
      setLoadingMl(false);
    }
  };

  const handleConnectFacebook = async () => {
    setLoadingFacebook(true); setFeedback(null);
    try {
      const {authUrl}=await api.getFacebookAuthUrl();
      const popup=window.open(authUrl,'facebook-oauth','popup=yes,width=720,height=760');
      if(!popup) throw new Error('Permita pop-ups para conectar o Facebook.');
      const monitor=window.setInterval(()=>{if(popup.closed){window.clearInterval(monitor);setLoadingFacebook(false);void loadStatus();}},500);
      window.setTimeout(()=>{window.clearInterval(monitor);setLoadingFacebook(false);},120000);
    } catch(err) {
      setFeedback({type:'error',message:err instanceof Error?err.message:'Falha ao conectar Facebook'}); setLoadingFacebook(false);
    }
  };

  const handleDisconnectFacebook = async () => {
    if(!confirm('Deseja desconectar a Página do Facebook?')) return;
    setLoadingFacebook(true);
    try { await api.disconnectFacebook(); await loadStatus(); setFeedback({type:'success',message:'Facebook desconectado.'}); }
    catch(err){setFeedback({type:'error',message:err instanceof Error?err.message:'Falha ao desconectar Facebook'});}
    finally{setLoadingFacebook(false);}
  };

  const handleConnectWuzapi = async () => {
    setLoadingWuz(true);
    setQrError(null);
    setQrCodeData(null);
    setQrModalOpen(true);
    try {
      const res = await api.connectWuzapi();
      if (res && res.qrCode) {
        setQrCodeData(res.qrCode);
      } else if (res && res.error) {
        setQrError(res.error);
      } else {
        setQrError('Não foi possível obter o QR Code da sessão.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar QR Code';
      setQrError(msg);
    } finally {
      setLoadingWuz(false);
    }
  };

  const handleDisconnectWuzapi = async () => {
    if (!confirm('Deseja realmente desconectar a sessão do WhatsApp (karenpessoal)?')) return;
    setLoadingWuz(true);
    try {
      await api.disconnectWuzapi();
      setFeedback({type: 'success', message: 'WhatsApp desconectado com sucesso.'});
      await loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao desconectar';
      setFeedback({type: 'error', message: msg});
    } finally {
      setLoadingWuz(false);
    }
  };

  return (
    <>
      <PageTitle eyebrow="CONFIGURAÇÃO" title="Integrações" description="Conecte suas contas de afiliação e canais em um único lugar." action={<button className="btn primary"><Plus/>Nova conexão</button>}/>
      
      {feedback && (
        <div className={`notice ${feedback.type === 'error' ? 'notice-error' : ''}`} style={{marginBottom:'1rem',borderColor:feedback.type==='success'?'#10b981':'#ef4444'}}>
          <ShieldCheck style={{color:feedback.type==='success'?'#10b981':'#ef4444'}}/>
          <div>
            <b>{feedback.type === 'success' ? 'Sucesso' : 'Atenção'}</b>
            <p>{feedback.message}</p>
          </div>
        </div>
      )}

      <div className="notice">
        <ShieldCheck/>
        <div>
          <b>Canais e APIs Oficiais Conectados</b>
          <p>Mercado Livre via OAuth e WhatsApp via WuzAPI (instância karenpessoal) prontos para uso.</p>
        </div>
      </div>

      <div className="integration-grid">
        {integrationsList.map(item => {
          const isML = item.name === 'Mercado Livre';
          const isWuz = item.name.includes('WuzAPI') || item.name.includes('WhatsApp');
          const isFacebook = item.name === 'Facebook';

          let isConnected = false;
          let statusText = item.status;

          if (isML) {
            isConnected = !!mlData?.connected;
            statusText = mlData ? (mlData.connected ? `Conectada (${mlData.user?.nickname || 'Conta ativa'})` : 'Não conectada') : 'Carregando...';
          } else if (isWuz) {
            isConnected = !!wuzData?.connected;
            statusText = wuzData ? (wuzData.connected ? `Conectada (${wuzData.phone || wuzData.instance})` : `Não conectada (${wuzData.instance})`) : 'Carregando...';
          } else if (isFacebook) {
            isConnected=!!facebookData?.connected;
            statusText=facebookData?.connected?`Conectada (${facebookData.page?.name || 'Página'})`:(facebookData?.configured?'Não conectada':'Configuração pendente');
          }

          return (
            <article className="panel integration-card" key={item.name}>
              <div className="integration-head">
                <span style={{background:item.color,color:item.color==='#ffe600'?'#222':'#fff'}}>{item.initial}</span>
                <div>
                  <b>{item.name}</b>
                  <small>{item.type}</small>
                </div>
                <button><MoreHorizontal/></button>
              </div>
              <p>{item.description}</p>
              <div className="connection-status">
                <span style={{background: isConnected ? '#10b981' : '#9ca3af'}}/>
                <b>{statusText}</b>
              </div>

              {isFacebook ? (
                isConnected ? <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {facebookData&&facebookData.pages.length>1&&<select value={facebookData.page?.id||''} onChange={async e=>{setFacebookData(await api.selectFacebookPage(e.target.value));}} style={{padding:'9px',border:'1px solid #d1d5db',borderRadius:'7px'}}>{facebookData.pages.map(page=><option key={page.id} value={page.id}>{page.name}</option>)}</select>}
                  <button className="outline-btn integration-action" style={{color:'#ef4444',borderColor:'#ef4444'}} disabled={loadingFacebook} onClick={handleDisconnectFacebook}><Plug/>Desconectar Facebook</button>
                </div> : <button className="btn primary integration-action" style={{background:'#1877f2',borderColor:'#1877f2'}} disabled={loadingFacebook} onClick={handleConnectFacebook}><Plug/>{loadingFacebook?'Conectando...':'Conectar Página do Facebook'}</button>
              ) : isML ? (
                isConnected ? (
                  <button className="outline-btn integration-action" style={{color:'#ef4444',borderColor:'#ef4444'}} disabled={loadingMl} onClick={handleDisconnectML}>
                    <Plug/>Desconectar conta
                  </button>
                ) : (
                  <button className="btn primary integration-action" disabled={loadingMl} onClick={handleConnectML}>
                    <Plug/>{loadingMl ? 'Redirecionando...' : 'Conectar com Mercado Livre'}
                  </button>
                )
              ) : isWuz ? (
                isConnected ? (
                  <button className="outline-btn integration-action" style={{color:'#ef4444',borderColor:'#ef4444'}} disabled={loadingWuz} onClick={handleDisconnectWuzapi}>
                    <Plug/>Desconectar WhatsApp
                  </button>
                ) : (
                  <button className="btn primary integration-action" style={{background:'#10b981',borderColor:'#10b981'}} disabled={loadingWuz} onClick={handleConnectWuzapi}>
                    <Plug/>{loadingWuz ? 'Carregando...' : 'Escanear QR Code (karenpessoal)'}
                  </button>
                )
              ) : (
                <button className="outline-btn integration-action" onClick={()=>alert('Conector reservado. A ativação será feita somente com uma API oficial e credenciais autorizadas.')}>
                  <Plug/>Configurar conexão
                </button>
              )}
            </article>
          );
        })}
      </div>

      {qrModalOpen && (
        <div className="modal-backdrop" onClick={()=>setQrModalOpen(false)}>
          <div className="modal" style={{maxWidth:'420px',textAlign:'center',padding:'2rem'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:'18px',marginBottom:'8px'}}>Conectar WhatsApp</h3>
            <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'1.5rem'}}>
              Abra o WhatsApp no seu celular &gt; Aparelhos conectados &gt; Conectar um aparelho e aponte a câmera para o QR Code abaixo.
            </p>

            {loadingWuz ? (
              <div style={{padding:'3rem',color:'#6b7280'}}>Gerando QR Code...</div>
            ) : qrCodeData ? (
              <div style={{background:'#fff',padding:'16px',borderRadius:'12px',display:'inline-block',boxShadow:'0 4px 12px rgba(0,0,0,0.1)',marginBottom:'1rem'}}>
                <img src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`} alt="QR Code WhatsApp" style={{width:'240px',height:'240px',display:'block'}}/>
              </div>
            ) : qrError ? (
              <div style={{color:'#ef4444',padding:'1.5rem',background:'#fee2e2',borderRadius:'8px',marginBottom:'1rem'}}>
                {qrError}
              </div>
            ) : null}

            <div style={{display:'flex',gap:'8px',justifyContent:'center',marginTop:'1rem'}}>
              <button className="outline-btn" onClick={()=>{ setQrModalOpen(false); loadStatus(); }}>Fechar</button>
              <button className="btn primary" onClick={handleConnectWuzapi} disabled={loadingWuz}>Recarregar QR</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function GroupsPage(){
  const [groupsList, setGroupsList] = useState<Array<{id:string;name:string;members:number;capacity:number;status:string;messages:number;topic?:string}>>([]);
  const [loading, setLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{id:string;name:string} | null>(null);
  const [groupMessages, setGroupMessages] = useState<Array<{id:string;sender:string;timestamp:string;type:string;text:string;mediaUrl?:string}>>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const openGroup = async (group:{id:string;name:string}) => {
    setSelectedGroup(group);
    setGroupMessages([]);
    setMessagesError('');
    setMessagesLoading(true);
    try {
      const result = await api.getWuzapiGroupMessages(group.id, 100);
      setGroupMessages(result.messages || []);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : 'Falha ao carregar mensagens.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadGroups = async () => {
    setLoading(true);
    try {
      const res = await api.getWuzapiGroups();
      setGroupsList(res.groups || []);
      setSyncNotice(res.groups && res.groups.length > 0 ? `${res.groups.length} grupos sincronizados da WuzAPI.` : 'Nenhum grupo encontrado ou WhatsApp ainda não conectado.');
    } catch {
      setSyncNotice('Falha ao consultar grupos do WhatsApp na WuzAPI.');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const totalMembers = groupsList.reduce((n, g) => n + g.members, 0);

  return (
    <>
      <PageTitle 
        eyebrow="WHATSAPP / WUZAPI" 
        title="Grupos e participantes" 
        description="Acompanhe grupos reais sincronizados da sua conta karenpessoal." 
        action={
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn primary" onClick={loadGroups} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
              Sincronizar Grupos
            </button>
          </div>
        }
      />

      {syncNotice && (
        <div className="notice" style={{marginBottom:'1rem',borderColor:'#10b981'}}>
          <ShieldCheck style={{color:'#10b981'}}/>
          <div>
            <b>WuzAPI WhatsApp</b>
            <p>{syncNotice}</p>
          </div>
        </div>
      )}

      <div className="operation-metrics">
        <MiniMetric icon={<Users/>} label="Total Participantes" value={String(totalMembers)} detail="somatória dos grupos"/>
        <MiniMetric icon={<MessageCircle/>} label="Grupos Conectados" value={String(groupsList.length)} detail="na instância karenpessoal"/>
        <MiniMetric icon={<TrendingUp/>} label="Publicações hoje" value="0" detail="disparos agendados"/>
        <MiniMetric icon={<AlertTriangle/>} label="Grupos lotados" value={String(groupsList.filter(g=>g.members>=1020).length)} detail="acima de 95%"/>
      </div>

      <section className="panel groups-panel">
        <div className="panel-head">
          <div>
            <h2>Seus grupos de WhatsApp</h2>
            <p>Grupos reais identificados na sua instância WuzAPI</p>
          </div>
          <button className="outline-btn" onClick={loadGroups} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Atualizar
          </button>
        </div>
        <div className="groups-list">
          {groupsList.length === 0 ? (
            <div style={{padding:'3rem 1rem',textAlign:'center',color:'#6b7280'}}>
              <MessageCircle size={36} style={{margin:'0 auto 0.75rem',color:'#9ca3af'}}/>
              <b>Nenhum grupo sincronizado no momento.</b>
              <p style={{fontSize:'13px',marginTop:'4px'}}>
                Conecte seu WhatsApp em <Link to="/admin/integracoes" style={{color:'#3483fa',fontWeight:600}}>Integrações</Link> via QR Code para carregar seus canais.
              </p>
            </div>
          ) : (
            groupsList.map(g => {
              const pct = Math.min(100, Math.round((g.members / g.capacity) * 100));
              return (
                <div className="group-row" key={g.id || g.name} onClick={()=>openGroup(g)} style={{cursor:'pointer'}} title="Abrir mensagens do grupo">
                  <span className="group-avatar"><MessageCircle/></span>
                  <div className="group-info">
                    <b>{g.name}</b>
                    <small>{g.members.toLocaleString('pt-BR')} de {g.capacity.toLocaleString('pt-BR')} participantes</small>
                    <div className="capacity"><i style={{width:`${pct}%`}} className={pct>95?'danger':''}/></div>
                  </div>
                  <div className="group-activity"><b>{g.messages}</b><small>posts hoje</small></div>
                  <span className={`group-state ${pct>95?'warning':''}`}>{g.status}</span>
                  <button className="row-menu" onClick={e=>{e.stopPropagation();void openGroup(g);}} aria-label={`Abrir mensagens de ${g.name}`}><MessageCircle/></button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {selectedGroup && (
        <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setSelectedGroup(null)}>
          <div className="modal" style={{width:'min(760px,94vw)',maxWidth:'760px',height:'min(760px,88vh)',display:'flex',flexDirection:'column',padding:0,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 18px',background:'#075e54',color:'#fff'}}>
              <div><b style={{display:'block'}}>{selectedGroup.name}</b><small>Últimas mensagens sincronizadas</small></div>
              <button onClick={()=>setSelectedGroup(null)} style={{border:0,background:'transparent',color:'#fff',cursor:'pointer'}}><X/></button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'18px',background:'#efeae2',display:'flex',flexDirection:'column-reverse',gap:'10px'}}>
              {messagesLoading ? <div style={{margin:'auto',textAlign:'center'}}><RefreshCw className="animate-spin"/><p>Carregando mensagens...</p></div> :
               messagesError ? <div style={{margin:'auto',maxWidth:'480px',padding:'16px',background:'#fff',borderRadius:'10px',color:'#b91c1c',textAlign:'center'}}>{messagesError}</div> :
               groupMessages.length===0 ? <div style={{margin:'auto',padding:'16px',background:'#fff',borderRadius:'10px',textAlign:'center'}}>Ainda não há mensagens armazenadas para este grupo.</div> :
               groupMessages.map(message=><div key={`${message.id}-${message.timestamp}`} style={{alignSelf:'flex-start',maxWidth:'78%',background:'#fff',padding:'9px 11px',borderRadius:'8px',boxShadow:'0 1px 2px rgba(0,0,0,.12)'}}>
                 <b style={{display:'block',fontSize:'11px',color:'#128c7e'}}>{message.sender.replace(/@.+$/,'')}</b>
                 <div style={{fontSize:'14px',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{message.text || `[${message.type}]`}</div>
                 {message.mediaUrl&&<a href={message.mediaUrl} target="_blank" rel="noreferrer" style={{fontSize:'12px'}}>Abrir mídia</a>}
                 <small style={{display:'block',textAlign:'right',color:'#777',fontSize:'10px',marginTop:'4px'}}>{message.timestamp ? new Date(message.timestamp).toLocaleString('pt-BR') : ''}</small>
               </div>)}
            </div>
            <div style={{padding:'10px 16px',borderTop:'1px solid #ddd',background:'#fff',fontSize:'12px',color:'#6b7280'}}>Visualização somente leitura • até 100 mensagens recentes</div>
          </div>
        </div>
      )}
    </>
  );
}

export function OrdersPage({commissions=false}:{commissions?:boolean}){
  const [ordersList, setOrdersList] = useState<Array<{id:string;market:string;product:string;date:string;value:string;commission:string;status:string}>>([]);
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const syncMercadoLivreOrders = async () => {
    setLoading(true);
    setSyncStatus('Consultando compras e pedidos oficiais do Mercado Livre...');
    try {
      const res = await api.getMercadoLivreOrders();
      if (res.orders) {
        setOrdersList(res.orders);
        setSyncStatus(res.orders.length > 0 ? `${res.orders.length} pedidos reais sincronizados da conta oficial.` : 'Nenhum pedido recente registrado na conta.');
      }
    } catch {
      setSyncStatus('Erro ao sincronizar com a API.');
    } finally {
      setLoading(false);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  useEffect(() => {
    syncMercadoLivreOrders();
  }, []);

  const totalValue = ordersList.reduce((acc, cur) => {
    const num = parseFloat(cur.value.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
    return acc + num;
  }, 0);

  const totalCommission = ordersList.reduce((acc, cur) => {
    const num = parseFloat(cur.commission.replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
    return acc + num;
  }, 0);

  return (
    <>
      <PageTitle 
        eyebrow="RESULTADOS DE AFILIADO" 
        title={commissions?'Comissões de Afiliado':'Vendas e Conversões de Afiliado'} 
        description={commissions?'Consolide as comissões geradas por links de afiliado.':'Acompanhe exclusivamente as vendas geradas por terceiros através dos seus links de afiliado.'} 
        action={
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn primary" onClick={syncMercadoLivreOrders} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
              Sincronizar Vendas de Afiliado
            </button>
            <button className="outline-btn">
              <ArrowDownToLine/>Exportar relatório
            </button>
          </div>
        }
      />

      {syncStatus && (
        <div className="notice" style={{marginBottom:'1rem',borderColor:'#3483fa'}}>
          <ShieldCheck style={{color:'#3483fa'}}/>
          <div>
            <b>Mercado Livre Afiliados</b>
            <p>{syncStatus}</p>
          </div>
        </div>
      )}

      <div className="operation-metrics">
        <MiniMetric icon={<ShoppingBag/>} label="Vendas de Afiliado" value={String(ordersList.length)} detail="via link de tracking"/>
        <MiniMetric icon={<CircleDollarSign/>} label="Volume Vendido" value={`R$ ${totalValue.toFixed(2).replace('.', ',')}`} detail="em compras de clientes"/>
        <MiniMetric icon={<BadgeCheck/>} label="Comissão a Receber" value={`R$ ${totalCommission.toFixed(2).replace('.', ',')}`} detail="comissões reais"/>
        <MiniMetric icon={<Clock3/>} label="Status da conta" value={ordersList.length > 0 ? "Com conversões" : "Aguardando conversões"} detail="Mercado Livre"/>
      </div>

      <section className="panel orders-panel">
        <div className="offer-toolbar">
          <div className="table-search">
            <Search/>
            <input placeholder="Buscar venda ou produto de afiliado..."/>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>MARKETPLACE</th>
                <th>PRODUTO</th>
                <th>DATA</th>
                <th>VALOR DA COMPRA</th>
                <th>SUA COMISSÃO</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{textAlign:'center',padding:'3rem',color:'#6b7280'}}>
                    Nenhuma venda de afiliado registrada ainda. Compartilhe seus links de afiliado nos grupos para começar a receber conversões.
                  </td>
                </tr>
              ) : (
                ordersList.map(o => (
                  <tr key={o.id}>
                    <td><b>{o.id}</b></td>
                    <td>
                      <span style={{fontWeight:600,color:o.market==='Mercado Livre'?'#2563eb':undefined}}>
                        {o.market}
                      </span>
                    </td>
                    <td>{o.product}</td>
                    <td>{o.date}</td>
                    <td>{o.value}</td>
                    <td><b>{o.commission}</b></td>
                    <td>
                      <span className={`order-state ${o.status==='Confirmada'?'confirmed':''}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function AffiliateLinksPage(){
  const { offers } = useOffers();
  const [customLinks, setCustomLinks] = useState<Array<{name:string;market:string;original:string;affiliate:string;clicks:number;conversions:number}>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [tagInput, setTagInput] = useState('central-ofertas');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Combina as ofertas reais cadastradas no sistema que possuem links de afiliado com os links criados manualmente
  const allLinks = useMemo(() => {
    const offerLinks = offers.map(o => ({
      name: o.title,
      market: o.marketplace,
      original: o.originalUrl,
      affiliate: o.affiliateUrl || o.originalUrl,
      clicks: 0,
      conversions: 0
    }));

    return [...customLinks, ...offerLinks];
  }, [offers, customLinks]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      const res = await api.generateMercadoLivreLink(urlInput.trim(), tagInput.trim());
      const newEntry = {
        name: nameInput.trim() || 'Produto Mercado Livre',
        market: 'Mercado Livre',
        original: res.originalUrl,
        affiliate: res.affiliateUrl,
        clicks: 0,
        conversions: 0
      };
      setCustomLinks(prev => [newEntry, ...prev]);
      setUrlInput('');
      setNameInput('');
      setModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao gerar link');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <>
      <PageTitle 
        eyebrow="RASTREAMENTO" 
        title="Links de afiliado" 
        description="Gerencie os links de rastreamento com suas tags oficiais de comissão." 
        action={<button className="btn primary" onClick={() => setModalOpen(true)}><Plus/>Gerar novo link</button>}
      />

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModalOpen(false)}>
          <form className="offer-modal" onSubmit={handleGenerate}>
            <div className="modal-head">
              <div>
                <span className="section-kicker">CONVERSOR DE LINKS</span>
                <h2>Gerador de Link de Afiliado Mercado Livre</h2>
                <p>Insira a URL do produto para injetar automaticamente suas tags de afiliado e tracking.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}><Plus style={{transform:'rotate(45deg)'}}/></button>
            </div>
            <div className="form-grid">
              <label className="wide">
                Nome de identificação do produto
                <input required value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="Ex: iPhone 15 ou Fone Bluetooth"/>
              </label>
              <label className="wide">
                URL do produto no Mercado Livre
                <input required type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://produto.mercadolivre.com.br/..."/>
              </label>
              <label className="wide">
                Tag / SubID de Rastreamento (Opcional)
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Ex: grupo-vip-01, promo-whatsapp"/>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn primary" type="submit">Gerar Link com Tracking</button>
            </div>
          </form>
        </div>
      )}

      <section className="panel link-panel">
        {allLinks.length === 0 ? (
          <div style={{padding:'3rem 1rem',textAlign:'center',color:'#6b7280'}}>
            <Link2 size={36} style={{margin:'0 auto 0.75rem',color:'#9ca3af'}}/>
            <b>Nenhum link ativo encontrado.</b>
            <p style={{fontSize:'13px',marginTop:'4px'}}>
              Importe produtos em <b>Top Mercado Livre</b> ou clique em "Gerar novo link" para cadastrar links de afiliados.
            </p>
          </div>
        ) : (
          allLinks.map((l, idx) => (
            <div className="affiliate-link" key={idx}>
              <span><Link2/></span>
              <div style={{flex:1,minWidth:0}}>
                <b>{l.name}</b>
                <small style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#2563eb'}}>
                  {l.market} · {l.affiliate}
                </small>
              </div>
              <div><b>{l.clicks}</b><small>cliques</small></div>
              <div><b>{l.conversions}</b><small>compras</small></div>
              <button title="Copiar Link de Afiliado" onClick={() => copyToClipboard(l.affiliate)}>
                {copiedLink === l.affiliate ? <ShieldCheck style={{color:'#10b981'}}/> : <Copy/>}
              </button>
              <a href={l.affiliate} target="_blank" rel="noreferrer" title="Abrir Link" style={{color:'inherit',display:'flex',alignItems:'center'}}>
                <ExternalLink/>
              </a>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function PageTitle({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action:React.ReactNode}){return <div className="admin-title compact-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>}
function MiniMetric({icon,label,value,detail}:{icon:React.ReactNode;label:string;value:string;detail:string}){return <div className="op-metric panel"><span>{icon}</span><div><small>{label}</small><b>{value}</b><em>{detail}</em></div><ArrowUpRight/></div>}
