import { Zap } from 'lucide-react'; import { Link } from 'react-router-dom';
export function Logo({light=false}:{light?:boolean}){return <Link to="/" className={`logo ${light?'logo-light':''}`}><span><Zap size={17} fill="currentColor"/></span><b>central</b><em>ofertas</em></Link>}
