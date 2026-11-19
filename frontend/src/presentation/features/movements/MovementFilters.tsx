import { isRangeInvalid, RANGE_ERROR, type MovementFilters as Filters } from '../../../domain/movementFilters';
import { TYPE_LABELS } from '../../../domain/labels';
import { MOVEMENT_TYPES, type BankAccount, type Category, type MovementType } from '../../../domain/types';
import { Field } from '../../components/Field';
import { accountLabel } from './catalogNames';

interface MovementFiltersProps {
  filters: Filters;
  categories: Category[];
  accounts: BankAccount[];
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

// Filters apply as soon as they change (no "Apply" button). An invalid range shows its error and is not sent.
export function MovementFilters({ filters, categories, accounts, onChange, onClear }: MovementFiltersProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const rangeError = isRangeInvalid(filters) ? RANGE_ERROR : undefined;

  return (
    <form className="panel filters" aria-label="Filtros de movimientos" onSubmit={(event) => event.preventDefault()}>
      <Field label="Tipo">
        {(control) => (
          <select
            {...control}
            className="select"
            value={filters.type}
            onChange={(event) => set({ type: event.target.value as '' | MovementType })}
          >
            <option value="">Todos</option>
            {MOVEMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Categoría">
        {(control) => (
          <select {...control} className="select" value={filters.categoryId} onChange={(event) => set({ categoryId: event.target.value })}>
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Cuenta">
        {(control) => (
          <select
            {...control}
            className="select"
            value={filters.bankAccountId}
            onChange={(event) => set({ bankAccountId: event.target.value })}
          >
            <option value="">Todas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Desde">
        {(control) => (
          <input {...control} className="input" type="date" value={filters.from} onChange={(event) => set({ from: event.target.value })} />
        )}
      </Field>
      <Field label="Hasta" error={rangeError}>
        {(control) => (
          <input {...control} className="input" type="date" value={filters.to} onChange={(event) => set({ to: event.target.value })} />
        )}
      </Field>
      <button type="button" className="btn secondary clear" onClick={onClear}>
        Limpiar filtros
      </button>
    </form>
  );
}
