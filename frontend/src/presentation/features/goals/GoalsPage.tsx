import { useState } from 'react';
import type { Goal } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { pageCount } from '../../../infrastructure/http/pagination';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/StateBlock';
import { DeleteGoalDialog } from './DeleteGoalDialog';
import { GoalFormDialog } from './GoalFormDialog';
import { GoalsTable } from './GoalsTable';
import { useCategoryOptions, useGoalList } from './useGoals';

const DEFAULT_LIMIT = 20;

type DialogState = { kind: 'form'; goal: Goal | null } | { kind: 'delete'; goal: Goal } | null;

export function GoalsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [dialog, setDialog] = useState<DialogState>(null);
  const list = useGoalList(page, limit);
  const categories = useCategoryOptions();
  const data = list.data;
  const catalogsStatus = categories.isError ? 'error' : categories.isSuccess ? 'ready' : 'loading';

  // After deleting the last goal of the last page the API answers an empty page: go back to the new last one.
  if (data && !list.isPlaceholderData && data.items.length === 0 && data.total > 0 && page > pageCount(data)) {
    setPage(pageCount(data));
  }

  const newButton = (
    <button type="button" className="btn" onClick={() => setDialog({ kind: 'form', goal: null })}>
      <Icon name="plus" />
      Nueva meta
    </button>
  );

  let body;
  if (list.isPending) {
    body = (
      <div className="panel">
        <LoadingSkeleton label="Cargando tus metas" rows={4} />
      </div>
    );
  } else if (list.isError && !data) {
    body = (
      <div className="panel">
        <ErrorState title="No pudimos cargar las metas" text={getErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      </div>
    );
  } else if (data && data.total === 0) {
    body = (
      <div className="panel">
        <EmptyState title="Aún no tienes metas" text="Crea una meta de ahorro y mira cuánto has avanzado con tus gastos de la categoría." action={newButton} />
      </div>
    );
  } else if (data) {
    body = (
      <div className={`panel table-wrap${list.isFetching ? ' list-busy' : ''}`} aria-busy={list.isFetching || undefined}>
        <GoalsTable
          goals={data.items}
          categories={categories.data ?? []}
          catalogsReady={catalogsStatus === 'ready'}
          onEdit={(item) => setDialog({ kind: 'form', goal: item })}
          onDelete={(item) => setDialog({ kind: 'delete', goal: item })}
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
      <PageHeader
        title="Metas"
        description="El avance es la suma de tus gastos en la categoría de la meta, entre sus fechas de inicio y fin."
        actions={newButton}
      />
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
        <GoalFormDialog
          key={dialog.goal?.id ?? 'new'}
          goal={dialog.goal}
          categories={categories.data ?? []}
          catalogsStatus={catalogsStatus}
          onRetryCatalogs={() => void categories.refetch()}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && <DeleteGoalDialog goal={dialog.goal} onClose={() => setDialog(null)} />}
    </>
  );
}
