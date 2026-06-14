import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const tempDir = path.resolve(__dirname, '..', '.tmp')
const xlsxModuleUrl = pathToFileURL(
  path.resolve(
    __dirname,
    '..',
    '..',
    '..',
    'artifacts',
    'zafeer',
    'node_modules',
    'xlsx',
    'xlsx.js'
  )
).href

type CellValue = string | number | null | undefined
type RowData = Record<string, CellValue>

interface WorkbookOptions {
  prefix: string
  sheetName: string
  headers: string[]
  rows: RowData[]
}

async function loadXlsx() {
  const module = await import(xlsxModuleUrl)
  return (module.default ?? module) as typeof module
}

export async function createTemporaryWorkbook(options: WorkbookOptions) {
  const { prefix, sheetName, headers, rows } = options
  const XLSX = await loadXlsx()

  await fs.mkdir(tempDir, { recursive: true })

  const normalizedRows = rows.map((row) =>
    Object.fromEntries(headers.map((header) => [header, row[header] ?? '']))
  )

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(normalizedRows, {
    header: headers,
  })

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const filePath = path.join(
    tempDir,
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.xlsx`
  )

  XLSX.writeFile(workbook, filePath)
  return filePath
}

export async function removeTemporaryWorkbook(filePath: string | null) {
  if (!filePath) return

  await fs.rm(filePath, { force: true })
}
