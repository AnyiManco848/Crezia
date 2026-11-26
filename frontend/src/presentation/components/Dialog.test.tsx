import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

afterEach(() => {
  vi.restoreAllMocks();
  // Remove the native-dialog stubs some tests install on the jsdom prototype.
  delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal;
  delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close;
});

function setup(props: Partial<Parameters<typeof Dialog>[0]> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  render(
    <Dialog title="Nueva cuenta" onClose={onClose} onSubmit={onSubmit} {...props}>
      <input aria-label="Nombre" />
    </Dialog>,
  );
  return { onClose, onSubmit };
}

describe('Dialog', () => {
  it('is an open dialog named after its title, with the default labels', () => {
    setup();

    const dialog = screen.getByRole('dialog', { name: 'Nueva cuenta' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeEnabled();
  });

  it('submits through the form without letting the browser navigate', async () => {
    const { onSubmit } = setup({ submitLabel: 'Crear' });

    await userEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('closes with Cancelar and with the X', async () => {
    const { onClose } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('asks the page to close on Escape instead of closing by itself', () => {
    const { onClose } = setup();
    const cancel = new Event('cancel', { cancelable: true });

    screen.getByRole('dialog').dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('while a request is in flight (busy)', () => {
    it('disables every button and shows the busy label', () => {
      setup({ busy: true, busyLabel: 'Eliminando…', submitLabel: 'Eliminar' });

      expect(screen.getByRole('button', { name: 'Eliminando…' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog').querySelector('form')).toHaveAttribute('aria-busy', 'true');
    });

    it('ignores Escape and a second submit', () => {
      const { onClose, onSubmit } = setup({ busy: true });
      const cancel = new Event('cancel', { cancelable: true });

      screen.getByRole('dialog').dispatchEvent(cancel);
      fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

      expect(cancel.defaultPrevented).toBe(true);
      expect(onClose).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('marks the confirm button as dangerous for destructive dialogs only', () => {
    setup({ danger: true, submitLabel: 'Eliminar' });

    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('danger');
  });

  it('does not mark the confirm button as dangerous by default', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Guardar' })).not.toHaveClass('danger');
  });

  it('gives the focus back to the button that opened it when it is closed', async () => {
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Abrir</button>
          {open && (
            <Dialog title="Editar" onClose={() => setOpen(false)} onSubmit={() => undefined}>
              <p>contenido</p>
            </Dialog>
          )}
        </>
      );
    }
    render(<Page />);
    const opener = screen.getByRole('button', { name: 'Abrir' });
    opener.focus();

    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Editar' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('uses the native modal API when the browser has it and closes it on unmount', () => {
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    Object.assign(HTMLDialogElement.prototype, { showModal, close });

    const { unmount } = render(
      <Dialog title="Nativo" onClose={() => undefined} onSubmit={() => undefined}>
        <p>x</p>
      </Dialog>,
    );
    expect(showModal).toHaveBeenCalledTimes(1);

    unmount();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
