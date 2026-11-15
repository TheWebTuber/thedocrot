import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {adaptFeed,category} from '../js/hub-adapter.mjs';
import {safeFeed,validateFeed,createHubClient} from '../js/creatorpromote-hub.js';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const proposed=JSON.parse(read('./fixtures/proposed.json'));
const published=JSON.parse(read('./fixtures/published.json'));
const fresh=data=>safeFeed(data,Date.parse(data.updatedAt));
test('real published version-1 capture remains compatible',()=>{
 validateFeed(published,'thedocrot');const view=adaptFeed(fresh(published));
 assert.equal(view.channel.id,'UCiXeV-jUw_yCqScuZGopvVQ');assert.equal(view.uploads.length,published.uploads.length);assert(view.limited);
});
test('actual improved-Hub fixture retains 60 uploads for categories and all available completed replays',()=>{
 const view=adaptFeed(fresh(proposed));assert.equal(view.uploads.length,60);assert.equal(view.limited,false);
 for(const kind of ['football','horror','other'])assert(view.uploads.filter(v=>category(v.snippet.title)===kind).length>6);
 assert(view.replays.length>=6);assert(view.replays.every(v=>v.liveStreamingDetails.actualEndTime));
});
test('category rules preserve football, horror and other behavior',()=>{
 for(const title of ['FC27 career','FIFA challenge','Football match'])assert.equal(category(title),'football');
 for(const title of ['Dead by Daylight','DBD killer','Haunted horror'])assert.equal(category(title),'horror');
 assert.equal(category('Variety adventure'),'other');
});
test('current observed live appears, expired live cannot appear',()=>{
 assert(adaptFeed(fresh(proposed)).live);
 assert.equal(adaptFeed(safeFeed(proposed,Date.parse(proposed.updatedAt)+46*60000)).live,null);
});
test('failed video section cannot claim live even with a newer channel timestamp',()=>{
 const data=structuredClone(proposed);data.sections.videos.status='cached';
 assert.equal(adaptFeed(fresh(data)).live,null);assert(adaptFeed(fresh(data)).incomplete);
});
test('future and invalid observation timestamps are conservative',()=>{
 for(const checkedAt of ['invalid','2099-01-01T00:00:00Z']){const data=structuredClone(proposed);data.liveStatus.checkedAt=checkedAt;assert.equal(adaptFeed(fresh(data)).live,null);}
});
test('ended and upcoming broadcasts never become live or replays respectively',()=>{
 const data=structuredClone(proposed);data.live.liveStreamingDetails.actualEndTime=data.updatedAt;
 const view=adaptFeed(fresh(data));assert.equal(view.live,null);assert(!view.uploads.some(v=>v.snippet.liveBroadcastContent==='upcoming'));assert(view.replays.every(v=>v.liveStreamingDetails.actualEndTime));
});
test('wrong creator rejected',()=>{assert.throws(()=>adaptFeed({...proposed,channel:{id:'UC_wrong'}}),/Unexpected/);});
test('empty sections and missing statistics still produce a view',()=>{
 const data={...proposed,catalog:[],channel:{id:proposed.channel.id},live:null,liveStatus:{status:'unknown'}};
 const view=adaptFeed(fresh(data));assert.equal(view.uploads.length,0);assert.equal(view.replays.length,0);assert.equal(view.live,null);
});
test('private or malformed catalog entries are excluded',()=>{
 const data=structuredClone(proposed);data.catalog=[null,{id:'bad'},{...proposed.catalog[4],status:{privacyStatus:'private'}}];
 const view=adaptFeed(fresh(data));assert.equal(view.uploads.length,0);assert.equal(view.replays.length,0);
});
test('normalized-only lists map to existing raw-video renderer',()=>{
 const data=structuredClone(proposed);delete data.catalog;delete data.uploads;delete data.replays;
 const view=adaptFeed(fresh(data));assert.equal(view.uploads[0].snippet.title,data.latestVideos[0].title);assert.equal(view.replays.length,data.latestReplays.length);
});
test('cached response survives HTTP and malformed feed errors',async()=>{
 let fail=false;const client=createHubClient({storage:null,now:()=>Date.parse(proposed.updatedAt),fetcher:async()=>fail?{ok:false,status:503}:{ok:true,json:async()=>proposed}});
 await client.get('thedocrot');fail=true;const result=await client.get('thedocrot',{force:true});assert.equal(result.source,'fallback');assert.equal(adaptFeed(result.data).uploads.length,60);
});
test('all original section IDs, local asset references and link destinations remain',()=>{
 const root=new URL('..',import.meta.url);const original=execFileSync('git',['-C',fs.realpathSync(root),'show','HEAD:index.html'],{encoding:'utf8'});const current=read('../index.html');
 for(const pattern of [/\bid="([^"]+)"/g,/\bhref="([^"]+)"/g,/\bsrc="([^"]+)"/g]){
  const values=text=>[...text.matchAll(pattern)].map(x=>x[1]).sort();assert.deepEqual(values(current),values(original));
 }
 const css=execFileSync('git',['-C',fs.realpathSync(root),'show','HEAD:css/index.css'],{encoding:'utf8'});assert.equal(read('../css/index.css').replace(/\r\n/g,'\n'),css.replace(/\r\n/g,'\n'));
});
test('production scripts contain no API keys or YouTube Data API calls',()=>{
 const scripts=['app.js','youtube-config.js','creatorpromote-hub.js','hub-adapter.mjs'].map(n=>read('../js/'+n)).join('\n');
 assert(!/AIza[\w-]+/.test(scripts));assert(!/googleapis\.com\/youtube\/v3/.test(scripts));assert(!/apiKey\s*:/.test(scripts));
});
