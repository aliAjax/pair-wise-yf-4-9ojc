import type { Trip, Weather, WindowScene } from '@/types'

/** 同一行程内，相邻两次采样允许的最大间隔（毫秒）：20 分钟 */
export const TRIP_GAP_MS = 20 * 60 * 1000

/** 属于“雨”的天气 */
const RAINY_WEATHERS: Weather[] = ['小雨', '大雨']

export function isRainyWeather(weather: Weather): boolean {
  return RAINY_WEATHERS.includes(weather)
}

/**
 * 将窗景记录归并为行程。
 *
 * 规则：按时间正序遍历，同一线路、同一座位方向，且距同行程上一条采样
 * 不超过 20 分钟的记录并入当前行程；换线路、换座位方向或超时则新建行程。
 *
 * 天气由非雨转为雨时不拆分行程，记录照常保留，并把该记录标记为换景点。
 */
export function buildTrips(scenes: WindowScene[]): Trip[] {
  const sorted = [...scenes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const trips: Trip[] = []
  let current: Trip | null = null
  let prevRainy = false

  for (const scene of sorted) {
    const time = new Date(scene.timestamp).getTime()
    const sameTrip =
      current !== null &&
      current.routeName === scene.routeName &&
      current.seatDirection === scene.seatDirection &&
      time - new Date(current.scenes[current.scenes.length - 1].timestamp).getTime() <=
        TRIP_GAP_MS

    if (!sameTrip) {
      current = {
        id: scene.id,
        routeName: scene.routeName,
        seatDirection: scene.seatDirection,
        scenes: [],
        startTime: scene.timestamp,
        endTime: scene.timestamp,
        weatherShiftSceneIds: [],
      }
      trips.push(current)
      // 新行程重新起算天气，首条记录不构成“换景点”
      prevRainy = isRainyWeather(scene.weather)
    }

    const rainy = isRainyWeather(scene.weather)
    if (!prevRainy && rainy) {
      current.weatherShiftSceneIds.push(scene.id)
    }
    prevRainy = rainy

    current.scenes.push(scene)
    current.endTime = scene.timestamp
  }

  return trips
}

/** 行程是否包含换景点（非雨转雨） */
export function tripHasWeatherShift(trip: Trip): boolean {
  return trip.weatherShiftSceneIds.length > 0
}

/**
 * 判断一条新记录相对已有记录的行程归属，用于保存后的即时提示。
 * 返回的 weatherShift 仅在“并入既有行程且上一条采样非雨”时可能成立。
 */
export function describeSaveOutcome(
  existing: WindowScene[],
  saved: WindowScene
): { isNewTrip: boolean; weatherShift: boolean } {
  const savedTime = new Date(saved.timestamp).getTime()
  const prevScene = existing
    .filter(
      (s) =>
        s.routeName === saved.routeName &&
        s.seatDirection === saved.seatDirection &&
        new Date(s.timestamp).getTime() <= savedTime
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

  if (
    !prevScene ||
    savedTime - new Date(prevScene.timestamp).getTime() > TRIP_GAP_MS
  ) {
    return { isNewTrip: true, weatherShift: false }
  }

  return {
    isNewTrip: false,
    weatherShift:
      !isRainyWeather(prevScene.weather) && isRainyWeather(saved.weather),
  }
}

/** 把时间范围格式化为紧凑展示：同日只显示一次日期 */
export function formatTripRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
  const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

  if (start.toDateString() === end.toDateString()) {
    return `${date(start)} ${clock(start)}–${clock(end)}`
  }
  return `${date(start)} ${clock(start)} – ${date(end)} ${clock(end)}`
}
