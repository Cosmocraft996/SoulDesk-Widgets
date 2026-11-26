import { connectHost } from './host.js';
import { mountServerManagement } from './server-management.js';

let host, management, fleetMarkup, viewLoad = 0;
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stateNames = {running:'运行中',suspended:'已暂停',stopped:'已停止',starting:'启动中',resuming:'唤醒中',suspending:'暂停中',stopping:'停止中',creating:'创建中',error:'实例异常',unknown:'待采集',deleted:'已删除',deleting:'删除中'};
const providerNames = {aliyun:'Linux SSH',instabox:'Instabox'};
let data = null, selected, hours = 24, chartMode = 'resources', samples = [], historyKey = '', historyRequest = 0, pendingWake = null, toastTimer, wakeShown;
const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (v, decimals = 1) => isNumber(v) ? v.toFixed(decimals) : '—';
const dateFmt = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const timeFmt = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function date(value, short = false) { const d = new Date(typeof value === 'number' ? value * 1000 : value); return value && Number.isFinite(d.getTime()) ? (short ? timeFmt : dateFmt).format(d) : '—'; }
function age(value) { return value ? (Date.now() - new Date(value).getTime()) / 1000 : Infinity; }
function fresh(s) { return s.checked_at && !s.error && s.status === 'running' && age(s.metrics?.measured_at) < 180 && age(s.checked_at) < 180; }
function bytes(value) { if (!isNumber(value)) return '—'; const units = ['B','KiB','MiB','GiB','TiB']; let n = value, i = 0; while(n >= 1024 && i < 4) { n /= 1024; i++; } return `${fmt(n,n >= 100 ? 0 : 1)} ${units[i]}`; }
function duration(value) { if(!isNumber(value)) return '—'; return value >= 86400 ? `${Math.floor(value / 86400)} 天 ${Math.floor(value % 86400 / 3600)} 时` : `${Math.floor(value / 3600)} 时 ${Math.floor(value % 3600 / 60)} 分`; }
function badge(s) { if (s.credentialReady === false) return '<span class="status warning">待补凭据</span>'; let label = s.error ? '采集失败' : (!s.checked_at ? '待核验' : stateNames[s.status] || s.status); let kind = s.error || s.status === 'error' ? 'error' : !s.checked_at || s.status === 'unknown' ? 'warning' : ['suspended','stopped'].includes(s.status) ? 'paused' : s.status !== 'running' ? 'warning' : ''; return `<span class="status ${kind}">${escapeHtml(label)}</span>`; }
function toast(message, error = false) { const el = $('#toast'); el.textContent = message; el.hidden = false; el.classList.toggle('error',error); clearTimeout(toastTimer); toastTimer = setTimeout(() => {el.hidden = true;},6000); }
function meter(value, kind) { return `<progress class="metric-bar ${kind} ${value>=90?'high':''}" max="100" value="${isNumber(value)?Math.max(0,Math.min(100,value)):0}" aria-hidden="true"></progress>`; }
function resourceCell(value, kind, stale) { return `<div class="metric-value ${stale?'stale':''}">${fmt(value)}${isNumber(value)?'%':''}</div>${meter(value,kind)}`; }
function renderFleet() {
  if (!data || management?.dragging()) return;
  const query = $('#search').value.trim().toLowerCase(), provider = $('#provider-filter').value;
  const servers = data.servers.filter(s => (provider === 'all' || s.provider === provider) && [s.name,s.account,s.address,s.role].join(' ').toLowerCase().includes(query));
  const sort = management?.canSort();
  $('#order-note').textContent = query || provider !== 'all' ? '清除筛选后可排序' : sort ? '拖动手柄或使用上下键排序' : '';
  $('#fleet-count').textContent = `${servers.length} / ${data.servers.length} 台`;
  const markup = servers.map(s => {
    const m = s.metrics || {}, stale = !fresh(s), disks = (s.disks || []).map(d=>d.used_pct).filter(isNumber), diskPct = disks.length ? Math.max(...disks) : m.disk_pct;
    const id = escapeHtml(s.id);
    const grip = sort ? `<button class="order-handle" type="button" data-order-id="${id}" aria-label="排序 ${escapeHtml(s.name)}" title="拖动或用上下键排序">⠿</button>` : '';
    return `<tr class="${s.id===selected?'selected':''}" data-select="${id}" data-server-row="${id}">
      <td><div class="host-label">${grip}<div class="host-icon ${s.provider}">${s.provider === 'aliyun' ? 'S' : 'I'}</div>
      <div><button class="host-name" data-select="${id}">${escapeHtml(s.name)}</button><div class="host-description"><span class="provider">${providerNames[s.provider]}</span>${s.role ? ' · ' + escapeHtml(s.role) : ''}</div></div></div></td>
      <td>${badge(s)}</td><td>${resourceCell(m.cpu_pct,'cpu',stale)}</td><td>${resourceCell(m.memory_pct,'memory',stale)}</td><td>${resourceCell(diskPct,'disk',stale || age(s.disk_measured_at)>180)}</td>
      <td class="data-time">${date(m.measured_at,true)}<small>${!s.checked_at?'等待核验':s.error?'保留最后数据':stale?'最后采样 · 非实时':'最近采样'}</small></td>
      <td><div class="row-actions"><button class="text-button" type="button" data-manage="edit" aria-label="编辑 ${escapeHtml(s.name)}">编辑</button><button class="text-button row-remove" type="button" data-manage="remove" aria-label="移除 ${escapeHtml(s.name)}">移除</button></div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">${data.servers.length ? '没有匹配的服务器' : '添加一台服务器，或从 JSON 文件导入现有配置。'}</td></tr>`;
  if (markup !== fleetMarkup) {
    fleetMarkup = markup;
    $('#fleet-body').innerHTML = markup;
  }
}
function renderStats() {
  const verified = data.servers.filter(s=>s.checked_at && !s.error && age(s.checked_at)<180), online = verified.filter(s=>s.status==='running'), metrics = online.filter(fresh), paused = verified.filter(s=>['suspended','stopped'].includes(s.status)).length;
  const alerts = data.servers.flatMap(s=>s.alerts || []);
  const cpuSamples = metrics.filter(s=>isNumber(s.metrics.cpu_pct) && isNumber(s.metrics.vcpus) && s.metrics.vcpus>0);
  const memorySamples = metrics.filter(s=>isNumber(s.metrics.memory_used));
  const vcpus = cpuSamples.reduce((a,s)=>a+s.metrics.vcpus,0);
  const cpu = vcpus ? cpuSamples.reduce((a,s)=>a+s.metrics.cpu_pct*s.metrics.vcpus,0)/vcpus : null;
  const memory = memorySamples.length ? memorySamples.reduce((a,s)=>a+s.metrics.memory_used,0)/1073741824 : null;
  $('#online-stat').innerHTML = `${verified.length?online.length:'—'}<small>/ ${data.servers.length} 台</small>`;
  $('#online-foot').textContent = `${paused} 台暂停或停止 · ${data.servers.length-verified.length} 台状态待核验`;
  $('#cpu-stat').innerHTML = `${fmt(cpu)}<small>%</small>`;
  $('#cpu-foot').textContent = `已采集 ${cpuSamples.length}/${online.length} 台在线实例 · ${vcpus || '—'} 核`;
  $('#memory-stat').innerHTML = `${fmt(memory)}<small>GiB</small>`;
  $('#memory-foot').textContent = memorySamples.length ? `不同服务商内存统计口径有差异` : '等待在线实例资源指标';
  $('#alert-stat').innerHTML = `${alerts.length}<small>项</small>`;
  $('#alert-foot').textContent = alerts.length ? `${alerts.filter(a=>a.level==='error').length} 项错误 · ${alerts.filter(a=>a.level!=='error').length} 项提醒` : data.collecting?'正在核验服务器状态':'当前未发现异常';
  $('.alert-stat').classList.toggle('has-alert',alerts.length>0);
  $('#nav-alerts').textContent = alerts.length;
  $('#interval-note').textContent = `每 ${data.interval_seconds} 秒采集 · 本地保留 ${data.retention_days} 天`;
}
function pair(label, value) { return `<div class="detail-pair"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }
function renderDetail() {
  const s = data.servers.find(s=>s.id===selected); if(!s) return;
  const m = s.metrics || {}, spec = s.spec || {}, limits = s.limits || {};
  $('#selected-name').textContent = s.name;
  $('#selected-subtitle').textContent = `${providerNames[s.provider]} · ${s.account || s.address}`;
  const canWake = s.credentialReady !== false && ['suspended','stopped'].includes(s.status) && !s.error && !!s.checked_at;
  const cooling = limits.cooldownUntil && new Date(limits.cooldownUntil).getTime()>Date.now();
  let detail = `<div class="detail-status">${badge(s)}<span class="muted">${fresh(s)?'实时采集':'最后已知数据'}</span></div><div class="detail-pairs">`;
  detail += pair('处理器',spec.vcpus ? `${spec.vcpus} vCPU` : '待采集') + pair('内存',spec.memMiB ? `${fmt(spec.memMiB/1024)} GiB` : '待采集');
  detail += pair(s.provider==='instabox'?'模板':'操作系统',s.template || m.os || '待采集');
  detail += pair('运行时长',s.provider==='aliyun'?duration(m.uptime_seconds):s.status==='running'&&limits.runStartedAt?duration(Math.max(0,age(limits.runStartedAt))):'—');
  detail += pair('网络入 / 出',`${bytes(m.net_in)}/s · ${bytes(m.net_out)}/s`);
  detail += pair('状态检查',date(s.checked_at));
  if(s.provider==='instabox') {
    detail += pair('空闲暂停',isNumber(limits.autoSuspendAfterSeconds)?`${limits.autoSuspendAfterSeconds/60} 分钟`:'待采集');
    detail += pair('最长连续运行',limits.maxRunMinutes===-1?'不限时':isNumber(limits.maxRunMinutes)?`${limits.maxRunMinutes} 分钟`:'待采集');
    if(cooling) detail += pair('冷却截止',date(limits.cooldownUntil));
    if(s.usage) {
      detail += pair('机器 / 额度',`${s.usage.machines ?? '—'} / ${s.usage.limits?.maxMachines ?? '—'}`);
      detail += pair('本月已结算费用',isNumber(s.usage.cost?.costUSD)?`$${s.usage.cost.costUSD.toFixed(2)}`:'—');
      detail += pair('费用统计截止',date(s.usage.cost?.ratedUntil));
    }
  }
  detail += '</div><div class="disk-list"><h3>磁盘空间</h3>';
  if(s.disks?.length) detail += s.disks.map(d=>`<div class="disk-item"><div><span>${escapeHtml(d.mount)}</span><span>${fmt(d.used_pct)}${isNumber(d.used_pct)?'%':''}</span></div>${meter(d.used_pct,'disk')}<small>${bytes(d.used)} / ${bytes(d.total)} · 可用 ${bytes(d.available)}</small></div>`).join('')+`<p class="muted">采样：${date(s.disk_measured_at)}${age(s.disk_measured_at)>180?' · 非实时':''}</p>`;
  else detail += '<p class="muted">尚无磁盘用量数据；暂停实例不会被唤醒采集。</p>';
  detail += '</div>';
  if(s.provider==='instabox') {
    detail += `<div class="detail-note">平台指标与磁盘查询不唤醒实例。网络速率由平台统计，可能不包含 SSH 与公开端口流量。内存为宿主机统计的已触碰内存。</div>`;
    if(canWake) detail += `<button class="button primary wake-button" data-wake="${escapeHtml(s.id)}" ${cooling || data.collecting?'disabled':''}>${cooling?'平台冷却中':data.collecting?'采集中，请稍候':'↗ 手动唤醒实例'}</button>`;
    if(s.operation) detail += `<p class="muted">最近启动操作：${escapeHtml({queued:'已排队',running:'进行中',succeeded:'已完成',failed:'失败'}[s.operation.state] || '等待确认')}${s.operation.error?' · '+escapeHtml(s.operation.error):''}</p>`;
  } else detail += '<div class="detail-note">通过已有 SSH 连接只读采集。服务入口响应仅代表可达，定时任务是否执行成功需另行核验。</div>';
  detail += `<div class="detail-links">${(s.links || []).map((link,index)=>`<button type="button" class="text-button" data-link="${index}">${escapeHtml(link.name)} ↗</button>`).join('')}</div>`;
  $('#server-detail').innerHTML = detail;
  if(s.provider==='aliyun') {
    const items = [...(s.services||[]),...(s.health||[])];
    $('#services').innerHTML = items.map(item=>`<div class="service"><span>${escapeHtml(String(item.name ?? '').replace('.service',''))}</span><span class="health ${item.ok?'':'bad'}">${item.ok?'● 正常':'● 异常'}${isNumber(item.code)?' · '+item.code:''}</span></div>`).join('') || '<p class="service-note">服务状态尚未采集。</p>';
    if(s.error || !s.checked_at) $('#services').innerHTML += '<p class="service-note">当前连接未核验，以上可能是缓存状态。</p>';
    const containers = s.containers || [];
    if(containers.length) $('#services').innerHTML += `<p class="service-note">容器：${containers.filter(c=>c.state==='running').length} 个运行，${containers.filter(c=>c.state!=='running').length} 个停止。停止容器仅作记录，不自动判为故障。</p>`;
    for(const task of s.tasks || []) $('#services').innerHTML += `<p class="service-note">${escapeHtml(task.name)}：${task.configured?'已发现定时配置':'未发现预期定时配置'} · 执行结果未核验</p>`;
  } else $('#services').innerHTML = `<p class="service-note">平台运行时：${s.checked_at&&!s.error?(s.status!=='running'?'实例未运行':s.runtime_ready?'已就绪':'等待就绪'):'待核验'}。为保持空闲暂停策略，不通过远程命令轮询进程或安卓服务；这里不代表应用业务健康。</p>`;
}
function renderEvents() {
  const names = Object.fromEntries(data.servers.map(s=>[s.id,s.name]));
  function eventRows(events) { return events.map(e=>`<div class="event-row ${escapeHtml(e.level)}"><time>${date(e.ts)}</time><span class="event-host">${escapeHtml(names[e.id] || e.id)}</span><span class="event-message">${escapeHtml(String(e.message ?? '').replace(/状态更新：(\w+)/,(_,s)=>'状态更新：'+(stateNames[s] || s)))}</span></div>`).join('') || '<div class="empty">暂无事件记录</div>'; }
  $('#recent-events').innerHTML = eventRows(data.events.slice(0,4));
  $('#events-list').innerHTML = eventRows(data.events);
  const alerts = data.servers.flatMap(s=>(s.alerts || []).map(a=>({...a,id:s.id})));
  $('#alerts-list').innerHTML = alerts.map(a=>`<div class="event-row ${escapeHtml(a.level)}"><span class="muted">${a.level==='error'?'错误':'提醒'}</span><span class="event-host">${escapeHtml(names[a.id])}</span><span class="event-message">${escapeHtml(a.text)}</span></div>`).join('') || '<div class="empty">当前没有异常提醒；暂停属于正常状态。</div>';
}
async function loadHistory(force = false) {
  const s = data?.servers.find(s=>s.id===selected); if(!s) return;
  const key = `${selected}/${hours}/${s.metrics?.measured_at}/${data.last_cycle}`;
  if(!force && historyKey===key) return; historyKey = key;
  const request = ++historyRequest;
  try { const result = await host.request('cloudWorkbench.history', { id:selected, hours }); if(request!==historyRequest) return; samples = result.samples; renderChart(); }
  catch(error) { if(request===historyRequest) {historyKey = ''; $('#chart').innerHTML='<div class="chart-empty">历史数据读取失败，请稍后重试</div>';} }
}
function renderChart() {
  const network = chartMode==='network', keys = network?['rx','tx']:['cpu','memory'], labels = network?['入站','出站']:['CPU','内存'];
  $('#chart-legend').innerHTML = labels.map(l=>`<span><i></i>${l}</span>`).join('');
  const hasValues = samples.some(s=>keys.some(k=>isNumber(s[k])));
  $('#chart-caption').textContent=`${samples.length} 个采样点 · ${network?'单位：字节/秒；平台可能不包含 SSH 与公开端口流量。':'CPU 与内存为百分比；不同服务商内存口径有差异。'} 暂停和采集间断保留空缺。`;
  if(!hasValues) {$('#chart').innerHTML=`<div class="chart-empty">${network?'尚无网络速率样本；阿里云需两次连续采样':'所选时间内没有资源样本'}</div>`; return;}
  const width=780,height=215,left=58,right=18,top=12,bottom=32,plotW=width-left-right,plotH=height-top-bottom;
  const end=Date.now()/1000,start=end-hours*3600;
  const max=network?Math.max(1024,...samples.flatMap(s=>keys.map(k=>s[k]||0)))*1.12:100;
  const x=t=>left+(t-start)/(end-start)*plotW,y=v=>top+plotH-v/max*plotH;
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${labels.join('与')}的历史趋势"><defs><clipPath id="plot-clip"><rect x="${left}" y="${top}" width="${plotW}" height="${plotH}"/></clipPath></defs>`;
  for(let i=0;i<=4;i++) {const v=max*i/4,py=y(v);svg+=`<line x1="${left}" x2="${width-right}" y1="${py}" y2="${py}" stroke="#2b363b" stroke-dasharray="3 5"/><text x="${left-10}" y="${py+4}" fill="#80939c" text-anchor="end" font-size="9" font-family="Bahnschrift,monospace">${network?bytes(v):Math.round(v)+'%'}</text>`;}
  for(let i=0;i<=4;i++) {const t=start+(end-start)*i/4; svg+=`<text x="${left+plotW*i/4}" y="${height-8}" text-anchor="${i===0?'start':i===4?'end':'middle'}" fill="#80939c" font-size="9" font-family="Bahnschrift,monospace">${hours>24?date(t).slice(0,5)+' ':''}${date(t,true).slice(0,5)}</text>`;}
  keys.forEach((key,index)=>{
    let segment=[],segments=[],previous=null;
    // 跨采集缺口断线；聚合较长窗口时按桶宽判断。
    const gap=Math.max(180,hours*3600/400*2.5);
    for(const point of samples) {
      if(!isNumber(point[key]) || (previous!==null && point.ts-previous>gap)) {if(segment.length) segments.push(segment); segment=[];}
      if(isNumber(point[key])) {segment.push([x(point.ts),y(Math.min(max,Math.max(0,point[key])))]);previous=point.ts;} else previous=null;
    }
    if(segment.length) segments.push(segment);
    const color=index?'#73c9d0':'#b3edc0';
    for(const points of segments) {
      if(points.length>1) svg+=`<polyline clip-path="url(#plot-clip)" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" points="${points.map(p=>p.join(',')).join(' ')}"/>`;
      for(const p of (points.length===1?points:[points[points.length-1]])) svg+=`<circle clip-path="url(#plot-clip)" cx="${p[0]}" cy="${p[1]}" r="2.8" fill="${color}"/>`;
    }
  });
  $('#chart').innerHTML=svg+'</svg>';
}
function switchView(view) {for(const name of ['overview','alerts','events']) $(`#${name}-view`).hidden=name!==view; document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view)); $('#page-title').firstChild.textContent={overview:'资源总览',alerts:'异常与提醒',events:'事件记录'}[view];}
async function reload(preferred) {
  const generation = ++viewLoad;
  try {
    const next = await host.request('cloudWorkbench.details');
    if (generation !== viewLoad) return;
    data = next;
    $('#connection-error').hidden = true;
    const candidate = preferred ?? selected;
    const choice = data.servers.some(server => server.id === candidate) ? candidate : data.servers[0]?.id;
    if (choice !== selected) {
      selected = choice;
      ++historyRequest;
      historyKey = '';
      samples = [];
      renderChart();
    }
    $('#server-panels').hidden = !selected;
    if (data.wakeResult?.requestId && data.wakeResult.requestId !== wakeShown) {
      wakeShown = data.wakeResult.requestId;
      toast(data.wakeResult.message, !data.wakeResult.ok);
    }
    $('#sync-state').textContent=data.collecting?'正在采集服务器数据…':`最近完成 ${date(data.last_cycle,true)}`;
    $('#sync-state').classList.toggle('busy',data.collecting); $('#refresh').disabled=data.collecting || !data.servers.some(server => server.credentialReady !== false);
    renderStats();renderFleet();renderDetail();renderEvents();await loadHistory();
  } catch(error) {if (generation === viewLoad) {$('#connection-error').textContent=error.message;$('#connection-error').hidden=false;$('#sync-state').textContent='暂不可用';$('#refresh').disabled=true;}}
}
async function poll() {
  if (!document.hidden) await reload();
  setTimeout(poll, 5000);
}
$('#search').addEventListener('input',()=>{if(data)renderFleet();});
$('#provider-filter').addEventListener('change',()=>{if(data)renderFleet();});
$('#refresh').addEventListener('click',async()=>{if(!data)return;$('#refresh').disabled=true;try{const result=await host.request('cloudWorkbench.refresh');toast(result.message);}catch(error){toast(error.message,true);} });
$('#fleet-body').addEventListener('click',event=>{if(event.target.closest('[data-manage],[data-order-id]'))return;const item=event.target.closest('[data-select]');if(!item)return;selected=item.dataset.select;renderFleet();renderDetail();samples=[];$('#chart').innerHTML='<div class="chart-empty">正在加载趋势…</div>';loadHistory(true);});
document.querySelectorAll('[data-hours]').forEach(button=>button.addEventListener('click',()=>{hours=Number(button.dataset.hours);document.querySelectorAll('[data-hours]').forEach(b=>b.classList.toggle('active',b===button));loadHistory(true);}));
document.querySelectorAll('[data-chart]').forEach(button=>button.addEventListener('click',()=>{chartMode=button.dataset.chart;document.querySelectorAll('[data-chart]').forEach(b=>b.classList.toggle('active',b===button));renderChart();}));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.view)));
$('#all-events').addEventListener('click',()=>switchView('events'));
$('#server-detail').addEventListener('click',event=>{const button=event.target.closest('[data-wake]');if(!button)return;pendingWake=button.dataset.wake;const s=data.servers.find(s=>s.id===pendingWake);$('#wake-description').textContent=`将向 Instabox 提交 ${s.name} 的${s.status==='stopped'?'启动':'恢复运行'}请求。账号：${s.account}。`;$('#wake-dialog').showModal();});
$('#server-detail').addEventListener('click',async event=>{const link=event.target.closest('[data-link]');if(!link)return;try{await host.request('cloudWorkbench.openService',{id:selected,index:Number(link.dataset.link)});}catch(error){toast(error.message,true);}});
$('#confirm-wake').addEventListener('click',async()=>{if(!pendingWake)return;const id=pendingWake;pendingWake=null;$('#wake-dialog').close();try{const result=await host.request('cloudWorkbench.wake',{id,requestId:crypto.randomUUID()});toast(result.message);historyKey='';}catch(error){toast(error.message+'。请先刷新确认状态，再决定是否重试。',true);} });

async function start() {
  host = await connectHost();
  await host.ready();
  if (!host.preview) {
    management = mountServerManagement({host, servers: () => data?.servers ?? [], refresh: reload, renderFleet, toast});
    void poll();
  }
}
start().catch(error => { $('#sync-state').textContent = error.message; });
