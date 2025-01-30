const isMissingValue = (buffer: Buffer): boolean => {
    const firstByte = buffer[0];
    // Check for missing value patterns (., ., .A through .Z)
    if (firstByte === 0x5f || firstByte === 0x2e || 
        (firstByte >= 0x41 && firstByte <= 0x5a)) {
        // Check if remaining bytes are all 0x00
        for (let i = 1; i < buffer.length; i++) {
            if (buffer[i] !== 0x00) return false;
        }
        return true;
    }
    return false;
};

const bit = (buffer: Buffer, bit: number): number => {
    return buffer[Math.floor(bit / 8)] >> (7 - (bit % 8)) & 1;
};

const ibm2ieee = (buffer: Buffer): number | null => {
    // Check for missing values first
    if (isMissingValue(buffer)) {
        return null;
    }

    const sign = buffer[0] >> 7;
    const exponent = buffer[0] & 0x7f;
    let fraction = 0;
    let denom = 1;
    const totalBit = (buffer.length - 1) * 8;
    for (let i = 0; i < totalBit; i++) {
        denom = denom * 2;
        fraction += bit(buffer, 8 + i) / denom;
    }
    return (1 - 2 * sign) * Math.pow(16.0, exponent - 64) * fraction;
};

export default ibm2ieee;
