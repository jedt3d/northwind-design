import { useEffect, useId, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { currentUser, currentRole, logout } from '../pb';
import { useT, LANGS } from '../i18n/index.jsx';

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, roles: ['sales', 'purchasing', 'warehouse', 'manager', 'admin'], end: true },
  { to: '/orders', key: 'nav.orders', icon: ShoppingCart, roles: ['sales', 'manager', 'admin'] },
  { to: '/purchase-orders', key: 'nav.pos', icon: PackagePlus, roles: ['purchasing', 'warehouse', 'manager', 'admin'] },
  { to: '/products', key: 'nav.products', icon: Package, roles: ['sales', 'purchasing', 'manager', 'admin'] },
  { to: '/categories', key: 'nav.categories', icon: Tags, roles: ['purchasing', 'manager', 'admin'] },
  { to: '/inventory', key: 'nav.inventory', icon: Warehouse, roles: ['purchasing', 'warehouse', 'manager', 'admin'] },
  { to: '/companies', key: 'nav.companies', icon: Building2, roles: ['sales', 'manager', 'admin'] },
  { to: '/reports', key: 'nav.reports', icon: BarChart3, roles: ['manager', 'admin'] },
  { to: '/employees', key: 'nav.admin', icon: Users, roles: ['admin'] },
  { to: '/settings', key: 'nav.settings', icon: Settings, roles: ['sales', 'purchasing', 'warehouse', 'manager', 'admin'] },
];

/** Sage triangle-stripes logo mark. */
export function LogoMark({ size = 26 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <defs>
        <clipPath id={`lm-${uid}`}>
          <path d="M14 2.2 26.2 25.8H1.8Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#lm-${uid})`}>
        <rect x="0" y="3" width="28" height="6" fill="var(--color-sage-border)" />
        <rect x="0" y="11" width="28" height="6" fill="var(--color-sage)" />
        <rect x="0" y="19" width="28" height="7" fill="var(--color-sage-strong)" />
      </g>
    </svg>
  );
}

function NavList({ items, t, onNavigate }) {
  return (
    <nav className="nav">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' nav-item--active' : ''}`}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" />
            {t(item.key)}
          </NavLink>
        );
      })}
    </nav>
  );
}

function userInitials(user) {
  if (!user) return '';
  const a = (user.first_name || user.username || '')[0] || '';
  const b = (user.last_name || '')[0] || '';
  return `${a}${b}`.toUpperCase() || '?';
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
        <div className="sidebar-logo">
          <LogoMark />
          {t('app.name')}
        </div>
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
            <Menu aria-hidden="true" size={20} />
          </button>
          <div className="topbar-title">
            <LogoMark size={22} />
            <span className="topbar-title-text">{t('app.name')}</span>
          </div>
          <div className="topbar-spacer" />
          <label className="topbar-lang">
            <Globe aria-hidden="true" size={16} />
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
              <span className="topbar-avatar" aria-hidden="true">
                {userInitials(user)}
              </span>
              <span className="topbar-user-label">{user ? `${user.first_name || user.username}` : ''}</span>
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
                  <Settings aria-hidden="true" size={16} />
                  {t('nav.settings')}
                </NavLink>
                <button type="button" className="topbar-user-item topbar-user-item--logout" onClick={doLogout}>
                  <LogOut aria-hidden="true" size={16} />
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
              <span className="sidebar-logo">
                <LogoMark />
                {t('app.name')}
              </span>
              <button type="button" className="drawer-close" aria-label={t('common.close')} onClick={() => setDrawerOpen(false)}>
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <NavList items={items} t={t} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
