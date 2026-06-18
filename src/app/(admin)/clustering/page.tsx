'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Play, CheckCircle2, AlertTriangle, ChevronRight, Layers, Activity } from 'lucide-react';

interface ClusterResult {
  kecamatan: string;
  kategori_nama: string;
  cluster_kategori: number;
  data: number[];
}

interface ClusteringResult {
  tahun_ajaran: string;
  results: {
    n_clusters: number;
    inertia: number;
    kecamatan_results: ClusterResult[];
  };
}

export default function ClusteringPage() {
  const router = useRouter();
  const [tahunAjaran, setTahunAjaran] = useState('');
  const [nClusters, setNClusters] = useState(3);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ClusteringResult | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      router.push('/login');
      return;
    }
    fetchAvailableYears();
  }, [router]);

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch('http://localhost:8000/dashboard.php', { credentials: 'include' });
      const data = await response.json();
      setAvailableYears(data.available_years || []);
      if (data.available_years?.length > 0) {
        setTahunAjaran(data.available_years[0]);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const handleClustering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tahunAjaran) return;

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/clustering.php', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tahun_ajaran: tahunAjaran, n_clusters: nClusters }),
      });

      const data = await response.json();
      
      if (!response.ok || data.error) {
        alert(data.error || 'Gagal melakukan clustering. Periksa data input.');
        return;
      }
      
      setResult(data);
    } catch (error) {
      console.error('Error clustering:', error);
      alert('Gagal melakukan clustering. Periksa koneksi ke backend.');
    } finally {
      setProcessing(false);
    }
  };

  const getCategoryStyle = (kategori: string) => {
    if (kategori === 'Tinggi') return { badge: 'bg-red-100 text-rose-400', bar: 'bg-red-500' };
    if (kategori === 'Sedang') return { badge: 'bg-amber-100 text-amber-400', bar: 'bg-amber-500' };
    return { badge: 'bg-green-100 text-emerald-400', bar: 'bg-green-500' };
  };

  const categoryCounts = result
    ? ['Tinggi', 'Sedang', 'Rendah'].map((k) => ({
        name: k,
        count: result.results.kecamatan_results.filter((r) => r.kategori_nama === k).length,
      }))
    : [];

  return (
    <div className="space-y-6 animate-in max-w-4xl">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <BrainCircuit size={20} />
            </span>
            Proses Clustering K-Means
          </h1>
          <p className="page-subtitle mt-1">Jalankan algoritma K-Means untuk pengelompokan kecamatan</p>
        </div>
      </div>

      {/* Parameter Card */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Layers size={16} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Parameter Clustering</h2>
            <p className="text-xs text-slate-400">Tentukan tahun ajaran dan jumlah cluster</p>
          </div>
        </div>

        <form onSubmit={handleClustering} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="form-label">
                Tahun Ajaran <span className="text-red-500">*</span>
              </label>
              <select
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                className="form-input"
                required
              >
                <option value="">Pilih Tahun Ajaran</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {availableYears.length === 0 && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Belum ada data. Upload data terlebih dahulu.
                </p>
              )}
            </div>

            <div>
              <label className="form-label">
                Jumlah Cluster (K)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="2"
                  max="5"
                  value={nClusters}
                  onChange={(e) => setNClusters(parseInt(e.target.value))}
                  className="flex-1 h-2 rounded-full accent-blue-600 cursor-pointer"
                />
                <span className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {nClusters}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Default: 3 (Rendah / Sedang / Tinggi)
              </p>
            </div>
          </div>

          {/* Info box */}
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Fitur yang dianalisis:</h4>
            <div className="grid grid-cols-2 gap-2">
              {['Alokasi Dana Sarpras', 'Kelas Baik', 'Kelas Rusak Ringan', 'Kelas Rusak Berat'].map((f) => (
                <div key={f} className="text-xs text-indigo-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={processing || !tahunAjaran}
            className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses Clustering...
              </>
            ) : (
              <>
                <Play size={18} />
                Jalankan Clustering K-Means
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-5 animate-in">
          {/* Success header */}
          <div className="card p-5 flex items-start gap-4 border-emerald-500/20 bg-emerald-500/10/50">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-green-800 text-base">Clustering Berhasil!</h3>
              <p className="text-sm text-emerald-400 mt-0.5">
                Tahun ajaran <strong>{result.tahun_ajaran}</strong> — {result.results.n_clusters} cluster —
                Inertia: <strong>{result.results.inertia.toFixed(3)}</strong>
              </p>
            </div>
            <Link href="/hasil" className="btn-primary text-sm shrink-0">
              Lihat Hasil <ChevronRight size={15} />
            </Link>
          </div>

          {/* Distribution */}
          <div className="card p-6">
            <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              Distribusi Kategori
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {categoryCounts.map(({ name, count }) => {
                const total = result.results.kecamatan_results.length;
                const style = getCategoryStyle(name);
                return (
                  <div key={name} className="text-center p-4 rounded-xl bg-slate-800/50 border border-white/10">
                    <div className={`text-2xl font-bold ${name === 'Tinggi' ? 'text-red-600' : name === 'Sedang' ? 'text-amber-600' : 'text-emerald-400'}`}>
                      {count}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Kebutuhan {name}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail table */}
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-white/10">
              <h4 className="font-bold text-slate-100">Detail Per Kecamatan</h4>
            </div>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="data-table">
                <thead className="sticky top-0">
                  <tr>
                    <th>Kecamatan</th>
                    <th>Kategori</th>
                    <th>Siswa</th>
                    <th>R. Kelas</th>
                    <th>Fasilitas</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.kecamatan_results.map((item, index) => {
                    const style = getCategoryStyle(item.kategori_nama);
                    return (
                      <tr key={index}>
                        <td className="font-medium text-slate-100">{item.kecamatan}</td>
                        <td>
                          <span className={`badge ${style.badge}`}>{item.kategori_nama}</span>
                        </td>
                        <td className="tabular-nums">{item.data[0]?.toLocaleString()}</td>
                        <td className="tabular-nums">{item.data[4]?.toLocaleString()}</td>
                        <td className="tabular-nums">{(item.data[5] + item.data[6] + item.data[7] + item.data[8] + item.data[9])?.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
