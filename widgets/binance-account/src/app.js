import { connectHost } from './host.js';

const assets = { usd:'U 本位合约', coin:'币本位合约', spot:'现货', portfolio:'统一账户 · U 本位' };
const tabs = { positions:'持仓', assets:'资产', orders:'委托', trades:'成交', flow:'资金流水', account:'账户与风控', settings:'合约设置' };
const sections = {
  orders:{ openOrders:'活动委托', openAlgo:'活动条件单', orders:'历史委托', algoHistory:'条件单历史', orderLists:'组合委托', forceOrders:'强平记录' },
  trades:{ trades:'成交记录' },
  flow:{ income:'资金费、手续费与已实现盈亏', deposits:'充币', withdrawals:'提币', dividends:'分红', dust:'小额兑换' },
  account:{ configuration:'账户配置', positionMode:'持仓模式', symbolConfiguration:'合约配置', leverageBrackets:'杠杆档位', commission:'手续费率' }
};
const requiresSymbol = new Set(['orders','algoHistory','trades','symbolConfiguration','leverageBrackets','commission']);
const supportsDates = new Set(['orders','algoHistory','orderLists','trades','forceOrders','income','deposits','withdrawals','dividends']);
const labels = {
  symbol:'交易对', positionSide:'仓位侧', positionAmt:'原生数量', notional:'名义价值', notionalValue:'名义价值',
  entryPrice:'开仓均价', breakEvenPrice:'盈亏平衡价', markPrice:'标记价', liquidationPrice:'强平价',
  unRealizedProfit:'未实现盈亏', unrealizedProfit:'未实现盈亏', positionInitialMargin:'持仓初始保证金',
  initialMargin:'初始保证金', maintMargin:'维持保证金', isolatedMargin:'逐仓保证金', isolatedWallet:'逐仓钱包',
  leverage:'杠杆', adl:'自动减仓等级', orderId:'委托编号', algoId:'条件委托编号', type:'类型', side:'方向',
  price:'价格', triggerPrice:'触发价', origQty:'委托量', executedQty:'已成交量', status:'状态',
  asset:'资产', free:'可用数量', locked:'冻结数量', walletBalance:'钱包余额', marginBalance:'保证金余额',
  availableBalance:'可用余额', totalMarginBalance:'总保证金余额', accountEquity:'统一账户权益', uniMMR:'统一维持保证金率',
  incomeType:'流水类型', income:'金额', realizedPnl:'已实现盈亏', commission:'手续费', commissionAsset:'费用资产',
  time:'记录时间', updateTime:'更新时间'
};
const $ = id => document.getElementById(id);
const role = new URLSearchParams(location.search).get('role') === 'details' ? 'details' : 'primary';
document.body.dataset.role = role;
const format = new Intl.NumberFormat('en-US',{maximumFractionDigits:8});
const money = new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const clock = new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
const state = { market:'usd',mode:'compact',tab:'positions',section:'',symbol:'',since:'',until:'',history:null,pending:null,busy:false,job:null };
let host;
let historySequence=0;
let lastOrderRefresh=0;
let orderRevision;
const liveOrderSections=new Set(['openOrders','openAlgo']);
const positionSorts={size:'仓位从大到小',time:'时间从新到旧',roi:'收益率从高到低',pnl:'盈亏从大到小',margin:'保证金从大到小'};
let positionSort='size';
let savingPositionSort=false;
const call = (method,args) => host.request(`binanceAccount.${method}`,args);
const escape = value => String(value ?? '—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = value => value == null || value === '' ? NaN : Number(value);
const list = value => Array.isArray(value) ? value : [];
const tone = value => Number.isFinite(num(value)) ? num(value) >= 0 ? 'gain' : 'loss' : '';
const date = value => Number.isFinite(num(value)) && num(value)>0 ? new Date(num(value)).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}) : '—';
const isSpot = () => state.market === 'spot';
const active = item => ['NEW','PARTIALLY_FILLED','WORKING','PENDING_NEW'].includes(item.status ?? item.algoStatus);
const positions = () => list(state.snapshot?.positions).filter(item => num(item.positionAmt) !== 0 && Number.isFinite(num(item.positionAmt)));
const currentStatus = () => state.profiles?.find(item => item.market === state.market);
const permission = () => currentStatus()?.trading && state.snapshot?.trading && !state.stale && !state.pending && !state.busy && !state.job;
const options = values => Object.entries(values).map(([key,label])=>`<option value="${escape(key)}">${escape(label)}</option>`).join('');
const btn = (action,label,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
const pct = (n,signed=false)=>Number.isFinite(n) ? `${n<0?'−':signed&&n>0?'+':''}${money.format(Math.abs(n)*100)}%`:'—';

function amountInUsdt(value,currency) {
  const rate=currency==='USDT'?1:num(state.snapshot?.rates?.[currency]);
  const amount=num(value)*rate;
  return rate>0&&Number.isFinite(amount)?amount:NaN;
}
function usd(value,currency,{signed=false,unit=false,price=false}={}) {
  const n=amountInUsdt(value,currency);
  if(!Number.isFinite(n))return '—';
  const sign=n<0?'−':signed&&n>0?'+':'';
  const digits=price && Math.abs(n)<1 ? format : money;
  return `${currency==='USDT'?'':'≈'}${sign}${digits.format(Math.abs(n))}${unit?' USDT':''}`;
}

function configOf(item) {
  return list(state.snapshot?.symbolConfiguration).find(row=>row.symbol===item.symbol);
}
function currencyOf(item) {
  if (state.market==='coin') return item.marginAsset || state.snapshot.contracts?.[item.symbol]?.marginAsset ||
    item.symbol.match(/^(.+)USD(?:_|$)/)?.[1] || '';
  return item.marginAsset || item.symbol.match(/(USDT|USDC|FDUSD)$/)?.[1] || '';
}
function accountPosition(item) {
  const source=state.market==='portfolio'?state.snapshot?.configuration:state.snapshot?.account;
  return list(source?.positions).find(row=>row.symbol===item.symbol&&row.positionSide===item.positionSide);
}
function values(item) {
  const related=accountPosition(item);
  const config=configOf(item);
  const currency=currencyOf(item);
  const marginMode=config?.marginType??item.marginType??(related?.isolated===true?'ISOLATED':related?.isolated===false?'CROSSED':null);
  const isolated=marginMode?.toUpperCase()==='ISOLATED' || num(item.isolatedWallet)>0;
  const initial=item.positionInitialMargin??related?.positionInitialMargin??(state.market==='portfolio'?related?.initialMargin:undefined);
  const maintenance=item.maintMargin??related?.maintMargin;
  return { related,currency,isolated,initial,maintenance,leverage:item.leverage??config?.leverage??related?.leverage };
}
function risk(item,info) {
  const account=state.snapshot.account;
  if(state.market==='portfolio') {
    const native=num(account.uniMMR);
    return [native>0?1/native:NaN,'统一账户 · 币安 uniMMR 倒数'];
  }
  if(info.isolated) {
    const equity=num(item.isolatedWallet)+num(item.unRealizedProfit);
    return [equity>0?num(info.maintenance)/equity:NaN,'逐仓 · 维持保证金／逐仓权益'];
  }
  const multi=state.market==='usd'&&state.snapshot.configuration?.multiAssetsMargin===true;
  const settlement=list(account.assets).find(asset=>asset.asset===info.currency);
  if(multi) {
    const equity=num(account.totalCrossWalletBalance)+num(account.totalCrossUnPnl);
    return [equity>0?num(account.totalMaintMargin)/equity:NaN,'全仓 · 多资产账户'];
  }
  const equity=num(settlement?.crossWalletBalance)+num(settlement?.crossUnPnl);
  const cross=positions().map(values).filter(value=>value.currency===info.currency&&!value.isolated);
  const maintain=cross.reduce((total,entry)=>total+num(entry.maintenance),0);
  return [equity>0?maintain/equity:NaN,'全仓 · 同结算资产资金池'];
}
function positionMetrics(item) {
  const info=values(item);
  const pnl=item.unRealizedProfit??item.unrealizedProfit;
  const initial=num(info.initial);
  const ratio=initial>0?num(pnl)/initial:NaN;
  const contracts=num(state.snapshot?.contracts?.[item.symbol]?.contractSize);
  const inverse=state.market==='coin'&&contracts>0;
  const nominal=inverse?Math.abs(num(item.positionAmt))*contracts
    :Math.abs(num(item.notional??info.related?.notional??info.related?.notionalValue));
  return {info,pnl,ratio,nominal,nominalCurrency:inverse?'USD':info.currency};
}
function positionSortValue(item,{info,pnl,ratio,nominal,nominalCurrency}) {
  switch(positionSort){
    case 'time': {
      const updated=num(item.updateTime)>0?num(item.updateTime):num(info.related?.updateTime);
      return updated>0?updated:NaN;
    }
    case 'roi':return ratio;
    case 'pnl':return amountInUsdt(pnl,info.currency);
    case 'margin':return amountInUsdt(info.initial,info.currency);
    default:return amountInUsdt(nominal,nominalCurrency);
  }
}
function presentation(item,{info,pnl,ratio,nominal,nominalCurrency}) {
  const priceUnit=state.market==='coin'?'USD':info.currency;
  const [marginRatio,scope]=risk(item,info);
  const price=value=>num(value)>0?usd(value,priceUnit,{price:true}):'—';
  const rows=[
    ['盈亏',usd(pnl,info.currency,{signed:true}),tone(pnl),'未实现盈亏'],
    ['回报率',pct(ratio,true),tone(ratio),'未实现盈亏／持仓初始保证金，估算'],
    ['持仓量',usd(nominal,nominalCurrency),'','名义价值折合 USDT'],
    ['保证金',usd(info.initial,info.currency),'','持仓初始保证金'],
    ['保证金比率',pct(marginRatio),'',scope],
    ['开仓价',price(item.entryPrice)],['标记价',price(item.markPrice)],['强平价',price(item.liquidationPrice)],
    ['盈亏平衡价',price(item.breakEvenPrice)],['维持保证金',usd(info.maintenance,info.currency)],
    ['逐仓余额',info.isolated?usd(item.isolatedWallet,info.currency):'—'],['自动减仓',item.adl??'—']
  ];
  return rows;
}
function positionGrid(rows,extra=false) {
  return `<dl class="metrics ${extra?'extra':''}">${rows.map(([label,value,style='',hint=''],index)=>
    `<div class="${!extra&&index<2?'leading':''}"><dt title="${escape(hint)}">${label}</dt><dd class="num ${style}">${escape(value)}</dd></div>`).join('')}</dl>`;
}

function balance() {
  const snapshot=state.snapshot;
  if(!snapshot){ $('balance').replaceChildren(); return; }
  const {account,configuration,rates}=snapshot;
  let groups=[];
  if(isSpot()) {
    const owned=list(account.balances).filter(row=>num(row.free)>0||num(row.locked)>0);
    const valuation=owned.reduce((sum,row)=>sum+(num(row.free)+num(row.locked))*num(rates?.[row.asset]),0);
    groups=[[['现货总估值',Number.isFinite(valuation)?`≈${usd(valuation,'USDT',{unit:true})}`:'—']]];
  } else if(state.market==='coin') {
    groups=list(account.assets).filter(row=>num(row.marginBalance)!==0&&Number.isFinite(num(row.marginBalance))).map(row=>[
      [`保证金余额 · ${row.asset}`,usd(row.marginBalance,row.asset,{unit:true})],['可用保证金',usd(row.availableBalance,row.asset,{unit:true})],
      ['未实现盈亏',usd(row.unrealizedProfit,row.asset,{signed:true,unit:true}),tone(row.unrealizedProfit)]
    ]);
  } else if(state.market==='portfolio') {
    groups=[[['统一保证金账户权益',usd(account.accountEquity,'USD',{unit:true})],
      ...list(snapshot.balances).filter(row=>Number.isFinite(num(row.umWalletBalance))&&num(row.umWalletBalance)!==0)
        .map(row=>[`U 本位钱包 · ${row.asset}`,usd(row.umWalletBalance,row.asset,{unit:true})])]];
  } else {
    const currency=configuration?.multiAssetsMargin===true?'USD':configuration?.multiAssetsMargin===false?'USDT':null;
    groups=[[['保证金余额',usd(account.totalMarginBalance,currency,{unit:true})],['可用余额',usd(account.availableBalance,currency,{unit:true})],
      ['未实现盈亏',usd(account.totalUnrealizedProfit,currency,{signed:true,unit:true}),tone(account.totalUnrealizedProfit)]]];
  }
  $('balance').innerHTML=groups.map(rows=>`<div class="balance">${rows.map(([label,value,style=''],index)=>
    `<div class="balance-row ${index?'secondary':''}"><span>${escape(label)}</span><strong class="num ${style}">${escape(value)}</strong></div>`).join('')}</div>`).join('')||
    '<div class="balance"><div class="balance-row"><span>保证金余额</span><strong class="num">—</strong></div></div>';
}
function cards(detailed) {
  const positionsByRank=positions().map(item=>{
    const metrics=positionMetrics(item);
    const rank=positionSortValue(item,metrics);
    return {item,metrics,rank:Number.isFinite(rank)?rank:-Infinity};
  }).sort((a,b)=>a.rank===b.rank?0:b.rank-a.rank);
  state.visibleRows=positionsByRank.map(({item})=>item);
  const caption=`<div class="caption position-caption"><strong>持仓</strong>
    <select id="position-sort" aria-label="持仓排序"${savingPositionSort?' disabled':''}>${options(positionSorts)}</select>
    <small>金额与价格 · USDT</small></div>`;
  if(!positionsByRank.length)return caption+`<p class="empty">${state.snapshot.errors?.positions?'仓位读取失败':'当前没有开放仓位'}</p>`;
  return caption+`<div class="positions">${positionsByRank.map(({item,metrics},index)=>{
    const rows=presentation(item,metrics);
    const {info}=metrics;
    const side=num(item.positionAmt)>0?'多仓':'空仓';
    const margin=state.market==='portfolio'?'组合保证金':info.isolated?'逐仓':'全仓';
    return `<article class="position"><header><h3 class="num">${escape(item.symbol)}</h3><small><b class="${side==='多仓'?'gain':'loss'}">${side}</b> · ${margin}${info.leverage?` · ${escape(info.leverage)}×`:''}</small></header>
      ${positionGrid(rows.slice(0,8))}${detailed?positionGrid(rows.slice(8),true):''}
      <div class="actions">${btn('position','全部字段',`data-index="${index}"`)}${btn('close','最优价平仓',`data-index="${index}" class="warn"${permission()?'':' disabled'}`)}</div></article>`;
  }).join('')}</div>`;
}
function assetRows() {
  return isSpot()?list(state.snapshot.account.balances).filter(row=>num(row.free)>0||num(row.locked)>0):
    list(state.snapshot.balances).length?list(state.snapshot.balances):list(state.snapshot.account.assets);
}
function assetCards() {
  const rows=assetRows();state.visibleRows=rows;
  return `<div class="caption"><strong>资产</strong><small>估值 · USDT</small></div><div class="assets">${rows.map((item,index)=>{
    const short=state.mode==='compact';
    const value=short?`估值 ${usd(num(item.free)+num(item.locked),item.asset)}`:`可用 ${usd(item.free,item.asset)} · 冻结 ${usd(item.locked,item.asset)}`;
    return `<div class="asset"><div><strong>${escape(item.asset)}</strong><br><small>${escape(value)}</small></div>${btn('raw','字段',`data-index="${index}"`)}</div>`;
  }).join('')}</div>`;
}
function allowedSections(tab) {
  return Object.entries(sections[tab]??{}).filter(([key])=>{
    if(isSpot())return !['openAlgo','algoHistory','forceOrders','income','configuration','positionMode','symbolConfiguration','leverageBrackets'].includes(key);
    if(['orderLists','deposits','withdrawals','dividends','dust'].includes(key))return false;
    if(key==='algoHistory'&&state.market==='coin')return false;
    if(key==='configuration')return state.market==='usd';
    if(key==='symbolConfiguration')return state.market!=='coin';
    return true;
  });
}
function sectionDefault(tab) { return allowedSections(tab)[0]?.[0]??''; }
function historyRows() {
  const raw=state.history?.data;
  return Array.isArray(raw)?raw:list(raw?.rows??raw?.data??raw?.userAssetDribblets).length?list(raw?.rows??raw?.data??raw?.userAssetDribblets):
    raw&&typeof raw==='object'?[raw]:[];
}
function table(rows,columns,orderActions=false) {
  state.visibleRows=rows;
  if(!rows.length)return '<p class="empty">没有可显示的记录</p>';
  return `<div class="table-scroll"><table><thead><tr>${columns.map(([label])=>`<th scope="col">${label}</th>`).join('')}<th scope="col">操作</th></tr></thead><tbody>${rows.map((row,index)=>{
    const actions=orderActions&&active(row);
    const allowed=permission()&&!state.historyRefreshing&&!state.historyError;
    return `<tr>${columns.map(([,get])=>`<td>${escape(get(row))}</td>`).join('')}<td><div class="actions">${btn('raw','字段',`data-index="${index}"`)}
      ${actions&&row.type==='LIMIT'&&row.orderId?btn('amend','改单',`data-index="${index}"${allowed?'':' disabled'}`):''}
      ${actions&&(row.orderId||row.algoId)?btn('cancel','撤单',`class="warn" data-index="${index}"${allowed?'':' disabled'}`):''}</div></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
const validators = [
  ['leverage','调整杠杆','交易对 · 依币安档位校验'],
  ['positionMode','持仓模式','单向或双向'],
  ['marginType','保证金模式','全仓或逐仓'],
  ['multiAssets','资产模式','单资产或多资产'],
  ['addMargin','增加逐仓保证金','适用逐仓仓位'],
  ['removeMargin','减少逐仓保证金','适用逐仓仓位']
];
function settingsPage() {
  const applicable=validators.filter(([key])=>key==='leverage'||key==='positionMode'||
    state.market!=='portfolio'&&key==='marginType'||state.market==='usd');
  return `<div class="settings-list">${applicable.map(([id,name,desc])=>`<article class="setting"><div><h3>${name}</h3><small>${desc}</small></div>
    ${btn('setting','修改',`data-setting="${id}"${permission()?'':' disabled'}`)}</article>`).join('')}</div>`;
}
function detail() {
  const tab=state.tab;
  const choices=Object.entries(tabs).filter(([key])=>!isSpot()||!['positions','settings'].includes(key));
  const tabsHtml=`<div class="tabs" role="group" aria-label="数据栏目">${choices.map(([key,label])=>btn('tab',label,
    `data-tab="${key}" aria-pressed="${key===tab}"`)).join('')}</div>`;
  let body='';
  if(!state.snapshot) return tabsHtml;
  if(tab==='positions') body=cards(true);
  else if(tab==='assets') body=table(assetRows(),[
    ['币种',row=>row.asset],['钱包／总量',row=>row.balance??row.walletBalance??row.totalWalletBalance??format.format(num(row.free)+num(row.locked))],
    ['可用',row=>row.availableBalance??row.free],['冻结',row=>row.locked]
  ]);
  else if(tab==='settings')body=settingsPage();
  else {
    const type=state.section||sectionDefault(tab);
    const list=Object.fromEntries(allowedSections(tab));
    const summary=tab==='account'?`<div class="actions">${btn('account','账户原始字段')}${btn('configuration','账户补充快照')}</div>`:'';
    const controls=`<form id="history-form" class="filters">
      <label>查询类型<select name="section">${options(list)}</select></label>
      <label>${requiresSymbol.has(type)?'交易对':'交易对（可选）'}<input name="symbol" maxlength="32" placeholder="BTCUSDT" value="${escape(state.symbol)}" ${requiresSymbol.has(type)?'required':''}></label>
      ${supportsDates.has(type)?`<label>开始时间（北京）<input name="since" type="datetime-local" value="${escape(state.since)}"></label>
        <label>结束时间（北京）<input name="until" type="datetime-local" value="${escape(state.until)}"></label>`:''}
      <button type="submit">查询</button></form>`;
    body=`${summary}${controls}<div id="history-results">${historyResults(tab,type)}</div>`;
  }
  return tabsHtml+body;
}
function historyResults(tab,type) {
  const status=state.historyError?'<p class="notice">读取失败，请重新查询。</p>'
    :state.historyRefreshing?'<p class="muted">正在查询…</p>':'';
  if(!state.history)return status||'<p class="empty">选择查询范围后读取数据</p>';
  const rows=historyRows();
  const grids={
    orders:[['交易对',r=>r.symbol],['委托编号',r=>r.orderId??r.algoId??r.orderListId],['类型／方向',r=>`${r.type??r.orderType??'—'} · ${r.side??'—'}`],['价格',r=>r.price??r.triggerPrice],['已成／数量',r=>`${r.executedQty??'—'}／${r.origQty??r.quantity??'—'}`],['状态',r=>r.status??r.algoStatus],['时间',r=>date(r.time??r.updateTime)]],
    trades:[['交易对',r=>r.symbol],['数量',r=>r.qty],['价格',r=>r.price],['手续费',r=>`${r.commission??'—'} ${r.commissionAsset??''}`],['时间',r=>date(r.time)]],
    flow:[['资产',r=>r.asset??r.coin],['类型',r=>r.incomeType??sections.flow[type]],['金额',r=>r.income??r.amount],['时间',r=>date(r.time??r.insertTime??r.applyTime)]],
    account:[['查询项',r=>r.symbol??sections.account[type]],['账户状态',r=>r.accountStatus??r.dualSidePosition??'—']]
  };
  return `${status}<small>${escape(state.history.source)} · ${rows.length} 条 · 历史按币安接口范围查询</small>${table(rows,grids[tab],tab==='orders'&&['openOrders','openAlgo','orders'].includes(type))}`;
}
function renderHistory() {
  const target=$('history-results');
  if(target)target.innerHTML=historyResults(state.tab,state.section||sectionDefault(state.tab));
}
function clearHistory() {
  ++historySequence;
  state.history=null;state.historyArgs=null;state.historyRefreshing=false;state.historyError=false;
}
function controls() {
  const oldFocus=document.activeElement?.id;
  $('controls').innerHTML=`<select id="market" aria-label="当前账户">${options(assets)}</select>`+
    (role==='primary'?`<div class="modes" role="group" aria-label="显示模式">${btn('mode','简洁',`data-mode="compact" aria-pressed="${state.mode==='compact'}"`)}${btn('mode','详细',`data-mode="detail" aria-pressed="${state.mode==='detail'}"`)}</div>`:
      `${btn('refresh','刷新')}${btn('new','下单',`class="primary"${permission()?'':' disabled'}`)}`);
  $('market').value=state.market;
  if(oldFocus==='market')$('market').focus({preventScroll:true});
}
function render() {
  const sorting=document.activeElement?.id==='position-sort';
  const profile=currentStatus();
  $('connection').textContent=state.approvalRequired?'待授权':state.stale?(state.snapshot?'数据过期':'读取失败'):!profile?.configured?'未配置':state.snapshot?(profile.trading?'已授权交易':'只读'):'读取中';
  controls();
  balance();
  $('pending').innerHTML=state.pending?`<div class="pending"><p>有待核对操作</p><small>${escape(state.pending.label)}</small>
    <div class="actions">${btn('reconcile','查询结果',state.busy?'disabled':'')}${btn('settings','归档与解锁')}</div></div>`:'';
  $('content').innerHTML=state.approvalRequired?`<p class="empty">请在宿主设置核对组件包的来源和 SHA-256，再授权读取账户。</p>${btn('settings','打开宿主设置')}`:!profile?.configured?`<p class="empty">${profile?.credentialError?'凭据无法解密':'此账户尚未配置'}</p>${btn('settings','打开宿主设置')}`:
    !state.snapshot?'<p class="empty">等待账户快照</p>':role==='details'?detail():isSpot()?assetCards():cards(state.mode==='detail');
  const sort=$('position-sort');
  if(sort){
    sort.value=positionSort;
    if(sorting)sort.focus({preventScroll:true});
  }
  if($('history-form'))$('history-form').elements.section.value=state.section||sectionDefault(state.tab);
  $('footer').innerHTML=`<time>${state.snapshot?`${state.stale?'上次更新':state.snapshot.streamConnected?'事件同步':'轮询'} · ${clock.format(state.snapshot.fetchedAt)}`:''}</time><div class="actions">
    ${role==='primary'?btn('details','完整明细 ↗'):btn('settings','账户设置')}</div>`;
}
function notice(id,value) {
  const line=$(id);
  line.textContent=value;
  line.hidden=!value;
}
const message=(value='')=>notice('message',value);
const connectionNotice=(value='')=>notice('connection-message',value);
const snapshotLabels={positions:'持仓',balances:'余额',configuration:'账户配置',symbolConfiguration:'合约设置'};
const errorText=error=>String(error?.message??error);
const isReadInterrupted=error=>/NETWORK_ERROR:|宿主请求超时/.test(errorText(error));
let refreshRunning=false;
let refreshQueued=false;
let retryDelay=0;
let retryAt=0;
function scheduleRetry(interrupted=false) {
  retryDelay=interrupted?Math.min(30_000,Math.max(6_000,retryDelay*2)):0;
  retryAt=interrupted?Date.now()+retryDelay:0;
}
function readNotice(error) {
  return isReadInterrupted(error)?'连接或响应暂时不可用':errorText(error);
}
async function refresh(force=false) {
  if(!host||host.preview||(!force&&(document.hidden||Date.now()<retryAt)))return;
  if(refreshRunning){if(force)refreshQueued=true;return;}
  const market=state.market;
  refreshRunning=true;
  try {
    const previous=state.snapshot;
    const previousStatus=currentStatus();
    const previousPending=state.pending?.id;
    const profiles=await call('status');
    if(state.market!==market)return;
    state.approvalRequired=false;
    state.profiles=profiles;
    if(!currentStatus()?.configured){
      state.snapshot=null;state.pending=null;state.stale=false;
      scheduleRetry();connectionNotice();render();return;
    }
    const [snapshot,pending]=await Promise.allSettled([call('snapshot',{market}),call('pending',{market})]);
    if(state.market!==market)return;
    if(pending.status==='fulfilled')state.pending=pending.value;
    if(snapshot.status==='rejected')throw snapshot.reason;
    const errors=snapshot.value.errors??{};
    if(errors.positions)throw new Error(`持仓读取失败。
${errors.positions}`);
    state.snapshot=snapshot.value;
    const wasStale=state.stale;
    state.stale=false;
    const issues=Object.entries(errors);
    const interrupted=issues.some(([,error])=>isReadInterrupted(error));
    scheduleRetry(interrupted);
    const notices=issues.map(([key,error])=>`${snapshotLabels[key]??'部分数据'} · ${readNotice(error)}`);
    if(interrupted)notices.push('将自动重试');
    connectionNotice(notices.join('。'));
    const revision=snapshot.value.ordersRevision;
    if(!state.busy&&!state.historyRefreshing){
      if(orderRevision!==revision||Date.now()-lastOrderRefresh>=15000)refreshOrderHistory();
      orderRevision=revision;
    }
    const updated=previous?.fetchedAt!==state.snapshot.fetchedAt||wasStale||
      previousStatus?.trading!==currentStatus()?.trading||previousPending!==state.pending?.id;
    if(!updated || role==='details'&&($('dialog').open||document.activeElement?.closest('#history-form')))return;
    render();
  } catch(error) {
    if(state.market===market){
      const detail=errorText(error);
      state.approvalRequired=detail.includes('PACKAGE_APPROVAL_REQUIRED');
      if(state.approvalRequired){
        state.profiles=[];state.snapshot=null;state.pending=null;clearHistory();
      }
      state.stale=true;
      const interrupted=isReadInterrupted(error);
      scheduleRetry(interrupted);
      const source=detail.startsWith('持仓读取失败。')?'持仓':'账户';
      const retained=state.snapshot?'当前显示上次成功的数据。':'';
      connectionNotice(state.approvalRequired?'':interrupted
        ? `币安${source}读取暂不可用。${retained}将自动重试。`
        : `${detail} ${retained}`.trim());
      render();
    }
  } finally {
    refreshRunning=false;
    if(state.market!==market||refreshQueued){refreshQueued=false;void refresh(true);}
  }
}
async function saveView(prefs) {
  await host.request('settings.update',prefs);
}
function show(title,html) {
  $('dialog-title').textContent=title;
  $('dialog-body').innerHTML=html;
  if(!$('dialog').open)$('dialog').showModal();
}
function raw(title,row,related) {
  if(!row){show(title,'<p class="empty">当前接口没有返回数据</p>');return;}
  const fields=Object.entries(row).filter(([key])=>Object.hasOwn(labels,key)).map(([key,value])=>
    `<dt>${labels[key]}</dt><dd class="num">${escape(typeof value==='object'?JSON.stringify(value):value)}</dd>`).join('');
  const complete=value=>`<pre>${escape(JSON.stringify(value,null,2))}</pre>`;
  show(title,`<dl class="kv">${fields}</dl><details open><summary>原始字段</summary>${complete(row)}</details>${related?`<details><summary>账户接口补充字段</summary>${complete(related)}</details>`:''}`);
}
const form=(kind,html,submit)=>`<form data-form="${kind}"><div class="form-grid">${html}</div><p id="form-note" class="notice" hidden></p><div class="actions"><button type="submit" class="primary">${submit}</button></div></form>`;
const input=(name,label,value='',kind='text',required=true)=>`<label>${label}<input name="${name}" type="${kind}" value="${escape(value)}" ${required?'required':''}></label>`;
const select=(name,label,values)=>`<label>${label}<select name="${name}">${options(values)}</select></label>`;
let selected;
function closeForm(item) {
  selected=item;
  const amount=String(item.positionAmt).replace(/^-/,'');
  show(`最优价平仓 · ${item.symbol}`,`<p>${num(item.positionAmt)>0?'卖出平多 · 取买一':'买入平空 · 取卖一'}。宿主确认窗读取对手盘价格和数量。</p>
    ${form('close',input('quantity',`平仓数量（${state.market==='coin'?'张':'原生数量'}）`,amount),'核对并确认')}`);
}
function orderForm() {
  show('新建委托',form('new',
    input('symbol','交易对',state.symbol||positions()[0]?.symbol||'')+select('side','买卖方向',{BUY:'买入',SELL:'卖出'})+
    (isSpot()?'':select('positionSide','仓位侧',{BOTH:'单向 · BOTH',LONG:'双向 · 多仓',SHORT:'双向 · 空仓'}))+
    select('orderType','委托类型',{limit:'限价',market:'市价'})+
    input('quantity',`数量（${state.market==='coin'?'张':'基础资产'}）`)+
    input('price','价格')+select('tif','有效方式',{GTC:'直至取消',IOC:'即时成交剩余撤销',FOK:'必须全部成交'}),'核对并确认'));
}
function amendForm(item) {
  selected=item;
  const note=isSpot()?'仅减量可保留优先级。其他改动先撤旧单，再按最终已成交量重算新单；组合委托仅支持减量。':'币安会重新排列修改后的限价单。';
  show(`改单 · ${item.symbol}`,`<p>${note}</p>${form('amend',input('price','新限价',item.price)+input('quantity','新总量（含已成交量）',item.origQty),'核对并确认')}`);
}
function settingForm(key) {
  selected=key;
  const name=validators.find(([id])=>id===key)?.[1]??'修改设置';
  const symbol=['positionMode','multiAssets'].includes(key)?'':input('symbol','适用合约',state.symbol||positions()[0]?.symbol||'');
  const field={
    leverage:input('value','新杠杆倍数'),
    positionMode:select('value',name,{false:'单向',true:'双向'}),
    marginType:select('value',name,{CROSSED:'全仓',ISOLATED:'逐仓'}),
    multiAssets:select('value',name,{false:'单资产',true:'多资产'}),
    addMargin:input('value','增加金额')+select('positionSide','仓位侧',{BOTH:'BOTH',LONG:'LONG',SHORT:'SHORT'}),
    removeMargin:input('value','减少金额')+select('positionSide','仓位侧',{BOTH:'BOTH',LONG:'LONG',SHORT:'SHORT'})
  }[key];
  show(name,form('setting',symbol+field,'核对并确认'));
}
async function begin(operation) {
  if(!permission())throw new Error('当前交易未授权，或账户状态正在更新');
  const market=state.market;
  state.busy=true;render();message('正在核对币安状态。确认窗口由宿主打开。');
  try {
    const {id}=await call('trade',{market,operation});
    state.job=id;
    let result;
    let failedChecks=0;
    do {
      await new Promise(resolve=>setTimeout(resolve,550));
      try {
        result=await call('tradeStatus',{id});
        failedChecks=0;
      } catch(error) {
        failedChecks+=1;
        if(failedChecks>=3||!/请求超时|连接/.test(String(error.message??error)))throw error;
      }
    } while(!result||result.status==='processing');
    if(result.status==='canceled'){message('已取消');return;}
    if(result.status==='unknown'){
      state.pending=result.pending;
      message('指令结果待核对。请使用查单入口。');
      return;
    }
    const receipt=result.receipt;
    message(result.status==='partial'?(receipt?.reason??'旧单和新单的结果不同，请查看两项回执。'):'已收到币安回执');
    raw('币安交易回执',receipt);
  } finally {
    state.job=null;state.busy=false;render();
    refreshOrderHistory(true);
    void refresh(true);
  }
}
async function queryHistory(args, manual) {
  const sequence=++historySequence;
  state.historyArgs=args;
  state.historyRefreshing=true;
  state.historyError=false;
  if(manual)state.history=null;
  if(liveOrderSections.has(args.section))lastOrderRefresh=Date.now();
  renderHistory();
  try {
    const data=await call('history',args);
    if(sequence!==historySequence)return;
    state.history=data;
    if(manual)message();
  } catch(error) {
    if(sequence!==historySequence)return;
    state.historyError=true;
    if(manual)fail(error);
  } finally {
    if(sequence===historySequence){state.historyRefreshing=false;renderHistory();}
  }
}
function refreshOrderHistory(afterTrade=false) {
  const args=state.historyArgs;
  if(!args)return;
  const live=liveOrderSections.has(args.section);
  if(afterTrade?(live||args.section==='orders'):(live&&!state.historyRefreshing)){
    void queryHistory(args,false);
  }
}
function loadHistory(values) {
  state.section=values.section;state.symbol=values.symbol?.trim().toUpperCase()??'';
  state.since=values.since??'';state.until=values.until??'';
  const args={market:state.market,section:state.section,symbol:state.symbol||null};
  if(state.since)args.startTime=Date.parse(`${state.since}+08:00`);
  if(state.until)args.endTime=Date.parse(`${state.until}+08:00`);
  void queryHistory(args,true);
}
const fail=error=>message(String(error.message??error));
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.id==='position-sort'){
    const next=target.value;
    if(savingPositionSort||positionSort===next||!Object.hasOwn(positionSorts,next))return;
    const focused=document.activeElement===target;
    savingPositionSort=true;
    target.disabled=true;
    void host.request('storage.set',{positionSort:next}).then(()=>{
      positionSort=next;
    }).catch(fail).finally(()=>{
      savingPositionSort=false;
      const restoreFocus=focused&&document.activeElement===document.body;
      render();
      if(restoreFocus)$('position-sort')?.focus({preventScroll:true});
    });
    return;
  }
  if(target.id==='market'){
    const market=target.value;
    if(state.busy){target.value=state.market;return;}
    void saveView({market,mode:state.mode}).then(()=>{
      state.market=market;state.snapshot=null;state.pending=null;state.stale=false;clearHistory();orderRevision=undefined;state.section='';state.symbol='';
      if(isSpot()&&['positions','settings'].includes(state.tab))state.tab='assets';
      scheduleRetry();connectionNotice();message();render();void refresh(true);
    }).catch(error=>{target.value=state.market;fail(error);});
  }
  if(target.form?.id==='history-form'&&target.name==='section'){
    const values=new FormData(target.form);
    state.section=target.value;state.symbol=String(values.get('symbol')??'');clearHistory();render();
  }
  if(target.form?.dataset.form==='new'&&target.name==='orderType'){
    target.form.elements.price.disabled=target.value==='market';
    target.form.elements.price.required=target.value==='limit';
    target.form.elements.tif.disabled=target.value==='market';
  }
});
document.addEventListener('input',event=>{
  const input=event.target;
  if(input.form?.id!=='history-form')return;
  if(input.name==='symbol')state.symbol=input.value;
  if(input.name==='since')state.since=input.value;
  if(input.name==='until')state.until=input.value;
  clearHistory();renderHistory();
});
document.addEventListener('submit',event=>{
  event.preventDefault();
  const formNode=event.target;
  const values=Object.fromEntries(new FormData(formNode));
  if(formNode.id==='history-form'){loadHistory(values);return;}
  const kind=formNode.dataset.form;
  const operations={
    close:()=>({kind,symbol:selected.symbol,positionSide:selected.positionSide,quantity:values.quantity}),
    new:()=>({kind:'order',symbol:values.symbol.trim().toUpperCase(),side:values.side,positionSide:values.positionSide??null,
      price:values.orderType==='limit'?values.price:null,quantity:values.quantity,timeInForce:values.tif??null}),
    amend:()=>({kind,symbol:selected.symbol,orderId:String(selected.orderId),quantity:values.quantity,price:values.price}),
    setting:()=>({kind,setting:selected,symbol:values.symbol?.trim().toUpperCase()??null,value:values.value,positionSide:values.positionSide??null})
  };
  if(!operations[kind])return;
  const operation=operations[kind]();$('dialog').close();void begin(operation).catch(fail);
});
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');
  if(!button||!host||host.preview)return;
  const {action,index,mode,tab,setting}=button.dataset;
  const item=state.visibleRows?.[Number(index)];
  switch(action){
    case 'dismiss':$('dialog').close();break;
    case 'settings':void call('openSettings').catch(fail);break;
    case 'details':void host.request('view.openDetails',{page:'binance-account'}).catch(fail);break;
    case 'mode':
      void saveView({market:state.market,mode}).then(()=>{state.mode=mode;render();$('controls').querySelector(`[data-mode="${mode}"]`)?.focus();}).catch(fail);break;
    case 'tab':
      state.tab=tab;state.section=sectionDefault(tab);clearHistory();render();$('content').querySelector(`[data-tab="${tab}"]`)?.focus();break;
    case 'refresh': {
      const form=$('history-form');
      if(form?.reportValidity())loadHistory(Object.fromEntries(new FormData(form)));
      void refresh(true);
      break;
    }
    case 'position':if(item)raw(item.symbol,item,accountPosition(item));break;
    case 'raw':raw('完整字段',item);break;
    case 'account':raw('账户原始字段',state.snapshot?.account);break;
    case 'configuration':raw('账户补充快照',state.snapshot?.configuration);break;
    case 'close':if(item)closeForm(item);break;
    case 'new':orderForm();break;
    case 'amend':if(item)amendForm(item);break;
    case 'setting':settingForm(setting);break;
    case 'cancel':if(item)void begin({kind:'cancel',symbol:item.symbol,orderId:String(item.algoId??item.orderId),algorithmic:!!item.algoId}).catch(fail);break;
    case 'reconcile':
      if(state.busy)break;
      state.busy=true;render();
      void call('reconcile',{market:state.market}).then(result=>{
        if(result.receipt)raw('对账回执',result.receipt);
        else if(result.evidence)raw('已核对的信息',result.evidence);
        if(result.status!=='unknown')state.pending=null;
        message(result.status==='unknown'?'还无法核对最终结果，可在宿主设置归档并解锁':'已完成核对');
      }).catch(fail).finally(()=>{state.busy=false;render();refreshOrderHistory(true);void refresh(true);});break;
  }
});

try {
  host=await connectHost();
  const [preferences,storage]=await Promise.all([host.request('settings.get'),host.request('storage.get')]);
  if(Object.hasOwn(positionSorts,storage?.positionSort))positionSort=storage.positionSort;
  if(Object.hasOwn(assets,preferences.market))state.market=preferences.market;
  if(preferences.mode==='detail')state.mode='detail';
  if(isSpot())state.tab='assets';
  if(host.preview){
    $('connection').textContent='组件预载';
    $('content').textContent='连接宿主后可查看账户';
  } else {
    render();
  }
  await host.ready();
  if(!host.preview){
    void refresh(true);
    setInterval(()=>void refresh(),3000);
    document.addEventListener('visibilitychange',()=>void refresh());
    window.addEventListener('focus',()=>void refresh());
    window.addEventListener('online',()=>void refresh(true));
  }
} catch(error) {
  fail(error);
  // 让宿主显示具体启动错误，避免侧栏只显示初始化超时。
  throw error;
}
