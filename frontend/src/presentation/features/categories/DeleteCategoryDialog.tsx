import { useState } from 'react';
import type { Category } from '../../../domain/types';
import { getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { useToast } from '../../components/Toast';
import { useDeleteCategory } from './useCategories';

interface DeleteCategoryDialogProps {
  category: Category;
  onClose: () => void;
}

export function DeleteCategoryDialog({ category, onClose }: DeleteCategoryDialogProps) {
  const { notify } = useToast();
  const remove = useDeleteCategory();
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setMessage('');
    try {
      await remove.mutateAsync(category.id);
      notify('Categoría eliminada');
      onClose();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <Dialog
      title="Eliminar categoría"
      submitLabel="Eliminar"
      busyLabel="Eliminando…"
      danger
      busy={remove.isPending}
      onClose={onClose}
      onSubmit={() => void handleSubmit()}
    >
      {message && <Banner kind="error">{message}</Banner>}
      <p>
        ¿Eliminar la categoría <b>{category.name}</b>?
      </p>
      <p className="hint">Sus movimientos se conservan y pasarán a mostrarse con «Categoría no disponible».</p>
    </Dialog>
  );
}
