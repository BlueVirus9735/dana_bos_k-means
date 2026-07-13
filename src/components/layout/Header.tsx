'use client';

import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="h-16 flex items-center px-6 md:px-8 border-b sticky top-0 z-10 flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(12px)' }}>
      <div className="flex-1">
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Administrator</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Dinas Pendidikan</div>
        </div>
        <div className="w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          A
        </div>
      </div>
    </header>
  );
}