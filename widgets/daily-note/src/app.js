import { connectHost } from './host.js';

const form = document.querySelector('form');
const editor = form.querySelector('textarea');
const button = form.querySelector('button');
const status = document.querySelector('#status');

async function init() {
  const host = await connectHost();
  const settings = await host.request('settings.get');
  let saved = settings.text ?? '';
  editor.value = saved;
  editor.disabled = false;
  status.textContent = '内容保存在当前便签';
  let saving = false;

  editor.addEventListener('input', () => {
    button.disabled = saving || editor.value === saved;
    if (!saving) status.textContent = button.disabled ? '已保存' : '有未保存的内容';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving || editor.value === saved) return;
    const text = editor.value;
    saving = true;
    button.disabled = true;
    status.textContent = '正在保存…';
    try {
      await host.request('settings.update', { ...settings, text });
      saved = text;
      status.textContent = editor.value === saved ? '已保存' : '有未保存的内容';
    } catch {
      status.textContent = '保存失败，草稿仍在，请重试。';
    } finally {
      saving = false;
      button.disabled = editor.value === saved;
    }
  });

  await host.ready();
}

init().catch(error => {
  status.textContent = '读取便签失败，请重新打开组件。';
  throw error;
});
