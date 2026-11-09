import { Fragment, type ReactNode } from 'react'

/**
 * Enkel formatering utan HTML: **fet**, *kursiv*, länkar (http…), rader som börjar
 * med "- " blir punktlista och "## " blir en mellanrubrik. Allt annat är vanlig text.
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|https?:\/\/[^\s)]+)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${key}-${i++}`
    if (t.startsWith('**')) out.push(<strong key={k}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('*')) out.push(<em key={k}>{t.slice(1, -1)}</em>)
    else out.push(<a key={k} href={t} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 break-all">{t}</a>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function RichText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (!list.length) return
    const items = list
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-5 list-disc space-y-0.5">
        {items.map((l, i) => <li key={i}>{inline(l, `li-${blocks.length}-${i}`)}</li>)}
      </ul>,
    )
    list = []
  }
  lines.forEach((line, i) => {
    const l = line.trimEnd()
    if (/^\s*[-•]\s+/.test(l)) { list.push(l.replace(/^\s*[-•]\s+/, '')); return }
    flush()
    if (/^##\s+/.test(l)) blocks.push(<p key={i} className="pt-1 font-semibold">{inline(l.replace(/^##\s+/, ''), `h-${i}`)}</p>)
    else if (!l.trim()) blocks.push(<div key={i} className="h-2" />)
    else blocks.push(<p key={i}>{inline(l, `p-${i}`)}</p>)
  })
  flush()
  return <div className={`flex flex-col gap-0.5 text-sm leading-relaxed ${className}`}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>
}
