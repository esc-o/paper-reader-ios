import { blocksToParagraphs, type TextBlock } from './paginate'

const CHAPTER =
  /^(?:第[0-9０-９一二三四五六七八九十百千零〇两]+[章节回部卷篇].*|(?:chapter|part)\s+(?:\d+|[ivxlcdm]+)\b.*)$/i

export function decodePlain(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3))
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    try {
      return new TextDecoder('gbk').decode(bytes)
    } catch {
      return new TextDecoder('windows-1252').decode(bytes)
    }
  }
}

export function isHeadingLine(line: string): boolean {
  const text = line.trim()
  if (!text || text.length > 80) return false
  if (/^#{1,6}\s+\S/.test(text)) return true
  return CHAPTER.test(text)
}

export function plainBlocks(text: string): TextBlock[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const blocks: TextBlock[] = []
  for (const chunk of normalized.split(/\n{2,}/)) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean)
    let buffer: string[] = []
    const flush = () => {
      const joined = buffer.join(' ').trim()
      if (joined) blocks.push({ text: joined, isHeading: false })
      buffer = []
    }
    for (const line of lines) {
      if (isHeadingLine(line)) {
        flush()
        blocks.push({ text: line.replace(/^#{1,6}\s+/, ''), isHeading: true })
      } else {
        buffer.push(line)
      }
    }
    flush()
  }
  return blocks
}

export function paragraphsFromPlain(bytes: Uint8Array) {
  return blocksToParagraphs(plainBlocks(decodePlain(bytes)))
}
