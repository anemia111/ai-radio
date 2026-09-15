import type { Line, RadioStatus } from '../types/radio'

const bars = Array.from({ length: 42 }, (_, index) => index)
const statusLabel: Record<RadioStatus, string> = { idle: 'STANDBY', generating: 'GENERATING', buffering: 'BUFFERING', playing: 'NOW ON AIR', paused: 'PAUSED', stopped: 'OFF AIR', error: 'ERROR' }
const pad = (value: number) => String(value).padStart(2, '0')

interface Props { status: RadioStatus; line: Line | null; programTitle: string; segmentTitle: string; elapsed: number; onStart: () => void; onStop: () => void; onPause: () => void; onNext: () => void; onContinue: () => void }

export function RadioConsole({ status, line, programTitle, segmentTitle, elapsed, onStart, onStop, onPause, onNext, onContinue }: Props) {
  const active = status === 'playing'; const canControl = active || status === 'paused' || status === 'generating' || status === 'buffering'
  const time = `${pad(Math.floor(elapsed / 3600))}:${pad(Math.floor(elapsed / 60) % 60)}:${pad(elapsed % 60)}`
  return (
    <section className="console overflow-hidden rounded-[28px] border border-white/10" aria-label="放送コンソール">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-7">
        <span className="flex items-center gap-2 text-xs font-bold tracking-[.2em] text-slate-400"><i className={`h-2 w-2 rounded-full ${active ? 'bg-signal on-air-dot' : 'bg-slate-600'}`} />{statusLabel[status]}</span>
        <span className="font-mono text-xs text-slate-500">TOKYO • {new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</span>
      </div>
      <div className="px-5 py-7 sm:px-10 sm:py-10">
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
          <div><p className="font-display text-[clamp(4.5rem,13vw,9.5rem)] font-black leading-[.76] tracking-[-.08em] text-white">98.7</p><p className="mt-5 text-xs font-bold uppercase tracking-[.28em] text-signal sm:text-sm">Night Drive Frequency</p></div>
          <div className="text-left sm:text-right"><p className="text-xs uppercase tracking-[.2em] text-slate-500">Tonight's program</p><h1 className="mt-2 max-w-md font-display text-3xl font-black leading-tight sm:text-4xl">{programTitle}</h1><p className="mt-2 text-sm text-slate-400">DJ A <span className="mx-2 text-signal">×</span> DJ B</p></div>
        </div>
        <div className="mt-8 rounded-2xl border border-white/8 bg-black/20 p-4 sm:mt-10 sm:p-5">
          <div className="flex h-20 items-center justify-center gap-[3px] overflow-hidden" aria-label={active ? '音声再生中' : '音声停止中'}>{bars.map((bar) => <span key={bar} className={active ? 'wave-bar active' : 'wave-bar'} style={{ animationDelay: `${bar * -53}ms`, animationDuration: `${590 + (bar % 7) * 61}ms` }} />)}</div>
          <div className="mt-4 flex min-h-[72px] items-start justify-between gap-4 border-t border-white/8 pt-4"><div><div className="flex items-center gap-3"><p className={`text-xs font-black ${line?.speaker === 'B' ? 'text-signal' : 'text-cyan'}`}>{line ? `DJ ${line.speaker}` : 'AI RADIO'}</p><span className="text-xs text-slate-600">{segmentTitle}</span></div><p aria-live="polite" className="mt-2 max-w-2xl text-base leading-7 text-slate-200">{line?.text ?? 'テーマを決めて、あなた専用の放送を始めましょう。'}</p></div><span className="shrink-0 font-mono text-xs text-slate-500">{time}</span></div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!canControl && <button onClick={onStart} className="primary-control" type="button"><span aria-hidden="true">▶</span> 放送を開始</button>}
          {canControl && <button onClick={onPause} className="primary-control" type="button"><span aria-hidden="true">{status === 'paused' ? '▶' : 'Ⅱ'}</span> {status === 'paused' ? '再開' : '一時停止'}</button>}
          <button onClick={onNext} disabled={!canControl} className="secondary-control" type="button">次の話題 <span aria-hidden="true">→</span></button>
          <button onClick={onContinue} disabled={!canControl} className="secondary-control hidden sm:block" type="button">この話題を続ける</button>
          <button onClick={onStop} disabled={!canControl} className="secondary-control ml-auto" type="button"><span aria-hidden="true">■</span> 終了</button>
        </div>
      </div>
    </section>
  )
}
