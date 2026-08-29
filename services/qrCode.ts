// Lightweight, zero-dependency QR Code generator in pure TypeScript
// Produces clean, scalable SVGs for mobile pairing

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Minimalist QR Code matrix generator (supports byte mode for URLs)
 */
class QRBitBuffer {
  buffer: number[] = [];
  length: number = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
  }

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
    }
    this.length++;
  }
}

// Polynomial math helpers for Reed-Solomon error correction
const QRMath = {
  glog(n: number): number {
    if (n < 1) throw new Error(`glog(${n})`);
    return LOG_TABLE[n];
  },
  gexp(n: number): number {
    while (n < 0) n += 255;
    while (n >= 256) n -= 255;
    return EXP_TABLE[n];
  },
};

const EXP_TABLE = new Array(256);
const LOG_TABLE = new Array(256);

for (let i = 0; i < 8; i++) {
  EXP_TABLE[i] = 1 << i;
}
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] =
    EXP_TABLE[i - 4] ^
    EXP_TABLE[i - 5] ^
    EXP_TABLE[i - 6] ^
    EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) {
  LOG_TABLE[EXP_TABLE[i]] = i;
}

class QRPolynomial {
  num: number[];
  constructor(num: number[], shift: number = 0) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
    for (let i = num.length - offset; i < this.num.length; i++) {
      this.num[i] = 0;
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(
          QRMath.glog(this.get(i)) + QRMath.glog(e.get(j))
        );
      }
    }
    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

// Error Correction Level M
const EC_CODEWORDS_TABLE = [
  null,
  [10, 7, 17, 9], // v1
  [16, 10, 28, 16], // v2
  [26, 15, 22, 13], // v3
  [18, 20, 16, 9], // v4
  [24, 26, 22, 11], // v5
  [16, 18, 28, 15], // v6
  [18, 20, 26, 13], // v7
  [22, 24, 26, 14], // v8
  [22, 30, 24, 16], // v9
  [26, 18, 28, 12], // v10
  [30, 20, 24, 15], // v11
  [22, 24, 28, 16], // v12
  [22, 26, 22, 12], // v13
  [24, 30, 24, 14], // v14
];

const TOTAL_BYTES_TABLE = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581,
];

function getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
  let a = new QRPolynomial([1], 0);
  for (let i = 0; i < errorCorrectLength; i++) {
    a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
  }
  return a;
}

/**
 * Generate a 2D boolean matrix for the QR Code
 */
export function generateQRMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  
  // Find appropriate version (1 to 14)
  let version = 1;
  while (version < 14) {
    const totalCap = TOTAL_BYTES_TABLE[version] - 2 - ((EC_CODEWORDS_TABLE[version] && EC_CODEWORDS_TABLE[version]![1]) || 10);
    if (bytes.length <= totalCap) {
      break;
    }
    version++;
  }

  const moduleCount = version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: moduleCount }, () =>
    Array(moduleCount).fill(null)
  );

  // 1. Position detection patterns
  const placePositionPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        if (
          row + r < 0 ||
          moduleCount <= row + r ||
          col + c < 0 ||
          moduleCount <= col + c
        )
          continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          matrix[row + r][col + c] = true;
        } else {
          matrix[row + r][col + c] = false;
        }
      }
    }
  };

  placePositionPattern(0, 0);
  placePositionPattern(moduleCount - 7, 0);
  placePositionPattern(0, moduleCount - 7);

  // 2. Timing patterns
  for (let r = 8; r < moduleCount - 8; r++) {
    if (matrix[r][6] === null) matrix[r][6] = r % 2 === 0;
  }
  for (let c = 8; c < moduleCount - 8; c++) {
    if (matrix[6][c] === null) matrix[6][c] = c % 2 === 0;
  }

  // 3. Dark module
  matrix[4 * version + 9][8] = true;

  // 4. Encode Data
  const buffer = new QRBitBuffer();
  buffer.put(4, 4); // 8-bit byte mode
  buffer.put(bytes.length, version < 10 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) {
    buffer.put(bytes[i], 8);
  }

  const ecCount = (EC_CODEWORDS_TABLE[version] && EC_CODEWORDS_TABLE[version]![1]) || 16;
  const totalDataBytes = TOTAL_BYTES_TABLE[version] - ecCount;

  // End of message & padding
  while (buffer.length % 8 !== 0) {
    buffer.putBit(false);
  }
  while (buffer.buffer.length < totalDataBytes) {
    buffer.put(0xec, 8);
    if (buffer.buffer.length < totalDataBytes) {
      buffer.put(0x11, 8);
    }
  }

  // Error correction
  const rsPoly = getErrorCorrectPolynomial(ecCount);
  const rawData = buffer.buffer.slice(0, totalDataBytes);
  const rawPoly = new QRPolynomial(rawData, ecCount);
  const modPoly = rawPoly.mod(rsPoly);

  const finalCodewords = [...rawData];
  for (let i = 0; i < ecCount; i++) {
    const modIndex = i + modPoly.getLength() - ecCount;
    finalCodewords.push(modIndex >= 0 ? modPoly.get(modIndex) : 0);
  }

  const finalBuffer = new QRBitBuffer();
  for (const byte of finalCodewords) {
    finalBuffer.put(byte, 8);
  }

  // 5. Place data onto matrix
  let bitIndex = 0;
  let inc = -1;
  let row = moduleCount - 1;
  let col = moduleCount - 1;

  while (col > 0) {
    if (col === 6) col--;
    while (true) {
      for (let c = 0; c < 2; c++) {
        if (matrix[row][col - c] === null) {
          let dark = false;
          if (bitIndex < finalBuffer.length) {
            dark = finalBuffer.get(bitIndex);
            bitIndex++;
          }
          // Mask pattern: (row + col) % 2 === 0
          const mask = (row + (col - c)) % 2 === 0;
          matrix[row][col - c] = mask ? !dark : dark;
        }
      }
      row += inc;
      if (row < 0 || moduleCount <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
    col -= 2;
  }

  return matrix.map((r) => r.map((cell) => cell === true));
}

/**
 * Generate an SVG XML string for the QR code
 */
export function generateQRCodeSVG(text: string, options: QRCodeOptions = {}): string {
  const {
    size = 220,
    margin = 2,
    darkColor = '#0f172a',
    lightColor = '#ffffff',
  } = options;

  try {
    const matrix = generateQRMatrix(text);
    const moduleCount = matrix.length;
    const fullSize = moduleCount + margin * 2;
    const cellSize = size / fullSize;

    let rects = '';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          const x = ((c + margin) * cellSize).toFixed(2);
          const y = ((r + margin) * cellSize).toFixed(2);
          const w = (cellSize + 0.1).toFixed(2);
          const h = (cellSize + 0.1).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${darkColor}" />`;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
        <rect width="100%" height="100%" fill="${lightColor}" rx="8" />
        ${rects}
      </svg>
    `.trim();
  } catch (err) {
    console.error('Failed to generate QR code matrix:', err);
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <rect width="100%" height="100%" fill="${lightColor}" rx="8" />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="${darkColor}">Scan via link</text>
      </svg>
    `.trim();
  }
}
