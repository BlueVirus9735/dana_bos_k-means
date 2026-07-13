'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  MapPin, Plus, X, Pencil, Trash2, Search,
  CheckCircle2, AlertCircle, Home, Layers, AlertTriangle, Users,
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

type ToastType = { message: string; type: 'success' | 'error' } | null;

const emptyForm = {
  nama_kecamatan: '',
  kode_kecamatan: '',
  ruang_kelas_baik: '',
  ruang_kelas_rusak_ringan: '',
  ruang_kelas_rusak_berat: '',
  jumlah_ruang_kelas: '',
  fasilitas_lapangan_olahraga: '',
  fasilitas_perpustakaan: '',
  fasilitas_uks: '',
  fasilitas_toilet: '',
  fasilitas_tempat_ibadah: '',
  jumlah_rombongan_belajar: '',
  latitude: '',
  longitude: '',
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<ToastType>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method  = editingId ? 'PUT' : 'POST';
      const url     = editingId ? `/kecamatan.php?id=${editingId}` : '/kecamatan.php';
      const body    = {
        ...(editingId ? { id: editingId } : {}),
        nama_kecamatan:          formData.nama_kecamatan,
        kode_kecamatan:          formData.kode_kecamatan,
        tahun_ajaran:            formData.tahun_ajaran,
        ruang_kelas_baik:        Number(formData.ruang_kelas_baik) || 0,
        ruang_kelas_rusak_ringan: Number(formData.ruang_kelas_rusak_ringan) || 0,
        ruang_kelas_rusak_berat:  Number(formData.ruang_kelas_rusak_berat) || 0,
        jumlah_ruang_kelas:      Number(formData.jumlah_ruang_kelas) || 0,
        fasilitas_lapangan_olahraga: Number(formData.fasilitas_lapangan_olahraga) || 0,
        fasilitas_perpustakaan:  Number(formData.fasilitas_perpustakaan) || 0,
        fasilitas_uks:           Number(formData.fasilitas_uks) || 0,
        fasilitas_toilet:        Number(formData.fasilitas_toilet) || 0,
        fasilitas_tempat_ibadah: Number(formData.fasilitas_tempat_ibadah) || 0,
        jumlah_rombongan_belajar: Number(formData.jumlah_rombongan_belajar) || 0,
        latitude:  formData.latitude !== '' ? formData.latitude : null,
        longitude: formData.longitude !== '' ? formData.longitude : null,
      };

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(body),
      }, router);

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
      nama_kecamatan:          item.nama_kecamatan,
      kode_kecamatan:          item.kode_kecamatan,
      tahun_ajaran:            item.tahun_ajaran || '2024/2025',
      ruang_kelas_baik:        item.ruang_kelas_baik?.toString() ?? '0',
      ruang_kelas_rusak_ringan: item.ruang_kelas_rusak_ringan?.toString() ?? '0',
      ruang_kelas_rusak_berat:  item.ruang_kelas_rusak_berat?.toString() ?? '0',
      jumlah_ruang_kelas:      item.jumlah_ruang_kelas?.toString() ?? '0',
      fasilitas_lapangan_olahraga: item.fasilitas_lapangan_olahraga?.toString() ?? '0',
      fasilitas_perpustakaan:  item.fasilitas_perpustakaan?.toString() ?? '0',
      fasilitas_uks:           item.fasilitas_uks?.toString() ?? '0',
      fasilitas_toilet:        item.fasilitas_toilet?.toString() ?? '0',
      fasilitas_tempat_ibadah: item.fasilitas_tempat_ibadah?.toString() ?? '0',
      jumlah_rombongan_belajar: item.jumlah_rombongan_belajar?.toString() ?? '0',
      latitude:  item.latitude?.toString() ?? '',
      longitude: item.longitude?.toString() ?? '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Yakin ingin menghapus kecamatan "${nama}"?`)) return;
    try {
      const res = await apiFetch(`/kecamatan.php?id=${id}`, {
        credentials: 'include', method: 'DELETE',
      });
      if (res.ok) { fetchKecamatan(); showToast('Kecamatan berhasil dihapus.', 'success'); }
    } catch { showToast('Gagal menghapus kecamatan.', 'error'); }
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setFormData(emptyForm); };

  const filtered = kecamatan.filter(k =>
    k.nama_kecamatan.toLowerCase().includes(search.toLowerCase()) ||
    k.kode_kecamatan.toLowerCase().includes(search.toLowerCase())
  );

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
          <p className="page-subtitle">Kelola data kecamatan beserta rincian fasilitas dan kelas</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormData(emptyForm); }}
          className="btn-primary"
        >
          <Plus size={18} /> Tambah Kecamatan
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau kode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
        <span className="text-sm text-slate-400 font-medium shrink-0">
          {filtered.length} dari {kecamatan.length} kecamatan
        </span>
      </div>

      {/* Table */}
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
                  <th title="Total Kelas & Kondisi"><Home size={13} className="inline mr-1"/>R. Kelas (Baik/Ringan/Berat)</th>
                  <th title="Total Fasilitas"><Layers size={13} className="inline mr-1"/>Fasilitas</th>
                  <th title="Rombongan Belajar"><Users size={13} className="inline mr-1"/>Rombel</th>
                  <th style={{ width: 140 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const totalFasilitas = item.fasilitas_lapangan_olahraga + item.fasilitas_perpustakaan + item.fasilitas_uks + item.fasilitas_toilet + item.fasilitas_tempat_ibadah;
                  return (
                    <tr key={item.id}>
                      <td className="text-slate-400 text-sm">{i + 1}</td>
                      <td>
                        <div className="font-semibold text-slate-100">{item.nama_kecamatan}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.kode_kecamatan}</div>
                      </td>
                      <td>
                        <div className="badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{item.tahun_ajaran || '—'}</div>
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
                
                {/* Info Dasar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Nama Kecamatan" field="nama_kecamatan" formData={formData} setFormData={setFormData} placeholder="Contoh: Bogor Utara" required />
                  <FormField label="Kode Kecamatan" field="kode_kecamatan" formData={formData} setFormData={setFormData} placeholder="KEC-001" required />
                  <FormField label="Tahun Ajaran" field="tahun_ajaran" formData={formData} setFormData={setFormData} placeholder="2024/2025" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Kondisi Ruang Kelas */}
                  <div style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Home size={14} /> Kondisi Ruang Kelas
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Total Ruang Kelas" field="jumlah_ruang_kelas" formData={formData} setFormData={setFormData} />
                      <FormField label="Kondisi Baik" field="ruang_kelas_baik" formData={formData} setFormData={setFormData} />
                      <FormField label="Rusak Ringan" field="ruang_kelas_rusak_ringan" formData={formData} setFormData={setFormData} />
                      <FormField label="Rusak Berat" field="ruang_kelas_rusak_berat" formData={formData} setFormData={setFormData} />
                    </div>
                  </div>

                  {/* Fasilitas */}
                  <div style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={14} /> Rincian Fasilitas
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField label="Lapangan Olahraga" field="fasilitas_lapangan_olahraga" formData={formData} setFormData={setFormData} />
                      <FormField label="Perpustakaan" field="fasilitas_perpustakaan" formData={formData} setFormData={setFormData} />
                      <FormField label="Ruang UKS" field="fasilitas_uks" formData={formData} setFormData={setFormData} />
                      <FormField label="Toilet" field="fasilitas_toilet" formData={formData} setFormData={setFormData} />
                      <FormField label="Tempat Ibadah" field="fasilitas_tempat_ibadah" formData={formData} setFormData={setFormData} />
                    </div>
                  </div>
                </div>

                {/* Info Tambahan */}
                <div style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                   <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> Lainnya
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField label="Rombongan Belajar" field="jumlah_rombongan_belajar" formData={formData} setFormData={setFormData} />
                      <FormField label="Latitude (opsional)" field="latitude" formData={formData} setFormData={setFormData} placeholder="-6.2088" />
                      <FormField label="Longitude (opsional)" field="longitude" formData={formData} setFormData={setFormData} placeholder="106.8456" />
                    </div>
                </div>

              </form>
            </div>

              <div className="modal-footer">
                <button type="button" onClick={closeForm} className="btn-secondary">Batal</button>
                <button type="submit" form="kecamatan-form" className="btn-primary" disabled={saving}>
                  {saving ? (
                    'Menyimpan...'
                  ) : (
                    editingId ? 'Simpan Perubahan' : 'Tambah Kecamatan'
                  )}
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
