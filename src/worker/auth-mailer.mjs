import {unavailable} from './paid-security.mjs';
import {sendSesEmail} from './ses-mailer.mjs';
import {supportEmail} from '../lib/paid-product.mjs';
const address=value=>typeof value==='string'&&value.length<=254&&/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
export async function deliveryDeadline(work,ms=10000){
 let timer;try{return await Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{timer=setTimeout(()=>reject(unavailable()),ms);})]);}catch{throw unavailable();}finally{clearTimeout(timer);}
}
export function mailerAvailable(env){return typeof env.AUTH_MAILER?.sendSignIn==='function'||typeof env.AUTH_MAILER?.fetch==='function';}
export async function sendSignInMail(payload,env,dependencies={}){
 const staging=env.AUTH_MAIL_MODE==='staging',production=env.AUTH_MAIL_MODE==='production';
 if(env.AUTH_MAIL_ENABLED!=='true'||(!staging&&!production)||(env.AUTH_MAIL_PROVIDER==='ses'?false:!env.EMAIL?.send)||!address(env.AUTH_MAIL_FROM)||!address(payload?.email))throw unavailable();
 let recipients,url,origin;
 try{recipients=JSON.parse(env.AUTH_MAIL_RECIPIENTS||'[]');url=new URL(payload.url);origin=new URL(env.AUTH_MAIL_ORIGIN);}catch{throw unavailable();}
 if(origin.protocol!=='https:'||origin.origin!==env.AUTH_MAIL_ORIGIN||origin.username||origin.password||url.origin!==origin.origin||url.pathname!=='/account/'||url.search!=='?signin=1'||url.searchParams.getAll('signin').length!==1||!/^#token=[a-f0-9]{64}$/.test(url.hash)||url.username||url.password)throw unavailable();
 if(staging&&(!Array.isArray(recipients)||!recipients.every(address)||!recipients.includes(payload.email)||['acquisitioncompanion.com','www.acquisitioncompanion.com'].includes(origin.hostname)))throw unavailable();
 if(production&&(origin.origin!=='https://acquisitioncompanion.com'||env.AUTH_MAIL_PROVIDER!=='ses'||env.AUTH_MAIL_FROM!=='signin@acquisitioncompanion.com'))throw unavailable();
 // Fixed plain-text template, no tracking, attachments, HTML, arbitrary sender or support address.
 const message={from:env.AUTH_MAIL_FROM,to:payload.email,replyTo:supportEmail,subject:staging?'Sign in to Acquisition Companion — staging':'Sign in to Acquisition Companion',text:`You requested access to Acquisition Companion${staging?"'s staging Deal Lab":' Deal Lab'}.\n\nOpen this link in the browser where you requested it:\n${url.href}\n\nThe link expires in 15 minutes and can be used once. If you did not request it, ignore this email.\n\nNeed help? ${supportEmail}`};
 const result=await deliveryDeadline(()=>env.AUTH_MAIL_PROVIDER==='ses'?sendSesEmail(message,env,dependencies):env.EMAIL.send(message),dependencies.timeoutMs??10000);
 if(typeof result?.messageId!=='string'||!result.messageId)throw unavailable();
 return {accepted:true};
}
