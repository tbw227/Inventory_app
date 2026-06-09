import { parseSupplyCsv } from './parseSupplyCsv'

/** File picker accept list — CSV/TSV/text + Excel/ODS spreadsheets. */
export const SUPPLY_IMPORT_ACCEPT =
  '.csv,.tsv,.txt,.tab,.xlsx,.xls,.xlsm,.xlsb,.ods,' +
  'text/csv,text/tab-separated-values,text/plain,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet'

const EXCEL_EXTENSIONS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'])

function fileExtension(name) {
  const match = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  return match ? match[1] : ''
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error || new Error('Could not read file'))
    reader.readAsArrayBuffer(file)
  })
}

function decodeBufferAsText(buffer) {
  const bytes = new Uint8Array(buffer)
  if (!bytes.length) return ''

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.slice(3))
  }

  const utf8 = new TextDecoder('utf-8').decode(bytes)
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length
  if (replacementCount < Math.max(2, utf8.length * 0.02)) return utf8

  try {
    return new TextDecoder('windows-1252').decode(bytes)
  } catch {
    return utf8
  }
}

function isSpreadsheetBinary(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 4) return false
  // ZIP (xlsx, xlsm, ods)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return true
  // OLE compound document (xls)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) return true
  return false
}

function shouldTrySpreadsheet(file, ext, buffer) {
  if (EXCEL_EXTENSIONS.has(ext)) return true
  const mime = String(file.type || '').toLowerCase()
  if (/spreadsheet|excel|ms-excel|opendocument/i.test(mime)) return true
  return isSpreadsheetBinary(buffer)
}

function normalizeSheetRows(rows) {
  return (rows || [])
    .map((row) => {
      if (!Array.isArray(row)) return []
      return row.map((cell) => {
        if (cell == null) return ''
        if (cell instanceof Date) return cell.toISOString().slice(0, 10)
        return String(cell).trim()
      })
    })
    .filter((row) => row.some((cell) => cell !== ''))
}

async function parseSpreadsheetBuffer(buffer, fileName) {
  const XLSX = await import('xlsx')
  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'array', raw: false, cellDates: true })
  } catch (err) {
    return {
      rows: [],
      warnings: [],
      error: `Could not read spreadsheet: ${err?.message || 'invalid or unsupported format'}`,
    }
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const rows = normalizeSheetRows(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }))
    if (rows.length) {
      return {
        rows,
        warnings: [`Imported from spreadsheet sheet "${sheetName}" in ${fileName || 'file'}.`],
        error: null,
      }
    }
  }

  return { rows: [], warnings: [], error: 'Spreadsheet has no data rows on any sheet.' }
}

/**
 * Parse a supply import file (CSV, TSV, TXT, Excel, ODS).
 * @returns {Promise<{ rows: string[][], warnings: string[], error: string | null }>}
 */
export async function parseSupplyImportFile(file) {
  if (!file) {
    return { rows: [], warnings: [], error: 'No file selected.' }
  }

  const buffer = await readFileAsArrayBuffer(file)
  if (!buffer || !buffer.byteLength) {
    return { rows: [], warnings: [], error: 'File is empty.' }
  }

  const ext = fileExtension(file.name)

  if (shouldTrySpreadsheet(file, ext, buffer)) {
    const sheetResult = await parseSpreadsheetBuffer(buffer, file.name)
    if (sheetResult.rows.length) return sheetResult
    if (sheetResult.error && EXCEL_EXTENSIONS.has(ext)) return sheetResult
  }

  const text = decodeBufferAsText(buffer)
  const textResult = parseSupplyCsv(text)
  if (textResult.rows.length) return textResult

  if (shouldTrySpreadsheet(file, ext, buffer)) {
    return parseSpreadsheetBuffer(buffer, file.name)
  }

  return (
    textResult.error
      ? textResult
      : {
          rows: [],
          warnings: [],
          error:
            'Could not parse file. Supported formats: CSV, TSV, TXT, Excel (.xlsx, .xls), and OpenDocument (.ods).',
        }
  )
}
