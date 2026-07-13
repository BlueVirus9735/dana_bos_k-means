'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { MapPin, Building2, Database, ArrowRight, TrendingUp } from 'lucide-react';

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

const CLUSTER_COLORS: Record<string, string> = {
  Tinggi: '#ef4444',
  Sedang: '#f59e0b', // amber-500
  Rendah: '#10b981', // emerald-500
};

const CLUSTER_BG: Record<string, string> = {
  Tinggi: 'rgba(239,68,68,0.12)',
  Sedang: 'rgba(251,191,36,0.12)',
  Rendah: 'rgba(52,211,153,0.12)',
};

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  return `Rp ${fmt(n)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('admin')) { router.push('/login'); return; }
    fetchStats();
  }, [router]);

  const fetchStats = async (year?: string) => {
    setLoading(true);
    try {
      const path = year ? `/dashboard.php?tahun_ajaran=${year}` : '/dashboard.php';
      const res = await apiFetch(path, {}, router);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
      const y = year ?? data.available_years?.[0] ?? '';
      if (!year && y) setSelectedYear(y);
      if (y) fetchRanking(y);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchRanking = async (year: string) => {
    try {
      const res = await apiFetch(`/ranking.php?tahun_ajaran=${year}`, {}, router);
      if (!res.ok) return;
      setRanking(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleYear = (y: string) => { setSelectedYear(y); fetchStats(y); };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>
        Memuat data...
      </div>
    );
  }

  const pieData = (stats?.cluster_distribution ?? []).map(d => ({
    name: d.kategori_nama,
    value: d.count,
    color: CLUSTER_COLORS[d.kategori_nama] ?? '#8b949e',
  }));

  const barData = (stats?.cluster_distribution ?? []).map(d => ({
    name: d.kategori_nama,
    Siswa: d.total_siswa,
    fill: CLUSTER_COLORS[d.kategori_nama] ?? '#8b949e',
  }));

  const statCards = [
    { label: 'Total Kecamatan', value: stats?.total_kecamatan ?? 0, icon: MapPin, color: 'var(--accent-hover)' },
    { label: 'Total Sekolah',   value: stats?.total_sekolah   ?? 0, icon: Building2, color: 'var(--green)' },
    { label: 'Data Terekam',    value: stats?.total_data_sekolah ?? 0, icon: Database, color: 'var(--amber)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Ringkasan Data</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Analisis K-Means distribusi Dana BOS</p>
        </div>
        {(stats?.available_years ?? []).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tahun Ajaran</label>
            <select
              value={selectedYear}
              onChange={e => handleYear(e.target.value)}
              style={{
                padding: '4px 8px', fontSize: 13,
                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                border: '1px solid var(--border)', borderRadius: 6, outline: 'none',
              }}
            >
              {stats!.available_years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{fmt(value)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>

        {/* Pie chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Distribusi Cluster</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [v + ' kecamatan', n]}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Belum ada data clustering
            </div>
          )}
          {/* Legend manual */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Jumlah Siswa per Kategori</div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  cursor={{ fill: 'var(--bg-hover)' }}
                  formatter={(v: number) => [fmt(v) + ' siswa', 'Jumlah Siswa']}
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)' }}
                />
                <Bar dataKey="Siswa" radius={[4, 4, 0, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Belum ada data clustering
            </div>
          )}
        </div>
      </div>

      {/* Cluster detail + Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>

        {/* Cluster summary table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Detail Cluster K-Means
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Kategori', 'Kec.', 'Siswa', 'Dana BOS'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats?.cluster_distribution ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Belum ada data
                  </td>
                </tr>
              ) : (
                (stats?.cluster_distribution ?? []).map(d => (
                  <tr key={d.cluster_kategori} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 500,
                        color: CLUSTER_COLORS[d.kategori_nama],
                        background: CLUSTER_BG[d.kategori_nama],
                        border: `1px solid ${CLUSTER_COLORS[d.kategori_nama]}33`,
                        padding: '2px 8px', borderRadius: 20,
                      }}>
                        {d.kategori_nama}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{d.count}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{fmt(d.total_siswa)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{fmtRp(d.total_dana_bos)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ranking */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} color="var(--accent-hover)" />
              Top Prioritas Kecamatan
            </div>
            <Link href="/hasil" style={{ fontSize: 12, color: 'var(--accent-hover)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Semua <ArrowRight size={12} />
            </Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['#', 'Kecamatan', 'Kategori', 'Skor'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!ranking || ranking.ranking.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Belum ada data ranking
                  </td>
                </tr>
              ) : (
                ranking.ranking.slice(0, 6).map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <td style={{ padding: '9px 14px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{item.rank}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.nama_kecamatan}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: CLUSTER_COLORS[item.kategori_nama],
                        background: CLUSTER_BG[item.kategori_nama],
                        padding: '2px 7px', borderRadius: 20,
                        border: `1px solid ${CLUSTER_COLORS[item.kategori_nama]}33`,
                      }}>
                        {item.kategori_nama}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                      {item.priority_score}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
