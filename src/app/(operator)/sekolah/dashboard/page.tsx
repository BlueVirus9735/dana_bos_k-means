'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getUser } from '@/lib/api';
import {
  BookOpen, Calculator, CheckCircle, Clock, AlertTriangle,
  School, MapPin, ArrowRight, ClipboardList,
} from 'lucide-react';

interface DashboardData {
  sekolah: {
    nama_sekolah: string;
    npsn: string;
    jenjang: string;
    alamat: string;
    nama_kecamatan: string;
  };
  tahun_ajaran_aktif: { tahun_ajaran: string; batas_submit_rkas: string | null; batas_submit_laporan: string | null } | null;
  rkas: { id: number; status: string; tahun_ajaran: string; jumlah_item: number; total_anggaran: number; catatan_revisi?: string } | null;
  realisasi: { id: number; status: string; tahun_ajaran: string; total_penerimaan: number; total_pengeluaran: number; saldo: number } | null;
  sarpras: { jumlah_ruang_kelas: number; ruang_kelas_baik: number; ruang_kelas_rusak_ringan: number; ruang_kelas_rusak_berat: number } | null;
  notifikasi: Array<{ type: string; message: string; link: string }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft:         { label: 'Draft',          color: '#8b949e', bg: 'rgba(139,148,158,0.1)', icon: Clock },
  pending:       { label: 'Menunggu Verifikasi', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
  revisi:        { label: 'Perlu Direvisi', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle },
  disahkan:      { label: 'Disahkan',       color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
  submitted:     { label: 'Dikirim',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
  pembinaan:     { label: 'Perlu Perbaikan',color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle },
  terverifikasi: { label: 'Terverifikasi',  color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
};

function fmtRp(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`;
  return `Rp ${new Intl.NumberFormat('id-ID').format(n)}`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`,
      padding: '3px 10px', borderRadius: 20,
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function OperatorDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/dashboard_operator.php', {}, router);
      if (!res.ok) return;
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading || !data) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat data...</div>;
  }

  const { info_sekolah: sekolah, tahun_ajaran_aktif, rkas_terkini: rkas, realisasi_terkini: realisasi, sarpras_terkini: sarpras, notifikasi } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Dashboard Operator</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {tahun_ajaran_aktif ? `Tahun Ajaran Aktif: ${tahun_ajaran_aktif.tahun_ajaran}` : 'Belum ada tahun ajaran aktif'}
        </p>
      </div>

      {/* Notifikasi */}
      {notifikasi.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifikasi.map((n, i) => {
            const isInfo = n.type === 'info';
            const color = isInfo ? '#3b82f6' : '#ef4444';
            const bg = isInfo ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)';
            const border = isInfo ? 'rgba(59,130,246,0.25)' : 'rgba(239,68,68,0.25)';
            return (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 8,
                background: bg, border: `1px solid ${border}`,
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, color: color,
              }}>
                <AlertTriangle size={14} /> {n.message}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Sekolah */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <School size={20} color="var(--accent-hover)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{sekolah.nama_sekolah}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>NPSN: <strong style={{ color: 'var(--text-secondary)' }}>{sekolah.npsn}</strong></span>
              <span>Jenjang: <strong style={{ color: 'var(--text-secondary)' }}>{sekolah.jenjang}</strong></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} /> {sekolah.nama_kecamatan}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RKAS + Realisasi Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

        {/* RKAS Card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              <BookOpen size={14} color="var(--accent-hover)" /> RKAS
            </div>
            <Link href="/sekolah/rkas" style={{ fontSize: 12, color: 'var(--accent-hover)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Kelola <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {rkas ? (
              <>
                <div style={{ marginBottom: 12 }}><StatusBadge status={rkas.status} /></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tahun Ajaran <strong style={{ color: 'var(--text-secondary)' }}>{rkas.tahun_ajaran}</strong></div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{rkas.jumlah_item} item kegiatan</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>{fmtRp(rkas.total_anggaran)}</div>
                {rkas.status === 'revisi' && rkas.catatan_revisi && (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 6, fontSize: 12, color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <strong>Catatan Revisi:</strong> {rkas.catatan_revisi}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Belum ada RKAS</div>
                {tahun_ajaran_aktif && (
                  <Link href="/sekolah/rkas" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8,
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 13, fontWeight: 500, textDecoration: 'none',
                  }}>
                    Buat RKAS Baru
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Realisasi Card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              <Calculator size={14} color="var(--green)" /> Realisasi Dana BOS
            </div>
            <Link href="/sekolah/realisasi" style={{ fontSize: 12, color: 'var(--accent-hover)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Kelola <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {realisasi ? (
              <>
                <div style={{ marginBottom: 12 }}><StatusBadge status={realisasi.status} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {[
                    { label: 'Penerimaan', value: realisasi.total_penerimaan, color: 'var(--green)' },
                    { label: 'Pengeluaran', value: realisasi.total_pengeluaran, color: 'var(--amber)' },
                    { label: 'Saldo', value: realisasi.saldo, color: realisasi.saldo >= 0 ? 'var(--green)' : '#ef4444' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{fmtRp(item.value)}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                {rkas?.status === 'disahkan' ? (
                  <><div style={{ marginBottom: 12 }}>RKAS sudah disahkan, buat laporan realisasi</div>
                  <Link href="/sekolah/realisasi" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>Buat Realisasi</Link></>
                ) : 'RKAS harus disahkan dulu'}
              </div>
            )}
          </div>
        </div>

        {/* Sarpras Card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              <ClipboardList size={14} color="var(--amber)" /> Data Sarpras
            </div>
            <Link href="/sekolah/sarpras" style={{ fontSize: 12, color: 'var(--accent-hover)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Update <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {sarpras ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Total Ruang Kelas', value: sarpras.jumlah_ruang_kelas },
                  { label: 'Kondisi Baik', value: sarpras.ruang_kelas_baik },
                  { label: 'Rusak Ringan', value: sarpras.ruang_kelas_rusak_ringan },
                  { label: 'Rusak Berat', value: sarpras.ruang_kelas_rusak_berat },
                ].map(item => (
                  <div key={item.label} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                Belum ada data sarpras.{' '}
                <Link href="/sekolah/sarpras" style={{ color: 'var(--accent-hover)', textDecoration: 'none' }}>Input sekarang →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
