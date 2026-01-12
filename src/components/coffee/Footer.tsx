import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube, Mail, MapPin, Phone, ArrowRight, Coffee, Leaf, Award, Heart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import sharmaCoffeeLogo from '@/assets/sharma-coffee-logo.png';
export default function Footer() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    // Simulate subscription
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Welcome to our coffee family!');
    setEmail('');
    setIsLoading(false);
  };
  const currentYear = new Date().getFullYear();
  return <footer className="bg-coffee-dark text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
      </div>

      {/* Newsletter Section */}
      <div className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-coffee-gold text-sm font-medium tracking-[0.2em] uppercase mb-3">
                Stay Connected
              </p>
              <h3 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
                Join the Coffee Circle
              </h3>
              <p className="text-white/60 max-w-md">
                Be the first to know about new arrivals, seasonal blends, brewing tips, and exclusive member-only offers.
              </p>
            </div>
            
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-coffee-gold focus:ring-coffee-gold/20 pr-12" required />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              </div>
              <Button type="submit" disabled={isLoading} className="h-14 px-8 bg-coffee-gold hover:bg-coffee-gold/90 text-coffee-dark font-semibold group">
                Subscribe
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="relative border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[{
            icon: Coffee,
            title: 'Estate Fresh',
            desc: 'Direct from Coorg'
          }, {
            icon: Leaf,
            title: '100% Natural',
            desc: 'No artificial additives'
          }, {
            icon: Award,
            title: 'Since 1983',
            desc: 'Four decades of trust'
          }, {
            icon: Heart,
            title: 'Made with Love',
            desc: 'Handcrafted blends'
          }].map(badge => <div key={badge.title} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-full bg-coffee-gold/10 flex items-center justify-center group-hover:bg-coffee-gold/20 transition-colors">
                  <badge.icon className="w-5 h-5 text-coffee-gold" />
                </div>
                <div>
                  <p className="font-semibold text-white">{badge.title}</p>
                  <p className="text-sm text-white/50">{badge.desc}</p>
                </div>
              </div>)}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="relative max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-block mb-6">
              <img src={sharmaCoffeeLogo} alt="Sharma Coffee Works" className="h-12 w-auto brightness-0 invert opacity-90" />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              Since 1983, we've been crafting authentic South Indian filter coffee from the finest 
              Coorg estates. Four decades of tradition, passion, and the perfect cup.
            </p>
            <div className="flex gap-3">
              {[{
              icon: Instagram,
              label: 'Instagram',
              href: '#'
            }, {
              icon: Facebook,
              label: 'Facebook',
              href: '#'
            }, {
              icon: Twitter,
              label: 'Twitter',
              href: '#'
            }, {
              icon: Youtube,
              label: 'YouTube',
              href: '#'
            }].map(social => <a key={social.label} href={social.href} className="w-10 h-10 bg-white/10 hover:bg-coffee-gold hover:text-coffee-dark transition-all duration-300 rounded-full flex items-center justify-center group" aria-label={social.label}>
                  <social.icon className="w-4 h-4" />
                </a>)}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="font-serif text-lg font-semibold mb-6 text-coffee-gold">
              Shop
            </h4>
            <ul className="space-y-3">
              {[{
              name: 'All Products',
              link: '/shop'
            }, {
              name: 'Filter Coffee',
              link: '/shop/gold-blend'
            }, {
              name: 'Specialty Blends',
              link: '/shop/specialty-blends'
            }, {
              name: 'Royal Caffeine',
              link: '/shop/royal-caffeine'
            }, {
              name: 'Instant Coffee',
              link: '/shop/instant-coffee-decoctions'
            }].map(item => <li key={item.name}>
                  <Link to={item.link} className="text-white/60 hover:text-coffee-gold transition-colors text-sm inline-flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-px bg-coffee-gold transition-all duration-300" />
                    {item.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Company Links */}
          <div className="lg:col-span-2">
            <h4 className="font-serif text-lg font-semibold mb-6 text-coffee-gold">
              Company
            </h4>
            <ul className="space-y-3">
              {[{
              name: 'Our Story',
              link: '/about'
            }, {
              name: 'Brewing Guide',
              link: '/brewing-guide'
            }, {
              name: 'Our Stores',
              link: '/processing'
            }, {
              name: 'Contact Us',
              link: '/contact'
            }, {
              name: 'Wholesale',
              link: '/wholesale'
            }].map(item => <li key={item.name}>
                  <Link to={item.link} className="text-white/60 hover:text-coffee-gold transition-colors text-sm inline-flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-px bg-coffee-gold transition-all duration-300" />
                    {item.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Customer Care */}
          <div className="lg:col-span-2">
            <h4 className="font-serif text-lg font-semibold mb-6 text-coffee-gold">
              Support
            </h4>
            <ul className="space-y-3">
              {[{
              name: 'Track Order',
              link: '/account'
            }, {
              name: 'Shipping Info',
              link: '/shipping-policy'
            }, {
              name: 'Returns & Refunds',
              link: '/refund-policy'
            }, {
              name: 'FAQ',
              link: '/faq'
            }, {
              name: 'Privacy Policy',
              link: '/privacy-policy'
            }].map(item => <li key={item.name}>
                  <Link to={item.link} className="text-white/60 hover:text-coffee-gold transition-colors text-sm inline-flex items-center gap-2 group">
                    <span className="w-0 group-hover:w-2 h-px bg-coffee-gold transition-all duration-300" />
                    {item.name}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">
            <h4 className="font-serif text-lg font-semibold mb-6 text-coffee-gold">
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-white/60">
                <MapPin className="w-4 h-4 text-coffee-gold flex-shrink-0 mt-1" />
                <span>Sharma Coffee Works, Near Bus Stand, Madikeri, Coorg, Karnataka 571201</span>
              </li>
              <li>
                <a href="tel:+919876543210" className="flex items-center gap-3 text-sm text-white/60 hover:text-coffee-gold transition-colors">+91 87629 88145<Phone className="w-4 h-4 text-coffee-gold flex-shrink-0" />
                  +91 98765 43210
                </a>
              </li>
              <li>
                <a href="mailto:hello@sharmacoffee.com" className="flex items-center gap-3 text-sm text-white/60 hover:text-coffee-gold transition-colors">ask@sharmacoffeeworks.com<Mail className="w-4 h-4 text-coffee-gold flex-shrink-0" />
                  hello@sharmacoffee.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            © {currentYear} Sharma Coffee Works. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/40">
            <Link to="/privacy-policy" className="hover:text-coffee-gold transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-coffee-gold transition-colors">Terms of Service</Link>
            <Link to="/refund-policy" className="hover:text-coffee-gold transition-colors">Refund Policy</Link>
            <Link to="/admin/login" className="hover:text-coffee-gold transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>;
}