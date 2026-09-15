interface Env { GROQ_API_KEY?: string; GEMINI_API_KEY?: string; AI_PROVIDER?: string; ALLOWED_ORIGINS?: string }
const hits = new Map<string, { count: number; reset: number }>()

function cors(request: Request, env: Env) {
  const origin = request.headers.get('origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const accepted = allowed.includes(origin) ? origin : allowed[0] ?? 'null'
  return { 'access-control-allow-origin': accepted, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' }
}
function json(data: unknown, status: number, headers: HeadersInit) { return new Response(JSON.stringify(data), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } }) }
function rateLimited(request: Request) { const key = request.headers.get('cf-connecting-ip') ?? 'local'; const now = Date.now(); const entry = hits.get(key); if (!entry || entry.reset < now) { hits.set(key, { count: 1, reset: now + 60_000 }); return false } entry.count += 1; return entry.count > 20 }
function cleanText(value: unknown, max: number) { return typeof value === 'string' ? value.replace(/[<>]/g, '').trim().slice(0, max) : '' }
function parseModelJson(text: string) { const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); const first = cleaned.indexOf('{'); const last = cleaned.lastIndexOf('}'); return JSON.parse(cleaned.slice(first, last + 1)) }
function validSegment(value: unknown) { const item = value as { programTitle?: unknown; segmentTitle?: unknown; mood?: unknown; lines?: Array<{ speaker?: unknown; text?: unknown }> }; return item && typeof item.programTitle === 'string' && typeof item.segmentTitle === 'string' && Array.isArray(item.lines) && item.lines.length >= 2 && item.lines.every((line) => (line.speaker === 'A' || line.speaker === 'B') && typeof line.text === 'string') }

async function generate(request: Request, env: Env, headers: HeadersInit) {
  if (rateLimited(request)) return json({ error: 'rate_limited' }, 429, headers)
  const raw = await request.json().catch(() => null) as Record<string, unknown> | null
  const topic = cleanText(raw?.topic, 300); if (!topic) return json({ error: 'topic_required' }, 400, headers)
  const mode = cleanText(raw?.mode, 40) || 'free-talk'; const mood = cleanText(raw?.mood, 40) || 'relaxed'; const history = Array.isArray(raw?.history) ? raw.history.slice(-16) : []
  const prompt = `あなたは日本語FMラジオの構成作家です。テーマ「${topic}」、モード「${mode}」、雰囲気「${mood}」で、20〜60秒の自然な2人会話を作成。Aは冷静で知識豊富、Bは明るく質問と軽い冗談。重複や長話を避け、直前の文脈を引き継ぐ。JSON以外は出力禁止。形式: {"programTitle":"...","segmentTitle":"...","mood":"...","lines":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]}。直前の会話: ${JSON.stringify(history)}`
  let text = ''
  if ((env.AI_PROVIDER ?? 'groq') === 'gemini' && env.GEMINI_API_KEY) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: .8 } }) })
    if (!response.ok) return json({ error: 'provider_error' }, 502, headers); const result = await response.json() as any; text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } else if (env.GROQ_API_KEY) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${env.GROQ_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', response_format: { type: 'json_object' }, temperature: .8, messages: [{ role: 'system', content: 'Return valid JSON only.' }, { role: 'user', content: prompt }] }) })
    if (!response.ok) return json({ error: 'provider_error' }, 502, headers); const result = await response.json() as any; text = result.choices?.[0]?.message?.content ?? ''
  } else return json({ error: 'provider_secret_missing' }, 503, headers)
  try { const output = parseModelJson(text); return validSegment(output) ? json(output, 200, headers) : json({ error: 'invalid_model_output' }, 502, headers) } catch { return json({ error: 'invalid_json' }, 502, headers) }
}

async function rss(request: Request, env: Env, headers: HeadersInit) {
  const target = new URL(request.url).searchParams.get('url') ?? ''; let parsed: URL
  try { parsed = new URL(target); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error() } catch { return json({ error: 'invalid_url' }, 400, headers) }
  const response = await fetch(parsed.toString(), { headers: { 'user-agent': 'AI-Radio-RSS/1.0' } }); if (!response.ok) return json({ error: 'rss_unavailable' }, 502, headers)
  const xml = (await response.text()).slice(0, 500_000); const blocks = [...xml.matchAll(/<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 8)
  const read = (block: string, tag: string) => block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'))?.[1]?.replace(/<[^>]+>/g, '').trim()
  return json({ items: blocks.map((match) => ({ title: read(match[1], 'title') ?? '無題', summary: (read(match[1], 'description') ?? read(match[1], 'summary') ?? '').slice(0, 500), url: read(match[1], 'link'), publishedAt: read(match[1], 'pubDate') ?? read(match[1], 'published') })) }, 200, headers)
}

export default { async fetch(request: Request, env: Env) { const headers = cors(request, env); const origin = request.headers.get('origin') ?? ''; const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()); if (origin && !allowed.includes(origin)) return json({ error: 'origin_not_allowed' }, 403, headers); if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers }); const url = new URL(request.url); if (request.method === 'POST' && url.pathname === '/api/generate') return generate(request, env, headers); if (request.method === 'GET' && url.pathname === '/api/rss') return rss(request, env, headers); return json({ name: 'AI RADIO Worker', status: 'ok' }, 200, headers) } }
