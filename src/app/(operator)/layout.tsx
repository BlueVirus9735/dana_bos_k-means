import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
