import type { RadioSettings } from '../types/radio'

interface Props { settings: RadioSettings; voices: SpeechSynthesisVoice[]; onChange: (patch: Partial<RadioSettings>) => void; onPreview: (speaker: 'A' | 'B') => void; disabled: boolean }
const label = (voice: SpeechSynthesisVoice) => `${voice.name} (${voice.lang})${!voice.localService || /natural|neural|online|premium/i.test(voice.name) ? '・高品質' : ''}`

export function SoundSettings({ settings, voices, onChange, onPreview, disabled }: Props) {
  return (
    <details className="panel group rounded-[24px] p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between"><span className="eyebrow">SOUND & CONNECTION</span><span className="text-slate-500 transition group-open:rotate-45">＋</span></summary>
      <div className="mt-5 space-y-5 border-t border-white/8 pt-5">
        <VoiceField speaker="A" value={settings.voiceA} voices={voices} onChange={(voiceA) => onChange({ voiceA })} onPreview={() => onPreview('A')} disabled={disabled} />
        <VoiceField speaker="B" value={settings.voiceB} voices={voices} onChange={(voiceB) => onChange({ voiceB })} onPreview={() => onPreview('B')} disabled={disabled} />
        <p className="text-xs leading-5 text-slate-500">「自動」は利用できる日本語音声のうち、自然・オンライン・高品質な候補を優先します。</p>
        <Range label="DJ音量" value={settings.djVolume} onChange={(djVolume) => onChange({ djVolume })} />
        <Range label="BGM音量" value={settings.bgmVolume} onChange={(bgmVolume) => onChange({ bgmVolume })} />
        <Range label="ジングル音量" value={settings.jingleVolume} onChange={(jingleVolume) => onChange({ jingleVolume })} />
        <div><p className="field-label">トーク配分</p><div className="mt-2 grid grid-cols-3 gap-2"><button className={`option-button ${settings.talkBalance < -10 ? 'active' : ''}`} onClick={() => onChange({ talkBalance: -50 })} type="button">A 多め</button><button className={`option-button ${Math.abs(settings.talkBalance) <= 10 ? 'active' : ''}`} onClick={() => onChange({ talkBalance: 0 })} type="button">均等</button><button className={`option-button ${settings.talkBalance > 10 ? 'active' : ''}`} onClick={() => onChange({ talkBalance: 50 })} type="button">B 多め</button></div></div>
        <label className="field-label">Cloudflare Worker URL<input className="field-input" value={settings.workerUrl} onChange={(event) => onChange({ workerUrl: event.target.value.trim() })} inputMode="url" placeholder="https://ai-radio-worker.example.workers.dev" /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">空欄ならDemo Mode。APIキーはここに入力しません。</span></label>
        <label className="field-label">ニュース用 RSS URL<input className="field-input" value={settings.rssUrl} onChange={(event) => onChange({ rssUrl: event.target.value.trim() })} inputMode="url" placeholder="https://feeds.bbci.co.uk/japanese/rss.xml" /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">標準はBBC NEWS JAPAN。各セグメントで最新情報を取り直します。</span></label>
      </div>
    </details>
  )
}

function VoiceField({ speaker, value, voices, onChange, onPreview, disabled }: { speaker: 'A' | 'B'; value: string; voices: SpeechSynthesisVoice[]; onChange: (value: string) => void; onPreview: () => void; disabled: boolean }) {
  return <div><label className="field-label" htmlFor={`voice-${speaker}`}>DJ {speaker} の声</label><div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><select id={`voice-${speaker}`} className="field-select mt-0" value={value} onChange={(event) => onChange(event.target.value)}><option value="">自動（自然な声を優先）</option>{voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{label(voice)}</option>)}</select><button className="option-button px-4" type="button" disabled={disabled} onClick={onPreview}>試聴</button></div></div>
}

function Range({ label: text, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="field-label"><span className="flex justify-between"><span>{text}</span><span className="font-mono text-slate-500">{Math.round(value * 100)}%</span></span><input className="volume-range mt-2 w-full" type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}
