/** Thedocrot view model: legacy published v1 and proposed extended v1. */
const validVideo=v=>v && /^[A-Za-z0-9_-]{11}$/.test(v.id);
const publicVideo=v=>!v.status?.privacyStatus||v.status.privacyStatus==='public';
const time=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
export function category(title='') {
  if (/\b(fc\s?2[567]|fifa|football|career|haaland|penalt|soccer)\b/i.test(title)) return 'football';
  if (/(dead by daylight|\bdbd\b|halloween|haunted|vigil|survivor|killer|horror)/i.test(title)) return 'horror';
  return 'other';
}
function raw(v) {
  if(v.snippet)return v;
  return {...v,snippet:{title:v.title,publishedAt:v.publishedAt,liveBroadcastContent:v.upcoming?'upcoming':v.live?'live':'none',thumbnails:v.thumbnail?{medium:{url:v.thumbnail}}:{}},statistics:{viewCount:v.views},liveStreamingDetails:{actualStartTime:v.startedAt,actualEndTime:v.endedAt,scheduledStartTime:v.scheduledAt}};
}
export function adaptFeed(data, expectedId='UCiXeV-jUw_yCqScuZGopvVQ') {
  if(data.slug!=='thedocrot'||data.channel?.id!==expectedId)throw Error('Unexpected creator feed');
  const catalog=Array.isArray(data.catalog)?data.catalog:null;
  const uploads=(catalog || data.uploads || data.latestVideos || []).filter(validVideo).map(raw)
    .filter(v=>v.snippet.liveBroadcastContent!=='upcoming' && publicVideo(v))
    .sort((a,b)=>time(b.snippet.publishedAt)-time(a.snippet.publishedAt)).slice(0,60);
  const replaySource=catalog?catalog.filter(v=>v?.liveStreamingDetails?.actualEndTime):(data.replays||data.latestReplays||[]);
  const replays=replaySource.filter(validVideo).map(raw).filter(v=>publicVideo(v)&&v.liveStreamingDetails?.actualEndTime).sort((a,b)=>time(b.liveStreamingDetails?.actualStartTime||b.snippet.publishedAt)-time(a.liveStreamingDetails?.actualStartTime||a.snippet.publishedAt));
  const candidate=data.live || data.liveStatus?.video;
  const live=data.freshness?.liveFresh && data.liveStatus?.status==='live' && validVideo(candidate) && !candidate.endedAt && !candidate.liveStreamingDetails?.actualEndTime ? raw(candidate):null;
  return {channel:data.channel,uploads,replays,live,updatedAt:data.updatedAt,
    statsAt:data.sections?.channel?.updatedAt||data.updatedAt,
    videosAt:data.sections?.videos?.updatedAt||data.updatedAt,
    observedAt:data.liveStatus?.checkedAt||data.updatedAt,
    incomplete:Object.values(data.sections||{}).some(s=>s.status!=='fresh'),
    limited:!catalog,liveFresh:Boolean(data.freshness?.liveFresh)};
}
