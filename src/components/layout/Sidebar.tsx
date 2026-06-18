'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  School,
  Upload,
  BrainCircuit,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { name: 'Data Kecamatan', href: '/data/kecamatan', icon: Map, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { name: 'Data Sekolah', href: '/data/sekolah', icon: School, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { name: 'Input Data BOS', href: '/data/upload', icon: Upload, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { name: 'Proses Clustering', href: '/clustering', icon: BrainCircuit, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  { name: 'Hasil Clustering', href: '/hasil', icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { name: 'Laporan', href: '/laporan', icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2.5 bg-slate-900/80 backdrop-blur-md text-slate-200 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col h-full',
          'bg-slate-900/60 backdrop-blur-xl border-r border-white/10 shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20">
              <img src="/Logo%20Disdik.jpg" alt="Logo Disdik" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-100 leading-none block">Dana BOS</span>
              <span className="text-xs text-slate-400 leading-none">K-Means Clustering</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 pb-2 pt-1">
            Menu Utama
          </p>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative overflow-hidden',
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_15px_rgba(99,102,241,0.05)]'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                    isActive ? `${item.bg} ${item.color}` : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-700/50',
                  ].join(' ')}
                >
                  <item.icon size={15} />
                </span>
                <span className="flex-1 truncate relative z-10">{item.name}</span>
                {isActive && <ChevronRight size={14} className="text-indigo-400 flex-shrink-0 relative z-10" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-slate-800/50 border border-white/5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">Admin BOS</p>
              <p className="text-xs text-slate-400">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
          >
            <span className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <LogOut size={15} />
            </span>
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
