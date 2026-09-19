export type SeatDirection = '左' | '右'

export type Weather = '晴' | '多云' | '阴' | '小雨' | '大雨' | '雪' | '雾'

export type TreeDensity = '稀疏' | '适中' | '茂密'

export type PedestrianStatus = '稀少' | '零星' | '密集'

export interface WindowScene {
  id: string
  routeName: string
  segment: string
  seatDirection: SeatDirection
  timestamp: string
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

export interface SceneFormData {
  routeName: string
  segment: string
  seatDirection: SeatDirection
  weather: Weather
  signText: string
  treeDensity: TreeDensity
  pedestrianStatus: PedestrianStatus
  note: string
}

/** 一次完整行程：同线路、同座位方向且采样间隔不超过 20 分钟的记录归并而成 */
export interface Trip {
  id: string
  routeName: string
  seatDirection: SeatDirection
  /** 行程内记录，按时间正序排列 */
  scenes: WindowScene[]
  /** 行程开始时间（首条记录 ISO） */
  startTime: string
  /** 行程结束时间（末条记录 ISO） */
  endTime: string
  /** 由非雨转为雨的记录 id 集合：记录保留，标记为换景点 */
  weatherShiftSceneIds: string[]
}

/** 保存记录后相对行程的归属结果，用于提示 */
export interface SaveOutcome {
  isNewTrip: boolean
  weatherShift: boolean
}
