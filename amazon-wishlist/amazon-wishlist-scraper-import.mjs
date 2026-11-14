/** Optional Amazon.de wishlist importer. All writes require a second, explicit user action. */
export function resolveAmazonPreviewGateway(config, pageOrigin) {
  if(config==='/api/amazon-wishlist-preview')return {url:config,credentials:'same-origin'};
  if(typeof config!=='string'||typeof pageOrigin!=='string')throw Error('Amazon-Gateway nicht konfiguriert.');
  let endpoint,origin;
  try{endpoint=new URL(config);origin=new URL(pageOrigin);}catch{throw Error('Ungültige Amazon-Gateway-Adresse.');}
  if(endpoint.protocol!=='https:'||origin.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/api/amazon-wishlist-preview')throw Error('Nur ein fest konfiguriertes HTTPS-Amazon-Gateway ist erlaubt.');
  return {url:endpoint.href,credentials:'omit'};
}

export function mountAmazonWishlistScraperImport({db,getUser,onImported}) {
  const editor=document.getElementById('editor');
  if(!editor)throw Error('Wunsch-Editor nicht vorhanden.');
  if(document.getElementById('amazonScraperImport'))throw Error('Importer bereits eingebunden.');
  const section=document.createElement('section');
  section.id='amazonScraperImport';
  const heading=document.createElement('h2');heading.textContent='Amazon-Wunschliste importieren';
  const label=document.createElement('label');label.htmlFor='amazonScraperUrl';label.textContent='Öffentlicher Amazon.de-Wunschlistenlink';
  const input=document.createElement('input');input.id='amazonScraperUrl';input.type='url';input.autocomplete='off';input.placeholder='https://www.amazon.de/hz/wishlist/ls/…';input.maxLength=2048;
  const previewBtn=document.createElement('button');previewBtn.type='button';previewBtn.textContent='Liste prüfen (noch nichts speichern)';
  const result=document.createElement('div');result.id='amazonScraperResults';
  const consentLabel=document.createElement('label');
  const consent=document.createElement('input');consent.type='checkbox';consent.style.width='auto';
  consentLabel.append(consent,document.createTextNode(' Ich weiß, dass importierte Produkttitel in Helferlein öffentlich sichtbar sein können. Die ausgewählten Wünsche sollen öffentlich angelegt werden.'));
  const confirmBtn=document.createElement('button');confirmBtn.type='button';confirmBtn.textContent='Ausgewählte Wünsche importieren';confirmBtn.disabled=true;
  const feedback=document.createElement('p');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  result.hidden=true;section.hidden=!getUser();section.append(heading,label,input,previewBtn,feedback,result);editor.after(section);
  let generation=0, busy=false, pending=null, disposed=false;
  const current=(token,owner)=>!disposed&&generation===token&&getUser()?.id===owner;
  const invalidate=()=>{generation++;pending=null;result.replaceChildren();result.hidden=true;confirmBtn.disabled=true;feedback.textContent='';};
  input.addEventListener('input',invalidate);
  function busyState(value){busy=value;previewBtn.disabled=value;confirmBtn.disabled=value||!pending;input.disabled=value;consent.disabled=value;}
  previewBtn.addEventListener('click',async()=>{
    if(busy)return;invalidate();const owner=getUser()?.id;if(!owner){feedback.textContent='Bitte zuerst anmelden.';return;}
    const token=generation;busyState(true);feedback.textContent='Liste wird ausgelesen …';
    try{
      const gateway=resolveAmazonPreviewGateway(window.__HELFERLEIN_AMAZON_PREVIEW_URL__??window.__HELFERLEIN_AMAZON_PREVIEW_PATH__,window.location.origin);
      const {data:sessionResult,error:sessionError}=await db.auth.getSession();
      if(sessionError||!sessionResult?.session?.access_token)throw Error('Anmeldung erforderlich.');
      const response=await fetch(gateway.url,{method:'POST',headers:{'authorization':`Bearer ${sessionResult.session.access_token}`,'content-type':'application/json'},body:JSON.stringify({url:input.value.trim()}),credentials:gateway.credentials});
      let data;try{data=await response.json();}catch{throw Error('Gateway lieferte keine gültige JSON-Antwort.');}
      if(!response.ok)throw Error(data?.error||`Gateway-Fehler ${response.status}`);
      if(!current(token,owner))return;
      if(!data||!Array.isArray(data.products))throw Error(data?.error||'Scraper nicht verfügbar.');
      const known=new Set();
      let knownComplete=false;
      for(let start=0;start<10000;start+=500){
        const query=await db.from('wishlist_wishes').select('wishlist_products(asin,marketplace)').eq('user_id',owner).order('id',{ascending:true}).range(start,start+499);
        if(!current(token,owner))return;
        if(query.error)throw Error('Eigene Wünsche konnten nicht vollständig geprüft werden.');
        for(const row of query.data||[])if(row.wishlist_products?.marketplace==='amazon.de')known.add(row.wishlist_products.asin);
        if((query.data||[]).length<500){knownComplete=true;break;}
      }
      if(!knownComplete)throw Error('Die eigene Wunschliste ist zu groß für eine vollständige Dublettenprüfung. Import vorsorglich abgebrochen.');
      const seenAsins=new Set();const candidates=data.products.filter(p=>p&&typeof p==='object'&&typeof p.asin==='string'&&/^[A-Z0-9]{10}$/.test(p.asin)&&p.marketplace==='amazon.de'&&typeof p.title==='string'&&!p.title.includes('\u0000')&&!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(p.title)&&p.title.trim()&&Array.from(p.title.replace(/^ +| +$/g,'')).length<=250&&!known.has(p.asin)&&!seenAsins.has(p.asin)&&(seenAsins.add(p.asin),true)).map(p=>({...p,title:p.title.replace(/^ +| +$/g,'')})).slice(0,100);
      pending={owner,token,items:candidates,originalUrl:input.value.trim()};
      result.hidden=false;result.replaceChildren();
      const intro=document.createElement('p');intro.textContent=`${data.products.length} erkannt, ${candidates.length} noch nicht auf deiner Wunschliste. ${data.partial?'Es wurden nicht alle Seiten geprüft.':''}`;result.append(intro);
      const list=document.createElement('div');
      for(const item of candidates){const row=document.createElement('label');row.style.display='block';const box=document.createElement('input');box.type='checkbox';box.checked=true;box.style.width='auto';box.dataset.asin=item.asin;row.append(box,document.createTextNode(' '+item.title+' ('+item.asin+')'));list.append(row);}
      result.append(list,consentLabel,confirmBtn);
      consent.checked=false;confirmBtn.disabled=!candidates.length;
      feedback.textContent=data.warning||'Vorschau bereit. Noch nichts gespeichert.';
    }catch(error){if(current(token,owner)){pending=null;result.hidden=true;feedback.textContent=error.message||'Importvorschau fehlgeschlagen.';}}
    finally{busyState(false);if(!pending)confirmBtn.disabled=true;}
  });
  confirmBtn.addEventListener('click',async()=>{
    if(busy||!pending)return;
    const {owner,token,items,originalUrl}=pending;
    if(!current(token,owner)||input.value.trim()!==originalUrl){invalidate();return;}
    if(!consent.checked){feedback.textContent='Bitte die Veröffentlichung der Produkttitel ausdrücklich bestätigen.';return;}
    const selected=new Set([...result.querySelectorAll('input[data-asin]:checked')].map(el=>el.dataset.asin));
    const importItems=items.filter(item=>selected.has(item.asin));if(!importItems.length){feedback.textContent='Keine Produkte ausgewählt.';return;}
    if(!window.confirm(`${importItems.length} Wünsche öffentlich in deinem Profil speichern?`))return;
    if(!current(token,owner))return;
    // Clear the snapshot before dispatch: a network failure may still have committed.
    pending=null;confirmBtn.disabled=true;
    busyState(true);
    try {
      // Single RPC transaction. Fail closed if reviewed SQL has not been installed.
      const {data,error}=await db.rpc('wishlist_import_amazon_batch',{
        p_items:importItems.map(({asin,title})=>({asin,title}))
      });
      if(!current(token,owner))return; // Request may have committed: never claim cancellation.
      if(error)throw error;
      if(!data||!Number.isInteger(data.inserted)||!Number.isInteger(data.skipped)||data.inserted<0||data.skipped<0||data.inserted+data.skipped!==importItems.length)throw Error('Unklare Serverantwort');
      result.hidden=true;
      feedback.textContent=`${data?.inserted??0} importiert, ${data?.skipped??0} bereits vorhanden.`;
      if(data?.inserted){try{await onImported();}catch{feedback.textContent+=' Anzeige konnte nicht aktualisiert werden; bitte Seite neu laden. Import nicht erneut starten.';}}
    }catch(error){
      if(current(token,owner)){result.hidden=true;feedback.textContent='Importstatus unklar. Bitte Wunschliste aktualisieren und neue Vorschau erstellen, bevor du erneut importierst. '+(error?.code==='PGRST202'?'Die transaktionale Importfunktion ist noch nicht freigegeben.':'');}
    }finally{busyState(false);confirmBtn.disabled=true;}

  });
  const authRegistration=db.auth.onAuthStateChange(event=>{section.hidden=!getUser();if(['SIGNED_OUT','SIGNED_IN','USER_UPDATED','TOKEN_REFRESHED'].includes(event)){generation++;pending=null;result.replaceChildren();result.hidden=true;confirmBtn.disabled=true;feedback.textContent='Sitzung geändert. Bitte Vorschau neu laden.';}});
  return {invalidate,dispose(){if(disposed)return;disposed=true;invalidate();authRegistration?.data?.subscription?.unsubscribe?.();section.remove();}};
}
