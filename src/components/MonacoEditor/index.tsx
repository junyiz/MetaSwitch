import { useEffect } from 'react'
import Editor, { loader, useMonaco } from '@monaco-editor/react'
import { debounce } from 'lodash'
import { parse } from 'jsonc-parser'
import { DEFAULT_RULE } from '@/consts'
import { json2pac } from '@/utils'
import { Mode } from '@/types'

// Manifest V3 不允许使用那些允许远程执行代码的应用
// 详见 https://developer.chrome.com/docs/extensions/develop/migrate/improve-security?hl=zh-cn
// min 文件从 npm 包中提取，版本是 monaco-editor@0.43.0
loader.config({ paths: { vs: '/lib/monaco-editor/vs' } })

export default function MonacoEditor({ modes, editMode, onChange }: {
  modes: Mode[]
  editMode: Mode
  onChange: (modes: Mode[]) => void
}) {
  const monaco = useMonaco()

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

  function handlePacScript(s?: string) {
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
  }

  return (
    <Editor
      className="editor"
      language="json"
      options={{ minimap: { enabled: false } }}
      defaultValue={localStorage.getItem('json') || JSON.stringify(DEFAULT_RULE, null, 2)}
      onChange={debounce(handlePacScript, 300)}
      onMount={handleEditorDidMount}
      wrapperProps={{
        style: {
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
        }
      }}
    />
  )
}