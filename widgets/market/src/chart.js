import {connectHost} from './host.js';
import {indicatorTemplates,emaSeries} from './chart-indicators.js';
import {comparePrice,directionAtPrice} from './price.js';
import {$,marketName,pair,marketId,quoteKey,quoteId,formatPrice,percentage,tone,timeText,element,canvasContext,drawLine,ruleStatus} from './market-ui.js';

const query=new URLSearchParams(location.search);
const [,market,symbol,requestedSource]=query.get('page').split(':');
let instrument={market,symbol};
const isPerp=market==='usd_m';
const host=await connectHost();
document.body.className='market-body chart-body';
document.body.innerHTML=`<main class="market-chart"><div class="chart-toolbar"><strong id="chart-title"></strong>
  <select id="chart-source" aria-label="价格来源"><option value="last">成交价</option><option value="mark">标记价</option></select>
  <select id="chart-period" aria-label="K 线周期" disabled><option value="1m">1 分</option><option value="5m">5 分</option><option value="15m">15 分</option><option value="30m">30 分</option><option value="1h" selected>1 时</option><option value="4h">4 时</option><option value="1d">1 日</option></select>
  <label class="chart-template">指标模板<select id="chart-template" aria-describedby="chart-template-description" disabled><option value="default">默认指标</option></select></label>
  <button id="toggle-ma" type="button" aria-pressed="true">MA</button><button id="ma-config" type="button">MA 设置</button><button id="toggle-boll" type="button" aria-pressed="true">BOLL</button><button id="toggle-oi" type="button" aria-pressed="true">OI</button>
  <button id="chart-reset" type="button">回到最新</button><button id="chart-history" type="button">触发历史</button></div>
  <p id="chart-error" class="market-message" role="status" hidden></p>
  <p id="chart-view-error" class="market-message" role="status" hidden></p>
  <div class="chart-layout"><section class="chart-data"><div class="chart-legend"><strong id="chart-market"></strong><span id="chart-ohlc"></span><span id="candle-change"></span><span id="chart-indicators"></span></div>
  <p id="chart-template-description" class="market-hint" hidden></p>
  <div id="chart-stage"><canvas id="chart-canvas" role="img" aria-label="价格 K 线、成交量、指标和警报线"></canvas><div id="chart-empty" role="status">等待币安历史 K 线</div><button id="pick-alert" type="button" hidden>在此价位新建警报</button></div>
  <p id="chart-foot" class="market-hint">底部滚轮缩放时间 · 右轴滚轮缩放价格 · 拖动平移</p><p id="chart-save-status" class="market-hint" role="status" hidden></p></section>
  <aside class="chart-rules"><div class="dialog-head"><h2>价格警报 <small id="rules-count"></small></h2><button id="all-rules" type="button">全部警报</button></div>
  <div class="tool-row"><button id="alert-up" type="button">＋ 上方警报</button><button id="alert-down" type="button">＋ 下方警报</button></div>
  <div id="instrument-rules" class="instrument-rules"></div>
  <form id="chart-rule-form" hidden><label>规则名称<input id="alert-name" maxlength="80" autocomplete="off" required></label>
  <div class="chart-fields"><label>触发条件<select id="alert-condition"><option value="reach">到价（自动方向）</option><option value="cross-up">向上穿越</option><option value="cross-down">向下穿越</option></select></label><label>警报价位<input id="alert-threshold" inputmode="decimal" required></label>
  <label>频率<select id="alert-mode"><option value="once">单次</option><option value="repeat">重复</option></select></label>
  <label>冷却秒数<input id="alert-cooldown" type="number" min="0" max="604800" step="1" title="0 秒使用宿主默认冷却时间" required></label></div>
  <label>通知方式<select id="alert-notification"><option value="windows">Windows 通知</option><option value="island">灵动通知</option><option value="none">关闭弹窗</option></select></label>
  <p id="alert-hint" class="market-hint"></p><p id="alert-status" class="market-hint" role="status" hidden></p><p id="alert-error" class="market-message" role="alert" hidden></p>
  <div class="tool-row"><button id="alert-cancel" type="button">取消</button></div>
  <div id="alert-actions" class="tool-row" hidden><button id="alert-toggle" type="button">暂停</button><button id="alert-delete" type="button">删除警报</button></div></form></aside></div></main>
  <dialog id="ma-dialog" class="market-dialog"><form id="ma-form"><div class="dialog-head"><h2>MA 均线设置</h2><button id="ma-close" type="button">关闭</button></div>
  <label>均线周期<input id="ma-periods" type="text" required autocomplete="off"></label><p class="market-hint">按当前 K 线根数计算。填 1–6 个互不重复的整数，每项 1–200，用逗号或空格分隔。</p>
  <p id="ma-error" class="market-message" role="alert" hidden></p><div class="tool-row"><button id="ma-reset" type="button">恢复默认</button><button id="ma-save" class="market-accent" type="submit">应用</button></div></form></dialog>
  <dialog id="rule-confirm" class="market-dialog"><form method="dialog"><p id="rule-confirm-text"></p><div class="tool-row"><button type="submit" value="cancel" autofocus>取消</button><button type="submit" value="confirm">确认</button></div></form></dialog>`;

const defaultMa=[5,10,30], maColors=['#e5b16a','#c094e0','#67c0ba','#a9d985','#a9c8ff','#f48a9e'];
const duration={ '1m':60000,'5m':300000,'15m':900000,'30m':1800000,'1h':3600000,'4h':14400000,'1d':86400000 };
const defaultVisible=64, rightPadding=3, pageSize=499;
const indicators={ma:true,boll:true,oi:isPerp};
const canvas=$('chart-canvas');
const chartPeriod=$('chart-period');
const chartTemplate=$('chart-template');
for (const [id,{name}] of Object.entries(indicatorTemplates)) {
  const option=element('option',name);
  option.value=id;
  chartTemplate.append(option);
}
let period=chartPeriod.value, source=isPerp&&requestedSource==='mark'?'mark':'last', maPeriods=[...defaultMa], bars=[], interest=[], seriesWarning='', oiWarning='';
let templateId=chartTemplate.value, emaCache=null, seriesReady=false;
$('chart-source').value=source;
let visible=defaultVisible, offset=0, priceRange=null, cursor=null, drag=null, scale=null;
let loading=false, flow=0, loadingHistory=false, historyDone=false, historyRetryAt=0, historyEndTime=null;
let historyOptions=true, liveSupported=true, liveBusy=false, liveGeneration=null, liveLease=null;
let liveRows=[], liveEvent=null, restSynced=false, nextSeriesAt=0, nextOiAt=0, lastLiveAt=0, gapStart=null, sourceNow=0;
let rules=[], quotes=new Map(), editing=null, saving=false, draftSide='up', draftPrice=null, draftTouched=false;
let ruleLabels=[], pendingLevel=null, rulesRequest=0;
let draftId=null, autoSaveTimer=null, savePending=false, waitingForQuote=false;
const sourceQuote=()=>quotes.get(quoteId(quoteKey(instrument,source)));
const freshQuote=()=>{ const q=sourceQuote(); return q?.quality==='fresh'?q:null; };
const message=(id,value='')=>{ $(id).textContent=value; $(id).hidden=!value; };
const fail=error=>message('chart-error',error?.message ?? String(error));
const selectedTemplate=()=>Object.hasOwn(indicatorTemplates,templateId)?indicatorTemplates[templateId]:null;
const activeTemplate=()=>{
  const template=selectedTemplate();
  return template?.interval===period?template:null;
};

function updateTemplateControls() {
  const template=selectedTemplate();
  const active=template?.interval===period;
  for (const id of ['toggle-ma','ma-config','toggle-boll']) $(id).hidden=active;
  message('chart-template-description',template?`${template.description}${active?'':'切回日线即可显示通道。'}`:'');
}

async function restoreChartView() {
  try {
    const saved=await host.request('storage.get');
    const savedPeriod=saved?.chartPeriod, savedTemplate=saved?.chartIndicatorTemplate;
    if (typeof savedPeriod==='string'&&Object.hasOwn(duration,savedPeriod)) period=chartPeriod.value=savedPeriod;
    if (typeof savedTemplate==='string'&&Object.hasOwn(indicatorTemplates,savedTemplate)) templateId=chartTemplate.value=savedTemplate;
    updateTemplateControls();
  } catch(error) {
    message('chart-view-error',`无法读取上次 K 线周期和指标模板：${error.message}`);
  }
}

async function rememberChartView() {
  if (host.preview) return;
  chartPeriod.disabled=chartTemplate.disabled=true;
  try {
    const saved=await host.request('storage.get');
    await host.request('storage.set',{...saved,chartPeriod:period,chartIndicatorTemplate:templateId});
    message('chart-view-error');
  } catch(error) {
    message('chart-view-error',`K 线周期和指标模板未保存：${error.message}`);
  } finally {
    chartPeriod.disabled=chartTemplate.disabled=false;
  }
}

$('chart-title').textContent=pair(instrument);
$('chart-source').options[1].disabled=!isPerp;
$('toggle-oi').hidden=!isPerp;
for (const [id,page] of [['chart-history','history'],['all-rules','rules']]) {
  $(id).onclick=()=>void afterDraftSave(()=>void host.request('view.openDetails',{page}).catch(fail));
}
function parsePeriods(value) {
  const entries=value.trim().split(/[,，、\s]+/);
  const n=entries.map(Number);
  return n.length<=6 && new Set(n).size===n.length && entries.every((part,i)=>/^\d+$/.test(part)&&n[i]>=1&&n[i]<=200) ? n : null;
}
$('ma-config').onclick=()=>{ $('ma-periods').value=maPeriods.join(', '); message('ma-error'); $('ma-dialog').showModal(); $('ma-periods').select(); };
$('ma-close').onclick=()=>$('ma-dialog').close();
$('ma-reset').onclick=()=>{ $('ma-periods').value=defaultMa.join(', '); message('ma-error'); };
$('ma-form').onsubmit=async event=>{
  event.preventDefault(); const settings=parsePeriods($('ma-periods').value);
  if (!settings) { message('ma-error','请输入 1–6 个互不重复的 1–200 整数。'); return; }
  $('ma-save').disabled=true;
  try { await host.request('market.preferences',{maPeriods:settings.join(',')}); maPeriods=settings; indicators.ma=true; $('toggle-ma').setAttribute('aria-pressed','true'); $('ma-dialog').close(); draw(); if (bars.length<initialLimit()) void loadSeries(false,true); }
  catch(error) { message('ma-error',error.message); }
  finally { $('ma-save').disabled=false; }
};
for (const key of Object.keys(indicators)) $(`toggle-${key}`).onclick=()=>{
  indicators[key]=!indicators[key]; $(`toggle-${key}`).setAttribute('aria-pressed',indicators[key]);
  draw(); if (key==='oi'&&indicators.oi) { nextOiAt=0; refreshInterest(); }
};

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function firstAt(rows,time) {
  let left=0, right=rows.length;
  while (left<right) {
    const mid=Math.floor((left+right)/2);
    if (rows[mid].time<time) left=mid+1; else right=mid;
  }
  return left;
}

function mergeRows(existing,incoming,keepExisting=false) {
  if (!incoming.length) return existing;
  const start=firstAt(existing,incoming[0].time), end=firstAt(existing,incoming.at(-1).time+1);
  const byTime=new Map(existing.slice(start,end).map(row=>[row.time,row]));
  for (const row of incoming) {
    const previous=byTime.get(row.time);
    if (previous?.closed===true&&row.closed!==true) continue;
    if (keepExisting&&previous&&(previous.closed===true||row.closed!==true)) continue;
    byTime.set(row.time,row);
  }
  return existing.slice(0,start).concat([...byTime.values()].sort((a,b)=>a.time-b.time),existing.slice(end));
}

function confirmedRows(rows,before) {
  return rows.map((row,index)=>row.closeTime<before||rows[index+1]?.time>row.closeTime
    ? {...row,closed:true}:row);
}

function seriesFailure(error) {
  return /RATE_LIMITED\b|HTTP\s+(?:429|418)\b/i.test(error?.message??error??'')
    ? '币安限流，稍后自动重试':'上次 K 线更新失败';
}

function oldestOffset(earliest=bars[0].time) {
  return Math.max(0,(bars.at(-1).time-earliest)/duration[period]+1-visible);
}

function resetView(count=defaultVisible) {
  visible=count; offset=0; priceRange=null; cursor=null; drag=null;
  canvas.removeAttribute('data-chart-cursor'); $('pick-alert').hidden=true;
}

function initialLimit() {
  return Math.min(pageSize,Math.max(99,Math.ceil(visible)+Math.max(20,...maPeriods)-1));
}

function applyBars(rows) {
  const previousLatest=bars.at(-1)?.time;
  bars=mergeRows(bars,rows);
  if (previousLatest&&offset>rightPadding) offset+=(bars.at(-1).time-previousLatest)/duration[period];
}

function releaseLive() {
  if (liveLease) void host.request('market.candleLive',{...liveLease,release:true}).catch(()=>{});
  liveLease=null;
}

async function loadSeries(reset=false,full=false) {
  if (!seriesReady||(loading&&!reset)) return;
  if (reset) {
    releaseLive();
    flow++; bars=[]; interest=[]; seriesWarning=''; oiWarning='';
    emaCache=null;
    liveRows=[]; liveEvent=null; liveGeneration=null; restSynced=false; gapStart=null; nextSeriesAt=0; nextOiAt=0; lastLiveAt=0;
    loadingHistory=false; historyDone=false; historyRetryAt=0; historyEndTime=null;
    resetView(visible); draw();
  }
  const generation=flow;
  loading=true;
  const key=quoteKey(instrument,source), interval=period, limit=activeTemplate()?pageSize:initialLimit();
  const args={key,interval,limit};
  nextSeriesAt=Date.now()+Math.max(60_000,Math.min(duration[interval],300_000));
  refreshInterest();
  try {
    if (!bars.length&&historyOptions) {
      try {
        const saved=await host.request('market.candles',{...args,cachedOnly:true});
        if (generation!==flow) return;
        applyBars(confirmedRows(saved.rows,Infinity));
        if (bars.length) { seriesWarning='正在更新，已显示本地缓存'; draw(); }
      } catch(error) {
        if (/unknown field|未知参数/i.test(error.message)) historyOptions=false;
      }
    }
    if (generation!==flow) return;
    const missing=gapStart;
    const after=missing??bars.at(-1)?.time;
    const tailCount=after&&Math.ceil((Date.now()-after)/duration[interval])+2;
    if (historyOptions&&restSynced&&!full&&bars.length>=limit&&tailCount>0&&tailCount<limit) {
      args.startTime=after; args.limit=Math.max(2,tailCount);
    }
    // 请求前的交易所时间用于确认已收盘，避免把跨收盘返回的旧快照误当成最终值。
    const before=sourceNow-5000;
    const {rows,stale,warning}=await host.request('market.candles',args);
    if (generation!==flow) return;
    applyBars(confirmedRows(rows,stale?Infinity:before));
    applyBars(liveRows);
    if (!stale) {
      restSynced=true;
      if (gapStart===missing) {
        if (missing!==null&&args.startTime===undefined&&rows.length===limit&&rows[0].time>missing+duration[interval]) {
          historyEndTime=rows[0].time-1;
          historyDone=false; historyRetryAt=0;
        }
        gapStart=null;
      }
    }
    seriesWarning=stale?seriesFailure(warning):bars.length?'':'暂未取得 K 线';
  } catch(error) {
    if (generation===flow) seriesWarning=seriesFailure(error);
  } finally {
    if (generation===flow) { loading=false; draw(); void loadOlder(true); }
  }
}

async function pollLive() {
  if (!seriesReady||document.hidden||source!=='last'||!liveSupported||liveBusy) return;
  liveBusy=true;
  const generation=flow, args={key:quoteKey(instrument),interval:period};
  liveLease=args;
  try {
    const next=await host.request('market.candleLive',args);
    if (generation!==flow) return;
    const newConnection=next.connected&&next.generation!==liveGeneration;
    if (!next.connected||newConnection) {
      if (liveGeneration!==null&&bars.length) gapStart??=bars.at(-1).time;
      liveRows=[]; liveEvent=null;
    }
    liveGeneration=next.connected?next.generation:null;
    if (!next.rows.length) return;
    const previous=bars.at(-1)?.time;
    if (previous&&next.rows[0].time>previous+duration[period]&&gapStart===null) {
      gapStart=previous;
      nextSeriesAt=0;
    }
    if (newConnection&&gapStart!==null) nextSeriesAt=0;
    if (next.eventTime!==liveEvent) lastLiveAt=Date.now();
    liveEvent=next.eventTime;
    liveRows=next.rows;
    applyBars(liveRows);
    if (gapStart!==null&&Date.now()>=nextSeriesAt) void loadSeries();
    draw();
  } catch(error) {
    if (/METHOD_NOT_FOUND|未知业务接口/.test(error.message)) liveSupported=false;
  } finally { liveBusy=false; }
}

function refreshInterest() {
  if (!isPerp||!indicators.oi||document.hidden||Date.now()<nextOiAt) return;
  nextOiAt=Date.now()+duration[period==='1m'?'5m':period];
  void loadInterest(flow);
}

async function loadInterest(generation,endTime) {
  const interval=period==='1m'?'5m':period;
  const limit=endTime===undefined?Math.min(pageSize,Math.ceil(initialLimit()*duration[period]/duration[interval])+5):pageSize;
  const args={key:quoteKey(instrument),interval,limit};
  if (endTime!==undefined) args.endTime=endTime;
  try {
    const {rows}=await host.request('market.openInterest',args);
    if (generation!==flow) return;
    // 同一采样时间优先保留定时更新取得的数据。
    interest=mergeRows(interest,rows,endTime!==undefined);
    if (endTime===undefined) oiWarning='';
  } catch(error) {
    if (generation===flow&&endTime===undefined) {
      oiWarning=error?.message ?? '未平仓量更新失败';
      nextOiAt=Date.now()+60_000;
    }
  }
  if (generation===flow) draw();
}

function needsEmaHistory(distance) {
  const template=activeTemplate();
  // 多取一些日线，降低 EMA 初始值对可见区域的影响。
  return template&&distance<template.minimumBars*3;
}

async function loadOlder(emaOnly=false) {
  if (emaOnly&&(!activeTemplate()||loading||document.hidden)) return;
  if (!bars.length||loadingHistory||historyDone||Date.now()<historyRetryAt) return;
  const endTime=historyEndTime??bars[0].time-1, earliest=endTime+1;
  const distance=oldestOffset(earliest)-offset;
  if (!needsEmaHistory(distance)&&(emaOnly||distance>Math.max(32,visible/2))) return;
  if (endTime<=0) { historyDone=true; draw(); return; }
  const generation=flow;
  // 限流时返回的缓存可先绘制，分页位置在这一页确认后才前移。
  historyEndTime=endTime;
  loadingHistory=true; historyRetryAt=0; draw();
  let fullPage=false;
  try {
    const {rows,stale}=await host.request('market.candles',{key:quoteKey(instrument,source),interval:period,limit:pageSize,endTime});
    if (generation!==flow) return;
    const older=rows.filter(row=>row.time<earliest);
    if (historyEndTime===endTime) {
      historyDone=!stale&&!older.length;
      if (stale) historyRetryAt=Date.now()+30_000;
      else if (older.length) {
        historyEndTime=older[0].time-1;
        fullPage=older.length===pageSize;
      }
    }
    bars=mergeRows(bars,confirmedRows(older,stale?Infinity:earliest),true);
    if (older.length&&isPerp&&indicators.oi&&earliest>Date.now()-30*86400000&&earliest<(interest[0]?.time??Infinity)) {
      void loadInterest(generation,earliest);
    }
  } catch {
    if (generation===flow&&historyEndTime===endTime) historyRetryAt=Date.now()+10_000;
  } finally {
    if (generation===flow) {
      loadingHistory=false;
      draw();
      if (fullPage) void loadOlder(true);
    }
  }
}

function activeBar(last) {
  if (typeof last.closed==='boolean') return last;
  const q=freshQuote();
  if (!q||q.sourceUtcMs<last.time||q.sourceUtcMs>last.closeTime) return last;
  const live={...last,close:q.price};
  if (comparePrice(q.price,last.high)>0) live.high=q.price;
  if (comparePrice(q.price,last.low)<0) live.low=q.price;
  return live;
}
function overlays(data, first, last, length, deviations=false) {
  const closes=data.map(row=>Number(row.close));
  return closes.slice(first,last).map((_,i)=>{
    const end=first+i+1;
    if (end<length) return null;
    const slice=closes.slice(end-length,end);
    const mean=slice.reduce((a,b)=>a+b,0)/length;
    if (!deviations) return mean;
    const variance=slice.reduce((out,p)=>out+(p-mean)**2,0)/length;
    return {mean,upper:mean+2*Math.sqrt(variance),lower:mean-2*Math.sqrt(variance)};
  });
}
function emaChannels(template, first, last) {
  const latest=bars.at(-1), live=activeBar(latest);
  if (emaCache?.bars!==bars||emaCache.template!==template||emaCache.close!==live.close) {
    const data=live.close===latest.close?bars:[...bars.slice(0,-1),live];
    const values=template.channels.map(({periods})=>periods.map(length=>emaSeries(data,length,duration[period])));
    emaCache={bars,template,close:live.close,values};
  }
  return template.channels.map((channel,i)=>{
    const [short,long]=emaCache.values[i].map(values=>values.slice(first,last));
    return {...channel,short:short.map((value,index)=>long[index]===null?null:value),long};
  });
}
function pricePlaces() {
  return Math.min(20,Math.max(2,...[instrument.tickSize,sourceQuote()?.price,bars.at(-1)?.close].map(value=>value?.split('.')[1]?.replace(/0+$/,'').length ?? 0)));
}
const chartPrice=p=>Number.isFinite(p)?p.toFixed(pricePlaces()):'';
const clock=new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
const calendar=new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const date=new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit'});

function draw() {
  ruleLabels=[];
  const context=canvasContext(canvas);
  if (!context) { scale=null; return; }
  const {ctx,width,height}=context;
  const tf=duration[period], showVolume=source==='last', showOi=indicators.oi&&isPerp;
  const template=activeTemplate();
  $('chart-market').textContent=`币安 · ${marketName(instrument)} · ${source==='last'?'成交价':'标记价'}`;
  $('chart-empty').hidden=bars.length>0;
  $('chart-empty').textContent=seriesWarning||'等待币安历史 K 线';
  const historyStatus=loadingHistory?(template?'正在补齐 EMA 日线历史':'正在加载更早的 K 线'):
    historyRetryAt?(template?'历史加载失败，稍后自动重试':'历史加载失败，稍后可继续拖动重试'):
    historyDone&&bars.length&&oldestOffset()-offset<1?'已到最早可用 K 线':'';
  $('chart-foot').textContent=[(bars.length&&seriesWarning)||'底部滚轮缩放时间 · 右轴滚轮缩放价格 · 拖动平移 · 右键选价',
    historyStatus,showOi&&oiWarning?'OI 更新失败':showOi&&period==='1m'?'OI 每 5 分钟采样':''].filter(Boolean).join(' · ');
  if (!bars.length || width<120 || height<135) { scale=null; $('chart-ohlc').textContent=''; $('candle-change').textContent=''; $('chart-indicators').textContent=''; return; }
  const plot={left:12,right:width-98,top:16,axis:height-26};
  const volumeHeight=showVolume?62:0, oiHeight=showOi?80:0;
  plot.bottom=plot.axis-10-volumeHeight-oiHeight;
  if (plot.bottom-plot.top<35) { scale=null; return; }
  const slots=visible+rightPadding, step=(plot.right-plot.left)/slots;
  const latestTime=bars.at(-1).time;
  const maxTime=latestTime+(rightPadding+.5-offset)*tf, minTime=maxTime-slots*tf;
  const first=firstAt(bars,minTime-tf*.325), last=firstAt(bars,maxTime+tf*.325);
  const warmup=Math.max(0,first-Math.max(20,...maPeriods)+1);
  const data=bars.slice(warmup,last), start=first-warmup, end=data.length;
  if (end&&last===bars.length) data[end-1]=activeBar(data[end-1]);
  const rows=data.slice(start);
  const ma=!template&&indicators.ma?maPeriods.map(length=>overlays(data,start,end,length)):[];
  const boll=!template&&indicators.boll?overlays(data,start,end,20,true):[];
  const ema=template?emaChannels(template,first,last):[];
  if (rows.length&&template&&ema.some(({long})=>long.every(value=>value===null))) {
    $('chart-foot').textContent+=` · 部分通道需要更多日线历史，最长需 ${template.minimumBars} 根连续日线`;
  }
  const rangeRows=rows.length?rows:[bars[first]??bars.at(-1)];
  const rangeValues=rangeRows.flatMap(row=>[Number(row.low),Number(row.high)]);
  rangeValues.push(...ma.flat().filter(p=>p!==null),...boll.filter(Boolean).flatMap(row=>[row.lower,row.upper]));
  for (const {short,long} of ema) rangeValues.push(...short.filter(p=>p!==null),...long.filter(p=>p!==null));
  const rawLow=Math.min(...rangeValues), rawHigh=Math.max(...rangeValues), spread=rawHigh-rawLow || rawHigh*.004;
  const draft=$('chart-rule-form').hidden?null:Number($('alert-threshold').value)||null;
  const onSource=rules.filter(({rule,state})=>rule.key.priceKind===source&&rule.enabled&&!state.completed);
  const moving=drag?.rule ? drag : pendingLevel;
  const alertPrice=rule=>moving?.id===rule.id ? moving.threshold : rule.threshold;
  const near=[draft,...onSource.map(({rule})=>Number(alertPrice(rule)))].filter(p=>p!==null&&p>=rawLow-spread*.45&&p<=rawHigh+spread*.45);
  const fixedRange=drag?.rule||drag?.line?drag.axis:priceRange;
  const low=fixedRange?.low ?? Math.max(0,Math.min(rawLow,...near)-spread*.12);
  const high=fixedRange?.high ?? Math.max(rawHigh,...near)+spread*.13;
  const x=time=>plot.left+(time-minTime)/tf*step;
  const y=value=>plot.top+(high-value)*(plot.bottom-plot.top)/(high-low);
  scale={...plot,step,low,high,y};
  ctx.font='11px Consolas, monospace'; ctx.textBaseline='middle';
  for (let i=0;i<5;i++) {
    const p=high-(high-low)*i/4, lineY=y(p);
    drawLine(ctx,plot.left,lineY,plot.right,lineY,'#304044');
    ctx.fillStyle='#b1bfba'; ctx.fillText(formatPrice(chartPrice(p)),plot.right+7,lineY,87);
  }
  const tickCount=width<450?3:5;
  for (let i=0;i<tickCount;i++) {
    const slot=(minTime-latestTime)/tf+visible*i/(tickCount-1)+.5;
    const time=latestTime+Math.round(slot)*tf;
    const lineX=x(time);
    drawLine(ctx,lineX,plot.top,lineX,plot.axis,'#2b383a');
    ctx.fillStyle='#b1bfba'; ctx.fillText((period==='1d'?date:period==='1h'||period==='4h'||maxTime-minTime>=duration['1d']?calendar:clock).format(time),lineX-2,height-10,90);
  }
  drawLine(ctx,plot.right,plot.top,plot.right,plot.axis,'#48575a');
  drawLine(ctx,plot.left,plot.axis,plot.right,plot.axis,'#48575a');
  const volumeBottom=plot.bottom+volumeHeight+5;
  const maxVolume=Math.max(1,...rows.map(row=>Number(row.volume)));
  if (showVolume) {
    drawLine(ctx,plot.left,plot.bottom+6,plot.right,plot.bottom+6,'#3c4c4e');
    ctx.fillStyle='#b1bfba';ctx.fillText('成交量',plot.right+7,plot.bottom+19);
  }
  function drawSeries(values,color) {
    let started=false;
    ctx.strokeStyle=color; ctx.lineWidth=1.3; ctx.beginPath();
    values.forEach((value,i)=>{
      if (value===null) { started=false; return; }
      const nextX=x(rows[i].time), nextY=y(value);
      if (started) ctx.lineTo(nextX,nextY); else ctx.moveTo(nextX,nextY);
      started=true;
    });
    ctx.stroke();
  }
  function drawChannel({short,long,color}) {
    ctx.fillStyle=`${color}28`;
    let start=0;
    for (let end=0;end<=long.length;end++) {
      if (end<long.length&&long[end]!==null) continue;
      if (end-start>1) {
        ctx.beginPath();
        ctx.moveTo(x(rows[start].time),y(short[start]));
        for (let i=start+1;i<end;i++) ctx.lineTo(x(rows[i].time),y(short[i]));
        for (let i=end-1;i>=start;i--) ctx.lineTo(x(rows[i].time),y(long[i]));
        ctx.closePath(); ctx.fill();
      }
      start=end+1;
    }
    drawSeries(short,color);
    drawSeries(long,color);
  }
  const body=Math.max(1,Math.min(16,step*.65));
  ctx.save(); ctx.beginPath(); ctx.rect(plot.left,plot.top,plot.right-plot.left,plot.bottom-plot.top); ctx.clip();
  if (boll.length) for (const [field,color] of [['upper','#7096bc'],['mean','#62798e'],['lower','#7096bc']]) drawSeries(boll.map(value=>value?.[field]??null),color);
  ema.forEach(drawChannel);
  for (const row of rows) {
    const up=comparePrice(row.close,row.open)>=0, color=up?'#65d9b2':'#f98f89', lineX=x(row.time);
    const open=y(Number(row.open)), close=y(Number(row.close));
    drawLine(ctx,lineX,y(Number(row.high)),lineX,y(Number(row.low)),color);
    ctx.fillStyle=color;ctx.fillRect(lineX-body/2,Math.min(open,close),body,Math.max(1,Math.abs(open-close)));
  }
  ma.forEach((values,i)=>drawSeries(values,maColors[i]));
  ctx.restore();
  if (showVolume) {
    ctx.save(); ctx.beginPath(); ctx.rect(plot.left,plot.bottom,plot.right-plot.left,volumeHeight+6); ctx.clip();
    for (const row of rows) {
      const h=Number(row.volume)/maxVolume*41;
      ctx.fillStyle=comparePrice(row.close,row.open)>=0?'#307964':'#814c49';
      ctx.fillRect(x(row.time)-body/2,volumeBottom-h,body,h);
    }
    ctx.restore();
  }
  const labels=ma.map((_,i)=>{ const el=element('span',`MA${maPeriods[i]}`); el.style.color=maColors[i]; return el; });
  if (boll.length) labels.push(element('span','BOLL 20 / 2'));
  for (const {periods,color,long} of ema) {
    if (!long.some(value=>value!==null)) continue;
    const label=element('span',`EMA ${periods.join('/')}`);
    label.style.color=color;
    labels.push(label);
  }
  $('chart-indicators').replaceChildren(...labels);

  if (showOi) {
    const top=plot.bottom+volumeHeight+11;
    drawLine(ctx,plot.left,top,plot.right,top,'#465960');
    const points=interest.slice(firstAt(interest,minTime),firstAt(interest,maxTime+1));
    ctx.fillStyle='#c3b9ff';
    const p=points.at(-1);
    ctx.fillText(p?`OI 未平仓量 · ${formatPrice(p.value)} ${instrument.baseAsset ?? ''}`:'OI 未平仓量 · 暂无数据',plot.left+4,top+13);
    if (points.length>1) {
      const values=points.map(point=>Number(point.value)), min=Math.min(...values), max=Math.max(...values);
      let previous=null;
      for (const [i,point] of points.entries()) {
        const at={x:x(point.time),y:top+22+(max-values[i])*(plot.axis-top-29)/(max-min||1),time:point.time};
        if (previous&&point.time-previous.time<=Math.max(tf,300000)*1.5) drawLine(ctx,previous.x,previous.y,at.x,at.y,'#aa9af0');
        previous=at;
      }
    }
  }
  const occupied=[];
  function level(p,text,color,dash,rule=null) {
    if (p<low||p>high) return;
    const lineY=y(p);
    drawLine(ctx,plot.left,lineY,plot.right,lineY,color,dash);
    let labelY=lineY;
    while (occupied.some(at=>Math.abs(labelY-at)<16) && labelY<plot.bottom+12) labelY+=16;
    if (labelY>plot.bottom+12) return;
    occupied.push(labelY);
    const left=plot.right+3, top=labelY-8, width=Math.min(91,ctx.measureText(text).width+12);
    if (labelY!==lineY) drawLine(ctx,plot.right,lineY,left,labelY,color);
    ctx.fillStyle=color;ctx.fillRect(left,top,width,16);
    ctx.fillStyle='#121819';ctx.fillText(text,plot.right+8,labelY,82);
    if (rule) ruleLabels.push({left,top,right:left+width,bottom:top+16,rule});
  }
  for (const {rule} of onSource) {
    const threshold=alertPrice(rule);
    level(Number(threshold),formatPrice(threshold),moving?.id===rule.id||editing?.id===rule.id?'#edbc77':'#b9986d',[3,5],rule);
  }
  if (draft&&draft>0&&!onSource.some(({rule})=>rule.id===editing?.id&&Number(rule.threshold)===draft)) {
    level(draft,formatPrice($('alert-threshold').value),'#edbc77',[5,4]);
  }
  const live=freshQuote();
  if (live&&latestTime<=maxTime) level(Number(live.price),formatPrice(live.price),'#76c9af',[2,4]);
  let focus=rows.at(-1);
  if (focus&&cursor&&cursor.x>=plot.left&&cursor.x<=plot.right&&cursor.y>=plot.top&&cursor.y<=plot.bottom) {
    focus=rows.reduce((a,b)=>Math.abs(x(a.time)-cursor.x)<Math.abs(x(b.time)-cursor.x)?a:b);
    const focusX=x(focus.time), crossX=Math.abs(focusX-cursor.x)<=step/2?focusX:cursor.x;
    drawLine(ctx,crossX,plot.top,crossX,plot.axis,'#758783',[3,4]);
    drawLine(ctx,plot.left,cursor.y,plot.right,cursor.y,'#758783',[3,4]);
  }
  if (!focus) { $('chart-ohlc').textContent=''; $('chart-ohlc').title=''; $('candle-change').textContent=''; return; }
  $('chart-ohlc').textContent=[['开',focus.open],['高',focus.high],['低',focus.low],['收',focus.close]].map(([label,p])=>`${label} ${formatPrice(p)}`).join('　');
  $('chart-ohlc').title=timeText(focus.time);
  const change=(Number(focus.close)/Number(focus.open)-1)*100;
  $('candle-change').textContent=`涨跌 ${percentage(change)}`;
  $('candle-change').className=tone(change);
}

function explainDraft() {
  if ($('chart-rule-form').hidden) return null;
  const threshold=$('alert-threshold').value.trim(), current=freshQuote();
  const condition=$('alert-condition').value;
  const cross=condition!=='reach', repeat=$('alert-mode').value==='repeat';
  $('alert-mode').options[1].textContent=cross?'每次穿越':'重复';
  const cooldown=$('alert-cooldown');
  cooldown.disabled=saving||cross||!repeat;
  cooldown.parentElement.hidden=cross;
  let direction=null;
  try {
    comparePrice(threshold,threshold);
    if (cross) direction=condition==='cross-up'?'up':'down';
    else if (editing?.condition!=='cross'&&editing&&comparePrice(threshold,editing.threshold)===0) direction=editing.direction;
    else if (current) direction=directionAtPrice(threshold,current.price);
  } catch { /* 输入未完成。 */ }
  const reference=current?`参考现价 ${formatPrice(current.price)}。`:'等待当前价格来源的新鲜报价。';
  let hint;
  if (cross) {
    const side=condition==='cross-up'?'下方':'上方';
    hint=`价格须从线的${side}触及或越过警报线。启用和重连后的首笔只建立基准。`;
  } else if (direction) {
    const side=direction==='up'?'向上到价 ≥':'向下到价 ≤';
    hint=`${side}。启用或调整触发条件后，首笔有效报价已到价会提醒一次。`;
  } else {
    hint='请输入高于或低于参考现价的警报价。';
  }
  $('alert-hint').textContent=reference+' '+hint;
  return direction;
}

const defaultCooldownSeconds=5;
function defaultThreshold(side) {
  const q=freshQuote();
  if (!q) return '';
  const p=Number(q.price), units=10**(-pricePlaces());
  return chartPrice(side==='down'?Math.max(units,Math.min(p*.994,p-units)):Math.max(p*1.006,p+units));
}
function newDraft(side='up', threshold=null) {
  resetAutoSave();
  editing=null; draftId=crypto.randomUUID(); draftSide=side; draftTouched=threshold!==null;
  $('chart-rule-form').hidden=false; $('alert-actions').hidden=true;
  $('alert-name').value=`${pair(instrument)} 价格警报`;
  $('alert-threshold').value=threshold ?? defaultThreshold(side);
  $('alert-condition').value='reach'; $('alert-mode').value='repeat'; $('alert-cooldown').value=defaultCooldownSeconds;
  $('alert-notification').value='island'; $('alert-cancel').textContent='取消';
  message('alert-error'); message('alert-status','修改有效设置后自动保存。');
  renderRules(); explainDraft(); draw(); $('alert-threshold').focus();
  if (threshold!==null) queueDraftSave();
}
function editRule(rule) {
  resetAutoSave();
  editing=rule; draftId=rule.id; draftTouched=true;
  if (source!==rule.key.priceKind) { source=rule.key.priceKind; $('chart-source').value=source; void loadSeries(true); }
  $('chart-rule-form').hidden=false; $('alert-actions').hidden=false;
  $('alert-name').value=rule.name; $('alert-threshold').value=rule.threshold;
  $('alert-condition').value=rule.condition==='cross'?`cross-${rule.direction}`:'reach';
  $('alert-mode').value=rule.mode; $('alert-cooldown').value=rule.condition==='cross'?defaultCooldownSeconds:rule.cooldownMs/1000;
  $('alert-notification').value=rule.notification?rule.notificationChannel??'windows':'none';
  showSavedRule(rule, '修改设置后自动保存。');
}
function showSavedRule(rule, status='已自动保存') {
  editing=rule; draftId=rule.id;
  $('alert-actions').hidden=false;
  $('alert-cancel').textContent='关闭';
  $('alert-toggle').textContent=rule.enabled?'暂停':'重新启用';
  message('alert-error'); message('alert-status',status);
  renderRules(); explainDraft(); draw();
}
function clearDraft() {
  resetAutoSave();
  editing=null; draftId=null; $('chart-rule-form').hidden=true; $('pick-alert').hidden=true;
  renderRules(); draw();
}
function renderRules() {
  $('rules-count').textContent=`${rules.length} 条`;
  $('instrument-rules').replaceChildren();
  for (const entry of rules) {
    const {rule}=entry, button=element('button');
    button.type='button'; button.disabled=saving; button.dataset.selected=String(rule.id===editing?.id);
    const condition=rule.condition==='cross'?(rule.direction==='up'?'上穿':'下穿'):(rule.direction==='up'?'≥':'≤');
    button.append(element('span',rule.key.priceKind==='mark'?'标记':'成交'),element('strong',`${condition} ${formatPrice(rule.threshold)}`),element('small',ruleStatus(entry)));
    button.onclick=()=>void afterDraftSave(()=>{
      const latest=rules.find(entry=>entry.rule.id===rule.id)?.rule;
      if (latest) editRule(latest);
    });
    $('instrument-rules').append(button);
  }
  if (!rules.length) $('instrument-rules').textContent='暂无警报';
}
async function readRules() {
  const request=++rulesRequest;
  const listed=await host.request('alerts.list');
  if (request!==rulesRequest) return;
  rules=listed.filter(({rule})=>marketId(rule.key)===marketId(instrument));
  renderRules(); draw();
}
function confirmAction(text) {
  const dialog=$('rule-confirm'); $('rule-confirm-text').textContent=text; dialog.returnValue='cancel';
  return new Promise(resolve=>{ dialog.addEventListener('close',()=>resolve(dialog.returnValue==='confirm'),{once:true}); dialog.showModal(); });
}
const ruleForm=$('chart-rule-form');
function resetAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer=null; savePending=false; waitingForQuote=false;
}
function queueDraftSave() {
  if (host.preview||ruleForm.hidden||saving) return;
  resetAutoSave();
  savePending=true;
  message('alert-error');
  message('alert-status','待自动保存…');
  explainDraft(); draw();
  if (!drag) autoSaveTimer=setTimeout(()=>void saveDraft(),180);
}
async function afterDraftSave(action) {
  if (saving) return;
  if (autoSaveTimer!==null&&!await saveDraft()) return;
  action();
}
$('alert-up').onclick=()=>void afterDraftSave(()=>newDraft());
$('alert-down').onclick=()=>void afterDraftSave(()=>newDraft('down'));
$('alert-cancel').onclick=()=>editing?void afterDraftSave(clearDraft):clearDraft();
ruleForm.oninput=event=>{
  if (!(event.target instanceof HTMLInputElement)) return;
  if (event.target.id==='alert-threshold') draftTouched=true;
  resetAutoSave();
  message('alert-error'); message('alert-status','完成输入后自动保存。');
  explainDraft();
  if (event.target.id==='alert-threshold') draw();
};
ruleForm.onchange=queueDraftSave;
ruleForm.onkeydown=event=>{
  if (event.key==='Enter'&&!event.isComposing&&event.target instanceof HTMLInputElement) {
    event.preventDefault();
    queueDraftSave();
  }
};
ruleForm.onsubmit=event=>event.preventDefault();
function lockAlertControls(locked) {
  for (const control of ruleForm.elements) control.disabled=locked;
  for (const id of ['alert-up','alert-down','chart-source','pick-alert','all-rules','chart-history']) $(id).disabled=locked;
  renderRules(); explainDraft();
}
async function saveAlert(action,errorId='alert-error') {
  if (saving) return false;
  saving=true;
  message(errorId);
  lockAlertControls(true);
  let accepted=false;
  try { await action(); accepted=true; }
  catch(error) { message(errorId,error.message); }
  try { await readRules(); }
  catch(error) { if (!$(errorId).textContent) fail(error); }
  finally { saving=false; lockAlertControls(false); }
  return accepted;
}
async function saveDraft() {
  clearTimeout(autoSaveTimer); autoSaveTimer=null;
  if (!savePending||saving||drag||ruleForm.hidden) return false;
  const direction=explainDraft();
  const mode=$('alert-mode').value, cross=$('alert-condition').value!=='reach';
  const channel=$('alert-notification').value;
  const name=$('alert-name').value.trim(), cooldown=$('alert-cooldown');
  const threshold=$('alert-threshold').value.trim();
  savePending=false;
  if (!name||name.length>80||(!cooldown.disabled&&!cooldown.validity.valid)) {
    message('alert-status');
    message('alert-error','请填写规则名称和有效的冷却秒数。');
    return false;
  }
  if (!direction) {
    if (!cross&&!freshQuote()) {
      waitingForQuote=true; savePending=true;
      message('alert-status','等待新鲜报价后自动保存。');
    } else {
      message('alert-status');
      message('alert-error','请填写有效警报价。到价警报的价位须不同于现价。');
    }
    return false;
  }
  waitingForQuote=false;
  const previous=editing;
  const rule={id:draftId,revision:(previous?.revision??0)+1,name,key:quoteKey(instrument,source),direction,threshold,mode,cooldownMs:mode==='repeat'&&!cross?Number(cooldown.value)*1000:0,enabled:previous?.enabled??true,notification:channel!=='none',sound:previous?.sound??false};
  if (cross) rule.condition='cross';
  if (channel==='island') rule.notificationChannel='island';
  if (previous&&comparePrice(threshold,previous.threshold)===0&&
      ['name','direction','condition','mode','cooldownMs','notification','notificationChannel'].every(field=>previous[field]===rule[field])) {
    message('alert-status','已自动保存');
    return true;
  }
  message('alert-status','正在保存…');
  const accepted=await saveAlert(async()=>{
    const saved=await host.request('alerts.save',{rule,expectedRevision:previous?.revision??null});
    rulesRequest++;
    showSavedRule(saved);
  });
  if (!accepted) message('alert-status','本次修改未保存，调整后将再试。');
  return accepted;
}
$('alert-toggle').onclick=()=>void afterDraftSave(()=>void saveAlert(async()=>{
  const rule=editing;
  if (!rule || !rule.enabled&&!(await confirmAction(rule.condition==='cross'?'重新启用后将用首笔有效报价建立基准，等待下一次指定方向的穿越。':'重新启用后，第一笔有效报价已经满足条件时会提醒一次。'))) return;
  const updated=await host.request('alerts.save',{rule:{...rule,enabled:!rule.enabled,revision:rule.revision+1},expectedRevision:rule.revision});
  editRule(updated);
}));
$('alert-delete').onclick=()=>void afterDraftSave(()=>void saveAlert(async()=>{
  const rule=editing;
  if (rule&&await confirmAction('删除此规则？已有触发历史保留。')) { await host.request('alerts.delete',{id:rule.id,revision:rule.revision}); clearDraft(); }
}));

$('chart-source').onchange=()=>{
  const requested=$('chart-source').value;
  $('chart-source').value=source;
  void afterDraftSave(()=>{ source=requested; $('chart-source').value=source; clearDraft(); void loadSeries(true); });
};
chartPeriod.onchange=()=>{
  if (chartPeriod.disabled||!Object.hasOwn(duration,chartPeriod.value)||chartPeriod.value===period) return;
  period=chartPeriod.value;
  updateTemplateControls();
  void rememberChartView();
  void loadSeries(true);
};
chartTemplate.onchange=()=>{
  if (chartTemplate.disabled||chartTemplate.value===templateId) return;
  templateId=chartTemplate.value;
  const interval=selectedTemplate()?.interval;
  const switched=Boolean(interval&&interval!==period);
  if (switched) period=chartPeriod.value=interval;
  updateTemplateControls();
  void rememberChartView();
  if (switched) void loadSeries(true);
  else { priceRange=null; draw(); void loadOlder(true); }
};
$('chart-reset').onclick=()=>{ resetView(); draw(); };
const point=event=>{ const rect=canvas.getBoundingClientRect(); return {x:event.clientX-rect.left,y:event.clientY-rect.top}; };
const ruleAt=({x,y})=>ruleLabels.find(label=>x>=label.left&&x<=label.right&&y>=label.top&&y<=label.bottom)?.rule;
function chartZone({x,y}) {
  if (!scale||y<scale.top) return '';
  if (x>=scale.right&&y<=scale.bottom) return 'price';
  if (x<scale.left||x>scale.right) return '';
  return y>=scale.axis?'time':'plot';
}
function updateChartCursor(at) {
  const zone=chartZone(at);
  const style=drag?.rule||drag?.line||ruleAt(at)||zone==='price'?'price':drag?'pan':zone==='time'?'time':'';
  if (style) canvas.dataset.chartCursor=style; else canvas.removeAttribute('data-chart-cursor');
}
function pointPrice(y,axis=scale) { return axis.high-(axis.high-axis.low)*clamp((y-axis.top)/(axis.bottom-axis.top),0,1); }
function setPriceRange(low,span) {
  const bottom=Math.max(0,low), top=bottom+span;
  if (Number.isFinite(top)&&top>bottom) priceRange={low:bottom,high:top};
}
function draggedThreshold(gesture,clientY) {
  return chartPrice(pointPrice(gesture.axis.y(Number(gesture.rule.threshold))+clientY-gesture.clientY,gesture.axis));
}
async function saveDraggedRule(rule,threshold) {
  if (saving || source!==rule.key.priceKind) return;
  let direction=rule.direction;
  try {
    if (comparePrice(threshold,rule.threshold)===0) return;
    if (rule.condition!=='cross') {
      const current=freshQuote();
      if (!current) throw new Error('等待当前价格来源的新鲜报价，稍后可重新拖动警报。');
      direction=directionAtPrice(threshold,current.price);
      if (!direction) throw new Error('警报价位须高于或低于当前价格。');
    }
  } catch(error) { fail(error); draw(); return; }
  pendingLevel={id:rule.id,threshold};
  message('chart-save-status','正在保存警报价位…');
  draw();
  const accepted=await saveAlert(async()=>{
    const saved=await host.request('alerts.save',{rule:{...rule,threshold,direction,revision:rule.revision+1},expectedRevision:rule.revision});
    rulesRequest++;
    rules=rules.map(entry=>entry.rule.id===saved.id?{rule:saved,state:{completed:false,pending:false}}:entry);
    if (editing?.id===rule.id&&editing.revision===rule.revision) {
      if ($('alert-threshold').value.trim()===rule.threshold) $('alert-threshold').value=saved.threshold;
      editing=saved;
    }
    renderRules();
  },'chart-error');
  pendingLevel=null;
  message('chart-save-status',accepted?`警报价位已保存 · ${formatPrice(threshold)}`:'');
  draw();
}
canvas.oncontextmenu=event=>{
  event.preventDefault(); const at=point(event);
  if (chartZone(at)!=='plot'||at.y>scale.bottom) return;
  draftPrice=chartPrice(pointPrice(at.y));
  const menu=$('pick-alert'); menu.hidden=false;
  menu.style.left=`${Math.max(4,Math.min(at.x+4,canvas.clientWidth-menu.offsetWidth-4))}px`; menu.style.top=`${at.y+3}px`;
};
$('pick-alert').onclick=()=>{ const price=draftPrice; $('pick-alert').hidden=true; void afterDraftSave(()=>newDraft('up',price)); };
canvas.addEventListener('wheel',event=>{
  const at=point(event), zone=chartZone(at);
  if (!zone) return;
  event.preventDefault();
  const direction=Math.sign(event.deltaY);
  if (drag||!direction) return;
  if (zone==='price') {
    const anchor=pointPrice(at.y), span=scale.high-scale.low;
    const minSpan=Math.max(10**(-pricePlaces()),Number(instrument.tickSize)||0,anchor*1e-10)*4;
    const nextSpan=Math.max(Math.min(span,minSpan),span*1.15**direction);
    setPriceRange(anchor-(anchor-scale.low)/span*nextSpan,nextSpan);
  } else {
    const previous=visible, fraction=(at.x-scale.left)/(scale.right-scale.left);
    visible=clamp(previous+direction*7,15,160);
    offset=clamp(offset+(1-fraction)*(previous-visible),1-visible,oldestOffset());
  }
  $('pick-alert').hidden=true; draw();
  if (zone!=='price') void loadOlder();
},{passive:false});
canvas.onpointerdown=event=>{
  if (event.button!==0||!scale||drag) return;
  const at=point(event), p=Number($('alert-threshold').value);
  const rule=ruleAt(at), zone=chartZone(at);
  if (!rule&&!zone) return;
  const onPricePlot=zone==='plot'&&at.y<=scale.bottom;
  const line=!rule&&onPricePlot&&!ruleForm.hidden&&p>=scale.low&&p<=scale.high&&p>0&&Math.abs(at.y-scale.y(p))<7;
  if ((rule||line)&&(saving||autoSaveTimer!==null)) return;
  drag={pointerId:event.pointerId,x:at.x,clientY:event.clientY,axis:scale,zone,vertical:zone==='price'||onPricePlot,
    rule,id:rule?.id,threshold:rule?.threshold,line,draftBefore:$('alert-threshold').value};
  if (rule) { message('chart-error'); message('chart-save-status'); }
  updateChartCursor(at);
  canvas.setPointerCapture(event.pointerId); $('pick-alert').hidden=true;
};
canvas.onpointermove=event=>{
  if (drag&&event.pointerId!==drag.pointerId) return;
  cursor=point(event);
  updateChartCursor(cursor);
  if (drag?.rule) {
    if (Math.abs(event.clientY-drag.clientY)>=3 || drag.threshold!==drag.rule.threshold) drag.threshold=draggedThreshold(drag,event.clientY);
  }
  else if (drag?.line) { $('alert-threshold').value=chartPrice(pointPrice(cursor.y,drag.axis)); explainDraft(); }
  else if (drag) {
    const dx=cursor.x-drag.x, dy=event.clientY-drag.clientY;
    if (drag.zone!=='price'&&dx) offset=clamp(offset+dx/drag.axis.step,1-visible,oldestOffset());
    drag.x=cursor.x;
    if (drag.vertical&&(drag.priceMoved||Math.abs(dy)>=3)) {
      const {low,high,top,bottom}=drag.axis, span=high-low;
      drag.priceMoved=true;
      setPriceRange(low+dy*span/(bottom-top),span);
    }
    if (drag.zone!=='price'&&dx>0) void loadOlder();
  }
  draw();
};
canvas.onpointerup=event=>{
  if (event.pointerId!==drag?.pointerId) return;
  const gesture=drag, at=point(event); drag=null;
  if (gesture.rule&&Math.abs(event.clientY-gesture.clientY)>=3) {
    const threshold=draggedThreshold(gesture,event.clientY);
    if (savePending&&editing?.id===gesture.rule.id) {
      $('alert-threshold').value=threshold; draftTouched=true; queueDraftSave();
    } else {
      void saveDraggedRule(gesture.rule,threshold).then(()=>{ if (savePending) queueDraftSave(); });
    }
  }
  else if (gesture.line&&$('alert-threshold').value!==gesture.draftBefore) { draftTouched=true; queueDraftSave(); }
  else if (savePending) queueDraftSave();
  updateChartCursor(at);
  draw();
};
canvas.onpointerleave=()=>{ cursor=null; if (!drag) canvas.removeAttribute('data-chart-cursor'); draw(); };
function cancelPointer(event) {
  if (event.pointerId!==drag?.pointerId) return;
  if (drag.line) $('alert-threshold').value=drag.draftBefore;
  drag=null; canvas.removeAttribute('data-chart-cursor'); draw();
  if (savePending) queueDraftSave();
}
canvas.onpointercancel=canvas.onlostpointercapture=cancelPointer;
new ResizeObserver(draw).observe($('chart-stage'));

await host.ready();
if (host.preview) $('chart-empty').textContent='隔离试加载';
else {
  const restoredView=restoreChartView();
  void host.subscribe(isPerp?[quoteKey(instrument),quoteKey(instrument,'mark')]:[quoteKey(instrument)],snapshot=>{
    if (snapshot.error&&!snapshot.quotes) { fail(snapshot.error); return; }
    sourceNow=snapshot.marketStatus?.[market]?.sourceNow??0;
    quotes=new Map(snapshot.quotes.map(q=>[quoteId(q.key),q]));
    if (!$('chart-rule-form').hidden&&!editing&&!draftTouched&&!$('alert-threshold').value&&freshQuote()) $('alert-threshold').value=defaultThreshold(draftSide);
    if (waitingForQuote&&freshQuote()) queueDraftSave();
    explainDraft(); draw();
  }).catch(fail);
  try {
    const settings=await host.request('settings.get');
    maPeriods=parsePeriods(settings.maPeriods??'')??defaultMa;
    const resolveInstrument=async()=>{
      const list=await host.request('market.instruments');
      instrument=list.find(item=>item.symbol===symbol&&item.market===market)??instrument;
      $('chart-title').textContent=pair(instrument);
    };
    await Promise.all([resolveInstrument(),readRules()]);
  } catch(error) { fail(error); }
  await restoredView;
  seriesReady=true;
  chartPeriod.disabled=chartTemplate.disabled=false;
  void loadSeries();
  void pollLive();
  setInterval(()=>void pollLive(),1000);
  setInterval(()=>{
    if (document.hidden) return;
    refreshInterest();
    if (Date.now()>=nextSeriesAt&&(!restSynced||source==='mark'||Date.now()-lastLiveAt>=60_000||gapStart!==null||!bars.length)) void loadSeries();
    void loadOlder(true);
  },5000);
  document.addEventListener('visibilitychange',()=>{
    if (document.hidden) releaseLive();
    else { void pollLive(); refreshInterest(); }
  });
  window.addEventListener('pagehide',releaseLive);
  setInterval(()=>void readRules().catch(fail),7500);
}
