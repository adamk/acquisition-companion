const root=document.querySelector<HTMLElement>('[data-paid-page]');
if(root){
 const status=root.querySelector<HTMLElement>('[data-paid-status]')!;
 const signIn=root.querySelector<HTMLFormElement>('[data-signin-form]');
 const confirm=root.querySelector<HTMLButtonElement>('[data-confirm-signin]');
 const details=root.querySelector<HTMLElement>('[data-account-details]');
 const track=(name:string,params:Record<string,string>={})=>window.acquisitionAnalytics?.track(name,params);
 if(location.pathname==='/pricing/')track('pricing_page_view');
 let csrf='',pending=false,magicToken='',billingAvailable=false;
 // Remove magic-link fragment before any asynchronous work; it is never sent in a URL request.
 if(location.pathname==='/account/'&&location.hash.startsWith('#token=')){
  const value=location.hash.slice(7);history.replaceState(null,'',location.pathname+location.search);
  if(/^[a-f0-9]{64}$/.test(value))magicToken=value;
 }
 const announce=(message:string)=>{status.textContent=message;};
 async function api(path:string,body?:Record<string,string|boolean>){
  const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Account-Request':'1',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Account access is unavailable.');return data;
 }
 async function action(work:()=>Promise<void>){
  if(pending)return;pending=true;const buttons=root!.querySelectorAll<HTMLButtonElement>('button');buttons.forEach(b=>b.disabled=true);
  try{await work();}catch(error){announce(error instanceof Error?error.message:'Account access is unavailable.');}finally{pending=false;buttons.forEach(b=>b.disabled=false);}
 }
 async function refresh(){
  const data=await api('/api/account');csrf=data.csrfToken;
  if(signIn)signIn.hidden=true;if(confirm)confirm.hidden=true;if(details)details.hidden=false;
  announce(data.entitled?'Your Deal Lab access is active.':data.subscription&&['past_due','unpaid'].includes(data.subscription.status)?'A payment problem is blocking access. Use Manage billing or contact support.':data.checkoutEligible?'Your paid-beta Checkout approval is active. Choose a subscription on the pricing page.':'Signed in. The initial paid beta is invite-only for U.S. customers. Contact support@acquisitioncompanion.com for Checkout approval.');
  const canCheckout=billingAvailable&&data.checkoutEligible===true&&!data.entitled;
  root!.querySelectorAll<HTMLElement>('[data-checkout], [data-checkout-attestation]').forEach(el=>el.hidden=!canCheckout);
  const summary=root!.querySelector<HTMLElement>('[data-subscription-summary]'),usage=root!.querySelector<HTMLElement>('[data-usage-summary]');
  if(summary)summary.textContent=data.subscription?`Subscription: ${data.subscription.status}. ${data.entitled&&data.subscription.cancelAtPeriodEnd?'Cancellation scheduled; access continues through the paid period.':''}`:'No subscription yet.';
  const portal=root!.querySelector<HTMLButtonElement>('[data-billing-portal]');if(portal)portal.hidden=!data.subscription;
  if(usage)usage.textContent=`${data.usage.requestCount} requests this month (UTC)${data.monthlyRequestLimit===null?'':` of ${data.monthlyRequestLimit}; ${Math.max(0,data.monthlyRequestLimit-data.usage.requestCount)} remaining`}. Resets at 00:00 UTC on ${new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth()+1,1)).toISOString().slice(0,10)}.`;
 }
 signIn?.addEventListener('submit',event=>{event.preventDefault();void action(async()=>{const data=await api('/api/auth/start',{email:root.querySelector<HTMLInputElement>('#account-email')!.value});announce(data.message);});});
 confirm?.addEventListener('click',()=>void action(async()=>{await api('/api/auth/confirm',{token:magicToken});magicToken='';await refresh();}));
 root.querySelector<HTMLButtonElement>('[data-logout]')?.addEventListener('click',()=>void action(async()=>{await api('/api/auth/logout',{});csrf='';if(details)details.hidden=true;if(signIn)signIn.hidden=false;announce('Signed out.');}));
 root.querySelector<HTMLButtonElement>('[data-billing-portal]')?.addEventListener('click',()=>void action(async()=>{const data=await api('/api/billing/portal',{});redirect(data.url,'billing.stripe.com');}));
 function redirect(value:string,host:string){const url=new URL(value);if(url.protocol!=='https:'||url.hostname!==host||url.username||url.password)throw new Error('Billing access is unavailable.');location.assign(url.href);}
 root.querySelectorAll<HTMLButtonElement>('[data-checkout]').forEach(button=>button.addEventListener('click',()=>void action(async()=>{await refresh();const usCustomerAttested=root.querySelector<HTMLInputElement>('[data-us-attestation]')?.checked===true;if(!usCustomerAttested)throw new Error('Confirm that you are a U.S. customer before subscribing to the paid beta.');const data=await api('/api/billing/checkout',{plan:button.dataset.checkout!,usCustomerAttested});track('checkout_started',{plan:button.dataset.checkout!});redirect(data.url,'checkout.stripe.com');})));
 void action(async()=>{
  const data=await api('/api/billing/status');if(!data.signInAvailable&&!data.billingAvailable)return;
  if(data.signInAvailable)announce('The initial paid beta is invite-only for U.S. customers. Sign in to check your Checkout approval.');
  root.querySelectorAll<HTMLElement>('[data-account-link]').forEach(el=>el.hidden=false);
  billingAvailable=data.billingAvailable===true;
  if(location.pathname==='/pricing/')try{await refresh();}catch{/* Anonymous visitors can inspect public prices. */}
  if(signIn){if(magicToken&&data.signInAvailable){if(confirm)confirm.hidden=false;announce('Confirm this sign-in link in the browser where you requested it.');}else if(data.signInAvailable){signIn.hidden=false;try{await refresh();}catch{/* Unauthenticated is a normal first visit. */}}else announce('Account access is being configured.');}
 });
}
