'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  MapPin, Plus, X, Pencil, Trash2, Search,
  CheckCircle2, AlertCircle, Home, Layers, Users,
  RefreshCw, BarChart2,
} from 'lucide-react';

interface Kecamatan {
  id: number;
  nama_kecamatan: string;
  kode_kecamatan: string;
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
  latitude: number | null;
  longitude: number | null;
  tahun_ajaran: string;
}

interface AggRow {
  kecamatan_id: number;
  nama_kecamatan: string;
  kode_kecamatan: string;
  jumlah_sekolah: number;
  sekolah_sudah_isi: number;
  jumlah_ruang_kelas: number;
  ruang_kelas_baik: number;
  ruang_kelas_rusak_ringan: number;
  ruang_kelas_rusak_berat: number;
  fasilitas_lapangan_olahraga: number;
  fasilitas_perpustakaan: number;
  fasilitas_uks: number;
  fasilitas_toilet: number;
  fasilitas_tempat_ibadah: number;
  jumlah_rombongan_belajar: number;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;
type ViewTab = 'master' | 'agregasi';

const emptyForm = {
  nama_kecamatan: '',
  kode_kecamatan: '',
  tahun_ajaran: '2024/2025',
};

const FormField = ({ label, field, formData, setFormData, placeholder, required }: {
  label: string; field: keyof typeof emptyForm; formData: typeof emptyForm; setFormData: any; placeholder?: string; required?: boolean;
}) => (
  <div>
    <label className="form-label text-xs mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    <input
      type={['latitude','longitude','nama_kecamatan','kode_kecamatan','tahun_ajaran'].includes(field as string) ? 'text' : 'number'}
      min={0}
      step={['latitude','longitude'].includes(field) ? 'any' : undefined}
      value={formData[field]}
      onChange={e => setFormData({ ...formData, [field]: e.target.value })}
      className="form-input py-1.5 px-3 text-sm"
      placeholder={placeholder}
      required={required}
    />
  </div>
);

export default function KecamatanPage() {
  const router = useRouter();
  const [kecamatan, setKecamatan] = useState<Kecamatan[]>([]);
  const [aggData, setAggData] = useState<AggRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggLoading, setAggLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastType>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tab, setTab] = useState<ViewTab>('master');
  const [tahunSync, setTahunSync] = useState('2024/2025');

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) { router.push('/login'); return; }
    fetchKecamatan();
  }, [router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'agregasi') fetchAggregasi();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tahunSync]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchKecamatan = async () => {
    try {
      const res = await apiFetch('/kecamatan.php', {}, router);
      const data = await res.json();
      setKecamatan(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setKecamatan([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregasi = async () => {
    setAggLoading(true);
    try {
      const res = await apiFetch(`/kecamatan.php?aggregate=1&tahun_ajaran=${encodeURIComponent(tahunSync)}`, {}, router);
      const data = await res.json();
      setAggData(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setAggLoading(false); }
  };

  const handleSync = async () => {
    if (!confirm(`Sinkronisasi data kecamatan dari sarpras sekolah untuk tahun ajaran ${tahunSync}?\nData kecamatan akan diperbarui otomatis dari input operator.`)) return;
    setSyncing(true);
    try {
      const res = await apiFetch('/kecamatan.php?sync=1', {
        method: 'PUT',
        body: JSON.stringify({ tahun_ajaran: tahunSync }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchKecamatan();
        fetchAggregasi();
      } else {
        showToast(data.error || 'Gagal sinkronisasi', 'error');
      }
    } catch { showToast('Error sinkronisasi', 'error'); }
    finally { setSyncing(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method  = editingId ? 'PUT' : 'POST';
      const url     = editingId ? `/kecamatan.php?id=${editingId}` : '/kecamatan.php';
      const body    = {
        ...(editingId ? { id: editingId } : {}),
        nama_kecamatan: formData.nama_kecamatan,
        kode_kecamatan: formData.kode_kecamatan,
        tahun_ajaran:   formData.tahun_ajaran,
      };

      const res = await apiFetch(url, { method, body: JSON.stringify(body) }, router);
      if (res.ok) {
        closeForm();
        fetchKecamatan();
        showToast(editingId ? 'Kecamatan berhasil diperbarui!' : 'Kecamatan berhasil ditambahkan!', 'success');
      } else {
        const err = await res.json().catch(() => null);
        showToast('Gagal menyimpan: ' + (err?.error || res.statusText), 'error');
      }
    } catch (err: unknown) {
      showToast('Error: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Kecamatan) => {
    setFormData({
      nama_kecamatan: item.nama_kecamatan,
      kode_kecamatan: item.kode_kecamatan,
      tahun_ajaran:   item.tahun_ajaran || '2024/2025',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Yakin ingin menghapus kecamatan "${nama}"?`)) return;
    try {
      const res = await apiFetch(`/kecamatan.php?id=${id}`, { credentials: 'include', method: 'DELETE' });
      if (res.ok) { fetchKecamatan(); showToast('Kecamatan berhasil dihapus.', 'success'); }
    } catch { showToast('Gagal menghapus kecamatan.', 'error'); }
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormData(emptyForm); };

  const filtered = kecamatan.filter(k =>
    k.nama_kecamatan.toLowerCase().includes(search.toLowerCase()) ||
    k.kode_kecamatan.toLowerCase().includes(search.toLowerCase())
  );

  const TAB_BTN = (active: boolean) => ({
    padding: '7px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    background: 'transparent', color: active ? 'var(--accent-hover)' : 'var(--text-muted)',
    display: 'flex', alignItems: 'center', gap: 6,
  });

  return (
    <>
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <MapPin size={20} className="text-[var(--accent-hover)]" />
            Data Kecamatan
          </h1>
          <p className="page-subtitle">Kelola data kecamatan & lihat agregasi sarpras dari input operator sekolah</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormData(emptyForm); }}
          className="btn-primary"
        >
          <Plus size={18} /> Tambah Kecamatan
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 4 }}>
        <button style={TAB_BTN(tab === 'master')} onClick={() => setTab('master')}>
          <MapPin size={14} /> Data Master
        </button>
        <button style={TAB_BTN(tab === 'agregasi')} onClick={() => setTab('agregasi')}>
          <BarChart2 size={14} /> Agregasi Sarpras Sekolah
        </button>
      </div>

      {/* ── TAB MASTER ── */}
      {tab === 'master' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari nama atau kode..." value={search}
                onChange={e => setSearch(e.target.value)} className="form-input pl-9" />
            </div>
            <span className="text-sm text-slate-400 font-medium shrink-0">
              {filtered.length} dari {kecamatan.length} kecamatan
            </span>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-10 w-full"/>)}</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <MapPin size={40} className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {search ? 'Tidak ada hasil pencarian' : 'Belum ada data kecamatan'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>No</th>
                      <th>Kecamatan</th>
                      <th>Tahun Ajaran</th>
                      <th><Home size={13} className="inline mr-1"/>R. Kelas (Baik/Ringan/Berat)</th>
                      <th><Layers size={13} className="inline mr-1"/>Fasilitas</th>
                      <th><Users size={13} className="inline mr-1"/>Rombel</th>
                      <th style={{ width: 140 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => {
                      const totalFasilitas = item.fasilitas_lapangan_olahraga + item.fasilitas_perpustakaan +
                        item.fasilitas_uks + item.fasilitas_toilet + item.fasilitas_tempat_ibadah;
                      return (
                        <tr key={item.id}>
                          <td className="text-slate-400 text-sm">{i + 1}</td>
                          <td>
                            <div className="font-semibold text-slate-100">{item.nama_kecamatan}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.kode_kecamatan}</div>
                          </td>
                          <td>
                            <div className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                              {item.tahun_ajaran || '—'}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Total: {item.jumlah_ruang_kelas ?? 0}</div>
                            <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 500 }}>
                              <span className="badge-green rounded px-1.5 py-0.5">{item.ruang_kelas_baik ?? 0}</span>
                              <span className="badge-amber rounded px-1.5 py-0.5">{item.ruang_kelas_rusak_ringan ?? 0}</span>
                              <span className="badge-red rounded px-1.5 py-0.5">{item.ruang_kelas_rusak_berat ?? 0}</span>
                            </div>
                          </td>
                          <td className="tabular-nums font-medium" style={{ color: 'var(--accent-hover)' }}>
                            {totalFasilitas} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>item</span>
                          </td>
                          <td className="tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>{item.jumlah_rombongan_belajar ?? 0}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEdit(item)} className="btn-edit"><Pencil size={13}/> Edit</button>
                              <button onClick={() => handleDelete(item.id, item.nama_kecamatan)} className="btn-danger"><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB AGREGASI ── */}
      {tab === 'agregasi' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Tahun Ajaran:</label>
              <input type="text" value={tahunSync} onChange={e => setTahunSync(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, width: 120 }}
                placeholder="2024/2025" />
            </div>
            <button onClick={fetchAggregasi} disabled={aggLoading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={14} style={{ animation: aggLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
            <button onClick={handleSync} disabled={syncing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
              <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Menyinkronisasi...' : 'Sinkronkan ke Data Kecamatan'}
            </button>
          </div>

          <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, fontSize: 13, color: 'var(--accent-hover)' }}>
            💡 Data di bawah dihitung <strong>otomatis</strong> dari input <strong>Sarpras Sekolah</strong> oleh operator per kecamatan.
            Klik <strong>Sinkronkan ke Data Kecamatan</strong> untuk memperbarui tabel kecamatan utama yang dipakai dalam proses <strong>K-Means Clustering</strong>.
          </div>

          <div className="card overflow-hidden">
            {aggLoading ? (
              <div className="p-8 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="skeleton h-10 w-full"/>)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Kecamatan</th>
                      <th>Sekolah Melapor</th>
                      <th>R. Kelas Total</th>
                      <th>Kondisi (Baik/Ringan/Berat)</th>
                      <th>Lapangan</th>
                      <th>Perpus</th>
                      <th>UKS</th>
                      <th>Toilet</th>
                      <th>T.Ibadah</th>
                      <th>Rombel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggData.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        Belum ada data sarpras dari operator untuk tahun ajaran ini
                      </td></tr>
                    ) : aggData.map(row => (
                      <tr key={row.kecamatan_id}>
                        <td>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{row.nama_kecamatan}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.kode_kecamatan}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 700, color: row.sekolah_sudah_isi > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                            {row.sekolah_sudah_isi} / {row.jumlah_sekolah}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>sudah mengisi</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.jumlah_ruang_kelas}</td>
                        <td>
                          <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontWeight: 600 }}>
                            <span className="badge-green rounded px-1.5 py-0.5">{row.ruang_kelas_baik}</span>
                            <span className="badge-amber rounded px-1.5 py-0.5">{row.ruang_kelas_rusak_ringan}</span>
                            <span className="badge-red rounded px-1.5 py-0.5">{row.ruang_kelas_rusak_berat}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.fasilitas_lapangan_olahraga}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.fasilitas_perpustakaan}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.fasilitas_uks}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.fasilitas_toilet}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{row.fasilitas_tempat_ibadah}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-hover)' }}>{row.jumlah_rombongan_belajar}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>

    {/* Modal Form */}
    {showForm && (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <MapPin size={18} color="var(--accent-hover)" />
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{editingId ? 'Edit Kecamatan' : 'Tambah Kecamatan'}</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lengkapi data rincian kelas dan fasilitas</p>
              </div>
            </div>
            <button onClick={closeForm} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={18}/>
            </button>
          </div>

          <div className="modal-body space-y-6">
            <form id="kecamatan-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nama Kecamatan" field="nama_kecamatan" formData={formData} setFormData={setFormData} placeholder="Contoh: Bogor Utara" required />
                <FormField label="Kode Kecamatan" field="kode_kecamatan" formData={formData} setFormData={setFormData} placeholder="KEC-001" required />
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={closeForm} className="btn-secondary">Batal</button>
            <button type="submit" form="kecamatan-form" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kecamatan'}
            </button>
          </div>
        </div>
      </div>
    )}

    {toast && (
      <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
        {toast.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
        {toast.message}
      </div>
    )}
    </>
  );
}
