import qrcode from 'qrcode-generator';

qrcode.stringToBytes = (text: string) => Array.from(new TextEncoder().encode(text));

export function generateQrMatrix(text: string): boolean[][] {
  const code = qrcode(0, 'M');
  code.addData(text, 'Byte');
  code.make();
  const size = code.getModuleCount();
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => code.isDark(row, column)));
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
