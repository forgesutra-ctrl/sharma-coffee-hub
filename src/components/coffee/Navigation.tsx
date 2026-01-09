import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, ChevronDown, Search } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { name: 'Home', href: '/' },
  {
    name: 'Our Coffee',
    href: '/shop',
    children: [
      { name: 'Filter Coffee Blends', href: '/shop/filter-coffee-blends' },
      { name: 'Specialty Blends', href: '/shop/specialty-blends' },
      { name: 'Instant Decoctions', href: '/shop/instant-coffee-decoctions' },
      { name: 'Tea Collection', href: '/shop/tea-products' },
      { name: 'Beyond Coffee', href: '/shop/other-products' },
    ],
  },
  { name: 'Our Story', href: '/about' },
  { name: 'Processing', href: '/processing' },
  { name: 'Brewing Guide', href: '/brewing-guide' },
  { name: 'Contact', href: '/contact' },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { getCartCount } = useCart();
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cartCount = getCartCount();

  const textColorClass = isScrolled || !isHomePage 
    ? 'text-foreground/80 hover:text-primary' 
    : 'text-foreground/90 hover:text-primary';

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-2.5 text-center text-sm font-medium tracking-[0.15em]">
        <span className="font-semibold">FREE SHIPPING</span> on all orders over ₹999
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'sticky top-0 z-50 transition-all duration-300 border-b',
          isScrolled || !isHomePage
            ? 'bg-background/95 backdrop-blur-md border-border shadow-lg'
            : 'bg-background/80 backdrop-blur-sm border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Mobile menu button */}
            <button
              className={cn('lg:hidden p-2 transition-colors', textColorClass)}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Desktop Navigation - Left */}
            <div className="hidden lg:flex items-center space-x-8 flex-1" ref={dropdownRef}>
              {navLinks.slice(0, 3).map((link) => (
                <div key={link.name} className="relative">
                  {link.children ? (
                    <button
                      className={cn(
                        'flex items-center gap-1.5 text-sm font-medium tracking-[0.1em] uppercase transition-colors',
                        textColorClass
                      )}
                      onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                    >
                      {link.name}
                      <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', activeDropdown === link.name && 'rotate-180')} />
                    </button>
                  ) : (
                    <Link
                      to={link.href}
                      className={cn(
                        'text-sm font-medium tracking-[0.1em] uppercase transition-colors link-underline',
                        textColorClass
                      )}
                    >
                      {link.name}
                    </Link>
                  )}

                  {/* Dropdown */}
                  {link.children && activeDropdown === link.name && (
                    <div className="absolute top-full left-0 mt-3 w-64 bg-card border border-border rounded-sm shadow-2xl animate-fade-in z-50">
                      <div className="py-2">
                        {link.children.map((child) => (
                          <Link
                            key={child.name}
                            to={child.href}
                            className="block px-5 py-3 text-sm text-foreground/80 hover:text-primary hover:bg-muted/50 transition-colors"
                            onClick={() => setActiveDropdown(null)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Logo - Center */}
            <Link to="/" className="flex-shrink-0 group">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-primary tracking-[0.05em] transition-all group-hover:tracking-[0.1em]">
                SHARMA COFFEE
              </h1>
            </Link>

            {/* Desktop Navigation - Right */}
            <div className="hidden lg:flex items-center space-x-8 flex-1 justify-end">
              {navLinks.slice(3).map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className={cn(
                    'text-sm font-medium tracking-[0.1em] uppercase transition-colors link-underline',
                    textColorClass
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Icons */}
            <div className="flex items-center gap-5 ml-8">
              <button className={cn('p-2 transition-colors hidden sm:block', textColorClass)}>
                <Search className="w-5 h-5" />
              </button>

              <Link
                to={user ? '/account' : '/auth'}
                className={cn('p-2 transition-colors', textColorClass)}
              >
                <User className="w-5 h-5" />
              </Link>

              <Link to="/cart" className={cn('relative p-2 transition-colors', textColorClass)}>
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'lg:hidden fixed inset-0 top-[calc(2.75rem+5rem)] bg-background z-40 transform transition-transform duration-300 ease-out',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col p-6 space-y-1 border-t border-border">
            {navLinks.map((link) => (
              <div key={link.name}>
                {link.children ? (
                  <>
                    <button
                      className="flex items-center justify-between w-full py-4 text-lg font-display font-medium text-foreground border-b border-border/50"
                      onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                    >
                      {link.name}
                      <ChevronDown className={cn('w-5 h-5 transition-transform', activeDropdown === link.name && 'rotate-180')} />
                    </button>
                    {activeDropdown === link.name && (
                      <div className="pl-4 py-2 space-y-1 animate-fade-in">
                        {link.children.map((child) => (
                          <Link
                            key={child.name}
                            to={child.href}
                            className="block py-3 text-foreground/70 hover:text-primary transition-colors"
                            onClick={() => setIsOpen(false)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={link.href}
                    className="block py-4 text-lg font-display font-medium text-foreground border-b border-border/50"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
