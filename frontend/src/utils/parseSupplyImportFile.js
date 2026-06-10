import {
  isPdfBuffer,
  shouldTryDocx,
  looksLikeHtml,
  looksLikeJson,
  parseDocxBuffer,
  parseHtmlText,
  parseJsonText,
  parsePdfBuffer,
  parseSpreadsheetBuffer,
  rowsLookLikeBinaryGarbage,
  shouldTrySpreadsheet,
  tryParseDelimitedText,
} from './parseSupplyImportFormats'

/** Accept any file — parsers are tried by format sniffing. */
export const SUPPLY_IMPORT_ACCEPT = '*/*'

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

function acceptParseResult(result) {
  if (!result?.rows?.length) return null
  if (rowsLookLikeBinaryGarbage(result.rows)) return null
  return result
}

/**
 * Parse a supply import file — spreadsheets, PDF, Word, HTML, JSON, CSV/TSV/TXT, and plain text.
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
  const text = decodeBufferAsText(buffer)
  const warnings = []
  const errors = []

  /** @type {Array<() => Promise<{ rows: string[][], warnings?: string[], error?: string | null }>>} */
  const parsers = []

  if (looksLikeJson(text)) {
    parsers.push(async () => parseJsonText(text))
  }

  if (shouldTrySpreadsheet(file, ext, buffer)) {
    parsers.push(async () => parseSpreadsheetBuffer(buffer, file.name))
  }

  if (isPdfBuffer(buffer) || ext === 'pdf') {
    parsers.push(async () => parsePdfBuffer(buffer, file.name))
  }

  if (shouldTryDocx(file, ext)) {
    parsers.push(async () => parseDocxBuffer(buffer, file.name))
  }

  if (looksLikeHtml(text, ext)) {
    parsers.push(async () => parseHtmlText(text, file.name))
  }

  parsers.push(async () => tryParseDelimitedText(text))

  if (!shouldTrySpreadsheet(file, ext, buffer)) {
    parsers.push(async () => parseSpreadsheetBuffer(buffer, file.name))
  }

  if (!isPdfBuffer(buffer) && ext !== 'pdf') {
    parsers.push(async () => parsePdfBuffer(buffer, file.name))
  }

  for (const run of parsers) {
    try {
      const result = await run()
      if (result?.warnings?.length) warnings.push(...result.warnings)
      if (result?.error) errors.push(result.error)

      const accepted = acceptParseResult(result)
      if (accepted) {
        return {
          rows: accepted.rows,
          warnings: [...new Set([...warnings, ...(accepted.warnings || [])])],
          error: null,
        }
      }
    } catch (err) {
      errors.push(err?.message || 'Parser failed')
    }
  }

  const hint = errors.length ? errors[0] : 'No tabular data found in this file.'
  return {
    rows: [],
    warnings: [...new Set(warnings)],
    error: `${hint} Supported: Excel, CSV/TSV, PDF, Word (.docx), HTML, JSON, and plain text exports.`,
  }
}
