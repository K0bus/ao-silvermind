import { Marked } from 'marked'

const marked = new Marked()

const renderer = {
  link({ href, title, text }: { href: string; title?: string | null | undefined; text: string }) {
    const cleanHref = href.trim().replace(/^javascript:/i, '')
    const titleAttr = title ? ` title="${title}"` : ''
    return `<a href="${cleanHref}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`
  },
  image({ href, title, text }: { href: string; title?: string | null | undefined; text: string }) {
    const titleAttr = title ? ` title="${title}"` : ''
    return `<img src="${href}" alt="${text}"${titleAttr} />`
  },
  code({ text, lang }: { text: string; lang?: string }) {
    const langAttr = lang ? ` class="language-${lang}"` : ''
    return `<pre><code${langAttr}>${text.trim()}</code></pre>`
  },
  codespan({ text }: { text: string }) {
    return `<code>${text}</code>`
  },
  heading({ text, depth }: { text: string; depth: number }) {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
    return `<h${depth} id="${id}">${text}</h${depth}>`
  }
}

marked.use({ renderer })

export function renderMarkdown(markdown: string | null | undefined): string {
  if (!markdown) return ''

  // Escape < and & to block any HTML/script injection, but keep > for blockquotes
  const safeMarkdown = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')

  try {
    return marked.parse(safeMarkdown) as string
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return safeMarkdown
  }
}
