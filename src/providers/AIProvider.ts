import { createDemoSegment } from '../data/demoPrograms'
import type { GenerateInput, Segment } from '../types/radio'

export interface AIProvider { readonly name: string; generate(input: GenerateInput, signal?: AbortSignal): Promise<Segment> }
export interface ProviderEvents { onFallback?: (message: string) => void; onPrimary?: () => void }

export class DemoProvider implements AIProvider {
  readonly name = 'Demo'
  async generate(input: GenerateInput, signal?: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, 320)
      signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
    })
    return createDemoSegment(input)
  }
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
  async generate(input: GenerateInput, signal?: AbortSignal): Promise<Segment> {
    const url = `${this.endpoint.replace(/\/$/, '')}/api/generate`
    let lastError: Error = new Error('AI backend unavailable')
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 14_000)
      const abort = () => controller.abort()
      signal?.addEventListener('abort', abort, { once: true })
      let retryable = true
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal })
        if (!response.ok) { retryable = response.status >= 500; throw new Error(`AI backend returned ${response.status}`) }
        const data: unknown = await response.json()
        if (!isSegment(data)) throw new Error('AI response has an invalid shape')
        return data
      } catch (error) {
        lastError = error instanceof Error ? error : lastError
        if (signal?.aborted || !retryable || attempt > 0) break
        await new Promise((resolve) => window.setTimeout(resolve, 650))
      } finally { window.clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
    }
    throw lastError
  }
}

export class ResilientProvider implements AIProvider {
  readonly name: string
  private readonly fallback = new DemoProvider()
  private readonly primary?: AIProvider
  private readonly events: ProviderEvents
  constructor(primary?: AIProvider, events: ProviderEvents = {}) { this.primary = primary; this.events = events; this.name = primary?.name ?? 'Demo' }
  async generate(input: GenerateInput, signal?: AbortSignal) {
    if (!this.primary) return this.fallback.generate(input, signal)
    try { const segment = await this.primary.generate(input, signal); this.events.onPrimary?.(); return segment }
    catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) throw error
      this.events.onFallback?.('AIに接続できなかったため、Demo放送へ切り替えました。')
      return this.fallback.generate(input, signal)
    }
  }
}
