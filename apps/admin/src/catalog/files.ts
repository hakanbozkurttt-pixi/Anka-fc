// Şablon indirme ve yüklenen dosyayı okuma (Excel .xlsx ve CSV).
import Papa from 'papaparse'

import { BRANDS } from './model.ts'
import { COLUMNS, EXAMPLE_MARKER, matchHeaders, type RawRow } from './rows.ts'

export type ReadResult =
  | { ok: true; rows: RawRow[]; unknownHeaders: string[] }
  | { ok: false; error: string }

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const exampleRow = COLUMNS.map((c) => c.example)

// ---------------------------------------------------------------------
// Şablonlar
// ---------------------------------------------------------------------

/** Excel şablonu: "Ürünler" ve "Açıklamalar" sayfaları, açılır listeler. */
export async function downloadExcelTemplate() {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()

  const sheet = wb.addWorksheet('Ürünler', { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = COLUMNS.map((c) => ({
    header: c.required ? c.header : c.header,
    key: c.key,
    width: Math.max(14, c.header.length + 4, c.key === 'name' ? 40 : 0),
  }))
  const header = sheet.getRow(1)
  header.font = { bold: true }
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.required ? 'FFFDE68A' : 'FFE5E7EB' } }
    cell.note = `${c.required ? 'ZORUNLU. ' : 'İsteğe bağlı. '}${c.help}`
  })

  const ex = sheet.addRow(exampleRow)
  ex.font = { italic: true, color: { argb: 'FFB42318' } }

  // Barkod sütunu metin olsun (uzun barkodlar bilimsel gösterime dönmesin).
  const codeCol = COLUMNS.findIndex((c) => c.key === 'code') + 1
  sheet.getColumn(codeCol).numFmt = '@'

  const colLetter = (key: string) => String.fromCharCode(64 + COLUMNS.findIndex((c) => c.key === key) + 1)
  const list = (key: string, values: string[], message: string) => {
    for (let r = 2; r <= 2000; r++) {
      sheet.getCell(`${colLetter(key)}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${values.join(',')}"`],
        showErrorMessage: true,
        errorTitle: 'Geçersiz değer',
        error: message,
      }
    }
  }
  list('brand', [...BRANDS], "Proplan, Hill's, Royal Canin, Virbac veya Carni seçin.")
  list('species', ['Kedi', 'Köpek', 'Her ikisi'], 'Kedi, Köpek veya Her ikisi seçin.')
  list('is_active', ['Evet', 'Hayır'], 'Evet veya Hayır seçin.')

  const help = wb.addWorksheet('Açıklamalar')
  help.columns = [
    { header: 'Sütun', key: 'header', width: 26 },
    { header: 'Zorunlu mu?', key: 'required', width: 14 },
    { header: 'Ne yazılmalı?', key: 'help', width: 90 },
  ]
  help.getRow(1).font = { bold: true }
  for (const c of COLUMNS) help.addRow({ header: c.header, required: c.required ? 'Evet' : 'Hayır', help: c.help })
  help.addRow({})
  for (const line of [
    'Her paket boyutu ayrı bir satırdır: aynı mamanın 1,5 kg ve 3 kg paketleri iki ayrı satır olarak yazılır.',
    `Kırmızı yazılı örnek satır ("${EXAMPLE_MARKER}") yalnızca yol göstermek içindir; dosyayı yüklemeden önce silin.`,
    'Stok adedi ve günlük tüketim miktarı bu dosyaya yazılmaz.',
    'Ürün görselleri dosyayla yüklenmez; yüklemeden sonra panelde ürünü düzenleyerek eklenir.',
    'Dosyayı Excel (.xlsx) olarak kaydedip panelde "Toplu yükleme" sekmesinden yükleyin.',
  ]) {
    help.addRow({ header: line })
  }

  const buffer = await wb.xlsx.writeBuffer()
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'urun-katalogu-sablonu.xlsx',
  )
}

/** CSV şablonu: Türkçe Excel'de doğru açılması için noktalı virgül ve UTF-8 BOM. */
export function downloadCsvTemplate() {
  const csv = Papa.unparse([COLUMNS.map((c) => c.header), exampleRow], { delimiter: ';' })
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'urun-katalogu-sablonu.csv')
}

// ---------------------------------------------------------------------
// Dosya okuma
// ---------------------------------------------------------------------

function toRawRows(matrix: unknown[][]): ReadResult {
  const headerIndex = matrix.findIndex((r) => r.some((v) => String(v ?? '').trim() !== ''))
  if (headerIndex === -1) return { ok: false, error: 'Dosya boş.' }
  const headers = matrix[headerIndex].map((v) => String(v ?? ''))
  const { map, missing, unknown } = matchHeaders(headers)
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Dosyada şu zorunlu sütunlar bulunamadı: ${missing.join(', ')}. Lütfen paneldeki şablonu kullanın ve ilk satırdaki sütun başlıklarını değiştirmeyin.`,
    }
  }
  const rows: RawRow[] = []
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const cells: RawRow['cells'] = {}
    map.forEach((key, col) => {
      const v = matrix[i][col]
      cells[key] = v === undefined ? null : (v as string | number | null)
    })
    rows.push({ rowNumber: i + 1, cells })
  }
  if (rows.length === 0) return { ok: false, error: 'Dosyada başlık satırından sonra ürün satırı yok.' }
  return { ok: true, rows, unknownHeaders: unknown }
}

function cellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const v = value as { result?: unknown; text?: unknown; richText?: { text: string }[] }
    if (v.richText) return v.richText.map((t) => t.text).join('')
    if (v.result !== undefined) return cellValue(v.result)
    if (v.text !== undefined) return cellValue(v.text)
  }
  return String(value)
}

async function readExcel(file: File): Promise<ReadResult> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(await file.arrayBuffer())
  } catch {
    return { ok: false, error: 'Excel dosyası açılamadı. Dosyanın .xlsx biçiminde kaydedildiğinden emin olun.' }
  }
  const sheet = wb.getWorksheet('Ürünler') ?? wb.worksheets[0]
  if (!sheet) return { ok: false, error: 'Excel dosyasında sayfa bulunamadı.' }
  const matrix: unknown[][] = []
  sheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values: unknown[] = []
    for (let c = 1; c <= Math.max(row.cellCount, COLUMNS.length + 5); c++) values.push(cellValue(row.getCell(c).value))
    matrix[rowNumber - 1] = values
  })
  for (let i = 0; i < matrix.length; i++) matrix[i] ??= []
  return toRawRows(matrix)
}

async function readCsv(file: File): Promise<ReadResult> {
  const content = (await file.text()).replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: false })
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { ok: false, error: 'CSV dosyası okunamadı.' }
  }
  return toRawRows(parsed.data)
}

export async function readProductFile(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase()
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: 'Dosya 10 MB’tan büyük olamaz.' }
  if (name.endsWith('.xlsx')) return readExcel(file)
  if (name.endsWith('.csv') || name.endsWith('.txt')) return readCsv(file)
  if (name.endsWith('.xls'))
    return { ok: false, error: 'Eski Excel biçimi (.xls) desteklenmiyor. Dosyayı Excel’de “Farklı Kaydet → Excel Çalışma Kitabı (.xlsx)” ile kaydedip tekrar deneyin.' }
  return { ok: false, error: 'Yalnızca Excel (.xlsx) veya CSV (.csv) dosyası yüklenebilir.' }
}
