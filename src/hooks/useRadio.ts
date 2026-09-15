import { useCallback, useEffect, useRef, useState } from 'react'
import { ResilientProvider, WorkerProvider } from '../providers/AIProvider'
import { BrowserSpeechProvider } from '../providers/TTSProvider'
import { AudioEngine } from '../services/AudioEngine'
import { loadSettings, saveSettings } from '../services/storage'
import { fetchRss } from '../services/rss'
import type { HistoryLine, Line, RadioSettings, RadioStatus, RssItem, Segment } from '../types/radio'

const tts = new BrowserSpeechProvider()
const audio = new AudioEngine()

export function useRadio() {
  const [settings, setSettingsState] = useState(loadSettings)
  const [status, setStatus] = useState<RadioStatus>('idle')
  const [currentLine, setCurrentLine] = useState<Line | null>(null)
  const [programTitle, setProgramTitle] = useState('YOUR NIGHT FREQUENCY')
  const [segmentTitle, setSegmentTitle] = useState('放送を待っています')
  const [history, setHistory] = useState<HistoryLine[]>([])
  const [notice, setNotice] = useState('APIキー不要ですぐに試せます。')
  const [providerMode, setProviderMode] = useState<'demo' | 'ai'>('demo')
  const [elapsed, setElapsed] = useState(0)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const settingsRef = useRef(settings); const sessionRef = useRef(0); const commandRef = useRef<'continue' | 'next' | null>(null); const historyRef = useRef<HistoryLine[]>([])

  const setSettings = useCallback((patch: Partial<RadioSettings>) => setSettingsState((current) => ({ ...current, ...patch })), [])
  useEffect(() => { settingsRef.current = settings; saveSettings(settings); audio.setBgmVolume(settings.bgmVolume, status === 'playing') }, [settings, status])
  useEffect(() => { const update = () => { const found = tts.getVoices(); setVoices(found); if (found.length) setSettingsState((current) => ({ ...current, voiceA: current.voiceA || found[0].voiceURI, voiceB: current.voiceB || found[1]?.voiceURI || found[0].voiceURI })) }; update(); if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', update); return () => window.speechSynthesis?.removeEventListener('voiceschanged', update) }, [])
  useEffect(() => { if (status !== 'playing') return; const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(timer) }, [status])
  useEffect(() => () => { sessionRef.current += 1; tts.cancel(); audio.stop() }, [])

  const playSession = useCallback(async (session: number) => {
    const firstSettings = settingsRef.current
    try {
      setElapsed(0); setHistory([]); historyRef.current = []; setCurrentLine(null); setStatus('generating'); setNotice('最初のセグメントを準備しています…')
      await audio.start(firstSettings.bgmVolume, import.meta.env.BASE_URL); audio.playJingle(firstSettings.jingleVolume)
      let rssItems: RssItem[] = []
      if (firstSettings.mode === 'news' && firstSettings.rssUrl) {
        try { rssItems = await fetchRss(firstSettings.rssUrl, firstSettings.workerUrl) } catch { setNotice('RSSは取得できませんでした。通常の放送を続けます。') }
      }
      let index = 0
      const makeProvider = (events = { onPrimary: () => setProviderMode('ai' as const), onFallback: (message: string) => { setProviderMode('demo' as const); setNotice(message) } }) => {
        const current = settingsRef.current
        const primary = current.provider === 'auto' && current.workerUrl ? new WorkerProvider(current.workerUrl) : undefined
        return new ResilientProvider(primary, events)
      }
      let segment: Segment = await makeProvider().generate({ ...firstSettings, history: [], segmentIndex: index, rssItems })
      if (sessionRef.current === session) {
        try { await tts.speak('AI RADIO 98.7。あなたのための放送を始めます。', { speaker: 'A', voiceURI: settingsRef.current.voiceA, volume: settingsRef.current.jingleVolume, onStart: () => audio.duck(true), onEnd: () => audio.duck(false) }) } catch { /* tone jingle remains available */ }
      }
      while (sessionRef.current === session) {
        setProgramTitle(segment.programTitle); setSegmentTitle(segment.segmentTitle); setStatus('buffering')
        const nextIndex = index + 1
        const nextController = new AbortController(); let nextMode: 'demo' | 'ai' | undefined; let nextNotice = ''
        const nextPromise = makeProvider({ onPrimary: () => { nextMode = 'ai' }, onFallback: (message) => { nextMode = 'demo'; nextNotice = message } }).generate({ ...settingsRef.current, history: historyRef.current.slice(-16), segmentIndex: nextIndex, rssItems, direction: 'next' }, nextController.signal)
        setStatus('playing'); if (!settingsRef.current.workerUrl) { setProviderMode('demo'); setNotice('Demo放送中 — Worker URLを設定するとAIモードになります。') }
        for (const line of segment.lines) {
          if (sessionRef.current !== session) break
          if (commandRef.current) break
          setCurrentLine(line)
          try { await tts.speak(line.text, { speaker: line.speaker, voiceURI: line.speaker === 'A' ? settingsRef.current.voiceA : settingsRef.current.voiceB, volume: settingsRef.current.djVolume, onStart: () => audio.duck(true), onEnd: () => audio.duck(false) }) }
          catch { setNotice('音声を再生できないため、字幕で放送を続けます。') }
          const item = { ...line, segmentTitle: segment.segmentTitle }; historyRef.current = [...historyRef.current, item].slice(-24); setHistory(historyRef.current)
        }
        if (sessionRef.current !== session) { nextController.abort(); void nextPromise.catch(() => undefined); break }
        const command = commandRef.current; commandRef.current = null; setStatus('generating')
        if (command) {
          nextController.abort(); await nextPromise.catch(() => undefined)
          segment = await makeProvider().generate({ ...settingsRef.current, history: historyRef.current.slice(-16), segmentIndex: nextIndex, rssItems, direction: command })
        } else { segment = await nextPromise; if (nextMode) setProviderMode(nextMode); if (nextNotice) setNotice(nextNotice) }
        index = nextIndex; audio.playJingle(settingsRef.current.jingleVolume); setStatus('playing')
      }
    } catch { if (sessionRef.current === session) { setStatus('error'); setNotice('放送を開始できませんでした。もう一度お試しください。') } }
  }, [])

  const start = useCallback(() => {
    const topic = settingsRef.current.topic.trim() || '今夜の気になること'
    setSettingsState((current) => ({ ...current, topic, recentTopics: [topic, ...current.recentTopics.filter((item) => item !== topic)].slice(0, 6) }))
    sessionRef.current += 1; commandRef.current = null; tts.cancel(); void playSession(sessionRef.current)
  }, [playSession])
  const stop = useCallback(() => { sessionRef.current += 1; commandRef.current = null; tts.cancel(); audio.stop(); setStatus('stopped'); setCurrentLine(null); setNotice('放送を終了しました。') }, [])
  const togglePause = useCallback(() => { if (status === 'paused') { tts.resume(); audio.resume(); setStatus('playing') } else if (status === 'playing') { tts.pause(); audio.pause(); setStatus('paused') } }, [status])
  const requestDirection = useCallback((direction: 'continue' | 'next') => { if (status === 'playing' || status === 'paused') { if (status === 'paused') { tts.resume(); audio.resume() }; commandRef.current = direction; tts.cancel(); setStatus('generating'); setNotice(direction === 'continue' ? 'この話題をもう少し掘り下げます…' : '次の話題を準備しています…') } }, [status])
  const nextTopic = useCallback(() => requestDirection('next'), [requestDirection])
  const continueTopic = useCallback(() => requestDirection('continue'), [requestDirection])
  const changeTopic = useCallback(() => { stop(); setStatus('idle'); setSegmentTitle('新しいテーマを入力してください'); setNotice('テーマを変更して、新しい放送を始められます。'); window.setTimeout(() => document.getElementById('topic')?.focus(), 0) }, [stop])
  const toggleFavorite = useCallback(() => { const topic = settingsRef.current.topic.trim(); if (!topic) return; setSettingsState((current) => ({ ...current, favorites: current.favorites.includes(topic) ? current.favorites.filter((item) => item !== topic) : [topic, ...current.favorites].slice(0, 12) })) }, [])

  return { settings, setSettings, status, currentLine, programTitle, segmentTitle, history, notice, providerMode, elapsed, voices, start, stop, togglePause, nextTopic, continueTopic, changeTopic, toggleFavorite }
}
