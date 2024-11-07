import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import { ExportOutlined, FullscreenOutlined, ImportOutlined, EllipsisOutlined } from '@ant-design/icons'

import Proxies from './Prox/index'
import './App.less'


export default function App() {
  const onExport = () => {
    const a = document.createElement('a')
    const json = Object.keys(localStorage).reduce((pre: Record<string, string | null>, key) => {
      if (!key.startsWith('APLUS')) {
        pre[key] = localStorage.getItem(key)
      }
      return pre
    }, {})
    a.href = `data:,${JSON.stringify(json, null, 2)}`
    a.download = `xuanniao-${dayjs().format('YYYY-MM-DD')}.json`
    a.click()
  }

  const onImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = (e) => {
          const json = JSON.parse(e.target?.result as string)
          Object.keys(json).forEach((key) => {
            if (!key.startsWith('APLUS')) {
              localStorage.setItem(key, json[key])
            }
          })
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
