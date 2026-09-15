import { createDemoSegment } from '../data/demoPrograms'
import type { GenerateInput, Segment } from '../types/radio'

export interface AIProvider { readonly name: string; generate(input: GenerateInput): Promise<Segment> }

export class DemoProvider implements AIProvider {
  readonly name = 'Demo'
  async generate(input: GenerateInput) { await new Promise((resolve) => setTimeout(resolve, 320)); return createDemoSegment(input) }
}

function isSegment(value: unknown): value is Segment {
  if (!value || typeof value !== 'object') return false
  const data = value as Partial<Segment>
  return typeof data.programTitle === 'string' && typeof data.segmentTitle === 'string' && Array.isArray(data.lines)
    && data.lines.length > 0 && data.lines.every((line) => line && (line.speaker === 'A' || line.speaker === 'B') && typeof line.text === 'string')
}

export class WorkerProvider implements AIProvider {
  readonly name = 'AI'
  private readonly endpoint: string
  constructor(endpoint: string) { this.endpoint = endpoint }
  async generate(input: GenerateInput): Promise<Segment> {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 14_000)
    try {
      const url = `${this.endpoint.replace(/\/$/, '')}/api/generate`
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal })
      if (!response.ok) throw new Error(`AI backend returned ${response.status}`)
      const data: unknown = await response.json()
      if (!isSegment(data)) throw new Error('AI response has an invalid shape')
      return data
    } finally { window.clearTimeout(timeout) }
  }
}

export class ResilientProvider implements AIProvider {
  readonly name: string
  private readonly fallback = new DemoProvider()
  private readonly primary?: AIProvider
  private readonly onFallback?: (message: string) => void
  constructor(primary?: AIProvider, onFallback?: (message: string) => void) { this.primary = primary; this.onFallback = onFallback; this.name = primary?.name ?? 'Demo' }
  async generate(input: GenerateInput) {
    if (!this.primary) return this.fallback.generate(input)
    try { return await this.primary.generate(input) }
    catch { this.onFallback?.('AIに接続できなかったため、Demo放送を続けています。'); return this.fallback.generate(input) }
  }
}
