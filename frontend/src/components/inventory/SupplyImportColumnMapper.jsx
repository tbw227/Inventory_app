import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  assignColumnToField,
  fieldKeyForColumn,
  importFieldBadgeClass,
  SUPPLY_IMPORT_FIELDS,
} from '../../utils/supplyImportMapping'

const PREVIEW_DATA_ROWS = 8

export default function SupplyImportColumnMapper({
  parsedRows,
  hasHeader,
  columnMapping,
  onMappingChange,
  onHasHeaderChange,
  onAutoMap,
  onPreview,
  importBusy,
}) {
  const [openMenuCol, setOpenMenuCol] = useState(null)
  const menuRef = useRef(null)

  const maxCols = useMemo(() => {
    if (!parsedRows.length) return 0
    return Math.max(...parsedRows.map((r) => (r ? r.length : 0)), 0)
  }, [parsedRows])

  const headerLabels = useMemo(() => {
    if (!parsedRows.length) return []
    const first = parsedRows[0] || []
    return first.map((c, i) => (hasHeader ? String(c ?? '').trim() || `Column ${i + 1}` : `Column ${i + 1}`))
  }, [parsedRows, hasHeader])

  const previewRows = useMemo(() => {
    const start = hasHeader ? 1 : 0
    return parsedRows.slice(start, start + PREVIEW_DATA_ROWS)
  }, [parsedRows, hasHeader])

  const mappedSummary = useMemo(
    () =>
      SUPPLY_IMPORT_FIELDS.filter((f) => columnMapping[f.key] != null).map((f) => ({
        field: f,
        colIdx: columnMapping[f.key],
        header: headerLabels[columnMapping[f.key]] || `Column ${columnMapping[f.key] + 1}`,
      })),
    [columnMapping, headerLabels]
  )

  const nameMapped = columnMapping.name != null

  useEffect(() => {
    if (openMenuCol == null) return undefined
    function onPointerDown(e) {
      if (menuRef.current?.contains(e.target)) return
      setOpenMenuCol(null)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openMenuCol])

  function selectFieldForColumn(colIdx, fieldKey) {
    onMappingChange(assignColumnToField(columnMapping, colIdx, fieldKey))
    setOpenMenuCol(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => onHasHeaderChange(e.target.checked)}
          />
          First row is header
        </label>
        <button
          type="button"
          className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          onClick={onAutoMap}
        >
          Auto-map columns
        </button>
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          Click a column header below to assign it
        </span>
      </div>

      <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-64">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 sticky top-0 z-10">
              <tr>
                {Array.from({ length: maxCols }, (_, colIdx) => {
                  const fieldKey = fieldKeyForColumn(columnMapping, colIdx)
                  const field = SUPPLY_IMPORT_FIELDS.find((f) => f.key === fieldKey)
                  const isOpen = openMenuCol === colIdx
                  return (
                    <th key={colIdx} className="relative px-0 py-0 text-left align-top border-b border-gray-200 dark:border-slate-600 min-w-[7rem]">
                      <button
                        type="button"
                        onClick={() => setOpenMenuCol(isOpen ? null : colIdx)}
                        className={`w-full px-2 py-2 text-left transition-colors hover:bg-teal-50/80 dark:hover:bg-teal-950/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset ${
                          isOpen ? 'bg-teal-50 dark:bg-teal-950/40' : ''
                        }`}
                        aria-expanded={isOpen}
                        aria-haspopup="listbox"
                      >
                        <div className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[10rem]" title={headerLabels[colIdx]}>
                          {headerLabels[colIdx]}
                        </div>
                        {field ? (
                          <span
                            className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${importFieldBadgeClass(field.key)}`}
                          >
                            → {field.label}
                          </span>
                        ) : (
                          <span className="mt-1 inline-block text-[10px] text-gray-400 dark:text-gray-500">Click to map</span>
                        )}
                      </button>
                      {isOpen && (
                        <div
                          ref={menuRef}
                          role="listbox"
                          className="absolute left-0 top-full z-20 mt-0.5 min-w-[11rem] rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-lg py-1"
                        >
                          <button
                            type="button"
                            role="option"
                            aria-selected={!fieldKey}
                            className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-800 ${
                              !fieldKey ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                            }`}
                            onClick={() => selectFieldForColumn(colIdx, null)}
                          >
                            Skip column
                          </button>
                          {SUPPLY_IMPORT_FIELDS.map((f) => {
                            const takenElsewhere =
                              columnMapping[f.key] != null && columnMapping[f.key] !== colIdx
                            return (
                              <button
                                key={f.key}
                                type="button"
                                role="option"
                                aria-selected={fieldKey === f.key}
                                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-slate-800 ${
                                  fieldKey === f.key ? 'font-medium text-teal-800 dark:text-teal-200' : 'text-gray-700 dark:text-gray-200'
                                }`}
                                onClick={() => selectFieldForColumn(colIdx, f.key)}
                              >
                                {f.label}
                                {f.required ? ' *' : ''}
                                {takenElsewhere ? (
                                  <span className="block text-[10px] text-gray-400">moves from {headerLabels[columnMapping[f.key]]}</span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t border-gray-100 dark:border-slate-800 odd:bg-white even:bg-gray-50/50 dark:odd:bg-slate-950 dark:even:bg-slate-900/40">
                  {Array.from({ length: maxCols }, (_, colIdx) => {
                    const fieldKey = fieldKeyForColumn(columnMapping, colIdx)
                    return (
                      <td
                        key={colIdx}
                        className={`px-2 py-1.5 text-gray-700 dark:text-gray-300 truncate max-w-[10rem] ${fieldKey ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''}`}
                        title={String(row?.[colIdx] ?? '')}
                      >
                        {String(row?.[colIdx] ?? '').trim() || '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsedRows.length > previewRows.length + (hasHeader ? 1 : 0) && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 px-2 py-1 border-t border-gray-100 dark:border-slate-800">
            Showing first {previewRows.length} data row{previewRows.length === 1 ? '' : 's'} of{' '}
            {parsedRows.length - (hasHeader ? 1 : 0)}.
          </p>
        )}
      </div>

      {mappedSummary.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {mappedSummary.map(({ field, header }) => (
            <span
              key={field.key}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${importFieldBadgeClass(field.key)}`}
            >
              {field.label} ← {header}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-amber-700 dark:text-amber-300">No columns mapped yet — click a header or use Auto-map.</p>
      )}

      {!nameMapped && (
        <p className="text-xs text-red-600 dark:text-red-400">Map at least one column to Name / description before preview.</p>
      )}

      <button
        type="button"
        disabled={importBusy || !nameMapped}
        onClick={onPreview}
        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {importBusy ? 'Working…' : 'Preview import'}
      </button>
    </div>
  )
}
