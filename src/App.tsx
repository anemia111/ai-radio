import { useEffect, useRef } from 'react'
import { BroadcastSetup } from './components/BroadcastSetup'
import { RadioConsole } from './components/RadioConsole'
import { SoundSettings } from './components/SoundSettings'
import { Transcript } from './components/Transcript'
import { useRadio } from './hooks/useRadio'
import { registerRadioTools } from './services/webmcp'

export default function App() {
  const radio = useRadio()
  const { setSettings, start, stop } = radio
  const snapshot = useRef({ status: radio.status, programTitle: radio.programTitle, segmentTitle: radio.segmentTitle, currentLine: radio.currentLine })
  useEffect(() => { snapshot.current = { status: radio.status, programTitle: radio.programTitle, segmentTitle: radio.segmentTitle, currentLine: radio.currentLine } }, [radio.currentLine, radio.programTitle, radio.segmentTitle, radio.status])
  const active = ['playing', 'paused', 'generating', 'buffering'].includes(radio.status)
  useEffect(() => registerRadioTools({ configure: (topic, mode, mood) => setSettings({ topic, ...(mode ? { mode } : {}), ...(mood ? { mood } : {}) }), start, stop, next: radio.nextTopic, continue: radio.continueTopic, read: () => ({ status: snapshot.current.status, programTitle: snapshot.current.programTitle, segmentTitle: snapshot.current.segmentTitle, line: snapshot.current.currentLine }) }), [radio.continueTopic, radio.nextTopic, setSettings, start, stop])
  return (
    <main className="min-h-screen bg-ink text-slate-100">
      <header className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-5 lg:px-8">
        <div className="flex items-center gap-3"><span className="brand-mark">AR</span><div><p className="text-sm font-black tracking-[.18em]">AI RADIO</p><p className="font-mono text-[11px] text-slate-500">PERSONAL BROADCAST SYSTEM</p></div></div>
        <div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:block">{radio.notice}</span><span className={`mode-badge ${radio.providerMode === 'ai' ? 'ai' : ''}`}>{radio.providerMode === 'ai' ? 'AI MODE' : 'DEMO MODE'}</span></div>
      </header>
      <div className="mx-auto grid max-w-[1380px] gap-5 px-5 pb-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,.65fr)] lg:px-8">
        <div className="space-y-5"><RadioConsole status={radio.status} line={radio.currentLine} programTitle={radio.programTitle} segmentTitle={radio.segmentTitle} elapsed={radio.elapsed} onStart={radio.start} onStop={radio.stop} onPause={radio.togglePause} onNext={radio.nextTopic} onContinue={radio.continueTopic} onChangeTopic={radio.changeTopic} /><Transcript lines={radio.history} /></div>
        <aside className="space-y-5"><BroadcastSetup settings={radio.settings} onChange={radio.setSettings} onFavorite={radio.toggleFavorite} disabled={active} /><SoundSettings settings={radio.settings} voices={radio.voices} onChange={radio.setSettings} /><section className="station-note"><span aria-hidden="true">◉</span><p><strong>Always available.</strong><br />接続に失敗しても、Demo放送へ自動で切り替わります。</p></section></aside>
      </div>
      <footer className="mx-auto flex max-w-[1380px] flex-col justify-between gap-2 border-t border-white/8 px-5 py-6 text-xs text-slate-600 sm:flex-row lg:px-8"><span>AI RADIO 98.7 — Your frequency, your story.</span><span>Browser Speech • Local Settings • No tracking</span></footer>
    </main>
  )
}
