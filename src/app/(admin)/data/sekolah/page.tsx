'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  School, Plus, X, Pencil, Trash2, Search,
  CheckCircle2, AlertCircle, MapPin, Building2,
  GraduationCap, ChevronLeft, ChevronRight, Copy,
  Check, RotateCcw
} from 'lucide-react';

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
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [toast, setToast] = useState<ToastType>(null);
  const [copiedNpsn, setCopiedNpsn] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    npsn: '',
    nama_sekolah: '',
    kecamatan_id: '',
    jenjang: 'SD',
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
    setLoading(true);
    try {
      const [sekolahRes, kecamatanRes] = await Promise.all([
        apiFetch('/sekolah.php', {}, router),
        apiFetch('/kecamatan.php', {}, router),
      ]);
      const sekolahData = await sekolahRes.json();
      const kecData = await kecamatanRes.json();
      setSekolah(Array.isArray(sekolahData) ? sekolahData : []);
      setKecamatan(Array.isArray(kecData) ? kecData : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Gagal memuat data sekolah.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (npsn: string) => {
    navigator.clipboard.writeText(npsn);
    setCopiedNpsn(npsn);
    setTimeout(() => setCopiedNpsn(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.npsn.trim() || !formData.nama_sekolah.trim() || !formData.kecamatan_id) {
      showToast('Mohon lengkapi seluruh field wajib (*)', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/sekolah.php?id=${editingId}` : '/sekolah.php';
      const method = editingId ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      }, router);

      if (response.ok) {
        closeForm();
        fetchData();
        showToast(editingId ? 'Data sekolah berhasil diperbarui!' : 'Sekolah baru berhasil ditambahkan!', 'success');
      } else {
        const errorData = await response.json().catch(() => null);
        showToast('Gagal menyimpan: ' + (errorData?.error || response.statusText), 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Terjadi kendala jaringan';
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
      jenjang: item.jenjang || 'SD',
      alamat: item.alamat || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data sekolah "${nama}"?`)) return;
    try {
      const res = await apiFetch(`/sekolah.php?id=${id}`, { method: 'DELETE' }, router);
      if (res.ok) {
        fetchData();
        showToast(`Sekolah "${nama}" berhasil dihapus.`, 'success');
      } else {
        showToast('Gagal menghapus sekolah.', 'error');
      }
    } catch (error) {
      console.error('Error deleting sekolah:', error);
      showToast('Terjadi kesalahan jaringan saat menghapus.', 'error');
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ npsn: '', nama_sekolah: '', kecamatan_id: '', jenjang: 'SD', alamat: '' });
  };

  // Reset page whenever search or filters change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleJenjangChange = (val: string) => {
    setFilterJenjang(val);
    setCurrentPage(1);
  };

  const handleKecamatanChange = (val: string) => {
    setFilterKecamatan(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterJenjang('');
    setFilterKecamatan('');
    setCurrentPage(1);
  };

  // ── Metrics Calculation ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = sekolah.length;
    const totalSD = sekolah.filter(s => s.jenjang === 'SD').length;
    const totalSMP = sekolah.filter(s => s.jenjang === 'SMP').length;
    const percentSD = total > 0 ? Math.round((totalSD / total) * 100) : 0;
    const percentSMP = total > 0 ? Math.round((totalSMP / total) * 100) : 0;

    const uniqueKec = new Set(sekolah.map(s => s.nama_kecamatan).filter(Boolean));
    const totalKecamatanCovered = uniqueKec.size;

    return { total, totalSD, totalSMP, percentSD, percentSMP, totalKecamatanCovered };
  }, [sekolah]);

  // ── Filtered Data ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sekolah.filter((s) => {
      const matchSearch =
        !q ||
        (s.nama_sekolah && s.nama_sekolah.toLowerCase().includes(q)) ||
        (s.npsn && s.npsn.toLowerCase().includes(q)) ||
        (s.nama_kecamatan && s.nama_kecamatan.toLowerCase().includes(q)) ||
        (s.alamat && s.alamat.toLowerCase().includes(q));

      const matchJenjang = filterJenjang ? s.jenjang === filterJenjang : true;
      const matchKecamatan = filterKecamatan ? s.nama_kecamatan === filterKecamatan : true;

      return matchSearch && matchJenjang && matchKecamatan;
    });
  }, [sekolah, search, filterJenjang, filterKecamatan]);

  // ── Pagination Calculation ───────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const hasActiveFilters = Boolean(search || filterJenjang || filterKecamatan);

  return (
    <>
      <div className="space-y-6 animate-in">
        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <School size={20} color="#2563eb" />
              </div>
              <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                Data Sekolah
              </h1>
            </div>
            <p className="page-subtitle" style={{ marginLeft: 48, marginTop: 2 }}>
              Kelola master direktori sekolah dasar (SD) & sekolah menengah (SMP)
            </p>
          </div>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ npsn: '', nama_sekolah: '', kecamatan_id: '', jenjang: 'SD', alamat: '' });
              setShowForm(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 9,
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              boxShadow: '0 1px 2px 0 rgba(37,99,235,0.25)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#2563eb'; }}
          >
            <Plus size={16} /> Tambah Sekolah
          </button>
        </div>

        {/* ── Executive Metric Strip ─────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
            gap: 16,
          }}
        >
          {/* Total Sekolah */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <School size={22} color="#2563eb" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Sekolah
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.total.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Unit</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>SD & SMP terdata</span>
            </div>
          </div>

          {/* Jenjang SD */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={22} color="#16a34a" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sekolah Dasar (SD)
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.totalSD.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                  ({metrics.percentSD}%)
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Tingkat dasar</span>
            </div>
          </div>

          {/* Jenjang SMP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={22} color="#4f46e5" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sekolah Menengah (SMP)
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.totalSMP.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>
                  ({metrics.percentSMP}%)
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Tingkat pertama</span>
            </div>
          </div>

          {/* Sebaran Wilayah */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MapPin size={22} color="#d97706" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sebaran Wilayah
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.totalKecamatanCovered}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Kecamatan</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Cakupan wilayah</span>
            </div>
          </div>
        </div>

        {/* ── Filter & Search Bar ─────────────────────────────────────────── */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px', maxWidth: 380 }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Cari nama, NPSN, kecamatan, alamat..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="form-input"
                style={{
                  paddingLeft: 36,
                  paddingRight: search ? 32 : 12,
                  height: 38,
                  fontSize: 13,
                  background: '#f8fafc',
                }}
              />
              {search && (
                <button
                  onClick={() => handleSearchChange('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Jenjang Filter */}
            <select
              value={filterJenjang}
              onChange={(e) => handleJenjangChange(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: 140,
                height: 38,
                fontSize: 13,
                background: '#f8fafc',
              }}
            >
              <option value="">Semua Jenjang</option>
              <option value="SD">Jenjang SD</option>
              <option value="SMP">Jenjang SMP</option>
            </select>

            {/* Kecamatan Filter */}
            <select
              value={filterKecamatan}
              onChange={(e) => handleKecamatanChange(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: 160,
                height: 38,
                fontSize: 13,
                background: '#f8fafc',
              }}
            >
              <option value="">Semua Kecamatan</option>
              {kecamatan.map((k) => (
                <option key={k.id} value={k.nama_kecamatan}>
                  Kec. {k.nama_kecamatan}
                </option>
              ))}
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 12px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              >
                <RotateCcw size={13} /> Reset Filter
              </button>
            )}
          </div>

          {/* Records Counter */}
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Menampilkan <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> dari {sekolah.length} sekolah
          </div>
        </div>

        {/* ── Data Table Card ────────────────────────────────────────────── */}
        <div className="card overflow-hidden" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-10 w-full" style={{ borderRadius: 8 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <School size={28} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {hasActiveFilters ? 'Tidak ada sekolah yang cocok' : 'Belum ada data sekolah'}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto 16px' }}>
                {hasActiveFilters
                  ? 'Coba ubah kata kunci pencarian atau bersihkan filter yang sedang aktif.'
                  : 'Silakan tambahkan data sekolah baru menggunakan tombol Tambah Sekolah.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="btn-secondary"
                  style={{ fontSize: 13 }}
                >
                  <RotateCcw size={14} /> Bersihkan Filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 52, textAlign: 'center', padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      No
                    </th>
                    <th style={{ width: 140, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      NPSN
                    </th>
                    <th style={{ minWidth: 220, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Nama Sekolah
                    </th>
                    <th style={{ width: 160, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Kecamatan
                    </th>
                    <th style={{ width: 110, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Jenjang
                    </th>
                    <th style={{ minWidth: 200, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Alamat
                    </th>
                    <th style={{ width: 120, textAlign: 'center', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const isSD = item.jenjang === 'SD';
                    const isCopied = copiedNpsn === item.npsn;

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                      >
                        {/* No */}
                        <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '2px 8px',
                              borderRadius: 6,
                            }}
                          >
                            {rowNumber}
                          </span>
                        </td>

                        {/* NPSN */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 12.5,
                                fontWeight: 700,
                                color: '#1e293b',
                                background: '#f8fafc',
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: '1px solid #e2e8f0',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {item.npsn}
                            </span>
                            <button
                              type="button"
                              title="Salin NPSN"
                              onClick={() => copyToClipboard(item.npsn)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 4,
                                color: isCopied ? '#16a34a' : '#94a3b8',
                                display: 'inline-flex',
                                alignItems: 'center',
                                transition: 'color 0.15s ease',
                              }}
                            >
                              {isCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>

                        {/* Nama Sekolah */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                background: isSD ? '#eff6ff' : '#eef2ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isSD ? (
                                <GraduationCap size={14} color="#2563eb" />
                              ) : (
                                <Building2 size={14} color="#4f46e5" />
                              )}
                            </span>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                              {item.nama_sekolah}
                            </span>
                          </div>
                        </td>

                        {/* Kecamatan */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#334155',
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              padding: '3px 9px',
                              borderRadius: 6,
                            }}
                          >
                            <MapPin size={12} color="#64748b" />
                            {item.nama_kecamatan || '—'}
                          </span>
                        </td>

                        {/* Jenjang */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: 11.5,
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                              padding: '2.5px 9px',
                              borderRadius: 12,
                              background: isSD ? '#eff6ff' : '#eef2ff',
                              color: isSD ? '#1d4ed8' : '#4338ca',
                              border: `1px solid ${isSD ? '#bfdbfe' : '#c7d2fe'}`,
                            }}
                          >
                            {item.jenjang || 'SD'}
                          </span>
                        </td>

                        {/* Alamat */}
                        <td style={{ padding: '14px 16px', maxWidth: 260 }}>
                          <span
                            title={item.alamat || ''}
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: 12.5,
                              color: item.alamat ? '#475569' : '#94a3b8',
                            }}
                          >
                            {item.alamat || '—'}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleEdit(item)}
                              title="Edit Sekolah"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 9px',
                                borderRadius: 6,
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.nama_sekolah)}
                              title="Hapus Sekolah"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '5px 8px',
                                borderRadius: 6,
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                fontSize: 12,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Table Pagination Bar ──────────────────────────────────────── */}
          {!loading && filtered.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                padding: '12px 18px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
                <span>Baris per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 12.5,
                    color: '#0f172a',
                    fontWeight: 500,
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>
                  Halaman <strong style={{ color: '#0f172a' }}>{currentPage}</strong> dari {totalPages}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>

                {/* Page number indicators */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {showEllipsis && <span style={{ color: '#94a3b8', padding: '0 4px' }}>...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            style={{
                              minWidth: 32,
                              height: 32,
                              borderRadius: 6,
                              fontSize: 12.5,
                              fontWeight: 600,
                              border: p === currentPage ? '1px solid #2563eb' : '1px solid #cbd5e1',
                              background: p === currentPage ? '#2563eb' : '#ffffff',
                              color: p === currentPage ? '#ffffff' : '#334155',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 7,
                    border: '1px solid #cbd5e1',
                    background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                    color: currentPage === totalPages ? '#94a3b8' : '#334155',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Selanjutnya <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Dialog Tambah / Edit ──────────────────────────────────── */}
      {showForm && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && closeForm()}
        >
          <div
            className="modal-box"
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <School size={20} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    {editingId ? 'Edit Data Sekolah' : 'Tambah Sekolah Baru'}
                  </h2>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0' }}>
                    {editingId ? 'Perbarui informasi sekolah terpilih' : 'Lengkapi informasi master sekolah baru'}
                  </p>
                </div>
              </div>

              <button
                onClick={closeForm}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 6,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* NPSN & Jenjang Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      NPSN <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.npsn}
                      onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: 20214820"
                      required
                      autoFocus
                      style={{ fontSize: 13, height: 38 }}
                    />
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                      8 digit nomor pokok
                    </span>
                  </div>

                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Jenjang <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={formData.jenjang}
                      onChange={(e) => setFormData({ ...formData, jenjang: e.target.value })}
                      className="form-input"
                      required
                      style={{ fontSize: 13, height: 38 }}
                    >
                      <option value="SD">Sekolah Dasar (SD)</option>
                      <option value="SMP">Sekolah Menengah (SMP)</option>
                    </select>
                  </div>
                </div>

                {/* Nama Sekolah */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Nama Sekolah <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nama_sekolah}
                    onChange={(e) => setFormData({ ...formData, nama_sekolah: e.target.value })}
                    className="form-input"
                    placeholder="Contoh: SDN 1 Sumber"
                    required
                    style={{ fontSize: 13, height: 38 }}
                  />
                </div>

                {/* Kecamatan */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Kecamatan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={formData.kecamatan_id}
                    onChange={(e) => setFormData({ ...formData, kecamatan_id: e.target.value })}
                    className="form-input"
                    required
                    style={{ fontSize: 13, height: 38 }}
                  >
                    <option value="">-- Pilih Kecamatan Wilayah --</option>
                    {kecamatan.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama_kecamatan}
                      </option>
                    ))}
                  </select>
                  {kecamatan.length === 0 && (
                    <p style={{ fontSize: 11.5, color: '#d97706', marginTop: 4 }}>
                      ⚠ Data kecamatan kosong. Tambahkan data kecamatan terlebih dahulu.
                    </p>
                  )}
                </div>

                {/* Alamat */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Alamat Lengkap
                  </label>
                  <textarea
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="form-input"
                    rows={3}
                    placeholder="Jl. Raya Desa No. ..., Kelurahan/Desa..."
                    style={{ fontSize: 13, resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                  padding: '16px 24px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-secondary"
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    borderRadius: 8,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontWeight: 600,
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 20px',
                    borderRadius: 8,
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(37,99,235,0.25)',
                    opacity: saving ? 0.75 : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#ffffff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
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

      {/* ── Toast Notification ──────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 10,
            background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: toast.type === 'success' ? '#15803d' : '#b91c1c',
            boxShadow: '0 10px 15px -3px rgba(15,23,42,0.1)',
            fontSize: 13,
            fontWeight: 600,
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
