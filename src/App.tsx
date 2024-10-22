// https://developer.chrome.com/docs/extensions/reference/api/proxy

import { useEffect, useState } from 'react'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { DeleteOutlined, EditOutlined, ExportOutlined, FullscreenOutlined, ImportOutlined, EllipsisOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { DEFAULT_RULE } from '@/consts'
import { Mode } from './types'

import ModeEditor from './components/ModeEditor'
import MonacoEditor from './components/MonacoEditor'
import AddModeModal from './components/AddModeModal'
import './App.less'

const initialModes: Mode[] = [{ name: 'direct', type: 0, 'desc': '直接连接' }, { name: 'system', type: 1, desc: '系统代理' }]

export default function XProxy() {
  const [currMode, setCurrMode] = useState<string>() 
  const [modes, setModes] = useState<Mode[]>(() => {
    if (localStorage.getItem('modes')) {
      return JSON.parse(localStorage.getItem('modes') || '[]')
    }
    return initialModes
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState<Mode>()

  useEffect(() => {
    if (localStorage.getItem('mode')) {
      setCurrMode(localStorage.getItem('mode') || '')
    } else {
      chrome.proxy.settings.get(
        {'incognito': false},
        function(config) {
          console.log(config)
          setCurrMode(config.value.mode)
        }
      )
    }
    if (modes.length > 0) {
      if (localStorage.getItem('editMode')) {
        setEditMode(modes.find((m) => m.name === localStorage.getItem('editMode')))
      } else {
        setEditMode(modes[2])
      }
    }
  }, [modes])

  // function updateProxy() {
  //   const modeName = localStorage.getItem('mode')
  //   const newMode = modes.find((m) => m.name === modeName)
  //   handleProxyChange(newMode)
  // }

  // useEffect(() => {
  //   document.addEventListener('visibilitychange', () => {
  //     if (document.visibilityState === 'visible') {
  //       updateProxy()
  //     }
  //   })
  // }, [])

  function handleEditMode(e: React.MouseEvent<HTMLSpanElement>, m: Mode) {
    e.stopPropagation()
    setEditMode(m)
    localStorage.setItem('editMode', m.name)
  }

  function handleDelete(mode: string) {
    const newModes: Mode[] = modes.filter((m) => m.name !== mode)
    setModes(newModes)
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

  function handleProxyChange(value?: Mode) {
    if (!value) return

    if (value.type === 2) {
      // 使用固定的代理服务器
      chrome.runtime.sendMessage({
        mode: 'fixed_servers',
        rules: value.rules
      }, () => {
        localStorage.setItem('mode', value.name)
        setCurrMode(value.name)
      })
      return
    }

    if (value.type === 3) {
      // 使用 PAC 脚本自动切换代理服务器
      chrome.runtime.sendMessage({
        mode: 'pac_script',
        pacScript: {
          data: value.pacScript?.data || 'function FindProxyForURL(url, host) {return "DIRECT";}',
          mandatory: value.pacScript?.mandatory
        }
      }, () => {
        setCurrMode(value.name)
        localStorage.setItem('mode', value.name)
      })
      return
    }

    // 直连或系统代理
    chrome.runtime.sendMessage({
      mode: value.name,
    }, () => {
      localStorage.setItem('mode', value.name)
      setCurrMode(value.name)
    })
  }

  function handleModeChange(newModes: Mode[]) {
    setModes(newModes)
    if (editMode?.name === currMode) {
      handleProxyChange(newModes.find((m: Mode) => m.name === editMode?.name))
    }
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

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
        <div className="title">MetaSwitch</div>
        <div className="action">
          {location.pathname.includes('/popup.html') && <a className="fullscreen" href="./index.html" target="_blank" title="Expand to full tab"><FullscreenOutlined /></a>}
          <Dropdown menu={{ items }} trigger={['click']}>
            <EllipsisOutlined className="ellipsis" />
          </Dropdown>
        </div>
      </div>
      <div className="mode">
        {modes.map((mode) => (
          <div onClick={() => handleProxyChange(mode)} className={`mode-item${mode.name === currMode ? ' mode-item-active' : ''}${editMode?.name === mode.name ? ' mode-item-edit' : ''}`}>
            <div className="mode-item-name">
              {mode.name}
            </div>
            <div className="mode-item-desc">
              {mode.desc}
            </div>
            {mode.type > 1 && <div className="mode-item-action">
              <div>
                <EditOutlined style={{fontSize: '14px' }} onClick={(event) => handleEditMode(event, mode)} />
              </div>
              <div>
                <DeleteOutlined style={{fontSize: '14px' }} onClick={() => handleDelete(mode.name)} />
              </div>
            </div>}
          </div>
        ))}
        <div className="mode-item mode-item-new" onClick={() => setModalOpen(true)}><PlusOutlined /></div>
      </div>
      <div className="edit-mode">
        <EditOutlined style={{fontSize: '14px', marginRight: 10 }} />
        {editMode?.name}
      </div>
      {editMode?.type === 2 && <ModeEditor modes={modes} editMode={editMode} onChange={handleModeChange} />}
      {editMode?.type === 3 && <MonacoEditor value={localStorage.getItem('json') || JSON.stringify(DEFAULT_RULE, null, 2)} modes={modes} editMode={editMode} onChange={handleModeChange} />}
      <AddModeModal modalOpen={modalOpen} modes={modes} setModalOpen={setModalOpen} onChange={handleModeChange} />
    </>
  )
}
