import { useState } from 'react';
import { EMPTY_FILTERS, hasActiveFilters, isRangeInvalid, type MovementFilters as Filters } from '../../../domain/movementFilters';
import type { Movement } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { pageCount } from '../../../infrastructure/http/pagination';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/StateBlock';
import { DeleteMovementDialog } from './DeleteMovementDialog';
import { MovementFilters } from './MovementFilters';
import { MovementFormDialog } from './MovementFormDialog';
import { MovementsTable } from './MovementsTable';
import { useCatalogs, useMovementList } from './useMovements';

const DEFAULT_LIMIT = 20;

type DialogState = { kind: 'form'; movement: Movement | null } | { kind: 'delete'; movement: Movement } | null;

export function MovementsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [dialog, setDialog] = useState<DialogState>(null);

  const rangeInvalid = isRangeInvalid(filters);
  // An invalid range is not sent: the API would answer 400. The last good list stays on screen.
  const list = useMovementList(filters, page, limit, !rangeInvalid);
  const { categories, accounts } = useCatalogs();

  const catalogsStatus = categories.isError || accounts.isError ? 'error' : categories.isSuccess && accounts.isSuccess ? 'ready' : 'loading';
  const categoryItems = categories.data ?? [];
  const accountItems = accounts.data ?? [];

  const data = list.data;
  // After deleting the last item of the last page the API answers an empty page: go back to the new last one.
  // Adjusting state while rendering (guarded, so it settles in one extra render) instead of in an effect.
  if (data && !list.isPlaceholderData && data.items.length === 0 && data.total > 0 && page > pageCount(data)) {
    setPage(pageCount(data));
  }

  const changeFilters = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };
  const clearFilters = () => changeFilters(EMPTY_FILTERS);

  const newButton = (
    <button type="button" className="btn" onClick={() => setDialog({ kind: 'form', movement: null })}>
      <Icon name="plus" />
      Nuevo movimiento
    </button>
  );

  let body;
  if (list.isPending) {
    body = (
      <div className="panel">
        <LoadingSkeleton label="Cargando tus movimientos" rows={4} />
      </div>
    );
  } else if (list.isError && !data) {
    body = (
      <div className="panel">
        <ErrorState title="No pudimos cargar los movimientos" text={getErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      </div>
    );
  } else if (data && data.total === 0 && !hasActiveFilters(filters)) {
    body = (
      <div className="panel">
        <EmptyState title="Aún no tienes movimientos" text="Registra tu primer ingreso o gasto para empezar a ver tu historial." action={newButton} />
      </div>
    );
  } else if (data && data.items.length === 0 && data.total === 0) {
    body = (
      <div className="panel">
        <div className="state">
          <Icon name="empty" />
          <h2>No hay movimientos con estos filtros</h2>
          <p>Prueba con otro rango de fechas o quita algún filtro.</p>
          <button type="button" className="btn secondary" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      </div>
    );
  } else if (data) {
    body = (
      <div className={`panel table-wrap${list.isFetching ? ' list-busy' : ''}`} aria-busy={list.isFetching || undefined}>
        <MovementsTable
          movements={data.items}
          categories={categoryItems}
          accounts={accountItems}
          catalogsReady={catalogsStatus === 'ready'}
          onEdit={(movement) => setDialog({ kind: 'form', movement })}
          onDelete={(movement) => setDialog({ kind: 'delete', movement })}
        />
        <Pager
          page={data.page}
          limit={data.limit}
          total={data.total}
          shown={data.items.length}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Movimientos" description="Tus ingresos y gastos, del más reciente al más antiguo." actions={newButton} />
      <MovementFilters filters={filters} categories={categoryItems} accounts={accountItems} onChange={changeFilters} onClear={clearFilters} />
      {list.isError && data && (
        <div className="banner error" role="alert">
          <span>
            No pudimos actualizar la lista: {getErrorMessage(list.error)}{' '}
            <button type="button" className="btn secondary" onClick={() => void list.refetch()}>
              Reintentar
            </button>
          </span>
        </div>
      )}
      {body}

      {dialog?.kind === 'form' && (
        <MovementFormDialog
          key={dialog.movement?.id ?? 'new'}
          movement={dialog.movement}
          categories={categoryItems}
          accounts={accountItems}
          catalogsStatus={catalogsStatus}
          onRetryCatalogs={() => {
            void categories.refetch();
            void accounts.refetch();
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && <DeleteMovementDialog movement={dialog.movement} onClose={() => setDialog(null)} />}
    </>
  );
}
