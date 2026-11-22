import { formatDate } from '../../../domain/dates';
import { GOAL_REASON_LABELS, GOAL_STATUS_LABELS } from '../../../domain/labels';
import { formatMoney } from '../../../domain/money';
import type { Category, Goal, GoalStatus } from '../../../domain/types';
import { Icon } from '../../components/Icon';
import { MISSING_CATEGORY_LABEL } from '../movements/catalogNames';
import { GoalProgress } from './GoalProgress';

const STATUS_CHIP: Record<GoalStatus, string> = { Active: 'info', Completed: 'ok', Cancelled: 'neutral', Overdue: 'warn' };

interface GoalsTableProps {
  goals: Goal[];
  categories: Category[];
  // False while the categories are still loading, so names are not shown as "not available" by mistake.
  catalogsReady: boolean;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

// On a phone the CSS turns each row into a card; the data-label attributes carry the column names.
export function GoalsTable({ goals, categories, catalogsReady, onEdit, onDelete }: GoalsTableProps) {
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? (catalogsReady ? MISSING_CATEGORY_LABEL : '…');

  return (
    <table>
      <caption className="sr-only">Metas de ahorro</caption>
      <thead>
        <tr>
          <th scope="col">Meta</th>
          <th scope="col">Categoría</th>
          <th scope="col" className="num">
            Monto objetivo
          </th>
          <th scope="col">Fechas</th>
          <th scope="col">Progreso</th>
          <th scope="col">Estado</th>
          <th scope="col" className="actions">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {goals.map((goal) => (
          <tr key={goal.id}>
            <td className="main-cell" data-label="Meta">
              <div className="cell-title">{goal.name}</div>
              <div className="cell-sub">{goal.reason === 'Other' && goal.reasonOther ? goal.reasonOther : GOAL_REASON_LABELS[goal.reason]}</div>
            </td>
            <td data-label="Categoría">{categoryName(goal.categoryId)}</td>
            <td className="num amount-cell" data-label="Monto objetivo">
              {formatMoney(goal.targetAmount, goal.currencyCode)}
            </td>
            <td data-label="Fechas">
              <div>
                <span className="cell-sub">Del </span>
                {formatDate(goal.startDate)}
              </div>
              <div>
                <span className="cell-sub">al </span>
                {formatDate(goal.endDate)}
              </div>
            </td>
            <td className="progress-cell" data-label="Progreso">
              <GoalProgress goal={goal} />
            </td>
            <td data-label="Estado">
              <span className={`chip ${STATUS_CHIP[goal.status]}`}>{GOAL_STATUS_LABELS[goal.status]}</span>
            </td>
            <td className="actions">
              <button type="button" className="icon-btn" aria-label={`Editar ${goal.name}`} title="Editar" onClick={() => onEdit(goal)}>
                <Icon name="edit" />
              </button>
              <button type="button" className="icon-btn" aria-label={`Eliminar ${goal.name}`} title="Eliminar" onClick={() => onDelete(goal)}>
                <Icon name="trash" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
