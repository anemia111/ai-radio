import type { RadioSettings } from '../types/radio'

const modes = [['free-talk', 'フリートーク'], ['late-night', '深夜ラジオ'], ['news', 'ニュース'], ['f1', 'F1'], ['sports', 'スポーツ'], ['game', 'ゲーム'], ['anime', 'アニメ'], ['technology', 'テクノロジー'], ['study', '勉強'], ['relax', 'リラックス'], ['custom', 'カスタム']]
const moods = [['bright', '明るい'], ['calm', '落ち着いた'], ['midnight', '深夜ラジオ'], ['serious', '真面目'], ['relaxed', 'ゆるい'], ['energetic', 'テンション高め']]

interface Props { settings: RadioSettings; onChange: (patch: Partial<RadioSettings>) => void; onFavorite: () => void; disabled: boolean }

export function BroadcastSetup({ settings, onChange, onFavorite, disabled }: Props) {
  return (
    <section className="panel rounded-[24px] p-5 sm:p-6">
      <p className="eyebrow">BROADCAST REQUEST</p>
      <div className="mt-5 flex items-center justify-between gap-3"><label className="block text-sm font-bold" htmlFor="topic">今夜、何を聴きますか？</label><button onClick={onFavorite} className="text-sm text-slate-400 hover:text-signal" type="button" aria-label="このテーマをお気に入りに追加">{settings.favorites.includes(settings.topic) ? '★' : '☆'} お気に入り</button></div>
      <textarea id="topic" disabled={disabled} className="mt-3 min-h-28 w-full resize-none rounded-xl border border-white/10 bg-black/25 p-4 text-base leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-signal/60 disabled:opacity-60" value={settings.topic} onChange={(event) => onChange({ topic: event.target.value })} maxLength={300} placeholder="例：F1について、ゆるく話して" />
      <p className="mt-2 text-xs leading-5 text-slate-500">ここに書いた依頼を、話題・モード・雰囲気より最優先します。</p>
      <div className="mt-4 grid grid-cols-2 gap-3"><label className="field-label">番組モード<select value={settings.mode} onChange={(event) => onChange({ mode: event.target.value })} className="field-select">{modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">雰囲気<select value={settings.mood} onChange={(event) => onChange({ mood: event.target.value })} className="field-select">{moods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {settings.recentTopics.length > 0 && <div className="mt-5"><p className="text-xs font-bold text-slate-500">最近のテーマ</p><div className="mt-2 flex flex-wrap gap-2">{settings.recentTopics.slice(0, 3).map((topic) => <button key={topic} onClick={() => onChange({ topic })} type="button" className="chip">{topic}</button>)}</div></div>}
    </section>
  )
}
