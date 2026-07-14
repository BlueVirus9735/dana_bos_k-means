'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import { Save, School } from 'lucide-react';

interface SarprasData {
  id?: number;
  tahun_ajaran: string;
  ruang_kelas_baik: number;
  ruang_kelas_rusak_ringan: number;
  ruang_kelas_rusak_berat: number;
  jumlah_ruang_kelas: number;
  fasilitas_lapangan_olahraga: number;
  fasilitas_perpustakaan: number;
  fasilitas_uks: number;
  fasilitas_toilet: number;
  fasilitas_tempat_ibadah: number;
  jumlah_rombongan_belajar: number;
}

const FIELDS: { key: keyof SarprasData; label: string; group: string }[] = [
  { key: 'jumlah_ruang_kelas',          label: 'Jumlah Ruang Kelas',          group: 'Ruang Kelas' },
  { key: 'ruang_kelas_baik',            label: 'Ruang Kelas Kondisi Baik',    group: 'Ruang Kelas' },
  { key: 'ruang_kelas_rusak_ringan',    label: 'Rusak Ringan',                group: 'Ruang Kelas' },
  { key: 'ruang_kelas_rusak_berat',     label: 'Rusak Berat',                 group: 'Ruang Kelas' },
  { key: 'jumlah_rombongan_belajar',    label: 'Jumlah Rombongan Belajar',    group: 'Lainnya' },
  { key: 'fasilitas_lapangan_olahraga', label: 'Lapangan Olahraga',           group: 'Fasilitas' },
  { key: 'fasilitas_perpustakaan',      label: 'Perpustakaan',                group: 'Fasilitas' },
  { key: 'fasilitas_uks',               label: 'UKS',                         group: 'Fasilitas' },
  { key: 'fasilitas_toilet',            label: 'Toilet',                      group: 'Fasilitas' },
  { key: 'fasilitas_tempat_ibadah',     label: 'Tempat Ibadah',               group: 'Fasilitas' },
];

const empty = (): SarprasData => ({
  tahun_ajaran: '',
  ruang_kelas_baik: 0, ruang_kelas_rusak_ringan: 0, ruang_kelas_rusak_berat: 0,
  jumlah_ruang_kelas: 0, fasilitas_lapangan_olahraga: 0, fasilitas_perpustakaan: 0,
  fasilitas_uks: 0, fasilitas_toilet: 0, fasilitas_tempat_ibadah: 0, jumlah_rombongan_belajar: 0,
});

export default function SarprasPage() {
  const router = useRouter();
  const [sarpras, setSarpras] = useState<SarprasData>(empty());
  const [tahunAktif, setTahunAktif] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tRes = await apiFetch('/tahun_ajaran.php', {}, router);
      if (!tRes.ok) return;
      const tData = await tRes.json();
      const aktif = tData.aktif?.tahun_ajaran ?? '';
      setTahunAktif(aktif);

      if (aktif) {
        const sRes = await apiFetch(`/sekolah_sarpras.php?tahun_ajaran=${encodeURIComponent(aktif)}`, {}, router);
        if (sRes.ok) {
          const sData = await sRes.json();
          // API returns array; grab first item that matches this sekolah
          const existing = Array.isArray(sData) ? sData[0] : sData;
          if (existing && existing.id) {
            setSarpras(existing);
          } else {
            setSarpras({ ...empty(), tahun_ajaran: aktif });
          }
        }
      }
    } catch (e) { console.error(e); setError('Gagal memuat data sarpras'); }
    finally { setLoading(false); }
  };

  const handleChange = (key: keyof SarprasData, val: string) => {
    setSarpras(prev => {
      const parsedVal = parseInt(val) || 0;
      const next = { ...prev, [key]: parsedVal };
      if (['ruang_kelas_baik', 'ruang_kelas_rusak_ringan', 'ruang_kelas_rusak_berat'].includes(key as string)) {
        next.jumlah_ruang_kelas = (next.ruang_kelas_baik || 0) + (next.ruang_kelas_rusak_ringan || 0) + (next.ruang_kelas_rusak_berat || 0);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = { ...sarpras, tahun_ajaran: tahunAktif };
      const method = sarpras.id ? 'PUT' : 'POST';
      const res = await apiFetch('/sekolah_sarpras.php', {
        method,
        body: JSON.stringify(payload),
      }, router);
      const data = await res.json();
      if (res.ok) {
        setSuccess('Data sarpras berhasil disimpan');
        if (!sarpras.id && data.id) setSarpras(prev => ({ ...prev, id: data.id }));
      } else {
        setError(data.error ?? 'Gagal menyimpan data');
      }
    } catch { setError('Server error'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat...</div>
  );

  const groups = ['Ruang Kelas', 'Fasilitas', 'Lainnya'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Data Sarpras Sekolah</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {tahunAktif ? `Tahun Ajaran: ${tahunAktif}` : 'Belum ada tahun ajaran aktif'}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving || !tahunAktif}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
          <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Data'}
        </button>
      </div>

      {!tahunAktif && (
        <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: 13, color: '#f59e0b' }}>
          Belum ada tahun ajaran aktif. Hubungi Admin Dinas.
        </div>
      )}
      {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13 }}>{success}</div>}

      {groups.map(group => {
        const groupFields = FIELDS.filter(f => f.group === group);
        return (
          <div key={group} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <School size={14} color="var(--accent-hover)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{group}</span>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {groupFields.map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type="number"
                    value={sarpras[field.key] as number}
                    onChange={e => handleChange(field.key, e.target.value)}
                    disabled={!tahunAktif || field.key === 'jumlah_ruang_kelas'}
                    min="0"
                    style={{
                      width: '100%', padding: '7px 10px',
                      background: field.key === 'jumlah_ruang_kelas' ? 'var(--bg-default)' : 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 6, color: field.key === 'jumlah_ruang_kelas' ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: 14, fontWeight: 600,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
