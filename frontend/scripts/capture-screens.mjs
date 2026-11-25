// Visual audit: screenshots of every screen (3 widths x 2 themes) + axe + overflow checks, against the mock API.
// Usage: node scripts/capture-screens.mjs [screenFilter]        (see scripts/README.md)
// Env: FRONT_URL (default http://127.0.0.1:5173), CAPTURES_DIR (default ../docs/generated/design/capturas),
//      REPORT_DIR (default scripts/out). Needs the mock API (scripts/mock-api.mjs) and the front running against it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.FRONT_URL ?? 'http://127.0.0.1:5173';
const OUT = process.env.CAPTURES_DIR ?? path.resolve(here, '../../docs/generated/design/capturas');
const REPORT_DIR = process.env.REPORT_DIR ?? path.resolve(here, 'out');
const only = process.argv[2] ?? '';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });
const WIDTHS = [1366, 900, 390];
const THEMES = [['claro', 'light'], ['oscuro', 'dark']];
const SESSION = { token: 't', user: { id: 'u', documentId: '1000000001', name: 'Camila Rodríguez Pérez', email: 'camila@crezia.com', role: 'User', preferredCurrencyCode: 'COP' } };

const SCREENS = [
  { name: 'login', path: '/login', auth: false },
  { name: 'registro', path: '/registro', auth: false },
  { name: 'panel', path: '/panel', auth: true },
  { name: 'movimientos', path: '/movimientos', auth: true, dialog: 'Nuevo movimiento' },
  { name: 'cuentas', path: '/cuentas', auth: true, dialog: 'Nueva cuenta' },
  { name: 'categorias', path: '/categorias', auth: true, dialog: 'Nueva categoría' },
  { name: 'metas', path: '/metas', auth: true, dialog: 'Nueva meta' },
];

const findings = [];
const browser = await chromium.launch();

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(400);
}

async function checks(page, label) {
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    const out = { pageOverflow: de.scrollWidth > de.clientWidth + 1, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, clipped: [] };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > de.clientWidth + 1 && getComputedStyle(el).position !== 'fixed') {
        let p = el.parentElement;
        let scrolled = false;
        while (p && p !== document.body) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'auto' || o === 'scroll' || o === 'hidden') { scrolled = true; break; }
          p = p.parentElement;
        }
        if (!scrolled) out.clipped.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.textContent || '').trim().slice(0, 30)}" right=${Math.round(r.right)}`);
      }
      if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && ['hidden', 'clip'].includes(getComputedStyle(el).overflowX) && getComputedStyle(el).textOverflow !== 'ellipsis') {
        out.clipped.push(`CUT ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)} "${(el.textContent || '').trim().slice(0, 40)}"`);
      }
    }
    out.clipped = out.clipped.slice(0, 8);
    return out;
  });
  if (overflow.pageOverflow || overflow.clipped.length) findings.push({ label, kind: 'overflow', ...overflow });
  await page.evaluate(axeSource);
  const axe = await page.evaluate(() =>
    axe.run(document, { resultTypes: ['violations'] }).then((r) =>
      r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        count: v.nodes.length,
        nodes: v.nodes.slice(0, 6).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(1, 3).join(' | ').slice(0, 220) })),
      })),
    ),
  );
  for (const v of axe) findings.push({ label, kind: 'axe', ...v });
}

for (const [themeName, scheme] of THEMES) {
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, colorScheme: scheme, locale: 'es-CO' });
    for (const s of SCREENS) {
      if (only && !s.name.includes(only)) continue;
      const page = await ctx.newPage();
      await page.addInitScript(
        ([theme, session, auth]) => {
          try { localStorage.setItem('crezia-theme', theme); } catch { /* ignore */ }
          if (auth) { try { sessionStorage.setItem('crezia-session', JSON.stringify(session)); } catch { /* ignore */ } }
        },
        [scheme, SESSION, s.auth],
      );
      const tag = `${s.name}-${width}-${themeName}`;
      await page.goto(BASE + s.path);
      await settle(page);
      await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
      await checks(page, tag);

      if (s.name === 'panel') {
        const trigger = page.getByRole('button', { name: /Menú de cuenta/ }).locator('visible=true').first();
        if (await trigger.count()) {
          await trigger.click();
          await page.waitForTimeout(250);
          await page.screenshot({ path: `${OUT}/menu-usuario-${width}-${themeName}.png`, fullPage: false });
          await checks(page, `menu-usuario-${width}-${themeName}`);
          await page.keyboard.press('Escape');
        }
      }
      if (s.dialog) {
        await page.getByRole('button', { name: s.dialog }).locator('visible=true').first().click();
        await page.waitForTimeout(500);
        const dtag = `${s.name}-nuevo-${width}-${themeName}`;
        await page.screenshot({ path: `${OUT}/${dtag}.png`, fullPage: false });
        const fits = await page.evaluate(() => {
          const d = document.querySelector('dialog[open], [role="dialog"]');
          if (!d) return { found: false };
          const r = d.getBoundingClientRect();
          return { found: true, top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight, vw: innerWidth };
        });
        if (!fits.found) findings.push({ label: dtag, kind: 'dialog-missing' });
        else if (fits.top < 0 || fits.bottom > fits.vh + 1 || fits.left < 0 || fits.right > fits.vw + 1) findings.push({ label: dtag, kind: 'dialog-outside-viewport', ...fits });
        await checks(page, dtag);
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const e = document.activeElement;
          if (!e) return null;
          const cs = getComputedStyle(e);
          return { tag: e.tagName, text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 25), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`, shadow: cs.boxShadow.slice(0, 60) };
        });
        findings.push({ label: dtag, kind: 'focus-sample', focus });
        await page.keyboard.press('Escape');
      }
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
const REPORT = path.join(REPORT_DIR, 'audit.json');
fs.writeFileSync(REPORT, JSON.stringify(findings, null, 1));
const axeCount = findings.filter((f) => f.kind === 'axe').length;
const pageOverflow = findings.filter((f) => f.kind === 'overflow' && f.pageOverflow).map((f) => f.label);
console.log(`axe violations: ${axeCount}`);
console.log(`pages with horizontal overflow: ${pageOverflow.length ? pageOverflow.join(', ') : 'none'}`);
console.log(`dialogs outside the viewport: ${findings.filter((f) => f.kind.startsWith('dialog')).length}`);
console.log(`details (including sr-only false positives of the overflow check): ${REPORT}`);
