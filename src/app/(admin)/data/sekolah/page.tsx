'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, Plus, X, Pencil, Trash2, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface Sekolah {
  id: number;
  npsn: string;
  nama_sekolah: string;
  nama_kecamatan: string;
  jenjang: string;
  alamat: string;
}

interface Kecamatan {
  id: number;
  nama_kecamatan: string;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

export default function SekolahPage() {
  const router = useRouter();
  const [sekolah, setSekolah] = useState<Sekolah[]>([]);
  const [kecamatan, setKecamatan] = useState<Kecamatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [toast, setToast] = useState<ToastType>(null);
  const [formData, setFormData] = useState({
    npsn: '',
    nama_sekolah: '',
    kecamatan_id: '',
    jenjang: '',
    alamat: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  const fetchData = async () => {
    try {
      const [sekolahRes, kecamatanRes] = await Promise.all([
        fetch('http://localhost:8000/sekolah.php', { credentials: 'include' }),
        fetch('http://localhost:8000/kecamatan.php', { credentials: 'include' }),
      ]);
      const sekolahData = await sekolahRes.json();
      const kecData = await kecamatanRes.json();
      setSekolah(Array.isArray(sekolahData) ? sekolahData : []);
      setKecamatan(Array.isArray(kecData) ? kecData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId
        ? `http://localhost:8000/sekolah.php?id=${editingId}`
        : 'http://localhost:8000/sekolah.php';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      });

      if (response.ok) {
        closeForm();
        fetchData();
        showToast(editingId ? 'Sekolah berhasil diperbarui!' : 'Sekolah berhasil ditambahkan!', 'success');
      } else {
        const errorData = await response.json().catch(() => null);
        showToast('Gagal menyimpan: ' + (errorData?.error || response.statusText), 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Terjadi kesalahan jaringan';
      showToast('Error: ' + message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Sekolah) => {
    const kec = kecamatan.find((k) => k.nama_kecamatan === item.nama_kecamatan);
    setFormData({
      npsn: item.npsn,
      nama_sekolah: item.nama_sekolah,
      kecamatan_id: kec?.id.toString() || '',
      jenjang: item.jenjang,
      alamat: item.alamat,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Yakin ingin menghapus sekolah "${nama}"?`)) return;
    try {
      const response = await fetch(`http://localhost:8000/sekolah.php?id=${id}`, {
        credentials: 'include',
        method: 'DELETE',
      });
      if (response.ok) {
        fetchData();
        showToast('Sekolah berhasil dihapus.', 'success');
      }
    } catch (error) {
      console.error('Error deleting sekolah:', error);
      showToast('Gagal menghapus sekolah.', 'error');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ npsn: '', nama_sekolah: '', kecamatan_id: '', jenjang: '', alamat: '' });
  };

  const filtered = sekolah.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.nama_sekolah.toLowerCase().includes(q) ||
      s.npsn.toLowerCase().includes(q) ||
      s.nama_kecamatan.toLowerCase().includes(q);
    const matchJenjang = filterJenjang ? s.jenjang === filterJenjang : true;
    return matchSearch && matchJenjang;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center text-emerald-400">
              <School size={20} />
            </span>
            Data Sekolah
          </h1>
          <p className="page-subtitle mt-1">Kelola data sekolah di seluruh kecamatan</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ npsn: '', nama_sekolah: '', kecamatan_id: '', jenjang: '', alamat: '' }); }}
          className="btn-primary"
        >
          <Plus size={18} />
          Tambah Sekolah
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NPSN, atau kecamatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9"
            />
          </div>
          <select
            value={filterJenjang}
            onChange={(e) => setFilterJenjang(e.target.value)}
            className="form-input w-auto"
          >
            <option value="">Semua Jenjang</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
          </select>
        </div>
        <span className="text-sm text-slate-400 font-medium shrink-0">
          {filtered.length} dari {sekolah.length} sekolah
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <School size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 font-medium">
              {search || filterJenjang ? 'Tidak ada hasil pencarian' : 'Belum ada data sekolah'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th>NPSN</th>
                  <th>Nama Sekolah</th>
                  <th>Kecamatan</th>
                  <th>Jenjang</th>
                  <th>Alamat</th>
                  <th style={{ width: 140 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr key={item.id}>
                    <td className="text-slate-400 font-medium text-sm">{index + 1}</td>
                    <td>
                      <span className="font-mono text-sm text-slate-200">{item.npsn}</span>
                    </td>
                    <td>
                      <span className="font-semibold text-slate-100">{item.nama_sekolah}</span>
                    </td>
                    <td>
                      <span className="badge bg-violet-500/10 text-purple-700">{item.nama_kecamatan}</span>
                    </td>
                    <td>
                      <span className={`badge ${item.jenjang === 'SD' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-50 text-orange-700'}`}>
                        {item.jenjang}
                      </span>
                    </td>
                    <td className="text-slate-300 text-sm max-w-[200px]">
                      <span className="truncate block">{item.alamat || <span className="text-slate-400">—</span>}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(item)} className="btn-edit">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => handleDelete(item.id, item.nama_sekolah)} className="btn-danger">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center text-emerald-400">
                  <School size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    {editingId ? 'Edit Sekolah' : 'Tambah Sekolah'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editingId ? 'Perbarui informasi sekolah' : 'Isi data sekolah baru'}
                  </p>
                </div>
              </div>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">NPSN <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.npsn}
                      onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                      className="form-input"
                      placeholder="12345678"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="form-label">Jenjang <span className="text-red-500">*</span></label>
                    <select
                      value={formData.jenjang}
                      onChange={(e) => setFormData({ ...formData, jenjang: e.target.value })}
                      className="form-input"
                      required
                    >
                      <option value="">Pilih Jenjang</option>
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Nama Sekolah <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.nama_sekolah}
                    onChange={(e) => setFormData({ ...formData, nama_sekolah: e.target.value })}
                    className="form-input"
                    placeholder="Contoh: SDN Cimanggu 1"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Kecamatan <span className="text-red-500">*</span></label>
                  <select
                    value={formData.kecamatan_id}
                    onChange={(e) => setFormData({ ...formData, kecamatan_id: e.target.value })}
                    className="form-input"
                    required
                  >
                    <option value="">Pilih Kecamatan</option>
                    {kecamatan.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kecamatan}
                      </option>
                    ))}
                  </select>
                  {kecamatan.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠ Tidak ada kecamatan. Tambahkan kecamatan terlebih dahulu.</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Alamat</label>
                  <textarea
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="form-input"
                    rows={3}
                    placeholder="Jl. Contoh No. 1, Kelurahan..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeForm} className="btn-secondary">
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>{editingId ? 'Simpan Perubahan' : 'Tambah Sekolah'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
