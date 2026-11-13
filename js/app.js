'use strict';
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const cfg = window.DOCROT_YOUTUBE || {};
  const fmt = (n) => new Intl.NumberFormat('en-US', {notation:'compact', maximumFractionDigits: 1}).format(Number(n)||0);
  const number = (n) => new Intl.NumberFormat('en-US').format(Number(n)||0);
  const date = (s) => s ? new Intl.DateTimeFormat('en', {month:'short', day:'numeric', year:'numeric'}).format(new Date(s)) : '';
  const YOUTUBE = 'https://www.youtube.com/@thedocrot';
  const CACHE_KEY = 'thedocrot:youtube:cache:v2';
  let allVideos = [], currentFilter='all', refreshInProgress=false;

  // Accessible mobile menu
  const menuBtn = $('#menu-toggle'), menu = $('#main-nav');
  menuBtn?.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#main-nav a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open'); menuBtn?.setAttribute('aria-expanded', 'false');
  }));

  // Profile artwork is a 3D rotating CARD, not a 3D character model.
  const scene = $('#card-scene'), card = $('#creator-card'), flip = $('#flip-card');
  let isFlipped=false, drag=false, originX=0, originY=0, lastX=0, lastY=0, moveDist=0;
  const applyTilt = (x=0,y=0) => {
    if (!card) return;
    card.style.transform = `rotateY(${(isFlipped?180:0)+x}deg) rotateX(${y}deg)`;
  };
  if(scene && card) {
    scene.addEventListener('pointerdown', (e) => {
      drag=true; originX=e.clientX; originY=e.clientY; moveDist=0;
      scene.setPointerCapture?.(e.pointerId);
    });
    scene.addEventListener('pointermove', e => {
      const rect=scene.getBoundingClientRect();
      if(drag) { lastX=Math.max(-18,Math.min(18,(e.clientX-originX)/5)); lastY=Math.max(-10,Math.min(10,-(e.clientY-originY)/7)); moveDist=Math.max(moveDist,Math.abs(e.clientX-originX)+Math.abs(e.clientY-originY)); }
      else { lastX=((e.clientX-rect.left)/rect.width-.5)*15;lastY=-((e.clientY-rect.top)/rect.height-.5)*10; }
      applyTilt(lastX,lastY);
    });
    scene.addEventListener('pointerup',()=>{drag=false;});
    scene.addEventListener('pointercancel',()=>{drag=false;});
    scene.addEventListener('pointerleave',()=>{if(!drag){lastX=0;lastY=0;applyTilt();}});
  }
  flip?.addEventListener('click', () => {
    isFlipped=!isFlipped; lastX=0;lastY=0;applyTilt();
    flip.setAttribute('aria-pressed',String(isFlipped));
    flip.innerHTML=isFlipped?'⟳ Back to the front':'⟳ Flip the card';
  });

  $$('.filter').forEach(button => button.addEventListener('click', () => {
    currentFilter=button.dataset.filter;
    $$('.filter').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    renderVideos(allVideos);
  }));

  function category(title='') {
    if (/\b(fc\s?2[567]|fifa|football|career|haaland|penalt|soccer)\b/i.test(title)) return 'football';
    if (/(dead by daylight|\bdbd\b|halloween|haunted|vigil|survivor|killer|horror)/i.test(title)) return 'horror';
    return 'other';
  }
  function textEl(tag, cls, value) { const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;return e; }
  function videoCard(v, type='video') {
    const id=v.id, sn=v.snippet||{}, stats=v.statistics||{};
    const a=document.createElement('a');a.className='video-card';a.href=`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    a.target='_blank';a.rel='noopener noreferrer';
    const thumbnail=document.createElement('div'); thumbnail.className='thumb';
    const img=document.createElement('img');img.loading='lazy';img.alt='';img.src=sn.thumbnails?.medium?.url || sn.thumbnails?.high?.url || `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    thumbnail.append(img);
    const play=textEl('span','thumb-play','▶');thumbnail.append(play);
    const badge=textEl('span','thumb-category',type==='stream'?'STREAM REPLAY':category(sn.title).toUpperCase());thumbnail.append(badge);
    a.append(thumbnail);
    const body=document.createElement('div');body.className='video-body';
    body.append(textEl('h3','video-title',sn.title||'Watch video'));
    const meta=textEl('p','video-meta',`${date(sn.publishedAt)}${stats.viewCount != null ? ` · ${fmt(stats.viewCount)} views` : ''}`);body.append(meta);
    a.append(body);return a;
  }
  function videoFallback(container, kind, message) {
    container.replaceChildren();const box=textEl('div',kind==='stream'?'empty-stream':'empty-card','');
    box.append(textEl('span','empty-icon','▶'));
    box.append(textEl('h3','',kind==='stream'?'The stream archive is on YouTube.':'Watch the newest videos on YouTube.'));
    box.append(textEl('p','',message));
    const a=textEl('a','',kind==='stream'?'Open stream archive ↗':'Open video uploads ↗');a.href=kind==='stream'?YOUTUBE+'/streams':YOUTUBE+'/videos';a.target='_blank';a.rel='noopener noreferrer';box.append(a);container.append(box);
  }
  function renderVideos(videos){
    const target=$('#video-grid');if(!target)return;
    const list=videos.filter(v=>currentFilter==='all'||category(v.snippet?.title)===currentFilter).slice(0,Number(cfg.latestCount)||6);
    if(!list.length){videoFallback(target,'video',videos.length?'No recent videos in this category. Try Everything.':'Connect your restricted API key to display live YouTube results.');return;}
    target.replaceChildren(...list.map(v=>videoCard(v)));
  }
  function renderStreams(videos){
    const target=$('#stream-grid');if(!target)return;
    if(!videos.length){videoFallback(target,'stream','No public stream replays were found in the recently indexed uploads. Highlights are shown under Latest Drops instead.');return;}
    target.replaceChildren(...videos.slice(0,Number(cfg.replayCount)||6).map(v=>videoCard(v,'stream')));
  }
  function renderStats(channel){
    const stats=channel?.statistics||{};
    const hasSubs=!stats.hiddenSubscriberCount && stats.subscriberCount!=null;
    $('#stat-subs').textContent=hasSubs?number(stats.subscriberCount):'Hidden';
    $('#stat-views').textContent=stats.viewCount!=null?fmt(stats.viewCount):'—';
    $('#stat-videos').textContent=stats.videoCount!=null?number(stats.videoCount):'—';
    if(hasSubs){
      const subs=Number(stats.subscriberCount);const step=subs<1000?100:subs<10000?500:1000;
      const next=(Math.floor(subs/step)+1)*step;const prev=next-step;
      const percent=Math.max(0,Math.min(100,(subs-prev)/step*100));
      $('#stat-goal').textContent=number(next);$('#goal-progress').style.width=`${percent}%`;
      $('#goal-track').setAttribute('aria-valuenow',String(Math.round(percent)));
      $('#goal-note').textContent=`${number(next-subs)} to go · ${Math.round(percent)}% through this step`;
    } else {$('#stat-goal').textContent='—';$('#goal-note').textContent='Subscriber count not public';}
  }
  function renderLive(live, searched=true){
    const spotlight=$('#live-spotlight');const head=$('#live-headline'), detail=$('#live-detail'), state=$('#live-state'), link=$('#live-link');
    spotlight.classList.toggle('is-live',Boolean(live));
    if(live){state.textContent='● LIVE NOW';head.textContent=live.snippet?.title || 'The Docrot is streaming now!';detail.textContent='YouTube reports an active broadcast. Click to join the stream.';link.textContent='Watch live ↗';link.href=`https://www.youtube.com/watch?v=${encodeURIComponent(live.id)}`;}
    else if(searched){state.textContent='NO LIVE BROADCAST DETECTED';head.textContent='Catch the next stream';detail.textContent='No active public livestream was found during the latest YouTube check. Watch recent videos or visit the channel to confirm.';link.textContent='View channel live page ↗';link.href=YOUTUBE+'/live';}
    else{state.textContent='LIVE STATUS UNAVAILABLE';head.textContent='Check the channel for the next stream';detail.textContent='Automatic live detection is unavailable. You can still visit the live tab on YouTube.';link.textContent='Check on YouTube ↗';link.href=YOUTUBE+'/live';}
  }
  function showToast(msg){const e=$('#toast');if(!e)return;e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),4400);}
  async function yt(endpoint, params){
    const q=new URLSearchParams({...params,key:cfg.apiKey});
    const response=await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${q}`,{cache:'no-store'});
    let data;try{data=await response.json();}catch{throw Error(`YouTube returned HTTP ${response.status}`);}
    if(!response.ok){throw Error(data?.error?.message||`YouTube error ${response.status}`);}
    return data;
  }
  function getCache(){try {const obj=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return obj&&obj.timestamp?obj:null;}catch{return null;}}
  function setCache(data){try{localStorage.setItem(CACHE_KEY,JSON.stringify({...data,timestamp:Date.now()}));}catch{}}
  function showData(data, isCached=false){
    if(data.channel)renderStats(data.channel);
    allVideos=data.uploads||[];renderVideos(allVideos);
    renderStreams(data.replays||[]);
    renderLive(data.live||null,data.liveChecked!==false);
    const when = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : 'just now';
    $('#data-note').textContent=`Public YouTube data · ${isCached?'Cached':'Checked'} ${when}`;
  }
  async function loadYouTube(force=false){
    if(refreshInProgress)return;
    const refresh=$('#refresh-feed');
    const key=String(cfg.apiKey||'');
    if(!key || key.includes('PASTE_YOUR_')){ $('#data-note').textContent='Add a restricted YouTube API key to activate stats';renderLive(null,false);if(force)showToast('Add your API key in js/youtube-config.js first.');return; }
    const cached=getCache();const cacheMins=Number(cfg.cacheMinutes)||45;
    if(!force&&cached&&(Date.now()-cached.timestamp)<cacheMins*60*1000){showData(cached,true);return;}
    refreshInProgress=true;if(refresh)refresh.disabled=true;
    $('#data-note').textContent='Checking YouTube…';
    try{
      const chData=await yt('channels',{part:'snippet,statistics,contentDetails',forHandle:cfg.channelHandle||'@thedocrot'});
      const channel=chData.items?.[0];if(!channel)throw Error('The channel was not found. Check the handle.');
      const uploadPlaylist=channel.contentDetails?.relatedPlaylists?.uploads;
      let pageToken='', ids=[];
      if(uploadPlaylist){
        for(let p=0;p<3;p++){
          const args={part:'contentDetails',playlistId:uploadPlaylist,maxResults:'50'};
          if(pageToken)args.pageToken=pageToken;
          const result=await yt('playlistItems',args);
          ids.push(...(result.items||[]).map(x=>x.contentDetails?.videoId).filter(Boolean));
          pageToken=result.nextPageToken||'';if(!pageToken)break;
        }
      }
      // Low-cost endpoints for uploads, stats, replay classification.
      let videos=[];
      for(let i=0;i<ids.length;i+=50){const chunk=ids.slice(i,i+50);if(!chunk.length)continue;
        const result=await yt('videos',{part:'snippet,statistics,liveStreamingDetails',id:chunk.join(',')});
        videos.push(...(result.items||[]));
      }
      const byId=new Map(videos.map(v=>[v.id,v]));
      videos=ids.map(id=>byId.get(id)).filter(Boolean);
      const uploads=videos.filter(v=>v.snippet?.liveBroadcastContent!=='upcoming').slice(0,60);
      const replays=videos.filter(v=>v.liveStreamingDetails?.actualEndTime)
        .sort((a,b)=>new Date(b.liveStreamingDetails.actualStartTime||b.snippet?.publishedAt)-new Date(a.liveStreamingDetails.actualStartTime||a.snippet?.publishedAt));
      let live=null,liveChecked=false;
      if(cfg.checkLive!==false){
        try {
          const liveSearch=await yt('search',{part:'snippet',channelId:channel.id,type:'video',eventType:'live',maxResults:'1'});
          liveChecked=true;
          const l=liveSearch.items?.[0];if(l?.id?.videoId)live={id:l.id.videoId,snippet:l.snippet};
        }catch(error){ console.warn('Could not check live status:',error.message); }
      }
      // Reuse upload metadata for active live fallback if search bucket is exhausted.
      if(!live){const candidate=videos.find(v=>v.snippet?.liveBroadcastContent==='live' && !v.liveStreamingDetails?.actualEndTime);if(candidate)live=candidate;}
      const data={channel,uploads,replays,live,liveChecked};setCache(data);showData({...data,timestamp:Date.now()});
      if(force)showToast('Updated from YouTube.');
    }catch(error){
      console.error('YouTube API:',error);
      const cached=getCache();if(cached){showData(cached,true);showToast(`Couldn't refresh. Showing cached results.`);} else {
        $('#data-note').textContent='YouTube could not be loaded · Check Console';
        renderLive(null,false);
        videoFallback($('#video-grid'),'video','The live API request failed. Open the channel or check the browser Console.');
        showToast('YouTube API error: '+error.message);
      }
    }finally{refreshInProgress=false;if(refresh)refresh.disabled=false;}
  }
  $('#refresh-feed')?.addEventListener('click',()=>loadYouTube(true));
  loadYouTube();
})();
