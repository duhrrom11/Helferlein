const db=window.supabase.createClient('https://avapuibsidubuzxjtyld.supabase.co','sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC');
const $=id=>document.getElementById(id);
const day=86400000;
function el(tag,value,cls){const node=document.createElement(tag);node.textContent=String(value);if(cls)node.className=cls;return node}
function dateOnly(value){if(!value)return null;const [y,m,d]=value.slice(0,10).split('-').map(Number);return Date.UTC(y,m-1,d)}
function number(n,digits=0){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(n)}
function card(root,label,value,detail){const box=el('article','','card');box.append(el('strong',value),el('span',label));if(detail)box.append(el('p',detail,'muted'));root.append(box)}
async function load(userId){const rows=[];for(let start=0;start<20000;start+=500){const {data,error}=await db.from('wishlist_gift_task_events').select('id,task_title,event_type,old_status,new_status,old_due_date,new_due_date,occurred_at').eq('user_id',userId).order('id',{ascending:true}).range(start,start+499);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<500)return rows}throw new Error('Bericht nicht vollständig: Ereignislimit erreicht')}
function weekStart(ms){const date=new Date(ms);return ms-((date.getUTCDay()+6)%7)*day}
function formatDate(ms){return new Date(ms).toLocaleDateString('de-DE',{timeZone:'UTC'})}
function render(rows){
 const completed=rows.filter(e=>e.event_type==='completed'),moves=rows.filter(e=>e.event_type==='due_date_changed'),reopened=rows.filter(e=>e.event_type==='reopened');
 const first=rows.length?new Date(rows[0].occurred_at):null,last=rows.length?new Date(rows[rows.length-1].occurred_at):null;
 $('scope').textContent=rows.length?'Ereignisse vom '+first.toLocaleString('de-DE')+' bis '+last.toLocaleString('de-DE')+'. Bericht erstellt am '+new Date().toLocaleString('de-DE')+'.':'Noch keine Ereignisse seit Aktivierung des Protokolls. Es werden keine früheren Änderungen geschätzt.';
 const kpis=$('kpis');card(kpis,'Erledigungsereignisse',number(completed.length),'Tatsächlich serverseitig protokolliert.');card(kpis,'Terminverschiebungen',number(moves.length));card(kpis,'Wiedereröffnungen',number(reopened.length));card(kpis,'Protokollierte Ereignisse',number(rows.length));
 const valid=moves.map(e=>({event:e,delta:e.old_due_date&&e.new_due_date?Math.round((dateOnly(e.new_due_date)-dateOnly(e.old_due_date))/day):null})),numeric=valid.filter(x=>x.delta!==null),average=numeric.length?numeric.reduce((s,x)=>s+x.delta,0)/numeric.length:null;
 const moveRoot=$('moves');card(moveRoot,'Durchschnittliche Verschiebung',average===null?'Nicht berechenbar':(average>0?'+':'')+number(average,1)+' Tage',numeric.length+' von '+moves.length+' Ereignissen mit beiden Datumswerten.');card(moveRoot,'Später geplant',number(numeric.filter(x=>x.delta>0).length));card(moveRoot,'Früher geplant',number(numeric.filter(x=>x.delta<0).length));card(moveRoot,'Unverändert / ohne Datumsvergleich',number(moves.length-numeric.filter(x=>x.delta!==0).length));
 const weekRoot=$('weeks'),today=new Date(),utcToday=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()),thisWeek=weekStart(utcToday),counts=[];
 for(let offset=7;offset>=0;offset--){const start=thisWeek-offset*7*day,end=start+7*day,items=rows.filter(e=>{const at=Date.parse(e.occurred_at);return at>=start&&at<end}),done=items.filter(e=>e.event_type==='completed').length,shift=items.filter(e=>e.event_type==='due_date_changed').length;counts.push(done);const box=el('article','','card');box.append(el('strong',done+' Erledigungen'),el('span',formatDate(start)+' – '+formatDate(end-day)),el('p',shift+' Terminverschiebungen · '+items.length+' Ereignisse','muted'));weekRoot.append(box)}
 const max=Math.max(1,...counts);for(const [i,box] of [...weekRoot.children].entries()){const bar=document.createElement('progress');bar.className='bar';bar.max=max;bar.value=counts[i];bar.setAttribute('aria-label','Erledigungsereignisse im Vergleich zum Maximum der acht Wochen');box.append(bar)}
 const body=$('events');for(const e of [...rows].reverse().slice(0,200)){const tr=document.createElement('tr');const label={completed:'Erledigt',reopened:'Wieder geöffnet',status_changed:'Status geändert',due_date_changed:'Termin verschoben'}[e.event_type]||'Änderung';const change=e.event_type==='due_date_changed'?(e.old_due_date||'ohne Datum')+' → '+(e.new_due_date||'ohne Datum'):(e.old_status||'—')+' → '+(e.new_status||'—');for(const value of [new Date(e.occurred_at).toLocaleString('de-DE'),e.task_title,label,change])tr.append(el('td',value));body.append(tr)}
 if(rows.length>200)body.append(el('tr','Chronik auf die 200 neuesten Ereignisse begrenzt; Kennzahlen berücksichtigen alle geladenen Ereignisse.'));
 $('report').hidden=false;$('status').textContent='Privater Bericht bereit. Keine Produktivdaten geändert.';
}
$('printReport').addEventListener('click',()=>{if(!$('report').hidden)window.print()});
async function main(){const {data,error}=await db.auth.getUser();if(error||!data?.user){$('login').hidden=false;$('status').textContent='Bitte anmelden.';return}render(await load(data.user.id))}
main().catch(()=>{$('status').textContent='Bericht konnte nicht vollständig geladen werden. Bitte später erneut versuchen.'});
