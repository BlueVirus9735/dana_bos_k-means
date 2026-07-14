-- Database: dana_bos (VERSI TERBARU)

CREATE DATABASE IF NOT EXISTS dana_bos;
USE dana_bos;

-- Tabel Admin
CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO admin (username, password, nama, email) VALUES 
('admin', '$2y$10$.XzTs1P7JpGEVhirZhyoh.U6zwQfcBqvwq8w2e1RchkGqETPXGE1q', 'Administrator', 'admin@dinaspendidikan.go.id')
ON DUPLICATE KEY UPDATE username = username;

-- Tabel Kecamatan (dengan data sarpras per kecamatan)
CREATE TABLE IF NOT EXISTS kecamatan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_kecamatan VARCHAR(100) NOT NULL UNIQUE,
    kode_kecamatan VARCHAR(20) NOT NULL UNIQUE,
    tahun_ajaran VARCHAR(20) NOT NULL DEFAULT '2024/2025',
    ruang_kelas_baik INT NOT NULL DEFAULT 0,
    ruang_kelas_rusak_ringan INT NOT NULL DEFAULT 0,
    ruang_kelas_rusak_berat INT NOT NULL DEFAULT 0,
    jumlah_ruang_kelas INT NOT NULL DEFAULT 0,
    fasilitas_lapangan_olahraga INT NOT NULL DEFAULT 0,
    fasilitas_perpustakaan INT NOT NULL DEFAULT 0,
    fasilitas_uks INT NOT NULL DEFAULT 0,
    fasilitas_toilet INT NOT NULL DEFAULT 0,
    fasilitas_tempat_ibadah INT NOT NULL DEFAULT 0,
    jumlah_rombongan_belajar INT NOT NULL DEFAULT 0,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Sekolah
CREATE TABLE IF NOT EXISTS sekolah (
    id INT AUTO_INCREMENT PRIMARY KEY,
    npsn VARCHAR(20) NOT NULL UNIQUE,
    nama_sekolah VARCHAR(200) NOT NULL,
    kecamatan_id INT NOT NULL,
    alamat TEXT,
    jenjang VARCHAR(50) NOT NULL, -- SD/SMP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE
);

-- Tabel Data BOS per Sekolah per Tahun
-- alokasi_dana_sarpras = 20% dari total_dana_bos (dihitung di aplikasi)
CREATE TABLE IF NOT EXISTS data_sekolah (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sekolah_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    jumlah_siswa INT NOT NULL DEFAULT 0,
    total_dana_bos DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
    UNIQUE KEY (sekolah_id, tahun_ajaran)
);

-- Tabel Hasil Cluster
CREATE TABLE IF NOT EXISTS hasil_cluster (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kecamatan_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    cluster_kategori INT NOT NULL, -- 1: Rendah, 2: Sedang, 3: Tinggi
    nilai_cluster DECIMAL(10, 4) NOT NULL,
    jumlah_siswa_total INT NOT NULL DEFAULT 0,
    ruang_kelas_baik_total INT NOT NULL DEFAULT 0,
    ruang_kelas_rusak_ringan_total INT NOT NULL DEFAULT 0,
    ruang_kelas_rusak_berat_total INT NOT NULL DEFAULT 0,
    jumlah_ruang_kelas_total INT NOT NULL DEFAULT 0,
    fasilitas_lapangan_olahraga_total INT NOT NULL DEFAULT 0,
    fasilitas_perpustakaan_total INT NOT NULL DEFAULT 0,
    fasilitas_uks_total INT NOT NULL DEFAULT 0,
    fasilitas_toilet_total INT NOT NULL DEFAULT 0,
    fasilitas_tempat_ibadah_total INT NOT NULL DEFAULT 0,
    jumlah_rombongan_belajar_total INT NOT NULL DEFAULT 0,
    total_dana_bos_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    alokasi_dana_sarpras_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id) ON DELETE CASCADE,
    UNIQUE KEY (kecamatan_id, tahun_ajaran)
);

-- Tabel Detail Perhitungan K-Means
CREATE TABLE IF NOT EXISTS detail_perhitungan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hasil_cluster_id INT NOT NULL,
    iterasi INT NOT NULL,
    cluster_center_1 DECIMAL(10, 4) NOT NULL,
    cluster_center_2 DECIMAL(10, 4) NOT NULL,
    cluster_center_3 DECIMAL(10, 4) NOT NULL,
    inertia DECIMAL(15, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hasil_cluster_id) REFERENCES hasil_cluster(id) ON DELETE CASCADE
);

-- Tabel Riwayat Input Data BOS (ganti upload_history)
CREATE TABLE IF NOT EXISTS input_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    keterangan VARCHAR(255),
    jumlah_data INT NOT NULL DEFAULT 0,
    tanggal_input TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
);

-- ============================================================
-- SISTEM 2 ROLE: ADMIN DINAS + OPERATOR SEKOLAH
-- ============================================================

-- Tabel Konfigurasi Tahun Ajaran (admin kelola periode aktif)
CREATE TABLE IF NOT EXISTS tahun_ajaran_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tahun_ajaran VARCHAR(20) NOT NULL UNIQUE,
    status ENUM('aktif','tutup','arsip') DEFAULT 'aktif',
    batas_submit_rkas DATE NULL,
    batas_submit_laporan DATE NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE CASCADE
);

-- Tabel Operator Sekolah (1 sekolah = 1 operator)
CREATE TABLE IF NOT EXISTS operator_sekolah (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    sekolah_id INT NOT NULL UNIQUE,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE
);

-- Tabel Sarpras per Sekolah per Tahun (diinput operator, diagregasi ke kecamatan)
CREATE TABLE IF NOT EXISTS sekolah_sarpras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sekolah_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    ruang_kelas_baik INT NOT NULL DEFAULT 0,
    ruang_kelas_rusak_ringan INT NOT NULL DEFAULT 0,
    ruang_kelas_rusak_berat INT NOT NULL DEFAULT 0,
    jumlah_ruang_kelas INT NOT NULL DEFAULT 0,
    fasilitas_lapangan_olahraga INT NOT NULL DEFAULT 0,
    fasilitas_perpustakaan INT NOT NULL DEFAULT 0,
    fasilitas_uks INT NOT NULL DEFAULT 0,
    fasilitas_toilet INT NOT NULL DEFAULT 0,
    fasilitas_tempat_ibadah INT NOT NULL DEFAULT 0,
    jumlah_rombongan_belajar INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
    UNIQUE KEY uq_sekolah_sarpras (sekolah_id, tahun_ajaran)
);

-- Tabel RKAS - Header (Rencana Kegiatan dan Anggaran Sekolah)
CREATE TABLE IF NOT EXISTS rkas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sekolah_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    status ENUM('draft','pending','revisi','disahkan') DEFAULT 'draft',
    catatan_revisi TEXT NULL,
    tanggal_submit TIMESTAMP NULL,
    tanggal_verifikasi TIMESTAMP NULL,
    admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE SET NULL,
    UNIQUE KEY uq_rkas (sekolah_id, tahun_ajaran)
);

-- Tabel RKAS Detail - Item Kegiatan
CREATE TABLE IF NOT EXISTS rkas_detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rkas_id INT NOT NULL,
    komponen_kegiatan VARCHAR(200) NOT NULL,
    uraian TEXT,
    volume INT DEFAULT 1,
    satuan VARCHAR(50),
    harga_satuan DECIMAL(15,2) DEFAULT 0.00,
    jumlah DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rkas_id) REFERENCES rkas(id) ON DELETE CASCADE
);

-- Tabel Realisasi Dana BOS - Header
CREATE TABLE IF NOT EXISTS realisasi_bos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sekolah_id INT NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    rkas_id INT NULL,
    total_penerimaan DECIMAL(15,2) DEFAULT 0.00,
    total_pengeluaran DECIMAL(15,2) DEFAULT 0.00,
    saldo DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('draft','submitted','pembinaan','terverifikasi') DEFAULT 'draft',
    catatan_validasi TEXT NULL,
    tanggal_submit TIMESTAMP NULL,
    tanggal_validasi TIMESTAMP NULL,
    admin_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sekolah_id) REFERENCES sekolah(id) ON DELETE CASCADE,
    FOREIGN KEY (rkas_id) REFERENCES rkas(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE SET NULL,
    UNIQUE KEY uq_realisasi (sekolah_id, tahun_ajaran)
);

-- Tabel Realisasi Detail - Item per Komponen
CREATE TABLE IF NOT EXISTS realisasi_detail (
    id INT AUTO_INCREMENT PRIMARY KEY,
    realisasi_id INT NOT NULL,
    rkas_detail_id INT NULL,
    komponen_kegiatan VARCHAR(200) NOT NULL,
    uraian TEXT,
    anggaran DECIMAL(15,2) DEFAULT 0.00,
    realisasi DECIMAL(15,2) DEFAULT 0.00,
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (realisasi_id) REFERENCES realisasi_bos(id) ON DELETE CASCADE,
    FOREIGN KEY (rkas_detail_id) REFERENCES rkas_detail(id) ON DELETE SET NULL
);

-- Tabel BKU (Buku Kas Umum)
CREATE TABLE IF NOT EXISTS bku (
    id INT AUTO_INCREMENT PRIMARY KEY,
    realisasi_id INT NOT NULL,
    tanggal DATE NOT NULL,
    no_bukti VARCHAR(100) DEFAULT NULL,
    kode_kegiatan VARCHAR(100) DEFAULT NULL,
    kode_rekening VARCHAR(100) DEFAULT NULL,
    uraian TEXT NOT NULL,
    penerimaan DECIMAL(15,2) DEFAULT 0.00,
    pengeluaran DECIMAL(15,2) DEFAULT 0.00,
    saldo DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (realisasi_id) REFERENCES realisasi_bos(id) ON DELETE CASCADE
);
