import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Logo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { NAV_ITEMS } from './nav';
import { UserMenu } from './UserMenu';

function NavLinks() {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );
}

// Desktop (>= 1100 px): 248 px sidebar. Tablet: 92 px compact sidebar. Phone (< 720 px): top bar + bottom nav.
// The breakpoints live in the CSS; all three navigations are in the DOM and the hidden ones are display:none.
export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const firstRender = useRef(true);

  // After navigating, the focus goes to <main> so screen readers announce the new page.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <>
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <div className="app">
        <aside className="sidebar">
          <Brand />
          <nav className="nav" aria-label="Principal">
            <NavLinks />
          </nav>
          <div className="side-foot">
            <UserMenu variant="sidebar" />
          </div>
        </aside>
        <div>
          <header className="topbar">
            <Brand />
            <div className="top-actions">
              <ThemeToggle />
              <UserMenu variant="topbar" />
            </div>
          </header>
          <main className="main" id="contenido" tabIndex={-1} ref={mainRef}>
            <Outlet />
          </main>
        </div>
        <nav className="bottomnav" aria-label="Principal (móvil)">
          <NavLinks />
        </nav>
      </div>
    </>
  );
}
