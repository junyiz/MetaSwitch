export type ModeType = 0 | 1 | 2 | 3 // 0: direct, 1: system, 2: proxy, 3: switch

export interface Mode {
  name: string
  desc: string
  type: ModeType
  json?: string
  pacScript?: {
    data: string
    mandatory: boolean
  }
  rules?: ModeRules
  enabled: boolean // 是否启用
  isEditing?: boolean // 是否正在编辑
}

export interface ModeRules {
  fallbackProxy: {
    scheme: string
    host: string
    port: number
  },
  bypassList?: string[]
}


export interface AddModeFormValues {
  name: string;
  type: string;
}