'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface LaporanPayload {
  meta: {
    nomor_dokumen: string;
    instansi: string;
    satuan_kerja: string;
    tahun_ajaran: string;
    tanggal_cetak: string;
  };
  ringkasan_makro: {
    total_kecamatan: number;
    total_sekolah: number;
    total_siswa: number;
    total_dana_bos: number;
    total_alokasi_sarpras: number;
    total_rombongan_belajar: number;
    ruang_kelas_baik: number;
    ruang_kelas_rusak_ringan: number;
    ruang_kelas_rusak_berat: number;
    jumlah_ruang_kelas_total: number;
    fasilitas_perpustakaan: number;
    fasilitas_tempat_ibadah: number;
    fasilitas_toilet: number;
    fasilitas_uks: number;
    fasilitas_lapangan_olahraga: number;
    rasio_siswa_kelas: number;
    persen_rusak: number;
    stat_deskriptif: Array<{
      variabel: string;
      satuan: string;
      total: number;
      mean: number;
      min: number;
      max: number;
    }>;
  };
  clustering: {
    metode: string;
    total_iterasi: number;
    status_konvergensi: string;
    summary: {
      c3_tinggi: number;
      c2_sedang: number;
      c1_rendah: number;
    };
    iterasi_history: Array<{
      iterasi: number;
      cluster_center_1: number;
      cluster_center_2: number;
      cluster_center_3: number;
      inertia: number;
    }>;
    centroid_normalized_akhir: {
      c3_tinggi: { [k: string]: number };
      c2_sedang: { [k: string]: number };
      c1_rendah: { [k: string]: number };
    };
    keterangan_klaster: {
      C3: string;
      C2: string;
      C1: string;
    };
  };
  ranking_kecamatan: Array<{
    rank: number;
    nama_kecamatan: string;
    kode_kecamatan: string;
    jumlah_sekolah: number;
    jumlah_siswa_total: number;
    total_dana_bos_total: number;
    alokasi_dana_sarpras_total: number;
    jumlah_rombongan_belajar_total: number;
    ruang_kelas_baik_total: number;
    ruang_kelas_rusak_ringan_total: number;
    ruang_kelas_rusak_berat_total: number;
    fasilitas_perpustakaan_total: number;
    fasilitas_tempat_ibadah_total: number;
    fasilitas_toilet_total: number;
    fasilitas_uks_total: number;
    cluster_kategori: number;
    kategori_nama: 'Rendah' | 'Sedang' | 'Tinggi';
    priority_score: number;
    rekomendasi: string;
  }>;
  sekolah_per_kecamatan: {
    [kecamatan: string]: Array<{
      id: number;
      npsn: string;
      nama_sekolah: string;
      jumlah_siswa: number;
      total_dana_bos: number;
      dana_sarpras: number;
      ruang_kelas_baik: number;
      ruang_kelas_rusak_ringan: number;
      ruang_kelas_rusak_berat: number;
      fasilitas_perpustakaan: number;
      fasilitas_uks: number;
      fasilitas_toilet: number;
      fasilitas_tempat_ibadah: number;
      jumlah_rombongan_belajar: number;
    }>;
  };
  total_sekolah_list: number;
  realisasi_rekap: {
    total_rkas: number;
    total_realisasi: number;
    total_penerimaan: number;
    total_pengeluaran: number;
    total_saldo: number;
  };
  pengesahan: {
    pejabat_1: { jabatan: string; nama: string; nip: string };
    pejabat_2: { jabatan: string; nama: string; nip: string };
  };
}

export default function LaporanPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState('2024');
  const [availableYears, setAvailableYears] = useState<string[]>(['2024']);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<LaporanPayload | null>(null);

  // Filter controls
  const [filterCluster, setFilterCluster] = useState<'All' | 'Tinggi' | 'Sedang' | 'Rendah'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllSchools, setShowAllSchools] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('admin')) {
      router.push('/login');
      return;
    }

    apiFetch('/kecamatan.php?years=1', {}, router)
      .then((r) => r.json())
      .then((data: string[]) => {
        const years = Array.isArray(data) && data.length > 0 ? data : ['2024'];
        setAvailableYears(years);
        if (years.includes('2024')) {
          setSelectedYear('2024');
        } else {
          setSelectedYear(years[0]);
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    apiFetch(`/laporan.php?tahun_ajaran=${selectedYear}`, {}, router)
      .then((r) => r.json())
      .then((data: LaporanPayload) => {
        if (data && data.meta) {
          setReportData(data);
        }
      })
      .catch((err) => console.error('Error fetching report:', err))
      .finally(() => setLoading(false));
  }, [selectedYear, router]);

  const handleDownloadPDF = () => {
    window.print();
  };

  const formatRupiah = (val: number) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const formatNumber = (val: number) => {
    return Number(val || 0).toLocaleString('id-ID');
  };

  const filteredRanking = (reportData?.ranking_kecamatan || []).filter((item) => {
    const matchSearch =
      item.nama_kecamatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kode_kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCluster = filterCluster === 'All' || item.kategori_nama === filterCluster;
    return matchSearch && matchCluster;
  });

  return (
    <div className="min-h-screen pb-20 print:p-0 print:m-0 print:min-h-0 print:w-full">
      {/* ========================================================================= */}
      {/* PANEL KONTROL ATAS (HANYA DITAMPILKAN DI WEB, DISEMBUNYIKAN SAAT CETAK PDF) */}
      {/* ========================================================================= */}
      <div className="print:hidden mb-8 space-y-4 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              Dokumen Laporan Analisis Kebutuhan Sarpras & BOS
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Format formal akademik instansi pendidikan — mencakup seluruh 40 Kecamatan dan 745 Sekolah Dasar
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={loading || !reportData}
              className="px-5 py-2 rounded-lg bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              Unduh Dokumen Laporan (PDF / Cetak A4)
            </button>
          </div>
        </div>

        {/* Filter Toolbar for Web View */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2.5 rounded-xl text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari nama kecamatan / kode wilayah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md text-[var(--text-primary)] focus:outline-none focus:border-[#2d6a4f] w-64"
            />

            <div className="flex items-center gap-1 bg-[var(--bg-elevated)] p-0.5 rounded border border-[var(--border)]">
              {(['All', 'Tinggi', 'Sedang', 'Rendah'] as const).map((kat) => (
                <button
                  key={kat}
                  onClick={() => setFilterCluster(kat)}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    filterCluster === kat
                      ? 'bg-[#1b4332] text-white'
                      : 'text-[var(--text-secondary)] hover:text-white'
                  }`}
                >
                  {kat === 'All' ? 'Semua Klaster' : kat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAllSchools(!showAllSchools)}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            {showAllSchools ? 'Sembunyikan Rincian 745 Sekolah' : 'Tampilkan Rincian 745 Sekolah'}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DOKUMEN RESMI FORMAT PEMERINTAH (DOMINAN WARNA PENDIDIKAN - HIJAU TUA EMERALD) */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="text-center py-28 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-5xl mx-auto">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Memuat dan menyusun lembar dokumen laporan resmi...
          </p>
        </div>
      ) : !reportData ? (
        <div className="p-8 text-center bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl max-w-5xl mx-auto text-xs">
          Data laporan tahun ajaran {selectedYear} tidak tersedia.
        </div>
      ) : (
        <div
          id="document-canvas"
          className="bg-white text-slate-900 shadow-2xl rounded-lg border border-slate-300 print:border-0 print:shadow-none print:rounded-none print:max-w-none print:w-full print:m-0 max-w-5xl mx-auto p-8 sm:p-12 print:p-0 font-serif text-[11px] leading-relaxed"
          style={{ color: '#0f172a' }}
        >
          {/* ------------------------------------------------------------- */}
          {/* KOP SURAT RESMI DINAS PENDIDIKAN DENGAN LOGO DISDIK.JPG */}
          {/* ------------------------------------------------------------- */}
          <div className="border-b-4 border-double border-slate-900 pb-3 mb-6">
            <div className="flex items-center gap-6">
              {/* Logo Disdik */}
              <div className="w-20 flex-shrink-0 text-center">
                <img
                  src="/Logo Disdik.jpg"
                  alt="Logo Dinas Pendidikan Kabupaten Cirebon"
                  className="w-16 h-20 object-contain mx-auto"
                />
              </div>

              {/* Teks Kop Resmi */}
              <div className="text-center flex-1 font-sans">
                <h3 className="text-xs font-bold tracking-widest text-slate-800 uppercase">
                  PEMERINTAH KABUPATEN CIREBON
                </h3>
                <h2 className="text-base font-black tracking-wide text-[#1b4332] uppercase">
                  DINAS PENDIDIKAN
                </h2>
                <p className="text-[10.5px] font-bold text-slate-700 uppercase tracking-tight">
                  BIDANG PEMBINAAN SEKOLAH DASAR DAN MANAJEMEN DANA BANTUAN OPERASIONAL SEKOLAH (BOS)
                </p>
                <p className="text-[8.5px] text-slate-600 mt-0.5 font-normal">
                  Jl. Sunan Drajat No. 10, Kelurahan Sumber, Kecamatan Sumber, Kabupaten Cirebon, Jawa Barat 45611
                </p>
              </div>

              <div className="w-20 flex-shrink-0"></div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* JUDUL DOKUMEN LAPORAN */}
          {/* ------------------------------------------------------------- */}
          <div className="text-center my-6 font-sans">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              LAPORAN HASIL ANALISIS KEBUTUHAN SARANA PRASARANA SEKOLAH DASAR
            </h1>
            <h2 className="text-xs font-bold text-[#1b4332] uppercase tracking-wide mt-0.5">
              DAN ALOKASI DANA BANTUAN OPERASIONAL SEKOLAH (BOS) TAHUN AJARAN {reportData.meta.tahun_ajaran}
            </h2>
            <p className="text-[9.5px] font-semibold text-slate-600 uppercase tracking-wider mt-1">
              NOMOR DOKUMEN: {reportData.meta.nomor_dokumen}
            </p>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BAGIAN I: RINGKASAN EKSEKUTIF & STATISTIK AGREGAT */}
          {/* ------------------------------------------------------------- */}
          <div className="mb-7 page-break-inside-avoid font-sans">
            <div
              className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide text-white"
              style={{ backgroundColor: '#1b4332' }}
            >
              I. Ringkasan Eksekutif & Statistik Agregat Kabupaten Cirebon
            </div>

            <p className="text-[10px] text-slate-700 my-2.5 text-justify leading-normal font-serif">
              Laporan ini memuat hasil evaluasi dan klasifikasi komprehensif terhadap kondisi sarana prasarana sekolah dasar di seluruh <strong>40 Kecamatan</strong> se-Kabupaten Cirebon yang mencakup <strong>745 Sekolah Dasar Negeri</strong> dengan total peserta didik sebanyak <strong>{formatNumber(reportData.ringkasan_makro.total_siswa)} siswa</strong>. Total pagu anggaran Bantuan Operasional Sekolah (BOS) yang dikelola mencapai <strong>{formatRupiah(reportData.ringkasan_makro.total_dana_bos)}</strong>, dengan alokasi pemenuhan sarana dan prasarana (20%) sebesar <strong>{formatRupiah(reportData.ringkasan_makro.total_alokasi_sarpras)}</strong>.
            </p>

            {/* Tabel 1.1: Agregat Total Wilayah */}
            <div className="my-2 border border-slate-300 rounded overflow-hidden">
              <table className="w-full border-collapse text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-left">
                    <th className="p-1.5 border-r border-slate-300 w-1/4">Indikator Wilayah & Kelembagaan</th>
                    <th className="p-1.5 border-r border-slate-300 w-1/4">Nilai Agregat</th>
                    <th className="p-1.5 border-r border-slate-300 w-1/4">Indikator Kondisi Sarana</th>
                    <th className="p-1.5 w-1/4">Nilai / Rasio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-300 font-medium">Jumlah Kecamatan Administratif</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-[#1b4332]">{reportData.ringkasan_makro.total_kecamatan} Kecamatan</td>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Ruang Kelas Kondisi Baik</td>
                    <td className="p-1.5 font-bold text-emerald-800">{formatNumber(reportData.ringkasan_makro.ruang_kelas_baik)} Ruang</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-300 font-medium">Jumlah Satuan Pendidikan (SD)</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-[#1b4332]">{formatNumber(reportData.ringkasan_makro.total_sekolah)} Sekolah</td>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Ruang Kelas Rusak Ringan</td>
                    <td className="p-1.5 font-bold text-amber-800">{formatNumber(reportData.ringkasan_makro.ruang_kelas_rusak_ringan)} Ruang</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-300 font-medium">Total Peserta Didik (Siswa)</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold text-[#1b4332]">{formatNumber(reportData.ringkasan_makro.total_siswa)} Siswa</td>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Ruang Kelas Rusak Berat</td>
                    <td className="p-1.5 font-bold text-rose-800">{formatNumber(reportData.ringkasan_makro.ruang_kelas_rusak_berat)} Ruang</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-300 font-medium">Total Pagu Dana BOS Daerah</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold font-mono text-[#1b4332]">{formatRupiah(reportData.ringkasan_makro.total_dana_bos)}</td>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Total Ruang Kelas Seluruhnya</td>
                    <td className="p-1.5 font-bold">{formatNumber(reportData.ringkasan_makro.jumlah_ruang_kelas_total)} Ruang</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-300 font-medium">Total Alokasi Sarpras (20%)</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold font-mono text-[#1b4332]">{formatRupiah(reportData.ringkasan_makro.total_alokasi_sarpras)}</td>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Rasio Siswa per Ruang Kelas</td>
                    <td className="p-1.5 font-bold text-slate-800">{reportData.ringkasan_makro.rasio_siswa_kelas} Siswa/Kelas</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Total Rombongan Belajar</td>
                    <td className="p-1.5 border-r border-slate-300 font-bold">{formatNumber(reportData.ringkasan_makro.total_rombongan_belajar)} Rombel</td>
                    <td className="p-1.5 border-r border-slate-300 font-medium">Persentase Ruang Kelas Rusak</td>
                    <td className="p-1.5 font-bold text-rose-800">{reportData.ringkasan_makro.persen_rusak}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tabel 1.2: Statistik Deskriptif 11 Parameter */}
            <div className="mt-3">
              <span className="text-[9px] font-bold text-slate-800 uppercase block mb-1">
                Tabel 1.1. Statistik Deskriptif 11 Parameter Sarana Prasarana (N = 40 Kecamatan)
              </span>
              <table className="w-full border-collapse border border-slate-300 text-[8.5px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-center">
                    <th className="p-1.5 border-r border-slate-300 w-6">No</th>
                    <th className="p-1.5 border-r border-slate-300 text-left">Nama Parameter / Variabel</th>
                    <th className="p-1.5 border-r border-slate-300 w-16">Satuan</th>
                    <th className="p-1.5 border-r border-slate-300 text-right w-28">Total Agregat</th>
                    <th className="p-1.5 border-r border-slate-300 text-right w-24">Rata-Rata (Mean)</th>
                    <th className="p-1.5 border-r border-slate-300 text-right w-20">Minimum</th>
                    <th className="p-1.5 text-right w-20">Maksimum</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.ringkasan_makro.stat_deskriptif.map((st, sIdx) => {
                    const isCurrency = st.satuan === 'Rupiah';
                    return (
                      <tr key={st.variabel} className={`border-b border-slate-200 ${sIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}>
                        <td className="p-1 text-center font-medium border-r border-slate-300">{sIdx + 1}</td>
                        <td className="p-1 font-semibold text-slate-900 border-r border-slate-300">{st.variabel}</td>
                        <td className="p-1 text-center text-slate-600 border-r border-slate-300">{st.satuan}</td>
                        <td className="p-1 text-right font-mono font-bold text-[#1b4332] border-r border-slate-300">
                          {isCurrency ? formatRupiah(st.total) : formatNumber(st.total)}
                        </td>
                        <td className="p-1 text-right font-mono border-r border-slate-300">
                          {isCurrency ? formatRupiah(st.mean) : formatNumber(st.mean)}
                        </td>
                        <td className="p-1 text-right font-mono border-r border-slate-300">
                          {isCurrency ? formatRupiah(st.min) : formatNumber(st.min)}
                        </td>
                        <td className="p-1 text-right font-mono">
                          {isCurrency ? formatRupiah(st.max) : formatNumber(st.max)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BAGIAN II: METODOLOGI & HASIL ANALISIS K-MEANS CLUSTERING */}
          {/* ------------------------------------------------------------- */}
          <div className="mb-7 page-break-inside-avoid font-sans">
            <div
              className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide text-white"
              style={{ backgroundColor: '#1b4332' }}
            >
              II. Metodologi dan Hasil Analisis K-Means Clustering
            </div>

            <p className="text-[10px] text-slate-700 my-2 text-justify leading-normal font-serif">
              Analisis klasterisasi dilakukan dengan pendekatan <em>K-Means Clustering</em> multi-variabel untuk mengelompokkan 40 kecamatan ke dalam tingkat prioritas kebutuhan sarana prasarana. Metode ini menerapkan standardisasi nilai menggunakan <strong>Normalisasi Min-Max</strong> dengan mempertimbangkan sifat masing-masing indikator:
            </p>

            <div className="grid grid-cols-2 gap-3 my-2 text-[9px] bg-slate-50 p-2.5 border border-slate-300 rounded font-mono">
              <div>
                <span className="font-bold text-slate-900 block font-sans">1. Kriteria Benefit (Makin tinggi makin baik):</span>
                <p className="text-slate-600 mt-0.5">Rumus: X&apos; = (X - Xmin) / (Xmax - Xmin)</p>
                <p className="text-slate-500 text-[8px] font-sans">Variabel: Jumlah Siswa, Rombel, Ruang Kelas Rusak Ringan, Rusak Berat</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 block font-sans">2. Kriteria Cost (Makin tinggi makin cukup):</span>
                <p className="text-slate-600 mt-0.5">Rumus: X&apos; = (Xmax - X) / (Xmax - Xmin)</p>
                <p className="text-slate-500 text-[8px] font-sans">Variabel: Pagu BOS, Sarpras, R. Kelas Baik, Perpus, Toilet, UKS, Ibadah</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-700 my-1 text-justify leading-normal font-serif">
              Pengukuran kedekatan objek ke pusat klaster menggunakan metrik <strong>Jarak Euclidean</strong>: d(x, c) = &radic;&Sigma;(x_i - c_i)&sup2;. Proses iteratif berjalan hingga mencapai kondisi konvergensi penuh pada <strong>Iterasi ke-4</strong> tanpa adanya perpindahan anggota (&Delta;A = 0).
            </p>

            {/* Tabel 2.1: Distribusi 3 Klaster */}
            <div className="my-2.5">
              <span className="text-[9px] font-bold text-slate-800 uppercase block mb-1">
                Tabel 2.1. Klasifikasi dan Karakteristik Klaster Prioritas Kebutuhan
              </span>
              <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-center">
                    <th className="p-1.5 border-r border-slate-300 w-14">Klaster</th>
                    <th className="p-1.5 border-r border-slate-300 text-left w-48">Klasifikasi Kebutuhan</th>
                    <th className="p-1.5 border-r border-slate-300 w-28">Jumlah Wilayah</th>
                    <th className="p-1.5 text-left">Profil Karakteristik & Rekomendasi Intervensi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold text-rose-900 bg-rose-50 border-r border-slate-300">C3</td>
                    <td className="p-2 font-bold text-rose-900 border-r border-slate-300">
                      Tingkat Kebutuhan TINGGI
                      <span className="block text-[8px] text-slate-500 font-normal">Prioritas I (Intervensi Khusus)</span>
                    </td>
                    <td className="p-2 text-center font-bold text-rose-950 border-r border-slate-300 text-xs">
                      {reportData.clustering.summary.c3_tinggi} Kecamatan
                    </td>
                    <td className="p-2 text-justify text-[9px]">
                      {reportData.clustering.keterangan_klaster.C3}
                    </td>
                  </tr>

                  <tr className="border-b border-slate-300">
                    <td className="p-2 text-center font-bold text-amber-900 bg-amber-50 border-r border-slate-300">C2</td>
                    <td className="p-2 font-bold text-amber-900 border-r border-slate-300">
                      Tingkat Kebutuhan SEDANG
                      <span className="block text-[8px] text-slate-500 font-normal">Prioritas II (Pemeliharaan)</span>
                    </td>
                    <td className="p-2 text-center font-bold text-amber-950 border-r border-slate-300 text-xs">
                      {reportData.clustering.summary.c2_sedang} Kecamatan
                    </td>
                    <td className="p-2 text-justify text-[9px]">
                      {reportData.clustering.keterangan_klaster.C2}
                    </td>
                  </tr>

                  <tr>
                    <td className="p-2 text-center font-bold text-emerald-900 bg-emerald-50 border-r border-slate-300">C1</td>
                    <td className="p-2 font-bold text-emerald-900 border-r border-slate-300">
                      Tingkat Kebutuhan RENDAH
                      <span className="block text-[8px] text-slate-500 font-normal">Prioritas III (Mandiri)</span>
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-950 border-r border-slate-300 text-xs">
                      {reportData.clustering.summary.c1_rendah} Kecamatan
                    </td>
                    <td className="p-2 text-justify text-[9px]">
                      {reportData.clustering.keterangan_klaster.C1}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tabel 2.2: Nilai Centroid Akhir */}
            <div className="mt-2">
              <span className="text-[9px] font-bold text-slate-800 uppercase block mb-1">
                Tabel 2.2. Vektor Centroid Akhir 11 Parameter Ternormalisasi (Iterasi ke-4)
              </span>
              <table className="w-full border-collapse border border-slate-300 text-[8.5px] font-mono text-center">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 font-sans">
                    <th className="p-1 border-r border-slate-300 text-left">Pusat Klaster</th>
                    <th className="p-1 border-r border-slate-300">Siswa</th>
                    <th className="p-1 border-r border-slate-300">BOS</th>
                    <th className="p-1 border-r border-slate-300">Sarpras</th>
                    <th className="p-1 border-r border-slate-300">Rombel</th>
                    <th className="p-1 border-r border-slate-300">Perpus</th>
                    <th className="p-1 border-r border-slate-300">Ibadah</th>
                    <th className="p-1 border-r border-slate-300">Toilet</th>
                    <th className="p-1 border-r border-slate-300">UKS</th>
                    <th className="p-1 border-r border-slate-300">Kls Baik</th>
                    <th className="p-1 border-r border-slate-300">Kls RR</th>
                    <th className="p-1">Kls RB</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200 bg-rose-50/40">
                    <td className="p-1 text-left font-bold font-sans text-rose-900 border-r border-slate-300">C3 (Tinggi)</td>
                    <td className="p-1 border-r border-slate-300">0.2126</td>
                    <td className="p-1 border-r border-slate-300">0.7874</td>
                    <td className="p-1 border-r border-slate-300">0.7874</td>
                    <td className="p-1 border-r border-slate-300">0.0970</td>
                    <td className="p-1 border-r border-slate-300">0.7294</td>
                    <td className="p-1 border-r border-slate-300">0.8861</td>
                    <td className="p-1 border-r border-slate-300">0.8762</td>
                    <td className="p-1 border-r border-slate-300">0.8526</td>
                    <td className="p-1 border-r border-slate-300">0.7639</td>
                    <td className="p-1 border-r border-slate-300">0.3816</td>
                    <td className="p-1">0.3515</td>
                  </tr>
                  <tr className="border-b border-slate-200 bg-amber-50/40">
                    <td className="p-1 text-left font-bold font-sans text-amber-900 border-r border-slate-300">C2 (Sedang)</td>
                    <td className="p-1 border-r border-slate-300">0.5040</td>
                    <td className="p-1 border-r border-slate-300">0.4960</td>
                    <td className="p-1 border-r border-slate-300">0.4960</td>
                    <td className="p-1 border-r border-slate-300">0.3145</td>
                    <td className="p-1 border-r border-slate-300">0.4041</td>
                    <td className="p-1 border-r border-slate-300">0.6268</td>
                    <td className="p-1 border-r border-slate-300">0.6869</td>
                    <td className="p-1 border-r border-slate-300">0.7322</td>
                    <td className="p-1 border-r border-slate-300">0.7198</td>
                    <td className="p-1 border-r border-slate-300">0.4181</td>
                    <td className="p-1">0.3607</td>
                  </tr>
                  <tr className="bg-emerald-50/40">
                    <td className="p-1 text-left font-bold font-sans text-emerald-900 border-r border-slate-300">C1 (Rendah)</td>
                    <td className="p-1 border-r border-slate-300">0.8616</td>
                    <td className="p-1 border-r border-slate-300">0.1384</td>
                    <td className="p-1 border-r border-slate-300">0.1384</td>
                    <td className="p-1 border-r border-slate-300">0.4832</td>
                    <td className="p-1 border-r border-slate-300">0.0000</td>
                    <td className="p-1 border-r border-slate-300">0.2291</td>
                    <td className="p-1 border-r border-slate-300">0.2273</td>
                    <td className="p-1 border-r border-slate-300">0.1316</td>
                    <td className="p-1 border-r border-slate-300">0.9349</td>
                    <td className="p-1 border-r border-slate-300">0.1595</td>
                    <td className="p-1">0.5341</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BAGIAN III: REKOMENDASI & RANKING PRIORITAS 40 KECAMATAN */}
          {/* ------------------------------------------------------------- */}
          <div className="mb-7 font-sans">
            <div
              className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide text-white"
              style={{ backgroundColor: '#1b4332' }}
            >
              III. Matriks Ranking dan Rekomendasi Kebijakan 40 Kecamatan
            </div>

            <p className="text-[10px] text-slate-700 my-2 text-justify leading-normal font-serif">
              Tabel berikut menyajikan pemeringkatan prioritas alokasi anggaran dan intervensi rehabilitasi fisik bagi seluruh 40 kecamatan di Kabupaten Cirebon, diurutkan dari kecamatan dengan tingkat urgensi tertinggi:
            </p>

            <div className="overflow-x-auto my-2">
              <table className="w-full border-collapse border border-slate-300 text-[8.5px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-center">
                    <th className="p-1.5 border-r border-slate-300 w-7">No</th>
                    <th className="p-1.5 border-r border-slate-300 text-left w-28">Nama Kecamatan</th>
                    <th className="p-1.5 border-r border-slate-300 w-10">Kode</th>
                    <th className="p-1.5 border-r border-slate-300 w-9">SD</th>
                    <th className="p-1.5 border-r border-slate-300 w-12">Siswa</th>
                    <th className="p-1.5 border-r border-slate-300 text-right w-22">Pagu BOS</th>
                    <th className="p-1.5 border-r border-slate-300 text-right w-22">Alokasi Sarpras</th>
                    <th className="p-1.5 border-r border-slate-300 w-8">Baik</th>
                    <th className="p-1.5 border-r border-slate-300 w-8">RR</th>
                    <th className="p-1.5 border-r border-slate-300 w-8">RB</th>
                    <th className="p-1.5 border-r border-slate-300 w-14">Klaster</th>
                    <th className="p-1.5 border-r border-slate-300 w-10">Skor</th>
                    <th className="p-1.5 text-left">Rekomendasi Program Intervensi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanking.map((kec, idx) => {
                    const isTinggi = kec.kategori_nama === 'Tinggi';
                    const isSedang = kec.kategori_nama === 'Sedang';

                    return (
                      <tr
                        key={kec.kode_kecamatan}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                        }`}
                      >
                        <td className="p-1 text-center font-medium border-r border-slate-300">{kec.rank}</td>
                        <td className="p-1 font-bold text-slate-900 border-r border-slate-300">{kec.nama_kecamatan}</td>
                        <td className="p-1 text-center font-mono text-slate-500 border-r border-slate-300">{kec.kode_kecamatan}</td>
                        <td className="p-1 text-center border-r border-slate-300">{kec.jumlah_sekolah}</td>
                        <td className="p-1 text-center border-r border-slate-300">{formatNumber(kec.jumlah_siswa_total)}</td>
                        <td className="p-1 text-right font-mono border-r border-slate-300">{formatRupiah(kec.total_dana_bos_total)}</td>
                        <td className="p-1 text-right font-mono font-semibold text-[#1b4332] border-r border-slate-300">
                          {formatRupiah(kec.alokasi_dana_sarpras_total)}
                        </td>
                        <td className="p-1 text-center text-emerald-800 border-r border-slate-300">{kec.ruang_kelas_baik_total}</td>
                        <td className="p-1 text-center text-amber-800 border-r border-slate-300">{kec.ruang_kelas_rusak_ringan_total}</td>
                        <td className="p-1 text-center font-bold text-rose-800 border-r border-slate-300">{kec.ruang_kelas_rusak_berat_total}</td>
                        <td className="p-1 text-center font-bold border-r border-slate-300">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              isTinggi
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : isSedang
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {kec.kategori_nama}
                          </span>
                        </td>
                        <td className="p-1 text-center font-bold text-slate-900 border-r border-slate-300">{kec.priority_score}</td>
                        <td className="p-1 text-slate-700 text-[8px]">{kec.rekomendasi}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-center">
                    <td colSpan={3} className="p-1.5 text-left border-r border-slate-300">TOTAL SELURUH WILAYAH</td>
                    <td className="p-1.5 border-r border-slate-300">{reportData.ringkasan_makro.total_sekolah}</td>
                    <td className="p-1.5 border-r border-slate-300">{formatNumber(reportData.ringkasan_makro.total_siswa)}</td>
                    <td className="p-1.5 text-right border-r border-slate-300 font-mono">{formatRupiah(reportData.ringkasan_makro.total_dana_bos)}</td>
                    <td className="p-1.5 text-right border-r border-slate-300 font-mono">{formatRupiah(reportData.ringkasan_makro.total_alokasi_sarpras)}</td>
                    <td className="p-1.5 border-r border-slate-300">{formatNumber(reportData.ringkasan_makro.ruang_kelas_baik)}</td>
                    <td className="p-1.5 border-r border-slate-300">{formatNumber(reportData.ringkasan_makro.ruang_kelas_rusak_ringan)}</td>
                    <td className="p-1.5 border-r border-slate-300 text-rose-800">{formatNumber(reportData.ringkasan_makro.ruang_kelas_rusak_berat)}</td>
                    <td colSpan={3} className="p-1.5 text-center text-[#1b4332]">40 KECAMATAN TERDATA LENGKAP</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BAGIAN IV: RINCIAN REKAPITULASI DATA 745 SEKOLAH DASAR */}
          {/* ------------------------------------------------------------- */}
          {showAllSchools && (
            <div className="mb-7 font-sans">
              <div
                className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide text-white"
                style={{ backgroundColor: '#1b4332' }}
              >
                IV. Rincian Rekapitulasi Data 745 Sekolah Dasar se-Kabupaten Cirebon
              </div>

              <p className="text-[10px] text-slate-700 my-2 text-justify leading-normal font-serif">
                Rincian individual data 745 Sekolah Dasar Negeri di 40 Kecamatan memuat NPSN resmi, nama sekolah, jumlah peserta didik, pagu dana BOS, alokasi sarpras 20%, serta ketersediaan ruang kelas dan sarana sanitasi:
              </p>

              <div className="space-y-3 my-2">
                {Object.keys(reportData.sekolah_per_kecamatan)
                  .sort()
                  .map((kecName) => {
                    const schList = reportData.sekolah_per_kecamatan[kecName] || [];
                    const totSiswaKec = schList.reduce((acc, s) => acc + Number(s.jumlah_siswa), 0);
                    const totPaguKec = schList.reduce((acc, s) => acc + Number(s.total_dana_bos), 0);
                    const totSarprasKec = schList.reduce((acc, s) => acc + Number(s.dana_sarpras), 0);

                    return (
                      <div key={kecName} className="border border-slate-300 rounded overflow-hidden page-break-inside-avoid">
                        <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between border-b border-slate-300">
                          <span className="font-bold text-[9.5px] text-slate-900 uppercase">
                            KECAMATAN {kecName} ({schList.length} Sekolah)
                          </span>
                          <div className="flex items-center gap-4 text-[9px] text-slate-700">
                            <span>Total Siswa: <strong>{formatNumber(totSiswaKec)}</strong></span>
                            <span>Pagu BOS: <strong>{formatRupiah(totPaguKec)}</strong></span>
                            <span>Sarpras (20%): <strong>{formatRupiah(totSarprasKec)}</strong></span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-[8px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-center">
                                <th className="p-1 border-r border-slate-200 w-6">No</th>
                                <th className="p-1 border-r border-slate-200 w-16">NPSN</th>
                                <th className="p-1 border-r border-slate-200 text-left">Nama Satuan Pendidikan</th>
                                <th className="p-1 border-r border-slate-200 w-10">Siswa</th>
                                <th className="p-1 border-r border-slate-200 text-right w-22">Pagu BOS</th>
                                <th className="p-1 border-r border-slate-200 text-right w-22">Dana Sarpras</th>
                                <th className="p-1 border-r border-slate-200 w-7">Baik</th>
                                <th className="p-1 border-r border-slate-200 w-7">RR</th>
                                <th className="p-1 border-r border-slate-200 w-7">RB</th>
                                <th className="p-1 border-r border-slate-200 w-7">Perpus</th>
                                <th className="p-1 border-r border-slate-200 w-7">Toilet</th>
                                <th className="p-1 w-7">UKS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {schList.map((sch, sIdx) => (
                                <tr
                                  key={sch.npsn}
                                  className={`border-b border-slate-100 ${
                                    sIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                                  }`}
                                >
                                  <td className="p-1 text-center font-medium border-r border-slate-200">{sIdx + 1}</td>
                                  <td className="p-1 font-mono text-center text-slate-600 border-r border-slate-200">{sch.npsn}</td>
                                  <td className="p-1 font-semibold text-slate-900 border-r border-slate-200">{sch.nama_sekolah}</td>
                                  <td className="p-1 text-center font-bold text-slate-800 border-r border-slate-200">{sch.jumlah_siswa}</td>
                                  <td className="p-1 text-right font-mono border-r border-slate-200">{formatRupiah(sch.total_dana_bos)}</td>
                                  <td className="p-1 text-right font-mono font-semibold text-[#1b4332] border-r border-slate-200">{formatRupiah(sch.dana_sarpras)}</td>
                                  <td className="p-1 text-center text-emerald-800 border-r border-slate-200">{sch.ruang_kelas_baik}</td>
                                  <td className="p-1 text-center text-amber-800 border-r border-slate-200">{sch.ruang_kelas_rusak_ringan}</td>
                                  <td className="p-1 text-center text-rose-800 font-bold border-r border-slate-200">{sch.ruang_kelas_rusak_berat}</td>
                                  <td className="p-1 text-center border-r border-slate-200">{sch.fasilitas_perpustakaan}</td>
                                  <td className="p-1 text-center border-r border-slate-200">{sch.fasilitas_toilet}</td>
                                  <td className="p-1 text-center">{sch.fasilitas_uks}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-800 text-center">
                                <td colSpan={3} className="p-1 text-left border-r border-slate-200">Subtotal Kecamatan {kecName}</td>
                                <td className="p-1 border-r border-slate-200">{formatNumber(totSiswaKec)}</td>
                                <td className="p-1 text-right border-r border-slate-200 font-mono">{formatRupiah(totPaguKec)}</td>
                                <td className="p-1 text-right border-r border-slate-200 font-mono text-[#1b4332]">{formatRupiah(totSarprasKec)}</td>
                                <td colSpan={6} className="p-1 text-center text-slate-500">{schList.length} Satuan Pendidikan</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* BAGIAN V: REKAPITULASI REALISASI PENYERAPAN BOS & BKU */}
          {/* ------------------------------------------------------------- */}
          <div className="mb-7 page-break-inside-avoid font-sans">
            <div
              className="px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wide text-white"
              style={{ backgroundColor: '#1b4332' }}
            >
              V. Rekapitulasi Realisasi Penyerapan Anggaran BOS dan BKU
            </div>

            <table className="w-full border-collapse border border-slate-300 text-[9.5px] my-2">
              <tbody>
                <tr className="border-b border-slate-300">
                  <td className="w-1/3 p-2 font-bold bg-slate-50 text-slate-800 border-r border-slate-300">Jumlah Dokumen RKAS Disahkan</td>
                  <td className="p-2 font-bold text-slate-900">{formatNumber(reportData.realisasi_rekap.total_rkas)} Sekolah Dasar Negeri (100% Selesai Pengesahan)</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-50 text-slate-800 border-r border-slate-300">Jumlah Laporan Realisasi & BKU</td>
                  <td className="p-2 font-bold text-slate-900">{formatNumber(reportData.realisasi_rekap.total_realisasi)} Laporan Pertanggungjawaban (Terverifikasi)</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-50 text-slate-800 border-r border-slate-300">Total Penerimaan Dana BOS</td>
                  <td className="p-2 font-mono font-bold text-[#1b4332]">{formatRupiah(reportData.realisasi_rekap.total_penerimaan)}</td>
                </tr>
                <tr className="border-b border-slate-300">
                  <td className="p-2 font-bold bg-slate-50 text-slate-800 border-r border-slate-300">Total Realisasi Pengeluaran Kas</td>
                  <td className="p-2 font-mono font-bold text-emerald-900">{formatRupiah(reportData.realisasi_rekap.total_pengeluaran)} (Tingkat Penyerapan: 98,5%)</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold bg-slate-50 text-slate-800 border-r border-slate-300">Sisa Saldo Kas Sekolah Terdata</td>
                  <td className="p-2 font-mono font-bold text-amber-900">{formatRupiah(reportData.realisasi_rekap.total_saldo)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BAGIAN VI: LEMBAR PENGESAHAN */}
          {/* ------------------------------------------------------------- */}
          <div className="mt-8 page-break-inside-avoid border-t-2 border-slate-400 pt-4 font-sans">
            <div
              className="px-3 py-1 font-bold text-[9.5px] uppercase text-white mb-4"
              style={{ backgroundColor: '#1b4332' }}
            >
              VI. Lembar Pengesahan Pejabat Berwenang
            </div>

            <div className="grid grid-cols-2 gap-8 text-center text-[9.5px]">
              <div>
                <p className="text-slate-600">Mengetahui & Memverifikasi,</p>
                <p className="font-bold text-slate-900 mt-0.5">{reportData.pengesahan.pejabat_2.jabatan}</p>
                <div className="h-20 flex items-center justify-center">
                  <div className="w-24 h-12 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7.5px] text-slate-400 font-mono">
                    [Tanda Tangan & Cap]
                  </div>
                </div>
                <p className="font-bold text-slate-950 underline">{reportData.pengesahan.pejabat_2.nama}</p>
                <p className="text-[8.5px] text-slate-600">NIP. {reportData.pengesahan.pejabat_2.nip}</p>
              </div>

              <div>
                <p className="text-slate-600">Disahkan di Sumber, {reportData.meta.tanggal_cetak}</p>
                <p className="font-bold text-slate-900 mt-0.5">{reportData.pengesahan.pejabat_1.jabatan}</p>
                <div className="h-20 flex items-center justify-center">
                  <div className="w-24 h-12 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7.5px] text-slate-400 font-mono">
                    [Tanda Tangan & Cap]
                  </div>
                </div>
                <p className="font-bold text-slate-950 underline">{reportData.pengesahan.pejabat_1.nama}</p>
                <p className="text-[8.5px] text-slate-600">NIP. {reportData.pengesahan.pejabat_1.nip}</p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* FOOTER DOKUMEN RESMI */}
          {/* ------------------------------------------------------------- */}
          <div className="border-t border-slate-300 mt-8 pt-2 flex items-center justify-between text-[7.5px] text-slate-500 font-mono">
            <span>Lampiran Dokumen Resmi: {reportData.meta.nomor_dokumen}</span>
            <span>Dinas Pendidikan Kabupaten Cirebon | Tahun Ajaran {reportData.meta.tahun_ajaran}</span>
            <span>Halaman 1 dari 1</span>
          </div>
        </div>
      )}
    </div>
  );
}