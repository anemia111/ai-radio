import type { RssItem } from '../types/radio'
export async function fetchRss(url: string, workerUrl: string): Promise<RssItem[]> {
  if (!url.trim()) return []
  const endpoint = workerUrl ? `${workerUrl.replace(/\/$/, '')}/api/rss?url=${encodeURIComponent(url)}` : url
  const response = await fetch(endpoint)
  if (!response.ok) throw new Error('RSSを取得できませんでした')
  if (workerUrl) return (await response.json() as { items?: RssItem[] }).items?.slice(0, 8) ?? []
  const text = await response.text(); const xml = new DOMParser().parseFromString(text, 'text/xml')
  return [...xml.querySelectorAll('item, entry')].slice(0, 8).map((item) => ({ title: item.querySelector('title')?.textContent?.trim() ?? '無題', summary: item.querySelector('description, summary')?.textContent?.replace(/<[^>]+>/g, '').trim(), url: item.querySelector('link')?.getAttribute('href') ?? item.querySelector('link')?.textContent?.trim(), publishedAt: item.querySelector('pubDate, published, updated')?.textContent?.trim() }))
}
