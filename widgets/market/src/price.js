// 仅用于保存前提示；真正触发由 Rust 精确十进制状态机决定。
export function comparePrice(a, b) {
  const parse = value => {
    if (typeof value !== 'string' || value.length > 64 || !/^\d+(\.\d+)?$/.test(value)) throw new Error('请输入正的十进制价格');
    const [integer, fraction = ''] = value.split('.');
    const digits = BigInt(integer + fraction);
    if (digits <= 0n) throw new Error('价格须大于0');
    return { digits, scale: fraction.length };
  };
  const x = parse(a), y = parse(b), scale = Math.max(x.scale, y.scale);
  const left = x.digits * 10n ** BigInt(scale - x.scale), right = y.digits * 10n ** BigInt(scale - y.scale);
  return left === right ? 0 : left > right ? 1 : -1;
}
export function alreadyMet(price, threshold, direction) { const value = comparePrice(price, threshold); return direction === 'up' ? value >= 0 : value <= 0; }

export function directionAtPrice(threshold, price) {
  const relation = comparePrice(threshold, price);
  return relation > 0 ? 'up' : relation < 0 ? 'down' : null;
}

// 以行情源时间为准，只保留一分钟内的样本和截止点前的一笔。
export function observeMinute(previous, quote) {
  if (quote.quality !== 'fresh' || !Number.isFinite(quote.sourceUtcMs)) return null;
  const time = quote.sourceUtcMs;
  const last = previous?.samples.at(-1);
  const samples = last && previous.generation === quote.generation && last.time <= time ? previous.samples : [];
  if (samples.at(-1)?.time === time) samples[samples.length - 1].price = quote.price;
  else samples.push({ time, price: quote.price });
  const cutoff = time - 60_000;
  while (samples.length > 1 && samples[1].time <= cutoff) samples.shift();
  const direction = samples[0].time <= cutoff ? comparePrice(quote.price, samples[0].price) : null;
  return { generation: quote.generation, samples, direction };
}
