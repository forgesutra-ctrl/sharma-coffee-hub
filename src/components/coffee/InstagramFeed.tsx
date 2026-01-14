import { useEffect } from 'react';
import { Instagram, ExternalLink } from 'lucide-react';

interface InstagramFeedProps {
  className?: string;
}

export default function InstagramFeed({ className = '' }: InstagramFeedProps) {
  useEffect(() => {
    // Load SociableKit script
    const existingScript = document.querySelector('script[src*="sociablekit.com"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://widgets.sociablekit.com/instagram-reels/widget.js';
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section className={`py-16 md:py-20 bg-secondary/30 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram className="w-8 h-8 text-primary" />
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
              @sharmacoffeeworks
            </p>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Follow Our Journey
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join our coffee community on Instagram for brewing tips, behind-the-scenes 
            glimpses, and the latest from our Coorg estates.
          </p>
        </div>

        {/* SociableKit Instagram Reels Widget */}
        <div className="flex justify-center">
          <div
            className="sk-ww-instagram-reels"
            data-embed-id="25643033"
            style={{ width: '100%', maxWidth: '1200px' }}
          />
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="https://www.instagram.com/sharmacoffeeworks"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors group"
          >
            <Instagram className="w-5 h-5" />
            <span>Follow us on Instagram</span>
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}