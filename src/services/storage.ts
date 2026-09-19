import type { WindowScene, Trip, SceneFormData } from '@/types'
import { TRIP_MAX_GAP_MS, isRainy } from '@/constants/trip'

const SCENES_STORAGE_KEY = 'bus_window_scenes'
const TRIPS_STORAGE_KEY = 'bus_window_trips'

function readScenesRaw(): WindowScene[] {
  try {
    const raw = localStorage.getItem(SCENES_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as WindowScene[]
  } catch {
    return []
  }
}

function writeScenes(scenes: WindowScene[]): void {
  localStorage.setItem(SCENES_STORAGE_KEY, JSON.stringify(scenes))
}

function readTripsRaw(): Trip[] {
  try {
    const raw = localStorage.getItem(TRIPS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Trip[]
  } catch {
    return []
  }
}

function writeTrips(trips: Trip[]): void {
  localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(trips))
}

function sortByTimeAsc(scenes: WindowScene[]): WindowScene[] {
  return [...scenes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

/**
 * 旧数据迁移：为没有 tripId 的历史记录按
 * “同线路 + 同座位方向 + 间隔不超过 20 分钟”补排行程，
 * 并补算非雨转雨的换景点标记。迁移结果写回本地存储。
 */
function migrate(scenes: WindowScene[]): WindowScene[] {
  if (scenes.length === 0 || scenes.every((s) => s.tripId)) return scenes

  const migrated = sortByTimeAsc(scenes).map((s) => ({ ...s }))
  // 每个“线路 + 方向”分组的最后一条采样
  const lastByGroup = new Map<string, WindowScene>()

  for (const scene of migrated) {
    const groupKey = `${scene.routeName}__${scene.seatDirection}`
    const last = lastByGroup.get(groupKey)
    const gap = last
      ? new Date(scene.timestamp).getTime() - new Date(last.timestamp).getTime()
      : Infinity

    if (!last || gap > TRIP_MAX_GAP_MS) {
      scene.tripId = crypto.randomUUID()
      scene.sceneryChange = false
    } else {
      scene.tripId = last.tripId
      scene.sceneryChange =
        scene.sceneryChange ?? (!isRainy(last.weather) && isRainy(scene.weather))
    }
    lastByGroup.set(groupKey, scene)
  }

  writeScenes(migrated)
  writeTrips(rebuildTrips(migrated))
  return migrated
}

/** 根据记录中的 tripId 重建行程表，空分组自然不会出现 */
function rebuildTrips(scenes: WindowScene[]): Trip[] {
  const groups = new Map<string, WindowScene[]>()
  for (const scene of scenes) {
    if (!scene.tripId) continue
    const list = groups.get(scene.tripId) ?? []
    list.push(scene)
    groups.set(scene.tripId, list)
  }

  const trips: Trip[] = []
  for (const [tripId, list] of groups) {
    const ordered = sortByTimeAsc(list)
    const first = ordered[0]
    const last = ordered[ordered.length - 1]
    trips.push({
      id: tripId,
      routeName: first.routeName,
      seatDirection: first.seatDirection,
      startTime: first.timestamp,
      endTime: last.timestamp,
      sceneIds: ordered.map((s) => s.id),
    })
  }
  return trips
}

export function getAllScenes(): WindowScene[] {
  const scenes = migrate(readScenesRaw())
  return sortByTimeAsc(scenes)
}

export function getAllTrips(): Trip[] {
  const scenes = getAllScenes()
  const tripsById = new Map(readTripsRaw().map((t) => [t.id, t]))
  const rebuilt = rebuildTrips(scenes)

  // 以记录为准重算首末时间，保留行程本身的存在性
  return rebuilt
    .map((trip) => {
      const existing = tripsById.get(trip.id)
      return existing
        ? { ...existing, startTime: trip.startTime, endTime: trip.endTime, sceneIds: trip.sceneIds }
        : trip
    })
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
}

export function getTripsByRoute(routeName: string): Trip[] {
  return getAllTrips().filter((t) => t.routeName === routeName)
}

/**
 * 保存一条采样：同线路、同座位方向且距上一条采样不超过 20 分钟则并入当前行程，
 * 否则新建行程。天气由非雨转雨时保留记录并打上换景点标记。
 */
export function saveScene(data: SceneFormData): WindowScene {
  const scenes = sortByTimeAsc(getAllScenes())
  const timestamp = new Date().toISOString()

  // 该“线路 + 方向”分组中时间上最近的一条采样
  const previous = [...scenes]
    .reverse()
    .find((s) => s.routeName === data.routeName && s.seatDirection === data.seatDirection)

  let tripId: string
  let sceneryChange = false
  if (previous) {
    const gap = new Date(timestamp).getTime() - new Date(previous.timestamp).getTime()
    if (gap <= TRIP_MAX_GAP_MS) {
      tripId = previous.tripId
      sceneryChange = !isRainy(previous.weather) && isRainy(data.weather)
    } else {
      tripId = crypto.randomUUID()
    }
  } else {
    tripId = crypto.randomUUID()
  }

  const scene: WindowScene = {
    ...data,
    id: crypto.randomUUID(),
    tripId,
    timestamp,
    sceneryChange,
  }

  const nextScenes = [...scenes, scene]
  writeScenes(nextScenes)
  persistTrips(nextScenes)
  return scene
}

/**
 * 删除一条采样：记录移除后空行程同步消失，非空行程重算首末时间。
 */
export function deleteScene(id: string): void {
  const nextScenes = getAllScenes().filter((s) => s.id !== id)
  writeScenes(nextScenes)
  persistTrips(nextScenes)
}

/** 以记录为唯一事实来源重写行程表 */
function persistTrips(scenes: WindowScene[]): void {
  writeTrips(rebuildTrips(sortByTimeAsc(scenes)))
}

export function getScenesByRoute(routeName: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.routeName === routeName)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getScenesByTrip(tripId: string): WindowScene[] {
  return getAllScenes()
    .filter((s) => s.tripId === tripId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function getAllRouteNames(): string[] {
  const scenes = getAllScenes()
  const routeSet = new Set(scenes.map((s) => s.routeName))
  return Array.from(routeSet).sort()
}

/**
 * 随机采样跳过仅有一条记录的行程（不足以构成一段完整旅程）
 */
export function getRandomScene(): WindowScene | null {
  const scenes = getAllScenes()
  if (scenes.length === 0) return null

  const counts = new Map<string, number>()
  for (const scene of scenes) {
    counts.set(scene.tripId, (counts.get(scene.tripId) ?? 0) + 1)
  }
  const eligible = scenes.filter((s) => (counts.get(s.tripId) ?? 0) > 1)
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)]
}
