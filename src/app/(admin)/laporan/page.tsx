'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, API_BASE } from '@/lib/api';
import { Printer, CalendarDays, Loader2, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export default function LaporanPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('admin')) { router.push('/login'); return; }
    
    // Fetch daftar tahun ajaran dari DB saat pertama kali buka
    apiFetch('/kecamatan.php?years=1', {}, router)
      .then(r => r.json())
      .then((data: string[]) => {
        const years = Array.isArray(data) ? data : [];
        setAvailableYears(years);
        if (years.length > 0) setSelectedYear(years[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingYears(false));
  }, [router]);

  const handleGeneratePDF = async () => {
    if (!selectedYear) {
      alert('Pilih tahun ajaran');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(
        `${API_BASE}/laporan.php?tahun_ajaran=${selectedYear}&format=pdf`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_clustering_${selectedYear.replace('/', '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Gagal generate PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in max-w-2xl mx-auto mt-6">
      <div className="text-center mb-8">
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--accent-muted)', border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Printer size={26} color="var(--accent-hover)" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Cetak Laporan
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Unduh laporan hasil clustering dalam bentuk dokumen PDF
        </p>
      </div>

      <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Tahun Ajaran */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
            <CalendarDays size={15} color="var(--accent-hover)" />
            Tahun Ajaran
          </label>

          {loadingYears ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
              <Loader2 size={15} className="animate-spin" /> Memuat daftar tahun ajaran...
            </div>
          ) : availableYears.length === 0 ? (
            <div style={{
              padding: '12px 14px', borderRadius: 'var(--radius)',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--amber)',
            }}>
              <AlertTriangle size={15} />
              Belum ada data tahun ajaran. Masukkan data kecamatan terlebih dahulu.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    border: `2px solid ${selectedYear === y ? 'var(--accent)' : 'var(--border)'}`,
                    background: selectedYear === y ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                    color: selectedYear === y ? 'var(--accent-hover)' : 'var(--text-secondary)',
                    fontWeight: selectedYear === y ? 700 : 500,
                    fontSize: 15, cursor: 'pointer', transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  {y}
                  {selectedYear === y && <CheckCircle2 size={16} color="var(--accent-hover)" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleGeneratePDF}
          disabled={!selectedYear || generating}
          className="btn-primary"
          style={{ justifyContent: 'center', padding: '14px', fontSize: 15 }}
        >
          {generating ? (
            <><Loader2 size={18} className="animate-spin" /> Membuat PDF...</>
          ) : (
            <><FileText size={18} /> Generate Laporan PDF</>
          )}
        </button>

        <div style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Informasi yang tercetak di laporan:</h3>
          <ul style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 2 }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: 'var(--green)', fontSize: 15 }}>✓</span> Ringkasan hasil clustering per kategori
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: 'var(--green)', fontSize: 15 }}>✓</span> Tabel distribusi kecamatan prioritas
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: 'var(--green)', fontSize: 15 }}>✓</span> Detail kondisi fisik (ruang kelas & fasilitas)
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: 'var(--green)', fontSize: 15 }}>✓</span> Alokasi kebutuhan dana BOS dan sarpras
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
