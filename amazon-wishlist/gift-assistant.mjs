const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);
const euro=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const day=86400000;
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e}
function nextDate(o,now){const [y,m,d]=o.occasion_date.split('-').map(Number);let date=Date.UTC(y,m-1,d);if(!o.repeats_yearly)return date>=now?date:null;let year=new Date(now).getUTCFullYear();for(let i=0;i<3;i++,year++){const last=new Date(Date.UTC(year,m,0)).getUTCDate();date=Date.UTC(year,m-1,Math.min(d,last));if(date>=now)return date}return null}
function median(values){const a=[...values].sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):null}
function addCard(root,title,lines){const box=el('article','','card');box.append(el('h3',title));for(const line of lines)box.append(el('p',line));root.append(box)}
async function allRows(table,columns,userId,order){let rows=[];for(let start=0;start<20000;start+=500){let q=db.from(table).select(columns).eq('user_id',userId).order(order,{ascending:true}).range(start,start+499);const {data,error}=await q;if(error)throw error;rows.push(...(data||[]));if((data||[]).length<500)return rows}throw new Error('Zu viele Datensätze für eine vollständige Auswertung')}
async function main(){
 const {data,error}=await db.auth.getUser(),user=data?.user;if(error||!user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}
 const [closings,occasions]=await Promise.all([
 allRows('wishlist_gift_year_closings','closing_year,gift_count,gifted_count,actual_total,budget_total,gifts_snapshot,budgets_snapshot,tasks_snapshot,task_count,task_done_count',user.id,'closing_year'),
 allRows('wishlist_occasions','id,title,occasion_date,repeats_yearly,reminder_days,budget_amount',user.id,'occasion_date')
 ]);
 const nowDate=new Date(),today=Date.UTC(nowDate.getFullYear(),nowDate.getMonth(),nowDate.getDate());
 $('evidence').textContent=closings.length+' gespeicherte historische Jahresabschlüsse. Die Empfehlungen verwenden ausschließlich deren unveränderliche Geschenk-, Budget- und Aufgaben-Snapshots. Aktuelle Anlässe liefern nur Namen und zukünftige Termine.';
 const root=$('occasionCards'),upcoming=occasions.map(o=>({...o,next:nextDate(o,today)})).filter(o=>o.next!==null).sort((a,b)=>a.next-b.next).slice(0,40);
 if(!upcoming.length)root.append(el('p','Noch keine kommenden Anlässe erfasst.'));
 for(const o of upcoming){
 const days=Math.round((o.next-today)/day),history=[];
 for(const c of closings){const gifts=Array.isArray(c.gifts_snapshot)?c.gifts_snapshot.filter(g=>g.occasion_id===o.id):[],budgets=Array.isArray(c.budgets_snapshot)?c.budgets_snapshot:[],budget=budgets.find(b=>b.occasion_id===o.id);
 if(!gifts.length&&!budget)continue;history.push({year:c.closing_year,gifts,budget:budget?.budget_amount??null,spent:gifts.reduce((n,g)=>n+Number(g.actual_amount||0),0),tasks:Array.isArray(c.tasks_snapshot)?c.tasks_snapshot.filter(t=>t.occasion_id===o.id):null})}
 const lines=['📅 '+new Date(o.next).toLocaleDateString('de-DE',{timeZone:'UTC'})+' · noch '+days+' Tage'];
 const budgetValues=history.map(h=>h.budget).filter(v=>v!==null).map(Number),spentValues=history.filter(h=>h.gifts.length).map(h=>h.spent);
 const suggestion=median(budgetValues.length?budgetValues:spentValues);
 if(suggestion!==null){lines.push('💶 Unverbindlicher Budgetrichtwert: '+euro(suggestion)+' (Median aus '+(budgetValues.length?'gespeicherten Anlassbudgets':'historisch erfassten Geschenkausgaben')+' in '+(budgetValues.length?budgetValues.length:spentValues.length)+' Abschlussjahr(en)).');lines.push('Aktuelles Budget: '+euro(o.budget_amount)+' – Änderungen nur über die Anlassverwaltung.')}
 else lines.push('💶 Noch kein belastbarer historischer Budgetrichtwert für diesen Anlass.');
 const historicalTasks=history.flatMap(h=>h.tasks||[]),hasShipping=historicalTasks.some(t=>/versand|liefer|bestell|shipping/i.test(t.title||''));
 const lead=hasShipping?28:21;lines.push('✅ Checklistenempfehlung: '+(hasShipping?'Versand-Checkliste (ca. 28 Tage Vorlauf)':'Standard-Checkliste (ca. 21 Tage Vorlauf)')+'. Begründung: '+(hasShipping?'In historischen Aufgaben gab es Versand- oder Bestellschritte.':'Keine historischen Versandaufgaben belegt; Standardvorlauf als allgemeine Planungsregel.'));
 if(days<=lead)lines.push('⏰ Frühzeitiger Hinweis: Der empfohlene Planungsbeginn ist erreicht'+(days<7?' – Anlass in weniger als sieben Tagen.':'.'));
 else lines.push('🗓️ Empfohlener Planungsbeginn in etwa '+(days-lead)+' Tagen.');
 const incomplete=history.filter(h=>h.gifts.length&&h.gifts.some(g=>g.status!=='gifted')).length;
 if(incomplete)lines.push('📌 Historische Beobachtung: In '+incomplete+' Abschlussjahr(en) waren Geschenke dieses Anlasses noch nicht als verschenkt markiert.');
 if(history.length)lines.push('Datengrundlage: '+history.map(h=>h.year).join(', ')+'.');else lines.push('Keine Anlasshistorie: Checklisten-Vorlauf ist eine allgemeine Empfehlung, keine historische Erkenntnis.');
 addCard(root,o.title,lines)
 }
 const tips=$('globalTips');
 if(!closings.length)addCard(tips,'Mit dem ersten Jahresabschluss starten',['Historische Budgetvorschläge werden erst möglich, wenn ein Jahresabschluss gespeichert wurde. Bis dahin bleiben allgemeine Checklistenregeln verfügbar.']);
 else{
 const yearsWithTasks=closings.filter(c=>c.task_count!==null),unfinished=yearsWithTasks.filter(c=>c.task_count>0&&c.task_done_count<c.task_count);
 if(unfinished.length)addCard(tips,'Checklisten frühzeitig starten',['In '+unfinished.length+' von '+yearsWithTasks.length+' Abschlüssen mit Aufgabenhistorie waren Checklisten nicht vollständig erledigt. Empfehlung: Aufgaben rechtzeitig vor dem Anlass erstellen.']);
 const budgeted=closings.filter(c=>Array.isArray(c.budgets_snapshot)&&c.budgets_snapshot.length);
 if(!budgeted.length)addCard(tips,'Historische Budgets aufbauen',['In den gespeicherten Abschlüssen fehlen ausdrücklich erfasste Anlassbudgets. Budgetrichtwerte können dann nur auf tatsächlich erfassten Geschenkausgaben beruhen.']);
 else addCard(tips,'Budgethistorie nutzen',['In '+budgeted.length+' abgeschlossenen Jahren wurden Anlassbudgets gespeichert. Diese Daten ermöglichen nachvollziehbare Richtwerte für wiederkehrende Anlässe.']);
 }
 $('content').hidden=false;$('status').textContent='Private Planungsvorschläge geladen. Keine Daten wurden geändert.';
}
main().catch(()=>{$('status').textContent='Die privaten Planungsvorschläge konnten nicht vollständig geladen werden. Bitte später erneut versuchen.'});
