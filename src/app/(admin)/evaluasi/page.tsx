'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FlaskConical,
  BarChart2,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Layers,
  Award,
  Info,
  Calendar,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

// ── Tipe Data ─────────────────────────────────────────────────────────────────

interface PerCluster {
  cluster_id: number;
  kategori: string;
  n_members: number;
  sigma: number;
  rij_max: number;
  centroid: number[];
  jumlah_kecamatan?: number;
  total_siswa?: number;
}

interface Interpretasi {
  label: string;
  level: 'good' | 'medium' | 'poor';
}

interface EvaluasiData {
  exists: boolean;
  tahun_ajaran: string;
  n_clusters: number;
  dbi_score: number;
  inertia: number;
  n_iterations: number;
  interpretasi: Interpretasi;
  sigma: number[];
  inter_distances: number[][];
  centroids: number[][];
  per_cluster: PerCluster[];
  distribution: Array<{
    cluster_id: number;
    kategori: string;
    jumlah_kecamatan: number;
    total_siswa: number;
  }>;
  updated_at?: string;
  message?: string;
}

// ── Indikator & Palette ───────────────────────────────────────────────────────

const INDIKATOR_LABELS = [
  'Jumlah Siswa',
  'Total Dana BOS',
  'Alokasi Dana Sarpras',
  'Jumlah Rombongan Belajar',
  'Ketersediaan Perpustakaan',
  'Fasilitas Tempat Ibadah',
  'Toilet Siswa Layak',
  'Fasilitas Ruang UKS',
  'Ruang Kelas Baik',
  'Ruang Kelas Rusak Ringan',
  'Ruang Kelas Rusak Berat',
];

const KAT_PILL: Record<string, { bg: string; color: string; border: string; dot: string }> = {
  Tinggi: {
    bg: '#fff1f2',
    color: '#be123c',
    border: '#fecdd3',
    dot: '#f43f5e',
  },
  Sedang: {
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
    dot: '#f59e0b',
  },
  Rendah: {
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
    dot: '#22c55e',
  },
};

function getDbiStatus(level: 'good' | 'medium' | 'poor') {
  if (level === 'good') {
    return {
      label: 'Sangat Baik',
      desc: 'Pemisahan antar kategori sangat kontras dan homogenitas internal tinggi. Hasil sangat layak dijadikan rujukan kebijakan.',
      pillBg: '#f0fdf4',
      pillColor: '#15803d',
      pillBorder: '#bbf7d0',
      dotColor: '#16a34a',
    };
  }
  if (level === 'medium') {
    return {
      label: 'Cukup Baik',
      desc: 'Batas antar kategori prioritas cukup jelas dan representatif untuk acuan penyaluran bantuan.',
      pillBg: '#fffbeb',
      pillColor: '#b45309',
      pillBorder: '#fde68a',
      dotColor: '#d97706',
    };
  }
  return {
    label: 'Perlu Ditinjau',
    desc: 'Karakteristik antar kategori masih memiliki irisan yang berdekatan. Disarankan meninjau kembali variasi data.',
    pillBg: '#fff1f2',
    pillColor: '#be123c',
    pillBorder: '#fecdd3',
    dotColor: '#e11d48',
  };
}

// ── Komponen Utama ────────────────────────────────────────────────────────────

export default function EvaluasiPage() {
  const router = useRouter();
  const [data, setData] = useState<EvaluasiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [showProfil, setShowProfil] = useState(false);
  const [showMetode, setShowMetode] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin')) {
      router.push('/login');
      return;
    }
    fetchYears();
  }, [router]);

  const fetchYears = async () => {
    try {
      const res = await apiFetch('/evaluasi.php?years=1', {}, router);
      const years: string[] = await res.json();
      setAvailableYears(Array.isArray(years) ? years : []);
      if (years.length > 0) {
        setSelectedYear(years[0]);
        fetchData(years[0]);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const fetchData = async (year: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/evaluasi.php?tahun_ajaran=${encodeURIComponent(year)}`, {}, router);
      const json: EvaluasiData = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
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
              <FlaskConical size={20} color="#2563eb" />
            </div>
            <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              Evaluasi Klasterisasi
            </h1>
          </div>
          <p className="page-subtitle" style={{ marginLeft: 48, marginTop: 2 }}>
            Pengujian validitas dan pemisahan kelompok menggunakan Davies-Bouldin Index (DBI)
          </p>
        </div>

        {availableYears.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '4px 12px',
              }}
            >
              <Calendar size={14} color="#64748b" />
              <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 500 }}>Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  fetchData(e.target.value);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Loading State ──────────────────────────────────────────────── */}
      {loading && (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <div
            style={{
              width: 26,
              height: 26,
              border: '2.5px solid #2563eb',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
            Memuat data evaluasi klasterisasi...
          </span>
        </div>
      )}

      {/* ── Belum Ada Data ─────────────────────────────────────────────── */}
      {!loading && (!data || !data.exists) && (
        <div className="card p-16 text-center" style={{ borderRadius: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <FlaskConical size={24} color="#2563eb" />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Belum Ada Data Evaluasi</h3>
          <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '6px auto 18px', lineHeight: 1.6 }}>
            {data?.message ??
              'Evaluasi kualitas dihitung secara otomatis saat proses clustering dijalankan.'}
          </p>
          <button
            onClick={() => router.push('/clustering')}
            className="btn-primary"
            style={{ fontSize: 13, padding: '8px 16px' }}
          >
            <RefreshCw size={14} /> Ke Proses Clustering
          </button>
        </div>
      )}

      {/* ── Konten Evaluasi ─────────────────────────────────────────────── */}
      {!loading && data && data.exists && (() => {
        const status = getDbiStatus(data.interpretasi.level);

        return (
          <>
            {/* ── 1. Executive Metric Strip (Sama persis dengan Kecamatan & Sekolah) ── */}
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
              {/* Metric 1: DBI Score */}
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
                  <Award size={22} color="#2563eb" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Skor Evaluasi DBI
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                      {data.dbi_score.toFixed(4)}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 12,
                        background: status.pillBg,
                        color: status.pillColor,
                        border: `1px solid ${status.pillBorder}`,
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.dotColor }} />
                      {status.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Ambang batas optimal &lt; 1.0</span>
                </div>
              </div>

              {/* Metric 2: Jumlah Kategori */}
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
                  <Layers size={22} color="#4f46e5" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Jumlah Kategori
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                    {data.n_clusters}{' '}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Prioritas</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Tinggi, Sedang, Rendah</span>
                </div>
              </div>

              {/* Metric 3: Iterasi Konvergensi */}
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
                  <RefreshCw size={22} color="#16a34a" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Iterasi Konvergensi
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                    {data.n_iterations}{' '}
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>Putaran</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Titik centroid stabil</span>
                </div>
              </div>

              {/* Metric 4: Total Inertia */}
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
                  <BarChart2 size={22} color="#d97706" />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Inertia (WCSS)
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginTop: 1 }}>
                    {data.inertia.toFixed(2)}
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Kerapatan intra-klaster</span>
                </div>
              </div>
            </div>

            {/* ── 2. Status Summary Banner (Clean & Understated) ──────────── */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 20px',
                boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: status.dotColor,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: '#334155' }}>
                  Kesimpulan: <strong>{status.desc}</strong>
                </span>
              </div>

              {/* Quiet Benchmark Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#64748b',
                }}
              >
                <span style={{ color: data.dbi_score < 1.0 ? '#15803d' : '#94a3b8', fontWeight: data.dbi_score < 1.0 ? 700 : 500 }}>
                  &lt; 1.0 Optimal
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: data.dbi_score >= 1.0 && data.dbi_score < 2.0 ? '#b45309' : '#94a3b8', fontWeight: data.dbi_score >= 1.0 && data.dbi_score < 2.0 ? 700 : 500 }}>
                  1.0 – 2.0 Layak
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ color: data.dbi_score >= 2.0 ? '#be123c' : '#94a3b8', fontWeight: data.dbi_score >= 2.0 ? 700 : 500 }}>
                  ≥ 2.0 Evaluasi
                </span>
              </div>
            </div>

            {/* ── 3. Tabel Detail Kategori Klaster ────────────────────────── */}
            <div className="card overflow-hidden" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                    Karakteristik & Evaluasi Per Kategori
                  </span>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                    Tingkat keseragaman internal (σ) dan rasio keterpisahan per kelompok
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: 80, padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Klaster
                      </th>
                      <th style={{ minWidth: 160, padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Tingkat Prioritas
                      </th>
                      <th style={{ width: 170, padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Cakupan Wilayah
                      </th>
                      <th style={{ minWidth: 180, padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Keseragaman Internal (σ)
                      </th>
                      <th style={{ width: 150, padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Rasio Keterpisahan (R_max)
                      </th>
                      <th style={{ width: 140, padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Kontribusi Bobot
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.per_cluster.map((pc) => {
                      const pill = KAT_PILL[pc.kategori] ?? KAT_PILL['Rendah'];
                      const kontribusi = ((pc.rij_max / (data.dbi_score * data.n_clusters)) * 100).toFixed(1);

                      return (
                        <tr
                          key={pc.cluster_id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.12s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                        >
                          {/* Klaster */}
                          <td style={{ padding: '13px 16px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#475569',
                                background: '#f1f5f9',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}
                            >
                              C{pc.cluster_id}
                            </span>
                          </td>

                          {/* Tingkat Prioritas */}
                          <td style={{ padding: '13px 16px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '2.5px 10px',
                                borderRadius: 14,
                                fontSize: 12,
                                fontWeight: 600,
                                background: pill.bg,
                                color: pill.color,
                                border: `1px solid ${pill.border}`,
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: pill.dot }} />
                              Prioritas {pc.kategori}
                            </span>
                          </td>

                          {/* Cakupan Wilayah */}
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>
                              {pc.jumlah_kecamatan ?? pc.n_members}{' '}
                              <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>Kecamatan</span>
                            </div>
                            {pc.total_siswa ? (
                              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                                {pc.total_siswa.toLocaleString('id-ID')} siswa
                              </div>
                            ) : null}
                          </td>

                          {/* Keseragaman Internal (σ) */}
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 50, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    borderRadius: 2,
                                    background: '#2563eb',
                                    width: `${Math.min(pc.sigma * 180, 100)}%`,
                                  }}
                                />
                              </div>
                              <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                                {pc.sigma.toFixed(4)}
                              </span>
                            </div>
                          </td>

                          {/* R_max */}
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                              {pc.rij_max.toFixed(4)}
                            </span>
                          </td>

                          {/* Kontribusi */}
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#475569' }}>
                              {kontribusi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                      <td colSpan={4} style={{ fontWeight: 600, color: '#475569', padding: '11px 16px', fontSize: 12.5 }}>
                        Rata-rata Skor Davies-Bouldin Index (DBI)
                      </td>
                      <td colSpan={2} style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, padding: '11px 16px' }}>
                        = {data.dbi_score.toFixed(4)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* ── 4. Tabel Matriks Jarak Antar Kategori ─────────────────────── */}
            <div className="card overflow-hidden" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Grid3X3 size={15} color="#2563eb" />
                    <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                      Matriks Jarak Antar Kategori (Separability)
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                    Jarak Euclidean antar centroid (nilai lebih besar menunjukkan pemisahan yang lebih tegas)
                  </p>
                </div>
              </div>

              <div style={{ padding: 18 }}>
                <div className="overflow-x-auto">
                  <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: '100%', maxWidth: 580 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 14px', color: '#64748b', fontWeight: 600, fontSize: 11.5, textAlign: 'left' }}>
                          Kategori
                        </th>
                        {data.per_cluster.map((pc) => (
                          <th
                            key={pc.cluster_id}
                            style={{
                              padding: '8px 14px',
                              textAlign: 'center',
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            Prioritas {pc.kategori}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.inter_distances.map((row, i) => {
                        const pcRow = data.per_cluster[i];
                        const maxValInRow = Math.max(...row.filter((_, idx) => idx !== i));

                        return (
                          <tr key={i}>
                            <td
                              style={{
                                padding: '9px 14px',
                                fontWeight: 600,
                                fontSize: 12.5,
                                color: '#334155',
                                borderRight: '1px solid #e2e8f0',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              Prioritas {pcRow?.kategori}
                            </td>
                            {row.map((val, j) => {
                              const isDiag = i === j;
                              const isMax = !isDiag && val === maxValInRow && val > 0;

                              return (
                                <td
                                  key={j}
                                  style={{
                                    padding: '9px 16px',
                                    textAlign: 'center',
                                    fontFamily: 'monospace',
                                    fontSize: 12.5,
                                    fontWeight: isDiag ? 400 : isMax ? 700 : 500,
                                    color: isDiag ? '#94a3b8' : isMax ? '#1d4ed8' : '#0f172a',
                                    background: isDiag ? '#f8fafc' : isMax ? '#eff6ff' : '#ffffff',
                                    border: '1px solid #f1f5f9',
                                    borderRadius: 4,
                                  }}
                                >
                                  {isDiag ? '—' : val.toFixed(4)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ── 5. Profil 11 Indikator (Collapsible) ─────────────────────── */}
            <div className="card overflow-hidden" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <button
                onClick={() => setShowProfil(!showProfil)}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: showProfil ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={15} color="#64748b" />
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                    Profil Rata-Rata 11 Indikator (Nilai Centroid)
                  </span>
                </div>
                {showProfil ? <ChevronUp size={15} color="#64748b" /> : <ChevronDown size={15} color="#64748b" />}
              </button>

              {showProfil && (
                <div style={{ padding: 18 }}>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                    Nilai rata-rata tiap indikator setelah dinormalisasi (rentang 0 – 1):
                  </p>
                  <div className="overflow-x-auto">
                    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>
                            Indikator Satuan Pendidikan
                          </th>
                          {data.per_cluster.map((pc) => (
                            <th
                              key={pc.cluster_id}
                              style={{
                                padding: '8px 14px',
                                textAlign: 'center',
                                color: '#334155',
                                fontWeight: 600,
                              }}
                            >
                              Prioritas {pc.kategori}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {INDIKATOR_LABELS.map((label, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '7px 12px', color: '#334155', fontWeight: 500 }}>{label}</td>
                            {data.centroids.map((centroid, ci) => (
                              <td
                                key={ci}
                                style={{
                                  padding: '7px 14px',
                                  textAlign: 'center',
                                  fontFamily: 'monospace',
                                  color: '#0f172a',
                                  fontWeight: 500,
                                }}
                              >
                                {centroid[idx]?.toFixed(4) ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* ── 6. Metodologi & Rumus (Collapsible) ───────────────────────── */}
            <div className="card overflow-hidden" style={{ border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <button
                onClick={() => setShowMetode(!showMetode)}
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  borderBottom: showMetode ? '1px solid #e2e8f0' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={15} color="#64748b" />
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                    Metodologi Perhitungan Davies-Bouldin Index
                  </span>
                </div>
                {showMetode ? <ChevronUp size={15} color="#64748b" /> : <ChevronDown size={15} color="#64748b" />}
              </button>

              {showMetode && (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Davies-Bouldin Index (David L. Davies & Donald W. Bouldin, 1979) mengukur rasio antara penyebaran internal kelompok (σ) dengan jarak pemisah antar pusat centroid (d). Nilai yang lebih kecil mengindikasikan cluster yang lebih padat dan terpisah dengan baik.
                  </p>

                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: '#1e293b',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      borderRadius: 6,
                    }}
                  >
                    {'DBI = (1 / k) × Σ [ max ( (σᵢ + σⱼ) / d(Cᵢ, Cⱼ) ) ]'}
                  </div>

                  <div style={{ fontSize: 12, color: '#64748b', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span><strong>k</strong> = Jumlah cluster ({data.n_clusters})</span>
                    <span><strong>σ</strong> = Rata-rata jarak anggota klaster ke centroid</span>
                    <span><strong>d</strong> = Jarak Euclidean antar centroid</span>
                  </div>
                </div>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
