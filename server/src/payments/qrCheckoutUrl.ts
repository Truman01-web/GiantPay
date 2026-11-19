/** Stable public QR target. Local browser tests map this URL to their disposable frontend. */
export function qrCheckoutUrl(token: string): string {
  return `https://giantpay.mw/checkout/qr/${encodeURIComponent(token)}`;
}
