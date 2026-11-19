import { formatCop, formatPercent, toCents } from '../../../domain/money';
import { incomeExpenseShare, savingsRate } from '../../../domain/savingsRate';
import type { MovementSummary } from '../../../domain/types';

// Income and expenses never rely on color alone: "+" / "−" signs, a text chip, and a striped
// expense segment in the bar with the same pattern in the legend.
export function SummaryView({ summary }: { summary: MovementSummary }) {
  const balanceCents = toCents(summary.balance);
  const positive = balanceCents > 0;
  const equal = balanceCents === 0;
  const rate = savingsRate(summary.totalIncome, summary.balance);
  const share = incomeExpenseShare(summary.totalIncome, summary.totalExpense);

  const chip = positive
    ? { className: 'ok', text: 'Ingresos mayores que egresos' }
    : equal
      ? { className: 'neutral', text: 'Ingresos iguales a egresos' }
      : { className: 'danger', text: 'Egresos mayores que ingresos' };

  return (
    <>
      <div className="kpis">
        <article className="panel kpi">
          <h2 className="kpi-label">Ingresos</h2>
          <div className="kpi-value income">+ {formatCop(summary.totalIncome)}</div>
          <div className="cell-sub">Total de ingresos del periodo</div>
        </article>
        <article className="panel kpi">
          <h2 className="kpi-label">Egresos</h2>
          <div className="kpi-value expense">− {formatCop(summary.totalExpense)}</div>
          <div className="cell-sub">Total de gastos del periodo</div>
        </article>
        <article className="panel kpi balance">
          <h2 className="kpi-label">Balance</h2>
          <div className={`kpi-value${balanceCents < 0 ? ' neg' : ''}`}>
            {balanceCents < 0 ? '− ' : ''}
            {formatCop(summary.balance.replace('-', ''))}
          </div>
          <span className={`chip ${chip.className}`}>{chip.text}</span>
          {rate !== null && (
            <div className="cell-sub" style={{ marginTop: 10 }}>
              Tasa de ahorro: <b>{rate < 0 ? '− ' : ''}{formatPercent(Math.abs(rate))}</b> de tus ingresos
            </div>
          )}
        </article>
      </div>

      {share && (
        <section className="panel compare" aria-labelledby="compare-title">
          <h2 id="compare-title">Ingresos frente a egresos</h2>
          <div
            className="bar"
            role="img"
            aria-label={`Ingresos ${formatPercent(share.income)} y egresos ${formatPercent(share.expense)} del total movido`}
          >
            <span className="b-inc" style={{ width: `${share.income}%` }} />
            <span className="b-exp" style={{ width: `${share.expense}%` }} />
          </div>
          <div className="legend">
            <span>
              <i className="sw inc" />
              Ingresos {formatPercent(share.income)}
            </span>
            <span>
              <i className="sw exp" />
              Egresos {formatPercent(share.expense)}
            </span>
          </div>
        </section>
      )}
    </>
  );
}
