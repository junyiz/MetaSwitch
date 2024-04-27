import { FindProxyForURL } from './consts'
import { Mode } from './types'

export const getStorage = async (key: string) => {
  return new Promise((resolve) => chrome.storage.sync.get(key, resolve))
}

const reg = (exp: string[], ret: string) => {
  const rule: string[] = []

  exp.forEach(it => {
    rule.push(`new RegExp('${it}').test(host)`)
  })

  return `if (${rule.join('||')}) return '${ret}';`
}

const getProxy = (name: string) =>  {
  const modes: Mode[] = JSON.parse(localStorage.getItem('modes') || '[]')
  console.log(modes)

  for (const m of modes) {
    if (m.name === name && m.rules) {
      const { scheme, host, port } = m.rules.singleProxy
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

  return FindProxyForURL.replace('"RULE";', str)
}
