<?php
// Master Seeder: Reset Database (Sisakan Admin), Input 745 Sekolah Eksak, Sarpras, Operator, RKAS Disahkan, Realisasi BKU, & Clustering 100% Excel

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/functions.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if ($conn->connect_error) {
    die("Koneksi database gagal: " . $conn->connect_error . PHP_EOL);
}

echo "=== 1. MEMBERSIHKAN SELURUH DATA DATABASE (HANYA SISAKAN ADMIN) ===" . PHP_EOL;

// Matikan foreign key check sementara untuk truncate/delete
$conn->query("SET FOREIGN_KEY_CHECKS = 0");

$tables_to_clear = [
    'bku',
    'realisasi_detail',
    'realisasi_bos',
    'rkas_detail',
    'rkas',
    'data_sekolah',
    'sekolah_sarpras',
    'operator_sekolah',
    'sekolah',
    'detail_perhitungan',
    'hasil_cluster',
    'kecamatan',
    'tahun_ajaran_config',
    'input_history'
];

foreach ($tables_to_clear as $tbl) {
    $conn->query("TRUNCATE TABLE `{$tbl}`");
    echo "✓ Tabel {$tbl} berhasil dikosongkan" . PHP_EOL;
}

$conn->query("SET FOREIGN_KEY_CHECKS = 1");

// 2. Pastikan Admin ada & bersih
$admin_pass = password_hash('admin123', PASSWORD_DEFAULT);
$conn->query("
    INSERT INTO admin (id, username, password, nama, email)
    VALUES (1, 'admin', '{$admin_pass}', 'Administrator Dinas', 'admin@dinaspendidikan.go.id')
    ON DUPLICATE KEY UPDATE nama = 'Administrator Dinas', email = 'admin@dinaspendidikan.go.id'
");
echo "✓ Akun Admin (admin / admin123) siap" . PHP_EOL;

// 3. Tahun Ajaran Aktif
$tahun_ajaran = '2024';
$conn->query("
    INSERT INTO tahun_ajaran_config (tahun_ajaran, status, batas_submit_rkas, batas_submit_laporan, created_by)
    VALUES ('{$tahun_ajaran}', 'aktif', '2024-03-31', '2024-12-31', 1)
");
echo "✓ Tahun Ajaran {$tahun_ajaran} aktif sebagai satu-satunya tahun ajaran" . PHP_EOL;

// 4. Baca data eksak JSON dari Excel
$json_path = __DIR__ . '/exact_seed_data.json';
if (!file_exists($json_path)) {
    die("File exact_seed_data.json tidak ditemukan!" . PHP_EOL);
}

$seed_data = json_decode(file_get_contents($json_path), true);
$kecamatan_list = $seed_data['kecamatan'];
$schools_by_kec = $seed_data['schools'];

function distribute_int($total, $n) {
    if ($n <= 0) return [];
    $base = intdiv($total, $n);
    $rem = $total % $n;
    $res = array_fill(0, $n, $base);
    for ($i = 0; $i < $rem; $i++) {
        $res[$i] += 1;
    }
    return $res;
}

echo PHP_EOL . "=== 2. MEMULAI SEEDING 40 KECAMATAN & 745 SEKOLAH EKSAK ===" . PHP_EOL;

$conn->begin_transaction();

$op_pass = password_hash('password123', PASSWORD_DEFAULT);
$total_sekolah_seeded = 0;

foreach ($kecamatan_list as $kec) {
    $nama_kec = $kec['nama'];
    $kode_kec = $kec['kode'];
    
    // Insert Kecamatan
    $stmt = $conn->prepare("
        INSERT INTO kecamatan 
            (nama_kecamatan, kode_kecamatan, tahun_ajaran,
             ruang_kelas_baik, ruang_kelas_rusak_ringan, ruang_kelas_rusak_berat, jumlah_ruang_kelas,
             fasilitas_lapangan_olahraga, fasilitas_perpustakaan, fasilitas_uks, fasilitas_toilet, fasilitas_tempat_ibadah,
             jumlah_rombongan_belajar)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    ");
    
    $jml_kelas = $kec['baik'] + $kec['rusak_ringan'] + $kec['rusak_berat'];
    $stmt->bind_param(
        "sssiiiiiiiii",
        $nama_kec, $kode_kec, $tahun_ajaran,
        $kec['baik'], $kec['rusak_ringan'], $kec['rusak_berat'], $jml_kelas,
        $kec['perpus'], $kec['uks'], $kec['toilet'], $kec['ibadah'],
        $kec['rombel']
    );
    $stmt->execute();
    $kecamatan_id = $conn->insert_id;
    
    $sch_list = $schools_by_kec[$nama_kec] ?? [];
    $num_sch = count($sch_list);
    
    // Distribusi metrik sarpras per sekolah
    $d_baik   = distribute_int($kec['baik'], $num_sch);
    $d_ringan = distribute_int($kec['rusak_ringan'], $num_sch);
    $d_berat  = distribute_int($kec['rusak_berat'], $num_sch);
    $d_perpus = distribute_int($kec['perpus'], $num_sch);
    $d_uks    = distribute_int($kec['uks'], $num_sch);
    $d_toilet = distribute_int($kec['toilet'], $num_sch);
    $d_ibadah = distribute_int($kec['ibadah'], $num_sch);
    $d_rombel = distribute_int($kec['rombel'], $num_sch);
    
    foreach ($sch_list as $idx => $sch) {
        $total_sekolah_seeded++;
        $npsn = $sch['npsn'];
        $nama_sch = $sch['nama_sekolah'];
        $siswa = intval($sch['siswa']);
        $pagu  = floatval($sch['pagu']);
        $sarpras_anggaran = floatval($sch['dana_sarpras'] ?? round($pagu * 0.20, 2));
        
        // 4a. Insert Sekolah
        $stmt_s = $conn->prepare("INSERT INTO sekolah (npsn, nama_sekolah, kecamatan_id, jenjang) VALUES (?, ?, ?, 'SD')");
        $stmt_s->bind_param("ssi", $npsn, $nama_sch, $kecamatan_id);
        $stmt_s->execute();
        $sekolah_id = $conn->insert_id;
        
        // 4b. Insert Operator Sekolah
        $op_user = 'operator_' . $npsn;
        $op_nama = 'Operator ' . $nama_sch;
        $op_email = $npsn . '@sekolah.id';
        $stmt_op = $conn->prepare("INSERT INTO operator_sekolah (username, password, nama, email, sekolah_id, is_active) VALUES (?, ?, ?, ?, ?, 1)");
        $stmt_op->bind_param("ssssi", $op_user, $op_pass, $op_nama, $op_email, $sekolah_id);
        $stmt_op->execute();
        
        // 4c. Insert Data Sekolah (Siswa & Pagu BOS EKSAK dari Excel)
        $stmt_ds = $conn->prepare("INSERT INTO data_sekolah (sekolah_id, tahun_ajaran, jumlah_siswa, total_dana_bos) VALUES (?, ?, ?, ?)");
        $stmt_ds->bind_param("isid", $sekolah_id, $tahun_ajaran, $siswa, $pagu);
        $stmt_ds->execute();
        
        // 4d. Insert Sekolah Sarpras
        $s_baik   = $d_baik[$idx];
        $s_ringan = $d_ringan[$idx];
        $s_berat  = $d_berat[$idx];
        $s_perpus = $d_perpus[$idx];
        $s_uks    = $d_uks[$idx];
        $s_toilet = $d_toilet[$idx];
        $s_ibadah = $d_ibadah[$idx];
        $s_rombel = $d_rombel[$idx];
        $s_jml_kelas = $s_baik + $s_ringan + $s_berat;
        
        $stmt_sp = $conn->prepare("
            INSERT INTO sekolah_sarpras
                (sekolah_id, tahun_ajaran, ruang_kelas_baik, ruang_kelas_rusak_ringan, ruang_kelas_rusak_berat,
                 jumlah_ruang_kelas, fasilitas_lapangan_olahraga, fasilitas_perpustakaan, fasilitas_uks,
                 fasilitas_toilet, fasilitas_tempat_ibadah, jumlah_rombongan_belajar)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
        ");
        $stmt_sp->bind_param(
            "isiiiiiiiii",
            $sekolah_id, $tahun_ajaran,
            $s_baik, $s_ringan, $s_berat, $s_jml_kelas,
            $s_perpus, $s_uks, $s_toilet, $s_ibadah,
            $s_rombel
        );
        $stmt_sp->execute();
        
        // 4e. Insert RKAS (Disahkan oleh Admin)
        $stmt_rkas = $conn->prepare("
            INSERT INTO rkas (sekolah_id, tahun_ajaran, status, tanggal_submit, tanggal_verifikasi, admin_id)
            VALUES (?, ?, 'disahkan', '2024-02-10 08:30:00', '2024-02-15 14:00:00', 1)
        ");
        $stmt_rkas->bind_param("is", $sekolah_id, $tahun_ajaran);
        $stmt_rkas->execute();
        $rkas_id = $conn->insert_id;
        
        // RKAS Detail (Menggunakan Alokasi Dana Sarpras Asli)
        $item1 = round($sarpras_anggaran * 0.55, 2);
        $item2 = round($sarpras_anggaran * 0.25, 2);
        $item3 = round($sarpras_anggaran * 0.20, 2);
        
        $conn->query("INSERT INTO rkas_detail (rkas_id, komponen_kegiatan, uraian, volume, satuan, harga_satuan, jumlah) VALUES ({$rkas_id}, 'Pemeliharaan Sarana dan Prasarana Sekolah', 'Pemeliharaan dan perbaikan ruang kelas', 1, 'Paket', {$item1}, {$item1})");
        $conn->query("INSERT INTO rkas_detail (rkas_id, komponen_kegiatan, uraian, volume, satuan, harga_satuan, jumlah) VALUES ({$rkas_id}, 'Penyediaan Alat Multi Media & Perpus', 'Pengadaan perlengkapan perpustakaan dan UKS', 1, 'Paket', {$item2}, {$item2})");
        $conn->query("INSERT INTO rkas_detail (rkas_id, komponen_kegiatan, uraian, volume, satuan, harga_satuan, jumlah) VALUES ({$rkas_id}, 'Pemeliharaan Sarana Sanitasi', 'Perbaikan dan pemeliharaan sanitasi/toilet siswa', 1, 'Paket', {$item3}, {$item3})");
        
        // 4f. Insert Realisasi BOS & BKU (Terverifikasi oleh Admin)
        $realisasi_pengeluaran = round($pagu * 0.985, 2);
        $saldo = round($pagu - $realisasi_pengeluaran, 2);
        
        $stmt_real = $conn->prepare("
            INSERT INTO realisasi_bos (sekolah_id, tahun_ajaran, rkas_id, total_penerimaan, total_pengeluaran, saldo, status, tanggal_submit, tanggal_validasi, admin_id)
            VALUES (?, ?, ?, ?, ?, ?, 'terverifikasi', '2024-11-20 10:00:00', '2024-11-25 15:30:00', 1)
        ");
        $stmt_real->bind_param("isiddd", $sekolah_id, $tahun_ajaran, $rkas_id, $pagu, $realisasi_pengeluaran, $saldo);
        $stmt_real->execute();
        $realisasi_id = $conn->insert_id;
        
        // Realisasi Detail & BKU
        $r_item1 = round($item1 * 0.99, 2);
        $r_item2 = round($item2 * 0.98, 2);
        $r_item3 = round($item3 * 0.98, 2);
        
        $conn->query("INSERT INTO realisasi_detail (realisasi_id, komponen_kegiatan, uraian, anggaran, realisasi, keterangan) VALUES ({$realisasi_id}, 'Pemeliharaan Sarana dan Prasarana Sekolah', 'Pemeliharaan ruang kelas', {$item1}, {$r_item1}, 'Selesai 100% fisik')");
        $conn->query("INSERT INTO realisasi_detail (realisasi_id, komponen_kegiatan, uraian, anggaran, realisasi, keterangan) VALUES ({$realisasi_id}, 'Penyediaan Alat Multi Media & Perpus', 'Pengadaan sarana perpustakaan & UKS', {$item2}, {$r_item2}, 'Barang sudah diterima')");
        $conn->query("INSERT INTO realisasi_detail (realisasi_id, komponen_kegiatan, uraian, anggaran, realisasi, keterangan) VALUES ({$realisasi_id}, 'Pemeliharaan Sanitasi', 'Sanitasi & toilet siswa', {$item3}, {$r_item3}, 'Pekerjaan selesai')");
        
        $conn->query("INSERT INTO bku (realisasi_id, tanggal, no_bukti, kode_kegiatan, kode_rekening, uraian, penerimaan, pengeluaran, saldo) VALUES ({$realisasi_id}, '2024-02-01', 'BKU-001/P', '5.1.02.01', '4.1.01', 'Penerimaan Dana BOS Tahap I', {$pagu}, 0, {$pagu})");
        $conn->query("INSERT INTO bku (realisasi_id, tanggal, no_bukti, kode_kegiatan, kode_rekening, uraian, penerimaan, pengeluaran, saldo) VALUES ({$realisasi_id}, '2024-03-25', 'BKU-002/K', '5.2.03.01', '5.2.03', 'Belanja Perbaikan & Pemeliharaan Ruang Kelas', 0, {$r_item1}, " . ($pagu - $r_item1) . ")");
        $conn->query("INSERT INTO bku (realisasi_id, tanggal, no_bukti, kode_kegiatan, kode_rekening, uraian, penerimaan, pengeluaran, saldo) VALUES ({$realisasi_id}, '2024-07-15', 'BKU-003/K', '5.2.03.02', '5.2.03', 'Belanja Pengadaan Sarana Perpus & UKS', 0, {$r_item2}, " . ($pagu - $r_item1 - $r_item2) . ")");
        $conn->query("INSERT INTO bku (realisasi_id, tanggal, no_bukti, kode_kegiatan, kode_rekening, uraian, penerimaan, pengeluaran, saldo) VALUES ({$realisasi_id}, '2024-10-10', 'BKU-004/K', '5.2.03.03', '5.2.03', 'Belanja Pemeliharaan Toilet Sanitasi', 0, {$r_item3}, {$saldo})");
    }
}

$conn->commit();
echo "✓ Sukses melakukan seed 40 Kecamatan dan {$total_sekolah_seeded} Sekolah (Data Siswa, BOS, Sarpras 100% Eksak Excel)" . PHP_EOL;

// 5. Jalankan Clustering K-Means Otomatis
echo PHP_EOL . "=== 3. MENJALANKAN K-MEANS CLUSTERING UNTUK TAHUN {$tahun_ajaran} ===" . PHP_EOL;

$res_agg = $conn->query("
    SELECT
        k.id                        AS kecamatan_id,
        k.nama_kecamatan,
        COALESCE(SUM(ds.jumlah_siswa), 0)    AS total_siswa,
        COALESCE(SUM(ds.total_dana_bos), 0)  AS total_dana_bos,
        ROUND(COALESCE(SUM(ds.total_dana_bos), 0) * 0.20, 2) AS alokasi_sarpras,
        COALESCE(SUM(ss.jumlah_rombongan_belajar), 0) AS jumlah_rombongan_belajar,
        COALESCE(SUM(ss.fasilitas_perpustakaan), 0) AS fasilitas_perpustakaan,
        COALESCE(SUM(ss.fasilitas_tempat_ibadah), 0) AS fasilitas_tempat_ibadah,
        COALESCE(SUM(ss.fasilitas_toilet), 0) AS fasilitas_toilet,
        COALESCE(SUM(ss.fasilitas_uks), 0) AS fasilitas_uks,
        COALESCE(SUM(ss.ruang_kelas_baik), 0) AS ruang_kelas_baik,
        COALESCE(SUM(ss.ruang_kelas_rusak_ringan), 0) AS ruang_kelas_rusak_ringan,
        COALESCE(SUM(ss.ruang_kelas_rusak_berat), 0) AS ruang_kelas_rusak_berat,
        COALESCE(SUM(ss.jumlah_ruang_kelas), 0) AS jumlah_ruang_kelas,
        COALESCE(SUM(ss.fasilitas_lapangan_olahraga), 0) AS fasilitas_lapangan_olahraga
    FROM kecamatan k
    LEFT JOIN sekolah s  ON k.id = s.kecamatan_id
    LEFT JOIN data_sekolah ds ON s.id = ds.sekolah_id AND ds.tahun_ajaran = '{$tahun_ajaran}'
    LEFT JOIN sekolah_sarpras ss ON s.id = ss.sekolah_id AND ss.tahun_ajaran = '{$tahun_ajaran}'
    GROUP BY k.id, k.nama_kecamatan
    ORDER BY k.nama_kecamatan ASC
");

$kec_data = [];
$kec_names = [];
$kec_ids = [];
$kec_raw = [];

while ($row = $res_agg->fetch_assoc()) {
    $kec_ids[] = $row['kecamatan_id'];
    $kec_names[] = $row['nama_kecamatan'];
    $kec_raw[] = $row;
    $kec_data[] = [
        intval($row['total_siswa']),
        floatval($row['total_dana_bos']),
        floatval($row['alokasi_sarpras']),
        intval($row['jumlah_rombongan_belajar']),
        intval($row['fasilitas_perpustakaan']),
        intval($row['fasilitas_tempat_ibadah']),
        intval($row['fasilitas_toilet']),
        intval($row['fasilitas_uks']),
        intval($row['ruang_kelas_baik']),
        intval($row['ruang_kelas_rusak_ringan']),
        intval($row['ruang_kelas_rusak_berat']),
    ];
}

$payload = base64_encode(json_encode([
    'data' => $kec_data,
    'kecamatan_names' => $kec_names
]));

$py_script = PYTHON_SCRIPT_PATH;
$cmd = 'python ' . escapeshellarg($py_script) . ' ' . escapeshellarg($payload);
$py_out = shell_exec($cmd);
$py_res = json_decode($py_out, true);

if (!$py_res || isset($py_res['error'])) {
    die("Python error: " . ($py_res['error'] ?? 'Gagal mengeksekusi Python') . PHP_EOL);
}

// Simpan ke hasil_cluster
$insert_hc = $conn->prepare("
    INSERT INTO hasil_cluster
        (kecamatan_id, tahun_ajaran, cluster_kategori, nilai_cluster,
         jumlah_siswa_total, ruang_kelas_baik_total, ruang_kelas_rusak_ringan_total, ruang_kelas_rusak_berat_total, jumlah_ruang_kelas_total,
         fasilitas_lapangan_olahraga_total, fasilitas_perpustakaan_total, fasilitas_uks_total, fasilitas_toilet_total, fasilitas_tempat_ibadah_total,
         jumlah_rombongan_belajar_total,
         total_dana_bos_total, alokasi_dana_sarpras_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$first_id = 0;
foreach ($py_res['kecamatan_results'] as $idx => $kr) {
    $k_id = $kec_ids[$idx];
    $raw = $kec_raw[$idx];
    $kat = $kr['kategori'];
    $val = floatval($kr['nilai_cluster']);
    
    $tot_bos = floatval($raw['total_dana_bos']);
    $tot_sar = floatval($raw['alokasi_sarpras']);
    
    $insert_hc->bind_param(
        "isidiiiiiiiiiiidd",
        $k_id, $tahun_ajaran, $kat, $val,
        $raw['total_siswa'], $raw['ruang_kelas_baik'], $raw['ruang_kelas_rusak_ringan'], $raw['ruang_kelas_rusak_berat'], $raw['jumlah_ruang_kelas'],
        $raw['fasilitas_lapangan_olahraga'], $raw['fasilitas_perpustakaan'], $raw['fasilitas_uks'], $raw['fasilitas_toilet'], $raw['fasilitas_tempat_ibadah'],
        $raw['jumlah_rombongan_belajar'], $tot_bos, $tot_sar
    );
    $insert_hc->execute();
    if ($first_id === 0) $first_id = $conn->insert_id;
}

// Simpan detail_perhitungan
$iters = $py_res['iterations'] ?? [];
$inertia = floatval($py_res['inertia'] ?? 0);
if (!empty($iters) && $first_id > 0) {
    $ins_dp = $conn->prepare("INSERT INTO detail_perhitungan (hasil_cluster_id, iterasi, cluster_center_1, cluster_center_2, cluster_center_3, inertia) VALUES (?, ?, ?, ?, ?, ?)");
    foreach ($iters as $it) {
        $it_num = intval($it['iterasi']);
        $cents = $it['centroids'] ?? [];
        $c1_avg = !empty($cents[0]) ? floatval(array_sum($cents[0]) / count($cents[0])) : 0;
        $c2_avg = !empty($cents[1]) ? floatval(array_sum($cents[1]) / count($cents[1])) : 0;
        $c3_avg = !empty($cents[2]) ? floatval(array_sum($cents[2]) / count($cents[2])) : 0;
        $ins_dp->bind_param("iidddd", $first_id, $it_num, $c1_avg, $c2_avg, $c3_avg, $inertia);
        $ins_dp->execute();
    }
}

echo "=== HASIL CLUSTERING BERHASIL DISIMPAN KE DATABASE ===" . PHP_EOL;
echo "• Total Iterasi : " . count($iters) . PHP_EOL;
echo "• Klaster C1 (Kebutuhan Rendah) : " . $py_res['summary']['c1_rendah'] . " Kecamatan" . PHP_EOL;
echo "• Klaster C2 (Kebutuhan Sedang) : " . $py_res['summary']['c2_sedang'] . " Kecamatan" . PHP_EOL;
echo "• Klaster C3 (Kebutuhan Tinggi) : " . $py_res['summary']['c3_tinggi'] . " Kecamatan" . PHP_EOL;
echo "=== SEEDING BERSIH DAN RE-CLUSTERING SELESAI DENGAN SUKSES! ===" . PHP_EOL;
?>