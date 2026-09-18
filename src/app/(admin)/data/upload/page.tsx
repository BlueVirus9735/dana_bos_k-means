'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  DollarSign, Save, Search, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Users, GraduationCap,
  CalendarDays, MapPin, Plus, Loader2, RotateCcw,
  X, Building2
} from 'lucide-react';

interface SekolahEntry {
  sekolah_id: number;
  npsn: string;
  nama_sekolah: string;
  jenjang: string;
  kecamatan_id: number;
  nama_kecamatan: string;
  data_id: number;
  jumlah_siswa: number;
  total_dana_bos: number;
  alokasi_dana_sarpras: number;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

const TAHUN_REGEX = /^\d{4}\/\d{4}$/;

const fmt = (n: number) => n.toLocaleString('id-ID');
const fmtRp = (n: number) => (n > 0 ? 'Rp ' + fmt(n) : 'Rp 0');

export default function InputDataBOSPage() {
  const router = useRouter();

  const [tahunAjaran, setTahunAjaran] = useState('');
  const [tahunList, setTahunList] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);

  // New academic year modal
  const [showModalTahun, setShowModalTahun] = useState(false);
  const [tahunBaruInput, setTahunBaruInput] = useState('');
  const [errorTahunBaru, setErrorTahunBaru] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Data & buffer
  const [entries, setEntries] = useState<SekolahEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);
  const [edited, setEdited] = useState<
    Record<number, { jumlah_siswa: string; total_dana_bos: string }>
  >({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Pagination
  const [kecPage, setKecPage] = useState(1); // halaman kecamatan (10 per halaman)
  const [schoolPage, setSchoolPage] = useState<Record<string, number>>({}); // halaman sekolah per kecamatan
  const KEC_PER_PAGE = 10;
  const SCHOOL_PER_PAGE = 10;

  useEffect(() => {
    if (!localStorage.getItem('admin')) {
      router.push('/login');
      return;
    }
    // Fetch available years
    apiFetch('/kecamatan.php?years=1', {}, router)
      .then((r) => r.json())
      .then((data: string[]) => {
        const years = Array.isArray(data) ? data : [];
        setTahunList(years);
        if (years.length > 0) {
          setTahunAjaran(years[0]);
          fetchData(years[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingYears(false));
  }, [router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

  // ── Fetch data for year ──────────────────────────────────
  const fetchData = useCallback(
    async (tahun: string) => {
      if (!tahun) return;
      setLoading(true);
      setEdited({});
      try {
        const res = await apiFetch(`/data_bos.php?tahun_ajaran=${encodeURIComponent(tahun)}`, {}, router);
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      } catch {
        showToast('Gagal memuat data sekolah.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const handleYearChange = (year: string) => {
    setTahunAjaran(year);
    fetchData(year);
  };

  // ── Edit helpers ─────────────────────────────────────────
  const setField = (sekolahId: number, danaBos: string) => {
    const bos = parseFloat(danaBos) || 0;
    const siswa = bos > 0 ? Math.floor(bos / 920_000) : 0;
    setEdited((prev) => ({
      ...prev,
      [sekolahId]: {
        total_dana_bos: danaBos,
        jumlah_siswa: String(siswa),
      },
    }));
  };

  const getVal = (sekolahId: number, field: 'jumlah_siswa' | 'total_dana_bos') => {
    if (edited[sekolahId]?.[field] !== undefined) return edited[sekolahId][field];
    const e = entries.find((e) => e.sekolah_id === sekolahId);
    return String(e?.[field] ?? '');
  };

  const getSarpras = (sekolahId: number) => {
    const bos = parseFloat(getVal(sekolahId, 'total_dana_bos')) || 0;
    return bos * 0.2;
  };

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    const payload = entries
      .filter((e) => {
        const hasEdit = edited[e.sekolah_id] !== undefined;
        const hasData = e.data_id > 0;
        const hasInput =
          Number(getVal(e.sekolah_id, 'total_dana_bos')) > 0 ||
          Number(getVal(e.sekolah_id, 'jumlah_siswa')) > 0;
        return hasEdit || hasData || hasInput;
      })
      .map((e) => ({
        sekolah_id: e.sekolah_id,
        tahun_ajaran: tahunAjaran,
        jumlah_siswa: Number(getVal(e.sekolah_id, 'jumlah_siswa')) || 0,
        total_dana_bos: Number(getVal(e.sekolah_id, 'total_dana_bos')) || 0,
      }));

    if (payload.length === 0) {
      showToast('Belum ada data yang diisi untuk disimpan.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/data_bos.php', {
        method: 'POST',
        body: JSON.stringify({ entries: payload }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ ${data.success_count || payload.length} data alokasi BOS berhasil disimpan!`, 'success');
        fetchData(tahunAjaran);
        setEdited({});
      } else {
        showToast('Gagal menyimpan: ' + (data?.error || res.statusText), 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan: ' + (err instanceof Error ? err.message : ''), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Add New Year Handler ──────────────────────────────────
  const handleTambahTahunBaru = (e: React.FormEvent) => {
    e.preventDefault();
    const val = tahunBaruInput.trim();
    if (!TAHUN_REGEX.test(val)) {
      setErrorTahunBaru('Format tahun harus YYYY/YYYY (contoh: 2025/2026)');
      return;
    }
    if (!tahunList.includes(val)) {
      setTahunList([val, ...tahunList]);
    }
    setTahunAjaran(val);
    setShowModalTahun(false);
    setTahunBaruInput('');
    setErrorTahunBaru('');
    fetchData(val);
    showToast(`Tahun ajaran ${val} berhasil dipilih.`, 'success');
  };

  // ── Filtered & Grouped ───────────────────────────────────
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const q = search.trim().toLowerCase();
      const isFilled = e.data_id > 0 || edited[e.sekolah_id] !== undefined;

      const matchSearch =
        !q ||
        (e.nama_sekolah && e.nama_sekolah.toLowerCase().includes(q)) ||
        (e.npsn && e.npsn.includes(q)) ||
        (e.nama_kecamatan && e.nama_kecamatan.toLowerCase().includes(q));

      const matchJenjang = filterJenjang ? e.jenjang === filterJenjang : true;
      const matchKecamatan = filterKecamatan ? e.nama_kecamatan === filterKecamatan : true;
      const matchStatus =
        filterStatus === 'filled' ? isFilled : filterStatus === 'empty' ? !isFilled : true;

      return matchSearch && matchJenjang && matchKecamatan && matchStatus;
    });
  }, [entries, search, filterJenjang, filterKecamatan, filterStatus, edited]);

  const uniqueKecamatan = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.nama_kecamatan).filter(Boolean))).sort();
  }, [entries]);

  const grouped = useMemo(() => {
    const map: Record<string, SekolahEntry[]> = {};
    for (const e of filtered) {
      if (!map[e.nama_kecamatan]) map[e.nama_kecamatan] = [];
      map[e.nama_kecamatan].push(e);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Reset kecPage saat filter / data berubah
  useEffect(() => {
    setKecPage(1);
    setSchoolPage({});
  }, [search, filterJenjang, filterKecamatan, filterStatus, tahunAjaran]);

  // Paginate kecamatan
  const kecTotalPages = Math.max(1, Math.ceil(grouped.length / KEC_PER_PAGE));
  const pagedGrouped = grouped.slice((kecPage - 1) * KEC_PER_PAGE, kecPage * KEC_PER_PAGE);

  const getSchoolPage = (nama: string) => schoolPage[nama] ?? 1;
  const setKecSchoolPage = (nama: string, p: number) =>
    setSchoolPage((prev) => ({ ...prev, [nama]: p }));

  // Metrics
  const editedCount = Object.keys(edited).length;
  const totalSiswa = useMemo(() => {
    return entries.reduce((s, e) => s + (Number(getVal(e.sekolah_id, 'jumlah_siswa')) || 0), 0);
  }, [entries, edited]);

  const totalBos = useMemo(() => {
    return entries.reduce((s, e) => s + (Number(getVal(e.sekolah_id, 'total_dana_bos')) || 0), 0);
  }, [entries, edited]);

  const sudahDiisi = useMemo(() => {
    return entries.filter((e) => {
      const val = Number(getVal(e.sekolah_id, 'total_dana_bos'));
      return val > 0 || e.data_id > 0;
    }).length;
  }, [entries, edited]);

  const percentSudahDiisi = entries.length > 0 ? Math.round((sudahDiisi / entries.length) * 100) : 0;
  const hasActiveFilters = Boolean(search || filterJenjang || filterKecamatan || filterStatus !== 'all');

  const toggleCollapse = (nama: string) => {
    setCollapsed((prev) => ({ ...prev, [nama]: !prev[nama] }));
  };

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
                <DollarSign size={20} color="#2563eb" />
              </div>
              <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                Input Data Dana BOS
              </h1>
            </div>
            <p className="page-subtitle" style={{ marginLeft: 48, marginTop: 2 }}>
              Penginputan dan rekapitulasi alokasi dana BOS per satuan pendidikan se-kabupaten
            </p>
          </div>

          {/* Right Controls: Year Selector & Save Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Year Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 9,
                padding: '4px 12px',
                boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
              }}
            >
              <CalendarDays size={15} color="#64748b" />
              <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>Tahun:</span>
              <select
                value={tahunAjaran}
                onChange={(e) => handleYearChange(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {tahunList.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Tambah Tahun Button */}
            <button
              type="button"
              onClick={() => { setShowModalTahun(true); setErrorTahunBaru(''); }}
              title="Input Tahun Ajaran Baru"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 12px',
                borderRadius: 9,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            >
              <Plus size={14} /> Tahun Baru
            </button>

            {/* Primary Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || entries.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 16px',
                borderRadius: 9,
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                boxShadow: '0 1px 2px 0 rgba(37,99,235,0.25)',
                cursor: saving || entries.length === 0 ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.75 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={(e) => { if (!saving) e.currentTarget.style.background = '#2563eb'; }}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Simpan Data</span>
                  {editedCount > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: '#ffffff',
                        color: '#2563eb',
                        padding: '1px 6px',
                        borderRadius: 10,
                        marginLeft: 4,
                      }}
                    >
                      {editedCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
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
          {/* Metric 1: Total Sekolah */}
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
              <Building2 size={22} color="#2563eb" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Sekolah
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {entries.length.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Satuan</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{uniqueKecamatan.length} Kecamatan</span>
            </div>
          </div>

          {/* Metric 2: Progres Pengisian */}
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
                Progres Pengisian
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {sudahDiisi}{' '}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
                  ({percentSudahDiisi}%)
                </span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>{entries.length - sudahDiisi} sekolah belum diisi</span>
            </div>
          </div>

          {/* Metric 3: Estimasi Total Siswa */}
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
              <Users size={22} color="#4f46e5" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Siswa Terdata
              </span>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {totalSiswa.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Siswa</span>
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>Dihitung otomatis dari alokasi</span>
            </div>
          </div>

          {/* Metric 4: Total Alokasi Dana BOS */}
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
              <DollarSign size={22} color="#d97706" />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Dana BOS
              </span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {fmtRp(totalBos)}
              </div>
              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                Sarpras 20%: {fmtRp(totalBos * 0.2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
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
            <div style={{ position: 'relative', minWidth: 240, flex: '1 1 240px', maxWidth: 360 }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
              <input
                type="text"
                placeholder="Cari nama sekolah atau NPSN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  onClick={() => setSearch('')}
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

            {/* Kecamatan Filter */}
            <select
              value={filterKecamatan}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: 150,
                height: 38,
                fontSize: 13,
                background: '#f8fafc',
              }}
            >
              <option value="">Semua Kecamatan</option>
              {uniqueKecamatan.map((k) => (
                <option key={k} value={k}>
                  Kec. {k}
                </option>
              ))}
            </select>

            {/* Jenjang Filter */}
            <select
              value={filterJenjang}
              onChange={(e) => setFilterJenjang(e.target.value)}
              className="form-input"
              style={{
                width: 'auto',
                minWidth: 130,
                height: 38,
                fontSize: 13,
                background: '#f8fafc',
              }}
            >
              <option value="">Semua Jenjang</option>
              <option value="SD">Jenjang SD</option>
              <option value="SMP">Jenjang SMP</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              <option value="filled">Sudah Diisi</option>
              <option value="empty">Belum Diisi (Rp 0)</option>
            </select>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterJenjang('');
                  setFilterKecamatan('');
                  setFilterStatus('all');
                }}
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

          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Menampilkan <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> sekolah ·{' '}
            <strong style={{ color: '#0f172a' }}>{grouped.length}</strong> kecamatan
            {grouped.length > KEC_PER_PAGE && (
              <span style={{ marginLeft: 6, color: '#2563eb', fontWeight: 600 }}>
                (Halaman {kecPage}/{kecTotalPages})
              </span>
            )}
          </div>
        </div>

        {/* ── Loading Skeleton ───────────────────────────────────────────── */}
        {loading && (
          <div className="card p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-blue-600" />
            <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
              Memuat data sekolah untuk Tahun Ajaran {tahunAjaran}...
            </span>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!loading && grouped.length === 0 && (
          <div className="card p-16 text-center" style={{ borderRadius: 12 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <DollarSign size={26} color="#2563eb" />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {hasActiveFilters ? 'Tidak ada sekolah yang cocok' : 'Belum Ada Data Sekolah'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '6px auto 16px', lineHeight: 1.6 }}>
              {hasActiveFilters
                ? 'Silakan ubah kata kunci pencarian atau sesuaikan filter yang aktif.'
                : `Tidak ada data sekolah terdaftar untuk Tahun Ajaran ${tahunAjaran}.`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterJenjang('');
                  setFilterKecamatan('');
                  setFilterStatus('all');
                }}
                className="btn-secondary"
                style={{ fontSize: 13 }}
              >
                <RotateCcw size={14} /> Bersihkan Filter
              </button>
            )}
          </div>
        )}

        {/* ── Grouped Kecamatan Tables ───────────────────────────────────── */}
        {!loading &&
          pagedGrouped.map(([namaKec, schools]) => {
            const isCollapsed = collapsed[namaKec];
            const kecSudahDiisi = schools.filter((s) => {
              const val = Number(getVal(s.sekolah_id, 'total_dana_bos'));
              return val > 0 || s.data_id > 0;
            }).length;
            const kecTotal = schools.length;
            const kecDone = kecSudahDiisi === kecTotal && kecTotal > 0;
            const kecBos = schools.reduce(
              (sum, s) => sum + (Number(getVal(s.sekolah_id, 'total_dana_bos')) || 0),
              0
            );

            return (
              <div
                key={namaKec}
                className="card overflow-hidden"
                style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}
              >
                {/* Kecamatan Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCollapse(namaKec)}
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    background: '#f8fafc',
                    border: 'none',
                    borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isCollapsed ? (
                      <ChevronRight size={16} color="#64748b" />
                    ) : (
                      <ChevronDown size={16} color="#64748b" />
                    )}
                    <MapPin size={16} color={kecDone ? '#16a34a' : '#2563eb'} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                      Kecamatan {namaKec}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: kecDone ? '#f0fdf4' : '#ffffff',
                        color: kecDone ? '#15803d' : '#475569',
                        border: `1px solid ${kecDone ? '#bbf7d0' : '#cbd5e1'}`,
                      }}
                    >
                      {kecSudahDiisi}/{kecTotal} Sekolah Terisi
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {fmtRp(kecBos)}
                      </span>
                    </div>
                    {kecDone && <CheckCircle2 size={16} color="#16a34a" />}
                  </div>
                </button>

                {/* Schools Table inside Kecamatan */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ minWidth: 240, padding: '11px 18px', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Satuan Pendidikan & NPSN
                          </th>
                          <th style={{ width: 100, padding: '11px 16px', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Jenjang
                          </th>
                          <th style={{ minWidth: 200, padding: '11px 16px', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Alokasi Dana BOS (Rp)
                          </th>
                          <th style={{ width: 150, padding: '11px 16px', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Estimasi Siswa
                          </th>
                          <th style={{ width: 160, padding: '11px 16px', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Dana Sarpras (20%)
                          </th>
                          <th style={{ width: 120, textAlign: 'center', padding: '11px 16px', fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const sp = getSchoolPage(namaKec);
                          const totalSchoolPages = Math.max(1, Math.ceil(schools.length / SCHOOL_PER_PAGE));
                          const pagedSchools = schools.slice((sp - 1) * SCHOOL_PER_PAGE, sp * SCHOOL_PER_PAGE);
                          return pagedSchools.map((item) => {
                          const sarpras = getSarpras(item.sekolah_id);
                          const isEdited = edited[item.sekolah_id] !== undefined;
                          const hasSaved = item.data_id > 0 && !isEdited;
                          const currentBos = Number(getVal(item.sekolah_id, 'total_dana_bos'));
                          const isSD = item.jenjang === 'SD';

                          return (
                            <tr
                              key={item.sekolah_id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isEdited ? '#fffdf7' : '#ffffff',
                                transition: 'background 0.12s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isEdited) e.currentTarget.style.background = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                if (!isEdited) e.currentTarget.style.background = '#ffffff';
                              }}
                            >
                              {/* Nama Sekolah & NPSN */}
                              <td style={{ padding: '13px 18px' }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                                    {item.nama_sekolah}
                                  </div>
                                  <div style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                                    NPSN: {item.npsn}
                                  </div>
                                </div>
                              </td>

                              {/* Jenjang */}
                              <td style={{ padding: '13px 16px' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    padding: '2.5px 9px',
                                    borderRadius: 12,
                                    background: isSD ? '#eff6ff' : '#eef2ff',
                                    color: isSD ? '#1d4ed8' : '#4338ca',
                                    border: `1px solid ${isSD ? '#bfdbfe' : '#c7d2fe'}`,
                                  }}
                                >
                                  {item.jenjang}
                                </span>
                              </td>

                              {/* Input Dana BOS */}
                              <td style={{ padding: '13px 16px' }}>
                                <div style={{ position: 'relative', maxWidth: 220 }}>
                                  <span
                                    style={{
                                      position: 'absolute',
                                      left: 10,
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      fontSize: 12,
                                      color: '#94a3b8',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Rp
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={getVal(item.sekolah_id, 'total_dana_bos')}
                                    onChange={(e) => setField(item.sekolah_id, e.target.value)}
                                    placeholder="0"
                                    className="form-input"
                                    style={{
                                      paddingLeft: 32,
                                      fontSize: 13,
                                      height: 36,
                                      fontWeight: 600,
                                      borderColor: isEdited ? '#f59e0b' : '#cbd5e1',
                                      background: isEdited ? '#fffbeb' : '#ffffff',
                                    }}
                                  />
                                </div>
                              </td>

                              {/* Estimasi Siswa (auto ÷ 920.000) */}
                              <td style={{ padding: '13px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Users size={14} color="#64748b" />
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                    {Number(getVal(item.sekolah_id, 'jumlah_siswa')) > 0
                                      ? `${fmt(Number(getVal(item.sekolah_id, 'jumlah_siswa')))} Siswa`
                                      : '—'}
                                  </span>
                                </div>
                              </td>

                              {/* Dana Sarpras 20% */}
                              <td style={{ padding: '13px 16px' }}>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: sarpras > 0 ? '#15803d' : '#94a3b8',
                                  }}
                                >
                                  {sarpras > 0 ? fmtRp(sarpras) : '—'}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                                {isEdited ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      background: '#fffbeb',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                    }}
                                  >
                                    ● Belum Simpan
                                  </span>
                                ) : currentBos > 0 ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      background: '#f0fdf4',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0',
                                    }}
                                  >
                                    ● Tersimpan
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      fontSize: 11,
                                      fontWeight: 500,
                                      padding: '2px 8px',
                                      borderRadius: 12,
                                      background: '#f8fafc',
                                      color: '#94a3b8',
                                      border: '1px solid #e2e8f0',
                                    }}
                                  >
                                    Belum Diisi
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                        })()}
                      </tbody>
                    </table>
                    {/* ── Pagination Sekolah per Kecamatan ─── */}
                    {(() => {
                      const sp = getSchoolPage(namaKec);
                      const totalSchoolPages = Math.max(1, Math.ceil(schools.length / SCHOOL_PER_PAGE));
                      if (totalSchoolPages <= 1) return null;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderTop: '1px solid #f1f5f9', background: '#fafbfc' }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            Sekolah {(sp - 1) * SCHOOL_PER_PAGE + 1}–{Math.min(sp * SCHOOL_PER_PAGE, schools.length)} dari {schools.length}
                          </span>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button disabled={sp <= 1} onClick={() => setKecSchoolPage(namaKec, sp - 1)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: sp <= 1 ? '#f8fafc' : '#ffffff', color: sp <= 1 ? '#cbd5e1' : '#374151', fontSize: 12, fontWeight: 600, cursor: sp <= 1 ? 'not-allowed' : 'pointer' }}>‹</button>
                            {Array.from({ length: totalSchoolPages }, (_, i) => i + 1).map((p) => (
                              <button key={p} onClick={() => setKecSchoolPage(namaKec, p)}
                                style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid', borderColor: p === sp ? '#2563eb' : '#e2e8f0', background: p === sp ? '#eff6ff' : '#ffffff', color: p === sp ? '#1d4ed8' : '#374151', fontSize: 12, fontWeight: p === sp ? 700 : 500, cursor: 'pointer' }}>{p}</button>
                            ))}
                            <button disabled={sp >= totalSchoolPages} onClick={() => setKecSchoolPage(namaKec, sp + 1)}
                              style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: sp >= totalSchoolPages ? '#f8fafc' : '#ffffff', color: sp >= totalSchoolPages ? '#cbd5e1' : '#374151', fontSize: 12, fontWeight: 600, cursor: sp >= totalSchoolPages ? 'not-allowed' : 'pointer' }}>›</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}

        {/* ── Pagination Kecamatan ─────────────────────────────────────── */}
        {!loading && kecTotalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 20px', boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              Kecamatan {(kecPage - 1) * KEC_PER_PAGE + 1}–{Math.min(kecPage * KEC_PER_PAGE, grouped.length)} dari <strong style={{ color: '#0f172a' }}>{grouped.length}</strong> kecamatan
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button disabled={kecPage <= 1} onClick={() => setKecPage(kecPage - 1)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: kecPage <= 1 ? '#f8fafc' : '#ffffff', color: kecPage <= 1 ? '#cbd5e1' : '#374151', fontSize: 13, fontWeight: 600, cursor: kecPage <= 1 ? 'not-allowed' : 'pointer' }}>‹ Sebelumnya</button>
              {Array.from({ length: kecTotalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setKecPage(p)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: p === kecPage ? '#2563eb' : '#e2e8f0', background: p === kecPage ? '#2563eb' : '#ffffff', color: p === kecPage ? '#ffffff' : '#374151', fontSize: 13, fontWeight: p === kecPage ? 700 : 500, cursor: 'pointer' }}>{p}</button>
              ))}
              <button disabled={kecPage >= kecTotalPages} onClick={() => setKecPage(kecPage + 1)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: kecPage >= kecTotalPages ? '#f8fafc' : '#ffffff', color: kecPage >= kecTotalPages ? '#cbd5e1' : '#374151', fontSize: 13, fontWeight: 600, cursor: kecPage >= kecTotalPages ? 'not-allowed' : 'pointer' }}>Berikutnya ›</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Discreet Floating Save Bar (Muncul saat ada perubahan data) ─── */}
      {editedCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            padding: '12px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
            zIndex: 9990,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f59e0b',
              }}
            />
            <span>
              Terdapat <strong>{editedCount} perubahan data</strong> yang belum disimpan.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setEdited({})}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                borderRadius: 7,
                background: '#2563eb',
                border: 'none',
                color: '#ffffff',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(37,99,235,0.25)',
              }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Simpan Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Input Tahun Ajaran Baru ───────────────────────────────── */}
      {showModalTahun && (
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
          onClick={(e) => e.target === e.currentTarget && setShowModalTahun(false)}
        >
          <div
            className="modal-box"
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CalendarDays size={18} color="#2563eb" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Input Tahun Ajaran Baru
                </h3>
              </div>
              <button
                onClick={() => setShowModalTahun(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleTambahTahunBaru}>
              <div style={{ padding: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Format Tahun Ajaran (YYYY/YYYY)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 2025/2026"
                  value={tahunBaruInput}
                  onChange={(e) => {
                    setTahunBaruInput(e.target.value);
                    setErrorTahunBaru('');
                  }}
                  className="form-input"
                  style={{ fontSize: 13, height: 38 }}
                  autoFocus
                  required
                />
                {errorTahunBaru && (
                  <p style={{ fontSize: 11.5, color: '#dc2626', marginTop: 6, margin: 0 }}>
                    {errorTahunBaru}
                  </p>
                )}
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: 'block' }}>
                  Gunakan format 4 digit garis miring 4 digit (contoh: 2025/2026)
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: '12px 20px',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModalTahun(false)}
                  className="btn-secondary"
                  style={{ fontSize: 12.5, padding: '7px 14px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: 12.5, padding: '7px 16px' }}
                >
                  Pilih & Buka
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
