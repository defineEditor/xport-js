 
 
/*
The MIT License (MIT)

Copyright (c) 2016 Aksel Jensen (TheRealAksel at github)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const rechk = /^([<>])?(([1-9]\d*)?([xcbB?hHiIfdsp]))*$/;
const refmt = /([1-9]\d*)?([xcbB?hHiIfdsp])/g;
const str = (v, o, c) => String.fromCharCode(
    ...new Uint8Array(v.buffer, v.byteOffset + o, c));
const rts = (v, o, c, s) => new Uint8Array(v.buffer, v.byteOffset + o, c)
    .set(s.split('').map(str => str.charCodeAt(0)));
const pst = (v, o, c) => str(v, o + 1, Math.min(v.getUint8(o), c - 1));
const tsp = (v, o, c, s) => { v.setUint8(o, s.length); rts(v, o + 1, c - 1, s); };
const lut = le => ({
    x: c => [1, c, 0],
    c: c => [c, 1, o => ({ u: v => str(v, o, 1), p: (v, c) => rts(v, o, 1, c) })],
    '?': c => [c, 1, o => ({ u: v => Boolean(v.getUint8(o)), p: (v, B) => v.setUint8(o, B) })],
    b: c => [c, 1, o => ({ u: v => v.getInt8(o), p: (v, b) => v.setInt8(o, b) })],
    B: c => [c, 1, o => ({ u: v => v.getUint8(o), p: (v, B) => v.setUint8(o, B) })],
    h: c => [c, 2, o => ({ u: v => v.getInt16(o, le), p: (v, h) => v.setInt16(o, h, le) })],
    H: c => [c, 2, o => ({ u: v => v.getUint16(o, le), p: (v, H) => v.setUint16(o, H, le) })],
    i: c => [c, 4, o => ({ u: v => v.getInt32(o, le), p: (v, i) => v.setInt32(o, i, le) })],
    I: c => [c, 4, o => ({ u: v => v.getUint32(o, le), p: (v, I) => v.setUint32(o, I, le) })],
    f: c => [c, 4, o => ({ u: v => v.getFloat32(o, le), p: (v, f) => v.setFloat32(o, f, le) })],
    d: c => [c, 8, o => ({ u: v => v.getFloat64(o, le), p: (v, d) => v.setFloat64(o, d, le) })],
    s: c => [1, c, o => ({ u: v => str(v, o, c), p: (v, s) => rts(v, o, c, s.slice(0, c)) })],
    p: c => [1, c, o => ({ u: v => pst(v, o, c), p: (v, s) => tsp(v, o, c, s.slice(0, c - 1)) })]
});
const errbuf = new RangeError('Structure larger than remaining buffer');
const errval = new RangeError('Not enough values for structure');
const struct = format => {
    const fns = []; let size = 0; let m = rechk.exec(format);
    if (!m) { throw new RangeError('Invalid format string'); }
    const t = lut(m[1] === '<'); const lu = (n, c) => t[c](n ? parseInt(n, 10) : 1);
    while ((m = refmt.exec(format))) {
        ((r, s, f) => {
            for (let i = 0; i < r; ++i, size += s) { if (f) { fns.push(f(size)); } }
        })(...lu(...m.slice(1)));
    }
    const unpack_from = (arrb, offs) => {
        if (arrb.byteLength < (offs | 0) + size) { throw errbuf; }
        const v = new DataView(arrb, offs | 0);
        return fns.map(f => f.u(v));
    };
    const pack_into = (arrb, offs, ...values) => {
        if (values.length < fns.length) { throw errval; }
        if (arrb.byteLength < offs + size) { throw errbuf; }
        const v = new DataView(arrb, offs);
        new Uint8Array(arrb, offs, size).fill(0);
        fns.forEach((f, i) => f.p(v, values[i]));
    };
    const pack = (...values) => {
        const b = new ArrayBuffer(size);
        pack_into(b, 0, ...values);
        return b;
    };
    const unpack = arrb => unpack_from(arrb, 0);
    function * iter_unpack (arrb) {
        for (let offs = 0; offs + size <= arrb.byteLength; offs += size) {
            yield unpack_from(arrb, offs);
        }
    }
    return Object.freeze({
        unpack, pack, unpack_from, pack_into, iter_unpack, format, size
    });
};
module.exports = struct;
