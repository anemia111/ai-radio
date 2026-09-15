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
  const [elapsed, setElapsed] = useState(0)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const settingsRef = useRef(settings); const sessionRef = useRef(0); const skipRef = useRef(false); const historyRef = useRef<HistoryLine[]>([])

  const setSettings = useCallback((patch: Partial<RadioSettings>) => setSettingsState((current) => ({ ...current, ...patch })), [])
  useEffect(() => { settingsRef.current = settings; saveSettings(settings); audio.setBgmVolume(settings.bgmVolume, status === 'playing') }, [settings, status])
  useEffect(() => { const update = () => { const found = tts.getVoices(); setVoices(found); if (found.length) setSettingsState((current) => ({ ...current, voiceA: current.voiceA || found[0].voiceURI, voiceB: current.voiceB || found[1]?.voiceURI || found[0].voiceURI })) }; update(); if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', update); return () => window.speechSynthesis?.removeEventListener('voiceschanged', update) }, [])
  useEffect(() => { if (status !== 'playing') return; const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000); return () => window.clearInterval(timer) }, [status])
  useEffect(() => () => { sessionRef.current += 1; tts.cancel(); audio.stop() }, [])

  const playSession = useCallback(async (session: number) => {
    const firstSettings = settingsRef.current
    try {
      setElapsed(0); setHistory([]); historyRef.current = []; setCurrentLine(null); setStatus('generating'); setNotice('最初のセグメントを準備しています…')
      await audio.start(firstSettings.bgmVolume); audio.playJingle(firstSettings.jingleVolume)
      let rssItems: RssItem[] = []
      if (firstSettings.mode === 'news' && firstSettings.rssUrl) {
        try { rssItems = await fetchRss(firstSettings.rssUrl, firstSettings.workerUrl) } catch { setNotice('RSSは取得できませんでした。通常の放送を続けます。') }
      }
      let index = 0
      const makeProvider = () => {
        const current = settingsRef.current
        const primary = current.provider === 'auto' && current.workerUrl ? new WorkerProvider(current.workerUrl) : undefined
        return new ResilientProvider(primary, setNotice)
      }
      let segment: Segment = await makeProvider().generate({ ...firstSettings, history: [], segmentIndex: index, rssItems })
      while (sessionRef.current === session) {
        setProgramTitle(segment.programTitle); setSegmentTitle(segment.segmentTitle); setStatus('buffering')
        const nextIndex = index + 1
        const nextPromise = makeProvider().generate({ ...settingsRef.current, history: historyRef.current.slice(-16), segmentIndex: nextIndex, rssItems })
        setStatus('playing'); setNotice(firstSettings.workerUrl ? 'AI放送中' : 'Demo放送中 — Worker URLを設定するとAIモードになります。')
        for (const line of segment.lines) {
          if (sessionRef.current !== session) break
          if (skipRef.current) { skipRef.current = false; break }
          setCurrentLine(line)
          try { await tts.speak(line.text, { speaker: line.speaker, voiceURI: line.speaker === 'A' ? settingsRef.current.voiceA : settingsRef.current.voiceB, volume: settingsRef.current.djVolume, onStart: () => audio.duck(true), onEnd: () => audio.duck(false) }) }
          catch { setNotice('音声を再生できないため、字幕で放送を続けます。') }
          const item = { ...line, segmentTitle: segment.segmentTitle }; historyRef.current = [...historyRef.current, item].slice(-24); setHistory(historyRef.current)
        }
        if (sessionRef.current !== session) break
        setStatus('generating'); segment = await nextPromise; index = nextIndex; audio.playJingle(settingsRef.current.jingleVolume); setStatus('playing')
      }
    } catch { if (sessionRef.current === session) { setStatus('error'); setNotice('放送を開始できませんでした。もう一度お試しください。') } }
  }, [])

  const start = useCallback(() => {
    const topic = settingsRef.current.topic.trim() || '今夜の気になること'
    setSettingsState((current) => ({ ...current, topic, recentTopics: [topic, ...current.recentTopics.filter((item) => item !== topic)].slice(0, 6) }))
    sessionRef.current += 1; tts.cancel(); void playSession(sessionRef.current)
  }, [playSession])
  const stop = useCallback(() => { sessionRef.current += 1; skipRef.current = false; tts.cancel(); audio.stop(); setStatus('stopped'); setCurrentLine(null); setNotice('放送を終了しました。') }, [])
  const togglePause = useCallback(() => { if (status === 'paused') { tts.resume(); audio.resume(); setStatus('playing') } else if (status === 'playing') { tts.pause(); audio.pause(); setStatus('paused') } }, [status])
  const nextTopic = useCallback(() => { if (status === 'playing' || status === 'paused') { skipRef.current = true; tts.cancel(); setNotice('次の話題を準備しています…') } }, [status])
  const continueTopic = useCallback(() => { setNotice('この話題をもう少し続けます。') }, [])
  const toggleFavorite = useCallback(() => { const topic = settingsRef.current.topic.trim(); if (!topic) return; setSettingsState((current) => ({ ...current, favorites: current.favorites.includes(topic) ? current.favorites.filter((item) => item !== topic) : [topic, ...current.favorites].slice(0, 12) })) }, [])

  return { settings, setSettings, status, currentLine, programTitle, segmentTitle, history, notice, elapsed, voices, start, stop, togglePause, nextTopic, continueTopic, toggleFavorite }
}
