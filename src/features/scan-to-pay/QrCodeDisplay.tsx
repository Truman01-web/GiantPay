import { useMemo, useRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateQrMatrix, renderQrSvgPath } from './qrSvg';

interface QrCodeDisplayProps {
  url: string;
  label?: string;
  size?: number;
  showActions?: boolean;
}

export function QrCodeDisplay({ url, label, size = 240, showActions = true }: QrCodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, totalPx } = useMemo(() => {
    try {
      const matrix = generateQrMatrix(url);
      const { path, size: totalPx } = renderQrSvgPath(matrix, 6);
      return { path, totalPx };
    } catch {
      return { path: '', totalPx: 200 };
    }
  }, [url]);

  function handleDownload() {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    canvas.width = totalPx;
    canvas.height = totalPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalPx, totalPx);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);

      const a = document.createElement('a');
      a.download = `giantpay-qr-${label ? label.replace(/\s+/g, '-').toLowerCase() : 'code'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = blobUrl;
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-neutral-200)] bg-white p-3 shadow-sm">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${totalPx} ${totalPx}`}
          width={size}
          height={size}
          className="mx-auto"
          aria-label={label ? `QR code for ${label}` : 'Scan-to-pay QR code'}
          role="img"
        >
          <rect width="100%" height="100%" fill="#ffffff" />
          <path d={path} fill="#0d1b2a" />
        </svg>
      </div>

      {showActions && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PNG
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </Button>
        </div>
      )}
    </div>
  );
}
