"""Lossless PNG recompressor (stdlib only): adaptive per-row filters + zlib level 9."""
import struct, sys, zlib


def read_chunks(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    pos, out = 8, []
    while pos < len(data):
        n = struct.unpack('>I', data[pos:pos + 4])[0]
        typ = data[pos + 4:pos + 8]
        out.append((typ, data[pos + 8:pos + 8 + n]))
        pos += 12 + n
    return out


def chunk(typ, body):
    return struct.pack('>I', len(body)) + typ + body + struct.pack('>I', zlib.crc32(typ + body) & 0xFFFFFFFF)


def paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    return b if pb <= pc else c


def unfilter(raw, w, h, bpp):
    stride = w * bpp
    rows, prev = [], bytearray(stride)
    pos = 0
    for _ in range(h):
        ft = raw[pos]
        line = bytearray(raw[pos + 1:pos + 1 + stride])
        pos += 1 + stride
        if ft == 1:
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 255
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif ft == 3:
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 255
        elif ft == 4:
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                ul = prev[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + paeth(left, prev[i], ul)) & 255
        rows.append(line)
        prev = line
    return rows


def filter_row(ft, line, prev, bpp):
    n = len(line)
    out = bytearray(n)
    if ft == 0:
        return bytearray(line)
    for i in range(n):
        left = line[i - bpp] if i >= bpp else 0
        up = prev[i]
        ul = prev[i - bpp] if i >= bpp else 0
        if ft == 1:
            pred = left
        elif ft == 2:
            pred = up
        elif ft == 3:
            pred = (left + up) >> 1
        else:
            pred = paeth(left, up, ul)
        out[i] = (line[i] - pred) & 255
    return out


def score(buf):
    return sum(b if b < 128 else 256 - b for b in buf)


def optimize(path):
    data = open(path, 'rb').read()
    chunks = read_chunks(data)
    ihdr = dict(chunks)[b'IHDR']
    w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', ihdr)
    assert depth == 8 and interlace == 0 and ctype in (2, 6), (depth, ctype, interlace)
    bpp = 4 if ctype == 6 else 3
    raw = zlib.decompress(b''.join(b for t, b in chunks if t == b'IDAT'))
    rows = unfilter(raw, w, h, bpp)
    zero = bytearray(w * bpp)
    out = bytearray()
    prev = zero
    for line in rows:
        best = None
        for ft in range(5):
            f = filter_row(ft, line, prev, bpp)
            sc = score(f)
            if best is None or sc < best[0]:
                best = (sc, ft, f)
        out.append(best[1])
        out += best[2]
        prev = line
    comp = max((zlib.compressobj(9, zlib.DEFLATED, 15, 9, s) for s in (zlib.Z_DEFAULT_STRATEGY, zlib.Z_FILTERED)),
               key=lambda c: 0)  # placeholder to build both below
    best_z = None
    for strat in (zlib.Z_DEFAULT_STRATEGY, zlib.Z_FILTERED):
        co = zlib.compressobj(9, zlib.DEFLATED, 15, 9, strat)
        z = co.compress(bytes(out)) + co.flush()
        if best_z is None or len(z) < len(best_z):
            best_z = z
    keep = [(t, b) for t, b in chunks if t not in (b'IDAT', b'IEND', b'IHDR')]
    new = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
    for t, b in keep:
        new += chunk(t, b)
    new += chunk(b'IDAT', best_z) + chunk(b'IEND', b'')
    return data, new


if __name__ == '__main__':
    for p in sys.argv[1:]:
        old, new = optimize(p)
        if len(new) < len(old):
            open(p, 'wb').write(new)
        print(p.split('/')[-1], len(old), '->', min(len(new), len(old)))
