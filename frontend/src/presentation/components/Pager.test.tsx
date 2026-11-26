import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pager } from './Pager';

function setup(props: Partial<Parameters<typeof Pager>[0]> = {}) {
  const onPageChange = vi.fn();
  const onLimitChange = vi.fn();
  render(<Pager page={1} limit={20} total={57} shown={20} onPageChange={onPageChange} onLimitChange={onLimitChange} {...props} />);
  return { onPageChange, onLimitChange };
}

describe('Pager', () => {
  it('says "Mostrando 0–0 de 0" and offers no way to move when there is nothing', () => {
    setup({ total: 0, shown: 0 });

    expect(screen.getByText('Mostrando 0–0 de 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('counts the shown items on the last, partial page', () => {
    setup({ page: 3, shown: 17 });

    expect(screen.getByText('Mostrando 41–57 de 57')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('asks for the previous and the next page', async () => {
    const { onPageChange } = setup({ page: 2, shown: 20 });

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it('reports a new page size as a number', async () => {
    const { onLimitChange } = setup();

    await userEvent.selectOptions(screen.getByLabelText('Elementos por página'), '50');

    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('disables every control while it is busy', () => {
    setup({ page: 2, disabled: true });

    expect(screen.getByLabelText('Elementos por página')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});
