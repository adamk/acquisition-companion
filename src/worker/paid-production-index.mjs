import worker from './index.mjs';
import {paidStore} from './paid-store.mjs';
import {usageRetentionCutoffs} from './paid-retention.mjs';
// Existing fetch behavior stays open with the master flag off; cleanup is inert until approved activation.
export default {
 fetch:worker.fetch,
 async scheduled(_event,env){
  const paidAiEnabled=env.AI_PAYWALL_ENABLED==='true',authEnabled=env.AUTH_SIGNIN_ENABLED==='true';
  if(!paidAiEnabled&&!authEnabled)return;
  if(env.PAID_ENVIRONMENT!=='production'||env.ACCOUNT_ORIGIN!=='https://acquisitioncompanion.com')throw Error('Production account configuration required');
  const store=paidStore(env);
  if(authEnabled||paidAiEnabled)await store.cleanupExpiredAuth();
  if(paidAiEnabled)await store.cleanupUsage(usageRetentionCutoffs(env));
 },
};
