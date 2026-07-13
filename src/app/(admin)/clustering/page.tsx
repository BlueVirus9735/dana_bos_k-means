'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  BrainCircuit, Play, CheckCircle2, AlertTriangle,
  ChevronRight, Info, MapPin, Users, Building2,
  Loader2, CalendarDays, Settings2, BarChart3,
} from 'lucide-react';

interface KecResult {
  kecamatan: string;
  kategori_nama: 'Rendah' | 'Sedang' | 'Tinggi';
  cluster_kategori: number;
  data: number[];      // [siswa, kl_baik, kl_rusak_ringan, kl_rusak_berat, jml_kelas, lap, perpus, uks, toilet, ibadah, rombel, sarpras]
}

interface ClusteringResult {
  tahun_ajaran: string;
  results: {
    n_clusters: number;
    inertia: number;
    kecamatan_results: KecResult[];
  };
}

// ── Warna kategori ────────────────────────────────────────────────────────────
const KAT = {
  Rendah: { bg: 'rgba(52,211,153,0.12)', color: 'var(--green)',  border: 'rgba(52,211,153,0.3)',  bar: 'var(--green)',  label: 'Kebutuhan Rendah' },
  Sedang: { bg: 'rgba(251,191,36,0.12)', color: 'var(--amber)', border: 'rgba(251,191,36,0.3)',  bar: 'var(--amber)', label: 'Kebutuhan Sedang' },
  Tinggi: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444',       border: 'rgba(239,68,68,0.3)',   bar: '#ef4444',      label: 'Kebutuhan Tinggi' },
} as const;

// Opsi K yang tersedia
const K_OPTIONS = [
  { k: 2, desc: '2 Cluster — Prioritas / Non-Prioritas' },
  { k: 3, desc: '3 Cluster — Rendah / Sedang / Tinggi' },
  { k: 4, desc: '4 Cluster — Sangat Rendah s.d. Tinggi' },
  { k: 5, desc: '5 Cluster — Sangat detail' },
];

const fmt = (n: number) => (n ?? 0).toLocaleString('id-ID');

export default function ClusteringPage() {
  const router = useRouter();

  const [tahunAjaran, setTahunAjaran]   = useState('');
  const [nClusters, setNClusters]       = useState(3);
  const [processing, setProcessing]     = useState(false);
  const [result, setResult]             = useState<ClusteringResult | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [errorMsg, setErrorMsg]         = useState('');

  useEffect(() => {
    if (!localStorage.getItem('admin')) { router.push('/login'); return; }
    apiFetch('/kecamatan.php?years=1', {}, router)
      .then(r => r.json())
      .then((data: string[]) => {
        const years = Array.isArray(data) ? data : [];
        setAvailableYears(years);
        if (years.length > 0) setTahunAjaran(years[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingYears(false));
  }, [router]);

  const handleClustering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tahunAjaran) return;
    setProcessing(true);
    setResult(null);
    setErrorMsg('');
    try {
      const res  = await apiFetch('/clustering.php', {
        method: 'POST',
        body:   JSON.stringify({ tahun_ajaran: tahunAjaran, n_clusters: nClusters }),
      }, router);
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Gagal melakukan clustering. Pastikan data kecamatan & BOS sudah diinput.');
        return;
      }
      setResult(data);
    } catch {
      setErrorMsg('Gagal terhubung ke server. Cek koneksi backend.');
    } finally {
      setProcessing(false);
    }
  };

  // Hitung distribusi per kategori
  const kecResults = result?.results.kecamatan_results ?? [];
  const distrib = (['Rendah', 'Sedang', 'Tinggi'] as const).map(k => ({
    key: k,
    items: kecResults.filter(r => r.kategori_nama === k),
  }));
  const total = kecResults.length;

  return (
    <div className="space-y-6 animate-in" style={{ maxWidth: 900 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={20} color="var(--accent-hover)" />
            Proses Clustering K-Means
          </h1>
          <p className="page-subtitle">
            Pengelompokan kecamatan berdasarkan kondisi sarpras & dana BOS
          </p>
        </div>
        {result && (
          <Link href="/hasil" className="btn-primary" style={{ fontSize: 13 }}>
            Lihat Hasil Lengkap <ChevronRight size={15} />
          </Link>
        )}
      </div>

      {/* ── Info strip ─────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13,
        color: 'var(--text-primary)',
      }}>
        <Info size={15} color="var(--accent-hover)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Algoritma <strong>K-Means</strong> mengelompokkan kecamatan ke dalam{' '}
          <strong>K cluster</strong> berdasarkan 12 fitur:{' '}
          jumlah siswa, kondisi ruang kelas (baik/rusak ringan/rusak berat), fasilitas
          (lapangan, perpustakaan, UKS, toilet, tempat ibadah), rombongan belajar, dan
          alokasi dana sarpras.{' '}
          Hasilnya diberi label <strong>Rendah / Sedang / Tinggi</strong> sesuai kebutuhan sarpras.
        </span>
      </div>

      {/* ── Form parameter ─────────────────────────────────── */}
      <form onSubmit={handleClustering}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: -8 }}>
            <Settings2 size={16} color="var(--text-muted)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Parameter Clustering
            </span>
          </div>

          {/* Tahun Ajaran */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              <CalendarDays size={14} color="var(--accent-hover)" />
              Tahun Ajaran
            </label>
            {loadingYears ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <Loader2 size={14} className="animate-spin" /> Memuat...
              </div>
            ) : availableYears.length === 0 ? (
              <div style={{
                padding: '12px 14px', borderRadius: 'var(--radius)',
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--amber)',
              }}>
                <AlertTriangle size={15} />
                Belum ada data tahun ajaran. Masukkan data kecamatan &amp; BOS terlebih dahulu.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableYears.map(y => (
                  <button
                    key={y} type="button"
                    onClick={() => setTahunAjaran(y)}
                    style={{
                      padding: '8px 18px', borderRadius: 'var(--radius)',
                      border: `2px solid ${tahunAjaran === y ? 'var(--accent)' : 'var(--border)'}`,
                      background: tahunAjaran === y ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                      color: tahunAjaran === y ? 'var(--accent-hover)' : 'var(--text-secondary)',
                      fontWeight: tahunAjaran === y ? 700 : 500,
                      fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {tahunAjaran === y && <CheckCircle2 size={13} />}
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Jumlah Cluster (K) */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
              <BarChart3 size={14} color="var(--accent-hover)" />
              Jumlah Cluster (K)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {K_OPTIONS.map(opt => (
                <button
                  key={opt.k} type="button"
                  onClick={() => setNClusters(opt.k)}
                  style={{
                    padding: '11px 16px', borderRadius: 'var(--radius)',
                    border: `2px solid ${nClusters === opt.k ? 'var(--accent)' : 'var(--border)'}`,
                    background: nClusters === opt.k ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Cluster dots visual */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: opt.k }).map((_, i) => (
                        <span key={i} style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: nClusters === opt.k ? 'var(--accent)' : 'var(--border)',
                          opacity: 0.4 + (i / opt.k) * 0.6,
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontWeight: nClusters === opt.k ? 700 : 500,
                      fontSize: 13,
                      color: nClusters === opt.k ? 'var(--accent-hover)' : 'var(--text-secondary)',
                    }}>
                      {opt.desc}
                    </span>
                  </div>
                  {nClusters === opt.k && (
                    <CheckCircle2 size={14} color="var(--accent-hover)" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--radius)',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#ef4444',
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={processing || !tahunAjaran || loadingYears}
            className="btn-primary"
            style={{ justifyContent: 'center', padding: '13px', fontSize: 15 }}
          >
            {processing ? (
              <><Loader2 size={18} className="animate-spin" /> Memproses Clustering...</>
            ) : (
              <><Play size={18} /> Jalankan Clustering K-Means — {tahunAjaran || '...'}</>
            )}
          </button>
        </div>
      </form>

      {/* ── Hasil Clustering ───────────────────────────────── */}
      {result && (
        <div className="space-y-5 animate-in">

          {/* Success banner */}
          <div style={{
            padding: '16px 20px', borderRadius: 'var(--radius)',
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle2 size={22} color="var(--green)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>
                Clustering Selesai!
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Tahun <strong>{result.tahun_ajaran}</strong> · {result.results.n_clusters} cluster ·{' '}
                {total} kecamatan diproses · Inertia: <strong>{result.results.inertia.toFixed(3)}</strong>
              </p>
            </div>
            <Link href="/hasil" className="btn-primary" style={{ fontSize: 13, flexShrink: 0 }}>
              Lihat Hasil Lengkap <ChevronRight size={14} />
            </Link>
          </div>

          {/* Distribusi kartu per kategori */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {distrib.map(({ key, items }) => {
              const s = KAT[key];
              const pct = total > 0 ? Math.round((items.length / total) * 100) : 0;
              return (
                <div key={key} className="card" style={{ padding: 20, border: `1px solid ${s.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{items.length}</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-hover)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: s.bar, transition: 'width 0.6s ease' }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}% dari total kecamatan</p>
                  {/* List kecamatan */}
                  {items.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {items.map(kec => (
                        <div key={kec.kecamatan} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, color: 'var(--text-secondary)',
                          padding: '4px 8px', borderRadius: 6,
                          background: 'var(--bg-elevated)',
                        }}>
                          <MapPin size={11} color={s.color} style={{ flexShrink: 0 }} />
                          {kec.kecamatan}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail tabel */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={15} color="var(--text-muted)" />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                Detail Per Kecamatan
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kecamatan</th>
                    <th>Kategori</th>
                    <th title="Jumlah Siswa"><Users size={12} style={{ display: 'inline', marginRight: 4 }} />Siswa</th>
                    <th title="Jumlah Ruang Kelas">Ruang Kelas</th>
                    <th title="Kondisi Kelas: Baik / Rusak Ringan / Rusak Berat">Kondisi Kelas</th>
                    <th title="Jumlah fasilitas: lapangan+perpus+uks+toilet+ibadah">Fasilitas</th>
                    <th title="Rombongan Belajar">Rombel</th>
                    <th title="Alokasi Dana Sarpras">Dana Sarpras</th>
                  </tr>
                </thead>
                <tbody>
                  {kecResults.map((item, i) => {
                    const s = KAT[item.kategori_nama] ?? KAT.Rendah;
                    const [siswa, klBaik, klRingan, klBerat, jmlKelas, lap, perpus, uks, toilet, ibadah, rombel, sarpras] = item.data;
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                            <MapPin size={12} color={s.color} style={{ flexShrink: 0 }} />
                            {item.kecamatan}
                          </div>
                        </td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {item.kategori_nama}
                          </span>
                        </td>
                        <td className="tabular-nums">{fmt(siswa)}</td>
                        <td className="tabular-nums">{fmt(jmlKelas)}</td>
                        <td>
                          <div style={{ fontSize: 12, display: 'flex', gap: 6, whiteSpace: 'nowrap' }}>
                            <span style={{ color: 'var(--green)' }} title="Baik">✓ {fmt(klBaik)}</span>
                            <span style={{ color: 'var(--amber)' }} title="Rusak Ringan">⚠ {fmt(klRingan)}</span>
                            <span style={{ color: '#ef4444' }} title="Rusak Berat">✕ {fmt(klBerat)}</span>
                          </div>
                        </td>
                        <td className="tabular-nums">{fmt((lap ?? 0) + (perpus ?? 0) + (uks ?? 0) + (toilet ?? 0) + (ibadah ?? 0))}</td>
                        <td className="tabular-nums">{fmt(rombel)}</td>
                        <td className="tabular-nums" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                          {sarpras > 0 ? 'Rp ' + fmt(sarpras) : '—'}
                        </td>
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
