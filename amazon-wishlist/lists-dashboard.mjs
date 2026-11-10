import {LIST_TEMPLATES,WISH_CATEGORIES,filterListWishes} from './list-features.mjs';
import {eligibleBulkTargets,summarizeBulk,bulkContextValid,bulkErrorHint,fetchAllPages,executeBulkJob,bulkControlsEnabled,currentDashboardLoad,fetchDashboardBase,fetchDashboardMembership,membershipForSelectedList} from './bulk-helpers.mjs';
// Multi-list dashboard. Requires LISTS-SCHEMA-PROPOSAL.sql to be reviewed and applied separately.
export function mountListsDashboard(db, getUser) {
 const $=id=>document.getElementById(id);
 const root=$('listsDashboard');
 let lists=[],wishes=[],selected=null,loadedOwner=null,loadGeneration=0,itemsGeneration=0,assignedIds=new Set(),favoriteIds=new Set(),recentIds=[],listCounts=new Map(),assignedTotal=0,wishCategories={},wishMarkers={},detailWishId=null,bulkIds=new Set(),allAssignedIds=new Set(),bulkBusy=false,pendingBulk=null,visibleLimit=100,bulkStopRequested=false,bulkRunId=0,lastBulkResult=null,bulkHistory=[],membershipByList=new Map(),membershipReady=false;
 const markerKey=id=>'helferlein-wish-markers:'+id;
 function readMarkers(id){try{const value=JSON.parse(localStorage.getItem(markerKey(id))||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([k,v])=>typeof k==='string'&&['star','later'].includes(v))):{}}catch{return {}}}
 function setMarker(wishId,marker){if(bulkBusy||!membershipReady||getUser()?.id!==loadedOwner||!wishes.some(w=>w.id===wishId))return;const uid=owner(),next={...wishMarkers};if(next[wishId]===marker)delete next[wishId];else next[wishId]=marker;try{localStorage.setItem(markerKey(uid),JSON.stringify(next));wishMarkers=next;renderWishCards();if(detailWishId===wishId)syncDetailMarkers();msg('Markierung in diesem Browser gespeichert.')}catch{msg('Markierung konnte nicht gespeichert werden.')}}
 function syncDetailMarkers(){for(const [id,marker,off,on] of [['wishDetailStar','star','☆ Favorit','★ Favorit'],['wishDetailLater','later','⏳ Später ansehen','✓ Für später markiert']]){const b=$(id),active=wishMarkers[detailWishId]===marker;b.setAttribute('aria-pressed',String(active));b.textContent=active?on:off}}
 const categoryKey=id=>'helferlein-wish-categories:'+id;
 function readCategories(id){try{const value=JSON.parse(localStorage.getItem(categoryKey(id))||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([k,v])=>typeof k==='string'&&WISH_CATEGORIES.some(c=>c.id===v))):{}}catch{return {}}}
 function saveCategory(){if(bulkBusy||!membershipReady||getUser()?.id!==loadedOwner)return;const uid=owner(),wishId=detailWishId;if(!wishId||!wishes.some(w=>w.id===wishId))return;const category=$('wishDetailCategory').value;if(category&&!WISH_CATEGORIES.some(c=>c.id===category))return;const next={...wishCategories};if(category)next[wishId]=category;else delete next[wishId];try{localStorage.setItem(categoryKey(uid),JSON.stringify(next));wishCategories=next;$('wishDetailDialog').close();renderWishCards();msg('Kategorie in diesem Browser gespeichert.')}catch{msg('Kategorie konnte in diesem Browser nicht gespeichert werden.')}}
 function focusWishCard(wishId){
  const card=[...$('listWishCards').children].find(el=>el.dataset.wishId===wishId);
  if(!card)return;
  card.tabIndex=-1;card.focus({preventScroll:true});card.scrollIntoView({behavior:'smooth',block:'center'});
 }
 function jumpToWishInList(wishId,listId){
  if(getUser()?.id!==loadedOwner||!membershipReady||bulkBusy||!lists.some(l=>l.id===listId&&!l.archived&&membershipByList.get(l.id)?.has(wishId)))return;
  const wish=wishes.find(w=>w.id===wishId);if(!wish)return;
  $('wishDetailDialog').close();openList(listId);
  $('listWishSearch').value='';
  $('listWishAssignment').value='assigned';$('listWishPriority').value='all';$('listWishCategory').value='all';$('listWishMarker').value='all';$('listWishSort').value='newest';selectedOnlyView=false;
  const index=visibleWishes().findIndex(w=>w.id===wishId);
  if(index<0){msg('Wunsch konnte in dieser Liste nicht gefunden werden.');return}
  visibleLimit=Math.max(visibleLimit,index+1);renderWishCards();focusWishCard(wishId);
 }
 function openWishDetail(wish){if(!membershipReady||getUser()?.id!==loadedOwner||!wishes.some(w=>w.id===wish.id))return;detailWishId=wish.id;
  const membership=$('wishDetailLists');membership.replaceChildren();
  const matching=membershipReady?lists.filter(l=>!l.archived&&membershipByList.get(l.id)?.has(wish.id)):[];
  if(matching.length){const heading=document.createElement('strong');heading.textContent='In diesen Listen:';membership.append(heading);
   for(const list of matching){const go=button(list.icon+' '+list.title,async()=>jumpToWishInList(wish.id,list.id));membership.append(go)}
  }else{const hint=document.createElement('span');hint.textContent=membershipReady?'Noch keiner Liste zugeordnet':'Listenzuordnungen werden geladen';membership.append(hint)}
  $('wishDetailSelect').disabled=!membershipReady||bulkBusy||!lists.some(l=>l.id===selected&&!l.archived)||!visibleWishes().slice(0,visibleLimit).some(w=>w.id===wish.id);
  $('wishDetailSelect').textContent=bulkIds.has(wish.id)?'Aus Sammelauswahl entfernen':'Für Sammelaktion auswählen';$('wishDetailSelect').title=$('wishDetailSelect').disabled?'Nur sichtbare Wünsche der aktuellen aktiven Liste auswählbar':'';
  $('wishDetailJump').disabled=!matching.length;
  $('wishDetailHeading').textContent=wish.wishlist_products?.title||'Wunsch';$('wishDetailPriority').textContent='Priorität: '+(['','Sehr wichtig','Normal','Irgendwann'][wish.priority]||'Nicht angegeben');$('wishDetailNote').textContent=wish.note||'Keine Notiz vorhanden.';$('wishDetailDate').textContent=wish.created_at?'Hinzugefügt: '+new Date(wish.created_at).toLocaleDateString('de-DE'):'';$('wishDetailCategory').value=wishCategories[wish.id]||'';syncDetailMarkers();$('wishDetailDialog').showModal()}
 const recentKey=id=>'helferlein-wishlist-recent:'+id;
 function readRecent(id){try{const v=JSON.parse(localStorage.getItem(recentKey(id))||'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,5):[]}catch{return []}}
 function recordRecent(id){recentIds=[id,...recentIds.filter(x=>x!==id)].slice(0,5);try{localStorage.setItem(recentKey(owner()),JSON.stringify(recentIds))}catch{msg('Zuletzt geöffnete Listen können nicht dauerhaft gespeichert werden.')}renderRecent()}
 function renderRecent(){const target=$('homeRecentContent');target.replaceChildren();const recent=recentIds.map(id=>lists.find(l=>l.id===id&&!l.archived)).filter(Boolean);if(!recent.length){const p=document.createElement('p');p.textContent='Öffne eine Liste, damit sie hier erscheint.';target.append(p)}for(const list of recent)target.append(button(list.icon+' '+list.title,async()=>openList(list.id)))}
 function renderProgress(){const count=wishes.length,percentage=count?Math.min(100,Math.round(100*assignedTotal/count)):0;$('assignedTotal').textContent=String(assignedTotal);$('favoritesTotal').textContent=String(lists.filter(l=>favoriteIds.has(l.id)).length);$('homeProgress').setAttribute('aria-valuenow',String(percentage));$('homeProgressFill').style.width=percentage+'%';$('homeProgressNote').textContent=count?assignedTotal+' von '+count+' geladenen Wünschen sind mindestens einer Liste zugeordnet ('+percentage+' %).':'Füge deinen ersten Wunsch hinzu, um deine Wunschwelt aufzubauen.';}
 const favoriteKey=id=>'helferlein-wishlist-favorites:'+id;
 function readFavorites(id){try{const raw=JSON.parse(localStorage.getItem(favoriteKey(id))||'[]');return new Set(Array.isArray(raw)?raw.filter(x=>typeof x==='string'):[])}catch{return new Set()}}
 function writeFavorites(id){try{localStorage.setItem(favoriteKey(id),JSON.stringify([...favoriteIds]))}catch{msg('Favoriten können in diesem Browser nicht dauerhaft gespeichert werden.')}}
 function openList(id){if(getUser()?.id!==loadedOwner||!membershipReady){msg('Bitte zuerst die Listen vollständig laden.');return}if(bulkBusy){msg('Die Sammelaktion läuft noch. Bitte zuerst stoppen oder abschließen.');return}if(!lists.some(l=>l.id===id&&!l.archived)){msg('Bitte eine aktive Liste auswählen.');return}bulkIds.clear();selectedOnlyView=false;lastBulkResult=null;$('bulkResultPanel').hidden=true;selected=id;visibleLimit=100;for(const [field,value] of [['listWishSearch',''],['listWishPriority','all'],['listWishCategory','all'],['listWishMarker','all'],['listWishAssignment','assigned'],['listWishSort','newest']])$(field).value=value;syncBulkMoveTargets();recordRecent(id);render();$('listItems').scrollIntoView({behavior:'smooth',block:'start'})}
 function renderFavorites(){const target=$('homeFavoritesContent');target.replaceChildren();const favorites=lists.filter(l=>favoriteIds.has(l.id)&&!l.archived);if(!favorites.length){const p=document.createElement('p');p.textContent='Markiere deine Lieblingslisten mit ★, um sie hier schnell zu öffnen. Favoriten werden nur in diesem Browser gespeichert.';target.append(p);return}for(const list of favorites){const b=button(list.icon+' '+list.title,async()=>openList(list.id));target.append(b)}}
 const editorSelect=$('wishListSelect');
 function syncEditor(){const previous=editorSelect.value;editorSelect.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Ohne Liste speichern';editorSelect.append(empty);for(const list of lists.filter(x=>!x.archived)){const option=document.createElement('option');option.value=list.id;option.textContent=list.icon+' '+list.title;editorSelect.append(option)}editorSelect.value=lists.some(x=>x.id===previous&&!x.archived)?previous:(lists.find(x=>x.title==='Meine Wünsche'&&!x.archived)?.id||'');editorSelect.disabled=!lists.some(x=>!x.archived);}
 async function assignWish(wishId,listId,uid){if(!listId)return;const {error}=await db.from('wishlist_list_items').insert({list_id:listId,wish_id:wishId,user_id:uid});if(error)throw error;}
 function reset(){selectedOnlyView=false;setWishView(false);++loadGeneration;$('editListForm').hidden=true;$('editListId').value='';$('listsTotal').textContent='0';$('wishesTotal').textContent='0';loadedOwner=null;lists=[];wishes=[];selected=null;favoriteIds=new Set();recentIds=[];listCounts=new Map();assignedTotal=0;wishCategories={};wishMarkers={};detailWishId=null;$('wishDetailDialog').close();assignedIds=new Set();membershipByList=new Map();membershipReady=false;bulkIds.clear();allAssignedIds=new Set();bulkBusy=false;pendingBulk=null;lastBulkResult=null;bulkHistory=[];$('bulkResultPanel').hidden=true;$('bulkProgressPanel').hidden=true;renderBulkHistory();bulkStopRequested=true;++bulkRunId;visibleLimit=100;$('bulkConfirmDialog').close();++itemsGeneration;root.hidden=true;$('listsContent').replaceChildren();$('listWishCards').replaceChildren();$('listWishCount').textContent='';$('homeFavoritesContent').replaceChildren();$('homeRecentContent').replaceChildren();renderProgress();syncEditor();}

 function invalidateMembershipState(){
  membershipReady=false;membershipByList=new Map();assignedIds=new Set();allAssignedIds=new Set();listCounts=new Map();assignedTotal=0;bulkIds.clear();pendingBulk=null;lastBulkResult=null;
  $('bulkResultPanel').hidden=true;$('bulkConfirmDialog').close();$('listWishCards').replaceChildren();$('listWishCount').textContent='';updateBulkToolbar([]);renderProgress();
 }
 const msg=t=>{$('listsStatus').textContent=t};
 const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){msg(e.message||'Aktion fehlgeschlagen')}finally{b.disabled=false}};return b};
 const owner=()=>{const u=getUser();if(!u)throw Error('Bitte anmelden');return u.id};
 async function load({afterBulk=false}={}){
  if(!getUser()){reset();return}
  if(loadedOwner&&loadedOwner!==getUser()?.id)reset();
  if(bulkBusy&&!afterBulk){msg('Sammelaktion läuft. Bitte stoppen oder abschließen, bevor du Listen aktualisierst.');return}
  const generation=++loadGeneration;
  invalidateMembershipState();$('wishLoadMore').hidden=true;root.hidden=false;setItemsFeedback('loading','Wunschlisten werden geladen …');msg('Listen werden geladen …');
  const id=owner();
  let lr,wr;
  try{({lists:lr,wishes:wr}=await fetchDashboardBase(db,id));
  }catch(e){if(!currentDashboardLoad({requestedUserId:id,currentUserId:getUser()?.id,requestedGeneration:generation,currentGeneration:loadGeneration}))return;setItemsFeedback('error','Listen oder Wünsche konnten nicht geladen werden. Bitte erneut versuchen.');throw e}
  if(!currentDashboardLoad({requestedUserId:id,currentUserId:getUser()?.id,requestedGeneration:generation,currentGeneration:loadGeneration}))return;
  if(lr.error){invalidateMembershipState();setItemsFeedback('error','Listen konnten nicht geladen werden. Das erforderliche Listen-Schema ist möglicherweise noch nicht aktiviert.');allAssignedIds=new Set();bulkIds.clear();renderUnassigned();listCounts=new Map();assignedTotal=0;renderProgress();$('listsTotal').textContent='0';$('wishesTotal').textContent='0';lists=[];wishes=[];syncEditor();$('listsContent').replaceChildren();msg('Listenverwaltung vorbereitet. Das Datenbankschema wurde noch nicht freigeschaltet.');return}
  if(wr.error){invalidateMembershipState();setItemsFeedback('error','Wünsche konnten nicht geladen werden. Bitte erneut versuchen.');throw wr.error}
  let allWishes;
  try{
   const additional=wr.data?.length===1000?await fetchAllPages((from,to)=>db.from('wishlist_wishes').select('id,note,priority,created_at,wishlist_products(title)').eq('user_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from+1000,to+1000),{isCurrent:()=>getUser()?.id===id&&generation===loadGeneration}):[];
   if(additional===null)return;
   allWishes=[...(wr.data||[]),...additional];
  }catch(e){if(!currentDashboardLoad({requestedUserId:id,currentUserId:getUser()?.id,requestedGeneration:generation,currentGeneration:loadGeneration}))return;setItemsFeedback('error','Weitere Wünsche konnten nicht geladen werden. Bitte erneut versuchen.');throw e}

  if(loadedOwner!==id){selected=null;bulkIds.clear();bulkHistory=[];renderBulkHistory();lastBulkResult=null;$('bulkResultPanel').hidden=true;visibleLimit=100;favoriteIds=readFavorites(id);recentIds=readRecent(id);wishCategories=readCategories(id);wishMarkers=readMarkers(id)}loadedOwner=id;lists=lr.data||[];wishes=allWishes;favoriteIds=new Set([...favoriteIds].filter(x=>lists.some(l=>l.id===x)));recentIds=recentIds.filter(x=>lists.some(l=>l.id===x));syncEditor();if(!lists.some(x=>x.id===selected&&!x.archived)){selected=lists.find(x=>!x.archived)?.id||null;lastBulkResult=null;$('bulkResultPanel').hidden=true;}
  let membershipRows;
  try{membershipRows=await fetchDashboardMembership(db,id,{isCurrent:()=>getUser()?.id===id&&generation===loadGeneration})}
  catch(e){if(!currentDashboardLoad({requestedUserId:id,currentUserId:getUser()?.id,requestedGeneration:generation,currentGeneration:loadGeneration}))return;invalidateMembershipState();setItemsFeedback('error','Listenzuordnungen konnten nicht vollständig geladen werden. Bitte erneut versuchen.');throw e}
  if(membershipRows===null||!currentDashboardLoad({requestedUserId:id,currentUserId:getUser()?.id,requestedGeneration:generation,currentGeneration:loadGeneration}))return;
  membershipByList=new Map();const validWishIds=new Set(wishes.map(w=>w.id)),validListIds=new Set(lists.map(l=>l.id));for(const item of membershipRows){if(!validListIds.has(item.list_id)||!validWishIds.has(item.wish_id))continue;if(!membershipByList.has(item.list_id))membershipByList.set(item.list_id,new Set());membershipByList.get(item.list_id).add(item.wish_id)}membershipReady=true;listCounts=new Map();const unique=new Set();const known=new Set(wishes.map(w=>w.id));for(const item of membershipRows){if(!known.has(item.wish_id))continue;if(!lists.some(l=>l.id===item.list_id))continue;listCounts.set(item.list_id,membershipByList.get(item.list_id)?.size||0);unique.add(item.wish_id)}assignedTotal=unique.size;allAssignedIds=unique;renderUnassigned();renderProgress();renderRecent();setItemsFeedback('ready','');msg(lists.length+' Listen · '+wishes.length+' geladene Wünsche');$('listsTotal').textContent=String(lists.length);$('wishesTotal').textContent=String(wishes.length);render();
 }
 function render(){
  syncBulkMoveTargets();syncListQuickSwitch();
  const grid=$('listsContent');grid.replaceChildren();renderFavorites();renderRecent();renderProgress();
  const term=$('listsSearch').value.trim().toLocaleLowerCase('de'),view=$('listsView').value,sort=$('listsSort').value;
  const visible=lists.filter(l=>(view==='all'||(view==='active'&&!l.archived)||(view==='archived'&&l.archived)||(view==='favorites'&&favoriteIds.has(l.id)))&&(!term||(l.title+' '+l.description).toLocaleLowerCase('de').includes(term))).sort((a,b)=>sort==='name'?a.title.localeCompare(b.title,'de'):sort==='newest'?b.created_at.localeCompare(a.created_at):sort==='recent'?(recentIds.indexOf(a.id)===-1?999:recentIds.indexOf(a.id))-(recentIds.indexOf(b.id)===-1?999:recentIds.indexOf(b.id)):sort==='most'?(listCounts.get(b.id)||0)-(listCounts.get(a.id)||0):sort==='least'?(listCounts.get(a.id)||0)-(listCounts.get(b.id)||0):(Number(favoriteIds.has(b.id))-Number(favoriteIds.has(a.id)))||b.created_at.localeCompare(a.created_at));
  $('listsViewCount').textContent=visible.length+' von '+lists.length+' Listen angezeigt.';$('listsResetFilters').hidden=!term&&view==='all'&&sort==='favorites';
  if(lists.length&&!visible.length){const p=document.createElement('p');p.textContent='Keine Listen für diese Auswahl. Ändere die Filter.';grid.append(p);grid.append(button('Listenfilter zurücksetzen',async()=>{if(bulkBusy)return;$('listsSearch').value='';$('listsView').value='active';$('listsSort').value='favorites';render()}))}
  if(!lists.length){const p=document.createElement('p');p.textContent='Noch keine Listen. Erstelle deine erste Wunschliste.';grid.append(p)}
  for(const list of visible){
   const card=document.createElement('article');card.className='list-card'+(selected===list.id?' is-selected':'');card.style.borderTop='6px solid '+list.color;
   const cover=document.createElement('div');cover.className='list-card-cover';cover.style.background='linear-gradient(120deg,'+list.color+'33,'+list.color+'77)';cover.textContent=list.icon;card.append(cover);
   const heading=document.createElement('h3');heading.textContent=list.title;card.append(heading);
   const desc=document.createElement('p');desc.textContent=list.description||'Deine persönliche Wunschsammlung';card.append(desc);
   const meta=document.createElement('p');meta.className='list-card-meta';meta.textContent=(list.visibility==='public'?'Öffentlich (Freigabe folgt)':'Privat')+(list.archived?' · Archiviert':'');card.append(meta);
   const count=listCounts.get(list.id)||0;card.setAttribute('aria-label',list.title+', '+count+' Wünsche'+(list.archived?', archiviert':''));const countLabel=document.createElement('p');countLabel.className='list-card-count';countLabel.textContent=count+' Wünsche in dieser Liste';card.append(countLabel);
   const progress=document.createElement('div');progress.className='list-card-progress';progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Wünsche in dieser Liste, Anteil an geladenen Wünschen');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');const percent=wishes.length?Math.min(100,Math.round(count/wishes.length*100)):0;progress.setAttribute('aria-valuenow',String(percent));const fill=document.createElement('span');fill.style.width=percent+'%';progress.append(fill);card.append(progress);
   const fav=button(favoriteIds.has(list.id)?'★ Favorit':'☆ Merken',async()=>{if(bulkBusy)return;const uid=owner();if(favoriteIds.has(list.id))favoriteIds.delete(list.id);else favoriteIds.add(list.id);writeFavorites(uid);render()});fav.className='favorite-toggle';fav.setAttribute('aria-pressed',String(favoriteIds.has(list.id)));fav.setAttribute('aria-label',(favoriteIds.has(list.id)?'Favorit entfernen: ':'Als Favorit markieren: ')+list.title);card.append(fav);
   const actions=document.createElement('div');actions.className='list-card-actions';card.append(actions);
   actions.append(button(list.archived?'Archiviert – reaktivieren':'Öffnen',async()=>{if(list.archived)return msg('Bitte die Liste zuerst reaktivieren.');openList(list.id)}));
   if(!list.archived&&count>0)actions.append(button('Zugeordnete Wünsche',async()=>{if(bulkBusy)return;openList(list.id);$('listWishAssignment').value='assigned';selectedOnlyView=false;renderWishCards()}));
   actions.append(button('Gestalten',async()=>{if(bulkBusy)return msg('Sammelaktion zuerst abschließen.');if(list.archived)return msg('Archivierte Liste zuerst reaktivieren.');if(getUser()?.id!==loadedOwner)return;openEditor(list)}));
   actions.append(button(list.archived?'Reaktivieren':'Archivieren',async()=>{if(bulkBusy)return msg('Sammelaktion zuerst abschließen.');if(!list.archived&&!window.confirm('Liste „'+list.title+'“ archivieren? Die Wünsche bleiben erhalten.'))return;if(bulkBusy||activeWishMutations.size||getUser()?.id!==loadedOwner||!lists.some(l=>l.id===list.id&&l.archived===list.archived))return;const uid=owner(),generation=loadGeneration;const res=await db.from('wishlist_lists').update({archived:!list.archived}).eq('id',list.id).eq('user_id',uid);if(res.error)throw res.error;if(getUser()?.id!==uid||generation!==loadGeneration)return;await load()}));
actions.append(button('Duplizieren',async()=>{if(bulkBusy||activeWishMutations.size||!membershipReady)return msg('Bitte zuerst laufende Änderungen abschließen und die vollständigen Listenzuordnungen laden.');const uid=owner(),generation=loadGeneration;const originalIds=[...(membershipByList.get(list.id)||new Set())];if(!window.confirm('Liste „'+list.title+'“ mit '+originalIds.length+' Zuordnungen duplizieren? Die Wünsche selbst werden nicht kopiert.'))return;if(bulkBusy||activeWishMutations.size||!membershipReady||getUser()?.id!==uid||generation!==loadGeneration||!lists.some(l=>l.id===list.id))return;const current=()=>getUser()?.id===uid&&generation===loadGeneration;const {data:copy,error}=await db.from('wishlist_lists').insert({user_id:uid,title:(list.title+' Kopie').slice(0,80),description:list.description,icon:list.icon,color:list.color,visibility:'private'}).select('id').single();if(error)throw error;if(!current())return;let copied=0;for(let i=0;i<originalIds.length;i+=100){if(!current())return;const batch=originalIds.slice(i,i+100).map(wish_id=>({list_id:copy.id,wish_id,user_id:uid}));const {error:copyError}=await db.from('wishlist_list_items').insert(batch);if(copyError){if(current()){msg('Kopie angelegt, aber nur '+copied+' von '+originalIds.length+' Zuordnungen übernommen. Bitte Kopie prüfen.');await load()}return}copied+=batch.length}if(!current())return;await load();if(getUser()?.id===uid)msg('Liste mit '+copied+' Zuordnungen dupliziert.')}));
   actions.append(button('Löschen',async()=>{if(bulkBusy)return msg('Sammelaktion zuerst abschließen.');if(!confirm('Liste „'+list.title+'“ löschen? Die Wünsche selbst bleiben erhalten.'))return;if(bulkBusy||activeWishMutations.size||getUser()?.id!==loadedOwner||!lists.some(l=>l.id===list.id))return;const uid=owner(),generation=loadGeneration;const {error}=await db.from('wishlist_lists').delete().eq('id',list.id).eq('user_id',uid);if(error)throw error;if(getUser()?.id!==uid||generation!==loadGeneration)return;await load()}));
   grid.append(card);
  }
  showItems().catch(e=>{setItemsFeedback('error','Listenzuordnungen konnten nicht geladen werden.');msg(e.message||'Ladefehler')});
 }
 function renderUnassigned(){const n=wishes.filter(w=>!allAssignedIds.has(w.id)).length;$('unassignedCount').textContent=String(n);$('showUnassigned').disabled=!n}
 let selectedOnlyView=false,activeWishMutations=new Set();
 function visibleWishes(){const globallyUnassigned=$('listWishAssignment').value==='global-unassigned';return filterListWishes((globallyUnassigned?wishes.filter(w=>!allAssignedIds.has(w.id)):wishes).filter(w=>!selectedOnlyView||bulkIds.has(w.id)),{search:$('listWishSearch').value,priority:$('listWishPriority').value,assignment:globallyUnassigned?'all':$('listWishAssignment').value,assignedIds,sort:$('listWishSort').value,category:$('listWishCategory').value,categories:wishCategories,marker:$('listWishMarker').value,markers:wishMarkers})}
 function syncBulkMoveTargets(){
  const target=$('bulkMoveTarget'),previous=target.value;
  target.replaceChildren();
  const empty=document.createElement('option');empty.value='';empty.textContent='Zielliste wählen';target.append(empty);
  for(const list of lists.filter(l=>!l.archived&&l.id!==selected)){
   const option=document.createElement('option');option.value=list.id;option.textContent=list.icon+' '+list.title;target.append(option);
  }
  target.value=lists.some(l=>l.id===previous&&!l.archived&&l.id!==selected)?previous:'';
 }
 function updateBulkToolbar(results=visibleWishes()){syncListQuickSwitch();const ids=results.slice(0,visibleLimit).map(w=>w.id),selectedVisible=ids.filter(id=>bulkIds.has(id)).length,activeList=lists.some(l=>l.id===selected&&!l.archived);$('bulkSelectedCount').textContent=bulkIds.size+' ausgewählt'+(bulkIds.size!==selectedVisible?' ('+selectedVisible+' sichtbar)':'');$('bulkSelectVisible').checked=ids.length>0&&selectedVisible===ids.length;$('bulkSelectVisible').indeterminate=selectedVisible>0&&selectedVisible<ids.length;$('bulkSelectVisible').disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||!activeList||!ids.length;$('bulkAdd').disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||!bulkIds.size||!activeList;$('bulkRemove').disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||!bulkIds.size||!activeList;$('bulkClear').disabled=bulkBusy||!bulkIds.size;$('bulkSelectCategory').disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||!activeList;$('listWishAssignment').disabled=bulkBusy;$('bulkMoveTarget').disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||!activeList||!bulkIds.size;$('bulkMove').disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||!activeList||!bulkIds.size||!$('bulkMoveTarget').value||![...bulkIds].some(id=>assignedIds.has(id))}

 function renderBulkHistory(){const list=$('bulkHistoryList');list.replaceChildren();$('bulkHistoryEmpty').hidden=bulkHistory.length>0;$('bulkHistoryClear').disabled=!bulkHistory.length||bulkBusy;for(const entry of bulkHistory){const item=document.createElement('li');const summary=document.createElement('p');summary.textContent=entry.time+' · '+(entry.add?'Hinzufügen zu ':'Entfernen aus ')+entry.listTitle+' · '+entry.success+' erfolgreich, '+entry.failed.length+' fehlgeschlagen, '+entry.remaining.length+' offen';item.append(summary);if(entry.errors.length){const detail=document.createElement('small');detail.textContent=entry.errors.slice(0,3).map(e=>e.reason+' ('+e.count+'×)').join(' · ');item.append(detail)}if(entry.failed.length||entry.remaining.length){const retry=button('Offene Änderungen prüfen',async()=>{if(getUser()?.id!==entry.uid)return;if(selected!==entry.listId){if(!lists.some(l=>l.id===entry.listId&&!l.archived))return msg('Diese Liste ist nicht mehr aktiv. Bitte Verlauf prüfen.');openList(entry.listId);$('bulkStatus').textContent='Liste geöffnet. Bitte nach dem Laden die Aktion erneut prüfen.';return}prepareBulk({uid:entry.uid,listId:entry.listId,add:entry.add,targets:[...entry.failed,...entry.remaining]})});item.append(retry)}list.append(item)}}
 function showBulkResult(result){lastBulkResult=result;const {uid,listId,add,total,success,failed,remaining,interrupted}=result;if(getUser()?.id!==uid||selected!==listId)return;$('bulkResultPanel').hidden=false;$('bulkResultHeading').textContent=interrupted?'Sammelaktion unterbrochen':'Sammelaktion abgeschlossen';$('bulkResultSummary').textContent=total+' vorgesehen · '+success+' erfolgreich · '+failed.length+' fehlgeschlagen · '+remaining.length+' nicht bearbeitet';$('bulkResultContext').textContent=(add?'Hinzufügen zu ':'Entfernen aus ')+(lists.find(l=>l.id===listId)?.title||'Liste')+'. Bereits erfolgreiche Änderungen bleiben bestehen.';$('bulkRetryFailed').disabled=!failed.length;$('bulkSelectRemaining').disabled=!remaining.length;$('bulkResumeRemaining').disabled=!remaining.length;if(result.errors?.length){$('bulkResultContext').textContent+=' Hinweise: '+result.errors.slice(0,3).map(e=>e.reason+' ('+e.count+'×)').join(' · ')} }
 function prepareBulk(job){if(!bulkControlsEnabled({membershipReady,bulkBusy})||!job||getUser()?.id!==job.uid||selected!==job.listId)return;const list=lists.find(l=>l.id===job.listId&&!l.archived);if(!list)return;const eligible=eligibleBulkTargets(job.targets,wishes.map(w=>w.id),assignedIds,job.add);if(!eligible.length){$('bulkStatus').textContent='Keine ausstehenden Änderungen mehr vorhanden.';return}pendingBulk={...job,targets:eligible};$('bulkConfirmTitle').textContent=job.add?'Wünsche zur Liste hinzufügen':'Wünsche aus der Liste entfernen';$('bulkConfirmDescription').textContent=eligible.length+' Wünsche '+(job.add?'zu „'+list.title+'“ hinzufügen?':'aus „'+list.title+'“ entfernen?')+' Die Wünsche selbst bleiben erhalten.';$('bulkConfirmSample').textContent=eligible.slice(0,5).map(id=>'• '+(wishes.find(w=>w.id===id)?.wishlist_products?.title||'Wunsch')).join('\n')+(eligible.length>5?'\n… und '+(eligible.length-5)+' weitere':'');$('bulkConfirmDialog').showModal()}
 async function bulkAssign(add){
  if(!bulkControlsEnabled({membershipReady,bulkBusy})||!selected||!bulkIds.size)return;
  const uid=owner(),listId=selected,targets=eligibleBulkTargets(bulkIds,wishes.map(w=>w.id),assignedIds,add);
  if(!targets.length){$('bulkStatus').textContent='Alle ausgewählten Wünsche haben bereits den gewünschten Zustand.';return}
  const list=lists.find(l=>l.id===listId);if(!list||list.archived){$('bulkStatus').textContent='Bitte eine aktive Liste wählen.';return}
  prepareBulk({uid,listId,add,targets});
 }
 function reportBulk(done,total,success,failed){$('bulkProgressBar').max=Math.max(1,total);$('bulkProgressBar').value=done;$('bulkProgressText').textContent=done+' von '+total+' verarbeitet';$('bulkProgressDetails').textContent=success+' erfolgreich · '+failed+' fehlgeschlagen'+(bulkStopRequested?' · Stopp angefordert':'')}
 async function applyBulk(){
  const job=pendingBulk;if(!job||bulkBusy)return;if(activeWishMutations.size){$('bulkStatus').textContent='Ein ausgewählter Wunsch wird gerade bearbeitet. Bitte danach erneut bestätigen.';return}
  pendingBulk=null;$('bulkConfirmDialog').close();
  const {uid,listId,add,targets}=job;
  if(!bulkContextValid(job,{userId:getUser()?.id,listId:selected,ready:membershipReady,activeListIds:new Set(lists.filter(l=>!l.archived).map(l=>l.id))}))return;
   const currentTargets=new Set(eligibleBulkTargets(targets,wishes.map(w=>w.id),assignedIds,add));if(currentTargets.size!==targets.length||targets.some(id=>!currentTargets.has(id))){$('bulkStatus').textContent='Die Listenzuordnung hat sich geändert. Bitte Auswahl und Aktion erneut prüfen.';return}
  const generation=loadGeneration,run=++bulkRunId;bulkBusy=true;bulkStopRequested=false;lastBulkResult=null;$('bulkResultPanel').hidden=true;
  $('bulkProgressPanel').hidden=false;$('bulkStop').disabled=false;
  updateBulkToolbar();reportBulk(0,targets.length,0,0);
  try{
   const result=await executeBulkJob({
    targets,
    isCurrent:()=>run===bulkRunId&&generation===loadGeneration&&getUser()?.id===uid&&selected===listId,
    shouldStop:()=>bulkStopRequested,
    write:async wishId=>{
     const q=add?db.from('wishlist_list_items').insert({list_id:listId,wish_id:wishId,user_id:uid}):db.from('wishlist_list_items').delete().eq('list_id',listId).eq('wish_id',wishId).eq('user_id',uid);
     return q;
    },
    onProgress:({done,total,success,failed})=>{if(run===bulkRunId&&generation===loadGeneration&&getUser()?.id===uid&&selected===listId)reportBulk(done,total,success,failed)}
   });
   if(result.invalidated||run!==bulkRunId||generation!==loadGeneration||getUser()?.id!==uid||selected!==listId)return;
   for(const id of result.completed)bulkIds.delete(id);
   const summary={uid,listId,add,total:result.total,success:result.success,failed:result.failed,remaining:result.remaining,interrupted:result.interrupted,errors:result.errors};
   $('bulkStatus').textContent='Sammelaktion beendet. Details stehen in der Ergebnisübersicht.';
   try{await load({afterBulk:true})}catch(e){if(getUser()?.id===uid&&run===bulkRunId)msg('Zuordnungen aktualisiert, aber das Neuladen ist fehlgeschlagen: '+(e.message||'Unbekannter Fehler'))}
   if(getUser()?.id===uid&&run===bulkRunId&&selected===listId){bulkHistory.unshift({...summary,time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),listTitle:lists.find(l=>l.id===listId)?.title||'Liste'});bulkHistory=bulkHistory.slice(0,10);renderBulkHistory();showBulkResult(summary)}
  }finally{
   if(run===bulkRunId){bulkBusy=false;bulkStopRequested=false;$('bulkStop').disabled=true;$('bulkProgressPanel').hidden=true;if(getUser()?.id===uid&&selected===listId){updateBulkToolbar();renderWishCards()}}
  }
 }
 async function moveSelectedWishes(){
  if(!bulkControlsEnabled({membershipReady,bulkBusy})||!getUser())return;
  const uid=owner(),sourceId=selected,targetId=$('bulkMoveTarget').value;
  const source=lists.find(l=>l.id===sourceId&&!l.archived),target=lists.find(l=>l.id===targetId&&!l.archived);
  if(!source||!target||sourceId===targetId)return msg('Bitte zwei verschiedene aktive Listen auswählen.');
  const loadedWishIds=new Set(wishes.map(w=>w.id));
  const targets=[...bulkIds].filter(id=>assignedIds.has(id)&&loadedWishIds.has(id));
  const skipped=bulkIds.size-targets.length;
  if(!targets.length)return msg('Nur Wünsche, die bereits in dieser Liste liegen, können verschoben werden.');
  if(activeWishMutations.size)return msg('Ein Wunsch wird gerade bearbeitet. Bitte danach erneut versuchen.');if(!window.confirm(targets.length+' Wünsche von „'+source.title+'“ nach „'+target.title+'“ verschieben?'+(skipped?' '+skipped+' nicht zugeordnete Auswahl(en) werden übersprungen.':'')+' Die Wünsche bleiben erhalten. Ein Stopp wirkt vor dem nächsten Wunsch; bei Fehlern kann ein Wunsch in beiden Listen stehen.'))return;if(!bulkControlsEnabled({membershipReady,bulkBusy})||getUser()?.id!==uid||selected!==sourceId||!lists.some(l=>l.id===targetId&&!l.archived)||activeWishMutations.size||targets.some(id=>!assignedIds.has(id)||!wishes.some(w=>w.id===id)))return;
  const generation=loadGeneration,run=++bulkRunId;
  const current=()=>getUser()?.id===uid&&selected===sourceId&&generation===loadGeneration&&run===bulkRunId;
  let moved=0,failed=0,partial=0,stopped=false;
  bulkBusy=true;bulkStopRequested=false;
  $('bulkProgressPanel').hidden=false;$('bulkStop').disabled=false;
  updateBulkToolbar();reportBulk(0,targets.length,0,0);
  try{
   for(const wishId of targets){
    if(!current()||bulkStopRequested){stopped=true;break}
    try{
     if(!membershipByList.get(targetId)?.has(wishId)){
      const {error}=await db.from('wishlist_list_items').insert({list_id:targetId,wish_id:wishId,user_id:uid});
      if(error)throw error;
     }
     if(!current()){stopped=true;partial++;if(getUser()?.id===uid)msg('Zielzuordnung gespeichert, aber die Ursprungsliste wurde wegen eines Kontextwechsels nicht geändert. Bitte beide Listen prüfen.');break}
     // Complete the current source removal before honoring Stop on the next wish.
     const {error}=await db.from('wishlist_list_items').delete().eq('list_id',sourceId).eq('wish_id',wishId).eq('user_id',uid);
     if(error){partial++;failed++;if(current())msg('Zielzuordnung gespeichert, aber Entfernen aus der Ursprungsliste fehlgeschlagen. Bitte beide Listen prüfen.');continue}
     moved++;bulkIds.delete(wishId);
    }catch(e){failed++;if(current())msg('Ein Wunsch konnte nicht verschoben werden: '+(e.message||'Unbekannter Fehler'))}
    finally{if(current())reportBulk(moved+failed,targets.length,moved,failed)}
   }
   if(current()){
    const summary=moved+' verschoben, '+failed+' fehlgeschlagen'+(skipped?', '+skipped+' nicht in dieser Liste – übersprungen':'')+(stopped?', Vorgang gestoppt':'')+(partial?', '+partial+' möglicherweise in beiden Listen – bitte prüfen':'')+'.';
    try{await load({afterBulk:true});if(getUser()?.id===uid&&selected===sourceId&&run===bulkRunId)$('bulkStatus').textContent=summary}
    catch(e){if(current()){msg('Bitte Listen neu laden: '+(e.message||'Ladefehler'));$('bulkStatus').textContent=summary}}
   }
  }finally{
   if(run===bulkRunId){bulkBusy=false;bulkStopRequested=false;$('bulkProgressPanel').hidden=true;$('bulkStop').disabled=true;if(getUser()?.id===uid&&selected===sourceId){updateBulkToolbar();renderWishCards()}}
  }
 }
 async function moveWishToList(wishId,sourceListId,targetListId,control){
  if(bulkBusy||!membershipReady||!getUser()||sourceListId===targetListId||activeWishMutations.has(getUser().id+':'+wishId))return;
  const uid=owner(),generation=loadGeneration;
  const source=lists.find(l=>l.id===sourceListId&&!l.archived);
  const target=lists.find(l=>l.id===targetListId&&!l.archived);
  if(!source||!target||selected!==sourceListId||!assignedIds.has(wishId))return msg('Bitte einen zugeordneten Wunsch aus einer aktiven Liste auswählen.');
  if(!window.confirm('Wunsch von „'+source.title+'“ nach „'+target.title+'“ verschieben? Der Wunsch bleibt bestehen; die Änderung erfolgt in zwei Schritten.'))return;if(bulkBusy||!membershipReady||activeWishMutations.has(uid+':'+wishId)||selected!==sourceListId||getUser()?.id!==uid||generation!==loadGeneration||!assignedIds.has(wishId)||!lists.some(l=>l.id===targetListId&&!l.archived))return;
  const current=()=>getUser()?.id===uid&&generation===loadGeneration&&selected===sourceListId;
  activeWishMutations.add(uid+':'+wishId);control.disabled=true;
  try{
   const alreadyThere=membershipByList.get(targetListId)?.has(wishId);
   if(!alreadyThere){
    const {error}=await db.from('wishlist_list_items').insert({list_id:targetListId,wish_id:wishId,user_id:uid});
    if(error)throw error;
   }
   if(!current()){if(getUser()?.id===uid&&selected===sourceListId)msg('Zielzuordnung gespeichert. Bitte Listen neu laden, bevor du fortfährst.');return}
   const {error}=await db.from('wishlist_list_items').delete().eq('list_id',sourceListId).eq('wish_id',wishId).eq('user_id',uid);
   if(error){if(current())msg('Wunsch wurde zur Zielliste hinzugefügt, konnte aber nicht aus der Ursprungsliste entfernt werden: '+error.message+'. Bitte erneut prüfen.');if(current())try{await load()}catch{}return}
   try{await load()}catch(e){if(getUser()?.id===uid&&selected===sourceListId)msg('Wunsch verschoben, aber Listen konnten nicht neu geladen werden: '+(e.message||'Ladefehler')+'. Bitte aktualisieren.');return}
   if(getUser()?.id===uid&&selected===sourceListId)msg('Wunsch nach „'+target.title+'“ verschoben. Die Ausgangsliste bleibt geöffnet.')
  }catch(e){if(getUser()?.id===uid&&selected===sourceListId)msg('Verschieben fehlgeschlagen: '+(e.message||'Unbekannter Fehler'))}
  finally{activeWishMutations.delete(uid+':'+wishId);control.disabled=false}
 }
 let compactWishView=false;
 function setWishView(compact){compactWishView=compact;$('wishViewCards').setAttribute('aria-pressed',String(!compact));$('wishViewCompact').setAttribute('aria-pressed',String(compact));$('listWishCards').classList.toggle('is-compact',compact)}
 function renderWishCards(){
  updateActiveListContext();
  const cards=$('listWishCards');cards.replaceChildren();
  const list=lists.find(l=>l.id===selected&&!l.archived);
  if(!list||!membershipReady){$('wishLoadMore').hidden=true;$('wishShowAssigned').disabled=true;$('wishSelectShown').disabled=true;$('wishSelectUnassigned').disabled=true;$('wishSelectAssigned').disabled=true;$('wishClearSelection').disabled=true;updateBulkToolbar([]);return}
  $('wishClearSelection').disabled=bulkBusy||!bulkIds.size;
  $('wishShowAssigned').disabled=bulkBusy||!membershipReady;
  $('wishSelectAssigned').disabled=bulkBusy||list.archived||!wishes.some(w=>assignedIds.has(w.id));
  $('wishSelectUnassigned').disabled=bulkBusy||list.archived||!wishes.some(w=>!allAssignedIds.has(w.id));
  $('wishShowAssigned').setAttribute('aria-pressed',String(!selectedOnlyView&&$('listWishAssignment').value==='assigned'));
  $('wishSelectedOnly').setAttribute('aria-pressed',String(selectedOnlyView));$('wishSelectedOnly').textContent=selectedOnlyView?'Alle passenden zeigen':'Nur Auswahl ('+bulkIds.size+')';
  const results=visibleWishes();updateBulkToolbar(results);$('wishSelectedOnly').disabled=bulkBusy||(!selectedOnlyView&&!bulkIds.size);$('wishSelectAssigned').textContent='Zugeordnete auswählen ('+wishes.filter(w=>assignedIds.has(w.id)).length+')';$('wishSelectUnassigned').textContent='Ohne Liste auswählen ('+wishes.filter(w=>!allAssignedIds.has(w.id)).length+')';$('wishSelectShown').disabled=bulkBusy||list.archived||!results.length;$('wishSelectShown').textContent=results.slice(0,visibleLimit).every(w=>bulkIds.has(w.id))&&results.length?'Sichtbare abwählen':'Sichtbare auswählen';
  $('listWishCount').textContent=Math.min(results.length,visibleLimit)+' von '+results.length+' passenden Wünschen sichtbar ('+wishes.length+' geladen, '+bulkIds.size+' ausgewählt).';$('wishLoadMore').hidden=results.length<=visibleLimit;
  if(!results.length){const empty=document.createElement('p');empty.textContent=selectedOnlyView?'Keine Wünsche mehr ausgewählt. Zeige alle passenden Wünsche oder wähle neue aus.':$('listWishAssignment').value==='global-unassigned'&&!wishes.some(w=>!allAssignedIds.has(w.id))?'Alle Wünsche sind bereits mindestens einer Liste zugeordnet.':'Keine passenden Wünsche gefunden. Passe deine Filter an oder füge einen Wunsch hinzu.';cards.append(empty);
   const resetFilters=button(selectedOnlyView?'Alle Wünsche wieder anzeigen':'Filter zurücksetzen',async()=>{if(bulkBusy||!membershipReady||!lists.some(l=>l.id===selected&&!l.archived))return;selectedOnlyView=false;$('listWishSearch').value='';$('listWishPriority').value='all';$('listWishCategory').value='all';$('listWishMarker').value='all';$('listWishAssignment').value='all';$('listWishSort').value='newest';visibleLimit=100;renderWishCards()});resetFilters.setAttribute('aria-label',selectedOnlyView?'Alle ausgewählten Wünsche wieder anzeigen':'Wunschfilter zurücksetzen');cards.append(resetFilters)}
  const membershipCounts=new Map();for(const ids of membershipByList.values())for(const id of ids)membershipCounts.set(id,(membershipCounts.get(id)||0)+1);
  for(const wish of results.slice(0,visibleLimit)){
   const card=document.createElement('article');card.className='list-wish-card';card.dataset.wishId=wish.id;
   const selectRow=document.createElement('label');selectRow.className='wish-card-select';const selectCheck=document.createElement('input');selectCheck.type='checkbox';selectCheck.setAttribute('aria-label','Für Sammelaktion auswählen: '+(wish.wishlist_products?.title||'Wunsch'));selectCheck.checked=bulkIds.has(wish.id);selectCheck.disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||list.archived;selectCheck.onchange=()=>{if(getUser()?.id!==loadedOwner||selected!==list.id||!wishes.some(w=>w.id===wish.id)||!bulkControlsEnabled({membershipReady,bulkBusy})||list.archived){selectCheck.checked=!selectCheck.checked;return}if(selectCheck.checked)bulkIds.add(wish.id);else bulkIds.delete(wish.id);if(selectedOnlyView)renderWishCards();else updateBulkToolbar()};const selectText=document.createElement('span');selectText.textContent='Für Mehrfachaktion auswählen';selectRow.append(selectCheck,selectText);card.append(selectRow);
   const title=document.createElement('h4');title.textContent=wish.wishlist_products?.title||'Wunsch';
   const priority=document.createElement('p');priority.className='wish-priority';priority.textContent=['','Sehr wichtig','Normal','Irgendwann'][wish.priority]||'Priorität '+wish.priority;
   card.append(title,priority);const membershipCount=membershipCounts.get(wish.id)||0;const membershipInfo=document.createElement('small');membershipInfo.className='wish-membership-count';membershipInfo.textContent=membershipCount+' '+(membershipCount===1?'Liste':'Listen');card.append(membershipInfo);const category=WISH_CATEGORIES.find(c=>c.id===wishCategories[wish.id]);if(category){const chip=document.createElement('span');chip.className='wish-category-chip';chip.textContent=category.label;card.append(chip)}
   const markers=document.createElement('div');markers.className='wish-marker-actions';for(const [marker,off,on] of [['star','☆ Merken','★ Favorit'],['later','⏳ Später','✓ Für später']]){const active=wishMarkers[wish.id]===marker;const control=button(active?on:off,async()=>setMarker(wish.id,marker));control.disabled=bulkBusy;control.setAttribute('aria-pressed',String(active));control.setAttribute('aria-label',(active?'Markierung entfernen: ':'Wunsch markieren: ')+(wish.wishlist_products?.title||'Wunsch'));markers.append(control)}card.append(markers);
   if(wish.note){const note=document.createElement('p');note.className='wish-card-note';note.textContent=wish.note;card.append(note);
    if(wish.note.length>180){note.classList.add('is-collapsed');const toggle=button('Notiz vollständig anzeigen',async()=>{const collapsed=note.classList.toggle('is-collapsed');toggle.textContent=collapsed?'Notiz vollständig anzeigen':'Notiz einklappen';toggle.setAttribute('aria-expanded',String(!collapsed))});toggle.className='wish-note-toggle';toggle.setAttribute('aria-label','Notiz anzeigen: '+(wish.wishlist_products?.title||'Wunsch'));toggle.setAttribute('aria-expanded','false');card.append(toggle)}
   }
   const row=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label','In dieser Liste: '+(wish.wishlist_products?.title||'Wunsch'));check.checked=assignedIds.has(wish.id);check.disabled=!bulkControlsEnabled({membershipReady,bulkBusy})||list.archived;
   const caption=document.createElement('span');caption.textContent='In dieser Liste';
   check.onchange=async()=>{if(getUser()?.id!==loadedOwner||selected!==list.id||!wishes.some(w=>w.id===wish.id)||!bulkControlsEnabled({membershipReady,bulkBusy})||list.archived||activeWishMutations.has(owner()+':'+wish.id)){check.checked=!check.checked;return}activeWishMutations.add(owner()+':'+wish.id);check.disabled=true;const uid=owner(),generation=loadGeneration,wanted=check.checked;try{
    const query=wanted?db.from('wishlist_list_items').insert({list_id:list.id,wish_id:wish.id,user_id:uid}):db.from('wishlist_list_items').delete().eq('list_id',list.id).eq('wish_id',wish.id).eq('user_id',uid);
    const {error}=await query;if(error)throw error;if(getUser()?.id!==uid||selected!==list.id||generation!==loadGeneration)return;
    if(wanted){assignedIds.add(wish.id);membershipByList.get(list.id)?.add(wish.id)}else{assignedIds.delete(wish.id);membershipByList.get(list.id)?.delete(wish.id)}
    await load();if(getUser()?.id===uid&&selected===list.id)msg('Wunschzuordnung gespeichert');
   }catch(e){if(getUser()?.id===uid&&selected===list.id&&generation===loadGeneration){check.checked=!wanted;msg(e.message||'Zuordnung fehlgeschlagen')}}finally{activeWishMutations.delete(uid+':'+wish.id);if(getUser()?.id===uid&&selected===list.id&&generation===loadGeneration)check.disabled=false}};
   row.append(check,caption);card.append(row);
   if(assignedIds.has(wish.id)&&!list.archived){
    const destinations=lists.filter(l=>!l.archived&&l.id!==list.id);
    if(destinations.length){
     const moveRow=document.createElement('div');moveRow.className='wish-move-actions';
     const destination=document.createElement('select');destination.setAttribute('aria-label','Zielliste für '+(wish.wishlist_products?.title||'Wunsch'));
     const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Zielliste wählen';destination.append(placeholder);
     for(const target of destinations){const option=document.createElement('option');option.value=target.id;option.textContent=target.icon+' '+target.title;destination.append(option)}
     const move=button('Verschieben',async()=>{if(!destination.value)return msg('Bitte zuerst eine Zielliste wählen.');await moveWishToList(wish.id,list.id,destination.value,move)});move.setAttribute('aria-label','Wunsch verschieben: '+(wish.wishlist_products?.title||'Wunsch'));destination.disabled=bulkBusy;
     move.disabled=!membershipReady||bulkBusy;moveRow.append(destination,move);card.append(moveRow);
    }
   }
   const toolsRow=document.createElement('div');toolsRow.className='wish-card-tools';
   
    const quickDetail=button('Details · Notiz & Kategorie',async()=>openWishDetail(wish));quickDetail.setAttribute('aria-label','Details und persönliche Kategorie für '+(wish.wishlist_products?.title||'Wunsch')+' öffnen');toolsRow.append(quickDetail);
   toolsRow.append(button('Titel kopieren',async()=>{const title=wish.wishlist_products?.title||'Wunsch';if(!navigator.clipboard?.writeText){msg('Kopieren ist in diesem Browser nicht verfügbar.');return}try{await navigator.clipboard.writeText(title);msg('Wunschtitel kopiert.')}catch{msg('Kopieren nicht erlaubt. Bitte den Titel manuell markieren.')}}));
   card.append(toolsRow);cards.append(card);
  }
 }
 function setItemsFeedback(state,message){const panel=$('listItemsFeedback');panel.hidden=state==='ready';$('listItemsFeedbackText').textContent=message;$('listItemsRetry').hidden=state!=='error';$('listItemsRetry').disabled=state==='loading'}
 async function syncListQuickSwitch(){
  const select=$('listQuickSwitch'),previous=selected;
  select.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Liste wählen';select.append(placeholder);
  for(const list of [...lists].filter(l=>!l.archived).sort((a,b)=>Number(favoriteIds.has(b.id))-Number(favoriteIds.has(a.id))||a.title.localeCompare(b.title,'de'))){const option=document.createElement('option');option.value=list.id;option.textContent=(favoriteIds.has(list.id)?'★ ':'')+list.icon+' '+list.title+' · '+(listCounts.get(list.id)||0)+' Wünsche'+(list.archived?' (archiviert)':'');select.append(option)}
  select.value=lists.some(l=>l.id===previous&&!l.archived)?previous:'';
  select.disabled=bulkBusy||!lists.some(l=>!l.archived);
 }
 function updateActiveListContext(){
  const list=lists.find(l=>l.id===selected&&!l.archived);
  $('activeListHeading').textContent=list?list.icon+' '+list.title:'Wünsche dieser Liste';
  $('activeListSummary').textContent=list?(listCounts.get(list.id)||0)+' zugeordnet · '+(list.archived?'Archiviert – nur ansehen':'Aktive Liste'):'Wähle eine Liste aus.';$('listItemsNewWish').disabled=!list||list.archived||!membershipReady;
  const quick={quickAllWishes:$('listWishAssignment').value==='all'&&$('listWishMarker').value==='all',quickAssignedWishes:$('listWishAssignment').value==='assigned',quickUnassignedWishes:$('listWishAssignment').value==='global-unassigned',quickFavoriteWishes:$('listWishMarker').value==='star'};
  for(const [id,pressed] of Object.entries(quick))$(id).setAttribute('aria-pressed',String(pressed));
 }
 function setQuickWishFilter(mode){
  if(bulkBusy)return;
  $('listWishSearch').value='';$('listWishPriority').value='all';$('listWishCategory').value='all';selectedOnlyView=false;
  if(mode==='all'){$('listWishAssignment').value='all';$('listWishMarker').value='all'}
  if(mode==='assigned'){$('listWishAssignment').value='assigned';$('listWishMarker').value='all'}
  if(mode==='unassigned'){$('listWishAssignment').value='global-unassigned';$('listWishMarker').value='all'}
  if(mode==='favorite'){$('listWishAssignment').value='all';$('listWishMarker').value='star'}
  visibleLimit=100;renderWishCards();
 }
 function showItems(){
  updateActiveListContext();
  const list=lists.find(x=>x.id===selected&&!x.archived);const generation=++itemsGeneration;
  if(!list){$('listWishCards').replaceChildren();$('listWishCount').textContent='Wähle eine aktive Liste aus.';$('wishLoadMore').hidden=true;updateBulkToolbar([]);return}
  if(!membershipReady){assignedIds=new Set();$('wishLoadMore').hidden=true;$('listWishCards').replaceChildren();$('listWishCount').textContent='';updateBulkToolbar([]);setItemsFeedback('loading','Zuordnungen werden geladen …');return}
  assignedIds=membershipForSelectedList({membershipReady,membershipByList,listId:list.id});syncBulkMoveTargets();
  if(generation!==itemsGeneration)return;
  setItemsFeedback('ready','');renderWishCards();
 }
 async function retryItemsLoad(){if(bulkBusy)return;const id=getUser()?.id;try{await load()}catch(e){if(getUser()?.id!==id)return;msg(e.message||'Ladefehler')}}
 $('listItemsRetry').onclick=retryItemsLoad;

 $('listItemsNewWish').onclick=()=>{const list=lists.find(l=>l.id===selected&&!l.archived);if(!list||!membershipReady)return;
  $('wishListSelect').value=list.id;$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('listQuickSwitch').onchange=()=>{const id=$('listQuickSwitch').value;if(!bulkBusy&&lists.some(l=>l.id===id&&!l.archived))openList(id)};
 $('listItemsBack').onclick=()=>{$('listsContent').scrollIntoView({behavior:'smooth',block:'start'})};
 $('quickAllWishes').onclick=()=>setQuickWishFilter('all');
 $('quickAssignedWishes').onclick=()=>setQuickWishFilter('assigned');
 $('quickUnassignedWishes').onclick=()=>setQuickWishFilter('unassigned');
 $('quickFavoriteWishes').onclick=()=>setQuickWishFilter('favorite');
 $('wishViewCards').onclick=()=>{if(!bulkBusy)setWishView(false)};
 $('wishViewCompact').onclick=()=>{if(!bulkBusy)setWishView(true)};
 $('wishShowAssigned').onclick=()=>{if(bulkBusy||!membershipReady)return;setQuickWishFilter('assigned');$('listWishCards').scrollIntoView({behavior:'smooth',block:'start'})};
 $('wishClearSelection').onclick=()=>{if(bulkBusy)return;bulkIds.clear();selectedOnlyView=false;renderWishCards()};
 $('wishSelectUnassigned').onclick=()=>{if(bulkBusy||!membershipReady||!lists.some(l=>l.id===selected&&!l.archived))return;const ids=wishes.filter(w=>!allAssignedIds.has(w.id)).map(w=>w.id);if(!ids.length)return;bulkIds.clear();for(const id of ids)bulkIds.add(id);selectedOnlyView=true;$('listWishAssignment').value='global-unassigned';$('listWishSearch').value='';$('listWishPriority').value='all';$('listWishCategory').value='all';$('listWishMarker').value='all';$('listWishSort').value='newest';visibleLimit=100;renderWishCards();msg(ids.length+' Wünsche ohne Liste ausgewählt. Mit „Hinzufügen“ kannst du sie der aktuellen Liste zuordnen.')};
 $('wishSelectAssigned').onclick=()=>{if(bulkBusy||!membershipReady||!lists.some(l=>l.id===selected&&!l.archived))return;const ids=wishes.filter(w=>assignedIds.has(w.id)).map(w=>w.id);if(!ids.length)return;bulkIds.clear();for(const id of ids)bulkIds.add(id);selectedOnlyView=true;$('listWishAssignment').value='assigned';$('listWishSearch').value='';$('listWishPriority').value='all';$('listWishCategory').value='all';$('listWishMarker').value='all';$('listWishSort').value='newest';visibleLimit=100;renderWishCards();msg(ids.length+' zugeordnete Wünsche ausgewählt.')};
 $('wishSelectedOnly').onclick=()=>{if(bulkBusy)return;selectedOnlyView=!selectedOnlyView;visibleLimit=100;renderWishCards()};
 $('wishClearFilters').onclick=()=>{if(bulkBusy)return;selectedOnlyView=false;for(const [id,value] of [['listWishSearch',''],['listWishPriority','all'],['listWishCategory','all'],['listWishMarker','all'],['listWishAssignment','assigned'],['listWishSort','newest']])$(id).value=value;visibleLimit=100;renderWishCards()};
 $('wishSelectShown').onclick=()=>{if(bulkBusy||!membershipReady||!lists.some(l=>l.id===selected&&!l.archived))return;const ids=visibleWishes().slice(0,visibleLimit).map(w=>w.id);if(!ids.length)return;const all=ids.every(id=>bulkIds.has(id));for(const id of ids){if(all)bulkIds.delete(id);else bulkIds.add(id)}if(all&&selectedOnlyView)selectedOnlyView=false;renderWishCards()};
 $('wishLoadMore').onclick=()=>{if(bulkBusy)return;visibleLimit+=100;renderWishCards()};
 $('bulkSelectVisible').onchange=()=>{if(!bulkControlsEnabled({membershipReady,bulkBusy})||!lists.some(l=>l.id===selected&&!l.archived))return;const checked=$('bulkSelectVisible').checked;for(const w of visibleWishes().slice(0,visibleLimit)){if(checked)bulkIds.add(w.id);else bulkIds.delete(w.id)}if(!checked&&selectedOnlyView)selectedOnlyView=false;renderWishCards()};
 $('bulkHistoryClear').onclick=()=>{if(bulkBusy)return;bulkHistory=[];renderBulkHistory()};$('bulkResumeRemaining').onclick=()=>{const r=lastBulkResult;if(r)prepareBulk({uid:r.uid,listId:r.listId,add:r.add,targets:r.remaining})};
 $('bulkRetryFailed').onclick=()=>{const r=lastBulkResult;if(r)prepareBulk({uid:r.uid,listId:r.listId,add:r.add,targets:r.failed})};$('bulkSelectRemaining').onclick=()=>{const r=lastBulkResult;if(bulkBusy||!membershipReady||!r||getUser()?.id!==r.uid||selected!==r.listId)return;for(const id of r.remaining)bulkIds.add(id);renderWishCards();$('bulkStatus').textContent=r.remaining.length+' nicht bearbeitete Wünsche ausgewählt.'};$('bulkDismissResult').onclick=()=>{if(bulkBusy)return;$('bulkResultPanel').hidden=true;lastBulkResult=null};
 $('bulkStop').onclick=()=>{bulkStopRequested=true;$('bulkStop').disabled=true;$('bulkProgressDetails').textContent='Stoppe nach der laufenden Änderung …'};
 $('bulkSelectCategory').onclick=()=>{if(!bulkControlsEnabled({membershipReady,bulkBusy})||!lists.some(l=>l.id===selected&&!l.archived))return;if($('listWishCategory').value==='all'){$('bulkStatus').textContent='Bitte zuerst eine Kategorie auswählen.';return}for(const wish of visibleWishes().slice(0,visibleLimit))bulkIds.add(wish.id);renderWishCards();$('bulkStatus').textContent='Angezeigte Wünsche dieser Kategorie ausgewählt.'};
 $('bulkConfirmCancel').onclick=()=>{$('bulkConfirmDialog').close();pendingBulk=null};$('bulkConfirmDialog').addEventListener('close',()=>{pendingBulk=null});$('bulkConfirmApply').onclick=()=>applyBulk().catch(e=>{$('bulkStatus').textContent=e.message});
 $('wishDetailSelect').onclick=()=>{if(!detailWishId||!membershipReady||bulkBusy||!lists.some(l=>l.id===selected&&!l.archived)||!visibleWishes().slice(0,visibleLimit).some(w=>w.id===detailWishId))return;
  if(bulkIds.has(detailWishId))bulkIds.delete(detailWishId);else bulkIds.add(detailWishId);
  $('wishDetailSelect').textContent=bulkIds.has(detailWishId)?'Aus Sammelauswahl entfernen':'Für Sammelaktion auswählen';renderWishCards()};
 $('wishDetailJump').onclick=()=>{const id=detailWishId;if(!id||!membershipReady)return;const list=lists.find(l=>!l.archived&&membershipByList.get(l.id)?.has(id));if(list)jumpToWishInList(id,list.id);else msg('Der Wunsch ist keiner aktiven Liste zugeordnet.')};
 $('listsResetFilters').onclick=()=>{if(bulkBusy)return;$('listsSearch').value='';$('listsView').value='all';$('listsSort').value='favorites';render()};
 $('bulkMoveTarget').onchange=()=>{if(!bulkBusy)updateBulkToolbar()};
 $('bulkMove').onclick=()=>moveSelectedWishes().catch(e=>{$('bulkStatus').textContent=e.message||'Verschieben fehlgeschlagen'});
 $('bulkClear').onclick=()=>{if(bulkBusy)return;bulkIds.clear();selectedOnlyView=false;renderWishCards()};$('bulkAdd').onclick=()=>bulkAssign(true).catch(e=>{$('bulkStatus').textContent=e.message});$('bulkRemove').onclick=()=>bulkAssign(false).catch(e=>{$('bulkStatus').textContent=e.message});
 const globalOption=document.createElement('option');globalOption.value='global-unassigned';globalOption.textContent='In keiner Liste';$('listWishAssignment').append(globalOption);
 $('showUnassigned').onclick=()=>{if(bulkBusy||!membershipReady)return;selectedOnlyView=false;$('listWishAssignment').value='global-unassigned';$('listWishSearch').value='';$('listWishPriority').value='all';$('listWishCategory').value='all';$('listWishMarker').value='all';$('listWishSort').value='newest';bulkIds.clear();renderWishCards();$('listWishCards').scrollIntoView({behavior:'smooth',block:'start'});};
 for(const id of ['listsSearch','listsView','listsSort'])$(id).addEventListener('input',()=>{if(!bulkBusy)render()});
 $('homeFavorites').onclick=()=>{if(bulkBusy)return;$('listsView').value='favorites';render();$('listsContent').scrollIntoView({behavior:'smooth',block:'start'})};
 $('homeNewWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('homeNewList').onclick=()=>{$('listTitle').scrollIntoView({behavior:'smooth',block:'center'});$('listTitle').focus()};
 for(const category of WISH_CATEGORIES){for(const select of [$('listWishCategory'),$('wishDetailCategory')]){const option=document.createElement('option');option.value=category.id;option.textContent=category.label;select.append(option)}}const noCategory=document.createElement('option');noCategory.value='';noCategory.textContent='Ohne Kategorie';$('wishDetailCategory').prepend(noCategory);
 $('wishDetailStar').onclick=()=>{if(detailWishId)setMarker(detailWishId,'star')};$('wishDetailLater').onclick=()=>{if(detailWishId)setMarker(detailWishId,'later')};
 $('listWishClearFilters').onclick=()=>{if(bulkBusy)return;selectedOnlyView=false;for(const [id,value] of [['listWishSearch',''],['listWishPriority','all'],['listWishCategory','all'],['listWishMarker','all'],['listWishAssignment','assigned'],['listWishSort','newest']])$(id).value=value;renderWishCards()};
 $('wishDetailSaveCategory').onclick=saveCategory;$('wishDetailClose').onclick=()=>$('wishDetailDialog').close();$('wishDetailDone').onclick=()=>$('wishDetailDialog').close();$('wishDetailDialog').addEventListener('close',()=>{detailWishId=null});
 for(const id of ['listWishSearch','listWishPriority','listWishCategory','listWishMarker','listWishAssignment','listWishSort'])$(id).addEventListener('input',()=>{if(bulkBusy)return;selectedOnlyView=false;visibleLimit=100;renderWishCards()});
 $('listTemplate').onchange=()=>{
  const template=LIST_TEMPLATES.find(t=>t.id===$('listTemplate').value)||LIST_TEMPLATES.at(-1);
  $('listTitle').value=template.title;$('listDescription').value=template.description;$('listIcon').value=template.icon;$('listColor').value=template.color;
 };
 function openEditor(list){
  if(bulkBusy||getUser()?.id!==loadedOwner||!lists.some(l=>l.id===list.id&&!l.archived))return;
  $('editListId').value=list.id;$('editListTitle').value=list.title;$('editListDescription').value=list.description||'';
  $('editListIcon').value=list.icon;$('editListColor').value=list.color;
  $('editListForm').hidden=false;$('editListTitle').focus();$('editListForm').scrollIntoView({behavior:'smooth',block:'nearest'});
 }
 $('cancelListEdit').onclick=()=>{$('editListForm').hidden=true;$('editListId').value='';};
 $('editListForm').onsubmit=async event=>{
  event.preventDefault();const id=owner(),generation=loadGeneration,listId=$('editListId').value;
  if(bulkBusy)return msg('Sammelaktion zuerst abschließen.');if(id!==loadedOwner)return;if(!lists.some(l=>l.id===listId&&!l.archived))return msg('Bitte eine aktive Liste bearbeiten.');
  const title=$('editListTitle').value.trim(),description=$('editListDescription').value.trim();
  if(!title||title.length>80||description.length>500)return msg('Bitte gültigen Namen und Beschreibung eingeben.');
  const save=$('saveListChanges');save.disabled=true;
  try{
   const {error}=await db.from('wishlist_lists').update({title,description,icon:$('editListIcon').value,color:$('editListColor').value}).eq('id',listId).eq('user_id',id);
   if(error)throw error;if(getUser()?.id!==id||generation!==loadGeneration)return;
   $('editListForm').hidden=true;$('editListId').value='';await load();if(getUser()?.id===id)msg('Listendesign gespeichert.');
  }catch(e){if(getUser()?.id===id&&generation===loadGeneration)msg(e.message||'Liste konnte nicht gespeichert werden')}finally{save.disabled=false}
 };
 $('mobileNewWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('mobileMyLists').onclick=()=>{$('listsContent').scrollIntoView({behavior:'smooth',block:'start'})};
 $('quickNewList').onclick=()=>{$('listTitle').focus();$('listTitle').scrollIntoView({behavior:'smooth',block:'center'})};
 $('quickAddWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('quickOpenSelected').onclick=()=>{if(!selected||!lists.some(l=>l.id===selected&&!l.archived))return msg('Bitte zuerst eine aktive Liste öffnen.');$('listItems').scrollIntoView({behavior:'smooth',block:'start'})};
 $('createList').onclick=async()=>{if(bulkBusy)return msg('Sammelaktion zuerst abschließen.');const id=owner(),generation=loadGeneration;const title=$('listTitle').value.trim();if(!title||title.length>80){msg('Listenname muss 1 bis 80 Zeichen enthalten.');return}const payload={user_id:id,title,description:$('listDescription').value.trim().slice(0,500),icon:$('listIcon').value,color:$('listColor').value,visibility:$('listVisibility').value};$('createList').disabled=true;try{const {error}=await db.from('wishlist_lists').insert(payload);if(error)throw error;if(getUser()?.id!==id||generation!==loadGeneration)return;$('listTitle').value='';$('listDescription').value='';await load()}catch(e){if(getUser()?.id===id&&generation===loadGeneration)msg(e.message||'Liste konnte nicht angelegt werden')}finally{$('createList').disabled=false}};
 $('refreshLists').onclick=()=>load().catch(e=>msg(e.message));
 return {refresh:()=>load().catch(e=>msg(e.message)),reset,assignWish,selectedList:()=>loadedOwner===getUser()?.id?editorSelect.value:''};
}
