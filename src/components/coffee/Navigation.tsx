import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, LogIn, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const Navigation: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const { getCartCount } = useCart();
  const { user, isLoading } = useAuth();
  const cartCount = getCartCount();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHomePage = location.pathname === '/';

  const categories = [
    { to: '/shop?category=Premium', label: 'Premium Blends' },
    { to: '/shop?category=Gold', label: 'Gold Blends' },
    { to: '/shop?category=Specialty', label: 'Specialty Coffee' },
    { to: '/shop', label: 'All Products' },
  ];

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/shop', label: 'Shop', hasDropdown: true },
    { to: '/about', label: 'About Us' },
    { to: '/brewing-guide', label: 'Brewing Guide' },
    { to: '/wholesale', label: 'Wholesale' },
  ];

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-gold text-coffee-foreground py-2 text-center text-sm font-medium tracking-wide">
        <span className="font-semibold">FREE SHIPPING</span> on all orders over ₹500
      </div>

      {/* Main Navigation */}
      <nav className={`fixed top-8 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isHomePage
          ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-lg'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left Nav Items */}
            <div className="hidden lg:flex items-center space-x-8 flex-1">
              <Link
                to="/"
                className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-gold ${
                  isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                }`}
              >
                Home
              </Link>

              {/* Categories Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setCategoriesOpen(true)}
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                <Link
                  to="/shop"
                  className={`flex items-center gap-1 text-sm font-medium tracking-wide uppercase transition-colors hover:text-gold ${
                    isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                  }`}
                >
                  Our Categories
                  <ChevronDown className="w-4 h-4" />
                </Link>

                {categoriesOpen && (
                  <div className="absolute top-full left-0 pt-2">
                    <div className="bg-card border border-border rounded-lg shadow-xl py-2 min-w-[200px]">
                      {categories.map((cat) => (
                        <Link
                          key={cat.to}
                          to={cat.to}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-accent hover:text-gold transition-colors"
                        >
                          {cat.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/about"
                className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-gold ${
                  isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                }`}
              >
                About Us
              </Link>
            </div>

            {/* Center Logo */}
            <Link to="/" className="flex-shrink-0 group">
              <h1 className={`font-serif text-2xl lg:text-3xl transition-colors ${
                isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
              }`}>
                Sharma Coffee
              </h1>
            </Link>

            {/* Right Nav Items */}
            <div className="hidden lg:flex items-center space-x-8 flex-1 justify-end">
              <Link
                to="/brewing-guide"
                className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-gold ${
                  isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                }`}
              >
                Brewing Guide
              </Link>

              <Link
                to="/wholesale"
                className={`text-sm font-medium tracking-wide uppercase transition-colors hover:text-gold ${
                  isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                }`}
              >
                Wholesale
              </Link>

              {/* User Actions */}
              <div className="flex items-center space-x-4">
                {!isLoading && (
                  user ? (
                    <Link
                      to="/account"
                      className={`transition-colors hover:text-gold ${
                        isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </Link>
                  ) : (
                    <Link
                      to="/auth"
                      className={`transition-colors hover:text-gold ${
                        isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                      }`}
                    >
                      <LogIn className="w-5 h-5" />
                    </Link>
                  )
                )}

                <Link
                  to="/cart"
                  className={`relative transition-colors hover:text-gold ${
                    isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold text-coffee-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center space-x-4">
              <Link
                to="/cart"
                className={`relative transition-colors ${
                  isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gold text-coffee-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 transition-colors ${
                  isScrolled || !isHomePage ? 'text-foreground' : 'text-cream'
                }`}
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-background border-t border-border animate-slide-in-right">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-foreground hover:text-gold transition-colors py-2 text-sm font-medium uppercase tracking-wide"
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-border pt-4 mt-4">
                {!isLoading && (
                  user ? (
                    <Link
                      to="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 text-gold hover:text-gold-muted transition-colors py-2 text-sm font-medium uppercase tracking-wide"
                    >
                      <User className="w-4 h-4" />
                      My Account
                    </Link>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 text-gold hover:text-gold-muted transition-colors py-2 text-sm font-medium uppercase tracking-wide"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navigation;
