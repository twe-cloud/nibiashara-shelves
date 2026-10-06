import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Shelves,ShelfError} from './index.js';
test('catalog is the price source; updates come from supplied HTTP reader',async()=>{
 let price=0.01;const client=new Shelves({fetch:async()=>new Response(JSON.stringify({catalog:[{id:'fx-official',price_usd:price}]}))});
 assert.equal((await client.catalog()).catalog[0].price_usd,0.01);price=0.05;assert.equal((await client.catalog()).catalog[0].price_usd,0.05);
});
test('free helpers use only named routes, no wallet claim/header or paid query',async()=>{
 const paths=[];const client=new Shelves({origin:'https://fixture.invalid',fetch:async(u,init)=>{paths.push(new URL(u).pathname);assert.deepEqual(init.headers,{accept:'application/json'});return new Response('{}');}});
 await client.hello();await client.freeFx();await client.catalogPolicy();await client.stats();assert.deepEqual(paths,['/hello','/free/fx','/catalog-policy','/stats']);
});
test('unavailable/free quota and malformed reads are explicit errors',async()=>{
 for(const res of [new Response('{"error":"quota_unavailable"}',{status:503}),new Response('not json')]){
  const client=new Shelves({fetch:async()=>res});await assert.rejects(client.freeFx(),ShelfError);
 }
});
test('pass remaining reads actual server credit field without price assumption',async()=>{
 const client=new Shelves({pass:'synthetic-not-a-real-token',fetch:async()=>new Response('{"sku":"fx-official","pass_credits_remaining":7,"delivery":{"rate":130}}')});
 assert.deepEqual(await client.fxOfficial({pair:'USD-KES'}),{rate:130});assert.equal(client.lastCreditsRemaining,7);
});

test('creditsRemaining consumes actual free pass-status field',async()=>{
 const client=new Shelves({pass:'synthetic-test',fetch:async()=>new Response('{"credits_remaining":6}')});assert.equal(await client.creditsRemaining(),6);
});
