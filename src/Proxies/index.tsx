// https://developer.chrome.com/docs/extensions/reference/api/proxy

import { useEffect, useState } from 'react'
import { Dropdown, Switch } from 'antd'
import { DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { parse } from 'jsonc-parser'
import { json2pac } from './utils'
import MonacoEditor from './MonacoEditor'
import AddModeModal from './AddModeModal'
import ModeEditor from './ModeEditor'
import { DEFAULT_RULE, DEFAULT_FIXED_SERVER_RULES } from './consts'
import { Mode } from './types'
import './styles.less'

const initialModes: Mode[] = [
  { name: 'direct', type: 0, 'desc': '直接连接' },
  { name: 'system', type: 1, desc: '系统代理' },
  { name: 'fixed Proxy', type: 2, desc: '固定代理', rules: DEFAULT_FIXED_SERVER_RULES },
  { name: 'Auto Switch', type: 3, desc: 'PAC 脚本' },
]

export default function Proxies() {
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
      // 获取当前代理模式
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

  function handleEditMode(m: Mode) {
    setEditMode(m)
    localStorage.setItem('editMode', m.name)
  }

  function handleDelete(e: React.MouseEvent<HTMLAnchorElement>, mode: string) {
    e.stopPropagation()
    const newModes: Mode[] = modes.filter((m) => m.name !== mode)
    setModes(newModes)
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

  function handleRename(e: React.MouseEvent<HTMLAnchorElement>, mode: string) {
    e.stopPropagation()
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
          data: value.pacScript?.data || json2pac(parse(DEFAULT_RULE)),
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

  return (
    <>
      <div className="mode">
        {modes.map((mode) => (
          <div onClick={() => handleEditMode(mode)} className={`mode-item${mode.name === currMode ? ' mode-item-active' : ''}${editMode?.name === mode.name ? ' mode-item-edit' : ''}`}>
            <div className="mode-item-name" title={mode.name}>
              <span>{mode.name}</span>
              <Switch size="small" checked={mode.name === currMode} onChange={() => handleProxyChange(mode)} />
            </div>
            <div className="mode-item-desc">
              <span>{mode.desc}</span>
              {mode.type > 1 && (
                <Dropdown
                  menu={{ items: [
                      {
                        label: (<a onClick={(event) => handleRename(event, mode.name)}><EditOutlined style={{fontSize: '14px' }} /> rename</a>),
                        key: '0',
                      },
                      {
                        label: (<a onClick={(event) => handleDelete(event, mode.name)}><DeleteOutlined style={{fontSize: '14px' }} /> remove</a>),
                        key: '1',
                      },
                    ]
                  }}
                  trigger={['click']}
                >
                  <MoreOutlined style={{ fontSize: '14px' }} />
                </Dropdown>
              )}
            </div>
          </div>
        ))}
        <div className="mode-item mode-item-new" onClick={() => setModalOpen(true)}><PlusOutlined /></div>
      </div>
      <div className="edit-mode">
        <EditOutlined style={{fontSize: '14px', marginRight: 10 }} />
        {editMode?.name}
      </div>
      {editMode?.type === 2 && <ModeEditor modes={modes} editMode={editMode} onChange={handleModeChange} />}
      {editMode?.type === 3 && <MonacoEditor value={localStorage.getItem('json') || DEFAULT_RULE} modes={modes} editMode={editMode} onChange={handleModeChange} />}
      <AddModeModal modalOpen={modalOpen} modes={modes} setModalOpen={setModalOpen} onChange={handleModeChange} />
    </>
  )
}
