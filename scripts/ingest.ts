/**
 * Bulk document ingestion for Uforia.
 *
 * Feeds documents through the same pipeline as the upload UI:
 * store file → create Document record → extract text → chunk → embed.
 *
 * Usage (via `npm run ingest -- <args>`):
 *   npm run ingest                          Ingest every source in data/sources.json
 *   npm run ingest -- --dir <folder>        Ingest all PDFs/images in a local folder
 *   npm run ingest -- --url <url>           Ingest a single remote document
 *                     [--name <file.pdf>]   Optional file name for --url
 *   npm run ingest -- --page <url>          Crawl a web page (and sub-pages) for documents
 *                     [--depth <n>]         Sub-page levels to follow (default 1)
 *                     [--match <regex>]     Only follow links matching this pattern
 *                     [--limit <n>]         Max documents to ingest (default: unlimited)
 *   npm run ingest -- --check               Check remote sources / crawl pages, no DB writes
 *
 * sources.json entries:
 *   { "name": "x.pdf", "url": "https://…/x.pdf" }               direct document
 *   { "type": "page", "url": "https://…", "depth": 1,
 *     "match": "ufo|uap" }                                       crawled page
 *
 * Already-ingested documents (matched by file name) are skipped before
 * downloading, so re-running only pulls what's new.
 *
 * Government sites (dni.gov, media.defense.gov) sometimes block non-browser
 * clients. If URL ingestion fails, download the PDFs in a browser and use
 * --dir instead. Note the crawler only sees static HTML — pages that render
 * their document lists with JavaScript (e.g. catalog.archives.gov) won't
 * expose links to it.
 */

import fs from 'fs'
import path from 'path'
import { parse as parseCsv } from 'csv-parse/sync'
import { prisma } from '../src/lib/db'
import { uploadBuffer } from '../src/lib/storage'
import { isSupported, processDocument } from '../src/lib/process'

const SOURCES_FILE = path.join(__dirname, '..', 'data', 'sources.json')
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'

/** Politeness delay between crawler requests (ms). */
const CRAWL_DELAY = 300
/** Hard cap on pages fetched per crawled source. */
const MAX_PAGES_PER_SOURCE = 30

interface Source {
  /** "file" (default) — url points at a document. "page" — crawl url for documents. */
  type?: 'file' | 'page'
  name?: string
  title?: string
  url: string
  /** page only: sub-page levels to follow from the listed page (default 1). */
  depth?: number
  /** page only: max documents to ingest from this source (default: unlimited). */
  limit?: number
  /** page only: case-insensitive regex — file and sub-page URLs must match. */
  match?: string
}

const EXTENSION_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
}

function contentTypeFor(fileName: string): string | null {
  return EXTENSION_TYPES[path.extname(fileName).toLowerCase()] ?? null
}

/** Link extensions that are neither documents nor crawlable pages. */
const SKIP_EXTENSIONS = new Set([
  '.css', '.js', '.mjs', '.map', '.json', '.xml', '.rss', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.mp3', '.mp4', '.mov', '.avi',
  '.zip', '.gz', '.url',
])

function loadSources(): Source[] {
  const raw = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'))
  return raw.sources as Source[]
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function download(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,image/*,*/*' },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const type = res.headers.get('content-type') ?? ''
    if (type.includes('text/html')) {
      throw new Error(
        'Server returned an HTML page instead of a document (likely bot protection — download in a browser and use --dir)',
      )
    }
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timer)
  }
}

async function fetchText(url: string, accept: string): Promise<{ text: string; type: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: accept },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { text: await res.text(), type: res.headers.get('content-type') ?? '' }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchHtml(url: string): Promise<string> {
  const { text, type } = await fetchText(url, 'text/html,application/xhtml+xml')
  if (!type.includes('html')) throw new Error(`not an HTML page (${type})`)
  return text
}

/** Extracts absolute http(s) links (href and src attributes) from an HTML document. */
function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>()
  for (const m of html.matchAll(/(?:href|src)\s*=\s*["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(m[1], baseUrl)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        url.hash = ''
        links.add(url.toString())
      }
    } catch {
      // Ignore malformed hrefs.
    }
  }
  return [...links]
}

/** Data files that JS-rendered pages load their document lists from. */
const DATA_FILE_EXTENSIONS = new Set(['.csv', '.json'])

/**
 * Finds quoted .csv/.json URLs anywhere in the page source — including inline
 * scripts (e.g. `const csvUrl = "/data/uap-data.csv"`), which href/src
 * extraction misses.
 */
function extractDataFileLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>()
  for (const m of html.matchAll(/["']([^"'\s]+\.(?:csv|json)(?:\?[^"']*)?)["']/gi)) {
    try {
      const url = new URL(m[1], baseUrl)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        url.hash = ''
        links.add(url.toString())
      }
    } catch {
      // Ignore malformed URLs.
    }
  }
  return [...links]
}

/**
 * Extracts absolute document URLs (supported extensions) from a CSV/JSON data
 * file. CSV files are parsed cell-by-cell so URLs containing spaces, commas,
 * or quotes in their file names survive; other formats fall back to a regex
 * scan (which cannot represent those characters).
 */
function extractDocumentUrls(text: string, ext: string): string[] {
  const urls = new Set<string>()

  if (ext === '.csv') {
    try {
      const records: string[][] = parseCsv(text, {
        relax_quotes: true,
        relax_column_count: true,
        skip_empty_lines: true,
      })
      for (const row of records) {
        for (const cell of row) {
          const value = (cell ?? '').trim()
          if (!/^https?:\/\//i.test(value)) continue
          try {
            if (contentTypeFor(new URL(value).pathname)) urls.add(value)
          } catch {
            // Cell isn't a valid URL.
          }
        }
      }
      if (urls.size) return [...urls]
    } catch {
      // Malformed CSV — fall through to the regex scan.
    }
  }

  for (const m of text.matchAll(/https?:\/\/[^\s"',()<>|]+\.(?:pdf|png|jpe?g|webp|gif|tiff?)\b/gi)) {
    urls.add(m[0])
  }
  return [...urls]
}

interface FoundDocument {
  url: string
  name: string
}

/**
 * Breadth-first crawl of a page for document links. Stays on the source's
 * host, follows sub-pages up to `depth`, and stops at `limit` documents or
 * MAX_PAGES_PER_SOURCE fetched pages — whichever comes first.
 */
async function crawlPage(source: Source): Promise<FoundDocument[]> {
  const start = new URL(source.url)
  const matcher = source.match ? new RegExp(source.match, 'i') : null
  const maxDepth = source.depth ?? 1
  const limit = source.limit ?? Infinity

  const visited = new Set<string>()
  const scannedData = new Set<string>() // data files, keyed by host+path (ignore query strings)
  const found = new Map<string, FoundDocument>() // keyed by file name to avoid dupes
  const queue: Array<{ url: string; depth: number }> = [{ url: start.toString(), depth: 0 }]

  const addDocument = (link: string, name: string) => {
    if (found.size < limit && (!matcher || matcher.test(link)) && !found.has(name)) {
      found.set(name, { url: link, name })
    }
  }

  while (queue.length && visited.size < MAX_PAGES_PER_SOURCE && found.size < limit) {
    const { url, depth } = queue.shift()!
    if (visited.has(url)) continue
    visited.add(url)

    let html: string
    try {
      html = await fetchHtml(url)
    } catch (err: any) {
      console.log(`  ⚠ ${url}: ${err?.message ?? err}`)
      continue
    }

    const links = new Set([...extractLinks(html, url), ...extractDataFileLinks(html, url)])
    for (const link of links) {
      const linkUrl = new URL(link)
      const ext = path.extname(linkUrl.pathname).toLowerCase()
      const name = decodeURIComponent(linkUrl.pathname.split('/').pop() ?? '')

      if (contentTypeFor(name)) {
        addDocument(link, name)
      } else if (DATA_FILE_EXTENSIONS.has(ext) && linkUrl.host === start.host) {
        // JS-rendered pages often load their document lists from a CSV/JSON
        // data file — scan it for document URLs.
        const dataKey = linkUrl.host + linkUrl.pathname
        if (scannedData.has(dataKey) || visited.size >= MAX_PAGES_PER_SOURCE) continue
        scannedData.add(dataKey)
        visited.add(link)
        try {
          const { text } = await fetchText(link, 'text/csv,application/json,text/plain,*/*')
          const urls = extractDocumentUrls(text, ext)
          if (urls.length) console.log(`  ◆ data file ${name}: ${urls.length} document link(s)`)
          for (const docUrl of urls) {
            addDocument(docUrl, decodeURIComponent(new URL(docUrl).pathname.split('/').pop() ?? ''))
          }
        } catch (err: any) {
          console.log(`  ⚠ ${link}: ${err?.message ?? err}`)
        }
        await sleep(CRAWL_DELAY)
      } else if (SKIP_EXTENSIONS.has(ext)) {
        // Stylesheets, scripts, fonts, media — not worth a page fetch.
      } else if (
        depth < maxDepth &&
        linkUrl.host === start.host &&
        !visited.has(link) &&
        (!matcher || matcher.test(link))
      ) {
        queue.push({ url: link, depth: depth + 1 })
      }
    }

    await sleep(CRAWL_DELAY)
  }

  // Prefer PDFs over same-named preview images — document sites often pair
  // each PDF with a modal/preview image sharing its base name.
  const byStem = new Map<string, FoundDocument>()
  for (const doc of found.values()) {
    const stem = doc.name.replace(/\.[^.]+$/, '').toLowerCase()
    const prev = byStem.get(stem)
    if (!prev || (!prev.name.toLowerCase().endsWith('.pdf') && doc.name.toLowerCase().endsWith('.pdf'))) {
      byStem.set(stem, doc)
    }
  }
  return [...byStem.values()]
}

/**
 * Returns the status of an already-ingested document with this file name, or
 * null if it hasn't been pulled yet. Errored documents don't count — they can
 * be retried.
 */
async function alreadyIngested(fileName: string): Promise<string | null> {
  const existing = await prisma.document.findFirst({
    where: { fileName, status: { in: ['pending', 'processing', 'ready'] } },
    select: { status: true },
  })
  return existing?.status ?? null
}

/** Stores a buffer and runs the full processing pipeline, reporting the result. */
async function ingestBuffer(fileName: string, contentType: string, buffer: Buffer) {
  const existingStatus = await alreadyIngested(fileName)
  if (existingStatus) {
    console.log(`  ↷ skipped (already ingested, status: ${existingStatus})`)
    return
  }

  const { cloud_storage_path } = await uploadBuffer(fileName, contentType, buffer)
  const doc = await prisma.document.create({
    data: {
      fileName,
      contentType,
      fileSize: buffer.length,
      cloudStoragePath: cloud_storage_path,
      status: 'pending',
    },
  })

  await processDocument(doc.id)

  const result = await prisma.document.findUnique({
    where: { id: doc.id },
    select: { status: true, pageCount: true, errorMessage: true, _count: { select: { chunks: true } } },
  })
  if (result?.status === 'ready') {
    console.log(`  ✔ ready — ${result.pageCount ?? '?'} pages, ${result._count.chunks} chunks`)
  } else {
    console.log(`  ✘ ${result?.status}: ${result?.errorMessage ?? 'unknown error'}`)
  }
}

async function ingestUrl(url: string, fileName?: string, title?: string) {
  const name = fileName ?? decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'document.pdf')
  console.log(`\n${title ?? name}`)
  console.log(`  ${url}`)

  const contentType = contentTypeFor(name)
  if (!contentType || !isSupported(contentType)) {
    console.log(`  ✘ unsupported file type for "${name}" (PDFs and images only)`)
    return
  }

  // Skip before downloading — re-runs should only pull what's new.
  const existingStatus = await alreadyIngested(name)
  if (existingStatus) {
    console.log(`  ↷ skipped (already ingested, status: ${existingStatus})`)
    return
  }

  try {
    const buffer = await download(url)
    console.log(`  ↓ downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)
    await ingestBuffer(name, contentType, buffer)
  } catch (err: any) {
    console.log(`  ✘ download failed: ${err?.message ?? err}`)
  }
}

async function ingestPage(source: Source) {
  console.log(`\n▶ Crawling ${source.title ?? source.url}`)
  const docs = await crawlPage(source)
  if (!docs.length) {
    console.log(
      '  ✘ no document links found. The page may render its file list with JavaScript — open it in a browser, download the files, and use --dir.',
    )
    return
  }
  console.log(`  found ${docs.length} document(s)`)
  for (const doc of docs) {
    await ingestUrl(doc.url, doc.name)
  }
}

async function ingestDir(dir: string) {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && contentTypeFor(e.name) !== null)

  if (!entries.length) {
    console.log(`No PDFs or images found in ${dir}`)
    return
  }
  console.log(`Ingesting ${entries.length} file(s) from ${dir}`)

  for (const entry of entries) {
    console.log(`\n${entry.name}`)
    const contentType = contentTypeFor(entry.name)!
    const buffer = fs.readFileSync(path.join(dir, entry.name))
    await ingestBuffer(entry.name, contentType, buffer)
  }
}

/** Dry-run crawl: lists what a page source would ingest. Returns true if anything was found. */
async function checkPage(source: Source): Promise<boolean> {
  const docs = await crawlPage(source)
  if (docs.length) {
    console.log(`✔ ${source.title ?? source.url} — found ${docs.length} document(s):`)
    for (const d of docs.slice(0, 10)) console.log(`    ${d.name}`)
    if (docs.length > 10) console.log(`    … and ${docs.length - 10} more`)
    return true
  }
  console.log(`✘ ${source.title ?? source.url}: no document links found (JS-rendered page?)`)
  return false
}

async function checkSources() {
  const sources = loadSources()
  console.log(`Checking ${sources.length} source(s)…\n`)
  let ok = 0
  for (const source of sources) {
    if (source.type === 'page') {
      if (await checkPage(source)) ok++
      continue
    }
    try {
      const buffer = await download(source.url)
      console.log(`✔ ${source.name} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`)
      ok++
    } catch (err: any) {
      console.log(`✘ ${source.name}: ${err?.message ?? err}`)
    }
  }
  console.log(`\n${ok}/${sources.length} sources reachable.`)
  if (ok < sources.length) {
    console.log('For blocked sources: download in a browser, then run `npm run ingest -- --dir <folder>`.')
  }
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const url = argValue('--url')
  const dir = argValue('--dir')
  const page = argValue('--page')
  const pageSource: Source | null = page
    ? {
        type: 'page',
        url: page,
        depth: argValue('--depth') ? Number(argValue('--depth')) : undefined,
        match: argValue('--match'),
        limit: argValue('--limit') ? Number(argValue('--limit')) : undefined,
      }
    : null

  if (process.argv.includes('--check')) {
    // --check --page <url> dry-runs a single crawl; bare --check checks sources.json.
    if (pageSource) await checkPage(pageSource)
    else await checkSources()
    return
  }

  if (url) {
    await ingestUrl(url, argValue('--name'))
  } else if (pageSource) {
    await ingestPage(pageSource)
  } else if (dir) {
    await ingestDir(path.resolve(dir))
  } else {
    const sources = loadSources()
    console.log(`Ingesting ${sources.length} source(s) from data/sources.json`)
    for (const source of sources) {
      if (source.type === 'page') {
        await ingestPage(source)
      } else {
        await ingestUrl(source.url, source.name, source.title)
      }
    }
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
