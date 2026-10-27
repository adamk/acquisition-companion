import {validateDeal} from './deal-workspace.mjs';

const DATABASE='acquisition-companion-deal-workspace-v1';
const FAILURE='Local Deal Workspace storage is unavailable or contains unsupported data. Your unsaved deal can stay in this page. Try again or delete local Deal Workspace data.';
const validNamespace=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(v);

// This is browser separation, not encryption or an access-control vault.
// One queue per adapter preserves save -> delete ordering. A database epoch also
// prevents an older tab's delayed writes from resurrecting globally deleted data.
export function createDealStorage(namespace,idb=globalThis.indexedDB){
 if(!validNamespace(namespace)||!idb?.open)throw new Error(FAILURE);
 let connection,opening,epoch=null,closed=false,queue=Promise.resolve();
 const generations=new Map();
 const rowKey=id=>`row:${namespace}:${id}`;
 function open(){
  if(closed)return Promise.reject(new Error(FAILURE));
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   let failed=false;
   const request=idb.open(DATABASE,1);
   request.onupgradeneeded=()=>{
    const db=request.result;
    if(!db.objectStoreNames.contains('deals'))db.createObjectStore('deals',{keyPath:'key'}).createIndex('namespace','namespace');
    if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta');
   };
   request.onerror=request.onblocked=()=>{failed=true;reject(new Error(FAILURE));};
   request.onsuccess=()=>{
    if(failed||closed){request.result.close();reject(new Error(FAILURE));return;}
    connection=request.result;connection.onversionchange=()=>connection.close();
    const tx=connection.transaction('meta','readonly'),read=tx.objectStore('meta').get('epoch');
    read.onsuccess=()=>{epoch=read.result??'initial';};
    tx.oncomplete=()=>resolve(connection);tx.onerror=tx.onabort=()=>reject(new Error(FAILURE));
   };
  });
  return opening;
 }
 function enqueue(operation){
  const pending=queue.catch(()=>{}).then(async()=>{try{return await operation(await open());}catch{throw new Error(FAILURE);}});
  queue=pending;return pending;
 }
 function transaction(db,mode,operation,{reset=false}={}){
  return new Promise((resolve,reject)=>{
   if(closed){reject(new Error(FAILURE));return;}
   const tx=db.transaction(['deals','meta'],mode),store=tx.objectStore('deals'),meta=tx.objectStore('meta');let value;
   const fail=()=>{try{tx.abort();}catch{}reject(new Error(FAILURE));};
   tx.onabort=tx.onerror=()=>reject(new Error(FAILURE));tx.oncomplete=()=>resolve(value);
   const read=meta.get('epoch');
   read.onsuccess=()=>{
    if(!reset&&(read.result??'initial')!==epoch){fail();return;}
    try{operation({store,meta,set:v=>{value=v;},fail});}catch{fail();}
   };
  });
 }
 return {
  list(){return enqueue(async db=>{
   const records=await transaction(db,'readonly',({store,meta,set})=>{const r=store.index('namespace').getAll(namespace);r.onsuccess=()=>{set(r.result);for(const record of r.result){const generation=meta.get(rowKey(record.deal?.id));generation.onsuccess=()=>generations.set(record.deal?.id,generation.result??'initial');}};});
   if(records.length>20)throw new Error(FAILURE);
   return records.map(record=>{
    const deal=validateDeal(record.deal);
    if(record.namespace!==namespace||!deal||record.key!==`${namespace}:${deal.id}`)throw new Error(FAILURE);
    return deal;
   });
  });},
  save(raw){
   const deal=validateDeal(raw);if(!deal)return Promise.reject(new Error(FAILURE));
   return enqueue(db=>transaction(db,'readwrite',({store,meta,fail})=>{
    const generation=meta.get(rowKey(deal.id));
    generation.onsuccess=()=>{
     const current=generation.result??'initial';
     if(generations.has(deal.id)&&generations.get(deal.id)!==current){fail();return;}
     generations.set(deal.id,current);
     const count=store.index('namespace').count(namespace);
     count.onsuccess=()=>{
      const existing=store.get(`${namespace}:${deal.id}`);
      existing.onsuccess=()=>{if(count.result>=20&&!existing.result){fail();return;}store.put({key:`${namespace}:${deal.id}`,namespace,deal});};
     };
    };
   }));
  },
  remove(id){
   if(!validId(id))return Promise.reject(new Error(FAILURE));
   return enqueue(async db=>{
    const generation=crypto.randomUUID();
    await transaction(db,'readwrite',({store,meta})=>{store.delete(`${namespace}:${id}`);meta.put(generation,rowKey(id));});
    generations.set(id,generation);
   });
  },
  clearAll(){return enqueue(async db=>{
   const next=crypto.randomUUID();
   await transaction(db,'readwrite',({store,meta})=>{store.clear();meta.clear();meta.put(next,'epoch');},{reset:true});
   epoch=next;generations.clear();
   if(typeof BroadcastChannel==='function'){const channel=new BroadcastChannel('ac-deal-workspace-reset-v1');channel.postMessage('clear');channel.close();}
  });},
  close(){closed=true;connection?.close();},
 };
}
