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
  return `日本語FMラジオの20〜60秒セグメントを作成してください。Aは冷静で知識豊富、Bは明るく質問と軽い冗談。発言は短く、相手の内容を受け、同じ話を繰り返さない。配分は${balance}。進行は「${direction}」。RSSは記事本文ではなく見出しと概要だけを要約し、断定しすぎず配信元確認を促す。\n必須JSON形式: {"programTitle":"...","segmentTitle":"...","mood":"...","lines":[{"speaker":"A","text":"..."},{"speaker":"B","text":"..."}]}\nUSER_DATA_START\n${JSON.stringify(input)}\nUSER_DATA_END`
}

async function generate(request: Request, env: Env, headers: HeadersInit) {
  if (await isRateLimited(request, env, 'generate')) return json({ error: 'rate_limited' }, 429, headers)
  let input: GenerateInput
  try { input = validateGenerateInput(await readJsonBody(request)) } catch (error) { const code = errorCode(error); return json({ error: code }, code === 'request_too_large' ? 413 : 400, headers) }
  try {
    const backend = createAIBackend(env); const prompt = buildPrompt(input); let raw = await backend.generate(prompt); let segment: Segment
    try { segment = normalizeSegment(parseModelJson(raw)) } catch { raw = await backend.generate(prompt, raw); segment = normalizeSegment(parseModelJson(raw)) }
    return json(segment, 200, headers)
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
