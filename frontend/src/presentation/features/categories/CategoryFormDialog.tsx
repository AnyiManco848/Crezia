import { useEffect, useRef, useState } from 'react';
import {
  CATEGORY_FORM_FIELDS,
  emptyCategoryForm,
  formFromCategory,
  MAX_CATEGORY_DESCRIPTION,
  MAX_CATEGORY_NAME,
  validateCategoryForm,
  type CategoryFormErrors,
  type CategoryFormValues,
} from '../../../application/validation/categoryForm';
import type { Category } from '../../../domain/types';
import { ApiError, getErrorMessage } from '../../../infrastructure/http/errors';
import { Banner } from '../../components/Banner';
import { Dialog } from '../../components/Dialog';
import { Field } from '../../components/Field';
import { useToast } from '../../components/Toast';
import { useSaveCategory } from './useCategories';

interface CategoryFormDialogProps {
  // null = a new category.
  category: Category | null;
  onClose: () => void;
}

export function CategoryFormDialog({ category, onClose }: CategoryFormDialogProps) {
  const editing = category !== null;
  const { notify } = useToast();
  const save = useSaveCategory(category?.id ?? null);
  const [values, setValues] = useState<CategoryFormValues>(() => (category ? formFromCategory(category) : emptyCategoryForm()));
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [serverMessage, setServerMessage] = useState('');
  const [focusTick, setFocusTick] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // After a failed submit the focus goes to the first field with an error (and to the banner if there is none).
  useEffect(() => {
    if (focusTick === 0) return;
    bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .banner')?.focus();
  }, [focusTick]);

  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  async function handleSubmit() {
    setServerMessage('');
    const result = validateCategoryForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      setFocusTick((tick) => tick + 1);
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(result.payload);
      notify(editing ? 'Categoría actualizada' : 'Categoría creada');
      onClose();
    } catch (error) {
      // What the person typed is kept. A 400 marks the fields; anything else (403 system category, 404 already
      // deleted, network) goes to the banner.
      const fieldErrors: CategoryFormErrors = {};
      let message = '';
      if (error instanceof ApiError && error.status === 400) {
        const byField = error.fieldErrors();
        for (const field of CATEGORY_FORM_FIELDS) if (byField[field]) fieldErrors[field] = byField[field];
        if (Object.keys(fieldErrors).length === 0) message = error.message;
      } else {
        message = getErrorMessage(error);
      }
      setErrors(fieldErrors);
      setServerMessage(message);
      setFocusTick((tick) => tick + 1);
    }
  }

  return (
    <Dialog title={editing ? 'Editar categoría' : 'Nueva categoría'} onClose={onClose} onSubmit={() => void handleSubmit()} busy={save.isPending}>
      <div ref={bodyRef}>
        {serverMessage && <Banner kind="error">{serverMessage}</Banner>}
        <div className="form-grid">
          <Field label="Nombre" error={errors.name}>
            {(control) => (
              <input
                {...control}
                className="input"
                maxLength={MAX_CATEGORY_NAME}
                autoComplete="off"
                value={values.name}
                onChange={(event) => set('name', event.target.value)}
              />
            )}
          </Field>
          <Field label="Descripción (opcional)" error={errors.description}>
            {(control) => (
              <textarea
                {...control}
                className="input"
                rows={3}
                maxLength={MAX_CATEGORY_DESCRIPTION}
                value={values.description}
                onChange={(event) => set('description', event.target.value)}
              />
            )}
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
