interface ModelTool { name: string; title?: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute(input: unknown): unknown | Promise<unknown> }
interface ModelContextLike { registerTool(tool: ModelTool, options?: { signal?: AbortSignal }): void | Promise<void> }

export function registerRadioTools(actions: { configure: (topic: string, mode?: string, mood?: string) => void; start: () => void; stop: () => void; read: () => object }) {
  const context = (document as Document & { modelContext?: ModelContextLike }).modelContext
  if (!context?.registerTool) return () => undefined
  const lifecycle = new AbortController()
  const tools: ModelTool[] = [
    { name: 'configure_broadcast', title: '放送内容を設定', description: 'AI RADIOのテーマ、番組モード、雰囲気を設定します。放送はまだ開始しません。', inputSchema: { type: 'object', properties: { topic: { type: 'string', minLength: 1, maxLength: 300 }, mode: { type: 'string' }, mood: { type: 'string' } }, required: ['topic'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) { const value = input as { topic?: unknown; mode?: unknown; mood?: unknown }; if (typeof value.topic !== 'string' || !value.topic.trim() || value.topic.length > 300) throw new Error('topic must be 1–300 characters'); actions.configure(value.topic.trim(), typeof value.mode === 'string' ? value.mode : undefined, typeof value.mood === 'string' ? value.mood : undefined); return { configured: true, topic: value.topic.trim() } } },
    { name: 'start_broadcast', title: '放送を開始', description: '現在設定されているテーマでAI RADIOの放送を開始します。音声とBGMが再生されます。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute() { actions.start(); return { started: true } } },
    { name: 'stop_broadcast', title: '放送を終了', description: '現在のAI RADIO放送、音声、BGMを停止します。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute() { actions.stop(); return { stopped: true } } },
    { name: 'read_broadcast_status', title: '放送状態を確認', description: '現在の番組、コーナー、DJの発言と状態を読み取ります。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute() { return actions.read() } },
  ]
  tools.forEach((tool) => { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined) } catch { /* unsupported implementation */ } })
  return () => lifecycle.abort()
}
