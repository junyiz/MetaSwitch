import { Mode } from './types'

export const getStorage = async (key: string) => {
  return new Promise((resolve) => chrome.storage.sync.get(key, resolve))
}

const reg = (exp: string[], ret: string) => {
  const array = `[${exp.map(it => `'${it}'`).join(',')}]`
  const condition = `${array}.some(it => !!host.match(new RegExp(it)))`
  return `if (${condition}) { return '${ret}'; }`
}

const getProxy = (name: string) =>  {
  const modes: Mode[] = JSON.parse(localStorage.getItem('modes') || '[]')

  for (const m of modes) {
    if (m.name === name && m.rules) {
      const { scheme, host, port } = m.rules.fallbackProxy
      return `${scheme === 'socks5' ? 'SOCKS5' : 'PROXY'} ${host}:${port}`
    }
  }
}

export const json2pac = (json: Record<string, string[]>) => {
  let str = ''

  for (const key in json) {
    switch(key) {
      case 'direct':
        if (json[key]?.length) str += reg(json[key], 'DIRECT') + '\n'
        break
      case 'system':
        if (json[key]?.length) str += reg(json[key], 'SYSTEM') + '\n'
        break
      default:
        if (json[key]?.length) {
          const proxy = getProxy(key)
          if (proxy) {
            str += reg(json[key], proxy) + '\n'
          } else {
            console.warn('not find custom proxy config')
          }
        }
    }
  }

  // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file
  return `function FindProxyForURL(url, host) {${str} return "DIRECT";}`
}
