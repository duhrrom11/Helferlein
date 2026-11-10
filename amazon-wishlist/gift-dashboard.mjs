const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const labels={idea:'💡 Idee',planned:'📝 Geplant',purchased:'🛍️ Gekauft',wrapped:'🎀 Verpackt',gifted:'🎁 Verschenkt'};
const priority={1:'🔴 Hoch',2:'🟡 Mittel',3:'🟢 Niedrig'};
let occasions=[],gifts=[],user=null,reservationCount=0,linkedCount=0;
function today(){const n=new Date();return Date.UTC(n.getFullYear(),n.getMonth(),n.getDate())}
function nextDate(o){const [y,m,d]=o.occasion_date.split('-').map(Number),now=today();if(!o.repeats_yearly)return Date.UTC(y,m-1,d);
 const current=new Date(now).getUTCFullYear();
 const make=year=>Date.UTC(year,m-1,m===2&&d===29&&new Date(Date.UTC(year,1,29)).getUTCMonth()!==1?28:d);
 let result=make(current);if(result<now)result=make(current+1);return result;
}
function days(o){return Math.round((nextDate(o)-today())/86400000)}
function node(tag,txt,cls){const el=document.createElement(tag);el.textContent=txt;if(cls)el.className=cls;return el}
function empty(root,text){root.append(node('p',text,'empty'))}
function render(){
 const upcoming=occasions.filter(o=>days(o)>=0&&days(o)<=30).sort((a,b)=>days(a)-days(b));
 const open=gifts.filter(g=>g.status!=='gifted');
 const gifted=gifts.filter(g=>g.status==='gifted').length;
 const percent=gifts.length?Math.round(gifted/gifts.length*100):0;
 $('upcoming').textContent=upcoming.length;$('open').textContent=open.length;$('reserved').textContent=reservationCount;
 $('budget').textContent=euro(occasions.reduce((n,o)=>n+Number(o.budget_amount||0),0));
 $('progress').textContent=percent+' %';$('progressBar').value=percent;
 $('progressText').textContent=gifted+' von '+gifts.length+' Geschenken verschenkt.';
 $('reservationText').textContent=reservationCount+' eigene Reservierungen, davon '+linkedCount+' mit deiner Geschenkplanung verknüpft.';
 const occ=$('occasions');occ.replaceChildren();
 if(!upcoming.length)empty(occ,'Keine Anlässe in den nächsten 30 Tagen.');
 for(const o of upcoming.slice(0,12)){const item=node('article','','item'),h=node('h3',o.title+(o.person_name?' · '+o.person_name:'')),p=node('p',days(o)===0?'Heute!':'In '+days(o)+' Tagen'),link=document.createElement('a');link.href='./gift-planner.html';link.textContent='Geschenke planen ↗';item.append(h,p,link);occ.append(item)}
 const tasks=$('tasks');tasks.replaceChildren();const filter=$('priorityFilter').value;
 const visible=open.filter(g=>filter==='all'||String(g.priority)===filter).sort((a,b)=>a.priority-b.priority||((occasions.find(o=>o.id===a.occasion_id)?days(occasions.find(o=>o.id===a.occasion_id)):99999)-(occasions.find(o=>o.id===b.occasion_id)?days(occasions.find(o=>o.id===b.occasion_id)):99999)));
 if(!visible.length)empty(tasks,'Keine offenen Geschenke für diese Priorität.');
 for(const g of visible.slice(0,25)){
  const item=node('article','','item'),h=node('h3',g.title),o=occasions.find(x=>x.id===g.occasion_id),p=node('p',(o?.title||'Anlass')+' · '+labels[g.status]+' · '+euro(g.planned_amount)),tag=node('span',priority[g.priority]||priority[2],'tag'),select=document.createElement('select');
  select.setAttribute('aria-label','Priorität für '+g.title);select.title='Priorität ändern';
  for(const [value,label] of Object.entries(priority)){const opt=document.createElement('option');opt.value=value;opt.textContent=label;select.append(opt)}
  select.value=String(g.priority);select.addEventListener('change',async()=>{const previous=g.priority,next=Number(select.value);select.disabled=true;const {error}=await db.from('wishlist_gift_plans').update({priority:next,updated_at:new Date().toISOString()}).eq('id',g.id).eq('user_id',user.id);select.disabled=false;if(error){select.value=String(previous);$('status').textContent='Priorität konnte nicht gespeichert werden.'}else{g.priority=next;render();$('status').textContent='Priorität gespeichert.'}});
  const link=document.createElement('a');link.href='./gift-planner.html';link.textContent='Geschenk bearbeiten ↗';
  item.append(h,p,tag,node('span',' · '),select,node('p',''),link);tasks.append(item);
 }
 if(visible.length>25)tasks.append(node('p','Weitere '+(visible.length-25)+' Aufgaben findest du in der Geschenkplanung.'));
 const warnings=$('warnings');warnings.replaceChildren();let count=0;
 for(const o of occasions){const budget=Number(o.budget_amount||0);if(budget<=0)continue;
  const related=gifts.filter(g=>g.occasion_id===o.id),planned=related.reduce((n,g)=>n+Number(g.planned_amount||0),0),spent=related.reduce((n,g)=>n+Number(g.actual_amount||0),0);
  if(planned>budget||spent>budget){count++;warnings.append(node('p','⚠️ '+o.title+': Budget '+euro(budget)+' · geplant '+euro(planned)+' · ausgegeben '+euro(spent),'warning'))}
 }
 if(!count)empty(warnings,'Aktuell keine Budgetüberschreitungen bei Anlässen mit festgelegtem Budget.');
}
async function main(){
 const {data,error}=await db.auth.getUser();user=data?.user;
 if(error||!user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}
 const [o,g,r]=await Promise.all([
  db.from('wishlist_occasions').select('id,title,person_name,occasion_date,repeats_yearly,budget_amount').eq('user_id',user.id).limit(1000),
  db.from('wishlist_gift_plans').select('id,occasion_id,title,priority,status,planned_amount,actual_amount').eq('user_id',user.id).limit(1000),
  db.rpc('wishlist_gift_dashboard_reservations')
 ]);
 if(o.error||g.error||r.error)throw o.error||g.error||r.error;
 occasions=o.data||[];gifts=g.data||[];
 reservationCount=Number(r.data?.[0]?.my_reservations||0);linkedCount=Number(r.data?.[0]?.linked_reservations||0);
 $('content').hidden=false;render();$('status').textContent='Deine Geschenkzentrale ist aktuell.';
}
$('priorityFilter').addEventListener('change',render);
main().catch(()=>{$('status').textContent='Dashboard konnte nicht geladen werden. Bitte später erneut versuchen.'});
