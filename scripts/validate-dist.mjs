import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {forbiddenOutputPath} from './output-policy.mjs';
import {siteConfig} from '../src/site-config.mjs';
import {listCaseCards,getCase} from '../src/lib/ai-cases.mjs';
const root=path.resolve('dist');assert.ok(fs.existsSync(root),'Production output is missing');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)]);
const files=walk(root),html=files.filter(f=>f.endsWith('.html'));const videos=JSON.parse(fs.readFileSync('src/data/videos.json','utf8'));const fundGuides=JSON.parse(fs.readFileSync('src/data/fund-launch.json','utf8'));const sourceUrls=new Set(videos.map(v=>v.url));
const errors=[];let checkedLinks=0;const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&gt;','>');
const texts=new Map(html.map(f=>[f,fs.readFileSync(f,'utf8')]));
const searchable=files.filter(file=>/\.(?:html|js|json|txt|xml|css)$/.test(file)).map(file=>[file,fs.readFileSync(file,'utf8')]);
const publicText=searchable.map(([,text])=>text).join('\n');
for(const file of files){
 const relative=path.relative(root,file);
 if(forbiddenOutputPath(relative))errors.push(`Private/raw file in output: ${relative}`);
 if(/\.(?:html|js|json|txt|xml|css)$/.test(file)){
  const text=searchable.find(([candidate])=>candidate===file)?.[1]||'';
  if(/\/Users\/|\/root\/|\/private\/tmp\/|\/tmp\/|whisper_corpus|missing_whisper|missing_audio|Yusufa Sey - Videos|Videos_part[1-4]\.md|Whisper repetition collapsed|supporting_context|source_file|mlx_whisper_audio|native_youtube_caption|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text))errors.push(`Private metadata or transcript marker in ${relative}`);
 }
}
for(const [file,text] of texts){
 const route='/'+path.relative(root,file).replaceAll(path.sep,'/').replace(/index\.html$/,'');
 if((text.match(/<h1(?:\s|>)/g)||[]).length!==1)errors.push(`${route}: expected one h1`);
 if(!text.includes('<html lang="en"'))errors.push(`${route}: missing language`);
 if(!/<title>[^<]+<\/title>/.test(text))errors.push(`${route}: missing title`);
 if(siteConfig.canonicalDomain && !route.endsWith('404.html')){
  const expected=new URL(route,siteConfig.canonicalDomain).href;
  if(!text.includes(`<link rel="canonical" href="${expected}"`))errors.push(`${route}: missing production canonical`);
  if(!text.includes(`<meta property="og:url" content="${expected}"`))errors.push(`${route}: missing production OpenGraph URL`);
 }
 for(const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
  const value=decode(match[1]);if(!value||/^(mailto:|tel:|data:|javascript:)/.test(value))continue;
  if(value.startsWith('https://www.youtube.com/watch?')){if(!sourceUrls.has(value))errors.push(`${route}: unrecognized YouTube URL ${value}`);continue;}
  if(/^(https?:)?\/\//.test(value))continue;
  const url=new URL(value,'https://local.invalid'+route);const pathname=decodeURIComponent(url.pathname);let target=path.join(root,pathname);
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  if(!fs.existsSync(target)){errors.push(`${route}: broken ${value}`);continue;}
  checkedLinks++;
  if(url.hash && target.endsWith('.html')){
   const targetText=texts.get(target)||fs.readFileSync(target,'utf8');const id=decodeURIComponent(url.hash.slice(1));
   if(!new RegExp(`\\bid=["']${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(targetText))errors.push(`${route}: missing anchor ${value}`);
  }
 }
}
for(const v of videos)assert.ok(fs.existsSync(path.join(root,'sources/yusufa-sey',v.id,'index.html')),`Source route missing: ${v.id}`);
for(const g of fundGuides)assert.ok(fs.existsSync(path.join(root,'sources/fund-launch',g.id,'index.html')),`Fund Launch route missing: ${g.id}`);
for(const file of files)assert.ok(!/(?:independent-sponsor-fund|private-credit-fund|direct-lending-fund|mezzanine-fund)\.html$/.test(file),'Raw Fund Launch page in output');
assert.ok(fs.existsSync(path.join(root,'pagefind/pagefind.js')),'Pagefind index missing');
assert.ok(fs.existsSync(path.join(root,'sitemap.xml')),'Sitemap missing');
assert.ok(fs.existsSync(path.join(root,'robots.txt')),'Robots missing');
if(siteConfig.canonicalDomain){
 const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
 const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 assert.ok(robots.includes(`Sitemap: ${siteConfig.canonicalDomain}/sitemap.xml`),'Production robots sitemap missing');
 assert.ok(sitemap.includes(`<loc>${siteConfig.canonicalDomain}/</loc>`),'Production sitemap apex missing');
 assert.ok(!sitemap.includes('www.acquisitioncompanion.com'),'WWW must not be canonical');
}
const aiPage=path.join(root,'ai/index.html');assert.ok(fs.existsSync(aiPage),'AI Deal Lab page is missing');
const aiHtml=fs.readFileSync(aiPage,'utf8');for(const phrase of ['AI Deal Lab','Ask the Course','Deal Lab','IC Challenge','Practice with fictional deals','/privacy/#ai-deal-lab'])assert.ok(aiHtml.includes(phrase),`AI page must include ${phrase}`);
for(const card of listCaseCards())assert.ok(aiHtml.includes(card.id),`AI page case card missing: ${card.id}`);
const excludedCaseText=[];
for(const card of listCaseCards()){
 const scenario=getCase(card.id);
 excludedCaseText.push(...scenario.stages.slice(1).flatMap(stage=>stage.facts.map(fact=>fact.value)),...scenario.rubric.map(item=>item.guidance));
}
for(const value of excludedCaseText)if(value&&publicText.includes(value))errors.push('Unrevealed case facts or instructor rubric leaked into the public static output');
for(const name of ['OPENAI_API_KEY','OPENAI_VECTOR_STORE_ID','TURNSTILE_SECRET_KEY']){
 const value=process.env[name];if(typeof value==='string'&&value.length>=12&&!/replace|placeholder|test-only/i.test(value)&&publicText.includes(value))errors.push(`Runtime secret ${name} leaked into the public output`);
}
for(const marker of ['api.openai.com/v1/responses','sk-proj-','sk-live-'])if(publicText.includes(marker))errors.push(`Server-only AI marker appeared in the static output: ${marker}`);
assert.equal(files.some(file=>file.endsWith('.map')),false,'Source maps must not be published');
assert.equal(errors.length,0,errors.slice(0,35).join('\n'));
const result={pages:html.length,files:files.length,internalLinksChecked:checkedLinks,sourceVideos:videos.length,fundGuides:fundGuides.length,privacyScan:'passed',linkScan:'passed'};
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/dist-validation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
