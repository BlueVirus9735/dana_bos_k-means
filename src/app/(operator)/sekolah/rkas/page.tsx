'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getUser } from '@/lib/api';
import { Plus, ChevronRight, BookOpen, AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';

interface RKAS {
  id: number;
  tahun_ajaran: string;
  status: 'draft' | 'pending' | 'revisi' | 'disahkan';
  catatan_revisi?: string;
  tanggal_submit?: string;
  tanggal_verifikasi?: string;
  jumlah_item?: number;
  total_anggaran?: number;
  created_at: string;
}

interface TahunAjaran {
  tahun_ajaran: string;
  status: string;
  batas_submit_rkas: string | null;
}

const STATUS_CONFIG = {
  draft:    { label: 'Draft',                color: '#8b949e', bg: 'rgba(139,148,158,0.1)', icon: Edit },
  pending:  { label: 'Menunggu Verifikasi',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
  revisi:   { label: 'Perlu Direvisi',       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: AlertTriangle },
  disahkan: { label: 'Disahkan',             color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: CheckCircle },
};

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  return `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
}

export default function OperatorRKASPage() {
  const router = useRouter();
  const [rkasList, setRkasList] = useState<RKAS[]>([]);
  const [tahunAktif, setTahunAktif] = useState<TahunAjaran | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, tRes] = await Promise.all([
        apiFetch('/rkas.php', {}, router),
        apiFetch('/tahun_ajaran.php', {}, router),
      ]);
      if (rRes.ok) setRkasList(await rRes.json());
      if (tRes.ok) {
        const tData = await tRes.json();
        setTahunAktif(tData.aktif ?? null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!tahunAktif) return;
    setCreating(true); setError('');
    try {
      const res = await apiFetch('/rkas.php', {
        method: 'POST',
        body: JSON.stringify({ tahun_ajaran: tahunAktif.tahun_ajaran }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        router.push(`/sekolah/rkas/${data.id}`);
      } else {
        setError(data.error ?? 'Gagal membuat RKAS');
      }
    } catch { setError('Server error'); }
    finally { setCreating(false); }
  };

  // Check if RKAS for active tahun ajaran already exists
  const hasActiveTahunRkas = tahunAktif
    ? rkasList.some(r => r.tahun_ajaran === tahunAktif.tahun_ajaran)
    : false;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>RKAS</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Rencana Kegiatan dan Anggaran Sekolah</p>
        </div>
        {tahunAktif && !hasActiveTahunRkas && (
          <button onClick={handleCreate} disabled={creating}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> {creating ? 'Membuat...' : `Buat RKAS ${tahunAktif.tahun_ajaran}`}
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!tahunAktif && (
        <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: 13, color: '#f59e0b' }}>
          Belum ada tahun ajaran aktif. Hubungi Admin Dinas untuk membuka tahun ajaran.
        </div>
      )}

      {rkasList.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Belum ada RKAS</div>
          {tahunAktif && !hasActiveTahunRkas && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>Klik tombol di atas untuk membuat RKAS {tahunAktif.tahun_ajaran}</div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rkasList.map(rkas => {
            const cfg = STATUS_CONFIG[rkas.status] ?? STATUS_CONFIG.draft;
            const Icon = cfg.icon;
            return (
              <Link key={rkas.id} href={`/sekolah/rkas/${rkas.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>RKAS {rkas.tahun_ajaran}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`, padding: '2px 8px', borderRadius: 20 }}>
                        <Icon size={10} /> {cfg.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {rkas.jumlah_item ?? 0} item kegiatan
                      {rkas.total_anggaran ? ` · Total: ${fmtRp(rkas.total_anggaran)}` : ''}
                    </div>
                    {rkas.status === 'revisi' && rkas.catatan_revisi && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>
                        ⚠ {rkas.catatan_revisi}
                      </div>
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
