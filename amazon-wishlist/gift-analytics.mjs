const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
let gifts=[],tasks=[],occasions=[],annualBudgets=[],userId=null,selectedYear=new Date().getFullYear();
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
function yearOf(g){return Number(g.gift_year??g.created_at?.slice(0,4))}
function giftsIn(y){return gifts.filter(g=>yearOf(g)===y)}
function tasksIn(y){return tasks.filter(t=>t.checklist_year===y&&t.checklist_key)}
function summarize(y){const gs=giftsIn(y),ts=tasksIn(y),gifted=gs.filter(g=>g.status==='gifted').length,done=ts.filter(t=>t.status==='done').length;return{gifts:gs.length,gifted,spent:gs.reduce((n,g)=>n+Number(g.actual_amount||0),0),planned:gs.reduce((n,g)=>n+Number(g.planned_amount||0),0),tasks:ts.length,done}}
function render(){
 const year=Number($('year').value);selectedYear=year;const summary=summarize(year);
 $('gifts').textContent=summary.gifts;$('completion').textContent=(summary.gifts?Math.round(summary.gifted/summary.gifts*100):0)+' %';$('spent').textContent=money(summary.spent);
 const relevant=occasions.filter(o=>o.repeats_yearly||Number(o.occasion_date.slice(0,4))===year),budget=relevant.reduce((n,o)=>n+Number(budgets.find(b=>b.occasion_id===o.id&&b.budget_year===year)?.budget_amount||0),0);
 $('budget').textContent=money(budget);
 const comparison=$('comparison');comparison.replaceChildren();const years=new Set([year,year-1,year-2,...gifts.map(yearOf),...tasks.filter(t=>t.checklist_year).map(t=>t.checklist_year)]);for(const y of [...years].filter(Number.isInteger).sort((a,b)=>b-a).slice(0,15)){
 const x=summarize(y),tr=document.createElement('tr');for(const value of [y,x.gifts,x.gifts?Math.round(x.gifted/x.gifts*100)+' %':'–',money(x.spent),money(x.planned),x.tasks?x.done+'/'+x.tasks:'–'])tr.append(el('td',String(value)));comparison.append(tr)}
 const budgets=$('budgetDetails');budgets.replaceChildren();if(!relevant.length)budgets.append(el('p','Keine Anlässe für dieses Jahr vorhanden.','empty'));
 for(const o of relevant){const gs=giftsIn(year).filter(g=>g.occasion_id===o.id),planned=gs.reduce((n,g)=>n+Number(g.planned_amount||0),0),spent=gs.reduce((n,g)=>n+Number(g.actual_amount||0),0),amount=Number(o.budget_amount||0),row=el('article','','row');row.append(el('strong',o.title),el('p','Aktuelles Budget: '+money(amount)+' · Geplant: '+money(planned)+' · Erfasst: '+money(spent)+(amount>0&&Math.max(planned,spent)>amount?' · ⚠️ Budget überschritten':'')));budgets.append(row)}
 renderGiftYearEditor(year);
 const completed=$('completed');completed.replaceChildren();let completedCount=0;
 for(const o of relevant){const ts=tasksIn(year).filter(t=>t.occasion_id===o.id),gs=giftsIn(year).filter(g=>g.occasion_id===o.id);
 const taskDone=ts.length>0&&ts.every(t=>t.status==='done'),giftDone=gs.length>0&&gs.every(g=>g.status==='gifted');
 if(!taskDone&&!giftDone)continue;completedCount++;
 const row=el('article','','row');row.append(el('strong',o.title+' · '+year),el('p',(taskDone?'✅ Checkliste abgeschlossen ('+ts.length+' Aufgaben)':'')+(taskDone&&giftDone?' · ':'')+(giftDone?'🎁 Alle '+gs.length+' Geschenke verschenkt':'')));const progress=document.createElement('progress');progress.className='meter';progress.max=ts.length||gs.length;progress.value=taskDone?ts.length:gs.filter(g=>g.status==='gifted').length;row.append(progress);completed.append(row)}
 if(!completedCount)completed.append(el('p','Für dieses Jahr sind noch keine vollständig erledigten Anlass-Checklisten oder Geschenkgruppen erfasst.','empty'));
}
function renderGiftYearEditor(year){
 const root=$('giftYearEditor');root.replaceChildren();const relevant=giftsIn(year);
 if(!relevant.length){root.append(el('p','Keine Geschenke für dieses Jahr zugeordnet.','empty'));return}
 for(const g of relevant.slice(0,80)){
 const row=el('div','','row');row.append(el('strong',g.title),el('p','Jahr: '+yearOf(g)+(g.gift_year_source==='inferred_created'?' · ⚠️ aus Erstellungsdatum geschätzt':' · bestätigt')));
 const controls=el('div','','edit-controls'),input=document.createElement('input');input.type='number';input.min='1900';input.max='2200';input.step='1';input.value=String(yearOf(g));input.setAttribute('aria-label','Geschenkjahr '+g.title);const button=el('button','Jahr speichern');
 button.addEventListener('click',async()=>{const y=Number(input.value);if(!Number.isInteger(y)||y<1900||y>2200){$('status').textContent='Ungültiges Geschenkjahr.';return}button.disabled=true;const {data,error}=await db.rpc('wishlist_set_gift_year',{p_plan_id:g.id,p_year:y});button.disabled=false;if(error||!data){$('status').textContent='Geschenkjahr konnte nicht gespeichert werden.';return}g.gift_year=y;g.gift_year_source='manual';if(![...$('year').options].some(o=>Number(o.value)===y)){const option=document.createElement('option');option.value=y;option.textContent=y;$('year').append(option)}$('year').value=String(y);render();$('status').textContent='Geschenkjahr gespeichert.'});controls.append(input,button);row.append(controls);root.append(row)}
 if(relevant.length>80)root.append(el('p','Es werden nur die ersten 80 Geschenke angezeigt. Weitere Geschenke sind über die Jahreszuordnung in der Datenbank vorhanden.','note'));
}
async function main(){
 const {data,error}=await db.auth.getUser();const user=data?.user;if(error||!user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}
 userId=user.id;const [g,t,o,b]=await Promise.all([
 db.from('wishlist_gift_plans').select('id,title,occasion_id,created_at,gift_year,gift_year_source,status,planned_amount,actual_amount').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5000),
 db.from('wishlist_gift_tasks').select('id,occasion_id,checklist_year,checklist_key,status').eq('user_id',user.id).limit(5000),
 db.from('wishlist_occasions').select('id,title,occasion_date,repeats_yearly,budget_amount').eq('user_id',user.id).limit(2000),
 db.from('wishlist_occasion_budget_years').select('id,occasion_id,budget_year,budget_amount').eq('user_id',user.id).limit(5000)
 ]);if(g.error||t.error||o.error||b.error)throw g.error||t.error||o.error||b.error;
 gifts=g.data||[];tasks=t.data||[];occasions=o.data||[];annualBudgets=b.data||[];
 const years=new Set([selectedYear,selectedYear-1,selectedYear-2,...gifts.map(yearOf),...tasks.map(t=>t.checklist_year).filter(Boolean)]);for(const y of [...years].filter(Number.isInteger).sort((a,b)=>b-a)){const option=document.createElement('option');option.value=y;option.textContent=y;$('year').append(option)}
 $('year').value=String(selectedYear);$('year').addEventListener('change',render);$('content').hidden=false;render();$('status').textContent='Deine private Jahresstatistik ist geladen.';
}
main().catch(()=>{$('status').textContent='Statistik konnte nicht geladen werden.'});
