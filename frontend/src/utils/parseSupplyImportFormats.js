import { parseSupplyCsv } from './parseSupplyCsv'

const EXCEL_EXTENSIONS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb', 'ods'])

export function normalizeImportRows(rows) {
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

export function rowsLookLikeBinaryGarbage(rows) {
  const sample = (rows || [])
    .slice(0, 20)
    .flat()
    .map((c) => String(c ?? ''))
    .join('')
  if (sample.length < 40) return false
  const nonPrintable = sample.replace(/[\x09\x0a\x0d\x20-\x7e\u00a0-\u024f]/g, '').length
  return nonPrintable / sample.length > 0.25
}

export function isPdfBuffer(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 5) return false
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}

export function shouldTrySpreadsheet(file, ext, buffer) {
  if (EXCEL_EXTENSIONS.has(ext)) return true
  const mime = String(file.type || '').toLowerCase()
  if (/spreadsheet|excel|ms-excel|opendocument/i.test(mime)) return true
  // Legacy .xls OLE — not generic ZIP (docx is also ZIP)
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return true
  }
  return false
}

export function looksLikeJson(text) {
  const t = String(text || '').trim()
  return t.startsWith('[') || t.startsWith('{')
}

export function looksLikeHtml(text, ext) {
  if (['html', 'htm', 'xhtml'].includes(ext)) return true
  const t = String(text || '').trimStart().slice(0, 2000).toLowerCase()
  return t.includes('<table') || t.includes('<html') || t.includes('<!doctype html')
}

export function shouldTryDocx(file, ext) {
  if (ext === 'docx') return true
  const mime = String(file.type || '').toLowerCase()
  return /wordprocessingml|msword/i.test(mime)
}

function clusterTextRowIntoCells(row, gapThreshold = 10) {
  if (!row.length) return []
  const cells = []
  let parts = [row[0].str]
  let lastEnd = row[0].x + (row[0].width || row[0].str.length * 4)

  for (let i = 1; i < row.length; i += 1) {
    const item = row[i]
    if (item.x - lastEnd > gapThreshold) {
      cells.push(parts.join(' ').replace(/\s+/g, ' ').trim())
      parts = [item.str]
    } else {
      parts.push(item.str)
    }
    lastEnd = item.x + (item.width || item.str.length * 4)
  }
  cells.push(parts.join(' ').replace(/\s+/g, ' ').trim())
  return cells
}

function groupPdfTextIntoRows(items, yTolerance = 4) {
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lineGroups = []
  let group = []
  let groupY = null

  for (const item of sorted) {
    if (groupY === null || Math.abs(item.y - groupY) <= yTolerance) {
      group.push(item)
      groupY = groupY === null ? item.y : (groupY + item.y) / 2
    } else {
      lineGroups.push(group)
      group = [item]
      groupY = item.y
    }
  }
  if (group.length) lineGroups.push(group)

  return lineGroups.map((line) => {
    line.sort((a, b) => a.x - b.x)
    return clusterTextRowIntoCells(line)
  })
}

export async function parseSpreadsheetBuffer(buffer, fileName) {
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

  let best = null
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const rows = normalizeImportRows(
      XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
    )
    if (!rows.length) continue
    if (!best || rows.length > best.rows.length) {
      best = {
        rows,
        warnings: [`Imported from spreadsheet sheet "${sheetName}" in ${fileName || 'file'}.`],
        error: null,
      }
    }
  }

  return best || { rows: [], warnings: [], error: 'Spreadsheet has no data rows on any sheet.' }
}

export async function parsePdfBuffer(buffer, fileName) {
  const pdfjs = await import('pdfjs-dist')
  const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default

  let pdf
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
  } catch (err) {
    return {
      rows: [],
      warnings: [],
      error: `Could not read PDF: ${err?.message || 'invalid or encrypted file'}`,
    }
  }

  const allRows = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const items = content.items
      .map((item) => ({
        str: String(item.str || '').trim(),
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
      }))
      .filter((item) => item.str)
    allRows.push(...groupPdfTextIntoRows(items))
  }

  const rows = normalizeImportRows(allRows)
  if (!rows.length) {
    return {
      rows: [],
      warnings: [],
      error: 'PDF has no extractable text. Try exporting Excel or CSV from your accounting app instead.',
    }
  }

  return {
    rows,
    warnings: [
      `Imported from PDF text layout in ${fileName || 'file'}. Column boundaries are estimated — review mapping and preview carefully.`,
    ],
    error: null,
  }
}

function collectDocxCellText(cellEl) {
  const texts = []
  const walker = cellEl.getElementsByTagName('*')
  for (const node of walker) {
    if (node.localName === 't' && node.textContent) texts.push(node.textContent)
  }
  return texts.join(' ').replace(/\s+/g, ' ').trim()
}

export async function parseDocxBuffer(buffer, fileName) {
  const JSZip = (await import('jszip')).default
  let zip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch (err) {
    return { rows: [], warnings: [], error: `Could not read Word file: ${err?.message || 'invalid zip'}` }
  }

  const docXml = await zip.file('word/document.xml')?.async('text')
  if (!docXml) {
    return { rows: [], warnings: [], error: 'Word file has no document body.' }
  }

  const doc = new DOMParser().parseFromString(docXml, 'application/xml')
  const tables = [...doc.getElementsByTagName('*')].filter((el) => el.localName === 'tbl')
  if (!tables.length) {
    const paragraphs = [...doc.getElementsByTagName('*')]
      .filter((el) => el.localName === 't')
      .map((el) => el.textContent?.trim())
      .filter(Boolean)
    if (!paragraphs.length) {
      return { rows: [], warnings: [], error: 'Word file has no tables or readable text.' }
    }
    const rows = normalizeImportRows(paragraphs.map((line) => line.split(/\t+| {2,}/)))
    return {
      rows,
      warnings: [`Imported paragraph text from ${fileName || 'Word file'}.`],
      error: null,
    }
  }

  let bestRows = []
  for (const table of tables) {
    const tableRows = []
    for (const tr of [...table.getElementsByTagName('*')].filter((el) => el.localName === 'tr')) {
      const cells = [...tr.getElementsByTagName('*')]
        .filter((el) => el.localName === 'tc')
        .map((tc) => collectDocxCellText(tc))
      if (cells.some((c) => c)) tableRows.push(cells)
    }
    if (tableRows.length > bestRows.length) bestRows = tableRows
  }

  const rows = normalizeImportRows(bestRows)
  if (!rows.length) {
    return { rows: [], warnings: [], error: 'Word tables are empty.' }
  }

  return {
    rows,
    warnings: [`Imported table from ${fileName || 'Word file'}.`],
    error: null,
  }
}

export function parseHtmlText(text, fileName) {
  const doc = new DOMParser().parseFromString(String(text), 'text/html')
  const tables = [...doc.querySelectorAll('table')]
  if (!tables.length) {
    return { rows: [], warnings: [], error: 'HTML file has no tables.' }
  }

  let bestRows = []
  for (const table of tables) {
    const tableRows = []
    for (const tr of table.querySelectorAll('tr')) {
      const cells = [...tr.querySelectorAll('th, td')].map((cell) => cell.textContent.replace(/\s+/g, ' ').trim())
      if (cells.some((c) => c)) tableRows.push(cells)
    }
    if (tableRows.length > bestRows.length) bestRows = tableRows
  }

  const rows = normalizeImportRows(bestRows)
  if (!rows.length) {
    return { rows: [], warnings: [], error: 'HTML tables are empty.' }
  }

  return {
    rows,
    warnings: [`Imported HTML table from ${fileName || 'file'}.`],
    error: null,
  }
}

export function parseJsonText(text) {
  let data
  try {
    data = JSON.parse(String(text))
  } catch (err) {
    return { rows: [], warnings: [], error: `Invalid JSON: ${err?.message || 'parse error'}` }
  }

  let items = null
  if (Array.isArray(data)) items = data
  else if (data && typeof data === 'object') {
    items = data.items || data.rows || data.data || data.supplies || data.products || data.records
  }

  if (!Array.isArray(items) || !items.length) {
    return { rows: [], warnings: [], error: 'JSON must be an array or an object with items/rows/data/supplies.' }
  }

  if (typeof items[0] !== 'object' || items[0] === null) {
    const rows = normalizeImportRows(items.map((v) => [String(v ?? '')]))
    return { rows, warnings: ['Imported JSON list as single-column rows.'], error: null }
  }

  const keys = Object.keys(items[0])
  const rows = normalizeImportRows([keys, ...items.map((row) => keys.map((k) => String(row?.[k] ?? '')))])
  return {
    rows,
    warnings: [`Imported JSON objects (${items.length} row${items.length === 1 ? '' : 's'}).`],
    error: null,
  }
}

export function parsePlainTextLines(text) {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return { rows: [], warnings: [], error: null }
  }

  const tabLines = lines.filter((line) => line.includes('\t'))
  if (tabLines.length >= Math.max(2, lines.length * 0.5)) {
    return { rows: normalizeImportRows(lines.map((line) => line.split('\t'))), warnings: ['Parsed as tab-separated text.'], error: null }
  }

  const pipeLines = lines.filter((line) => line.includes('|'))
  if (pipeLines.length >= Math.max(2, lines.length * 0.5)) {
    return {
      rows: normalizeImportRows(lines.map((line) => line.split('|').map((c) => c.trim()))),
      warnings: ['Parsed as pipe-separated text.'],
      error: null,
    }
  }

  const commaLines = lines.filter((line) => line.includes(','))
  if (commaLines.length >= Math.max(2, lines.length * 0.5)) {
    return parseSupplyCsv(String(text))
  }

  const fixed = normalizeImportRows(lines.map((line) => line.split(/\s{2,}/)))
  if (fixed.length >= 2 && fixed.some((row) => row.length > 1)) {
    return { rows: fixed, warnings: ['Parsed as fixed-width / space-separated text.'], error: null }
  }

  return { rows: [], warnings: [], error: null }
}

export async function tryParseDelimitedText(text) {
  const result = parseSupplyCsv(text)
  if (result.rows.length) return result
  return parsePlainTextLines(text)
}
