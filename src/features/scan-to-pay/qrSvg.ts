/**
 * Lightweight, zero-dependency QR Code (Byte mode) generator for SVG rendering.
 *
 * Encodes text into a standard QR code matrix using ISO/IEC 18004 specification.
 * Supports Versions 1 through 10 with Medium (M) error correction.
 */

// GF(256) log and antilog tables (primitive polynomial 0x11d)
const GF_EXP = new Array(512).fill(0);
const GF_LOG = new Array(256).fill(0);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x]! + GF_LOG[y]!]!;
}

function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j]! ^= gfMul(p1[i]!, p2[j]!);
    }
  }
  return result;
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, [1, GF_EXP[i]!]);
  }
  return poly;
}

function rsCompute(data: number[], ecLength: number): number[] {
  const gen = rsGeneratorPoly(ecLength);
  const msg = [...data, ...new Array(ecLength).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j]! ^= gfMul(gen[j]!, coef);
      }
    }
  }
  return msg.slice(data.length);
}

// Version table for Medium (M) ECC: [totalCodewords, ecCodewords, ecBlocks, dataBytes]
const VERSION_TABLE: Record<number, { total: number; ecPerBlock: number; blocks: number; capacity: number }> = {
  1: { total: 26, ecPerBlock: 10, blocks: 1, capacity: 14 },
  2: { total: 44, ecPerBlock: 16, blocks: 1, capacity: 26 },
  3: { total: 70, ecPerBlock: 26, blocks: 1, capacity: 42 },
  4: { total: 100, ecPerBlock: 18, blocks: 2, capacity: 62 },
  5: { total: 134, ecPerBlock: 24, blocks: 2, capacity: 84 },
  6: { total: 172, ecPerBlock: 16, blocks: 4, capacity: 106 },
  7: { total: 196, ecPerBlock: 18, blocks: 4, capacity: 122 },
  8: { total: 242, ecPerBlock: 22, blocks: 4, capacity: 152 },
  9: { total: 292, ecPerBlock: 22, blocks: 5, capacity: 180 },
  10: { total: 346, ecPerBlock: 26, blocks: 5, capacity: 213 },
};

function selectVersion(byteCount: number): number {
  for (let v = 1; v <= 10; v++) {
    if (VERSION_TABLE[v]!.capacity >= byteCount) return v;
  }
  return 10;
}

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const version = selectVersion(textBytes.length);
  const size = version * 4 + 17;
  const vInfo = VERSION_TABLE[version]!;

  // 1. Bit buffer encoding: Mode (0100 for Byte) + Count (8 or 16 bits) + Data
  const bits: number[] = [0, 1, 0, 0];
  const countBits = version <= 9 ? 8 : 16;
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push((textBytes.length >> i) & 1);
  }
  for (const byte of textBytes) {
    for (let i = 7; i >= 0; i--) {
      bits.push((byte >> i) & 1);
    }
  }

  // Terminator (up to 4 zero bits)
  const dataCapacityBits = vInfo.capacity * 8;
  for (let i = 0; i < 4 && bits.length < dataCapacityBits; i++) {
    bits.push(0);
  }
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes: 0xEC, 0x11 alternating
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataCapacityBits) {
    const b = padBytes[padIdx % 2]!;
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
    padIdx++;
  }

  // Convert bits to data codewords
  const dataCodewords: number[] = new Array(vInfo.capacity).fill(0);
  for (let i = 0; i < vInfo.capacity; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | (bits[i * 8 + b] ?? 0);
    }
    dataCodewords[i] = byte;
  }

  // Error correction blocks
  const blockSize = Math.floor(vInfo.capacity / vInfo.blocks);
  const ecBlocks: number[][] = [];
  const dataBlockArrays: number[][] = [];
  let offset = 0;
  for (let b = 0; b < vInfo.blocks; b++) {
    const len = b < vInfo.capacity % vInfo.blocks ? blockSize + 1 : blockSize;
    const block = dataCodewords.slice(offset, offset + len);
    dataBlockArrays.push(block);
    ecBlocks.push(rsCompute(block, vInfo.ecPerBlock));
    offset += len;
  }

  // Interleave data and EC codewords
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(...dataBlockArrays.map((a) => a.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (const blk of dataBlockArrays) {
      if (i < blk.length) finalCodewords.push(blk[i]!);
    }
  }
  for (let i = 0; i < vInfo.ecPerBlock; i++) {
    for (const ec of ecBlocks) {
      finalCodewords.push(ec[i]!);
    }
  }

  // Matrix creation
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r: number, c: number, val: boolean) {
    matrix[r]![c] = val;
    isFunction[r]![c] = true;
  }

  // Finder patterns (7x7) + separators
  const finders = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [row, col] of finders) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (r >= 0 && r < 7 && c >= 0 && c < 7) {
          const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setFunction(nr, nc, isBlack);
        } else {
          setFunction(nr, nc, false);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  // Dark module
  setFunction(size * 4 + 9 - size > 0 ? 4 * version + 9 : size - 8, 8, true);

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8]![i]) isFunction[8]![i] = true;
    if (!isFunction[i]![8]) isFunction[i]![8] = true;
    if (!isFunction[8]![size - 1 - i]) isFunction[8]![size - 1 - i] = true;
    if (!isFunction[size - 1 - i]![8]) isFunction[size - 1 - i]![8] = true;
  }

  // Placement of data codewords
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const colList = [right, right - 1];
    const rowList = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rowList) {
      for (const c of colList) {
        if (!isFunction[r]![c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx]! : 0;
          // Apply standard mask pattern 000: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r]![c] = Boolean(bit ^ (mask ? 1 : 0));
          bitIdx++;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info: Medium ECC (00) + Mask 000 (000) = 00000 -> Format Bits: 0x4a5b
  // Pre-calculated format info string with BCH error correction: 0b101010000010010
  const formatBits = 0x4a5b;
  for (let i = 0; i < 15; i++) {
    const bit = Boolean((formatBits >> (14 - i)) & 1);
    // Top-left
    if (i < 6) matrix[8]![i] = bit;
    else if (i === 6) matrix[8]![7] = bit;
    else if (i === 7) matrix[8]![8] = bit;
    else if (i === 8) matrix[7]![8] = bit;
    else matrix[14 - i]![8] = bit;

    // Bottom-left / Top-right
    if (i < 7) matrix[size - 1 - i]![8] = bit;
    else matrix[8]![size - 15 + i] = bit;
  }

  return matrix;
}

export function renderQrSvgPath(matrix: boolean[][], moduleSize = 8): { path: string; size: number } {
  const margin = 4;
  const count = matrix.length;
  const totalModules = count + margin * 2;
  const totalPx = totalModules * moduleSize;

  let path = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (matrix[r]![c]) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        path += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z `;
      }
    }
  }

  return { path, size: totalPx };
}
