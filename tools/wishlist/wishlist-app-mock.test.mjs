// Run: node --experimental-vm-modules --test tools/wishlist/wishlist-app-mock.test.mjs
// Isolated VM: no network, real credentials, production writes or browser required.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';

class Element {
 constructor(id=''){this.id=id;this.children=[];this.dataset={};this.style={};this.attrs={};this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.className='';this.classList={add(){},remove(){},toggle(){},contains(){return false}};this.isConnected=true;}
 append(...nodes){this.children.push(...nodes);for(const n of nodes)if(n&&typeof n==='object')n.parent=this}
 appendChild(node){this.append(node);return node}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 setAttribute(k,v){this.attrs[k]=v}
 removeAttribute(k){delete this.attrs[k]}
 getAttribute(k){return this.attrs[k]??null}
 addEventListener(){}
 removeEventListener(){}
 querySelector(){return new Element()}
 querySelectorAll(){return []}
 focus(){}
 scrollIntoView(){}
 get childElementCount(){return this.children.length}
 set innerHTML(v){this.textContent=v}
 get innerHTML(){return this.textContent}
}
const elements=new Map();
const el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id)};
function createMockDb(){
 const calls=[];let user=null;let nextId=1;
 const tables={wishlist_profiles:[{user_id:'mock-user',handle:'mockuser',display_name:'Mock User',bio:''}],wishlist_products:[],wishlist_wishes:[]};
 const query=(table)=>{
  let op='select',payload=null,filters=[],limit=null;
  const q={
   select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},in(k,v){filters.push([k,v]);return q},order(){return q},range(a,b){limit=[a,b];return q},limit(){return q},
   maybeSingle(){return Promise.resolve(run(true))},single(){return Promise.resolve(run(true))},
   insert(v){op='insert';payload=v;return q},update(v){op='update';payload=v;return q},upsert(v){op='upsert';payload=v;return q},delete(){op='delete';return q},
   then(resolve,reject){return Promise.resolve(run(false)).then(resolve,reject)}
  };
  function run(single){calls.push({table,op,payload,filters});let rows=tables[table]||[];
   if(op==='insert'){const row={id:'mock-'+nextId++,...payload};rows.push(row);tables[table]=rows;return {data:single?row:[row],error:null}}
   if(op==='update'){const matching=rows.filter(r=>filters.every(([k,v])=>Array.isArray(v)?v.includes(r[k]):r[k]===v));for(const row of matching)Object.assign(row,payload);return {data:single?matching[0]||null:matching,error:null}}
   const filtered=rows.filter(r=>filters.every(([k,v])=>Array.isArray(v)?v.includes(r[k]):r[k]===v));
   const selected=limit?filtered.slice(limit[0],limit[1]+1):filtered;
   return {data:single?selected[0]||null:selected,error:null};
  }
  return q;
 };
 const auth={getUser:async()=>({data:{user},error:null}),signInWithPassword:async()=>{user={id:'mock-user'};return {data:{user},error:null}},signOut:async()=>{user=null;return {error:null}},signUp:async()=>({error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})};
 return {db:{auth,from:query},tables,calls};
}
test('App-Initialisierung und Anmeldung mit isoliertem Supabase-Mock',async()=>{
 const {db,calls}=createMockDb();
 const body=new Element('body');
 const document={body,getElementById:el,querySelector:s=>s==='main'?body:new Element(),createElement:tag=>new Element(tag),addEventListener(){},removeEventListener(){}};
 const store=new Map();
 const location={href:'https://example.invalid/tools/wishlist/',search:''};
 const context=createContext({document,window:{supabase:{createClient:()=>db},location,history:{replaceState(){}}},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},URL,URLSearchParams,Intl,Number,String,Set,Map,JSON,Math,Error,TypeError,Promise,console,setTimeout,clearTimeout});
 const appCode=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
 const app=new SourceTextModule(appCode,{context,identifier:'app.mjs'});
 const stubValues={
  mountListsDashboard:()=>({refresh:async()=>{},selectedList:()=>null,assignWish:async()=>{}}),
  ToolyaBuddy:class{show(){} confirm(){return Promise.resolve(false)}},
  wishSaveOutcome:({editing=false,extrasSaved,assignmentError=false})=>({type:extrasSaved&&!assignmentError?'success':'warning',message:editing?'Wunsch aktualisiert.':'Wunsch gespeichert'}),
  parseAmazonUrl:()=>({marketplace:'amazon.de',asin:'B012345678'}),
  validateWishFields:()=>({title:'Mock-Wunsch',note:''}),
  validatePriority:()=>1,validateCredentials:()=>({email:'mock@example.invalid',password:'not-real'}),
  requestedProfileHandle:()=>null,sharedAmazonProductUrl:()=>null,
  shouldRestoreSharedProductUrl:()=>false,isFeedRequestStale:()=>false,
  feedPage:rows=>({items:rows||[],hasMore:false}),
  wishlistErrorMessage:e=>e?.message||String(e)
 };
 await app.link(async specifier=>{
  const source=readFileSync(new URL(specifier,new URL('./app.mjs',import.meta.url)),'utf8');
  const names=[...source.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let|var)\s+(\w+)/g)].map(x=>x[1]);
  // The mock intentionally replaces imported collaborators, not app.mjs itself.
  const requested=[...appCode.matchAll(new RegExp('import\\s*\\{([^}]+)\\}\\s*from\\s*[\\x27\\x22]'+specifier.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\x27\\x22]','g'))].flatMap(x=>x[1].split(',').map(v=>v.trim()));
  const exports=[...new Set([...names,...requested])];
  return new SyntheticModule(exports,function(){for(const name of exports)this.setExport(name,stubValues[name]??(()=>null))},{context});
 });
 await app.evaluate();
 assert.equal(el('wishlistAuthStatus').textContent,'◯ Nicht angemeldet');
 assert.equal(typeof el('signin').onclick,'function');
 el('email').value='mock@example.invalid';el('password').value='not-real';
 await el('signin').onclick();
 assert.equal(el('wishlistAuthStatus').textContent,'● Angemeldet');
 assert.ok(calls.every(c=>!c.table.startsWith('production_')));
});
