// 离线执行组件事件。宿主存储、系统剪贴板和列表几何使用夹具。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { JSDOM } = createRequire(new URL('../../source/widgetjs-port/package.json', import.meta.url))('jsdom');

const read = file => readFileSync(new URL('src/' + file, import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const start = new AsyncFunction('connectHost', 'window', 'document', 'navigator',
  read('app.js').replace("import { connectHost } from './host.js';", ''));
const legacy = { id: 'a', title: '旧版标题', content: '匹配甲\n\n保留  空格和换行' };
const hidden = { id: 'b', content: '另一条' };
const last = { id: 'c', content: '匹配丙' };

async function fixture(t, data = { prompts: [legacy, hidden, last], reserved: true }) {
  const { window } = new JSDOM(read('index.html'), { pretendToBeVisual: true });
  t.after(() => window.close());
  const { document, PointerEvent, MouseEvent, Event, KeyboardEvent } = window;
  const find = selector => document.querySelector(selector);
  const list = find('#list');
  const animations = [];
  const clipboard = [];
  let stored = structuredClone(data);
  let writes = 0;
  let fail = false;
  let ready = false;
  const host = {
    async request(method, args) {
      if (method === 'storage.get') return structuredClone(stored);
      assert.equal(method, 'storage.set');
      writes++;
      if (fail) throw new Error('模拟保存失败');
      stored = structuredClone(args);
    },
    async ready() { ready = true; },
  };

  window.matchMedia = () => ({ matches: false });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  let captured = null;
  list.setPointerCapture = pointerId => { captured = pointerId; };
  list.hasPointerCapture = pointerId => captured === pointerId;
  list.releasePointerCapture = () => { captured = null; };
  const proto = window.HTMLElement.prototype;
  Object.defineProperty(proto, 'offsetTop', {
    get() { return this.parentElement === list ? [...list.children].indexOf(this) * 27 : 0; },
  });
  Object.defineProperty(proto, 'offsetHeight', { get() { return 27; } });
  proto.getBoundingClientRect = function () {
    const top = 40 + this.offsetTop;
    return { left: 8, top, width: 280, height: 27, bottom: top + 27 };
  };
  proto.getAnimations = () => [];
  proto.animate = function () { animations.push(this.dataset.id); };

  await start(async () => host, window, document, {
    clipboard: { async writeText(content) { clipboard.push(content); } },
  });
  assert.equal(ready, true);
  return {
    window, find, animations, clipboard,
    stored: () => stored,
    writes: () => writes,
    fail: value => { fail = value; },
    row: id => find('[data-id="' + id + '"] button'),
    order: () => [...list.children].map(row => row.dataset.id),
    pointer(type, target, y) {
      target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
        pointerType: 'mouse', pointerId: 1, clientX: 60, clientY: y,
      }));
    },
    menu(target) {
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true, button: 2, clientX: 60, clientY: 50, cancelable: true,
      }));
    },
    filter(value) {
      const search = find('#search');
      search.value = value;
      search.dispatchEvent(new Event('input'));
    },
    submit() { find('#form').dispatchEvent(new Event('submit', { cancelable: true })); },
    escape() { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); },
  };
}

test('旧收藏只显示单行正文，悬停和复制保留完整内容，搜索匹配正文', async t => {
  const f = await fixture(t);
  const row = f.row('a');
  assert.equal(row.textContent, '匹配甲 保留 空格和换行');
  assert.equal(row.parentElement.children.length, 1);
  assert.equal(f.find('main h1'), null);
  assert.equal(f.find('#add').textContent, '');
  assert.equal(f.find('#add').getAttribute('aria-label'), '新增收藏');

  f.pointer('pointerenter', row, 53);
  assert.equal(f.find('#preview').hidden, false);
  assert.equal(f.find('#preview').textContent, legacy.content);
  f.pointer('pointerleave', row, 54);
  f.pointer('pointerenter', f.row('b'), 80);
  assert.equal(f.find('#preview').textContent, hidden.content);

  row.click();
  assert.deepEqual(f.clipboard, [legacy.content]);
  assert.equal(f.find('#preview').hidden, true);
  f.filter(legacy.title);
  assert.deepEqual(f.order(), []);
  f.filter('换行');
  assert.deepEqual(f.order(), ['a']);
});

test('右键编辑保留旧记录，当保存失败时保留草稿，新增无需标题', async t => {
  const f = await fixture(t);
  f.menu(f.row('a'));
  assert.equal(f.find('#actions').hidden, false);
  assert.equal(f.find('#move-top').disabled, true);
  f.find('#edit').click();
  assert.equal(f.find('#editor').open, true);
  assert.equal(f.find('#body').value, legacy.content);
  assert.equal(f.find('#editor input'), null);
  f.find('#body').value = '新版正文\n保留换行';
  f.fail(true);
  f.submit();
  await Promise.resolve();
  assert.equal(f.find('#editor').open, true);
  assert.equal(f.find('#body').value, '新版正文\n保留换行');
  assert.deepEqual(f.stored().prompts[0], legacy);

  f.fail(false);
  f.submit();
  await Promise.resolve();
  assert.deepEqual(f.stored().prompts[0], { ...legacy, content: '新版正文\n保留换行' });
  f.find('#add').click();
  f.find('#body').value = '只有正文';
  f.submit();
  await Promise.resolve();
  assert.deepEqual(Object.keys(f.stored().prompts[0]), ['id', 'content']);
  assert.equal(f.stored().prompts[0].content, '只有正文');
});

test('搜索时右键置顶更新完整列表，重新打开恢复顺序', async t => {
  const f = await fixture(t);
  f.filter('匹配');
  f.menu(f.row('c'));
  assert.equal(f.find('#move-top').disabled, false);
  f.find('#move-top').click();
  await Promise.resolve();
  assert.deepEqual(f.order(), ['c', 'a']);
  assert.deepEqual(f.stored(), { prompts: [last, legacy, hidden], reserved: true });
  const reopened = await fixture(t, f.stored());
  assert.deepEqual(reopened.order(), ['c', 'a', 'b']);
});

test('搜索时右键移到底部更新完整列表，并禁用已在底部的条目的移动操作', async t => {
  const f = await fixture(t);
  f.filter('匹配');
  f.menu(f.row('c'));
  assert.equal(f.find('#move-bottom').disabled, true);
  f.menu(f.row('a'));
  assert.equal(f.find('#move-bottom').disabled, false);
  f.find('#move-bottom').click();
  await Promise.resolve();
  assert.deepEqual(f.order(), ['c', 'a']);
  assert.deepEqual(f.stored().prompts, [hidden, last, legacy]);

  const reopened = await fixture(t, f.stored());
  assert.deepEqual(reopened.order(), ['b', 'c', 'a']);
});

test('右键删除以菜单所选条目为准，取消或保存失败时保留收藏', async t => {
  const f = await fixture(t);
  f.menu(f.row('a'));
  f.find('#edit').click();
  f.find('#cancel').click();

  f.menu(f.row('b'));
  f.find('#menu-delete').click();
  assert.equal(f.find('#editor').open, false);
  assert.equal(f.find('#confirmation').open, true);
  assert.equal(f.find('#delete-preview').textContent, hidden.content);
  f.find('#keep').click();
  assert.equal(f.writes(), 0);

  f.menu(f.row('b'));
  f.find('#menu-delete').click();
  f.fail(true);
  f.find('#remove').click();
  await Promise.resolve();
  assert.equal(f.find('#confirmation').open, true);
  assert.match(f.find('#delete-status').textContent, /保存未确认/);
  assert.deepEqual(f.order(), ['a', 'b', 'c']);

  f.fail(false);
  f.find('#remove').click();
  await Promise.resolve();
  assert.equal(f.find('#confirmation').open, false);
  assert.deepEqual(f.stored().prompts, [legacy, last]);
  assert.deepEqual(f.order(), ['a', 'c']);
});

test('拖动期间预览换位，松手只保存一次且不误复制', async t => {
  const f = await fixture(t);
  f.pointer('pointerdown', f.row('a'), 53);
  f.pointer('pointermove', f.window, 56);
  assert.equal(f.find('.drag-ghost'), null);
  f.pointer('pointermove', f.window, 110);
  assert.equal(f.find('.drag-ghost').textContent, f.row('a').textContent);
  assert.deepEqual(f.order(), ['b', 'c', 'a']);
  assert.deepEqual(f.animations, ['b', 'c']);
  assert.equal(f.writes(), 0);

  f.pointer('pointerup', f.window, 110);
  f.row('a').dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, detail: 1 }));
  await Promise.resolve();
  assert.equal(f.find('.drag-ghost'), null);
  assert.equal(f.writes(), 1);
  assert.deepEqual(f.stored().prompts, [hidden, last, legacy]);
  assert.deepEqual(f.clipboard, []);
});

test('取消拖动和排序写入失败均恢复原序', async t => {
  const f = await fixture(t);
  f.filter('匹配');
  f.pointer('pointerdown', f.row('c'), 80);
  f.pointer('pointermove', f.window, 45);
  assert.deepEqual(f.order(), ['c', 'a']);
  f.escape();
  assert.deepEqual(f.order(), ['a', 'c']);
  assert.equal(f.writes(), 0);

  f.fail(true);
  f.pointer('pointerdown', f.row('a'), 53);
  f.pointer('pointermove', f.window, 100);
  assert.deepEqual(f.order(), ['c', 'a']);
  f.pointer('pointerup', f.window, 100);
  await Promise.resolve();
  assert.deepEqual(f.order(), ['a', 'c']);
  assert.deepEqual(f.stored().prompts, [legacy, hidden, last]);
  assert.match(f.find('#status').textContent, /顺序保存未确认/);

  f.fail(false);
  f.pointer('pointerdown', f.row('a'), 53);
  f.pointer('pointermove', f.window, 100);
  f.pointer('pointerup', f.window, 100);
  await Promise.resolve();
  assert.deepEqual(f.order(), ['c', 'a']);
  assert.deepEqual(f.stored().prompts, [hidden, last, legacy]);
});
