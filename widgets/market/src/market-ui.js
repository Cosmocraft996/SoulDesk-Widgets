export const $ = id => document.getElementById(id);
export const marketId = item => `${item.market}:${item.symbol}`;
export const marketName = item => item.market === 'spot' ? '现货' : item.contractType === 'TRADIFI_PERPETUAL' ? 'TradFi 永续' : 'USDT 永续';
export const pair = item => item?.baseAsset && item.quoteAsset ? `${item.baseAsset}/${item.quoteAsset}` : item?.symbol ?? '';
export const quoteKey = (item, priceKind = 'last') => ({ exchange: 'binance', market: item.market, symbol: item.symbol, priceKind });
export const quoteId = key => `${marketId(key)}:${key.priceKind}`;
const groupDigits = value => value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const formatPrice = value => {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) return '—';
  const [whole, fraction] = value.split('.');
  const decimals = fraction?.replace(/0+$/, '');
  return groupDigits(whole) + (decimals ? `.${decimals}` : '');
};

export function formatPanelPrice(value) {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) return '—';
  const [rawWhole, fraction = ''] = value.split('.');
  const whole = rawWhole.replace(/^0+(?=\d)/, '');
  if (whole === '0') return fraction ? `0.${fraction}` : whole;
  const places = whole.length >= 5 ? 1 : whole.length >= 2 ? 2 : 3;
  const retained = whole + fraction.slice(0, places).padEnd(places, '0');
  const rounded = String(BigInt(retained) + (Number(fraction[places]) >= 5 ? 1n : 0n));
  return `${groupDigits(rounded.slice(0, -places))}.${rounded.slice(-places)}`;
}
export const percentage = value => Number.isFinite(value) ? `${value >= .005 ? '+' : ''}${Math.abs(value) < .005 ? '0.00' : value.toFixed(2)}%` : '—';
export const tone = value => value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
export const directionGlyph = value => value === 1 ? '▲ ' : value === -1 ? '▼ ' : '';
export const timeText = time => time ? new Date(time).toLocaleString('zh-CN',{hour12:false}) : '—';
export const ruleStatus = ({rule,state}) => !rule.enabled ? '已暂停' : state.completed ? '单次已完成' : state.pending ? '冷却中待复核' : '监控中';

export function element(tag, text, className) {
  const el=document.createElement(tag);
  if (text !== undefined) el.textContent=text;
  if (className) el.className=className;
  return el;
}

export function canvasContext(canvas) {
  const {width,height}=canvas.getBoundingClientRect();
  if (width<2 || height<2) return null;
  const ratio=Math.min(devicePixelRatio || 1,2);
  canvas.width=Math.round(width*ratio);
  canvas.height=Math.round(height*ratio);
  const ctx=canvas.getContext('2d');
  ctx.scale(ratio,ratio);
  return {ctx,width,height};
}

export function drawLine(ctx, x1, y1, x2, y2, color, dash=[]) {
  ctx.lineWidth=1;
  ctx.strokeStyle=color;
  ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.setLineDash([]);
}

export function formatQuote(el, quote, direction) {
  const stale=quote?.quality!=='fresh';
  el.textContent=`${stale ? '' : directionGlyph(direction)}${formatPanelPrice(quote?.price)}`;
  el.classList.remove('stale','positive','negative','neutral');
  el.classList.add(stale ? 'stale' : tone(direction));
  const trend = direction === null ? ' · 等待一分钟涨跌参考' : '';
  el.title=quote ? `${stale ? '上次报价 ' : '成交价 '}${formatPrice(quote.price)} · ${timeText(quote.sourceUtcMs)}${stale ? '' : trend}` : '等待新鲜报价';
}
