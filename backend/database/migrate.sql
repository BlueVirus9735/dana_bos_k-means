-- ============================================================
-- SCRIPT MIGRASI DATABASE — Dana BOS K-Means
-- ============================================================

USE dana_bos;

-- 1. Hapus kolom lama yang akan dipecah
ALTER TABLE kecamatan
    DROP COLUMN jumlah_ruang_kelas,
    DROP COLUMN jumlah_fasilitas,
    DROP COLUMN jumlah_ruang_rusak;

-- 2. Tambah rincian ruang kelas & fasilitas
ALTER TABLE kecamatan
    ADD COLUMN ruang_kelas_baik INT NOT NULL DEFAULT 0,
    ADD COLUMN ruang_kelas_rusak_ringan INT NOT NULL DEFAULT 0,
    ADD COLUMN ruang_kelas_rusak_berat INT NOT NULL DEFAULT 0,
    ADD COLUMN jumlah_ruang_kelas INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_lapangan_olahraga INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_perpustakaan INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_uks INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_toilet INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_tempat_ibadah INT NOT NULL DEFAULT 0,
    ADD COLUMN jumlah_rombongan_belajar INT NOT NULL DEFAULT 0;

-- 3. Hapus kolom yang sudah tidak perlu dari data_sekolah
ALTER TABLE data_sekolah
    DROP COLUMN jumlah_ruang_kelas,
    DROP COLUMN jumlah_fasilitas,
    DROP COLUMN alokasi_dana_sarpras;

-- 4. Update tabel hasil_cluster
ALTER TABLE hasil_cluster
    DROP COLUMN jumlah_ruang_kelas_total,
    DROP COLUMN jumlah_fasilitas_total,
    DROP COLUMN jumlah_ruang_rusak_total,
    DROP COLUMN alokasi_dana_sarpras_total;

ALTER TABLE hasil_cluster
    ADD COLUMN ruang_kelas_baik_total INT NOT NULL DEFAULT 0,
    ADD COLUMN ruang_kelas_rusak_ringan_total INT NOT NULL DEFAULT 0,
    ADD COLUMN ruang_kelas_rusak_berat_total INT NOT NULL DEFAULT 0,
    ADD COLUMN jumlah_ruang_kelas_total INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_lapangan_olahraga_total INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_perpustakaan_total INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_uks_total INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_toilet_total INT NOT NULL DEFAULT 0,
    ADD COLUMN fasilitas_tempat_ibadah_total INT NOT NULL DEFAULT 0,
    ADD COLUMN jumlah_rombongan_belajar_total INT NOT NULL DEFAULT 0,
    ADD COLUMN alokasi_dana_sarpras_total DECIMAL(15, 2) NOT NULL DEFAULT 0;
