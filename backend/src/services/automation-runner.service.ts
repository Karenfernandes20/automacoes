import { integrationStore } from './integration-store.service.js';
import { mercadoLivreService } from './mercadolivre.service.js';
import { shopeeService } from './shopee.service.js';
import { wuzapiService } from './wuzapi.service.js';

export interface AutomationConfig {
  id: string; name: string; description?: string; active: boolean; createdAt: string;
  days: string[]; interval: number; startTime: string; endTime: string; groupIds: string[];
  message: string; productsPerRun: number; order: string; sources: string[];
  categories: string[]; negativeWords: string; noRepeatHours: number;
  shopeeVideos: boolean; shopeeOfferTypes?: string[]; lastRunAt?: string | null;
}

export interface AutomationRun {
  id: string; automationId: string; automationName: string; startedAt: string;
  finishedAt: string; status: 'success'|'partial'|'error'; sent: number; failed: number;
  productIds: string[]; error?: string;
}

type Product = { id:string; title:string; price:number; oldPrice:number; discount:number; link:string; marketplace:string };
const CONFIG_KEY = 'whatsapp_automations';
const HISTORY_KEY = 'whatsapp_automation_history';
let running = false;

function saoPauloParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('pt-BR', { timeZone:'America/Sao_Paulo', weekday:'long', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(date);
  const value = (type:string) => parts.find(part => part.type === type)?.value || '';
  const weekday = value('weekday').replace(/-feira$/i, '').replace(/^./, letter => letter.toUpperCase());
  return { weekday, time:`${value('hour')}:${value('minute')}` };
}

function formatMoney(value:number) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value); }
function renderMessage(template:string, product:Product) {
  const safeTemplate = product.oldPrice > product.price
    ? template
    : template.replace(/De\s+~?(?:R\$\s*)?\{preco_anterior\}~?\s+por\s+/gi, 'Por ');
  return safeTemplate
    .replaceAll('{produto}', product.title)
    .replaceAll('{preco}', formatMoney(product.price))
    .replaceAll('{preco_anterior}', formatMoney(product.oldPrice || product.price))
    .replaceAll('{desconto}', `${product.discount || 0}%`)
    .replaceAll('{link}', product.link);
}

async function loadProducts(config:AutomationConfig):Promise<Product[]> {
  const products:Product[] = [];
  if (config.sources.includes('Shopee')) {
    const [offers, flash] = await Promise.allSettled([
      shopeeService.getTopOffers(1, 50), shopeeService.getTopOffers(1, 50, 'oferta relâmpago')
    ]);
    for (const result of [offers, flash]) if (result.status === 'fulfilled') {
      products.push(...result.value.items.map(item => ({
        id:`shopee-${item.itemId}`, title:item.title, price:item.price, oldPrice:item.oldPrice,
        discount:item.discount, link:item.offerLink, marketplace:'Shopee'
      })));
    }
  }
  if (config.sources.includes('Mercado Livre')) {
    const catalog = await mercadoLivreService.searchCatalog({ page:1, limit:50, onlyOffers:true });
    products.push(...catalog.items.map(item => ({
      id:`ml-${item.id}`, title:item.title, price:item.price, oldPrice:item.oldPrice,
      discount:item.discount, link:mercadoLivreService.generateAffiliateLink(item.url), marketplace:'Mercado Livre'
    })));
  }
  const blocked = config.negativeWords.split(/\r?\n|,/).map(word=>word.trim().toLowerCase()).filter(Boolean);
  return products.filter((product,index,all) => all.findIndex(item=>item.id===product.id)===index)
    .filter(product => !blocked.some(word=>product.title.toLowerCase().includes(word)));
}

export const automationRunner = {
  async list():Promise<AutomationConfig[]> { return (await integrationStore.get<AutomationConfig[]>(CONFIG_KEY)) || []; },
  async history():Promise<AutomationRun[]> { return (await integrationStore.get<AutomationRun[]>(HISTORY_KEY)) || []; },
  async save(config:AutomationConfig) {
    const list = await this.list();
    const existing = list.find(item=>item.id===config.id);
    const normalized = { ...existing, ...config, lastRunAt:existing?.lastRunAt || config.lastRunAt || null };
    await integrationStore.set(CONFIG_KEY,[normalized,...list.filter(item=>item.id!==config.id)]);
    return normalized;
  },
  async remove(id:string) { const list=await this.list(); await integrationStore.set(CONFIG_KEY,list.filter(item=>item.id!==id)); },
  async setActive(id:string,active:boolean) {
    const list=await this.list(); const item=list.find(entry=>entry.id===id); if(!item)throw new Error('Automação não encontrada.');
    item.active=active; await integrationStore.set(CONFIG_KEY,list); return item;
  },
  async execute(config:AutomationConfig, force=false):Promise<AutomationRun> {
    const startedAt=new Date(); const history=await this.history();
    const recentCutoff=Date.now()-(Math.max(config.noRepeatHours||24,1)*3600000);
    const recentIds=new Set(history.filter(run=>new Date(run.startedAt).getTime()>=recentCutoff).flatMap(run=>run.productIds));
    let sent=0, failed=0; const productIds:string[]=[]; let runError='';
    try {
      const products=(await loadProducts(config)).filter(product=>!recentIds.has(product.id)).slice(0,Math.max(1,config.productsPerRun));
      if(!products.length)throw new Error('Nenhum produto novo disponível para envio.');
      let firstMessage = true;
      for(const product of products) for(const groupId of config.groupIds) {
        if (!firstMessage) await new Promise(resolve=>setTimeout(resolve,60000));
        try { await wuzapiService.sendText(groupId,renderMessage(config.message,product)); sent++; }
        catch(error){ failed++; runError=error instanceof Error?error.message:'Falha no envio'; }
        firstMessage = false;
      }
      productIds.push(...products.map(product=>product.id));
    } catch(error) { runError=error instanceof Error?error.message:'Falha na automação'; failed++; }
    const run:AutomationRun={id:crypto.randomUUID(),automationId:config.id,automationName:config.name,startedAt:startedAt.toISOString(),finishedAt:new Date().toISOString(),status:sent&&failed?'partial':sent?'success':'error',sent,failed,productIds,...(runError?{error:runError}:{})};
    await integrationStore.set(HISTORY_KEY,[run,...history].slice(0,300));
    const list=await this.list(); const item=list.find(entry=>entry.id===config.id); if(item){item.lastRunAt=new Date().toISOString();await integrationStore.set(CONFIG_KEY,list);}
    return run;
  },
  async tick() {
    if(running||!integrationStore.enabled)return; running=true;
    try {
      const now=Date.now(); const local=saoPauloParts(); const list=await this.list();
      for(const config of list) {
        if(!config.active||!config.groupIds.length||!config.days.some(day=>day.toLowerCase().startsWith(local.weekday.toLowerCase())))continue;
        if(local.time<config.startTime||local.time>config.endTime)continue;
        const last=config.lastRunAt?new Date(config.lastRunAt).getTime():0;
        if(now-last>=Math.max(config.interval,1)*60000)await this.execute(config);
      }
    } finally { running=false; }
  }
};

export function startAutomationRunner(){ setTimeout(()=>void automationRunner.tick(),5000); setInterval(()=>void automationRunner.tick(),30000); }
