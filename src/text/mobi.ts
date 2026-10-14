import { blocksToParagraphs, type TextBlock } from './paginate'

export type MobiFailure = 'invalid' | 'encrypted' | 'unsupported' | 'empty'

export type MobiBook = {
  title: string
  author: string
  blocks: TextBlock[]
}

const HUFF = 17480

export function palmdocDecompress(data: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < data.length) {
    const c = data[i++]
    if (c >= 1 && c <= 8) {
      const end = Math.min(data.length, i + c)
      while (i < end) out.push(data[i++])
    } else if (c < 128) {
      out.push(c)
    } else if (c >= 192) {
      out.push(0x20, c ^ 0x80)
    } else {
      if (i >= data.length) break
      const pair = (c << 8) | data[i++]
      const distance = (pair >> 3) & 0x7ff
      const length = (pair & 7) + 3
      if (distance === 0 || distance > out.length) continue
      for (let n = 0; n < length; n++) out.push(out[out.length - distance])
    }
  }
  return Uint8Array.from(out)
}

function u16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0)
}

function u32(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  )
}

function palmRecords(bytes: Uint8Array): Uint8Array[] | null {
  if (bytes.length < 78) return null
  const count = u16(bytes, 76)
  if (count < 1 || 78 + count * 8 > bytes.length) return null
  const offsets: number[] = []
  for (let i = 0; i < count; i++) offsets.push(u32(bytes, 78 + i * 8))
  const records: Uint8Array[] = []
  for (let i = 0; i < count; i++) {
    const start = offsets[i]
    const end = i + 1 < count ? offsets[i + 1] : bytes.length
    if (start === undefined || end === undefined || start > end || end > bytes.length) return null
    records.push(bytes.subarray(start, end))
  }
  return records
}

function decodeBytes(bytes: Uint8Array, encoding: number): string {
  if (encoding === 65001) return new TextDecoder('utf-8').decode(bytes)
  if (bytes.some((byte) => byte >= 0x80)) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      // Fall through to the single-byte encoding named by the header.
    }
  }
  try {
    return new TextDecoder('windows-1252').decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

function htmlToBlocks(html: string): TextBlock[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '\n\u0001H\u0001')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|blockquote|section|article)>/gi, '\n')
  const text = decodeEntities(cleaned.replace(/<[^>]+>/g, ''))
  const blocks: TextBlock[] = []
  for (const line of text.split(/\n+/)) {
    const trimmed = line.replace(/\s+/g, ' ').trim()
    if (!trimmed) continue
    if (trimmed.startsWith('\u0001H\u0001')) {
      const title = trimmed.slice(3).trim()
      if (title) blocks.push({ text: title, isHeading: true })
    } else {
      blocks.push({ text: trimmed, isHeading: false })
    }
  }
  return blocks
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeChar(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeChar(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
}

function safeChar(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return ''
  return String.fromCodePoint(code)
}

function readMeta(record: Uint8Array): { encoding: number; title: string; author: string } {
  let encoding = 1252
  let title = ''
  let author = ''
  if (record.length < 20) return { encoding, title, author }
  const marker = String.fromCharCode(record[16], record[17], record[18], record[19])
  if (marker !== 'MOBI') return { encoding, title, author }
  const headerLength = u32(record, 20)
  encoding = u32(record, 28) || 1252
  if (headerLength >= 92 && record.length >= 108) {
    const nameOffset = u32(record, 100)
    const nameLength = u32(record, 104)
    if (nameLength > 0 && nameOffset + nameLength <= record.length) {
      title = decodeBytes(record.subarray(nameOffset, nameOffset + nameLength), encoding).replace(/\0/g, '').trim()
    }
  }
  const exthAt = 16 + headerLength
  if (headerLength > 0 && exthAt + 12 <= record.length && String.fromCharCode(record[exthAt], record[exthAt + 1], record[exthAt + 2], record[exthAt + 3]) === 'EXTH') {
    const records = u32(record, exthAt + 8)
    let cursor = exthAt + 12
    for (let i = 0; i < records && cursor + 8 <= record.length; i++) {
      const type = u32(record, cursor)
      const length = u32(record, cursor + 4)
      if (length < 8 || cursor + length > record.length) break
      if (type === 100 && !author) {
        author = decodeBytes(record.subarray(cursor + 8, cursor + length), encoding).replace(/\0/g, '').trim()
      }
      cursor += length
    }
  }
  return { encoding, title, author }
}

function textFromRecords(records: Uint8Array[], recordCount: number, compression: number): Uint8Array | null {
  const parts: Uint8Array[] = []
  const last = Math.min(records.length - 1, recordCount)
  for (let i = 1; i <= last; i++) {
    const record = records[i]
    if (!record) return null
    if (compression === 1) parts.push(record)
    else if (compression === 2) parts.push(palmdocDecompress(record))
    else return null
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    merged.set(part, offset)
    offset += part.length
  }
  return merged
}

function scanHtml(bytes: Uint8Array): string | null {
  const latin = new TextDecoder('latin1').decode(bytes)
  const start = latin.search(/<(?:html|body|p|div|h1)\b/i)
  if (start < 0) return null
  const slice = bytes.subarray(start)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(slice)
  } catch {
    return latin.slice(start)
  }
}

export function parseMobi(bytes: Uint8Array): MobiBook | MobiFailure {
  const records = palmRecords(bytes)
  if (!records || records.length < 2) return 'invalid'
  const header = records[0]
  if (!header || header.length < 16) return 'invalid'
  const compression = u16(header, 0)
  const textLength = u32(header, 4)
  const recordCount = u16(header, 8)
  const encryption = u16(header, 12)
  if (encryption !== 0) return 'encrypted'
  const meta = readMeta(header)
  let html = ''
  if (compression === 1 || compression === 2) {
    const text = textFromRecords(records, recordCount, compression)
    if (!text || textLength === 0) return 'empty'
    html = decodeBytes(text.subarray(0, Math.min(textLength, text.length)), meta.encoding)
  } else if (compression === HUFF) {
    html = scanHtml(bytes) ?? ''
  } else {
    html = scanHtml(bytes) ?? ''
    if (!html) return 'unsupported'
  }
  const blocks = htmlToBlocks(html)
  if (blocks.length === 0) return 'empty'
  return { title: meta.title, author: meta.author, blocks }
}

export function paragraphsFromMobi(book: MobiBook) {
  return blocksToParagraphs(book.blocks)
}
