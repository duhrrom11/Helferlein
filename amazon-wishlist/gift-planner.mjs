const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const statuses={idea:'💡 Idee',planned:'📝 Geplant',purchased:'🛍️ Gekauft',wrapped:'🎀 Verpackt',gifted:'🎁 Verschenkt'};
let user=null,occasions=[],gifts=[],editing=null;
const byId=id=>occasions.find(x=>x.id===id);
const number=id=>{const v=Number($(id).value);return Number.isFinite(v)&&v>=0?v:null};
function option(select,value,label){const el=document.createElement('option');el.value=value;el.textContent=label;select.append(el)}
function choices(){
 for(const id of ['occasion','budgetOccasion','filterOccasion'])$(id).replaceChildren();
 option($('filterOccasion'),'all','Alle Anlässe');
 for(const o of occasions){for(const id of ['occasion','budgetOccasion','filterOccasion'])option($(id),o.id,o.title+(o.person_name?' · '+o.person_name:''))}
 $('budgetAmount').value=String(byId($('budgetOccasion').value)?.budget_amount||0);
}
function reset(){editing=null;$('form').reset();$('planned').value='0';$('formTitle').textContent='➕ Geschenk hinzufügen';$('save').textContent='Geschenk speichern';$('cancel').hidden=true}
function render(){
 const totalBudget=occasions.reduce((s,o)=>s+Number(o.budget_amount||0),0);
 const planned=gifts.reduce((s,g)=>s+Number(g.planned_amount||0),0);
 const spent=gifts.reduce((s,g)=>s+Number(g.actual_amount||0),0);
 $('metricBudget').textContent=euro(totalBudget);$('metricPlanned').textContent=euro(planned);$('metricSpent').textContent=euro(spent);$('metricDone').textContent=gifts.filter(g=>g.status==='gifted').length+'/'+gifts.length;
 const current=byId($('budgetOccasion').value);
 const budget=Number(current?.budget_amount||0),used=gifts.filter(g=>g.occasion_id===current?.id).reduce((s,g)=>s+Number(g.actual_amount||0),0);
 $('budgetInfo').textContent=current?'Ausgegeben: '+euro(used)+' von '+euro(budget)+(budget>0?' · '+(used>budget?'Budget überschritten um '+euro(used-budget):'Verbleibend: '+euro(budget-used)):' · Noch kein Budget gesetzt.'):'Lege zuerst einen Anlass an.';
 $('budgetProgress').value=budget>0?Math.min(100,used/budget*100):0;
 const root=$('gifts');root.replaceChildren();
 const rows=gifts.filter(g=>($('filterOccasion').value==='all'||g.occasion_id===$('filterOccasion').value)&&($('filterStatus').value==='all'||g.status===$('filterStatus').value)).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='Noch keine passenden Geschenke. Lege links deine erste Geschenkidee an.';root.append(p)}
 for(const g of rows){
  const card=document.createElement('article');card.className='gift',main=document.createElement('div'),badge=document.createElement('span');badge.className='tag';badge.textContent=statuses[g.status]||g.status;
  const h=document.createElement('h3');h.textContent=g.title;
  const p=document.createElement('p');p.textContent=(byId(g.occasion_id)?.title||'Anlass')+(g.recipient_name?' · Für '+g.recipient_name:'');
  const money=document.createElement('p');money.textContent='Geplant: '+euro(g.planned_amount)+' · Ausgegeben: '+(g.actual_amount===null?'–':euro(g.actual_amount));
  main.append(badge,h,p,money);
  if(g.notes){const notes=document.createElement('p');notes.textContent=g.notes;main.append(notes)}
  const controls=document.createElement('div');controls.className='controls';
  const edit=document.createElement('button');edit.type='button';edit.textContent='✏️ Bearbeiten';edit.addEventListener('click',()=>{editing=g.id;$('occasion').value=g.occasion_id;$('title').value=g.title;$('recipient').value=g.recipient_name||'';$('planned').value=String(g.planned_amount);$('actual').value=g.actual_amount===null?'':String(g.actual_amount);$('giftStatus').value=g.status;$('notes').value=g.notes||'';$('formTitle').textContent='✏️ Geschenk bearbeiten';$('save').textContent='Änderungen speichern';$('cancel').hidden=false;$('form').scrollIntoView({behavior:'smooth',block:'start'});$('title').focus()});
  const remove=document.createElement('button');remove.type='button';remove.textContent='🗑️ Löschen';remove.addEventListener('click',async()=>{if(!confirm('Dieses Geschenk dauerhaft löschen?'))return;remove.disabled=true;const {error}=await db.from('wishlist_gift_plans').delete().eq('id',g.id).eq('user_id',user.id);if(error){$('status').textContent='Löschen fehlgeschlagen.';remove.disabled=false}else{gifts=gifts.filter(x=>x.id!==g.id);if(editing===g.id)reset();render();$('status').textContent='Geschenk gelöscht.'}});
  controls.append(edit,remove);card.append(main,controls);root.append(card);
 }
}
async function load(){
 const {data,error}=await db.auth.getUser();user=data?.user;
 if(error||!user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}
 const [o,g]=await Promise.all([db.from('wishlist_occasions').select('id,title,person_name,budget_amount').eq('user_id',user.id).order('occasion_date').limit(1000),db.from('wishlist_gift_plans').select('id,occasion_id,title,recipient_name,planned_amount,actual_amount,status,notes,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1000)]);
 if(o.error||g.error)throw o.error||g.error;
 occasions=o.data||[];gifts=g.data||[];$('content').hidden=false;choices();render();$('status').textContent=occasions.length?'Deine Geschenkplanung ist aktuell.':'Lege zuerst einen Anlass in der Anlasszentrale an.';
}
$('budgetOccasion').addEventListener('change',()=>{$('budgetAmount').value=String(byId($('budgetOccasion').value)?.budget_amount||0);render()});
$('filterOccasion').addEventListener('change',render);$('filterStatus').addEventListener('change',render);
$('saveBudget').addEventListener('click',async()=>{const id=$('budgetOccasion').value,amount=number('budgetAmount');if(!id||amount===null||amount>9999999999){$('status').textContent='Bitte einen Anlass und gültiges Budget wählen.';return}
 $('saveBudget').disabled=true;const {error}=await db.from('wishlist_occasions').update({budget_amount:amount,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);$('saveBudget').disabled=false;
 if(error){$('status').textContent='Budget konnte nicht gespeichert werden.';return}
 const o=byId(id);if(o)o.budget_amount=amount;render();$('status').textContent='Anlassbudget gespeichert.';
});
$('form').addEventListener('submit',async event=>{event.preventDefault();const occasionId=$('occasion').value,title=$('title').value.trim(),planned=number('planned'),actual=$('actual').value===''?null:number('actual');
 if(!user||!byId(occasionId)||!title||planned===null||planned>9999999999||(actual!==null&&(actual<0||actual>9999999999))){$('status').textContent='Bitte alle Beträge und Pflichtfelder prüfen.';return}
 const payload={occasion_id:occasionId,title,recipient_name:$('recipient').value.trim()||null,planned_amount:planned,actual_amount:actual,status:$('giftStatus').value,notes:$('notes').value.trim()||null,updated_at:new Date().toISOString()};
 $('save').disabled=true;
 try{const fields='id,occasion_id,title,recipient_name,planned_amount,actual_amount,status,notes,created_at';const r=editing?await db.from('wishlist_gift_plans').update(payload).eq('id',editing).eq('user_id',user.id).select(fields).single():await db.from('wishlist_gift_plans').insert({...payload,user_id:user.id}).select(fields).single();
 if(r.error)throw r.error;gifts=gifts.filter(x=>x.id!==r.data.id);gifts.push(r.data);reset();render();$('status').textContent='Geschenk gespeichert.';
 }catch{$('status').textContent='Geschenk konnte nicht gespeichert werden.'}finally{$('save').disabled=false}
});
$('cancel').addEventListener('click',reset);
load().catch(()=>{$('status').textContent='Geschenkplanung konnte nicht geladen werden. Bitte später erneut versuchen.'});
