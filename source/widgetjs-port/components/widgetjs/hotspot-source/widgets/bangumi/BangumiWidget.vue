<script lang="ts" setup>
import { contentFailure } from '@/native'
import client from '@/client'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { useIntervalFn } from '@vueuse/core'
import BangumiItem from '@/widgets/bangumi/BangumiItem.vue'
import type { BangumiResult, BangumiResultItem } from '@/widgets/bangumi/model/BangumiResult'

const items = ref<BangumiResultItem[]>([])
const activeItem = ref<BangumiResultItem>()

async function refresh() {
try {

  await client.get('https://bangumi.bilibili.com/web_api/timeline_global').then((result) => {
    const data = result.data as BangumiResult
    items.value = data.result.splice(data.result.length - 9, 7)
    for (const valueElement of items.value) {
      const date = dayjs(valueElement.date_ts * 1000)
      valueElement.weekday = date.format('ddd')
      valueElement.dayOfMonth = date.date()
      if (valueElement.is_today) {
        activeItem.value = valueElement
      }
    }
  })

} catch (error) { contentFailure(error); }
}

refresh()

function weekdayClick(item: BangumiResultItem) {
  activeItem.value = item
}

useIntervalFn(() => {
  refresh()
}, 1000 * 60 * 60)
</script>

<template>
  <div class="bangumi-widget">
    <div class="weekdays">
      <button
        v-for="item in items"
        :key="item.date_ts"
        type="button"
        class="weekday"
        :class="{ 'is-today': item.is_today, 'active': item == activeItem }"
        :aria-pressed="item == activeItem"
        @click="weekdayClick(item)"
      >
        <div class="day-of-month">
          {{ item.dayOfMonth }}
        </div>
        <div class="weekday-name">
          {{ item.weekday }}
        </div>
      </button>
    </div>
    <div class="scroll-area">
      <div class="bangumis">
        <BangumiItem v-for="item in activeItem?.seasons" :key="item.ep_id" :item="item" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.bangumi-widget {
  display: flex;
  height: 100%;
  flex-direction: column;
  border-radius: var(--widget-border-radius);
  overflow: hidden;

  .weekdays {
    display: flex;
    flex: none;
    gap: 4px;
    background: #2cbae5;
    padding: 5px 32px 5px 6px;

    .weekday {
      flex: 1;
      min-width: 0;
      padding: 2px 0 3px;
      border: 0;
      border-top: 2px solid transparent;
      display: flex;
      flex-direction: column;
      justify-content: center;
      place-items: center;
      border-radius: 0.2rem;
      font-size: 12px;
      background-color: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(10px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(0, 0, 0, 0.2);
      cursor: pointer;
      gap: 1px;
      transition: all 0.2s ease-in-out;

      &:hover,
      &.active {
        background-color: #fb7299;
        color: white;

        .weekday-name {
          color: white;
        }
      }

      .day-of-month {
        font-weight: bold;
      }

      .weekday-name {
        font-size: 10px;
        color: #636262;
      }

      &.is-today {
        border-top-color: #eebe01;
      }
    }
  }

  .scroll-area {
    min-height: 0;
    overflow: auto;
  }

  .bangumis {
    display: flex;
    flex-direction: column;
    padding: 6px;
    gap: 4px;
  }
}
</style>
