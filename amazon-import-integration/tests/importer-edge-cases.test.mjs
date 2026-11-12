import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAmazonWishlistScraperImport} from '../amazon-wishlist/amazon-wishlist-scraper-import.mjs';
class E {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.style={};this.dataset={};this.checked=false;this.hidden=false;this.value='';this.textContent='';this.disabled=false;}
 append(...children){this.children.push(...children)} after(child){this.inserted=child} remove(){} replaceChildren(...children){this.children=children} setAttribute(){} addEventListener(type,fn){this.listeners[type]=fn} async click(){return this.listeners.click?.()}
 querySelectorAll(selector){const out=[];const walk=x=>{for(const c of x.children||[]){if(selector==='input[data-asin]:checked'&&c.tagName==='input'&&c.dataset.asin&&c.checked)out.push(c);walk(c)}};walk(this);return out}
}
const find=(x,p)=>p(x)?x:(x.children||[]).map(c=>find(c,p)).find(Boolean);
const product=(asin,title='Lokales Produkt')=>({asin,title,marketplace:'amazon.de'});
async function fixture({products=[product('B012345678')],existing=[],status=200,responseError=null,rpcResult={data:{inserted:1,skipped:0},error:null},deferred=false}={}){
 const old={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};
 const editor=new E('section');let user={id:'user-A'},authHandler,refreshes=0,writes=[],calls=0,resolveFetch;
 globalThis.document={getElementById:id=>id==='editor'?editor:null,createElement:tag=>new E(tag),createTextNode:text=>({textContent:text})};
 globalThis.window={__HELFERLEIN_AMAZON_PREVIEW_PATH__:'/api/amazon-wishlist-preview',location:{origin:'https://duhrrom11.github.io'},confirm:()=>true};
 globalThis.fetch=async()=>{calls++;if(deferred)await new Promise(resolve=>resolveFetch=resolve);return new Response(JSON.stringify(responseError?{error:responseError}:{products}),{status,headers:{'content-type':'application/json'}})};
 const chain={select(){return this},eq(){return this},order(){return this},async range(){return {data:existing.map(asin=>({wishlist_products:{asin,marketplace:'amazon.de'}})),error:null}}};
 const db={auth:{getSession:async()=>({data:{session:{access_token:'isolated.jwt.token'}},error:null}),onAuthStateChange:fn=>{authHandler=fn;return {data:{subscription:{unsubscribe(){}}}}}},from:()=>chain,rpc:async(name,args)=>{writes.push({name,args});return rpcResult}};
 const mounted=mountAmazonWishlistScraperImport({db,getUser:()=>user,onImported:async()=>{refreshes++}});const section=editor.inserted;
 const input=find(section,x=>x.id==='amazonScraperUrl');input.value='https://www.amazon.de/hz/wishlist/ls/EXAMPLE';
 const preview=find(section,x=>x.textContent==='Liste prüfen (noch nichts speichern)');const confirm={click:async()=>find(section,x=>x.textContent==='Ausgewählte Wünsche importieren')?.click()};
 return {section,input,preview,confirm, get writes(){return writes},get calls(){return calls},get refreshes(){return refreshes},auth:(next)=>{user=next;authHandler(next?'SIGNED_IN':'SIGNED_OUT')},release:()=>resolveFetch?.(),close(){mounted.dispose();Object.assign(globalThis,old)}};
}
test('rejected preview never enables confirmation or calls import RPC',async()=>{const f=await fixture({status:429,responseError:'Quota überschritten'});try{await f.preview.click();assert.match(find(f.section,x=>x.tagName==='p'&&x.textContent.includes('Quota'))?.textContent||'',/Quota/);await f.confirm.click();assert.equal(f.writes.length,0)}finally{f.close()}});
test('known and repeated ASINs are filtered before RPC',async()=>{const f=await fixture({products:[product('B012345678'),product('B012345678'),product('B098765432')],existing:['B012345678']});try{await f.preview.click();const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);consent.checked=true;await f.confirm.click();assert.equal(f.writes.length,1);assert.deepEqual(f.writes[0].args.p_items,[{asin:'B098765432',title:'Lokales Produkt'}])}finally{f.close()}});
test('session switch invalidates pending preview and blocks writes',async()=>{const f=await fixture({deferred:true});try{const request=f.preview.click();await new Promise(resolve=>setImmediate(resolve));f.auth({id:'user-B'});f.release();await request;await f.confirm.click();assert.equal(f.writes.length,0);assert.equal(f.section.hidden,false)}finally{f.close()}});
test('ambiguous RPC response cannot trigger refresh or blind retry',async()=>{const f=await fixture({rpcResult:{data:{inserted:2,skipped:0},error:null}});try{await f.preview.click();find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin).checked=true;await f.confirm.click();assert.equal(f.writes.length,1);assert.equal(f.refreshes,0);assert.match(find(f.section,x=>x.tagName==='p'&&x.textContent.includes('Importstatus'))?.textContent||'',/Importstatus unklar/);await f.confirm.click();assert.equal(f.writes.length,1)}finally{f.close()}});

test('malformed product entries do not prevent importing valid products',async()=>{const f=await fixture({products:[null,42,product('B012345678'),{asin:null,title:'broken',marketplace:'amazon.de'}]});try{await f.preview.click();const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);assert.ok(consent,'valid product must still be previewed');consent.checked=true;await f.confirm.click();assert.deepEqual(f.writes[0]?.args.p_items,[{asin:'B012345678',title:'Lokales Produkt'}]);}finally{f.close()}});

test('preview accepts 250 Unicode code points including emoji, matching PostgreSQL char_length',async()=>{
 const title='A'.repeat(249)+'😀';
 const f=await fixture({products:[product('B012345678',title)]});
 try{
  await f.preview.click();
  const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);
  assert.ok(consent,'250-code-point title should be importable');
  consent.checked=true;
  await f.confirm.click();
  assert.deepEqual(f.writes[0]?.args.p_items,[{asin:'B012345678',title}]);
 }finally{f.close()}
});

test('non-string ASIN is rejected before RPC even when regex coercion would match',async()=>{const f=await fixture({products:[product(['B012345678']),product('B098765432')]});try{await f.preview.click();const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);assert.ok(consent);consent.checked=true;await f.confirm.click();assert.deepEqual(f.writes[0]?.args.p_items,[{asin:'B098765432',title:'Lokales Produkt'}]);}finally{f.close()}});


test('preview normalizes ASCII edge spaces before the PostgreSQL 250-character limit',async()=>{
 const title=' '+('A'.repeat(250))+' ';
 const f=await fixture({products:[product('B012345678',title)]});
 try{await f.preview.click();const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);assert.ok(consent,'title valid after SQL btrim must be accepted');consent.checked=true;await f.confirm.click();assert.deepEqual(f.writes[0]?.args.p_items,[{asin:'B012345678',title:'A'.repeat(250)}]);}finally{f.close()}
});

test('NUL in product title is rejected before JSON RPC serialization',async()=>{
 const f=await fixture({products:[product('B012345678','Broken\u0000title'),product('B098765432','Valid title')]});
 try{await f.preview.click();const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);assert.ok(consent);consent.checked=true;await f.confirm.click();assert.deepEqual(f.writes[0]?.args.p_items,[{asin:'B098765432',title:'Valid title'}]);}finally{f.close()}
});

test('unpaired UTF-16 surrogate is rejected before PostgreSQL jsonb RPC',async()=>{const f=await fixture({products:[product('B012345678','Broken\uD800title'),product('B098765432','Valid 😀 title')]});try{await f.preview.click();const consent=find(f.section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);assert.ok(consent);consent.checked=true;await f.confirm.click();assert.deepEqual(f.writes[0]?.args.p_items,[{asin:'B098765432',title:'Valid 😀 title'}])}finally{f.close()}});
