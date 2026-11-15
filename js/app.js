'use strict';
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const cfg = window.DOCROT_YOUTUBE || {};
  const fmt = (n) => new Intl.NumberFormat('en-US', {notation:'compact', maximumFractionDigits: 1}).format(Number(n)||0);
  const number = (n) => new Intl.NumberFormat('en-US').format(Number(n)||0);
  const date = (s) => Number.isFinite(Date.parse(s)) ? new Intl.DateTimeFormat('en', {month:'short', day:'numeric', year:'numeric'}).format(new Date(s)) : '';
  const YOUTUBE = 'https://www.youtube.com/@thedocrot';
  let client, adaptFeed, lastView=null, unsubscribe;
  const observed = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'time unavailable';
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
    if(!list.length){videoFallback(target,'video',videos.length?'No recent videos in this category. Try Everything.':'No recent uploads are available in the shared feed. Visit the channel for more videos.');return;}
    target.replaceChildren(...list.map(v=>videoCard(v)));
  }
  function renderStreams(videos){
    const target=$('#stream-grid');if(!target)return;
    if(!videos.length){videoFallback(target,'stream','No public stream replays were found in the recently indexed uploads. Highlights are shown under Latest Drops instead.');return;}
    target.replaceChildren(...videos.slice(0,Number(cfg.replayCount)||6).map(v=>videoCard(v,'stream')));
  }
  function renderStats(channel){
    const stats=channel?.statistics||{};
    const hasCount=value=>value!==null && value!==undefined && String(value).trim()!=='' && Number.isFinite(Number(value)) && Number(value)>=0;
    const hasSubs=!stats.hiddenSubscriberCount && hasCount(stats.subscriberCount);
    $('#stat-subs').textContent=hasSubs?number(stats.subscriberCount):stats.hiddenSubscriberCount?'Hidden':'—';
    $('#stat-views').textContent=hasCount(stats.viewCount)?fmt(stats.viewCount):'—';
    $('#stat-videos').textContent=hasCount(stats.videoCount)?number(stats.videoCount):'—';
    if(hasSubs){
      const subs=Number(stats.subscriberCount);const step=subs<1000?100:subs<10000?500:1000;
      const next=(Math.floor(subs/step)+1)*step;const prev=next-step;
      const percent=Math.max(0,Math.min(100,(subs-prev)/step*100));
      $('#stat-goal').textContent=number(next);$('#goal-progress').style.width=`${percent}%`;
      $('#goal-track').setAttribute('aria-valuenow',String(Math.round(percent)));
      $('#goal-note').textContent=`${number(next-subs)} to go · ${Math.round(percent)}% through this step`;
    } else {$('#stat-goal').textContent='—';$('#goal-progress').style.width='0%';$('#goal-track').setAttribute('aria-valuenow','0');$('#goal-note').textContent=stats.hiddenSubscriberCount?'Subscriber count not public':'Subscriber count unavailable';}
  }
  function renderLive(live, checkedAt) {
    const spotlight=$('#live-spotlight'), head=$('#live-headline'), detail=$('#live-detail'), state=$('#live-state'), link=$('#live-link');
    spotlight.classList.toggle('is-live',Boolean(live));
    if(live){state.textContent='● OBSERVED LIVE';head.textContent=live.snippet?.title || 'Thedocrot live broadcast';detail.textContent='Reported live '+observed(checkedAt)+'. Status can change between updates.';link.textContent='Watch live ↗';link.href='https://www.youtube.com/watch?v='+encodeURIComponent(live.id);}
    else {state.textContent='LIVE STATUS UNKNOWN';head.textContent='Check the channel for live action';detail.textContent='No current broadcast can be confirmed from the latest saved observation'+(checkedAt?' ('+observed(checkedAt)+')':'')+'. Check YouTube for the latest status.';link.textContent='Check on YouTube ↗';link.href=YOUTUBE+'/live';}
  }
  function showToast(msg){const e=$('#toast');if(!e)return;e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),4400);}
  function showData(result){
    const view=adaptFeed(result.data,cfg.channelId);
    // Refresh only data-driven elements; card, navigation and current filter stay intact.
    const signature=JSON.stringify(view);
    if(signature!==lastView){
      renderStats(view.channel);allVideos=view.uploads;renderVideos(allVideos);renderStreams(view.replays);lastView=signature;
    }
    // Restore the spotlight after a transient rendering/module error even when data is unchanged.
    renderLive(view.live,view.observedAt);
    const notes=['Public YouTube data · Updated '+observed(view.updatedAt)];
    if(view.statsAt!==view.updatedAt)notes.push('Stats observed '+observed(view.statsAt));
    if(view.videosAt!==view.updatedAt)notes.push('Videos observed '+observed(view.videosAt));
    if(result.source==='fallback'||view.incomplete)notes.push('Showing saved results; refresh incomplete');
    if(Date.now()-Date.parse(view.updatedAt)>45*60000)notes.push('Feed may be delayed');
    if(view.limited)notes.push('Filters cover the currently available uploads');
    $('#data-note').textContent=notes.join(' · ');
  }
  function unavailable(){
    renderLive(null);
    $('#data-note').textContent='Feed unavailable · You can still visit the YouTube channel';
    if(!lastView){renderStats(null);videoFallback($('#video-grid'),'video','The shared feed could not load. Try Refresh or visit YouTube.');videoFallback($('#stream-grid'),'stream','Stream replays are temporarily unavailable here. The YouTube archive is still available.');}
  }
  async function loadYouTube(){
    if(refreshInProgress)return;
    const refresh=$('#refresh-feed');refreshInProgress=true;refresh.disabled=true;
    try {
      if(!client)throw Error('Feed client unavailable');
      const result=await client.get(cfg.slug,{force:true});showData(result);
      showToast(result.source==='fallback'?'Could not refresh. Showing saved results.':'Checked the shared feed. Updates are published periodically.');
    }catch{unavailable();showToast('The feed is unavailable. Please try again later.');}
    finally{refreshInProgress=false;refresh.disabled=false;}
  }
  $('#refresh-feed')?.addEventListener('click',loadYouTube);
  $('#data-note').textContent='Loading public channel data…';
  // Keep local interactions available even if a feed module fails to load.
  Promise.all([import('./creatorpromote-hub.js'),import('./hub-adapter.mjs')]).then(([hub,adapter])=>{
    adaptFeed=adapter.adaptFeed;
    const checkedFetch=async(...args)=>{
      const response=await fetch(...args);
      if(!response.ok)return response;
      const payload=await response.json();
      if(payload.channel?.id!==cfg.channelId)throw Error('Unexpected creator');
      return {ok:true,json:async()=>payload};
    };
    client=hub.createHubClient({baseUrl:cfg.hubUrl,fetcher:checkedFetch});
    const start=()=>{if(!unsubscribe)unsubscribe=client.subscribe(cfg.slug,showData,unavailable);};
    start();
    window.addEventListener('pagehide',()=>{unsubscribe?.();unsubscribe=null;});
    window.addEventListener('pageshow',start);
  }).catch(unavailable);
})();
