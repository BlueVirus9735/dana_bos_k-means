'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import {
  Plus, Trash2, Pencil, Users, Eye, EyeOff,
  X, AlertCircle, CheckCircle2, MapPin, School,
  Copy, Check, RotateCcw, Search, ChevronLeft,
  ChevronRight, ShieldCheck
} from 'lucide-react';

interface Operator {
  id: number;
  username: string;
  nama: string;
  email: string;
  sekolah_id: number;
  nama_sekolah: string;
  nama_kecamatan: string;
  npsn?: string;
  jenjang?: string;
  is_active: number;
  created_at: string;
}

interface Sekolah {
  id: number;
  nama_sekolah: string;
  npsn: string;
  nama_kecamatan: string;
  jenjang: string;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

export default function OperatorPage() {
  const router = useRouter();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Operator | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    nama: '',
    email: '',
    sekolah_id: '',
    is_active: '1',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastType>(null);
  const [copiedUsername, setCopiedUsername] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | '1' | '0'>('all');
  const [filterKecamatan, setFilterKecamatan] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'admin') {
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
      const [oRes, sRes] = await Promise.all([
        apiFetch('/operator.php', {}, router),
        apiFetch('/sekolah.php', {}, router),
      ]);
      if (oRes.ok) {
        const oData = await oRes.json();
        setOperators(Array.isArray(oData) ? oData : []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setSekolahList(Array.isArray(sData) ? sData : []);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data operator.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (uname: string) => {
    navigator.clipboard.writeText(uname);
    setCopiedUsername(uname);
    setTimeout(() => setCopiedUsername(null), 2000);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ username: '', password: '', nama: '', email: '', sekolah_id: '', is_active: '1' });
    setError('');
    setShowPassword(false);
    setShowForm(true);
  };

  const openEdit = (op: Operator) => {
    setEditItem(op);
    setForm({
      username: op.username,
      password: '',
      nama: op.nama,
      email: op.email || '',
      sekolah_id: String(op.sekolah_id),
      is_active: String(op.is_active),
    });
    setError('');
    setShowPassword(false);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nama.trim() || !form.username.trim() || !form.sekolah_id) {
      setError('Mohon lengkapi field wajib (*)');
      return;
    }

    if (!editItem && (!form.password || form.password.length < 6)) {
      setError('Password wajib diisi minimal 6 karakter');
      return;
    }

    if (editItem && form.password && form.password.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    setSaving(true);
    try {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { id: editItem.id, ...form } : form;
      const res = await apiFetch('/operator.php', { method, body: JSON.stringify(body) }, router);
      const data = await res.json();

      if (res.ok) {
        setShowForm(false);
        await fetchData();
        showToast(editItem ? 'Akun operator berhasil diperbarui!' : 'Akun operator baru berhasil dibuat!', 'success');
      } else {
        setError(data.error ?? 'Gagal menyimpan data operator');
      }
    } catch {
      setError('Terjadi kendala jaringan saat menghubungi server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus akun operator "${nama}"?`)) return;
    try {
      const res = await apiFetch(`/operator.php?id=${id}`, { method: 'DELETE' }, router);
      if (res.ok) {
        await fetchData();
        showToast(`Operator "${nama}" berhasil dihapus.`, 'success');
      } else {
        showToast('Gagal menghapus akun operator.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    }
  };

  // Reset filters handler
  const handleResetFilters = () => {
    setSearch('');
    setFilterStatus('all');
    setFilterKecamatan('');
    setCurrentPage(1);
  };

  // ── Metrics Calculation ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = operators.length;
    const active = operators.filter((o) => o.is_active === 1).length;
    const inactive = total - active;
    const percentActive = total > 0 ? Math.round((active / total) * 100) : 0;

    const assignedSekolahCount = new Set(operators.map((o) => o.sekolah_id)).size;
    const totalSekolahCount = sekolahList.length;

    return {
      total,
      active,
      inactive,
      percentActive,
      assignedSekolahCount,
      totalSekolahCount,
    };
  }, [operators, sekolahList]);

  // ── Filtered Operators ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operators.filter((op) => {
      const matchSearch =
        !q ||
        (op.nama && op.nama.toLowerCase().includes(q)) ||
        (op.username && op.username.toLowerCase().includes(q)) ||
        (op.email && op.email.toLowerCase().includes(q)) ||
        (op.nama_sekolah && op.nama_sekolah.toLowerCase().includes(q)) ||
        (op.nama_kecamatan && op.nama_kecamatan.toLowerCase().includes(q));

      const matchStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === '1'
          ? op.is_active === 1
          : op.is_active === 0;

      const matchKecamatan = filterKecamatan ? op.nama_kecamatan === filterKecamatan : true;

      return matchSearch && matchStatus && matchKecamatan;
    });
  }, [operators, search, filterStatus, filterKecamatan]);

  // ── Pagination Calculation ───────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // Unique list of kecamatan with operator
  const uniqueKecamatanList = useMemo(() => {
    const set = new Set(operators.map((o) => o.nama_kecamatan).filter(Boolean));
    return Array.from(set).sort();
  }, [operators]);

  // Available sekolah for form
  const usedSekolahIds = useMemo(() => {
    return new Set(operators.filter((o) => !editItem || o.id !== editItem.id).map((o) => o.sekolah_id));
  }, [operators, editItem]);

  const availableSekolah = useMemo(() => {
    return sekolahList.filter((s) => !usedSekolahIds.has(s.id));
  }, [sekolahList, usedSekolahIds]);

  const hasActiveFilters = Boolean(search || filterStatus !== 'all' || filterKecamatan);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Memuat direktori operator...</span>
      </div>
    );
  }

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
                <ShieldCheck size={20} color="#2563eb" />
              </div>
              <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                Kelola Operator Sekolah
              </h1>
            </div>
            <p className="page-subtitle" style={{ marginLeft: 48, marginTop: 2 }}>
              Manajemen akun PIC operator penginput data sarpras dan BOS tingkat satuan pendidikan
            </p>
          </div>

          <button
            onClick={openCreate}
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
            <Plus size={16} /> Tambah Operator
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
          {/* Total Operator */}
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
              <Users size={22} color="#2563eb" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Operator
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.total.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Akun</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>PIC terdaftar di sistem</span>
            </div>
          </div>

          {/* Operator Aktif */}
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
              <CheckCircle2 size={22} color="#16a34a" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status Aktif
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.active.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                  ({metrics.percentActive}%)
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Dapat mengakses sistem</span>
            </div>
          </div>

          {/* Operator Nonaktif */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: metrics.inactive > 0 ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${metrics.inactive > 0 ? '#fecaca' : '#e2e8f0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={22} color={metrics.inactive > 0 ? '#dc2626' : '#94a3b8'} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Status Nonaktif
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.inactive.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Akun</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {metrics.inactive === 0 ? 'Semua akun berstatus aktif' : 'Akses diblokir sementara'}
              </span>
            </div>
          </div>

          {/* Cakupan Sekolah Terhubung */}
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
              <School size={22} color="#d97706" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sekolah Terhubung
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {metrics.assignedSekolahCount}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                  / {metrics.totalSekolahCount} Satuan
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Memiliki akun operator</span>
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
                placeholder="Cari nama, username, email, atau sekolah..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
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

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as 'all' | '1' | '0'); setCurrentPage(1); }}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: 140,
                height: 38,
                fontSize: 13,
                background: '#f8fafc',
              }}
            >
              <option value="all">Semua Status</option>
              <option value="1">Hanya Aktif</option>
              <option value="0">Hanya Nonaktif</option>
            </select>

            {/* Kecamatan Filter */}
            <select
              value={filterKecamatan}
              onChange={(e) => { setFilterKecamatan(e.target.value); setCurrentPage(1); }}
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
              {uniqueKecamatanList.map((kec) => (
                <option key={kec} value={kec}>
                  Kec. {kec}
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
            Menampilkan <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> dari {operators.length} operator
          </div>
        </div>

        {/* ── Table Card ─────────────────────────────────────────────────── */}
        <div className="card overflow-hidden" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
          {filtered.length === 0 ? (
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
                <Users size={28} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {hasActiveFilters ? 'Tidak ada operator yang cocok' : 'Belum ada akun operator'}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 360, margin: '0 auto 16px' }}>
                {hasActiveFilters
                  ? 'Coba ubah kata kunci pencarian atau sesuaikan filter status / kecamatan.'
                  : 'Klik tombol Tambah Operator di sudut kanan atas untuk membuat akun operator sekolah baru.'}
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
                    <th style={{ minWidth: 220, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Nama & Identitas
                    </th>
                    <th style={{ width: 160, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Username
                    </th>
                    <th style={{ minWidth: 220, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Satuan Pendidikan
                    </th>
                    <th style={{ width: 150, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Kecamatan
                    </th>
                    <th style={{ width: 120, padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Status
                    </th>
                    <th style={{ width: 120, textAlign: 'center', padding: '12px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((op, index) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const isActive = op.is_active === 1;
                    const isCopied = copiedUsername === op.username;
                    const initials = op.nama
                      ? op.nama.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                      : 'OP';

                    return (
                      <tr
                        key={op.id}
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

                        {/* Nama & Email */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#2563eb',
                                fontWeight: 700,
                                fontSize: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                                {op.nama}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                                {op.email || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Username */}
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
                              {op.username}
                            </span>
                            <button
                              type="button"
                              title="Salin Username"
                              onClick={() => copyToClipboard(op.username)}
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

                        {/* Satuan Pendidikan */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <School size={15} color="#2563eb" style={{ flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                                {op.nama_sekolah || '—'}
                              </div>
                              {op.npsn && (
                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                  NPSN: {op.npsn}
                                </span>
                              )}
                            </div>
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
                            {op.nama_kecamatan || '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 11.5,
                              fontWeight: 700,
                              letterSpacing: '0.02em',
                              padding: '3px 10px',
                              borderRadius: 20,
                              background: isActive ? '#f0fdf4' : '#f8fafc',
                              color: isActive ? '#15803d' : '#64748b',
                              border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: isActive ? '#16a34a' : '#94a3b8',
                              }}
                            />
                            {isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => openEdit(op)}
                              title="Edit Operator"
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
                              onClick={() => handleDelete(op.id, op.nama)}
                              title="Hapus Operator"
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
          {filtered.length > 0 && (
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

                {/* Page numbers */}
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

      {/* ── Modal Form Dialog ───────────────────────────────────────────── */}
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
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
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
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
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
                  <ShieldCheck size={20} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                    {editItem ? 'Edit Akun Operator' : 'Tambah Operator Baru'}
                  </h2>
                  <p style={{ fontSize: 12.5, color: '#64748b', margin: '2px 0 0' }}>
                    {editItem ? `Memperbarui kredensial untuk ${editItem.nama}` : 'Buat kredensial login PIC operator sekolah'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowForm(false)}
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

            {/* Error Banner */}
            {error && (
              <div
                style={{
                  margin: '16px 24px 0',
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#b91c1c',
                  fontSize: 12.5,
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Form Content */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 15, overflowY: 'auto' }}>
                {/* Nama Lengkap */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Nama Lengkap PIC <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nama}
                    onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                    className="form-input"
                    placeholder="Contoh: Budi Santoso, S.Pd"
                    required
                    autoFocus
                    style={{ fontSize: 13, height: 38 }}
                  />
                </div>

                {/* Username & Email Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Username Login <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                      className="form-input"
                      placeholder="user.sekolah"
                      required
                      style={{ fontSize: 13, height: 38 }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Email Kontak
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="form-input"
                      placeholder="operator@sekolah.sch.id"
                      style={{ fontSize: 13, height: 38 }}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Password{' '}
                    {editItem ? (
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}>(kosongkan jika tidak diubah)</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>*</span>
                    )}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="form-input"
                      placeholder={editItem ? '•••••••• (tetap)' : 'Minimal 6 karakter'}
                      required={!editItem}
                      style={{ fontSize: 13, height: 38, paddingRight: 38 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Tugaskan Sekolah */}
                <div>
                  <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Satuan Pendidikan / Sekolah Ditugaskan <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={form.sekolah_id}
                    onChange={(e) => setForm((p) => ({ ...p, sekolah_id: e.target.value }))}
                    className="form-input"
                    required
                    style={{ fontSize: 13, height: 38 }}
                  >
                    <option value="">-- Pilih Sekolah --</option>
                    {(editItem ? sekolahList : availableSekolah).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_sekolah} ({s.npsn || '—'}) — Kec. {s.nama_kecamatan}
                      </option>
                    ))}
                  </select>
                  {!editItem && availableSekolah.length === 0 && (
                    <p style={{ fontSize: 11.5, color: '#d97706', marginTop: 4 }}>
                      ⚠ Seluruh sekolah sudah memiliki akun operator.
                    </p>
                  )}
                </div>

                {/* Status Akun (Edit Only) */}
                {editItem && (
                  <div>
                    <label className="form-label" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                      Status Akun Operator
                    </label>
                    <select
                      value={form.is_active}
                      onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value }))}
                      className="form-input"
                      style={{ fontSize: 13, height: 38 }}
                    >
                      <option value="1">Aktif (Dapat Mengakses & Input Data)</option>
                      <option value="0">Nonaktif (Akses Diblokir Sementara)</option>
                    </select>
                  </div>
                )}
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
                  onClick={() => setShowForm(false)}
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
                    <>{editItem ? 'Simpan Perubahan' : 'Buat Operator'}</>
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
