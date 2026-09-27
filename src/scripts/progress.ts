import {readProgress,toggleProgress,progressSummary} from '../lib/behavior.mjs';
const root=document.querySelector<HTMLElement>('[data-progress-root]');
if(root){
 const ids=(root.dataset.lessonIds||'').split(',').filter(Boolean);
 const key='ma-companion-progress-v1';let completed:string[]=[];let available=true;
 try{completed=readProgress(localStorage.getItem(key),ids);localStorage.setItem(key,JSON.stringify(completed));}catch{available=false;}
 const status=document.querySelector<HTMLElement>('[data-progress-status]');
 const controls=Array.from(document.querySelectorAll<HTMLInputElement>('[data-complete-lesson]'));
 function render(){
  const summary=progressSummary(completed,ids);
  if(status)status.textContent=available?`${summary.complete} of ${summary.total} lessons complete. Saved only in this browser.`:'Progress storage is unavailable. You can still read every lesson.';
  controls.forEach(box=>{box.checked=completed.includes(box.dataset.completeLesson!);box.disabled=!available;});
  document.querySelectorAll<HTMLElement>('[data-lesson-state]').forEach(el=>{el.textContent=completed.includes(el.dataset.lessonState!)?'Complete':'';});
  const resume=document.querySelector<HTMLAnchorElement>('[data-resume]');
  if(resume){resume.href=summary.next?`/course/${summary.next}/`:'/course/';resume.textContent=summary.complete===0?'Begin the course':summary.next?'Continue learning':'Review the course';}
  document.querySelectorAll<HTMLElement>('[data-module-progress]').forEach(el=>{const moduleIds=(el.dataset.moduleLessons||'').split(',');el.textContent=`${moduleIds.filter(id=>completed.includes(id)).length}/${moduleIds.length} complete`;});
 }
 function save(){try{localStorage.setItem(key,JSON.stringify(completed));}catch{available=false;}render();}
 controls.forEach(box=>box.addEventListener('change',()=>{completed=toggleProgress(completed,box.dataset.completeLesson!,box.checked);save();if(available&&box.checked)(window as Window & {acquisitionAnalytics?:{track:(name:string,params:Record<string,string|number>)=>boolean}}).acquisitionAnalytics?.track('lesson_complete',{lesson_slug:box.dataset.completeLesson!,lesson_title:box.dataset.lessonTitle||'',module:Number(box.dataset.lessonModule||0)});}));
 document.querySelector('[data-resume]')?.addEventListener('click',()=>{
  if(completed.length || !available)return;
  const startKey='acquisition-companion-course-started';
  try{if(localStorage.getItem(startKey))return;localStorage.setItem(startKey,'1');}catch{return;}
  (window as Window & {acquisitionAnalytics?:{track:(name:string,params?:Record<string,string|number>)=>boolean}}).acquisitionAnalytics?.track('course_start');
 });
 document.querySelector('[data-reset-progress]')?.addEventListener('click',()=>{completed=[];save();});
 render();
}
