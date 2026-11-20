import { connectHost } from './host.js';

const byId = id => document.getElementById(id);
const add = byId('add');
const addCategory = byId('add-category');
const toggleAll = byId('toggle-all');
const search = byId('search');
const list = byId('list');
const collection = list.parentElement;
const empty = byId('empty');
const status = byId('status');
const preview = byId('preview');
const actions = byId('actions');
const edit = byId('edit');
const moveTop = byId('move-top');
const moveBottom = byId('move-bottom');
const moveGroup = byId('move-group');
const destinations = byId('move-destinations');
const editor = byId('editor');
const form = byId('form');
const bodyInput = byId('body');
const categorySelect = byId('category');
const editorStatus = byId('editor-status');
const categoryEditor = byId('category-editor');
const categoryName = byId('category-name');
const categoryStatus = byId('category-status');
const confirmation = byId('confirmation');
const deleteStatus = byId('delete-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const singleLine = content => content.trim().replace(/\s+/gu, ' ');
const uncategorized = { id: '', name: '未分类' };

function insertBeside(items, id, neighborId, after) {
  const item = items.find(entry => entry.id === id);
  const rest = items.filter(entry => entry.id !== id);
  const index = rest.findIndex(entry => entry.id === neighborId);
  if (!item || index < 0) return null;
  rest.splice(index + Number(after), 0, item);
  return rest;
}

try {
  const host = await connectHost();
  let storage = await host.request('storage.get');
  let prompts = storage.prompts ?? [];
  let categories = storage.categories ?? [];
  if (!Array.isArray(prompts) || !Array.isArray(categories)) throw new Error('收藏数据格式无效');

  let editingId = null;
  let editingCategoryId = null;
  let deleting = null;
  let saving = false;
  let previewRow = null;
  let actionRow = null;
  let menuPosition;
  let drag = null;
  let suppressClick = false;
  const collapsed = new Set();
  const searchCollapsed = new Set();
  const groupDefinitions = () => [...categories, uncategorized];
  const queryText = () => search.value.trim().toLocaleLowerCase();
  const viewCollapsed = () => queryText() ? searchCollapsed : collapsed;
  const groupOf = prompt => categories.some(category => category.id === prompt.categoryId) ? prompt.categoryId : '';
  const promptsIn = groupId => prompts.filter(prompt => groupOf(prompt) === groupId);
  const groupRow = id => [...list.children].find(group => group.dataset.group === id);

  async function copy(prompt) {
    hidePreview();
    try {
      await navigator.clipboard.writeText(prompt.content);
      status.textContent = '已复制提示词';
    } catch {
      status.textContent = '无法写入剪贴板，可在编辑中手动复制。';
    }
  }

  function hidePreview() {
    previewRow = null;
    preview.hidden = true;
  }

  function showPreview(row, content) {
    if (drag?.ghost || actionRow || editor.open) return;
    const bounds = row.getBoundingClientRect();
    const above = bounds.top - 12;
    const below = window.innerHeight - bounds.bottom - 12;
    preview.textContent = content;
    preview.style.left = bounds.left + 'px';
    preview.style.maxWidth = bounds.width + 'px';
    preview.style.maxHeight = Math.max(above, below) + 'px';
    preview.hidden = false;
    preview.scrollTop = 0;
    const height = preview.offsetHeight;
    preview.style.top = (height <= below || below >= above ? bounds.bottom + 4 : bounds.top - height - 4) + 'px';
    previewRow = row;
  }

  function hideActions() {
    const row = actionRow;
    actionRow = null;
    actions.hidden = true;
    return row;
  }

  function placeActions() {
    if (actions.hidden) return;
    const { x, y } = menuPosition;
    actions.style.left = Math.max(4, Math.min(x, window.innerWidth - actions.offsetWidth - 4)) + 'px';
    actions.style.top = Math.max(4, Math.min(y, window.innerHeight - actions.offsetHeight - 4)) + 'px';
  }

  function showActions(event, row) {
    event.preventDefault();
    if (saving || drag?.ghost) return;
    drag = null;
    hidePreview();
    actionRow = row;
    const isGroup = row.matches('.group');
    const items = isGroup ? categories : promptsIn(row.parentElement.parentElement.dataset.group);
    const id = isGroup ? row.dataset.group : row.dataset.id;
    edit.textContent = isGroup ? '编辑分类' : '编辑';
    actions.setAttribute('aria-label', isGroup ? '分类操作' : '收藏操作');
    moveTop.disabled = items[0]?.id === id;
    moveBottom.disabled = items.at(-1)?.id === id;
    moveGroup.hidden = isGroup;
    moveGroup.open = false;
    if (!isGroup) {
      const currentGroup = row.parentElement.parentElement.dataset.group;
      destinations.replaceChildren(...groupDefinitions().map(({ id: groupId, name }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = name;
        button.title = name;
        button.disabled = groupId === currentGroup;
        button.addEventListener('click', () => {
          hideActions();
          void moveToGroup(id, groupId);
        });
        return button;
      }));
    }
    actions.hidden = false;
    const bounds = row.getBoundingClientRect();
    menuPosition = {
      x: event.button === 2 ? event.clientX : bounds.left,
      y: event.button === 2 ? event.clientY : (isGroup ? row.firstElementChild.getBoundingClientRect().bottom : bounds.bottom),
    };
    placeActions();
    edit.focus();
  }

  function showEditor(prompt) {
    if (saving || drag?.ghost) return;
    hidePreview();
    editingId = prompt?.id ?? null;
    byId('editor-title').textContent = prompt ? '编辑收藏' : '新增收藏';
    bodyInput.value = prompt?.content ?? '';
    categorySelect.replaceChildren(...groupDefinitions().map(({ id, name }) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = name;
      return option;
    }));
    categorySelect.value = prompt ? groupOf(prompt) : '';
    byId('ask-delete').hidden = !prompt;
    editorStatus.textContent = '';
    status.textContent = '';
    editor.showModal();
    bodyInput.focus();
  }

  function showCategoryEditor(category) {
    if (saving || drag?.ghost) return;
    hidePreview();
    editingCategoryId = category?.id ?? null;
    byId('category-editor-title').textContent = category ? '编辑分类' : '新建分类';
    categoryName.value = category?.name ?? '';
    categoryStatus.textContent = '';
    status.textContent = '';
    categoryEditor.showModal();
    categoryName.focus();
  }

  function showDeleteConfirmation(kind, id) {
    const isGroup = kind === 'category';
    const item = (isGroup ? categories : prompts).find(entry => entry.id === id);
    if (!item || saving) return;
    deleting = { kind, id };
    byId('confirmation-title').textContent = isGroup ? '删除这个分类？' : '删除这条收藏？';
    byId('delete-preview').textContent = isGroup
      ? `「${item.name}」里的收藏将移到「未分类」。`
      : singleLine(item.content);
    deleteStatus.textContent = '';
    confirmation.showModal();
  }

  function updateGroupVisibility(compact = false) {
    const activeCollapsed = viewCollapsed();
    for (const group of list.children) {
      const isCollapsed = compact || activeCollapsed.has(group.dataset.group);
      group.hidden = !compact && group.dataset.filtered === 'true';
      group.querySelector('.prompts').hidden = isCollapsed;
      group.querySelector('.group-toggle').setAttribute('aria-expanded', String(!isCollapsed));
    }
    toggleAll.textContent = groupDefinitions().some(group => activeCollapsed.has(group.id)) ? '全部展开' : '全部折叠';
  }

  function renderPrompt(prompt) {
    const row = document.createElement('li');
    row.className = 'prompt-row';
    row.dataset.id = prompt.id;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'prompt';
    button.textContent = singleLine(prompt.content);
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') showPreview(row, prompt.content);
    });
    button.addEventListener('pointerleave', hidePreview);
    button.addEventListener('click', event => {
      if (!suppressClick || event.detail === 0) void copy(prompt);
    });
    button.addEventListener('contextmenu', event => showActions(event, row));
    button.addEventListener('keydown', event => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) showActions(event, row);
    });
    row.append(button);
    return row;
  }

  function render() {
    hidePreview();
    hideActions();
    const query = queryText();
    const groups = groupDefinitions();
    const byGroup = new Map(groups.map(group => [group.id, []]));
    let matches = 0;
    for (const prompt of prompts) {
      if (!prompt.content.toLocaleLowerCase().includes(query)) continue;
      (byGroup.get(prompt.categoryId) ?? byGroup.get('')).push(prompt);
      matches++;
    }
    const template = byId('group-template');
    list.replaceChildren(...groups.map(({ id, name }) => {
      const group = template.content.firstElementChild.cloneNode(true);
      const items = byGroup.get(id);
      const toggle = group.querySelector('.group-toggle');
      const menu = group.querySelector('.group-menu');
      const body = group.querySelector('.prompts');
      group.dataset.group = id;
      group.dataset.filtered = String(Boolean(query && items.length === 0));
      body.id = 'group-body-' + (id || 'uncategorized');
      toggle.setAttribute('aria-controls', body.id);
      group.querySelector('.group-name').textContent = name;
      group.querySelector('.group-count').textContent = items.length;
      menu.hidden = group.querySelector('.group-handle').hidden = !id;
      menu.setAttribute('aria-label', `${name}的分类操作`);
      menu.addEventListener('click', event => showActions(event, group));
      group.firstElementChild.addEventListener('contextmenu', event => {
        if (id) showActions(event, group);
        else event.preventDefault();
      });
      toggle.addEventListener('click', () => {
        if (drag?.ghost) return;
        hideActions();
        hidePreview();
        const active = viewCollapsed();
        if (!active.delete(id)) active.add(id);
        updateGroupVisibility();
      });
      if (items.length) body.replaceChildren(...items.map(renderPrompt));
      else {
        const placeholder = document.createElement('li');
        placeholder.className = 'group-empty';
        placeholder.textContent = '暂无收藏';
        body.append(placeholder);
      }
      return group;
    }));
    updateGroupVisibility();
    empty.hidden = !query || matches > 0;
    empty.textContent = '没有匹配的收藏';
  }

  async function persist(changes, message, { dialog, feedback = status, focusId, focusGroup, reveal } = {}) {
    if (saving) return false;
    saving = true;
    const controls = dialog?.querySelectorAll('button, input, select, textarea') ?? [];
    controls.forEach(control => { control.disabled = true; });
    feedback.textContent = '正在保存…';
    try {
      const updated = { ...storage, ...changes };
      await host.request('storage.set', updated);
      storage = updated;
      prompts = updated.prompts ?? [];
      categories = updated.categories ?? [];
      for (const modal of [confirmation, editor, categoryEditor]) if (modal.open) modal.close();
      render();
      status.textContent = message;
      const row = [...list.querySelectorAll('.prompt-row')].find(item => item.dataset.id === focusId);
      const control = [row?.firstElementChild, groupRow(focusGroup)?.querySelector('.group-toggle'), add]
        .find(candidate => candidate && !candidate.closest('[hidden]'));
      control.focus({ preventScroll: true });
      if (reveal && control !== add) control.scrollIntoView({ block: 'nearest' });
      return true;
    } catch {
      if (!dialog) render();
      feedback.textContent = dialog ? '保存未确认，请检查内容后重试。' : '更改保存未确认，请重试。';
      return false;
    } finally {
      controls.forEach(control => { control.disabled = false; });
      saving = false;
    }
  }

  function placeFirst(prompt, categoryId) {
    const updated = { ...prompt };
    if (categoryId) updated.categoryId = categoryId;
    else delete updated.categoryId;
    return [updated, ...prompts.filter(item => item.id !== prompt.id)];
  }

  function moveToGroup(id, categoryId) {
    const prompt = prompts.find(item => item.id === id);
    const group = groupDefinitions().find(item => item.id === categoryId);
    if (!prompt || !group || groupOf(prompt) === group.id) return;
    return persist({ prompts: placeFirst(prompt, categoryId) }, `已移到「${group.name}」`, { focusId: id, focusGroup: categoryId });
  }

  function moveWithin(items, key, id, neighborId, after, options) {
    const next = insertBeside(items, id, neighborId, after);
    if (next) return persist({ [key]: next }, '已更新排序', options);
  }

  function startDrag(event) {
    const { row, sortingGroups } = drag;
    const source = sortingGroups ? row.firstElementChild : row;
    const bounds = source.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'prompt drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = sortingGroups ? row.querySelector('.group-name').textContent : row.textContent;
    ghost.style.left = bounds.left + 'px';
    ghost.style.width = bounds.width + 'px';
    ghost.style.height = bounds.height + 'px';
    drag.ghost = ghost;
    drag.offsetY = drag.startY - bounds.top;
    drag.index = [...drag.scope.children].indexOf(row);
    list.setPointerCapture(event.pointerId);
    hidePreview();
    row.classList.add('placeholder');
    collection.classList.add('sorting');
    if (sortingGroups) {
      drag.scrollTop = collection.scrollTop;
      const positions = capturePositions([...list.children].filter(group => group !== row && !group.hidden));
      updateGroupVisibility(true);
      animatePositions(positions);
    }
    document.body.append(ghost);
    suppressClick = true;
  }

  function containsPoint({ left, right, top, bottom }, x, y) {
    return x >= left && x < right && y >= top && y < bottom;
  }

  function inCategoryList(x, y) {
    return containsPoint(collection.getBoundingClientRect(), x, y)
      && containsPoint(list.getBoundingClientRect(), x, y);
  }

  function findDropGroup(x, y, origin) {
    if (!inCategoryList(x, y)) return null;
    for (const group of list.children) {
      if (group !== origin && containsPoint(group.firstElementChild.getBoundingClientRect(), x, y)) return group;
    }
    return null;
  }

  function capturePositions(items) {
    return reducedMotion.matches ? [] : items.map(item => [item, item.getBoundingClientRect().top]);
  }

  function animatePositions(positions) {
    // 以未变换的位置判断落点，以当前绘制的位置接续让位动效。
    for (const [item, top] of positions) {
      for (const animation of item.getAnimations()) animation.cancel();
      const delta = top - item.getBoundingClientRect().top;
      if (Math.abs(delta) > 1) {
        item.animate([{ transform: 'translateY(' + delta + 'px)' }, { transform: 'none' }],
          { duration: 150, easing: 'ease-out' });
      }
    }
  }

  function moveDraggedRow(previewOrder = true) {
    const { row, scope, y, x, ghost, offsetY, sortingGroups } = drag;
    ghost.style.top = (y - offsetY) + 'px';
    if (!previewOrder || (sortingGroups && !inCategoryList(x, y))) return;
    if (!sortingGroups && !drag.switchingGroup && !containsPoint(scope.parentElement.getBoundingClientRect(), x, y)) {
      // 离开原组后，舍弃只是预览的组内排序，再显示紧凑的目标组列表。
      const originalPosition = [...scope.children].filter(item => item !== row)[drag.index] ?? null;
      scope.insertBefore(row, originalPosition);
      drag.switchingGroup = true;
      updateGroupVisibility(true);
    }
    if (drag.switchingGroup) {
      drag.target?.classList.remove('drop-target');
      drag.target = findDropGroup(x, y, scope.parentElement);
      drag.target?.classList.add('drop-target');
      return;
    }
    const center = y - offsetY + row.offsetHeight / 2 - scope.getBoundingClientRect().top;
    const others = [...scope.children].filter(item => item !== row);
    // 自定义分类可以挪到「未分类」前面，「未分类」始终留在末尾。
    const before = others.find(item => (sortingGroups && !item.dataset.group)
      || center < item.offsetTop + item.offsetHeight / 2) ?? null;
    if (row.nextElementSibling === before) return;

    const positions = capturePositions(others);
    scope.insertBefore(row, before);
    animatePositions(positions);
  }

  function scrollWhileDragging() {
    drag.scrollFrame = null;
    const bounds = collection.getBoundingClientRect();
    const edge = 26;
    // 指针靠近可滚动列表的上下边缘时，继续露出下一批条目。
    const speed = Math.max(0, drag.y - bounds.bottom + edge) - Math.max(0, bounds.top + edge - drag.y);
    const previous = collection.scrollTop;
    collection.scrollTop += Math.max(-edge, Math.min(edge, speed)) * 0.45;
    if (collection.scrollTop === previous) return;
    moveDraggedRow();
    drag.scrollFrame = window.requestAnimationFrame(scrollWhileDragging);
  }

  function finishDrag(commit = false) {
    if (!drag) return;
    const { row, scope, index, pointerId, ghost, scrollFrame, switchingGroup, sortingGroups, target, scrollTop } = drag;
    drag = null;
    if (!ghost) return;

    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    if (list.hasPointerCapture(pointerId)) list.releasePointerCapture(pointerId);
    ghost.remove();
    row.classList.remove('placeholder');
    collection.classList.remove('sorting');
    target?.classList.remove('drop-target');
    const newIndex = [...scope.children].indexOf(row);
    if (switchingGroup) {
      updateGroupVisibility();
      if (commit && target) void moveToGroup(row.dataset.id, target.dataset.group);
      return;
    }
    if (!commit && newIndex !== index) render();
    if (sortingGroups) {
      for (const group of list.children) for (const animation of group.getAnimations()) animation.cancel();
      updateGroupVisibility();
      collection.scrollTop = scrollTop;
    }
    if (!commit || newIndex === index) return;
    const movedDown = newIndex > index;
    const neighbor = movedDown ? row.previousElementSibling : row.nextElementSibling;
    if (sortingGroups) {
      void moveWithin(categories, 'categories', row.dataset.group, neighbor.dataset.group, movedDown,
        { focusGroup: row.dataset.group, reveal: true });
    } else {
      void moveWithin(prompts, 'prompts', row.dataset.id, neighbor.dataset.id, movedDown, { focusId: row.dataset.id });
    }
  }

  list.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    suppressClick = false;
    if (event.pointerType !== 'mouse' || saving) return;
    const sortingGroups = Boolean(event.target.closest('.group-handle'));
    const row = sortingGroups ? event.target.closest('.group') : event.target.closest('.prompt-row');
    if (!row || (sortingGroups && (!row.dataset.group || categories.length < 2))) return;
    drag = { row, scope: row.parentElement, sortingGroups, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY, scrollFrame: null };
  });
  window.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      finishDrag();
      return;
    }
    const starting = !drag.ghost;
    if (starting) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance < 5) return;
      startDrag(event);
    }
    drag.y = event.clientY;
    drag.x = event.clientX;
    // 分类先收拢，下一次移动再按紧凑列表计算落点。
    moveDraggedRow(!starting || !drag.sortingGroups);
    drag.scrollFrame ??= window.requestAnimationFrame(scrollWhileDragging);
  });
  window.addEventListener('pointerup', event => {
    if (drag?.pointerId !== event.pointerId) return;
    const inside = event.clientX >= 0 && event.clientX < window.innerWidth
      && event.clientY >= 0 && event.clientY < window.innerHeight;
    if (inside && drag.ghost && !drag.sortingGroups) {
      drag.x = event.clientX;
      drag.y = event.clientY;
      moveDraggedRow();
    }
    finishDrag(inside && (!drag.sortingGroups || inCategoryList(event.clientX, event.clientY)));
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    list.addEventListener(type, event => {
      if (drag?.pointerId === event.pointerId) finishDrag();
    });
  }
  collection.addEventListener('scroll', () => {
    hidePreview();
    hideActions();
  });
  collection.addEventListener('wheel', event => {
    if (!previewRow?.contains(event.target) || !event.deltaY) return;
    const previous = preview.scrollTop;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? preview.clientHeight : 1;
    preview.scrollTop += event.deltaY * unit;
    if (preview.scrollTop !== previous) event.preventDefault();
  }, { passive: false });

  document.addEventListener('pointerdown', event => {
    if (actionRow && !actions.contains(event.target)) hideActions();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (actionRow) hideActions().querySelector('.prompt, .group-toggle')?.focus({ preventScroll: true });
    else if (drag?.ghost) finishDrag();
    else hidePreview();
  });
  actions.addEventListener('focusout', event => {
    if (!actions.contains(event.relatedTarget)) hideActions();
  });
  moveGroup.addEventListener('toggle', placeActions);
  for (const type of ['blur', 'resize']) {
    window.addEventListener(type, () => {
      hidePreview();
      hideActions();
      finishDrag();
    });
  }
  edit.addEventListener('click', () => {
    const row = hideActions();
    if (!row) return;
    if (row.matches('.group')) showCategoryEditor(categories.find(category => category.id === row.dataset.group));
    else showEditor(prompts.find(prompt => prompt.id === row.dataset.id));
  });
  for (const [button, atBottom] of [[moveTop, false], [moveBottom, true]]) {
    button.addEventListener('click', async () => {
      const row = hideActions();
      if (!row) return;
      if (row.matches('.group')) {
        const edge = categories.at(atBottom ? -1 : 0);
        void moveWithin(categories, 'categories', row.dataset.group, edge.id, atBottom, { focusGroup: row.dataset.group, reveal: true });
      } else {
        const edge = promptsIn(row.parentElement.parentElement.dataset.group).at(atBottom ? -1 : 0);
        void moveWithin(prompts, 'prompts', row.dataset.id, edge.id, atBottom, { focusId: row.dataset.id, reveal: true });
      }
    });
  }
  byId('menu-delete').addEventListener('click', () => {
    const row = hideActions();
    if (!row) return;
    row.querySelector('.prompt, .group-toggle')?.focus({ preventScroll: true });
    if (row.matches('.group')) showDeleteConfirmation('category', row.dataset.group);
    else showDeleteConfirmation('prompt', row.dataset.id);
  });

  add.addEventListener('click', () => showEditor());
  addCategory.addEventListener('click', () => showCategoryEditor());
  toggleAll.addEventListener('click', () => {
    if (drag?.ghost) return;
    hidePreview();
    hideActions();
    const active = viewCollapsed();
    if (groupDefinitions().some(group => active.has(group.id))) active.clear();
    else for (const group of groupDefinitions()) active.add(group.id);
    updateGroupVisibility();
  });
  search.addEventListener('input', () => {
    finishDrag();
    searchCollapsed.clear();
    if (!saving) status.textContent = '';
    render();
  });
  byId('cancel').addEventListener('click', () => editor.close());
  byId('cancel-category').addEventListener('click', () => categoryEditor.close());
  byId('keep').addEventListener('click', () => confirmation.close());
  for (const dialog of [editor, categoryEditor, confirmation]) {
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const content = bodyInput.value;
    if (!content.trim()) {
      editorStatus.textContent = '请填写提示词。';
      bodyInput.focus();
      return;
    }
    const previous = prompts.find(item => item.id === editingId);
    const item = { ...previous, id: previous?.id ?? crypto.randomUUID(), content };
    const categoryId = categorySelect.value;
    const next = previous && groupOf(previous) === categoryId
      ? prompts.map(prompt => prompt.id === item.id ? item : prompt)
      : placeFirst(item, categoryId);
    void persist({ prompts: next }, '已保存收藏', { dialog: editor, feedback: editorStatus, focusId: item.id, focusGroup: categoryId });
  });
  byId('category-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = categoryName.value.trim();
    if (!name || groupDefinitions().some(group => group.id !== editingCategoryId && group.name === name)) {
      categoryStatus.textContent = name ? '已有同名分类，请换个名称。' : '请填写分类名称。';
      categoryName.focus();
      return;
    }
    const id = editingCategoryId ?? crypto.randomUUID();
    const next = editingCategoryId
      ? categories.map(category => category.id === id ? { ...category, name } : category)
      : [...categories, { id, name }];
    void persist({ categories: next }, '已保存分类', { dialog: categoryEditor, feedback: categoryStatus, focusGroup: id });
  });
  byId('ask-delete').addEventListener('click', () => showDeleteConfirmation('prompt', editingId));
  byId('remove').addEventListener('click', () => {
    if (!confirmation.open || !deleting) return;
    const options = { dialog: confirmation, feedback: deleteStatus };
    const { kind, id } = deleting;
    if (kind === 'prompt') {
      void persist({ prompts: prompts.filter(prompt => prompt.id !== id) }, '已删除收藏', options);
      return;
    }
    const returned = [];
    const rest = [];
    for (const prompt of prompts) {
      if (prompt.categoryId === id) {
        const item = { ...prompt };
        delete item.categoryId;
        returned.push(item);
      } else rest.push(prompt);
    }
    void persist({ categories: categories.filter(category => category.id !== id), prompts: [...returned, ...rest] },
      '已删除分类', { ...options, focusGroup: '' });
  });

  render();
  await host.ready();
  for (const control of [add, addCategory, toggleAll, search]) control.disabled = false;
} catch (error) {
  empty.hidden = false;
  empty.textContent = '收藏夹加载失败，请重新打开组件。';
  throw error;
}
