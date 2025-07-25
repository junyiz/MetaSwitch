import { useEffect, useState } from 'react'
import { debounce } from 'lodash'
import './styles.less'

const require = (window as any).require
require.config({ paths: { 'vs': 'lib/monaco-editor/vs' }})

export default function MonacoEditor({ value, onChange }: {
  value: string
  onChange: (json: string) => void
}) {
  const [rect, setRect] = useState<{ width: string, height: string }>( {
    width: localStorage.getItem('width') || '100%',
    height: localStorage.getItem('height') || '50vh'
  })

  useEffect(() => {
    require(['vs/editor/editor.main'], () => {
      // 创建编辑器
      const monaco = (window as any).monaco;
      const elem = document.querySelector('.editor')
      const editor = monaco.editor.create(elem, {
        value,
        language: 'json', 
        theme: 'vs', // 主题
        minimap: { enabled: false }
      })

      // https://microsoft.github.io/monaco-editor/typedoc/modules/languages.json.html
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
        schemas: [],
        trailingCommas: 'ignore',
      })

      // 监测编辑器内容变化
      editor.onDidChangeModelContent(debounce(() => {
        const json = editor.getValue()
        if (json) onChange(json)
      }, 300))

      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { clientWidth, clientHeight } = entry.target
          if (clientHeight > 0 && clientWidth > 0) {
            localStorage.setItem('width', clientWidth + 'px')
            localStorage.setItem('height', clientHeight + 'px')
            setRect({ width: clientWidth + 'px', height: clientHeight + 'px' })
            editor.layout()
          }
        }
      })
      ro.observe(elem as Element)
    })
  }, [])

  return (
    <div className="pac-editor">
      <div className="title">自动切换规则(<a href="https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file" target="_blank">PAC 脚本</a>)</div>
      <div
        className="editor"
        style={{
          display: 'flex',
          position: 'relative',
          textAlign: 'initial',
          width: rect.width,
          height: rect.height,
          minWidth: '670px',
          minHeight: '300px',
          border: '1px solid #e2e2e2',
          marginBottom: '10px',
          resize: 'both',
          overflow: 'scroll',
      }} />
    </div>
  )
}
