const $ = selector => document.querySelector(selector);
const methods = 'cloudWorkbench.manage.';
const lines = text => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const linkText = links => (links ?? []).map(({name, url}) => [name, url].join(' | ')).join('\n');

function parseLinks(text) {
  return lines(text).map(line => {
    const split = line.indexOf('|');
    const name = line.slice(0, split).trim();
    const url = line.slice(split + 1).trim();
    if (split < 1 || !name || !url) throw new Error('链接或健康检查的格式为「名称 | 地址」，每行一条。');
    return {name, url};
  });
}

function showError(element, message = '') {
  element.textContent = message;
  element.hidden = !message;
}

export function mountServerManagement({host, servers, refresh, renderFleet, toast}) {
  const request = (method, args) => host.request(methods + method, args);
  const list = () => request('list');
  const editor = $('#server-editor');
  const form = $('#server-form');
  const field = name => form.elements.namedItem(name);
  const deleteDialog = $('#delete-dialog');
  const add = $('#add-server');
  const importButton = $('#import-servers');
  const exportButton = $('#export-servers');
  const fleet = $('#fleet-body');
  let editing;
  let removing;
  let writing = false;
  let drag;
  let dragFrame;
  let landing = false;

  function busy(next) {
    writing = next;
    for (const button of [add, importButton, exportButton, $('#save-server'), $('#cancel-server'), $('#confirm-delete'), $('#cancel-delete')]) {
      button.disabled = next;
    }
    form.setAttribute('aria-busy', String(next));
  }

  function updateProvider() {
    const ssh = field('provider').value === 'aliyun';
    $('#ssh-fields').hidden = $('#ssh-fields').disabled = !ssh;
    $('#instabox-fields').hidden = $('#instabox-fields').disabled = ssh;
    const existing = editing?.entry;
    const old = existing?.server.connection;
    const same = old?.provider === field('provider').value && (ssh
      ? old.host.toLowerCase() === field('sshHost').value.trim().toLowerCase()
        && old.port === Number(field('sshPort').value) && old.user === field('sshUser').value.trim()
      : old.orgId === field('orgId').value.trim() && old.machineId === field('machineId').value.trim());
    const configured = same && existing.hasKey && (!ssh || existing.hasHostKey);
    $('#credential-note').textContent = configured
      ? '凭据已加密保存，留空沿用。'
      : ssh
        ? '可以先保存，补齐私钥和可信主机公钥后开始采集。'
        : '可以先保存，补齐 API 密钥后开始采集。';
  }

  async function openEditor(id) {
    if (writing || editor.open || deleteDialog.open) return;
    try {
      const current = await list();
      const entry = current.servers.find(server => server.id === id);
      if (id && !entry) throw new Error('服务器已移除，请刷新清单。');
      editing = {entry, revision: current.revision};
      form.reset();
      form.querySelectorAll('details').forEach(details => { details.open = false; });
      showError($('#editor-error'));
      $('#editor-title').textContent = entry ? '编辑服务器' : '添加服务器';
      if (entry) {
        const {name, role, links, connection} = entry.server;
        field('serverName').value = name;
        field('role').value = role ?? '';
        field('links').value = linkText(links);
        field('provider').value = connection.provider;
        if (connection.provider === 'aliyun') {
          field('sshHost').value = connection.host;
          field('sshUser').value = connection.user;
          field('sshPort').value = connection.port;
          field('services').value = connection.services.join('\n');
          field('healthUrls').value = linkText(connection.healthUrls);
        } else {
          field('orgId').value = connection.orgId;
          field('machineId').value = connection.machineId;
          field('account').value = connection.account ?? '';
        }
      }
      updateProvider();
      if (!editor.open) editor.showModal();
    } catch (error) { toast(error.message, true); }
  }

  form.addEventListener('input', updateProvider);
  form.addEventListener('change', updateProvider);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editing || writing) return;
    busy(true);
    showError($('#editor-error'));
    try {
      const provider = field('provider').value;
      let connection, credentials;
      if (provider === 'aliyun') {
        const file = field('privateKey').files[0];
        if (file?.size > 24 * 1024) throw new Error('SSH 私钥文件超过 24 KiB。');
        connection = {provider, host: field('sshHost').value, user: field('sshUser').value,
          port: Number(field('sshPort').value), services: lines(field('services').value),
          healthUrls: parseLinks(field('healthUrls').value)};
        credentials = {privateKey: file ? await file.text() : '', hostKey: field('hostKey').value};
      } else {
        connection = {provider, orgId: field('orgId').value, machineId: field('machineId').value, account: field('account').value};
        credentials = {apiKey: field('apiKey').value};
      }
      const {result} = await request('save', {
        revision: editing.revision, id: editing.entry?.id ?? null, credentials,
        server: {name: field('serverName').value, role: field('role').value, connection, links: parseLinks(field('links').value)},
      });
      editor.close();
      toast(result.ready ? '服务器已保存。' : '服务器已保存，请在编辑界面补齐凭据。');
      await refresh(result.id);
    } catch (error) { showError($('#editor-error'), error.message); }
    finally { busy(false); }
  });
  editor.addEventListener('close', () => {
    if (editor.open) return;
    form.reset();
    editing = undefined;
  });
  $('#cancel-server').addEventListener('click', () => editor.close());
  for (const dialog of [editor, deleteDialog]) {
    dialog.addEventListener('cancel', event => { if (writing) event.preventDefault(); });
  }

  async function openDelete(id) {
    if (writing) return;
    try {
      const current = await list();
      const entry = current.servers.find(server => server.id === id);
      if (!entry) throw new Error('服务器已移除，请刷新清单。');
      removing = {revision: current.revision, id};
      $('#delete-description').textContent = `确定从 SoulDesk 移除「${entry.server.name}」？`;
      showError($('#delete-error'));
      if (!deleteDialog.open) deleteDialog.showModal();
    } catch (error) { toast(error.message, true); }
  }

  $('#confirm-delete').addEventListener('click', async () => {
    if (!removing || writing) return;
    busy(true);
    showError($('#delete-error'));
    try {
      await request('remove', removing);
      deleteDialog.close();
      toast('服务器已从本机清单移除。');
      await refresh();
    } catch (error) { showError($('#delete-error'), error.message); }
    finally { busy(false); }
  });
  deleteDialog.addEventListener('close', () => { if (!deleteDialog.open) removing = undefined; });

  add.addEventListener('click', () => void openEditor());
  fleet.addEventListener('click', event => {
    const action = event.target.closest('[data-manage]');
    if (!action) return;
    const id = action.closest('[data-server-row]').dataset.serverRow;
    if (action.dataset.manage === 'edit') void openEditor(id);
    else if (action.dataset.manage === 'remove') void openDelete(id);
  });

  importButton.addEventListener('click', async () => {
    if (writing) return;
    busy(true);
    try {
      const result = await host.request('documents.open', {cloudWorkbenchBackup:true});
      if (!result) return;
      const missing = result.added - result.ready;
      toast(`新增 ${result.added} 台，跳过 ${result.skipped} 台重复服务器。${missing ? ` ${missing} 台缺少凭据。` : ''}`);
      await refresh();
    } catch (error) { toast(error.message, true); }
    finally { busy(false); }
  });
  exportButton.addEventListener('click', async () => {
    if (writing) return;
    busy(true);
    try {
      const saved = await host.request('documents.save', {cloudWorkbenchBackup:true});
      if (saved) toast('服务器完整备份已导出。');
    } catch (error) { toast(error.message, true); }
    finally { busy(false); }
  });

  function canSort() {
    return $('#provider-filter').value === 'all' && !$('#search').value.trim() && servers().length > 1;
  }

  function showDestination(state, destination) {
    if (state.destination === destination) return;
    state.destination = destination;
    state.marker?.classList.remove('drop-before', 'drop-after');
    state.marker = undefined;
    const end = destination ?? state.from;
    const height = state.rows[state.from].height;
    state.rows.forEach(({row}, index) => {
      if (index === state.from) return;
      const shift = end <= index && index < state.from ? height
        : state.from < index && index <= end ? -height : 0;
      row.style.translate = shift ? `0 ${shift}px` : '';
    });
    if (end !== state.from) {
      state.marker = state.rows[end].row;
      state.marker.classList.add(end < state.from ? 'drop-before' : 'drop-after');
    }
  }

  function updateDrop() {
    // 行的位移只影响显示，排序依据仍是拖动开始时的行中线。
    const bounds = fleet.getBoundingClientRect();
    const y = drag.y - bounds.top;
    const source = drag.rows[drag.from];
    source.row.style.translate = `0 ${y - drag.grabOffset - source.top}px`;
    const {left, right} = drag.scroll.getBoundingClientRect();
    const inside = drag.x >= left && drag.x < right && drag.y >= 0
      && drag.y < window.innerHeight && y >= 0 && y <= bounds.height;
    const destination = inside ? drag.rows.filter(({top, height}, index) =>
      index !== drag.from && y >= top + height / 2).length : null;
    showDestination(drag, destination);
  }

  function followDrag() {
    const {left, right} = drag.scroll.getBoundingClientRect();
    if (drag.x >= left && drag.x < right && drag.y >= 0 && drag.y < window.innerHeight) {
      if (drag.y < 36) window.scrollBy(0, -12);
      else if (drag.y > window.innerHeight - 36) window.scrollBy(0, 12);
    }
    updateDrop();
    dragFrame = requestAnimationFrame(followDrag);
  }

  async function endDrag(commit = false) {
    if (!drag) return;
    const state = drag;
    const {handle, pointer, rows, from, previous, id} = state;
    drag = undefined;
    cancelAnimationFrame(dragFrame);
    if (handle.hasPointerCapture(pointer)) handle.releasePointerCapture(pointer);
    if (!state.active) { renderFleet(); return; }

    landing = true;
    const destination = commit && canSort() && !writing ? state.destination ?? from : from;
    const source = rows[from];
    const target = rows[destination];
    const offset = target.top - source.top + (destination > from ? target.height - source.height : 0);
    fleet.classList.remove('sorting');
    showDestination(state, destination);
    state.marker?.classList.remove('drop-before', 'drop-after');
    source.row.style.translate = `0 ${offset}px`;
    try {
      const transitions = fleet.getAnimations({subtree:true}).filter(animation => animation.transitionProperty === 'translate');
      const motion = Promise.allSettled(transitions.map(animation => animation.finished));
      if (destination !== from) {
        const ids = previous.filter(value => value !== id);
        ids.splice(destination, 0, id);
        await Promise.all([motion, reorder(ids, previous)]);
      } else await motion;
    } finally {
      fleet.classList.remove('sort-preview');
      source.row.classList.remove('dragged-row');
      for (const {row} of rows) row.style.removeProperty('translate');
      landing = false;
      renderFleet();
      fleet.querySelector(`[data-order-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});
    }
  }

  async function reorder(ids, previous, focusId) {
    if (writing || !canSort() || ids.every((id, index) => id === previous[index])) return;
    busy(true);
    try {
      const current = await list();
      if (current.servers.length !== previous.length || current.servers.some((server, index) => server.id !== previous[index])) {
        throw new Error('服务器顺序已变化，请按最新清单重新排序。');
      }
      await request('reorder', {ids, revision: current.revision});
      toast('服务器顺序已保存。');
      await refresh();
    } catch (error) {
      toast(error.message, true);
      await refresh();
    } finally {
      busy(false);
      if (focusId) fleet.querySelector(`[data-order-id="${CSS.escape(focusId)}"]`)?.focus();
    }
  }

  fleet.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-order-id]');
    if (!handle || !event.isPrimary || event.button !== 0 || drag || landing || !canSort() || writing) return;
    event.preventDefault();
    handle.focus({preventScroll:true});
    handle.setPointerCapture(event.pointerId);
    drag = {
      handle, pointer:event.pointerId, id:handle.dataset.orderId, previous:servers().map(server => server.id),
      startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY,
      active:false, destination:null,
    };
  });
  fleet.addEventListener('pointermove', event => {
    if (drag?.pointer !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.active && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 4) {
      const top = fleet.getBoundingClientRect().top;
      drag.rows = Array.from(fleet.rows, row => {
        const rect = row.getBoundingClientRect();
        return {row, top:rect.top - top, height:rect.height};
      });
      drag.from = drag.rows.findIndex(({row}) => row.dataset.serverRow === drag.id);
      const source = drag.rows[drag.from];
      drag.grabOffset = drag.startY - top - source.top;
      drag.scroll = fleet.closest('.table-scroll');
      drag.active = true;
      source.row.classList.add('dragged-row');
      fleet.classList.add('sort-preview', 'sorting');
      followDrag();
    }
  });
  fleet.addEventListener('pointerup', event => {
    if (drag?.pointer !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.active) updateDrop();
    void endDrag(true);
  });
  for (const type of ['pointercancel', 'lostpointercapture']) {
    fleet.addEventListener(type, event => { if (drag?.pointer === event.pointerId) void endDrag(); });
  }
  fleet.addEventListener('keydown', event => {
    if (drag) {
      if (event.key === 'Escape') { event.preventDefault(); void endDrag(); }
      return;
    }
    if (landing) return;
    const handle = event.target.closest('[data-order-id]');
    if (!handle || !canSort() || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const previous = servers().map(server => server.id);
    const id = handle.dataset.orderId;
    const index = previous.indexOf(id);
    const next = index + (event.key === 'ArrowUp' ? -1 : 1);
    if (index < 0 || next < 0 || next >= previous.length) return;
    const ids = [...previous];
    [ids[index], ids[next]] = [ids[next], ids[index]];
    void reorder(ids, previous, id);
  });
  busy(false);

  return {canSort, dragging: () => Boolean(drag) || landing};
}
