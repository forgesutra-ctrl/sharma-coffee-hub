import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Mail, MapPin, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      {/* Newsletter Section */}
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase mb-3">
            Stay Connected
          </p>
          <h3 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
            Join the Coffee Circle
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Subscribe for brewing tips, new arrivals, and exclusive offers.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="h-12 bg-background border-border focus:border-primary text-center sm:text-left"
            />
            <Button className="h-12 px-8 btn-premium-solid whitespace-nowrap">
              Subscribe
            </Button>
          </form>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <h2 className="font-display text-2xl font-bold text-primary tracking-wider">
                SHARMA COFFEE
              </h2>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Since 1983, crafting authentic South Indian filter coffee from the finest 
              Coorg estates. Four decades of tradition, one perfect cup.
            </p>
            <div className="flex gap-3">
              <a 
                href="#" 
                className="w-10 h-10 bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-300 rounded-sm flex items-center justify-center"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-300 rounded-sm flex items-center justify-center"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-300 rounded-sm flex items-center justify-center"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6 text-primary">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { name: 'Shop All', link: '/shop' },
                { name: 'Filter Coffee', link: '/shop/filter-coffee-blends' },
                { name: 'Specialty Blends', link: '/shop/specialty-blends' },
                { name: 'Brewing Guide', link: '/brewing-guide' },
                { name: 'Our Story', link: '/about' },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.link}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm link-underline"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6 text-primary">
              Customer Care
            </h4>
            <ul className="space-y-3">
              {['Track Order', 'Shipping Policy', 'Returns & Refunds', 'FAQ', 'Contact Us'].map((link) => (
                <li key={link}>
                  <Link
                    to="#"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm link-underline"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-6 text-primary">
              Get in Touch
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Sharma Coffee Estate, Madikeri, Coorg District, Karnataka 571201</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                <a href="tel:+919876543210" className="hover:text-primary transition-colors">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <a href="mailto:hello@sharmacoffee.com" className="hover:text-primary transition-colors">
                  hello@sharmacoffee.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Sharma Coffee Works. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
