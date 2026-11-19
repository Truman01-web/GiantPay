export function isGiantPayQrUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === 'https://giantpay.mw' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/checkout\/qr\/[A-Za-z0-9_-]{32,256}$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
