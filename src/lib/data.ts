import videoData from '../data/videos.json';
import evidenceData from '../data/evidence.json';
import numberData from '../data/numbers.json';
import providerData from '../data/providers.json';
import moduleData from '../data/modules.json';
export interface Video {id:string;title:string;url:string;collection:string;summary:string;topics:string[];usefulPE:boolean;usefulDebt:boolean;limited:boolean;}
export interface Evidence {id:string;label:string;type:string;confidence:string;videoIds:string[];topics:string[];}
export interface NumberRecord {id:string;metric:string;value:string;context:string;kind:string;confidence:string;caution:string;videoIds:string[];topics:string[];category:string;}
export interface Provider {id:string;name:string;type:string;role:string;context:string;caution:string;confidence:string;videoIds:string[];topics:string[];status:string;}
export const videos=videoData as Video[];
export const evidence=evidenceData as Evidence[];
export const numbers=numberData as NumberRecord[];
export const providers=providerData as Provider[];
export const modules=moduleData as {number:number;title:string;description:string}[];
export const videoById=new Map(videos.map(x=>[x.id,x]));
export const evidenceById=new Map(evidence.map(x=>[x.id,x]));
export const label=(s:string)=>s.replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/,x=>x.toUpperCase());
export const videoPath=(id:string)=>`/sources/yusufa-sey/${id}/`;
export function forTopics<T extends {topics:string[]}>(items:T[],ids:string[]){return items.filter(x=>x.topics.some(t=>ids.includes(t)));}
