import { connectHost } from './host.js';
import { COMMON_CURRENCIES, configuredCurrencies, currencyName } from './currencies.js';
import { convertRows, readSnapshot } from './forex-model.js';

const $ = id => document.getElementById(id);
const component = $('component');
const scroller = $('currency-scroll');
const dialog = $('dialog');
const form = $('theme-form');
const submit = form.querySelector('[type=submit]');
const themeKeys = ['background', 'foreground', 'radius'];
const host = await connectHost();

let settings = await host.request('settings.get');
let currencies = configuredCurrencies(settings);
let quotes = new Map();
let active = 0;
let amount = '1';
let loading = false;
let rateError = '';
let saveError = '';
let saving = false;
let fields = [];

function availableCodes() {
  return quotes.size ? [...quotes.keys()] : COMMON_CURRENCIES;
}

function nextAvailableCode() {
  const selected = new Set(currencies);
  return COMMON_CURRENCIES.find(code => !selected.has(code) && (!quotes.size || quotes.has(code)))
    ?? availableCodes().find(code => !selected.has(code));
}

function currencyOption(code) {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = code + ' · ' + currencyName(code);
  return option;
}

function fillOptions(select, index) {
  const current = currencies[index];
  const all = new Set([...availableCodes(), current]);
  const selected = new Set(currencies);
  const common = COMMON_CURRENCIES.filter(code => all.has(code));
  const others = [...all].filter(code => !common.includes(code)).sort();
  const groups = [];
  for (const [label, codes] of [['常用币种', common], ['更多币种', others]]) {
    if (!codes.length) continue;
    const group = document.createElement('optgroup');
    group.label = label;
    for (const code of codes) {
      const option = currencyOption(code);
      option.disabled = code !== current && selected.has(code);
      group.append(option);
    }
    groups.push(group);
  }
  select.replaceChildren(...groups);
  select.value = current;
}

function renderRows() {
  const scrollTop = scroller.scrollTop;
  fields = currencies.map((code, index) => {
    const row = $('currency-row').content.firstElementChild.cloneNode(true);
    const [select, input, remove] = row.children;
    const name = currencyName(code);
    select.setAttribute('aria-label', '第' + (index + 1) + '行币种');
    input.setAttribute('aria-label', name + '金额');
    remove.title = '移除' + name;
    remove.setAttribute('aria-label', remove.title);
    // 每行先显示当前币种，打开下拉框时再生成完整选项。
    select.append(currencyOption(code));
    select.addEventListener('focus', () => fillOptions(select, index));
    select.addEventListener('pointerdown', () => {
      if (document.activeElement !== select) fillOptions(select, index);
    });
    select.addEventListener('change', () => {
      const next = [...currencies];
      next[index] = select.value;
      void saveCurrencies(next, active, amount, index, true);
    });
    input.addEventListener('input', () => {
      active = index;
      amount = input.value;
      render();
    });
    remove.addEventListener('click', () => {
      const next = currencies.filter((_, position) => position !== index);
      const nextActive = index === active ? 0 : active - Number(index < active);
      const nextAmount = index === active ? fields[index === 0 ? 1 : 0]?.input.value ?? '' : amount;
      void saveCurrencies(next, nextActive, nextAmount, Math.min(index, next.length - 1));
    });
    return { row, select, input, remove };
  });
  $('rows').replaceChildren(...fields.map(field => field.row));
  $('empty').hidden = fields.length > 0;
  scroller.scrollTop = scrollTop;
}

function render() {
  let values;
  let inputError = '';
  try { values = convertRows(amount, currencies, active, quotes); }
  catch (error) { inputError = error.message; }
  for (const [index, { select, input, remove }] of fields.entries()) {
    const code = currencies[index];
    const quoteDate = quotes.get(code)?.date;
    select.title = code + ' · ' + currencyName(code) + (quoteDate ? ' · ' + quoteDate : '');
    select.disabled = input.disabled = remove.disabled = saving || host.preview;
    const value = index === active ? amount : values?.[index] ?? '';
    if (input.value !== value) input.value = value;
    input.placeholder = index === active || quotes.has(code) ? '' : '暂无汇率';
  }
  component.style.backgroundColor = settings.background;
  component.style.color = settings.foreground;
  component.style.borderRadius = settings.radius + 'px';
  $('add').disabled = saving || host.preview || !nextAvailableCode();
  $('refresh').disabled = loading || saving || host.preview;
  $('settings').disabled = saving || host.preview;
  const dates = currencies.map(code => quotes.get(code)?.date).filter(Boolean).sort();
  const date = dates[0] ?? '';
  $('date').dateTime = date;
  $('date').textContent = date ? '数据日期 ' + date : '';
  $('date').title = dates.length > 1 && dates.at(-1) !== date
    ? '所选币种数据日期 ' + date + ' 至 ' + dates.at(-1) : '';
  const status = host.preview ? '预览 · 未联网'
    : saving ? '正在保存…'
    : saveError || inputError || (loading ? (quotes.size ? '正在刷新 · 使用上次汇率' : '正在读取汇率…')
      : rateError ? (quotes.size ? '刷新失败 · 使用上次汇率' : '无法读取汇率')
      : currencies.some(code => !quotes.has(code)) ? (quotes.size ? '部分币种暂无汇率' : '等待公开数据')
      : '结果保留 2 位小数');
  if ($('status').textContent !== status) $('status').textContent = status;
  $('status').title = rateError && !saveError && !inputError ? status + ' · ' + rateError : status;
}

async function saveCurrencies(next, nextActive, nextAmount, focusIndex, restoreFocus = false) {
  if (saving || host.preview) return;
  saving = true;
  saveError = '';
  render();
  try {
    settings = await host.request('settings.update', { ...settings, currencies: next.length ? next.join(',') : '[]' });
    currencies = configuredCurrencies(settings);
    active = nextActive;
    amount = nextAmount;
    renderRows();
    restoreFocus = true;
  } catch (error) {
    saveError = '币种选择未保存 · ' + error.message;
    if (restoreFocus) fields[focusIndex].select.value = currencies[focusIndex];
  } finally {
    saving = false;
    render();
    if (restoreFocus) (fields[focusIndex]?.select ?? $('add')).focus();
  }
}

async function refresh(forceRefresh = false) {
  if (host.preview || loading) return;
  loading = true;
  rateError = '';
  render();
  try {
    const { data } = await host.request('content.get', { source: 'forex-rates', cache: true, forceRefresh });
    quotes = readSnapshot(data);
    const focused = fields.findIndex(field => field.select === document.activeElement);
    if (focused >= 0) fillOptions(fields[focused].select, focused);
  } catch (error) {
    rateError = error.message;
  } finally {
    loading = false;
    render();
  }
}

$('add').addEventListener('click', () => {
  const code = nextAvailableCode();
  if (code) void saveCurrencies([...currencies, code], active, currencies.length ? amount : '1', currencies.length);
});
$('refresh').addEventListener('click', () => void refresh(true));
$('settings').addEventListener('click', () => {
  for (const key of themeKeys) form.elements.namedItem(key).value = settings[key];
  $('theme-error').textContent = '';
  dialog.showModal();
});
$('cancel').addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (saving || host.preview) return;
  saving = submit.disabled = $('cancel').disabled = true;
  $('theme-error').textContent = '';
  render();
  const values = new FormData(form);
  try {
    settings = await host.request('settings.update', {
      ...settings,
      background: values.get('background'),
      foreground: values.get('foreground'),
      radius: Number(values.get('radius')),
    });
    dialog.close();
  } catch (error) {
    $('theme-error').textContent = '保存失败 · ' + error.message;
  } finally {
    saving = submit.disabled = $('cancel').disabled = false;
    render();
  }
});

renderRows();
render();
await host.ready();

// 仅在宿主的隔离验收视图中执行受控交互和重启检查。
async function verify() {
  const storage = await host.request('storage.get');
  const prior = storage.verification?.format === 3 ? storage.verification : {};
  const background = '#' + host.instanceId.replaceAll('-', '').slice(0, 6);
  const result = { ...prior, format: 3, runtimeLoads: (prior.runtimeLoads || 0) + 1 };
  delete result.failure;
  result.stylesLoaded = result.uiVerified = false;
  async function until(test, message = '汇率界面验收条件等待超时') {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (test()) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(message);
  }
  function edit(index, value) {
    fields[index].input.value = value;
    fields[index].input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  try {
    if (!prior.actionsComplete) {
      result.defaultVerified = currencies.join(',') === 'CNY,USD,JPY';
      result.liveSource = { available: quotes.size > 0, count: quotes.size, date: $('date').dateTime, error: rateError };
      if (quotes.size) {
        fillOptions(fields[0].select, 0);
        const supported = [...fields[0].select.options].map(option => option.value);
        const twoDecimals = /^\d+\.\d{2}$/;
        edit(0, '100');
        const forward = [1, 2].every(index => twoDecimals.test(fields[index].input.value));
        edit(1, '12.5');
        const reverse = [0, 2].every(index => twoDecimals.test(fields[index].input.value));
        result.liveSource.verified = forward && reverse && ['GBP', 'TWD', 'MOP', 'CHF'].every(code => supported.includes(code));
      }
      edit(0, '1e3');
      result.invalidAmountRejected = fields[1].input.value === '' && $('status').textContent.includes('不支持');
      edit(0, '1');
      $('add').click();
      await until(() => !saving && fields.length === 4);
      const fourthCode = currencies[3];
      fields[3].remove.click();
      await until(() => !saving && fields.length === 3);
      $('add').click();
      await until(() => !saving && currencies[3] === fourthCode);
      fillOptions(fields[3].select, 3);
      const otherCode = ['GBP', 'HKD', 'AUD'].find(code => [...fields[3].select.options].some(option => option.value === code && !option.disabled && option.value !== fourthCode));
      fields[3].select.value = otherCode;
      fields[3].select.dispatchEvent(new Event('change', { bubbles: true }));
      await until(() => !saving && currencies[3] === otherCode);
      for (let count = 5; count <= 8; count++) {
        $('add').click();
        await until(() => !saving && fields.length === count);
      }
      result.rowEditingVerified = true;

      $('settings').click();
      const before = await host.request('settings.get');
      form.noValidate = true;
      form.elements.namedItem('radius').value = '99';
      form.requestSubmit();
      await until(() => $('theme-error').textContent.length > 0);
      result.invalidSaveRejected = dialog.open && JSON.stringify(before) === JSON.stringify(await host.request('settings.get'));
      form.elements.namedItem('background').value = background;
      form.elements.namedItem('radius').value = '12';
      form.requestSubmit();
      await until(() => !dialog.open);
      form.noValidate = false;
      result.savedCurrencies = currencies.join(',');
      result.actionsComplete = true;
    }
    // 重开时先等待窗口完成布局，再确认卡片与实际视口同宽同高。
    await until(() => {
      const bounds = component.getBoundingClientRect();
      return getComputedStyle(component).borderRadius === '12px' &&
        bounds.width > 0 && bounds.height > 0 &&
        Math.abs(bounds.width - document.documentElement.clientWidth) < 1 &&
        Math.abs(bounds.height - document.documentElement.clientHeight) < 1;
    }, '重开后未获得铺满视口的布局');
    const body = document.body;
    try {
      body.style.width = '240px';
      body.style.height = '184px';
      const smallFont = parseFloat(getComputedStyle(fields[0].input).fontSize);
      const smallRow = fields[0].row.offsetHeight;
      scroller.scrollTop = scroller.scrollHeight;
      result.scrollVerified = scroller.scrollTop > 0 &&
        fields.at(-1).row.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().bottom + 1;
      body.style.width = '480px';
      body.style.height = '320px';
      result.responsiveVerified = parseFloat(getComputedStyle(fields[0].input).fontSize) > smallFont &&
        fields[0].row.offsetHeight > smallRow;
    } finally {
      body.style.removeProperty('width');
      body.style.removeProperty('height');
    }
    result.stylesLoaded = result.scrollVerified && result.responsiveVerified;
    result.configurationSaved = settings.currencies === result.savedCurrencies &&
      settings.background === background && settings.radius === 12;
    result.businessStateVerified = result.defaultVerified && result.rowEditingVerified && result.invalidAmountRejected;
    result.uiVerified = result.invalidSaveRejected && result.stylesLoaded && result.configurationSaved && result.businessStateVerified;
  } catch (error) { result.failure = error.message; }
  await host.request('storage.set', { ...storage, verification: result });
}

let timer;
if (!host.preview) {
  const initialRefresh = refresh();
  if (new URLSearchParams(location.search).get('verify') === 'widgetjs') {
    await initialRefresh;
    await verify();
  }
  timer = setInterval(() => void refresh(), 30 * 60 * 1000);
}
window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
