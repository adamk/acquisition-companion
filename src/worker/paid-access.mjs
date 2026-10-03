import {PaidError,unavailable,cookieValue,validToken,hash} from './paid-security.mjs';
import {paidStore} from './paid-store.mjs';
export const paywallEnabled=env=>env.AI_PAYWALL_ENABLED==='true';
// Checkout approval never participates in paid AI entitlement evaluation.
export function hasAccountCapability(feature,approval,now=Date.now()){
 return feature==='paid_beta_checkout'&&!!approval&&Number.isSafeInteger(approval.approvedAt)&&approval.approvedAt>=0&&approval.approvedAt<=now&&approval.revokedAt===null;
}
export function billingConfigured(env){
 if(env.PAID_ENVIRONMENT==='production'&&(env.BILLING_TEST_MODE!=='false'||!/^(?:sk|rk)_live_[A-Za-z0-9_]+$/.test(env.STRIPE_SECRET_KEY||'')))return false;
 return !!(env.STRIPE_SECRET_KEY&&(env.BILLING_TEST_MODE!=='true'||/^(?:sk|rk)_test_[A-Za-z0-9_]+$/.test(env.STRIPE_SECRET_KEY))&&env.STRIPE_WEBHOOK_SECRET&&/^price_[A-Za-z0-9_]+$/.test(env.STRIPE_MONTHLY_PRICE_ID||'')&&/^price_[A-Za-z0-9_]+$/.test(env.STRIPE_ANNUAL_PRICE_ID||'')&&env.STRIPE_MONTHLY_PRICE_ID!==env.STRIPE_ANNUAL_PRICE_ID);}
export function isUserEntitledTo(feature,grant,now=Date.now(),allowTrials=false){
 return feature==='ai_deal_lab'&&!!grant&&Number.isFinite(grant.validUntil)&&grant.validUntil>now&&(grant.status==='active'||(allowTrials&&grant.status==='trialing'));
}
export async function authenticatedUser(request,store){
 const token=cookieValue(request,'__Host-ac-session');
 if(!validToken(token))return null;
 return store.getSession(await hash(token),Date.now());
}
export async function requirePaidAccess(request,env,dependencies={}){
 if(!paywallEnabled(env))return null;
 try{
  if(!billingConfigured(env))throw unavailable();
  const store=paidStore(env,dependencies);
  const session=await authenticatedUser(request,store);
  if(!session)throw new PaidError(401,'login_required','Sign in to use Acquisition Companion Deal Lab.');
  const grant=await store.getGrant(session.userId);
  if(!isUserEntitledTo('ai_deal_lab',grant,Date.now(),env.AI_ALLOW_TRIALS==='true'))throw new PaidError(402,'subscription_required','A Deal Lab subscription is required.');
  return {userId:session.userId,store};
 }catch(error){if(error instanceof PaidError)throw error;throw unavailable();}
}
export function monthlyLimit(env){
 if(env.AI_MONTHLY_REQUEST_LIMIT===undefined||env.AI_MONTHLY_REQUEST_LIMIT===''){if(env.PAID_ENVIRONMENT==='production')throw unavailable();return null;}
 if(!/^\d+$/.test(String(env.AI_MONTHLY_REQUEST_LIMIT)))throw unavailable();
 const n=Number(env.AI_MONTHLY_REQUEST_LIMIT);if(!Number.isSafeInteger(n))throw unavailable();return n;
}
export function providerUsage(raw){
 const n=value=>Number.isSafeInteger(value)&&value>=0?value:null;
 return {inputTokens:n(raw?.input_tokens),cachedInputTokens:n(raw?.input_tokens_details?.cached_tokens),outputTokens:n(raw?.output_tokens),reasoningTokens:n(raw?.output_tokens_details?.reasoning_tokens),totalTokens:n(raw?.total_tokens)};
}
export function estimatedCost(env,model,usage){
 let prices;try{prices=JSON.parse(env.AI_MODEL_PRICING_JSON||'{}')[model];}catch{return null;}
 if(!prices||usage.inputTokens===null||usage.outputTokens===null||!Number.isFinite(usage.inputTokens)||!Number.isFinite(usage.outputTokens))return null;
 const rates=[prices.inputPerMillion,prices.cachedInputPerMillion??prices.inputPerMillion,prices.outputPerMillion];
 if(rates.some(n=>!Number.isFinite(n)||n<0))return null;
 const cached=Math.min(usage.cachedInputTokens??0,usage.inputTokens);
 return Number(((usage.inputTokens-cached)*rates[0]/1e6+cached*rates[1]/1e6+usage.outputTokens*rates[2]/1e6).toFixed(9));
}
