'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  MapPin, Plus, X, Pencil, Trash2, Search,
  CheckCircle2, AlertCircle, RefreshCw, BarChart2,
  Info, Eye, Building, Home, Users, ChevronLeft, ChevronRight
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
type DetailModalType = 'kelas' | 'fasilitas';

const num = (v: any): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const sanitizeKecamatan = (raw: any[]): Kecamatan[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(k => ({
    id: num(k.id),
    nama_kecamatan: String(k.nama_kecamatan || ''),
    kode_kecamatan: String(k.kode_kecamatan || ''),
    tahun_ajaran: String(k.tahun_ajaran || ''),
    ruang_kelas_baik: num(k.ruang_kelas_baik),
    ruang_kelas_rusak_ringan: num(k.ruang_kelas_rusak_ringan),
    ruang_kelas_rusak_berat: num(k.ruang_kelas_rusak_berat),
    jumlah_ruang_kelas: num(k.jumlah_ruang_kelas),
    fasilitas_lapangan_olahraga: num(k.fasilitas_lapangan_olahraga),
    fasilitas_perpustakaan: num(k.fasilitas_perpustakaan),
    fasilitas_uks: num(k.fasilitas_uks),
    fasilitas_toilet: num(k.fasilitas_toilet),
    fasilitas_tempat_ibadah: num(k.fasilitas_tempat_ibadah),
    jumlah_rombongan_belajar: num(k.jumlah_rombongan_belajar),
    latitude: k.latitude != null ? num(k.latitude) : null,
    longitude: k.longitude != null ? num(k.longitude) : null,
  }));
};

const sanitizeAgg = (raw: any[]): AggRow[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(r => ({
    kecamatan_id: num(r.kecamatan_id),
    nama_kecamatan: String(r.nama_kecamatan || ''),
    kode_kecamatan: String(r.kode_kecamatan || ''),
    jumlah_sekolah: num(r.jumlah_sekolah),
    sekolah_sudah_isi: num(r.sekolah_sudah_isi),
    jumlah_ruang_kelas: num(r.jumlah_ruang_kelas),
    ruang_kelas_baik: num(r.ruang_kelas_baik),
    ruang_kelas_rusak_ringan: num(r.ruang_kelas_rusak_ringan),
    ruang_kelas_rusak_berat: num(r.ruang_kelas_rusak_berat),
    fasilitas_lapangan_olahraga: num(r.fasilitas_lapangan_olahraga),
    fasilitas_perpustakaan: num(r.fasilitas_perpustakaan),
    fasilitas_uks: num(r.fasilitas_uks),
    fasilitas_toilet: num(r.fasilitas_toilet),
    fasilitas_tempat_ibadah: num(r.fasilitas_tempat_ibadah),
    jumlah_rombongan_belajar: num(r.jumlah_rombongan_belajar),
  }));
};

const initialFormData = {
  nama_kecamatan: '',
  kode_kecamatan: '',
  tahun_ajaran: '2024/2025',
  ruang_kelas_baik: 0,
  ruang_kelas_rusak_ringan: 0,
  ruang_kelas_rusak_berat: 0,
  jumlah_ruang_kelas: 0,
  fasilitas_lapangan_olahraga: 0,
  fasilitas_perpustakaan: 0,
  fasilitas_uks: 0,
  fasilitas_toilet: 0,
  fasilitas_tempat_ibadah: 0,
  jumlah_rombongan_belajar: 0,
};

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
  const [filterYear, setFilterYear] = useState('all');
  const [toast, setToast] = useState<ToastType>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [tab, setTab] = useState<ViewTab>('master');
  const [tahunList, setTahunList] = useState<string[]>([]);
  const [tahunSync, setTahunSync] = useState('2024/2025');

  // Pagination
  const [masterPage, setMasterPage] = useState(1);
  const [aggPage, setAggPage] = useState(1);
  const PER_PAGE = 10;

  // Detail Modal State
  const [detailItem, setDetailItem] = useState<Kecamatan | null>(null);
  const [detailTab, setDetailTab] = useState<DetailModalType>('kelas');

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) { router.push('/login'); return; }
    fetchInitialData();
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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [kecRes, yearsRes] = await Promise.all([
        apiFetch('/kecamatan.php', {}, router),
        apiFetch('/kecamatan.php?years=1', {}, router),
      ]);
      const data = await kecRes.json();
      setKecamatan(sanitizeKecamatan(data));

      const years = await yearsRes.json();
      if (Array.isArray(years) && years.length > 0) {
        setTahunList(years);
        setTahunSync(years[0]);
        setFormData(p => ({ ...p, tahun_ajaran: years[0] }));
      }
    } catch (e) {
      console.error(e);
      setKecamatan([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchKecamatan = async () => {
    try {
      const res = await apiFetch('/kecamatan.php', {}, router);
      const data = await res.json();
      setKecamatan(sanitizeKecamatan(data));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAggregasi = async () => {
    setAggLoading(true);
    try {
      const res = await apiFetch(`/kecamatan.php?aggregate=1&tahun_ajaran=${encodeURIComponent(tahunSync)}`, {}, router);
      const data = await res.json();
      setAggData(sanitizeAgg(data));
    } catch (e) { console.error(e); }
    finally { setAggLoading(false); }
  };

  const handleSync = async () => {
    if (!confirm(`Sinkronisasikan data agregasi sarpras sekolah untuk Tahun Ajaran ${tahunSync} ke data master kecamatan?\nData kecamatan akan diperbarui otomatis untuk analisis K-Means.`)) return;
    setSyncing(true);
    try {
      const res = await apiFetch('/kecamatan.php?sync=1', {
        method: 'PUT',
        body: JSON.stringify({ tahun_ajaran: tahunSync }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Sinkronisasi berhasil!', 'success');
        await fetchKecamatan();
        await fetchAggregasi();
      } else {
        showToast(data.error || 'Gagal sinkronisasi data', 'error');
      }
    } catch { showToast('Terjadi kendala saat sinkronisasi', 'error'); }
    finally { setSyncing(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kecamatan.trim()) {
      showToast('Nama kecamatan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/kecamatan.php?id=${editingId}` : '/kecamatan.php';
      const body = {
        ...(editingId ? { id: editingId } : {}),
        ...formData,
      };

      const res = await apiFetch(url, { method, body: JSON.stringify(body) }, router);
      if (res.ok) {
        closeForm();
        fetchKecamatan();
        showToast(editingId ? 'Data kecamatan berhasil diperbarui' : 'Kecamatan baru berhasil ditambahkan', 'success');
      } else {
        const err = await res.json().catch(() => null);
        showToast('Gagal menyimpan: ' + (err?.error || res.statusText), 'error');
      }
    } catch {
      showToast('Terjadi kendala jaringan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Kecamatan) => {
    setFormData({
      nama_kecamatan: item.nama_kecamatan,
      kode_kecamatan: item.kode_kecamatan,
      tahun_ajaran: item.tahun_ajaran || '2024/2025',
      ruang_kelas_baik: num(item.ruang_kelas_baik),
      ruang_kelas_rusak_ringan: num(item.ruang_kelas_rusak_ringan),
      ruang_kelas_rusak_berat: num(item.ruang_kelas_rusak_berat),
      jumlah_ruang_kelas: num(item.jumlah_ruang_kelas),
      fasilitas_lapangan_olahraga: num(item.fasilitas_lapangan_olahraga),
      fasilitas_perpustakaan: num(item.fasilitas_perpustakaan),
      fasilitas_uks: num(item.fasilitas_uks),
      fasilitas_toilet: num(item.fasilitas_toilet),
      fasilitas_tempat_ibadah: num(item.fasilitas_tempat_ibadah),
      jumlah_rombongan_belajar: num(item.jumlah_rombongan_belajar),
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus data kecamatan "${nama}"?`)) return;
    try {
      const res = await apiFetch(`/kecamatan.php?id=${id}`, { method: 'DELETE' }, router);
      if (res.ok) { fetchKecamatan(); showToast('Kecamatan berhasil dihapus.', 'success'); }
      else showToast('Gagal menghapus kecamatan', 'error');
    } catch { showToast('Gagal menghapus kecamatan.', 'error'); }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({
      ...initialFormData,
      tahun_ajaran: tahunSync || '2024/2025',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const openDetail = (item: Kecamatan, tabType: DetailModalType) => {
    setDetailItem(item);
    setDetailTab(tabType);
  };

  // ── Metrics Calculation (Safe Numeric Reduce) ───────────────────────────
  const metrics = useMemo(() => {
    const totalKec = kecamatan.length;
    const totalKelas = kecamatan.reduce((acc, k) => acc + num(k.jumlah_ruang_kelas), 0);
    const kelasBaik = kecamatan.reduce((acc, k) => acc + num(k.ruang_kelas_baik), 0);
    const kelasRR = kecamatan.reduce((acc, k) => acc + num(k.ruang_kelas_rusak_ringan), 0);
    const kelasRB = kecamatan.reduce((acc, k) => acc + num(k.ruang_kelas_rusak_berat), 0);
    const totalFasilitas = kecamatan.reduce((acc, k) =>
      acc + num(k.fasilitas_lapangan_olahraga) + num(k.fasilitas_perpustakaan) +
      num(k.fasilitas_uks) + num(k.fasilitas_toilet) + num(k.fasilitas_tempat_ibadah), 0);
    const totalRombel = kecamatan.reduce((acc, k) => acc + num(k.jumlah_rombongan_belajar), 0);
    const persenBaik = totalKelas > 0 ? Math.round((kelasBaik / totalKelas) * 100) : 0;

    return { totalKec, totalKelas, kelasBaik, kelasRR, kelasRB, totalFasilitas, totalRombel, persenBaik };
  }, [kecamatan]);

  // ── Filtered Data ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return kecamatan.filter(k => {
      const matchSearch =
        k.nama_kecamatan.toLowerCase().includes(search.toLowerCase()) ||
        k.kode_kecamatan.toLowerCase().includes(search.toLowerCase());
      const matchYear = filterYear === 'all' || k.tahun_ajaran === filterYear;
      return matchSearch && matchYear;
    });
  }, [kecamatan, search, filterYear]);

  // ── Aggregation Totals ───────────────────────────────────────────────────
  const aggSummary = useMemo(() => {
    const totalSekolah = aggData.reduce((acc, r) => acc + num(r.jumlah_sekolah), 0);
    const totalIsi = aggData.reduce((acc, r) => acc + num(r.sekolah_sudah_isi), 0);
    const persen = totalSekolah > 0 ? Math.round((totalIsi / totalSekolah) * 100) : 0;
    return { totalSekolah, totalIsi, persen };
  }, [aggData]);

  // Reset halaman saat filter atau tab berubah
  useEffect(() => { setMasterPage(1); }, [search, filterYear]);
  useEffect(() => { setAggPage(1); }, [aggData]);

  // Paginated slices
  const masterTotalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pagedFiltered = filtered.slice((masterPage - 1) * PER_PAGE, masterPage * PER_PAGE);
  const aggTotalPages = Math.max(1, Math.ceil(aggData.length / PER_PAGE));
  const pagedAgg = aggData.slice((aggPage - 1) * PER_PAGE, aggPage * PER_PAGE);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 12 }}>
        <div style={{ width: 24, height: 24, border: '2.5px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Memuat data kecamatan...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em', margin: 0 }}>
            Data Kecamatan & Sarpras
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 0 }}>
            Kelola master data wilayah dan pantau rekapitulasi sarana prasarana sekolah
          </p>
        </div>

        <button
          onClick={openCreate}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 9,
            background: '#2563eb', color: '#ffffff',
            fontSize: 13, fontWeight: 600, border: 'none',
            boxShadow: '0 1px 2px 0 rgba(37,99,235,0.25)',
            cursor: 'pointer', transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; }}
        >
          <Plus size={16} /> Tambah Kecamatan
        </button>
      </div>

      {/* ── Compact Executive Metric Strip ───────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 20px',
          boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
          gap: 16,
        }}
      >
        {/* Metric 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Wilayah
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
            {metrics.totalKec} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Kecamatan</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Basis observasi K-Means</span>
        </div>

        {/* Metric 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Ruang Kelas
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
            {metrics.totalKelas.toLocaleString('id-ID')} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Ruang</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, display: 'flex', gap: 6 }}>
            <span style={{ color: '#15803d' }}>{metrics.kelasBaik.toLocaleString('id-ID')} Baik ({metrics.persenBaik}%)</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#dc2626' }}>{metrics.kelasRR + metrics.kelasRB} Rusak</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Fasilitas Sarpras
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
            {metrics.totalFasilitas.toLocaleString('id-ID')} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Unit Sarana</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Perpus, Lapangan, Toilet, UKS, Ibadah</span>
        </div>

        {/* Metric 4 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rombongan Belajar
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
            {metrics.totalRombel.toLocaleString('id-ID')} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Rombel</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>Kelompok belajar aktif</span>
        </div>
      </div>

      {/* ── Segmented Switcher & Search Bar ───────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        
        {/* Mode Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 4, borderRadius: 10, border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setTab('master')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              fontSize: 12.5, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: tab === 'master' ? '#ffffff' : 'transparent',
              color: tab === 'master' ? '#0f172a' : '#64748b',
              boxShadow: tab === 'master' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <MapPin size={14} color={tab === 'master' ? '#2563eb' : '#64748b'} />
            Data Master Wilayah
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: tab === 'master' ? '#eff6ff' : '#e2e8f0', color: tab === 'master' ? '#2563eb' : '#64748b' }}>
              {kecamatan.length}
            </span>
          </button>

          <button
            onClick={() => setTab('agregasi')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7,
              fontSize: 12.5, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: tab === 'agregasi' ? '#ffffff' : 'transparent',
              color: tab === 'agregasi' ? '#0f172a' : '#64748b',
              boxShadow: tab === 'agregasi' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart2 size={14} color={tab === 'agregasi' ? '#2563eb' : '#64748b'} />
            Agregasi Sarpras Operator
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: tab === 'agregasi' ? '#f0fdf4' : '#e2e8f0', color: tab === 'agregasi' ? '#15803d' : '#64748b' }}>
              Live
            </span>
          </button>
        </div>

        {/* Filter on Tab Master */}
        {tab === 'master' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Cari kecamatan / kode..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '7px 12px 7px 32px',
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  borderRadius: 8, fontSize: 12.5, color: '#0f172a', outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = '#2563eb'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; }}
              />
            </div>

            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              style={{
                padding: '7px 12px', background: '#ffffff',
                border: '1px solid #cbd5e1', borderRadius: 8,
                fontSize: 12.5, color: '#0f172a', outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="all">Semua Tahun</option>
              {tahunList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: DATA MASTER WILAYAH ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'master' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <MapPin size={38} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Tidak Ditemukan Kecamatan</h3>
              <p style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                {search ? 'Coba ubah kata kunci pencarian Anda' : 'Belum ada data kecamatan terdaftar'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ width: 44, padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>No</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kecamatan & Kode</th>
                    <th style={{ padding: '11px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tahun</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kondisi Ruang Kelas</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fasilitas Sarpras</th>
                    <th style={{ padding: '11px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rombel</th>
                    <th style={{ padding: '11px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedFiltered.map((item, i) => {
                    const rowNum = (masterPage - 1) * PER_PAGE + i + 1;
                    const totalFasilitas =
                      num(item.fasilitas_lapangan_olahraga) +
                      num(item.fasilitas_perpustakaan) +
                      num(item.fasilitas_uks) +
                      num(item.fasilitas_toilet) +
                      num(item.fasilitas_tempat_ibadah);

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: '#ffffff',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                      >
                        {/* No */}
                        <td style={{ padding: '12px 16px', color: '#64748b', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                          {rowNum}
                        </td>

                        {/* Kecamatan & Kode */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                            {item.nama_kecamatan}
                          </div>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0', marginTop: 2, display: 'inline-block' }}>
                            {item.kode_kecamatan}
                          </span>
                        </td>

                        {/* Tahun */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            {item.tahun_ajaran || '—'}
                          </span>
                        </td>

                        {/* Kondisi Ruang Kelas (Sleek Clean Button) */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                              {num(item.jumlah_ruang_kelas)} Ruang
                            </span>
                            <button
                              onClick={() => openDetail(item, 'kelas')}
                              title="Lihat rincian kondisi ruang kelas"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 11, fontWeight: 600, color: '#2563eb',
                                background: '#eff6ff', border: '1px solid #bfdbfe',
                                padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
                            >
                              <Eye size={12} /> Rincian
                            </button>
                          </div>
                        </td>

                        {/* Fasilitas Sarpras (Sleek Clean Button) */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                              {totalFasilitas.toLocaleString('id-ID')} Unit
                            </span>
                            <button
                              onClick={() => openDetail(item, 'fasilitas')}
                              title="Lihat rincian fasilitas sarpras"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 11, fontWeight: 600, color: '#7c3aed',
                                background: '#f5f3ff', border: '1px solid #ddd6fe',
                                padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#ede9fe'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; }}
                            >
                              <Building size={12} /> Rincian
                            </button>
                          </div>
                        </td>

                        {/* Rombel */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {num(item.jumlah_rombongan_belajar)}
                          </span>
                        </td>

                        {/* Tindakan */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <button
                              onClick={() => handleEdit(item)}
                              title="Edit Kecamatan"
                              style={{
                                padding: '5px 10px', borderRadius: 7,
                                background: '#ffffff', border: '1px solid #cbd5e1',
                                color: '#334155', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 12, fontWeight: 600,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                            >
                              <Pencil size={12} /> Edit
                            </button>

                            <button
                              onClick={() => handleDelete(item.id, item.nama_kecamatan)}
                              title="Hapus Kecamatan"
                              style={{
                                padding: '5px 10px', borderRadius: 7,
                                background: '#fef2f2', border: '1px solid #fecaca',
                                color: '#dc2626', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 12, fontWeight: 600,
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
                            >
                              <Trash2 size={12} /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {masterTotalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Menampilkan <strong style={{ color: '#0f172a' }}>{(masterPage - 1) * PER_PAGE + 1}–{Math.min(masterPage * PER_PAGE, filtered.length)}</strong> dari <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> kecamatan
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    disabled={masterPage <= 1}
                    onClick={() => setMasterPage(masterPage - 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: masterPage <= 1 ? '#f8fafc' : '#ffffff',
                      color: masterPage <= 1 ? '#cbd5e1' : '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: masterPage <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronLeft size={14} /> Sebelumnya
                  </button>
                  {Array.from({ length: masterTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setMasterPage(p)}
                      style={{
                        minWidth: 32,
                        height: 32,
                        padding: '0 8px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: p === masterPage ? '#2563eb' : '#e2e8f0',
                        background: p === masterPage ? '#2563eb' : '#ffffff',
                        color: p === masterPage ? '#ffffff' : '#334155',
                        fontSize: 12.5,
                        fontWeight: p === masterPage ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={masterPage >= masterTotalPages}
                    onClick={() => setMasterPage(masterPage + 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: masterPage >= masterTotalPages ? '#f8fafc' : '#ffffff',
                      color: masterPage >= masterTotalPages ? '#cbd5e1' : '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: masterPage >= masterTotalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Berikutnya <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: AGREGASI SARPRAS DARI OPERATOR ────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'agregasi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Controls Bar & Sync */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14,
              boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Tahun Pelaporan:</label>
                <select
                  value={tahunSync}
                  onChange={e => setTahunSync(e.target.value)}
                  style={{
                    padding: '6px 12px', background: '#ffffff',
                    border: '1px solid #cbd5e1', borderRadius: 7,
                    fontSize: 12.5, fontWeight: 600, color: '#0f172a',
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  {tahunList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchAggregasi}
                disabled={aggLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 7,
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  color: '#334155', fontSize: 12.5, fontWeight: 600,
                  cursor: aggLoading ? 'not-allowed' : 'pointer',
                }}
              >
                <RefreshCw size={13} style={{ animation: aggLoading ? 'spin 1s linear infinite' : 'none' }} />
                Muat Ulang
              </button>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                background: '#10b981', color: '#ffffff',
                fontSize: 12.5, fontWeight: 700, border: 'none',
                cursor: syncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(16,185,129,0.25)',
                opacity: syncing ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Menyinkronkan...' : 'Sinkronkan ke Master Wilayah'}
            </button>
          </div>

          {/* Info Notice Card */}
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 12.5, color: '#1e40af', lineHeight: 1.5 }}>
              Data di bawah terakumulasi <strong>real-time</strong> dari laporan Sarpras Sekolah oleh masing-masing operator.
              Klik tombol <strong>"Sinkronkan ke Master Wilayah"</strong> untuk memperbarui dataset master yang dipakai dalam proses <strong>Clustering K-Means</strong>.
            </div>
          </div>

          {/* Reporting Progress Bar */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px', boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>
                Kemajuan Pelaporan Sarpras Sekolah se-Kabupaten/Kota
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb' }}>
                {aggSummary.totalIsi} / {aggSummary.totalSekolah} Sekolah ({aggSummary.persen}%)
              </span>
            </div>
            <div style={{ width: '100%', height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${aggSummary.persen}%`, height: '100%', background: '#2563eb', borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Aggregation Table */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Kecamatan</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sekolah Melapor</th>
                    <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ruang Kelas</th>
                    <th style={{ padding: '11px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fasilitas Sarpras</th>
                    <th style={{ padding: '11px 16px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rombel</th>
                  </tr>
                </thead>
                <tbody>
                  {aggData.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        Belum ada data pelaporan sarpras dari operator untuk tahun ajaran {tahunSync}
                      </td>
                    </tr>
                  ) : (
                    pagedAgg.map(row => {
                      const isComplete = row.jumlah_sekolah > 0 && row.sekolah_sudah_isi === row.jumlah_sekolah;
                      const hasStarted = row.sekolah_sudah_isi > 0;
                      const totalFasRow =
                        num(row.fasilitas_lapangan_olahraga) +
                        num(row.fasilitas_perpustakaan) +
                        num(row.fasilitas_uks) +
                        num(row.fasilitas_toilet) +
                        num(row.fasilitas_tempat_ibadah);

                      return (
                        <tr
                          key={row.kecamatan_id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: '#ffffff',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
                        >
                          {/* Kecamatan */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.nama_kecamatan}</div>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>{row.kode_kecamatan}</span>
                          </td>

                          {/* Sekolah Melapor */}
                          <td style={{ padding: '12px 16px' }}>
                            <span
                              style={{
                                fontSize: 11.5, fontWeight: 700,
                                color: isComplete ? '#15803d' : hasStarted ? '#b45309' : '#64748b',
                                background: isComplete ? '#f0fdf4' : hasStarted ? '#fffbeb' : '#f8fafc',
                                border: `1px solid ${isComplete ? '#bbf7d0' : hasStarted ? '#fde68a' : '#e2e8f0'}`,
                                padding: '2px 8px', borderRadius: 6,
                              }}
                            >
                              {num(row.sekolah_sudah_isi)} / {num(row.jumlah_sekolah)} Sekolah
                            </span>
                          </td>

                          {/* Ruang Kelas */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                              {num(row.jumlah_ruang_kelas)} <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>Total</span>
                            </div>
                            <div style={{ display: 'flex', gap: 4, fontSize: 11, fontWeight: 600 }}>
                              <span style={{ color: '#15803d' }}>{num(row.ruang_kelas_baik)} Baik</span>
                              <span style={{ color: '#94a3b8' }}>•</span>
                              <span style={{ color: '#b45309' }}>{num(row.ruang_kelas_rusak_ringan)} RR</span>
                              <span style={{ color: '#94a3b8' }}>•</span>
                              <span style={{ color: '#dc2626' }}>{num(row.ruang_kelas_rusak_berat)} RB</span>
                            </div>
                          </td>

                          {/* Fasilitas */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563eb' }}>
                              {totalFasRow.toLocaleString('id-ID')} Unit
                            </span>
                          </td>

                          {/* Rombel */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                            {num(row.jumlah_rombongan_belajar)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {aggTotalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#ffffff',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 12.5, color: '#64748b' }}>
                  Menampilkan <strong style={{ color: '#0f172a' }}>{(aggPage - 1) * PER_PAGE + 1}–{Math.min(aggPage * PER_PAGE, aggData.length)}</strong> dari <strong style={{ color: '#0f172a' }}>{aggData.length}</strong> kecamatan
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    disabled={aggPage <= 1}
                    onClick={() => setAggPage(aggPage - 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: aggPage <= 1 ? '#f8fafc' : '#ffffff',
                      color: aggPage <= 1 ? '#cbd5e1' : '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: aggPage <= 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ChevronLeft size={14} /> Sebelumnya
                  </button>
                  {Array.from({ length: aggTotalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setAggPage(p)}
                      style={{
                        minWidth: 32,
                        height: 32,
                        padding: '0 8px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: p === aggPage ? '#2563eb' : '#e2e8f0',
                        background: p === aggPage ? '#2563eb' : '#ffffff',
                        color: p === aggPage ? '#ffffff' : '#334155',
                        fontSize: 12.5,
                        fontWeight: p === aggPage ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={aggPage >= aggTotalPages}
                    onClick={() => setAggPage(aggPage + 1)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: aggPage >= aggTotalPages ? '#f8fafc' : '#ffffff',
                      color: aggPage >= aggTotalPages ? '#cbd5e1' : '#334155',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: aggPage >= aggTotalPages ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Berikutnya <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL POPUP: DETAIL KONDISI RUANG KELAS / FASILITAS ──────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {detailItem && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={() => setDetailItem(null)}
        >
          <div
            style={{
              width: '100%', maxWidth: 520,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.05)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {detailItem.nama_kecamatan}
                  </h2>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                    {detailItem.kode_kecamatan}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0 0' }}>
                  Tahun Ajaran: <strong>{detailItem.tahun_ajaran || '2024/2025'}</strong>
                </p>
              </div>

              <button
                onClick={() => setDetailItem(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-tab Switcher Inside Detail Modal */}
            <div style={{ display: 'flex', padding: '12px 22px 0', borderBottom: '1px solid #f1f5f9', gap: 8 }}>
              <button
                onClick={() => setDetailTab('kelas')}
                style={{
                  padding: '7px 14px', borderRadius: '7px 7px 0 0',
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: 'none',
                  background: detailTab === 'kelas' ? '#eff6ff' : 'transparent',
                  color: detailTab === 'kelas' ? '#2563eb' : '#64748b',
                  borderBottom: detailTab === 'kelas' ? '2px solid #2563eb' : '2px solid transparent',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Home size={14} /> Kondisi Ruang Kelas ({num(detailItem.jumlah_ruang_kelas)})
              </button>

              <button
                onClick={() => setDetailTab('fasilitas')}
                style={{
                  padding: '7px 14px', borderRadius: '7px 7px 0 0',
                  fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  border: 'none',
                  background: detailTab === 'fasilitas' ? '#f5f3ff' : 'transparent',
                  color: detailTab === 'fasilitas' ? '#7c3aed' : '#64748b',
                  borderBottom: detailTab === 'fasilitas' ? '2px solid #7c3aed' : '2px solid transparent',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                <Building size={14} /> Sarana & Fasilitas
              </button>
            </div>

            {/* Modal Body: Kelas View */}
            {detailTab === 'kelas' && (
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Total Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Total Kapasitas Kelas</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    {num(detailItem.jumlah_ruang_kelas)} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Ruang</span>
                  </span>
                </div>

                {/* 3 Status Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  
                  {/* Baik */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={18} color="#15803d" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Kondisi Baik</div>
                        <div style={{ fontSize: 11, color: '#166534' }}>Siap pakai untuk proses belajar mengajar</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>
                      {num(detailItem.ruang_kelas_baik)} <span style={{ fontSize: 12, fontWeight: 500 }}>Ruang</span>
                    </span>
                  </div>

                  {/* Rusak Ringan */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={18} color="#b45309" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#b45309' }}>Rusak Ringan (RR)</div>
                        <div style={{ fontSize: 11, color: '#92400e' }}>Perlu perawatan pemeliharaan rutin</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#b45309' }}>
                      {num(detailItem.ruang_kelas_rusak_ringan)} <span style={{ fontSize: 12, fontWeight: 500 }}>Ruang</span>
                    </span>
                  </div>

                  {/* Rusak Berat */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={18} color="#dc2626" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Rusak Berat (RB)</div>
                        <div style={{ fontSize: 11, color: '#991b1b' }}>Prioritas bantuan rehabilitasi fisik</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>
                      {num(detailItem.ruang_kelas_rusak_berat)} <span style={{ fontSize: 12, fontWeight: 500 }}>Ruang</span>
                    </span>
                  </div>

                </div>

              </div>
            )}

            {/* Modal Body: Fasilitas View */}
            {detailTab === 'fasilitas' && (
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  
                  {/* Perpustakaan */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>📚</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Perpustakaan</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{num(detailItem.fasilitas_perpustakaan)} Unit</div>
                      </div>
                    </div>
                  </div>

                  {/* Lapangan */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🏟️</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Lapangan Olahraga</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{num(detailItem.fasilitas_lapangan_olahraga)} Unit</div>
                      </div>
                    </div>
                  </div>

                  {/* Toilet */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🚻</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Toilet Siswa</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{num(detailItem.fasilitas_toilet)} Unit</div>
                      </div>
                    </div>
                  </div>

                  {/* UKS */}
                  <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🩺</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Ruang UKS</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{num(detailItem.fasilitas_uks)} Unit</div>
                      </div>
                    </div>
                  </div>

                  {/* Tempat Ibadah */}
                  <div style={{ gridColumn: 'span 2', padding: '12px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🕌</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Tempat Ibadah / Musholla</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{num(detailItem.fasilitas_tempat_ibadah)} Unit</div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Modal Footer */}
            <div style={{ padding: '12px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                <Users size={14} color="#64748b" />
                <span>Kapasitas Rombel: <strong style={{ color: '#0f172a' }}>{num(detailItem.jumlah_rombongan_belajar)}</strong></span>
              </div>

              <button
                onClick={() => setDetailItem(null)}
                style={{
                  padding: '7px 16px', borderRadius: 8,
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  color: '#334155', fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL FORM: TAMBAH / EDIT KECAMATAN ───────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 20,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: 640,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              boxShadow: '0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.05)',
              overflow: 'hidden',
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {editingId ? 'Edit Data Kecamatan' : 'Tambah Kecamatan Baru'}
                  </h2>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>
                    {editingId ? `Memperbarui profil wilayah ${formData.nama_kecamatan}` : 'Lengkapi data kecamatan dan sarana prasarana'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeForm}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form id="kec-form" onSubmit={handleSave} style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Section 1: Identitas Wilayah */}
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.04em', display: 'block', marginBottom: 12 }}>
                  1. Informasi Wilayah
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Nama Kecamatan <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nama_kecamatan}
                      onChange={e => setFormData(p => ({ ...p, nama_kecamatan: e.target.value }))}
                      placeholder="Contoh: Bogor Tengah"
                      required
                      style={{
                        width: '100%', padding: '8px 12px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Kode Kecamatan <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.kode_kecamatan}
                      onChange={e => setFormData(p => ({ ...p, kode_kecamatan: e.target.value }))}
                      placeholder="Contoh: KEC-001"
                      required
                      style={{
                        width: '100%', padding: '8px 12px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 5 }}>
                      Tahun Ajaran <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.tahun_ajaran}
                      onChange={e => setFormData(p => ({ ...p, tahun_ajaran: e.target.value }))}
                      placeholder="2024/2025"
                      required
                      style={{
                        width: '100%', padding: '8px 12px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Kondisi Ruang Kelas */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.04em' }}>
                    2. Kondisi Ruang Kelas
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                    Total: <strong style={{ color: '#0f172a' }}>{num(formData.ruang_kelas_baik) + num(formData.ruang_kelas_rusak_ringan) + num(formData.ruang_kelas_rusak_berat)}</strong> Ruang
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#15803d', marginBottom: 5 }}>
                      ✓ Ruang Baik
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.ruang_kelas_baik}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormData(p => ({
                          ...p,
                          ruang_kelas_baik: val,
                          jumlah_ruang_kelas: val + num(p.ruang_kelas_rusak_ringan) + num(p.ruang_kelas_rusak_berat),
                        }));
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#b45309', marginBottom: 5 }}>
                      ⚠ Rusak Ringan
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.ruang_kelas_rusak_ringan}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormData(p => ({
                          ...p,
                          ruang_kelas_rusak_ringan: val,
                          jumlah_ruang_kelas: num(p.ruang_kelas_baik) + val + num(p.ruang_kelas_rusak_berat),
                        }));
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#dc2626', marginBottom: 5 }}>
                      ✕ Rusak Berat
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.ruang_kelas_rusak_berat}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormData(p => ({
                          ...p,
                          ruang_kelas_rusak_berat: val,
                          jumlah_ruang_kelas: num(p.ruang_kelas_baik) + num(p.ruang_kelas_rusak_ringan) + val,
                        }));
                      }}
                      style={{
                        width: '100%', padding: '8px 12px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Fasilitas Sarana & Rombel */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.04em', display: 'block', marginBottom: 12 }}>
                  3. Sarana Penunjang & Rombongan Belajar
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                  {[
                    { key: 'fasilitas_perpustakaan', label: 'Perpustakaan' },
                    { key: 'fasilitas_lapangan_olahraga', label: 'Lapangan Olahraga' },
                    { key: 'fasilitas_toilet', label: 'Toilet Siswa' },
                    { key: 'fasilitas_uks', label: 'Ruang UKS' },
                    { key: 'fasilitas_tempat_ibadah', label: 'Tempat Ibadah' },
                    { key: 'jumlah_rombongan_belajar', label: 'Jumlah Rombel' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                        {f.label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={(formData as any)[f.key]}
                        onChange={e => setFormData(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                        style={{
                          width: '100%', padding: '8px 10px', background: '#ffffff',
                          border: '1px solid #cbd5e1', borderRadius: 8, color: '#0f172a', fontSize: 13, outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </form>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={closeForm}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: '#ffffff', border: '1px solid #cbd5e1',
                  color: '#475569', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>

              <button
                type="submit"
                form="kec-form"
                disabled={saving}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  background: '#2563eb', border: 'none',
                  color: '#ffffff', fontSize: 13, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  boxShadow: '0 1px 2px rgba(37,99,235,0.25)',
                }}
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kecamatan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ───────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 24, right: 24,
            background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: toast.type === 'success' ? '#15803d' : '#b91c1c',
            padding: '10px 16px', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
            zIndex: 1100, fontSize: 13, fontWeight: 600,
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
