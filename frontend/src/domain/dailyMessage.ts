// The 30 approved phrases of the Panel (copied unchanged from the approved prototype).
// Front only: no database and no endpoint. The phrase changes every day and repeats every 30 days.
export const DAILY_MESSAGES = [
  'Ahorrar no es dejar de vivir, es decidir mejor en qué gastar.',
  'Pilas con los gastos hormiga: el tinto de todos los días también suma.',
  'Lo que guardas hoy, parce, mañana es tranquilidad.',
  'Anota todo: lo que no se mide no se puede mejorar.',
  'Empieza con poquito; lo importante es la constancia.',
  'Págate primero: aparta tu ahorro apenas te llegue la plata.',
  'Una meta con fecha deja de ser un sueño y se vuelve un plan.',
  'Antes de comprar, espera 24 horas: si todavía lo quieres, ahí sí.',
  'Un domicilio menos a la semana ya es un ahorro bacano a fin de mes.',
  'Tu yo del futuro te va a agradecer lo que hagas hoy.',
  'Gastar con cabeza también es una forma de cuidarte.',
  'Ver tus números no da miedo: da control.',
  'Pequeños ahorros, grandes resultados.',
  'Mira tus movimientos de la semana: ¿cuál compra repetirías y cuál no?',
  'Un fondo de emergencia es tu mejor amigo cuando llega lo inesperado.',
  'No se trata de ganar más, sino de manejar mejor lo que entra.',
  'Hoy es buen día para registrar ese gasto que se te quedó pendiente.',
  'Ahorrar es como el gimnasio: cuesta al inicio y se nota con el tiempo.',
  'Compara antes de comprar; tu bolsillo lo nota.',
  'Las deudas se pagan de a poquito, pero se pagan. Tú puedes.',
  'Menos antojos de impulso, más cosas que de verdad quieres.',
  'Celebra cada meta cumplida, por pequeña que sea.',
  'El plan de fin de mes empieza el día uno, no el treinta.',
  'Cuenta lo que entra y lo que sale: la tranquilidad empieza ahí.',
  'No te compares: tu camino financiero es solo tuyo.',
  'Si un mes te salió mal, tranquila o tranquilo: este mes arranca de nuevo.',
  'Ahorra para viajar, estudiar o lo que te mueva, pero ahorra con propósito.',
  'Revisa tus suscripciones: ¿de verdad las usas todas?',
  'Una vuelta con los parceros también cabe en el presupuesto; solo hay que planearla.',
  'Cada peso anotado es un paso más cerca de tu meta.',
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

// Day of the year in the user's local calendar: January 1 is 1, December 31 is 365 (366 in a leap year).
export function dayOfYear(date: Date): number {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayZero = Date.UTC(date.getFullYear(), 0, 0);
  return Math.round((today - dayZero) / DAY_MS);
}

export function dailyMessage(date: Date = new Date()): string {
  return DAILY_MESSAGES[dayOfYear(date) % DAILY_MESSAGES.length]!;
}
