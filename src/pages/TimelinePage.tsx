import { useEffect, useState } from 'react'
import {
  Search, Route, X, Trash2, Clock, MapPin, ChevronDown, Armchair, CloudRain,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatShortTime,
  formatTimestamp,
  formatTripRange,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import type { WindowScene, Trip } from '@/types'

export default function TimelinePage() {
  const {
    trips, scenes, routeNames, selectedRoute, selectRoute, loadAll, deleteScene,
  } = useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  const visibleTrips: Trip[] = selectedRoute
    ? trips.filter((t) => t.routeName === selectedRoute)
    : trips

  const scenesByTrip = new Map<string, WindowScene[]>()
  for (const scene of scenes) {
    if (selectedRoute && scene.routeName !== selectedRoute) continue
    const list = scenesByTrip.get(scene.tripId) ?? []
    list.push(scene)
    scenesByTrip.set(scene.tripId, list)
  }
  for (const list of scenesByTrip.values()) {
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const toggleTrip = (tripId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(tripId)) next.delete(tripId)
      else next.add(tripId)
      return next
    })
  }

  const handleDelete = (id: string) => {
    deleteScene(id)
    setDetailScene(null)
  }

  return (
    <div className="min-h-screen bg-teal-950 font-serif text-mist-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold tracking-wide text-dusk-400">
          窗景时间线
        </h1>

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-mist-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索路线..."
              className="w-full rounded-lg border border-teal-800 bg-teal-900/60 py-2.5 pl-10 pr-4 text-sm text-mist-100 placeholder:text-mist-500 focus:border-dusk-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => selectRoute('')}
              className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                !selectedRoute
                  ? 'bg-dusk-400 text-teal-950'
                  : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
              }`}
            >
              全部
            </button>
            {filteredRoutes.map((name) => (
              <button
                key={name}
                onClick={() => selectRoute(name)}
                className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${
                  selectedRoute === name
                    ? 'bg-dusk-400 text-teal-950'
                    : 'bg-teal-900 text-mist-300 hover:bg-teal-800'
                }`}
              >
                <Route className="mr-1 inline w-3 h-3" />
                {name}
              </button>
            ))}
          </div>
        </div>

        {visibleTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-mist-400">
            <div className="mb-4 text-6xl opacity-30">🪟</div>
            <p className="text-lg">
              {selectedRoute ? '该路线暂无窗景记录' : '还没有任何行程，去记录第一段窗景吧'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleTrips.map((trip) => {
              const tripScenes = scenesByTrip.get(trip.id) ?? []
              const isCollapsed = collapsed.has(trip.id)
              const rainyStart = tripScenes.some((s) => s.sceneryChange)
              return (
                <section
                  key={trip.id}
                  className="overflow-hidden rounded-xl border border-teal-800 bg-teal-900/40"
                >
                  <button
                    onClick={() => toggleTrip(trip.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-teal-900/70"
                  >
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-mist-400 transition-transform duration-200 ${
                        isCollapsed ? '-rotate-90' : ''
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-dusk-400" />
                        <span className="truncate text-sm font-semibold text-mist-100">
                          {trip.routeName}
                        </span>
                        <span className="flex shrink-0 items-center gap-0.5 text-xs text-mist-400">
                          <Armchair className="w-3 h-3" />
                          {trip.seatDirection}侧
                        </span>
                        {rainyStart && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">
                            <CloudRain className="w-3 h-3" />
                            途中遇雨
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-mist-500">
                        <Clock className="w-3 h-3" />
                        {formatTripRange(trip.startTime, trip.endTime)}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-teal-800/70 px-2.5 py-1 text-[10px] text-mist-300">
                      {trip.sceneIds.length} 条采样
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="relative ml-6 border-l border-teal-800 pl-6 pr-4 pb-4">
                      <div className="space-y-4 pt-1">
                        {tripScenes.map((scene) => (
                          <div key={scene.id} className="relative flex gap-4">
                            <div className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-dusk-400 ring-4 ring-teal-950" />
                            <div className="w-12 shrink-0 pt-0.5 text-right">
                              <p className="text-xs text-dusk-400">
                                {formatShortTime(scene.timestamp)}
                              </p>
                            </div>
                            <button
                              onClick={() => setDetailScene(scene)}
                              className="group flex-1 rounded-xl border border-teal-800 bg-teal-900/50 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                            >
                              <div className="mb-2 flex items-center gap-2">
                                {getWeatherIcon(scene.weather)}
                                <span className="text-sm font-semibold text-mist-100">
                                  {scene.segment}
                                </span>
                                {scene.sceneryChange && (
                                  <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">
                                    <CloudRain className="w-3 h-3" />
                                    换景点 · 雨落
                                  </span>
                                )}
                              </div>
                              {scene.note && (
                                <p className="line-clamp-2 text-xs text-mist-400">
                                  {scene.note}
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                {getTreeIcon(scene.treeDensity)}
                                {getPedestrianIcon(scene.pedestrianStatus)}
                                {scene.signText && (
                                  <span className="rounded bg-teal-800/60 px-1.5 py-0.5 text-[10px] text-mist-300">
                                    {scene.signText}
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {detailScene && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailScene(null)}
        >
          <div
            className="relative mx-4 w-full max-w-md animate-scale-in rounded-2xl border border-teal-700 bg-teal-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailScene(null)}
              className="absolute right-4 top-4 text-mist-400 hover:text-mist-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              {getWeatherIcon(detailScene.weather)}
              <h2 className="text-xl font-bold text-dusk-400">{detailScene.segment}</h2>
              {detailScene.sceneryChange && (
                <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">
                  <CloudRain className="w-3 h-3" />
                  换景点
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{detailScene.routeName}</span>
                <span className="text-teal-600">·</span>
                <Armchair className="w-3.5 h-3.5 text-dusk-400" />
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
              </div>
              <div className="flex items-center gap-3 text-mist-300">
                {getTreeIcon(detailScene.treeDensity)}
                <span>{detailScene.treeDensity}</span>
                {getPedestrianIcon(detailScene.pedestrianStatus)}
                <span>{detailScene.pedestrianStatus}</span>
              </div>
              {detailScene.signText && (
                <div className="rounded-lg bg-teal-800/50 px-3 py-2 text-mist-200">
                  招牌: {detailScene.signText}
                </div>
              )}
              {detailScene.note && (
                <div className="rounded-lg border border-teal-800 px-3 py-2 text-mist-300">
                  {detailScene.note}
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(detailScene.id)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-red-900/40 py-2.5 text-sm text-red-300 transition-colors hover:bg-red-900/60"
            >
              <Trash2 className="w-4 h-4" />
              删除此窗景
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
