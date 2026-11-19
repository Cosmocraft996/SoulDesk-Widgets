import { connectHost } from './host.js';

const byId = id => document.getElementById(id);
const add = byId('add');
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
const editor = byId('editor');
const form = byId('form');
const bodyInput = byId('body');
const editorStatus = byId('editor-status');
const confirmation = byId('confirmation');
const deleteStatus = byId('delete-status');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const singleLine = content => content.trim().replace(/\s+/gu, ' ');

try {
  const host = await connectHost();
  let storage = await host.request('storage.get');
  let prompts = storage.prompts ?? [];
  if (!Array.isArray(prompts)) throw new Error('收藏数据格式无效');

  let editingId = null;
  let deletingId = null;
  let saving = false;
  let previewRow = null;
  let actionRow = null;
  let drag = null;
  let suppressClick = false;

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

  function showActions(event, row) {
    event.preventDefault();
    if (saving || drag?.ghost) return;
    drag = null;
    hidePreview();
    actionRow = row;
    moveTop.disabled = prompts[0]?.id === row.dataset.id;
    moveBottom.disabled = prompts.at(-1)?.id === row.dataset.id;
    actions.hidden = false;
    const bounds = row.getBoundingClientRect();
    const x = event.button === 2 ? event.clientX : bounds.left;
    const y = event.button === 2 ? event.clientY : bounds.bottom;
    actions.style.left = Math.max(4, Math.min(x, window.innerWidth - actions.offsetWidth - 4)) + 'px';
    actions.style.top = Math.max(4, Math.min(y, window.innerHeight - actions.offsetHeight - 4)) + 'px';
    edit.focus();
  }

  function showEditor(prompt) {
    if (saving || drag?.ghost) return;
    hidePreview();
    editingId = prompt?.id ?? null;
    byId('editor-title').textContent = prompt ? '编辑收藏' : '新增收藏';
    bodyInput.value = prompt?.content ?? '';
    byId('ask-delete').hidden = !prompt;
    editorStatus.textContent = '';
    status.textContent = '';
    editor.showModal();
    bodyInput.focus();
  }

  function showDeleteConfirmation(id) {
    const prompt = prompts.find(item => item.id === id);
    if (!prompt || saving) return;
    deletingId = id;
    byId('delete-preview').textContent = singleLine(prompt.content);
    deleteStatus.textContent = '';
    confirmation.showModal();
  }

  function render() {
    hidePreview();
    hideActions();
    const query = search.value.trim().toLocaleLowerCase();
    const visible = prompts.filter(({ content }) => content.toLocaleLowerCase().includes(query));
    const rows = document.createDocumentFragment();
    for (const prompt of visible) {
      const row = document.createElement('li');
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
      rows.append(row);
    }
    list.replaceChildren(rows);
    empty.hidden = visible.length > 0;
    empty.textContent = query ? '没有匹配的收藏' : '还没有收藏。点右上角的「＋」添加。';
  }

  async function persist(next, message, { dialog, feedback = status, focusId } = {}) {
    if (saving) return false;
    saving = true;
    const controls = dialog?.querySelectorAll('button, textarea') ?? [];
    controls.forEach(control => { control.disabled = true; });
    feedback.textContent = '正在保存…';
    try {
      const updated = { ...storage, prompts: next };
      await host.request('storage.set', updated);
      storage = updated;
      prompts = next;
      if (confirmation.open) confirmation.close();
      if (editor.open) editor.close();
      render();
      status.textContent = message;
      const row = [...list.children].find(item => item.dataset.id === focusId);
      (row?.firstElementChild ?? add).focus({ preventScroll: true });
      return true;
    } catch {
      if (!dialog) render();
      feedback.textContent = dialog ? '保存未确认，请检查内容后重试。' : '顺序保存未确认，请重试。';
      return false;
    } finally {
      controls.forEach(control => { control.disabled = false; });
      saving = false;
    }
  }

  function movePrompt(id, neighborId, insertAfter = false) {
    const item = prompts.find(prompt => prompt.id === id);
    const next = prompts.filter(prompt => prompt.id !== id);
    const index = next.findIndex(prompt => prompt.id === neighborId);
    if (!item || index < 0) return;
    next.splice(index + Number(insertAfter), 0, item);
    return persist(next, '已更新排序', { focusId: id });
  }

  function startDrag(event) {
    const { row } = drag;
    const bounds = row.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'prompt drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.textContent = row.textContent;
    ghost.style.left = bounds.left + 'px';
    ghost.style.width = bounds.width + 'px';
    ghost.style.height = bounds.height + 'px';
    drag.ghost = ghost;
    drag.offsetY = drag.startY - bounds.top;
    drag.index = [...list.children].indexOf(row);
    list.setPointerCapture(event.pointerId);
    hidePreview();
    row.classList.add('placeholder');
    collection.classList.add('sorting');
    document.body.append(ghost);
    suppressClick = true;
  }

  function moveDraggedRow() {
    const { row, y, ghost, offsetY } = drag;
    ghost.style.top = (y - offsetY) + 'px';
    const center = y - offsetY + row.offsetHeight / 2 - list.getBoundingClientRect().top;
    const others = [...list.children].filter(item => item !== row);
    const before = others.find(item => center < item.offsetTop + item.offsetHeight / 2) ?? null;
    if (row.nextElementSibling === before) return;

    // 以未变换的位置判断落点，以当前绘制的位置接续让位动效。
    const positions = reducedMotion.matches ? [] : others.map(item => [item, item.getBoundingClientRect().top]);
    list.insertBefore(row, before);
    for (const [item, top] of positions) {
      for (const animation of item.getAnimations()) animation.cancel();
      const delta = top - item.getBoundingClientRect().top;
      if (Math.abs(delta) > 1) {
        item.animate([{ transform: 'translateY(' + delta + 'px)' }, { transform: 'none' }],
          { duration: 150, easing: 'ease-out' });
      }
    }
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
    const { row, index, pointerId, ghost, scrollFrame } = drag;
    drag = null;
    if (!ghost) return;

    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    if (list.hasPointerCapture(pointerId)) list.releasePointerCapture(pointerId);
    ghost.remove();
    row.classList.remove('placeholder');
    collection.classList.remove('sorting');
    const newIndex = [...list.children].indexOf(row);
    if (!commit && newIndex !== index) render();
    if (!commit || newIndex === index) return;
    const movedDown = newIndex > index;
    const neighbor = movedDown ? row.previousElementSibling : row.nextElementSibling;
    void movePrompt(row.dataset.id, neighbor.dataset.id, movedDown);
  }

  list.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    suppressClick = false;
    const row = event.target.closest('li');
    if (event.pointerType !== 'mouse' || saving || !row || list.children.length < 2) return;
    drag = { row, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, scrollFrame: null };
  });
  window.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      finishDrag();
      return;
    }
    if (!drag.ghost) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance < 5) return;
      startDrag(event);
    }
    drag.y = event.clientY;
    moveDraggedRow();
    drag.scrollFrame ??= window.requestAnimationFrame(scrollWhileDragging);
  });
  window.addEventListener('pointerup', event => {
    if (drag?.pointerId !== event.pointerId) return;
    const inside = event.clientX >= 0 && event.clientX < window.innerWidth
      && event.clientY >= 0 && event.clientY < window.innerHeight;
    finishDrag(inside);
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
    if (actionRow) hideActions().firstElementChild.focus({ preventScroll: true });
    else if (drag?.ghost) finishDrag();
    else hidePreview();
  });
  actions.addEventListener('focusout', event => {
    if (!actions.contains(event.relatedTarget)) hideActions();
  });
  for (const type of ['blur', 'resize']) {
    window.addEventListener(type, () => {
      hidePreview();
      hideActions();
      finishDrag();
    });
  }
  edit.addEventListener('click', () => {
    const row = hideActions();
    if (row) showEditor(prompts.find(prompt => prompt.id === row.dataset.id));
  });
  for (const [button, atBottom] of [[moveTop, false], [moveBottom, true]]) {
    button.addEventListener('click', async () => {
      const row = hideActions();
      const edge = prompts.at(atBottom ? -1 : 0);
      if (row && edge && await movePrompt(row.dataset.id, edge.id, atBottom)) {
        collection.scrollTop = atBottom ? collection.scrollHeight : 0;
      }
    });
  }
  byId('menu-delete').addEventListener('click', () => {
    const row = hideActions();
    if (!row) return;
    row.firstElementChild.focus({ preventScroll: true });
    showDeleteConfirmation(row.dataset.id);
  });

  add.addEventListener('click', () => showEditor());
  search.addEventListener('input', () => {
    finishDrag();
    if (!saving) status.textContent = '';
    render();
  });
  byId('cancel').addEventListener('click', () => editor.close());
  byId('keep').addEventListener('click', () => confirmation.close());
  for (const dialog of [editor, confirmation]) {
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
    const next = editingId
      ? prompts.map(item => item.id === editingId ? { ...item, content } : item)
      : [{ id: crypto.randomUUID(), content }, ...prompts];
    void persist(next, '已保存收藏', { dialog: editor, feedback: editorStatus, focusId: editingId });
  });
  byId('ask-delete').addEventListener('click', () => showDeleteConfirmation(editingId));
  byId('remove').addEventListener('click', () => {
    if (!confirmation.open) return;
    const next = prompts.filter(prompt => prompt.id !== deletingId);
    void persist(next, '已删除收藏', { dialog: confirmation, feedback: deleteStatus });
  });

  render();
  await host.ready();
  add.disabled = false;
  search.disabled = false;
} catch (error) {
  empty.hidden = false;
  empty.textContent = '收藏夹加载失败，请重新打开组件。';
  throw error;
}
