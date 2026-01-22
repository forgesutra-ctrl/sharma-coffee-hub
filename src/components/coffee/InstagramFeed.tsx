import { useEffect, useRef, useState } from 'react';
import { Instagram, ExternalLink, Loader2 } from 'lucide-react';

interface InstagramFeedProps {
  className?: string;
}

export default function InstagramFeed({ className = '' }: InstagramFeedProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => {
    // Force widget to be visible immediately
    setWidgetReady(true);
    
    // Wait for the SociableKit script to load and check for widget content
    const checkWidget = () => {
      const widgetElement = widgetRef.current?.querySelector('.sk-ww-instagram-reels');
      if (widgetElement) {
        // Check if widget has initialized (has iframe or content)
        const iframe = widgetElement.querySelector('iframe');
        const hasContent = widgetElement.children.length > 0 && 
                          widgetElement.innerHTML.trim().length > 50; // More than just whitespace
        
        if (iframe || hasContent) {
          setWidgetError(false);
          return true;
        }
      }
      return false;
    };

    // Check immediately
    checkWidget();

    // Poll for widget initialization
    const interval = setInterval(() => {
      if (checkWidget()) {
        clearInterval(interval);
      }
    }, 1000);

    // Also listen for DOM changes
    const observer = new MutationObserver(() => {
      if (checkWidget()) {
        clearInterval(interval);
        observer.disconnect();
      }
    });

    if (widgetRef.current) {
      observer.observe(widgetRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }

    // Set error state after 10 seconds if widget hasn't loaded
    const timeout = setTimeout(() => {
      clearInterval(interval);
      observer.disconnect();
      if (!checkWidget()) {
        setWidgetError(true);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <section className={`py-16 md:py-20 bg-secondary/30 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram className="w-8 h-8 text-primary" />
            <p className="text-primary text-sm font-medium tracking-[0.2em] uppercase">
              @sharma_coffee_works
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

        {/* SociableKit Instagram Reels Widget - Compact and Scrollable */}
        <div className="flex justify-center">
          <div 
            className="relative w-full max-w-4xl mx-auto rounded-xl border border-primary/20 overflow-hidden bg-background/50"
            style={{ 
              maxHeight: '600px',
            }}
          >
            {/* Scrollable Container */}
            <div 
              ref={widgetRef}
              className="instagram-widget-scroll overflow-y-auto overflow-x-hidden"
              style={{
                maxHeight: '600px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(200, 169, 126, 0.5) transparent',
              }}
            >
              <div 
                className="sk-ww-instagram-reels p-4" 
                data-embed-id="25643033"
                style={{ 
                  width: '100%',
                  minHeight: '400px',
                }}
              />
              {widgetError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-8 text-center">
                  <div>
                    <p className="mb-4 text-muted-foreground">Unable to load Instagram feed.</p>
                    <a
                      href="https://www.instagram.com/sharma_coffee_works/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                    >
                      <Instagram className="w-5 h-5" />
                      Visit our Instagram page directly
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom Scrollbar Styling */}
        <style>{`
          .instagram-widget-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .instagram-widget-scroll::-webkit-scrollbar-track {
            background: transparent;
            border-radius: 4px;
          }
          .instagram-widget-scroll::-webkit-scrollbar-thumb {
            background: rgba(200, 169, 126, 0.5);
            border-radius: 4px;
          }
          .instagram-widget-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(200, 169, 126, 0.7);
          }
          .sk-ww-instagram-reels iframe {
            border-radius: 8px;
          }
        `}</style>

        {/* CTA */}
        <div className="text-center mt-10">
          <a
            href="https://www.instagram.com/sharma_coffee_works/"
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