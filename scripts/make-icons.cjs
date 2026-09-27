// One-off generator: writes simple 192/512 PNG icons without any dependency.
const zlib = require('zlib')
const fs = require('fs')

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const bg = [17, 24, 39] // #111827
  const fg = [244, 244, 245] // #f4f4f5
  const rows = []
  const cx = size / 2, r1 = size * 0.34, r2 = size * 0.085
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cx + 0.5
      const d = Math.sqrt(dx * dx + dy * dy)
      let c = bg
      if (Math.abs(d - r1) < size * 0.026) c = fg
      else if (d < r2) c = fg
      // corner rounding
      const rr = size * 0.22
      const inCorner = (x < rr && y < rr) || (x >= size - rr && y < rr) || (x < rr && y >= size - rr) || (x >= size - rr && y >= size - rr)
      if (inCorner) {
        const qx = x < rr ? rr - x : x - (size - rr)
        const qy = y < rr ? rr - y : y - (size - rr)
        if (Math.sqrt(qx * qx + qy * qy) > rr) { row[1 + x * 3] = 0; row[2 + x * 3] = 0; row[3 + x * 3] = 0; continue }
      }
      row[1 + x * 3] = c[0]; row[2 + x * 3] = c[1]; row[3 + x * 3] = c[2]
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

fs.writeFileSync('public/icons/icon-192.png', png(192))
fs.writeFileSync('public/icons/icon-512.png', png(512))
console.log('icons written')
