import { useIntervalFn as useVueIntervalFn } from '@vueuse/core';
import { settings } from '../hotspot-source/native';

export { useWindowSize } from '@vueuse/core';

export const MIN_REFRESH_MINUTES = 1;
export const MAX_REFRESH_MINUTES = 1440;
export const DEFAULT_REFRESH_MINUTES = 20;

export function validRefreshMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
    && value >= MIN_REFRESH_MINUTES && value <= MAX_REFRESH_MINUTES;
}

export function refreshMinutes() {
  const value: unknown = settings.refreshMinutes;
  return validRefreshMinutes(value) ? value : DEFAULT_REFRESH_MINUTES;
}

// 合并热榜里的榜单沿用原取数回调，定时器使用当前实例的间隔。
export function useIntervalFn(
  callback: () => void,
  _originalInterval: number,
  options?: Parameters<typeof useVueIntervalFn>[2],
) {
  return useVueIntervalFn(callback, () => refreshMinutes() * 60_000, options);
}
