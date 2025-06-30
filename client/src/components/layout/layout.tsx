import React from 'react';
import { Navbar } from './navbar';
import { Footer } from './footer';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow mt-4 px-2">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;