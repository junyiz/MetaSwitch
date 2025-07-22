// https://developer.chrome.com/docs/extensions/reference/api/proxy

import { useEffect, useState } from 'react'
import { message } from 'antd'
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { parse } from 'jsonc-parser'
import { debounce } from 'lodash'
import { json2pac } from './utils'
import MonacoEditor from './MonacoEditor'
import AddModeModal from './AddModeModal'
import ModeEditor from './ModeEditor'
import { DEFAULT_RULE, DEFAULT_FIXED_SERVER_RULES } from './consts'
import { Mode, AddModeFormValues, ModeType } from './types'
import './styles.less'

const initialModes: Mode[] = [
  { name: 'direct', type: 0, desc: '直接连接', enabled: true },
  { name: 'system', type: 1, desc: '系统代理', enabled: false },
  {
    name: 'whistle',
    type: 2,
    desc: '固定代理',
    rules: DEFAULT_FIXED_SERVER_RULES,
    enabled: false,
  },
  {
    name: 'fixedProxy',
    type: 2,
    desc: '固定代理',
    rules: DEFAULT_FIXED_SERVER_RULES,
    enabled: false,
  },
  { name: 'autoSwitch', type: 3, desc: 'PAC 脚本', enabled: false },
]

export default function Proxies() {
  const [modes, setModes] = useState<Mode[]>(() => {
    if (localStorage.getItem('modes')) {
      return JSON.parse(localStorage.getItem('modes') || '[]')
    }
    return initialModes
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState<Mode>()

  useEffect(() => {
    if (modes.length > 0) {
      const storedEditMode = localStorage.getItem('editMode')
      if (storedEditMode) {
        setEditMode(
          modes.find((m) => m.name.toLowerCase() === storedEditMode)
        )
      } else {
        setEditMode(modes[2])
      }
    }
  }, [modes])

  function handleEditMode(m: Mode) {
    console.log('handleEditMode', m)
    setEditMode(m)
    localStorage.setItem('editMode', m.name.toLowerCase())
  }

  function handleDelete(mode: Mode) {
    if (mode.enabled) {
      message.error('不能删除正在使用的代理模式')
      return
    }
    const newModes: Mode[] = modes.filter(
      (m) => m.name.toLowerCase() !== mode.name.toLowerCase()
    )
    setModes(newModes)
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

  function updateModes(mode: Mode, modes: Mode[]) {
    const nextModes = modes.map((m) =>
      m.name.toLowerCase() === mode.name.toLowerCase()
        ? mode.type === 2
          ? { ...m, rules: mode.rules, enabled: true }
          : { ...m, enabled: true }
        : { ...m, enabled: false }
    )
    localStorage.setItem("modes", JSON.stringify(nextModes))
    setModes(nextModes)
    return nextModes
  }

  // 固定的代理服务器
  function updateFixedProxy(value: Mode) {
    chrome.runtime.sendMessage(
      {
        mode: 'fixed_servers',
        rules: value.rules,
      },
      () => {
        message.destroy()
        message.success(`启用固定代理 ${value.name}`)
      }
    )
  }

  // PAC 脚本自动切换代理服务器
  function updatePacScript(value: Mode, isSwitch: boolean, modes: Mode[]) {
    const json =
      localStorage.getItem(`${value.name.toLowerCase()}:json`) ||
      localStorage.getItem('json') ||
      DEFAULT_RULE
    chrome.runtime.sendMessage(
      {
        mode: 'pac_script',
        pacScript: {
          data: json2pac(parse(json), modes),
          mandatory: true,
        },
      },
      () => {
        message.destroy()
        if (isSwitch) {
          message.success(`启用自动切换模式 ${value.name}`)
        } else {
          message.success(`自动切换模式 ${value.name} 的规则已更新`)
        }
      }
    )
  }

  function handleProxyChange({
    value,
    isSwitch,
  }: {
    value?: Mode
    isSwitch?: boolean
  }) {
    if (!value) return

    const nextModes = updateModes(value, modes)

    if (value.type === 2) {
      updateFixedProxy(value)
      return
    }

    if (value.type === 3) {
      updatePacScript(value, isSwitch || false, nextModes)
      return
    }

    // 直连或系统代理
    chrome.runtime.sendMessage(
      {
        mode: value.name.toLowerCase(),
      },
      () => {
        if (value.name.toLowerCase() === 'direct') {
          message.destroy()
          message.success('启用直连')
        } else {
          message.destroy()
          message.success('启用系统代理')
        }
      }
    )
  }

  function handleModeChange(mode: Mode) {
    let flag = false
    for (const m of modes) {
      if (m.enabled && m.type === 3) {
        const nextModes = updateModes(mode, modes) 
        console.log('updatePacScript', m, nextModes)
        updatePacScript(m, false, nextModes)
        flag = true
        break
      }
    }

    if (mode.enabled) {
      updateModes(mode, modes)
      updateFixedProxy(mode)
    } else if (!flag) {
      updateModes(mode, modes)
    }
  }

  function handleAddMode(values: AddModeFormValues) {
    const name = values.name.trim().toLowerCase()
    if (values.type === '2') {
      const mode = {
        name,
        desc: '固定代理',
        type: Number(values.type) as ModeType,
        rules: DEFAULT_FIXED_SERVER_RULES,
        enabled: false,
      }
      let flag = false
      for (const m of modes) {
        if (m.enabled && m.type === 3) {
          const nextModes = updateModes(mode, [...modes, mode]) 
          updatePacScript(m, false, nextModes)
          flag = true
          break
        }
      }
      if (!flag) {
        updateModes(mode, [...modes, mode])
      }
      handleEditMode(mode)
    }
    if (values.type === '3') {
      const mode = {
        name,
        desc: 'PAC 脚本',
        type: Number(values.type) as ModeType,
        pacScript: {
          data: json2pac(parse(DEFAULT_RULE), modes),
          mandatory: true
        },
        enabled: false,
      }
      updateModes(mode, [...modes, mode])
      handleEditMode(mode)
    }
  }
  
  return (
    <>
      <div className="mode">
        {modes.map((mode) => (
          <div className="mode-item">
            <div className="mode-item-name">{mode.name}</div>
            <div className="mode-item-desc">{mode.desc}</div>
            <div className="mode-item-btns">
              <CheckOutlined
                style={mode.enabled ? { color: "#1890ff" } : {}}
                onClick={() =>
                  handleProxyChange({ value: mode, isSwitch: true })
                }
              />
              {mode.type > 1 && (
                <>
                  <EditOutlined
                    style={
                      mode.name.toLowerCase() === editMode?.name.toLowerCase()
                        ? { color: "#1890ff" }
                        : {}
                    }
                    onClick={() => handleEditMode(mode)}
                  />
                  <DeleteOutlined
                    onClick={() => handleDelete(mode)}
                    style={{ fontSize: "14px" }}
                  />
                </>
              )}
            </div>
          </div>
        ))}
        <div
          className="mode-item mode-item-new"
          onClick={() => setModalOpen(true)}
        >
          <PlusOutlined />
        </div>
      </div>
      <div className="edit-mode">
        <EditOutlined style={{ fontSize: "14px", marginRight: 10 }} />
        {editMode?.name}
      </div>
      {editMode?.type === 2 && (
        <ModeEditor
          editMode={editMode}
          onChange={debounce(handleModeChange, 300)}
        />
      )}
      {editMode?.type === 3 && (
        <MonacoEditor
          value={
            localStorage.getItem(`${editMode.name.toLowerCase()}:json`) ||
            DEFAULT_RULE
          }
          editMode={editMode}
          onChange={debounce((mode) => updatePacScript(mode, false, modes), 300)}
        />
      )}
      <AddModeModal
        modalOpen={modalOpen}
        modes={modes}
        setModalOpen={setModalOpen}
        onChange={debounce(handleAddMode, 300)}
      />
    </>
  );
}
