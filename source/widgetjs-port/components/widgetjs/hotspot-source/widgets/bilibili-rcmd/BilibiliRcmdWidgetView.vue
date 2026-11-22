<script lang="ts" setup>
import { ComponentFrame, contentFailure, host, openExternal, secureImage } from '@/native'
import { onMounted, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import type { BilibiliVideoItem } from '@/api/BilibiliApi'
import { BilibiliApi } from '@/api/BilibiliApi'

type Layout = 'grid' | 'list'
const layout = ref<Layout>('grid')
const loadingLayout = ref(!host.preview)
const savingLayout = ref(false)
const layoutError = ref('')
const recommendedVideos = ref<BilibiliVideoItem[]>([])

async function refresh() {
  try {
    const latestShowVid = recommendedVideos.value.map(it => `av_${it.id}`)
    recommendedVideos.value = await BilibiliApi.getRecommendedVideos(latestShowVid)
  } catch (error) {
    contentFailure(error)
  }
}

async function loadLayout() {
  if (host.preview) return
  try {
    const stored = await host.request('storage.get')
    if (stored.recommendationLayout === 'list') layout.value = 'list'
  } catch {
    layoutError.value = '读取展示方式失败'
  } finally {
    loadingLayout.value = false
  }
}

async function selectLayout(value: Layout) {
  if (loadingLayout.value || savingLayout.value || (layout.value === value && !layoutError.value)) return
  savingLayout.value = true
  try {
    if (!host.preview) {
      const stored = await host.request('storage.get')
      await host.request('storage.set', { ...stored, recommendationLayout: value })
    }
    layout.value = value
    layoutError.value = ''
  } catch {
    layoutError.value = '保存展示方式失败，请重试'
  } finally {
    savingLayout.value = false
  }
}

onMounted(() => {
  void loadLayout()
  void refresh()
})

useIntervalFn(() => {
  refresh()
}, 20 * 60 * 1000)
</script>

<template>
  <ComponentFrame class="bilibili-rcmd">
    <div class="root">
      <div class="header">
        <img src="@/widgets/bilibili/images/bilibili_pink.png" alt="bilibili" class="logo">
        <button type="button" class="search" @click="openExternal('https://search.bilibili.com/all?search_source=1')">搜索视频</button>
        <button type="button" class="refresh" aria-label="刷新推荐" title="刷新推荐" @click="refresh">⟳</button>
        <div class="layout-controls" role="group" aria-label="展示方式">
          <button type="button" :aria-pressed="layout === 'list'" :disabled="loadingLayout || savingLayout" @click="selectLayout('list')">列表</button>
          <button type="button" :aria-pressed="layout === 'grid'" :disabled="loadingLayout || savingLayout" @click="selectLayout('grid')">网格</button>
        </div>
      </div>
      <output v-if="layoutError" class="layout-error">{{ layoutError }}</output>
      <div class="scroll-area">
        <div class="video-list" :data-layout="layout">
          <button v-for="video in recommendedVideos" :key="video.bvid" type="button" class="video-item" :title="video.title" @click="openExternal(video.uri)">
            <span class="thumbnail">
              <img v-if="video.pic" referrerpolicy="no-referrer" :src="secureImage(video.pic) || undefined" alt="">
              <span class="view-count">
                {{ (video.stat.view / 10000).toFixed(1) }}万
              </span>
            </span>
            <span class="video-info">
              <span class="title">
                {{ video.title }}
              </span>
              <span class="uploader">
                <span class="up-icon" aria-hidden="true">UP</span>
                <span class="uploader-name">{{ video.owner.name }}</span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </ComponentFrame>
</template>

<style lang="scss" scoped>
.root {
  display: flex;
  height: 100%;
  flex-direction: column;
  color: var(--widget-color);
}

img {
  -webkit-user-drag: none;
}

.video-list {
  display: grid;
  padding: 4px 7px 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;

  @media (min-width: 500px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  &[data-layout='list'] {
    grid-template-columns: minmax(0, 1fr);

    .video-item {
      display: grid;
      grid-template-columns: 82px minmax(0, 1fr);
      align-items: center;
      gap: 7px;
    }
  }
}

.header {
  padding: 5px 32px 4px 7px;
  display: flex;
  align-items: center;
  gap: 4px;

  .logo {
    height: 15px;
    margin-right: 2px;
  }

  button {
    border: 0;
    border-radius: 4px;
    padding: 0 4px;
    height: 24px;
    background: transparent;
    color: inherit;
    white-space: nowrap;
    font-size: 11px;
  }

  .search {
    flex: 1;
    min-width: 0;
    background: color-mix(in srgb, var(--widget-background-color), var(--widget-color) 10%);
  }

  .refresh {
    font-size: 16px;
  }

  .layout-controls {
    display: flex;
    gap: 1px;
    padding: 1px;
    background: color-mix(in srgb, var(--widget-background-color), var(--widget-color) 10%);
    border-radius: 5px;

    button {
      height: 22px;
    }

    button[aria-pressed='true'] {
      background: var(--widget-background-color);
      font-weight: 700;
    }
  }
}

.layout-error {
  padding: 0 7px;
  font-size: 11px;
}

.scroll-area {
  min-height: 0;
  overflow: auto;
}

.video-item {
  display: block;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;

  .thumbnail {
    display: block;
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 5px;
    overflow: hidden;
    background: #e7e9ed;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .view-count {
      position: absolute;
      bottom: 3px;
      right: 3px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 1px 3px;
      border-radius: 3px;
      font-size: 10px;
    }
  }

  .video-info {
    display: block;
    padding: 3px 0;

    .title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .uploader {
      font-size: 11px;
      opacity: 0.8;
      display: flex;
      align-items: center;

      .up-icon {
        color: inherit;
        margin-right: 4px;
        font-size: 9px;
      }

      .uploader-name {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
