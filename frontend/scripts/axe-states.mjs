// axe in states that change the DOM + non-text contrast of progress bars + keyboard focus ring on key controls
// Usage: node scripts/axe-states.mjs      (see scripts/README.md)
// Env: FRONT_URL (default http://127.0.0.1:5173), MOCK_URL (default http://127.0.0.1:3999), CAPTURES_DIR, REPORT_DIR.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.FRONT_URL ?? 'http://127.0.0.1:5173';
const MOCK = process.env.MOCK_URL ?? 'http://127.0.0.1:3999';
const OUT = process.env.CAPTURES_DIR ?? path.resolve(here, '../../docs/generated/design/capturas');
const REPORT_DIR = process.env.REPORT_DIR ?? path.resolve(here, 'out');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });
const SESSION = { token: 't', user: { id: 'u', documentId: '1', name: 'Camila Rodríguez Pérez', email: 'camila@crezia.com', role: 'User', preferredCurrencyCode: 'COP' } };
const out = [];
const browser = await chromium.launch();

async function axe(page, label) {
  await page.evaluate(axeSource);
  const v = await page.evaluate(() => axe.run(document, { resultTypes: ['violations'] }).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, count: x.count ?? x.nodes.length, nodes: x.nodes.slice(0, 4).map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 3).join(' | ').slice(0, 200)) }))));
  out.push({ label, violations: v });
}

for (const [theme] of [['light'], ['dark']]) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, colorScheme: theme });
  const open = async (path, auth = true) => {
    const page = await ctx.newPage();
    await page.addInitScript(([t, s, a]) => { localStorage.setItem('crezia-theme', t); if (a) sessionStorage.setItem('crezia-session', JSON.stringify(s)); }, [theme, SESSION, auth]);
    await page.goto(BASE + path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    return page;
  };

  // Forms with errors
  let page = await open('/registro', false);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForTimeout(200);
  await axe(page, `registro-errores-${theme}`);
  await fetch(`${MOCK}/__reg/conflict`, { method: 'POST' });
  await page.getByLabel('Nombre completo').fill('Camila Rodriguez');
  await page.getByLabel('Identificación (cédula)').fill('100');
  await page.getByLabel('Fecha de nacimiento').fill('1995-03-10');
  await page.getByLabel('Correo electrónico').fill('c@c.co');
  await page.getByLabel('Contraseña', { exact: true }).fill('Clave1234');
  await page.getByLabel('Confirmar contraseña').fill('Clave1234');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForTimeout(400);
  await axe(page, `registro-409-${theme}`);
  await page.screenshot({ path: `${OUT}/registro-409-1366-${theme === 'light' ? 'claro' : 'oscuro'}.png` });
  await fetch(`${MOCK}/__reg/limited`, { method: 'POST' });
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForTimeout(500);
  await axe(page, `registro-429-${theme}`);
  await page.screenshot({ path: `${OUT}/registro-429-1366-${theme === 'light' ? 'claro' : 'oscuro'}.png` });
  await fetch(`${MOCK}/__reg/created`, { method: 'POST' });
  await page.close();

  page = await open('/login', false);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForTimeout(200);
  await axe(page, `login-errores-${theme}`);
  await page.close();

  // Dialogs with validation errors
  for (const [path, btn, save] of [['/movimientos', 'Nuevo movimiento', 'Guardar'], ['/cuentas', 'Nueva cuenta', 'Guardar'], ['/categorias', 'Nueva categoría', 'Guardar'], ['/metas', 'Nueva meta', 'Guardar']]) {
    page = await open(path);
    await page.getByRole('button', { name: btn }).locator('visible=true').first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: save }).click();
    await page.waitForTimeout(300);
    await axe(page, `${path}-dialogo-errores-${theme}`);
    await page.close();
  }

  // List states
  for (const m of ['empty', 'error', 'slow']) {
    await fetch(`${MOCK}/__mode/${m}`, { method: 'POST' });
    for (const path of ['/categorias', '/metas']) {
      page = await open(path);
      if (m === 'slow') await page.waitForTimeout(100);
      else await page.waitForTimeout(700);
      await axe(page, `${path}-${m}-${theme}`);
      await page.close();
    }
  }
  await fetch(`${MOCK}/__mode/normal`, { method: 'POST' });

  // Non-text contrast of the progress bars + chips
  page = await open('/metas');
  const bars = await page.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
    const res = [];
    for (const bar of document.querySelectorAll('.progress')) {
      const fill = bar.firstElementChild;
      const track = getComputedStyle(bar).backgroundColor;
      const f = getComputedStyle(fill).backgroundColor;
      const surf = getComputedStyle(document.querySelector('.card') ?? document.body).backgroundColor;
      res.push({ cls: bar.className, fillVsTrack: ratio(f, track), trackVsSurface: ratio(track, surf), width: fill.style.width });
    }
    return res;
  });
  out.push({ label: `barras-${theme}`, bars });
  await page.close();
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(REPORT_DIR, 'states.json'), JSON.stringify(out, null, 1));
for (const o of out) {
  if (o.bars) console.log(o.label, JSON.stringify(o.bars));
  else console.log(o.label, o.violations.length ? JSON.stringify(o.violations) : 'OK');
}
