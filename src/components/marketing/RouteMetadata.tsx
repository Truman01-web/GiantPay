import { useLayoutEffect, useSyncExternalStore } from 'react';
import { router } from '@active-router';
import { organizationData, pageMetadata, productOrigin } from '@/content/seo';

export function RouteMetadata() {
  const path = useSyncExternalStore(
    (callback) => router.subscribe(callback),
    () => router.state.location.pathname,
  );
  useLayoutEffect(() => {
    const metadata = pageMetadata(path, import.meta.env.VITE_PORTAL_CONTEXT === 'staff');
    document.title = metadata.title;
    function meta(key: string, value: string, property = false) {
      const attribute = property ? 'property' : 'name';
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.append(element);
      }
      element.content = value;
    }
    meta('description', metadata.description);
    meta('robots', metadata.robots);
    document.head
      .querySelectorAll(
        'link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], script[data-public-schema]',
      )
      .forEach((element) => element.remove());
    if (metadata.canonical) {
      const canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = metadata.canonical;
      document.head.append(canonical);
      meta('og:title', metadata.title, true);
      meta('og:description', metadata.description, true);
      meta('og:type', 'website', true);
      meta('og:url', metadata.canonical, true);
      meta('og:image', `${productOrigin}/giantpay-logo.png`, true);
      meta('og:image:alt', 'GiantPay by GiantPlus', true);
      meta('twitter:card', 'summary');
      meta('twitter:title', metadata.title);
      meta('twitter:description', metadata.description);
      meta('twitter:image', `${productOrigin}/giantpay-logo.png`);
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.publicSchema = '';
      script.textContent = JSON.stringify(organizationData);
      document.head.append(script);
    }
  }, [path]);
  return null;
}
