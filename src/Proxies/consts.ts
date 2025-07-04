export const DEFAULT_RULE = `{
  // 不使用代理，直接链接
  "direct": [],

  // 使用系统代理
  "system": [],
  
  // 自定义代理，比如 whistle
  "whistle": [
    "local.dev"
  ],
  
  // 自定义代理，比如 v2ray
  "fixedProxy": [
    // "google.com"
  ],
}`

export const DEFAULT_FIXED_SERVER_RULES = {
  fallbackProxy: {
    scheme: 'http', // 注意小写，见 https://developer.chrome.com/docs/extensions/reference/api/proxy?hl=zh-cn
    host: '127.0.0.1',
    port: 8899,
  },
  bypassList: [
    '127.0.0.1',
    '::1',
    'localhost'
  ],
}