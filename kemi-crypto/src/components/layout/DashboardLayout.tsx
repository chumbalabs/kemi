import type { ReactNode } from 'react';
import Header from '../../header';
import Footer from '../../footer';
import StatelessChatWidget from '../chat/StatelessChatWidget';


interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header - Now using modular component */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-16 pb-6">
        {children}
      </main>

      {/* Footer - Now using modular component */}
      <Footer />
      
      {/* Chat Widget - AI Assistant */}
      <StatelessChatWidget />
    </div>
  );
} 