export const CONSENT_KEY='acquisition-companion-analytics-consent';
const SEARCH_TOPICS=new Set(['acquisition','asset based lending','bank debt','buy and build','capital stack','cash flow','covenants','debt service','direct lending','due diligence','earn out','equity','fund structure','independent sponsor','investors','leverage','mezzanine','private credit','seller financing','valuation','working capital']);

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
  if(name==='site_search'){
   const searchTerm=safeSearchTerm(params.search_term);
   params=searchTerm?{search_term:searchTerm}:{};
  }
  window.gtag('event',name,params);return true;
 }
 return {enabled,choice,load,setChoice,track,isInitialized:()=>initialized};
}
