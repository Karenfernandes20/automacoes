import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'; import { BarChart3, Bot, CalendarClock, ChevronDown, CreditCard, Flame, LayoutDashboard, Link2, LogOut, Menu, Megaphone, Plug, Search, Settings, ShoppingBag, Tag, Users, X } from 'lucide-react'; import { Logo } from './Logo'; import { useEffect, useState } from 'react'; import { useOffers } from '../hooks/useOffers'; import { api } from '../lib/api';
const nav=[['Visão Geral','/admin',LayoutDashboard],['Top Produtos','/admin/top-produtos',Flame],['Ofertas','/admin/ofertas',Tag],['Integrações','/admin/integracoes',Plug],['Grupos WhatsApp','/admin/grupos',Users],['Pedidos e Compras','/admin/pedidos',ShoppingBag],['Comissões','/admin/comissoes',CreditCard],['Links de afiliado','/admin/links',Link2],['Agendamentos','/admin/agendamentos',CalendarClock],['Automações','/admin/automacoes',Bot],['Relatórios','/admin/relatorios',BarChart3],['Configurações','/admin/configuracoes',Settings]] as const;
export function AdminLayout(){
  const {offers}=useOffers();
  const [open,setOpen]=useState(false);
  const [userName,setUserName]=useState('Marina Costa');
  const [userRole,setUserRole]=useState('Administradora');
  const navigate=useNavigate();

  useEffect(()=>{
    api.getProfile().then(p=>{
      if(p?.name) setUserName(p.name);
      if(p?.role) setUserRole(p.role);
    }).catch(()=>{});

    const handler=(e: Event)=>{
      const detail = (e as CustomEvent).detail;
      if(detail?.name) setUserName(detail.name);
      if(detail?.role) setUserRole(detail.role);
    };
    window.addEventListener('user-profile-updated', handler);
    return ()=>window.removeEventListener('user-profile-updated', handler);
  },[]);

  const initials = userName.split(' ').map(n=>n[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || 'AD';
  const logout=()=>{localStorage.removeItem('central_token');navigate('/admin/login')};

  return <div className="admin-shell"><aside className={open?'open':''}><div className="side-logo"><Logo/><button onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([label,to,Icon])=><NavLink end={to==='/admin'} key={to} to={to} onClick={()=>setOpen(false)}><Icon size={18}/>{label}{label==='Ofertas'&&offers.length>0&&<small>{offers.length}</small>}</NavLink>)}</nav><div className="side-help"><Megaphone/><b>Central pronta para crescer</b><p>Configure seus canais quando as integrações forem liberadas.</p><button>Ver próximos passos</button></div><div className="user-mini"><div>{initials}</div><span><b>{userName}</b><small>{userRole}</small></span><button onClick={logout} title="Sair"><LogOut size={17}/></button></div></aside><main><header className="admin-top"><button className="mobile-side" onClick={()=>setOpen(true)}><Menu/></button><div className="global-search"><Search/><input placeholder="Buscar ofertas, canais..."/><kbd>⌘ K</kbd></div><div className="admin-actions"><button className="notification"><span/></button><Link to="/admin/configuracoes" className="user-top" style={{textDecoration:'none',color:'inherit'}}><span>{initials}</span><div><b>{userName}</b><small>{userRole}</small></div><ChevronDown/></Link></div></header><div className="admin-content"><Outlet/></div></main></div>
}
