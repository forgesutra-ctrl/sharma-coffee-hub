import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, ChevronDown, Search, Instagram, Phone, Heart, MessageCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';
import { setInertSafely } from '@/lib/accessibility';
import sharmaCoffeeLogo from '@/assets/sharma-coffee-logo.png';
const announcements = [{
  text: 'FREE SHIPPING',
  highlight: 'Subscription Members Only'
}, {
  text: 'FARM TO CUP',
  highlight: 'Direct from Coorg since 1983'
}, {
  text: '100% AUTHENTIC',
  highlight: 'Premium South Indian coffee'
}];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(0);
  const [isMegaMenuHovered, setIsMegaMenuHovered] = useState(false);
  const {
    getCartCount
  } = useCart();
  const {
    user
  } = useAuth();
  const { data: categories } = useCategories();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHomePage = location.pathname === '/';

  // Build navigation links dynamically
  const navLinks = [
    {
      name: 'Home',
      href: '/'
    },
    {
      name: 'Shop',
      href: '/shop',
      children: categories?.map(cat => ({
        name: cat.name,
        href: `/shop/${cat.slug}`,
        description: ''
      })) || []
    },
    {
      name: 'Blog',
      href: '/blogs'
    },
    {
      name: 'Our Story',
      href: '/about'
    },
    {
      name: 'Brewing Guide',
      href: '/brewing-guide'
    },
    {
      name: 'Processing',
      href: '/processing'
    },
    {
      name: 'Contact',
      href: '/contact'
    }
  ];
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Store reference to menu button for focus restoration
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Manage accessibility when mobile menu opens/closes
  useEffect(() => {
    if (isOpen) {
      // Use a class-based approach instead of inline styles to prevent overflow issues
      // This allows fixed-position menus to render properly
      document.body.classList.add('menu-open');

      // Use inert on main content (excluding Razorpay) to disable background interaction
      // This is safer than aria-hidden as it doesn't break focus management
      const mainContent = document.querySelector('main');
      if (mainContent) {
        setInertSafely(mainContent as HTMLElement, true);
      }

      return () => {
        // Remove class when menu closes
        document.body.classList.remove('menu-open');

        // Remove inert from main content
        if (mainContent) {
          setInertSafely(mainContent as HTMLElement, false);
        }

        // Restore focus to menu button for accessibility
        if (menuButtonRef.current) {
          menuButtonRef.current.focus();
        }
      };
    }
  }, [isOpen]);
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
      setCurrentAnnouncement(prev => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);
  const handleMouseEnter = (linkName: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveDropdown(linkName);
  };
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      if (!isMegaMenuHovered) {
        setActiveDropdown(null);
      }
    }, 150);
  };
  const cartCount = getCartCount();
  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-coffee-dark text-white py-2 relative overflow-hidden z-[200001]" style={{ pointerEvents: 'auto' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Social Links - Left */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="hover:text-coffee-gold transition-colors" aria-label="Instagram">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="hover:text-coffee-gold transition-colors" aria-label="Facebook">
              
            </a>
            <a href="#" className="hover:text-coffee-gold transition-colors" aria-label="Twitter">
              
            </a>
          </div>

          {/* Announcements - Center */}
          <div className="flex-1 text-center overflow-hidden">
            <div className="transition-all duration-500" style={{
            transform: `translateY(-${currentAnnouncement * 100}%)`
          }}>
              {announcements.map((ann, idx) => <div key={idx} className={cn("h-6 flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wider transition-opacity duration-300", idx === currentAnnouncement ? "opacity-100" : "opacity-0")} style={{
              display: idx === currentAnnouncement ? 'flex' : 'none'
            }}>
                  <span className="font-bold text-coffee-gold">{ann.text}</span>
                  <span className="text-white/80 hidden sm:inline">— {ann.highlight}</span>
                </div>)}
            </div>
          </div>

          {/* Contact - Right */}
          <div className="hidden md:flex items-center gap-3 text-xs text-white/70">
            <a href="tel:+918762988145" className="flex items-center gap-1 hover:text-coffee-gold transition-colors">
              <Phone className="w-3 h-3" />
              <span>8762 988 145</span>
            </a>
            <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors" title="Chat on WhatsApp">
              <MessageCircle className="w-4 h-4 text-green-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav 
        className={cn(
          'sticky top-0 z-[200000] transition-all duration-500',
          isScrolled ? 'bg-background/95 backdrop-blur-lg shadow-lg shadow-black/5' : isHomePage ? 'bg-background/80 backdrop-blur-sm' : 'bg-background'
        )}
        style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Row - Logo and Actions */}
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Left Actions */}
            <div className="flex items-center gap-2 flex-1">
              <button className="p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
              
              {/* Mobile menu button */}
              <button 
                ref={menuButtonRef}
                className="lg:hidden p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all relative z-[200002]" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newState = !isOpen;
                  console.log('[Navigation] Hamburger clicked, toggling menu. Current state:', isOpen, '-> New state:', newState);
                  setIsOpen(newState);
                }}
                aria-label="Toggle menu"
                aria-expanded={isOpen}
                type="button"
                style={{ 
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  zIndex: 200002,
                }}
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Logo - Center */}
            <Link to="/" className="flex-shrink-0 group flex flex-col items-center py-2">
              <img src={sharmaCoffeeLogo} alt="Sharma Coffee Works" className="h-10 md:h-12 w-auto transition-all duration-300 group-hover:scale-105" />
              <span className="hidden md:block text-[10px] tracking-[0.25em] text-muted-foreground uppercase mt-0.5">EST. 1987 • COORG</span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <a href="tel:+918762988145" className="hidden md:flex items-center gap-1 hover:text-amber-600 transition text-sm font-semibold">
                <Phone className="w-4 h-4" />
                <span className="text-sm font-semibold">8762 988 145</span>
              </a>
              <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" className="hidden md:block hover:text-green-600 transition" title="Chat on WhatsApp">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </a>
              <Link to="/brewing-guide" className="hidden sm:flex p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all" aria-label="Wishlist">
                <Heart className="w-5 h-5" />
              </Link>

              <Link to={user ? '/account' : '/auth'} className="p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all" aria-label="Account">
                <User className="w-5 h-5" />
              </Link>

              <Link to="/cart" className="relative p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {cartCount}
                  </span>}
              </Link>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center justify-center gap-8 py-3 border-t border-border/50" ref={dropdownRef}>
            {navLinks.map(link => <div key={link.name} className="relative" onMouseEnter={() => link.children && handleMouseEnter(link.name)} onMouseLeave={handleMouseLeave}>
                {link.children ? <button className={cn('flex items-center gap-1.5 text-sm font-medium tracking-wide transition-colors py-2', 'text-foreground/70 hover:text-primary', activeDropdown === link.name && 'text-primary')}>
                    {link.name}
                    <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-300', activeDropdown === link.name && 'rotate-180')} />
                  </button> : <Link 
                    to={link.href} 
                    className={cn(
                      "text-sm font-medium tracking-wide text-foreground/70 hover:text-primary transition-colors py-2 relative",
                      "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-right after:transition-transform hover:after:scale-x-100 hover:after:origin-left",
                      location.pathname === link.href && "text-primary after:scale-x-100"
                    )}
                    onClick={() => {
                      console.log('[Navigation] Desktop link clicked:', link.href);
                    }}
                  >
                    {link.name}
                  </Link>}

                {/* Dropdown Menu */}
                {link.children && activeDropdown === link.name && <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[240px] bg-card border border-border rounded-lg shadow-2xl animate-fade-in z-[100]" 
                  onMouseEnter={() => setIsMegaMenuHovered(true)} 
                  onMouseLeave={() => {
                    setIsMegaMenuHovered(false);
                    setActiveDropdown(null);
                  }}
                  style={{ pointerEvents: 'auto' }}
                >
                    <div className="p-2">
                      <Link
                        to="/shop"
                        className="block px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary hover:bg-muted/50 rounded transition-colors"
                        onClick={() => {
                          console.log('[Navigation] Dropdown link clicked: /shop');
                          setActiveDropdown(null);
                        }}
                      >
                        All Products
                      </Link>
                      <div className="border-t border-border my-2" />
                      {link.children.map(category => (
                        <Link
                          key={category.name}
                          to={category.href}
                          className="block px-4 py-2.5 text-sm text-foreground/70 hover:text-primary hover:bg-muted/50 rounded transition-colors"
                          onClick={() => {
                            console.log('[Navigation] Category link clicked:', category.href);
                            setActiveDropdown(null);
                          }}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>}
              </div>)}
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        {/* Using conditional rendering instead of aria-hidden to avoid focus deadlocks */}
        {isOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50"
            onClick={(e) => {
              // Only close if clicking the overlay itself, not child elements
              if (e.target === e.currentTarget) {
                console.log('[Navigation] Overlay clicked, closing menu');
                setIsOpen(false);
              }
            }}
            style={{ 
              pointerEvents: 'auto', 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              touchAction: 'manipulation',
              zIndex: 200001,
            }}
            // No aria-hidden - overlay is non-interactive by design (only closes menu on click)
          />
        )}

        {/* Mobile Navigation */}
        {isOpen && (
          <div
            className="lg:hidden fixed bg-background overflow-y-auto shadow-2xl"
            style={{ 
              pointerEvents: 'auto', 
              position: 'fixed',
              top: '4rem', // Start below nav bar (h-16 = 4rem)
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: 'calc(100vh - 4rem)',
              display: 'block',
              visibility: 'visible',
              opacity: 1,
              zIndex: 200002,
              transform: 'translateX(0)',
            } as React.CSSProperties}
            data-menu-open={isOpen}
            onTouchStart={(e) => {
              // Prevent touch events from bubbling to overlay
              e.stopPropagation();
            }}
          >
          <div className="flex flex-col p-6 space-y-1 min-h-full">
            {navLinks.map(link => <div key={link.name} className="border-b border-border/30 last:border-0">
                {link.children ? <>
                    <button 
                      className="flex items-center justify-between w-full py-4 text-lg font-serif font-medium text-foreground" 
                      onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                      style={{ 
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                      }}
                    >
                      {link.name}
                      <ChevronDown className={cn('w-5 h-5 transition-transform duration-300', activeDropdown === link.name && 'rotate-180')} />
                    </button>
                    <div className={cn('overflow-hidden transition-all duration-300', activeDropdown === link.name ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0')}>
                      <div className="pl-4 pb-4 space-y-2">
                        <Link
                          to="/shop"
                          className="block py-2 text-foreground/70 hover:text-primary transition-colors font-medium"
                          onClick={() => setIsOpen(false)}
                          style={{ 
                            pointerEvents: 'auto',
                            touchAction: 'manipulation',
                          }}
                        >
                          All Products
                        </Link>
                        <div className="border-t border-border/30 my-2" />
                        {link.children.map(category => (
                          <Link
                            key={category.name}
                            to={category.href}
                            className="block py-2 text-foreground/70 hover:text-primary transition-colors"
                            onClick={() => setIsOpen(false)}
                            style={{ 
                              pointerEvents: 'auto',
                              touchAction: 'manipulation',
                            }}
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </> : <Link 
                    to={link.href} 
                    className={cn(
                      "block py-4 text-lg font-serif font-medium transition-colors",
                      location.pathname === link.href ? "text-primary" : "text-foreground"
                    )} 
                    onClick={() => {
                      console.log('[Navigation] Mobile link clicked:', link.href);
                      setIsOpen(false);
                    }}
                  >
                    {link.name}
                  </Link>}
              </div>)}
            
            {/* Mobile menu close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden absolute top-4 right-4 p-2 text-foreground/70 hover:text-primary rounded-full transition-all"
              aria-label="Close menu"
              style={{ 
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Mobile User Actions */}
            <div className="pt-6 mt-auto border-t border-border/30">
              <Link 
                to={user ? '/account' : '/auth'} 
                className="flex items-center gap-3 py-3 text-foreground/70 hover:text-primary transition-colors" 
                onClick={() => setIsOpen(false)}
                style={{ 
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                }}
              >
                <User className="w-5 h-5" />
                {user ? 'My Account' : 'Sign In'}
              </Link>
              <Link 
                to="/cart" 
                className="flex items-center gap-3 py-3 text-foreground/70 hover:text-primary transition-colors" 
                onClick={() => setIsOpen(false)}
                style={{ 
                  pointerEvents: 'auto',
                  touchAction: 'manipulation',
                }}
              >
                <ShoppingBag className="w-5 h-5" />
                Shopping Bag
                {cartCount > 0 && <span className="ml-auto px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    {cartCount}
                  </span>}
              </Link>
            </div>

              {/* Mobile Contact */}
              <div className="pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-3">Need help?</p>
                <a 
                  href="tel:+918762988145" 
                  className="text-lg font-medium text-primary"
                  style={{ 
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                  }}
                >
                  +91 8762 988 145
                </a>
                <a 
                  href="https://wa.me/918762988145" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 mt-2 text-green-600 hover:text-green-700"
                  style={{ 
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                  }}
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}