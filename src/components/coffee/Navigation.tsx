import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, ChevronDown, Search, Instagram, Phone, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import sharmaCoffeeLogo from '@/assets/sharma-coffee-logo.png';
const navLinks = [{
  name: 'Home',
  href: '/'
}, {
  name: 'Shop',
  href: '/shop',
  children: [{
    name: 'Filter Coffee',
    href: '/shop',
    description: 'Traditional South Indian blends',
    items: [{
      name: 'Coorg Classic',
      href: '/shop/coorg-classic'
    }, {
      name: 'Gold Blend',
      href: '/shop/gold-blend'
    }, {
      name: 'Premium Blend',
      href: '/shop/premium-blend'
    }]
  }, {
    name: 'Premium Selection',
    href: '/shop/specialty-blends',
    description: 'For the connoisseur',
    items: [{
      name: 'Specialty Blends',
      href: '/shop/specialty-blends'
    }, {
      name: 'Royal Caffeine',
      href: '/shop/royal-caffeine'
    }]
  }, {
    name: 'More Products',
    href: '/shop',
    description: 'Beyond coffee',
    items: [{
      name: 'Instant Coffee',
      href: '/shop/instant-coffee-decoctions'
    }, {
      name: 'Tea Collection',
      href: '/shop/tea-products'
    }, {
      name: 'Accessories',
      href: '/shop/other-products'
    }]
  }]
}, {
  name: 'Our Story',
  href: '/about'
}, {
  name: 'Brewing Guide',
  href: '/brewing-guide'
}, {
  name: 'Visit Us',
  href: '/processing'
}, {
  name: 'Contact',
  href: '/contact'
}];
const announcements = [{
  text: 'FREE SHIPPING',
  highlight: 'On all orders over ₹999'
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  return <>
      {/* Announcement Bar */}
      <div className="bg-coffee-dark text-white py-2 relative overflow-hidden">
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
          <div className="hidden md:flex items-center gap-2 text-xs text-white/70">
            <Phone className="w-3 h-3" />
            <span>+91-8762988145</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className={cn('sticky top-0 z-50 transition-all duration-500', isScrolled ? 'bg-background/95 backdrop-blur-lg shadow-lg shadow-black/5' : isHomePage ? 'bg-background/80 backdrop-blur-sm' : 'bg-background')}>
        <div className="max-w-7xl mx-auto px-4">
          {/* Top Row - Logo and Actions */}
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Left Actions */}
            <div className="flex items-center gap-2 flex-1">
              <button className="p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
              
              {/* Mobile menu button */}
              <button className="lg:hidden p-2.5 text-foreground/70 hover:text-primary hover:bg-muted/50 rounded-full transition-all" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
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
                  </button> : <Link to={link.href} className={cn("text-sm font-medium tracking-wide text-foreground/70 hover:text-primary transition-colors py-2 relative", "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-right after:transition-transform hover:after:scale-x-100 hover:after:origin-left", location.pathname === link.href && "text-primary after:scale-x-100")}>
                    {link.name}
                  </Link>}

                {/* Mega Menu Dropdown */}
                {link.children && activeDropdown === link.name && <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[600px] bg-card border border-border rounded-lg shadow-2xl animate-fade-in z-50" onMouseEnter={() => setIsMegaMenuHovered(true)} onMouseLeave={() => {
              setIsMegaMenuHovered(false);
              setActiveDropdown(null);
            }}>
                    <div className="grid grid-cols-3 gap-0 p-2">
                      {link.children.map(category => <div key={category.name} className="p-4">
                          <Link to={category.href} className="font-serif font-semibold text-foreground hover:text-primary transition-colors" onClick={() => setActiveDropdown(null)}>
                            {category.name}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1 mb-3">
                            {category.description}
                          </p>
                          <ul className="space-y-2">
                            {category.items?.map(item => <li key={item.name}>
                                <Link to={item.href} className="text-sm text-foreground/70 hover:text-primary transition-colors flex items-center gap-2 group" onClick={() => setActiveDropdown(null)}>
                                  <span className="w-1 h-1 rounded-full bg-primary/50 group-hover:bg-primary transition-colors" />
                                  {item.name}
                                </Link>
                              </li>)}
                          </ul>
                        </div>)}
                    </div>
                    
                    {/* Featured Banner in Mega Menu */}
                    <div className="border-t border-border p-4 bg-muted/30 rounded-b-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-primary font-medium tracking-wider uppercase">Featured</p>
                          <p className="text-sm font-medium">Royal Caffeine - 100% Pure Coffee</p>
                        </div>
                        <Link to="/shop/royal-caffeine" className="text-sm text-primary hover:underline" onClick={() => setActiveDropdown(null)}>
                          Shop Now →
                        </Link>
                      </div>
                    </div>
                  </div>}
              </div>)}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={cn('lg:hidden fixed inset-x-0 top-[calc(2.5rem+4rem)] bottom-0 bg-background z-40 transform transition-all duration-500 ease-out overflow-y-auto', isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none')}>
          <div className="flex flex-col p-6 space-y-1 min-h-full">
            {navLinks.map(link => <div key={link.name} className="border-b border-border/30 last:border-0">
                {link.children ? <>
                    <button className="flex items-center justify-between w-full py-4 text-lg font-serif font-medium text-foreground" onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}>
                      {link.name}
                      <ChevronDown className={cn('w-5 h-5 transition-transform duration-300', activeDropdown === link.name && 'rotate-180')} />
                    </button>
                    <div className={cn('overflow-hidden transition-all duration-300', activeDropdown === link.name ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0')}>
                      <div className="pl-4 pb-4 space-y-4">
                        {link.children.map(category => <div key={category.name}>
                            <p className="text-xs text-primary font-medium tracking-wider uppercase mb-2">
                              {category.name}
                            </p>
                            <div className="space-y-2">
                              {category.items?.map(item => <Link key={item.name} to={item.href} className="block py-2 text-foreground/70 hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>
                                  {item.name}
                                </Link>)}
                            </div>
                          </div>)}
                      </div>
                    </div>
                  </> : <Link to={link.href} className={cn("block py-4 text-lg font-serif font-medium transition-colors", location.pathname === link.href ? "text-primary" : "text-foreground")} onClick={() => setIsOpen(false)}>
                    {link.name}
                  </Link>}
              </div>)}

            {/* Mobile User Actions */}
            <div className="pt-6 mt-auto border-t border-border/30">
              <Link to={user ? '/account' : '/auth'} className="flex items-center gap-3 py-3 text-foreground/70 hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>
                <User className="w-5 h-5" />
                {user ? 'My Account' : 'Sign In'}
              </Link>
              <Link to="/cart" className="flex items-center gap-3 py-3 text-foreground/70 hover:text-primary transition-colors" onClick={() => setIsOpen(false)}>
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
              <a href="tel:+919876543210" className="text-lg font-medium text-primary">
                +91 98765 43210
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>;
}