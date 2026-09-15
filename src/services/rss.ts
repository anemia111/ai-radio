import type { RssItem } from '../types/radio'

const MAX_FEED_BYTES = 500_000

async function readLimitedText(response: Response) {
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_FEED_BYTES) throw new Error('RSSが大きすぎます')
  if (!response.body) return (await response.text()).slice(0, MAX_FEED_BYTES)
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let total = 0; let text = ''
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_FEED_BYTES) { await reader.cancel(); throw new Error('RSSが大きすぎます') }; text += decoder.decode(value, { stream: true }) }
  return text + decoder.decode()
}

export async function fetchRss(url: string, workerUrl: string): Promise<RssItem[]> {
  if (!url.trim()) return []
  const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('RSS URLが無効です')
  const endpoint = workerUrl ? `${workerUrl.replace(/\/$/, '')}/api/rss?url=${encodeURIComponent(parsed.toString())}` : parsed.toString()
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(endpoint, { signal: controller.signal })
    if (!response.ok) throw new Error('RSSを取得できませんでした')
    if (workerUrl) return (await response.json() as { items?: RssItem[] }).items?.slice(0, 8) ?? []
    const text = await readLimitedText(response); const xml = new DOMParser().parseFromString(text, 'text/xml')
    if (xml.querySelector('parsererror')) throw new Error('RSS形式を読み取れませんでした')
    return [...xml.querySelectorAll('item, entry')].slice(0, 8).map((item) => ({ title: item.querySelector('title')?.textContent?.trim().slice(0, 160) ?? '無題', summary: item.querySelector('description, summary')?.textContent?.replace(/<[^>]+>/g, '').trim().slice(0, 500), url: item.querySelector('link')?.getAttribute('href') ?? item.querySelector('link')?.textContent?.trim(), publishedAt: item.querySelector('pubDate, published, updated')?.textContent?.trim() }))
  } finally { window.clearTimeout(timeout) }
}
