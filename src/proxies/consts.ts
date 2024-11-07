export const DEFAULT_RULE = `{
  // 不使用代理，直接链接
  "direct": [],

  // 使用系统代理
  "system": [],
  
  // 自定义代理，比如 v2ray
  "v2ray": [
    "google.com"
  ]
}`

export const DEFAULT_FIXED_SERVER_RULES = {
  fallbackProxy: {
    scheme: 'socks5',
    host: '127.0.0.1',
    port: 1080,
  },
  bypassList: [
    '127.0.0.1',
    '::1',
    'localhost'
  ],
}