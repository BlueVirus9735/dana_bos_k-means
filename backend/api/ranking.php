<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

session_start();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? date('Y'));
    $kategori = sanitizeInput($_GET['kategori'] ?? ''); // Filter by category if needed
    
    // Get ranking kecamatan based on cluster category and nilai_cluster
    // Higher nilai_cluster = higher priority
    $query = "
        SELECT 
            hc.*,
            k.nama_kecamatan,
            k.latitude,
            k.longitude,
            k.kode_kecamatan
        FROM hasil_cluster hc
        JOIN kecamatan k ON hc.kecamatan_id = k.id
        WHERE hc.tahun_ajaran = ?
    ";
    
    $params = [$tahun_ajaran];
    $types = "s";
    
    if ($kategori) {
        $query .= " AND hc.cluster_kategori = ?";
        $params[] = $kategori;
        $types .= "i";
    }
    
    $query .= " ORDER BY hc.cluster_kategori DESC, hc.nilai_cluster DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $ranking = [];
    $rank = 1;
    while ($row = $result->fetch_assoc()) {
        $row['rank'] = $rank++;
        $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1] ?? 'Rendah';
        
        // Calculate priority score (normalized 0-100)
        $max_siswa = 0;
        $max_ruang = 0;
        $max_fasilitas = 0;
        $max_dana = 0;
        
        // Get max values for normalization
        $max_query = "
            SELECT 
                MAX(jumlah_siswa_total) as max_siswa,
                MAX(jumlah_ruang_kelas_total) as max_ruang,
                MAX(fasilitas_lapangan_olahraga_total + fasilitas_perpustakaan_total + fasilitas_uks_total + fasilitas_toilet_total + fasilitas_tempat_ibadah_total) as max_fasilitas,
                MAX(total_dana_bos_total) as max_dana
            FROM hasil_cluster
            WHERE tahun_ajaran = ?
        ";
        $max_stmt = $conn->prepare($max_query);
        $max_stmt->bind_param("s", $tahun_ajaran);
        $max_stmt->execute();
        $max_result = $max_stmt->get_result();
        $max_data = $max_result->fetch_assoc();
        
        if ($max_data) {
            $max_siswa = $max_data['max_siswa'] ?: 1;
            $max_ruang = $max_data['max_ruang'] ?: 1;
            $max_fasilitas = $max_data['max_fasilitas'] ?: 1;
            $max_dana = $max_data['max_dana'] ?: 1;
        }
        
        // Calculate normalized score (weighted)
        $siswa_score = ($row['jumlah_siswa_total'] / $max_siswa) * 30; // 30% weight
        $ruang_score = ($row['jumlah_ruang_kelas_total'] / $max_ruang) * 20; // 20% weight
        $jumlah_fasilitas = $row['fasilitas_lapangan_olahraga_total'] + $row['fasilitas_perpustakaan_total'] + $row['fasilitas_uks_total'] + $row['fasilitas_toilet_total'] + $row['fasilitas_tempat_ibadah_total'];
        $fasilitas_score = ($jumlah_fasilitas / $max_fasilitas) * 20; // 20% weight
        $dana_score = ($row['total_dana_bos_total'] / $max_dana) * 30; // 30% weight
        
        $row['priority_score'] = round($siswa_score + $ruang_score + $fasilitas_score + $dana_score, 2);
        
        $ranking[] = $row;
    }
    
    // Get statistics per category
    $stats_query = "
        SELECT 
            cluster_kategori,
            COUNT(*) as count,
            AVG(nilai_cluster) as avg_priority_score
        FROM hasil_cluster
        WHERE tahun_ajaran = ?
        GROUP BY cluster_kategori
        ORDER BY cluster_kategori DESC
    ";
    
    $stats_stmt = $conn->prepare($stats_query);
    $stats_stmt->bind_param("s", $tahun_ajaran);
    $stats_stmt->execute();
    $stats_result = $stats_stmt->get_result();
    
    $category_stats = [];
    while ($row = $stats_result->fetch_assoc()) {
        $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1] ?? 'Rendah';
        $category_stats[] = $row;
    }
    
    sendResponse([
        'ranking' => $ranking,
        'category_stats' => $category_stats,
        'total_kecamatan' => count($ranking),
        'tahun_ajaran' => $tahun_ajaran
    ]);
}
