'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Building2, GraduationCap, MapPin, ChevronRight, FileSpreadsheet, BarChart3, Upload } from 'lucide-react';

interface DashboardStats {
  total_kecamatan: number;
  total_sekolah: number;
  total_data_sekolah: number;
  cluster_distribution: Array<{
    cluster_kategori: number;
    count: number;
    kategori_nama: string;
    total_siswa: number;
    total_ruang_kelas: number;
    total_fasilitas: number;
    total_dana_bos: number;
    total_alokasi_dana: number;
  }>;
  recent_uploads: Array<{
    id: number;
    nama_file: string;
    tanggal_upload: string;
    jumlah_data: number;
    status: string;
    admin_nama: string;
  }>;
  available_years: string[];
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
  }>;
}

const COLORS = {
  'Tinggi': '#ef4444', // Red for High Priority
  'Sedang': '#eab308', // Yellow for Medium Priority
  'Rendah': '#22c55e', // Green for Low Priority
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const admin = localStorage.getItem('admin');
      if (!admin) {
        router.push('/login');
        return;
      }
    };
    checkAuth();
    fetchDashboardStats();
  }, [router]);

  const fetchDashboardStats = async (year?: string) => {
    setLoading(true);
    try {
      const url = year
        ? `http://localhost:8000/dashboard.php?tahun_ajaran=${year}`
        : 'http://localhost:8000/dashboard.php';

      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      setStats(data);

      if (!year && data.available_years && data.available_years.length > 0) {
        setSelectedYear(data.available_years[0]);
        fetchRanking(data.available_years[0]);
      } else if (year) {
        fetchRanking(year);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async (year: string) => {
    try {
      const response = await fetch(`http://localhost:8000/ranking.php?tahun_ajaran=${year}`, { credentials: 'include' });
      const data = await response.json();
      setRanking(data);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    fetchDashboardStats(year);
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Prepare chart data
  const pieData = (stats?.cluster_distribution || []).map(item => ({
    name: item.kategori_nama,
    value: item.count,
    color: COLORS[item.kategori_nama as keyof typeof COLORS] || '#94a3b8'
  }));

  const barData = (stats?.cluster_distribution || []).map(item => ({
    name: item.kategori_nama,
    Siswa: item.total_siswa,
    color: COLORS[item.kategori_nama as keyof typeof COLORS] || '#94a3b8'
  }));

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Filter */}
      <div className="flex justify-between items-center bg-slate-900/60 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white/10">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Ringkasan Data</h1>
          <p className="text-slate-400 text-sm">Overview analisis k-means pada kecamatan</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-300 hidden sm:block">Tahun Ajaran:</label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="px-4 py-2 bg-slate-800/50 border border-white/10 text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          >
            {(stats?.available_years || []).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10 flex items-center hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 mr-4">
            <MapPin size={28} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Kecamatan</h3>
            <p className="text-3xl font-bold text-slate-100">{stats?.total_kecamatan}</p>
          </div>
        </div>
        
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10 flex items-center hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mr-4">
            <Building2 size={28} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Sekolah</h3>
            <p className="text-3xl font-bold text-slate-100">{stats?.total_sekolah}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10 flex items-center hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-violet-500/10 rounded-full flex items-center justify-center text-violet-400 mr-4">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Data Terekam</h3>
            <p className="text-3xl font-bold text-slate-100">{stats?.total_data_sekolah}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Distribusi Cluster Kecamatan</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10">
          <h3 className="text-lg font-bold text-slate-100 mb-6">Jumlah Siswa Berdasarkan Kategori Prioritas</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="Siswa" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cluster Distribution Details */}
      <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10">
        <h2 className="text-xl font-bold mb-4 text-slate-100">Detail Cluster K-Means</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(stats?.cluster_distribution || []).map((cluster) => (
            <div
              key={cluster.cluster_kategori}
              className={`p-5 rounded-xl border relative overflow-hidden transition-all hover:-translate-y-1 ${
                cluster.kategori_nama === 'Tinggi'
                  ? 'bg-rose-500/10/50 border-rose-500/20'
                  : cluster.kategori_nama === 'Sedang'
                  ? 'bg-amber-500/10/50 border-yellow-500/20'
                  : 'bg-emerald-500/10/50 border-emerald-500/20'
              }`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${
                cluster.kategori_nama === 'Tinggi' ? 'bg-red-500' :
                cluster.kategori_nama === 'Sedang' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-100">Prioritas {cluster.kategori_nama}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  cluster.kategori_nama === 'Tinggi' ? 'bg-red-100 text-rose-400' :
                  cluster.kategori_nama === 'Sedang' ? 'bg-yellow-100 text-yellow-400' : 
                  'bg-green-100 text-emerald-400'
                }`}>
                  {cluster.count} Kec
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><GraduationCap size={16} /> Siswa</span>
                  <span className="font-semibold text-slate-100">{cluster.total_siswa.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><Building2 size={16} /> R. Kelas</span>
                  <span className="font-semibold text-slate-100">{cluster.total_ruang_kelas.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><FileSpreadsheet size={16} /> Fasilitas</span>
                  <span className="font-semibold text-slate-100">{cluster.total_fasilitas.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Ranking & Recent Uploads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Kecamatan */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-100">Top Prioritas Kecamatan</h2>
            <Link href="/hasil" className="text-indigo-400 hover:text-indigo-400 text-sm font-medium flex items-center">
              Lihat Semua <ChevronRight size={16} className="ml-1"/>
            </Link>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {ranking && ranking.ranking.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Kecamatan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Kategori</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {ranking.ranking.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            item.rank <= 3 ? 'bg-amber-100 text-amber-400' : 'bg-gray-100 text-slate-300'
                          }`}>
                            {item.rank}
                          </span>
                          <span className="font-medium text-slate-100">{item.nama_kecamatan}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.kategori_nama === 'Tinggi' ? 'bg-red-100 text-rose-400' :
                          item.kategori_nama === 'Sedang' ? 'bg-yellow-100 text-yellow-400' :
                          'bg-green-100 text-emerald-400'
                        }`}>
                          {item.kategori_nama}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${item.priority_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-300">{item.priority_score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[200px]">
                <BarChart3 size={32} className="mb-2 text-gray-300"/>
                <p>Belum ada data ranking</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/10 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-100">Riwayat Upload</h2>
            <Link href="/data/upload" className="text-indigo-400 hover:text-indigo-400 text-sm font-medium flex items-center">
              Upload <ChevronRight size={16} className="ml-1"/>
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {(stats?.recent_uploads || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[200px]">
                <Upload size={32} className="mb-2 text-gray-300"/>
                <p>Belum ada file diupload</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {(stats?.recent_uploads || []).slice(0, 5).map((upload) => (
                    <tr key={upload.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-100 text-sm truncate max-w-[150px] sm:max-w-xs" title={upload.nama_file}>
                            {upload.nama_file}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(upload.tanggal_upload).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          upload.status === 'success' ? 'bg-green-100 text-emerald-400' : 'bg-red-100 text-rose-400'
                        }`}>
                          {upload.status === 'success' ? 'Berhasil' : 'Gagal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {upload.admin_nama}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
