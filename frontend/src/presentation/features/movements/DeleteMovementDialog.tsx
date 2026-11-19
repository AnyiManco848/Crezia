import { useState } from 'react';
import { formatDate } from '../../../domain/dates';
import { formatMoney } from '../../../domain/money';
import type { Movement } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { useDeleteMovement } from './useMovements';

interface DeleteMovementDialogProps {
  movement: Movement;
  onClose: () => void;
}

export function DeleteMovementDialog({ movement, onClose }: DeleteMovementDialogProps) {
  const { notify } = useToast();
  const remove = useDeleteMovement();
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setMessage('');
    try {
      await remove.mutateAsync(movement.id);
      notify('Movimiento eliminado');
      onClose();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <Dialog
      title="Eliminar movimiento"
      submitLabel="Eliminar"
      busyLabel="Eliminando…"
      danger
      busy={remove.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
    >
      {message && <Banner kind="error">{message}</Banner>}
      <p>
        ¿Eliminar este movimiento? <b>{movement.description || 'Sin descripción'}</b> ({formatDate(movement.date)},{' '}
        {formatMoney(movement.amount, movement.currencyCode)})
      </p>
      <p className="hint">Dejará de contar en tus totales y en el saldo de su cuenta.</p>
    </Dialog>
  );
}
