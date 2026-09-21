import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const nodeModule = require('node:module')

const DEFAULT_INPUT_DIR = String.raw`D:\System user data\Desktop\Каталоги`
const DEFAULT_OUTPUT_DIR = path.resolve('outputs', 'reference-library')
const DEFAULT_SAMPLE_PAGES = 12
const DEFAULT_RENDER_WIDTH = 320
const DEFAULT_SHEET_COLUMNS = 4

const runtimeNodeModules = String.raw`C:\Users\Артём\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules`
const runtimePdfjsPath = path.join(runtimeNodeModules, 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')
const runtimeCanvasPackagePath = path.join(runtimeNodeModules, '.pnpm', '@napi-rs+canvas@0.1.100', 'node_modules', '@napi-rs', 'canvas')
const runtimeCanvasBindingPath = path.join(runtimeNodeModules, '.pnpm', '@napi-rs+canvas-win32-x64-msvc@0.1.100', 'node_modules')

process.env.NODE_PATH = [process.env.NODE_PATH, runtimeCanvasBindingPath].filter(Boolean).join(path.delimiter)
nodeModule.Module._initPaths()

const { createCanvas } = require(runtimeCanvasPackagePath)

let pdfjsLibPromise = null
async function getPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(pathToFileURL(runtimePdfjsPath).href)
  }
  return pdfjsLibPromise
}

function parseArgs(argv) {
  const result = {
    inputDir: DEFAULT_INPUT_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    samplePages: DEFAULT_SAMPLE_PAGES,
    renderWidth: DEFAULT_RENDER_WIDTH,
    sheetColumns: DEFAULT_SHEET_COLUMNS,
    files: [],
    skipPreview: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--input' && argv[index + 1]) {
      result.inputDir = argv[++index]
      continue
    }
    if (arg === '--output' && argv[index + 1]) {
      result.outputDir = argv[++index]
      continue
    }
    if (arg === '--sample-pages' && argv[index + 1]) {
      result.samplePages = Number.parseInt(argv[++index], 10)
      continue
    }
    if (arg === '--render-width' && argv[index + 1]) {
      result.renderWidth = Number.parseInt(argv[++index], 10)
      continue
    }
    if (arg === '--sheet-columns' && argv[index + 1]) {
      result.sheetColumns = Number.parseInt(argv[++index], 10)
      continue
    }
    if (arg === '--file' && argv[index + 1]) {
      result.files.push(argv[++index])
      continue
    }
    if (arg === '--skip-preview') {
      result.skipPreview = true
      continue
    }
  }

  if (!Number.isFinite(result.samplePages) || result.samplePages < 1) result.samplePages = DEFAULT_SAMPLE_PAGES
  if (!Number.isFinite(result.renderWidth) || result.renderWidth < 160) result.renderWidth = DEFAULT_RENDER_WIDTH
  if (!Number.isFinite(result.sheetColumns) || result.sheetColumns < 2) result.sheetColumns = DEFAULT_SHEET_COLUMNS
  return result
}

function normalizeName(name) {
  return name.replace(/\s*\(1\)$/u, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'catalog'
}

function toMsDate(date) {
  return new Date(date).toISOString().replace(/[:.]/g, '-')
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function hashFile(filePath) {
  const bytes = await readFile(filePath)
  return { hash: hashBuffer(bytes), bytes }
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b)
}

function pickSamplePages(totalPages, samplePages) {
  if (totalPages <= 0) return []
  if (totalPages <= samplePages) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const picked = new Set([1, totalPages])
  const stride = (totalPages - 1) / Math.max(samplePages - 1, 1)
  for (let index = 1; index < samplePages - 1; index += 1) {
    picked.add(1 + Math.round(index * stride))
  }
  return uniqueSorted([...picked].map((page) => Math.min(Math.max(page, 1), totalPages)))
}

function extractKeywords(text) {
  const lowered = (text || '').toLowerCase()
  const keywords = []
  const entries = [
    ['lookbook', 'lookbook'],
    ['workbook', 'workbook'],
    ['magazine', 'magazine'],
    ['outdoor', 'outdoor'],
    ['architect', 'architect'],
    ['catalog', 'catalog'],
    ['collection', 'collection'],
    ['technical', 'technical'],
    ['general', 'general'],
    ['series', 'series'],
    ['price', 'price'],
    ['residential', 'residential']
  ]
  for (const [needle, label] of entries) {
    if (lowered.includes(needle) && !keywords.includes(label)) keywords.push(label)
  }
  return keywords
}

function classifyCatalog(fileName, text, pageCount) {
  const lower = `${fileName} ${text}`.toLowerCase()
  if (lower.includes('lookbook')) return 'lookbook'
  if (lower.includes('workbook')) return 'workbook'
  if (lower.includes('magazine')) return 'editorial_magazine'
  if (lower.includes('outdoor')) return 'outdoor_catalog'
  if (lower.includes('architect')) return 'architect_organizer'
  if (lower.includes('residential')) return 'residential_catalog'
  if (lower.includes('accessor')) return 'accessories_catalog'
  if (lower.includes('moodboard')) return 'moodboard'
  if (pageCount <= 50) return 'compact_release'
  if (pageCount >= 180) return 'general_catalog'
  return 'product_catalog'
}

function scoreCatalog(fileName, pageCount, text, isDuplicate) {
  const lower = fileName.toLowerCase()
  const keywords = extractKeywords(`${fileName} ${text}`)
  let score = 0

  if (pageCount >= 250) score += 20
  else if (pageCount >= 150) score += 15
  else if (pageCount >= 80) score += 10
  else score += 5

  if (lower.includes('lookbook')) score += 18
  if (lower.includes('workbook')) score += 18
  if (lower.includes('magazine')) score += 16
  if (lower.includes('outdoor')) score += 14
  if (lower.includes('architect')) score += 12
  if (lower.includes('residential')) score += 10
  if (lower.includes('general')) score += 8
  if (lower.includes('catalog')) score += 6
  if (lower.includes('novink')) score += 6
  if (/2026/.test(lower)) score += 4
  if (/2025/.test(lower)) score += 2
  if (!isDuplicate) score += 5
  score += Math.min(keywords.length * 2, 8)
  if (text.length > 800) score += 4
  return score
}

function collectErrors(message, error) {
  return `${message}: ${error instanceof Error ? error.message : String(error)}`
}

function buildDirUrl(dirPath) {
  const href = pathToFileURL(path.resolve(dirPath)).href
  return href.endsWith('/') ? href : `${href}/`
}

async function renderPage(pdfDoc, pageNumber, renderWidth) {
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  const scale = renderWidth / viewport.width
  const renderedViewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(renderedViewport.width), Math.ceil(renderedViewport.height))
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({
    canvasContext: context,
    viewport: renderedViewport,
    intent: 'display'
  }).promise
  return {
    pageNumber,
    width: canvas.width,
    height: canvas.height,
    canvas,
    buffer: canvas.toBuffer('image/png')
  }
}

async function buildContactSheet(previewPages, pageCount, sheetColumns) {
  if (previewPages.length === 0) return null
  const tileWidth = 330
  const tileImageHeight = 420
  const tileLabelHeight = 58
  const gap = 18
  const columns = Math.max(sheetColumns, 2)
  const rows = Math.ceil(previewPages.length / columns)
  const sheetWidth = columns * tileWidth + (columns + 1) * gap
  const sheetHeight = 72 + rows * (tileImageHeight + tileLabelHeight + gap) + gap
  const sheet = createCanvas(sheetWidth, sheetHeight)
  const ctx = sheet.getContext('2d')

  ctx.fillStyle = '#f6f4ef'
  ctx.fillRect(0, 0, sheetWidth, sheetHeight)
  ctx.fillStyle = '#252422'
  ctx.font = '700 22px Arial'
  ctx.fillText('Contact sheet', gap, 32)
  ctx.font = '400 12px Arial'
  ctx.fillStyle = '#6f6a63'
  ctx.fillText(`${pageCount} pages · ${previewPages.length} sampled pages`, gap, 52)

  for (let index = 0; index < previewPages.length; index += 1) {
    const item = previewPages[index]
    const row = Math.floor(index / columns)
    const column = index % columns
    const x = gap + column * (tileWidth + gap)
    const y = 72 + row * (tileImageHeight + tileLabelHeight + gap)

    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#ded7cc'
    ctx.lineWidth = 1
    ctx.fillRect(x, y, tileWidth, tileImageHeight + tileLabelHeight)
    ctx.strokeRect(x, y, tileWidth, tileImageHeight + tileLabelHeight)

    const fitWidth = tileWidth - 20
    const fitHeight = tileImageHeight - 20
    const ratio = Math.min(fitWidth / item.width, fitHeight / item.height)
    const drawWidth = Math.round(item.width * ratio)
    const drawHeight = Math.round(item.height * ratio)
    const drawX = x + Math.floor((tileWidth - drawWidth) / 2)
    const drawY = y + 10 + Math.floor((tileImageHeight - drawHeight - 10) / 2)
    ctx.drawImage(item.canvas, drawX, drawY, drawWidth, drawHeight)

    ctx.fillStyle = '#201e1c'
    ctx.font = '700 12px Arial'
    ctx.fillText(`Page ${String(item.pageNumber).padStart(2, '0')}`, x + 10, y + tileImageHeight + 20)
    ctx.fillStyle = '#6f6a63'
    ctx.font = '400 11px Arial'
    ctx.fillText('Sample preview', x + 10, y + tileImageHeight + 38)
  }

  return sheet.toBuffer('image/png')
}

async function analyzeCatalog(filePath, config) {
  const fileName = path.basename(filePath)
  const fileStats = await stat(filePath)
  const { hash: fileHash, bytes } = await hashFile(filePath)
  const pdfjsLib = await getPdfjsLib()

  let pageCount = 0
  let previewPages = []
  let text = ''
  let firstPageBuffer = null
  let sheetBuffer = null
  let error = null

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      stopAtErrors: false,
      useWasm: false,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableWorker: true,
      cMapUrl: buildDirUrl(path.join(runtimeNodeModules, 'pdfjs-dist', 'cmaps')),
      cMapPacked: true,
      standardFontDataUrl: buildDirUrl(path.join(runtimeNodeModules, 'pdfjs-dist', 'standard_fonts')),
      wasmUrl: buildDirUrl(path.join(runtimeNodeModules, 'pdfjs-dist', 'wasm')),
      disableFontFace: true,
      useSystemFonts: true
    })
    const pdfDoc = await loadingTask.promise

    pageCount = pdfDoc.numPages
    const pickedPages = pickSamplePages(pageCount, config.samplePages)
    const textPages = uniqueSorted([1, Math.max(1, Math.round(pageCount / 2)), pageCount].filter(Boolean)).slice(0, 3)

    const textSnippets = []
    for (const pageNumber of textPages) {
      try {
        const page = await pdfDoc.getPage(pageNumber)
        const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: true })
        const snippet = content.items
          .map((item) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (snippet) textSnippets.push(snippet.slice(0, 300))
      } catch {
        textSnippets.push('')
      }
    }
    text = textSnippets.join(' ').slice(0, 1200)

    previewPages = []
    for (const pageNumber of pickedPages) {
      previewPages.push(await renderPage(pdfDoc, pageNumber, config.renderWidth))
    }
    firstPageBuffer = previewPages[0]?.buffer || null
    sheetBuffer = await buildContactSheet(previewPages, pageCount, config.sheetColumns)
  } catch (cause) {
    error = collectErrors(`Failed to read ${fileName}`, cause)
  }

  const isDuplicate = false
  const score = scoreCatalog(fileName, pageCount, text, isDuplicate)
  const category = classifyCatalog(fileName, text, pageCount)
  const sortBucket = score >= 55 ? 'high' : score >= 35 ? 'medium' : 'low'
  const reviewOrder = score

  return {
    fileName,
    filePath,
    fileSize: fileStats.size,
    fileHash,
    pageCount,
    previewPages,
    firstPageBuffer,
    sheetBuffer,
    textSnippet: text,
    category,
    keywords: extractKeywords(`${fileName} ${text}`),
    score,
    sortBucket,
    reviewOrder,
    error
  }
}

async function writeCatalogOutputs(result, runDir) {
  const safeBase = slugify(result.fileName.replace(/\.pdf$/i, ''))
  const catalogDir = path.join(runDir, 'catalogs', safeBase)
  const previewDir = path.join(catalogDir, 'previews')
  await mkdir(previewDir, { recursive: true })

  let sheetPath = null
  if (result.sheetBuffer) {
    sheetPath = path.join(catalogDir, 'contact-sheet.png')
    await writeFile(sheetPath, result.sheetBuffer)
  }

  if (result.previewPages.length > 0) {
    for (const item of result.previewPages) {
      await writeFile(path.join(previewDir, `page-${String(item.pageNumber).padStart(3, '0')}.png`), item.buffer)
    }
  }

  return { sheetPath }
}

function formatSummary(results, duplicates) {
  const readable = results.filter((item) => !item.error)
  const totalPages = readable.reduce((sum, item) => sum + item.pageCount, 0)
  const uniqueCount = readable.length
  const duplicateCount = duplicates.reduce((sum, group) => sum + Math.max(group.items.length - 1, 0), 0)
  const categories = new Map()
  for (const item of readable) {
    categories.set(item.category, (categories.get(item.category) || 0) + 1)
  }
  const sorted = [...readable].sort((a, b) => b.reviewOrder - a.reviewOrder)
  const top = sorted.slice(0, 12)

  const lines = []
  lines.push('# Reference Library Run')
  lines.push('')
  lines.push(`Total files: ${results.length}`)
  lines.push(`Readable files: ${uniqueCount}`)
  lines.push(`Total pages: ${totalPages}`)
  lines.push(`Duplicate files beyond first copy: ${duplicateCount}`)
  lines.push('')
  lines.push('## Category mix')
  lines.push('')
  for (const [category, count] of [...categories.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`- ${category}: ${count}`)
  }
  lines.push('')
  lines.push('## Top review order')
  lines.push('')
  for (const item of top) {
    lines.push(`- ${item.fileName} · ${item.pageCount} pages · ${item.category} · score ${item.score}`)
  }
  lines.push('')
  lines.push('## Duplicate groups')
  lines.push('')
  for (const group of duplicates) {
    lines.push(`- ${group.items.map((item) => item.fileName).join(' | ')}`)
  }
  return lines.join('\n')
}

async function main() {
  const config = parseArgs(process.argv.slice(2))
  const inputDir = path.resolve(config.inputDir)
  const outputRoot = path.resolve(config.outputDir)
  const runDir = path.join(outputRoot, toMsDate(new Date()))
  await mkdir(runDir, { recursive: true })

  const entries = await readdir(inputDir, { withFileTypes: true })
  const pdfFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
    .map((entry) => path.join(inputDir, entry.name))

  const filteredFiles = config.files.length > 0
    ? pdfFiles.filter((filePath) => config.files.some((requested) => normalizeName(path.basename(filePath)) === normalizeName(requested)))
    : pdfFiles

  const hashGroups = new Map()
  for (const filePath of filteredFiles) {
    const { hash } = await hashFile(filePath)
    if (!hashGroups.has(hash)) hashGroups.set(hash, [])
    hashGroups.get(hash).push(filePath)
  }

  const duplicateGroups = [...hashGroups.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([hash, files], index) => ({
      hash,
      groupId: `dup-${String(index + 1).padStart(3, '0')}`,
      items: files.map((filePath) => ({
        fileName: path.basename(filePath),
        filePath
      }))
    }))

  const duplicateLookup = new Map()
  for (const group of duplicateGroups) {
    duplicateLookup.set(group.hash, group.groupId)
  }

  const results = []
  for (const filePath of filteredFiles) {
    const result = await analyzeCatalog(filePath, config)
    result.duplicateGroupId = duplicateLookup.get(result.fileHash) || null
    results.push(result)
    process.stdout.write(`analyzed ${result.fileName} (${result.pageCount || 'n/a'} pages)\n`)
  }

  results.sort((a, b) => {
    const duplicateRankA = a.duplicateGroupId ? 0 : 1
    const duplicateRankB = b.duplicateGroupId ? 0 : 1
    if (duplicateRankA !== duplicateRankB) return duplicateRankA - duplicateRankB
    if (b.score !== a.score) return b.score - a.score
    return b.pageCount - a.pageCount
  })

  const catalogOutputs = []
  if (!config.skipPreview) {
    for (const result of results) {
      if (result.error) continue
      const output = await writeCatalogOutputs(result, runDir)
      catalogOutputs.push({ fileName: result.fileName, ...output })
    }
  }

  const summary = formatSummary(results, duplicateGroups)
  const index = {
    generatedAt: new Date().toISOString(),
    inputDir,
    outputDir: runDir,
    config,
    duplicates: duplicateGroups,
    catalogs: results.map((item) => ({
      fileName: item.fileName,
      filePath: item.filePath,
      fileSize: item.fileSize,
      fileHash: item.fileHash,
      duplicateGroupId: item.duplicateGroupId,
      pageCount: item.pageCount,
      previewPages: item.previewPages.map((pageItem) => pageItem.pageNumber),
      textSnippet: item.textSnippet,
      category: item.category,
      keywords: item.keywords,
      score: item.score,
      sortBucket: item.sortBucket,
      reviewOrder: item.reviewOrder,
      previewSheet: catalogOutputs.find((entry) => entry.fileName === item.fileName)?.sheetPath || null,
      error: item.error
    }))
  }

  await writeFile(path.join(runDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8')
  await writeFile(path.join(runDir, 'summary.md'), summary, 'utf8')
  await writeFile(path.join(runDir, 'duplicates.json'), JSON.stringify(duplicateGroups, null, 2), 'utf8')

  process.stdout.write(`\nWrote outputs to ${runDir}\n`)
  process.stdout.write(`Index: ${path.join(runDir, 'index.json')}\n`)
  process.stdout.write(`Summary: ${path.join(runDir, 'summary.md')}\n`)
  process.stdout.write(`Duplicates: ${path.join(runDir, 'duplicates.json')}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
