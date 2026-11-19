import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dailyMessage } from '../../../domain/dailyMessage';
import { formatDate } from '../../../domain/dates';
import { DEFAULT_PERIOD, getPeriodRange, isPeriodKey, PERIODS, type PeriodKey } from '../../../domain/periods';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { Field } from '../../components/Field';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/StateBlock';
import { SummaryView } from './SummaryView';
import { SUMMARY_CURRENCY, useMovementSummary } from './useMovementSummary';

export function DashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>(DEFAULT_PERIOD);
  const { from, to } = getPeriodRange(period);
  const summary = useMovementSummary(from, to);

  const count = summary.data?.movementCount;
  const description = `Resumen de ${formatDate(from)} a ${formatDate(to)}${
    count ? ` · ${count} ${count === 1 ? 'movimiento' : 'movimientos'}` : ''
  }.`;

  const periodSelect = (
    <div className="period">
      <Field label="Periodo">
        {(control) => (
          <select
            {...control}
            className="select"
            value={period}
            onChange={(event) => isPeriodKey(event.target.value) && setPeriod(event.target.value)}
          >
            {PERIODS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>
    </div>
  );

  let body;
  if (summary.isPending) {
    body = (
      <div className="panel">
        <LoadingSkeleton label="Cargando tu resumen" />
      </div>
    );
  } else if (summary.isError) {
    body = (
      <div className="panel">
        <ErrorState
          title="No pudimos cargar tu resumen"
          text={getErrorMessage(summary.error)}
          onRetry={() => void summary.refetch()}
        />
      </div>
    );
  } else if (summary.data.movementCount === 0) {
    body = (
      <div className="panel">
        <EmptyState
          title="Aún no tienes movimientos en este periodo"
          text="Registra un ingreso o un gasto y aquí verás tu balance."
          action={
            <Link className="btn" to="/movimientos">
              Nuevo movimiento
            </Link>
          }
        />
      </div>
    );
  } else {
    body = <SummaryView summary={summary.data} />;
  }

  return (
    <>
      <PageHeader title="Panel" description={description} actions={periodSelect} />

      <section className="quote" aria-label="Mensaje del día">
        <span className="mark" aria-hidden="true">
          “
        </span>
        <div>
          <p>{dailyMessage()}</p>
          <small>Mensaje del día</small>
        </div>
      </section>

      <div aria-live="polite" aria-busy={summary.isFetching}>
        {body}
      </div>
      <p className="note">Solo se cuentan los movimientos en {SUMMARY_CURRENCY}.</p>
    </>
  );
}
