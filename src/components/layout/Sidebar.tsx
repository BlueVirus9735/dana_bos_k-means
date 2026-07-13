'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Map, School, Upload, BrainCircuit, BarChart3, FileText, LogOut, Hexagon } from 'lucide-react';

const navItems = [
  { name: 'Dashboard',         href: '/dashboard',      icon: LayoutDashboard },
  { name: 'Data Kecamatan',    href: '/data/kecamatan', icon: Map },
  { name: 'Data Sekolah',      href: '/data/sekolah',   icon: School },
  { name: 'Input Data BOS',    href: '/data/upload',    icon: Upload },
  { name: 'Proses Clustering', href: '/clustering',     icon: BrainCircuit },
  { name: 'Hasil Clustering',  href: '/hasil',          icon: BarChart3 },
  { name: 'Laporan',           href: '/laporan',        icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <div className="h-16 flex items-center px-6 border-b gap-3" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent)', boxShadow: '0 0 15px rgba(99,102,241,0.5)' }}>
          <Hexagon size={18} className="fill-white/20" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>Dana BOS</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>K-Means Clustering</p>
        </div>
      </div>
      
      <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Menu Utama</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/data' && pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.name} href={item.href} 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent-hover)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if(!isActive) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if(!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <item.icon size={18} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
              {item.name}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button 
          onClick={() => { localStorage.removeItem('admin'); router.push('/login'); }} 
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--danger)' }}
          onMouseEnter={(e) => {
             e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
          }}
          onMouseLeave={(e) => {
             e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </aside>
  );
}

// Force tailwind recompile