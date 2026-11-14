import test from 'node:test';
import assert from 'node:assert/strict';
import {mountAmazonWishlistScraperImport} from '../amazon-wishlist/amazon-wishlist-scraper-import.mjs';
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.style={};this.dataset={};this.checked=false;this.hidden=false;this.value='';this.textContent='';this.disabled=false;}
 append(...children){this.children.push(...children);}
 after(child){this.inserted=child;}
 remove(){}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(){}
 addEventListener(type,fn){this.listeners[type]=fn;}
 async click(){await this.listeners.click?.();}
 querySelectorAll(selector){const found=[];const walk=(node)=>{for(const c of node.children){if(selector==='input[data-asin]:checked'&&c.tagName==='input'&&c.dataset.asin&&c.checked)found.push(c);if(c.children)walk(c);}};walk(this);return found;}
}
const traverse=(root,fn)=>{if(fn(root))return root;for(const c of root.children||[]){const found=traverse(c,fn);if(found)return found;}return null;};
test('real importer DOM flow: login gate, preview without write, consent, atomic RPC, refresh',async()=>{
 const editor=new Element('section');let user=null,refreshes=0,writes=[],requests=[];
 const original={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch};
 globalThis.document={getElementById:id=>id==='editor'?editor:null,createElement:tag=>new Element(tag),createTextNode:s=>({textContent:s})};
 globalThis.window={__HELFERLEIN_AMAZON_PREVIEW_PATH__:'/api/amazon-wishlist-preview',location:{origin:'https://duhrrom11.github.io'},confirm:()=>true};
 globalThis.fetch=async(url,opts)=>{requests.push({url,opts});return new Response(JSON.stringify({products:[{asin:'B012345678',marketplace:'amazon.de',title:'Lokales Testprodukt'}]}),{headers:{'content-type':'application/json'}});};
 const chain={select(){return this},eq(){return this},order(){return this},async range(){return {data:[],error:null}}};
 const db={auth:{getSession:async()=>({data:{session:{access_token:'isolated.jwt.token'}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>chain,rpc:async(name,args)=>{writes.push({name,args});return {data:{inserted:1,skipped:0},error:null}}};
 try{
  const mounted=mountAmazonWishlistScraperImport({db,getUser:()=>user,onImported:async()=>{refreshes++;}});
  const section=editor.inserted;assert.equal(section.hidden,true);
  user={id:'isolated-user'};section.hidden=false;
  const input=traverse(section,x=>x.id==='amazonScraperUrl');input.value='https://www.amazon.de/hz/wishlist/ls/EXAMPLE';
  const preview=traverse(section,x=>x.textContent==='Liste prüfen (noch nichts speichern)');await preview.click();
  assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/amazon-wishlist-preview');assert.equal(writes.length,0);
  const confirm=traverse(section,x=>x.textContent==='Ausgewählte Wünsche importieren');await confirm.click();assert.equal(writes.length,0);
  const consent=traverse(section,x=>x.tagName==='input'&&x.type==='checkbox'&&!x.dataset.asin);assert.ok(consent);consent.checked=true;
  await confirm.click();assert.equal(writes.length,1);assert.equal(writes[0].name,'wishlist_import_amazon_batch');assert.deepEqual(writes[0].args.p_items,[{asin:'B012345678',title:'Lokales Testprodukt'}]);assert.equal(refreshes,1);
  mounted.dispose();
 }finally{Object.assign(globalThis,original);}
});
