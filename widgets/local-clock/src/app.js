import { connectHost } from './host.js';

const clock = document.querySelector('#time');
const date = document.querySelector('#date');
const weekday = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

async function init() {
  const host = await connectHost();
  function tick() {
    const now = new Date();
    clock.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(value => String(value).padStart(2, '0')).join(':');
    clock.dateTime = clock.textContent;
    const label = weekday.format(now);
    if (date.textContent !== label) date.textContent = label;
  }
  tick();
  await host.ready();
  setInterval(tick, 250);
}

init().catch(error => {
  date.textContent = '时钟启动失败，请重新打开组件。';
  throw error;
});
