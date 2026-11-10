const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);
const labels={open:'⬜ Offen',in_progress:'🔄 In Arbeit',done:'✅ Erledigt'};
const priorities={1:'🔴 Hoch',2:'🟡 Mittel',3:'🟢 Niedrig'};
let user=null,tasks=[],occasions=[],gifts=[],editing=null;
const dayMs=86400000;
function today(){const d=new Date();return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())}
function days(date){const [y,m,d]=date.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-today())/dayMs)}
function option(el,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;el.append(o)}
function choices(){for(const id of ['occasion','gift'])$(id).replaceChildren();option($('occasion'),'','Ohne Anlass');option($('gift'),'','Ohne Geschenk');
 for(const o of occasions)option($('occasion'),o.id,o.title);
 for(const g of gifts)if(!$('occasion').value||g.occasion_id===$('occasion').value)option($('gift'),g.id,g.title)}
function refreshGifts(){const selected=$('gift').value;const el=$('gift');el.replaceChildren();option(el,'','Ohne Geschenk');for(const g of gifts)if(!$('occasion').value||g.occasion_id===$('occasion').value)option(el,g.id,g.title);if([...el.options].some(x=>x.value===selected))el.value=selected}
function reset(){editing=null;$('form').reset();$('formTitle').textContent='➕ Aufgabe hinzufügen';$('save').textContent='Aufgabe speichern';$('cancel').hidden=true;choices()}
function render(){
 const reminders=$('reminders');reminders.replaceChildren();
 const due=tasks.filter(t=>t.status!=='done'&&t.due_date&&days(t.due_date)<=t.reminder_days).sort((a,b)=>days(a.due_date)-days(b.due_date)||a.priority-b.priority);
 if(!due.length){const p=document.createElement('p');p.className='empty';p.textContent='Keine fälligen Erinnerungen.';reminders.append(p)}
 for(const t of due.slice(0,15)){const p=document.createElement('p');p.className='warn';p.textContent=(days(t.due_date)<0?'⚠️ '+(-days(t.due_date))+' Tage überfällig':days(t.due_date)===0?'🔔 Heute fällig':'🔔 In '+days(t.due_date)+' Tagen')+' · '+t.title;reminders.append(p)}
 const root=$('tasks');root.replaceChildren();const filter=$('filter').value;
 const visible=tasks.filter(t=>filter==='all'||(filter==='done'?t.status==='done':t.status!=='done')).sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||((a.due_date?days(a.due_date):99999)-(b.due_date?days(b.due_date):99999))||a.priority-b.priority);
 if(!visible.length){const p=document.createElement('p');p.className='empty';p.textContent='Keine Aufgaben in dieser Ansicht.';root.append(p)}
 for(const t of visible){
  const item=document.createElement('article');item.className='item',h=document.createElement('h3');h.textContent=t.title;
  const occasion=occasions.find(o=>o.id===t.occasion_id),gift=gifts.find(g=>g.id===t.gift_plan_id);
  const meta=document.createElement('p');meta.textContent=[labels[t.status],priorities[t.priority],t.due_date?'Fällig: '+new Date(t.due_date+'T12:00:00').toLocaleDateString('de-DE'):'Ohne Fälligkeit',occasion?.title,gift?.title].filter(Boolean).join(' · ');
  const controls=document.createElement('div');controls.className='controls';
  const edit=document.createElement('button');edit.type='button';edit.textContent='Bearbeiten';edit.addEventListener('click',()=>{editing=t.id;$('title').value=t.title;$('occasion').value=t.occasion_id||'';refreshGifts();$('gift').value=t.gift_plan_id||'';$('due').value=t.due_date||'';$('reminder').value=t.reminder_days;$('priority').value=t.priority;$('taskStatus').value=t.status;$('notes').value=t.notes||'';$('formTitle').textContent='✏️ Aufgabe bearbeiten';$('save').textContent='Änderungen speichern';$('cancel').hidden=false;$('form').scrollIntoView({behavior:'smooth',block:'start'})});
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent=t.status==='done'?'Wieder öffnen':'✓ Erledigt';toggle.addEventListener('click',async()=>{toggle.disabled=true;const next=t.status==='done'?'open':'done';const {error}=await db.from('wishlist_gift_tasks').update({status:next,updated_at:new Date().toISOString()}).eq('id',t.id).eq('user_id',user.id);toggle.disabled=false;if(error){$('status').textContent='Statuswechsel fehlgeschlagen.';return}t.status=next;render();$('status').textContent='Aufgabe aktualisiert.'});
  const remove=document.createElement('button');remove.type='button';remove.textContent='Löschen';remove.addEventListener('click',async()=>{if(!confirm('Aufgabe wirklich löschen?'))return;remove.disabled=true;const {error}=await db.from('wishlist_gift_tasks').delete().eq('id',t.id).eq('user_id',user.id);if(error){remove.disabled=false;$('status').textContent='Löschen fehlgeschlagen.';return}tasks=tasks.filter(x=>x.id!==t.id);if(editing===t.id)reset();render();$('status').textContent='Aufgabe gelöscht.'});
  controls.append(edit,toggle,remove);item.append(h,meta,controls);root.append(item);
 }
}
$('occasion').addEventListener('change',refreshGifts);
$('filter').addEventListener('change',render);
$('cancel').addEventListener('click',reset);
$('form').addEventListener('submit',async event=>{event.preventDefault();if(!user)return;
 const title=$('title').value.trim();if(!title){$('status').textContent='Bitte Aufgabe eingeben.';return}
 const giftId=$('gift').value||null,linked=gifts.find(g=>g.id===giftId);
 const payload={title,occasion_id:$('occasion').value||linked?.occasion_id||null,gift_plan_id:giftId,due_date:$('due').value||null,reminder_days:Number($('reminder').value),priority:Number($('priority').value),status:$('taskStatus').value,notes:$('notes').value.trim()||null,updated_at:new Date().toISOString()};
 $('save').disabled=true;try{const fields='id,title,occasion_id,gift_plan_id,due_date,reminder_days,priority,status,notes,created_at';const r=editing?await db.from('wishlist_gift_tasks').update(payload).eq('id',editing).eq('user_id',user.id).select(fields).single():await db.from('wishlist_gift_tasks').insert({...payload,user_id:user.id}).select(fields).single();if(r.error)throw r.error;tasks=tasks.filter(x=>x.id!==r.data.id);tasks.push(r.data);reset();render();$('status').textContent='Aufgabe gespeichert.'}catch{$('status').textContent='Aufgabe konnte nicht gespeichert werden.'}finally{$('save').disabled=false}
});
async function main(){
 const {data,error}=await db.auth.getUser();user=data?.user;if(error||!user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}
 const [t,o,g]=await Promise.all([db.from('wishlist_gift_tasks').select('id,title,occasion_id,gift_plan_id,due_date,reminder_days,priority,status,notes,created_at').eq('user_id',user.id).limit(1000),db.from('wishlist_occasions').select('id,title').eq('user_id',user.id).limit(1000),db.from('wishlist_gift_plans').select('id,title,occasion_id').eq('user_id',user.id).limit(1000)]);
 if(t.error||o.error||g.error)throw t.error||o.error||g.error;tasks=t.data||[];occasions=o.data||[];gifts=g.data||[];choices();$('content').hidden=false;render();$('status').textContent='Deine Geschenk-To-dos sind aktuell.';
}
main().catch(()=>{$('status').textContent='Aufgaben konnten nicht geladen werden.'});
