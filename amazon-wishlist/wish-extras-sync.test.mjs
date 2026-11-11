import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWishExtras,planWishExtrasImport} from './wish-extras-sync.mjs';

test('normalizes valid extras without side effects',()=>{
 assert.deepEqual(normalizeWishExtras({imageUrl:' https://example.org/a.jpg ',price:'12.50',quantity:'2',status:'planned'}),{imageUrl:'https://example.org/a.jpg',price:12.5,quantity:2,status:'planned'});
});
test('rejects unsafe or malformed values',()=>{
 for(const data of [{imageUrl:'http://example.org/a.jpg'},{price:-1},{quantity:0},{status:'unknown'},{price:Infinity}])assert.equal(normalizeWishExtras(data),null);
});
test('imports only owned wishes and preserves existing remote values',()=>{
 const local={'1':{price:12},'2':{price:20},'3':{price:30},'4':{price:-3}};
 const remote={'2':{price:99}};
 const result=planWishExtrasImport(local,remote,['1','2','4']);
 assert.deepEqual(result.toCreate,{'1':{imageUrl:'',price:12,quantity:1,status:'open'}});
 assert.deepEqual(result.conflicts,['2']);
 assert.deepEqual(result.invalid,['4']);
 assert.equal(remote['2'].price,99);
});
