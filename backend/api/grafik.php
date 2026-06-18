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
    $tipe = sanitizeInput($_GET['tipe'] ?? 'pie');
    
    if ($tipe === 'pie') {
        // Pie chart data for cluster distribution
        $query = "
            SELECT 
                cluster_kategori,
                COUNT(*) as count,
                SUM(jumlah_siswa_total) as total_siswa
            FROM hasil_cluster
            WHERE tahun_ajaran = ?
            GROUP BY cluster_kategori
            ORDER BY cluster_kategori DESC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $tahun_ajaran);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        $labels = [];
        while ($row = $result->fetch_assoc()) {
            $kategori_nama = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1];
            $labels[] = $kategori_nama;
            $data[] = $row['count'];
        }
        
        sendResponse([
            'type' => 'pie',
            'labels' => $labels,
            'data' => $data,
            'title' => 'Distribusi Kecamatan per Kategori'
        ]);
        
    } else if ($tipe === 'bar') {
        // Bar chart data for comparison across features
        $query = "
            SELECT 
                cluster_kategori,
                AVG(jumlah_siswa_total) as avg_siswa,
                AVG(jumlah_ruang_kelas_total) as avg_ruang_kelas,
                AVG(jumlah_fasilitas_total) as avg_fasilitas,
                AVG(total_dana_bos_total) as avg_dana_bos,
                AVG(alokasi_dana_sarpras_total) as avg_alokasi
            FROM hasil_cluster
            WHERE tahun_ajaran = ?
            GROUP BY cluster_kategori
            ORDER BY cluster_kategori DESC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $tahun_ajaran);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $labels = [];
        $siswa_data = [];
        $ruang_kelas_data = [];
        $fasilitas_data = [];
        $dana_bos_data = [];
        $alokasi_data = [];
        
        while ($row = $result->fetch_assoc()) {
            $kategori_nama = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1];
            $labels[] = $kategori_nama;
            $siswa_data[] = floatval($row['avg_siswa']);
            $ruang_kelas_data[] = floatval($row['avg_ruang_kelas']);
            $fasilitas_data[] = floatval($row['avg_fasilitas']);
            $dana_bos_data[] = floatval($row['avg_dana_bos']);
            $alokasi_data[] = floatval($row['avg_alokasi']);
        }
        
        sendResponse([
            'type' => 'bar',
            'labels' => $labels,
            'datasets' => [
                ['label' => 'Rata-rata Siswa', 'data' => $siswa_data],
                ['label' => 'Rata-rata Ruang Kelas', 'data' => $ruang_kelas_data],
                ['label' => 'Rata-rata Fasilitas', 'data' => $fasilitas_data],
                ['label' => 'Rata-rata Dana BOS', 'data' => $dana_bos_data],
                ['label' => 'Rata-rata Alokasi Dana', 'data' => $alokasi_data]
            ],
            'title' => 'Perbandingan Rata-rata per Kategori'
        ]);
        
    } else if ($tipe === 'scatter') {
        // Scatter plot data for kecamatan distribution
        $query = "
            SELECT 
                hc.cluster_kategori,
                hc.jumlah_siswa_total,
                hc.jumlah_ruang_kelas_total,
                hc.total_dana_bos_total,
                k.nama_kecamatan
            FROM hasil_cluster hc
            JOIN kecamatan k ON hc.kecamatan_id = k.id
            WHERE hc.tahun_ajaran = ?
            ORDER BY hc.cluster_kategori DESC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $tahun_ajaran);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1];
            $data[] = $row;
        }
        
        sendResponse([
            'type' => 'scatter',
            'data' => $data,
            'title' => 'Distribusi Kecamatan (Siswa vs Ruang Kelas vs Dana BOS)'
        ]);
        
    } else {
        sendError('Tipe grafik tidak valid. Gunakan: pie, bar, atau scatter', 400);
    }
}
?>
