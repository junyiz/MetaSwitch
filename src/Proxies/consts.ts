export const DEFAULT_RULE = `{
  // 注意和上面的模式名称一致
  // 见 https://developer.chrome.com/docs/extensions/reference/api/proxy#type-Rules

  // 不使用代理，直接链接
  "direct": [],

  // 使用系统代理，代理配置从操作系统中获取
  "system": [],
  
  // 自定义代理，比如本机开发常用的 whistle
  // 当启用自动切换（switch profile）模式时，如下方括号里的域名，将走代理 whistle 
  // 域名支持正则表达时，正则表达式用法见 https://junyiz.github.io/regexp/index.html
  "whistle": [
    "local.dev",
    "^local.dev", // 这就是正则表达式，这仅会匹配 local.dev，不会匹配 pre-local.dev 
  ],
  
  // 自定义代理，比如科学上网常用的 v2ray
  // 当启用自动切换（switch profile）模式时，如下方括号里的域名，将走代理 fixedProxy 
  // 域名支持正则表达时，正则表达式用法见 https://junyiz.github.io/regexp/index.html
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