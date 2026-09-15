import { describe, expect, it } from 'vitest'
import { normalizeSegment, parseModelJson, readJsonBody, validateGenerateInput } from './schema'

describe('Worker schemas', () => {
  it('accepts a valid radio request and bounds talk balance', () => { const result = validateGenerateInput({ topic: 'F1', mode: 'f1', mood: 'relaxed', talkBalance: 999 }); expect(result.topic).toBe('F1'); expect(result.talkBalance).toBe(100) })
  it('rejects oversized history text', () => { expect(() => validateGenerateInput({ topic: 'F1', mode: 'f1', mood: 'relaxed', history: [{ speaker: 'A', text: 'x'.repeat(501) }] })).toThrow('invalid_input') })
  it('repairs trailing commas and strips extra fields', () => { const parsed = parseModelJson('```json\n{"programTitle":"P","segmentTitle":"S","mood":"calm","extra":"drop","lines":[{"speaker":"A","text":"a"},{"speaker":"B","text":"b"},],}\n```'); expect(normalizeSegment(parsed)).toEqual({ programTitle: 'P', segmentTitle: 'S', mood: 'calm', lines: [{ speaker: 'A', text: 'a' }, { speaker: 'B', text: 'b' }] }) })
  it('rejects oversized model speech', () => { expect(() => normalizeSegment({ programTitle: 'P', segmentTitle: 'S', mood: 'calm', lines: [{ speaker: 'A', text: 'x'.repeat(401) }, { speaker: 'B', text: 'b' }] })).toThrow('invalid_input') })
  it('rejects a streamed request as soon as it exceeds the byte limit', async () => {
    const request = new Request('https://worker.example/api/generate', { method: 'POST', body: JSON.stringify({ topic: 'x'.repeat(32_100) }) })
    await expect(readJsonBody(request)).rejects.toThrow('request_too_large')
  })
})
