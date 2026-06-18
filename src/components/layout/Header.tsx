'use client';

import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useState } from 'react';

const titles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Ringkasan data dan analisis clustering' },
  '/data/kecamatan': { title: 'Data Kecamatan', subtitle: 'Kelola data kecamatan dalam sistem' },
  '/data/sekolah': { title: 'Data Sekolah', subtitle: 'Kelola data sekolah di seluruh kecamatan' },
  '/data/upload': { title: 'Input Data BOS', subtitle: 'Masukkan data dana BOS per sekolah per tahun ajaran' },
  '/clustering': { title: 'Proses Clustering', subtitle: 'Jalankan algoritma K-Means clustering' },
  '/hasil': { title: 'Hasil Clustering', subtitle: 'Lihat hasil dan analisis pengelompokan' },
  '/laporan': { title: 'Laporan', subtitle: 'Cetak dan ekspor laporan distribusi dana BOS' },
};

export default function Header() {
  const pathname = usePathname();
  const [showSearch, setShowSearch] = useState(false);

  const info = Object.entries(titles).find(([key]) =>
    pathname === key || pathname?.startsWith(key + '/')
  )?.[1] ?? { title: 'Halaman', subtitle: '' };

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-white/10 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-4">
      {/* Left spacer (mobile hamburger) */}
      <div className="w-10 md:hidden flex-shrink-0" />

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-[15px] font-bold text-slate-100 leading-none truncate">{info.title}</h2>
        <p className="text-xs text-slate-400 mt-0.5 hidden sm:block truncate">{info.subtitle}</p>
      </div>

      {/* Right: Search + Notif */}
      <div className="flex items-center gap-2">
        {showSearch ? (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              onBlur={() => setShowSearch(false)}
              type="text"
              placeholder="Cari..."
              className="form-input pl-8 py-1.5 text-sm w-40 sm:w-64"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
            title="Cari"
          >
            <Search size={18} />
          </button>
        )}

        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-900" />
        </button>
      </div>
    </header>
  );
}
