import type { Category } from '../../../domain/types';
import { Icon } from '../../components/Icon';

interface CategoriesTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

// System categories (userId null) are read-only: they show a "Del sistema" chip and no action buttons.
// On a phone the CSS turns each row into a card; the data-label attributes carry the column names.
export function CategoriesTable({ categories, onEdit, onDelete }: CategoriesTableProps) {
  return (
    <table>
      <caption className="sr-only">Categorías</caption>
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Descripción</th>
          <th scope="col">Origen</th>
          <th scope="col" className="actions">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => {
          const system = category.userId === null;
          return (
            <tr key={category.id}>
              <td className="main-cell" data-label="Nombre">
                <div className="cell-title">{category.name}</div>
              </td>
              <td data-label="Descripción">{category.description || <span className="hint">Sin descripción</span>}</td>
              <td data-label="Origen">
                <span className={`chip ${system ? 'neutral' : 'info'}`}>{system ? 'Del sistema' : 'Tuya'}</span>
              </td>
              <td className="actions">
                {!system && (
                  <>
                    <button type="button" className="icon-btn" aria-label={`Editar ${category.name}`} title="Editar" onClick={() => onEdit(category)}>
                      <Icon name="edit" />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Eliminar ${category.name}`} title="Eliminar" onClick={() => onDelete(category)}>
                      <Icon name="trash" />
                    </button>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
