import { Form, Input, Modal, Radio, Space, message } from 'antd'
import { Mode, AddModeFormValues } from '../types'

export default function AddModeModal({ modes, modalOpen, setModalOpen, onChange }: {
  modes: Mode[]
  modalOpen: boolean
  setModalOpen: (modalOpen: boolean) => void
  onChange: (values: AddModeFormValues) => void
}) {
  const [form] = Form.useForm()

  function handleSubmit(values: AddModeFormValues) {
    const name = values.name.trim()
    if (modes.find((m) => m.name === name)) {
      message.error(`named ${name} already exists`)
      return
    }
    onChange(values)
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
