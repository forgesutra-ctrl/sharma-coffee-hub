import React from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import AnnouncementBar from './AnnouncementBar';
import AIChatBot from './AIChatBot';
import BackToTop from './BackToTop';
import CookieConsent from './CookieConsent';

interface LayoutProps {
  children: React.ReactNode;
  showAnnouncement?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showAnnouncement = true }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showAnnouncement && <AnnouncementBar />}
      <Navigation />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <AIChatBot />
      <BackToTop />
      <CookieConsent />
    </div>
  );
};

export default Layout;
