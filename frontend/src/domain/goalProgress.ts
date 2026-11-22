import { formatMoney, toCents } from './money';
import type { Goal } from './types';

// How the screen describes a goal's progress. The API computes accumulated / remaining / percentage, but its
// percentage is capped at 100, so "met" and "exceeded" are decided here by comparing integer cents.
export type GoalProgressState = 'empty' | 'in-progress' | 'met' | 'exceeded';

export interface GoalProgressView {
  state: GoalProgressState;
  // 0 to 100, for the bar width and aria-valuenow.
  percentage: number;
  // "$ 350.000 de $ 1.000.000". Always text, so the state never depends on color alone.
  summary: string;
  message: string;
  // Text for assistive technology: "35 %, $ 350.000 de $ 1.000.000".
  valueText: string;
}

function percentText(value: number): string {
  return `${String(value).replace('.', ',')} %`;
}

export function describeGoalProgress(goal: Goal): GoalProgressView {
  const target = toCents(goal.targetAmount);
  const accumulated = toCents(goal.accumulated);
  const money = (amount: string | number) => formatMoney(amount, goal.currencyCode);

  let state: GoalProgressState;
  if (accumulated <= 0) state = 'empty';
  else if (accumulated < target) state = 'in-progress';
  else if (accumulated === target) state = 'met';
  else state = 'exceeded';

  // The API rounds to two decimals, so 99.996 % arrives as 100: never show a full bar for an unmet goal.
  let percentage = Math.min(100, Math.max(0, goal.percentage));
  if (state === 'empty') percentage = 0;
  if (state === 'in-progress') percentage = Math.min(percentage, 99.99);
  if (state === 'met' || state === 'exceeded') percentage = 100;

  const summary = `${money(goal.accumulated)} de ${money(goal.targetAmount)}`;
  let message: string;
  if (state === 'empty') message = 'Aún no hay gastos en esta categoría';
  else if (state === 'in-progress') message = `Faltan ${money(goal.remaining)}`;
  else if (state === 'met') message = 'Meta cumplida';
  else message = `Meta superada por ${money(((accumulated - target) / 100).toFixed(2))}`;

  return { state, percentage, summary, message, valueText: `${percentText(percentage)}, ${summary}` };
}
