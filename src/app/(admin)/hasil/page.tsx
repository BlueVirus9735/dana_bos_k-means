'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Map, List, TrendingUp } from 'lucide-react';
import ClusterMap from '@/components/ClusterMap';

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

const CATEGORY_STYLES: Record<string, { badge: string; card: string; bar: string; text: string }> = {
  Tinggi: { badge: 'bg-red-100 text-rose-400', card: 'bg-rose-500/10 border-rose-500/20', bar: 'bg-red-500', text: 'text-red-600' },
  Sedang: { badge: 'bg-amber-100 text-amber-400', card: 'bg-amber-500/10 border-amber-200', bar: 'bg-amber-500', text: 'text-amber-600' },
  Rendah: { badge: 'bg-green-100 text-emerald-400', card: 'bg-emerald-500/10 border-emerald-500/20', bar: 'bg-green-500', text: 'text-emerald-400' },
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
      const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });
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
        fetch(`http://localhost:8000/clustering.php?tahun_ajaran=${year}`, { credentials: 'include' }),
        fetch(`http://localhost:8000/ranking.php?tahun_ajaran=${year}`, { credentials: 'include' }),
        fetch(`http://localhost:8000/data_bos.php?tahun_ajaran=${year}`, { credentials: 'include' }),
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
            <span className="h-9 w-9 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600">
              <BarChart3 size={20} />
            </span>
            Hasil Clustering
          </h1>
          <p className="page-subtitle mt-1">Analisis pengelompokan kebutuhan sarana prasarana per kecamatan</p>
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
          <div className="h-6 w-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-slate-400 font-medium">Memuat data...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="card p-16 text-center">
          <BarChart3 size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-200">Belum ada hasil clustering</h3>
          <p className="text-slate-400 text-sm mt-1">Jalankan proses clustering terlebih dahulu di menu Proses Clustering</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            {['Tinggi', 'Sedang', 'Rendah'].map((kat) => {
              const count = results.filter((r) => r.kategori_nama === kat).length;
              const total = results.length;
              const style = CATEGORY_STYLES[kat];
              return (
                <button
                  key={kat}
                  onClick={() => setFilterKategori(filterKategori === kat ? '' : kat)}
                  className={`card p-5 text-left transition-all hover:-translate-y-0.5 border-2 ${
                    filterKategori === kat ? `${style.card} border-current` : 'border-transparent hover:border-white/10'
                  }`}
                >
                  <div className={`text-3xl font-bold ${style.text}`}>{count}</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1">Kebutuhan {kat}</div>
                  <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{((count / total) * 100).toFixed(0)}% dari total</div>
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-white/10">
              {[
                { key: 'ranking', label: 'Ranking Prioritas', icon: TrendingUp },
                { key: 'tabel', label: 'Tabel Lengkap', icon: List },
                { key: 'peta', label: 'Peta Persebaran', icon: Map },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as 'ranking' | 'tabel' | 'peta')}
                  className={[
                    'flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2',
                    activeTab === key
                      ? 'text-indigo-400 border-blue-600 bg-indigo-500/10/30'
                      : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50',
                  ].join(' ')}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
              {filterKategori && (
                <div className="ml-auto flex items-center pr-4">
                  <button
                    onClick={() => setFilterKategori('')}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    Filter: <span className="font-semibold">{filterKategori}</span> ✕
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
                      const style = CATEGORY_STYLES[item.kategori_nama] ?? CATEGORY_STYLES['Rendah'];
                      return (
                        <tr key={item.id}>
                          <td>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold mx-auto ${
                              item.rank <= 3 ? 'bg-amber-100 text-amber-400' : 'bg-slate-100 text-slate-300'
                            }`}>
                              {item.rank}
                            </span>
                          </td>
                          <td className="font-semibold text-slate-100">{item.nama_kecamatan}</td>
                          <td>
                            <span className={`badge ${style.badge}`}>{item.kategori_nama}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.priority_score}%` }} />
                              </div>
                              <span className="text-sm font-medium tabular-nums">{item.priority_score}</span>
                            </div>
                          </td>
                          <td className="tabular-nums text-slate-200">{item.jumlah_siswa_total.toLocaleString('id-ID')}</td>
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
                        const style = CATEGORY_STYLES[item.kategori_nama] ?? CATEGORY_STYLES['Rendah'];
                        const isExpanded = expandedKecamatan === item.kecamatan_id;
                        const kecamatanSchools = schoolsData.filter(s => s.kecamatan_id === item.kecamatan_id);
                        
                        return (
                          <React.Fragment key={item.id}>
                            <tr className={isExpanded ? 'bg-indigo-500/10/30' : ''}>
                            <td className="text-slate-400 text-sm">{index + 1}</td>
                            <td className="font-semibold text-slate-100">{item.nama_kecamatan}</td>
                            <td><span className={`badge ${style.badge}`}>{item.kategori_nama}</span></td>
                            <td className="tabular-nums">{item.jumlah_siswa_total.toLocaleString('id-ID')}</td>
                            <td>
                              <div className="tabular-nums font-semibold mb-0.5">{item.jumlah_ruang_kelas_total.toLocaleString('id-ID')}</div>
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">{item.ruang_kelas_baik_total}</span>
                                <span className="text-amber-600 bg-amber-500/10 px-1 rounded">{item.ruang_kelas_rusak_ringan_total}</span>
                                <span className="text-red-600 bg-rose-500/10 px-1 rounded">{item.ruang_kelas_rusak_berat_total}</span>
                              </div>
                            </td>
                            <td>
                              <div className="tabular-nums font-medium text-indigo-400">
                                {item.fasilitas_lapangan_olahraga_total + item.fasilitas_perpustakaan_total + item.fasilitas_uks_total + item.fasilitas_toilet_total + item.fasilitas_tempat_ibadah_total}
                                <span className="text-[10px] text-slate-400 font-normal ml-1">item</span>
                              </div>
                            </td>
                            <td className="tabular-nums text-sm">Rp {item.total_dana_bos_total.toLocaleString('id-ID')}</td>
                            <td className="tabular-nums text-sm">Rp {item.alokasi_dana_sarpras_total.toLocaleString('id-ID')}</td>
                            <td>
                              <button 
                                onClick={() => setExpandedKecamatan(isExpanded ? null : item.kecamatan_id)}
                                className="text-xs font-semibold text-indigo-400 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                              >
                                {isExpanded ? 'Tutup' : 'Lihat Sekolah'}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded Row for Schools */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="p-0 border-b border-white/10 bg-slate-800/50/50">
                                <div className="p-4 sm:pl-16">
                                  <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden shadow-sm">
                                    <div className="bg-slate-800/50 px-4 py-2.5 border-b border-white/10 flex justify-between items-center">
                                      <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                                        Daftar Sekolah di {item.nama_kecamatan}
                                      </h5>
                                      <span className="text-xs font-semibold text-slate-400 bg-slate-900/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                                        {kecamatanSchools.length} Sekolah
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead className="bg-slate-900/60 backdrop-blur-md text-slate-400 border-b border-white/10 text-xs">
                                          <tr>
                                            <th className="px-4 py-2 font-medium text-left">NPSN</th>
                                            <th className="px-4 py-2 font-medium text-left">Nama Sekolah</th>
                                            <th className="px-4 py-2 font-medium text-left">Jenjang</th>
                                            <th className="px-4 py-2 font-medium text-right">Siswa</th>
                                            <th className="px-4 py-2 font-medium text-right">Dana BOS</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {kecamatanSchools.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-400">Tidak ada data sekolah</td></tr>
                                          ) : (
                                            kecamatanSchools.map(school => (
                                              <tr key={school.sekolah_id} className="hover:bg-slate-800/50/50">
                                                <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{school.npsn}</td>
                                                <td className="px-4 py-2.5 font-semibold text-slate-200">{school.nama_sekolah}</td>
                                                <td className="px-4 py-2.5">
                                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${school.jenjang === 'SD' ? 'bg-green-100 text-emerald-400' : 'bg-orange-100 text-orange-700'}`}>
                                                    {school.jenjang}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">{school.jumlah_siswa.toLocaleString('id-ID')}</td>
                                                <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-200">Rp {Number(school.total_dana_bos).toLocaleString('id-ID')}</td>
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
