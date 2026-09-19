import type { Weather } from '@/types'

/** 同一行程内相邻采样的最大间隔：20 分钟 */
export const TRIP_MAX_GAP_MS = 20 * 60 * 1000

export const RAINY_WEATHERS: Weather[] = ['小雨', '大雨']

export function isRainy(weather: Weather): boolean {
  return RAINY_WEATHERS.includes(weather)
}
