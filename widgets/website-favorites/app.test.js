import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const { JSDOM } = createRequire(new URL('../../source/widgetjs-port/package.json', import.meta.url))('jsdom');
const read = file => readFileSync(new URL('src/' + file, import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const start = new AsyncFunction('connectHost', 'window', 'document', 'Image', 'setTimeout', 'clearTimeout',
  read('app.js').replace("import { connectHost } from './host.js';", ''));
const originalIcon = 'data:image/x-icon;base64,AAABAA==';
const compactedIcon = 'data:image/png;base64,iVBORw0KGgo=';
const flush = () => new Promise(setImmediate);

async function fixture(t, { preview = false, data = { version: 1, sites: [] }, draft } = {}) {
  const { window } = new JSDOM(read('index.html'), { pretendToBeVisual: true, url: 'http://widget.localhost/' });
  t.after(() => window.close());
  const { document } = window;
  if (draft) window.sessionStorage.setItem('souldesk.website-favorites.verify.bookmarks', JSON.stringify(draft));
  const find = id => document.getElementById(id);
  let timer;
  let stored = structuredClone(data);
  let writes = 0;
  const requests = [];
  const verification = [];
  const host = {
    preview,
    instanceId: 'bookmarks',
    async ready() {},
    async request(method, args) {
      if (method === 'storage.get') return structuredClone(stored);
      if (method === 'storage.set') {
        stored = structuredClone(args);
        writes++;
        return;
      }
      if (method.startsWith('links.verify.')) {
        return new Promise((resolve, reject) => verification.push({ method, args, resolve, reject }));
      }
      assert.equal(method, 'links.metadata');
      return new Promise((resolve, reject) => requests.push({ url: args.url, resolve, reject }));
    },
  };

  window.matchMedia = () => ({ matches: false });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new window.Event('close'));
  };
  window.HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
  window.HTMLCanvasElement.prototype.toDataURL = () => compactedIcon;
  class TestImage {
    naturalWidth = 16;
    naturalHeight = 32;
    async decode() { assert.equal(this.src, originalIcon); }
  }

  await start(async () => host, window, document, TestImage,
    callback => { timer = callback; return 1; }, () => { timer = undefined; });
  return {
    document, find, requests, verification,
    runTimer: () => timer?.(),
    stored: () => stored,
    writes: () => writes,
    input(id, value) {
      find(id).value = value;
      find(id).dispatchEvent(new window.Event('input'));
    },
    submit: () => find('form').dispatchEvent(new window.Event('submit', { cancelable: true })),
  };
}

test('提交复用已开始的读取，标题和缩小后的图标随收藏保存并恢复', async t => {
  const page = await fixture(t);
  page.find('add').click();
  page.input('address', 'example.com/path');
  page.runTimer();
  page.submit();
  assert.equal(page.writes(), 0);
  assert.deepEqual(page.requests.map(request => request.url), ['https://example.com/path']);
  page.requests[0].resolve({ title: '示例页面', icon: originalIcon });
  await flush();
  assert.equal(page.writes(), 1);
  assert.equal(page.stored().sites[0].name, '示例页面');
  assert.equal(page.stored().sites[0].icon, compactedIcon);
  const reopened = await fixture(t, { data: page.stored() });
  assert.equal(reopened.document.querySelector('.site-icon img').src, compactedIcon);
  assert.equal(reopened.requests.length, 0);
});

test('晚到的旧网址结果和当前结果都不能覆盖手动名称', async t => {
  const page = await fixture(t);
  page.find('add').click();
  page.input('address', 'first.example.com');
  page.runTimer();
  page.input('address', 'second.example.com');
  page.runTimer();
  page.requests[0].resolve({ title: '旧网址' });
  await flush();
  assert.equal(page.find('name').value, '');
  page.input('name', '自定义名称');
  page.requests[1].resolve({ title: '网页名称', icon: originalIcon });
  await flush();
  assert.equal(page.find('name').value, '自定义名称');
  page.submit();
  await flush();
  assert.equal(page.stored().sites[0].name, '自定义名称');
  assert.equal(page.stored().sites[0].url, 'https://second.example.com/');
});

test('读取失败可保存，取消和试加载均不写入迟到的结果', async t => {
  const page = await fixture(t);
  page.find('add').click();
  page.input('address', 'offline.example.com');
  page.runTimer();
  page.requests[0].reject(new Error('网络失败'));
  await flush();
  assert.match(page.find('editor-status').textContent, /可手动填写名称并保存/);
  page.submit();
  await flush();
  assert.equal(page.stored().sites[0].name, '');
  assert.equal(page.stored().sites[0].icon, null);
  assert.equal(page.document.querySelector('.site-name').textContent, 'offline.example.com');
  page.find('add').click();
  page.input('address', 'cancel.example.com');
  page.submit();
  page.find('cancel').click();
  page.requests[1].resolve({ title: '已取消' });
  await flush();
  assert.equal(page.writes(), 1);

  const preview = await fixture(t, { preview: true });
  preview.find('add').click();
  preview.input('address', 'example.com');
  preview.runTimer();
  assert.equal(preview.requests.length, 0);
});

test('识别浏览器验证后统一打开窗口并回填标题和图标', async t => {
  const page = await fixture(t);
  page.find('add').click();
  page.input('address', 'https://example.com/needs-browser');
  page.runTimer();
  page.requests[0].resolve({ status: 'verification', title: null, icon: null });
  await flush();
  assert.equal(page.find('browser-actions').hidden, false);
  assert.match(page.find('editor-status').textContent, /浏览器验证/);
  assert.equal(page.verification.length, 0);
  page.find('verify').click();
  const opening = page.verification[0];
  assert.equal(opening.method, 'links.verify.start');
  assert.equal(opening.args.url, 'https://example.com/needs-browser');
  opening.resolve({ state: 'pending' });
  await flush();
  const polling = page.verification[1];
  assert.equal(polling.method, 'links.verify.status');
  assert.equal(polling.args.id, opening.args.id);
  polling.resolve({ state: 'ready', title: '站点标题', icon: originalIcon });
  await flush();
  assert.equal(page.find('name').value, '站点标题');
  assert.equal(page.find('browser-actions').hidden, true);
  assert.equal(page.verification[2].method, 'links.verify.close');
  page.submit();
  await flush();
  assert.equal(page.stored().sites[0].icon, compactedIcon);
  assert.equal(page.stored().sites[0].name, '站点标题');
});

test('取消验证后，旧窗口的结果不会覆盖另一网址的草稿', async t => {
  const page = await fixture(t);
  page.find('add').click();
  page.input('address', 'https://old.example/');
  page.runTimer();
  page.requests[0].resolve({ status: 'unavailable', title: null, icon: null });
  await flush();
  page.find('verify').click();
  page.verification[0].resolve({ state: 'pending' });
  await flush();
  page.input('address', 'https://new.example/');
  assert.equal(page.verification[2].method, 'links.verify.close');
  page.verification[1].resolve({ state: 'ready', title: '旧页面', icon: originalIcon });
  await flush();
  assert.equal(page.find('name').value, '');
  assert.equal(page.writes(), 0);
});

test('组件视图重载后能恢复验证草稿，手填名称优先', async t => {
  const page = await fixture(t, { draft: {
    id: crypto.randomUUID(), url: 'https://example.com/',
    newId: 'draft-site', name: '我的名称', nameEdited: true,
  } });
  assert.equal(page.find('editor').open, true);
  assert.equal(page.find('address').value, 'https://example.com/');
  assert.equal(page.requests.length, 0);
  assert.equal(page.verification[0].method, 'links.verify.status');
  page.verification[0].resolve({ state: 'ready', title: '网页名称', icon: originalIcon });
  await flush();
  page.submit();
  await flush();
  assert.deepEqual(page.stored().sites[0], {
    id: 'draft-site', name: '我的名称', url: 'https://example.com/', icon: compactedIcon,
  });
});

test('编辑已有自定义端口的收藏可补图标并保留手填名称', async t => {
  const site = { id: 'saved', name: '手填名称', url: 'http://example.com:3000/', icon: null };
  const page = await fixture(t, { data: { version: 1, sites: [site] } });
  page.document.querySelector('.site-more').click();
  page.find('edit').click();
  assert.equal(page.requests[0].url, site.url);
  page.requests[0].resolve({ title: '网页标题', icon: originalIcon });
  await flush();
  assert.equal(page.find('name').value, '手填名称');
  page.submit();
  await flush();
  assert.deepEqual(page.stored().sites[0], { ...site, icon: compactedIcon });
});
