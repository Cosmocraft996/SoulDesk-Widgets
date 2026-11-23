import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePrice, alreadyMet, directionAtPrice, observeMinute } from './src/price.js';
import { formatPanelPrice, formatQuote } from './src/market-ui.js';
test('到价预提示按精确十进制比较，包含等号且上下行对称', () => {
  assert.equal(comparePrice('0.1000000000000000001', '0.1'), 1);
  assert.equal(comparePrice('001.1000', '1.1'), 0);
  assert.equal(alreadyMet('100', '100.00', 'up'), true);
  assert.equal(alreadyMet('100', '100.00', 'down'), true);
  assert.equal(alreadyMet('99.99', '100', 'up'), false);
  for (const value of ['0', '-1', '1e2', 'NaN', '', '1.']) assert.throws(() => comparePrice(value, '1'));
});

test('主面板按整数位四舍五入，保留小于一的报价精度', () => {
  for (const [input, expected] of [
    ['60186.45','60,186.5'], ['123456.91','123,456.9'], ['1692.925','1,692.93'],
    ['33.7','33.70'], ['5.1425','5.143'], ['9.9996','10.000'], ['0.0000001287600','0.0000001287600'],
  ]) assert.equal(formatPanelPrice(input),expected);
  assert.equal(formatPanelPrice(undefined),'—');
});

test('方向使用一分钟截止点前的价格，报价失效和连接代次变化后重新积累样本', () => {
  const quote=(time,price,options={})=>({sourceUtcMs:time,price,generation:1,quality:'fresh',...options});
  let state=observeMinute(null,quote(1000,'10.00'));
  assert.equal(state.direction,null);
  state=observeMinute(state,quote(9000,'12'));
  state=observeMinute(state,quote(60000,'11'));
  assert.equal(state.direction,null);
  state=observeMinute(state,quote(61000,'11.01'));
  assert.equal(state.direction,1);
  state=observeMinute(state,quote(69000,'11.02'));
  assert.equal(state.direction,-1);
  assert.deepEqual(state.samples.map(sample=>sample.time),[9000,60000,61000,69000]);
  state=observeMinute(state,quote(69000,'12.00'));
  assert.equal(state.direction,0);
  assert.equal(state.samples.length,4);
  assert.equal(observeMinute(state,quote(70000,'12',{quality:'stale'})),null);
  assert.equal(observeMinute(state,quote(70000,'20',{generation:2})).direction,null);
});

test('拖动和表单共用精确的警报方向判定', () => {
  assert.equal(directionAtPrice('0.1000000000000000001','0.1'),'up');
  assert.equal(directionAtPrice('0.0999999999999999999','0.1'),'down');
  assert.equal(directionAtPrice('100.00','100'),null);
});

test('刷新成交价时保留布局类并按一分钟方向显示', () => {
  const classes=new Set(['last-price','quote-value']);
  const el={classList:{remove:(...names)=>names.forEach(name=>classes.delete(name)),add:name=>classes.add(name)}};
  const quote={quality:'fresh',price:'0.0000012345678900',direction:-1};
  formatQuote(el,quote,1);
  assert.equal(el.textContent,'▲ 0.0000012345678900');
  assert.deepEqual([...classes],['last-price','quote-value','positive']);
  formatQuote(el,quote,null);
  assert.equal(el.textContent,quote.price);
  assert.deepEqual([...classes],['last-price','quote-value','neutral']);
});
