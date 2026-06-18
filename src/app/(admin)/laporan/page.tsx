'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LaporanPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState('');
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
      if (data.available_years && data.available_years.length > 0) {
        setSelectedYear(data.available_years[0]);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedYear) {
      alert('Pilih tahun ajaran');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/laporan.php?tahun_ajaran=${selectedYear}&format=pdf`
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_clustering_${selectedYear}.pdf`;
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-slate-900/60 backdrop-blur-md shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-indigo-400 hover:underline">
            ← Kembali
          </Link>
          <h1 className="text-2xl font-bold">Cetak Laporan PDF</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Generate Laporan Clustering</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tahun Ajaran</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleGeneratePDF}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium"
            >
              Generate PDF
            </button>
          </div>

          <div className="mt-8 p-4 bg-indigo-500/10 rounded-md">
            <h3 className="font-bold mb-2">Informasi Laporan</h3>
            <p className="text-sm text-slate-300">
              Laporan PDF akan berisi:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-300 mt-2">
              <li>Ringkasan hasil clustering per tahun ajaran</li>
              <li>Tabel distribusi kecamatan per kategori</li>
              <li>Detail data per kecamatan (siswa, ruang kelas, fasilitas, dana)</li>
              <li>Informasi kategori kebutuhan (Tinggi, Sedang, Rendah)</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-amber-500/10 rounded-md">
            <h3 className="font-bold mb-2">Catatan</h3>
            <p className="text-sm text-slate-300">
              Pastikan data clustering sudah dilakukan untuk tahun ajaran yang dipilih.
              Jika belum, lakukan proses clustering terlebih dahulu di menu Proses Clustering.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
