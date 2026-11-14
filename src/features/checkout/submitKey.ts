// Keep a retry key across lost HTTP responses and page reloads. Do not store PII.
export function checkoutSubmitKey(scope: string): { key: string; complete: () => void } {
  const storageKey = `giantpay:checkout-attempt:${scope}`;
  let key: string = crypto.randomUUID();
  try {
    key = sessionStorage.getItem(storageKey) ?? key;
    sessionStorage.setItem(storageKey, key);
  } catch { /* Storage may be disabled; in-memory retries still reuse the key. */ }
  return { key, complete: () => { try { sessionStorage.removeItem(storageKey); } catch { /* optional storage */ } } };
}
