import { useMemo, useState } from 'react'
import { importProducts, listProducts, productErrorMessage } from './api'
import { readProductFile } from './files'
import { formatGrams, formatPrice, PRODUCT_SPECIES_LABEL } from './model'
import { buildPreview, rowsToImport, type Preview, type PreviewRow } from './rows'
import { TemplateButtons } from './TemplateButtons'

type Props = { onDone: () => void; onOpenGuide: () => void }

const STATUS_LABEL: Record<PreviewRow['status'], string> = {
  new: 'Yeni ürün',
  update: 'Güncellenecek',
  error: 'Hatalı',
}

export function ImportPage({ onDone, onOpenGuide }: Props) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [reading, setReading] = useState(false)
  const [onlyProblems, setOnlyProblems] = useState(false)
  const [confirmUpdates, setConfirmUpdates] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null)
  const [inputKey, setInputKey] = useState(0)

  function reset() {
    setFileName(null)
    setFileError(null)
    setUnknownHeaders([])
    setPreview(null)
    setConfirmUpdates(false)
    setImportError(null)
    setResult(null)
    setInputKey((k) => k + 1)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    reset()
    setFileName(file.name)
    setReading(true)
    try {
      const read = await readProductFile(file)
      if (!read.ok) {
        setFileError(read.error)
        return
      }
      setUnknownHeaders(read.unknownHeaders)
      const existing = await listProducts()
      setPreview(buildPreview(read.rows, existing))
    } catch (e) {
      setFileError(productErrorMessage(e))
    } finally {
      setReading(false)
    }
  }

  const rows = useMemo(() => {
    if (!preview) return []
    return onlyProblems
      ? preview.rows.filter((r) => r.status === 'error' || r.warnings.length > 0)
      : preview.rows
  }, [preview, onlyProblems])

  const toImport = preview ? rowsToImport(preview) : []
  const hasErrors = (preview?.counts.error ?? 0) > 0
  const needsConfirm = (preview?.counts.update ?? 0) > 0
  const canImport = !!preview && !hasErrors && toImport.length > 0 && (!needsConfirm || confirmUpdates)

  async function handleImport() {
    if (!canImport) return
    setImporting(true)
    setImportError(null)
    try {
      setResult(await importProducts(toImport))
      setPreview(null)
    } catch (e) {
      setImportError(`${productErrorMessage(e)} Hiçbir satır kaydedilmedi.`)
    } finally {
      setImporting(false)
    }
  }

  if (result) {
    return (
      <div className="card">
        <h1>Yükleme tamamlandı</h1>
        <p className="status status-ok">
          {result.inserted} yeni ürün eklendi, {result.updated} ürün güncellendi.
        </p>
        <p className="muted">Ürün görsellerini katalogda ürünü “Düzenle” ile açarak ekleyebilirsiniz.</p>
        <div className="row">
          <button type="button" onClick={onDone}>Kataloğa git</button>
          <button type="button" className="secondary" onClick={reset}>Başka dosya yükle</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <h1>Dosyadan toplu yükleme</h1>
      <ol className="steps">
        <li>
          Şablonu indirin ve her paket boyutu için bir satır doldurun.{' '}
          <button type="button" className="link-button" onClick={onOpenGuide}>Sütunlar ne anlama geliyor?</button>
          <TemplateButtons />
        </li>
        <li>
          Doldurduğunuz dosyayı seçin (Excel .xlsx veya CSV). Dosya hemen kaydedilmez; önce önizleme gösterilir.
          <div>
            <input key={inputKey} type="file" accept=".xlsx,.csv" onChange={(e) => handleFile(e.target.files?.[0])} aria-label="Ürün dosyası seç" />
          </div>
        </li>
        <li>Önizlemeyi kontrol edin. Hatalı satır varsa dosyayı düzeltip yeniden seçin. Hata kalmayınca “İçe aktar” düğmesi açılır.</li>
      </ol>

      {reading ? <p className="muted">“{fileName}” okunuyor…</p> : null}
      {fileError ? <p className="status status-error" role="alert">{fileError}</p> : null}

      {preview ? (
        <section>
          <h2>Önizleme: {fileName}</h2>
          {unknownHeaders.length > 0 ? (
            <p className="status">Şu sütunlar tanınmadı ve yok sayılacak: {unknownHeaders.join(', ')}</p>
          ) : null}
          <div className="summary">
            <span><strong>{preview.counts.total}</strong> satır</span>
            <span className="badge ok">{preview.counts.new} yeni</span>
            <span className="badge warn">{preview.counts.update} güncellenecek</span>
            {preview.counts.unchanged ? <span className="badge">{preview.counts.unchanged} değişiklik yok</span> : null}
            <span className={hasErrors ? 'badge err' : 'badge'}>{preview.counts.error} hatalı</span>
          </div>

          {hasErrors ? (
            <p className="status status-error" role="alert">
              {preview.counts.error} satırda hata var. Dosyayı Excel’de açıp aşağıda belirtilen satırları düzeltin, kaydedin ve yeniden seçin.
              Hatalı satır varken hiçbir ürün içe aktarılmaz.
            </p>
          ) : null}

          <label className="checkbox">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            Yalnızca hatalı ve uyarılı satırları göster
          </label>

          <div className="table-wrap">
            <table className="table preview">
              <thead>
                <tr>
                  <th className="num">Satır</th>
                  <th>Durum</th>
                  <th>Marka</th>
                  <th>Ürün adı</th>
                  <th>Tür</th>
                  <th className="num">Paket</th>
                  <th className="num">Fiyat</th>
                  <th>Barkod / kod</th>
                  <th>Açıklama</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={`row-${r.status}`}>
                    <td className="num">{r.rowNumber}</td>
                    <td><span className={r.status === 'error' ? 'badge err' : r.status === 'update' ? 'badge warn' : 'badge ok'}>{STATUS_LABEL[r.status]}</span></td>
                    <td>{r.product?.brand ?? r.raw.brand}</td>
                    <td>{r.product?.name ?? r.raw.name}</td>
                    <td>{r.product ? PRODUCT_SPECIES_LABEL[r.product.species] : r.raw.species}</td>
                    <td className="num">{r.product ? formatGrams(r.product.package_grams) : r.raw.package_grams}</td>
                    <td className="num">{r.product ? formatPrice(r.product.price_try) : r.raw.price_try}</td>
                    <td className="mono">{r.product?.code ?? r.raw.code}</td>
                    <td className="notes">
                      {r.errors.map((e) => <div key={e} className="field-error">✗ {e}</div>)}
                      {r.warnings.map((w) => <div key={w} className="warn-text">! {w}</div>)}
                      {r.changes.length > 0 ? (
                        <ul className="changes">
                          {r.changes.map((c) => (
                            <li key={c.field}>
                              {c.field}: <s>{c.before || '(boş)'}</s> → <strong>{c.after || '(boş)'}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!hasErrors && needsConfirm ? (
            <label className="checkbox confirm">
              <input type="checkbox" checked={confirmUpdates} onChange={(e) => setConfirmUpdates(e.target.checked)} />
              Katalogda zaten kayıtlı {preview.counts.update} ürünün yukarıda gösterilen yeni bilgilerle güncellenmesini onaylıyorum.
            </label>
          ) : null}

          {importError ? <p className="status status-error" role="alert">{importError}</p> : null}

          <div className="row">
            <button type="button" disabled={!canImport || importing} onClick={handleImport}>
              {importing
                ? 'Aktarılıyor…'
                : `İçe aktar (${preview.counts.new} yeni${preview.counts.update ? `, ${preview.counts.update} güncelleme` : ''})`}
            </button>
            <button type="button" className="secondary" onClick={reset}>Vazgeç</button>
          </div>
          {!hasErrors && toImport.length === 0 ? <p className="muted">Dosyada eklenecek veya değişecek ürün yok.</p> : null}
        </section>
      ) : null}
    </>
  )
}
