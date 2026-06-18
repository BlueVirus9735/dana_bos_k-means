<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/includes/db.php';

$queries = [
    "ALTER TABLE kecamatan DROP COLUMN jumlah_ruang_kelas",
    "ALTER TABLE kecamatan DROP COLUMN jumlah_fasilitas",
    "ALTER TABLE kecamatan DROP COLUMN jumlah_ruang_rusak",
    
    "ALTER TABLE kecamatan ADD COLUMN ruang_kelas_baik INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN ruang_kelas_rusak_ringan INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN ruang_kelas_rusak_berat INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN jumlah_ruang_kelas INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN fasilitas_lapangan_olahraga INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN fasilitas_perpustakaan INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN fasilitas_uks INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN fasilitas_toilet INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN fasilitas_tempat_ibadah INT NOT NULL DEFAULT 0",
    "ALTER TABLE kecamatan ADD COLUMN jumlah_rombongan_belajar INT NOT NULL DEFAULT 0",
    
    "ALTER TABLE data_sekolah DROP COLUMN jumlah_ruang_kelas",
    "ALTER TABLE data_sekolah DROP COLUMN jumlah_fasilitas",
    "ALTER TABLE data_sekolah DROP COLUMN alokasi_dana_sarpras",
    
    "ALTER TABLE hasil_cluster DROP COLUMN jumlah_ruang_kelas_total",
    "ALTER TABLE hasil_cluster DROP COLUMN jumlah_fasilitas_total",
    "ALTER TABLE hasil_cluster DROP COLUMN jumlah_ruang_rusak_total",
    "ALTER TABLE hasil_cluster DROP COLUMN alokasi_dana_sarpras_total",
    
    "ALTER TABLE hasil_cluster ADD COLUMN ruang_kelas_baik_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN ruang_kelas_rusak_ringan_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN ruang_kelas_rusak_berat_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN jumlah_ruang_kelas_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN fasilitas_lapangan_olahraga_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN fasilitas_perpustakaan_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN fasilitas_uks_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN fasilitas_toilet_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN fasilitas_tempat_ibadah_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN jumlah_rombongan_belajar_total INT NOT NULL DEFAULT 0",
    "ALTER TABLE hasil_cluster ADD COLUMN alokasi_dana_sarpras_total DECIMAL(15, 2) NOT NULL DEFAULT 0"
];

foreach ($queries as $q) {
    try {
        if (!$conn->query($q)) {
            echo "Failed or skipped: " . $conn->error . "\n";
        } else {
            echo "Success: $q\n";
        }
    } catch (Exception $e) {
        echo "Exception (skipped): " . $e->getMessage() . "\n";
    }
}
echo "Migration finished.\n";
?>
