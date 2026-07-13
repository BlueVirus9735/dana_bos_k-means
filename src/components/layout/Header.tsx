'use client';

import { useEffect, useState } from 'react';
import { getUser } from '@/lib/api';

export default function Header() {
  const [nama, setNama] = useState('');
  const [role, setRole] = useState('');
  const [initial, setInitial] = useState('A');

  useEffect(() => {
    const u = getUser();
    if (u) {
      setNama(u.nama);
      setRole(u.role === 'admin' ? 'Admin Dinas' : 'Operator Sekolah');
      setInitial(u.nama?.charAt(0)?.toUpperCase() ?? 'U');
    }
  }, []);

  return (
    <header className="h-16 flex items-center px-6 md:px-8 border-b sticky top-0 z-10 flex-shrink-0"
      style={{ borderColor: 'var(--border)', background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(12px)' }}
    >
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        {role && (
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: role === 'Admin Dinas' ? 'var(--accent-hover)' : 'var(--green)',
            background: role === 'Admin Dinas' ? 'var(--accent-muted)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${role === 'Admin Dinas' ? 'var(--accent)33' : 'rgba(16,185,129,0.3)'}`,
            padding: '2px 8px',
            borderRadius: 20,
          }}>
            {role}
          </div>
        )}
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {nama || 'Pengguna'}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Dinas Pendidikan Kab. Cirebon</div>
        </div>
        <div className="w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}