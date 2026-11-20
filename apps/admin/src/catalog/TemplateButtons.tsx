import { useState } from 'react'
import { downloadCsvTemplate, downloadExcelTemplate } from './files'

export function TemplateButtons() {
  const [busy, setBusy] = useState(false)
  return (
    <div className="row">
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await downloadExcelTemplate()
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Hazırlanıyor…' : 'Excel şablonunu indir'}
      </button>
      <button type="button" className="secondary" onClick={downloadCsvTemplate}>
        CSV şablonunu indir
      </button>
    </div>
  )
}
