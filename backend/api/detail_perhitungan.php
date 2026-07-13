<?php
require_once '../config/config.php';
require_once '../includes/functions.php';

startSession();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    sendError('Unauthorized', 401);
}

require_once '../includes/db.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tahun_ajaran = sanitizeInput($_GET['tahun_ajaran'] ?? date('Y'));
    
    // Get clustering details
    $query = "
        SELECT 
            dp.*,
            hc.tahun_ajaran
        FROM detail_perhitungan dp
        JOIN hasil_cluster hc ON dp.hasil_cluster_id = hc.id
        WHERE hc.tahun_ajaran = ?
        ORDER BY dp.iterasi ASC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $tahun_ajaran);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $details = [];
    while ($row = $result->fetch_assoc()) {
        $details[] = $row;
    }
    
    // Get cluster centers from the latest clustering result
    $query = "
        SELECT 
            hc.cluster_kategori,
            hc.nilai_cluster,
            k.nama_kecamatan
        FROM hasil_cluster hc
        JOIN kecamatan k ON hc.kecamatan_id = k.id
        WHERE hc.tahun_ajaran = ?
        ORDER BY hc.cluster_kategori DESC, hc.nilai_cluster DESC
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $tahun_ajaran);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $cluster_info = [];
    while ($row = $result->fetch_assoc()) {
        $row['kategori_nama'] = ['Rendah', 'Sedang', 'Tinggi'][$row['cluster_kategori'] - 1];
        $cluster_info[] = $row;
    }
    
    sendResponse([
        'details' => $details,
        'cluster_info' => $cluster_info,
        'tahun_ajaran' => $tahun_ajaran
    ]);
}
?>
