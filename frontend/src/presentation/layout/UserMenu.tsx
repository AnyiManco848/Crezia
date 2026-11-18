import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '../../domain/user';
import { useAuth } from '../app/useAuth';
import { Icon } from '../components/Icon';

// "Menu button" pattern (WAI-ARIA): Enter, Space or Down open it; Esc closes and returns the focus;
// Tab and clicking outside close it. "Mi perfil" is not here yet: the backend has no profile endpoint.
export function UserMenu({ variant }: { variant: 'sidebar' | 'topbar' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const menuId = `${id}-menu`;

  useEffect(() => {
    if (open) itemRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!user) return null;

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); // One item only: the focus stays on it.
    }
  };

  const onLogout = () => {
    setOpen(false);
    navigate('/login', { replace: true });
    logout();
  };

  const initials = getInitials(user.name);
  const sidebar = variant === 'sidebar';

  return (
    <div className={`user-wrap ${sidebar ? 'sb' : 'tb'}`} ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`user-btn${sidebar ? '' : ' compact'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
        {sidebar ? (
          <>
            <span className="u-text">
              <span className="sr-only">Menú de cuenta:</span> <b>{user.name}</b> <small>{user.email}</small>
            </span>
            <Icon name="chev" className="chev" />
          </>
        ) : (
          <span className="sr-only">Menú de cuenta: {user.name}</span>
        )}
      </button>
      <div
        className={`user-menu${open ? ' open' : ''}`}
        id={menuId}
        role="menu"
        aria-label="Menú de cuenta"
        onKeyDown={onMenuKeyDown}
      >
        <button ref={itemRef} type="button" role="menuitem" tabIndex={-1} onClick={onLogout}>
          <Icon name="out" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}
