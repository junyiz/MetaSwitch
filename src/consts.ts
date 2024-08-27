export const DEFAULT_RULE = {
  "direct": [],
  "system": [],
  "asocks": [
    "google.com"
  ]
}

export const DEFAULT_FIXED_SERVER_RULES = {
  fallbackProxy: {
    scheme: 'socks5',
    host: '127.0.0.1',
    port: 13659,
  },
  bypassList: [
    '127.0.0.1',
    '::1',
    'localhost'
  ],
}