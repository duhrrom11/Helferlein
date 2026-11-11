import {mountListsDashboard} from './lists-dashboard.mjs';
import {parseAmazonUrl,affiliateUrl,sharedAmazonProductUrl} from './amazon-links.mjs';
import {validateWishFields,validateHandle,validatePriority,profilePageUrl,isUniqueViolation,requestedProfileHandle,validateProfileFields,feedPage,validateCredentials,validatedProfileSearch,shouldRestoreSharedProductUrl,isFeedRequestStale,isWishLocallyHidden,profileDisplayLabel,wishlistErrorMessage,copyShareLink,exportWishlistCsv,priorityLabel,validateWishlistExportPage,exportWishlistJson,exportProgressText,previewWishlistBackup} from './wishlist-utils.mjs';
const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);let user=null,profile=null,offset=0;let feedBusy=false;let feedRefreshPending=false;let feedRevision=0;let editingWishId=null;let selectedProfileId=null;let peopleSearchGeneration=0;let authGeneration=0;let profileLoadGeneration=0;let wishEditorRevision=0;const dashboard=mountListsDashboard(db,()=>user);const hiddenWishIds=new Set();const hiddenProfileIds=new Set();let lastHiddenWishId=null;let renderedWishCount=0;const updateHiddenWishes=()=>{const count=hiddenWishIds.size;$('hiddenWishInfo').hidden=!count;$('restoreHiddenWishes').hidden=!count;$('undoHiddenWish').hidden=!count||lastHiddenWishId===null;$('hiddenWishInfo').textContent=count===1?'1 Wunsch für diese Sitzung ausgeblendet.':count+' Wünsche für diese Sitzung ausgeblendet.'};
const updateHiddenProfiles=()=>{const count=hiddenProfileIds.size;$('hiddenProfileInfo').hidden=!count;$('restoreHiddenProfiles').hidden=!count;$('hiddenProfileInfo').textContent=count===1?'1 Profil für diese Sitzung ausgeblendet.':count+' Profile für diese Sitzung ausgeblendet.'};
const report=(m)=>{$('status').textContent=m};
const refreshFeed=async()=>{offset=0;renderedWishCount=0;$('feedCount').textContent='Wünsche werden geladen …';feedRevision++;$('more').disabled=true;await feed()};
const requireUser=()=>{if(!user)throw Error('Bitte zuerst anmelden');return user.id};

const localWishExtrasKey=owner=>'helferlein-wish-extras:'+owner;
function readWishExtras(owner,id){
 if(!owner||!id)return {};
 try{const all=JSON.parse(localStorage.getItem(localWishExtrasKey(owner))||'{}');return all&&typeof all==='object'?all[id]||{}:{}}catch{return {}}
}
function readValidatedWishExtras(){
 const imageUrl=$('wishImageUrl').value.trim();
 if(imageUrl){try{const parsed=new URL(imageUrl);if(parsed.protocol!=='https:')throw Error();}catch{throw Error('Produktbild muss eine gültige HTTPS-Adresse sein.');}}
 const rawPrice=$('wishTargetPrice').value;
 const price=rawPrice===''?null:Number(rawPrice);
 if(price!==null&&(!Number.isFinite(price)||price<0||price>999999))throw Error('Ungültiger Wunschpreis.');
 const quantity=Number($('wishQuantity').value);
 if(!Number.isInteger(quantity)||quantity<1||quantity>999)throw Error('Die Menge muss zwischen 1 und 999 liegen.');
 const status=$('wishStatus').value;
 if(!['open','planned','fulfilled'].includes(status))throw Error('Ungültiger Wunschstatus.');
 return {imageUrl,price,quantity,status};
}
function saveWishExtras(owner,id,extras){
 if(!owner||!id)return;
 const {imageUrl,price,quantity,status}=extras;
 let all;try{const raw=localStorage.getItem(localWishExtrasKey(owner));all=raw===null?{}:JSON.parse(raw);if(!all||typeof all!=='object'||Array.isArray(all))return false}catch{return false}
 all[id]={imageUrl,price,quantity,status};
 try{localStorage.setItem(localWishExtrasKey(owner),JSON.stringify(all));return true}catch{return false}
}
function fillWishExtras(owner,id){
 const data=readWishExtras(owner,id);
 $('wishImageUrl').value=data.imageUrl||'';
 $('wishTargetPrice').value=data.price??'';
 $('wishQuantity').value=data.quantity||1;
 $('wishStatus').value=data.status||'open';
 updateWishExtrasPreview();
}
function updateWishExtrasPreview(){
 const url=$('wishImageUrl').value.trim();
 const img=$('wishPreviewImage');
 let valid=false;try{valid=new URL(url).protocol==='https:'}catch{}
 img.hidden=!valid;
 if(valid)img.src=url;else img.removeAttribute('src');
 const parts=[];
 if($('wishTargetPrice').value!=='')parts.push('Wunschpreis: '+$('wishTargetPrice').value+' €');
 parts.push('Menge: '+($('wishQuantity').value||1));
 const statuses={open:'Offen',planned:'Geplant',fulfilled:'Erfüllt'};
 parts.push(statuses[$('wishStatus').value]||'Offen');
 $('wishPreviewMeta').textContent=parts.join(' · ');
}
for(const id of ['wishImageUrl','wishTargetPrice','wishQuantity','wishStatus'])$(id).addEventListener('input',updateWishExtrasPreview);
function appendWishExtras(card,wish){
 if(wish.user_id!==user?.id)return;
 const data=readWishExtras(user.id,wish.id);
 if(!Object.keys(data).length)return;
 if(data.imageUrl){const img=document.createElement('img');img.className='wish-product-image';img.alt='Zusätzlich gespeichertes Produktbild';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=data.imageUrl;card.append(img)}
 const wrap=document.createElement('div');wrap.className='wish-product-extras';
 const labels=[];
 if(data.price!==null&&data.price!==undefined)labels.push('🎯 '+new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(data.price));
 if(data.quantity>1)labels.push('× '+data.quantity);
 if(data.status==='planned')labels.push('📌 Geplant');
 if(data.status==='fulfilled')labels.push('✓ Erfüllt');
 for(const label of labels){const badge=document.createElement('span');badge.textContent=label;wrap.append(badge)}
 if(wrap.childElementCount)card.append(wrap);
}

function resetWishEditor() {for(const fieldId of ['url','productTitle','wishNote']){$(fieldId).removeAttribute('aria-invalid');$(fieldId).removeAttribute('aria-describedby')}wishEditorRevision++;editingWishId=null;$('editHint').hidden=true;$('url').disabled=false;$('url').value='';$('productTitle').value='';$('productTitle').disabled=false;$('wishNote').value='';$('priority').value='2';$('wishVisibility').value='public';$('saveWish').textContent='Wunsch speichern';$('wishSaveFeedback').textContent='';$('wishVisibility').dispatchEvent(new Event('change'));fillWishExtras(null,null)}
const invalidWishField=(field,message)=>{
 field.setAttribute('aria-invalid','true');
 field.setAttribute('aria-describedby','wishSaveFeedback');
 field.focus();
 throw Error(message);
};
for(const fieldId of ['url','productTitle','wishNote']){
 const field=$(fieldId);
 for(const type of ['input','change'])field.addEventListener(type,()=>{
  field.removeAttribute('aria-invalid');field.removeAttribute('aria-describedby');
 });
}
$('cancelEdit').onclick=()=>{resetWishEditor();$('saveWish').focus({preventScroll:true});$('saveWish').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'nearest'});report('Wunschbearbeitung abgebrochen.');};
for(const id of ['url','productTitle','wishNote','priority','wishVisibility','wishImageUrl','wishTargetPrice','wishQuantity','wishStatus'])for(const type of ['input','change'])$(id).addEventListener(type,()=>{wishEditorRevision++});
const run=fn=>async function(){const button=this instanceof HTMLButtonElement?this:null;if(button?.disabled)return;const isWishSave=button?.id==='saveWish',startedOwner=user?.id,startedRevision=wishEditorRevision,startedWish=editingWishId;if(button)button.disabled=true;if(isWishSave)$('wishSaveFeedback').textContent='';try{await fn()}catch(e){if(!isWishSave||(user?.id===startedOwner&&editingWishId===startedWish&&wishEditorRevision===startedRevision)){const message=wishlistErrorMessage(e);report(message);if(isWishSave)$('wishSaveFeedback').textContent=message}}finally{if(button?.isConnected&&(!isWishSave||user?.id===startedOwner))button.disabled=false}};
$('restoreHiddenWishes').onclick=run(async()=>{hiddenWishIds.clear();lastHiddenWishId=null;updateHiddenWishes();await refreshFeed();report('Ausgeblendete Wünsche werden wieder angezeigt.')});
$('restoreHiddenProfiles').onclick=run(async()=>{hiddenProfileIds.clear();updateHiddenProfiles();await refreshFeed();report('Ausgeblendete Profile werden wieder angezeigt.')});
$('undoHiddenWish').onclick=run(async()=>{if(lastHiddenWishId===null)return;hiddenWishIds.delete(lastHiddenWishId);lastHiddenWishId=null;updateHiddenWishes();await refreshFeed();report('Letztes Ausblenden rückgängig gemacht.')});
async function auth(){const generation=++authGeneration;let data,error;try{({data,error}=await db.auth.getUser())}catch(e){error=e}if(generation!==authGeneration)return;const authError=error&&error.name!=='AuthSessionMissingError'?error:null;const previousUserId=user?.id;user=authError?null:(data?.user||null);if(previousUserId!==user?.id){hiddenWishIds.clear();hiddenProfileIds.clear();lastHiddenWishId=null;updateHiddenWishes();updateHiddenProfiles();const restoreSharedUrl=shouldRestoreSharedProductUrl($('url').value,importedProductUrl);profile=null;resetWishEditor();if(restoreSharedUrl)$('url').value=importedProductUrl;offset=0;feedRevision++;$('feed').replaceChildren();renderedWishCount=0;$('feedCount').textContent='';$('more').disabled=true;$('handle').value='';$('displayName').value='';$('bio').value='';$('profileAvatarUrl').value='';peopleSearchGeneration++;profileLoadGeneration++;$('peopleResults').removeAttribute('aria-busy');$('peopleResults').replaceChildren();$('peopleSearchCount').textContent=''}$('editor').hidden=!user;$('editorNav').hidden=!user;$('login').hidden=!!user;$('logout').hidden=!user;if(!user){$('password').value='';profile=null;$('handle').value='';$('displayName').value='';$('bio').value='';}if(authError){await dashboard.refresh();throw authError}await dashboard.refresh();if(user){const profileGeneration=++profileLoadGeneration;let r;try{r=await db.from('wishlist_profiles').select('handle,display_name,bio,avatar_url').eq('user_id',user.id).maybeSingle()}catch(e){r={error:e}}if(generation!==authGeneration||profileGeneration!==profileLoadGeneration||user?.id!==data.user.id)return;if(r.error){profile=null;throw r.error;}const previousProfile=profile;profile=r.data;if(previousUserId!==user.id||$('handle').value===(previousProfile?.handle||''))$('handle').value=profile?.handle||'';if(previousUserId!==user.id||$('displayName').value===(previousProfile?.display_name||''))$('displayName').value=profile?.display_name||'';if(previousUserId!==user.id||$('bio').value===(previousProfile?.bio||''))$('bio').value=profile?.bio||'';if(previousUserId!==user.id||$('profileAvatarUrl').value===(previousProfile?.avatar_url||''))$('profileAvatarUrl').value=profile?.avatar_url||'';}}
$('signin').onclick=run(async()=>{let r;try{r=await db.auth.signInWithPassword(validateCredentials($('email').value,$('password').value))}finally{$('password').value=''}if(r.error)throw r.error;await auth();await refreshFeed();report('Angemeldet')});
$('signup').onclick=run(async()=>{let r;try{r=await db.auth.signUp(validateCredentials($('email').value,$('password').value))}finally{$('password').value=''}if(r.error)throw r.error;report('Registrierung gestartet; bitte E-Mail prüfen.');await auth()});
$('logout').onclick=run(async()=>{let r;try{r=await db.auth.signOut()}finally{$('password').value=''}if(r.error)throw r.error;await auth();await refreshFeed()});
$('saveProfile').onclick=run(async()=>{const ownerId=requireUser(),handle=validateHandle($('handle').value),{display_name,bio}=validateProfileFields($('displayName').value,$('bio').value);const avatarUrl=$('profileAvatarUrl').value.trim();if(avatarUrl&&(!/^https:\/\//i.test(avatarUrl)||avatarUrl.length>2048))throw Error('Profilbild benötigt eine gültige HTTPS-Adresse.');const r=await db.from('wishlist_profiles') .upsert({user_id:ownerId,handle,display_name,bio,avatar_url:avatarUrl||null},{onConflict:'user_id'});if(r.error){if(isUniqueViolation(r.error))throw Error('Dieser Benutzername ist bereits vergeben. Bitte einen anderen wählen.');throw r.error;}if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');await auth();if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');await refreshFeed();if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');report('Profil gespeichert')});
$('copyMyProfile').onclick=run(async()=>{
 const ownerId=requireUser();
 if(!profile?.handle)throw Error('Bitte zuerst dein öffentliches Profil speichern.');
 const link=new URL('./profile.html?handle='+encodeURIComponent(profile.handle),window.location.href).href;
 await copyShareLink(link);
 if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert.');
 report('Link zu deinem öffentlichen Profil kopiert.');
});
async function loadOwnWishesForExport(ownerId) {
 const rows=[];
 const pageSize=200;
 for(let start=0;start<10000;start+=pageSize){
  const r=await db.from('wishlist_wishes')
   .select('priority,note,created_at,wishlist_products(asin,marketplace,title)')
   .eq('user_id',ownerId).order('id',{ascending:true}).range(start,start+pageSize-1);
  if(r.error)throw r.error;
  if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert. Export abgebrochen.');
  validateWishlistExportPage(r.data,pageSize);
  rows.push(...r.data);
  $('exportProgress').textContent=exportProgressText(rows.length);
  if(r.data.length<pageSize)return rows;
 }
 throw Error('Zu viele Wünsche für einen Export. Bitte den Support kontaktieren.');
}
function downloadOwnBackup(data,mime,extension){
 const blob=new Blob([data],{type:mime});
 const objectUrl=URL.createObjectURL(blob);
 try{
  const a=document.createElement('a');
  a.href=objectUrl;
  a.download='meine-wunschliste-'+new Date().toISOString().slice(0,10)+'.'+extension;
  document.body.append(a);
  try{a.click()}finally{a.remove()}
 }finally{setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)}
}
async function runOwnExport(format){
 const ownerId=requireUser();
 $('exportProgress').textContent='Export wird vorbereitet …';
 try{
  const rows=await loadOwnWishesForExport(ownerId);
  if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert. Export abgebrochen.');
  if(format==='csv')downloadOwnBackup(exportWishlistCsv(rows),'text/csv;charset=utf-8','csv');
  else if(format==='json')downloadOwnBackup(exportWishlistJson(rows,profile),'application/json;charset=utf-8','json');
  else throw Error('Unbekanntes Exportformat');
  $('exportProgress').textContent=rows.length+' Wünsche als '+format.toUpperCase()+' bereitgestellt.';
  report(rows.length+' eigene Wünsche als '+format.toUpperCase()+' bereitgestellt.');
 }catch(error){
  $('exportProgress').textContent='Export fehlgeschlagen. Bitte erneut versuchen.';
  throw error;
 }
}
$('exportWishes').onclick=run(()=>runOwnExport('csv'));
$('exportWishesJson').onclick=run(()=>runOwnExport('json'));
$('backupFile').addEventListener('change',()=>{
 $('backupPreview').replaceChildren();
 $('backupPreviewStatus').textContent='';
});
$('previewBackup').onclick=run(async()=>{
 const file=$('backupFile').files?.[0];
 if(!file)throw Error('Bitte zuerst eine JSON-Sicherungsdatei auswählen.');
 if(file.size>2_000_000)throw Error('Die Sicherungsdatei darf höchstens 2 MB groß sein.');
 $('backupPreview').replaceChildren();
 $('backupPreviewStatus').textContent='Sicherung wird lokal geprüft …';
 try{
  const data=previewWishlistBackup(await file.text());
  const fragment=document.createDocumentFragment();
  if(data.profile){
   const heading=document.createElement('h4');
   heading.textContent='Gesichertes Profil';
   const summary=document.createElement('p');
   summary.textContent=profileDisplayLabel(data.profile.display_name,data.profile.handle)+' · '+data.profile.bio;
   fragment.append(heading,summary);
  }
  const heading=document.createElement('h4');
  heading.textContent='Wünsche in der Sicherung ('+data.count+')';
  fragment.append(heading);
  for(const wish of data.wishes.slice(0,30)){
   const p=document.createElement('p');
   p.textContent=wish.title+' · '+wish.asin+' · '+priorityLabel(wish.priority)+(wish.note?' · '+wish.note:'');
   fragment.append(p);
  }
  if(data.count>30){
   const extra=document.createElement('p');
   extra.textContent='Weitere '+(data.count-30)+' Wünsche werden in der Vorschau nicht angezeigt.';
   fragment.append(extra);
  }
  $('backupPreview').replaceChildren(fragment);
  $('backupPreviewStatus').textContent='Sicherung gültig: '+data.count+' Wünsche. Nur Vorschau – keine Daten wurden gespeichert.';
 }catch(error){
  $('backupPreviewStatus').textContent='Prüfung fehlgeschlagen. Es wurden keine Daten gespeichert.';
  throw error;
 }
});
$('saveWish').onclick=run(async()=>{const ownerId=requireUser();if(!profile)throw Error('Zuerst Profil speichern');const wishId=editingWishId;const editorRevision=wishEditorRevision;const targetList=wishId?null:dashboard.selectedList();const p=wishId?null:parseAmazonUrl($('url').value);if(!wishId&&(!p||p.marketplace!=='amazon.de'))invalidWishField($('url'),'Nur gültige Amazon.de-Produktlinks');let title,note;try{({title,note}=validateWishFields($('productTitle').value,$('wishNote').value))}catch(error){const message=wishlistErrorMessage(error);invalidWishField(message.startsWith('Notiz')?$('wishNote'):$('productTitle'),message)}const priority=validatePriority($('priority').value);const visibility=$('wishVisibility').value;if(!['public','private'].includes(visibility))throw Error('Ungültige Sichtbarkeit');const extras=readValidatedWishExtras();if(wishId){const changed=await db.from('wishlist_wishes').update({note,priority,visibility}).eq('id',wishId).eq('user_id',ownerId).select('id');if(changed.error)throw changed.error;if(!changed.data?.length)throw Error('Wunsch nicht gefunden');if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');const extrasSaved=saveWishExtras(ownerId,wishId,extras);let completionRevision=editorRevision;if(editingWishId===wishId&&wishEditorRevision===editorRevision){resetWishEditor();completionRevision=wishEditorRevision;}await refreshFeed();await dashboard.refresh();if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');if(wishEditorRevision!==completionRevision||editingWishId!==null&&editingWishId!==wishId)return;const message=extrasSaved?'Wunsch aktualisiert.':'Wunsch aktualisiert, aber Zusatzdaten konnten auf diesem Gerät nicht gespeichert werden. Bitte nur die Zusatzdaten erneut bearbeiten; den Wunsch nicht erneut anlegen.';$('wishSaveFeedback').textContent=message;report(message);return;}let r=await db.from('wishlist_products').select('id').eq('marketplace',p.marketplace).eq('asin',p.asin).maybeSingle();if(r.error)throw r.error;if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');let id=r.data?.id;if(!id){r=await db.from('wishlist_products').insert({...p,title}).select('id').single();if(r.error){if(!isUniqueViolation(r.error))throw r.error;const retry=await db.from('wishlist_products').select('id').eq('marketplace',p.marketplace).eq('asin',p.asin).single();if(retry.error)throw retry.error;id=retry.data.id}else id=r.data.id}if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');r=await db.from('wishlist_wishes').insert({user_id:ownerId,product_id:id,note,priority,visibility}).select('id').single();if(r.error){if(isUniqueViolation(r.error))throw Error('Dieses Produkt steht bereits auf deiner Wunschliste. Bitte den bestehenden Wunsch bearbeiten.');throw r.error;}if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');const extrasSaved=saveWishExtras(ownerId,r.data.id,extras);let assignmentError=null;if(targetList){try{await dashboard.assignWish(r.data.id,targetList,ownerId)}catch(e){assignmentError=e}}let completionRevision=editorRevision;if(editingWishId===null&&wishEditorRevision===editorRevision){resetWishEditor();completionRevision=wishEditorRevision;}await refreshFeed();await dashboard.refresh();if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');if(wishEditorRevision!==completionRevision||editingWishId!==null)return;const message=[assignmentError?'Wunsch gespeichert, aber die Listenzuordnung ist fehlgeschlagen. Bitte in der Listenverwaltung erneut zuordnen.':'Wunsch gespeichert',...(!extrasSaved?['Zusatzdaten konnten auf diesem Gerät nicht gespeichert werden. Bitte den bestehenden Wunsch bearbeiten, nicht erneut anlegen.']:[])].join(' ');$('wishSaveFeedback').textContent=message;report(message)});
async function feed(){if(feedBusy){feedRefreshPending=true;return;}feedBusy=true;$('feed').setAttribute('aria-busy','true');const filter=$('feedFilter').value;const sort=$('feedSort').value;const feedUserId=user?.id;const feedProfileId=selectedProfileId;const revision=feedRevision;const requestedOffset=offset;const isStale=()=>isFeedRequestStale({offset:requestedOffset,revision,filter,sort,userId:feedUserId,profileId:feedProfileId},{offset,revision:feedRevision,filter:$('feedFilter').value,sort:$('feedSort').value,userId:user?.id,profileId:selectedProfileId});try{let allowed=null;if(filter==='profile'){if(!selectedProfileId){offset=0;$('feed').textContent='Kein gültiges Profil ausgewählt.';$('more').disabled=true;return;}allowed=[selectedProfileId]}else if(filter==='mine'){if(!user){offset=0;$('feed').textContent='Bitte anmelden.';$('more').disabled=true;return;}allowed=[user.id]}else if(filter==='following'){if(!user){offset=0;$('feed').textContent='Bitte anmelden.';$('more').disabled=true;return;}const following=await db.from('wishlist_follows').select('followed_id').eq('follower_id',user.id);if(isStale()){feedRefreshPending=true;return;}if(following.error)throw following.error;allowed=following.data.map(x=>x.followed_id);if(!allowed.length){offset=0;$('feed').textContent='Du folgst noch niemandem.';$('more').disabled=true;return;}}let query=db.from('wishlist_wishes').select('id,user_id,priority,created_at,wishlist_products(asin,marketplace,title),wishlist_profiles(display_name,handle),note,visibility');if(sort==='priority')query=query.order('priority',{ascending:true});query=query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(requestedOffset,requestedOffset+20);if(allowed)query=query.in('user_id',allowed);const r=await query;if(isStale()){feedRefreshPending=true;return;}if(r.error)throw r.error;const page=feedPage(r.data);const fragment=document.createDocumentFragment();for(const w of page.items){if(isWishLocallyHidden(w,hiddenWishIds,hiddenProfileIds))continue;const div=document.createElement('div');div.className='item';const strong=document.createElement('strong');strong.textContent=w.wishlist_products.title;const info=document.createElement('p');info.textContent=profileDisplayLabel(w.wishlist_profiles?.display_name,w.wishlist_profiles?.handle)+' · Priorität: '+priorityLabel(w.priority);const a=document.createElement('a');a.href=affiliateUrl(w.wishlist_products,{'amazon.de':'duhrrom-21'});a.textContent='Bei Amazon ansehen (Partnerlink)';a.target='_blank';a.rel='noopener noreferrer sponsored';div.append(strong,info);appendWishExtras(div,w);if(w.wishlist_profiles?.handle){const profileLink=document.createElement('a');profileLink.href=new URL('./profile.html?handle='+encodeURIComponent(w.wishlist_profiles.handle),window.location.href).href;profileLink.textContent='Profil ansehen';div.append(profileLink)}if(w.note){const note=document.createElement('p');note.textContent=w.note;div.append(note)}div.append(a);const share=document.createElement('button');share.type='button';share.textContent='Produktlink kopieren';share.onclick=run(async()=>{const url=new URL(window.location.href);url.search='';url.hash='';url.searchParams.set('url','https://www.amazon.de/dp/'+w.wishlist_products.asin);await copyShareLink(url.toString());report('Link zum Hinzufügen kopiert')});div.append(share);const hide=document.createElement('button');hide.type='button';hide.textContent='Für mich ausblenden';hide.setAttribute('aria-label','Wunsch ausblenden: '+w.wishlist_products.title);hide.onclick=()=>{hiddenWishIds.add(w.id);lastHiddenWishId=w.id;const nextFocus=div.nextElementSibling?.querySelector('button,a')||div.previousElementSibling?.querySelector('button,a');div.remove();renderedWishCount=Math.max(0,renderedWishCount-1);if(!renderedWishCount)$('feed').textContent='Alle bisher geladenen Wünsche sind ausgeblendet. Du kannst die Ausblendungen oben zurücksetzen.';updateHiddenWishes();if(nextFocus?.isConnected)nextFocus.focus();else $('undoHiddenWish').focus();$('feedCount').textContent=renderedWishCount+' Wünsche sichtbar · '+hiddenWishIds.size+' Wünsche ausgeblendet'+(hiddenProfileIds.size?' · '+hiddenProfileIds.size+' Profile ausgeblendet':'')+'.';report('Wunsch für diese Sitzung ausgeblendet. Dies ist keine Meldung an die Moderation.');};div.append(hide);if(w.user_id!==user?.id){const hideProfile=document.createElement('button');hideProfile.type='button';hideProfile.textContent='Profil für mich ausblenden';hideProfile.setAttribute('aria-label','Profil ausblenden: '+(w.wishlist_profiles?.display_name||'Profil'));hideProfile.onclick=run(async()=>{hiddenProfileIds.add(w.user_id);updateHiddenProfiles();$('restoreHiddenProfiles').focus();report('Profil für diese Sitzung ausgeblendet. Dies ist keine Meldung an die Moderation.');await refreshFeed()});div.append(hideProfile)}if(user&&w.user_id===user.id){const edit=document.createElement('button');edit.type='button';edit.textContent='Bearbeiten';edit.onclick=()=>{wishEditorRevision++;editingWishId=w.id;$('editHint').hidden=false;for(const fieldId of ['url','productTitle','wishNote']){$(fieldId).removeAttribute('aria-invalid');$(fieldId).removeAttribute('aria-describedby')}$('url').value='https://www.amazon.de/dp/'+w.wishlist_products.asin;$('url').disabled=true;$('productTitle').value=w.wishlist_products.title;$('productTitle').disabled=true;$('wishNote').value=w.note||'';$('priority').value=String(w.priority);$('wishVisibility').value=w.visibility||'public';$('saveWish').textContent='Änderungen speichern';fillWishExtras(user?.id,w.id);$('wishVisibility').dispatchEvent(new Event('change'));$('wishSaveFeedback').textContent='';$('wishEditorHeading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});$('wishNote').focus({preventScroll:true});report('Notiz, Priorität und Sichtbarkeit bearbeiten')};div.append(edit);const remove=document.createElement('button');remove.type='button';remove.textContent='Wunsch entfernen';remove.setAttribute('aria-label','Wunsch entfernen: '+w.wishlist_products.title);remove.onclick=run(async()=>{if(!confirm('Diesen Wunsch wirklich entfernen?'))return;const ownerId=requireUser();if(w.user_id!==ownerId)throw Error('Dieser Wunsch gehört nicht zu deinem Konto');const deleted=await db.from('wishlist_wishes').delete().eq('id',w.id).eq('user_id',ownerId).select('id');if(deleted.error)throw deleted.error;if(!deleted.data?.length)throw Error('Wunsch konnte nicht entfernt werden.');if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');if(editingWishId===w.id)resetWishEditor();await refreshFeed();await dashboard.refresh();if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');report('Wunsch entfernt')});div.append(remove)}fragment.append(div)}if(isStale()){feedRefreshPending=true;return;}if(!requestedOffset){$('feed').replaceChildren();renderedWishCount=0;}else if(!renderedWishCount&&fragment.childElementCount)$('feed').replaceChildren();renderedWishCount+=fragment.childElementCount;$('feed').append(fragment);offset=requestedOffset+page.items.length;$('feedCount').textContent=renderedWishCount+' Wünsche sichtbar'+(hiddenWishIds.size?' · '+hiddenWishIds.size+' Wünsche ausgeblendet':'')+(hiddenProfileIds.size?' · '+hiddenProfileIds.size+' Profile ausgeblendet':'')+'.';$('more').disabled=!page.hasMore;if(!offset)$('feed').textContent='Noch keine Wünsche.';else if(!renderedWishCount)$('feed').textContent=hiddenWishIds.size||hiddenProfileIds.size?'Alle bisher geladenen Wünsche sind ausgeblendet. Du kannst die Ausblendungen oben zurücksetzen.':'Keine sichtbaren Wünsche auf dieser Seite.'}catch(e){if(isStale()){feedRefreshPending=true;return;}if(!feedRefreshPending){$('more').disabled=true;$('feedCount').textContent='Laden fehlgeschlagen.';if(!offset)$('feed').textContent='Wünsche konnten nicht geladen werden. Mit „Erneut laden“ kannst du es noch einmal versuchen.';}throw e}finally{feedBusy=false;$('feed').removeAttribute('aria-busy');if(feedRefreshPending){feedRefreshPending=false;await refreshFeed()}}}

async function searchPeople(){
 const generation=++peopleSearchGeneration;
 const searchingUserId=user?.id;
 const term=$('peopleSearch').value.trim();
 let safe;try{safe=validatedProfileSearch(term)}catch(e){$('peopleResults').removeAttribute('aria-busy');$('peopleSearchCount').textContent='';$('peopleResults').textContent=wishlistErrorMessage(e);return;}
 $('peopleResults').setAttribute('aria-busy','true');$('peopleSearchCount').textContent='Suche läuft …';$('peopleResults').textContent='Suche läuft …';
 let result;try{result=await db.from('wishlist_profiles').select('user_id,handle,display_name,bio').or('handle.ilike.%'+safe+'%,display_name.ilike.%'+safe+'%').order('handle').limit(20)}catch(e){result={error:e}}
 if(generation!==peopleSearchGeneration||user?.id!==searchingUserId||$('peopleSearch').value.trim()!==term){if(generation===peopleSearchGeneration)$('peopleResults').removeAttribute('aria-busy');return;}
 if(result.error){$('peopleResults').removeAttribute('aria-busy');$('peopleResults').textContent='Suche fehlgeschlagen. Bitte erneut versuchen.';$('peopleSearchCount').textContent='Suche fehlgeschlagen.';throw result.error;}
 let followed=new Set();
 if(user){let f;try{f=await db.from('wishlist_follows').select('followed_id').eq('follower_id',searchingUserId)}catch(e){f={error:e}}if(generation!==peopleSearchGeneration||user?.id!==searchingUserId||$('peopleSearch').value.trim()!==term)return;if(f.error){$('peopleResults').removeAttribute('aria-busy');$('peopleResults').textContent='Abonnements konnten nicht geladen werden.';$('peopleSearchCount').textContent='Abonnements konnten nicht geladen werden.';throw f.error;}followed=new Set(f.data.map(x=>x.followed_id))}
 const root=$('peopleResults');root.removeAttribute('aria-busy');root.replaceChildren();$('peopleSearchCount').textContent=result.data.length===20?'20 Profile gefunden (maximal 20 pro Suche).':result.data.length+' Profile gefunden.';
 if(!result.data.length){root.textContent='Keine Profile gefunden.';return;}
 for(const p of result.data){
  const item=document.createElement('div');item.className='item';
  const name=document.createElement('strong');name.textContent=profileDisplayLabel(p.display_name,p.handle);item.append(name);const view=document.createElement('button');view.type='button';view.textContent='Wünsche ansehen';view.onclick=run(async()=>{selectedProfileId=p.user_id;window.history.replaceState(null,'',profilePageUrl(window.location.href,p.handle));$('feedFilter').querySelector('[value="profile"]').hidden=false;$('feedFilter').value='profile';$('profileFeedInfo').hidden=false;$('profileFeedInfo').textContent='Wünsche von '+p.display_name+' (@'+p.handle+')';await refreshFeed();$('feed').scrollIntoView({behavior:'smooth',block:'start'})});item.append(view);const share=document.createElement('button');share.type='button';share.textContent='Profil-Link kopieren';share.onclick=run(async()=>{const url=profilePageUrl(window.location.href,p.handle);await copyShareLink(url);report('Profil-Link kopiert')});item.append(share);const publicProfile=document.createElement('a');publicProfile.href=new URL('./profile.html?handle='+encodeURIComponent(p.handle),window.location.href).href;publicProfile.textContent='🌈 Profil & Sammlungen';item.append(publicProfile);
  if(p.bio){const bio=document.createElement('p');bio.textContent=p.bio;item.append(bio)}
  if(user&&profile&&p.user_id!==user.id){
   const btn=document.createElement('button');btn.type='button';const isFollowing=followed.has(p.user_id);btn.textContent=isFollowing?'Nicht mehr folgen':'Folgen';
   btn.onclick=run(async()=>{
     const ownerId=requireUser();if(ownerId!==searchingUserId||generation!==peopleSearchGeneration||!item.isConnected)throw Error('Suchergebnis ist veraltet. Bitte erneut suchen.');const res=isFollowing?await db.from('wishlist_follows').delete().eq('follower_id',ownerId).eq('followed_id',p.user_id).select('follower_id'):await db.from('wishlist_follows').insert({follower_id:ownerId,followed_id:p.user_id});
     if(res.error)throw res.error;if(isFollowing&&!res.data?.length)throw Error('Abonnement konnte nicht entfernt werden');if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');
     await searchPeople();await refreshFeed();if(user?.id!==ownerId)throw Error('Sitzung hat sich geändert');report(isFollowing?'Nicht mehr abonniert':'Profil abonniert');
   });item.append(btn)
  }
  root.append(item)
 }
}
const clearPeopleResults=()=>{peopleSearchGeneration++;$('peopleResults').removeAttribute('aria-busy');$('peopleResults').replaceChildren();$('peopleSearchCount').textContent=''};
$('peopleSearch').addEventListener('input',clearPeopleResults);
$('clearPeopleSearch').onclick=()=>{$('peopleSearch').value='';clearPeopleResults();$('peopleSearch').focus();report('Profilsuche zurückgesetzt.')};
$('peopleSearch').addEventListener('keydown',event=>{if(event.key==='Escape'){$('clearPeopleSearch').click()}});
$('searchPeople').onclick=run(searchPeople);
$('peopleSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('searchPeople').click()}});
$('feedFilter').onchange=run(async()=>{if($('feedFilter').value!=='profile'){selectedProfileId=null;$('feedFilter').querySelector('[value="profile"]').hidden=true;$('profileFeedInfo').hidden=true;window.history.replaceState(null,'',profilePageUrl(window.location.href))}await refreshFeed()});
$('feedSort').onchange=run(async()=>{await refreshFeed()});
$('reloadFeed').onclick=run(async()=>{await refreshFeed()});

const importedProductUrl=sharedAmazonProductUrl(new URLSearchParams(window.location.search).get('url'));if(importedProductUrl)$('url').value=importedProductUrl;
$('more').onclick=async()=>{const button=$('more');if(button.disabled)return;button.disabled=true;try{await feed()}catch(e){report(wishlistErrorMessage(e));button.disabled=true}};let authEventGeneration=0;db.auth.onAuthStateChange(()=>{const eventGeneration=++authEventGeneration;setTimeout(async()=>{if(eventGeneration!==authEventGeneration)return;try{await auth();if(eventGeneration!==authEventGeneration)return;await refreshFeed()}catch(e){if(eventGeneration===authEventGeneration)report(wishlistErrorMessage(e))}},0)});await auth().catch(e=>report(wishlistErrorMessage(e)));const profileParam=new URLSearchParams(window.location.search).get('profile');const requestedProfile=requestedProfileHandle(profileParam);if(profileParam!==null&&!requestedProfile)report('Ungültiger Profil-Link. Bitte einen gültigen Benutzernamen verwenden.');if(requestedProfile){let r;try{r=await db.from('wishlist_profiles').select('user_id,handle,display_name').eq('handle',requestedProfile).maybeSingle()}catch(e){r={error:e}}if(r.error){$('feedFilter').value='profile';$('feedFilter').querySelector('[value="profile"]').hidden=false;$('profileFeedInfo').hidden=false;$('profileFeedInfo').textContent='Profil konnte nicht geladen werden.';report(wishlistErrorMessage(r.error))}else if(r.data){selectedProfileId=r.data.user_id;$('feedFilter').querySelector('[value="profile"]').hidden=false;$('feedFilter').value='profile';$('profileFeedInfo').hidden=false;$('profileFeedInfo').textContent='Wünsche von '+r.data.display_name+' (@'+r.data.handle+')'}else{$('feedFilter').value='profile';$('feedFilter').querySelector('[value="profile"]').hidden=false;$('profileFeedInfo').hidden=false;$('profileFeedInfo').textContent='Profil nicht gefunden: @'+requestedProfile;report('Profil nicht gefunden')} }await feed().catch(e=>report(wishlistErrorMessage(e)));
