import type { IconName } from '../components/Icon';

export const NAV_ITEMS: ReadonlyArray<{ to: string; label: string; icon: IconName }> = [
  { to: '/panel', label: 'Panel', icon: 'panel' },
  { to: '/movimientos', label: 'Movimientos', icon: 'mov' },
  { to: '/cuentas', label: 'Cuentas', icon: 'acc' },
  { to: '/metas', label: 'Metas', icon: 'goal' },
  { to: '/categorias', label: 'Categorías', icon: 'cat' },
];
