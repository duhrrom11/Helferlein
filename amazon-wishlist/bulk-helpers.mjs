// Pure wishlist helpers: no browser, database or network dependencies.
export function eligibleBulkTargets(ids, knownIds, assignedIds, add) {
 const known=new Set(knownIds),seen=new Set();
 return [...ids].filter(id=>{if(seen.has(id)||!known.has(id))return false;seen.add(id);return add?!assignedIds.has(id):assignedIds.has(id)});
}
export function summarizeBulk({targets,completed=[],failed=[],stopped=false}) {
 const done=new Set([...completed,...failed]),remaining=targets.filter(id=>!done.has(id));
 return {total:targets.length,success:completed.length,failed:[...failed],remaining,interrupted:stopped||remaining.length>0};
}
export function bulkContextValid(job,{userId,listId,ready,activeListIds}) {
 return !!job&&!!ready&&job.uid===userId&&job.listId===listId&&activeListIds.has(job.listId);
}
export function bulkErrorHint(error) {
 const code=String(error?.code||''),status=Number(error?.status||0),message=String(error?.message||'').toLowerCase();
 if(code==='23505'||message.includes('duplicate key'))return 'Bereits zugeordnet – bitte Liste aktualisieren.';
 if(status===401||status===403||code==='42501'||message.includes('permission denied'))return 'Keine Berechtigung – bitte Anmeldung und Listenrechte prüfen.';
 if(status===429||message.includes('rate limit'))return 'Zu viele Anfragen – bitte später erneut versuchen.';
 if(message.includes('network')||message.includes('fetch')||message.includes('timeout'))return 'Verbindungsproblem – bitte Verbindung prüfen.';
 return 'Änderung fehlgeschlagen – bitte später erneut versuchen.';
}

export async function fetchAllPages(fetchPage,{pageSize=1000,isCurrent=()=>true}={}) {
 const rows=[];
 for(let offset=0;;offset+=pageSize){
  if(!isCurrent())return null;
  const response=await fetchPage(offset,offset+pageSize-1);
  if(!isCurrent())return null;
  if(response.error)throw response.error;
  const batch=response.data||[];
  rows.push(...batch);
  if(batch.length<pageSize)return rows;
 }
}
