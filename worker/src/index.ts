import { createAIBackend } from './providers'
import { fetchPublicFeed } from './security'
import { normalizeSegment, parseModelJson, readJsonBody, validateGenerateInput } from './schema'
import type { Env, GenerateInput, Segment } from './types'

const localHits = new Map<string, { count: number; reset: number }>()

function allowedOrigins(env: Env) { return (env.ALLOWED_ORIGINS ?? '').split(',').map((item) => item.trim()).filter(Boolean) }
function cors(request: Request, env: Env) { const origin = request.headers.get('origin') ?? ''; return { 'access-control-allow-origin': allowedOrigins(env).includes(origin) ? origin : 'null', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin', 'x-content-type-options': 'nosniff' } }
function json(data: unknown, status: number, headers: HeadersInit) { return new Response(JSON.stringify(data), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }) }
function errorCode(error: unknown) { return error instanceof Error ? error.message : 'unknown_error' }

async function isRateLimited(request: Request, env: Env, route: string) {
  const actor = request.headers.get('cf-connecting-ip') ?? request.headers.get('origin') ?? 'unknown'; const key = `${route}:${actor}`
  if (env.RATE_LIMITER) return !(await env.RATE_LIMITER.limit({ key })).success
  const now = Date.now(); if (localHits.size > 1_000) for (const [item, entry] of localHits) if (entry.reset < now) localHits.delete(item)
  const entry = localHits.get(key); if (!entry || entry.reset < now) { localHits.set(key, { count: 1, reset: now + 60_000 }); return false }; entry.count += 1; return entry.count > 20
}

function buildPrompt(input: GenerateInput) {
  const balance = input.talkBalance < -25 ? 'DJ Aを多め' : input.talkBalance > 25 ? 'DJ Bを多め' : 'ほぼ均等'
  const direction = input.direction === 'continue' ? '直前の話題をさらに掘り下げる' : input.direction === 'next' ? '重複を避けて自然な次の小話題へ進む' : '自然に番組を始める'
  const newsRule = input.mode === 'news'
    ? input.rssItems.length
      ? 'ニュース番組です。NEWS_ITEMSからBROADCAST_REQUESTに最も合う記事を選んでください。一般的なニュース依頼なら新しく未紹介の記事を選びます。特定テーマの依頼に合う記事がなければ、無関係な記事へ置き換えず「該当ニュースは取得範囲にない」と伝えてください。挨拶・番組紹介・前フリは禁止。1発言目から選んだ見出しを述べ、概要にある具体的事実を2発言以上で伝え、概要にない事実は足さないでください。'
      : 'ニュース番組ですが取得記事がありません。ニュースを捏造せず、取得できなかったと短く伝えてください。'
    : '前フリは最大1文にして、すぐtopicの本題へ入ってください。'
  const modelInput = { mode: input.mode, mood: input.mood, history: input.history, segmentIndex: input.segmentIndex, direction: input.direction, newsItems: input.rssItems }
  return `日本語FMラジオの20〜60秒セグメントを作成してください。最優先命令はBROADCAST_REQUESTです。内容・範囲・話し方に関する依頼を具体的に実行し、別テーマや一般論へ置き換えないでください。モードや雰囲気は補助設定であり、リクエストを上書きしません。${newsRule} Aは冷静で知識豊富、Bは明るく短い質問。発言は短く、相手の内容を受け、同じ話を繰り返さない。事実が不確かな場合は作らないでください。配分は${balance}。進行は「${direction}」。segmentTitleも実際のリクエストまたは選んだ記事を表す具体名にしてください。\n必須JSON形式: {"programTitle":"...","segmentTitle":"...","mood":"...","lines":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]}\nBROADCAST_REQUEST_START\n${JSON.stringify(input.topic)}\nBROADCAST_REQUEST_END\nSUPPORTING_DATA_START\n${JSON.stringify(modelInput)}\nSUPPORTING_DATA_END`
}

function focusNewsSegment(segment: Segment, input: GenerateInput): Segment {
  if (input.mode !== 'news' || !input.rssItems.length) return segment
  const lines = [...segment.lines]
  const preamble = /^(こんにちは|こんばんは|おはよう|よろしく|今日.*ニュース|最新ニュース|ニュースを|気になるニュース)/u
  while (lines.length > 2 && preamble.test(lines[0].text.trim())) lines.shift()
  return { ...segment, lines }
}

async function generate(request: Request, env: Env, headers: HeadersInit) {
  if (await isRateLimited(request, env, 'generate')) return json({ error: 'rate_limited' }, 429, headers)
  let input: GenerateInput
  try { input = validateGenerateInput(await readJsonBody(request)) } catch (error) { const code = errorCode(error); return json({ error: code }, code === 'request_too_large' ? 413 : 400, headers) }
  try {
    const backend = createAIBackend(env); const prompt = buildPrompt(input); let raw = await backend.generate(prompt); let segment: Segment
    try { segment = normalizeSegment(parseModelJson(raw)) } catch { raw = await backend.generate(prompt, raw); segment = normalizeSegment(parseModelJson(raw)) }
    return json(focusNewsSegment(segment, input), 200, headers)
  } catch (error) { return json({ error: errorCode(error) }, errorCode(error) === 'provider_secret_missing' ? 503 : 502, headers) }
}

function decodeXml(value: string) { return value.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'") }
function rssItems(xml: string) {
  const blocks = [...xml.matchAll(/<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].slice(0, 8)
  const read = (block: string, tag: string) => { const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return match?.[1] ? decodeXml(match[1]).replace(/<[^>]+>/g, '').trim() : undefined }
  return blocks.map((match) => ({ title: (read(match[1], 'title') ?? '無題').slice(0, 160), summary: (read(match[1], 'description') ?? read(match[1], 'summary') ?? '').slice(0, 500), url: (read(match[1], 'link') ?? match[1].match(/<link[^>]+href=["']([^"']+)/i)?.[1] ?? '').slice(0, 2048), publishedAt: (read(match[1], 'pubDate') ?? read(match[1], 'published') ?? read(match[1], 'updated') ?? '').slice(0, 80) }))
}

async function rss(request: Request, env: Env, headers: HeadersInit) {
  if (await isRateLimited(request, env, 'rss')) return json({ error: 'rate_limited' }, 429, headers)
  const target = new URL(request.url).searchParams.get('url') ?? ''
  try { return json({ items: rssItems(await fetchPublicFeed(target, env.RSS_ALLOWED_HOSTS)) }, 200, headers) }
  catch (error) { const code = errorCode(error); return json({ error: code }, code === 'feed_too_large' ? 413 : code === 'rss_unavailable' ? 502 : 400, headers) }
}

export default { async fetch(request: Request, env: Env) {
  const headers = cors(request, env); const origin = request.headers.get('origin') ?? ''; const url = new URL(request.url)
  if (url.pathname === '/health') return json({ name: 'AI RADIO Worker', status: 'ok' }, 200, headers)
  if (!origin || !allowedOrigins(env).includes(origin)) return json({ error: 'origin_not_allowed' }, 403, headers)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method === 'POST' && url.pathname === '/api/generate') return generate(request, env, headers)
  if (request.method === 'GET' && url.pathname === '/api/rss') return rss(request, env, headers)
  return json({ error: 'not_found' }, 404, headers)
} }
