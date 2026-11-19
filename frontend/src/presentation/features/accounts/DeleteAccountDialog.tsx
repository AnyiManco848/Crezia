import { useState } from 'react';
import type { BankAccount } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { accountLabel } from '../movements/catalogNames';
import { useDeleteAccount } from './useAccounts';

interface DeleteAccountDialogProps {
  account: BankAccount;
  onClose: () => void;
}

export function DeleteAccountDialog({ account, onClose }: DeleteAccountDialogProps) {
  const { notify } = useToast();
  const remove = useDeleteAccount();
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setMessage('');
    try {
      await remove.mutateAsync(account.id);
      notify('Cuenta eliminada');
      onClose();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <Dialog
      title="Eliminar cuenta"
      submitLabel="Eliminar"
      busyLabel="Eliminando…"
      danger
      busy={remove.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
    >
      {message && <Banner kind="error">{message}</Banner>}
      <p>
        ¿Eliminar la cuenta <b>{accountLabel(account)}</b>?
      </p>
      <p className="hint">Sus movimientos se conservan y pasarán a mostrarse con «Cuenta no disponible».</p>
    </Dialog>
  );
}
