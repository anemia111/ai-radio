import { describe, expect, it } from 'vitest'
import { isPublicAddress, parseSafeFeedUrl } from './security'

describe('RSS destination policy', () => {
  it('allows ordinary public HTTP and HTTPS feeds', () => { expect(parseSafeFeedUrl('https://example.com/feed.xml').hostname).toBe('example.com'); expect(parseSafeFeedUrl('http://feeds.example.org/rss').protocol).toBe('http:') })
  it.each(['http://127.0.0.1/feed', 'http://[::1]/feed', 'http://localhost/feed', 'http://service.local/feed', 'https://user:pass@example.com/feed', 'https://example.com:8443/feed'])('rejects unsafe destination %s', (url) => { expect(() => parseSafeFeedUrl(url)).toThrow() })
  it('enforces an optional hostname allowlist', () => { expect(parseSafeFeedUrl('https://news.example.com/feed', 'example.com').hostname).toBe('news.example.com'); expect(() => parseSafeFeedUrl('https://other.test/feed', 'example.com')).toThrow('blocked_destination') })
  it.each(['127.0.0.1', '10.1.2.3', '169.254.1.1', '192.168.1.10', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'])('classifies private or special address %s as unsafe', (address) => { expect(isPublicAddress(address)).toBe(false) })
  it.each(['93.184.216.34', '2606:4700:4700::1111'])('classifies public address %s as safe', (address) => { expect(isPublicAddress(address)).toBe(true) })
})
