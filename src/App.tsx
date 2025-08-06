import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { ExportOutlined, FullscreenOutlined, ImportOutlined, EllipsisOutlined } from '@ant-design/icons'

import Proxies from './Proxies/index'
import './App.less'

export const strToBase64 = function (str: string) {
  const bytes = new TextEncoder().encode(str)
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return window.btoa(binString)
}

export const base64ToStr = function (base64: string) {
  const binString = window.atob(base64)
  const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0) as number)
  const decoder = new TextDecoder()
  return decoder.decode(bytes)
}

export default function App() {
  const onExport = () => {
    const a = document.createElement('a')
    const modes = localStorage.getItem('modes') as string
    a.href = `data:,${strToBase64(modes)}`
    a.download = `MetaSwitch-${dayjs().format('YYYY-MM-DD')}.txt`
    a.click()
  }

  const onImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = (e) => {
          const modes = e.target?.result as string
          console.log(modes)
          localStorage.setItem('modes', base64ToStr(modes))
          location.reload()
        }
      }
    }
    input.click()
  }

  const items: MenuProps['items'] = [
    {
      label: <a onClick={onExport}><ExportOutlined /> Export Config</a>,
      key: '0',
    },
    {
      label: <a onClick={onImport}><ImportOutlined /> Import Config</a>,
      key: '1',
    },
  ]

  return (
    <>
      <div className="head">
        <div className="title">Proxy MetaSwitch</div>
        <div className="action">
          {location.pathname.includes('/popup.html') && <a className="fullscreen" href="./index.html" target="_blank" title="Expand to full tab"><FullscreenOutlined /></a>}
          <Dropdown menu={{ items }} trigger={['click']}>
            <EllipsisOutlined className="ellipsis" />
          </Dropdown>
        </div>
      </div>
      <Proxies />
    </>
  )
}
