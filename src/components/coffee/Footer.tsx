import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-card border-t border-border">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6 group">
              <h2 className="font-serif text-2xl text-foreground">Sharma Coffee Works</h2>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Crafting exceptional coffee from the hills of Coorg since 1987.
              Experience the taste of tradition in every cup.
            </p>
            {/* Social Links */}
            <div className="flex gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border border-border flex items-center justify-center text-muted-foreground hover:text-gold hover:border-gold transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-foreground font-semibold uppercase tracking-wider text-sm mb-6">Shop</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/shop" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Premium" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  Premium Blends
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Gold" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  Gold Blends
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Specialty" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  Specialty Coffee
                </Link>
              </li>
              <li>
                <Link to="/brewing-guide" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  Brewing Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-foreground font-semibold uppercase tracking-wider text-sm mb-6">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/wholesale" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  Wholesale
                </Link>
              </li>
              <li>
                <a href="#contact" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-foreground font-semibold uppercase tracking-wider text-sm mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <a href="mailto:hello@sharmacoffee.com" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                    hello@sharmacoffee.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <a href="tel:+919876543210" className="text-muted-foreground hover:text-gold transition-colors text-sm">
                    +91 98765 43210
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground text-sm">
                    Madikeri, Coorg<br />
                    Karnataka, India
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Sharma Coffee Works. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-gold transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-gold transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-gold transition-colors">
                Shipping Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-gold transition-colors">
                Refund Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
