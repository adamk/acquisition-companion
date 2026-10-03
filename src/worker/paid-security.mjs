export class PaidError extends Error {
 constructor(status,code,message){super(message);this.status=status;this.code=code;}
}
export const unavailable=()=>new PaidError(503,'billing_unavailable','Account access is temporarily unavailable. Please try again later.');
export function reply(status,body,headers={}){
 return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers}});
}
export function paidErrorResponse(error){return reply(error instanceof PaidError?error.status:503,{error:{code:error instanceof PaidError?error.code:'billing_unavailable',message:error instanceof PaidError?error.message:'Account access is temporarily unavailable. Please try again later.'}});}
export function sameOriginPost(request){
 if(request.method!=='POST')throw new PaidError(405,'method_not_allowed','Use POST.');
 if(request.headers.get('origin')!==new URL(request.url).origin || !['same-origin','none',null].includes(request.headers.get('sec-fetch-site')))throw new PaidError(403,'same_origin_required','Use this feature from Acquisition Companion.');
 if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('content-type')||''))throw new PaidError(415,'json_required','Send JSON.');
}
export async function readBody(request,max=4096){
 const reader=request.body?.getReader();if(!reader)throw new PaidError(400,'invalid_request','A request body is required.');
 let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new PaidError(413,'body_too_large','The request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new PaidError(400,'invalid_request','Invalid request encoding.');}
}
export async function jsonBody(request,keys){
 let body;try{body=JSON.parse(await readBody(request));}catch(error){if(error instanceof PaidError)throw error;throw new PaidError(400,'invalid_request','Invalid JSON.');}
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))throw new PaidError(400,'invalid_request','Unsupported request fields.');
 return body;
}
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function cookieValue(request,name){const matches=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(`${name}=`));return matches.length===1?matches[0].slice(name.length+1):null;}
export function secureCookie(name,value,seconds){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;}
export const validToken=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
