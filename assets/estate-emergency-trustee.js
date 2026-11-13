(function () {
 'use strict';
 const form=document.getElementById('estateAlarmForm');
 if(!form)return;
 const key=document.getElementById('estateAlarmKey');
 const status=document.getElementById('estateAlarmResult');
 const submit=document.getElementById('estateAlarmStart');
 const endpoint='https://avapuibsidubuzxjtyld.supabase.co/functions/v1/estate-emergency';
 const publishable='sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC';
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const personal=key.value.trim().toLowerCase();
  key.value='';
  if(!/^[a-f0-9]{64}$/.test(personal)){
   status.textContent='Bitte gib deinen vollständigen persönlichen Schlüssel ein.';
   return;
  }
  submit.disabled=true;
  status.textContent='Alarm wird geprüft …';
  try{
   const response=await fetch(endpoint,{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json','apikey':publishable},
    body:JSON.stringify({action:'alarm',key:personal})
   });
   const data=await response.json().catch(()=>({}));
   if(response.ok && data.status==='countdown'){
    status.textContent='Der 24-Stunden-Countdown wurde gestartet oder läuft bereits. Ende: '+
     new Date(data.deadline).toLocaleString('de-DE')+
     '. Wichtig: Automatische Nachrichten und die Tresoröffnung sind noch nicht aktiv.';
   }else if(response.ok&&data.status==='expired'){
    status.textContent='Die 24 Stunden sind vorbei. Die Tresoröffnung ist noch nicht aktiv.';
   }else if(response.ok&&data.status==='canceled'){
    status.textContent='Der Alarm wurde vom Tresorbesitzer beendet.';
   }else{
    status.textContent=response.status===404?'Schlüssel nicht gefunden. Bitte frage die Person, die ihn dir geschickt hat.':'Alarm konnte nicht gestartet werden. Bitte später erneut versuchen.';
   }
  }catch{
   status.textContent='Keine Verbindung. Bitte später erneut versuchen.';
  }finally{
   submit.disabled=false;
  }
 });
 window.addEventListener('pagehide',()=>{key.value='';});
})();