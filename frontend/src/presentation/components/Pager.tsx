import { useId } from 'react';
import { pageCount } from '../../infrastructure/http/pagination';

export const PAGE_SIZES = [10, 20, 50, 100] as const;

interface PagerProps {
  page: number;
  limit: number;
  total: number;
  // The items of the current page, to write "Mostrando 21–40 de 57" correctly on the last page.
  shown: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
}

export function Pager({ page, limit, total, shown, onPageChange, onLimitChange, disabled = false }: PagerProps) {
  const selectId = useId();
  const pages = pageCount({ total, limit });
  const from = total === 0 || shown === 0 ? 0 : (page - 1) * limit + 1;
  const to = shown === 0 ? 0 : (page - 1) * limit + shown;

  return (
    <div className="pager">
      <span>
        Mostrando {from}–{to} de {total}
      </span>
      <div className="controls">
        <label htmlFor={selectId} className="sr-only">
          Elementos por página
        </label>
        <select
          id={selectId}
          className="select"
          value={limit}
          disabled={disabled}
          onChange={(event) => onLimitChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} por página
            </option>
          ))}
        </select>
        <button type="button" className="btn secondary" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </button>
        <span aria-live="polite">
          Página {page} de {pages}
        </span>
        <button type="button" className="btn secondary" disabled={disabled || page >= pages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
