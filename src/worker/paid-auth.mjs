import {paidStore} from './paid-store.mjs';
import {PaidError,unavailable,randomToken,hash,secureCookie,cookieValue,validToken,reply} from './paid-security.mjs';
import {mailerAvailable,deliveryDeadline} from './auth-mailer.mjs';
export async function beginSignIn(request,body,env,dependencies={}){
 if(new URL(request.url).origin!==(env.ACCOUNT_ORIGIN||'https://acquisitioncompanion.com'))throw new PaidError(403,'same_origin_required','Use sign-in from the configured site.');
 if(env.AUTH_SIGNIN_ENABLED!=='true'||(!dependencies.sendEmail&&!mailerAvailable(env)))throw unavailable();
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new PaidError(400,'invalid_email','Enter a valid email address.');
 const ip=request.headers.get('cf-connecting-ip');
 if(!ip||!env.AI_IP_LIMITER?.limit)throw unavailable();
 if((await env.AI_IP_LIMITER.limit({key:`auth:${ip}`}))?.success!==true)throw new PaidError(429,'rate_limited','Please wait before requesting another sign-in link.');
 const store=paidStore(env,dependencies),now=Date.now(),browser=randomToken(),token=randomToken();
 const generic=()=>reply(200,{message:'If sign-in is available, a link will be emailed. Open it in this browser within 15 minutes.'},{'Set-Cookie':secureCookie('__Host-ac-login',browser,900)});
 if(!await store.allowEmailAttempt(await hash(email),now))return generic();
 const tokenHash=await hash(token);
 await store.saveChallenge({tokenHash,browserHash:await hash(browser),email,expiresAt:now+900000});
 const payload={email,url:`${new URL(request.url).origin}/account/#token=${token}`};
 // Mail delivery is an explicitly configured trusted service, not a browser/external SaaS SDK.
 try{
  await deliveryDeadline(async()=>{
   if(dependencies.sendEmail)return dependencies.sendEmail(payload);
   if(typeof env.AUTH_MAILER.sendSignIn==='function'){if((await env.AUTH_MAILER.sendSignIn(payload))?.accepted!==true)throw unavailable();return;}
   const sent=await env.AUTH_MAILER.fetch(new Request('https://mailer.internal/sign-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)}));
   if(!sent.ok)throw unavailable();
  });
 }catch{await store.revokeChallenge(tokenHash);throw unavailable();}
 return generic();
}
export async function finishSignIn(request,body,env,dependencies={}){
 const browser=cookieValue(request,'__Host-ac-login');
 if(env.AUTH_SIGNIN_ENABLED!=='true'||!validToken(browser)||!validToken(body.token))throw new PaidError(400,'invalid_link','This link is invalid or expired. Request a new link in this browser.');
 const store=paidStore(env,dependencies),now=Date.now();
 const challenge=await store.consumeChallenge(await hash(body.token),await hash(browser),now);
 if(!challenge)throw new PaidError(400,'invalid_link','This link is invalid or expired. Request a new link in this browser.');
 const token=randomToken(),csrf=randomToken();
 await store.createSession(challenge.email,await hash(token),await hash(csrf),now+7*86400000,now);
 const response=reply(200,{signedIn:true,csrfToken:csrf},{'Set-Cookie':secureCookie('__Host-ac-session',token,7*86400)});
 response.headers.append('Set-Cookie',secureCookie('__Host-ac-login','',0));return response;
}
export async function requireCsrf(request,session){
 const token=request.headers.get('x-csrf-token');
 if(!validToken(token)||await hash(token)!==session?.csrfHash)throw new PaidError(403,'csrf_required','Refresh your account page and try again.');
}
