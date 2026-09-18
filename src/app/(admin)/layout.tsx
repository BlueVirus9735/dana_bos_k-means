import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white" style={{ background: '#f8fafc', color: '#0f172a' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative print:block print:h-auto print:overflow-visible print:static print:w-full">
        <Header />
        <main className="flex-1 overflow-y-auto print:block print:overflow-visible print:h-auto print:p-0 print:m-0 print:w-full">
          <div className="p-6 md:p-8 lg:p-8 w-full print:p-0 print:m-0 print:w-full print:max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Force tailwind recompile