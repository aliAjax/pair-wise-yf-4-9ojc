import type { WindowScene } from '@/types'
import { buildTrips } from '@/utils/tripUtils'

const STORAGE_KEY = 'bus_window_scenes'

export function getAllScenes(): WindowScene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WindowScene[]
  } catch {
    return []
  }
}

export function saveScene(scene: WindowScene): void {
  const scenes = getAllScenes()
  scenes.push(scene)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function deleteScene(id: string): void {
  const scenes = getAllScenes().filter((s) => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
}

export function getAllRouteNames(): string[] {
  const scenes = getAllScenes()
  const routeSet = new Set(scenes.map((s) => s.routeName))
  return Array.from(routeSet).sort()
}

/**
 * 灵感抽取：仅从含两条及以上记录的行程中随机取一条记录。
 * 只有一条记录的行程跳过；没有任何可参考行程时返回 null。
 */
export function getRandomScene(): WindowScene | null {
  return getRandomSceneFromScenes(getAllScenes())
}

export function getRandomSceneFromScenes(scenes: WindowScene[]): WindowScene | null {
  const eligible = buildTrips(scenes)
    .filter((trip) => trip.scenes.length > 1)
    .flatMap((trip) => trip.scenes)
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)]
}
