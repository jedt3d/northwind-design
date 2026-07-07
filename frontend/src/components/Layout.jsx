import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { currentUser, currentRole, logout } from '../pb';
import { useT, LANGS } from '../i18n/index.jsx';

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', roles: ['sales', 'purchasing', 'warehouse', 'manager', 'admin'], end: true },
  { to: '/orders', key: 'nav.orders', roles: ['sales', 'manager', 'admin'] },
  { to: '/purchase-orders', key: 'nav.pos', roles: ['purchasing', 'warehouse', 'manager', 'admin'] },
  { to: '/products', key: 'nav.products', roles: ['sales', 'purchasing', 'manager', 'admin'] },
  { to: '/categories', key: 'nav.categories', roles: ['purchasing', 'manager', 'admin'] },
  { to: '/inventory', key: 'nav.inventory', roles: ['purchasing', 'warehouse', 'manager', 'admin'] },
  { to: '/companies', key: 'nav.companies', roles: ['sales', 'manager', 'admin'] },
  { to: '/reports', key: 'nav.reports', roles: ['manager', 'admin'] },
  { to: '/employees', key: 'nav.admin', roles: ['admin'] },
  { to: '/settings', key: 'nav.settings', roles: ['sales', 'purchasing', 'warehouse', 'manager', 'admin'] },
];

function NavList({ items, t, onNavigate }) {
  return (
    <nav className="nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
          onClick={onNavigate}
        >
          {t(item.key)}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { t, lang, setLang } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const user = currentUser();
  const role = currentRole();
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const doLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">{t('app.name')}</div>
        <NavList items={items} t={t} />
      </aside>

      <div className="layout-main">
        <header className="topbar">
          <button
            type="button"
            className="topbar-hamburger"
            aria-label={t('nav.menu')}
            onClick={() => setDrawerOpen(true)}
          >
            ☰
          </button>
          <div className="topbar-title">{t('app.name')}</div>
          <div className="topbar-spacer" />
          <label className="topbar-lang">
            <span className="visually-hidden">{t('settings.language')}</span>
            <select className="input topbar-lang-select" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {t(`lang.${l}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="topbar-user" ref={userMenuRef}>
            <button type="button" className="topbar-user-btn" onClick={() => setUserMenuOpen((o) => !o)}>
              {user ? `${user.first_name || user.username}` : ''}
            </button>
            {userMenuOpen && (
              <div className="topbar-user-menu">
                <div className="topbar-user-info">
                  <div className="topbar-user-name">
                    {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : ''}
                  </div>
                  <div className="topbar-user-role">{role ? t(`role.${role}`) : ''}</div>
                </div>
                <NavLink to="/settings" className="topbar-user-item">
                  {t('nav.settings')}
                </NavLink>
                <button type="button" className="topbar-user-item topbar-user-item--logout" onClick={doLogout}>
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <div className="sheet">
            <Outlet />
          </div>
        </main>
      </div>

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="sidebar-logo">{t('app.name')}</span>
              <button type="button" className="drawer-close" aria-label={t('common.close')} onClick={() => setDrawerOpen(false)}>
                ×
              </button>
            </div>
            <NavList items={items} t={t} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
