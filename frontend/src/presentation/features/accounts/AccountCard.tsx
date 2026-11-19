import { ACCOUNT_TYPE_LABELS } from '../../../domain/labels';
import { formatSignedBalance, toCents } from '../../../domain/money';
import type { BankAccount } from '../../../domain/types';
import { Icon } from '../../components/Icon';

interface AccountCardProps {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const balance = account.balance ?? '0';
  const negative = toCents(balance) < 0;

  return (
    <article className="panel card">
      <div className="card-head">
        <div>
          <h2>{account.bankName}</h2>
          <div className="cell-sub">{account.accountAlias || 'Sin alias'}</div>
        </div>
        <span className="chip info">{ACCOUNT_TYPE_LABELS[account.accountType]}</span>
      </div>
      <div>
        <div className="cell-sub">Saldo</div>
        <div className={`balance${negative ? ' neg' : ''}`}>{formatSignedBalance(balance, account.currencyCode)}</div>
      </div>
      <div className="meta-line">
        <span>Moneda {account.currencyCode}</span>
      </div>
      <div className="card-actions">
        <button type="button" className="icon-btn" aria-label={`Editar ${account.bankName}`} onClick={() => onEdit(account)}>
          <Icon name="edit" />
        </button>
        <button type="button" className="icon-btn" aria-label={`Eliminar ${account.bankName}`} onClick={() => onDelete(account)}>
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}
