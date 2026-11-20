// 金额与汇率均按十进制字符串计算，交叉换算只在最后一步舍入。
function decimal(value, isRate = false) {
  const format = isRate ? /^\d{1,64}(\.\d{1,28})?$/ : /^\d{1,64}(\.\d{1,18})?$/;
  if (typeof value !== 'string' || !format.test(value)) {
    throw new Error(isRate ? '汇率需要有效的正十进制数' : '金额最多64位整数、18位小数，不支持负数或科学计数法');
  }
  const [whole, fraction = ''] = value.split('.');
  const digits = BigInt(whole + fraction);
  if (isRate && digits === 0n) throw new Error('汇率必须大于0');
  return { digits, scale: fraction.length };
}

export function convertAmount(amount, fromRate, toRate) {
  const value = decimal(amount);
  const from = decimal(fromRate, true);
  const to = decimal(toRate, true);
  const digits = 2;
  const numerator = value.digits * to.digits * 10n ** BigInt(from.scale + digits);
  const denominator = from.digits * 10n ** BigInt(value.scale + to.scale);
  const rounded = (numerator * 2n + denominator) / (2n * denominator);
  const text = rounded.toString().padStart(digits + 1, '0');
  return text.slice(0, -digits) + '.' + text.slice(-digits);
}

export function readSnapshot(data) {
  if (data?.base !== 'USD' || !data.quotes || data.quotes.USD?.rate !== '1' ||
      data.quotes.USD.date !== null) throw new Error('美元基准汇率无效');
  const entries = Object.entries(data.quotes);
  if (entries.length < 2 || entries.length > 1025) throw new Error('汇率表币种数量无效');
  for (const [code, quote] of entries) {
    if (!/^[A-Z]{3}$/.test(code) || (code !== 'USD' && !/^\d{4}-\d{2}-\d{2}$/.test(quote?.date))) {
      throw new Error('汇率表币种或日期无效');
    }
    decimal(quote.rate, true);
  }
  return new Map(entries);
}

export function convertRows(amount, currencies, active, quotes) {
  if (amount === '') return currencies.map(() => '');
  const input = /^\d+\.$/.test(amount) ? amount.slice(0, -1) : amount;
  decimal(input);
  const base = quotes.get(currencies[active])?.rate;
  return currencies.map((code, index) => {
    if (index === active) return amount;
    if (code === currencies[active]) return convertAmount(input, '1', '1');
    const target = quotes.get(code)?.rate;
    return base && target ? convertAmount(input, base, target) : '';
  });
}
