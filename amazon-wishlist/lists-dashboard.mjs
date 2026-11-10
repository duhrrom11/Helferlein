// Multi-list dashboard. Requires LISTS-SCHEMA-PROPOSAL.sql to be reviewed and applied separately.
export function mountListsDashboard(db, getUser) {
 const $=id=>document.getElementById(id);
 const root=$('listsDashboard');
 let lists=[],wishes=[],selected=null,loadedOwner=null,loadGeneration=0;
 const editorSelect=$('wishListSelect');
 function syncEditor(){const previous=editorSelect.value;editorSelect.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Ohne Liste speichern';editorSelect.append(empty);for(const list of lists.filter(x=>!x.archived)){const option=document.createElement('option');option.value=list.id;option.textContent=list.icon+' '+list.title;editorSelect.append(option)}editorSelect.value=lists.some(x=>x.id===previous&&!x.archived)?previous:(lists.find(x=>x.title==='Meine Wünsche'&&!x.archived)?.id||'');editorSelect.disabled=!lists.length;}
 async function assignWish(wishId,listId,uid){if(!listId)return;const {error}=await db.from('wishlist_list_items').insert({list_id:listId,wish_id:wishId,user_id:uid});if(error)throw error;}
 function reset(){++loadGeneration;$('editListForm').hidden=true;$('editListId').value='';$('listsTotal').textContent='0';$('wishesTotal').textContent='0';loadedOwner=null;lists=[];wishes=[];selected=null;root.hidden=true;$('listsContent').replaceChildren();$('listItems').replaceChildren();syncEditor();}

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
   db.from('wishlist_wishes').select('id,note,wishlist_products(title)').eq('user_id',id).order('created_at',{ascending:false}).limit(200)
  ]);
  if(getUser()?.id!==id||generation!==loadGeneration)return;
  if(lr.error){$('listsTotal').textContent='0';$('wishesTotal').textContent='0';lists=[];wishes=[];syncEditor();$('listsContent').replaceChildren();msg('Listenverwaltung vorbereitet. Das Datenbankschema wurde noch nicht freigeschaltet.');return}
  if(wr.error)throw wr.error;
  loadedOwner=id;lists=lr.data||[];wishes=wr.data||[];syncEditor();if(!lists.some(x=>x.id===selected))selected=lists[0]?.id||null;
  msg(lists.length+' Listen · '+wishes.length+' geladene Wünsche');$('listsTotal').textContent=String(lists.length);$('wishesTotal').textContent=String(wishes.length);render();
 }
 function render(){
  const grid=$('listsContent');grid.replaceChildren();
  if(!lists.length){const p=document.createElement('p');p.textContent='Noch keine Listen. Erstelle deine erste Wunschliste.';grid.append(p)}
  for(const list of lists){
   const card=document.createElement('article');card.className='list-card'+(selected===list.id?' is-selected':'');card.style.borderTop='6px solid '+list.color;
   const cover=document.createElement('div');cover.className='list-card-cover';cover.style.background='linear-gradient(120deg,'+list.color+'33,'+list.color+'77)';cover.textContent=list.icon;card.append(cover);
   const heading=document.createElement('h3');heading.textContent=list.title;card.append(heading);
   const desc=document.createElement('p');desc.textContent=list.description||'Deine persönliche Wunschsammlung';card.append(desc);
   const meta=document.createElement('p');meta.className='list-card-meta';meta.textContent=(list.visibility==='public'?'Öffentlich (Freigabe folgt)':'Privat')+(list.archived?' · Archiviert':'');card.append(meta);
   const actions=document.createElement('div');actions.className='list-card-actions';card.append(actions);
   actions.append(button('Öffnen',async()=>{selected=list.id;render();$('listItems').scrollIntoView({behavior:'smooth',block:'start'})}));
   actions.append(button('Gestalten',async()=>{selected=list.id;render();openEditor(list)}));
   actions.append(button(list.archived?'Reaktivieren':'Archivieren',async()=>{const res=await db.from('wishlist_lists').update({archived:!list.archived}).eq('id',list.id).eq('user_id',owner());if(res.error)throw res.error;await load()}));
   actions.append(button('Duplizieren',async()=>{const uid=owner();const {data:copy,error}=await db.from('wishlist_lists').insert({user_id:uid,title:(list.title+' Kopie').slice(0,80),description:list.description,icon:list.icon,color:list.color,visibility:'private'}).select('id').single();if(error)throw error;const {data:originalItems,error:itemsError}=await db.from('wishlist_list_items').select('wish_id').eq('list_id',list.id).eq('user_id',uid);if(itemsError)throw itemsError;if(originalItems.length){const {error:copyError}=await db.from('wishlist_list_items').insert(originalItems.map(item=>({list_id:copy.id,wish_id:item.wish_id,user_id:uid})));if(copyError)throw copyError}await load()}));
   actions.append(button('Löschen',async()=>{if(!confirm('Liste löschen? Die Wünsche selbst bleiben erhalten.'))return;const {error}=await db.from('wishlist_lists').delete().eq('id',list.id).eq('user_id',owner());if(error)throw error;await load()}));
   grid.append(card);
  }
  showItems().catch(e=>msg(e.message));
 }
 async function showItems(){
  const area=$('listItems');area.replaceChildren();const list=lists.find(x=>x.id===selected);
  if(!list){area.textContent='Wähle eine Liste aus.';return}
  const title=document.createElement('h3');title.textContent='Wünsche in '+list.title;area.append(title);
  const id=owner();
  const {data,error}=await db.from('wishlist_list_items').select('wish_id').eq('list_id',list.id).eq('user_id',id);
  if(error)throw error;if(getUser()?.id!==id||selected!==list.id)return;
  const ids=new Set(data.map(x=>x.wish_id));
  for(const wish of wishes){
   const row=document.createElement('label');row.className='list-item-toggle';
   const check=document.createElement('input');check.type='checkbox';check.checked=ids.has(wish.id);
   const label=document.createElement('span');label.textContent=wish.wishlist_products?.title||'Wunsch';
   check.onchange=async()=>{check.disabled=true;try{const q=check.checked?db.from('wishlist_list_items').insert({list_id:list.id,wish_id:wish.id,user_id:owner()}):db.from('wishlist_list_items').delete().eq('list_id',list.id).eq('wish_id',wish.id).eq('user_id',owner());const {error}=await q;if(error)throw error;msg('Wunschzuordnung gespeichert')}catch(e){check.checked=!check.checked;msg(e.message||'Zuordnung fehlgeschlagen')}finally{check.disabled=false}};
   row.append(check,label);area.append(row);
  }
  if(!wishes.length){const p=document.createElement('p');p.textContent='Noch keine Wünsche. Füge zuerst im Wunsch-Editor einen Wunsch hinzu.';area.append(p)}
 }
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
 $('quickNewList').onclick=()=>{$('listTitle').focus();$('listTitle').scrollIntoView({behavior:'smooth',block:'center'})};
 $('quickAddWish').onclick=()=>{$('editor').scrollIntoView({behavior:'smooth',block:'start'});$('url').focus()};
 $('quickOpenSelected').onclick=()=>{if(!selected)return msg('Bitte zuerst eine Liste erstellen.');$('listItems').scrollIntoView({behavior:'smooth',block:'start'})};
 $('createList').onclick=async()=>{const id=owner();const title=$('listTitle').value.trim();if(!title||title.length>80){msg('Listenname muss 1 bis 80 Zeichen enthalten.');return}const payload={user_id:id,title,description:$('listDescription').value.trim().slice(0,500),icon:$('listIcon').value,color:$('listColor').value,visibility:$('listVisibility').value};$('createList').disabled=true;try{const {error}=await db.from('wishlist_lists').insert(payload);if(error)throw error;$('listTitle').value='';$('listDescription').value='';await load()}catch(e){msg(e.message||'Liste konnte nicht angelegt werden')}finally{$('createList').disabled=false}};
 $('refreshLists').onclick=()=>load().catch(e=>msg(e.message));
 return {refresh:()=>load().catch(e=>msg(e.message)),reset,assignWish,selectedList:()=>loadedOwner===getUser()?.id?editorSelect.value:''};
}
