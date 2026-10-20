export const MARKETPLACES = ['Shopee', 'Mercado Livre', 'Amazon', 'AliExpress', 'SHEIN', 'TikTok Shop'] as const;
export const OFFER_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED'] as const;
export const AVAILABILITY = ['AVAILABLE', 'LOW_STOCK', 'UNAVAILABLE'] as const;
export type Marketplace = (typeof MARKETPLACES)[number];
export type OfferStatus = (typeof OFFER_STATUSES)[number];
export type Availability = (typeof AVAILABILITY)[number];
export interface Offer { id:string; title:string; marketplace:Marketplace; category:string; imageUrl:string; currentPrice:number; previousPrice?:number|null; coupon?:string|null; originalUrl:string; affiliateUrl:string; verifiedAt:string; availability:Availability; status:OfferStatus; publishAt?:string|null; createdAt:string; updatedAt:string; }
export type OfferInput = Omit<Offer, 'id'|'createdAt'|'updatedAt'>;
