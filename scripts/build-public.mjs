import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { publicPages } from '../src/content/publicPages.ts';
import { pageMetadata, organizationData, productOrigin } from '../src/content/seo.ts';

// Generate crawlable public HTML from the same content used by the React pages.
// The SPA replaces the static body after startup. No private state is prerendered.
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
const template = await readFile('dist/index.html', 'utf8');
const staff = process.env.VITE_PORTAL_CONTEXT === 'staff';
const privateTemplate = template.replace(
  /<title>[\s\S]*?<\/title>/,
  '<title>GiantPay secure workspace</title>',
);
await writeFile('dist/spa.html', privateTemplate);
await writeFile('dist/404.html', privateTemplate);
if (!staff) {
  for (const [path, content] of Object.entries(publicPages)) {
    const metadata = pageMetadata(path);
    const head = `<title>${escape(metadata.title)}</title><meta name="description" content="${escape(metadata.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${metadata.canonical}"><meta property="og:title" content="${escape(metadata.title)}"><meta property="og:description" content="${escape(metadata.description)}"><meta property="og:type" content="website"><meta property="og:url" content="${metadata.canonical}"><meta property="og:image" content="${productOrigin}/giantpay-logo.png"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(metadata.title)}"><meta name="twitter:description" content="${escape(metadata.description)}"><meta name="twitter:image" content="${productOrigin}/giantpay-logo.png"><script type="application/ld+json" data-public-schema>${JSON.stringify(organizationData)}</script>`;
    const links = Object.entries(publicPages)
      .map(([route, page]) => `<a href="${route}">${escape(page.title)}</a>`)
      .join(' · ');
    const body = `<header><a href="/"><img src="/giantpay-logo.png" width="180" alt="GiantPay"></a></header><main class="public-content"><p>${escape(content.eyebrow)}</p><h1>${escape(content.title)}</h1><p>${escape(content.description)}</p>${content.sections.map((section) => `<section><h2>${escape(section.title)}</h2><p>${escape(section.text)}</p></section>`).join('')}<a href="/register">Create a sandbox account</a> · <a href="mailto:info@giantplus-mw.com">Contact GiantPlus</a></main><nav aria-label="Public pages">${links}</nav>`;
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/, '')
      .replace(/<meta\s+name="(?:description|robots)"[^>]*>/g, '')
      .replace('</head>', `${head}</head>`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const directory = path === '/' ? 'dist' : `dist${path}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/index.html`, html);
  }
}
const urls = staff ? [] : Object.keys(publicPages);
await writeFile(
  'dist/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${productOrigin}${path}</loc></url>`).join('')}</urlset>`,
);
// Allow only the explicit public catalogue; sensitive and unknown routes stay disallowed.
await writeFile(
  'dist/robots.txt',
  staff
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nDisallow: /\n${urls.map((path) => `Allow: ${path}$`).join('\n')}Sitemap: ${productOrigin}/sitemap.xml\n`,
);
console.log(`Generated ${urls.length} crawlable public pages; private fallback is spa.html.`);
