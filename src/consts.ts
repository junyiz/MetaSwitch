// https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file
export const FindProxyForURL = 'function FindProxyForURL(url, host) {"RULE";return "DIRECT";}'

export const DEFAULT_RULE = {
  "direct": [],
  "system": [],
  "asocks": [
    "google.com"
  ]
}
