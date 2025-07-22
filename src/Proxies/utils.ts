import { Mode } from './types'

export const getStorage = async (key: string) => {
  return new Promise((resolve) => chrome.storage.sync.get(key, resolve))
}

const reg = (exp: string[], ret: string) => {
  const array = `[${exp.map(it => `'${it}'`).join(',')}]`
  const condition = `${array}.some(it => !!host.match(new RegExp(it)))`
  return `
if(${condition}){
    return '${ret}';
  }`
}

const getProxy = (name: string, modes: Mode[]) =>  {
  for (const m of modes) {
    // name 不区分大小写
    if (m.name.toLowerCase() === name.toLowerCase() && m.rules) {
      const { scheme, host, port } = m.rules.fallbackProxy
      return `${scheme === 'socks5' ? 'SOCKS5' : 'PROXY'} ${host}:${port}`
    }
  }
}

export const json2pac = (json: Record<string, string[]>, modes: Mode[]) => {
  let str = ''

  for (const key in json) {
    switch(key) {
      case 'direct':
        if (json[key]?.length) str += reg(json[key], 'DIRECT')
        break
      case 'system':
        if (json[key]?.length) str += reg(json[key], 'SYSTEM')
        break
      default:
        if (json[key]?.length) {
          const proxy = getProxy(key, modes)
          if (proxy) {
            str += reg(json[key], proxy)
          } else {
            console.log('Not find custom proxy config for', key)
          }
        }
    }
  }

  // https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file
  const pacStr = `function FindProxyForURL(url, host) {${str}
  return "DIRECT";
}`
  console.log(pacStr)
  return pacStr
}
