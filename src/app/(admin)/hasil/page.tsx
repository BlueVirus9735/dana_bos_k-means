'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Map, List, TrendingUp } from 'lucide-react';
import ClusterMap from '@/components/ClusterMap';
import { apiFetch } from '@/lib/api';

interface ClusterResult {
  id: number;
  kecamatan_id: number;
  nama_kecamatan: string;
  cluster_kategori: number;
  kategori_nama: string;
  nilai_cluster: number;
  jumlah_siswa_total: number;
  ruang_kelas_baik_total: number;
  ruang_kelas_rusak_ringan_total: number;
  ruang_kelas_rusak_berat_total: number;
  jumlah_ruang_kelas_total: number;
  fasilitas_lapangan_olahraga_total: number;
  fasilitas_perpustakaan_total: number;
  fasilitas_uks_total: number;
  fasilitas_toilet_total: number;
  fasilitas_tempat_ibadah_total: number;
  total_dana_bos_total: number;
  alokasi_dana_sarpras_total: number;
}

interface RankingData {
  ranking: Array<{
    rank: number;
    id: number;
    nama_kecamatan: string;
    kategori_nama: string;
    priority_score: number;
    jumlah_siswa_total: number;
    cluster_kategori: number;
    latitude: number | null;
    longitude: number | null;
  }>;
  category_stats: Array<{
    cluster_kategori: number;
    kategori_nama: string;
    count: number;
    avg_priority_score: number;
  }>;
}

const KAT: Record<string, { bg: string; color: string; border: string; bar: string; text: string }> = {
  Tinggi: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', bar: '#ef4444', text: '#b91c1c' },
  Sedang: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', bar: '#f59e0b', text: '#b45309' },
  Rendah: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', bar: '#10b981', text: '#15803d' },
};

export default function HasilPage() {
  const router = useRouter();
  const [results, setResults] = useState<ClusterResult[]>([]);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [filterKategori, setFilterKategori] = useState('');
  const [activeTab, setActiveTab] = useState<'ranking' | 'tabel' | 'peta'>('ranking');
  const [expandedKecamatan, setExpandedKecamatan] = useState<number | null>(null);
  const [schoolsData, setSchoolsData] = useState<any[]>([]);
  const [schoolClusterData, setSchoolClusterData] = useState<Record<number, any>>({});
  const [loadingCluster, setLoadingCluster] = useState<Record<number, boolean>>({});
  const [clusterViewActive, setClusterViewActive] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) { router.push('/login'); return; }
    fetchAvailableYears();
  }, [router]);

  const fetchAvailableYears = async () => {
    try {
      const response = await apiFetch('/dashboard.php', {}, router);
      if (!response.ok) return;
      const data = await response.json();
      setAvailableYears(data.available_years || []);
      if (data.available_years?.length > 0) {
        setSelectedYear(data.available_years[0]);
        fetchData(data.available_years[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
      setLoading(false);
    }
  };

  const fetchData = async (year: string) => {
    setLoading(true);
    try {
      const [resultsRes, rankingRes, schoolsRes] = await Promise.all([
        apiFetch(`/clustering.php?tahun_ajaran=${year}`, {}, router),
        apiFetch(`/ranking.php?tahun_ajaran=${year}`, {}, router),
        apiFetch(`/data_bos.php?tahun_ajaran=${year}`, {}, router),
      ]);
      const resultsData = await resultsRes.json();
      const rankingData = await rankingRes.json();
      const schools = await schoolsRes.json();
      
      setResults(Array.isArray(resultsData) ? resultsData : []);
      setRanking(rankingData);
      setSchoolsData(Array.isArray(schools) ? schools : []);
      setExpandedKecamatan(null);
      setSchoolClusterData({});
      setLoadingCluster({});
      setClusterViewActive({});
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolCluster = async (kecamatanId: number) => {
    if (loadingCluster[kecamatanId]) return;
    setLoadingCluster((prev) => ({ ...prev, [kecamatanId]: true }));
    try {
      const res = await apiFetch(
        `/sekolah_clustering.php?kecamatan_id=${kecamatanId}&tahun_ajaran=${encodeURIComponent(selectedYear)}`,
        {},
        router
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        setSchoolClusterData((prev) => ({ ...prev, [kecamatanId]: { error: data.error || 'Gagal memuat data' } }));
      } else {
        setSchoolClusterData((prev) => ({ ...prev, [kecamatanId]: data }));
        setClusterViewActive((prev) => ({ ...prev, [kecamatanId]: true }));
      }
    } catch {
      setSchoolClusterData((prev) => ({ ...prev, [kecamatanId]: { error: 'Gagal terhubung ke server' } }));
    } finally {
      setLoadingCluster((prev) => ({ ...prev, [kecamatanId]: false }));
    }
  };

  const toggleClusterView = (kecamatanId: number) => {
    setClusterViewActive((prev) => ({ ...prev, [kecamatanId]: !prev[kecamatanId] }));
  };


  const filteredResults = filterKategori
    ? results.filter((r) => r.kategori_nama === filterKategori)
    : results;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--accent-hover)]" />
            Hasil Clustering
          </h1>
          <p className="page-subtitle">Analisis pengelompokan kebutuhan sarana prasarana per kecamatan</p>
        </div>

        {availableYears.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400 font-medium hidden sm:block">Tahun Ajaran:</label>
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); fetchData(e.target.value); }}
              className="form-input py-2 w-auto"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center gap-3">
          <div className="h-6 w-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Memuat data...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="card p-16 text-center">
          <BarChart3 size={40} color="var(--text-muted)" className="mx-auto mb-3" />
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Belum ada hasil clustering</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Jalankan proses clustering terlebih dahulu di menu Proses Clustering</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {['Tinggi', 'Sedang', 'Rendah'].map((kat) => {
              const count = results.filter((r) => r.kategori_nama === kat).length;
              const total = results.length;
              const style = KAT[kat] || KAT['Rendah'];
              return (
                <button
                  key={kat}
                  onClick={() => setFilterKategori(filterKategori === kat ? '' : kat)}
                  className="card p-5 text-left transition-all"
                  style={{
                    background: filterKategori === kat ? style.bg : '#ffffff',
                    border: filterKategori === kat ? `1px solid ${style.border}` : '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.05)',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: style.text }}>{count}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 4 }}>Kebutuhan {kat}</div>
                  <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: style.bar, width: `${(count / total) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{((count / total) * 100).toFixed(0)}% dari total</div>
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
            <div className="flex border-b" style={{ borderColor: '#e2e8f0', background: '#ffffff' }}>
              {[
                { key: 'ranking', label: 'Ranking Prioritas', icon: TrendingUp },
                { key: 'tabel', label: 'Tabel Lengkap', icon: List },
                { key: 'peta', label: 'Peta Persebaran', icon: Map },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'ranking' | 'tabel' | 'peta')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', fontSize: 13, fontWeight: 600,
                    borderBottom: activeTab === key ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === key ? '#2563eb' : '#64748b',
                    background: activeTab === key ? '#eff6ff' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
              {filterKategori && (
                <div className="ml-auto flex items-center pr-4">
                  <button
                    onClick={() => setFilterKategori('')}
                    style={{ fontSize: 12, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Filter: <span style={{ fontWeight: 600, color: '#0f172a' }}>{filterKategori}</span> ✕
                  </button>
                </div>
              )}
            </div>

            {/* Tab: Ranking */}
            {activeTab === 'ranking' && ranking && (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 64 }}>Rank</th>
                      <th>Kecamatan</th>
                      <th>Kategori</th>
                      <th>Skor Prioritas</th>
                      <th>Jumlah Siswa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.ranking.map((item) => {
                      const style = KAT[item.kategori_nama] ?? KAT['Rendah'];
                      return (
                        <tr key={item.id}>
                          <td>
                            <span style={{
                              width: 32, height: 32, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, margin: '0 auto',
                              background: item.rank === 1 ? '#fef3c7' : item.rank === 2 ? '#f1f5f9' : item.rank === 3 ? '#ffedd5' : '#f8fafc',
                              color: item.rank === 1 ? '#b45309' : item.rank === 2 ? '#475569' : item.rank === 3 ? '#c2410c' : '#64748b',
                              border: item.rank === 1 ? '1px solid #fde68a' : item.rank === 2 ? '1px solid #cbd5e1' : item.rank === 3 ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                            }}>
                              {item.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.nama_kecamatan}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                              background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                              whiteSpace: 'nowrap',
                            }}>{item.kategori_nama}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 80, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 3, background: style.bar, width: `${item.priority_score * 100}%` }} />
                              </div>
                              <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                                {(item.priority_score * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="tabular-nums" style={{ color: '#0f172a' }}>{item.jumlah_siswa_total.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Tabel */}
            {activeTab === 'tabel' && (
              <div className="overflow-x-auto">
                {filteredResults.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">Tidak ada data untuk ditampilkan</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 48 }}>No</th>
                        <th>Kecamatan</th>
                        <th>Kategori</th>
                        <th>Siswa</th>
                        <th>R. Kelas (B/R/B)</th>
                        <th>Fasilitas</th>
                        <th>Dana BOS</th>
                        <th>Alokasi Dana</th>
                        <th style={{ width: 100 }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResults.map((item, index) => {
                        const style = KAT[item.kategori_nama] ?? KAT['Rendah'];
                        const isExpanded = expandedKecamatan === item.kecamatan_id;
                        const kecamatanSchools = schoolsData.filter(s => s.kecamatan_id === item.kecamatan_id);
                        
                        return (
                          <React.Fragment key={item.id}>
                            <tr style={{ background: isExpanded ? '#f8fafc' : '#ffffff' }}>
                            <td style={{ color: '#64748b', fontSize: 13 }}>{index + 1}</td>
                            <td style={{ fontWeight: 600, color: '#0f172a' }}>{item.nama_kecamatan}</td>
                            <td>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                                whiteSpace: 'nowrap',
                              }}>{item.kategori_nama}</span>
                            </td>
                            <td className="tabular-nums" style={{ color: '#0f172a' }}>{item.jumlah_siswa_total.toLocaleString('id-ID')}</td>
                            <td>
                              <div style={{ fontWeight: 600, marginBottom: 2, color: '#0f172a' }} className="tabular-nums">{item.jumlah_ruang_kelas_total.toLocaleString('id-ID')}</div>
                              <div style={{ display: 'flex', gap: 4, fontSize: 10 }}>
                                <span style={{ padding: '1px 5px', borderRadius: 4, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 600 }}>{item.ruang_kelas_baik_total}</span>
                                <span style={{ padding: '1px 5px', borderRadius: 4, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontWeight: 600 }}>{item.ruang_kelas_rusak_ringan_total}</span>
                                <span style={{ padding: '1px 5px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600 }}>{item.ruang_kelas_rusak_berat_total}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, color: '#0f172a' }}>
                                <span style={{ fontWeight: 700, color: '#2563eb' }}>
                                  {(item.fasilitas_lapangan_olahraga_total || 0) + (item.fasilitas_perpustakaan_total || 0) + (item.fasilitas_uks_total || 0) + (item.fasilitas_toilet_total || 0) + (item.fasilitas_tempat_ibadah_total || 0)}
                                </span>
                                <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>item</span>
                              </div>
                            </td>
                            <td className="tabular-nums text-sm" style={{ color: '#0f172a' }}>Rp {item.total_dana_bos_total.toLocaleString('id-ID')}</td>
                            <td className="tabular-nums text-sm font-medium" style={{ color: '#0f172a' }}>Rp {item.alokasi_dana_sarpras_total.toLocaleString('id-ID')}</td>
                            <td>
                              <button 
                                onClick={() => setExpandedKecamatan(isExpanded ? null : item.kecamatan_id)}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: isExpanded ? '#ffffff' : '#2563eb',
                                  background: isExpanded ? '#2563eb' : '#eff6ff',
                                  padding: '6px 14px',
                                  borderRadius: 'var(--radius)',
                                  border: isExpanded ? '1px solid #2563eb' : '1px solid #bfdbfe',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {isExpanded ? 'Tutup' : 'Lihat Sekolah'}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded Row for Schools */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <div style={{ padding: '16px', paddingLeft: '64px' }}>
                                  <div style={{ background: '#ffffff', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>

                                    {/* ── Header expanded ─────────────────────── */}
                                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <h5 style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Sekolah di {item.nama_kecamatan}
                                      </h5>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', background: '#ffffff', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                                          {kecamatanSchools.length} Sekolah
                                        </span>

                                        {/* Tombol cluster / toggle */}
                                        {!schoolClusterData[item.kecamatan_id] ? (
                                          <button
                                            onClick={() => fetchSchoolCluster(item.kecamatan_id)}
                                            disabled={loadingCluster[item.kecamatan_id]}
                                            style={{
                                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 'var(--radius)',
                                              background: '#eff6ff', color: '#1d4ed8',
                                              border: '1px solid #bfdbfe', cursor: 'pointer',
                                              display: 'flex', alignItems: 'center', gap: 6,
                                              opacity: loadingCluster[item.kecamatan_id] ? 0.6 : 1,
                                            }}
                                          >
                                            {loadingCluster[item.kecamatan_id] ? (
                                              <><div style={{ width: 10, height: 10, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Memproses...</>
                                            ) : (
                                              <>🔍 Cluster Sekolah</>
                                            )}
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => toggleClusterView(item.kecamatan_id)}
                                            style={{
                                              fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 'var(--radius)',
                                              background: clusterViewActive[item.kecamatan_id] ? '#eff6ff' : '#ffffff',
                                              color: clusterViewActive[item.kecamatan_id] ? '#1d4ed8' : '#475569',
                                              border: `1px solid ${clusterViewActive[item.kecamatan_id] ? '#bfdbfe' : '#cbd5e1'}`,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            {clusterViewActive[item.kecamatan_id] ? '📋 Tampilan Biasa' : '🔍 Tampilan Cluster'}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* ── Error cluster ───────────────────────── */}
                                    {schoolClusterData[item.kecamatan_id]?.error && (
                                      <div style={{ padding: '10px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: 12, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        ⚠️ {schoolClusterData[item.kecamatan_id].error}
                                      </div>
                                    )}

                                    {/* ── Warning data tidak lengkap ──────────── */}
                                    {schoolClusterData[item.kecamatan_id]?.warning && (
                                      <div style={{ padding: '8px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        ⚠️ {schoolClusterData[item.kecamatan_id].warning}
                                      </div>
                                    )}

                                    {/* ── Summary badge cluster ────────────────── */}
                                    {clusterViewActive[item.kecamatan_id] && schoolClusterData[item.kecamatan_id] && !schoolClusterData[item.kecamatan_id].error && (() => {
                                      const cd = schoolClusterData[item.kecamatan_id];
                                      const sum = cd.summary ?? {};
                                      return (
                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasil Cluster:</span>
                                          {[
                                            { key: 'c3_prioritas', label: 'Prioritas Utama', count: sum.c3_prioritas ?? 0, color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                                            { key: 'c2_perhatian', label: 'Perlu Perhatian', count: sum.c2_perhatian ?? 0, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                                            { key: 'c1_mandiri',   label: 'Mandiri',         count: sum.c1_mandiri ?? 0,   color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                                          ].map(({ key, label, count, color, bg, border }) => (
                                            <span key={key} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: bg, color, border: `1px solid ${border}` }}>
                                              {count} {label}
                                            </span>
                                          ))}
                                          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>
                                            · {cd.n_iterations} iterasi · DBI: <strong>{cd.dbi_score?.toFixed(4) ?? '—'}</strong>
                                          </span>
                                        </div>
                                      );
                                    })()}

                                    {/* ── Tabel Sekolah ───────────────────────── */}
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}>
                                          <tr>
                                            {clusterViewActive[item.kecamatan_id] && <th className="px-4 py-2 font-medium text-center" style={{ width: 40 }}>#</th>}
                                            <th className="px-4 py-2 font-medium text-left">NPSN</th>
                                            <th className="px-4 py-2 font-medium text-left">Nama Sekolah</th>
                                            <th className="px-4 py-2 font-medium text-left">Jenjang</th>
                                            {clusterViewActive[item.kecamatan_id] && <th className="px-4 py-2 font-medium text-left">Prioritas</th>}
                                            <th className="px-4 py-2 font-medium text-right">Siswa</th>
                                            <th className="px-4 py-2 font-medium text-right">Dana BOS</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {kecamatanSchools.length === 0 ? (
                                            <tr><td colSpan={clusterViewActive[item.kecamatan_id] ? 7 : 5} className="px-4 py-4 text-center" style={{ color: 'var(--text-muted)' }}>Tidak ada data sekolah</td></tr>
                                          ) : clusterViewActive[item.kecamatan_id] && schoolClusterData[item.kecamatan_id]?.sekolah_results ? (
                                            // ── Tampilan Cluster ────────────────
                                            schoolClusterData[item.kecamatan_id].sekolah_results.map((sr: any) => {
                                              const katStyle: Record<string, { bg: string; color: string; border: string }> = {
                                                'Prioritas Utama': { bg: 'rgba(239,68,68,0.10)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
                                                'Perlu Perhatian': { bg: 'rgba(251,191,36,0.10)', color: 'var(--amber)', border: 'rgba(251,191,36,0.3)' },
                                                'Mandiri':         { bg: 'rgba(52,211,153,0.10)', color: 'var(--green)', border: 'rgba(52,211,153,0.3)' },
                                              };
                                              const ks = katStyle[sr.kategori] ?? katStyle['Mandiri'];
                                              // Highlight baris prioritas utama
                                              const rowBg = sr.cluster_id === 3 ? 'rgba(239,68,68,0.03)' : undefined;
                                              return (
                                                <tr key={sr.sekolah_id} style={{ borderBottom: '1px solid var(--border-muted)', background: rowBg }}>
                                                  <td className="px-4 py-2 text-center tabular-nums" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{sr.rank}</td>
                                                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{sr.npsn}</td>
                                                  <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{sr.nama_sekolah}</td>
                                                  <td className="px-4 py-2.5">
                                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, fontWeight: 600, background: sr.jenjang === 'SD' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: sr.jenjang === 'SD' ? 'var(--green)' : 'var(--amber)', border: `1px solid ${sr.jenjang === 'SD' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                                                      {sr.jenjang}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2.5">
                                                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ks.bg, color: ks.color, border: `1px solid ${ks.border}`, whiteSpace: 'nowrap' }}>
                                                      {sr.kategori}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{Number(sr.jumlah_siswa).toLocaleString('id-ID')}</td>
                                                  <td className="px-4 py-2.5 text-right tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>Rp {Number(sr.total_dana_bos).toLocaleString('id-ID')}</td>
                                                </tr>
                                              );
                                            })
                                          ) : (
                                            // ── Tampilan Biasa ──────────────────
                                            kecamatanSchools.map(school => (
                                              <tr key={school.sekolah_id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                                                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{school.npsn}</td>
                                                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{school.nama_sekolah}</td>
                                                <td className="px-4 py-2.5">
                                                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, fontWeight: 600, background: school.jenjang === 'SD' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)', color: school.jenjang === 'SD' ? 'var(--green)' : 'var(--amber)', border: `1px solid ${school.jenjang === 'SD' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
                                                    {school.jenjang}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{school.jumlah_siswa.toLocaleString('id-ID')}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>Rp {Number(school.total_dana_bos).toLocaleString('id-ID')}</td>
                                              </tr>
                                            ))
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>

                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Peta */}
            {activeTab === 'peta' && (
              <div className="p-6">
                {ranking ? (
                  <ClusterMap data={ranking.ranking} />
                ) : (
                  <div className="py-16 text-center text-slate-400">Data peta tidak tersedia</div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
