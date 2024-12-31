import { useEffect, useCallback } from 'react'
import { Form, Input, InputNumber, Select, Space } from 'antd'
import { Mode, ModeRules } from '../types'
import './styles.less'

export default function ModeEditor({ modes, editMode, onChange }: {
  modes: Mode[]
  editMode: Mode
  onChange: (modes: Mode[]) => void
}) {
  const [form] = Form.useForm()

  const initialValues = useCallback(() => {
    if (!editMode?.rules) return {}
    const { fallbackProxy, bypassList } = editMode.rules
    return {
      fallbackProxy,
      bypassList: bypassList?.toString().replace(/,/g, '\n')
    }
  }, [editMode])

  useEffect(() => {
    if (editMode?.type === 2) {
      form.setFieldsValue(initialValues())
    }
  }, [editMode, form, initialValues])
  
  function onValuesChange(_changedValues: unknown, allValues: ModeRules) {
    const newModes = modes.map((mode) => {
      if (mode.name.toLowerCase() === editMode?.name.toLowerCase()) {
        const { fallbackProxy, bypassList } = allValues
        mode.rules = {
          fallbackProxy,
          bypassList: bypassList?.toString().split('\n')
        }
      }
      return mode
    })
    onChange(newModes)
  }

  return (
    <Form
      className="mode-editor-form"
      form={form}
      onValuesChange={onValuesChange}
      autoComplete="off"
      initialValues={initialValues()}
      layout="vertical"
    >
      <Form.Item label="代理服务器" style={{ marginBottom: 0 }}>
        <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
          <Form.Item
            name={['fallbackProxy', 'scheme']}
            rules={[{ required: true, message: 'missing protocol' }]}
          >
            <Select options={[{ value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' }, { value: 'socks5', label: 'SOCKS5' }]} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item
            name={['fallbackProxy', 'host']}
            rules={[{ required: true, message: 'missing host' }]}
          >
            <Input placeholder="host" />
          </Form.Item>
          <Form.Item
            name={['fallbackProxy', 'port']}
            rules={[{ required: true, message: 'missing port' }]}
          >
            <InputNumber placeholder="port" style={{ width: 150 }} />
          </Form.Item>
        </Space>
      </Form.Item>
      <Form.Item name="bypassList" label="不代理的地址列表" extra={
        <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>
          不经过代理服务器的主机列表, 每行一个主机, 可使用通配符等匹配规则，详见 <a href="developer.chrome.com/docs/extensions/reference/api/proxy?#proxy_rules" target="_blank">Google 文档</a> 
        </div>
      }>
        <Input.TextArea rows={5} />
      </Form.Item>
    </Form>
  )
}