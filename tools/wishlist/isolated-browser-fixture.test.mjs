import test from 'node:test';
import assert from 'node:assert/strict';
import {loadIsolatedWishesPage} from './isolated-browser-fixture.mjs';

function mockPage(){
 let handler,visited;
 return {
  page:{
   async route(pattern,callback){assert.equal(pattern,'**/*');handler=callback},
   async goto(url){visited=url}
  },
  get visited(){return visited},
  async request(url){
   const calls=[];
   await handler({
    request:()=>({url:()=>url}),
    fulfill:async opts=>{calls.push({type:'fulfill',opts})},
    abort:async()=>{calls.push({type:'abort'})}
   });
   assert.equal(calls.length,1);
   return calls[0];
  }
 };
}

test('HTML fixture is served unchanged with CSP blocking all scripts in UI tests',async()=>{
 const fake=mockPage();
 await loadIsolatedWishesPage(fake.page);
 assert.equal(fake.visited,'https://wishes.test/index.html');
 const response=await fake.request(fake.visited);
 assert.equal(response.type,'fulfill');
 assert.match(response.opts.body,/<script\b/i);
 assert.match(response.opts.headers['Content-Security-Policy'],/script-src 'none'/);
 assert.match(response.opts.headers['Content-Security-Policy'],/connect-src 'none'/);
 assert.equal((await fake.request('https://wishes.test/app.mjs')).type,'abort');
 assert.equal((await fake.request('https://cdn.jsdelivr.net/unsafe.js')).type,'abort');
});

test('dashboard isolation only allows three local ES modules and blocks app bootstrap',async()=>{
 const fake=mockPage();
 await loadIsolatedWishesPage(fake.page,{dashboardModules:true});
 const response=await fake.request(fake.visited);
 assert.match(response.opts.headers['Content-Security-Policy'],/script-src 'self'/);
 for(const name of ['lists-dashboard.mjs','bulk-helpers.mjs','list-features.mjs']){
  const module=await fake.request('https://wishes.test/'+name);
  assert.equal(module.type,'fulfill',name);
  assert.match(module.opts.contentType,/text\/javascript/);
 }
 for(const url of ['https://wishes.test/app.mjs','https://wishes.test/anything.mjs','https://outside.invalid/lists-dashboard.mjs']){
  assert.equal((await fake.request(url)).type,'abort',url);
 }
});

test('unusual closing script tags are never regex-filtered: CSP protects raw HTML',async()=>{
 const fake=mockPage();
 const hostile='<!doctype html><script >window.hacked=true</script ><ScRiPt>window.hacked2=true</sCrIpT >';
 await loadIsolatedWishesPage(fake.page,{htmlOverride:hostile});
 const response=await fake.request(fake.visited);
 assert.equal(response.opts.body,hostile);
 assert.match(response.opts.headers['Content-Security-Policy'],/script-src 'none'/);
});
