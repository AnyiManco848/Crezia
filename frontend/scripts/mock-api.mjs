// Local mock of the Crezia API for visual checks and screenshots. No database, no real data. Usage: node scripts/mock-api.mjs
// (see scripts/README.md). Port: MOCK_API_PORT (default 3999).
// Modes (POST): /__mode/{normal|empty|error|slow} for categories and goals; /__reg/{created|conflict|invalid|limited|limited-hidden|slow|error} for POST /api/auth/register.
import http from 'node:http';

const PORT = Number(process.env.MOCK_API_PORT ?? 3999);
let mode = 'normal';
let cats = [
  { id: 's1', userId: null, name: 'Alimentación', description: 'Mercado, restaurantes y domicilios' },
  { id: 's2', userId: null, name: 'Transporte', description: null },
  { id: 'u1', userId: 'u', name: 'Mascotas', description: 'Comida y veterinario de Luna' },
  { id: 'u2', userId: 'u', name: 'Regalos', description: null },
  { id: 'u3', userId: 'u', name: 'Una categoría con un nombre bastante largo para probar el ajuste de línea en pantallas angostas', description: 'Y una descripción igualmente larga para ver cómo se comporta la tabla cuando el texto no cabe en una sola línea de la celda.' },
];
cats.push(
  { id: 'u4', userId: 'u', name: 'Tecnología', description: null },
  { id: 'u5', userId: 'u', name: 'Fondo de emergencia', description: null },
  { id: 'u6', userId: 'u', name: 'Viajes', description: null },
  { id: 'u7', userId: 'u', name: 'Estudios', description: null },
);
const G = (id, categoryId, name, reason, target, acc, status, startDate, endDate, extra = {}) => {
  const t = Math.round(target * 100), a = Math.round(acc * 100);
  return { id, categoryId, name, reason, reasonOther: null, targetAmount: (target).toFixed(2), currencyCode: 'COP', startDate, endDate, status,
    accumulated: (a / 100).toFixed(2), remaining: (Math.max(0, t - a) / 100).toFixed(2), percentage: t > 0 ? Math.min(100, Math.round((a * 10000) / t) / 100) : 0, ...extra };
};
let goals = [
  G('g1', 'u6', 'Viaje a Japón', 'Travel', 15000000, 6300000, 'Active', '2026-10-16', '2027-12-31'),
  G('g2', 'u4', 'Computador nuevo', 'Technology', 3000000, 3000000, 'Completed', '2026-03-01', '2026-11-30'),
  G('g3', 'u5', 'Fondo de emergencia', 'EmergencyFund', 5000000, 6250000.5, 'Active', '2026-01-01', '2027-06-30'),
  G('g4', 'u7', 'Curso de cocina', 'Other', 2400000, 0, 'Active', '2026-11-01', '2027-03-31', { reasonOther: 'Curso de cocina italiana' }),
  G('g5', 'u1', 'Adoptar un perro', 'Other', 1200000, 400000, 'Cancelled', '2026-02-01', '2026-09-30', { reasonOther: 'Adopción y gastos del primer año' }),
];
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'X-Total-Count, X-Page, X-Limit, Retry-After' };
const send = (res, code, body, extra = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...cors, ...extra }); res.end(JSON.stringify(body)); };
const ACCOUNTS = [
  { id: 'a1', bankName: 'Bancolombia', accountAlias: 'Nómina', accountType: 'Savings', currencyCode: 'COP', balance: '4850000.00' },
  { id: 'a2', bankName: 'Davivienda', accountAlias: 'Tarjeta de crédito para los gastos del hogar y compras grandes', accountType: 'Credit', currencyCode: 'COP', balance: '-1250000.00' },
  { id: 'a3', bankName: 'Nequi', accountAlias: null, accountType: 'Checking', currencyCode: 'COP', balance: '320000.50' },
  { id: 'a4', bankName: 'Wise', accountAlias: 'Dólares', accountType: 'Other', currencyCode: 'USD', balance: '1200.00' },
];
const MOVS = Array.from({ length: 27 }, (_, i) => ({ id: 'm' + i, bankAccountId: ACCOUNTS[i % 3].id, categoryId: ['s1', 's2', 'u1', 'u2', 'u3'][i % 5], type: i % 6 === 0 ? 'Income' : 'Expense', amount: ((i + 1) * 37500).toFixed(2), currencyCode: 'COP', date: `2026-11-${String(20 - (i % 19)).padStart(2, '0')}`, paymentMethod: ['Cash', 'Transfer', 'CreditCard', 'DebitCard', 'Other'][i % 5], description: i % 4 === 0 ? null : i % 7 === 0 ? 'Una descripción muy larga para comprobar que el texto se ajusta bien en pantallas angostas y no desborda la tabla' : 'Compra ' + (i + 1) }));
let regMode = 'created';
const REG_USER = (b) => ({ id: 'u-new', documentId: b.documentId, name: b.name, email: b.email, role: 'User', preferredCurrencyCode: 'COP' });
function register(res, body) {
  if (regMode === 'conflict') return send(res, 409, { error: { code: 'CONFLICT', message: 'No pudimos crear la cuenta con esos datos. Revisa la información o inicia sesión si ya tienes una cuenta.' } });
  if (regMode === 'limited') return send(res, 429, { error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' } }, { 'Retry-After': '20' });
  if (regMode === 'limited-hidden') { // emulates the CURRENT backend: Retry-After is sent but not exposed by CORS
    res.writeHead(429, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Retry-After': '20' });
    return res.end(JSON.stringify({ error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Inténtalo de nuevo en unos minutos.' } }));
  }
  if (regMode === 'invalid') return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ path: 'body.email', message: 'El correo no es válido' }, { path: 'body.documentId', message: 'La identificación solo admite letras y números (máximo 20)' }] } });
  if (regMode === 'error') return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } });
  const done = () => send(res, 201, { token: 'new-token', user: REG_USER(body) });
  return regMode === 'slow' ? setTimeout(done, 3000) : done();
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  let raw = ''; req.on('data', (c) => (raw += c)); req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    const p = url.pathname;
    if (p.startsWith('/__mode/')) { mode = p.split('/')[2]; return send(res, 200, { mode }); }
    if (p.startsWith('/__reg/')) { regMode = p.split('/')[2]; return send(res, 200, { regMode }); }
    if (p === '/api/auth/register' && req.method === 'POST') return register(res, body);
    if (p === '/api/health') return send(res, 200, { status: 'ok' });
    if (p === '/api/auth/login') return send(res, 200, { token: 't', user: { id: 'u', name: 'Test User', email: 'test@crezia.com', preferredCurrencyCode: 'COP' } });
    if (p === '/api/movements/summary') return send(res, 200, { from: url.searchParams.get('from'), to: url.searchParams.get('to'), currencyCode: 'COP', totalIncome: '4200000.00', totalExpense: '2875000.50', balance: '1324999.50', movementCount: 27 });
    if (p === '/api/bank-accounts' && req.method === 'GET') return send(res, 200, ACCOUNTS, { 'X-Total-Count': String(ACCOUNTS.length), 'X-Page': '1', 'X-Limit': '50' });
    if (p === '/api/movements' && req.method === 'GET') { const page = +url.searchParams.get('page') || 1, limit = +url.searchParams.get('limit') || 20; return send(res, 200, { data: MOVS.slice((page - 1) * limit, page * limit), page, limit, total: MOVS.length }); }
    if (p === '/api/categories') {
      if (mode === 'error') return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } });
      if (req.method === 'GET') {
        const list = mode === 'empty' ? [] : cats;
        const page = +url.searchParams.get('page') || 1, limit = +url.searchParams.get('limit') || 50;
        const f = () => send(res, 200, list.slice((page - 1) * limit, page * limit), { 'X-Total-Count': String(list.length), 'X-Page': String(page), 'X-Limit': String(limit) });
        return mode === 'slow' ? setTimeout(f, 6000) : f();
      }
      if (req.method === 'POST') { if (!body.name) return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ path: 'body.name', message: 'El nombre es obligatorio' }] } }); const c = { id: 'n' + Date.now(), userId: 'u', ...body }; cats.push(c); return send(res, 201, c); }
    }
    const m = p.match(/^\/api\/categories\/(.+)$/);
    if (m) {
      const c = cats.find((x) => x.id === m[1]);
      if (!c) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Categoría no encontrada' } });
      if (c.userId === null) return send(res, 403, { error: { code: 'FORBIDDEN', message: 'Las categorías del sistema no se pueden editar' } });
      if (req.method === 'PATCH') { Object.assign(c, body); return send(res, 200, c); }
      if (req.method === 'DELETE') { cats = cats.filter((x) => x !== c); return send(res, 200, { message: 'Categoría eliminada con éxito' }); }
    }
    if (p === '/api/goals') {
      if (mode === 'error') return send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' } });
      if (req.method === 'GET') {
        const list = mode === 'empty' ? [] : goals;
        const page = +url.searchParams.get('page') || 1, limit = +url.searchParams.get('limit') || 50;
        const f = () => send(res, 200, list.slice((page - 1) * limit, page * limit), { 'X-Total-Count': String(list.length), 'X-Page': String(page), 'X-Limit': String(limit) });
        return mode === 'slow' ? setTimeout(f, 6000) : f();
      }
      if (req.method === 'POST') {
        const bad = (path, message) => send(res, 400, { error: { code: 'VALIDATION_ERROR', message, details: [{ path, message }] } });
        if (body.endDate <= body.startDate) return bad('body.endDate', 'La fecha fin debe ser posterior a la fecha inicio');
        if (goals.some((g) => g.categoryId === body.categoryId && ['Active', 'Overdue'].includes(g.status))) return send(res, 409, { error: { code: 'CONFLICT', message: 'Ya tienes una meta activa en esta categoría. Complétala, cancélala o elimínala antes de crear otra' } });
        const g = G('n' + Date.now(), body.categoryId, body.name, body.reason, Number(body.targetAmount), 0, 'Active', body.startDate, body.endDate, { reasonOther: body.reasonOther ?? null, currencyCode: body.currencyCode });
        goals.push(g); return send(res, 201, g);
      }
    }
    const gm = p.match(/^\/api\/goals\/(.+)$/);
    if (gm) {
      const g = goals.find((x) => x.id === gm[1]);
      if (!g) return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Meta no encontrada' } });
      if (req.method === 'PATCH') { Object.assign(g, body); const a = Math.round(Number(g.accumulated) * 100), t = Math.round(Number(g.targetAmount) * 100); g.remaining = (Math.max(0, t - a) / 100).toFixed(2); g.percentage = Math.min(100, Math.round((a * 10000) / t) / 100); return send(res, 200, g); }
      if (req.method === 'DELETE') { goals = goals.filter((x) => x !== g); return send(res, 200, { message: 'Meta eliminada con éxito' }); }
    }
    send(res, 404, { error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
  });
}).listen(PORT, '127.0.0.1', () => console.log(`mock API on http://127.0.0.1:${PORT}`));
