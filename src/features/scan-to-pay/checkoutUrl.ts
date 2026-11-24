import { env } from '@/app/config/env';

export function isGiantPayQrUrl(value: string, frontendOrigin = env.publicCheckoutOrigin ?? window.location.origin): boolean {
  try {
    const url = new URL(value);
    return (
      url.origin === frontendOrigin &&
      (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) &&
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
