import { ReactNode } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { ChatBot } from '../chat/ChatBot';
import BackToTop from './BackToTop';
import CookieConsent from './CookieConsent';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ overflow: 'visible' }}>
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