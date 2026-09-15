export type Speaker = 'A' | 'B'
export type RadioStatus = 'idle' | 'generating' | 'buffering' | 'playing' | 'paused' | 'stopped' | 'error'

export interface Line { speaker: Speaker; text: string }
export interface Segment { programTitle: string; segmentTitle: string; mood: string; lines: Line[] }
export interface HistoryLine extends Line { segmentTitle: string }

export interface GenerateInput {
  topic: string
  mode: string
  mood: string
  history: HistoryLine[]
  segmentIndex: number
  talkBalance: number
  rssItems?: RssItem[]
}

export interface RssItem { title: string; summary?: string; url?: string; publishedAt?: string }

export interface RadioSettings {
  topic: string
  mode: string
  mood: string
  voiceA: string
  voiceB: string
  djVolume: number
  bgmVolume: number
  jingleVolume: number
  talkBalance: number
  workerUrl: string
  provider: 'auto' | 'demo'
  rssUrl: string
  recentTopics: string[]
  favorites: string[]
}

export const defaultSettings: RadioSettings = {
  topic: 'F1について、ゆるく話して', mode: 'free-talk', mood: 'relaxed', voiceA: '', voiceB: '',
  djVolume: 0.9, bgmVolume: 0.22, jingleVolume: 0.45, talkBalance: 0, workerUrl: '', provider: 'auto',
  rssUrl: '', recentTopics: [], favorites: [],
}
