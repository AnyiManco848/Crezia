import { useState } from 'react';
import type { Category } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { pageCount } from '../../../infrastructure/http/pagination';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/StateBlock';
import { CategoriesTable } from './CategoriesTable';
import { CategoryFormDialog } from './CategoryFormDialog';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { useCategoryList } from './useCategories';

const DEFAULT_LIMIT = 20;

type DialogState = { kind: 'form'; category: Category | null } | { kind: 'delete'; category: Category } | null;

export function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [dialog, setDialog] = useState<DialogState>(null);
  const list = useCategoryList(page, limit);
  const data = list.data;

  // After deleting the last category of the last page the API answers an empty page: go back to the new last one.
  if (data && !list.isPlaceholderData && data.items.length === 0 && data.total > 0 && page > pageCount(data)) {
    setPage(pageCount(data));
  }

  const newButton = (
    <button type="button" className="btn" onClick={() => setDialog({ kind: 'form', category: null })}>
      <Icon name="plus" />
      Nueva categoría
    </button>
  );

  let body;
  if (list.isPending) {
    body = (
      <div className="panel">
        <LoadingSkeleton label="Cargando tus categorías" rows={4} />
      </div>
    );
  } else if (list.isError && !data) {
    body = (
      <div className="panel">
        <ErrorState title="No pudimos cargar las categorías" text={getErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      </div>
    );
  } else if (data && data.total === 0) {
    body = (
      <div className="panel">
        <EmptyState title="Aún no tienes categorías" text="Crea una categoría para clasificar tus movimientos y tus metas." action={newButton} />
      </div>
    );
  } else if (data) {
    body = (
      <div className={`panel table-wrap${list.isFetching ? ' list-busy' : ''}`} aria-busy={list.isFetching || undefined}>
        <CategoriesTable
          categories={data.items}
          onEdit={(item) => setDialog({ kind: 'form', category: item })}
          onDelete={(item) => setDialog({ kind: 'delete', category: item })}
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
        title="Categorías"
        description="Las categorías del sistema se pueden usar, pero no editar. Las tuyas las administras aquí."
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

      {dialog?.kind === 'form' && <CategoryFormDialog key={dialog.category?.id ?? 'new'} category={dialog.category} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteCategoryDialog category={dialog.category} onClose={() => setDialog(null)} />}
    </>
  );
}
