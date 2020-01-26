const bit = (buffer: Buffer, bit: number): number => {
    return buffer[Math.floor(bit / 8)] >> (7 - (bit % 8)) & 1;
}

const ibm2ieee = (buffer: Buffer) : number => {
    let sign = buffer[0] >> 7;
    let exponent = buffer[0] & 0x7f;
    let fraction = 0;
    let denom = 1;
    let totalBit = (buffer.length - 1) * 8;
    for (var i = 0; i < totalBit; i++) {
        denom = denom * 2;
        fraction += bit(buffer, 8 + i) / denom;
    }
    return (1 - 2 * sign) * Math.pow(16.0, exponent - 64) * fraction;
}

export default ibm2ieee;