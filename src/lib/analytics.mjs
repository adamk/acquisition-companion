export const CONSENT_KEY='acquisition-companion-analytics-consent';
const SEARCH_TOPICS=new Set(['acquisition','asset based lending','bank debt','buy and build','capital stack','cash flow','covenants','debt service','direct lending','due diligence','earn out','equity','fund structure','independent sponsor','investors','leverage','mezzanine','private credit','seller financing','valuation','working capital']);
const AI_EVENT_KEYS={
 ai_lab_open:[],
 ai_paid_request:['mode'],
 ai_mode_select:['mode'],
 ai_question:['mode'],
 deal_lab_start:['case_id','difficulty'],
 deal_lab_complete:['case_id','difficulty','completion_status'],
 ic_challenge_start:['case_id','difficulty'],
 ic_challenge_complete:['case_id','difficulty','completion_status'],
};
const COMMERCIAL_EVENTS={pricing_page_view:[],checkout_started:['plan'],subscription_started:[],subscription_canceled:[]};
const AI_MODES=new Set(['ask_course','deal_lab','ic_challenge']);
const AI_CASES=new Set(['bluejay-field-services','aster-forge-components','ternbridge-route-logistics','two-companies-one-team']);
const AI_DIFFICULTIES=new Set(['beginner','intermediate','advanced']);

function safeAiEventParams(name,params){
 if(!(name in AI_EVENT_KEYS))return null;
 const safe={};
 for(const key of AI_EVENT_KEYS[name]){
  const value=params?.[key];
  const allowed=key==='mode'?AI_MODES.has(value):key==='case_id'?AI_CASES.has(value):key==='difficulty'?AI_DIFFICULTIES.has(value):key==='completion_status'?value==='complete':false;
  if(allowed)safe[key]=value;
 }
 return safe;
}

export function safeSearchTerm(value){
 const term=String(value||'').trim().replace(/\s+/g,' ');
 return SEARCH_TOPICS.has(term.toLowerCase())?term.toLowerCase():'';
}

export function createAnalyticsController({window,document,measurementId}){
 const enabled=/^G-[A-Z0-9]+$/.test(measurementId||'');
 let initialized=false;
 let memoryChoice=null;
 function choice(){try{const value=window.localStorage.getItem(CONSENT_KEY);return value==='granted'||value==='denied'?value:memoryChoice;}catch{return memoryChoice;}}
 function load(){
  if(!enabled || choice()!=='granted' || initialized)return false;
  if(document.querySelector('[data-acquisition-ga]')){initialized=true;return false;}
  initialized=true;
  window[`ga-disable-${measurementId}`]=false;
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());
  window.gtag('config',measurementId,{allow_google_signals:false,allow_ad_personalization_signals:false});
  const script=document.createElement('script');script.async=true;script.dataset.acquisitionGa='';
  script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
  return true;
 }
 function setChoice(value){
  if(value!=='granted'&&value!=='denied')return false;
  memoryChoice=value;
  try{window.localStorage.setItem(CONSENT_KEY,value);}catch{/* Keep the choice for this page when storage is blocked. */}
  if(value==='granted')load();
  else if(initialized)window[`ga-disable-${measurementId}`]=true;
  return true;
 }
 function track(name,params={}){
  if(!initialized || choice()!=='granted')return false;
  if(/^(?:ai_|deal_lab_|ic_challenge_)/.test(name)){
   params=safeAiEventParams(name,params);
   if(params===null)return false;
  }
  if(/^(?:pricing_|checkout_|subscription_)/.test(name)){
   if(!Object.hasOwn(COMMERCIAL_EVENTS,name))return false;
   const safe={};if(COMMERCIAL_EVENTS[name].includes('plan')&&['monthly','annual'].includes(params?.plan))safe.plan=params.plan;params=safe;
  }
  if(name==='site_search'){
   const searchTerm=safeSearchTerm(params.search_term);
   params=searchTerm?{search_term:searchTerm}:{};
  }
  window.gtag('event',name,params);return true;
 }
 return {enabled,choice,load,setChoice,track,isInitialized:()=>initialized};
}
