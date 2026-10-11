// Retention remains inert unless the owner-approved policy and explicit periods are configured.
export function usageRetentionCutoffs(env,now=Date.now()){
 if(env.PAID_RETENTION_POLICY_APPROVED!=='true')return null;
 const period=value=>{if(value===undefined||value==='')return null;if(!/^[1-9]\d*$/.test(String(value))||!Number.isSafeInteger(Number(value)))throw Error('Invalid approved retention period');return Number(value);};
 const days=period(env.PAID_USAGE_RETENTION_DAYS),months=period(env.PAID_MONTHLY_USAGE_RETENTION_MONTHS);
 if(days===null&&months===null)return null;
 const date=new Date(now),currentMonth=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1);
 const usageBefore=days===null?null:now-days*86400000;
 // Retain the current UTC month plus the preceding (months - 1) months.
 const monthDate=months===null?null:new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-(months-1),1));
 if(!Number.isFinite(currentMonth)||(usageBefore!==null&&!Number.isSafeInteger(usageBefore))||(monthDate&&!Number.isFinite(monthDate.getTime())))throw Error('Invalid approved retention period');
 return {usageBefore,monthBefore:monthDate?monthDate.toISOString().slice(0,7):null,currentMonth:new Date(currentMonth).toISOString().slice(0,7)};
}
