import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const src=readFileSync(new URL('./bot-worker.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const dataText=src.slice(src.indexOf('const DISEASES = ')+17,src.indexOf('// per-chat selected disease')).trim().replace(/;$/,'');
const topics=JSON.parse(dataText);
assert.equal(Object.keys(topics).length,4);
assert.equal(new Set(Object.values(topics).flatMap(t=>t.qa.map(q=>q.q))).size,80);
const calls=[];
const waits=[];
const env={BOT_TOKEN:'not-a-real-token',GEMINI_API_KEY:'not-a-real-key'};
const secret=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('telegram-webhook:'+env.BOT_TOKEN))).toString('hex');
globalThis.fetch=async(url,opt)=>{
  calls.push({url,payload:JSON.parse(opt?.body||'{}')});
  if(url.includes('googleapis'))return Response.json({candidates:[{content:{parts:[{text:'إجابة توعوية تجريبية'}]}}]});
  return Response.json({ok:true,result:{message_id:10}});
};
async function send(update){
  const response=await worker.fetch(new Request('https://unit.test/',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify(update)}),env,{waitUntil:p=>waits.push(p)});
  await Promise.all(waits.splice(0));
  return response;
}
async function message(text,id=1){return send({message:{chat:{id,type:'private'},text}})}
assert.equal((await worker.fetch(new Request('https://unit.test/',{method:'POST',body:'{}'}),env,{})).status,403);
await message('/start');
assert.equal(calls.at(-1).payload.reply_markup.keyboard.length,4);
assert.ok(calls.at(-1).payload.text.includes('بيانات شخصية'));
for(const [id,topic] of Object.entries(topics)){
  assert.equal(topic.qa.length,20);
  await message(topic.name);
  let keyboard=calls.at(-1).payload.reply_markup;
  assert.equal(keyboard.keyboard.length,21);
  assert.equal(keyboard.is_persistent,true);
  assert.ok(keyboard.keyboard.every(row=>row.length===1));
  assert.equal(keyboard.keyboard.at(-1)[0].text,'قائمة الأمراض');
  for(const item of topic.qa){
    const before=calls.length;
    await message(item.q);
    const reply=calls.at(-1).payload;
    assert.ok(reply.text.includes(item.a));
    assert.equal(reply.reply_markup.keyboard.length,21);
    assert.ok(calls.slice(before).every(c=>!c.url.includes('googleapis')));
  }
  // Old inline buttons remain usable after the UI changes.
  await send({callback_query:{id:'legacy',message:{chat:{id:1}},data:`q:${id}:19`}});
  assert.ok(calls.at(-1).payload.text.includes(topic.qa[19].a));
}
await message('قائمة الأمراض');
assert.equal(calls.at(-1).payload.reply_markup.keyboard.length,4);
await message('إيه فوائد المشي؟');
assert.ok(calls.some(c=>c.payload.text?.includes('إجابة توعوية')));
console.log('PASS: webhook auth, 4 diseases, 80 answers, full-width persistent keyboards, privacy notice and AI path');
let fallbackUsed=false;
env.AI={run:async()=>{fallbackUsed=true;return {response:'رد احتياطي للتوعية'}}};
globalThis.fetch=async(url,opt)=>{
  calls.push({url,payload:JSON.parse(opt?.body||'{}')});
  if(url.includes('googleapis'))return Response.json({error:'quota limit'},{status:429});
  return Response.json({ok:true,result:{message_id:11}});
};
await message('سؤال عن الصحة العامة',2);
assert.equal(fallbackUsed,true);
assert.ok(calls.some(c=>c.payload.text?.includes('رد احتياطي')));
console.log('PASS: primary-provider 429 falls back to the independent provider');
for(const command of ['start','menu','help','about','privacy','unknown']){
  const before=calls.length;
  await message('/'+command,3);
  const added=calls.slice(before);
  assert.ok(added.some(c=>c.url.endsWith('/sendMessage')));
  assert.ok(added.every(c=>!c.url.includes('googleapis')));
}
console.log('PASS: command handlers are deterministic and never send commands to AI');
