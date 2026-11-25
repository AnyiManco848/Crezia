import { useState } from 'react';
import type { Goal } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { useDeleteGoal } from './useGoals';

interface DeleteGoalDialogProps {
  goal: Goal;
  onClose: () => void;
}

export function DeleteGoalDialog({ goal, onClose }: DeleteGoalDialogProps) {
  const { notify } = useToast();
  const remove = useDeleteGoal();
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setMessage('');
    try {
      await remove.mutateAsync(goal.id);
      notify('Meta eliminada');
      onClose();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <Dialog
      title="Eliminar meta"
      submitLabel="Eliminar"
      busyLabel="Eliminando…"
      danger
      busy={remove.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
    >
      {message && <Banner kind="error">{message}</Banner>}
      <p>
        ¿Eliminar la meta <b>{goal.name}</b>?
      </p>
      <p className="hint">Tus movimientos no cambian: solo se quita la meta y su progreso.</p>
    </Dialog>
  );
}
