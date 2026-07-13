'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import { CheckCircle, XCircle, Eye, Clock, AlertTriangle, ChevronRight, Filter } from 'lucide-react';

interface RKASItem {
  id: number;
  sekolah_id: number;
  nama_sekolah: string;
  npsn: string;
  nama_kecamatan: string;
  tahun_ajaran: string;
  status: 'draft' | 'pending' | 'revisi' | 'disahkan';
  catatan_revisi?: string;
  tanggal_submit?: string;
  jumlah_item: number;
  total_anggaran: number;
}

interface RKASDetail extends RKASItem {
  items: {
    id: number;
    komponen_kegiatan: string;
    uraian: string;
    volume: number;
    satuan: string;
    harga_satuan: number;
    jumlah: number;
  }[];
}

const STATUS_CFG = {
  draft:    { label: 'Draft',               color: '#8b949e', bg: 'rgba(139,148,158,0.1)' },
  pending:  { label: 'Menunggu Verifikasi', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  revisi:   { label: 'Dikembalikan',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  disahkan: { label: 'Disahkan',            color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  return `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
}

export default function VerifikasiRKASPage() {
  const router = useRouter();
  const [list, setList] = useState<RKASItem[]>([]);
  const [detail, setDetail] = useState<RKASDetail | null>(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [showCatatanInput, setShowCatatanInput] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') { router.push('/login'); return; }
    fetchList();
  }, [filterStatus]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/rkas_verifikasi.php${filterStatus ? `?status=${filterStatus}` : ''}`, {}, router);
      if (res.ok) setList(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (id: number) => {
    try {
      const res = await apiFetch(`/rkas_verifikasi.php?id=${id}`, {}, router);
      if (res.ok) setDetail(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAction = async (action: 'sahkan' | 'kembalikan') => {
    if (!detail) return;
    if (action === 'kembalikan' && !catatanRevisi.trim()) {
      setError('Catatan revisi wajib diisi saat mengembalikan RKAS'); return;
    }
    setProcessing(true); setError(''); setSuccess('');
    try {
      const res = await apiFetch('/rkas_verifikasi.php', {
        method: 'PUT',
        body: JSON.stringify({ id: detail.id, action, catatan_revisi: catatanRevisi }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        setSuccess(action === 'sahkan' ? 'RKAS berhasil disahkan!' : 'RKAS dikembalikan untuk direvisi');
        setDetail(null); setCatatanRevisi(''); setShowCatatanInput(false);
        await fetchList();
      } else setError(data.error ?? 'Gagal memproses');
    } catch { setError('Server error'); }
    finally { setProcessing(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Verifikasi RKAS</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Verifikasi Rencana Kegiatan dan Anggaran Sekolah</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--text-muted)" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="">Semua</option>
            <option value="pending">Menunggu Verifikasi</option>
            <option value="disahkan">Disahkan</option>
            <option value="revisi">Dikembalikan</option>
          </select>
        </div>
      </div>

      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13 }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: detail ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <CheckCircle size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Tidak ada RKAS {filterStatus === 'pending' ? 'yang menunggu verifikasi' : ''}</div>
            </div>
          ) : list.map(item => {
            const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.draft;
            const isSelected = detail?.id === item.id;
            return (
              <div key={item.id} onClick={() => fetchDetail(item.id)}
                className="card"
                style={{ padding: '14px 16px', cursor: 'pointer', border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, background: isSelected ? 'var(--accent-muted)' : '' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{item.nama_sekolah}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.nama_kecamatan} · {item.tahun_ajaran}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{item.jumlah_item} item · {fmtRp(item.total_anggaran)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`, padding: '2px 8px', borderRadius: 20 }}>{cfg.label}</span>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                </div>
                {item.status === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f59e0b', marginTop: 8 }}>
                    <Clock size={11} /> Menunggu verifikasi sejak {item.tanggal_submit?.slice(0,10)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {detail && (
          <div className="card" style={{ overflow: 'hidden', position: 'sticky', top: 80, maxHeight: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Detail RKAS</div>
              <button onClick={() => { setDetail(null); setShowCatatanInput(false); setCatatanRevisi(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><XCircle size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{detail.nama_sekolah}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>NPSN: {detail.npsn} · {detail.nama_kecamatan} · {detail.tahun_ajaran}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-hover)', marginTop: 8 }}>{fmtRp(detail.total_anggaran)}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: 'var(--bg-elevated)' }}>
                  {['No','Kegiatan','Jumlah'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontSize: 11 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {detail.items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-primary)' }}>
                        <div style={{ fontWeight: 500 }}>{item.komponen_kegiatan}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.uraian} ({item.volume} {item.satuan})</div>
                      </td>
                      <td style={{ padding: '6px 10px', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtRp(item.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            {detail.status === 'pending' && (
              <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                {showCatatanInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#ef4444' }}>
                      <AlertTriangle size={14} /> Catatan Revisi
                    </div>
                    <textarea value={catatanRevisi} onChange={e => setCatatanRevisi(e.target.value)}
                      rows={3} placeholder="Tuliskan catatan revisi untuk operator sekolah..."
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setShowCatatanInput(false); setCatatanRevisi(''); }}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Batal</button>
                      <button onClick={() => handleAction('kembalikan')} disabled={processing}
                        style={{ flex: 1, padding: '7px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                        {processing ? 'Memproses...' : 'Kembalikan'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowCatatanInput(true)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <XCircle size={15} /> Kembalikan
                    </button>
                    <button onClick={() => handleAction('sahkan')} disabled={processing}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <CheckCircle size={15} /> {processing ? '...' : 'Sahkan'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
