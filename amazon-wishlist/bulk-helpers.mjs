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
 if(!Number.isSafeInteger(pageSize)||pageSize<1)throw new RangeError('pageSize must be a positive integer');
 const rows=[];
 for(let offset=0;;offset+=pageSize){
  if(!isCurrent())return null;
  const response=await fetchPage(offset,offset+pageSize-1);
  if(!isCurrent())return null;
  if(response.error)throw response.error;
  const batch=response.data||[];
  if(!Array.isArray(batch))throw new TypeError('Paginated response must contain an array');
  rows.push(...batch);
  if(batch.length<pageSize)return rows;
 }
}

/** Runs one confirmed bulk job against an injected adapter. Never retries automatically. */
export async function executeBulkJob({targets,write,isCurrent=()=>true,shouldStop=()=>false,onProgress=()=>{}}) {
 const completed=[],failed=[],errors=new Map();
 let interrupted=false,invalidated=false;
 for(const wishId of targets){
  if(!isCurrent()){invalidated=true;interrupted=true;break}
  if(shouldStop()){interrupted=true;break}
  try{
   const response=await write(wishId);
   // The write may have reached the server, but must not update another account's UI.
   if(!isCurrent()){invalidated=true;interrupted=true;break}
   if(response?.error)throw response.error;
   completed.push(wishId);
  }catch(error){
   if(!isCurrent()){invalidated=true;interrupted=true;break}
   failed.push(wishId);
   const reason=bulkErrorHint(error);
   errors.set(reason,(errors.get(reason)||0)+1);
  }
  onProgress({done:completed.length+failed.length,total:targets.length,success:completed.length,failed:failed.length});
 }
 const summary=summarizeBulk({targets,completed,failed,stopped:interrupted});
 return {...summary,completed,errors:[...errors].map(([reason,count])=>({reason,count})),invalidated};
}
