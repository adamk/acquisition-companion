/** Filters are progressive enhancement; unfiltered HTML remains available. */
export function matches(row, filters) {
  const words=(filters.query || '').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return words.every(word=>row.text.toLocaleLowerCase().includes(word)) &&
    (!filters.category || filters.category==='all' || row.category.split(' ').includes(filters.category)) &&
    (!filters.kind || filters.kind==='all' || row.kind===filters.kind);
}
export function readProgress(raw, validIds) {
  try { const value=JSON.parse(raw || '[]'); return Array.isArray(value) ? [...new Set(value.filter(x=>typeof x==='string' && validIds.includes(x)))] : []; }
  catch { return []; }
}
export function toggleProgress(completed,id,checked) { return checked ? [...new Set([...completed,id])] : completed.filter(x=>x!==id); }
export function progressSummary(completed,ids) {
  const done=ids.filter(id=>completed.includes(id));
  return {complete:done.length,total:ids.length,percent:ids.length ? Math.round(100*done.length/ids.length) : 0,next:ids.find(id=>!done.includes(id)) ?? null};
}
export function canonicalUrl(origin,path) {
  if(!origin) return null;
  const url=new URL(origin);
  if(url.protocol!=='https:' || ['localhost','127.0.0.1','0.0.0.0'].includes(url.hostname) || !['','/'].includes(url.pathname) || url.search || url.hash || url.username || url.password) throw new Error('Canonical domain must be a public HTTPS origin without a path.');
  return new URL(path,url.origin).href;
}
/** Teaching previews omit uncertain records; the qualified reference retains them.
 * @template {{confidence:string,topics:string[]}} T
 * @param {T[]} records
 * @param {string} topic
 * @param {number} limit
 * @returns {T[]}
 */
export function selectNumberPreviews(records,topic,limit=5){return records.filter(r=>r.confidence!=='low' && r.topics.includes(topic)).slice(0,limit);}
