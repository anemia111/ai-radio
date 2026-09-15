import { describe, expect, it } from 'vitest'
import { createDemoSegment } from './demoPrograms'
import type { GenerateInput } from '../types/radio'

const base: GenerateInput = { topic: 'F1について', mode: 'f1', mood: 'relaxed', history: [], segmentIndex: 0, talkBalance: 0 }

describe('createDemoSegment', () => {
  it('keeps balanced talk distribution balanced', () => { const speakers = createDemoSegment(base).lines.map((line) => line.speaker); expect(speakers.filter((item) => item === 'A')).toHaveLength(2); expect(speakers.filter((item) => item === 'B')).toHaveLength(2) })
  it('honors DJ balance controls', () => { expect(createDemoSegment({ ...base, talkBalance: -50 }).lines.filter((line) => line.speaker === 'A').length).toBeGreaterThan(2); expect(createDemoSegment({ ...base, talkBalance: 50 }).lines.filter((line) => line.speaker === 'B').length).toBeGreaterThan(2) })
  it('turns RSS metadata into a news segment without copying full articles', () => { const segment = createDemoSegment({ ...base, mode: 'news', rssItems: [{ title: '新しい発表', summary: '概要だけを使います' }] }); expect(segment.programTitle).toContain('NEWS'); expect(segment.lines.map((line) => line.text).join(' ')).toContain('新しい発表') })
  it('keeps an arbitrary listener request at the center of the demo dialogue', () => { const topic = '週末に作るスパイスカレーのおすすめを聞きたい'; const text = createDemoSegment({ ...base, topic, mode: 'free-talk' }).lines.map((line) => line.text).join(' '); expect(text).toContain(topic); expect(text.match(/スパイスカレー/g)?.length).toBeGreaterThanOrEqual(2) })
})
