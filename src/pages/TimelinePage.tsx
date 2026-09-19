import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  Route,
  X,
  Trash2,
  Clock,
  MapPin,
  Armchair,
  Umbrella,
  ChevronDown,
  Layers,
} from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import {
  formatTimestamp,
  getTimeOfDay,
  getWeatherIcon,
  getTreeIcon,
  getPedestrianIcon,
} from '@/utils/sceneHelpers'
import { formatTripRange } from '@/utils/tripUtils'
import type { WindowScene } from '@/types'

export default function TimelinePage() {
  const { routeNames, selectedRoute, visibleTrips, selectRoute, loadAll, deleteScene } =
    useSceneStore()
  const [search, setSearch] = useState('')
  const [detailScene, setDetailScene] = useState<WindowScene | null>(null)
  const [expandedTripIds, setExpandedTripIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filteredRoutes = routeNames.filter((r) =>
    r.toLowerCase().includes(search.toLowerCase())
  )

  // 全部行程里的“非雨转雨”记录 id，供行内与详情弹窗标记换景点
  const weatherShiftIds = useMemo(() => {
    const ids = new Set<string>()
    visibleTrips.forEach((trip) =>
      trip.weatherShiftSceneIds.forEach((id) => ids.add(id))
    )
    return ids
  }, [visibleTrips])

  const toggleTrip = (tripId: string) => {
    setExpandedTripIds((prev) => {
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
              {selectedRoute ? '该路线暂无窗景记录' : '选择一条路线，开始浏览窗景'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleTrips.map((trip) => {
              const expanded = expandedTripIds.has(trip.id)
              const hasShift = trip.weatherShiftSceneIds.length > 0
              return (
                <div
                  key={trip.id}
                  className="rounded-2xl border border-teal-800 bg-teal-900/40 overflow-hidden"
                >
                  <button
                    onClick={() => toggleTrip(trip.id)}
                    className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-teal-900/70"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dusk-400/15">
                      <Route className="w-5 h-5 text-dusk-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-mist-100">
                          {trip.routeName}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-800/70 px-2 py-0.5 text-[10px] text-mist-300">
                          <Armchair className="w-3 h-3" />
                          {trip.seatDirection}侧
                        </span>
                        {hasShift && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">
                            <Umbrella className="w-3 h-3" />
                            遇雨换景 ×{trip.weatherShiftSceneIds.length}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-mist-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatTripRange(trip.startTime, trip.endTime)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-800/60 px-2 py-1 text-[10px] text-mist-300">
                        <Layers className="w-3 h-3" />
                        {trip.scenes.length} 段
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-mist-400 transition-transform duration-200 ${
                          expanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {expanded && (
                    <div className="relative ml-7 mr-4 mb-4 pl-6">
                      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-teal-800" />
                      <div className="space-y-3">
                        {trip.scenes.map((scene) => {
                          const isWeatherShift = weatherShiftIds.has(scene.id)
                          return (
                            <div key={scene.id} className="relative">
                              <div
                                className={`absolute -left-[19px] top-3 h-2.5 w-2.5 rounded-full ring-4 ring-teal-950 ${
                                  isWeatherShift ? 'bg-blue-400' : 'bg-dusk-400'
                                }`}
                              />
                              <button
                                onClick={() => setDetailScene(scene)}
                                className="group w-full rounded-xl border border-teal-800 bg-teal-900/60 p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-dusk-400/40 hover:shadow-lg hover:shadow-dusk-400/10"
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    {getWeatherIcon(scene.weather)}
                                    <span className="text-sm font-semibold text-mist-100">
                                      {scene.segment}
                                    </span>
                                  </div>
                                  <span className="shrink-0 text-[11px] text-dusk-400">
                                    {formatTimestamp(scene.timestamp).split(' ')[1]}
                                  </span>
                                </div>
                                {isWeatherShift && (
                                  <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">
                                    <Umbrella className="w-3 h-3" />
                                    天气由非雨转雨，换景点
                                  </div>
                                )}
                                {scene.note && (
                                  <p className="text-xs text-mist-400 line-clamp-2">
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
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
            </div>

            {weatherShiftIds.has(detailScene.id) && (
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
                <Umbrella className="w-3.5 h-3.5" />
                天气由非雨转雨，此处标记为换景点
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-mist-300">
                <MapPin className="w-4 h-4 text-dusk-400" />
                <span>{detailScene.routeName}</span>
                <span className="text-teal-600">·</span>
                <span>{detailScene.seatDirection}侧</span>
              </div>
              <div className="flex items-center gap-2 text-mist-300">
                <Clock className="w-4 h-4 text-dusk-400" />
                <span>{formatTimestamp(detailScene.timestamp)}</span>
                <span className="text-teal-600">·</span>
                <span>{getTimeOfDay(detailScene.timestamp)}</span>
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
