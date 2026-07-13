<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? '');

    $stats = [];

    // Total kecamatan
    $result = $conn->query("SELECT COUNT(*) as total FROM kecamatan");
    $stats['total_kecamatan'] = intval($result->fetch_assoc()['total']);

    // Total sekolah
    $result = $conn->query("SELECT COUNT(*) as total FROM sekolah");
    $stats['total_sekolah'] = intval($result->fetch_assoc()['total']);

    // Total data BOS yang sudah diinput
    if ($tahun_ajaran) {
        $stmt = $conn->prepare("SELECT COUNT(*) as total FROM data_sekolah WHERE tahun_ajaran = ?");
        $stmt->bind_param("s", $tahun_ajaran);
        $stmt->execute();
        $stats['total_data_sekolah'] = intval($stmt->get_result()->fetch_assoc()['total']);
    } else {
        $result = $conn->query("SELECT COUNT(*) as total FROM data_sekolah");
        $stats['total_data_sekolah'] = intval($result->fetch_assoc()['total']);
    }

    // Cluster distribution (dari hasil_cluster)
    $cluster_tahun = $tahun_ajaran ?: '';
    if (!$cluster_tahun) {
        $latest = $conn->query("SELECT MAX(tahun_ajaran) as t FROM hasil_cluster")->fetch_assoc()['t'];
        $cluster_tahun = $latest ?: date('Y');
    }

    $stmt = $conn->prepare("
        SELECT
            cluster_kategori,
            COUNT(*) as count,
            SUM(jumlah_siswa_total)              AS total_siswa,
            SUM(ruang_kelas_baik_total)          AS total_rk_baik,
            SUM(ruang_kelas_rusak_ringan_total)  AS total_rk_rusak_ringan,
            SUM(ruang_kelas_rusak_berat_total)   AS total_rk_rusak_berat,
            SUM(jumlah_ruang_kelas_total)        AS total_ruang_kelas,
            
            SUM(fasilitas_lapangan_olahraga_total) AS total_lapangan,
            SUM(fasilitas_perpustakaan_total)      AS total_perpustakaan,
            SUM(fasilitas_uks_total)               AS total_uks,
            SUM(fasilitas_toilet_total)            AS total_toilet,
            SUM(fasilitas_tempat_ibadah_total)     AS total_ibadah,
            
            (SUM(fasilitas_lapangan_olahraga_total) + 
             SUM(fasilitas_perpustakaan_total) + 
             SUM(fasilitas_uks_total) + 
             SUM(fasilitas_toilet_total) + 
             SUM(fasilitas_tempat_ibadah_total)) AS total_fasilitas,
            
            SUM(jumlah_rombongan_belajar_total)  AS total_rombel,
            SUM(total_dana_bos_total)            AS total_dana_bos,
            SUM(alokasi_dana_sarpras_total)      AS total_alokasi_dana
        FROM hasil_cluster
        WHERE tahun_ajaran = ?
        GROUP BY cluster_kategori
        ORDER BY cluster_kategori DESC
    ");
    $stmt->bind_param("s", $cluster_tahun);
    $stmt->execute();
    $result = $stmt->get_result();

    $cluster_distribution = [];
    while ($row = $result->fetch_assoc()) {
        $idx = intval($row['cluster_kategori']) - 1;
        $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$idx] ?? 'Rendah';
        $cluster_distribution[] = $row;
    }
    $stats['cluster_distribution'] = $cluster_distribution;

    // Riwayat input data BOS terbaru
    $recent = [];
    $stmt = $conn->prepare("
        SELECT ih.*, a.nama as admin_nama
        FROM input_history ih
        JOIN admin a ON ih.admin_id = a.id
        ORDER BY ih.tanggal_input DESC
        LIMIT 5
    ");
    if ($stmt && $stmt->execute()) {
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $recent[] = [
                'id'            => $row['id'],
                'nama_file'     => 'Input Manual — ' . $row['tahun_ajaran'],
                'tanggal_upload'=> $row['tanggal_input'],
                'jumlah_data'   => $row['jumlah_data'],
                'status'        => 'success',
                'admin_nama'    => $row['admin_nama'],
            ];
        }
    }
    $stats['recent_uploads'] = $recent;

    // Tahun ajaran yang tersedia
    $result = $conn->query("SELECT DISTINCT tahun_ajaran FROM data_sekolah ORDER BY tahun_ajaran DESC");
    $years = [];
    while ($row = $result->fetch_assoc()) {
        $years[] = $row['tahun_ajaran'];
    }
    $stats['available_years'] = $years;

    sendResponse($stats);
}
?>
