import { formatDate } from '../../../domain/dates';
import { PAYMENT_LABELS, TYPE_LABELS } from '../../../domain/labels';
import { formatMoney } from '../../../domain/money';
import type { BankAccount, Category, Movement } from '../../../domain/types';
import { Icon } from '../../components/Icon';
import { accountLabel, MISSING_ACCOUNT_LABEL, MISSING_CATEGORY_LABEL, NO_ACCOUNT_LABEL } from './catalogNames';

interface MovementsTableProps {
  movements: Movement[];
  categories: Category[];
  accounts: BankAccount[];
  // False while the catalogs are still loading, so names are not shown as "not available" by mistake.
  catalogsReady: boolean;
  onEdit: (movement: Movement) => void;
  onDelete: (movement: Movement) => void;
}

// On a phone the CSS turns each row into a card; the data-label attributes carry the column names.
export function MovementsTable({ movements, categories, accounts, catalogsReady, onEdit, onDelete }: MovementsTableProps) {
  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? (catalogsReady ? MISSING_CATEGORY_LABEL : '…');
  const accountName = (id: string | null) => {
    if (id === null) return NO_ACCOUNT_LABEL;
    const account = accounts.find((item) => item.id === id);
    return account ? accountLabel(account) : catalogsReady ? MISSING_ACCOUNT_LABEL : '…';
  };

  return (
    <table>
      <caption className="sr-only">Movimientos</caption>
      <thead>
        <tr>
          <th scope="col">Descripción</th>
          <th scope="col">Cuenta</th>
          <th scope="col">Método</th>
          <th scope="col">Tipo</th>
          <th scope="col" className="num">
            Monto
          </th>
          <th scope="col" className="actions">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {movements.map((movement) => {
          const income = movement.type === 'Income';
          const name = movement.description || 'movimiento';
          return (
            <tr key={movement.id}>
              <td className="main-cell" data-label="Descripción">
                <div className="cell-title">{movement.description || 'Sin descripción'}</div>
                <div className="cell-sub">
                  {formatDate(movement.date)} · {categoryName(movement.categoryId)}
                </div>
              </td>
              <td data-label="Cuenta">{accountName(movement.bankAccountId)}</td>
              <td data-label="Método">{PAYMENT_LABELS[movement.paymentMethod]}</td>
              <td data-label="Tipo">
                <span className={`chip ${income ? 'ok' : 'danger'}`}>{TYPE_LABELS[movement.type]}</span>
              </td>
              <td className="num amount-cell">
                <span className={`amount ${income ? 'income' : 'expense'}`}>
                  {income ? '+' : '−'} {formatMoney(movement.amount, movement.currencyCode)}
                </span>
              </td>
              <td className="actions">
                <button type="button" className="icon-btn" aria-label={`Editar ${name}`} title="Editar" onClick={() => onEdit(movement)}>
                  <Icon name="edit" />
                </button>
                <button type="button" className="icon-btn" aria-label={`Eliminar ${name}`} title="Eliminar" onClick={() => onDelete(movement)}>
                  <Icon name="trash" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
