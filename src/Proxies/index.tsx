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
    isEditing: true, // 默认编辑状态
  },
  {
    name: 'fixedProxy',
    type: 2,
    desc: '固定代理',
    rules: DEFAULT_FIXED_SERVER_RULES,
    enabled: false,
    isEditing: false, 
  },
  { name: 'autoSwitch', type: 3, desc: 'PAC 脚本', enabled: false, isEditing: false },
]

export default function Proxies() {
  const [modes, setModes] = useState<Mode[]>(() => {
    if (localStorage.getItem('modes')) {
      return JSON.parse(localStorage.getItem('modes') || '[]')
    }
    return initialModes
  })
  const [modalOpen, setModalOpen] = useState(false)

  function handleEditMode(m: Mode) {
    setModes((prevModes) => {
      const nextModes = prevModes.map((mode) => {
        if (mode.name.toLowerCase() === m.name.toLowerCase()) {
          return { ...mode, isEditing: true }
        }
        return { ...mode, isEditing: false }
      })
      localStorage.setItem('modes', JSON.stringify(nextModes))
      return nextModes
    })
  }

  function handleDelete(mode: Mode) {
    if (mode.enabled) {
      message.error('不能删除正在使用的代理模式')
      return
    }
    // TODO fixedProxy 被 autoSwitch 依赖，不能删除
    const newModes: Mode[] = modes.filter(
      (m) => m.name.toLowerCase() !== mode.name.toLowerCase()
    )
    setModes(newModes)
    localStorage.setItem('modes', JSON.stringify(newModes))
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
    const json = value.json || DEFAULT_RULE
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

    const nextModes = modes.map((m) =>
      m.name.toLowerCase() === value.name.toLowerCase()
        ? { ...m, enabled: true }
        : { ...m, enabled: false }
    )
    localStorage.setItem("modes", JSON.stringify(nextModes))
    setModes(nextModes)

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

  function handleModeChange(editMode: Mode) {
    const nextModes = modes.map((m) =>
      m.name.toLowerCase() === editMode.name.toLowerCase()
        ? { ...editMode }
        : { ...m }
    )
    localStorage.setItem("modes", JSON.stringify(nextModes))
    setModes(nextModes)
    if (editMode.enabled) {
      updateFixedProxy(editMode)
      return
    }
    for (const m of modes) {
      if (m.enabled && m.type === 3) {
        updatePacScript(m, false, nextModes)
        break
      }
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
      const nextModes = [...modes, mode]
      localStorage.setItem('modes', JSON.stringify(nextModes))
      setModes(nextModes)
      for (const m of modes) {
        if (m.enabled && m.type === 3) {
          // PAC 脚本可能依赖此新增 fixedProxy，故更新
          updatePacScript(m, false, nextModes)
          break
        }
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
      const nextModes = [...modes, mode]
      localStorage.setItem('modes', JSON.stringify(nextModes))
      setModes(nextModes)
      handleEditMode(mode)
    }
  }

  function handleMonacoChange(editMode: Mode) {
    const nextModes = modes.map((m) =>
      m.name.toLowerCase() === editMode.name.toLowerCase()
        ? { ...editMode }
        : { ...m }
    )
    localStorage.setItem('modes', JSON.stringify(nextModes))
    setModes(nextModes)
    if (editMode.enabled) {
      updatePacScript(editMode, false, modes)
    }
  }

  function renderEditor() {
    const editMode = modes.find((m) => m.isEditing)
    if (!editMode) return null
    if (editMode.type === 2) {
      return (
        <ModeEditor
          editMode={editMode}
          onChange={debounce(handleModeChange, 300)}
        />
      )
    }
    if (editMode.type === 3) {
      return (
        <MonacoEditor
          value={editMode.json || DEFAULT_RULE}
          onChange={debounce((json) => handleMonacoChange({ ...editMode, json }), 300)}
        />
      )
    }
  }
  
  return (
    <>
      <div className="mode">
        {modes.map((mode) => (
          <div className={`mode-item${mode.enabled ? " enabled" : ""}`} key={mode.name}>
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
                    style={ mode.isEditing ? { color: "#1890ff" } : {} }
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
      {renderEditor()}
      <AddModeModal
        modalOpen={modalOpen}
        modes={modes}
        setModalOpen={setModalOpen}
        onChange={debounce(handleAddMode, 300)}
      />
    </>
  );
}
