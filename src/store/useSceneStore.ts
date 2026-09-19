import { create } from 'zustand'
import type { WindowScene, SceneFormData, Trip, SaveOutcome } from '@/types'
import {
  getAllScenes,
  saveScene as storageSaveScene,
  deleteScene as storageDeleteScene,
  getAllRouteNames,
  getRandomScene,
} from '@/services/storage'
import { buildTrips, describeSaveOutcome } from '@/utils/tripUtils'

/** 时间线展示顺序：行程按开始时间倒序，行程内记录按时间倒序 */
function orderTripsForTimeline(trips: Trip[]): Trip[] {
  return trips
    .map((trip) => ({
      ...trip,
      scenes: [...trip.scenes].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }))
    .sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
}

function filterTrips(trips: Trip[], routeName: string): Trip[] {
  if (!routeName) return trips
  return trips.filter((t) => t.routeName === routeName)
}

interface SceneState {
  scenes: WindowScene[]
  trips: Trip[]
  visibleTrips: Trip[]
  routeNames: string[]
  selectedRoute: string
  randomScene: WindowScene | null

  loadAll: () => void
  saveScene: (data: SceneFormData) => SaveOutcome
  deleteScene: (id: string) => void
  selectRoute: (routeName: string) => void
  refreshRandom: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: [],
  trips: [],
  visibleTrips: [],
  routeNames: [],
  selectedRoute: '',
  randomScene: null,

  loadAll: () => {
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const trips = orderTripsForTimeline(buildTrips(scenes))
    set({ scenes, routeNames, trips, visibleTrips: filterTrips(trips, get().selectedRoute) })
  },

  saveScene: (data: SceneFormData) => {
    const scene: WindowScene = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    // 保存前的记录用于判断归属（并入行程 or 新建行程）与换景点
    const outcome = describeSaveOutcome(get().scenes, scene)

    // 写回浏览器本地存储
    storageSaveScene(scene)

    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    const trips = orderTripsForTimeline(buildTrips(scenes))
    set({
      scenes,
      routeNames,
      trips,
      visibleTrips: filterTrips(trips, get().selectedRoute),
    })
    return outcome
  },

  deleteScene: (id: string) => {
    storageDeleteScene(id)
    const scenes = getAllScenes()
    const routeNames = getAllRouteNames()
    // 行程由记录派生：删掉末条记录的空行程自然消失，其余行程首末时间随之重算
    const trips = orderTripsForTimeline(buildTrips(scenes))
    set({
      scenes,
      routeNames,
      trips,
      visibleTrips: filterTrips(trips, get().selectedRoute),
    })
  },

  selectRoute: (routeName: string) => {
    set({
      selectedRoute: routeName,
      visibleTrips: filterTrips(get().trips, routeName),
    })
  },

  refreshRandom: () => {
    // 灵感抽取跳过只有一条记录的行程
    const randomScene = getRandomScene()
    set({ randomScene })
  },
}))
