import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logo } from '@/lib/site-media';

// Reference header: four links plus "Shop coffee". `overlay` sits transparent over the
// hero; `solid` is the forest bar for pages without a hero.
//
// On the homepage the first three links scroll to sections; elsewhere they go to the
// matching pages. Subscribe and Shop are always routes.
const HOME_PATHS = ['/', '/home-v2'];

type NavLink = { label: string; anchor: string; route: string };

const LINKS: NavLink[] = [
  { label: 'Our coffees', anchor: '#coffees', route: '/shop' },
  { label: 'Our story', anchor: '#story', route: '/about' },
  { label: 'The slow ritual', anchor: '#films', route: '/processing' },
];

function NavItem({ link, onHome, onClick, children }: { link: NavLink; onHome: boolean; onClick?: () => void; children: React.ReactNode }) {
  return onHome
    ? <a href={link.anchor} onClick={onClick}>{children}</a>
    : <Link to={link.route} onClick={onClick}>{children}</Link>;
}

export function Brand({ footer = false, editorial = false, onHome = true }: { footer?: boolean; editorial?: boolean; onHome?: boolean }) {
  const className = `brand ${footer ? 'brand-footer' : ''} ${editorial ? 'brand-editorial' : ''}`;
  const img = (
    <img
      src={logo.url}
      alt="Sharma Coffee Works — The Taste Of Coorg, since 1987"
      width={768}
      height={768}
      loading={footer || editorial ? 'lazy' : 'eager'}
    />
  );
  return onHome
    ? <a href="#home" className={className} aria-label="Sharma Coffee Works home">{img}</a>
    : <Link to="/" className={className} aria-label="Sharma Coffee Works home">{img}</Link>;
}

export function SiteNav({ variant = 'overlay' }: { variant?: 'overlay' | 'solid' }) {
  const { pathname } = useLocation();
  const onHome = HOME_PATHS.includes(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <div className={`site-nav ${variant === 'solid' ? 'site-nav--solid' : ''}`}>
      <header className={`site-header ${variant === 'solid' ? 'site-header--solid' : ''}`}>
        <Brand onHome={onHome} />
        <nav className="desktop-nav" aria-label="Main navigation">
          {LINKS.map((link) => <NavItem key={link.label} link={link} onHome={onHome}>{link.label}</NavItem>)}
          <Link to="/subscriptions">Subscribe</Link>
        </nav>
        <div className="header-actions">
          <span className="header-origin">MADIKERI, COORG</span>
          <Button asChild variant="film" className="header-shop">
            <Link to="/shop">Shop coffee <ArrowUpRight /></Link>
          </Button>
          <Button
            variant="film"
            size="icon"
            className="mobile-menu-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {LINKS.map((link) => (
            <NavItem key={link.label} link={link} onHome={onHome} onClick={close}>{link.label}<ArrowUpRight /></NavItem>
          ))}
          <Link to="/shop" onClick={close}>Shop coffee<ArrowUpRight /></Link>
          <Link to="/subscriptions" onClick={close}>Subscribe<ArrowUpRight /></Link>
        </nav>
      )}
    </div>
  );
}
