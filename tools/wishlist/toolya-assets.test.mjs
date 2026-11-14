import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const here=new URL('./',import.meta.url);
test('Toolya image base matches actual wishlist directory',()=>{
 const app=readFileSync(new URL('app.mjs',here),'utf8');
 const buddy=readFileSync(new URL('toolya-buddy.mjs',here),'utf8');
 const browser=readFileSync(new URL('toolya-buddy-browser-test.html',here),'utf8');
 assert.match(app,/assetBase:'\.\/'/);
 assert.match(buddy,/assetBase='\.\/'/);
 assert.match(browser,/assetBase:'\.\/'/);
 for(const character of ['turquoise','purple'])for(const pose of ['welcome','success','tip','error']){
  const filename='toolya_wishlist_'+character+'_'+pose+'_1024.png';
  const file=new URL(filename,here);
  assert.ok(statSync(file).size>100_000,filename+' must be a nonempty original PNG');
  assert.equal(readFileSync(file).subarray(0,8).toString('hex'),'89504e470d0a1a0a',filename+' PNG signature');
 }
});
