import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSameOriginDevServer} from '../dev/same-origin-server.mjs';
import {mountAmazonWishlistScraperImport} from '../amazon-wishlist/amazon-wishlist-scraper-import.mjs';
test('realistic app document gets gateway config before app module, no disk mutation',async()=>{
 const root=mkdtempSync(join(tmpdir(),'helferlein-app-contract-'));
 mkdirSync(join(root,'amazon-wishlist'));
 const file=join(root,'amazon-wishlist/index.html');
 const html='<!doctype html><html><head><title>Helferlein</title></head><body><section id="editor"></section><script type="module" src="./app.mjs"></script></body></html>';
 writeFileSync(file,html);
 const server=createSameOriginDevServer({root});await server.listen();
 try{
  const url=`http://127.0.0.1:${server.server.address().port}/`;
  const r=await fetch(url);assert.equal(r.status,200);
  const result=await r.text();
  assert.ok(result.indexOf('window.__HELFERLEIN_AMAZON_PREVIEW_PATH__')<result.indexOf('src="./app.mjs"'));
  assert.equal(readFileSync(file,'utf8'),html);
 }finally{await server.close();rmSync(root,{recursive:true,force:true});}
});
test('importer never falls back to untrusted direct edge invoke',()=>{
 const src=readFileSync(new URL('../amazon-wishlist/amazon-wishlist-scraper-import.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/db\.functions\.invoke/);
 assert.match(src,/Sicheres HTTPS-Gateway nicht konfiguriert/);
});
