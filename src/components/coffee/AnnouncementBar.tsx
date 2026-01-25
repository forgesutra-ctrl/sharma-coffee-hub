import { useState, useEffect } from 'react';
import { X, Truck, Gift, Coffee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Announcement {
  id: string;
  icon: typeof Truck;
  message: string;
  highlight?: string;
}

const announcements: Announcement[] = [
  {
    id: '1',
    icon: Truck,
    message: 'Free Shipping',
    highlight: 'Subscription Members Only',
  },
  {
    id: '2',
    icon: Gift,
    message: 'Use code COFFEE10 for',
    highlight: '10% off your first order',
  },
  {
    id: '3',
    icon: Coffee,
    message: 'Fresh roasted coffee shipped within',
    highlight: '24 hours',
  },
];

export default function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('announcement-dismissed');
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('announcement-dismissed', 'true');
  };

  if (!isVisible) return null;

  const current = announcements[currentIndex];
  const Icon = current.icon;

  return (
    <div className="bg-primary text-primary-foreground relative z-50">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-center">
                {/* Desktop: "Free Shipping — Subscription Members Only" */}
                <span className="hidden sm:inline">
                  {current.message} — {current.highlight && (
                    <span className="font-semibold">{current.highlight}</span>
                  )}
                </span>
                {/* Mobile: "Free Shipping for Subscription Members" */}
                <span className="sm:hidden">
                  {current.id === '1' ? (
                    // Special handling for free shipping announcement on mobile
                    <>Free Shipping for <span className="font-semibold">Subscription Members</span></>
                  ) : (
                    // Other announcements as normal
                    <>
                      {current.message} {current.highlight && (
                        <span className="font-semibold">{current.highlight}</span>
                      )}
                    </>
                  )}
                </span>
              </span>
            </motion.div>
          </AnimatePresence>
          
          {/* Dots indicator */}
          <div className="hidden sm:flex items-center gap-1.5 ml-4">
            {announcements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-primary-foreground' : 'bg-primary-foreground/40'
                }`}
                aria-label={`Go to announcement ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-primary-foreground/10 rounded transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
