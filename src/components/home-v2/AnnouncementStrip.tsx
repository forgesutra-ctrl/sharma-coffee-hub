import { useEffect, useState } from 'react';
import { Instagram, MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

// The forest announcement bar, lifted out of Navigation.tsx so the redesigned
// header can sit below it. Navigation.tsx keeps its own copy until Phase 4 retires
// the old nav; keep the two in sync until then.
const announcements = [
  { text: 'FREE SHIPPING', highlight: 'Subscription Members Only' },
  { text: 'FARM TO CUP', highlight: 'Direct from Coorg since 1983' },
  { text: '100% AUTHENTIC', highlight: 'Premium South Indian coffee' },
];

export function AnnouncementStrip() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrent((prev) => (prev + 1) % announcements.length), 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-forest text-hero-foreground py-2 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Social Links - Left */}
        <div className="hidden md:flex items-center gap-4">
          <a href="#" className="hover:text-gold transition-colors" aria-label="Instagram">
            <Instagram className="w-4 h-4" />
          </a>
          <a href="#" className="hover:text-gold transition-colors" aria-label="Facebook"></a>
          <a href="#" className="hover:text-gold transition-colors" aria-label="Twitter"></a>
        </div>

        {/* Announcements - Center */}
        <div className="flex-1 text-center overflow-hidden">
          {announcements.map((ann, idx) => (
            <div
              key={idx}
              className={cn(
                'h-6 items-center justify-center gap-2 text-xs sm:text-sm tracking-wider',
                idx === current ? 'flex' : 'hidden',
              )}
            >
              <span className="font-bold text-gold">{ann.text}</span>
              <span className="text-hero-foreground/80 hidden sm:inline">— {ann.highlight}</span>
            </div>
          ))}
        </div>

        {/* Contact - Right */}
        <div className="hidden md:flex items-center gap-3 text-xs text-hero-foreground/70">
          <a href="tel:+918762988145" className="flex items-center gap-1 hover:text-gold transition-colors">
            <Phone className="w-3 h-3" />
            <span>8762 988 145</span>
          </a>
          <a href="https://wa.me/918762988145" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors" title="Chat on WhatsApp">
            <MessageCircle className="w-4 h-4 text-green-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
