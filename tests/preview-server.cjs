// Local verification only: node tests/preview-server.cjs. Never deploy this server.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.json':'application/json'};
function fixture(kind='fresh'){
 const now=new Date().toISOString(),old=new Date(Date.now()-3*3600000).toISOString();
 const titles=['FC27 career','Dead by Daylight horror','A variety adventure','FIFA football','Haunted house','Another adventure','Football special','Horror special'];
 const videos=titles.map((title,i)=>({id:'testvideo'+String(i).padStart(2,'0'),snippet:{title,publishedAt:now,liveBroadcastContent:'none',thumbnails:{}},statistics:{viewCount:'1200'},...(i===2?{liveStreamingDetails:{actualStartTime:now,actualEndTime:now}}:{})}));
 const live={id:'livestream1',snippet:{title:'Thedocrot live fixture',publishedAt:now,liveBroadcastContent:'live'},liveStreamingDetails:{actualStartTime:now}};
 const normalized=v=>({id:v.id,title:v.snippet.title,publishedAt:now,startedAt:now,endedAt:now,live:false});
 const feed={version:1,slug:'thedocrot',label:'Thedocrot',updatedAt:kind==='stale'?old:now,channel:{id:'UCiXeV-jUw_yCqScuZGopvVQ',statistics:{subscriberCount:'450',viewCount:'800000',videoCount:'1600'}},uploads:videos.slice(0,6),replays:[videos[2]],live,liveChecked:true,latestVideos:videos.slice(0,6).map(normalized),latestLivestreams:[normalized(videos[2])],latestReplays:[normalized(videos[2])],collabs:[],liveStatus:{status:'live',video:normalized(live),checkedAt:kind==='stale'?old:now}};
 if(kind!=='legacy') {feed.catalog=videos;feed.sections={channel:{status:'fresh',updatedAt:feed.updatedAt},videos:{status:'fresh',updatedAt:feed.updatedAt}};}
 if(kind==='proposed') {const proposed=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/proposed.json')));proposed.updatedAt=now;proposed.liveStatus.checkedAt=now;proposed.liveStatus.expiresAt=new Date(Date.now()+45*60000).toISOString();for(const section of Object.values(proposed.sections))section.updatedAt=now;return proposed;}
 if(kind==='expires')feed.liveStatus.expiresAt=new Date(Date.now()+8000).toISOString();
 if(kind==='empty'){for(const key of ['catalog','uploads','replays','latestVideos','latestLivestreams','latestReplays'])feed[key]=[];feed.live=null;feed.liveStatus.status='unknown';}
 if(kind==='missing-stats'){feed.channel.statistics={};}
 if(kind==='hidden-stats'){feed.channel.statistics={hiddenSubscriberCount:true,viewCount:'0',videoCount:'0'};}
 if(kind==='partial'){feed.sections.videos={status:'cached',updatedAt:old};}
 if(kind==='wrong-channel')feed.channel.id='UC_not_thedocrot';
 return feed;
}
const server=http.createServer((req,res)=>{try{
 let url=new URL(req.url,'http://localhost');let name=decodeURIComponent(url.pathname);const before=name.startsWith('/before/');const scenario=name.match(/^\/scenario\/([^/]+)\//)?.[1];
 name=name.replace(/^\/(?:before|scenario\/[^/]+)\//,'/');if(name==='/')name='/index.html';
 const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 let data;
 if(before && name==='/js/youtube-config.js')data='window.DOCROT_YOUTUBE={apiKey:"TEST_ONLY",latestCount:6,replayCount:6};';
 else if(before && ['index.html','js/app.js','css/index.css'].includes(name.slice(1)))data=cp.execFileSync('git',['-C',root,'show','HEAD:'+name.slice(1)],{encoding:'utf8'});
 else data=fs.readFileSync(target);
 if(name==='/index.html'){
 let text=String(data);
 if(before){const f=fixture('legacy');text=text.replace('<head>','<head><script>localStorage.setItem("thedocrot:youtube:cache:v2",JSON.stringify('+JSON.stringify({...f,timestamp:Date.now()})+'));<\/script>');}
 if(scenario){const f=fixture(scenario);const script='localStorage.removeItem("creatorpromote:hub:v1:https://api.creatorpromote.com/:thedocrot");window.__requests=[];window.__errors=[];window.addEventListener("error",e=>window.__errors.push(e.message));const originalFetch=window.fetch.bind(window);window.fetch=(url,options)=>{window.__requests.push(String(url));document.documentElement.setAttribute("data-test-requests",JSON.stringify(window.__requests));if(String(url)==="https://api.creatorpromote.com/data/thedocrot.json"){if('+JSON.stringify(scenario)+'==="error"||('+JSON.stringify(scenario)+'==="fallback"&&window.__requests.length>1))return Promise.resolve(new Response("unavailable",{status:503}));if('+JSON.stringify(scenario)+'==="malformed")return Promise.resolve(new Response("not json"));return Promise.resolve(new Response(JSON.stringify('+JSON.stringify(f)+'),{headers:{"Content-Type":"application/json"}}));}return originalFetch(url,options);};';text=text.replace('<head>','<head><script>'+script+'<\/script>');}
 if(!before&&!scenario)text=text.replace("<head>","<head><script>const fetchOriginal=window.fetch.bind(window);const recorded=[];window.fetch=(url,options)=>{recorded.push(String(url));document.documentElement.setAttribute(\"data-test-requests\",JSON.stringify(recorded));return fetchOriginal(url,options);};<\/script>");
 data=text;
 }
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}});
server.listen(8137,'127.0.0.1',()=>console.log('Thedocrot test server: http://127.0.0.1:8137'));
