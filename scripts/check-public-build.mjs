import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicPages } from '../src/content/publicPages.ts';
import { pageMetadata } from '../src/content/seo.ts';

for (const [path, content] of Object.entries(publicPages)) {
  const html = await readFile(path === '/' ? 'dist/index.html' : `dist${path}/index.html`, 'utf8');
  const metadata = pageMetadata(path);
  assert(html.includes(`href="${metadata.canonical}"`), `${path}: canonical`);
  assert(html.includes('name="robots" content="index,follow"'), `${path}: indexing`);
  assert(html.includes(`<h1>${content.title}</h1>`), `${path}: crawlable heading`);
  assert(html.includes('application/ld+json'), `${path}: structured data`);
}
for (const file of ['spa.html', '404.html']) {
  const html = await readFile(`dist/${file}`, 'utf8');
  assert(html.includes('noindex,nofollow,noarchive'), `${file}: private indexing guard`);
  assert(!html.includes('rel="canonical"'), `${file}: no public canonical`);
}
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
for (const privatePath of [
  '/checkout',
  '/payment/',
  '/dashboard',
  '/admin',
  '/login',
  '/developers/api-keys',
])
  assert(!sitemap.includes(privatePath), `private URL leaked into sitemap: ${privatePath}`);
const robots = await readFile('dist/robots.txt', 'utf8');
assert(robots.includes('Disallow: /'));
console.log(
  `Verified ${Object.keys(publicPages).length} static public documents, sitemap and private fallbacks.`,
);
