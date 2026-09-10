/**
 * Validate a `returnTo`/redirect target so it can only ever be a same-origin
 * relative path — never an absolute URL to another host — preventing open
 * redirects via login or checkout return flows.
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  // Must start with a single "/" (relative), not "//" (protocol-relative,
  // which browsers treat as an absolute cross-origin URL) and must not
  // parse as an absolute URL.
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  try {
    // If this succeeds with an origin, the candidate was absolute — reject.
    const url = new URL(candidate, 'https://invalid.local');
    if (url.origin !== 'https://invalid.local') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
