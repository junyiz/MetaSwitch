// https://developer.chrome.com/docs/extensions/reference/api/proxy

import { useEffect, useState } from 'react'
import { parse } from 'jsonc-parser'
import { debounce } from 'lodash'
import { Button, Form, Input, InputNumber, Modal, Radio, Select, Space, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import Editor, { loader, useMonaco } from '@monaco-editor/react'
import { DEFAULT_RULE, FindProxyForURL } from './consts'
import { Mode, ModeType } from './types'

import './styles.less'
import { json2pac } from "./utils"

// Manifest V3 不允许使用那些允许远程执行代码的应用
// 详见 https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn
// min 文件从 npm 包中提取，版本是 monaco-editor@0.43.0
loader.config({ paths: { vs: '/lib/monaco-editor/min/vs' } })

const initialModes: Mode[] = [{ name: 'direct', type: 0 }, { name: 'system', type: 1 }]

export default function XProxy() {
  const [modalForm] = Form.useForm()
  const [proxyForm] = Form.useForm()
  const monaco = useMonaco()
  const [currMode, setCurrMode] = useState<string>() 
  const [modes, setModes] = useState<Mode[]>(() => {
    if (localStorage.getItem('modes')) {
      return JSON.parse(localStorage.getItem('modes') || '[]')
    }
    return initialModes
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState<Mode>()
  const [switchRule, setSwitchRule] = useState<string>()

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

  useEffect(() => {
    if (editMode?.type === 2 && editMode?.rules?.singleProxy) {
      proxyForm.setFieldValue('singleProxy', editMode.rules.singleProxy)
    }
  }, [editMode, proxyForm])

  useEffect(() => {
    // https://microsoft.github.io/monaco-editor/typedoc/modules/languages.json.html
    monaco?.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      schemas: [],
      trailingCommas: 'ignore',
    })
  }, [monaco])

  function handleEditorDidMount() {
    const elem = document.querySelector('.editor')?.parentElement
    if (elem) {
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { clientWidth, clientHeight } = entry.target
          if (clientHeight > 0 && clientWidth > 0) {
            localStorage.setItem('width', clientWidth + 'px')
            localStorage.setItem('height', clientHeight + 'px')
          }
        }
      })
      ro.observe(elem)
    }
  }


  function handleEditMode(m: Mode) {
    setEditMode(m)
    localStorage.setItem('editMode', m.name)
  }

  function handleClose(mode: string) {
    const newModes: Mode[] = modes.filter((m) => m.name !== mode)
    setModes(newModes)
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

  function handleSubmit(values: { name: string; type: string; }) {
    console.log('Received values of form: ', values)
    if (modes.find((m) => m.name === values.name)) {
      message.error(`named ${values.name} already exists`)
      return
    }
    if (values.type === '2') {
      const newModes: Mode[] = [...modes, {
        name: values.name,
        type: Number(values.type) as ModeType,
        rules: {
          singleProxy: {
            scheme: 'SOCKS5',
            host: '127.0.0.1',
            port: 13659,
          },
          bypassList: [],
        }
      }]
      setModes(newModes)
      localStorage.setItem('editMode', values.name)
      localStorage.setItem('modes', JSON.stringify(newModes))
    }
    if (values.type === '3') {
      const newModes: Mode[] = [...modes, { name: values.name, type: Number(values.type) as ModeType, pacScript: { data: '', mandatory: true } }]
      setModes(newModes)
      localStorage.setItem('editMode', values.name)
      localStorage.setItem('modes', JSON.stringify(newModes))
    }
    setModalOpen(false)
  }

  function handleProxyChange(value?: Mode) {
    console.log('value', value)
    if (!value) return

    if (value.type === 2) {
      chrome.runtime.sendMessage({
        mode: 'fixed_servers',
        rules: value.rules
      }, () => {
        localStorage.setItem('mode', value.name)
        setCurrMode(value.name)
        console.log('success')
      })
      return
    }

    if (value.type === 3) {
      chrome.runtime.sendMessage({
        mode: 'pac_script',
        pacScript: {
          data: value.pacScript?.data || FindProxyForURL,
          mandatory: value.pacScript?.mandatory
        }
      }, () => {
        console.log('success')
        setCurrMode(value.name)
        localStorage.setItem('mode', value.name)
      })
      return
    }

    chrome.runtime.sendMessage({
      mode: value.name,
    }, () => {
      localStorage.setItem('mode', value.name)
      setCurrMode(value.name)
      console.log('success')
    })
  }

  function handlePacChange(v?: string) {
    if (currMode === editMode?.name) {
      handlePacScript(v)
      handleProxyChange(JSON.parse(localStorage.getItem('modes') as string).find((m: Mode) => m.name === editMode?.name))
    }
    setSwitchRule(v)
  }

  function handleProxyRule(values: { singleProxy: { scheme: string; host: string; port: number } }) {
    const newModes = modes.map((mode) => {
      if (mode.name === editMode?.name) {
        mode.rules = values
      }
      return mode
    })
    setModes(newModes)
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

  function handlePacScript(v?: string) {
    const s = v || switchRule
    if (!s) return
    console.log('-)', s)
    const json = parse(s)
    const pac = json2pac(json)
    const newModes = modes.map((mode) => {
      if (mode.name === editMode?.name) {
        mode.pacScript = {
          data: pac,
          mandatory: true
        }
      }
      return mode
    })
    setModes(newModes)
    localStorage.setItem('json', s)
    localStorage.setItem('modes', JSON.stringify(newModes))
  }

  return (
    <div>
      <div className="mode">
        {'Proxy Mode: '}
        {modes.map((mode) => (
          <Tag.CheckableTag checked={mode.name === currMode} onClick={() => handleProxyChange(mode)}>{mode.name}</Tag.CheckableTag>
        ))}
      </div>
      <div className="profiles">
        {'Proxy Profiles: '}
        {modes.filter((m) => m.type > 1).map((mode) => (
          <Tag.CheckableTag checked={mode.name === editMode?.name} onClick={() => handleEditMode(mode)}>{mode.name}</Tag.CheckableTag>
        ))}
        <Tag className="new" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New profile</Tag>
      </div>

      <Modal title="New Profile" open={modalOpen} onOk={() => modalForm.submit()} onCancel={() => setModalOpen(false)}>
        <Form
          form={modalForm}
          layout="vertical"
          autoComplete="off"
          onFinish={handleSubmit}
        >
          <Form.Item name="name" label="Profile Name" required rules={[{ required: true, message: 'missing profile name' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Profile Type" required rules={[{ required: true, message: 'missing profile type' }]}>
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="2">Proxy Profile</Radio>
                <Radio value="3">Switch Profile</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      {editMode?.type === 2 && (
        <Form
          className="form"
          form={proxyForm}
          onFinish={handleProxyRule}
          autoComplete="off"
          initialValues={editMode.rules}
        >
          <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
            <Form.Item
              name={['singleProxy', 'scheme']}
              rules={[{ required: true, message: 'missing protocol' }]}
            >
              <Select options={[{ value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' }, { value: 'socks5', label: 'SOCKS5' }]} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item
              name={['singleProxy', 'host']}
              rules={[{ required: true, message: 'missing host' }]}
            >
              <Input placeholder="host" />
            </Form.Item>
            <Form.Item
              name={['singleProxy', 'port']}
              rules={[{ required: true, message: 'missing port' }]}
            >
              <InputNumber placeholder="port" style={{ width: 120 }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">Submit</Button>
                <Button onClick={() => handleClose(editMode?.name)}>Delete</Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      )}

      {editMode?.type === 3 && (<>
        <Editor
          className="editor"
          language="json"
          options={{ minimap: { enabled: false } }}
          defaultValue={localStorage.getItem('json') || JSON.stringify(DEFAULT_RULE, null, 2)}
          onChange={debounce(handlePacChange, 300)}
          onMount={handleEditorDidMount}
          wrapperProps={{
            style: {
              display: 'flex',
              position: 'relative',
              textAlign: 'initial',
              width: localStorage.getItem('width') || '100%',
              height: localStorage.getItem('height') || '50vh',
              border: '1px solid #e2e2e2',
              marginBottom: '10px',
              resize: 'both',
              overflow: 'scroll',
            }
          }}
        />
        <Space>
          <Button type="primary" onClick={() => handlePacScript()}>Submit</Button>
          <Button onClick={() => handleClose(editMode?.name)}>Delete</Button>
        </Space>
      </>)}
    </div>
  )
}
