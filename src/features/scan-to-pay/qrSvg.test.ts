import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { generateQrMatrix } from './qrSvg';

describe('QR checkout encoding', () => {
  it.each(['https://giantpay.mw/checkout/qr/' + 'a'.repeat(43), 'https://giantpay.mw/checkout/qr/' + 'b'.repeat(190), 'https://giantpay.mw/checkout/qr/' + 'c'.repeat(250)])('decodes the complete opaque checkout URL (%s)', (url) => {
    const matrix = generateQrMatrix(url), scale = 5, width = (matrix.length + 8) * scale;
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    matrix.forEach((row, y) => row.forEach((black, x) => {
      if (!black) return;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const index = (((y + 4) * scale + dy) * width + (x + 4) * scale + dx) * 4;
        pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
      }
    }));
    expect(jsQR(pixels, width, width)?.data).toBe(url);
  });
});
