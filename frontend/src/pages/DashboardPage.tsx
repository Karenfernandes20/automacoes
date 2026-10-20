import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ArrowUpRight, CircleDollarSign, Flame, MousePointerClick, Plus, ShoppingBag, Tag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOffers } from '../hooks/useOffers';
import { api } from '../lib/api';
import { money, date } from '../lib/format';
import { StatusBadge } from '../components/StatusBadge';

export function DashboardPage(){
  const {offers,loading}=useOffers();
  const [mlMetrics, setMlMetrics] = useState({ totalOrders: 0, totalSalesAmount: 0, confirmedCommission: 0 });
  const [mlStatus, setMlStatus] = useState<string>('Não conectada');

  useEffect(() => {
    api.getMercadoLivreStatus().then(st => {
      if (st.connected && st.user) {
        setMlStatus(`Conectada (${st.user.nickname})`);
      }
    }).catch(() => {});

    api.getMercadoLivreOrders().then(res => {
      if (res.metrics) setMlMetrics(res.metrics);
    }).catch(() => {});
  }, []);

  const totalOffers = offers.length;
  const approvedOffers = offers.filter(o => o.status === 'APPROVED' || o.status === 'PUBLISHED').length;
  const pendingOffers = offers.filter(o => o.status === 'PENDING').length;

  return <>
    <div className="admin-title">
      <div>
        <span>CENTRAL OPERACIONAL</span>
        <h1>Visão geral <em>✦</em></h1>
        <p>Acompanhe suas ofertas cadastradas, integração ativa e conversões reais.</p>
      </div>
      <div style={{display:'flex',gap:'8px'}}>
        <Link className="btn outline-btn" to="/admin/mercadolivre"><Flame size={15}/>Top Mercado Livre</Link>
        <Link className="btn primary" to="/admin/ofertas"><Plus size={15}/>Nova oferta</Link>
      </div>
    </div>

    <div className="metric-grid">
      <Metric icon={<Tag/>} label="Ofertas ativas" value={String(totalOffers)} trend={`${approvedOffers} aprovadas`} tone="purple"/>
      <Metric icon={<ShoppingBag/>} label="Vendas de Afiliado" value={String(mlMetrics.totalOrders)} trend="conversões reais" tone="green"/>
      <Metric icon={<CircleDollarSign/>} label="Comissões de Afiliado" value={money.format(mlMetrics.confirmedCommission)} trend="ganhos reais" tone="orange"/>
      <Metric icon={<MousePointerClick/>} label="Conta Mercado Livre" value={mlStatus} trend="oficial" tone="blue"/>
    </div>

    <div className="dashboard-grid">
      <section className="panel quick-panel" style={{gridColumn:'1 / -1'}}>
        <div className="panel-head">
          <div>
            <h2>Status Operacional</h2>
            <p>Acompanhamento de ofertas e comissões</p>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'1rem',padding:'0 1.25rem 1.25rem'}}>
          <Quick tone="q-purple" icon={<Tag/>} title={`${pendingOffers} ofertas aguardando aprovação`} detail="Clique para revisar na lista" to="/admin/ofertas"/>
          <Quick tone="q-green" icon={<ShoppingBag/>} title={`${mlMetrics.totalOrders} conversões de afiliado`} detail="Ver vendas atribuídas aos seus links" to="/admin/pedidos"/>
          <Quick tone="q-orange" icon={<Flame/>} title="Catálogo de Mais Vendidos" detail="Descubra e importe tendências" to="/admin/mercadolivre"/>
        </div>
      </section>
    </div>

    <section className="panel recent-panel">
      <div className="panel-head">
        <div>
          <h2>Ofertas cadastradas</h2>
          <p>Ofertas reais presentes na sua base de dados</p>
        </div>
        <Link to="/admin/ofertas">Ver todas <ArrowRight/></Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>OFERTA</th>
              <th>MARKETPLACE</th>
              <th>PREÇO</th>
              <th>STATUS</th>
              <th>ATUALIZADA</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{textAlign:'center',padding:'2rem'}}>Carregando ofertas...</td></tr>
            ) : offers.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center',padding:'2.5rem',color:'#6b7280'}}>Nenhuma oferta cadastrada ainda. Adicione uma nova oferta ou importe direto do Mercado Livre.</td></tr>
            ) : (
              offers.slice(0, 5).map(o => (
                <tr key={o.id}>
                  <td>
                    <div className="product-cell">
                      <img src={o.imageUrl} alt={o.title}/>
                      <span><b>{o.title}</b><small>{o.category}</small></span>
                    </div>
                  </td>
                  <td>{o.marketplace}</td>
                  <td><b>{money.format(o.currentPrice)}</b></td>
                  <td><StatusBadge status={o.status}/></td>
                  <td>{date(o.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  </>;
}

function Metric({icon,label,value,trend,tone}:{icon:React.ReactNode;label:string;value:string;trend:string;tone:string}){return <div className="metric"><span className={tone}>{icon}</span><small>{label}</small><div><b>{value}</b><em className="up"><ArrowUpRight/>{trend}</em></div></div>}
function Quick({tone,icon,title,detail,to}:{tone:string;icon:React.ReactNode;title:string;detail:string;to:string}){return <Link className="quick-row" to={to}><span className={tone}>{icon}</span><div><b>{title}</b><small>{detail}</small></div><ArrowRight/></Link>}
