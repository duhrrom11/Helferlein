import {ToolyaBuddy} from '../../tools/wishlist/toolya-buddy.mjs';

// One component and one preference format across every tool, without changing storage/auth.
const assets=new URL('../../tools/wishlist/',import.meta.url).href;
const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../../tools/wishlist/toolya-buddy.css',import.meta.url).href;document.head.append(style);
const platformStyle=document.createElement('link');platformStyle.rel='stylesheet';platformStyle.href=new URL('./platform.css',import.meta.url).href;document.head.append(platformStyle);
const key='helferlein-toolya-preferences-v1';
const contexts={
 wishlist:['Geschenkexperte','🎁','Platz für deine nächsten Geschenkideen.'],
 'wg-kasse':['Buchhalter','🧮','Behalte gemeinsame Ausgaben im Blick.'],
 'wg-organisator':['Organisator','📋','Ein guter Plan macht den Alltag leichter.'],
 'haushaltsbuch-kassenbon':['Buchhalter','🧮','Behalte deine Ausgaben im Blick.'],
 kassenbon:['Buchhalter','🧮','Behalte deine Ausgaben im Blick.'],
 'küche':['Küchenhelfer','👨‍🍳','Was zaubern wir heute?'],
 'backform-umrechner':['Backhelfer','👨‍🍳','Die passende Form für deine Backidee.'],
 kfz:['Mechaniker','🔧','Dein Fahrzeug gut organisiert.'],
 'autokosten-reifenwechsel':['Mechaniker','🔧','Dein Fahrzeug gut organisiert.'],
 pflanzen:['Gärtner','🌱','Ein guter Tag für deine grünen Freunde.'],
 'pflanzenpflege-giessplan':['Gärtner','🌱','Ein guter Tag für deine grünen Freunde.'],
 haustier:['Tierfreund','🐾','Alles Wichtige für deine tierischen Freunde.'],
 'haustier-gesundheitspass':['Tierbegleiter','🐾','Gesundheitsinformationen übersichtlich aufbewahren.'],
 kisten:['Umzugshelfer','📦','Damit beim Umzug nichts verloren geht.'],
 'umzugskisten-inventar':['Umzugshelfer','📦','Damit beim Umzug nichts verloren geht.'],
 parken:['Parkhelfer','🦺','Parkplatz und Parkzeit im Blick.'],
 'parkplatz-merker-parkschein-timer':['Parkhelfer','🦺','Parkplatz und Parkzeit im Blick.'],
 notizen:['Schreiber','📝','Hier finden deine Gedanken einen Platz.'],
 energie:['Energiehelfer','⚡','Zählerstände einfach im Blick.'],
 'zaehlerstaende-erfassen':['Energiehelfer','⚡','Zählerstände einfach im Blick.'],
 'digitaler-nachlass':['Vorsorgebegleiter','📁','In Ruhe das Wichtige ordnen.'],
 verleih:['Organisator','📋','Behalte verliehene Gegenstände im Blick.'],
 'verliehene-gegenstaende-verwalten':['Organisator','📋','Behalte verliehene Gegenstände im Blick.']
};
const route=decodeURI(location.pathname).split('/').filter(Boolean);
const tool=route.includes('tools')?route[route.indexOf('tools')+1]:'home';
const [name,prop,greeting]=contexts[tool]||['Alltagsbegleiter','🔧','Was möchtest du heute erledigen?'];
const read=()=>{try{const p=JSON.parse(localStorage.getItem(key)||'{}');return p&&typeof p==='object'?p:{}}catch{return {}}};
let buddy;
function apply(){const p=read();buddy.setCharacter(['turquoise','purple'].includes(p.character)?p.character:'turquoise');buddy.setMotion(['off','calm','normal','lively'].includes(p.motion)?p.motion:'normal');buddy.setQuiet(p.quiet===true);buddy.setTips(p.tips!==false);buddy.setHidden(p.hidden===true);refreshDonations()}
function persist(){try{localStorage.setItem(key,JSON.stringify({character:buddy.character,motion:buddy.motion,quiet:buddy.quiet,tips:buddy.tips,hidden:buddy.hidden}))}catch{}refreshDonations()}
const donationLines=['Ein Käffchen für meinen Werkzeugkasten? ☕','Meine flauschigen Ohren arbeiten heute Überstunden!','Ich werde nicht mit Keksen bezahlt. Skandal!','Ein kleiner Kaffee und ich hüpfe vor Freude!','Meine Schraubenschlüssel brauchen dringend Koffein!','Unterstützt du uns? Ich wedle auch extra mit dem Schwanz!','Pssst … mein Sparschwein ist noch ziemlich hungrig!','Ich arbeite für Applaus. Aber Kaffee wäre auch toll!','Ein Kaffee für die Menschen hinter Toolya? Ich sage Danke!','Mit einem Käffchen machst du dieses Flauschwesen glücklich!'];
let donationIndex;try{donationIndex=Number(sessionStorage.getItem('toolya-donation-variant')||0);if(!Number.isSafeInteger(donationIndex))donationIndex=0;sessionStorage.setItem('toolya-donation-variant',String((donationIndex+1)%donationLines.length))}catch{donationIndex=0}
function refreshDonations(){if(!buddy)return;for(const a of document.querySelectorAll('a[href="https://ko-fi.com/duhrrom"]')){
 if(a.dataset.toolyaDonation){const image=a.querySelector('img');if(image)image.src=assets+'toolya_wishlist_'+buddy.character+'_welcome_1024.png';continue}
 // Keep legal prose inline; replace only actual calls to action.
 if(!/kaffee|spend|unterstütz/i.test(a.textContent)&&!a.className.includes('kofi'))continue;
 a.dataset.toolyaDonation='true';a.classList.add('toolya-donation');a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Toolya freiwillig auf Ko-fi unterstützen (neuer Tab)');
 const img=document.createElement('img');img.src=assets+'toolya_wishlist_'+buddy.character+'_welcome_1024.png';img.alt='';img.loading='lazy';img.width=64;img.height=64;img.onerror=()=>{img.hidden=true};
 const text=document.createElement('span');text.textContent=tool==='digitaler-nachlass'||tool==='haustier-gesundheitspass'?'Die Menschen hinter Toolya freiwillig unterstützen':donationLines[donationIndex%donationLines.length];
 const small=document.createElement('small');small.textContent='Freiwillig unterstützen · Ko-fi (neuer Tab)';text.append(document.createElement('br'),small);a.replaceChildren(img,text);
 }}
function mountPreferences(){if(tool==='wishlist')return;
 const details=document.createElement('details');details.className='toolya-settings';const summary=document.createElement('summary');summary.textContent='Toolya-Begleiter einstellen';details.append(summary);
 const panel=document.createElement('div');panel.className='tb-preferences';
 function select(label,values,current,change){const l=document.createElement('label');l.textContent=label;const control=document.createElement('select');for(const [value,text] of values){const o=document.createElement('option');o.value=value;o.textContent=text;control.append(o)}control.value=current;control.onchange=()=>{change(control.value);persist()};l.append(control);panel.append(l)}
 select('Begleiter',[['turquoise','Türkis'],['purple','Lila']],buddy.character,v=>buddy.setCharacter(v));
 select('Animation',[['off','Aus'],['calm','Ruhig'],['normal','Normal'],['lively','Lebhaft']],buddy.motion,v=>buddy.setMotion(v));
 for(const [label,property,method] of [['Ruhemodus','quiet','setQuiet'],['Tipps anzeigen','tips','setTips'],['Begleiter ausblenden','hidden','setHidden']]){const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.checked=buddy[property];c.onchange=()=>{buddy[method](c.checked);persist()};l.append(c,document.createTextNode(label));panel.append(l)}
 details.append(panel);buddy.host.before(details);
}
function start(instance){if(buddy)return;buddy=instance;window.toolyaBuddy=buddy;buddy.host.dataset.tool=tool;buddy.host.setAttribute('aria-label','Toolya · '+name);
 const badge=document.createElement('span');badge.className='toolya-context';badge.textContent=prop+' '+name;badge.setAttribute('aria-hidden','true');buddy.host.prepend(badge);
 apply();mountPreferences();refreshDonations();new MutationObserver(refreshDonations).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('storage',e=>{if(e.key===key||e.key===null)apply()});
 // Tools can publish confirmed outcomes; do not infer success from clicks or submissions.
 window.addEventListener('toolya:notice',e=>{const d=e.detail;if(d&&typeof d.message==='string')buddy.show(d.type,d.message)});
 document.addEventListener('invalid',e=>{if(e.target.validationMessage)buddy.show('form-error',e.target.validationMessage)},true);
 if(tool!=='wishlist'){let seen=false;try{seen=sessionStorage.getItem('toolya-welcome:'+tool)==='1';sessionStorage.setItem('toolya-welcome:'+tool,'1')}catch{seen=true}if(!seen)buddy.show('welcome',greeting)}
}
if(tool==='wishlist'){if(window.toolyaBuddy)start(window.toolyaBuddy);else window.addEventListener('toolya:ready',()=>start(window.toolyaBuddy),{once:true})}
else start(new ToolyaBuddy({root:document.querySelector('main')||document.body,assetBase:assets}));
