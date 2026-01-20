import { ReactNode, useEffect, useRef } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { ChatBot } from '../chat/ChatBot';
import BackToTop from './BackToTop';
import CookieConsent from './CookieConsent';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
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
      <Navigation />
      <main className="flex-1 w-full" style={{ overflow: 'visible' }}>
        {children}
      </main>
      <Footer />
      <ChatBot />
      <BackToTop />
      <CookieConsent />
    </div>
  );
};

export default Layout;