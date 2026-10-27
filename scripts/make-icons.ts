/** Generuje ikony PWA (PNG) z SVG przy użyciu Playwright. Uruchom: npx tsx scripts/make-icons.ts */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { iconSvg } from './icon.svg.ts'

// Playwright jest zainstalowany globalnie w środowisku deweloperskim (nie jest zależnością aplikacji)
interface Page {
  setViewportSize(size: { width: number; height: number }): Promise<void>
  setContent(html: string): Promise<void>
  screenshot(options: object): Promise<unknown>
}
interface Browser {
  newPage(): Promise<Page>
  close(): Promise<void>
}
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: { launch(): Promise<Browser> } }

const out = join(import.meta.dirname, '..', 'public')
writeFileSync(join(out, 'favicon.svg'), iconSvg())

const browser = await chromium.launch()
const page = await browser.newPage()
async function render(svg: string, size: number, file: string) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  await page.screenshot({ path: join(out, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
}
await render(iconSvg(), 192, 'pwa-192.png')
await render(iconSvg(), 512, 'pwa-512.png')
await render(iconSvg({ rounded: false, scale: 0.8 }), 512, 'pwa-maskable-512.png')
await render(iconSvg({ rounded: false, scale: 0.9 }), 180, 'apple-touch-icon.png')
await browser.close()
console.log('Ikony zapisane w public/')
