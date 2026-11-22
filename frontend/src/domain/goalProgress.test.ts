import { describe, expect, it } from 'vitest';
import { describeGoalProgress } from './goalProgress';
import type { Goal } from './types';

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'g1',
  categoryId: 'c1',
  name: 'Viaje',
  reason: 'Travel',
  reasonOther: null,
  targetAmount: '1000000.00',
  currencyCode: 'COP',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'Active',
  accumulated: '350000.00',
  remaining: '650000.00',
  percentage: 35,
  ...overrides,
});

describe('describeGoalProgress', () => {
  it('describes a goal in progress with what is left', () => {
    const view = describeGoalProgress(goal());

    expect(view.state).toBe('in-progress');
    expect(view.percentage).toBe(35);
    expect(view.summary).toMatch(/\$\s*350\.000 de \$\s*1\.000\.000/);
    expect(view.message).toMatch(/Faltan \$\s*650\.000/);
    expect(view.valueText).toMatch(/^35 %, /);
  });

  it('describes a goal without movements as empty, with 0 %', () => {
    const view = describeGoalProgress(goal({ accumulated: '0.00', remaining: '1000000.00', percentage: 0 }));

    expect(view.state).toBe('empty');
    expect(view.percentage).toBe(0);
    expect(view.message).toBe('Aún no hay gastos en esta categoría');
  });

  it('recognises a met goal (accumulated equals the target)', () => {
    const view = describeGoalProgress(goal({ accumulated: '1000000.00', remaining: '0.00', percentage: 100 }));

    expect(view.state).toBe('met');
    expect(view.percentage).toBe(100);
    expect(view.message).toBe('Meta cumplida');
  });

  it('recognises an exceeded goal even though the API caps the percentage at 100', () => {
    const view = describeGoalProgress(goal({ accumulated: '1250000.50', remaining: '0.00', percentage: 100 }));

    expect(view.state).toBe('exceeded');
    expect(view.percentage).toBe(100);
    expect(view.message).toMatch(/Meta superada por \$\s*250\.001/);
  });

  it('never shows a full bar for an unmet goal that the API rounded up to 100', () => {
    const view = describeGoalProgress(goal({ accumulated: '999990.00', remaining: '10.00', percentage: 100 }));

    expect(view.state).toBe('in-progress');
    expect(view.percentage).toBe(99.99);
  });

  it('uses the goal currency and a decimal comma in the percentage text', () => {
    const view = describeGoalProgress(goal({ currencyCode: 'USD', targetAmount: '200.00', accumulated: '50.50', remaining: '149.50', percentage: 25.25 }));

    expect(view.summary).toContain('50,50');
    expect(view.valueText.startsWith('25,25 %')).toBe(true);
  });
});
