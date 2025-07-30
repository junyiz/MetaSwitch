// https://developer.chrome.com/docs/extensions/reference/api/proxy

import { useEffect, useState } from 'react'
import { message, Modal } from 'antd'
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
import { Mode, ModeRules, AddModeFormValues, ModeType } from './types'
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

// 直连或系统代理
function updateDefaultProxy(value: Mode) {
  chrome.runtime.sendMessage(
    {
      mode: value.name,
    },
    () => {
      if (value.name === 'direct') {
        message.destroy()
        message.success('启用直连')
      } else {
        message.destroy()
        message.success('启用系统代理')
      }
    }
  )
}

export default function Proxies() {
  const [modes, setModes] = useState<Mode[]>(() => {
    if (localStorage.getItem('modes')) {
      return JSON.parse(localStorage.getItem('modes') || '[]')
    }
    return initialModes
  })
  const [editMode, setEditMode] = useState<Mode | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const m = modes.find((m) => m.isEditing)
    if (m) {
      setEditMode(m)
    }
  }, [modes])

  function handleEditMode(m: Mode) {
    setModes((prevModes) => {
      const nextModes = prevModes.map((mode) => {
        if (mode.name === m.name) {
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
    for (const m of modes) {
      if (m.type === 3) {
        const json = parse(m.json || DEFAULT_RULE)
        if (json[mode.name]) {
          Modal.confirm({
            content: `自动切换模式 ${m.name} 依赖 ${mode.name}，是否删除？`,
            onOk() {
              setModes(prevModes => {
                const newModes: Mode[] = prevModes.filter((m) => m.name !== mode.name)
                localStorage.setItem('modes', JSON.stringify(newModes))
                return newModes
              })
            }
          })
          return
        }
      }
    }
    setModes(prevModes => {
      const newModes: Mode[] = prevModes.filter((m) => m.name !== mode.name)
      localStorage.setItem('modes', JSON.stringify(newModes))
      return newModes
    })
  }

  function handleProxyChange({
    value,
    isSwitch,
  }: {
    value?: Mode
    isSwitch?: boolean
  }) {
    if (!value) return

    setModes(prevModes => {
      const nextModes = prevModes.map((m) =>
        m.name === value.name
          ? { ...m, enabled: true }
          : { ...m, enabled: false }
      )
      if (value.type === 2) {
        updateFixedProxy(value)
        return nextModes
      }

      if (value.type === 3) {
        updatePacScript(value, isSwitch || false, nextModes)
        return nextModes
      }

      updateDefaultProxy(value)

      localStorage.setItem("modes", JSON.stringify(nextModes))

      return nextModes
    })

  }

  function handleModeChange(name: string, rules: ModeRules) {
    setModes(prevModes => {
      const nextModes = prevModes.map((m) =>
        m.name === name
          ? { ...m, rules }
          : { ...m }
      )
      for (const m of nextModes) {
        if (m.enabled && m.name === name) {
          updateFixedProxy(m)
          break
        }
        if (m.enabled && m.type === 3) {
          updatePacScript(m, false, nextModes)
          break
        }
      }

      localStorage.setItem("modes", JSON.stringify(nextModes))

      return nextModes
    })
  }

  function handleAddMode(values: AddModeFormValues) {
    const name = values.name.trim()
    if (values.type === '2') {
      const mode = {
        name,
        desc: '固定代理',
        type: Number(values.type) as ModeType,
        rules: DEFAULT_FIXED_SERVER_RULES,
        enabled: false,
        isEditing: true,
      }
      setModes(prevModes => {
        const nextModes = [...prevModes.map((m) => {
          if (m.isEditing) {
            return { ...m, isEditing: false }
          }
          return m
        }), mode]

        for (const m of modes) {
          if (m.enabled && m.type === 3) {
            const json = parse(m.json || DEFAULT_RULE)
            // PAC 脚本依赖
            if (json[name]) {
              updatePacScript(m, false, nextModes)
              break
            }
          }
        }

        localStorage.setItem('modes', JSON.stringify(nextModes))

        return nextModes
      })
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
        isEditing: true,
      }
      setModes(prevModes => {
        const nextModes = [...prevModes.map((m) => {
          if (m.isEditing) {
            return { ...m, isEditing: false }
          }
          return m
        }), mode]

        localStorage.setItem('modes', JSON.stringify(nextModes))

        return nextModes
      })
    }
  }

  function handleMonacoChange(name: string, json: string) {
    setModes(prevModes => {
      const nextModes = prevModes.map((m) =>
        m.name === name
          ? { ...m, json }
          : { ...m }
      )
      for (const m of nextModes) {
        if (m.enabled && m.name === name) {
          updatePacScript(m, false, nextModes)
          break
        }
      }

      localStorage.setItem('modes', JSON.stringify(nextModes))

      return nextModes
    })
  }
  
  return (
    <>
      <div className="mode">
        {modes.map((mode) => (
          <div
            className={`mode-item${mode.enabled ? " enabled" : ""}`}
            key={mode.name}
          >
            <div
              className="mode-item-name"
              onClick={() => handleProxyChange({ value: mode, isSwitch: true })}
            >
              {mode.name}
            </div>
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
                    style={mode.isEditing ? { color: "#1890ff" } : {}}
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
      {editMode?.type === 2 && (
        <ModeEditor
          value={editMode.rules || DEFAULT_FIXED_SERVER_RULES}
          onChange={debounce((rules) => handleModeChange(editMode.name, rules), 300)}
        />
      )}
      {editMode?.type === 3 && (
        <MonacoEditor
          value={editMode.json || DEFAULT_RULE}
          onChange={debounce((json) => handleMonacoChange(editMode.name, json), 300)}
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
