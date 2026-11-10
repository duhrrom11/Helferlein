const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
let gifts=[],tasks=[],occasions=[],annualBudgets=[],closings=[],userId=null,selectedYear=new Date().getFullYear();
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
function yearOf(g){return Number(g.gift_year??g.created_at?.slice(0,4))}
function giftsIn(y){return gifts.filter(g=>yearOf(g)===y)}
function tasksIn(y){return tasks.filter(t=>t.checklist_year===y&&t.checklist_key)}
function summarize(y){const gs=giftsIn(y),ts=tasksIn(y),gifted=gs.filter(g=>g.status==='gifted').length,done=ts.filter(t=>t.status==='done').length;return{gifts:gs.length,gifted,spent:gs.reduce((n,g)=>n+Number(g.actual_amount||0),0),planned:gs.reduce((n,g)=>n+Number(g.planned_amount||0),0),tasks:ts.length,done}}
function render(){
 renderClosings();const year=Number($('year').value);selectedYear=year;const summary=summarize(year);
 $('gifts').textContent=summary.gifts;$('completion').textContent=(summary.gifts?Math.round(summary.gifted/summary.gifts*100):0)+' %';$('spent').textContent=money(summary.spent);
 const relevant=occasions.filter(o=>o.repeats_yearly||Number(o.occasion_date.slice(0,4))===year),budget=relevant.reduce((n,o)=>n+Number(annualBudgets.find(b=>b.occasion_id===o.id&&b.budget_year===year)?.budget_amount||0),0);
 $('budget').textContent=money(budget);
 const comparison=$('comparison');comparison.replaceChildren();const years=new Set([year,year-1,year-2,...closings.map(c=>c.closing_year),...gifts.map(yearOf),...tasks.filter(t=>t.checklist_year).map(t=>t.checklist_year)]);for(const y of [...years].filter(Number.isInteger).sort((a,b)=>b-a).slice(0,15)){
 const x=summarize(y),closed=closings.find(c=>c.closing_year===y),tr=document.createElement('tr');for(const value of [String(y)+(closed?' 🔒':''),closed?closed.gift_count:x.gifts,(closed?closed.gift_count:x.gifts)?Math.round((closed?closed.gifted_count:x.gifted)/(closed?closed.gift_count:x.gifts)*100)+' %':'–',money(closed?closed.actual_total:x.spent),money(closed?closed.planned_total:x.planned),x.tasks?x.done+'/'+x.tasks:'–'])tr.append(el('td',String(value)));comparison.append(tr)}
 const budgets=$('budgetDetails');budgets.replaceChildren();if(!relevant.length)budgets.append(el('p','Keine Anlässe für dieses Jahr vorhanden.','empty'));
 for(const o of relevant){const gs=giftsIn(year).filter(g=>g.occasion_id===o.id),planned=gs.reduce((n,g)=>n+Number(g.planned_amount||0),0),spent=gs.reduce((n,g)=>n+Number(g.actual_amount||0),0),historical=annualBudgets.find(b=>b.occasion_id===o.id&&b.budget_year===year),amount=historical?Number(historical.budget_amount):null,row=el('article','','row');
 row.append(el('strong',o.title),el('p','Jahresbudget: '+(amount===null?'nicht erfasst':money(amount))+' · Geplant: '+money(planned)+' · Erfasst: '+money(spent)+(amount>0&&Math.max(planned,spent)>amount?' · ⚠️ Budget überschritten':'')));
 const controls=el('div','','edit-controls'),input=document.createElement('input'),save=el('button','Jahresbudget speichern');input.type='number';input.min='0';input.max='9999999999.99';input.step='0.01';input.value=amount===null?'':String(amount);input.setAttribute('aria-label','Budget '+o.title+' '+year);
 save.addEventListener('click',async()=>{const n=Number(input.value);if(!input.value||!Number.isFinite(n)||n<0||n>9999999999.99){$('status').textContent='Bitte ein gültiges Budget eingeben.';return}save.disabled=true;const {data,error}=await db.from('wishlist_occasion_budget_years').upsert({user_id:userId,occasion_id:o.id,budget_year:year,budget_amount:n},{onConflict:'user_id,occasion_id,budget_year'}).select('id,occasion_id,budget_year,budget_amount').single();save.disabled=false;if(error){$('status').textContent='Budget konnte nicht gespeichert werden.';return}annualBudgets=annualBudgets.filter(b=>!(b.occasion_id===o.id&&b.budget_year===year));annualBudgets.push(data);render();$('status').textContent='Historisches Jahresbudget gespeichert.'});controls.append(input,save);row.append(controls);budgets.append(row)}

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
function renderClosings(){
 const root=$('closedYears');root.replaceChildren();const year=Number($('year').value),closed=closings.find(c=>c.closing_year===year);
 $('closeYear').disabled=Boolean(closed);$('closingConfirm').disabled=Boolean(closed);
 for(const c of closings){const box=el('div','','year-summary row');box.append(el('strong','🔒 '+c.closing_year+' · abgeschlossen am '+new Date(c.closed_at).toLocaleDateString('de-DE')),el('p',c.gift_count+' Geschenke · '+c.gifted_count+' verschenkt · Ausgaben: '+money(c.actual_total)+' · Geplant: '+money(c.planned_total)+' · Jahresbudgets: '+money(c.budget_total)));
 const details=document.createElement('details'),summary=el('summary','Gespeicherte Abschlussdetails anzeigen');details.append(summary);const giftList=el('div');for(const g of c.gifts_snapshot||[])giftList.append(el('p',g.title+' · '+g.status+' · '+money(g.actual_amount)+' erfasst'));details.append(giftList);const budgetList=el('div');for(const b of c.budgets_snapshot||[])budgetList.append(el('p',b.occasion_title+' · '+money(b.budget_amount)));details.append(budgetList);box.append(details);root.append(box)}
 if(!closings.length)root.append(el('p','Noch keine historischen Jahresabschlüsse gespeichert.','empty'));
}
$('closeYear').addEventListener('click',async()=>{
 const year=Number($('year').value);
 if(!$('closingConfirm').checked){$('closingStatus').textContent='Bitte die Bestätigung aktivieren.';return}
 if(!confirm('Jahr '+year+' jetzt endgültig abschließen? Der gespeicherte Abschluss kann nicht geändert oder gelöscht werden.'))return;
 $('closeYear').disabled=true;
 try{const {data,error}=await db.rpc('wishlist_close_gift_year',{p_year:year,p_confirm:true});if(error)throw error;
 const {data:rows,error:readError}=await db.from('wishlist_gift_year_closings').select('id,closing_year,closed_at,gift_count,gifted_count,planned_total,actual_total,budget_total,gifts_snapshot,budgets_snapshot').eq('id',data).single();if(readError)throw readError;
 closings.push(rows);$('closingConfirm').checked=false;render();$('closingStatus').textContent='Jahr '+year+' unveränderlich abgeschlossen.';
 }catch{$('closingStatus').textContent='Jahresabschluss konnte nicht gespeichert oder geladen werden.'}finally{$('closeYear').disabled=closings.some(c=>c.closing_year===year)}
});
async function main(){
 const {data,error}=await db.auth.getUser();const user=data?.user;if(error||!user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}
 userId=user.id;const [g,t,o,b,c]=await Promise.all([
 db.from('wishlist_gift_plans').select('id,title,occasion_id,created_at,gift_year,gift_year_source,status,planned_amount,actual_amount').eq('user_id',user.id).order('created_at',{ascending:false}).limit(5000),
 db.from('wishlist_gift_tasks').select('id,occasion_id,checklist_year,checklist_key,status').eq('user_id',user.id).limit(5000),
 db.from('wishlist_occasions').select('id,title,occasion_date,repeats_yearly,budget_amount').eq('user_id',user.id).limit(2000),
 db.from('wishlist_occasion_budget_years').select('id,occasion_id,budget_year,budget_amount').eq('user_id',user.id).limit(5000),
 db.from('wishlist_gift_year_closings').select('id,closing_year,closed_at,gift_count,gifted_count,planned_total,actual_total,budget_total,gifts_snapshot,budgets_snapshot').eq('user_id',user.id).order('closing_year',{ascending:false}).limit(200)
 ]);if(g.error||t.error||o.error||b.error||c.error)throw g.error||t.error||o.error||b.error||c.error;
 gifts=g.data||[];tasks=t.data||[];occasions=o.data||[];annualBudgets=b.data||[];closings=c.data||[];
 const years=new Set([selectedYear,selectedYear-1,selectedYear-2,...gifts.map(yearOf),...closings.map(c=>c.closing_year),...tasks.map(t=>t.checklist_year).filter(Boolean)]);for(const y of [...years].filter(Number.isInteger).sort((a,b)=>b-a)){const option=document.createElement('option');option.value=y;option.textContent=y;$('year').append(option)}
 $('year').value=String(selectedYear);$('year').addEventListener('change',render);$('content').hidden=false;render();$('status').textContent='Deine private Jahresstatistik ist geladen.';
}
main().catch(()=>{$('status').textContent='Statistik konnte nicht geladen werden.'});
