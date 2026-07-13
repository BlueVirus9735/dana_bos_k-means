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
  Tinggi: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', bar: '#ef4444', text: '#ef4444' },
  Sedang: { bg: 'rgba(251,191,36,0.12)', color: 'var(--amber)', border: 'rgba(251,191,36,0.3)', bar: 'var(--amber)', text: 'var(--amber)' },
  Rendah: { bg: 'rgba(52,211,153,0.12)', color: 'var(--green)', border: 'rgba(52,211,153,0.3)', bar: 'var(--green)', text: 'var(--green)' },
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
                  style={{ background: filterKategori === kat ? style.bg : undefined, border: filterKategori === kat ? `1px solid ${style.border}` : '1px solid var(--border)' }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: style.text }}>{count}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>Kebutuhan {kat}</div>
                  <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: style.bar, width: `${(count / total) * 100}%` }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{((count / total) * 100).toFixed(0)}% dari total</div>
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b" style={{ borderColor: 'var(--border-muted)' }}>
              {[
                { key: 'ranking', label: 'Ranking Prioritas', icon: TrendingUp },
                { key: 'tabel', label: 'Tabel Lengkap', icon: List },
                { key: 'peta', label: 'Peta Persebaran', icon: Map },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'ranking' | 'tabel' | 'peta')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', fontSize: 13, fontWeight: 500,
                    borderBottom: activeTab === key ? '2px solid var(--accent)' : '2px solid transparent',
                    color: activeTab === key ? 'var(--accent)' : 'var(--text-secondary)',
                    background: activeTab === key ? 'var(--accent-muted)' : 'transparent',
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
                    style={{ fontSize: 12, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Filter: <span style={{ fontWeight: 600 }}>{filterKategori}</span> ✕
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
                            <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, margin: '0 auto', background: item.rank <= 3 ? 'var(--amber-bg)' : 'var(--bg-elevated)', color: item.rank <= 3 ? 'var(--amber)' : 'var(--text-muted)' }}>
                              {item.rank}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.nama_kecamatan}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                              background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                              whiteSpace: 'nowrap',
                            }}>{item.kategori_nama}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 3, background: 'var(--accent)', width: `${item.priority_score}%` }} />
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500 }} className="tabular-nums">{item.priority_score}</span>
                            </div>
                          </td>
                          <td className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{item.jumlah_siswa_total.toLocaleString('id-ID')}</td>
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
                            <tr style={{ background: isExpanded ? 'var(--bg-hover)' : undefined }}>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{index + 1}</td>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.nama_kecamatan}</td>
                            <td>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: style.bg, color: style.color, border: `1px solid ${style.border}`,
                                whiteSpace: 'nowrap',
                              }}>{item.kategori_nama}</span>
                            </td>
                            <td className="tabular-nums">{item.jumlah_siswa_total.toLocaleString('id-ID')}</td>
                            <td>
                              <div style={{ fontWeight: 600, marginBottom: 2 }} className="tabular-nums">{item.jumlah_ruang_kelas_total.toLocaleString('id-ID')}</div>
                              <div className="flex items-center gap-1" style={{ fontSize: 10 }}>
                                <span style={{ padding: '1px 4px', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: 'var(--green)', border: '1px solid rgba(52,211,153,0.3)' }}>{item.ruang_kelas_baik_total}</span>
                                <span style={{ padding: '1px 4px', borderRadius: 4, background: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: '1px solid rgba(251,191,36,0.3)' }}>{item.ruang_kelas_rusak_ringan_total}</span>
                                <span style={{ padding: '1px 4px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>{item.ruang_kelas_rusak_berat_total}</span>
                              </div>
                            </td>
                            <td>
                              <div className="tabular-nums font-medium" style={{ color: 'var(--accent-hover)' }}>
                                {item.fasilitas_lapangan_olahraga_total + item.fasilitas_perpustakaan_total + item.fasilitas_uks_total + item.fasilitas_toilet_total + item.fasilitas_tempat_ibadah_total}
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>item</span>
                              </div>
                            </td>
                            <td className="tabular-nums text-sm">Rp {item.total_dana_bos_total.toLocaleString('id-ID')}</td>
                            <td className="tabular-nums text-sm">Rp {item.alokasi_dana_sarpras_total.toLocaleString('id-ID')}</td>
                            <td>
                              <button 
                                onClick={() => setExpandedKecamatan(isExpanded ? null : item.kecamatan_id)}
                                style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-hover)', background: isExpanded ? 'var(--bg-hover)' : 'transparent', padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer' }}
                              >
                                {isExpanded ? 'Tutup' : 'Lihat Sekolah'}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded Row for Schools */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} style={{ padding: 0, borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-hover)' }}>
                                <div style={{ padding: '16px', paddingLeft: '64px' }}>
                                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                                    <div style={{ background: 'var(--bg-hover)', padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <h5 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Daftar Sekolah di {item.nama_kecamatan}
                                      </h5>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                        {kecamatanSchools.length} Sekolah
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}>
                                          <tr>
                                            <th className="px-4 py-2 font-medium text-left">NPSN</th>
                                            <th className="px-4 py-2 font-medium text-left">Nama Sekolah</th>
                                            <th className="px-4 py-2 font-medium text-left">Jenjang</th>
                                            <th className="px-4 py-2 font-medium text-right">Siswa</th>
                                            <th className="px-4 py-2 font-medium text-right">Dana BOS</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {kecamatanSchools.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-4 text-center" style={{ color: 'var(--text-muted)' }}>Tidak ada data sekolah</td></tr>
                                          ) : (
                                            kecamatanSchools.map(school => (
                                              <tr key={school.sekolah_id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                                                <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{school.npsn}</td>
                                                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>{school.nama_sekolah}</td>
                                                <td className="px-4 py-2.5">
                                                  <span style={{
                                                    fontSize: 10, padding: '2px 6px', borderRadius: 12, fontWeight: 600,
                                                    background: school.jenjang === 'SD' ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.12)',
                                                    color: school.jenjang === 'SD' ? 'var(--green)' : 'var(--amber)',
                                                    border: `1px solid ${school.jenjang === 'SD' ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                                  }}>
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
