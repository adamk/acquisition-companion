import {unavailable} from './paid-security.mjs';
const bytes=value=>new TextEncoder().encode(value);
const hex=value=>Array.from(new Uint8Array(value),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',bytes(value)));
async function hmac(key,value){const imported=await crypto.subtle.importKey('raw',typeof key==='string'?bytes(key):key,{name:'HMAC',hash:'SHA-256'},false,['sign']);return crypto.subtle.sign('HMAC',imported,bytes(value));}
export async function sendSesEmail(mail,env,dependencies={}){
 if(!/^(?:us|ca|eu|ap|sa|af|me|il)-(?:[a-z]+-)*[a-z]+-\d$/.test(env.SES_REGION||'')||!env.SES_ACCESS_KEY_ID||!env.SES_SECRET_ACCESS_KEY)throw unavailable();
 let phase='signing',reported=false;
 try{
  const host=`email.${env.SES_REGION}.amazonaws.com`,path='/v2/email/outbound-emails',now=dependencies.now||new Date(),date=now.toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8);
  const body=JSON.stringify({FromEmailAddress:mail.from,...(mail.replyTo?{ReplyToAddresses:[mail.replyTo]}:{}),Destination:{ToAddresses:[mail.to]},Content:{Simple:{Subject:{Data:mail.subject,Charset:'UTF-8'},Body:{Text:{Data:mail.text,Charset:'UTF-8'}}}}});
  const headers={'Content-Type':'application/json',Host:host,'X-Amz-Date':date};
  if(env.SES_SESSION_TOKEN)headers['X-Amz-Security-Token']=env.SES_SESSION_TOKEN;
  const signed=Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v.trim()]).sort(([a],[b])=>a.localeCompare(b));
  const names=signed.map(([name])=>name).join(';'),canonical=`POST\n${path}\n\n${signed.map(([name,value])=>`${name}:${value}\n`).join('')}\n${names}\n${await digest(body)}`;
  const scope=`${day}/${env.SES_REGION}/ses/aws4_request`;
  let key=await hmac('AWS4'+env.SES_SECRET_ACCESS_KEY,day);key=await hmac(key,env.SES_REGION);key=await hmac(key,'ses');key=await hmac(key,'aws4_request');
  headers.Authorization=`AWS4-HMAC-SHA256 Credential=${env.SES_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names}, Signature=${hex(await hmac(key,`AWS4-HMAC-SHA256\n${date}\n${scope}\n${await digest(canonical)}`))}`;
  // Workers supports manual/follow, not "error". Never forward signed headers on a redirect.
  phase='fetch';const response=await (dependencies.fetcher||fetch)(`https://${host}${path}`,{method:'POST',headers,body,redirect:'manual',signal:AbortSignal.timeout(10000)});phase='response';
  if(!response.ok){
   if((env.AUTH_MAIL_MODE==='staging'||env.AUTH_MAIL_DIAGNOSTICS_ENABLED==='true')){
    let code=response.headers.get('x-amzn-errortype');
    if(!code){try{const error=await response.clone().json();code=error.__type||error.code;}catch{}}
    const metadata={type:'ses_delivery_failure',httpStatus:response.status,code:typeof code==='string'&&/^[A-Za-z0-9_.:#-]{1,128}$/.test(code)?code:null};
    (dependencies.reportFailure||((value)=>console.warn(JSON.stringify(value))))(metadata);reported=true;
   }
   throw unavailable();
  }
  const text=await response.text();if(text.length>4096)throw unavailable();const result=JSON.parse(text);
  if(typeof result.MessageId!=='string'||!result.MessageId||result.MessageId.length>256)throw unavailable();return {messageId:result.MessageId};
 }catch(error){
  if((env.AUTH_MAIL_MODE==='staging'||env.AUTH_MAIL_DIAGNOSTICS_ENABLED==='true')&&!reported)(dependencies.reportFailure||((value)=>console.warn(JSON.stringify(value))))({type:'ses_delivery_failure',httpStatus:null,code:phase+':'+(error?.name||'Error')});throw unavailable();
 }
}
