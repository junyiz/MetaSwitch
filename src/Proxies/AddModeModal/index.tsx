import { Form, Input, Modal, Radio, Space, message } from 'antd'
import { parse } from 'jsonc-parser'
import { json2pac } from '../utils'
import { Mode, ModeType } from '../types'
import { DEFAULT_FIXED_SERVER_RULES, DEFAULT_RULE } from '../consts'

export default function AddModeModal({ modes, modalOpen, setModalOpen, onChange }: {
  modes: Mode[]
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  onChange: (modes: Mode[]) => void
}) {
  const [form] = Form.useForm()

  function handleSubmit(values: { name: string; type: string; }) {
    console.log('Received values of form: ', values)
    const name = values.name.trim().toLowerCase()
    if (modes.find((m) => m.name.toLowerCase() === name)) {
      message.error(`named ${name} already exists`)
      return
    }
    if (values.type === '2') {
      const newModes: Mode[] = [...modes, {
        name,
        desc: '固定代理',
        type: Number(values.type) as ModeType,
        rules: DEFAULT_FIXED_SERVER_RULES
      }]
      localStorage.setItem('editMode', name)
      onChange(newModes)
    }
    if (values.type === '3') {
      const newModes: Mode[] = [...modes, {
        name,
        desc: 'PAC 脚本',
        type: Number(values.type) as ModeType,
        pacScript: {
          data: json2pac(parse(DEFAULT_RULE)),
          mandatory: true
        }
      }]
      localStorage.setItem('editMode', name)
      onChange(newModes)
    }
    setModalOpen(false)
    form.resetFields()
  }

  return (
    <Modal title="New Profile" open={modalOpen} onOk={() => form.submit()} onCancel={() => setModalOpen(false)}>
      <Form
        form={form}
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
  )
}
