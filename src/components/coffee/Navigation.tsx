import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, ChevronDown, Search, Instagram, Facebook, Twitter } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import sharmaCoffeeLogo from '@/assets/sharma-coffee-logo.png';

const navLinks = [
  { name: 'Home', href: '/' },
  {
    name: 'Our Categories',
    href: '/shop',
    children: [
      { name: 'Filter Coffee Blends', href: '/shop/filter-coffee-blends', description: 'Traditional South Indian filter coffee' },
      { name: 'Specialty Blends', href: '/shop/specialty-blends', description: '100% Arabica premium selection' },
      { name: 'Royal Caffeine', href: '/shop/royal-caffeine', description: 'Pure coffee, no chicory' },
      { name: 'Instant Decoctions', href: '/shop/instant-coffee-decoctions', description: 'Ready-to-use filter coffee' },
      { name: 'Tea Collection', href: '/shop/tea-products', description: 'Premium Coorg tea' },
      { name: 'Beyond Coffee', href: '/shop/other-products', description: 'Coffee accessories & more' },
    ],
  },
  { name: 'About us', href: '/about' },
  { name: 'Our Stores', href: '/processing' },
  { name: 'Wishlist', href: '/brewing-guide' },
  { name: 'Contact', href: '/contact' },
];

const announcements = [
  { text: 'FREE SHIPPING', highlight: 'On all orders over ₹999' },
  { text: 'HASSLE-FREE RETURNS', highlight: '30-day postage paid returns' },
  { text: 'PREMIUM QUALITY', highlight: 'Since 1983' },
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);
  const { getCartCount } = useCart();
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
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

  // Rotate announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnnouncement((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const cartCount = getCartCount();

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-2.5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Social Links - Left */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="hover:opacity-70 transition-opacity" aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity" aria-label="Facebook">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" className="hover:opacity-70 transition-opacity" aria-label="Twitter">
              <Twitter className="w-4 h-4" />
            </a>
          </div>

          {/* Announcements - Center */}
          <div className="flex-1 text-center">
            <div className="inline-flex items-center gap-2 text-sm tracking-[0.15em]">
              <span className="font-bold">{announcements[currentAnnouncement].text}</span>
              <span className="opacity-80">{announcements[currentAnnouncement].highlight}</span>
            </div>
          </div>

          {/* Placeholder for balance - Right */}
          <div className="hidden md:block w-24" />
        </div>
      </div>

      {/* Main Navigation */}
      <nav
        className={cn(
          'sticky top-0 z-50 transition-all duration-500',
          isScrolled || !isHomePage ? 'nav-glass' : 'nav-transparent bg-background/30 backdrop-blur-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Search - Left */}
            <div className="flex items-center gap-4 flex-1">
              <button className="p-2 text-foreground/70 hover:text-primary transition-colors" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Logo - Center */}
            <Link to="/" className="flex-shrink-0 group flex flex-col items-center">
              <img 
                src={sharmaCoffeeLogo} 
                alt="Sharma Coffee Works" 
                className="h-10 md:h-12 w-auto transition-transform duration-300 group-hover:scale-105"
              />
              <span className="hidden md:block text-xs tracking-[0.3em] text-foreground/60 uppercase mt-1">
                Est. 1983
              </span>
            </Link>

            {/* Icons - Right */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              <Link
                to={user ? '/account' : '/auth'}
                className="p-2 text-foreground/70 hover:text-primary transition-colors hidden sm:block"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </Link>

              <Link to="/cart" className="relative p-2 text-foreground/70 hover:text-primary transition-colors">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 text-foreground/70 hover:text-primary transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center justify-center gap-10 py-4 border-t border-border/30" ref={dropdownRef}>
            {navLinks.map((link) => (
              <div key={link.name} className="relative">
                {link.children ? (
                  <button
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium tracking-[0.12em] uppercase transition-colors',
                      'text-foreground/80 hover:text-primary'
                    )}
                    onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                    onMouseEnter={() => setActiveDropdown(link.name)}
                  >
                    {link.name}
                    <ChevronDown className={cn(
                      'w-4 h-4 transition-transform duration-300',
                      activeDropdown === link.name && 'rotate-180'
                    )} />
                  </button>
                ) : (
                  <Link
                    to={link.href}
                    className="text-sm font-medium tracking-[0.12em] uppercase text-foreground/80 hover:text-primary transition-colors link-underline"
                  >
                    {link.name}
                  </Link>
                )}

                {/* Mega Menu Dropdown */}
                {link.children && activeDropdown === link.name && (
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-80 bg-card border border-border rounded-sm shadow-2xl animate-fade-in z-50"
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <div className="p-2">
                      {link.children.map((child) => (
                        <Link
                          key={child.name}
                          to={child.href}
                          className="block px-4 py-3 rounded-sm hover:bg-muted/50 transition-colors group"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {child.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {child.description}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            'lg:hidden fixed inset-0 top-[calc(2.75rem+5rem)] bg-background z-40 transform transition-transform duration-500 ease-out',
            isOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex flex-col p-6 space-y-1 h-full overflow-y-auto">
            {navLinks.map((link) => (
              <div key={link.name}>
                {link.children ? (
                  <>
                    <button
                      className="flex items-center justify-between w-full py-4 text-lg font-display font-medium text-foreground border-b border-border/30"
                      onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                    >
                      {link.name}
                      <ChevronDown className={cn('w-5 h-5 transition-transform duration-300', activeDropdown === link.name && 'rotate-180')} />
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
                    className="block py-4 text-lg font-display font-medium text-foreground border-b border-border/30"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                )}
              </div>
            ))}

            {/* Mobile User Link */}
            <Link
              to={user ? '/account' : '/auth'}
              className="block py-4 text-lg font-display font-medium text-foreground border-b border-border/30"
              onClick={() => setIsOpen(false)}
            >
              {user ? 'My Account' : 'Sign In'}
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}