import test from 'node:test';
import assert from 'node:assert/strict';
import {copyShareLink} from './wishlist-utils.mjs';

function fakeDocument({copySucceeds=true}={}) {
 const nodes=[];
 const doc={
  body:{append(node){nodes.push(node)}},
  createElement(tag){
   assert.equal(tag,'textarea');
   return {value:'',style:{},setAttribute(){},select(){this.selected=true},remove(){nodes.splice(nodes.indexOf(this),1)}};
  },
  execCommand(command){assert.equal(command,'copy');return copySucceeds;}
 };
 return {doc,nodes};
}

test('copyShareLink uses clipboard without creating a fallback element',async()=>{
 const {doc,nodes}=fakeDocument();
 const copied=[];
 assert.equal(await copyShareLink('https://www.amazon.de/dp/B012345678',{writeText:async value=>copied.push(value)},doc),'clipboard');
 assert.deepEqual(copied,['https://www.amazon.de/dp/B012345678']);
 assert.equal(nodes.length,0);
});

test('copyShareLink falls back when clipboard rejects and removes its textarea',async()=>{
 const {doc,nodes}=fakeDocument();
 const clipboard={writeText:async()=>{throw Error('permission denied')}};
 assert.equal(await copyShareLink('https://example.org/wish',clipboard,doc),'fallback');
 assert.equal(nodes.length,0);
});

test('copyShareLink cleans up the fallback element on copy failure',async()=>{
 const {doc,nodes}=fakeDocument({copySucceeds:false});
 await assert.rejects(copyShareLink('https://example.org/wish',null,doc),/Kopieren nicht möglich/);
 assert.equal(nodes.length,0);
});

test('copyShareLink rejects unsafe and credential-bearing URLs before clipboard access',async()=>{
 const {doc,nodes}=fakeDocument();
 let calls=0;
 const clipboard={writeText:async()=>{calls++}};
 for(const value of ['http://example.org','javascript:alert(1)','https://user:pass@example.org','https://example.org@evil.test','not a URL','']) {
  await assert.rejects(copyShareLink(value,clipboard,doc),/Ungültiger Link/);
 }
 assert.equal(calls,0);
 assert.equal(nodes.length,0);
});
