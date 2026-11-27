import test from 'node:test';
import assert from 'node:assert/strict';
import {emaSeries, indicatorTemplates} from './src/chart-indicators.js';

const day = 86400000;
const rows = (...samples) => samples.map(([index, close]) => ({time: index * day, close: String(close)}));

test('EMA 用首个完整周期的均值初始化，再按收盘价递推', () => {
  assert.deepEqual(emaSeries(rows([1, 1], [2, 5], [3, 9], [4, 15], [5, 2]), 3, day),
    [null, null, 5, 10, 6]);
});

test('EMA 在日线缺口后重新累计，补齐缺口后使用完整历史', () => {
  const incomplete = rows([1, 2], [2, 4], [4, 10], [5, 22], [6, 18]);
  assert.deepEqual(emaSeries(incomplete, 2, day), [null, 3, null, 16, 16 + 2 * (2 / 3)]);
  const complete = incomplete.toSpliced(2, 0, ...rows([3, 6]));
  assert.ok(emaSeries(complete, 2, day).slice(1).every(Number.isFinite));
});

test('日线模板包含三组周期，最长 EMA 需要 676 根连续日线', () => {
  const template = indicatorTemplates['ema-three-channels'];
  assert.equal(template.interval, '1d');
  assert.deepEqual(template.channels.map(channel => channel.periods), [[144, 169], [288, 338], [576, 676]]);
  const samples = Array.from({length: 677}, (_, index) => ({time: index * day, close: '8.25'}));
  const values = emaSeries(samples, template.minimumBars, day);
  assert.ok(values.slice(0, 675).every(value => value === null));
  assert.deepEqual(values.slice(675), [8.25, 8.25]);
});
