'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, School, Upload, BrainCircuit, BarChart3,
  FileText, LogOut, Hexagon, Users, CalendarRange,
  ClipboardList, CheckSquare, BookOpen, Calculator, Building2,
} from 'lucide-react';
import { getUser, UserRole } from '@/lib/api';
import { useEffect, useState } from 'react';

const adminNavItems = [
  { name: 'Dashboard',           href: '/dashboard',           icon: LayoutDashboard },
  { name: 'Tahun Ajaran',        href: '/tahun-ajaran',        icon: CalendarRange },
  { name: 'Data Kecamatan',      href: '/data/kecamatan',      icon: Map },
  { name: 'Data Sekolah',        href: '/data/sekolah',        icon: School },
  { name: 'Kelola Operator',     href: '/operator',            icon: Users },
  { name: 'Input Data BOS',      href: '/data/upload',         icon: Upload },
  { name: 'Verifikasi RKAS',     href: '/verifikasi/rkas',     icon: CheckSquare },
  { name: 'Validasi Laporan',    href: '/validasi/laporan',    icon: ClipboardList },
  { name: 'Proses Clustering',   href: '/clustering',          icon: BrainCircuit },
  { name: 'Hasil Clustering',    href: '/hasil',               icon: BarChart3 },
  { name: 'Laporan',             href: '/laporan',             icon: FileText },
];

const operatorNavItems = [
  { name: 'Dashboard',           href: '/sekolah/dashboard',   icon: LayoutDashboard },
  { name: 'Profil Sekolah',      href: '/sekolah/profil',      icon: Building2 },
  { name: 'Data Sarpras',        href: '/sekolah/sarpras',     icon: School },
  { name: 'RKAS',                href: '/sekolah/rkas',        icon: BookOpen },
  { name: 'Realisasi Dana BOS',  href: '/sekolah/realisasi',   icon: Calculator },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [namaUser, setNamaUser] = useState('');

  useEffect(() => {
    const u = getUser();
    setRole(u?.role ?? null);
    setNamaUser(u?.nama ?? '');
  }, []);

  const navItems = role === 'operator' ? operatorNavItems : adminNavItems;

  const handleLogout = async () => {
    try {
      await fetch('/api/backend/login.php', { method: 'DELETE', credentials: 'include' });
    } catch { /* ignore */ }
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    router.push('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
      <div className="h-16 flex items-center px-6 border-b gap-3" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: 'var(--accent)', boxShadow: '0 0 15px rgba(99,102,241,0.5)' }}>
          <Hexagon size={18} className="fill-white/20" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>Dana BOS</h1>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {role === 'operator' ? 'Operator Sekolah' : 'K-Means Clustering'}
          </p>
        </div>
      </div>

      {/* User info */}
      {namaUser && (
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
            {role === 'operator' ? 'Operator Sekolah' : 'Admin Dinas'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {namaUser}
          </div>
        </div>
      )}

      <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Menu Utama</div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + '/'));
          return (
            <Link key={item.name} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent-hover)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <item.icon size={16} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--danger)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={18} /> Keluar
        </button>
      </div>
    </aside>
  );
}