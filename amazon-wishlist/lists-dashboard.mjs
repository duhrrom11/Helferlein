import {LIST_TEMPLATES,WISH_CATEGORIES,filterListWishes} from './list-features.mjs';
// Multi-list dashboard. Requires LISTS-SCHEMA-PROPOSAL.sql to be reviewed and applied separately.
export function mountListsDashboard(db, getUser) {
 const $=id=>document.getElementById(id);
 const root=$('listsDashboard');
 let lists=[],wishes=[],selected=null,loadedOwner=null,loadGeneration=0,itemsGeneration=0,assignedIds=new Set(),favoriteIds=new Set(),recentIds=[],listCounts=new Map(),assignedTotal=0,wishCategories={},wishMarkers={},detailWishId=null,bulkIds=new Set(),allAssignedIds=new Set(),bulkBusy=false,pendingBulk=null;
 const markerKey=id=>'helferlein-wish-markers:'+id;
 function readMarkers(id){try{const value=JSON.parse(localStorage.getItem(markerKey(id))||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([k,v])=>typeof k==='string'&&['star','later'].includes(v))):{}}catch{return {}}}
 function setMarker(wishId,marker){if(!wishes.some(w=>w.id===wishId))return;const uid=owner(),next={...wishMarkers};if(next[wishId]===marker)delete next[wishId];else next[wishId]=marker;try{localStorage.setItem(markerKey(uid),JSON.stringify(next));wishMarkers=next;renderWishCards();if(detailWishId===wishId)syncDetailMarkers();msg('Markierung in diesem Browser gespeichert.')}catch{msg('Markierung konnte nicht gespeichert werden.')}}
 function syncDetailMarkers(){for(const [id,marker,off,on] of [['wishDetailStar','star','☆ Favorit','★ Favorit'],['wishDetailLater','later','⏳ Später ansehen','✓ Für später markiert']]){const b=$(id),active=wishMarkers[detailWishId]===marker;b.setAttribute('aria-pressed',String(active));b.textContent=active?on:off}}
 const categoryKey=id=>'helferlein-wish-categories:'+id;
 function readCategories(id){try{const value=JSON.parse(localStorage.getItem(categoryKey(id))||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([k,v])=>typeof k==='string'&&WISH_CATEGORIES.some(c=>c.id===v))):{}}catch{return {}}}
 function saveCategory(){const uid=owner(),wishId=detailWishId;if(!wishId||!wishes.some(w=>w.id===wishId))return;const category=$('wishDetailCategory').value;if(category&&!WISH_CATEGORIES.some(c=>c.id===category))return;const next={...wishCategories};if(category)next[wishId]=category;else delete next[wishId];try{localStorage.setItem(categoryKey(uid),JSON.stringify(next));wishCategories=next;$('wishDetailDialog').close();renderWishCards();msg('Kategorie in diesem Browser gespeichert.')}catch{msg('Kategorie konnte in diesem Browser nicht gespeichert werden.')}}
 function openWishDetail(wish){detailWishId=wish.id;$('wishDetailHeading').textContent=wish.wishlist_products?.title||'Wunsch';$('wishDetailPriority').textContent='Priorität: '+(['','Sehr wichtig','Normal','Irgendwann'][wish.priority]||'Nicht angegeben');$('wishDetailNote').textContent=wish.note||'Keine Notiz vorhanden.';$('wishDetailDate').textContent=wish.created_at?'Hinzugefügt: '+new Date(wish.created_at).toLocaleDateString('de-DE'):'';$('wishDetailCategory').value=wishCategories[wish.id]||'';syncDetailMarkers();$('wishDetailDialog').showModal()}
 const recentKey=id=>'helferlein-wishlist-recent:'+id;
 function readRecent(id){try{const v=JSON.parse(localStorage.getItem(recentKey(id))||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,5):[]}catch{return []}}
 function recordRecent(id){recentIds=[id,...recentIds.filter(x=>x!==id)].slice(0,5);try{localStorage.setItem(recentKey(owner()),JSON.stringify(recentIds))}catch{msg('Zuletzt geöffnete Listen können nicht dauerhaft gespeichert werden.')}renderRecent()}
 function renderRecent(){const target=$('homeRecentContent');target.replaceChildren();const recent=recentIds.map(id=>lists.find(l=>l.id===id&&!l.archived)).filter(Boolean);if(!recent.length){const p=document.createElement('p');p.textContent='Öffne eine Liste, damit sie hier erscheint.';target.append(p)}for(const list of recent)target.append(button(list.icon+' '+list.title,async()=>openList(list.id)))}
 function renderProgress(){const count=wishes.length,percentage=count?Math.round(100*assignedTotal/count):0;$('assignedTotal').textContent=String(assignedTotal);$('favoritesTotal').textContent=String(lists.filter(l=>favoriteIds.has(l.id)).length);$('homeProgress').setAttribute('aria-valuenow',String(percentage));$('homeProgressFill').style.width=percentage+'%';$('homeProgressNote').textContent=count?assignedTotal+' von '+count+' geladenen Wünschen sind mindestens einer Liste zugeordnet ('+percentage+' %).':'Füge deinen ersten Wunsch hinzu, um deine Wunschwelt aufzubauen.';}
 const favoriteKey=id=>'helferlein-wishlist-favorites:'+id;
 function readFavorites(id){try{const raw=JSON.parse(localStorage.getItem(favoriteKey(id))||'[]');return new Set(Array.isArray(raw)?raw.filter(x=>typeof x==='string'):[])}catch{return new Set()}}
 function writeFavorites(id){try{localStorage.setItem(favoriteKey(id),JSON.stringify([...favoriteIds]))}catch{msg('Favoriten können in diesem Browser nicht dauerhaft gespeichert werden.')}}
 function openList(id){bulkIds.clear();selected=id;recordRecent(id);render();$('listItems').scrollIntoView({behavior:'smooth',block:'start'})}
 function renderFavorites(){const target=$('homeFavoritesContent');target.replaceChildren();const favorites=lists.filter(l=>favoriteIds.has(l.id)&&!l.archived);if(!favorites.length){const p=document.createElement('p');p.textContent='Markiere deine Lieblingslisten mit ★, um sie hier schnell zu öffnen. Favoriten werden nur in diesem Browser gespeichert.';target.append(p);return}for(const list of favorites){const b=button(list.icon+' '+list.title,async()=>openList(list.id));target.append(b)}}
 const editorSelect=$('wishListSelect');
 function syncEditor(){const previous=editorSelect.value;editorSelect.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Ohne Liste speichern';editorSelect.append(empty);for(const list of lists.filter(x=>!x.archived)){const option=document.createElement('option');option.value=list.id;option.textContent=list.icon+' '+list.title;editorSelect.append(option)}editorSelect.value=lists.some(x=>x.id===previous&&!x.archived)?previous:(lists.find(x=>x.title==='Meine Wünsche'&&!x.archived)?.id||'');editorSelect.disabled=!lists.length;}
 async function assignWish(wishId,listId,uid){if(!listId)return;const {error}=await db.from('wishlist_list_items').insert({list_id:listId,wish_id:wishId,user_id:uid});if(error)throw error;}
 function reset(){++loadGeneration;$('editListForm').hidden=true;$('editListId').value='';$('listsTotal').textContent='0';$('wishesTotal').textContent='0';loadedOwner=null;lists=[];wishes=[];selected=null;favoriteIds=new Set();recentIds=[];listCounts=new Map();assignedTotal=0;wishCategories={};wishMarkers={};detailWishId=null;$('wishDetailDialog').close();assignedIds=new Set();bulkIds.clear();allAssignedIds=new Set();bulkBusy=false;pendingBulk=null;$('bulkConfirmDialog').close();++itemsGeneration;root.hidden=true;$('listsContent').replaceChildren();$('listWishCards').replaceChildren();$('listWishCount').textContent='';$('homeFavoritesContent').replaceChildren();$('homeRecentContent').replaceChildren();renderProgress();syncEditor();}

 const msg=t=>{$('listsStatus').textContent=t};
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){msg(e.message||'Aktion fehlgeschlagen')}finally{b.disabled=false}};return b};
 const owner=()=>{const u=getUser();if(!u)throw Error('Bitte anmelden');return u.id};
 async function load(){
  if(!getUser()){reset();return}
  const generation=++loadGeneration;
  root.hidden=false;msg('Listen werden geladen …');
  const id=owner();
  const [lr,wr]=await Promise.all([
   db.from('wishlist_lists').select('id,title,description,icon,color,visibility,archived,created_at').eq('user_id',id).order('created_at',{ascending:false}),
   db.from('wishlist_wishes').select('id,note,priority,created_at,wishlist_products(title)').eq('user_id',id).order('created_at',{ascending:false}).range(0,999)
  ]);
  if(getUser()?.id!==id||generation!==loadGeneration)return;
  if(lr.error){allAssignedIds=new Set();bulkIds.clear();renderUnassigned();listCounts=new Map();assignedTotal=0;renderProgress();$('listsTotal').textContent='0';$('wishesTotal').textContent='0';lists=[];wishes=[];syncEditor();$('listsContent').replaceChildren();msg('Listenverwaltung vorbereitet. Das Datenbankschema wurde noch nicht freigeschaltet.');return}
  if(wr.error)throw wr.error;
  const allWishes=[...(wr.data||[])];for(let offset=1000;allWishes.length===offset;offset+=1000){const page=await db.from('wishlist_wishes').select('id,note,priority,created_at,wishlist_products(title)').eq('user_id',id).order('created_at',{ascending:false}).range(offset,offset+999);if(getUser()?.id!==id||generation!==loadGeneration)return;if(page.error)throw page.error;allWishes.push(...(page.data||[]))}
  if(loadedOwner!==id){favoriteIds=readFavorites(id);recentIds=readRecent(id);wishCategories=readCategories(id);wishMarkers=readMarkers(id)}loadedOwner=id;lists=lr.data||[];wishes=allWishes;favoriteIds=new Set([...favoriteIds].filter(x=>lists.some(l=>l.id===x)));recentIds=recentIds.filter(x=>lists.some(l=>l.id===x));syncEditor();if(!lists.some(x=>x.id===selected))selected=lists[0]?.id||null;
  const membershipRows=[];for(let offset=0;;offset+=1000){const page=await db.from('wishlist_list_items').select('list_id,wish_id').eq('user_id',id).range(offset,offset+999);if(getUser()?.id!==id||generation!==loadGeneration)return;if(page.error)throw page.error;membershipRows.push(...(page.data||[]));if((page.data||[]).length<1000)break}listCounts=new Map();const unique=new Set();const known=new Set(wishes.map(w=>w.id));for(const item of membershipRows){listCounts.set(item.list_id,(listCounts.get(item.list_id)||0)+1);if(known.has(item.wish_id))unique.add(item.wish_id)}assignedTotal=unique.size;allAssignedIds=unique;renderUnassigned();renderProgress();renderRecent();msg(lists.length+' Listen · '+wishes.length+' geladene Wünsche');$('listsTotal').textContent=String(lists.length);$('wishesTotal').textContent=String(wishes.length);render();
 }
 function render(){
  const grid=$('listsContent');grid.replaceChildren();renderFavorites();renderRecent();renderProgress();
  const term=$('listsSearch').value.trim().toLocaleLowerCase('de'),view=$('listsView').value,sort=$('listsSort').value;
  const visible=lists.filter(l=>(view==='all'||(view==='active'&&!l.archived)||(view==='archived'&&l.archived)||(view==='favorites'&&favoriteIds.has(l.id)))&&(!term||(l.title+' '+l.description).toLocaleLowerCase('de').includes(term))).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title,'de'):sort==='newest'?b.created_at.localeCompare(a.created_at):(Number(favoriteIds.has(b.id))-Number(favoriteIds.has(a.id)))||b.created_at.localeCompare(a.created_at));
  $('listsViewCount').textContent=visible.length+' von '+lists.length+' Listen angezeigt.';
  if(lists.length&&!visible.length){const p=document.createElement('p');p.textContent='Keine Listen für diese Auswahl. Ändere die Filter.';grid.append(p)}
  if(!lists.length){const p=document.createElement('p');p.textContent='Noch keine Listen. Erstelle deine erste Wunschliste.';grid.append(p)}
  for(const list of visible){
   const card=document.createElement('article');card.className='list-card'+(selected===list.id?' is-selected':'');card.style.borderTop='6px solid '+list.color;
   const cover=document.createElement('div');cover.className='list-card-cover';cover.style.background='linear-gradient(120deg,'+list.color+'33,'+list.color+'77)';cover.textContent=list.icon;card.append(cover);
   const heading=document.createElement('h3');heading.textContent=list.title;card.append(heading);
   const desc=document.createElement('p');desc.textContent=list.description||'Deine persönliche Wunschsammlung';card.append(desc);
   const meta=document.createElement('p');meta.className='list-card-meta';meta.textContent=(list.visibility==='public'?'Öffentlich (Freigabe folgt)':'Privat')+(list.archived?' · Archiviert':'');card.append(meta);
   const count=listCounts.get(list.id)||0;const countLabel=document.createElement('p');countLabel.className='list-card-count';countLabel.textContent=count+' Wünsche in dieser Liste';card.append(countLabel);
   const progress=document.createElement('div');progress.className='list-card-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Wünsche in dieser Liste, Anteil an geladenen Wünschen');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');const percent=wishes.length?Math.min(100,Math.round(count/wishes.length*100)):0;progress.setAttribute('aria-valuenow',String(percent));const fill=document.createElement('span');fill.style.width=percent+'%';progress.append(fill);card.append(progress);
   const fav=button(favoriteIds.has(list.id)?'★ Favorit':'☆ Merken',async()=>{const uid=owner();if(favoriteIds.has(list.id))favoriteIds.delete(list.id);else favoriteIds.add(list.id);writeFavorites(uid);render()});fav.className='favorite-toggle';fav.setAttribute('aria-pressed',String(favoriteIds.has(list.id)));fav.setAttribute('aria-label',(favoriteIds.has(list.id)?'Favorit entfernen: ':'Als Favorit markieren: ')+list.title);card.append(fav);
   const actions=document.createElement('div');actions.className='list-card-actions';card.append(actions);
   actions.append(button('Öffnen',async()=>{openList(list.id)}));
   actions.append(button('Gestalten',async()=>{selected=list.id;render();openEditor(list)}));
   actions.append(button(list.archived?'Reaktivieren':'Archivieren',async()=>{const res=await db.from('wishlist_lists').update({archived:!list.archived}).eq('id',list.id).eq('user_id',owner());if(res.error)throw res.error;await load()}));
   actions.append(button('Duplizieren',async()=>{const uid=owner();const {data:copy,error}=await db.from('wishlist_lists').insert({user_id:uid,title:(list.title+' Kopie').slice(0,80),description:list.description,icon:list.icon,color:list.color,visibility:'private'}).select('id').single();if(error)throw error;const {data:originalItems,error:itemsError}=await db.from('wishlist_list_items').select('wish_id').eq('list_id',list.id).eq('user_id',uid);if(itemsError)throw itemsError;if(originalItems.length){const {error:copyError}=await db.from('wishlist_list_items').insert(originalItems.map(item=>({list_id:copy.id,wish_id:item.wish_id,user_id:uid})));if(copyError)throw copyError}await load()}));
   actions.append(button('Löschen',async()=>{if(!confirm('Liste löschen? Die Wünsche selbst bleiben erhalten.'))return;const {error}=await db.from('wishlist_lists').delete().eq('id',list.id).eq('user_id',owner());if(error)throw error;await load()}));
   grid.append(card);
  }
  showItems().catch(e=>msg(e.message));
 }
 function renderUnassigned(){const n=wishes.filter(w=>!allAssignedIds.has(w.id)).length;$('unassignedCount').textContent=String(n);$('showUnassigned').disabled=!n}
 function visibleWishes(){const globallyUnassigned=$('listWishAssignment').value==='global-unassigned';return filterListWishes(globallyUnassigned?wishes.filter(w=>!allAssignedIds.has(w.id)):wishes,{search:$('listWishSearch').value,priority:$('listWishPriority').value,assignment:globallyUnassigned?'all':$('listWishAssignment').value,assignedIds,sort:$('listWishSort').value,category:$('listWishCategory').value,categories:wishCategories,marker:$('listWishMarker').value,markers:wishMarkers})}
 function updateBulkToolbar(results=visibleWishes()){const ids=results.map(w=>w.id),selectedVisible=ids.filter(id=>bulkIds.has(id)).length;$('bulkSelectedCount').textContent=bulkIds.size+' ausgewählt'+(bulkIds.size!==selectedVisible?' ('+selectedVisible+' sichtbar)':'');$('bulkSelectVisible').checked=ids.length>0&&selectedVisible===ids.length;$('bulkSelectVisible').indeterminate=selectedVisible>0&&selectedVisible<ids.length;$('bulkSelectVisible').disabled=bulkBusy||!ids.length;$('bulkAdd').disabled=bulkBusy||!bulkIds.size||!selected;$('bulkRemove').disabled=bulkBusy||!bulkIds.size||!selected;$('bulkClear').disabled=bulkBusy||!bulkIds.size}
 async function bulkAssign(add){
  if(bulkBusy||!selected||!bulkIds.size)return;
  const uid=owner(),listId=selected,targets=[...bulkIds].filter(id=>wishes.some(w=>w.id===id)&&(add?!assignedIds.has(id):assignedIds.has(id)));
  if(!targets.length){$('bulkStatus').textContent='Alle ausgewählten Wünsche haben bereits den gewünschten Zustand.';return}
  const list=lists.find(l=>l.id===listId);if(!list||list.archived){$('bulkStatus').textContent='Bitte eine aktive Liste wählen.';return}
  pendingBulk={uid,listId,add,targets};$('bulkConfirmTitle').textContent=add?'Wünsche zur Liste hinzufügen':'Wünsche aus der Liste entfernen';$('bulkConfirmDescription').textContent=targets.length+' Wünsche '+(add?'zu „'+list.title+'“ hinzufügen?':'aus „'+list.title+'“ entfernen?')+' Die Wünsche selbst bleiben erhalten.';$('bulkConfirmSample').textContent=targets.slice(0,5).map(id=>'• '+(wishes.find(w=>w.id===id)?.wishlist_products?.title||'Wunsch')).join('\n')+(targets.length>5?'\n… und '+(targets.length-5)+' weitere':'');$('bulkConfirmDialog').showModal();
 }
 async function applyBulk(){const job=pendingBulk;if(!job||bulkBusy)return;pendingBulk=null;$('bulkConfirmDialog').close();const {uid,listId,add,targets}=job;if(getUser()?.id!==uid||selected!==listId)return;
  bulkBusy=true;updateBulkToolbar();let success=0,failed=0;
  try{
   for(const wishId of targets){
    if(getUser()?.id!==uid||selected!==listId){$('bulkStatus').textContent='Vorgang wegen Kontowechsel oder Listenwechsel abgebrochen.';break}
    const q=add?db.from('wishlist_list_items').insert({list_id:listId,wish_id:wishId,user_id:uid}):db.from('wishlist_list_items').delete().eq('list_id',listId).eq('wish_id',wishId).eq('user_id',uid);
    try{const {error}=await q;if(error)throw error;success++;bulkIds.delete(wishId)}catch{failed++}
   }
   if(getUser()?.id===uid&&selected===listId){$('bulkStatus').textContent=success+' erfolgreich, '+failed+' fehlgeschlagen. Fehlgeschlagene Wünsche bleiben ausgewählt.';await load()}
  }finally{bulkBusy=false;updateBulkToolbar()}
 }
 function renderWishCards(){
  const cards=$('listWishCards');cards.replaceChildren();
  const list=lists.find(l=>l.id===selected);
  if(!list){updateBulkToolbar([]);return}
  const results=visibleWishes();updateBulkToolbar(results);
  $('listWishCount').textContent=results.length+' von '+wishes.length+' Wünschen angezeigt.';
  if(!results.length){const empty=document.createElement('p');empty.textContent='Keine passenden Wünsche gefunden. Passe deine Filter an oder füge einen Wunsch hinzu.';cards.append(empty)}
  for(const wish of results){
   const card=document.createElement('article');card.className='list-wish-card';
   const selectRow=document.createElement('label');selectRow.className='wish-card-select';const selectCheck=document.createElement('input');selectCheck.type='checkbox';selectCheck.checked=bulkIds.has(wish.id);selectCheck.disabled=bulkBusy;selectCheck.onchange=()=>{if(selectCheck.checked)bulkIds.add(wish.id);else bulkIds.delete(wish.id);updateBulkToolbar()};const selectText=document.createElement('span');selectText.textContent='Für Mehrfachaktion auswählen';selectRow.append(selectCheck,selectText);card.append(selectRow);
   const title=document.createElement('h4');title.textContent=wish.wishlist_products?.title||'Wunsch';
   const priority=document.createElement('p');priority.className='wish-priority';priority.textContent=['','Sehr wichtig','Normal','Irgendwann'][wish.priority]||'Priorität '+wish.priority;
   card.append(title,priority);const category=WISH_CATEGORIES.find(c=>c.id===wishCategories[wish.id]);if(category){const chip=document.createElement('span');chip.className='wish-category-chip';chip.textContent=category.label;card.append(chip)}
   const markers=document.createElement('div');markers.className='wish-marker-actions';for(const [marker,off,on] of [['star','☆ Merken','★ Favorit'],['later','⏳ Später','✓ Für später']]){const active=wishMarkers[wish.id]===marker;const control=button(active?on:off,async()=>setMarker(wish.id,marker));control.setAttribute('aria-pressed',String(active));control.setAttribute('aria-label',(active?'Markierung entfernen: ':'Wunsch markieren: ')+(wish.wishlist_products?.title||'Wunsch'));markers.append(control)}card.append(markers);
   if(wish.note){const note=document.createElement('p');note.textContent=wish.note;card.append(note)}
   const row=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=assignedIds.has(wish.id);
   const caption=document.createElement('span');caption.textContent='In dieser Liste';
   check.onchange=async()=>{check.disabled=true;const uid=owner(),wanted=check.checked;try{
    const query=wanted?db.from('wishlist_list_items').insert({list_id:list.id,wish_id:wish.id,user_id:uid}):db.from('wishlist_list_items').delete().eq('list_id',list.id).eq('wish_id',wish.id).eq('user_id',uid);
    const {error}=await query;if(error)throw error;if(getUser()?.id!==uid||selected!==list.id)return;
    if(wanted)assignedIds.add(wish.id);else assignedIds.delete(wish.id);
    await load();msg('Wunschzuordnung gespeichert');
   }catch(e){check.checked=!wanted;msg(e.message||'Zuordnung fehlgeschlagen')}finally{check.disabled=false}};
   row.append(check,caption);card.append(row);card.append(button('Details ansehen',async()=>openWishDetail(wish)));cards.append(card);
  }
 }
 async function showItems(){
  const list=lists.find(x=>x.id===selected);const generation=++itemsGeneration;
  $('listWishCards').replaceChildren();
  if(!list){$('listWishCount').textContent='Wähle eine Liste aus.';updateBulkToolbar([]);return}
  const uid=owner(),rows=[];for(let offset=0;;offset+=1000){const {data,error}=await db.from('wishlist_list_items').select('wish_id').eq('list_id',list.id).eq('user_id',uid).range(offset,offset+999);if(error)throw error;if(getUser()?.id!==uid||selected!==list.id||generation!==itemsGeneration)return;rows.push(...(data||[]));if((data||[]).length<1000)break}assignedIds=new Set(rows.map(x=>x.wish_id));renderWishCards();
 }
 $('bulkSelectVisible').onchange=()=>{for(const w of visibleWishes()){if($('bulkSelectVisible').checked)bulkIds.add(w.id);else bulkIds.delete(w.id)}renderWishCards()};
 $('bulkSelectCategory').onclick=()=>{if($('listWishCategory').value==='all'){$('bulkStatus').textContent='Bitte zuerst eine Kategorie auswählen.';return}for(const wish of visibleWishes())bulkIds.add(wish.id);renderWishCards();$('bulkStatus').textContent='Sichtbare Wünsche dieser Kategorie ausgewählt.'};
 $('bulkConfirmCancel').onclick=()=>{$('bulkConfirmDialog').close();pendingBulk=null};$('bulkConfirmDialog').addEventListener('close',()=>{pendingBulk=null});$('bulkConfirmApply').onclick=()=>applyBulk().catch(e=>{$('bulkStatus').textContent=e.message});
 $('bulkClear').onclick=()=>{bulkIds.clear();renderWishCards()};$('bulkAdd').onclick=()=>bulkAssign(true).catch(e=>{$('bulkStatus').textContent=e.message});$('bulkRemove').onclick=()=>bulkAssign(false).catch(e=>{$('bulkStatus').textContent=e.message});
 const globalOption=document.createElement('option');globalOption.value='global-unassigned';globalOption.textContent='In keiner Liste';$('listWishAssignment').append(globalOption);
 $('showUnassigned').onclick=()=>{$('listWishAssignment').value='global-unassigned';$('listWishSearch').value='';$('listWishPriority').value='all';$('listWishCategory').value='all';$('listWishMarker').value='all';$('listWishSort').value='newest';bulkIds.clear();renderWishCards();$('listWishCards').scrollIntoView({behavior:'smooth',block:'start'});};
 for(const id of ['listsSearch','listsView','listsSort'])$(id).addEventListener('input',render);
 $('homeFavorites').onclick=()=>{$('listsView').value='favorites';render();$('listsContent').scrollIntoView({behavior:'smooth',block:'start'})};
 $('homeNewWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('homeNewList').onclick=()=>{$('listTitle').scrollIntoView({behavior:'smooth',block:'center'});$('listTitle').focus()};
 for(const category of WISH_CATEGORIES){for(const select of [$('listWishCategory'),$('wishDetailCategory')]){const option=document.createElement('option');option.value=category.id;option.textContent=category.label;select.append(option)}}const noCategory=document.createElement('option');noCategory.value='';noCategory.textContent='Ohne Kategorie';$('wishDetailCategory').prepend(noCategory);
 $('wishDetailStar').onclick=()=>{if(detailWishId)setMarker(detailWishId,'star')};$('wishDetailLater').onclick=()=>{if(detailWishId)setMarker(detailWishId,'later')};
 $('listWishClearFilters').onclick=()=>{for(const [id,value] of [['listWishSearch',''],['listWishPriority','all'],['listWishCategory','all'],['listWishMarker','all'],['listWishAssignment','assigned'],['listWishSort','newest']])$(id).value=value;renderWishCards()};
 $('wishDetailSaveCategory').onclick=saveCategory;$('wishDetailClose').onclick=()=>$('wishDetailDialog').close();$('wishDetailDone').onclick=()=>$('wishDetailDialog').close();$('wishDetailDialog').addEventListener('close',()=>{detailWishId=null});
 for(const id of ['listWishSearch','listWishPriority','listWishCategory','listWishMarker','listWishAssignment','listWishSort'])$(id).addEventListener('input',renderWishCards);
 $('listTemplate').onchange=()=>{
  const template=LIST_TEMPLATES.find(t=>t.id===$('listTemplate').value)||LIST_TEMPLATES.at(-1);
  $('listTitle').value=template.title;$('listDescription').value=template.description;$('listIcon').value=template.icon;$('listColor').value=template.color;
 };
 function openEditor(list){
  $('editListId').value=list.id;$('editListTitle').value=list.title;$('editListDescription').value=list.description||'';
  $('editListIcon').value=list.icon;$('editListColor').value=list.color;
  $('editListForm').hidden=false;$('editListTitle').focus();$('editListForm').scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 $('cancelListEdit').onclick=()=>{$('editListForm').hidden=true;$('editListId').value='';};
 $('editListForm').onsubmit=async event=>{
  event.preventDefault();const id=owner(),listId=$('editListId').value;
  if(!lists.some(l=>l.id===listId))return msg('Liste nicht gefunden.');
  const title=$('editListTitle').value.trim(),description=$('editListDescription').value.trim();
  if(!title||title.length>80||description.length>500)return msg('Bitte gültigen Namen und Beschreibung eingeben.');
  const save=$('saveListChanges');save.disabled=true;
  try{
   const {error}=await db.from('wishlist_lists').update({title,description,icon:$('editListIcon').value,color:$('editListColor').value}).eq('id',listId).eq('user_id',id);
   if(error)throw error;if(getUser()?.id!==id)return;
   $('editListForm').hidden=true;$('editListId').value='';await load();msg('Listendesign gespeichert.');
  }catch(e){msg(e.message||'Liste konnte nicht gespeichert werden')}finally{save.disabled=false}
 };
 $('mobileNewWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('mobileMyLists').onclick=()=>{$('listsContent').scrollIntoView({behavior:'smooth',block:'start'})};
 $('quickNewList').onclick=()=>{$('listTitle').focus();$('listTitle').scrollIntoView({behavior:'smooth',block:'center'})};
 $('quickAddWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('quickOpenSelected').onclick=()=>{if(!selected)return msg('Bitte zuerst eine Liste erstellen.');$('listItems').scrollIntoView({behavior:'smooth',block:'start'})};
 $('createList').onclick=async()=>{const id=owner();const title=$('listTitle').value.trim();if(!title||title.length>80){msg('Listenname muss 1 bis 80 Zeichen enthalten.');return}const payload={user_id:id,title,description:$('listDescription').value.trim().slice(0,500),icon:$('listIcon').value,color:$('listColor').value,visibility:$('listVisibility').value};$('createList').disabled=true;try{const {error}=await db.from('wishlist_lists').insert(payload);if(error)throw error;$('listTitle').value='';$('listDescription').value='';await load()}catch(e){msg(e.message||'Liste konnte nicht angelegt werden')}finally{$('createList').disabled=false}};
 $('refreshLists').onclick=()=>load().catch(e=>msg(e.message));
 return {refresh:()=>load().catch(e=>msg(e.message)),reset,assignWish,selectedList:()=>loadedOwner===getUser()?.id?editorSelect.value:''};
}
