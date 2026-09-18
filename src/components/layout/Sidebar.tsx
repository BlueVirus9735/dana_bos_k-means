'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Map, School, Upload, BrainCircuit, BarChart3,
  FileText, Users, CalendarRange,
  ClipboardList, CheckSquare, BookOpen, Calculator, Building2,
  FlaskConical, PanelLeftClose, PanelLeftOpen, ChevronDown
} from 'lucide-react';

import { getUser, UserRole } from '@/lib/api';
import { useEffect, useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    title: 'Master Data',
    items: [
      { name: 'Tahun Ajaran', href: '/tahun-ajaran', icon: CalendarRange },
      { name: 'Data Kecamatan', href: '/data/kecamatan', icon: Map },
      { name: 'Data Sekolah', href: '/data/sekolah', icon: School },
      { name: 'Kelola Operator', href: '/operator', icon: Users },
    ],
  },
  {
    title: 'Pengelolaan BOS',
    items: [
      { name: 'Input Data BOS', href: '/data/upload', icon: Upload },
      { name: 'Verifikasi RKAS', href: '/verifikasi/rkas', icon: CheckSquare },
      { name: 'Validasi Laporan', href: '/validasi/laporan', icon: ClipboardList },
    ],
  },
  {
    title: 'Analisis & Laporan',
    items: [
      { name: 'Proses Clustering', href: '/clustering', icon: BrainCircuit },
      { name: 'Hasil Clustering', href: '/hasil', icon: BarChart3 },
      { name: 'Uji Kualitas Klaster', href: '/evaluasi', icon: FlaskConical },
      { name: 'Laporan', href: '/laporan', icon: FileText },
    ],
  },
];

const operatorNavGroups: NavGroup[] = [
  {
    title: 'Data Sekolah',
    items: [
      { name: 'Profil Sekolah', href: '/sekolah/profil', icon: Building2 },
      { name: 'Data Sarpras', href: '/sekolah/sarpras', icon: School },
    ],
  },
  {
    title: 'Dana BOS',
    items: [
      { name: 'RKAS', href: '/sekolah/rkas', icon: BookOpen },
      { name: 'Realisasi Dana BOS', href: '/sekolah/realisasi', icon: Calculator },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Master Data': true,
    'Pengelolaan BOS': true,
    'Analisis & Laporan': true,
    'Data Sekolah': true,
    'Dana BOS': true,
  });

  useEffect(() => {
    const u = getUser();
    setRole(u?.role ?? null);

    // Restore preference
    const savedCollapsed = localStorage.getItem('sidebar_collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }

    const savedGroups = localStorage.getItem('sidebar_groups');
    if (savedGroups) {
      try {
        setOpenGroups((prev) => ({ ...prev, ...JSON.parse(savedGroups) }));
      } catch { /* ignore */ }
    }
  }, []);

  // Auto-expand group if current path is in that group
  useEffect(() => {
    const groups = role === 'operator' ? operatorNavGroups : adminNavGroups;
    for (const g of groups) {
      const hasActive = g.items.some(
        (item) => pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + '/'))
      );
      if (hasActive) {
        setOpenGroups((prev) => ({ ...prev, [g.title]: true }));
      }
    }
  }, [pathname, role]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      localStorage.setItem('sidebar_groups', JSON.stringify(next));
      return next;
    });
  };

  const dashboardHref = role === 'operator' ? '/sekolah/dashboard' : '/dashboard';
  const isDashboardActive = pathname === dashboardHref;
  const navGroups = role === 'operator' ? operatorNavGroups : adminNavGroups;

  return (
    <aside
      className={`h-full flex-shrink-0 flex flex-col border-r print:hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
      style={{ borderColor: '#e2e8f0', background: '#ffffff', height: '100%' }}
    >
      {/* ── Brand Header with Logo Disdik & Toggle Button ───────────── */}
      <div
        className="h-16 flex items-center border-b px-3 justify-between gap-2"
        style={{ borderColor: '#e2e8f0', background: '#ffffff' }}
      >
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden flex-1">
          <Link
            href={dashboardHref}
            title="Dinas Pendidikan - Kembali ke Dashboard"
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-slate-200 overflow-hidden shadow-xs flex-shrink-0 p-0.5 transition-transform hover:scale-105"
          >
            <img
              src="/Logo Disdik.jpg"
              alt="Logo Dinas Pendidikan"
              className="w-full h-full object-contain"
            />
          </Link>

          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-bold text-sm leading-tight text-slate-900 truncate">
                Dana BOS Disdik
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                {role === 'operator' ? 'Operator Satuan' : 'K-Means Clustering'}
              </p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          title={isCollapsed ? 'Buka Sidebar (Perbesar)' : 'Tutup Sidebar (Perkecil)'}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0 cursor-pointer"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* ── Navigation Items ─────────────────────────────────────────── */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-3 overflow-y-auto overflow-x-hidden">
        {/* Dashboard Link (Selalu di atas) */}
        <div className="flex flex-col">
          <Link
            href={dashboardHref}
            title={isCollapsed ? 'Dashboard' : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            style={{
              background: isDashboardActive ? '#eff6ff' : 'transparent',
              color: isDashboardActive ? '#2563eb' : '#475569',
              fontWeight: isDashboardActive ? 600 : 500,
              boxShadow: isDashboardActive && !isCollapsed ? 'inset 3px 0 0 #2563eb' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isDashboardActive) {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#0f172a';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDashboardActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#475569';
              }
            }}
          >
            <LayoutDashboard size={17} color={isDashboardActive ? '#2563eb' : '#64748b'} className="flex-shrink-0" />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
        </div>

        {/* Grouped Collapsible Sub-menus */}
        {navGroups.map((group) => {
          const isOpen = openGroups[group.title] !== false;
          const hasActiveItem = group.items.some(
            (item) => pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + '/'))
          );

          return (
            <div key={group.title} className="flex flex-col gap-0.5">
              {/* Group Header (Bisa di-klik untuk buka/tutup) */}
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 rounded-md transition-colors group cursor-pointer"
                >
                  <span className={`transition-colors ${hasActiveItem ? 'text-slate-700 font-extrabold' : ''}`}>
                    {group.title}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div className="my-1 border-t border-slate-100" title={group.title} />
              )}

              {/* Sub-items */}
              {(isOpen || isCollapsed) && (
                <div className="flex flex-col gap-0.5 transition-all duration-200">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href.length > 1 && pathname.startsWith(item.href + '/'));

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        title={isCollapsed ? item.name : undefined}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                          isCollapsed ? 'justify-center' : ''
                        }`}
                        style={{
                          background: isActive ? '#eff6ff' : 'transparent',
                          color: isActive ? '#2563eb' : '#475569',
                          fontWeight: isActive ? 600 : 500,
                          boxShadow: isActive && !isCollapsed ? 'inset 3px 0 0 #2563eb' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.color = '#0f172a';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#475569';
                          }
                        }}
                      >
                        <item.icon size={16} color={isActive ? '#2563eb' : '#64748b'} className="flex-shrink-0" />
                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
