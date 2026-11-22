<script setup lang="ts">
import { openExternal, secureImage } from '@/native'
import { computed, ref } from 'vue'

import ColorThief from 'colorthief'
import Color from 'color'
import type { BangumiSeason } from '@/widgets/bangumi/model/BangumiResult'

const props = defineProps<{ item: BangumiSeason }>()
const cover = computed(() => secureImage(props.item.square_cover) || secureImage(props.item.cover))
const bgStartColor = ref('#f0fbff')
const bgEndColor = ref('#f0fbff')
const textColor = ref('#001b24')

function getImgColor(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  if (!image.naturalWidth || image.dataset.failedRemote) return

  try {
    const palette = new ColorThief().getPalette(image, 5)
    if (!palette || palette.length < 3) return
    const base = Color.rgb(palette[1])
    const accent = Color.rgb(palette[0])
    bgStartColor.value = base.string()
    bgEndColor.value = Color.rgb(palette[2]).hex()
    textColor.value = (base.isLight() ? accent.darken(0.5) : accent.lighten(0.5)).string()
  } catch {
    // 封面取色失败时，卡片继续使用浅蓝底色。
  }
}
</script>

<template>
  <div class="bangumi">
    <div class="pub-time">
      {{ item.pub_time }}
    </div>
    <button type="button" class="card" :title="item.title" @click="openExternal(item.url)">
      <span class="bangumi-cover">
        <img v-if="cover" :key="cover" crossorigin="anonymous" referrerpolicy="no-referrer" :src="cover" alt="" @load="getImgColor">
      </span>
      <span class="info">
        <span class="title">
          {{ item.title }}
        </span>
        <span class="pub-index">
          {{ item.pub_index }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
@use "sass:color";
$bilibili-color: #00a1d6;
$text-color: color.adjust($bilibili-color, $lightness: -25%);
.bangumi {
  display: flex;
  gap: 6px;

  .pub-time {
    font-size: 12px;
    color: $text-color;
    display: flex;
    flex: 0 0 35px;
    font-weight: bold;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding-top: 4px;

    &::after {
      content: '';
      flex: 1;
      border-left: 1px dotted currentColor;
      opacity: 0.35;
    }
  }

  .card {
    display: flex;
    flex: 1;
    min-width: 0;
    border: 0;
    border-radius: 6px;
    padding: 4px;
    cursor: pointer;
    gap: 6px;
    text-align: left;
    background: linear-gradient(-45deg, v-bind(bgStartColor), v-bind(bgEndColor));
    color: v-bind(textColor);

    .bangumi-cover {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      background: #e7e9ed;
    }

    .info {
      gap: 2px;
      display: flex;
      min-width: 0;
      flex-direction: column;
      justify-content: center;

      .title {
        font-size: 13px;
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        opacity: 0.8;
        text-overflow: ellipsis;
      }

      .pub-index {
        font-size: 11px;
        opacity: 0.6;
      }
    }
  }
}
</style>
