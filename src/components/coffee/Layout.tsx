import { ReactNode, useEffect, useRef } from 'react';
import { AnnouncementStrip } from '../home-v2/AnnouncementStrip';
import { SiteNav } from '../home-v2/SiteNav';
import '../home-v2/home-v2.css';
import Footer from './Footer';
import { ChatBot } from '../chat/ChatBot';
import BackToTop from './BackToTop';
import CookieConsent from './CookieConsent';
import DasaraGreeting from './DasaraGreeting';

interface LayoutProps {
  children: ReactNode;
  /**
   * `home`: the homepage renders SiteNav itself, inside the hero, where it overlays the
   * video, so Layout supplies only the announcement bar above it.
   * Every other page gets SiteNav's solid variant here, sticky under the bar.
   */
  variant?: 'default' | 'home';
}

const Layout = ({ children, variant = 'default' }: LayoutProps) => {
  // Root container ref so we can enforce safe aria-hidden behavior.
  // Some overlay libraries (including Radix-based components) may set
  // aria-hidden/data-aria-hidden on siblings when portals open. To prevent
  // focus deadlocks (and browser "Blocked aria-hidden" warnings), we ensure
  // that our main app shell is never aria-hidden.
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ensureNotAriaHidden = () => {
      if (el.getAttribute('aria-hidden') === 'true') {
        el.removeAttribute('aria-hidden');
      }
      if (el.getAttribute('data-aria-hidden') === 'true') {
        el.removeAttribute('data-aria-hidden');
      }
    };

    // Run once on mount.
    ensureNotAriaHidden();

    // Observe attribute changes so no future component can permanently
    // hide the main app container via aria-hidden.
    const observer = new MutationObserver(() => {
      ensureNotAriaHidden();
    });

    observer.observe(el, {
      attributes: true,
      attributeFilter: ['aria-hidden', 'data-aria-hidden'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="min-h-screen flex flex-col bg-background"
      style={{ overflow: 'visible' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <AnnouncementStrip />
      {variant !== 'home' && (
        // `.home-v2` scopes the header's styles; `.site-chrome` makes the wrapper the
        // sticky element (a sticky child of a header-height wrapper could not stick).
        <div className="home-v2 site-chrome">
          <SiteNav variant="solid" />
        </div>
      )}
      <main id="main" className="flex-1 w-full" style={{ overflow: 'visible' }} tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <ChatBot />
      <BackToTop />
      <CookieConsent />
      <DasaraGreeting />
    </div>
  );
};

export default Layout;