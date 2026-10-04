import {paidStore} from './paid-store.mjs';
import {PaidError,unavailable,randomToken,hash,secureCookie,cookieValue,validToken,reply} from './paid-security.mjs';
import {mailerAvailable,deliveryDeadline} from './auth-mailer.mjs';
import {newAuthDiagnosticId,reportAuthDiagnostic} from './paid-auth-diagnostics.mjs';
export const invalidLinkMessage='This sign-in link could not be confirmed. Open it in the same browser that requested it, or request a new link.';
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
 const payload={email,url:`${new URL(request.url).origin}/account/?signin=1#token=${token}`};
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
 const diagnosticId=body?.diagnosticId||newAuthDiagnosticId();
 if(env.AUTH_SIGNIN_ENABLED!=='true')throw new PaidError(400,'invalid_link',invalidLinkMessage);
 if(!validToken(body?.token)){reportAuthDiagnostic('auth_confirm_invalid_request',diagnosticId,dependencies);throw new PaidError(400,'invalid_link',invalidLinkMessage);}
 if(!validToken(browser)){reportAuthDiagnostic('auth_confirm_missing_binding',diagnosticId,dependencies);throw new PaidError(400,'invalid_link',invalidLinkMessage);}
 const store=paidStore(env,dependencies),now=Date.now(),tokenHash=await hash(body.token),browserHash=await hash(browser);
 let before='unknown';
 try{if(typeof store.inspectChallenge==='function')before=await store.inspectChallenge(tokenHash,browserHash,now);}catch{/* The atomic consume remains authoritative if diagnostic lookup is unavailable. */}
 let challenge;
 try{challenge=await store.consumeChallenge(tokenHash,browserHash,now);}catch{reportAuthDiagnostic('auth_confirm_storage_failure',diagnosticId,dependencies);throw new PaidError(400,'invalid_link',invalidLinkMessage);}
 if(!challenge){
  let after='unknown';try{if(typeof store.inspectChallenge==='function')after=await store.inspectChallenge(tokenHash,browserHash,now);}catch{reportAuthDiagnostic('auth_confirm_storage_failure',diagnosticId,dependencies);}
  const reason=before==='eligible'&&after==='not_found'?'auth_confirm_consume_conflict':after==='binding_mismatch'?'auth_confirm_binding_mismatch':after==='expired'?'auth_confirm_expired':'auth_confirm_challenge_not_found';
  reportAuthDiagnostic(reason,diagnosticId,dependencies);throw new PaidError(400,'invalid_link',invalidLinkMessage);
 }
 const token=randomToken(),csrf=randomToken();
 try{await store.createSession(challenge.email,await hash(token),await hash(csrf),now+7*86400000,now);}catch{reportAuthDiagnostic('auth_confirm_session_failure',diagnosticId,dependencies);throw new PaidError(400,'invalid_link',invalidLinkMessage);}
 const response=reply(200,{signedIn:true,csrfToken:csrf},{'Set-Cookie':secureCookie('__Host-ac-session',token,7*86400)});
 response.headers.append('Set-Cookie',secureCookie('__Host-ac-login','',0));reportAuthDiagnostic('auth_confirm_success',diagnosticId,dependencies);return response;
}
export async function requireCsrf(request,session){
 const token=request.headers.get('x-csrf-token');
 if(!validToken(token)||await hash(token)!==session?.csrfHash)throw new PaidError(403,'csrf_required','Refresh your account page and try again.');
}
