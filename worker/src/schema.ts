import type { GenerateInput, HistoryLine, RssItem, Segment, Speaker } from './types'

const MODES = new Set(['free-talk', 'late-night', 'news', 'f1', 'sports', 'game', 'anime', 'technology', 'study', 'relax', 'custom'])
const MOODS = new Set(['bright', 'calm', 'midnight', 'serious', 'relaxed', 'energetic'])
const DIRECTIONS = new Set(['continue', 'next', 'fresh'])
const MAX_REQUEST_BYTES = 32_000

function requiredString(value: unknown, max: number) { if (typeof value !== 'string') throw new Error('invalid_input'); const result = value.trim(); if (!result || result.length > max) throw new Error('invalid_input'); return result }
function optionalString(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : undefined }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_input'); return value as Record<string, unknown> }

export async function readJsonBody(request: Request) {
  const declared = Number(request.headers.get('content-length') ?? 0); if (declared > MAX_REQUEST_BYTES) throw new Error('request_too_large')
  if (!request.body) throw new Error('invalid_json')
  const reader = request.body.getReader(); const decoder = new TextDecoder(); let total = 0; let text = ''
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_REQUEST_BYTES) { await reader.cancel(); throw new Error('request_too_large') }; text += decoder.decode(value, { stream: true }) }
  text += decoder.decode()
  try { return JSON.parse(text) as unknown } catch { throw new Error('invalid_json') }
}

export function validateGenerateInput(value: unknown): GenerateInput {
  const input = record(value); const topic = requiredString(input.topic, 300)
  const mode = requiredString(input.mode ?? 'free-talk', 40); const mood = requiredString(input.mood ?? 'relaxed', 40)
  if (!MODES.has(mode) || !MOODS.has(mood)) throw new Error('invalid_input')
  const history: HistoryLine[] = Array.isArray(input.history) ? input.history.slice(-16).map((item) => { const line = record(item); const speaker = line.speaker; if (speaker !== 'A' && speaker !== 'B') throw new Error('invalid_input'); return { speaker, text: requiredString(line.text, 500), segmentTitle: optionalString(line.segmentTitle, 120) } }) : []
  const rssItems: RssItem[] = Array.isArray(input.rssItems) ? input.rssItems.slice(0, 8).map((item) => { const rss = record(item); return { title: requiredString(rss.title, 160), summary: optionalString(rss.summary, 500), url: optionalString(rss.url, 2048), publishedAt: optionalString(rss.publishedAt, 80) } }) : []
  const segmentIndex = Number.isInteger(input.segmentIndex) && Number(input.segmentIndex) >= 0 && Number(input.segmentIndex) <= 10_000 ? Number(input.segmentIndex) : 0
  const talkBalance = typeof input.talkBalance === 'number' && Number.isFinite(input.talkBalance) ? Math.max(-100, Math.min(100, input.talkBalance)) : 0
  const direction = typeof input.direction === 'string' && DIRECTIONS.has(input.direction) ? input.direction as GenerateInput['direction'] : 'fresh'
  return { topic, mode, mood, history, rssItems, segmentIndex, talkBalance, direction }
}

export function parseModelJson(text: string) {
  const cleaned = text.slice(0, 16_000).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const first = cleaned.indexOf('{'); const last = cleaned.lastIndexOf('}'); if (first < 0 || last <= first) throw new Error('invalid_model_json')
  const candidate = cleaned.slice(first, last + 1).replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(candidate) as unknown
}

export function normalizeSegment(value: unknown): Segment {
  const input = record(value); const rawLines = input.lines
  if (!Array.isArray(rawLines) || rawLines.length < 2 || rawLines.length > 12) throw new Error('invalid_model_output')
  const lines = rawLines.map((item) => { const line = record(item); if (line.speaker !== 'A' && line.speaker !== 'B') throw new Error('invalid_model_output'); return { speaker: line.speaker as Speaker, text: requiredString(line.text, 400) } })
  return { programTitle: requiredString(input.programTitle, 100), segmentTitle: requiredString(input.segmentTitle, 120), mood: requiredString(input.mood, 40), lines }
}
