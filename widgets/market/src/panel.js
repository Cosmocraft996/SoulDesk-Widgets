import {connectHost} from './host.js';
import {observeMinute} from './price.js';
import {$,marketId,marketName,pair,quoteKey,quoteId,percentage,tone,timeText,element,canvasContext,drawLine,formatQuote} from './market-ui.js';

const ranges = [
  {hours:1,label:'1小时',short:'1h',period:'1m',minutes:1}, {hours:4,label:'4小时',short:'4h',period:'5m',minutes:5},
  {hours:6,label:'6小时',short:'6h',period:'5m',minutes:5}, {hours:8,label:'8小时',short:'8h',period:'5m',minutes:5},
  {hours:12,label:'12小时',short:'12h',period:'15m',minutes:15}, {hours:24,label:'24小时',short:'24h',period:'30m',minutes:30},
  {hours:72,label:'3天',short:'3d',period:'1h',minutes:60}, {hours:168,label:'7天',short:'7d',period:'4h',minutes:240},
];
const sizeWidths={small:320,medium:430,large:540};
const statusText={connected:'在线',connecting:'连接中',reconnecting:'恢复中',idle:'未订阅',stopped:'已停止'};
const host = await connectHost();
const isDetail=new URLSearchParams(location.search).get('role')==='details';
document.body.className='market-body';
document.body.innerHTML=`<main class="market-panel"><div class="market-top"><span>币安</span><button id="panel-more" type="button" aria-label="警报和历史" aria-expanded="false">⋯</button></div>
  <div class="panel-tools"><h1 id="watch-title">市场观察</h1><div class="tool-row"><button id="show-list" type="button">列表</button><button id="show-grid" type="button">网格</button><button class="market-accent" id="watch-add" type="button">＋ 添加</button></div></div>
  <div class="range-bar"><label>走势 <select id="watch-range" aria-label="走势区间"></select></label><select id="watch-size" aria-label="组件尺寸"><option value="" disabled>自定义</option><option value="small">小</option><option value="medium">中</option><option value="large">大</option></select><span id="market-status">等待行情</span></div>
  <div id="panel-menu" class="panel-menu" hidden><button data-detail="rules" type="button">全部警报</button><button data-detail="history" type="button">触发历史</button></div>
  <div id="panel-message" class="market-message" role="status" hidden></div>
  <div id="watch-rows" class="watch-rows" aria-label="自选标的"></div><div class="market-footer"><span id="watch-count"></span><span>虚线 · 警报价位</span></div></main>
  <dialog id="watch-editor" class="market-dialog"><form id="watch-form"><div class="dialog-head"><h2 id="watch-editor-title"></h2><button id="watch-cancel" type="button">关闭</button></div>
  <label>搜索<input id="watch-search" placeholder="交易对或基础资产" maxlength="40" autocomplete="off"></label>
  <label>市场<select id="watch-market"><option value="">全部</option><option value="spot">现货</option><option value="usd_m">USDT 永续</option></select></label>
  <label>交易对<select id="watch-choice" required></select></label><label>显示别名<input id="watch-alias" maxlength="32" placeholder="可选" autocomplete="off"></label>
  <p id="watch-hint" class="market-hint"></p><p id="watch-error" class="market-message" role="alert" hidden></p><div class="tool-row"><button id="move-up" type="button">上移</button><button id="move-down" type="button">下移</button><button id="watch-remove" type="button">移出</button><button id="watch-save" class="market-accent" type="submit">保存</button></div></form></dialog>`;

const message = (id,text='') => { $(id).textContent=text; $(id).hidden=!text; };
const report = error => message('panel-message',error?.message ?? String(error ?? ''));
let items=[], catalog=new Map(), rules=[], quotes=new Map(), marketTickers={}, marketStatus={};
let minuteQuotes=new Map();
let layout='list', range=ranges[1], unsubscribe, editing=null, dragging=null, saving=false, refreshing=false, quoteRun=0;
const history=new Map();
const historyPending=new Set();
let scrollHistoryTimer, historyOptions=true;
const rowMap=new Map();
const root=$('watch-rows');
const selectedItem = () => catalog.get($('watch-choice').value) ?? items.find(item=>marketId(item)===$('watch-choice').value);

for (const option of ranges) $('watch-range').append(new Option(option.label,String(option.hours)));
$('watch-size').hidden=isDetail;
function paintControls() {
  $('show-list').setAttribute('aria-pressed',layout==='list');
  $('show-grid').setAttribute('aria-pressed',layout==='grid');
  $('watch-range').value=String(range.hours);
}
function setSizeLabel() {
  const width=document.documentElement.clientWidth;
  $('watch-size').value=Object.keys(sizeWidths).find(size=>Math.abs(width-sizeWidths[size])<=3) ?? '';
  document.body.dataset.density=width<360?'small':width>=500?'large':'medium';
}
function setMenu(open) { $('panel-menu').hidden=!open; $('panel-more').setAttribute('aria-expanded',open); }
$('panel-more').onclick=()=>setMenu($('panel-menu').hidden);
document.addEventListener('click',event=>{ if (!event.target.closest('#panel-menu,#panel-more')) setMenu(false); });
document.addEventListener('keydown',event=>{ if (event.key==='Escape') setMenu(false); });
for (const button of document.querySelectorAll('[data-detail]')) button.onclick=()=>{
  setMenu(false);
  void host.request('view.openDetails',{page:button.dataset.detail}).catch(report);
};
$('watch-size').onchange=async()=>{
  const control=$('watch-size'); control.disabled=true;
  try { await host.request('view.resizeMarket',{size:control.value}); report(); }
  catch (error) { report(error); }
  finally { control.disabled=false; setSizeLabel(); }
};

async function setLayout(next) {
  if (layout===next) return;
  try { await host.request('market.preferences',{layout:next}); layout=next; paintControls(); buildRows(); report(); }
  catch (error) { report(error); }
}
$('show-list').onclick=()=>void setLayout('list');
$('show-grid').onclick=()=>void setLayout('grid');
$('watch-range').onchange=async()=>{
  const next=ranges.find(option=>option.hours===Number($('watch-range').value));
  if (!next || next===range) return;
  $('watch-range').disabled=true;
  try {
    await host.request('market.preferences',{rangeHours:next.hours});
    range=next; history.clear(); paintRows(); report(); void loadHistory();
  } catch (error) { report(error); }
  finally { $('watch-range').disabled=false; paintControls(); }
};

function buildRows() {
  root.classList.toggle('watch-grid',layout==='grid'); root.replaceChildren(); rowMap.clear();
  for (const item of items) {
    const id=marketId(item);
    const row=element('article',undefined,'watch-row'); row.dataset.item=id;
    row.innerHTML=`<button type="button" class="watch-grip" draggable="true" aria-label="拖动排序或打开编辑">⠿</button>
      <div class="watch-name"><b></b><small class="watch-market"></small><small class="daily-change"><span>24h</span> <strong>—</strong></small></div>
      <button type="button" class="watch-trend"><canvas aria-hidden="true"></canvas><span class="trend-status" hidden></span></button>
      <div class="watch-value"><div class="last-price quote-value">—</div><div class="range-change"><span></span> <strong>—</strong></div></div>
      <div class="watch-actions"><button type="button" class="edit-watch" aria-label="编辑自选">⋯</button></div>`;
    const by=selector=>row.querySelector(selector);
    by('.watch-grip').onclick=by('.edit-watch').onclick=()=>openEditor(id);
    const chart=by('.watch-trend');
    chart.onclick=()=>void host.request('view.openDetails',{page:`market-chart:${id}`}).catch(report);
    rowMap.set(id,{row,name:by('b'),market:by('.watch-market'),daily:by('.daily-change strong'),last:by('.last-price'),range:by('.range-change strong'),rangeLabel:by('.range-change span'),canvas:by('canvas'),trendStatus:by('.trend-status'),chart});
    root.append(row);
  }
  if (!items.length) root.append(element('p','从「添加」选择币安现货或 USDT 永续。','watch-empty'));
  $('watch-count').textContent=`${items.length} / 20 个自选`;
  paintRows();
}

function drawTrend(canvas,bars,latest,active) {
  const context=canvasContext(canvas);
  if (!context || !bars.length) return;
  const {ctx,width,height}=context;
  const first=bars[0];
  const values=[Number(first.open),...bars.map(bar=>Number(bar.close))];
  if (latest) values[values.length-1]=Number(latest);
  const rawLow=Math.min(...values),rawHigh=Math.max(...values);
  const span=rawHigh-rawLow || rawHigh*.004;
  const near=active.map(({rule})=>Number(rule.threshold)).filter(p=>p>=rawLow-span*.5&&p<=rawHigh+span*.5);
  const low=Math.min(rawLow,...near)-span*.12,high=Math.max(rawHigh,...near)+span*.12;
  const x=i=>2+(width-4)*i/(values.length-1);
  const y=p=>height-4-(height-8)*(p-low)/(high-low);
  const color=values.at(-1)>=values[0]?'#74dabb':'#fa9a92';
  ctx.strokeStyle=color; ctx.lineWidth=1.4; ctx.beginPath();
  values.forEach((value,i)=>i?ctx.lineTo(x(i),y(value)):ctx.moveTo(x(i),y(value))); ctx.stroke();
  ctx.lineTo(width-2,height); ctx.lineTo(2,height); ctx.closePath(); ctx.fillStyle=`${color}18`; ctx.fill();
  let above=0, below=0;
  for (const {rule} of active) {
    const value=Number(rule.threshold);
    if (value>high) { above++; continue; }
    if (value<low) { below++; continue; }
    drawLine(ctx,1,y(value),width-1,y(value),'#e9bc83',rule.key.priceKind==='mark'?[2,3]:[5,3]);
  }
  ctx.fillStyle='#e9bc83'; ctx.font='9px Consolas, monospace'; ctx.textAlign='right';
  if (above) ctx.fillText(`↑${above}`,width-2,9);
  if (below) ctx.fillText(`↓${below}`,width-2,height-1);
}

function paintRows() {
  for (const item of items) {
    const id=marketId(item), row=rowMap.get(id), instrument=catalog.get(id) ?? item;
    if (!row) continue;
    row.name.textContent=item.alias || pair(instrument);
    row.name.title=pair(instrument);
    row.market.textContent=`${item.alias ? `${pair(instrument)} · ` : ''}${marketName(instrument)}`;
    if (instrument.status && instrument.status!=='TRADING') row.market.title=`币安状态 ${instrument.status}`;
    const last=quotes.get(`${id}:last`), ticker=marketTickers[id];
    formatQuote(row.last,last,minuteQuotes.get(`${id}:last`)?.direction ?? null);
    const daily=typeof ticker?.changePercent==='string'?Number(ticker.changePercent):NaN;
    row.daily.textContent=percentage(daily); row.daily.className=ticker?.fresh?tone(daily):'stale';
    row.daily.title=ticker?`${ticker.fresh?'':'上次统计 · '}滚动24小时 · ${timeText(ticker.time)}`:'等待24小时统计';
    const active=rules.filter(({rule,state})=>rule.enabled&&!state.completed&&marketId(rule.key)===id);
    const series=history.get(id);
    const from=(marketStatus[item.market]?.sourceNow ?? series?.at ?? Date.now())-range.hours*3600000;
    const bars=series?.rows.filter(bar=>bar.closeTime>=from) ?? [];
    const end=last?.quality==='fresh'?last.price:null;
    const change=bars.length ? (Number(end ?? bars.at(-1).close)/Number(bars[0].open)-1)*100 : NaN;
    row.rangeLabel.textContent=range.short;
    row.range.textContent=percentage(change); row.range.className=series?.error?'stale':tone(change);
    row.range.title='按对应区间起始 K 线开盘价计算';
    row.trendStatus.hidden=bars.length>0;
    row.trendStatus.textContent=series?.error?'走势暂不可用':'加载走势';
    row.chart.title=['打开 K 线与警报',series?.error?(bars.length?'上次走势 · 更新失败':'走势暂不可用'):'',...active.map(({rule})=>`${rule.key.priceKind==='mark'?'标记':'成交'} ${rule.direction==='up'?'≥':'≤'} ${rule.threshold}`)].filter(Boolean).join(' · ');
    row.chart.setAttribute('aria-label',`打开 ${pair(instrument)} ${marketName(instrument)}的 K 线与警报${active.length?`，${active.length} 条警报监控中`:''}`);
    drawTrend(row.canvas,bars,end,active);
  }
}

async function loadHistory() {
  if (document.hidden||historyPending.size) return;
  const selected=range, intervalMs=selected.minutes*60_000;
  const limit=Math.ceil(selected.hours*60/selected.minutes)+2;
  const viewport=root.getBoundingClientRect();
  if (!viewport.height) return;
  for (const item of items) {
    if (selected!==range||document.hidden) break;
    const id=marketId(item), rect=rowMap.get(id)?.row.getBoundingClientRect();
    const old=history.get(id), now=Date.now();
    if (!rect||rect.bottom<=viewport.top||rect.top>=viewport.bottom||now<(old?.nextAt??0)) continue;
    const tail=old?.rows.at(-1)?.time;
    const left=tail&&Math.ceil((now-tail)/intervalMs)+2;
    const args={key:quoteKey(item),interval:selected.period,limit};
    historyPending.add(id);
    try {
      let result;
      if (historyOptions) {
        try {
          const patch=old?.rows.length>=limit&&left>0&&left<limit?{startTime:tail,limit:left}:{};
          result=await host.request('market.candles',{...args,...patch,background:true});
        } catch(error) {
          if (!/unknown field|未知参数/i.test(error.message)) throw error;
          historyOptions=false;
        }
      }
      result??=await host.request('market.candles',args);
      if (selected!==range) continue;
      const byTime=new Map((old?.rows??[]).map(row=>[row.time,row]));
      for (const row of result.rows) byTime.set(row.time,row);
      history.set(id,{rows:[...byTime.values()].sort((a,b)=>a.time-b.time).slice(-limit),at:now,
        nextAt:now+(result.stale?60_000:intervalMs),error:!!result.stale});
    } catch {
      if (selected===range) history.set(id,{rows:old?.rows??[],at:old?.at??now,nextAt:now+60_000,error:true});
    } finally {
      historyPending.delete(id);
      if (selected===range) paintRows();
    }
  }
}

function paintStatus() {
  const status=$('market-status');
  status.textContent=[['spot','现货'],['usd_m','永续']].filter(([market])=>items.some(item=>item.market===market)).map(([market,label])=>`${label} ${statusText[marketStatus[market]?.status] ?? '等待'}`).join(' · ') || '未订阅';
  status.title=[marketStatus.spot?.error,marketStatus.usd_m?.error].filter(Boolean).join('\n');
}

async function subscribe() {
  const run=++quoteRun;
  if (unsubscribe) { const stop=unsubscribe; unsubscribe=undefined; await stop(); }
  if (!items.length || run!==quoteRun) { paintStatus(); return; }
  const stop=await host.subscribe(items.map(item=>quoteKey(item)),snapshot=>{
    if (run!==quoteRun) return;
    if (snapshot.error && !snapshot.marketStatus) {
      minuteQuotes.clear();
      quotes=new Map([...quotes].map(([id,quote])=>[id,{...quote,quality:'unavailable'}]));
      paintRows(); report(snapshot.error); return;
    }
    quotes=new Map(snapshot.quotes.map(quote=>[quoteId(quote.key),quote]));
    minuteQuotes=new Map([...quotes].map(([id,quote])=>[id,observeMinute(minuteQuotes.get(id),quote)]));
    marketTickers=snapshot.marketTickers; marketStatus=snapshot.marketStatus;
    paintStatus(); paintRows();
  });
  if (run===quoteRun) unsubscribe=stop; else await stop();
}

async function refreshInfo() {
  const [directory,loadedRules]=await Promise.all([host.request('market.instruments'),host.request('alerts.list')]);
  catalog=new Map(directory.map(item=>[marketId(item),item]));
  rules=loadedRules;
  if ($('watch-editor').open) renderChoices();
  paintRows();
}

function renderChoices() {
  const selected=$('watch-choice').value || editing;
  const query=$('watch-search').value.trim().toUpperCase().replace(/\//g,'');
  const filter=$('watch-market').value;
  const blocked=new Set(items.map(marketId).filter(id=>id!==editing));
  const filtered=[...catalog.values()].filter(item=>item.status==='TRADING'&&(!filter||item.market===filter)&&(!query||item.symbol.includes(query))&&!blocked.has(marketId(item)));
  filtered.sort((a,b)=>Number(b.symbol===query)-Number(a.symbol===query)||Number(b.quoteAsset==='USDT')-Number(a.quoteAsset==='USDT')||a.symbol.localeCompare(b.symbol));
  const existing=items.find(item=>marketId(item)===editing);
  if (existing && !filtered.some(item=>marketId(item)===editing)) filtered.unshift(catalog.get(editing) ?? existing);
  const visible=filtered.slice(0,100), preferred=filtered.find(item=>marketId(item)===selected);
  if (preferred && !visible.includes(preferred)) visible.unshift(preferred);
  $('watch-choice').replaceChildren(...visible.map(item=>new Option(`${pair(item)} · ${marketName(item)}`,marketId(item))));
  if (preferred) $('watch-choice').value=marketId(preferred);
  $('watch-save').disabled=saving || !$('watch-choice').value || !editing&&items.length>=20;
  $('watch-hint').textContent=editing?'替换或移出自选后，已设置的警报继续运行。':!catalog.size?'等待币安目录。连接恢复后可搜索交易对。':'同名现货和永续可同时添加。';
}

function openEditor(id=null) {
  editing=id;
  $('watch-form').reset(); message('watch-error');
  const index=items.findIndex(item=>marketId(item)===id);
  $('watch-editor-title').textContent=id?'编辑自选':'添加自选';
  $('watch-alias').value=items[index]?.alias ?? '';
  for (const control of ['move-up','move-down','watch-remove']) $(control).hidden=!id;
  $('move-up').disabled=index<=0; $('move-down').disabled=index>=items.length-1;
  renderChoices(); $('watch-editor').showModal(); $('watch-search').focus();
}

async function saveItems(next,animate=false) {
  if (saving) return;
  saving=true;
  const before=new Map(animate?[...rowMap].map(([id,row])=>[id,row.row.getBoundingClientRect()]):[]);
  try {
    const oldIds=new Set(items.map(marketId));
    items=await host.request('watchlist.setItems',next);
    $('watch-editor').close(); buildRows(); report();
    if (animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches) for (const [id,{row}] of rowMap) {
      const a=before.get(id), b=row.getBoundingClientRect();
      if (a&&(a.x!==b.x||a.y!==b.y)) row.animate([{transform:`translate(${a.x-b.x}px,${a.y-b.y}px)`},{transform:'translate(0,0)'}],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    if (oldIds.size!==items.length||items.some(item=>!oldIds.has(marketId(item)))) {
      void subscribe().catch(report); void loadHistory();
    }
  } catch(error) { if ($('watch-editor').open) message('watch-error',error.message); else report(error); }
  finally { saving=false; if ($('watch-editor').open) renderChoices(); }
}

$('watch-add').onclick=()=>openEditor(); $('watch-cancel').onclick=()=>$('watch-editor').close();
$('watch-search').oninput=$('watch-market').onchange=renderChoices;
$('watch-form').onsubmit=event=>{
  event.preventDefault(); const item=selectedItem(); if (!item||saving) return;
  $('watch-save').disabled=true;
  const entry={market:item.market,symbol:item.symbol,alias:$('watch-alias').value.trim()};
  void saveItems(editing?items.map(old=>marketId(old)===editing?entry:old):[...items,entry]);
};
$('watch-remove').onclick=()=>void saveItems(items.filter(item=>marketId(item)!==editing));
function move(from,to,after) {
  if (from<0||to<0||from===to) return;
  const position=after===undefined?to:to+Number(after)-Number(from<to);
  if (position===from) return;
  const next=[...items]; const [entry]=next.splice(from,1); next.splice(position,0,entry);
  void saveItems(next,true);
}
for (const [id,step] of [['move-up',-1],['move-down',1]]) $(id).onclick=()=>{ const from=items.findIndex(item=>marketId(item)===editing); const to=from+step; if (to<items.length) move(from,to); };
function clearDragging() { dragging=null; for (const {row} of rowMap.values()) row.classList.remove('dragged','drop-before','drop-after'); }
const afterRow=(event,row)=>{ const rect=row.getBoundingClientRect(); return layout==='grid'?event.clientX>rect.left+rect.width/2:event.clientY>rect.top+rect.height/2; };
root.ondragstart=event=>{
  const row=event.target.closest('[data-item]');
  if (saving||!row||!event.target.matches('.watch-grip')) { event.preventDefault(); return; }
  dragging=row.dataset.item; event.dataTransfer.setData('text/plain',dragging); event.dataTransfer.effectAllowed='move'; row.classList.add('dragged');
};
root.ondragover=event=>{
  const row=event.target.closest('[data-item]'); if (!dragging||!row||row.dataset.item===dragging) return;
  event.preventDefault(); const after=afterRow(event,row); row.classList.toggle('drop-after',after); row.classList.toggle('drop-before',!after);
};
root.ondragleave=event=>{ const row=event.target.closest('[data-item]'); if (row&&!row.contains(event.relatedTarget)) row.classList.remove('drop-before','drop-after'); };
root.ondrop=event=>{
  const row=event.target.closest('[data-item]'); if (!dragging||!row) return;
  event.preventDefault(); const from=items.findIndex(item=>marketId(item)===dragging), to=items.findIndex(item=>marketId(item)===row.dataset.item);
  clearDragging(); move(from,to,afterRow(event,row));
};
root.ondragend=clearDragging;
new ResizeObserver(()=>{setSizeLabel();paintRows();}).observe(document.documentElement);

paintControls(); buildRows(); setSizeLabel(); await host.ready();
if (host.preview) $('market-status').textContent='隔离试加载';
else {
  try {
    const [settings,saved]=await Promise.all([host.request('settings.get'),host.request('watchlist.getItems')]);
    $('watch-title').textContent=settings.title ?? '市场观察';
    layout=settings.layout==='grid'?'grid':'list'; range=ranges.find(option=>option.hours===settings.rangeHours) ?? ranges[1];
    items=saved; paintControls(); buildRows();
    void subscribe().catch(report);
    await refreshInfo(); void loadHistory();
  } catch(error) { report(error); }
  setInterval(()=>{
    if (refreshing) return; refreshing=true;
    void refreshInfo().catch(report).finally(()=>{refreshing=false;});
  },5000);
  setInterval(()=>void loadHistory(),15_000);
  root.addEventListener('scroll',()=>{
    clearTimeout(scrollHistoryTimer);
    scrollHistoryTimer=setTimeout(()=>void loadHistory(),120);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{ if (!document.hidden) void loadHistory(); });
}
