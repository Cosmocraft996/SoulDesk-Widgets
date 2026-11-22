import { createApp, nextTick } from 'vue';
import { connectHost } from './host.js';
import { settings } from '../hotspot-source/native';
import '../hotspot-source/style.css';
import App from './App.vue';

const host = await connectHost();
Object.assign(settings, await host.request('settings.get'));
const stored = await host.request('storage.get');

const app = createApp(App, { host, stored });
app.mount('#app');
await nextTick();
await host.ready();
window.addEventListener('pagehide', () => app.unmount(), { once: true });
