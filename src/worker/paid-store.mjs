import {unavailable,PaidError} from './paid-security.mjs';
// Runtime-only adapter. No fallback in-memory store can grant production access.
export function paidStore(env,dependencies={}){if(dependencies.store)return dependencies.store;if(!env.PAID_DB?.prepare||!env.PAID_DB?.batch)throw unavailable();return new D1PaidStore(env.PAID_DB);}
export class D1PaidStore {
 constructor(db){this.db=db;}
 statement(sql,...args){return this.db.prepare(sql).bind(...args);}
 async getSession(token,now){return this.statement('SELECT user_id AS userId, csrf_hash AS csrfHash FROM sessions WHERE token_hash=? AND expires_at>?',token,now).first();}
 async getGrant(userId){return this.statement("SELECT status,valid_until AS validUntil,cancel_at_period_end AS cancelAtPeriodEnd FROM subscriptions WHERE user_id=? ORDER BY CASE WHEN status IN ('active','trialing') THEN 0 ELSE 1 END, valid_until DESC LIMIT 1",userId).first();}
 async getUser(id){return this.statement('SELECT id,email,stripe_customer_id AS customerId FROM users WHERE id=?',id).first();}
 async getBetaCheckoutApproval(userId){return this.statement('SELECT approved_at AS approvedAt,revoked_at AS revokedAt FROM beta_checkout_approvals WHERE user_id=?',userId).first();}
 async cleanupUsage(policy){
  if(!policy)return;
  const items=[];
  if(policy.usageBefore!==null)items.push(this.statement('DELETE FROM usage_events WHERE timestamp<? AND success IS NOT NULL',policy.usageBefore));
  if(policy.monthBefore!==null)items.push(this.statement('DELETE FROM monthly_usage WHERE month<? AND NOT EXISTS(SELECT 1 FROM usage_events WHERE usage_events.user_id=monthly_usage.user_id AND usage_events.month=monthly_usage.month AND success IS NULL)',policy.monthBefore));
  if(items.length)await this.db.batch(items);
 }
 async setCustomer(id,customer){await this.statement('UPDATE users SET stripe_customer_id=COALESCE(stripe_customer_id,?) WHERE id=?',customer,id).run();return (await this.getUser(id)).customerId;}
 async allowEmailAttempt(emailHash,now){const hour=new Date(now).toISOString().slice(0,13);const row=await this.statement('INSERT INTO auth_attempts(email_hash,hour,count) VALUES(?,?,1) ON CONFLICT(email_hash,hour) DO UPDATE SET count=count+1 RETURNING count',emailHash,hour).first();return row.count<=3;}
 async saveChallenge(c){await this.statement('INSERT INTO auth_challenges(token_hash,browser_hash,email,expires_at) VALUES(?,?,?,?)',c.tokenHash,c.browserHash,c.email,c.expiresAt).run();}
 async revokeChallenge(tokenHash){await this.statement('DELETE FROM auth_challenges WHERE token_hash=?',tokenHash).run();}
 async cleanupExpiredAuth(now=Date.now()){
  await this.db.batch([
   this.statement('DELETE FROM auth_challenges WHERE expires_at<=?',now),
   this.statement('DELETE FROM sessions WHERE expires_at<=?',now),
   this.statement('DELETE FROM auth_attempts WHERE hour<?',new Date(now-86400000).toISOString().slice(0,13)),
   this.statement('DELETE FROM billing_locks WHERE expires_at<=?',now),
  ]);
 }
 async inspectChallenge(token,browser,now){const row=await this.statement('SELECT browser_hash AS browserHash,expires_at AS expiresAt FROM auth_challenges WHERE token_hash=?',token).first();if(!row)return 'not_found';if(row.browserHash!==browser)return 'binding_mismatch';if(row.expiresAt<=now)return 'expired';return 'eligible';}
 async consumeChallenge(token,browser,now){return this.statement('DELETE FROM auth_challenges WHERE token_hash=? AND browser_hash=? AND expires_at>? RETURNING email',token,browser,now).first();}
 async createSession(email,tokenHash,csrfHash,expiresAt,now){
  const id=crypto.randomUUID();
  await this.db.batch([
   this.statement('INSERT INTO users(id,email,created_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING',id,email,now),
   this.statement('INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at) SELECT ?,id,?,? FROM users WHERE email=?',tokenHash,csrfHash,expiresAt,email),
  ]);
 }
 async setCsrf(tokenHash,csrfHash){await this.statement('UPDATE sessions SET csrf_hash=? WHERE token_hash=?',csrfHash,tokenHash).run();}
 async logout(tokenHash){await this.statement('DELETE FROM sessions WHERE token_hash=?',tokenHash).run();}
 async customerUser(customer){return this.statement('SELECT id FROM users WHERE stripe_customer_id=?',customer).first();}
 async eventProcessed(id){return !!await this.statement('SELECT id FROM webhook_events WHERE id=?',id).first();}
 async lockCustomer(customer,owner,now){return !!await this.statement('INSERT INTO billing_locks(customer_id,owner,expires_at) VALUES(?,?,?) ON CONFLICT(customer_id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE billing_locks.expires_at<? RETURNING owner',customer,owner,now+60000,now).first();}
 async unlockCustomer(customer,owner){await this.statement('DELETE FROM billing_locks WHERE customer_id=? AND owner=?',customer,owner).run();}
 async applySubscription(event,subscription,now){
  await this.db.batch([
   this.statement('INSERT INTO webhook_events(id,processed_at) VALUES(?,?)',event,now),
   this.statement('INSERT INTO subscriptions(id,user_id,status,valid_until,cancel_at_period_end,observed_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,status=excluded.status,valid_until=excluded.valid_until,cancel_at_period_end=excluded.cancel_at_period_end,observed_at=excluded.observed_at',subscription.id,subscription.userId,subscription.status,subscription.validUntil,Number(subscription.cancelAtPeriodEnd),now),
  ]);
 }
 async markEvent(id,now){await this.statement('INSERT INTO webhook_events(id,processed_at) VALUES(?,?) ON CONFLICT(id) DO NOTHING',id,now).run();}
 async replaceSubscriptions(event,userId,subscriptions,now){
  await this.db.batch([
   this.statement('INSERT INTO webhook_events(id,processed_at) VALUES(?,?)',event,now),
   this.statement("UPDATE subscriptions SET status='ineligible',observed_at=? WHERE user_id=?",now,userId),
   ...subscriptions.map(s=>this.statement('INSERT INTO subscriptions(id,user_id,status,valid_until,cancel_at_period_end,observed_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,status=excluded.status,valid_until=excluded.valid_until,cancel_at_period_end=excluded.cancel_at_period_end,observed_at=excluded.observed_at',s.id,userId,s.status,s.validUntil,Number(s.cancelAtPeriodEnd),now)),
  ]);
 }
 async reserveUsage(record,limit){
  await this.statement('INSERT INTO monthly_usage(user_id,month) VALUES(?,?) ON CONFLICT(user_id,month) DO NOTHING',record.userId,record.month).run();
  // Batch is transactional: the event is inserted only if the same atomic quota increment succeeded.
  const results=await this.db.batch([
   this.statement('UPDATE monthly_usage SET request_count=request_count+1,unknown_cost_count=unknown_cost_count+1 WHERE user_id=? AND month=? AND (? IS NULL OR request_count<?)',record.userId,record.month,limit,limit),
   this.statement('INSERT INTO usage_events(id,user_id,timestamp,month,workflow,model) SELECT ?,?,?,?,?,? WHERE changes()=1',record.id,record.userId,record.timestamp,record.month,record.workflow,record.model),
  ]);
  if(results[0]?.meta?.changes!==1)throw new PaidError(429,'monthly_limit','Your monthly Deal Lab request allowance has been reached.');
 }
 async finishUsage(id,details){
  await this.db.batch([
   this.statement('UPDATE monthly_usage SET estimated_cost=estimated_cost+?,unknown_cost_count=unknown_cost_count-? WHERE (user_id,month)=(SELECT user_id,month FROM usage_events WHERE id=? AND success IS NULL)',details.estimatedCost??0,details.estimatedCost===null?0:1,id),
   this.statement('UPDATE usage_events SET success=?,latency_ms=?,input_tokens=?,cached_input_tokens=?,output_tokens=?,reasoning_tokens=?,total_tokens=?,estimated_cost=? WHERE id=? AND success IS NULL',Number(details.success),details.latencyMs,details.inputTokens,details.cachedInputTokens,details.outputTokens,details.reasoningTokens,details.totalTokens,details.estimatedCost,id),
  ]);
 }
 async usageSummary(userId,month){return await this.statement('SELECT request_count AS requestCount,estimated_cost AS knownEstimatedCost,unknown_cost_count AS unknownCostCount FROM monthly_usage WHERE user_id=? AND month=?',userId,month).first()||{requestCount:0,knownEstimatedCost:0,unknownCostCount:0};}
}
