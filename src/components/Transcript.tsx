import type { HistoryLine } from '../types/radio'
export function Transcript({ lines }: { lines: HistoryLine[] }) {
  return (
    <section className="panel rounded-[24px] p-5 sm:p-6"><div className="flex items-center justify-between"><p className="eyebrow">RECENT VOICES</p><span className="text-xs text-slate-600">直近 {Math.min(lines.length, 6)} 件</span></div>
      <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">{lines.length === 0 ? <p className="py-4 text-sm leading-6 text-slate-500">放送が始まると、ここに直前の会話が表示されます。</p> : lines.slice(-6).reverse().map((line, index) => <div key={`${line.text}-${index}`} className="flex gap-3 rounded-xl bg-white/[.025] p-3"><span className={`mt-0.5 shrink-0 text-xs font-black ${line.speaker === 'A' ? 'text-cyan' : 'text-signal'}`}>DJ {line.speaker}</span><p className="text-sm leading-6 text-slate-300">{line.text}</p></div>)}</div>
    </section>
  )
}
