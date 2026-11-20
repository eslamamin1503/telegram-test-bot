import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const src=readFileSync(new URL('./bot-worker.js', import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const calls=[];const waits=[];
globalThis.fetch=async(url,opt)=>{calls.push({url,payload:JSON.parse(opt?.body||'{}')});if(url.includes('googleapis'))return Response.json({candidates:[{content:{parts:[{text:'إجابة توعوية تجريبية'}]}}]});return Response.json({ok:true,result:{message_id:10}})};
const env={BOT_TOKEN:'not-a-real-token',GEMINI_API_KEY:'not-a-real-key'};
const secret=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('telegram-webhook:'+env.BOT_TOKEN))).toString('hex');
async function send(update){const r=await worker.fetch(new Request('https://unit.test/',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify(update)}),env,{waitUntil:p=>waits.push(p)});await Promise.all(waits.splice(0));return r}
assert.equal((await worker.fetch(new Request('https://unit.test/',{method:'POST',body:'{}'}),env,{})).status,403);
await send({message:{chat:{id:1,type:'private'},text:'/start'}});
assert.equal(calls.at(-1).payload.reply_markup.inline_keyboard.length,4);
assert.ok(calls.at(-1).payload.text.includes('بيانات صحية شخصية'));
for(const disease of ['diabetes','pressure','anemia','asthma']){
 await send({callback_query:{id:'test',message:{chat:{id:1}},data:'d:'+disease}});
 assert.equal(calls.at(-1).payload.reply_markup.inline_keyboard.filter(row=>row[0].callback_data.startsWith("q:")).length,5);
 for(let n=0;n<20;n++){
  await send({callback_query:{id:'test',message:{chat:{id:1}},data:`q:${disease}:${n}`}});
  assert.ok(calls.at(-1).payload.text.includes('مش بديل'));
 }
}
for (const disease of ['diabetes','pressure','anemia','asthma']) {
 const seen=[];
 for(let page=0;page<4;page++) {
  await send({callback_query:{id:'page',message:{chat:{id:1}},data:`p:${disease}:${page}`}});
  const qs=calls.at(-1).payload.reply_markup.inline_keyboard.flat().filter(b=>b.callback_data.startsWith('q:'));
  assert.equal(qs.length,5);seen.push(...qs.map(q=>q.callback_data));
 }
 assert.equal(new Set(seen).size,20);
}
await send({callback_query:{id:'home',message:{chat:{id:1}},data:'home'}});
assert.equal(calls.at(-1).payload.reply_markup.inline_keyboard.length,4);
await send({message:{chat:{id:1,type:'private'},text:'إيه فوائد المشي؟'}});
assert.ok(calls.some(c=>c.payload.text?.includes('إجابة توعوية')));
console.log('PASS: webhook auth, 4 diseases, 80 answers, privacy notice, AI reply path');
let fallbackUsed=false;
env.AI={run:async()=>{fallbackUsed=true;return {response:'رد احتياطي للتوعية'}}};
globalThis.fetch=async(url,opt)=>{calls.push({url,payload:JSON.parse(opt?.body||'{}')});if(url.includes('googleapis'))return Response.json({error:'quota limit'},{status:429});return Response.json({ok:true,result:{message_id:11}})};
await send({message:{chat:{id:2,type:'private'},text:'سؤال عن الصحة العامة'}});
assert.equal(fallbackUsed,true);
assert.ok(calls.some(c=>c.payload.text?.includes('رد احتياطي')));
console.log('PASS: primary-provider 429 correctly falls back to independent provider');
