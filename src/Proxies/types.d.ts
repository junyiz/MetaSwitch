export type ModeType = 0 | 1 | 2 | 3 // 0: direct, 1: system, 2: proxy, 3: switch

export interface Mode {
  name: string
  desc: string
  type: ModeType
  pacScript?: {
    data: string
    mandatory: boolean
  }
  rules?: ModeRules
}

export interface ModeRules {
  fallbackProxy: {
    scheme: string
    host: string
    port: number
  },
  bypassList?: string[]
}
