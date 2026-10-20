import type { Offer } from '@central/shared';
const labels:Record<Offer['status'],string>={DRAFT:'Rascunho',PENDING:'Em aprovação',APPROVED:'Aprovada',PUBLISHED:'Publicada',REJECTED:'Rejeitada'};
export function StatusBadge({status}:{status:Offer['status']}){return <span className={`status ${status.toLowerCase()}`}>{labels[status]}</span>}
