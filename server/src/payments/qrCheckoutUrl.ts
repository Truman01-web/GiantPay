/** The origin is validated configuration, never a request Host header. */
export function qrCheckoutUrl(origin: string, token: string): string {
  return `${origin}/checkout/qr/${encodeURIComponent(token)}`;
}
