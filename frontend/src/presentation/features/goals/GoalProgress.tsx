import { describeGoalProgress } from '../../../domain/goalProgress';
import type { Goal } from '../../../domain/types';
import { Icon } from '../../components/Icon';

// Progress bar with its value in text. The state (met / exceeded) is spelled out and marked with a check, so it never
// depends on color alone; the bar of an exceeded goal also gets a striped pattern.
export function GoalProgress({ goal }: { goal: Goal }) {
  const view = describeGoalProgress(goal);
  const done = view.state === 'met' || view.state === 'exceeded';
  const className = `progress${view.state === 'met' ? ' done' : ''}${view.state === 'exceeded' ? ' done over' : ''}`;
  const percentText = `${String(view.percentage).replace('.', ',')} %`;

  return (
    <div className="goal-progress">
      <div
        className={className}
        role="progressbar"
        aria-label={`Progreso de ${goal.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={view.percentage}
        aria-valuetext={view.valueText}
      >
        <div style={{ width: `${view.percentage}%` }} />
      </div>
      <div className="cell-sub">
        <b className="goal-pct">{percentText}</b> · {view.summary}
      </div>
      <div className={`cell-sub goal-msg ${view.state}`}>
        {done && <Icon name="check" />}
        {view.message}
      </div>
    </div>
  );
}
