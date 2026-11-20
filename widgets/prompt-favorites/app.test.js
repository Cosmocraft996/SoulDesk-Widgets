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

async function fixture(t, data = { prompts: [legacy, hidden, last], reserved: true }, { reducedMotion = false } = {}) {
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

  window.matchMedia = () => ({ matches: reducedMotion });
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  let captured = null;
  list.setPointerCapture = pointerId => { captured = pointerId; };
  list.hasPointerCapture = pointerId => captured === pointerId;
  list.releasePointerCapture = () => { captured = null; };
  const proto = window.HTMLElement.prototype;
  const height = element => {
    if (element.hidden) return 0;
    if (element.matches('.collection')) return 220;
    if (element.matches('#list, .group, .prompts')) {
      return [...element.children].reduce((sum, child) => sum + height(child), 0);
    }
    return 27;
  };
  const top = element => {
    if (element.matches('.collection')) return 40;
    if (element === list) return 40 - list.parentElement.scrollTop;
    if (!element.parentElement) return 0;
    return top(element.parentElement) + element.offsetTop;
  };
  Object.defineProperty(proto, 'offsetTop', {
    get() {
      let offset = 0;
      for (let sibling = this.previousElementSibling; sibling; sibling = sibling.previousElementSibling) offset += height(sibling);
      return offset;
    },
  });
  Object.defineProperty(proto, 'offsetHeight', { get() { return height(this); } });
  proto.getBoundingClientRect = function () {
    const y = top(this);
    return { left: 8, right: 288, top: y, width: 280, height: height(this), bottom: y + height(this) };
  };
  proto.scrollIntoView = () => {};
  proto.getAnimations = () => [];
  proto.animate = function () { animations.push(this.dataset.id ?? this.dataset.group); };

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
    group: id => find('[data-group="' + id + '"]'),
    groups: () => [...list.children].filter(group => !group.hidden).map(group => group.dataset.group),
    order: (groupId = '') => [...list.querySelectorAll(`[data-group="${groupId}"] .prompt-row`)].map(row => row.dataset.id),
    submitCategory() { find('#category-form').dispatchEvent(new Event('submit', { cancelable: true })); },
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

test('显示组件标题，旧收藏进入未分类且继续按正文显示、悬停、复制和搜索', async t => {
  const f = await fixture(t);
  const row = f.row('a');
  assert.equal(row.textContent, '匹配甲 保留 空格和换行');
  assert.equal(row.parentElement.children.length, 1);
  assert.equal(f.find('main h1').textContent, 'Prompt 收藏夹');
  assert.deepEqual(f.groups(), ['']);
  assert.equal(f.group('').querySelector('.group-menu').hidden, true);
  assert.equal(f.writes(), 0);
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
  f.pointer('pointerdown', f.row('a'), 80);
  f.pointer('pointermove', f.window, 83);
  assert.equal(f.find('.drag-ghost'), null);
  f.pointer('pointermove', f.window, 137);
  assert.equal(f.find('.drag-ghost').textContent, f.row('a').textContent);
  assert.deepEqual(f.order(), ['b', 'c', 'a']);
  assert.deepEqual(f.animations, ['b', 'c']);
  assert.equal(f.writes(), 0);

  f.pointer('pointerup', f.window, 137);
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
  f.pointer('pointerdown', f.row('c'), 107);
  f.pointer('pointermove', f.window, 72);
  assert.deepEqual(f.order(), ['c', 'a']);
  f.escape();
  assert.deepEqual(f.order(), ['a', 'c']);
  assert.equal(f.writes(), 0);

  f.fail(true);
  f.pointer('pointerdown', f.row('a'), 80);
  f.pointer('pointermove', f.window, 112);
  assert.deepEqual(f.order(), ['c', 'a']);
  f.pointer('pointerup', f.window, 112);
  await Promise.resolve();
  assert.deepEqual(f.order(), ['a', 'c']);
  assert.deepEqual(f.stored().prompts, [legacy, hidden, last]);
  assert.match(f.find('#status').textContent, /保存未确认/);

  f.fail(false);
  f.pointer('pointerdown', f.row('a'), 80);
  f.pointer('pointermove', f.window, 112);
  f.pointer('pointerup', f.window, 112);
  await Promise.resolve();
  assert.deepEqual(f.order(), ['c', 'a']);
  assert.deepEqual(f.stored().prompts, [hidden, last, legacy]);
});

const work = { id: 'work', name: '工作' };
const study = { id: 'study', name: '学习' };
const grouped = {
  categories: [work, study],
  prompts: [legacy, { ...hidden, categoryId: work.id }, { ...last, categoryId: study.id }],
};

test('单组和全部开合共用当前状态，搜索自动显示匹配的折叠组并恢复原状态', async t => {
  const f = await fixture(t, grouped);
  const all = f.find('#toggle-all');
  const body = id => f.group(id).querySelector('.prompts');
  assert.deepEqual(f.groups(), ['work', 'study', '']);
  f.group('work').querySelector('.group-toggle').click();
  assert.equal(body('work').hidden, true);
  assert.equal(all.textContent, '全部展开');
  f.filter('另一条');
  assert.deepEqual(f.groups(), ['work']);
  assert.equal(body('work').hidden, false);
  f.filter('');
  assert.equal(body('work').hidden, true);
  all.click();
  assert.ok(f.groups().every(id => !body(id).hidden));
  assert.equal(all.textContent, '全部折叠');
  all.click();
  assert.ok(f.groups().every(id => body(id).hidden));
  assert.equal(all.textContent, '全部展开');
  assert.equal(f.writes(), 0);
});

test('分类新增、改名及删除可重开恢复，删除后收藏按原顺序移至未分类顶部', async t => {
  const f = await fixture(t, { ...grouped, prompts: [...grouped.prompts, { id: 'd', content: '第四条', categoryId: work.id }] });
  f.find('#add-category').click();
  const name = f.find('#category-name');
  name.value = '未分类';
  f.submitCategory();
  assert.match(f.find('#category-status').textContent, /同名/);
  name.value = '  生活  ';
  f.fail(true);
  f.submitCategory();
  await Promise.resolve();
  assert.equal(f.find('#category-editor').open, true);
  assert.equal(name.value, '  生活  ');
  f.fail(false);
  f.submitCategory();
  await Promise.resolve();
  const customId = f.stored().categories.at(-1).id;
  assert.equal(f.stored().categories.at(-1).name, '生活');
  f.menu(f.group(customId).querySelector('.group-toggle'));
  f.find('#edit').click();
  name.value = '生活记录';
  f.submitCategory();
  await Promise.resolve();
  assert.deepEqual(f.stored().categories.at(-1), { id: customId, name: '生活记录' });
  f.menu(f.group('work').querySelector('.group-toggle'));
  f.find('#menu-delete').click();
  assert.match(f.find('#delete-preview').textContent, /未分类/);
  f.fail(true);
  f.find('#remove').click();
  await Promise.resolve();
  assert.deepEqual(f.order('work'), ['b', 'd']);
  assert.equal(f.find('#confirmation').open, true);
  f.fail(false);
  f.find('#remove').click();
  await Promise.resolve();
  const reopened = await fixture(t, f.stored());
  assert.deepEqual(reopened.groups(), ['study', customId, '']);
  assert.deepEqual(reopened.order(), ['b', 'd', 'a']);
  assert.deepEqual(reopened.order('study'), ['c']);
  assert.deepEqual(f.stored().prompts.find(item => item.id === 'a'), legacy);
});

test('收藏右键顶部和底部保持组内范围，展开移动子菜单包含全部分组', async t => {
  const copy = { id: 'd', content: '工作第二条', categoryId: work.id };
  const f = await fixture(t, { ...grouped, prompts: [...grouped.prompts, copy] });
  f.menu(f.row('b'));
  assert.equal(f.find('#move-top').disabled, true);
  f.find('#move-bottom').click();
  await Promise.resolve();
  assert.deepEqual(f.order('work'), ['d', 'b']);
  assert.deepEqual(f.order(), ['a']);
  f.filter('另一条');
  f.menu(f.row('b'));
  const menu = f.find('#move-group');
  assert.equal(menu.open, false);
  menu.querySelector('summary').click();
  assert.equal(menu.open, true);
  const destinations = [...menu.querySelectorAll('button')];
  assert.deepEqual(destinations.map(button => button.textContent), ['工作', '学习', '未分类']);
  assert.equal(destinations[0].disabled, true);
  destinations[1].click();
  await Promise.resolve();
  f.filter('');
  assert.deepEqual(f.order('study'), ['b', 'c']);
  assert.deepEqual(f.order('work'), ['d']);
});

test('通过编辑换组和新建收藏均放到目标组顶部', async t => {
  const f = await fixture(t, grouped);
  f.menu(f.row('a'));
  f.find('#edit').click();
  f.find('#category').value = 'work';
  f.submit();
  await Promise.resolve();
  assert.deepEqual(f.order('work'), ['a', 'b']);
  assert.equal(f.stored().prompts[0].title, legacy.title);
  f.find('#add').click();
  assert.equal(f.find('#category').value, '');
  f.find('#category').value = 'work';
  f.find('#body').value = '新增工作收藏';
  f.submit();
  await Promise.resolve();
  assert.deepEqual(f.order('work'), [f.stored().prompts[0].id, 'a', 'b']);
});

test('分类右键置顶置底，拖动时收拢并动效让位，未分类固定在底部', async t => {
  const f = await fixture(t, grouped);
  f.menu(f.group('').querySelector('.group-toggle'));
  assert.equal(f.find('#actions').hidden, true);
  f.menu(f.group('study').querySelector('.group-toggle'));
  assert.equal(f.find('#move-group').hidden, true);
  f.find('#move-top').click();
  await Promise.resolve();
  assert.deepEqual(f.groups(), ['study', 'work', '']);
  f.menu(f.group('study').querySelector('.group-toggle'));
  f.find('#move-bottom').click();
  await Promise.resolve();
  assert.deepEqual(f.groups(), ['work', 'study', '']);

  f.group('study').querySelector('.group-toggle').click();
  const handle = f.group('study').querySelector('.group-handle');
  const startY = f.group('study').getBoundingClientRect().top + 10;
  const targetY = f.group('work').getBoundingClientRect().top + 4;
  f.pointer('pointerdown', handle, startY);
  f.pointer('pointermove', f.window, startY - 7);
  assert.ok(f.groups().every(id => f.group(id).querySelector('.prompts').hidden));
  assert.deepEqual(f.groups(), ['work', 'study', '']);
  assert.ok(f.animations.includes(''));
  const foldingAnimations = f.animations.length;
  f.pointer('pointermove', f.window, targetY);
  assert.deepEqual(f.groups(), ['study', 'work', '']);
  assert.deepEqual(f.animations.slice(foldingAnimations), ['work']);
  assert.equal(f.writes(), 2);
  f.pointer('pointerup', f.window, targetY);
  await Promise.resolve();
  assert.deepEqual(f.groups(), ['study', 'work', '']);
  assert.deepEqual(f.groups().map(id => f.group(id).querySelector('.prompts').hidden), [true, false, false]);
  assert.equal(f.writes(), 3);
  const reopened = await fixture(t, f.stored());
  assert.deepEqual(reopened.groups(), ['study', 'work', '']);
});

test('分类拖到未分类只能排在它前面，空白释放或保存失败时恢复原顺序和开合', async t => {
  const f = await fixture(t, grouped, { reducedMotion: true });
  f.group('work').querySelector('.group-toggle').click();
  function previewMove() {
    const group = f.group('work');
    const startY = group.getBoundingClientRect().top + 10;
    f.pointer('pointerdown', group.querySelector('.group-handle'), startY);
    f.pointer('pointermove', f.window, startY + 7);
    const targetY = f.group('').getBoundingClientRect().bottom - 3;
    f.pointer('pointermove', f.window, targetY);
    assert.deepEqual(f.groups(), ['study', 'work', '']);
    return targetY;
  }
  function assertRestored() {
    assert.deepEqual(f.groups(), ['work', 'study', '']);
    assert.deepEqual(f.groups().map(id => f.group(id).querySelector('.prompts').hidden), [true, false, false]);
    assert.deepEqual(f.stored(), grouped);
    assert.deepEqual(f.animations, []);
  }
  previewMove();
  f.pointer('pointerup', f.window, 220);
  assert.equal(f.writes(), 0);
  assertRestored();
  const targetY = previewMove();
  f.fail(true);
  f.pointer('pointerup', f.window, targetY);
  await Promise.resolve();
  assertRestored();
  assert.match(f.find('#status').textContent, /保存未确认/);
});

test('收藏拖出原组临时折叠全部，命中目标标题后移到组首并恢复开合', async t => {
  const f = await fixture(t, grouped);
  f.group('study').querySelector('.group-toggle').click();
  const startY = f.row('b').getBoundingClientRect().top + 10;
  f.pointer('pointerdown', f.row('b'), startY);
  f.pointer('pointermove', f.window, f.group('work').getBoundingClientRect().bottom + 4);
  const bodies = [...f.window.document.querySelectorAll('.prompts')];
  assert.ok(bodies.every(body => body.hidden));
  const targetY = f.group('study').getBoundingClientRect().top + 10;
  f.pointer('pointermove', f.window, targetY);
  assert.equal(f.group('study').classList.contains('drop-target'), true);
  assert.equal(f.writes(), 0);
  f.pointer('pointerup', f.window, targetY);
  await Promise.resolve();
  assert.deepEqual(f.order('study'), ['b', 'c']);
  assert.deepEqual(f.order('work'), []);
  assert.deepEqual(f.groups().map(id => f.group(id).querySelector('.prompts').hidden), [false, true, false]);
  assert.equal(f.writes(), 1);
});

test('搜索时跨组可见全部目标，放到空白或保存失败时保留收藏及原开合', async t => {
  const f = await fixture(t, grouped);
  f.filter('另一条');
  assert.deepEqual(f.groups(), ['work']);
  function enterGroupDrag() {
    f.pointer('pointerdown', f.row('b'), f.row('b').getBoundingClientRect().top + 10);
    f.pointer('pointermove', f.window, 200);
    assert.deepEqual(f.groups(), ['work', 'study', '']);
  }
  enterGroupDrag();
  f.pointer('pointerup', f.window, 200);
  assert.equal(f.writes(), 0);
  assert.deepEqual(f.groups(), ['work']);
  enterGroupDrag();
  f.fail(true);
  f.pointer('pointerup', f.window, f.group('').getBoundingClientRect().top + 10);
  await Promise.resolve();
  assert.deepEqual(f.stored(), grouped);
  assert.deepEqual(f.groups(), ['work']);
  assert.equal(f.group('work').querySelector('.prompts').hidden, false);
  assert.match(f.find('#status').textContent, /保存未确认/);
});
