import { connectHost } from './host.js';

const states = {
  pending: ['待核验', 'muted'], unknown: ['未知状态', 'muted'],
  needs_credentials: ['待补凭据', 'warning'],
  running: ['运行中', 'running'], suspended: ['已暂停', 'muted'], stopped: ['已停止', 'muted'],
  cooling: ['冷却中', 'warning'], stale: ['数据过期', 'warning'],
  collect_failed: ['采集失败', 'error'], error: ['实例异常', 'error'],
  starting: ['启动中', 'warning'], resuming: ['唤醒中', 'warning'],
  suspending: ['暂停中', 'warning'], stopping: ['停止中', 'warning'],
  creating: ['创建中', 'warning'], deleting: ['删除中', 'warning'], deleted: ['已删除', 'muted'],
};
const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
const cycle = document.querySelector('#last-cycle');
const servers = document.querySelector('#servers');
const status = document.querySelector('#status');
const openConsole = document.querySelector('#open-console');
const actionError = document.querySelector('#action-error');

function setStatus(message) {
  status.hidden = !message;
  if (status.textContent !== message) status.textContent = message;
}

function render(summary, message) {
  const date = new Date(summary?.lastCycleAt ?? NaN);
  cycle.hidden = !Number.isFinite(date.getTime());
  if (!cycle.hidden) {
    cycle.textContent = `最近采集 ${timeFormat.format(date)}`;
    cycle.dateTime = date.toISOString();
    cycle.title = date.toLocaleString('zh-CN');
  }
  const rows = document.createDocumentFragment();
  for (const server of summary?.servers ?? []) {
    const row = document.createElement('tr');
    const name = document.createElement('th');
    name.scope = 'row';
    name.textContent = server.name;
    name.title = server.name;
    row.append(name);
    const [label, tone] = Object.hasOwn(states, server.state) ? states[server.state] : states.unknown;
    const state = row.insertCell();
    state.textContent = label;
    state.className = tone;
    for (const number of [server.cpuPct, server.memoryPct, server.diskPct]) {
      const cell = row.insertCell();
      cell.className = 'metric';
      cell.textContent = Number.isFinite(number) ? `${Math.round(number)}%` : '—';
    }
    rows.append(row);
  }
  servers.replaceChildren(rows);
  setStatus(message);
}

async function start() {
  const host = await connectHost();
  if (host.preview) {
    setStatus('预览时暂不读取本机工作台');
    await host.ready();
    return;
  }
  await host.ready();
  let supported = false;
  let clicking = false;
  openConsole.addEventListener('click', async () => {
    if (!supported || clicking) return;
    clicking = true;
    openConsole.disabled = true;
    actionError.hidden = true;
    try {
      await host.request('cloudWorkbench.openConsole');
    } catch (error) {
      actionError.textContent = error.message;
      actionError.hidden = false;
    } finally {
      clicking = false;
      clearTimeout(timer);
      void read();
    }
  });

  let timer;
  let reading = false;
  async function read() {
    if (document.hidden || reading) return;
    reading = true;
    let delay = 10000;
    try {
      const summary = await host.request('cloudWorkbench.summary');
      supported = summary.native === true;
      if (!supported) {
        render(null, '请更新 SoulDesk 宿主以启用内置采集。');
      } else {
        const configured = summary.servers.length > 0;
        openConsole.querySelector('span').textContent = configured ? '打开控制台 ↗' : '管理服务器 ↗';
        let message = '';
        if (!configured) {
          message = '暂无服务器';
        } else if (!summary.lastCycleAt && summary.servers.some(server => server.state !== 'needs_credentials')) {
          message = '正在等待首轮采集…';
          delay = 3000;
        }
        render(summary, message);
      }
    } catch {
      supported = false;
      render(null, '暂时无法读取状态，请确认 SoulDesk 已更新。');
    } finally {
      openConsole.disabled = clicking || !supported;
      reading = false;
      if (!document.hidden) timer = setTimeout(read, delay);
    }
  }

  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) void read();
  });
  void read();
}

start().catch(error => {
  setStatus('组件启动失败，请重新打开。');
  throw error;
});
