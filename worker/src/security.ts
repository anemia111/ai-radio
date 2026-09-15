import { promises as dns } from 'node:dns'

const MAX_FEED_BYTES = 500_000
const MAX_REDIRECTS = 3
const FETCH_TIMEOUT_MS = 10_000

function isIpLiteral(hostname: string) { return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':') }

export function isPublicAddress(address: string): boolean {
  const value = address.toLowerCase()
  if (value.includes(':')) {
    if (value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/.test(value) || value.startsWith('ff') || value.startsWith('2001:db8:')) return false
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1]
    return mapped ? isPublicAddress(mapped) : true
  }
  const parts = value.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b, c] = parts
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0 && c <= 2)
    || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0 && c === 113))
}

async function assertPublicDns(hostname: string) {
  const results = await Promise.allSettled([dns.resolve4(hostname), dns.resolve6(hostname)])
  const addresses = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
  if (!addresses.length) throw new Error('dns_unresolved')
  if (addresses.some((address) => !isPublicAddress(address))) throw new Error('blocked_destination')
}

export function parseSafeFeedUrl(value: string, allowedHosts = '') {
  if (!value || value.length > 2048) throw new Error('invalid_url')
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid_url')
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('blocked_destination')
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || isIpLiteral(host)) throw new Error('blocked_destination')
  const allowlist = allowedHosts.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)
  if (allowlist.length && !allowlist.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) throw new Error('blocked_destination')
  return url
}

async function readLimitedText(response: Response) {
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_FEED_BYTES) throw new Error('feed_too_large')
  if (!response.body) { const text = await response.text(); if (text.length > MAX_FEED_BYTES) throw new Error('feed_too_large'); return text }
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let total = 0; let output = ''
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > MAX_FEED_BYTES) { await reader.cancel(); throw new Error('feed_too_large') }; output += decoder.decode(value, { stream: true }) }
  return output + decoder.decode()
}

export async function fetchPublicFeed(rawUrl: string, allowedHosts = '') {
  let current = parseSafeFeedUrl(rawUrl, allowedHosts)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    // Cloudflare Workers cannot reliably use node:dns. A configured hostname
    // allowlist is the production SSRF boundary, including for redirects.
    if (!allowedHosts.trim()) await assertPublicDns(current.hostname)
    const response = await fetch(current.toString(), { headers: { 'user-agent': 'AI-Radio-RSS/2.0', accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain' }, redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location'); if (!location || redirect === MAX_REDIRECTS) throw new Error('redirect_blocked')
      current = parseSafeFeedUrl(new URL(location, current).toString(), allowedHosts); continue
    }
    if (!response.ok) throw new Error('rss_unavailable')
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
    if (contentType && !/(rss|atom|xml|text\/plain)/.test(contentType)) throw new Error('invalid_feed_type')
    return readLimitedText(response)
  }
  throw new Error('redirect_blocked')
}
