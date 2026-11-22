<script setup lang="ts">
import { computed, ref } from 'vue';
import { validateBody } from '../hotspot-source/endpoints.js';
import { fallbackRemoteImage } from '../hotspot-source/images.js';
import { setHost, settings } from '../hotspot-source/native';
import Bilibili from '../hotspot-source/widgets/bilibili/BilibiliWidgetView.vue';
import Douyin from '../hotspot-source/widgets/douyin/DouyinWidgetView.vue';
import Toutiao from '../hotspot-source/widgets/tou-tiao/TouTiaoWidgetView.vue';
import Weibo from '../hotspot-source/widgets/weibo/WeiBoWidgetView.vue';
import Zhihu from '../hotspot-source/widgets/zhihu/ZhihuWidgetView.vue';
import { MAX_REFRESH_MINUTES, MIN_REFRESH_MINUTES, refreshMinutes, validRefreshMinutes } from './refresh';

const sources = {
  bilibili: { name: 'B 站热搜', view: Bilibili },
  douyin: { name: '抖音热榜', view: Douyin },
  'tou-tiao': { name: '头条热榜', view: Toutiao },
  weibo: { name: '微博热搜', view: Weibo },
  zhihu: { name: '知乎热榜', view: Zhihu },
};
type Source = keyof typeof sources;

const props = defineProps<{ host: any; stored: Record<string, unknown> }>();
const host = props.host;
function isSource(value: unknown): value is Source {
  return typeof value === 'string' && Object.hasOwn(sources, value);
}

const source = ref<Source>(isSource(props.stored?.source) ? props.stored.source : 'bilibili');
const currentView = computed(() => sources[source.value].view);
const theme = computed(() => ({
  '--widget-background-color': settings.background,
  '--widget-color': settings.foreground,
  borderRadius: settings.radius + 'px',
}));

function newStatus() {
  return { loading: false, updatedAt: 0, error: '', linkError: '', failed: 0 };
}

const status = ref(newStatus());
const saveError = ref(false);
const refreshDialog = ref<HTMLDialogElement>();
const refreshDraft = ref<number | string>(refreshMinutes());
const refreshSaving = ref(false);
const refreshError = ref('');
let saveQueue = Promise.resolve();
let lastSave = 0;

function editRefresh() {
  refreshDraft.value = refreshMinutes();
  refreshError.value = '';
  refreshDialog.value?.showModal();
}

async function saveRefresh() {
  if (host.preview || refreshSaving.value) return;
  const minutes = Number(refreshDraft.value);
  if (!validRefreshMinutes(minutes)) {
    refreshError.value = `请输入 ${MIN_REFRESH_MINUTES} 至 ${MAX_REFRESH_MINUTES} 的整数分钟`;
    return;
  }
  if (minutes === refreshMinutes()) {
    refreshDialog.value?.close();
    return;
  }
  refreshSaving.value = true;
  refreshError.value = '';
  try {
    const saved = await host.request('settings.update', { ...settings, refreshMinutes: minutes });
    Object.assign(settings, saved);
    refreshDialog.value?.close();
  } catch {
    refreshError.value = '保存失败，请重试';
  } finally {
    refreshSaving.value = false;
  }
}

function saveSource() {
  if (host.preview) return;
  const selected = source.value;
  const request = ++lastSave;
  saveError.value = false;
  // 实例存储为整份写入，串行提交，避免快速切换时旧选择覆盖新选择。
  saveQueue = saveQueue.then(async () => {
    if (request !== lastSave) return;
    try {
      await host.request('storage.set', { ...props.stored, source: selected });
    } catch {
      if (request === lastSave) saveError.value = true;
    }
  });
}

function selectSource(event: Event) {
  const selected = (event.target as HTMLSelectElement).value;
  if (!isSource(selected) || selected === source.value) return;
  status.value = newStatus();
  source.value = selected;
  saveSource();
}

setHost({
  preview: host.preview,
  async request(method: string, args: { source?: string }) {
    // 捕获发起时的状态。切走后的响应仍可完成，但只会写回当时的榜单状态。
    const current = status.value;
    if (method === 'links.open') {
      current.linkError = '';
      try {
        return await host.request(method, args);
      } catch (error) {
        current.linkError = '打开链接失败';
        throw error;
      }
    }
    if (method !== 'content.get') return host.request(method, args);
    if (args.source !== source.value) throw new Error('榜单来源已切换');

    current.loading = true;
    current.error = '';
    try {
      const result = await host.request(method, args);
      validateBody(args.source, result.data);
      current.updatedAt = result.fetchedAt;
      return result;
    } catch (error) {
      current.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      current.loading = false;
    }
  },
});

const statusText = computed(() => {
  if (host.preview) return '预览 · 不读取网络';
  const { error, linkError, loading, updatedAt } = status.value;
  if (error) return '获取失败：' + error + (updatedAt ? ' · 显示上次数据' : '');
  if (linkError) return linkError;
  if (loading) return '正在更新…';
  if (updatedAt) return '更新于 ' + new Date(updatedAt).toLocaleTimeString();
  return '等待读取榜单';
});
</script>

<template>
  <main class="hot-rank" :style="theme" @error.capture="fallbackRemoteImage($event, status)">
    <header class="source-bar">
      <label for="rank-source">榜单来源</label>
      <select id="rank-source" :value="source" @change="selectSource">
        <option v-for="(item, key) in sources" :key="key" :value="key">{{ item.name }}</option>
      </select>
      <button
        type="button"
        class="refresh-button"
        title="设置刷新间隔"
        :aria-label="`设置刷新间隔，当前 ${refreshMinutes()} 分钟`"
        :disabled="host.preview"
        @click="editRefresh"
      >{{ refreshMinutes() }} 分钟</button>
    </header>
    <div class="content-view">
      <component :is="currentView" :key="source" />
    </div>
    <footer class="rank-status" role="status">
      <span :class="{ error: status.error || status.linkError }">{{ statusText }}</span>
      <span v-if="status.failed"> · {{ status.failed }} 张图片未加载</span>
      <div v-if="saveError" class="save-error">
        来源选择未保存
        <button type="button" @click="saveSource">重试保存</button>
      </div>
    </footer>
    <dialog ref="refreshDialog" aria-labelledby="refresh-title" @cancel="refreshSaving && $event.preventDefault()">
      <form @submit.prevent="saveRefresh">
        <h2 id="refresh-title">刷新间隔</h2>
        <label>
          分钟
          <input v-model="refreshDraft" type="number" :min="MIN_REFRESH_MINUTES" :max="MAX_REFRESH_MINUTES"
            step="1" required :disabled="refreshSaving" autofocus>
        </label>
        <output v-if="refreshError" role="alert">{{ refreshError }}</output>
        <div class="actions">
          <button type="button" :disabled="refreshSaving" @click="refreshDialog?.close()">取消</button>
          <button type="submit" :disabled="refreshSaving">{{ refreshSaving ? '保存中…' : '保存' }}</button>
        </div>
      </form>
    </dialog>
  </main>
</template>

<style>
.hot-rank {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--widget-background-color);
  color: var(--widget-color);
  --widget-inner-width: 100%;
  --widget-inner-height: 100%;
  --widget-font-size: 14px;
  --widget-border-radius: 16px;
}

.source-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px 0;
}

.source-bar label {
  flex: none;
  font-size: 12px;
}

.source-bar select,
.refresh-button {
  min-width: 0;
  min-height: 30px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, currentColor 38%, transparent);
  border-radius: 8px;
  background: var(--widget-background-color);
  color: inherit;
  font: inherit;
  font-size: 13px;
}

.source-bar select {
  flex: 1;
}

.refresh-button {
  flex: none;
  white-space: nowrap;
}

.source-bar select:focus-visible,
.refresh-button:focus-visible,
.save-error button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.hot-rank > .content-view {
  position: relative;
  inset: auto;
  min-height: 0;
}

.hot-rank .scroll-area {
  flex: 1;
  min-height: 0;
}

.rank-status {
  max-height: 66px;
  overflow: auto;
  padding: 2px 16px 6px;
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.rank-status .error,
.save-error {
  font-weight: 600;
}

.save-error button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-decoration: underline;
}
</style>
