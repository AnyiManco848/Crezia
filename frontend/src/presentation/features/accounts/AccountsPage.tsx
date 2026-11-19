import { useState } from 'react';
import type { BankAccount } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { pageCount } from '../../../infrastructure/http/pagination';
import { Icon } from '../../components/Icon';
import { PageHeader } from '../../components/PageHeader';
import { Pager } from '../../components/Pager';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/StateBlock';
import { AccountCard } from './AccountCard';
import { AccountFormDialog } from './AccountFormDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { useAccountList } from './useAccounts';

const DEFAULT_LIMIT = 20;

type DialogState = { kind: 'form'; account: BankAccount | null } | { kind: 'delete'; account: BankAccount } | null;

export function AccountsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [dialog, setDialog] = useState<DialogState>(null);
  const list = useAccountList(page, limit);
  const data = list.data;

  // After deleting the last account of the last page the API answers an empty page: go back to the new last one.
  if (data && !list.isPlaceholderData && data.items.length === 0 && data.total > 0 && page > pageCount(data)) {
    setPage(pageCount(data));
  }

  const newButton = (
    <button type="button" className="btn" onClick={() => setDialog({ kind: 'form', account: null })}>
      <Icon name="plus" />
      Nueva cuenta
    </button>
  );

  let body;
  if (list.isPending) {
    body = (
      <div className="panel">
        <LoadingSkeleton label="Cargando tus cuentas" rows={3} />
      </div>
    );
  } else if (list.isError && !data) {
    body = (
      <div className="panel">
        <ErrorState title="No pudimos cargar las cuentas" text={getErrorMessage(list.error)} onRetry={() => void list.refetch()} />
      </div>
    );
  } else if (data && data.total === 0) {
    body = (
      <div className="panel">
        <EmptyState title="Aún no tienes cuentas" text="Agrega una cuenta para ver su saldo, calculado con tus movimientos." action={newButton} />
      </div>
    );
  } else if (data) {
    body = (
      <>
        <div className={`cards${list.isFetching ? ' list-busy' : ''}`} aria-busy={list.isFetching || undefined}>
          {data.items.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={(item) => setDialog({ kind: 'form', account: item })}
              onDelete={(item) => setDialog({ kind: 'delete', account: item })}
            />
          ))}
        </div>
        <div className="panel pager-panel">
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
      </>
    );
  }

  return (
    <>
      <PageHeader title="Cuentas" description="El saldo de cada cuenta se calcula con tus ingresos y gastos." actions={newButton} />
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

      {dialog?.kind === 'form' && <AccountFormDialog key={dialog.account?.id ?? 'new'} account={dialog.account} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteAccountDialog account={dialog.account} onClose={() => setDialog(null)} />}
    </>
  );
}
