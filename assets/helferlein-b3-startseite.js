/* B3 Helferlein homepage UI: category filters and global theme only.
   Never writes, queries or changes tool data, Supabase data, authentication or backups. */
(()=>{
'use strict';
const THEME_KEY='helferlein_ui_theme_v1';
const RECENT_KEY='helferlein_recent_tools_v1';
const readRecent=()=>{try{const v=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'&&/^[a-z0-9-]+$/.test(x)).slice(0,4):[]}catch{return []}};
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
 const cards=[...document.querySelectorAll('#toolsGrid .tool-card')];
 const visible=cards.filter(c=>c.style.display!=='none').length;
 const counter=document.getElementById('b3-result-count');
 if(counter)counter.textContent=visible+' von '+cards.length+' Tools';
 const clear=document.getElementById('b3-clear-search');
 const search=document.getElementById('searchBox');
 if(clear)clear.hidden=!search?.value;
}
function init(){
 const toolGrid=document.getElementById('toolsGrid');
 const recentSection=document.createElement('section');
 recentSection.id='b3-recent-section';recentSection.className='hidden space-y-3';
 recentSection.setAttribute('aria-label','Zuletzt verwendete Tools');
 recentSection.innerHTML='<h2 class="text-xs font-bold text-sky-700 uppercase tracking-wider">🕘 Zuletzt verwendet</h2><div id="b3-recent-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>';
 const discovery=document.getElementById('toolDiscovery');
 if(discovery?.parentElement)discovery.parentElement.insertBefore(recentSection,discovery);
 function showRecent(){
  const grid=document.getElementById('b3-recent-grid');if(!grid||!toolGrid)return;
  grid.replaceChildren();
  readRecent().forEach(id=>{
   const card=[...toolGrid.querySelectorAll('.tool-card')].find(c=>c.dataset.id===id);
   if(!card)return;
   const clone=card.cloneNode(true);clone.style.display='flex';
   const favorite=clone.querySelector('.fav-btn');if(favorite)favorite.remove();
   grid.appendChild(clone);
  });
  recentSection.classList.toggle('hidden',!grid.children.length);
 }
 toolGrid?.addEventListener('click',event=>{
  if(event.target.closest('.fav-btn'))return;
  const link=event.target.closest('a[href]');
  const card=link?.closest('.tool-card[data-id]');
  if(!card)return;
  const id=card.dataset.id;
  try{localStorage.setItem(RECENT_KEY,JSON.stringify([id,...readRecent().filter(x=>x!==id)].slice(0,4)))}catch{return}
  showRecent();
 });
 showRecent();
 document.body.classList.add('b3-home');
 const picker=document.getElementById('b3-hub-theme');
 if(picker){
  picker.value=theme;
  picker.addEventListener('change',()=>{
   theme=allowed.includes(picker.value)?picker.value:'auto';
   try{localStorage.setItem(THEME_KEY,theme)}catch{console.warn('Designmodus konnte nicht gespeichert werden.')}
   applyTheme();
  });
 }
 const filters=[...document.querySelectorAll('[data-b3-category-filter]')];
 filters.forEach(btn=>btn.addEventListener('click',()=>{
  filters.forEach(other=>other.setAttribute('aria-pressed',String(other===btn)));
  if(typeof window.filterTools==='function')window.filterTools();
  refreshCount();
 }));
 const search=document.getElementById('searchBox');
 if(search){
  const wrap=search.closest('.b3-search-wrap');
  if(wrap&&!document.getElementById('b3-clear-search')){
   const clear=document.createElement('button');
   clear.type='button';clear.id='b3-clear-search';
   clear.className='b3-clear-search';clear.textContent='Löschen';
   clear.setAttribute('aria-label','Suche löschen');
   clear.hidden=true;
   clear.addEventListener('click',()=>{search.value='';window.filterTools?.();refreshCount();search.focus()});
   wrap.appendChild(clear);
  }
  search.addEventListener('input',refreshCount);
  search.addEventListener('search',()=>{window.filterTools?.();refreshCount()});
  search.setAttribute('aria-keyshortcuts','/');
  search.setAttribute('spellcheck','false');
  search.setAttribute('aria-describedby','b3-search-help');
  search.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&search.value){event.preventDefault();search.value='';window.filterTools?.();refreshCount()}
  });
  document.addEventListener('keydown',event=>{
   const target=event.target;
   if(event.key==='/'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.isComposing&&
      !(target instanceof HTMLElement&&
       (target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName)))){
    event.preventDefault();search.focus();
   }
  });
 }
 const categoryList=document.querySelector('.b3-categories');
 if(categoryList)categoryList.setAttribute('aria-label','Tool-Kategorien');
 const allFilter=filters.find(btn=>btn.getAttribute('data-b3-category-filter')==='alle');
 const reset=()=>{
  if(search)search.value='';
  if(allFilter)filters.forEach(btn=>btn.setAttribute('aria-pressed',String(btn===allFilter)));
  window.filterTools?.();refreshCount();
  search?.focus();
 };
 const empty=document.getElementById('searchEmptyState');
 if(empty&&!document.getElementById('b3-reset-filters')){
  const resetButton=document.createElement('button');
  resetButton.type='button';resetButton.id='b3-reset-filters';
  resetButton.textContent='Suche und Filter zurücksetzen';
  resetButton.className='b3-reset-filters';
  resetButton.addEventListener('click',reset);
  empty.appendChild(document.createTextNode(' '));empty.appendChild(resetButton);
 }
 const help=document.createElement('span');
 help.id='b3-search-help';help.className='sr-only';
 help.textContent='Mit Schrägstrich Suche öffnen. Mehrere Wörter kombinieren. Escape löscht die Suche.';
 search?.insertAdjacentElement('afterend',help);
 if(allFilter)allFilter.textContent='Alle '+document.querySelectorAll('#toolsGrid .tool-card').length;
 if(empty)empty.setAttribute('aria-live','polite');
 applyTheme();
 if(typeof window.filterTools==='function')window.filterTools();
 refreshCount();
 prefersDark.addEventListener?.('change',applyTheme);
 window.addEventListener('storage',event=>{
  if(event.key===THEME_KEY){theme=allowed.includes(event.newValue)?event.newValue:'auto';applyTheme()}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
