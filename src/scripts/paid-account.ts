const root=document.querySelector<HTMLElement>('[data-paid-page]');
if(root){
 const status=root.querySelector<HTMLElement>('[data-paid-status]')!;
 const signIn=root.querySelector<HTMLFormElement>('[data-signin-form]');
 const confirm=root.querySelector<HTMLButtonElement>('[data-confirm-signin]');
 const details=root.querySelector<HTMLElement>('[data-account-details]');
 const track=(name:string,params:Record<string,string>={})=>window.acquisitionAnalytics?.track(name,params);
 if(location.pathname==='/pricing/')track('pricing_page_view');
 let csrf='',pending=false,magicToken='',billingAvailable=false,authDiagnosticId='',magicLinkState='';
 const invalidLinkMessage='This sign-in link could not be confirmed. Open it in the same browser that requested it, or request a new link.';
 // The query marker is non-secret; the token remains in the fragment and is removed before any asynchronous work.
 if(location.pathname==='/account/'){
  const marked=new URLSearchParams(location.search).getAll('signin').includes('1'),hasTokenFragment=location.hash.startsWith('#token=');
  if(marked||hasTokenFragment){
   const value=hasTokenFragment?location.hash.slice(7):'';
   history.replaceState(null,'',location.pathname);
   try{authDiagnosticId=crypto.randomUUID();}catch{/* Confirmation remains available if diagnostic IDs are unavailable. */}
   if(hasTokenFragment&&/^[a-f0-9]{64}$/.test(value)){magicToken=value;magicLinkState='present';}
   else magicLinkState=location.hash?'invalid':'missing';
  }
 }
 const announce=(message:string)=>{status.textContent=message;};
 async function recordAuthDiagnostic(reason:'auth_fragment_missing'|'auth_fragment_invalid'|'auth_fragment_present'|'auth_confirm_client_attempt'){
  if(!authDiagnosticId)return;
  try{await fetch('/api/auth/diagnostic',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason,diagnosticId:authDiagnosticId}),signal:AbortSignal.timeout(4000)});}catch{/* Diagnostics cannot block or change sign-in. */}
 }
 if(magicLinkState==='present')void recordAuthDiagnostic('auth_fragment_present');
 async function api(path:string,body?:Record<string,string|boolean>,extraHeaders:Record<string,string>={}){
  const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Account-Request':'1',...(csrf?{'X-CSRF-Token':csrf}:{}),...extraHeaders},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Account access is unavailable.');return data;
 }
 async function action(work:()=>Promise<void>){
  if(pending)return;pending=true;const buttons=root!.querySelectorAll<HTMLButtonElement>('button');buttons.forEach(b=>b.disabled=true);
  try{await work();}catch(error){announce(error instanceof Error?error.message:'Account access is unavailable.');}finally{pending=false;buttons.forEach(b=>b.disabled=false);}
 }
 async function refresh(){
  const data=await api('/api/account');csrf=data.csrfToken;
  if(signIn)signIn.hidden=true;if(confirm)confirm.hidden=true;if(details)details.hidden=false;
  const entitled=data.entitled===true,checkoutEligible=data.checkoutEligible===true;
  announce(entitled?'Your Deal Lab access is active.':data.subscription&&['past_due','unpaid'].includes(data.subscription.status)?'A payment problem is blocking Deal Lab access. Use Manage billing or contact support.':checkoutEligible?'Checkout approval is active. AI access starts only after a subscription becomes active.':'Signed in.');
  const hasBillingRelationship=Boolean(data.subscription);
  const canCheckout=billingAvailable&&data.checkoutEligible===true&&!data.entitled&&!hasBillingRelationship;
  root!.querySelectorAll<HTMLElement>('[data-checkout], [data-checkout-attestation]').forEach(el=>el.hidden=!canCheckout);
  const summary=root!.querySelector<HTMLElement>('[data-subscription-summary]'),usage=root!.querySelector<HTMLElement>('[data-usage-summary]'),usagePanel=root!.querySelector<HTMLElement>('[data-entitled-usage]');
  if(summary){
   if(entitled&&data.subscription?.cancelAtPeriodEnd){
    const periodEnd=Number(data.subscription.accessUntil),date=Number.isFinite(periodEnd)?new Date(periodEnd):null;
    const paidThrough=date&&!Number.isNaN(date.valueOf())?date.toLocaleDateString('en-US',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'}):null;
    summary.textContent=paidThrough?`Active subscription. Cancels on ${paidThrough}; Deal Lab access continues through that date.`:'Active subscription. Cancellation is scheduled; Deal Lab access continues through the paid period.';
   }else summary.textContent=entitled?'Active Deal Lab subscription.':'No active Deal Lab subscription.';
  }
  const portal=root!.querySelector<HTMLButtonElement>('[data-billing-portal]');if(portal)portal.hidden=!hasBillingRelationship;
  const subscriptionOptions=root!.querySelector<HTMLAnchorElement>('[data-subscription-options]');if(subscriptionOptions)subscriptionOptions.hidden=entitled||hasBillingRelationship;
  if(usagePanel)usagePanel.hidden=!entitled;
  if(usage&&entitled){
   const limit=Number.isSafeInteger(data.monthlyRequestLimit)&&data.monthlyRequestLimit>=0?data.monthlyRequestLimit:null;
   const allowance=limit===null?'':` of ${limit}; ${Math.max(0,limit-data.usage.requestCount)} remaining`;
   usage.textContent=`${data.usage.requestCount} requests this month (UTC)${allowance}. Resets at 00:00 UTC on ${new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth()+1,1)).toISOString().slice(0,10)}.`;
  }
  const betaRequest=root!.querySelector<HTMLElement>('[data-beta-request]'),betaApproved=root!.querySelector<HTMLElement>('[data-beta-approved]');
  if(betaRequest)betaRequest.hidden=entitled||checkoutEligible||hasBillingRelationship;
  if(betaApproved)betaApproved.hidden=entitled||!checkoutEligible||hasBillingRelationship;
  const pricingRequest=root!.querySelector<HTMLElement>('[data-pricing-beta-request]');if(pricingRequest)pricingRequest.hidden=entitled||checkoutEligible||hasBillingRelationship;
  root!.querySelectorAll<HTMLAnchorElement>('[data-account-link]').forEach(link=>{link.textContent=entitled||hasBillingRelationship?'Account · Manage billing':'Account';});
 }
 signIn?.addEventListener('submit',event=>{event.preventDefault();void action(async()=>{const data=await api('/api/auth/start',{email:root.querySelector<HTMLInputElement>('#account-email')!.value});announce(data.message);});});
 confirm?.addEventListener('click',()=>void action(async()=>{await recordAuthDiagnostic('auth_confirm_client_attempt');await api('/api/auth/confirm',{token:magicToken},authDiagnosticId?{'X-Auth-Diagnostic-ID':authDiagnosticId}:{});magicToken='';await refresh();}));
 root.querySelector<HTMLButtonElement>('[data-logout]')?.addEventListener('click',()=>void action(async()=>{await api('/api/auth/logout',{});csrf='';if(details)details.hidden=true;if(signIn)signIn.hidden=false;announce('Signed out.');}));
 root.querySelector<HTMLButtonElement>('[data-billing-portal]')?.addEventListener('click',()=>void action(async()=>{const data=await api('/api/billing/portal',{});redirect(data.url,'billing.stripe.com');}));
 function redirect(value:string,host:string){const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==host||url.username||url.password)throw new Error('Billing access is unavailable.');location.assign(url.href);}
 root.querySelectorAll<HTMLButtonElement>('[data-checkout]').forEach(button=>button.addEventListener('click',()=>void action(async()=>{await refresh();const usCustomerAttested=root.querySelector<HTMLInputElement>('[data-us-attestation]')?.checked===true;if(!usCustomerAttested)throw new Error('Confirm that you are a U.S. customer before subscribing to the paid beta.');const data=await api('/api/billing/checkout',{plan:button.dataset.checkout!,usCustomerAttested});track('checkout_started',{plan:button.dataset.checkout!});redirect(data.url,'checkout.stripe.com');})));
 void action(async()=>{
  if(signIn&&['missing','invalid'].includes(magicLinkState)){
   announce(invalidLinkMessage);void recordAuthDiagnostic(magicLinkState==='missing'?'auth_fragment_missing':'auth_fragment_invalid');return;
  }
  const data=await api('/api/billing/status');if(!data.signInAvailable&&!data.billingAvailable){if(location.pathname==='/pricing/')announce('Subscriptions are not open right now. The core course remains free, and current AI access is unchanged.');return;}
  if(data.signInAvailable)announce('Sign in to check your U.S. beta Checkout approval.');
  root.querySelectorAll<HTMLElement>('[data-account-link]').forEach(el=>el.hidden=false);
  billingAvailable=data.billingAvailable===true;
  if(location.pathname==='/pricing/')try{await refresh();}catch{root.querySelectorAll<HTMLAnchorElement>('[data-account-link]').forEach(link=>{link.textContent='Already subscribed? Sign in';});/* Anonymous visitors can inspect public prices. */}
  if(signIn){if(magicToken&&data.signInAvailable){if(confirm)confirm.hidden=false;announce('Confirm this sign-in link in the browser where you requested it.');}else if(data.signInAvailable){signIn.hidden=false;try{await refresh();}catch{/* Unauthenticated is a normal first visit. */}}else announce('Account access is being configured.');}
 });
}
