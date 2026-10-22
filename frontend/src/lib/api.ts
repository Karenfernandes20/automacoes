import type { Offer, OfferInput } from '@central/shared';
const BASE=import.meta.env.VITE_API_URL||'http://localhost:3333/api';
async function request<T>(path:string,init?:RequestInit):Promise<T>{const token=localStorage.getItem('central_token');const res=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} :{}),...init?.headers}});if(!res.ok){const b=await res.json().catch(()=>({}));throw new Error(b.error||'Não foi possível concluir a operação.');}if(res.status===204)return undefined as T;const body=await res.json();return body.data;}
export const api={
  listOffers:()=>request<Offer[]>('/offers'),
  login:(email:string,password:string)=>request<{token:string;user:{name:string;email:string;role:string}}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
  createOffer:(data:OfferInput)=>request<Offer>('/offers',{method:'POST',body:JSON.stringify(data)}),
  updateOffer:(id:string,data:Partial<OfferInput>)=>request<Offer>(`/offers/${id}`,{method:'PUT',body:JSON.stringify(data)}),
  setStatus:(id:string,status:Offer['status'])=>request<Offer>(`/offers/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  deleteOffer:(id:string)=>request<void>(`/offers/${id}`,{method:'DELETE'}),
  getMercadoLivreAuthUrl:()=>request<{authUrl:string}>('/integrations/mercadolivre/auth-url'),
  getMercadoLivreStatus:()=>request<{connected:boolean;status:string;user?:{id:number;nickname:string;first_name?:string;last_name?:string};expiresAt?:string}>('/integrations/mercadolivre/status'),
  disconnectMercadoLivre:()=>request<{message:string}>('/integrations/mercadolivre/disconnect',{method:'POST'}),
  getMercadoLivreTopOffers:(category?:string)=>request<{total:number;items:Array<{keyword:string;category:string;badge:string;discount:number;price:number;oldPrice:number;sales:string;rating:number;reviews:number;imageUrl:string;url:string}>;trends:Array<{keyword:string;url:string}>}>(`/integrations/mercadolivre/top-offers${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  getMercadoLivreCategories:()=>request<Array<{id:string;name:string}>>('/integrations/mercadolivre/catalog/categories'),
  searchMercadoLivreCatalog:(params:Record<string,string|number|boolean|undefined>)=>{
    const query=new URLSearchParams();
    Object.entries(params).forEach(([key,value])=>{if(value!==undefined&&value!==''&&value!==false)query.set(key,String(value));});
    return request<{items:Array<{id:string;title:string;categoryId:string;price:number;oldPrice:number;discount:number;imageUrl:string;url:string;freeShipping:boolean;condition:string;availableQuantity:number;officialStoreName:string|null;installments:{quantity:number;amount:number;rate:number}|null}>;paging:{page:number;limit:number;total:number;accessibleTotal:number;pages:number};availableSorts:Array<{id:string;name:string}>}>(`/integrations/mercadolivre/catalog?${query}`);
  },
  parseMercadoLivreItem:(url:string)=>request<{mlbId:string;title:string;category:string;currentPrice:number;previousPrice:number;imageUrl:string;originalUrl:string;affiliateUrl:string}>('/integrations/mercadolivre/parse-item',{method:'POST',body:JSON.stringify({url})}),
  generateMercadoLivreLink:(url:string,tag?:string)=>request<{originalUrl:string;affiliateUrl:string;tag:string}>('/integrations/mercadolivre/generate-link',{method:'POST',body:JSON.stringify({url,tag})}),
  getMercadoLivreOrders:()=>request<{orders:Array<{id:string;market:string;product:string;date:string;value:string;commission:string;status:string}>;metrics:{totalOrders:number;totalSalesAmount:number;confirmedCommission:number}}>('/integrations/mercadolivre/orders'),
  getWuzapiStatus:()=>request<{connected:boolean;loggedIn:boolean;status:string;instance:string;jid:string|null;phone:string|null}>('/integrations/wuzapi/status'),
  connectWuzapi:()=>request<{success:boolean;qrCode?:string;instance?:string;error?:string}>('/integrations/wuzapi/connect',{method:'POST'}),
  disconnectWuzapi:()=>request<{success:boolean}>('/integrations/wuzapi/disconnect',{method:'POST'}),
  getWuzapiGroups:()=>request<{groups:Array<{id:string;name:string;members:number;capacity:number;status:string;messages:number;topic?:string}>}>('/integrations/wuzapi/groups'),
  getWuzapiGroupMessages:(groupId:string,limit=100)=>request<{messages:Array<{id:string;sender:string;timestamp:string;type:string;text:string;mediaUrl?:string}>}>(`/integrations/wuzapi/groups/${encodeURIComponent(groupId)}/messages?limit=${limit}`),
  getFacebookStatus:()=>request<{configured:boolean;connected:boolean;page:{id:string;name:string;category?:string}|null;pages:Array<{id:string;name:string;category?:string}>}>('/integrations/facebook/status'),
  getFacebookAuthUrl:()=>request<{authUrl:string}>('/integrations/facebook/auth-url'),
  selectFacebookPage:(pageId:string)=>request<{configured:boolean;connected:boolean;page:{id:string;name:string}|null;pages:Array<{id:string;name:string}>}>('/integrations/facebook/page',{method:'PUT',body:JSON.stringify({pageId})}),
  disconnectFacebook:()=>request<{disconnected:boolean}>('/integrations/facebook/disconnect',{method:'POST'}),
  getAutomationStatus:()=>fetch(`${BASE}/automations/status`).then(r=>r.json()) as Promise<{configured:boolean;model:string;capabilities:string[]}>,
  generateCopy:(data:{productTitle:string;category?:string;currentPrice:number;previousPrice?:number;marketplace?:string;affiliateUrl?:string;tone?:string})=>fetch(`${BASE}/automations/generate-copy`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()) as Promise<{copy:string;error?:string}>,
  generateVideoScript:(data:{productTitle:string;category?:string;currentPrice:number;marketplace?:string;affiliateUrl?:string;durationSeconds?:number})=>fetch(`${BASE}/automations/generate-video-script`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()) as Promise<{script:string;error?:string}>,
  generateVisualPrompts:(data:{productTitle:string;category?:string})=>fetch(`${BASE}/automations/generate-visual-prompts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()) as Promise<{imagePrompt:string;videoPrompt:string;error?:string}>,
  getProfile:()=>request<{id:string;name:string;email:string;role:string;updatedAt?:string}>('/auth/me'),
  updateProfile:(data:{id?:string;name?:string;email?:string;currentPassword?:string;newPassword?:string;role?:string})=>request<{id:string;name:string;email:string;role:string}>('/auth/profile',{method:'PUT',body:JSON.stringify(data)}),
  listUsers:()=>request<Array<{id:string;name:string;email:string;role:string;createdAt:string;updatedAt:string}>>('/auth/users'),
  createUser:(data:{name:string;email:string;password:string;role:string})=>request<{id:string;name:string;email:string;role:string}>('/auth/users',{method:'POST',body:JSON.stringify(data)}),
  deleteUser:(id:string)=>request<{success:boolean;message:string}>(`/auth/users/${id}`,{method:'DELETE'})
};
