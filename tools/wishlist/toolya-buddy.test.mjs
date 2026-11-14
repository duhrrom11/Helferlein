// Ausführen: node --test tools/wishlist/toolya-buddy.test.mjs
// Kein Browser, Netzwerk, Supabase-Zugang oder produktive Daten erforderlich.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ToolyaBuddy} from './toolya-buddy.mjs';

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.parent=null;this.attrs={};this.hidden=false;this.isConnected=true;this.textContent='';this.className='';}
 set innerHTML(html){this.children=[];if(html.includes('tb-message-box')){const box=new Element();box.className='tb-message-box';box.hidden=true;const img=new Element('img');img.className='tb-avatar';const title=new Element('strong');title.className='tb-title';const body=new Element('p');body.className='tb-body';const close=new Element('button');close.className='tb-close';const txt=new Element();txt.className='tb-text';txt.append(title,body,close);box.append(img,txt);this.append(box)}}
 append(...items){for(const item of items){this.children.push(item);item.parent=this}}
 *walk(){for(const child of this.children){yield child;yield* child.walk()}}
 querySelector(selector){return [...this.walk()].find(x=>x.className.split(' ').includes(selector.slice(1)))||null}
 setAttribute(name,value){this.attrs[name]=value}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);this.isConnected=false}
 focus(){document.activeElement=this}
}
const listeners=new Map();
globalThis.document={body:new Element('body'),activeElement:null,createElement:tag=>new Element(tag),addEventListener:(type,fn)=>listeners.set(type,[...(listeners.get(type)||[]),fn]),removeEventListener:(type,fn)=>listeners.set(type,(listeners.get(type)||[]).filter(x=>x!==fn))};
function press(key,shiftKey=false){let prevented=false;const event={key,shiftKey,preventDefault(){prevented=true},stopPropagation(){}};for(const fn of [...(listeners.get('keydown')||[])])fn(event);return prevented}
const buddy=new ToolyaBuddy({root:document.body});
test('Komponente wird eingebunden',()=>assert.ok(document.body.querySelector('.toolya-buddy')));
test('Warnung hat Vorrang vor Erfolg',()=>{buddy.show('warning','Kritisch');buddy.show('success','Später');assert.equal(buddy.current.type,'warning')});
test('Warteschlange liefert nächste Meldung',()=>{buddy.dismiss();assert.equal(buddy.current.type,'success')});
test('Ruhemodus überspringt optionale Meldungen',()=>{buddy.show('warning','Kritisch');buddy.show('tip','Optional');buddy.show('warning','Noch kritisch');buddy.setQuiet(true);buddy.dismiss();assert.equal(buddy.current.type,'warning')});
test('Ruhemodus unterdrückt neue optionale Meldungen',()=>assert.equal(buddy.show('tip','Still'),false));
test('Warnung bleibt auch im Ruhemodus sichtbar',()=>{buddy.show('error','Fehler');assert.equal(buddy.current.type,'warning');buddy.dismiss();assert.equal(buddy.current.type,'error')});
test('Gleichzeitige Bestätigung wird sicher abgebrochen',async()=>{const first=buddy.confirm({message:'Erste Frage'});assert.equal(await buddy.confirm({message:'Zweite Frage'}),false);assert.equal(buddy.dialogs.length,1);assert.equal(press('Escape'),true);assert.equal(await first,false)});
test('Escape entfernt Sicherheitsdialog',()=>assert.equal(buddy.dialogs.length,0));
test('Bestätigen liefert true',async()=>{const promise=buddy.confirm({message:'Ja'});buddy.dialogs[0].img.parent.children.at(-1).onclick();assert.equal(await promise,true)});
test('Abbrechen liefert false',async()=>{const promise=buddy.confirm({message:'Nein'});buddy.dialogs[0].img.parent.children.at(-2).onclick();assert.equal(await promise,false)});
test('Charakterwechsel funktioniert',()=>{buddy.setCharacter('purple');assert.equal(buddy.character,'purple')});
test('Ungültiger Charakter wird abgelehnt',()=>assert.throws(()=>buddy.setCharacter('invalid'),/Ungültiger Charakter/));

test('Animation verwendet die passende Originalpose',()=>{
 const animated=new ToolyaBuddy({root:document.body,character:'purple'});animated.show('welcome','Hallo');
 assert.equal(animated.host.attrs['data-pose'],'welcome');
 animated.show('success','Erledigt');
 assert.equal(animated.host.attrs['data-pose'],'success');
 animated.show('tip','Hinweis');
 assert.equal(animated.host.attrs['data-pose'],'tip');
 animated.show('error','Fehler');
 assert.equal(animated.host.attrs['data-pose'],'error');
 assert.equal(animated.host.querySelector('.tb-avatar').src,'./toolya_wishlist_purple_error_1024.png');
 animated.destroy();
});
test('Ruhemodus deaktiviert Bewegungen, nicht Fehlermeldungen',()=>{
 buddy.setQuiet(true);
 assert.equal(buddy.host.attrs['data-motion'],'off');
 assert.equal(buddy.show('welcome','Leise'),false);
 assert.equal(buddy.show('error','Wichtig'),true);
 buddy.setQuiet(false);
 assert.equal(buddy.host.attrs['data-motion'],'on');
});

test('v5: kritische Meldung unterbricht optionalen Hinweis und stellt ihn danach wieder her',()=>{
 const b=new ToolyaBuddy({root:document.body});
 try{b.show('tip','Hinweis');b.show('error','Wichtig');assert.equal(b.current.type,'error');b.dismiss();assert.equal(b.current.type,'tip');}finally{b.destroy()}
});
test('v5: gleiche Meldung wird nicht mehrfach eingereiht',()=>{
 const b=new ToolyaBuddy({root:document.body});
 try{b.show('warning','Kritisch');b.show('tip','Einmal');b.show('tip','Einmal');assert.equal(b.queue.length,1);b.show('warning','Kritisch');assert.equal(b.queue.length,1);}finally{b.destroy()}
});
test('v5: wichtige Warteschlangenmeldungen gehen optionalen vor',()=>{
 const b=new ToolyaBuddy({root:document.body});
 try{b.show('error','Eins');b.show('tip','Optional');b.show('warning','Zwei');b.dismiss();assert.equal(b.current.type,'warning');b.dismiss();assert.equal(b.current.type,'tip');}finally{b.destroy()}
});
test('v5: Ruhemodus entfernt optionale Warteschlangeneinträge',()=>{
 const b=new ToolyaBuddy({root:document.body});
 try{b.show('error','Wichtig');b.show('tip','Optional');b.setQuiet(true);assert.equal(b.queue.length,0);assert.equal(b.current.type,'error');}finally{b.destroy()}
});
test('v5: nach destroy werden Meldungen abgelehnt',()=>{
 const b=new ToolyaBuddy({root:document.body});b.destroy();assert.equal(b.show('error','Nicht mehr anzeigen'),false);
});
test('Zerstören entfernt Komponente',()=>{buddy.destroy();assert.equal(document.body.querySelector('.toolya-buddy'),null)});
