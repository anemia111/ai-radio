import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0 }
function chunk(type, data) { const name = Buffer.from(type); const size = Buffer.alloc(4); size.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data]))); return Buffer.concat([size, name, data, crc]) }
function icon(size) {
  const stride = size * 4 + 1; const pixels = Buffer.alloc(stride * size); const center = (size - 1) / 2; const ring = size * .31; const ringWidth = size * .055; const core = size * .075
  for (let y = 0; y < size; y += 1) { pixels[y * stride] = 0; for (let x = 0; x < size; x += 1) { const i = y * stride + 1 + x * 4; const distance = Math.hypot(x - center, y - center); let color = [17, 21, 26, 255]; if (Math.abs(distance - ring) < ringWidth || (Math.abs(y - center) < ringWidth * .45 && Math.abs(x - center) > ring && Math.abs(x - center) < size * .43)) color = [255, 93, 69, 255]; if (distance < core) color = [101, 217, 232, 255]; pixels.set(color, i) } }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))])
}
for (const size of [192, 512]) writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), icon(size))
