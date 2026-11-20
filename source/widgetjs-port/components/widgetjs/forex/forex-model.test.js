import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredCurrencies } from './currencies.js';
import { convertAmount, convertRows, readSnapshot } from './forex-model.js';

const data = {
  base: 'USD',
  quotes: {
    USD: { rate: '1', date: null },
    CNY: { rate: '7.2', date: '2026-11-19' },
    JPY: { rate: '156.12', date: '2026-11-18' },
  },
};

test('新实例使用人民币、美元、日元，旧配置保留币种顺序及同币种', () => {
  assert.deepEqual(configuredCurrencies({ currencies: '' }), ['CNY', 'USD', 'JPY']);
  assert.deepEqual(configuredCurrencies({ currencies: '', from: 'EUR', to: 'HKD' }), ['EUR', 'HKD']);
  assert.deepEqual(configuredCurrencies({ from: 'USD', to: 'USD' }), ['USD', 'USD']);
  assert.deepEqual(configuredCurrencies({ currencies: 'JPY,SGD,GBP', from: 'EUR', to: 'HKD' }), ['JPY', 'SGD', 'GBP']);
  assert.deepEqual(configuredCurrencies({ currencies: 'JPY,,GBP' }), ['CNY', 'USD', 'JPY']);
  assert.deepEqual(configuredCurrencies({ currencies: '[]', from: 'EUR', to: 'HKD' }), []);
  assert.deepEqual(configuredCurrencies({ currencies: 'CNY' }), ['CNY']);
  const codes = 'CNY,USD,JPY,EUR,GBP,TWD,MOP,CHF,CAD,HKD,AUD,SGD,THB,MYR,VND,IDR,PHP,INR,RUB'.split(',');
  assert.deepEqual(configuredCurrencies({ currencies: codes.join(',') }), codes);
});

test('金额精确交叉换算，保留大整数并固定显示两位小数', () => {
  assert.equal(convertAmount('0.1', '1', '0.2'), '0.02');
  assert.equal(convertAmount('9007199254740993', '1', '7.12345678'), '64162394599995673.73');
  assert.equal(convertAmount('2', '3', '1'), '0.67');
  assert.equal(convertAmount('1', '3', '2'), '0.67');
  assert.equal(convertAmount('1', '0.0000000000000000000000000001', '0.0000000000000000000000000002'), '2.00');
  assert.equal(convertAmount('0', '6.8', '1'), '0.00');
  assert.equal(convertAmount('100', '1', '1'), '100.00');
  assert.equal(convertAmount('0.0049999', '1', '1'), '0.00');
  assert.equal(convertAmount('0.005', '1', '1'), '0.01');
  assert.equal(convertAmount('1.995', '1', '1'), '2.00');
  for (const invalid of ['NaN', 'Infinity', '1e8', '-1', '1,000', '', '1.2.3']) {
    assert.throws(() => convertAmount(invalid, '1', '1'));
  }
});

test('任意币种作为输入基准，无报价的币种留空且相同币种按 1:1 换算', () => {
  const snapshot = readSnapshot(data);
  const codes = ['CNY', 'USD', 'JPY', 'TWD'];
  assert.deepEqual(convertRows('7.2', codes, 0, snapshot), ['7.2', '1.00', '156.12', '']);
  assert.deepEqual(convertRows('156.12', codes, 2, snapshot), ['7.20', '1.00', '156.12', '']);
  assert.deepEqual(convertRows('1.', [], 0, snapshot), []);
  assert.deepEqual(convertRows('1.', codes, 1, snapshot), ['7.20', '1.', '156.12', '']);
  assert.deepEqual(convertRows('100', codes, 3, snapshot), ['', '', '', '100']);
  assert.deepEqual(convertRows('', codes, 0, snapshot), ['', '', '', '']);
  assert.deepEqual(convertRows('10', ['HKD', 'HKD'], 0, new Map()), ['10', '10.00']);
  assert.throws(() => convertRows('1e3', codes, 0, snapshot), /不支持/);
});

test('拒绝空响应、错误的基准、无效报价或缺少日期', () => {
  assert.equal(readSnapshot(data).get('JPY').date, '2026-11-18');
  for (const invalid of [undefined, {}, { ...data, base: 'EUR' }, { ...data, quotes: { USD: data.quotes.USD } }]) {
    assert.throws(() => readSnapshot(invalid));
  }
  for (const jpy of [{ rate: '0', date: '2026-11-19' }, { rate: 'NaN', date: '2026-11-19' }, { rate: '7' }]) {
    assert.throws(() => readSnapshot({ ...data, quotes: { ...data.quotes, JPY: jpy } }));
  }
});
