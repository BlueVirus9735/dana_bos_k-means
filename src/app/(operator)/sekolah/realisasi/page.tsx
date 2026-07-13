'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getUser } from '@/lib/api';
import { Plus, ChevronRight, Calculator, AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';

interface Realisasi {
  id: number;
  tahun_ajaran: string;
  status: 'draft' | 'submitted' | 'pembinaan' | 'terverifikasi';
  catatan_validasi?: string;
  total_penerimaan: number;
  total_pengeluaran: number;
  saldo: number;
  created_at: string;
}

const STATUS_CFG = {
  draft:         { label: 'Draft',            color: '#8b949e', bg: 'rgba(139,148,158,0.1)', icon: Edit },
  submitted:     { label: 'Dikirim',          color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
  pembinaan:     { label: 'Perlu Perbaikan',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: AlertTriangle },
  terverifikasi: { label: 'Terverifikasi',    color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
};

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  return `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
}

export default function RealisasiPage() {
  const router = useRouter();
  const [list, setList] = useState<Realisasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tahunAktif, setTahunAktif] = useState('');
  const [hasDisahkanRkas, setHasDisahkanRkas] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, tRes, rkasRes] = await Promise.all([
        apiFetch('/realisasi.php', {}, router),
        apiFetch('/tahun_ajaran.php', {}, router),
        apiFetch('/rkas.php', {}, router),
      ]);
      if (rRes.ok) setList(await rRes.json());
      if (tRes.ok) {
        const d = await tRes.json();
        setTahunAktif(d.aktif?.tahun_ajaran ?? '');
      }
      if (rkasRes.ok) {
        const rkasList = await rkasRes.json();
        setHasDisahkanRkas(Array.isArray(rkasList) && rkasList.some((r: { status: string }) => r.status === 'disahkan'));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!tahunAktif || !hasDisahkanRkas) return;
    setCreating(true); setError('');
    try {
      const res = await apiFetch('/realisasi.php', {
        method: 'POST',
        body: JSON.stringify({ tahun_ajaran: tahunAktif }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        router.push(`/sekolah/realisasi/${data.id}`);
      } else {
        setError(data.error ?? 'Gagal membuat realisasi');
      }
    } catch { setError('Server error'); }
    finally { setCreating(false); }
  };

  const hasActiveRealisasi = tahunAktif && list.some(r => r.tahun_ajaran === tahunAktif);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Realisasi Dana BOS</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Laporan penggunaan dana BOS</p>
        </div>
        {tahunAktif && !hasActiveRealisasi && hasDisahkanRkas && (
          <button onClick={handleCreate} disabled={creating}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> {creating ? 'Membuat...' : `Buat Realisasi ${tahunAktif}`}
          </button>
        )}
      </div>

      {!hasDisahkanRkas && tahunAktif && (
        <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: 13, color: '#f59e0b' }}>
          RKAS harus disahkan oleh Dinas Pendidikan sebelum bisa membuat laporan realisasi.
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}

      {list.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <Calculator size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Belum ada laporan realisasi</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(item => {
            const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.draft;
            const Icon = cfg.icon;
            return (
              <Link key={item.id} href={`/sekolah/realisasi/${item.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Realisasi {item.tahun_ajaran}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`, padding: '2px 8px', borderRadius: 20 }}>
                        <Icon size={10} /> {cfg.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginTop: 4, flexWrap: 'wrap' }}>
                      <span>Penerimaan: <strong style={{ color: 'var(--green)' }}>{fmtRp(item.total_penerimaan)}</strong></span>
                      <span>Pengeluaran: <strong style={{ color: 'var(--amber)' }}>{fmtRp(item.total_pengeluaran)}</strong></span>
                      <span>Saldo: <strong style={{ color: item.saldo >= 0 ? 'var(--green)' : '#ef4444' }}>{fmtRp(item.saldo)}</strong></span>
                    </div>
                    {item.status === 'pembinaan' && item.catatan_validasi && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>⚠ {item.catatan_validasi}</div>
                    )}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
