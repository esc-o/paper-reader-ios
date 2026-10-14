import type { Paragraph } from '../pdf/extractParagraphs'

export type TextBlock = { text: string; isHeading: boolean }

const PAGE_CHARS = 1400

/** Packs blocks into the same page-sized paragraphs the reader already uses. */
export function blocksToParagraphs(blocks: TextBlock[]): Paragraph[] {
  const paragraphs: Paragraph[] = []
  let page = 1
  let used = 0
  let id = 1

  const push = (text: string, isHeading: boolean) => {
    paragraphs.push({ id: id++, text, startPage: page, endPage: page, isHeading })
    used += text.length
  }

  for (const block of blocks) {
    let text = block.text.replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (block.isHeading && used > PAGE_CHARS * 0.82) {
      page += 1
      used = 0
    }
    while (text.length > PAGE_CHARS) {
      let cut = text.lastIndexOf(' ', PAGE_CHARS)
      if (cut < 600) cut = PAGE_CHARS
      const piece = text.slice(0, cut).trim()
      if (used > 0 && used + piece.length > PAGE_CHARS) {
        page += 1
        used = 0
      }
      push(piece, false)
      text = text.slice(cut).trim()
      page += 1
      used = 0
    }
    if (!text) continue
    if (used > 0 && used + text.length > PAGE_CHARS) {
      page += 1
      used = 0
    }
    push(text, block.isHeading)
  }
  return paragraphs
}
