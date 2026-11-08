/* B3 Helferlein homepage UI: category filters and global theme only.
   Never writes, queries or changes tool data, Supabase data, authentication or backups. */
(()=>{
'use strict';
const THEME_KEY='helferlein_ui_theme_v1';
const allowed=['auto','light','dark'];
const prefersDark=window.matchMedia('(prefers-color-scheme: dark)');
const getTheme=()=>{try{const stored=localStorage.getItem(THEME_KEY);return allowed.includes(stored)?stored:'auto'}catch{return 'auto'}};
let theme=getTheme();
function applyTheme(){
 const dark=theme==='dark'||(theme==='auto'&&prefersDark.matches);
 document.body.classList.toggle('b3-dark',dark);
 document.documentElement.style.colorScheme=dark?'dark':'light';
 const selector=document.getElementById('b3-hub-theme');
 if(selector)selector.value=theme;
}
function refreshCount(){
 const visible=[...document.querySelectorAll('#toolsGrid .tool-card')].filter(c=>c.style.display!=='none').length;
 const counter=document.getElementById('b3-result-count');
 if(counter)counter.textContent=visible+' von 11 Tools';
}
function init(){
 document.body.classList.add('b3-home');
 const picker=document.getElementById('b3-hub-theme');
 if(picker){
  picker.value=theme;
  picker.addEventListener('change',()=>{
   theme=allowed.includes(picker.value)?picker.value:'auto';
   try{localStorage.setItem(THEME_KEY,theme)}catch{alert('Designmodus konnte nicht gespeichert werden.')}
   applyTheme();
  });
 }
 const filters=[...document.querySelectorAll('[data-b3-category-filter]')];
 filters.forEach(btn=>btn.addEventListener('click',()=>{
  filters.forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
  if(typeof window.filterTools==='function')window.filterTools();
  refreshCount();
 }));
 document.getElementById('searchBox')?.addEventListener('input',refreshCount);
 const categoryList=document.querySelector('.b3-categories');
 if(categoryList)categoryList.setAttribute('aria-label','Tool-Kategorien');
 applyTheme();refreshCount();
 prefersDark.addEventListener?.('change',applyTheme);
 window.addEventListener('storage',event=>{
  if(event.key===THEME_KEY){theme=allowed.includes(event.newValue)?event.newValue:'auto';applyTheme()}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
