import {parseAmazonUrl,affiliateUrl} from './amazon-links.mjs';
import {normalizeProfileSearch,validateWishFields,validateHandle,validatePriority} from './wishlist-utils.mjs';
const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);let user=null,profile=null,offset=0;let feedBusy=false;let feedRefreshPending=false;
const report=(m)=>{$('status').textContent=m};
const requireUser=()=>{if(!user)throw Error('Bitte zuerst anmelden');return user.id};
const run=fn=>async function(){const button=this instanceof HTMLButtonElement?this:null;if(button?.disabled)return;if(button)button.disabled=true;try{await fn()}catch(e){report(e.message||'Unbekannter Fehler')}finally{if(button?.isConnected)button.disabled=false}};
async function auth(){const {data,error}=await db.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')throw error;user=data.user;$('editor').hidden=!user;$('login').hidden=!!user;$('logout').hidden=!user;if(!user){profile=null;$('handle').value='';$('displayName').value='';$('bio').value='';}if(user){const r=await db.from('wishlist_profiles').select('handle,display_name,bio').eq('user_id',user.id).maybeSingle();if(r.error)throw r.error;profile=r.data;$('handle').value=profile?.handle||'';$('displayName').value=profile?.display_name||'';$('bio').value=profile?.bio||'';}}
$('signin').onclick=run(async()=>{const r=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(r.error)throw r.error;await auth();offset=0;await feed();report('Angemeldet')});
$('signup').onclick=run(async()=>{const r=await db.auth.signUp({email:$('email').value,password:$('password').value});if(r.error)throw r.error;report('Registrierung gestartet; bitte E-Mail prüfen.');await auth()});
$('logout').onclick=run(async()=>{const r=await db.auth.signOut();if(r.error)throw r.error;await auth();offset=0;await feed()});
$('saveProfile').onclick=run(async()=>{const ownerId=requireUser(),handle=validateHandle($('handle').value),display_name=$('displayName').value.trim(),bio=$('bio').value.trim();if(bio.length>500)throw Error('Profilbeschreibung zu lang');if(!display_name||display_name.length>80)throw Error('Profilangaben prüfen');const r=await db.from('wishlist_profiles') .upsert({user_id:ownerId,handle,display_name,bio},{onConflict:'user_id'});if(r.error)throw r.error;await auth();report('Profil gespeichert')});
$('saveWish').onclick=run(async()=>{const ownerId=requireUser();if(!profile)throw Error('Zuerst Profil speichern');const p=parseAmazonUrl($('url').value);if(!p||p.marketplace!=='amazon.de')throw Error('Nur gültige Amazon.de-Produktlinks');const {title,note}=validateWishFields($('productTitle').value,$('wishNote').value);const priority=validatePriority($('priority').value);let r=await db.from('wishlist_products').select('id').eq('marketplace',p.marketplace).eq('asin',p.asin).maybeSingle();if(r.error)throw r.error;let id=r.data?.id;if(!id){r=await db.from('wishlist_products').insert({...p,title}).select('id').single();if(r.error){const retry=await db.from('wishlist_products').select('id').eq('marketplace',p.marketplace).eq('asin',p.asin).single();if(retry.error)throw r.error;id=retry.data.id}else id=r.data.id}r=await db.from('wishlist_wishes').upsert({user_id:ownerId,product_id:id,note,priority},{onConflict:'user_id,product_id'});if(r.error)throw r.error;offset=0;await feed();$('url').value='';$('productTitle').value='';$('wishNote').value='';report('Wunsch gespeichert')});
async function feed(){if(feedBusy){feedRefreshPending=true;return;}feedBusy=true;try{const filter=$('feedFilter').value;let allowed=null;if(filter==='mine'){if(!user){offset=0;$('feed').textContent='Bitte anmelden.';$('more').disabled=true;return;}allowed=[user.id]}else if(filter==='following'){if(!user){offset=0;$('feed').textContent='Bitte anmelden.';$('more').disabled=true;return;}const following=await db.from('wishlist_follows').select('followed_id').eq('follower_id',user.id);if(following.error)throw following.error;allowed=following.data.map(x=>x.followed_id);if(!allowed.length){offset=0;$('feed').textContent='Du folgst noch niemandem.';$('more').disabled=true;return;}}let query=db.from('wishlist_wishes').select('id,user_id,priority,created_at,wishlist_products(asin,marketplace,title),wishlist_profiles(display_name),note');if($('feedSort').value==='priority')query=query.order('priority',{ascending:true});query=query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+19);if(allowed)query=query.in('user_id',allowed);const r=await query;if(r.error)throw r.error;if(!offset)$('feed').replaceChildren();for(const w of r.data){const div=document.createElement('div');div.className='item';const strong=document.createElement('strong');strong.textContent=w.wishlist_products.title;const info=document.createElement('p');info.textContent=(w.wishlist_profiles?.display_name||'Profil')+' · Priorität '+w.priority;const a=document.createElement('a');a.href=affiliateUrl(w.wishlist_products,{'amazon.de':'duhrrom-21'});a.textContent='Bei Amazon ansehen (Partnerlink)';a.target='_blank';a.rel='noopener noreferrer sponsored';div.append(strong,info);if(w.note){const note=document.createElement('p');note.textContent=w.note;div.append(note)}div.append(a);if(user&&w.user_id===user.id){const remove=document.createElement('button');remove.type='button';remove.textContent='Wunsch entfernen';remove.setAttribute('aria-label','Wunsch entfernen: '+w.wishlist_products.title);remove.onclick=run(async()=>{if(!confirm('Diesen Wunsch wirklich entfernen?'))return;remove.disabled=true;const ownerId=requireUser();const deleted=await db.from('wishlist_wishes').delete().eq('id',w.id).eq('user_id',ownerId).select('id');if(deleted.error){remove.disabled=false;throw deleted.error}if(!deleted.data?.length){remove.disabled=false;throw Error('Wunsch konnte nicht entfernt werden.')}offset=0;await feed();report('Wunsch entfernt')});div.append(remove)}$('feed').append(div)}offset+=r.data.length;$('more').disabled=r.data.length<20;if(!offset)$('feed').textContent='Noch keine Wünsche.'}finally{feedBusy=false;if(feedRefreshPending){feedRefreshPending=false;offset=0;await feed()}}}

async function searchPeople(){
 const term=$('peopleSearch').value.trim();
 if(term.length<2){$('peopleResults').textContent='Mindestens zwei Zeichen eingeben.';return;}
 const safe=normalizeProfileSearch(term);
 if(safe.length<2){$('peopleResults').textContent='Suchbegriff prüfen.';return;}
 const result=await db.from('wishlist_profiles').select('user_id,handle,display_name,bio').or('handle.ilike.%'+safe+'%,display_name.ilike.%'+safe+'%').order('handle').limit(20);
 if(result.error)throw result.error;
 let followed=new Set();
 if(user){const f=await db.from('wishlist_follows').select('followed_id').eq('follower_id',user.id);if(f.error)throw f.error;followed=new Set(f.data.map(x=>x.followed_id))}
 const root=$('peopleResults');root.replaceChildren();
 if(!result.data.length){root.textContent='Keine Profile gefunden.';return;}
 for(const p of result.data){
  const item=document.createElement('div');item.className='item';
  const name=document.createElement('strong');name.textContent=p.display_name+' (@'+p.handle+')';item.append(name);
  if(p.bio){const bio=document.createElement('p');bio.textContent=p.bio;item.append(bio)}
  if(user&&profile&&p.user_id!==user.id){
   const btn=document.createElement('button');btn.type='button';const isFollowing=followed.has(p.user_id);btn.textContent=isFollowing?'Nicht mehr folgen':'Folgen';
   btn.onclick=run(async()=>{
    btn.disabled=true;
    try{
     const ownerId=requireUser();const res=isFollowing?await db.from('wishlist_follows').delete().eq('follower_id',ownerId).eq('followed_id',p.user_id).select('follower_id'):await db.from('wishlist_follows').insert({follower_id:ownerId,followed_id:p.user_id});
     if(res.error)throw res.error;if(isFollowing&&!res.data?.length)throw Error('Abonnement konnte nicht entfernt werden');
     await searchPeople();offset=0;await feed();report(isFollowing?'Nicht mehr abonniert':'Profil abonniert');
    }finally{btn.disabled=false}
   });item.append(btn)
  }
  root.append(item)
 }
}
$('searchPeople').onclick=run(searchPeople);
$('feedFilter').onchange=run(async()=>{offset=0;await feed()});
$('feedSort').onchange=run(async()=>{offset=0;await feed()});

const sharedUrl=new URLSearchParams(window.location.search).get('url');if(sharedUrl&&sharedUrl.length<=4096&&parseAmazonUrl(sharedUrl)?.marketplace==='amazon.de')$('url').value=sharedUrl;
$('more').onclick=run(feed);db.auth.onAuthStateChange(()=>setTimeout(async()=>{try{await auth();offset=0;await feed()}catch(e){report(e.message)}},0));await Promise.all([auth(),feed()]).catch(e=>report(e.message));
