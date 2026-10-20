import { promises as fs } from 'node:fs'; import path from 'node:path'; import { randomUUID } from 'node:crypto'; import type { Offer, OfferInput } from '@central/shared'; import { demoOffers } from '../data/demo.js'; import { mercadoLivreService } from './mercadolivre.service.js';
const dataFile=path.resolve(process.cwd(),'dev-data.json'); let memory:Offer[]|null=null;
async function load(){if(memory)return memory; try{memory=JSON.parse(await fs.readFile(dataFile,'utf8')) as Offer[];}catch{memory=structuredClone(demoOffers);} return memory;}
async function save(data:Offer[]){memory=data;if(process.env.NODE_ENV!=='production')await fs.writeFile(dataFile,JSON.stringify(data,null,2));}
export const offerService={
 async list(query?:{status?:string;marketplace?:string}){let rows=await load(); if(query?.status)rows=rows.filter(x=>x.status===query.status);if(query?.marketplace)rows=rows.filter(x=>x.marketplace===query.marketplace);return [...rows].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));},
 async get(id:string){return (await load()).find(x=>x.id===id)},
 async create(input:OfferInput){
   let finalAffiliateUrl = input.affiliateUrl;
   if ((!finalAffiliateUrl || finalAffiliateUrl === input.originalUrl || !finalAffiliateUrl.includes('matt_tool')) && input.marketplace === 'Mercado Livre') {
     finalAffiliateUrl = mercadoLivreService.generateAffiliateLink(input.originalUrl, 'central-ofertas');
   }
   const now=new Date().toISOString();
   const item:Offer={...input,affiliateUrl:finalAffiliateUrl,id:randomUUID(),createdAt:now,updatedAt:now};
   const rows=await load();
   await save([item,...rows]);
   return item;
 },
 async update(id:string,input:Partial<OfferInput>){
   const rows=await load();
   const i=rows.findIndex(x=>x.id===id);
   if(i<0)return;
   let finalAffiliateUrl = input.affiliateUrl;
   if (input.originalUrl && (!finalAffiliateUrl || finalAffiliateUrl === input.originalUrl || !finalAffiliateUrl.includes('matt_tool')) && (input.marketplace === 'Mercado Livre' || rows[i].marketplace === 'Mercado Livre')) {
     finalAffiliateUrl = mercadoLivreService.generateAffiliateLink(input.originalUrl, 'central-ofertas');
   }
   rows[i]={...rows[i],...input,...(finalAffiliateUrl?{affiliateUrl:finalAffiliateUrl}:{}),updatedAt:new Date().toISOString()};
   await save(rows);
   return rows[i];
 },
 async remove(id:string){const rows=await load();const next=rows.filter(x=>x.id!==id);if(next.length===rows.length)return false;await save(next);return true;}
};
