import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, Menu, MessageCircle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/hooks/useCategories';
import { logo } from '@/lib/site-media';
import {
  AccountIconLink,
  AccountMenuLink,
  CartIconLink,
  CartMenuLink,
  PHONE_TEL,
  PhoneLink,
  SearchPalette,
  WHATSAPP_URL,
  WhatsAppLink,
} from '@/components/nav/commerce';

// The redesigned site header, in the reference's language with our commerce kept:
// logo badge left, five links centred, search / account / cart right.
// `overlay` sits transparent over the homepage hero; `solid` is the forest bar for
// pages without a hero. Search, cart and account are the same components the old
// Navigation uses (components/nav/commerce.tsx).
const HOME_PATHS = ['/'];

const LINKS = [
  { label: 'Our Story', to: '/about' },
  { label: 'The Slow Ritual', to: '/processing' },
  { label: 'Journal', to: '/blogs' },
  { label: 'Subscribe', to: '/subscriptions' },
];

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

/** Shop ▾: All Products, the quiz, then every category, as the old Navigation lists them. */
function useShopLinks() {
  const { data: categories } = useCategories();
  return [
    { label: 'All Products', to: '/shop' },
    { label: 'Taste Profile Quiz', to: '/quiz' },
    ...(categories?.map((c) => ({ label: c.name, to: `/shop/${c.slug}` })) ?? []),
  ];
}

function ShopDropdown() {
  const shopLinks = useShopLinks();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  return (
    <div
      ref={ref}
      className="nav-shop"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <button type="button" className="nav-shop-trigger" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        Shop <ChevronDown aria-hidden />
      </button>
      {open && (
        <div className="nav-dropdown">
          {shopLinks.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</Link>)}
        </div>
      )}
    </div>
  );
}

export function SiteNav({ variant = 'overlay' }: { variant?: 'overlay' | 'solid' }) {
  const { pathname } = useLocation();
  const onHome = HOME_PATHS.includes(pathname);
  const shopLinks = useShopLinks();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const close = () => { setMenuOpen(false); setShopOpen(false); };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    // Hides the floating ChatBot launcher, which would otherwise sit over the panel's
    // corner at phone widths (see .site-menu-open in home-v2.css).
    document.body.classList.add('site-menu-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('site-menu-open');
    };
  }, [menuOpen]);

  return (
    <div className={`site-nav ${variant === 'solid' ? 'site-nav--solid' : ''}`}>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <header className={`site-header ${variant === 'solid' ? 'site-header--solid' : ''}`}>
        <Brand onHome={onHome} />

        <nav className="desktop-nav" aria-label="Main navigation">
          <ShopDropdown />
          {LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
        </nav>

        <div className="header-actions">
          <PhoneLink className="header-phone" iconClassName="header-icon-svg" labelClassName="header-phone-number" aria-label="Call 8762 988 145" />
          <WhatsAppLink className="header-icon header-whatsapp" iconClassName="header-icon-svg" aria-label="Chat on WhatsApp" />
          <button type="button" className="header-icon" aria-label="Search" onClick={() => setSearchOpen(true)}>
            <Search className="header-icon-svg" />
          </button>
          <AccountIconLink className="header-icon header-account" iconClassName="header-icon-svg" />
          <CartIconLink className="header-icon header-cart" iconClassName="header-icon-svg" badgeClassName="header-cart-count" />
          <Button asChild variant="film" className="header-shop">
            <Link to="/shop">Shop coffee <ArrowUpRight /></Link>
          </Button>
          <Button
            variant="film"
            size="icon"
            className="mobile-menu-button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => (menuOpen ? close() : setMenuOpen(true))}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button type="button" className="mobile-nav-row" aria-expanded={shopOpen} onClick={() => setShopOpen(!shopOpen)}>
            Shop <ChevronDown className={shopOpen ? 'is-open' : ''} aria-hidden />
          </button>
          {shopOpen && (
            <div className="mobile-nav-sub">
              {shopLinks.map((l) => <Link key={l.to} to={l.to} onClick={close}>{l.label}</Link>)}
            </div>
          )}
          {LINKS.map((l) => <Link key={l.to} to={l.to} className="mobile-nav-row" onClick={close}>{l.label}<ArrowUpRight /></Link>)}

          <div className="mobile-nav-commerce">
            <AccountMenuLink className="mobile-nav-commerce-row" onClick={close} />
            <CartMenuLink className="mobile-nav-commerce-row" countClassName="mobile-nav-count" onClick={close} />
            <a href={PHONE_TEL} className="mobile-nav-commerce-row">+91 8762 988 145</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mobile-nav-commerce-row">
              <MessageCircle /> Chat on WhatsApp
            </a>
          </div>
        </nav>
      )}
    </div>
  );
}
