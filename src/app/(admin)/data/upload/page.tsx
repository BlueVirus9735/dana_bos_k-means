'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  DollarSign, Save, Search, CheckCircle2, AlertCircle,
  ChevronDown, ChevronRight, Users, BookOpen, GraduationCap,
  CalendarDays, MapPin, Info, Plus, Loader2,
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

// Format validasi tahun ajaran: YYYY/YYYY
const TAHUN_REGEX = /^\d{4}\/\d{4}$/;

const JENJANG_OPTIONS = ['SD', 'SMP'];

const fmt = (n: number) => n.toLocaleString('id-ID');
const fmtRp = (n: number) =>
  n > 0 ? 'Rp ' + fmt(n) : '—';

const JENJANG_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  SD:  { bg: 'rgba(99,102,241,0.12)', color: 'var(--accent-hover)', border: 'rgba(99,102,241,0.3)' },
  SMP: { bg: 'rgba(52,211,153,0.12)', color: 'var(--green)',        border: 'rgba(52,211,153,0.3)' },
};

export default function InputDataBOSPage() {
  const router = useRouter();

  const [step, setStep]                   = useState<1 | 2>(1);
  const [tahunAjaran, setTahunAjaran]     = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ── Tahun ajaran dari DB ─────────────────────────────────
  const [tahunList, setTahunList]         = useState<string[]>([]);
  const [loadingYears, setLoadingYears]   = useState(true);
  const [tambahBaru, setTambahBaru]       = useState(false);
  const [tahunBaru, setTahunBaru]         = useState('');

  // ── Data state ──────────────────────────────────────────
  const [entries, setEntries]   = useState<SekolahEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<ToastType>(null);
  const [search, setSearch]     = useState('');

  // Edit buffer
  const [edited, setEdited] = useState<
    Record<number, { jumlah_siswa: string; total_dana_bos: string }>
  >({});

  // Collapsed kecamatan
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!localStorage.getItem('admin')) { router.push('/login'); return; }
    // Fetch daftar tahun ajaran dari DB saat pertama kali buka
    apiFetch('/kecamatan.php?years=1', {}, router)
      .then(r => r.json())
      .then((data: string[]) => {
        setTahunList(Array.isArray(data) ? data : []);
        if (data.length > 0) setTahunAjaran(data[0]); // default: tahun terbaru
      })
      .catch(() => {})
      .finally(() => setLoadingYears(false));
  }, [router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error') =>
    setToast({ message, type });

  // ── Fetch data setelah tahun dipilih ────────────────────
  const fetchData = useCallback(async (tahun: string) => {
    setLoading(true);
    setEdited({});
    try {
      const res  = await apiFetch(`/data_bos.php?tahun_ajaran=${encodeURIComponent(tahun)}`, {}, router);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      showToast('Gagal memuat data sekolah', 'error');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLanjut = () => {
    setStep(2);
    fetchData(tahunAjaran);
  };

  // ── Edit helpers ─────────────────────────────────────────
  // Hanya input total_dana_bos — jumlah_siswa dihitung otomatis (Dana BOS ÷ 920.000)
  const setField = (sekolahId: number, danaBos: string) => {
    const bos    = parseFloat(danaBos) || 0;
    const siswa  = bos > 0 ? Math.floor(bos / 920_000) : 0;
    setEdited(prev => ({
      ...prev,
      [sekolahId]: {
        total_dana_bos: danaBos,
        jumlah_siswa:   String(siswa),
      },
    }));
  };

  const getVal = (sekolahId: number, field: 'jumlah_siswa' | 'total_dana_bos') => {
    if (edited[sekolahId]?.[field] !== undefined) return edited[sekolahId][field];
    const e = entries.find(e => e.sekolah_id === sekolahId);
    return String(e?.[field] ?? '');
  };

  const getSarpras = (sekolahId: number) =>
    (parseFloat(getVal(sekolahId, 'total_dana_bos')) || 0) * 0.2;

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    const payload = entries
      .filter(e => {
        const hasEdit  = edited[e.sekolah_id] !== undefined;
        const hasData  = e.data_id > 0;
        const hasInput =
          Number(getVal(e.sekolah_id, 'total_dana_bos')) > 0 ||
          Number(getVal(e.sekolah_id, 'jumlah_siswa'))   > 0;
        return hasEdit || hasData || hasInput;
      })
      .map(e => ({
        sekolah_id:     e.sekolah_id,
        tahun_ajaran:   tahunAjaran,
        jumlah_siswa:   Number(getVal(e.sekolah_id, 'jumlah_siswa'))   || 0,
        total_dana_bos: Number(getVal(e.sekolah_id, 'total_dana_bos')) || 0,
      }));

    if (payload.length === 0) {
      showToast('Belum ada data yang diisi.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res  = await apiFetch('/data_bos.php', {
        method: 'POST',
        body:   JSON.stringify({ entries: payload }),
      }, router);
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ ${data.success_count} data berhasil disimpan untuk ${tahunAjaran}`, 'success');
        fetchData(tahunAjaran);
        setEdited({});
      } else {
        showToast('Gagal: ' + (data?.error || res.statusText), 'error');
      }
    } catch (err) {
      showToast('Error: ' + (err instanceof Error ? err.message : 'Terjadi kesalahan'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Derived / grouping ────────────────────────────────────
  const filtered = useMemo(() =>
    entries.filter(e => {
      const q = search.toLowerCase();
      const isFilled = e.data_id > 0 || edited[e.sekolah_id] !== undefined;
      return (
        (e.nama_sekolah.toLowerCase().includes(q) || e.npsn.includes(q)) &&
        (filterJenjang ? e.jenjang === filterJenjang : true) &&
        (filterKecamatan ? e.nama_kecamatan === filterKecamatan : true) &&
        (filterStatus === 'filled' ? isFilled : filterStatus === 'empty' ? !isFilled : true)
      );
    }),
    [entries, search, filterJenjang, filterKecamatan, filterStatus, edited],
  );

  const uniqueKecamatan = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.nama_kecamatan))).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Group by kecamatan
  const grouped = useMemo(() => {
    const map: Record<string, SekolahEntry[]> = {};
    for (const e of filtered) {
      if (!map[e.nama_kecamatan]) map[e.nama_kecamatan] = [];
      map[e.nama_kecamatan].push(e);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const editedCount  = Object.keys(edited).length;
  const totalSiswa   = entries.reduce((s, e) => s + (Number(getVal(e.sekolah_id, 'jumlah_siswa'))   || 0), 0);
  const totalBos     = entries.reduce((s, e) => s + (Number(getVal(e.sekolah_id, 'total_dana_bos')) || 0), 0);
  const sudahDiisi   = entries.filter(e => e.data_id > 0 || edited[e.sekolah_id] !== undefined).length;

  const toggleCollapse = (nama: string) =>
    setCollapsed(prev => ({ ...prev, [nama]: !prev[nama] }));

  // ── Step 1: Pilih tahun & jenjang ─────────────────────────
  if (step === 1) {
    return (
      <div className="animate-in" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <DollarSign size={24} color="var(--accent-hover)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Input Data Dana BOS
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Pilih tahun ajaran dan jenjang sebelum mulai mengisi data
          </p>
        </div>

        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Tahun Ajaran */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              <CalendarDays size={15} color="var(--accent-hover)" />
              Tahun Ajaran
            </label>

            {loadingYears ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
                <Loader2 size={15} className="animate-spin" /> Memuat tahun ajaran dari database...
              </div>
            ) : (
              <>
                {tahunList.length === 0 && !tambahBaru && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 0', marginBottom: 8 }}>
                    Belum ada data tahun ajaran di database. Tambah tahun baru di bawah.
                  </div>
                )}

                {/* Grid pilihan dari DB */}
                {tahunList.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
                    {tahunList.map(y => (
                      <button
                        key={y}
                        onClick={() => { setTahunAjaran(y); setTambahBaru(false); }}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius)',
                          border: `2px solid ${tahunAjaran === y && !tambahBaru ? 'var(--accent)' : 'var(--border)'}`,
                          background: tahunAjaran === y && !tambahBaru ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                          color: tahunAjaran === y && !tambahBaru ? 'var(--accent-hover)' : 'var(--text-secondary)',
                          fontWeight: tahunAjaran === y && !tambahBaru ? 700 : 500,
                          fontSize: 15, cursor: 'pointer', transition: 'all 0.15s ease',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                      >
                        {y}
                        {tahunAjaran === y && !tambahBaru && <CheckCircle2 size={16} color="var(--accent-hover)" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tombol / input tambah tahun baru */}
                {!tambahBaru ? (
                  <button
                    onClick={() => { setTambahBaru(true); setTahunAjaran(''); }}
                    style={{
                      width: '100%', padding: '10px 16px',
                      borderRadius: 'var(--radius)',
                      border: '1px dashed var(--border)',
                      background: 'transparent',
                      color: 'var(--text-muted)', fontSize: 13,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Plus size={14} /> Input tahun ajaran baru
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Contoh: 2025/2026"
                        value={tahunBaru}
                        onChange={e => setTahunBaru(e.target.value)}
                        className="form-input"
                        style={{ flex: 1, fontSize: 15 }}
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (TAHUN_REGEX.test(tahunBaru.trim())) {
                            setTahunAjaran(tahunBaru.trim());
                          }
                        }}
                        className="btn-primary"
                        style={{ whiteSpace: 'nowrap' }}
                        disabled={!TAHUN_REGEX.test(tahunBaru.trim())}
                      >
                        Pilih
                      </button>
                      <button
                        onClick={() => { setTambahBaru(false); setTahunBaru(''); if (tahunList[0]) setTahunAjaran(tahunList[0]); }}
                        className="btn-secondary"
                      >
                        Batal
                      </button>
                    </div>
                    {tahunBaru && !TAHUN_REGEX.test(tahunBaru.trim()) && (
                      <p style={{ fontSize: 11, color: 'var(--danger)', margin: 0 }}>Format harus YYYY/YYYY, contoh: 2025/2026</p>
                    )}
                    {tahunAjaran && tahunBaru === tahunAjaran && (
                      <p style={{ fontSize: 11, color: 'var(--green)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={12} /> Tahun {tahunAjaran} dipilih
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Filter Jenjang */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              <GraduationCap size={15} color="var(--accent-hover)" />
              Filter Jenjang <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>(opsional)</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['', ...JENJANG_OPTIONS].map(j => {
                const active = filterJenjang === j;
                const style = j ? JENJANG_COLOR[j] : null;
                return (
                  <button
                    key={j || 'all'}
                    onClick={() => setFilterJenjang(j)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${active ? (style?.border ?? 'var(--accent)') : 'var(--border)'}`,
                      background: active ? (style?.bg ?? 'var(--accent-muted)') : 'var(--bg-elevated)',
                      color: active ? (style?.color ?? 'var(--accent-hover)') : 'var(--text-secondary)',
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {j || 'Semua'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Data yang diisi akan dikelompokkan per kecamatan. Anda dapat mengisi{' '}
              <strong style={{ color: 'var(--text-secondary)' }}>jumlah siswa</strong> dan{' '}
              <strong style={{ color: 'var(--text-secondary)' }}>total dana BOS</strong> untuk setiap sekolah.
              Dana Sarpras (20%) dihitung otomatis.
            </span>
          </div>

          <button
            onClick={handleLanjut}
            disabled={!tahunAjaran || loadingYears}
            className="btn-primary"
            style={{ padding: '12px', fontSize: 15, justifyContent: 'center' }}
          >
            {!tahunAjaran ? 'Pilih tahun ajaran terlebih dahulu' : `Lanjut → Input Data ${tahunAjaran}${filterJenjang ? ` (${filterJenjang})` : ''}`}
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Tabel input per kecamatan ────────────────────
  return (
    <div className="space-y-5 animate-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <button
              onClick={() => { setStep(1); setEntries([]); setEdited({}); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
            >
              ← Ganti tahun
            </button>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={20} color="var(--accent-hover)" />
            Input Dana BOS
            <span style={{
              fontSize: 14, fontWeight: 600, padding: '3px 10px',
              background: 'var(--accent-muted)', color: 'var(--accent-hover)',
              border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20,
            }}>
              {tahunAjaran}
            </span>
            {filterJenjang && (
              <span style={{
                fontSize: 14, fontWeight: 600, padding: '3px 10px',
                background: JENJANG_COLOR[filterJenjang]?.bg,
                color: JENJANG_COLOR[filterJenjang]?.color,
                border: `1px solid ${JENJANG_COLOR[filterJenjang]?.border}`,
                borderRadius: 20,
              }}>
                {filterJenjang}
              </span>
            )}
          </h1>
          <p className="page-subtitle">Data dikelompokkan per kecamatan — isi Jumlah Siswa dan Total Dana BOS</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving
            ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
            : <><Save size={18} />{editedCount > 0 ? `Simpan (${editedCount} perubahan)` : 'Simpan Semua'}</>
          }
        </button>
      </div>

      {/* Stat bar */}
      {entries.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Total Sekolah',   value: String(entries.length),    suffix: 'sekolah', color: 'var(--text-primary)' },
            { label: 'Sudah Diisi',     value: String(sudahDiisi),         suffix: 'sekolah', color: 'var(--green)' },
            { label: 'Total Siswa',     value: totalSiswa > 0 ? fmt(totalSiswa) : '—', suffix: '', color: 'var(--accent-hover)' },
            { label: 'Total Dana BOS',  value: fmtRp(totalBos),           suffix: '', color: 'var(--amber)' },
            { label: 'Dana Sarpras 20%',value: fmtRp(totalBos * 0.2),    suffix: '', color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: s.color, marginTop: 4 }}>
                {s.value}
                {s.suffix && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4, fontWeight: 400 }}>{s.suffix}</span>}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="relative" style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Cari nama sekolah atau NPSN..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 36, fontSize: 13 }}
          />
        </div>
        
        {/* Kecamatan dropdown */}
        <select
          value={filterKecamatan}
          onChange={e => setFilterKecamatan(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: 160, fontSize: 13, cursor: 'pointer' }}
        >
          <option value="">Semua Kecamatan</option>
          {uniqueKecamatan.map(kec => (
            <option key={kec} value={kec}>{kec}</option>
          ))}
        </select>

        {/* Status dropdown */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="form-input"
          style={{ width: 'auto', minWidth: 140, fontSize: 13, cursor: 'pointer' }}
        >
          <option value="all">Semua Status</option>
          <option value="filled">Sudah Diisi</option>
          <option value="empty">Belum Diisi (Rp 0)</option>
        </select>
        
        {/* Jenjang toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['', ...JENJANG_OPTIONS].map(j => {
            const active = filterJenjang === j;
            const s = j ? JENJANG_COLOR[j] : null;
            return (
              <button
                key={j || 'all'}
                onClick={() => setFilterJenjang(j)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius)',
                  border: `1px solid ${active ? (s?.border ?? 'var(--accent)') : 'var(--border)'}`,
                  background: active ? (s?.bg ?? 'var(--accent-muted)') : 'var(--bg-elevated)',
                  color: active ? (s?.color ?? 'var(--accent-hover)') : 'var(--text-secondary)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 13, cursor: 'pointer', transition: 'all 0.15s ease',
                }}
              >
                {j || 'Semua Jenjang'}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
          {filtered.length} sekolah · {grouped.length} kecamatan
        </span>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ height: 56, opacity: 0.5, background: 'var(--bg-elevated)' }} />
          ))}
        </div>
      )}

      {/* Grouped by kecamatan */}
      {!loading && grouped.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <DollarSign size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {entries.length === 0
              ? 'Tidak ada sekolah terdaftar. Tambah data sekolah terlebih dahulu.'
              : 'Tidak ada hasil pencarian'}
          </p>
        </div>
      )}

      {!loading && grouped.map(([namaKec, schools]) => {
        const isCollapsed = collapsed[namaKec];
        const kecSudahDiisi = schools.filter(s => s.data_id > 0 || edited[s.sekolah_id] !== undefined).length;
        const kecTotal = schools.length;
        const kecDone  = kecSudahDiisi === kecTotal;
        const kecBos   = schools.reduce((sum, s) => sum + (Number(getVal(s.sekolah_id, 'total_dana_bos')) || 0), 0);

        return (
          <div key={namaKec} className="card" style={{ overflow: 'hidden' }}>
            {/* Kecamatan header */}
            <button
              onClick={() => toggleCollapse(namaKec)}
              style={{
                width: '100%', padding: '14px 18px',
                background: kecDone ? 'rgba(52,211,153,0.06)' : 'var(--bg-elevated)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isCollapsed
                  ? <ChevronRight size={16} color="var(--text-muted)" />
                  : <ChevronDown  size={16} color="var(--text-muted)" />
                }
                <MapPin size={15} color={kecDone ? 'var(--green)' : 'var(--accent-hover)'} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                  {namaKec}
                </span>
                <span style={{
                  fontSize: 12, padding: '2px 8px', borderRadius: 20,
                  background: kecDone ? 'rgba(52,211,153,0.15)' : 'var(--bg-hover)',
                  color: kecDone ? 'var(--green)' : 'var(--text-muted)',
                  border: `1px solid ${kecDone ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                  fontWeight: 600,
                }}>
                  {kecSudahDiisi}/{kecTotal} sekolah
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {kecBos > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
                    {fmtRp(kecBos)}
                  </span>
                )}
                {kecDone && <CheckCircle2 size={16} color="var(--green)" />}
              </div>
            </button>

            {/* Sekolah rows */}
            {!isCollapsed && (
              <div>
                {/* Sub-header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 200px 150px 150px',
                  padding: '8px 18px',
                  background: 'var(--bg-base)',
                  borderBottom: '1px solid var(--border)',
                  gap: 12,
                }}>
                  {/* Sub-header kolom: input dana dulu, auto siswa & sarpras di kanan */}
                  {['Nama Sekolah', 'Jenjang', 'Total Dana BOS (input)', 'Siswa (auto ÷ 920rb)', 'Sarpras 20% (auto)'].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {schools.map(item => {
                  const sarpras  = getSarpras(item.sekolah_id);
                  const isEdited = edited[item.sekolah_id] !== undefined;
                  const hasSaved = item.data_id > 0 && !isEdited;
                  const jStyle   = JENJANG_COLOR[item.jenjang] ?? JENJANG_COLOR.SD;

                  return (
                    <div
                      key={item.sekolah_id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 200px 150px 150px',
                        padding: '10px 18px',
                        borderBottom: '1px solid var(--border)',
                        gap: 12,
                        alignItems: 'center',
                        background: isEdited ? 'rgba(251,191,36,0.05)' : hasSaved ? 'rgba(52,211,153,0.03)' : undefined,
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Nama Sekolah */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.nama_sekolah}
                          {isEdited && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(251,191,36,0.2)', color: 'var(--amber)', border: '1px solid rgba(251,191,36,0.3)', fontWeight: 700 }}>DIUBAH</span>}
                          {hasSaved && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(52,211,153,0.15)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }}>✓ TERSIMPAN</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                          {item.npsn}
                        </div>
                      </div>

                      {/* Jenjang badge */}
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: jStyle.bg, color: jStyle.color, border: `1px solid ${jStyle.border}`,
                        }}>
                          {item.jenjang === 'SD' ? <BookOpen size={11} /> : <GraduationCap size={11} />}
                          {item.jenjang}
                        </span>
                      </div>

                      {/* Input Dana BOS */}
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Rp</span>
                        <input
                          type="number"
                          min={0}
                          value={getVal(item.sekolah_id, 'total_dana_bos')}
                          onChange={e => setField(item.sekolah_id, e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: 30, fontSize: 13 }}
                          placeholder="0"
                        />
                      </div>

                      {/* Jumlah Siswa — AUTO dari Dana BOS ÷ 920.000 */}
                      <div style={{
                        padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        fontSize: 13, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        {Number(getVal(item.sekolah_id, 'jumlah_siswa')) > 0
                          ? <><Users size={12} color="var(--text-muted)" />{fmt(Number(getVal(item.sekolah_id, 'jumlah_siswa')))}<span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>siswa</span></>
                          : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
                        }
                      </div>

                      {/* Sarpras auto */}
                      <div style={{
                        padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        background: sarpras > 0 ? 'rgba(52,211,153,0.08)' : 'var(--bg-elevated)',
                        border: `1px solid ${sarpras > 0 ? 'rgba(52,211,153,0.25)' : 'var(--border)'}`,
                        color: sarpras > 0 ? 'var(--green)' : 'var(--text-muted)',
                        fontSize: 13, fontWeight: 600,
                      }}>
                        {sarpras > 0 ? fmtRp(sarpras) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Sticky footer save */}
      {!loading && entries.length > 0 && (
        <div style={{
          position: 'sticky', bottom: 16,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Tahun Ajaran <strong style={{ color: 'var(--accent-hover)' }}>{tahunAjaran}</strong>
            {' · '}
            <strong style={{ color: 'var(--green)' }}>{sudahDiisi}</strong>/{entries.length} sekolah sudah diisi
            {editedCount > 0 && (
              <span style={{ marginLeft: 12, color: 'var(--amber)', fontWeight: 600 }}>
                · {editedCount} perubahan belum disimpan
              </span>
            )}
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving
              ? <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
              : <><Save size={16} /> Simpan Data</>
            }
          </button>
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
