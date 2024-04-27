export type ModeType = 0 | 1 | 2 | 3 // 0: direct, 1: system, 2: proxy, 3: switch

export interface Mode {
  name: string
  type: ModeType
  pacScript?: {
    data: string
    mandatory: boolean
  }
  rules?: {
    singleProxy: {
      scheme: string
      host: string
      port: number
    },
    bypassList?: string[]
  }
}
