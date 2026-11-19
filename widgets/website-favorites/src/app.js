import { connectHost } from './host.js';

const starterSites = [
  { id: 'github', name: 'GitHub', url: 'https://github.com/' },
  { id: 'bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com/' },
  { id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com/' },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/' },
  { id: 'sspai', name: '少数派', url: 'https://sspai.com/' },
  { id: 'weibo', name: '微博', url: 'https://weibo.com/' },
  { id: 'docs', name: '腾讯文档', url: 'https://docs.qq.com/' },
  { id: 'weread', name: '微信读书', url: 'https://weread.qq.com/' },
];

function isIpAddress(hostname) {
  return hostname.startsWith('[') || /^\d+(?:\.\d+){3}$/.test(hostname);
}

function parseAddress(input) {
  const inputUrl = input.trim();
  const scheme = /^https?:\/\//i.exec(inputUrl)?.[0];
  const authority = inputUrl.slice(scheme?.length ?? 0).split(/[/?#]/, 1)[0];
  if (!authority || authority.includes('@') || authority.endsWith(':') || /[\s\\\p{Cc}]/u.test(inputUrl)) return null;
  try {
    let url = new URL(scheme ? inputUrl : `https://${inputUrl}`);
    if (!scheme && (authority.includes(':') || isIpAddress(url.hostname) || url.hostname === 'localhost')) {
      // 按原输入重新解析，保留裸地址中显式填写的端口（例如 :443）。
      url = new URL(`http://${inputUrl}`);
    }
    return url.port === '0' || url.href.length > 4096 ? null : url;
  } catch {
    return null;
  }
}

function readSites(storage) {
  if (Object.keys(storage).length === 0) return starterSites;
  if (storage.version !== 1 || !Array.isArray(storage.sites)) throw new Error('收藏数据格式无效');
  const ids = new Set();
  for (const site of storage.sites) {
    if (typeof site?.id !== 'string' || ids.has(site.id) || typeof site.name !== 'string'
      || typeof site.url !== 'string' || parseAddress(site.url)?.href !== site.url) {
      throw new Error('收藏数据包含无效网站');
    }
    ids.add(site.id);
  }
  return storage.sites;
}

function addFavicon(icon, url) {
  const address = new URL(url);
  const domain = address.hostname.replace(/\.$/, '');
  if (address.protocol !== 'https:' || address.port || isIpAddress(domain) || !domain.includes('.')
    || /\.(local|internal|localhost)$/.test(domain)) return;
  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => image.remove(), { once: true });
  image.addEventListener('load', () => { icon.dataset.loaded = ''; }, { once: true });
  image.src = new URL('/favicon.ico', url).href;
  icon.append(image);
}

const byId = id => document.getElementById(id);
const grid = byId('sites');
const collection = byId('collection');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const empty = byId('empty');
const add = byId('add');
const layoutButtons = [...byId('view-mode').querySelectorAll('button')];
const toolbarButtons = [...layoutButtons, add];
const status = byId('status');
const actions = byId('actions');
const moveTop = byId('move-top');
const moveBottom = byId('move-bottom');
const edit = byId('edit');
const editor = byId('editor');
const form = byId('form');
const address = byId('address');
const nameField = byId('name');
const editorStatus = byId('editor-status');
const confirmation = byId('confirmation');
const deleteStatus = byId('delete-status');

function start(host, storage) {
  let sites = readSites(storage);
  let layout = storage.layout === 'list' ? 'list' : 'grid';
  let saving = false;
  let menuTile;
  let selectedId;
  let newId;
  let drag;
  let ignorePointerClick = false;
  let iconsEnabled = false;

  function renderLayout() {
    grid.dataset.layout = layout;
    for (const button of layoutButtons) button.setAttribute('aria-pressed', String(button.dataset.layout === layout));
  }

  function render() {
    const tiles = sites.map(site => {
      const tile = byId('site-template').content.firstElementChild.cloneNode(true);
      tile.dataset.id = site.id;
      const { host: siteHost } = new URL(site.url);
      const label = site.name || siteHost;
      const open = tile.querySelector('.site-open');
      open.title = label === siteHost ? siteHost : `${label}\n${siteHost}`;
      tile.querySelector('.site-name').textContent = label;
      tile.querySelector('.site-domain').textContent = label === siteHost ? '' : siteHost;
      tile.querySelector('.monogram').textContent = Array.from(label)[0].toUpperCase();
      tile.querySelector('.site-more').setAttribute('aria-label', `${label}的收藏操作`);
      if (iconsEnabled) addFavicon(tile.querySelector('.site-icon'), site.url);
      return tile;
    });
    grid.replaceChildren(...tiles);
    empty.hidden = sites.length > 0;
    empty.textContent = '还没有收藏，添加一个常用网站。';
  }

  function focusTile(id) {
    const tile = Array.from(grid.children).find(item => item.dataset.id === id);
    (tile?.querySelector('.site-open') ?? add).focus();
  }

  async function persist(next, { dialog, feedback = status, focusId, nextLayout = layout, keepTiles = false } = {}) {
    if (saving) return false;
    saving = true;
    feedback.textContent = '';
    const focused = document.activeElement;
    const controls = dialog ? [...toolbarButtons, ...dialog.querySelectorAll('button, input')] : toolbarButtons;
    for (const control of controls) control.disabled = true;
    try {
      await host.request('storage.set', { ...storage, version: 1, sites: next, layout: nextLayout });
      const sitesChanged = sites !== next;
      sites = next;
      if (dialog) dialog.close();
      if (sitesChanged && !keepTiles) render();
      if (layout !== nextLayout) {
        layout = nextLayout;
        renderLayout();
        collection.scrollTop = 0;
      }
      return true;
    } catch {
      feedback.textContent = '保存未确认，请重试。';
      return false;
    } finally {
      saving = false;
      for (const control of controls) control.disabled = false;
      if (dialog?.open && dialog.contains(focused)) focused.focus();
      else if (focusId) focusTile(focusId);
      else if (toolbarButtons.includes(focused)) focused.focus({ preventScroll: true });
    }
  }

  function moveSite(source, destination, options) {
    if (source < 0 || destination < 0 || source === destination) return false;
    const next = [...sites];
    const [site] = next.splice(source, 1);
    next.splice(destination, 0, site);
    return persist(next, { focusId: site.id, ...options });
  }

  async function openSite(site) {
    if (host.preview) return;
    status.textContent = '';
    try {
      await host.request('links.openWeb', { url: site.url });
    } catch {
      status.textContent = '打开网页未确认，请检查默认浏览器。';
    }
  }

  function hideActions(restoreFocus = false) {
    if (!menuTile) return;
    const more = menuTile.querySelector('.site-more');
    more.setAttribute('aria-expanded', 'false');
    actions.hidden = true;
    menuTile = undefined;
    if (restoreFocus) more.focus({ preventScroll: true });
  }

  function showActions(tile, x, y) {
    if (saving || drag?.ghost) return;
    hideActions();
    menuTile = tile;
    tile.querySelector('.site-more').setAttribute('aria-expanded', 'true');
    moveTop.disabled = tile === grid.firstElementChild;
    moveBottom.disabled = tile === grid.lastElementChild;
    actions.hidden = false;
    actions.style.left = `${Math.max(4, Math.min(x, window.innerWidth - actions.offsetWidth - 4))}px`;
    actions.style.top = `${Math.max(4, Math.min(y, window.innerHeight - actions.offsetHeight - 4))}px`;
    actions.querySelector('button:not(:disabled)').focus({ preventScroll: true });
  }

  function showEditor(site) {
    if (saving) return;
    endDrag();
    hideActions(true);
    selectedId = site?.id;
    newId = site ? undefined : crypto.randomUUID();
    byId('editor-title').textContent = site ? '编辑网站' : '添加网站';
    address.value = site?.url ?? '';
    nameField.value = site?.name ?? '';
    editorStatus.textContent = '';
    status.textContent = '';
    editor.showModal();
  }

  async function moveToEdge(destination) {
    const id = menuTile?.dataset.id;
    if (!id) return;
    const index = sites.findIndex(site => site.id === id);
    hideActions(true);
    if (await moveSite(index, destination)) collection.scrollTop = destination === 0 ? 0 : collection.scrollHeight;
  }

  for (const button of layoutButtons) {
    button.addEventListener('click', () => {
      const nextLayout = button.dataset.layout;
      if (saving || layout === nextLayout) return;
      hideActions();
      endDrag();
      void persist(sites, { nextLayout });
    });
  }
  add.addEventListener('click', () => showEditor());
  edit.addEventListener('click', () => showEditor(sites.find(site => site.id === menuTile?.dataset.id)));
  moveTop.addEventListener('click', () => void moveToEdge(0));
  moveBottom.addEventListener('click', () => void moveToEdge(sites.length - 1));
  byId('remove').addEventListener('click', () => {
    const site = sites.find(item => item.id === menuTile?.dataset.id);
    if (!site) return;
    hideActions(true);
    selectedId = site.id;
    byId('delete-name').textContent = site.name || new URL(site.url).host;
    deleteStatus.textContent = '';
    status.textContent = '';
    confirmation.showModal();
  });
  byId('cancel').addEventListener('click', () => editor.close());
  byId('keep').addEventListener('click', () => confirmation.close());
  for (const dialog of [editor, confirmation]) {
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      if (saving) return;
      if (dialog.contains(document.activeElement) || document.activeElement === document.body) focusTile(selectedId);
    });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (saving) return;
    const url = parseAddress(address.value);
    if (!url) {
      editorStatus.textContent = '请输入 HTTP 或 HTTPS 网址，例如 192.168.1.10:8080。';
      address.focus();
      return;
    }
    const site = { id: selectedId ?? newId, name: nameField.value.trim(), url: url.href };
    const next = selectedId ? sites.map(item => item.id === selectedId ? site : item) : [site, ...sites];
    void persist(next, { dialog: editor, feedback: editorStatus, focusId: site.id });
  });
  byId('confirm-remove').addEventListener('click', () => {
    const index = sites.findIndex(site => site.id === selectedId);
    const next = sites.filter(site => site.id !== selectedId);
    void persist(next, { dialog: confirmation, feedback: deleteStatus, focusId: next[index]?.id ?? next.at(-1)?.id ?? selectedId });
  });

  grid.addEventListener('click', event => {
    if (drag?.ghost || (event.detail && ignorePointerClick)) return;
    const tile = event.target.closest('.site');
    if (!tile) return;
    const more = event.target.closest('.site-more');
    if (more) {
      if (menuTile === tile) hideActions(true);
      else {
        const rect = more.getBoundingClientRect();
        showActions(tile, rect.left, rect.bottom + 3);
      }
      return;
    }
    if (!event.target.closest('.site-open')) return;
    hideActions();
    void openSite(sites.find(site => site.id === tile.dataset.id));
  });
  grid.addEventListener('contextmenu', event => {
    const tile = event.target.closest('.site');
    if (!tile) return;
    event.preventDefault();
    const rect = tile.getBoundingClientRect();
    const keyboard = event.clientX === 0 && event.clientY === 0;
    showActions(tile, keyboard ? rect.left : event.clientX, keyboard ? rect.bottom : event.clientY);
  });
  document.addEventListener('pointerdown', event => {
    if (!drag) ignorePointerClick = false;
    if (menuTile && !actions.contains(event.target) && !menuTile.querySelector('.site-more').contains(event.target)) hideActions();
  }, true);
  actions.addEventListener('focusout', event => {
    if (!actions.contains(event.relatedTarget) && !menuTile?.querySelector('.site-more').contains(event.relatedTarget)) hideActions();
  });
  collection.addEventListener('scroll', () => {
    hideActions();
    if (drag?.ghost) moveDraggedTile();
  });
  window.addEventListener('resize', () => { hideActions(); endDrag(); });

  function startDrag() {
    const { tile, button, pointerId, startX, startY } = drag;
    const bounds = tile.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'sites drag-preview';
    ghost.dataset.layout = layout;
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.width = `${bounds.width}px`;
    ghost.style.height = `${bounds.height}px`;
    const content = button.cloneNode(true);
    const image = content.querySelector('img');
    if (image) {
      const icon = image.parentElement;
      if (!icon.hasAttribute('data-loaded')) image.remove();
      else image.addEventListener('error', () => {
        image.remove();
        delete icon.dataset.loaded;
      }, { once: true });
    }
    ghost.append(content);
    drag.ghost = ghost;
    drag.offsetX = startX - bounds.left;
    drag.offsetY = startY - bounds.top;
    drag.source = Array.from(grid.children).indexOf(tile);
    grid.setPointerCapture(pointerId);
    hideActions();
    tile.classList.add('placeholder');
    grid.classList.add('sorting');
    document.body.append(ghost);
  }

  function moveDraggedTile() {
    const { tile, x, y, offsetX, offsetY, ghost } = drag;
    ghost.style.transform = `translate(${x - offsetX}px, ${y - offsetY}px)`;
    const target = document.elementFromPoint(x, y)?.closest('.site');
    if (target?.parentElement !== grid || target === tile) return;

    // 外层卡槽负责命中检测，内层按钮播放位移动画，避免动画反过来改变落点。
    const tiles = Array.from(grid.children);
    const current = tiles.indexOf(tile);
    const destination = tiles.indexOf(target);
    const positions = reducedMotion.matches ? [] : tiles
      .slice(Math.min(current, destination), Math.max(current, destination) + 1)
      .filter(item => item !== tile)
      .map(item => [item.firstElementChild, item.firstElementChild.getBoundingClientRect()]);
    grid.insertBefore(tile, current < destination ? target.nextElementSibling : target);
    for (const [button] of positions) {
      for (const animation of button.getAnimations()) animation.cancel();
    }
    const shifts = positions.map(([button, before]) => {
      const after = button.getBoundingClientRect();
      return [button, before.left - after.left, before.top - after.top];
    });
    for (const [button, deltaX, deltaY] of shifts) {
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;
      button.animate([{ transform: `translate(${deltaX}px, ${deltaY}px)` }, { transform: 'none' }],
        { duration: 170, easing: 'cubic-bezier(.2,.75,.3,1)' });
    }
  }

  function scrollDuringDrag() {
    drag.frame = undefined;
    const { left, right, top, bottom } = collection.getBoundingClientRect();
    if (drag.x < left || drag.x > right || drag.y < top || drag.y > bottom) return;
    const previous = collection.scrollTop;
    if (drag.y - top < 18) collection.scrollTop -= 6;
    if (bottom - drag.y < 18) collection.scrollTop += 6;
    if (collection.scrollTop === previous) return;
    moveDraggedTile();
    drag.frame = window.requestAnimationFrame(scrollDuringDrag);
  }

  async function endDrag(commit = false) {
    const current = drag;
    drag = undefined;
    if (!current?.ghost) return;
    const { tile, source, frame, pointerId, ghost } = current;
    ignorePointerClick = true;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    if (grid.hasPointerCapture(pointerId)) grid.releasePointerCapture(pointerId);
    ghost.remove();
    tile.classList.remove('placeholder');
    grid.classList.remove('sorting');
    const tiles = Array.from(grid.children);
    const destination = tiles.indexOf(tile);
    if (source === destination) return;
    if (commit && await moveSite(source, destination, { keepTiles: true })) return;

    for (const animation of grid.getAnimations({ subtree: true })) animation.cancel();
    tiles.splice(destination, 1);
    grid.insertBefore(tile, tiles[source] ?? null);
    if (commit) focusTile(tile.dataset.id);
  }

  grid.addEventListener('pointerdown', event => {
    const button = event.target.closest('.site-open');
    if (!button || drag || saving || sites.length < 2 || event.button !== 0 || !event.isPrimary) return;
    drag = { button, tile: button.closest('.site'), pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
  });
  window.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
      void endDrag();
      return;
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.ghost) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
      startDrag();
    }
    moveDraggedTile();
    drag.frame ??= window.requestAnimationFrame(scrollDuringDrag);
  });
  window.addEventListener('pointerup', event => {
    if (drag?.pointerId !== event.pointerId) return;
    const inside = Boolean(drag.ghost && grid.contains(document.elementFromPoint(event.clientX, event.clientY)));
    if (inside) {
      drag.x = event.clientX;
      drag.y = event.clientY;
      moveDraggedTile();
    }
    void endDrag(inside);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    window.addEventListener(type, event => { if (drag?.pointerId === event.pointerId) endDrag(); });
  }
  window.addEventListener('blur', () => { hideActions(); endDrag(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    hideActions(true);
    endDrag();
  });

  renderLayout();
  render();
  return () => {
    for (const button of toolbarButtons) button.disabled = false;
    if (host.preview) return;
    iconsEnabled = true;
    Array.from(grid.children).forEach((tile, index) => addFavicon(tile.querySelector('.site-icon'), sites[index].url));
  };
}

try {
  const host = await connectHost();
  const activate = start(host, await host.request('storage.get'));
  await host.ready();
  activate();
} catch (error) {
  empty.hidden = false;
  empty.textContent = '收藏夹加载失败，请重新打开组件。';
  throw error;
}
