import { useEffect } from 'react'
import { debounce } from 'lodash'
import { parse } from 'jsonc-parser'
import { json2pac } from '@/utils'
import { Mode } from '@/types'

const require = (window as any).require
require.config({ paths: { 'vs': 'lib/monaco-editor/vs' }})

export default function MonacoEditor({ value, modes, editMode, onChange }: {
  value: string
  modes: Mode[]
  editMode: Mode
  onChange: (modes: Mode[]) => void
}) {
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
        const s = editor.getValue()
        if (!s) return
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
        localStorage.setItem('json', s)
        onChange(newModes)
      }, 300))

      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { clientWidth, clientHeight } = entry.target
          if (clientHeight > 0 && clientWidth > 0) {
            localStorage.setItem('width', clientWidth + 'px')
            localStorage.setItem('height', clientHeight + 'px')
          }
        }
      })
      ro.observe(elem as Element)
    })
  }, [])

  return (
    <div
      className="editor"
      style={{
        display: 'flex',
        position: 'relative',
        textAlign: 'initial',
        width: localStorage.getItem('width') || '100%',
        maxWidth: '100vh',
        height: localStorage.getItem('height') || '50vh',
        border: '1px solid #e2e2e2',
        marginBottom: '10px',
        resize: 'both',
        overflow: 'scroll',
    }} />
  )
}
