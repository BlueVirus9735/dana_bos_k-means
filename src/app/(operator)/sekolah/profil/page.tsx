'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getUser } from '@/lib/api';
import { School, MapPin, Phone, Mail, FileText, CheckCircle } from 'lucide-react';

interface ProfilData {
  nama_sekolah: string;
  npsn: string;
  jenjang: string;
  alamat: string;
  nama_kecamatan: string;
  kode_kecamatan: string;
}

export default function ProfilSekolahPage() {
  const router = useRouter();
  const [profil, setProfil] = useState<ProfilData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (!u || u.role !== 'operator') { router.push('/login'); return; }
    
    // We can reuse dashboard endpoint to get info_sekolah
    const fetchProfil = async () => {
      try {
        const res = await apiFetch('/dashboard_operator.php', {}, router);
        if (res.ok) {
          const data = await res.json();
          setProfil(data.info_sekolah);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    
    fetchProfil();
  }, [router]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: 14 }}>Memuat profil...</div>;
  }

  if (!profil) {
    return <div style={{ color: '#ef4444', fontSize: 14 }}>Gagal memuat profil sekolah.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Profil Sekolah</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          Informasi data induk sekolah Anda yang terdaftar pada sistem Dinas Pendidikan.
        </p>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--accent-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <School size={32} color="var(--accent)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{profil.nama_sekolah}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 500 }}>
                {profil.jenjang}
              </span>
              <span>•</span>
              <span style={{ fontWeight: 500 }}>NPSN: {profil.npsn}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 13, fontWeight: 500, background: 'rgba(16,185,129,0.1)', padding: '6px 12px', borderRadius: 20 }}>
            <CheckCircle size={15} /> Aktif Tersinkronisasi
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> Alamat Lengkap
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {profil.alamat || '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Kecamatan
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {profil.nama_kecamatan} (Kode: {profil.kode_kecamatan})
            </div>
          </div>
        </div>

        <div style={{ padding: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 13, color: '#d97706', display: 'flex', gap: 10 }}>
          <div style={{ marginTop: 2 }}>⚠️</div>
          <div style={{ lineHeight: 1.5 }}>
            <strong>Catatan:</strong> Data profil ini diambil langsung dari database master kecamatan. Jika terdapat kesalahan penulisan nama sekolah, NPSN, atau alamat, silakan hubungi Admin Dinas Pendidikan untuk melakukan pembaruan data induk.
          </div>
        </div>
      </div>
    </div>
  );
}
