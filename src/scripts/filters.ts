import {matches} from '../lib/behavior.mjs';
const form=document.querySelector<HTMLFormElement>('[data-filter-form]');
if(form){
 const rows=Array.from(document.querySelectorAll<HTMLElement>('[data-filter-item]'));
 const result=form.querySelector<HTMLElement>('[data-result-count]');
 const empty=document.querySelector<HTMLElement>('[data-empty-state]');
 const query=form.elements.namedItem('query') as HTMLInputElement;
 const category=form.elements.namedItem('category') as HTMLSelectElement|null;
 const kind=form.elements.namedItem('kind') as HTMLSelectElement|null;
 const params=new URLSearchParams(location.search);
 query.value=params.get('q') || '';
 if(category && Array.from(category.options).some(x=>x.value===params.get('category')))category.value=params.get('category')!;
 function apply(){
  let visible=0;
  rows.forEach(row=>{const show=matches({text:row.dataset.search||row.textContent||'',category:row.dataset.category||'',kind:row.dataset.kind||''},{query:query.value,category:category?.value||'all',kind:kind?.value||'all'});row.hidden=!show;if(show)visible++;});
  if(result)result.textContent=`${visible} of ${rows.length} records`;
  if(empty)empty.hidden=visible!==0;
 }
 form.addEventListener('submit',event=>event.preventDefault());
 form.addEventListener('input',apply);form.addEventListener('change',apply);
 form.addEventListener('reset',()=>{requestAnimationFrame(()=>{apply();query.focus();});});
 apply();
}
