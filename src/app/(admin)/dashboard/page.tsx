'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { MapPin, School, Database, ArrowUpRight, TrendingUp, Calendar, Layers } from 'lucide-react';

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

// ── Palet warna modern executive (tenang, berbobot, tidak norak) ─────────────
const KAT_PALETTE: Record<string, { main: string; soft: string; border: string; text: string; label: string }> = {
  Tinggi: {
    main: '#e11d48',   // Rose 600
    soft: '#fff1f2',   // Rose 50
    border: '#fecdd3', // Rose 200
    text: '#be123c',   // Rose 700
    label: 'Kebutuhan Tinggi',
  },
  Sedang: {
    main: '#f59e0b',   // Amber 500
    soft: '#fffbeb',   // Amber 50
    border: '#fde68a', // Amber 200
    text: '#b45309',   // Amber 700
    label: 'Kebutuhan Sedang',
  },
  Rendah: {
    main: '#10b981',   // Emerald 500
    soft: '#f0fdf4',   // Emerald 50
    border: '#bbf7d0', // Emerald 200
    text: '#15803d',   // Emerald 700
    label: 'Kebutuhan Rendah',
  },
};

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID').format(n);
}

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(2)} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', gap: 12 }}>
        <div style={{ width: 24, height: 24, border: '2.5px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>Memuat ringkasan dashboard...</span>
      </div>
    );
  }

  const dist = stats?.cluster_distribution ?? [];
  const totalKec = stats?.total_kecamatan ?? 0;

  const pieData = dist.map(d => ({
    name: d.kategori_nama,
    value: d.count,
    color: KAT_PALETTE[d.kategori_nama]?.main ?? '#94a3b8',
    soft: KAT_PALETTE[d.kategori_nama]?.soft ?? '#f8fafc',
  }));

  const barData = dist.map(d => ({
    name: d.kategori_nama,
    Siswa: d.total_siswa,
    fill: KAT_PALETTE[d.kategori_nama]?.main ?? '#94a3b8',
  }));

  const statCards = [
    {
      title: 'Wilayah Kecamatan',
      value: stats?.total_kecamatan ?? 0,
      unit: 'Kecamatan',
      subtitle: 'Kabupaten Cirebon',
      icon: MapPin,
      accentColor: '#2563eb',
      accentBg: '#eff6ff',
      accentBorder: '#bfdbfe',
    },
    {
      title: 'Satuan Pendidikan',
      value: stats?.total_sekolah ?? 0,
      unit: 'Sekolah',
      subtitle: 'Jenjang SD & SMP',
      icon: School,
      accentColor: '#059669',
      accentBg: '#f0fdf4',
      accentBorder: '#bbf7d0',
    },
    {
      title: 'Data Terverifikasi',
      value: stats?.total_data_sekolah ?? 0,
      unit: 'Record',
      subtitle: `Tahun Ajaran ${selectedYear || 'Terbaru'}`,
      icon: Database,
      accentColor: '#d97706',
      accentBg: '#fffbeb',
      accentBorder: '#fde68a',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Header & Year Filter ────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.025em', margin: 0 }}>
            Dashboard
          </h1>
        </div>

        {(stats?.available_years ?? []).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '4px 10px 4px 12px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
            <Calendar size={15} color="#64748b" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Tahun:</span>
            <select
              value={selectedYear}
              onChange={e => handleYear(e.target.value)}
              style={{
                fontSize: 13, fontWeight: 600, color: '#0f172a',
                background: 'transparent', border: 'none', outline: 'none',
                cursor: 'pointer', paddingRight: 4,
              }}
            >
              {stats!.available_years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── 3 Modern KPI Stat Cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '20px 22px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle top indicator bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.accentColor }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{c.title}</span>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: c.accentBg, border: `1px solid ${c.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={c.accentColor} />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(c.value)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{c.unit}</span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {c.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts Row (Donut & Bar) ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>

        {/* Donut Chart — Elegant Minimalist Gauge */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Distribusi Kebutuhan Wilayah</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Proporsi 40 kecamatan berdasarkan K-Means</p>
            </div>
            <div style={{ padding: '4px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
              3 Cluster
            </div>
          </div>

          {pieData.length > 0 ? (
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%', height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={84}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => [`${v} kecamatan (${((Number(v) / (totalKec || 1)) * 100).toFixed(0)}%)`, n]}
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#ffffff', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
                      itemStyle={{ color: '#ffffff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center metric */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalKec}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>Kecamatan</div>
                </div>
              </div>

              {/* Refined Legend Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', marginTop: 8 }}>
                {dist.map(d => {
                  const pal = KAT_PALETTE[d.kategori_nama] ?? KAT_PALETTE['Rendah'];
                  const pct = totalKec ? ((d.count / totalKec) * 100).toFixed(0) : 0;
                  return (
                    <div
                      key={d.kategori_nama}
                      style={{
                        background: pal.soft,
                        border: `1px solid ${pal.border}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: pal.text }}>{d.kategori_nama}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{d.count} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>({pct}%)</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              Belum ada data clustering untuk tahun ini
            </div>
          )}
        </div>

        {/* Bar Chart — Sleek Column View */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>Beban Siswa per Kategori</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0 0' }}>Akumulasi siswa penerima BOS di setiap klaster</p>
            </div>
            <div style={{ padding: '4px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
              Peserta Didik
            </div>
          </div>

          {barData.length > 0 ? (
            <div style={{ height: 260, width: '100%', marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 12, right: 10, left: -14, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(v: any) => [fmt(v || 0) + ' Siswa', 'Total Peserta']}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, fontSize: 12, color: '#ffffff', boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Bar dataKey="Siswa" maxBarSize={44} radius={[6, 6, 0, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
              Belum ada data siswa
            </div>
          )}
        </div>

      </div>

      {/* ── Detail Cluster & Ranking Row ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>

        {/* Cluster detail summary */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={16} color="#2563eb" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Detail Agregasi Klaster</span>
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Kategori', 'Kec.', 'Siswa', 'Alokasi Dana'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dist.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Belum ada data cluster
                    </td>
                  </tr>
                ) : (
                  dist.map(d => {
                    const pal = KAT_PALETTE[d.kategori_nama] ?? KAT_PALETTE['Rendah'];
                    return (
                      <tr key={d.cluster_kategori} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: pal.text,
                            background: pal.soft,
                            border: `1px solid ${pal.border}`,
                            padding: '3px 9px', borderRadius: 20,
                            whiteSpace: 'nowrap',
                          }}>
                            {d.kategori_nama}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {d.count} <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>kec</span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {fmt(d.total_siswa)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtRp(d.total_dana_bos)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Priority Ranking */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#e11d48" />
              Prioritas Utama Kecamatan
            </div>
            <Link
              href="/hasil"
              style={{
                fontSize: 12, fontWeight: 600, color: '#2563eb', textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe',
              }}
            >
              Lihat Semua <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['#', 'Kecamatan', 'Kategori', 'Skor Prioritas'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!ranking || ranking.ranking.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                      Belum ada data ranking prioritas
                    </td>
                  </tr>
                ) : (
                  ranking.ranking.slice(0, 5).map((item, idx) => {
                    const pal = KAT_PALETTE[item.kategori_nama] ?? KAT_PALETTE['Rendah'];
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                            background: idx === 0 ? '#fef2f2' : idx === 1 ? '#fff1f2' : idx === 2 ? '#fff7ed' : '#f8fafc',
                            color: idx < 3 ? '#e11d48' : '#64748b',
                            border: idx < 3 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                          }}>
                            {item.rank}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', color: '#0f172a', fontWeight: 600 }}>
                          {item.nama_kecamatan}
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: pal.text,
                            background: pal.soft,
                            border: `1px solid ${pal.border}`,
                            padding: '2px 8px', borderRadius: 20,
                            whiteSpace: 'nowrap',
                          }}>
                            {item.kategori_nama}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', color: '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {(item.priority_score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

