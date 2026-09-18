'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/api';
import { LogOut, ChevronDown, ShieldCheck, User } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [initial, setInitial] = useState('A');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setNama(u.nama || '');
      setUsername(u.username || '');
      setRole(u.role === 'admin' ? 'Administrator Dinas' : 'Operator Sekolah');
      setInitial(u.nama?.charAt(0)?.toUpperCase() ?? 'A');
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/backend/login.php', { method: 'DELETE', credentials: 'include' });
    } catch { /* ignore */ }
    localStorage.removeItem('user');
    localStorage.removeItem('admin');
    router.push('/login');
  };

  return (
    <header
      className="h-16 flex items-center px-6 md:px-8 border-b sticky top-0 z-30 flex-shrink-0 print:hidden justify-between"
      style={{
        borderColor: '#e2e8f0',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex-1" />

      {/* ── User Profile Menu with Interactive Dropdown ───────────────── */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-3 p-1.5 pl-3 rounded-xl transition-all duration-150 cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50/80"
          title="Menu Profil Akun"
        >
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-bold text-slate-900 leading-tight">
              {nama || 'Administrator Dinas'}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center justify-end gap-1">
              <span>{role || 'Admin'}</span>
              <span>•</span>
              <span className="text-slate-400">Kab. Cirebon</span>
            </div>
          </div>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-xs transition-transform"
            style={{
              background: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              color: '#2563eb',
            }}
          >
            {initial}
          </div>

          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-200 hidden sm:block ${
              dropdownOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </button>

        {/* ── Profile Dropdown Popover ─────────────────────────────────── */}
        {dropdownOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 animate-in"
            style={{ boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)' }}
          >
            {/* Header info */}
            <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  color: '#2563eb',
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {nama || 'Pengguna'}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  @{username || 'admin'}
                </div>
                <span
                  className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #dbeafe',
                  }}
                >
                  <ShieldCheck size={11} /> {role || 'Admin'}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-1.5">
              <div className="px-3 py-1.5 text-[11px] text-slate-400 font-medium">
                Dinas Pendidikan Kab. Cirebon
              </div>

              <div className="my-1 border-t border-slate-100" />

              {/* Tombol Keluar */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-red-600 hover:bg-red-50"
              >
                <LogOut size={15} />
                <span>Keluar dari Sistem</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
