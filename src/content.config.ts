import {defineCollection} from 'astro:content';
import {z} from 'astro/zod';
import {glob} from 'astro/loaders';
const provenance={evidence:z.array(z.string()).default([]),sources:z.array(z.string()).default([]),fundSources:z.array(z.string()).default([])};
const lessons=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/lessons'}),schema:z.object({
 title:z.string(),description:z.string(),module:z.number().int().min(1).max(14),order:z.number().int().min(1).max(20),minutes:z.number(),topics:z.array(z.string()).min(1),takeaway:z.string(),...provenance,
})});
const topics=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/topics'}),schema:z.object({
 title:z.string(),description:z.string(),definition:z.string(),category:z.enum(['Fundamentals','Finding deals','Understanding the numbers','Deal structure','Financing','Operating and exits']),coverage:z.enum(['substantive','introductory','limited']),related:z.array(z.string()),...provenance,
})});
const examples=defineCollection({loader:glob({pattern:'**/*.md',base:'./src/content/examples'}),schema:z.object({
 title:z.string(),description:z.string(),status:z.enum(['hypothetical','proposed','reported-completed','personal-experience','unclear']),topics:z.array(z.string()),numbers:z.array(z.string()),...provenance,
})});
export const collections={lessons,topics,examples};
