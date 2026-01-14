import React from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import { ChatBot } from '../chat/ChatBot';
import BackToTop from './BackToTop';
import CookieConsent from './CookieConsent';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-grow">
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
