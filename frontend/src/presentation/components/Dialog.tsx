import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

interface DialogProps {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  busyLabel?: string;
  // While true the dialog cannot be closed or submitted again (a request is in flight).
  busy?: boolean;
  danger?: boolean;
  children: ReactNode;
}

// Modal form on the native <dialog>: focus trap, Escape and the inert background come from the browser.
// The page that renders it decides when it exists; closing means unmounting it.
export function Dialog({ title, onClose, onSubmit, submitLabel = 'Guardar', busyLabel = 'Guardando…', busy = false, danger = false, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // jsdom (tests) has no showModal; the attribute is enough there.
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');

    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      // Back to the button that opened it, so keyboard users keep their place.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!busy) onSubmit();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // Escape: the page closes it, so it cannot close during a request
        if (!busy) onClose();
      }}
    >
      <form noValidate onSubmit={handleSubmit} aria-busy={busy || undefined}>
        <div className="dlg-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose} disabled={busy}>
            <Icon name="close" />
          </button>
        </div>
        <div className="dlg-body">{children}</div>
        <div className="dlg-foot">
          <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className={`btn${danger ? ' danger' : ''}`} disabled={busy}>
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
